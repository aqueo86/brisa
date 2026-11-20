import { getChatGPTUser } from '../../chatgpt-auth';
import {expenseCategories,incomeCategories,validCategorySettings} from '../../../lib/categories';
import { database } from '../../../db/raw';
import { categories, defaults, goalOptions } from '../../../lib/finance';
export const dynamic='force-dynamic';
export async function GET(){
 const user=await getChatGPTUser();if(!user)return Response.json({user:null,movements:[],preferences:defaults},{headers:{'Cache-Control':'no-store'}});
 try {const db=database();const [rows,pref,profile]=await Promise.all([db.prepare('SELECT id, description, amount, kind, category, date, account, source FROM movements WHERE owner = ? ORDER BY date DESC').bind(user.userId).all(),db.prepare('SELECT data FROM preferences WHERE owner = ?').bind(user.userId).first<{data:string}>(),db.prepare('SELECT owner FROM profiles WHERE owner = ?').bind(user.userId).first()]);
 return Response.json({profileComplete:!!profile,user:{name:user.fullName||'Tu espacio',email:user.email},movements:rows.results,preferences:pref?JSON.parse(pref.data):defaults},{headers:{'Cache-Control':'no-store'}});
 }catch{ return Response.json({error:'No pudimos cargar tus datos. Intenta de nuevo.'},{status:503}); }
}
export async function POST(request:Request){
 const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin)return Response.json({error:'Solicitud no permitida.'},{status:403});
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Inicia sesión para guardar tus datos.'},{status:401});
 try{
 const text=await request.text();if(text.length>16000)return Response.json({error:'El registro es demasiado largo.'},{status:413});
 const body=JSON.parse(text);const db=database();
 if(body.action==='preferences'){
 const p=body.data;
 if(p?.categorySettings!==undefined&&!validCategorySettings(p.categorySettings))return Response.json({error:'Revisa tus categorías favoritas.'},{status:400});
 if(!p||!Number.isSafeInteger(p.income)||p.income<0||p.income>1e12||!Array.isArray(p.allocations)||p.allocations.length!==9||p.allocations.some((v:unknown)=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>100)||Math.abs(p.allocations.reduce((a:number,b:number)=>a+b,0)-100)>0.01||![p.travelGoal,p.savingGoal].every(v=>Number.isSafeInteger(v)&&v>0&&v<=1e12))return Response.json({error:'Revisa los valores. Los porcentajes deben sumar 100 %.'},{status:400});
 await db.prepare('INSERT INTO preferences (owner,data) VALUES (?,?) ON CONFLICT(owner) DO UPDATE SET data=excluded.data').bind(user.userId,JSON.stringify(p)).run();
 }else if(body.action==='delete'){
 if(typeof body.id!=='string')return Response.json({error:'Registro inválido.'},{status:400});
 await db.batch([db.prepare('DELETE FROM movements WHERE id = ? AND owner = ?').bind(body.id,user.userId),db.prepare("UPDATE inbox SET status = 'pending' WHERE id = ? AND owner = ? AND status = 'registered'").bind(body.id.startsWith('sms-')?body.id.slice(4):'',user.userId)]);
 }else if(body.action==='save'){
 const m=body.data;const validDate=typeof m?.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(m.date)&&!Number.isNaN(Date.parse(m.date))&&new Date(m.date).toISOString().slice(0,10)===m.date;
 if(!m||typeof m.id!=='string'||m.id.length>80||!m.id||typeof m.description!=='string'||!m.description.trim()||m.description.length>140||!Number.isSafeInteger(m.amount)||m.amount<=0||m.amount>1e12||!['income','expense','saving'].includes(m.kind)||!(m.kind==='saving'?goalOptions:m.kind==='income'?incomeCategories:[...expenseCategories,'Ahorro']).includes(m.category)||!validDate||typeof m.account!=='string'||!m.account.trim()||m.account.length>60||!['Manual','Texto importado','Foto recibo','Apple Pay','Google Pay','Correo bancario','Notificación bancaria','Sincronización automática'].includes(m.source)||m.kind==='saving'&&!goalOptions.includes(m.category))return Response.json({error:'Revisa el concepto, la fecha y el valor del movimiento.'},{status:400});
 if(m.inboxId!==undefined){if(typeof m.inboxId!=='string'||m.id!=='sms-'+m.inboxId)return Response.json({error:'Mensaje inválido.'},{status:400});const message=await db.prepare('SELECT status FROM inbox WHERE id = ? AND owner = ?').bind(m.inboxId,user.userId).first<{status:string}>();if(!message||message.status==='discarded')return Response.json({error:'Este mensaje no está pendiente en tu bandeja.'},{status:409});if(message.status==='registered')return Response.json({ok:true});}
 const statement=db.prepare('INSERT INTO movements (id,owner,description,amount,kind,category,date,account,source) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET description=excluded.description, amount=excluded.amount,kind=excluded.kind,category=excluded.category,date=excluded.date,account=excluded.account,source=excluded.source WHERE movements.owner = excluded.owner').bind(m.id,user.userId,m.description.trim(),m.amount,m.kind,m.category,m.date,m.account.trim(),m.source);
 if(m.inboxId)await db.batch([statement,db.prepare("UPDATE inbox SET status = 'registered' WHERE id = ? AND owner = ?").bind(m.inboxId,user.userId)]);else await statement.run();
 }else return Response.json({error:'Acción inválida.'},{status:400});
 return Response.json({ok:true});
 }catch{return Response.json({error:'No se guardaron los cambios. Reintenta sin cerrar el formulario.'},{status:503});}
}
