import assert from 'node:assert/strict';
import {cardError,purchaseError,creditSchedule,suggestedFirstMonth,monthlyRate,creditDate} from '../lib/credit.ts';
const card={id:crypto.randomUUID(),name:'Tarjeta de prueba local',bank:'Prueba',last4:'1234',limit:5000000,rate:12.682503013196978,rateType:'annual',cutDay:20,payDay:5};
const purchase={id:crypto.randomUUID(),cardId:card.id,description:'Compra de prueba local',amount:1000000,date:'2026-09-21',installments:3,rate:0,rateType:'monthly',firstMonth:'2026-11',payDay:31};
assert.equal(cardError(card),null);assert.equal(purchaseError(purchase),null);
assert.equal(suggestedFirstMonth('2026-09-20',card),'2026-10');assert.equal(suggestedFirstMonth('2026-09-21',card),'2026-11');
assert.equal(suggestedFirstMonth('2026-12-21',card),'2027-02');assert.equal(creditDate('2028-02',31),'2028-02-29');
assert.ok(Math.abs(monthlyRate(card.rate,'annual')-.01)<1e-12);
const schedule=creditSchedule(purchase);assert.equal(schedule.reduce((a,s)=>a+s.principal,0),1000000);assert.equal(schedule.reduce((a,s)=>a+s.interest,0),0);assert.equal(schedule[2].date,'2027-01-31');assert.equal(schedule[2].principal,333334);
assert.deepEqual(creditSchedule({...purchase,amount:300000,rate:2}).map(s=>s.total),[106000,104000,102000]);
assert.ok(purchaseError({...purchase,firstMonth:'2026-08'}));assert.ok(purchaseError({...purchase,installments:0}));assert.ok(purchaseError({...purchase,date:'2026-02-30'}));assert.ok(cardError({...card,rate:NaN}));assert.ok(cardError({...card,last4:'123456789'}));
if(!process.argv.includes('--api')){console.log('PASS credit schedules: annual conversion, cutoff boundary, year rollover, leap day, capital rounding, zero interest and invalid inputs.');process.exit(0);}
const base='http://localhost:5173';const login=await fetch(base+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});const cookie=login.headers.get('set-cookie').split(';')[0];
async function call(path,body,auth=true){const r=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{...(auth?{Cookie:cookie}:{}),...(body?{Origin:base,'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
assert.equal((await call('credit',null,false)).status,401);assert.equal((await call('credit',{action:'card',data:card},false)).status,401);
assert.equal((await call('credit',{action:'card',data:card})).status,200);assert.equal((await call('credit',{action:'purchase',data:purchase})).status,200);
assert.equal((await call('credit',{action:'purchase',data:{...purchase,cardId:'not-owned'}})).status,400);
assert.equal((await call('credit',{action:'purchase',data:{...purchase,rate:-1}})).status,400);
assert.ok((await call('credit')).data.purchases.some(p=>p.id===purchase.id));
const movement={id:schedule[0].id,description:'Cuota prueba',amount:schedule[0].total,kind:'expense',category:'Cuotas y deudas',date:'2026-11-30',account:'Cuenta prueba',source:'Manual'};
assert.equal((await call('finance',{action:'save',data:movement})).status,200);await call('finance',{action:'save',data:movement});assert.equal((await call('finance')).data.movements.filter(m=>m.id===movement.id).length,1);
assert.equal((await call('credit',{action:'purchase',data:{...purchase,amount:2000000}})).status,409);assert.equal((await call('credit',{action:'delete-purchase',id:purchase.id})).status,409);
assert.ok((await call('backup')).data.data.credit_purchases.some(p=>p.id===purchase.id));
await call('finance',{action:'delete',id:movement.id});assert.equal((await call('credit',{action:'delete-purchase',id:purchase.id})).status,200);
console.log('PASS authenticated persistence, validation, foreign card rejection, unique payment, paid purchase protection, backup. Test purchase/payment removed; empty local test card retained.');
