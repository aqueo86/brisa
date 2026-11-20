import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { DatabaseSync } from 'node:sqlite';

// Helper to transpile TS files to .sites-runtime/*.mjs
fs.mkdirSync('.sites-runtime', { recursive: true });

function transpileFile(srcPath, outPath, replacements = {}) {
  let code = fs.readFileSync(srcPath, 'utf8');
  for (const [from, to] of Object.entries(replacements)) {
    code = code.replaceAll(from, to);
  }
  const result = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
  });
  fs.writeFileSync(outPath, result.outputText);
}

transpileFile('lib/finance.ts', '.sites-runtime/finance.mjs');
transpileFile('lib/categories.ts', '.sites-runtime/categories.mjs', {
  "'./finance'": "'./finance.mjs'"
});
transpileFile('lib/messages.ts', '.sites-runtime/messages.mjs', {
  "'./finance'": "'./finance.mjs'"
});
transpileFile('lib/sync.ts', '.sites-runtime/sync.mjs', {
  "'./messages'": "'./messages.mjs'",
  "'./finance'": "'./finance.mjs'",
  "'./categories'": "'./categories.mjs'"
});

const {
  ensureSyncTables,
  getOrCreateSyncConfig,
  createUserBankAccount,
  getUserBankAccounts,
  deleteUserBankAccount,
  processSyncPayload,
  rotateSyncToken,
  getUserBySyncToken
} = await import('../.sites-runtime/sync.mjs');

// Create a D1-compatible wrapper around node:sqlite
function createMockD1() {
  const sqlite = new DatabaseSync(':memory:');

  return {
    async batch(statements) {
      for (const stmt of statements) {
        await stmt.run();
      }
      return [];
    },
    prepare(query) {
      let boundParams = [];
      return {
        bind(...params) {
          boundParams = params;
          return this;
        },
        async run() {
          const stmt = sqlite.prepare(query);
          return stmt.run(...boundParams);
        },
        async first() {
          const stmt = sqlite.prepare(query);
          const row = stmt.get(...boundParams);
          return row || null;
        },
        async all() {
          const stmt = sqlite.prepare(query);
          const results = stmt.all(...boundParams);
          return { results };
        }
      };
    }
  };
}

async function runTests() {
  console.log('--- 1. Initializing Mock D1 & Ensuring Tables ---');
  const db = createMockD1();

  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS movements (
      id TEXT PRIMARY KEY,
      owner TEXT NOT NULL,
      amount INTEGER NOT NULL,
      kind TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      account TEXT NOT NULL,
      date TEXT NOT NULL,
      source TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS inbox (
      id TEXT PRIMARY KEY,
      owner TEXT NOT NULL,
      content TEXT NOT NULL,
      sender TEXT,
      created_at TEXT NOT NULL,
      status TEXT NOT NULL,
      fingerprint TEXT
    )`)
  ]);

  await ensureSyncTables(db);
  console.log('✓ Tables initialized in SQLite');

  const testOwner = 'user_test_colombia_123';

  console.log('--- 2. Testing Sync Config Generation ---');
  const initialConfig = await getOrCreateSyncConfig(db, testOwner);
  assert.ok(initialConfig.token.startsWith('brisa_sync_'));
  assert.equal(initialConfig.autoRegister, true);
  assert.equal(initialConfig.bankAccounts.length, 0);
  console.log('✓ Sync config created with token:', initialConfig.token);

  console.log('--- 3. Testing Bank Account Registration ---');
  const bancolombiaAcc = await createUserBankAccount(db, testOwner, {
    bank: 'Bancolombia',
    accountType: 'savings',
    lastFour: '4567',
    customName: 'Mi Ahorros Bancolombia',
    color: '#247a61'
  });
  assert.equal(bancolombiaAcc.bank, 'Bancolombia');
  assert.equal(bancolombiaAcc.lastFour, '4567');
  assert.equal(bancolombiaAcc.customName, 'Mi Ahorros Bancolombia');
  console.log('✓ Bancolombia account linked:', bancolombiaAcc.id);

  const nuAcc = await createUserBankAccount(db, testOwner, {
    bank: 'Nu Colombia',
    accountType: 'credit_card',
    lastFour: '8910',
    customName: 'Moradita Nu',
    color: '#820ad1'
  });
  assert.equal(nuAcc.bank, 'Nu Colombia');
  assert.equal(nuAcc.lastFour, '8910');
  console.log('✓ Nu Colombia credit card linked:', nuAcc.id);

  const allAccounts = await getUserBankAccounts(db, testOwner);
  assert.equal(allAccounts.length, 2);
  console.log('✓ Both bank accounts retrieved from DB');

  console.log('--- 4. Testing Inbound Processing with Account Matching ---');
  // Test Bancolombia purchase matching card 4567
  const emailRes = await processSyncPayload(db, testOwner, true, {
    source: 'Correo bancario',
    sender: 'notificaciones@bancolombia.com.co',
    subject: 'Comprobante de compra',
    body: 'Bancolombia le informa compra por $68.000 en Crepes & Waffles con su tarjeta terminada en 4567 el 2026-11-19.'
  });
  assert.equal(emailRes.ok, true);
  assert.equal(emailRes.action, 'registered');
  assert.equal(emailRes.movement.amount, 68000);
  assert.equal(emailRes.movement.account, 'Mi Ahorros Bancolombia');
  console.log('✓ Successfully matched Bancolombia card *4567 to "Mi Ahorros Bancolombia"');

  // Test Nu purchase matching card 8910
  const nuRes = await processSyncPayload(db, testOwner, true, {
    source: 'Notificación bancaria',
    sender: 'Nu',
    text: 'Nu: Compra autorizada por $45.000 en Cine Colombia con tarjeta *8910 el 2026-11-19'
  });
  assert.equal(nuRes.ok, true);
  assert.equal(nuRes.action, 'registered');
  assert.equal(nuRes.movement.amount, 45000);
  assert.equal(nuRes.movement.account, 'Moradita Nu');
  console.log('✓ Successfully matched Nu card *8910 to "Moradita Nu"');

  // Test Apple Pay transaction
  const appleRes = await processSyncPayload(db, testOwner, true, {
    source: 'Apple Pay',
    amount: 32000,
    merchant: 'Starbucks Parque 93',
    account: 'Apple Pay · Nu Débito',
    category: 'Alimentación',
    date: '2026-11-19'
  });
  assert.equal(appleRes.ok, true);
  assert.equal(appleRes.action, 'registered');
  assert.equal(appleRes.movement.amount, 32000);
  console.log('✓ Apple Pay transaction registered successfully');

  // Test Google Pay transaction
  const googleRes = await processSyncPayload(db, testOwner, true, {
    source: 'Google Pay',
    text: 'Google Pay: Pago de $54.000 en Éxito Calle 80 tarjeta *4567'
  });
  assert.equal(googleRes.ok, true);
  assert.equal(googleRes.action, 'registered');
  assert.equal(googleRes.movement.amount, 54000);
  assert.equal(googleRes.movement.account, 'Mi Ahorros Bancolombia');
  console.log('✓ Google Pay transaction registered & matched to "Mi Ahorros Bancolombia"');

  // Test Deduplication
  const duplicateRes = await processSyncPayload(db, testOwner, true, {
    source: 'Notificación bancaria',
    sender: 'Nu',
    text: 'Nu: Compra autorizada por $45.000 en Cine Colombia con tarjeta *8910 el 2026-11-19'
  });
  assert.equal(duplicateRes.ok, true);
  assert.equal(duplicateRes.action, 'skipped');
  console.log('✓ Duplicate transaction successfully skipped');

  console.log('--- 5. Testing Account Deletion ---');
  await deleteUserBankAccount(db, testOwner, bancolombiaAcc.id);
  const remaining = await getUserBankAccounts(db, testOwner);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, nuAcc.id);
  console.log('✓ Bancolombia account unlinked and deleted safely');

  console.log('--- 6. Testing Token Rotation ---');
  const newToken = await rotateSyncToken(db, testOwner);
  assert.notEqual(newToken, initialConfig.token);
  const user = await getUserBySyncToken(db, newToken);
  assert.equal(user.owner, testOwner);
  const oldUser = await getUserBySyncToken(db, initialConfig.token);
  assert.equal(oldUser, null);
  console.log('✓ Token rotated successfully and old token invalidated');

  console.log('\n===========================================');
  console.log('ALL SYNC UNIT & MULTI-USER TESTS PASSED ✓');
  console.log('===========================================');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
