export const goalOptions=['Ahorro','Viajes','Salud','Educación','Emergencias'];
export type Movement={id:string;description:string;amount:number;kind:'income'|'expense'|'saving';category:string;date:string;account:string;source:string};
export const categories=['Vivienda','Alimentación','Transporte','Cuotas y deudas','Servicios','Consumo','Viajes','Otros','Ahorro'];
export const colors=['#368b78','#eeab55','#729ee9','#a89bd8','#63b5b0','#e68e9c','#ba92db','#95a3b2','#267a62'];
export const defaults={income:6000000,allocations:[30,12,5,0,3,20,10,0,20],travelGoal:5000000,savingGoal:10000000};
export type Preferences=typeof defaults & {categorySettings?:import('./categories').CategorySettings};
export const money=(n:number)=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(n);
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function summary(rows:Movement[]){const sum=(kind:string)=>rows.filter(x=>x.kind===kind).reduce((a,x)=>a+x.amount,0);const income=sum('income'),expense=sum('expense'),saving=sum('saving');return {income,expense,saving,available:income-expense-saving};}
export function demoRows(month:string):Movement[]{return [
 ['01','Nómina mensual',5500000,'income','Salario','Bancolombia'],
 ['02','Arriendo apartamento',1800000,'expense','Vivienda','Bancolombia'],
 ['03','Mercado del mes',385000,'expense','Alimentación','Tarjeta débito'],
 ['04','Fondo de tranquilidad',800000,'saving','Ahorro','Bancolombia'],
 ['05','Internet y servicios',180000,'expense','Servicios','Bancolombia'],
 ['06','Pago cliente asesoría',850000,'income','Honorarios','Nequi'],
 ['07','Cobro venta producto',320000,'income','Ventas','Nequi'],
 ['08','Un café y una pausa',18500,'expense','Consumo','Nequi'],
 ['09','Próxima aventura',350000,'saving','Viajes','Nu (Cuenta/Cajita)'],
 ['10','Transporte semanal',86000,'expense','Transporte','Efectivo'],
 ['11','Pago almuerzo equipo',92000,'expense','Alimentación','Nequi'],
 ['12','Traslado a Bancolombia',400000,'expense','Traslado entre cuentas','Nequi'],
 ['12','Recepción de traslado Nequi',400000,'income','Traslado entre cuentas','Bancolombia'],
 ['13','Suscripción de software',45000,'expense','Consumo','Nu (Cuenta/Cajita)'],
 ['14','Supermercado y despensa',148600,'expense','Alimentación','Tarjeta débito'],
 ['16','Ingreso clase particular',180000,'income','Honorarios','Daviplata']
 ].map((x,i)=>({id:'demo-'+i,date:month+'-'+x[0],description:String(x[1]),amount:Number(x[2]),kind:x[3] as Movement['kind'],category:String(x[4]),account:String(x[5]),source:'Ejemplo'}));}
export function parseMessage(input:string):Partial<Movement>{
 const text=input.replace(/<[^>]*>/g,' ');const match=text.match(/(?:COP\s*\$?|\$)\s*([\d][\d.,]*)/i)||text.match(/(?:total(?:\s+a\s+pagar)?|valor|monto)\s*[:=]?\s*([\d][\d.,]*)/i);
 let raw=match?.[1]||''; if(/,\d{1,2}$/.test(raw))raw=raw.replace(/\./g,'').replace(',','.');else if(/\.\d{1,2}$/.test(raw))raw=raw.replace(/,/g,'');else raw=raw.replace(/[.,]/g,'');
 const dateMatch=text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);const received=/recibiste|recibido|abono|consignaci[oó]n|ingreso|n[oó]mina/i.test(text);
 const category=/mercado|restaurante|almuerzo|alimento/i.test(text)?'Alimentación':/arriendo|alquiler/i.test(text)?'Vivienda':/uber|taxi|transporte/i.test(text)?'Transporte':'Otros';
 return {description:text.trim().slice(0,100),amount:Number(raw)||0,kind:received?'income':'expense',category,date:dateMatch?.[0]||today(),account:'Cuenta principal',source:'Texto importado'};
}
