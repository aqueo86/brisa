import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const output=ts.transpileModule(fs.readFileSync('lib/messages.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace("'./finance'","'../lib/finance.ts'");
fs.writeFileSync('.sites-runtime/messages-test.mjs',output);
const {analyzeMessage}=await import('../.sites-runtime/messages-test.mjs');
for(const [text,kind,amount] of [
 ['Bancolombia: Compraste por $85.900 en Supermercado con tarjeta *4567 el 2026-09-14. Saldo disponible $1.200.000.','expense',85900],
 ['Nequi: Recibiste $250.000 el 2026-09-14.','income',250000],
 ['Compra rechazada por $180.000. No se realizó ningún débito.','review',180000],
 ['Tienes un crédito preaprobado por $5.000.000. Solicita tu oferta.','ignore',5000000],
 ['Transferiste $25.000 entre tus cuentas propias.','review',25000],
 ['Se debitó por $70.000 de cuenta 1234 el 14/09/2026.','expense',70000]
 ]){const a=analyzeMessage(text);assert.equal(a.classification,kind,text);assert.equal(a.draft.amount,amount);}
const base='http://localhost:5173';const html=await fetch(base+'/');assert.equal(html.status,200);
const login=await fetch(base+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});const cookie=login.headers.get('set-cookie').split(';')[0];
const request=async(path,body,auth=true)=>{const r=await fetch(base+path,{method:body?'POST':'GET',headers:{...(auth?{Cookie:cookie}:{}),Origin:base,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};};
const message={action:'add',sender:'QA local',content:'Compraste por $42.000 en Restaurante el 2026-09-14. Prueba '+crypto.randomUUID()};
assert.equal((await request('/api/inbox',message,false)).status,401);
const r=await request('/api/inbox',message);assert.equal(r.status,200,JSON.stringify(r));const id=r.body.message.id;
assert.equal((await request('/api/inbox',message)).body.message.id,id);
const m={id:'sms-'+id,inboxId:id,description:'QA mensaje confirmado',amount:42000,kind:'expense',category:'Alimentación',date:'2026-09-14',account:'Prueba local',source:'Texto importado'};
assert.equal((await request('/api/finance',{action:'save',data:m})).status,200);
assert.equal((await request('/api/finance',{action:'save',data:m})).status,200);
assert.equal((await request('/api/finance')).body.movements.filter(x=>x.id===m.id).length,1);
assert.equal((await request('/api/inbox')).body.messages.find(x=>x.id===id).status,'registered');
await request('/api/finance',{action:'delete',id:m.id});assert.equal((await request('/api/inbox')).body.messages.find(x=>x.id===id).status,'pending');
await request('/api/inbox',{action:'status',id,status:'discarded'});assert.equal((await request('/api/finance',{action:'save',data:m})).status,409);
console.log('PASS: six SMS classifications, primary amount, date, login required, persistent inbox, duplicate suppression, atomic registration and deletion/review state. Local QA message archived.');
