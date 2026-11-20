import { database } from '../../../db/raw';
import {
  registerWithPassword,
  loginWithPassword,
  loginWithGoogle,
  loginWithApple,
  sendPhoneOTP,
  verifyPhoneOTP,
  getUserBySession,
  deleteSession,
  getAuthConfig
} from '../../../lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

function makeCookieHeader(token: string, maxAgeSeconds = 30 * 24 * 3600): string {
  return `brisa_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

export async function GET(request: Request) {
  try {
    const config = getAuthConfig();
    const cookieStore = await cookies();
    const token = cookieStore.get('brisa_session')?.value;
    if (!token) {
      return Response.json({ authenticated: false, user: null, config }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const db = database();
    const user = await getUserBySession(db, token);
    if (!user) {
      return Response.json(
        { authenticated: false, user: null, config },
        {
          headers: {
            'Cache-Control': 'no-store',
            'Set-Cookie': makeCookieHeader('', 0)
          }
        }
      );
    }

    return Response.json({ authenticated: true, user, config }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    return Response.json({ error: 'No se pudo verificar la sesión.', detail: err?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) {
    return Response.json({ error: 'Solicitud no permitida.' }, { status: 403 });
  }

  try {
    const raw = await request.text();
    const body = raw ? JSON.parse(raw) : {};
    const db = database();
    const action = String(body.action || '').trim();

    // 1. REGISTRO CON CONTRASEÑA
    if (action === 'register') {
      const { fullName, email, username, phone, password } = body;
      const { user, session } = await registerWithPassword(db, {
        fullName,
        email,
        username,
        phone,
        password
      });

      return Response.json(
        { ok: true, user, message: 'Cuenta creada con éxito.' },
        {
          headers: {
            'Set-Cookie': makeCookieHeader(session.token)
          }
        }
      );
    }

    // 2. INICIO DE SESIÓN CON CORREO / USUARIO Y CONTRASEÑA
    if (action === 'login') {
      const { identifier, password } = body;
      const { user, session } = await loginWithPassword(db, {
        identifier,
        password
      });

      return Response.json(
        { ok: true, user, message: 'Sesión iniciada con éxito.' },
        {
          headers: {
            'Set-Cookie': makeCookieHeader(session.token)
          }
        }
      );
    }

    // 3. INICIO CON GOOGLE (GMAIL)
    if (action === 'google') {
      const { googleId, email, fullName, avatarUrl, credential } = body;
      const { user, session } = await loginWithGoogle(db, {
        googleId,
        email,
        fullName,
        avatarUrl,
        credential
      });

      return Response.json(
        { ok: true, user, message: 'Sesión iniciada con Google.' },
        {
          headers: {
            'Set-Cookie': makeCookieHeader(session.token)
          }
        }
      );
    }

    // 4. INICIO CON APPLE (CUENTA DE IPHONE)
    if (action === 'apple') {
      const { appleId, email, fullName, identityToken } = body;
      const { user, session } = await loginWithApple(db, {
        appleId,
        email,
        fullName,
        identityToken
      });

      return Response.json(
        { ok: true, user, message: 'Sesión iniciada con Apple.' },
        {
          headers: {
            'Set-Cookie': makeCookieHeader(session.token)
          }
        }
      );
    }

    // 5. ENVIAR CÓDIGO OTP POR CELULAR
    if (action === 'otp_send') {
      const { phone } = body;
      const res = await sendPhoneOTP(db, phone);
      return Response.json(res);
    }

    // 6. VERIFICAR CÓDIGO OTP Y ENTRAR CON CELULAR
    if (action === 'otp_verify') {
      const { phone, code } = body;
      const { user, session } = await verifyPhoneOTP(db, phone, code);

      return Response.json(
        { ok: true, user, message: 'Celular verificado con éxito.' },
        {
          headers: {
            'Set-Cookie': makeCookieHeader(session.token)
          }
        }
      );
    }

    // 7. CERRAR SESIÓN
    if (action === 'logout') {
      const cookieStore = await cookies();
      const token = cookieStore.get('brisa_session')?.value;
      if (token) {
        await deleteSession(db, token);
      }
      return Response.json(
        { ok: true, message: 'Sesión cerrada.' },
        {
          headers: {
            'Set-Cookie': makeCookieHeader('', 0)
          }
        }
      );
    }

    return Response.json({ error: 'Acción de autenticación desconocida.' }, { status: 400 });
  } catch (err: any) {
    return Response.json({ error: err.message || 'Error en el proceso de autenticación.' }, { status: 400 });
  }
}
