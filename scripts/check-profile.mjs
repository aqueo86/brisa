import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
fs.mkdirSync('.sites-runtime',{recursive:true});
fs.writeFileSync('.sites-runtime/profile-test.mjs',ts.transpileModule(fs.readFileSync('lib/profile.ts','utf8').replace("from './finance'","from '../lib/finance.ts'"),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const {periodRange,emptyProfile,profileError,reportHTML}=await import('../.sites-runtime/profile-test.mjs');
assert.equal(periodRange('2024-02-15','monthly').end,'2024-02-29');
assert.deepEqual(periodRange('2026-09-13','weekly'),{start:'2026-09-07',end:'2026-09-13',type:'weekly'});
assert.equal(periodRange('2026-09-14','daily').end,'2026-09-14');
const profile={...structuredClone(emptyProfile),name:'Prueba <script>',motivations:['Saber en qué gasto'],goals:[{name:'Ahorro',target:1000,current:0,deadline:'2027-01-01',priority:'Alta'}]};
assert.equal(profileError(profile),null);
assert.ok(profileError({...profile,frequency:'both'}));
const base='http://localhost:5173';
const login=await fetch(base+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});
const cookie=login.headers.get('set-cookie').split(';')[0];
async function call(path,body,auth=true){const r=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{...(auth?{Cookie:cookie}:{}),...(body?{Origin:base,'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
assert.equal((await call('profile',profile,false)).status,401);
assert.equal((await call('profile',profile)).status,200);
assert.equal((await call('profile')).data.profile.frequency,'weekly');
assert.equal((await call('profile',{...profile,netIncome:-1})).status,400);
for(const type of ['daily','weekly','monthly']){const first=await call('reports',{type,date:'2024-02-15'});assert.equal(first.status,200,JSON.stringify(first));const again=await call('reports',{type,date:'2024-02-15'});assert.equal(first.data.report.id,again.data.report.id);assert.equal(first.data.report.data.totals.income,0);assert.ok(reportHTML(first.data.report).includes('&lt;script&gt;'));}
assert.equal((await call('reports',{type:'daily',date:'2024-02-31'})).status,400);
assert.equal((await call('reports',{action:'due'})).status,200);
assert.deepEqual((await call('reports',null,false)).data.reports,[]);
assert.equal((await call('drive-config')).data.configured,false);
console.log('PASS: profile persistence/validation/auth, daily/weekly/monthly boundaries, report regeneration and escaped export. Local-only fixture retained for UI review.');
