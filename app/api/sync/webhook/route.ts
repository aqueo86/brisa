import { database } from '../../../../db/raw';
import { getUserBySyncToken, processSyncPayload } from '../../../../lib/sync';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') ||
    request.headers.get('x-sync-token') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!token) {
    return Response.json({
      error: 'Token de sincronización requerido. Pasa ?token=... en la URL o cabecera x-sync-token.'
    }, { status: 401 });
  }

  const db = database();
  const user = await getUserBySyncToken(db, token);
  if (!user) {
    return Response.json({ error: 'Token no válido o revocado.' }, { status: 401 });
  }

  return Response.json({
    ok: true,
    status: 'online',
    message: 'Webhook de Brisa listo para recibir movimientos.',
    autoRegister: user.autoRegister
  });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') ||
    request.headers.get('x-sync-token') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!token) {
    return Response.json({
      error: 'Token de sincronización requerido. Configura el token en la URL de tu atajo o webhook.'
    }, { status: 401 });
  }

  const db = database();
  const user = await getUserBySyncToken(db, token);
  if (!user) {
    return Response.json({ error: 'Token de sincronización inválido o revocado.' }, { status: 401 });
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    let body: any = {};

    if (contentType.includes('application/json')) {
      const text = await request.text();
      if (text.length > 32000) return Response.json({ error: 'Contenido demasiado extenso.' }, { status: 413 });
      body = text ? JSON.parse(text) : {};
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await request.text();
      const params = new URLSearchParams(text);
      body = Object.fromEntries(params.entries());
    } else {
      // Plain text or email body
      const text = await request.text();
      if (text.length > 32000) return Response.json({ error: 'Contenido demasiado extenso.' }, { status: 413 });
      body = { text };
    }

    const result = await processSyncPayload(db, user.owner, user.autoRegister, body);
    return Response.json(result);
  } catch (err: any) {
    return Response.json({
      error: 'Error al procesar el movimiento automático.',
      detail: err?.message || 'Error interno'
    }, { status: 500 });
  }
}
