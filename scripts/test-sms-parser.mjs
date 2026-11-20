import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';

const output = ts.transpileModule(fs.readFileSync('lib/messages.ts','utf8'),{
  compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}
}).outputText.replace("'./finance'","'./finance.mjs'");
fs.writeFileSync('.sites-runtime/messages.mjs', output);

const { analyzeMessage } = await import('../.sites-runtime/messages.mjs');
for(const [text,kind,amount] of [
  ['Bancolombia: Compraste por $85.900 en Supermercado con tarjeta *4567 el 2026-09-14. Saldo disponible $1.200.000.','expense',85900],
  ['Nequi: Recibiste $250.000 el 2026-09-14.','income',250000],
  ['Compra rechazada por $180.000. No se realizó ningún débito.','review',180000],
  ['Tienes un crédito preaprobado por $5.000.000. Solicita tu oferta.','ignore',5000000],
  ['Transferiste $25.000 entre tus cuentas propias.','review',25000],
  ['Se debitó por $70.000 de cuenta 1234 el 14/09/2026.','expense',70000]
]){
  const a = analyzeMessage(text);
  assert.equal(a.classification, kind, text);
  assert.equal(a.draft.amount, amount);
}
console.log('✓ All 6 SMS classification patterns and amount extraction verified successfully!');
