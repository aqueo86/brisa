import { getChatGPTUser } from '../../../chatgpt-auth';
import { database } from '../../../../db/raw';
import {
  getOrCreateSyncConfig,
  rotateSyncToken,
  updateAutoRegister,
  processSyncPayload,
  getRecentSyncEvents,
  getUserBankAccounts,
  createUserBankAccount,
  deleteUserBankAccount
} from '../../../../lib/sync';
import { today } from '../../../../lib/finance';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Inicia sesión para consultar la configuración de sincronización.' }, { status: 401 });

  try {
    const db = database();
    const config = await getOrCreateSyncConfig(db, user.userId);
    const host = request.headers.get('host') || 'localhost:5173';
    const proto = request.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
    const webhookUrl = `${proto}://${host}/api/sync/webhook?token=${config.token}`;
    const userSlug = user.userId.slice(0, 8);
    const forwardingEmail = `movimientos+${userSlug}@sync.brisa.co`;

    return Response.json({
      ...config,
      webhookUrl,
      forwardingEmail
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    return Response.json({ error: 'No se pudo cargar la configuración de sincronización.', detail: err?.message }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) {
    return Response.json({ error: 'Solicitud no permitida.' }, { status: 403 });
  }

  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Inicia sesión para modificar la configuración de sincronización.' }, { status: 401 });

  try {
    const text = await request.text();
    const body = text ? JSON.parse(text) : {};
    const db = database();

    if (body.action === 'rotate_token') {
      const newToken = await rotateSyncToken(db, user.userId);
      const host = request.headers.get('host') || 'localhost:5173';
      const proto = request.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
      const webhookUrl = `${proto}://${host}/api/sync/webhook?token=${newToken}`;
      return Response.json({ ok: true, token: newToken, webhookUrl });
    }

    if (body.action === 'set_auto_register') {
      const autoRegister = Boolean(body.autoRegister);
      await updateAutoRegister(db, user.userId, autoRegister);
      return Response.json({ ok: true, autoRegister });
    }

    if (body.action === 'add_account') {
      if (!body.bank || typeof body.bank !== 'string') {
        return Response.json({ error: 'Elige un banco o entidad.' }, { status: 400 });
      }
      const lastFour = String(body.lastFour || '').replace(/\D/g, '').slice(-4);
      if (lastFour.length !== 4 && body.accountType !== 'digital_wallet') {
        return Response.json({ error: 'Ingresa los últimos 4 dígitos de tu tarjeta o cuenta.' }, { status: 400 });
      }
      const created = await createUserBankAccount(db, user.userId, {
        bank: body.bank,
        accountType: body.accountType || 'savings',
        lastFour: lastFour || '0000',
        customName: body.customName || `${body.bank} *${lastFour}`,
        color: body.color || '#247a61'
      });
      const allAccounts = await getUserBankAccounts(db, user.userId);
      return Response.json({ ok: true, account: created, bankAccounts: allAccounts });
    }

    if (body.action === 'delete_account') {
      if (!body.id || typeof body.id !== 'string') {
        return Response.json({ error: 'Identificador de cuenta inválido.' }, { status: 400 });
      }
      await deleteUserBankAccount(db, user.userId, body.id);
      const allAccounts = await getUserBankAccounts(db, user.userId);
      return Response.json({ ok: true, bankAccounts: allAccounts });
    }

    if (body.action === 'test_simulate') {
      const type = String(body.type || 'apple_pay');
      const config = await getOrCreateSyncConfig(db, user.userId);
      const userAccounts = config.bankAccounts || [];
      const firstAccount = userAccounts[0];

      let payload: any = {};
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      if (type === 'apple_pay') {
        payload = {
          source: 'Apple Pay',
          amount: 32000,
          description: 'Café Juan Valdez',
          merchant: 'Café Juan Valdez',
          category: 'Alimentación',
          account: firstAccount ? firstAccount.customName : 'Apple Pay · Tarjeta Débito',
          lastFour: firstAccount ? firstAccount.lastFour : '4567',
          date: today(),
          notes: `Pago Apple Pay simulado a las ${timeStr}`
        };
      } else if (type === 'google_pay') {
        payload = {
          source: 'Google Pay',
          amount: 48500,
          description: 'Supermercado Éxito',
          merchant: 'Supermercado Éxito',
          category: 'Alimentación',
          account: firstAccount ? firstAccount.customName : 'Google Pay · Bancolombia',
          lastFour: firstAccount ? firstAccount.lastFour : '9876',
          date: today(),
          notes: `Pago Google Pay simulado a las ${timeStr}`
        };
      } else if (type === 'email') {
        const lastDigits = firstAccount ? firstAccount.lastFour : '4567';
        const bankName = firstAccount ? firstAccount.bank : 'Bancolombia';
        payload = {
          source: 'Correo bancario',
          sender: `notificaciones@${bankName.toLowerCase().replace(/\s+/g, '')}.com.co`,
          subject: 'Comprobante de compra con tarjeta',
          text: `${bankName} le informa compra por $125.000 en Farmatodo con su tarjeta terminada en ${lastDigits} el ${today()} a las ${timeStr}.`
        };
      } else if (type === 'sms' || type === 'nequi') {
        const lastDigits = firstAccount ? firstAccount.lastFour : '3456';
        payload = {
          source: 'Notificación bancaria',
          sender: 'Bancolombia / Nequi',
          text: `Bancolombia: Compraste por $19.000 en Panadería Artesanal con tarjeta *${lastDigits} el ${today()}.`
        };
      }

      const result = await processSyncPayload(db, user.userId, config.autoRegister, payload);
      const recent = await getRecentSyncEvents(db, user.userId);

      return Response.json({
        ok: true,
        result,
        recentEvents: recent
      });
    }

    return Response.json({ error: 'Acción no reconocida.' }, { status: 400 });
  } catch (err: any) {
    return Response.json({ error: 'Error al actualizar configuración.', detail: err?.message }, { status: 503 });
  }
}
