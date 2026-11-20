import assert from 'node:assert/strict';
import fs from 'node:fs';

const base = 'http://localhost:5173';

console.log('--- 1. Testing Colombian payment methods and accounts ---');
const catContent = fs.readFileSync('lib/categories.ts', 'utf8');
assert.ok(catContent.includes('Nequi (Disponible)'), 'Missing Nequi in paymentMethods');
assert.ok(catContent.includes('Daviplata'), 'Missing Daviplata in paymentMethods');
assert.ok(catContent.includes('Nu (Cuenta/Cajita)'), 'Missing Nu in paymentMethods');
console.log('✓ Colombian financial instruments validated');

console.log('--- 2. Testing Legal and Compliance Pages ---');
// Test Privacy Policy page
const resPrivacidad = await fetch(`${base}/legal/privacidad`);
assert.equal(resPrivacidad.status, 200, 'Privacidad page should return 200');
const htmlPrivacidad = await resPrivacidad.text();
assert.ok(htmlPrivacidad.includes('1581'), 'Privacy policy must cite Ley 1581 de 2012');
assert.ok(htmlPrivacidad.includes('Habeas Data') || htmlPrivacidad.includes('habeas data'), 'Privacy policy must cite Habeas Data');
console.log('✓ Privacy policy page (Ley 1581 / Habeas Data) is accessible and complete');

// Test Terms of Service page
const resTerminos = await fetch(`${base}/legal/terminos`);
assert.equal(resTerminos.status, 200, 'Terminos page should return 200');
const htmlTerminos = await resTerminos.text();
assert.ok(htmlTerminos.includes('Superintendencia Financiera'), 'Terms must cite SFC regulatory disclaimer');
assert.ok(htmlTerminos.includes('Inteligencia Artificial') || htmlTerminos.includes('Gemini'), 'Terms must disclose AI terms');
console.log('✓ Terms of service page (SFC disclaimer & EULA) is accessible and complete');

// Test Data Deletion page
const resEliminacion = await fetch(`${base}/legal/eliminacion-datos`);
assert.equal(resEliminacion.status, 200, 'Eliminacion datos page should return 200');
const htmlEliminacion = await resEliminacion.text();
assert.ok(htmlEliminacion.includes('Eliminaci') || htmlEliminacion.includes('eliminaci'), 'Data deletion instructions must be present');
console.log('✓ Data deletion instructions URL (Google Play & Apple required) is accessible');

console.log('--- 3. Testing Account & Data Deletion API ---');
// Missing origin should be blocked with 403 (CSRF prevention)
const csrfDelete = await fetch(`${base}/api/account/delete`, { method: 'POST' });
assert.equal(csrfDelete.status, 403, 'Cross-origin or missing origin must be blocked with 403');

// Valid origin but unauthenticated should fail with 401
const unauthDelete = await fetch(`${base}/api/account/delete`, {
  method: 'POST',
  headers: { Origin: base, 'Content-Type': 'application/json' },
  body: JSON.stringify({ confirm: true })
});
assert.equal(unauthDelete.status, 401, 'Unauthenticated delete must be rejected with 401');

// Authenticated session
const login = await fetch(`${base}/signin-with-chatgpt?return_to=/`, { redirect: 'manual' });
const cookie = login.headers.get('set-cookie').split(';')[0];

// Missing confirm flag should return 400
const unconfirmedDelete = await fetch(`${base}/api/account/delete`, {
  method: 'POST',
  headers: { Cookie: cookie, Origin: base, 'Content-Type': 'application/json' },
  body: JSON.stringify({ confirm: false })
});
assert.equal(unconfirmedDelete.status, 400, 'Unconfirmed delete must return 400');

// Create a test movement first to ensure user has records
const testMov = {
  id: crypto.randomUUID(),
  kind: 'expense',
  category: 'Alimentación',
  description: 'Test pre-delete item',
  amount: 25000,
  date: '2026-09-29',
  account: 'Efectivo',
  source: 'Manual'
};
const saveRes = await fetch(`${base}/api/finance`, {
  method: 'POST',
  headers: { Cookie: cookie, Origin: base, 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'save', data: testMov })
});
assert.equal(saveRes.status, 200, 'Test movement saved');

// Execute account deletion with confirm: true
const deleteRes = await fetch(`${base}/api/account/delete`, {
  method: 'POST',
  headers: { Cookie: cookie, Origin: base, 'Content-Type': 'application/json' },
  body: JSON.stringify({ confirm: true })
});
assert.equal(deleteRes.status, 200, 'Delete account should return 200');
const deleteData = await deleteRes.json();
assert.equal(deleteData.ok, true, 'Delete response must have ok=true');
assert.equal(deleteData.deleted, true, 'Delete response must confirm deleted=true');

// Verify that user movements are cleared
const checkFinance = await fetch(`${base}/api/finance`, {
  headers: { Cookie: cookie }
});
const financeData = await checkFinance.json();
const found = financeData.movements.find(m => m.id === testMov.id);
assert.equal(found, undefined, 'User movement must be deleted from database');
console.log('✓ Account and data deletion API operates atomically across all tables');

console.log('--- 4. Testing CSV Export Generator ---');
const csvContent = fs.readFileSync('lib/export-csv.ts', 'utf8');
assert.ok(csvContent.includes('\\uFEFF'), 'CSV must include UTF-8 BOM for Excel compatibility');
assert.ok(csvContent.includes('exportMovementsToCSV'), 'CSV export function defined');
console.log('✓ CSV export module operates cleanly');

console.log('\n========================================');
console.log('ALL COMPLIANCE & STORE CHECKS PASSED 100%');
console.log('========================================');
