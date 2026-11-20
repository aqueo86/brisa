import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {expenseCategories,incomeCategories,paymentMethods,incomeAccounts} from '../../../lib/categories';
import {today} from '../../../lib/finance';
import {assistantResult} from '../../../lib/assistant';

export const dynamic='force-dynamic';

export async function GET(){
  if(!await getChatGPTUser()) return Response.json({configured:false},{status:401});
  if(!env.GEMINI_API_KEY) return Response.json({configured:false,error:'Falta configurar GEMINI_API_KEY como secreto del sitio.'},{headers:{'Cache-Control':'no-store'}});
  try{
    const model=env.GEMINI_MODEL||'gemini-2.5-flash';
    if(!/^[a-zA-Z0-9.-]+$/.test(model)) throw Error();
    const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model,{
      headers:{'x-goog-api-key':env.GEMINI_API_KEY},
      signal:AbortSignal.timeout(10000)
    });
    return Response.json({
      configured:r.ok,
      ...(!r.ok?{error:'La clave está configurada, pero Google no permite acceder al modelo. Revisa la clave y el modelo.'}:{})
    },{headers:{'Cache-Control':'no-store'}});
  }catch{
    return Response.json({configured:false,error:'No pudimos verificar la conexión con Google. Reintenta.'},{headers:{'Cache-Control':'no-store'}});
  }
}

export async function POST(request:Request){
  if(request.headers.get('origin')!==new URL(request.url).origin) return Response.json({error:'Solicitud no permitida.'},{status:403});
  if(!await getChatGPTUser()) return Response.json({error:'Inicia sesión para usar el asistente.'},{status:401});
  if(!env.GEMINI_API_KEY) return Response.json({error:'Gemini aún no está conectado. Falta configurar su clave de API en el servidor.'},{status:503});

  try{
    const raw=await request.text();
    // Allow up to 4MB for image uploads (base64 compressed)
    if(raw.length>4500000) return Response.json({error:'El archivo o mensaje es demasiado grande (máximo 3 MB).'},{status:413});
    const body=JSON.parse(raw);

    const hasImage=body.image && typeof body.image==='object' && typeof body.image.base64==='string' && typeof body.image.mimeType==='string';
    if(hasImage && !['image/jpeg','image/png','image/webp'].includes(body.image.mimeType)){
      return Response.json({error:'Formato de imagen no compatible. Usa JPG, PNG o WebP.'},{status:400});
    }

    const text=typeof body.text==='string'?body.text.trim():'';
    if(!hasImage && (!text || text.length>3000)){
      return Response.json({error:'Escribe entre 1 y 3000 caracteres o adjunta una imagen.'},{status:400});
    }

    const context=body.context??[];
    if(!Array.isArray(context)||context.length>6||context.some((m:unknown)=>!m||typeof m!=='object'||!['user','model'].includes((m as {role:string}).role)||typeof (m as {text:unknown}).text!=='string'||(m as {text:string}).text.length>3000)){
      return Response.json({error:'Conversación inválida. Inicia un nuevo registro.'},{status:400});
    }

    const model=env.GEMINI_MODEL||'gemini-2.5-flash';
    if(!/^[a-zA-Z0-9.-]+$/.test(model)) throw Error();

    const userParts: unknown[] = [];
    if(hasImage){
      userParts.push({
        inlineData: {
          mimeType: body.image.mimeType,
          data: body.image.base64
        }
      });
      userParts.push({
        text: text || 'Analiza esta imagen de comprobante, factura o recibo. Extrae el concepto (comercio), total pagado en COP, fecha y sugiere la categoría.'
      });
    } else {
      userParts.push({text});
    }

    const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},
      signal:AbortSignal.timeout(30000),
      body:JSON.stringify({
        systemInstruction:{
          parts:[{
            text:`Eres el asistente de registro financiero de Brisa. Habla español colombiano. Hoy es ${today()} en Colombia. Puedes completar datos con las aclaraciones recientes del mismo registro. Puedes analizar fotos de comprobantes, facturas, recibos de caja o tirillas de datáfono en Colombia para extraer comercio, total en COP, fecha y medio de pago. Extrae como máximo UN movimiento expresamente realizado en COP. Si el total no es claro, pregunta. No inventes valores. Puedes usar la fecha de hoy si no se especifica. Normaliza a pesos colombianos enteros sin decimales. Categorías permitidas de gasto: ${expenseCategories.join(', ')}. Categorías de ingreso: ${incomeCategories.join(', ')}. Medios de pago: ${paymentMethods.join(', ')}. Destinos de ingreso: ${incomeAccounts.join(', ')}. No des asesoría de inversión ni prometes ahorro. Solo preparas el movimiento. Devuelve JSON con reply y movement nullable.`
          }]
        },
        contents:[
          ...context.map((m:{role:string;text:string})=>({role:m.role,parts:[{text:m.text}]})),
          {role:'user',parts:userParts}
        ],
        generationConfig:{
          temperature:0.1,
          maxOutputTokens:1500,
          thinkingConfig:{thinkingBudget:0},
          responseMimeType:'application/json',
          responseJsonSchema:{
            type:'object',
            properties:{
              reply:{type:'string'},
              movement:{
                anyOf:[
                  {type:'null'},
                  {
                    type:'object',
                    properties:{
                      kind:{type:'string',enum:['expense','income']},
                      description:{type:'string'},
                      amount:{type:'integer'},
                      category:{type:'string',enum:[...new Set([...expenseCategories,...incomeCategories])]},
                      date:{type:'string'},
                      account:{type:'string'}
                    },
                    required:['kind','description','amount','category','date','account'],
                    additionalProperties:false
                  }
                ]
              }
            },
            required:['reply','movement'],
            additionalProperties:false
          }
        }
      })
    });

    if(!response.ok){
      return Response.json({
        error:response.status===429
          ?'Gemini alcanzó su límite de uso. Intenta más tarde.'
          :'No pudimos conectar con Gemini. Revisa la clave, el modelo y la cuota de la API.'
      },{status:502});
    }

    const data=await response.json() as {candidates?:{content?:{parts?:{text?:string}[]}}[]};
    const responseText=data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('');
    if(!responseText) throw Error();

    const parsed=assistantResult.safeParse(JSON.parse(responseText));
    if(!parsed.success){
      return Response.json({error:'La respuesta no tuvo datos válidos. Reformula o intenta con una foto más nítida.'},{status:422});
    }

    return Response.json(parsed.data,{headers:{'Cache-Control':'no-store'}});
  }catch{
    return Response.json({error:'No pudimos procesar el registro con el asistente. Intenta de nuevo.'},{status:502});
  }
}
