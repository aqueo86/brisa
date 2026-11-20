import assert from 'node:assert/strict';
const base='http://localhost:5173';
const login=await fetch(base+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});const cookie=login.headers.get('set-cookie').split(';')[0];
async function call(path,body,auth=true){const r=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{...(auth?{Cookie:cookie}:{}),...(body?{Origin:base,'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
for(const [kind,category] of [['income','Salario'],['expense','Mascotas'],['saving','Educación']]){const m={id:crypto.randomUUID(),kind,category,description:'Prueba de conceptos',amount:30000,date:'2026-09-21',account:'Nequi',source:'Manual'};assert.equal((await call('finance',{action:'save',data:m})).status,200);const row=(await call('finance')).data.movements.find(r=>r.id===m.id);assert.equal(row.category,category);await call('finance',{action:'delete',id:m.id});}
assert.equal((await call('assistant',null,false)).status,401);assert.equal((await call('assistant')).data.configured,false);assert.equal((await call('assistant',{text:'Gasté 5000 en efectivo'})).status,503);
console.log('PASS new expense/income categories, goal compatibility, assistant authentication and explicit missing-key behavior. Fixtures removed.');
