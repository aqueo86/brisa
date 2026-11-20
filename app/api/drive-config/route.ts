import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
export const dynamic='force-dynamic';
export async function GET(){if(!await getChatGPTUser())return Response.json({configured:false},{headers:{'Cache-Control':'no-store'}});const clientId=env.GOOGLE_DRIVE_CLIENT_ID||'';return Response.json({configured:!!clientId,clientId},{headers:{'Cache-Control':'no-store'}});}
