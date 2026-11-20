import assert from 'node:assert/strict';
const base='http://localhost:5173';
const anon=await fetch(base+'/api/backup');assert.equal(anon.status,401);
const login=await fetch(base+'/signin-with-chatgpt?return_to=/panel',{redirect:'manual'});const cookie=login.headers.get('set-cookie').split(';')[0];
async function call(path,body){const r=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{Cookie:cookie,...(body?{Origin:base,'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
const original=(await call('profile')).data.profile;assert.ok(original,'Run check-profile.mjs first for a local fixture.');
const before=(await call('finance')).data.movements;
const changed={...original,challenge:'Prueba local de recuperación '+Date.now()};
assert.equal((await call('profile',changed)).status,200);
assert.equal((await call('profile')).data.profile.challenge,changed.challenge);
const history=await call('profile-history');assert.ok(history.data.revisions.length>0);
assert.equal((await call('profile-history',{id:history.data.revisions[0].id})).status,200);
assert.deepEqual((await call('profile')).data.profile,original);
assert.deepEqual((await call('finance')).data.movements,before);
assert.equal((await call('profile-history',{id:'not-owned-or-missing'})).status,404);
const backup=await call('backup');assert.equal(backup.status,200);assert.equal(backup.data.format,'brisa-backup');assert.deepEqual(backup.data.data.profiles[0].data,original);assert.ok(!('owner' in backup.data.data.profiles[0]));
const welcome=await(await fetch(base)).text();for(const text of ['Facebook','Hotmail','Apple','Google'])assert.ok(welcome.includes(text));
const protectedPage=await fetch(base+'/panel',{redirect:'manual'});assert.ok([302,303,307,308].includes(protectedPage.status));
console.log('PASS: welcome provider disclosure, protected dashboard, private export, saved profile reload, restore and unchanged movements. Local original profile restored.');
