import { analyzeMessage } from './messages';
import { today, type Movement } from './finance';
import { expenseCategories, incomeCategories } from './categories';

export interface UserBankAccount {
  id: string;
  owner?: string;
  bank: string;
  accountType: 'savings' | 'checking' | 'credit_card' | 'digital_wallet';
  lastFour: string;
  customName: string;
  color?: string;
  createdAt: string;
}

export interface SyncConfig {
  token: string;
  autoRegister: boolean;
  webhookUrl?: string;
  recentEvents?: SyncEventItem[];
  bankAccounts?: UserBankAccount[];
}

export interface SyncEventItem {
  id: string;
  source: string;
  description: string;
  amount: number;
  status: 'registered' | 'pending' | 'duplicate';
  created_at: string;
}

export async function ensureSyncTables(db: any) {
  try {
    await db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS sync_tokens (
        token TEXT PRIMARY KEY,
        owner TEXT NOT NULL,
        auto_register INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      )`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_sync_tokens_owner ON sync_tokens(owner)`),
      db.prepare(`CREATE TABLE IF NOT EXISTS sync_events (
        id TEXT PRIMARY KEY,
        owner TEXT NOT NULL,
        source TEXT NOT NULL,
        description TEXT NOT NULL,
        amount INTEGER NOT NULL,
        status TEXT NOT NULL,
        payload TEXT,
        created_at TEXT NOT NULL
      )`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_sync_events_owner ON sync_events(owner, created_at DESC)`),
      db.prepare(`CREATE TABLE IF NOT EXISTS user_bank_accounts (
        id TEXT PRIMARY KEY,
        owner TEXT NOT NULL,
        bank TEXT NOT NULL,
        account_type TEXT NOT NULL,
        last_four TEXT NOT NULL,
        custom_name TEXT NOT NULL,
        color TEXT,
        created_at TEXT NOT NULL
      )`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_user_bank_accounts_owner ON user_bank_accounts(owner)`)
    ]);
  } catch (err) {
    // If table already exists or batch is not needed, ignore
  }
}

export async function getUserBankAccounts(db: any, owner: string): Promise<UserBankAccount[]> {
  await ensureSyncTables(db);
  try {
    const res = await db.prepare(
      'SELECT id, bank, account_type, last_four, custom_name, color, created_at FROM user_bank_accounts WHERE owner = ? ORDER BY created_at ASC'
    ).bind(owner).all();
    return (res.results || []).map((r: any) => ({
      id: r.id,
      bank: r.bank,
      accountType: r.account_type,
      lastFour: r.last_four,
      customName: r.custom_name,
      color: r.color,
      createdAt: r.created_at
    }));
  } catch {
    return [];
  }
}

export async function createUserBankAccount(
  db: any,
  owner: string,
  data: { bank: string; accountType: string; lastFour: string; customName: string; color?: string }
): Promise<UserBankAccount> {
  await ensureSyncTables(db);
  const id = 'acc_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const createdAt = new Date().toISOString();
  const cleanLastFour = data.lastFour.replace(/\D/g, '').slice(-4);
  const cleanName = data.customName.trim() || `${data.bank} *${cleanLastFour}`;
  const validTypes = ['savings', 'checking', 'credit_card', 'digital_wallet'];
  const accountType = validTypes.includes(data.accountType) ? data.accountType : 'savings';

  await db.prepare(
    'INSERT INTO user_bank_accounts (id, owner, bank, account_type, last_four, custom_name, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    id,
    owner,
    data.bank.trim(),
    accountType,
    cleanLastFour,
    cleanName,
    data.color || '#247a61',
    createdAt
  ).run();

  return {
    id,
    bank: data.bank.trim(),
    accountType: accountType as any,
    lastFour: cleanLastFour,
    customName: cleanName,
    color: data.color || '#247a61',
    createdAt
  };
}

export async function deleteUserBankAccount(db: any, owner: string, id: string): Promise<boolean> {
  await ensureSyncTables(db);
  await db.prepare('DELETE FROM user_bank_accounts WHERE id = ? AND owner = ?').bind(id, owner).run();
  return true;
}

export async function getOrCreateSyncConfig(db: any, owner: string): Promise<SyncConfig> {
  await ensureSyncTables(db);
  const row = await db.prepare('SELECT token, auto_register FROM sync_tokens WHERE owner = ?').bind(owner).first();
  const [recent, accounts] = await Promise.all([
    getRecentSyncEvents(db, owner),
    getUserBankAccounts(db, owner)
  ]);

  if (row) {
    return {
      token: row.token,
      autoRegister: Number(row.auto_register) === 1,
      recentEvents: recent,
      bankAccounts: accounts
    };
  }

  // Generate a secure, unique sync token
  const token = 'brisa_sync_' + crypto.randomUUID().replace(/-/g, '') + Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('');
  await db.prepare('INSERT INTO sync_tokens (token, owner, auto_register, created_at) VALUES (?, ?, 1, ?)').bind(token, owner, new Date().toISOString()).run();

  return {
    token,
    autoRegister: true,
    recentEvents: [],
    bankAccounts: accounts
  };
}

export async function rotateSyncToken(db: any, owner: string): Promise<string> {
  await ensureSyncTables(db);
  const newToken = 'brisa_sync_' + crypto.randomUUID().replace(/-/g, '') + Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('');
  const existing = await db.prepare('SELECT token FROM sync_tokens WHERE owner = ?').bind(owner).first();
  if (existing) {
    await db.prepare('UPDATE sync_tokens SET token = ? WHERE owner = ?').bind(newToken, owner).run();
  } else {
    await db.prepare('INSERT INTO sync_tokens (token, owner, auto_register, created_at) VALUES (?, ?, 1, ?)').bind(newToken, owner, new Date().toISOString()).run();
  }
  return newToken;
}

export async function updateAutoRegister(db: any, owner: string, autoRegister: boolean): Promise<boolean> {
  await ensureSyncTables(db);
  await db.prepare('UPDATE sync_tokens SET auto_register = ? WHERE owner = ?').bind(autoRegister ? 1 : 0, owner).run();
  return autoRegister;
}

export async function getUserBySyncToken(db: any, token: string): Promise<{ owner: string; autoRegister: boolean } | null> {
  await ensureSyncTables(db);
  const row = await db.prepare('SELECT owner, auto_register FROM sync_tokens WHERE token = ?').bind(token).first();
  if (!row) return null;
  return {
    owner: row.owner,
    autoRegister: Number(row.auto_register) === 1
  };
}

export async function getRecentSyncEvents(db: any, owner: string, limit = 8): Promise<SyncEventItem[]> {
  try {
    const res = await db.prepare('SELECT id, source, description, amount, status, created_at FROM sync_events WHERE owner = ? ORDER BY created_at DESC LIMIT ?').bind(owner, limit).all();
    return res.results || [];
  } catch {
    return [];
  }
}

export async function processSyncPayload(
  db: any,
  owner: string,
  autoRegisterPreference: boolean,
  body: any
): Promise<{ ok: boolean; action: 'registered' | 'inbox' | 'skipped'; movement?: Movement; message?: any; reason?: string }> {
  await ensureSyncTables(db);

  // Normalize source
  let rawSource = String(body.source || body.channel || '').toLowerCase();
  let source = 'Sincronización automática';
  if (rawSource.includes('apple') || rawSource.includes('ios')) source = 'Apple Pay';
  else if (rawSource.includes('google') || rawSource.includes('wallet') || rawSource.includes('gpay')) source = 'Google Pay';
  else if (rawSource.includes('correo') || rawSource.includes('email') || rawSource.includes('mail') || body.sender?.includes('@')) source = 'Correo bancario';
  else if (rawSource.includes('notific') || rawSource.includes('push') || rawSource.includes('sms')) source = 'Notificación bancaria';

  // Extract raw text or structured parameters
  const rawText = [
    typeof body.text === 'string' ? body.text : '',
    typeof body.body === 'string' ? body.body : '',
    typeof body.content === 'string' ? body.content : '',
    typeof body.subject === 'string' ? body.subject : '',
    typeof body.merchant === 'string' ? body.merchant : ''
  ].filter(Boolean).join(' ').trim();

  let amount = Number(body.amount) || 0;
  let kind: Movement['kind'] = (body.kind === 'income' || body.kind === 'saving') ? body.kind : 'expense';
  let category = String(body.category || '').trim();
  let description = String(body.description || body.merchant || body.concept || '').trim();
  let account = String(body.account || body.paymentMethod || '').trim();
  let date = String(body.date || '').trim();

  // If text is provided, analyze with message parser
  if (rawText) {
    const analyzed = analyzeMessage(rawText);
    if (!amount && analyzed.draft.amount) amount = analyzed.draft.amount;
    if (analyzed.classification === 'income') kind = 'income';
    if (!category && analyzed.draft.category) category = analyzed.draft.category;
    if (!account && analyzed.draft.account) account = analyzed.draft.account;
    if (!date && analyzed.draft.date) date = analyzed.draft.date;
    if (!description) {
      // Try to clean merchant name
      const merchantMatch = rawText.match(/(?:en|compra en|pago a|establecimiento)\s+([A-Za-z0-9ÁÉÍÓÚñáéíóú\s&.-]{3,35})(?:\s+(?:con|por|tarjeta|el|\.|$))/i);
      if (merchantMatch) {
        description = merchantMatch[1].trim();
      } else {
        description = analyzed.draft.description?.slice(0, 80) || `${source} · ${amount} COP`;
      }
    }
  }

  // Dynamic user bank account matching
  const userAccounts = await getUserBankAccounts(db, owner);
  let matchedUserAccount: UserBankAccount | null = null;

  // 1. Try matching by last 4 digits present in text or payload
  if (userAccounts.length > 0) {
    for (const acc of userAccounts) {
      if (acc.lastFour && acc.lastFour.length === 4) {
        const regex = new RegExp(`(?:terminada?\\s+en|[nN]o\\.?|\\*|x|•|-)?\\s*${acc.lastFour}\\b`, 'i');
        if (regex.test(rawText) || String(body.lastFour || '').includes(acc.lastFour)) {
          matchedUserAccount = acc;
          break;
        }
      }
    }

    // 2. If no 4-digit match found, match by bank name if uniquely specified
    if (!matchedUserAccount) {
      for (const acc of userAccounts) {
        if (acc.bank && new RegExp(`\\b${acc.bank}\\b`, 'i').test(rawText)) {
          matchedUserAccount = acc;
          break;
        }
      }
    }
  }

  if (matchedUserAccount) {
    account = matchedUserAccount.customName;
  }

  // Fallbacks and sanitation
  if (!description) description = source === 'Apple Pay' ? 'Pago Apple Pay' : source === 'Google Pay' ? 'Pago Google Pay' : 'Movimiento automático';
  if (description.length > 140) description = description.slice(0, 140);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) date = today();
  if (!account) account = source === 'Apple Pay' ? 'Apple Pay' : source === 'Google Pay' ? 'Google Pay' : 'Cuenta bancaria';

  // Category fallback
  const validCategories = kind === 'income' ? incomeCategories : [...expenseCategories, 'Ahorro'];
  if (!category || !validCategories.includes(category)) {
    category = kind === 'income' ? 'Otros' : 'Consumo';
  }

  // Amount must be valid positive safe integer
  amount = Math.round(Math.abs(amount));
  if (!amount || !Number.isSafeInteger(amount) || amount <= 0 || amount > 1e12) {
    // If amount could not be detected from text, route to inbox for human check
    const inboxId = crypto.randomUUID();
    const fallbackText = rawText || JSON.stringify(body).slice(0, 500);
    await db.prepare('INSERT INTO inbox (id, owner, content, sender, created_at, status, fingerprint) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(inboxId, owner, fallbackText, source, new Date().toISOString(), 'pending', crypto.randomUUID())
      .run();
    return { ok: true, action: 'inbox', reason: 'Importe no detectado claramente; colocado en la bandeja de entrada para confirmación.' };
  }

  // Deduplication check: check if an identical movement was registered today
  const duplicateCheck = await db.prepare(
    'SELECT id FROM movements WHERE owner = ? AND date = ? AND amount = ? AND description = ? LIMIT 1'
  ).bind(owner, date, amount, description).first();

  if (duplicateCheck) {
    // Log as duplicate
    await db.prepare('INSERT INTO sync_events (id, owner, source, description, amount, status, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), owner, source, description, amount, 'duplicate', JSON.stringify({ reason: 'Identical payment within same day', body }).slice(0, 1000), new Date().toISOString())
      .run();
    return { ok: true, action: 'skipped', reason: 'Este movimiento ya se había registrado (duplicado evitado).' };
  }

  const autoRegister = body.auto_register !== undefined ? Boolean(body.auto_register) : autoRegisterPreference;

  const eventId = crypto.randomUUID();
  const movId = `sync-${eventId}`;

  const movement: Movement = {
    id: movId,
    description,
    amount,
    kind,
    category,
    date,
    account,
    source
  };

  if (autoRegister) {
    // 1. Direct automatic save to movements
    const statement = db.prepare(
      'INSERT INTO movements (id, owner, description, amount, kind, category, date, account, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(movId, owner, description, amount, kind, category, date, account, source);

    // 2. Audit record in inbox marked as 'registered'
    const inboxStatement = db.prepare(
      'INSERT INTO inbox (id, owner, content, sender, created_at, status, fingerprint) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      eventId,
      owner,
      `${source}: ${description} por $${amount.toLocaleString('es-CO')} el ${date} (${account})`,
      source,
      new Date().toISOString(),
      'registered',
      crypto.randomUUID()
    );

    // 3. Log event
    const logStatement = db.prepare(
      'INSERT INTO sync_events (id, owner, source, description, amount, status, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(eventId, owner, source, description, amount, 'registered', JSON.stringify(body).slice(0, 1000), new Date().toISOString());

    await db.batch([statement, inboxStatement, logStatement]);

    return {
      ok: true,
      action: 'registered',
      movement
    };
  } else {
    // Stage in inbox for review
    const content = rawText || `${source}: ${description} por $${amount.toLocaleString('es-CO')} en ${account}`;
    await db.batch([
      db.prepare('INSERT INTO inbox (id, owner, content, sender, created_at, status, fingerprint) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(eventId, owner, content, source, new Date().toISOString(), 'pending', crypto.randomUUID()),
      db.prepare('INSERT INTO sync_events (id, owner, source, description, amount, status, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(eventId, owner, source, description, amount, 'pending', JSON.stringify(body).slice(0, 1000), new Date().toISOString())
    ]);

    return {
      ok: true,
      action: 'inbox',
      movement,
      reason: 'Movimiento recibido y preparado en la bandeja de entrada para confirmación.'
    };
  }
}
