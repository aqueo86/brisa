import assert from 'node:assert/strict';

const base = 'http://localhost:5173';

console.log('--- 1. Testing Sync Config & Auth ---');
// Unauthenticated config check
const unauthConfig = await fetch(`${base}/api/sync/config`);
assert.equal(unauthConfig.status, 401, 'Unauthenticated sync config must return 401');

// Authenticated session
const login = await fetch(`${base}/signin-with-chatgpt?return_to=/`, { redirect: 'manual' });
const cookie = login.headers.get('set-cookie').split(';')[0];

const authConfigRes = await fetch(`${base}/api/sync/config`, { headers: { Cookie: cookie } });
assert.equal(authConfigRes.status, 200, 'Authenticated sync config must return 200');
const config = await authConfigRes.json();
assert.ok(config.token.startsWith('brisa_sync_'), 'Token format should start with brisa_sync_');
assert.ok(config.webhookUrl.includes(config.token), 'Webhook URL must include the token');
assert.equal(config.autoRegister, true, 'Default autoRegister should be true');
console.log('✓ Token generated and webhook URL configured:', config.webhookUrl);

console.log('--- 2. Testing Webhook Security ---');
const badWebhook = await fetch(`${base}/api/sync/webhook?token=invalid_token_123`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount: 10000 })
});
assert.equal(badWebhook.status, 401, 'Invalid token must be rejected with 401');
console.log('✓ Webhook authentication rejected unauthorized access');

console.log('--- 3. Testing Apple Pay Ingestion ---');
const applePayRes = await fetch(`${base}/api/sync/webhook?token=${config.token}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    source: 'Apple Pay',
    amount: 38500,
    merchant: 'Starbucks Parque 93',
    account: 'Apple Pay · Tarjeta Débito',
    category: 'Alimentación',
    date: '2026-10-13'
  })
});
assert.equal(applePayRes.status, 200, 'Apple Pay webhook should return 200');
const applePayData = await applePayRes.json();
assert.equal(applePayData.ok, true);
assert.equal(applePayData.action, 'registered');
assert.equal(applePayData.movement.amount, 38500);
assert.equal(applePayData.movement.source, 'Apple Pay');
console.log('✓ Apple Pay transaction registered automatically in movements');

console.log('--- 4. Testing Google Pay Ingestion ---');
const googlePayRes = await fetch(`${base}/api/sync/webhook?token=${config.token}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    source: 'Google Pay',
    text: 'Google Pay: Pago de $54.000 en Éxito Calle 80 tarjeta *9876'
  })
});
assert.equal(googlePayRes.status, 200, 'Google Pay webhook should return 200');
const googlePayData = await googlePayRes.json();
assert.equal(googlePayData.ok, true);
assert.equal(googlePayData.action, 'registered');
assert.equal(googlePayData.movement.amount, 54000);
assert.equal(googlePayData.movement.source, 'Google Pay');
console.log('✓ Google Pay transaction parsed and registered automatically');

console.log('--- 5. Testing Bank Email Ingestion (Bancolombia) ---');
const emailRes = await fetch(`${base}/api/sync/webhook?token=${config.token}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    source: 'Correo bancario',
    sender: 'notificaciones@bancolombia.com.co',
    subject: 'Comprobante de compra con tarjeta',
    body: 'Bancolombia le informa compra por $112.500 en Farmatodo con su tarjeta *3456 el 2026-10-13.'
  })
});
assert.equal(emailRes.status, 200);
const emailData = await emailRes.json();
assert.equal(emailData.ok, true);
assert.equal(emailData.action, 'registered');
assert.equal(emailData.movement.amount, 112500);
assert.equal(emailData.movement.source, 'Correo bancario');
console.log('✓ Bancolombia confirmation email parsed and registered automatically');

console.log('--- 6. Testing Bank SMS / Push Ingestion (Nequi) ---');
const smsRes = await fetch(`${base}/api/sync/webhook?token=${config.token}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    source: 'Notificación bancaria',
    sender: 'Nequi',
    text: 'Nequi: Pagaste $22.000 en Restaurante El Jardín desde tu Disponible el 2026-10-13.'
  })
});
assert.equal(smsRes.status, 200);
const smsData = await smsRes.json();
assert.equal(smsData.ok, true);
assert.equal(smsData.action, 'registered');
assert.equal(smsData.movement.amount, 22000);
assert.equal(smsData.movement.source, 'Notificación bancaria');
console.log('✓ Nequi push/SMS parsed and registered automatically');

console.log('--- 7. Testing Deduplication Protection ---');
const duplicateRes = await fetch(`${base}/api/sync/webhook?token=${config.token}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    source: 'Apple Pay',
    amount: 38500,
    merchant: 'Starbucks Parque 93',
    account: 'Apple Pay · Tarjeta Débito',
    category: 'Alimentación',
    date: '2026-10-13'
  })
});
assert.equal(duplicateRes.status, 200);
const dupData = await duplicateRes.json();
assert.equal(dupData.action, 'skipped');
console.log('✓ Duplicate payment successfully intercepted and prevented');

console.log('--- 8. Testing Token Rotation ---');
const rotateRes = await fetch(`${base}/api/sync/config`, {
  method: 'POST',
  headers: { Cookie: cookie, Origin: base, 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'rotate_token' })
});
assert.equal(rotateRes.status, 200);
const rotateData = await rotateRes.json();
assert.notEqual(rotateData.token, config.token);

// Verify old token is now rejected
const oldTokenRes = await fetch(`${base}/api/sync/webhook?token=${config.token}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount: 10000 })
});
assert.equal(oldTokenRes.status, 401, 'Revoked token must be rejected');

// Verify new token works
const newTokenRes = await fetch(`${base}/api/sync/webhook?token=${rotateData.token}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    source: 'Apple Pay',
    amount: 15000,
    merchant: 'Panadería',
    date: '2026-10-13'
  })
});
assert.equal(newTokenRes.status, 200);
console.log('✓ Token rotation invalidated old token and activated new token');

console.log('--- 9. Testing User Bank Account Registration ---');
// Add Bancolombia Savings Account
const addAcc1Res = await fetch(`${base}/api/sync/config`, {
  method: 'POST',
  headers: { Cookie: cookie, Origin: base, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'add_account',
    bank: 'Bancolombia',
    accountType: 'savings',
    lastFour: '4567',
    customName: 'Mi Ahorros Bancolombia',
    color: '#247a61'
  })
});
assert.equal(addAcc1Res.status, 200, 'Adding bank account should return 200');
const addAcc1Data = await addAcc1Res.json();
assert.equal(addAcc1Data.bank, 'Bancolombia');
assert.equal(addAcc1Data.lastFour, '4567');
assert.equal(addAcc1Data.customName, 'Mi Ahorros Bancolombia');
console.log('✓ Bancolombia account linked successfully:', addAcc1Data.id);

// Add Nu Colombia Credit Card
const addAcc2Res = await fetch(`${base}/api/sync/config`, {
  method: 'POST',
  headers: { Cookie: cookie, Origin: base, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'add_account',
    bank: 'Nu Colombia',
    accountType: 'credit_card',
    lastFour: '8910',
    customName: 'Moradita Nu',
    color: '#820ad1'
  })
});
assert.equal(addAcc2Res.status, 200);
const addAcc2Data = await addAcc2Res.json();
assert.equal(addAcc2Data.bank, 'Nu Colombia');
assert.equal(addAcc2Data.lastFour, '8910');
console.log('✓ Nu Colombia credit card linked successfully:', addAcc2Data.id);

console.log('--- 10. Testing Automated Ingestion Matching Linked Bank Accounts ---');
// Ingestion matching Bancolombia card by *4567
const matchBancolombiaRes = await fetch(`${base}/api/sync/webhook?token=${rotateData.token}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    source: 'Correo bancario',
    sender: 'alertas@bancolombia.com.co',
    subject: 'Comprobante de compra',
    body: 'Bancolombia le informa compra por $68.000 en Crepes & Waffles con su tarjeta terminada en 4567 el 2026-11-19.'
  })
});
assert.equal(matchBancolombiaRes.status, 200);
const matchBancolombiaData = await matchBancolombiaRes.json();
assert.equal(matchBancolombiaData.ok, true);
assert.equal(matchBancolombiaData.action, 'registered');
assert.equal(matchBancolombiaData.movement.amount, 68000);
assert.equal(matchBancolombiaData.movement.account, 'Mi Ahorros Bancolombia', 'Should match customName of account with lastFour 4567');
console.log('✓ Inbound SMS/Email matched to "Mi Ahorros Bancolombia" via last 4 digits (4567)');

// Ingestion matching Nu Credit Card by *8910
const matchNuRes = await fetch(`${base}/api/sync/webhook?token=${rotateData.token}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    source: 'Notificación bancaria',
    sender: 'Nu',
    text: 'Nu: Compra autorizada por $45.000 en Cine Colombia con tarjeta *8910 el 2026-11-19'
  })
});
assert.equal(matchNuRes.status, 200);
const matchNuData = await matchNuRes.json();
assert.equal(matchNuData.ok, true);
assert.equal(matchNuData.action, 'registered');
assert.equal(matchNuData.movement.amount, 45000);
assert.equal(matchNuData.movement.account, 'Moradita Nu', 'Should match customName of Nu account with lastFour 8910');
console.log('✓ Inbound push/notification matched to "Moradita Nu" via last 4 digits (8910)');

console.log('--- 11. Testing User Bank Account Deletion ---');
const delAccRes = await fetch(`${base}/api/sync/config`, {
  method: 'POST',
  headers: { Cookie: cookie, Origin: base, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'delete_account',
    id: addAcc1Data.id
  })
});
assert.equal(delAccRes.status, 200);
const delAccData = await delAccRes.json();
assert.equal(delAccData.ok, true);

// Verify config no longer includes the deleted account
const updatedConfigRes = await fetch(`${base}/api/sync/config`, { headers: { Cookie: cookie } });
const updatedConfig = await updatedConfigRes.json();
const foundDeleted = updatedConfig.bankAccounts.some((a) => a.id === addAcc1Data.id);
assert.equal(foundDeleted, false, 'Deleted account must not appear in bankAccounts list');
console.log('✓ User bank account unlinked and deleted safely');

console.log('\n===========================================');
console.log('ALL SYNC AUTOMATION & MULTI-USER TESTS PASSED ✓');
console.log('===========================================');
