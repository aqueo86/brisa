import {parseMessage, today, type Movement} from './finance';
export type InboxMessage={id:string;content:string;sender:string;created_at:string;status:'pending'|'registered'|'discarded'};
export function analyzeMessage(content:string){
 const t=content.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const draft=parseMessage(content);
 const negative=/rechazad|declinad|fallid|no (?:se )?(?:realizo|aprobo|proces[oó])|anulad|cancelad|revers|reembols|devolucion/.test(t);
 const promotional=/codigo de (?:verificacion|seguridad)|otp\b|preaprobad|oferta|promocion|solicita tu|puedes comprar|cupo disponible|vence|vencimiento|debes pagar/.test(t);
 const debit=/\b(?:compraste|compra (?:por|en|aprobada|realizada)|pagaste|pago (?:por|en|exitoso|realizado|aprobado)|retiro (?:por|exitoso|realizado)|retiraste|se debito|debito (?:por|de|automatico)|debitamos|cargo (?:por|de)|transferiste)\b/.test(t);
 const credit=/\b(?:recibiste|recibio|recibido|te consignaron|abono (?:por|de)|consignacion recibida|nomina abonada)\b/.test(t);
 const transfer=/entre (?:mis|tus|sus|propias) cuentas|cuentas propias/.test(t);
 let classification:'expense'|'income'|'review'|'ignore'=negative||transfer?'review':promotional?'ignore':debit&&credit?'review':debit?'expense':credit?'income':'review';
 const contextual=content.match(/(?:por|valor(?:\s+de)?|monto(?:\s+de)?)\s*:?\s*(?:COP\s*\$?|\$)\s*([\d][\d.,]*)/i);
 if(contextual)draft.amount=parseMessage('$'+contextual[1]).amount;
 const amounts=content.match(/(?:COP\s*\$?|\$)\s*[\d][\d.,]*/gi)||[];
 if(!draft.amount||draft.amount<=0||!Number.isSafeInteger(draft.amount)){if(classification!=='ignore')classification='review';}
 const dateDMY=content.match(/\b(\d{2})[/-](\d{2})[/-](\d{4})\b/);if(dateDMY)draft.date=`${dateDMY[3]}-${dateDMY[2]}-${dateDMY[1]}`;
 const account=content.match(/(?:cuenta|cta\.?|tarjeta|tc)\s*(?:terminada?\s+en|[nN][o°.]*)?\s*[*xX•-]*\s*(\d{4,})/i);
 const bank=content.match(/bancolombia|davivienda|daviplata|nequi|banco de bogot[aá]|bbva|nu bank/i)?.[0];
 draft.account=[bank,account?`Cuenta •${account[1].slice(-4)}`:null].filter(Boolean).join(' · ')||'Cuenta principal';
 if(/netflix|spotify|cine|restaurante|cafe|rappi|ropa|amazon/.test(t))draft.category=/restaurante|rappi/.test(t)?'Alimentación':'Consumo';
 if(/servicio|energia|acueducto|internet|gas natural/.test(t))draft.category='Servicios';
 if(/cuota|credito hipotecario|prestamo/.test(t))draft.category='Cuotas y deudas';
 const reason=negative?'Operación rechazada, anulada o devuelta: no asumir un gasto.':transfer?'Parece una transferencia entre cuentas propias.':promotional?'Parece una oferta, recordatorio o código; no confirma un movimiento.':debit&&credit?'Hay señales de entrada y salida de dinero.':!draft.amount?'No se encontró un importe verificable.':classification==='expense'?'El texto sugiere una salida de dinero.':classification==='income'?'El texto sugiere una entrada de dinero.':'El texto no confirma si hubo entrada o salida de dinero.';
 draft.kind=classification==='income'?'income':'expense';
 return {classification,reason,draft,warning:[amounts.length>1?'Hay varios importes; comprueba el valor de la operación.':'',!content.match(/\b\d{4}-\d{2}-\d{2}\b/)&&!dateDMY?'Sin fecha completa: se sugiere hoy.':''].filter(Boolean).join(' ')};
}
export function messageExamples():InboxMessage[]{return [
 'Bancolombia: Compraste por $85.900 en Supermercado con tarjeta *4567 el '+today()+'. Saldo disponible $1.200.000.',
 'Nequi: Recibiste $250.000 en tu cuenta el '+today()+'.',
 'Compra rechazada por $180.000. No se realizó ningún débito.',
 'Tienes un crédito preaprobado por $5.000.000. Solicita tu oferta.'
 ].map((content,i)=>({id:'example-sms-'+i,content,sender:i===1?'Nequi':'Banco · ejemplo',created_at:new Date().toISOString(),status:'pending'}));}
