import assert from 'node:assert/strict';
import { summary, parseMessage, demoRows } from '../lib/finance.ts';
assert.equal(summary(demoRows('2026-09')).available,2119000);
for(const [text,value,kind] of [['Compraste $85.900 en Supermercado el 2026-09-14',85900,'expense'],['Recibiste COP 1.500.000,00 el 2026-09-03',1500000,'income'],['Total: 12,345.00',12345,'expense']]) {const p=parseMessage(text);assert.equal(p.amount,value);assert.equal(p.kind,kind);}
assert.equal(parseMessage('mensaje sin valor').amount,0);
const base='http://localhost:5173';
const login=await fetch(base+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});
const cookie=login.headers.get('set-cookie').split(';')[0];
const call=async(body,auth=true)=>{const r=await fetch(base+'/api/finance',{method:body?'POST':'GET',headers:{...(auth?{Cookie:cookie}:{}),'Content-Type':'application/json',...(body?{Origin:base}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};};
const id=crypto.randomUUID();const m={id,description:'Prueba local de persistencia',amount:12345,kind:'expense',category:'Otros',date:'2026-09-14',account:'Prueba',source:'Manual'};
assert.equal((await call({action:'save',data:m},false)).status,401);
let r=await call({action:'save',data:m});assert.equal(r.status,200,JSON.stringify(r));
assert.ok((await call()).data.movements.some(x=>x.id===id));
await call({action:'save',data:{...m,amount:54321}});assert.equal((await call()).data.movements.find(x=>x.id===id).amount,54321);
assert.equal((await call({action:'save',data:{...m,amount:-1}})).status,400);
assert.equal((await call({action:'save',data:{...m,date:'2026-02-31'}})).status,400);
const badOrigin=await fetch(base+'/api/finance',{method:'POST',headers:{Origin:'https://untrusted.example','Content-Type':'application/json'},body:JSON.stringify({action:'save',data:m})});assert.equal(badOrigin.status,403);
await call({action:'delete',id});assert.ok(!(await call()).data.movements.some(x=>x.id===id));
console.log('PASS: totals, parsing, persistent create/edit/delete, authentication, invalid amounts/dates and cross-origin protection. Local test data removed.');
