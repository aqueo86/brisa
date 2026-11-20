import assert from 'node:assert/strict';
import {dueDate,isDueIn,daysUntil,occurrenceId,fixedError} from '../lib/fixed-expenses.ts';
assert.equal(dueDate('2024-02',31),'2024-02-29');
assert.equal(dueDate('2025-02',30),'2025-02-28');
assert.equal(dueDate('2026-04',31),'2026-04-30');
assert.equal(daysUntil('2027-01-01','2026-12-30'),2);
const item={id:crypto.randomUUID(),name:'Internet prueba',amount:95000,day:15,endDate:'2026-12-14',startMonth:'2026-09',category:'Servicios',account:'Cuenta principal',remindDays:3,active:true};
assert.equal(fixedError(item),null);assert.equal(isDueIn(item,'2026-12'),false);assert.equal(isDueIn({...item,endDate:'2026-12-15'},'2026-12'),true);assert.equal(isDueIn({...item,active:false},'2026-09'),false);assert.equal(isDueIn(item,'2026-08'),false);
assert.ok(fixedError({...item,day:32}));assert.ok(fixedError({...item,endDate:'2026-02-31'}));
const base='http://localhost:5173';const login=await fetch(base+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});const cookie=login.headers.get('set-cookie').split(';')[0];
async function call(path,body,auth=true){const r=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{...(auth?{Cookie:cookie}:{}),...(body?{Origin:base,'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
assert.equal((await call('fixed-expenses',item,false)).status,401);assert.equal((await call('fixed-expenses',item)).status,200);assert.ok((await call('fixed-expenses')).data.items.some(r=>r.id===item.id));assert.equal((await call('fixed-expenses',{...item,day:0})).status,400);assert.equal((await call('fixed-expenses',null,false)).data.items.length,0);
const movement={id:occurrenceId(item.id,'2026-09'),description:item.name,amount:item.amount,kind:'expense',category:item.category,date:'2026-09-15',account:item.account,source:'Manual'};
await call('finance',{action:'save',data:movement});await call('finance',{action:'save',data:movement});assert.equal((await call('finance')).data.movements.filter(r=>r.id===movement.id).length,1);
await call('finance',{action:'delete',id:movement.id});await call('fixed-expenses',{...item,active:false});
console.log('PASS: month ends, leap year, reminders across year, inclusive end date, validation, authentication, persistence, idempotent payment. Local fixture paused and payment removed.');
