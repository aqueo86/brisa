import { getChatGPTUser } from '../../../chatgpt-auth';
import { database } from '../../../../db/raw';
import { ensureSyncTables } from '../../../../lib/sync';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) {
    return Response.json({ error: 'Solicitud no permitida.' }, { status: 403 });
  }

  const user = await getChatGPTUser();
  if (!user) {
    return Response.json({ error: 'Inicia sesión para eliminar tu cuenta.' }, { status: 401 });
  }

  try {
    const raw = await request.text();
    let body: { confirm?: boolean } = {};
    if (raw) {
      body = JSON.parse(raw);
    }

    if (body.confirm !== true) {
      return Response.json(
        { error: 'Debes confirmar expresamente la eliminación permanente de tus datos.' },
        { status: 400 }
      );
    }

    const db = database();
    await ensureSyncTables(db);
    const tables = [
      'movements',
      'fixed_expenses',
      'credit_cards',
      'credit_purchases',
      'profiles',
      'profile_revisions',
      'preferences',
      'inbox',
      'reports',
      'sync_tokens',
      'sync_events',
      'user_bank_accounts',
    ];

    // Atomically delete all records belonging to the authenticated user
    await db.batch(
      tables.map((table) =>
        db.prepare(`DELETE FROM ${table} WHERE owner = ?`).bind(user.userId)
      )
    );

    return Response.json({
      ok: true,
      deleted: true,
      message: 'Todos tus datos y registros financieros han sido eliminados de forma definitiva e irreversible.',
    });
  } catch {
    return Response.json(
      { error: 'No se pudo completar la eliminación de la cuenta. Intenta de nuevo.' },
      { status: 503 }
    );
  }
}
