export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  username: string | null;
  fullName: string | null;
  provider: 'password' | 'google' | 'apple' | 'phone';
  avatarUrl: string | null;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export async function ensureAuthTables(db: any) {
  try {
    await db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS auth_users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        phone TEXT UNIQUE,
        username TEXT UNIQUE,
        full_name TEXT,
        password_hash TEXT,
        password_salt TEXT,
        provider TEXT NOT NULL DEFAULT 'password',
        avatar_url TEXT,
        created_at TEXT NOT NULL
      )`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email)`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_auth_users_phone ON auth_users(phone)`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_auth_users_username ON auth_users(username)`),
      db.prepare(`CREATE TABLE IF NOT EXISTS auth_sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      )`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id)`),
      db.prepare(`CREATE TABLE IF NOT EXISTS auth_otps (
        id TEXT PRIMARY KEY,
        phone TEXT NOT NULL,
        code TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used INTEGER NOT NULL DEFAULT 0
      )`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_auth_otps_phone ON auth_otps(phone, expires_at DESC)`)
    ]);
  } catch (err) {
    // If table already exists or batch handles it, ignore
  }
}

export function generateSalt(length = 16): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(derivedBits), b => b.toString(16).padStart(2, '0')).join('');
}

export function generateSessionToken(): string {
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);
  const hex = Array.from(randomBytes, b => b.toString(16).padStart(2, '0')).join('');
  return `sess_${crypto.randomUUID().replace(/-/g, '')}${hex}`;
}

export async function createSession(db: any, userId: string, daysValid = 30): Promise<AuthSession> {
  await ensureAuthTables(db);
  const token = generateSessionToken();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000).toISOString();

  await db.prepare(
    'INSERT INTO auth_sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(token, userId, createdAt, expiresAt).run();

  return { token, userId, createdAt, expiresAt };
}

export async function getUserBySession(db: any, sessionToken: string): Promise<AuthUser | null> {
  await ensureAuthTables(db);
  if (!sessionToken || typeof sessionToken !== 'string') return null;

  try {
    const session = await db.prepare(
      'SELECT token, user_id, expires_at FROM auth_sessions WHERE token = ?'
    ).bind(sessionToken).first();

    if (!session) return null;

    if (new Date(session.expires_at).getTime() < Date.now()) {
      // Session expired, delete it
      await db.prepare('DELETE FROM auth_sessions WHERE token = ?').bind(sessionToken).run();
      return null;
    }

    const row = await db.prepare(
      'SELECT id, email, phone, username, full_name, provider, avatar_url, created_at FROM auth_users WHERE id = ?'
    ).bind(session.user_id).first();

    if (!row) return null;

    return {
      id: row.id,
      email: row.email,
      phone: row.phone,
      username: row.username,
      fullName: row.full_name,
      provider: row.provider,
      avatarUrl: row.avatar_url,
      createdAt: row.created_at
    };
  } catch {
    return null;
  }
}

export async function deleteSession(db: any, sessionToken: string): Promise<boolean> {
  await ensureAuthTables(db);
  if (!sessionToken) return false;
  try {
    await db.prepare('DELETE FROM auth_sessions WHERE token = ?').bind(sessionToken).run();
    return true;
  } catch {
    return false;
  }
}

// 1. REGISTRO CON USUARIO Y CONTRASEÑA
export async function registerWithPassword(
  db: any,
  data: {
    fullName: string;
    email?: string;
    username?: string;
    phone?: string;
    password: string;
  }
): Promise<{ user: AuthUser; session: AuthSession }> {
  await ensureAuthTables(db);

  const cleanName = data.fullName.trim();
  const cleanEmail = data.email ? data.email.trim().toLowerCase() : null;
  const cleanUsername = data.username ? data.username.trim().toLowerCase() : null;
  const cleanPhone = data.phone ? data.phone.replace(/\D/g, '') : null;

  if (!cleanName) throw new Error('Ingresa tu nombre completo.');
  if (!cleanEmail && !cleanUsername) throw new Error('Ingresa un correo electrónico o nombre de usuario.');
  if (!data.password || data.password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres.');
  }

  // Check email uniqueness
  if (cleanEmail) {
    const existingEmail = await db.prepare('SELECT id FROM auth_users WHERE email = ?').bind(cleanEmail).first();
    if (existingEmail) throw new Error('Este correo ya está registrado. Inicia sesión con tu clave.');
  }

  // Check username uniqueness
  if (cleanUsername) {
    const existingUser = await db.prepare('SELECT id FROM auth_users WHERE username = ?').bind(cleanUsername).first();
    if (existingUser) throw new Error('Este nombre de usuario ya está en uso. Elige otro.');
  }

  const salt = generateSalt();
  const hash = await hashPassword(data.password, salt);
  const userId = `usr_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const createdAt = new Date().toISOString();

  await db.prepare(
    'INSERT INTO auth_users (id, email, phone, username, full_name, password_hash, password_salt, provider, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    userId,
    cleanEmail,
    cleanPhone,
    cleanUsername,
    cleanName,
    hash,
    salt,
    'password',
    createdAt
  ).run();

  const user: AuthUser = {
    id: userId,
    email: cleanEmail,
    phone: cleanPhone,
    username: cleanUsername,
    fullName: cleanName,
    provider: 'password',
    avatarUrl: null,
    createdAt
  };

  const session = await createSession(db, userId);
  return { user, session };
}

// 2. INICIO DE SESIÓN CON USUARIO / CORREO Y CONTRASEÑA
export async function loginWithPassword(
  db: any,
  data: {
    identifier: string; // email, username or phone
    password: string;
  }
): Promise<{ user: AuthUser; session: AuthSession }> {
  await ensureAuthTables(db);

  const cleanId = data.identifier.trim().toLowerCase();
  const digits = cleanId.replace(/\D/g, '');

  if (!cleanId) throw new Error('Ingresa tu correo, usuario o celular.');
  if (!data.password) throw new Error('Ingresa tu contraseña.');

  // Find user by email, username or phone
  const row = await db.prepare(
    'SELECT id, email, phone, username, full_name, password_hash, password_salt, provider, avatar_url, created_at FROM auth_users WHERE email = ? OR username = ? OR (phone = ? AND phone IS NOT NULL) LIMIT 1'
  ).bind(cleanId, cleanId, digits || '__no_phone__').first();

  if (!row || !row.password_hash || !row.password_salt) {
    throw new Error('Credenciales incorrectas o usuario no encontrado.');
  }

  const expectedHash = await hashPassword(data.password, row.password_salt);
  if (expectedHash !== row.password_hash) {
    throw new Error('Contraseña incorrecta. Revisa e intenta de nuevo.');
  }

  const user: AuthUser = {
    id: row.id,
    email: row.email,
    phone: row.phone,
    username: row.username,
    fullName: row.full_name,
    provider: row.provider,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at
  };

  const session = await createSession(db, user.id);
  return { user, session };
}

export function parseJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// 3. INICIO DE SESIÓN CON GOOGLE (GMAIL)
export async function loginWithGoogle(
  db: any,
  data: {
    googleId?: string;
    email?: string;
    fullName?: string;
    avatarUrl?: string;
    credential?: string;
  }
): Promise<{ user: AuthUser; session: AuthSession }> {
  await ensureAuthTables(db);

  let cleanEmail = data.email ? data.email.trim().toLowerCase() : '';
  let googleId = data.googleId || '';
  let fullName = data.fullName;
  let avatarUrl = data.avatarUrl;

  // Si se envió un credential (JWT de Google Identity Services), verificarlo o decodificarlo
  if (data.credential) {
    try {
      const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(data.credential)}`);
      if (res.ok) {
        const info = await res.json() as any;
        if (info.email) cleanEmail = info.email.trim().toLowerCase();
        if (info.sub) googleId = info.sub;
        if (info.name && !fullName) fullName = info.name;
        if (info.picture && !avatarUrl) avatarUrl = info.picture;
      } else {
        const payload = parseJwtPayload(data.credential);
        if (payload?.email) {
          cleanEmail = payload.email.trim().toLowerCase();
          if (payload.sub) googleId = payload.sub;
          if (payload.name && !fullName) fullName = payload.name;
          if (payload.picture && !avatarUrl) avatarUrl = payload.picture;
        }
      }
    } catch {
      const payload = parseJwtPayload(data.credential);
      if (payload?.email) {
        cleanEmail = payload.email.trim().toLowerCase();
        if (payload.sub) googleId = payload.sub;
        if (payload.name && !fullName) fullName = payload.name;
        if (payload.picture && !avatarUrl) avatarUrl = payload.picture;
      }
    }
  }

  if (!cleanEmail) throw new Error('Correo de Google inválido o no recibido.');
  if (!googleId) googleId = `google_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

  let row = await db.prepare(
    'SELECT id, email, phone, username, full_name, provider, avatar_url, created_at FROM auth_users WHERE email = ?'
  ).bind(cleanEmail).first();

  let userId: string;
  let createdAt: string;

  if (row) {
    userId = row.id;
    createdAt = row.created_at;
    // Update avatar or name if newly provided
    if (avatarUrl && !row.avatar_url) {
      await db.prepare('UPDATE auth_users SET avatar_url = ? WHERE id = ?').bind(avatarUrl, userId).run();
      row.avatar_url = avatarUrl;
    }
    if (fullName && (!row.full_name || row.full_name === cleanEmail.split('@')[0])) {
      await db.prepare('UPDATE auth_users SET full_name = ? WHERE id = ?').bind(fullName, userId).run();
      row.full_name = fullName;
    }
  } else {
    userId = `usr_g_${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`;
    createdAt = new Date().toISOString();
    const cleanName = fullName?.trim() || cleanEmail.split('@')[0];

    await db.prepare(
      'INSERT INTO auth_users (id, email, phone, username, full_name, provider, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      userId,
      cleanEmail,
      null,
      cleanEmail.split('@')[0],
      cleanName,
      'google',
      avatarUrl || null,
      createdAt
    ).run();

    row = {
      id: userId,
      email: cleanEmail,
      phone: null,
      username: cleanEmail.split('@')[0],
      full_name: cleanName,
      provider: 'google',
      avatar_url: avatarUrl || null,
      created_at: createdAt
    };
  }

  const user: AuthUser = {
    id: row.id,
    email: row.email,
    phone: row.phone,
    username: row.username,
    fullName: row.full_name,
    provider: row.provider,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at
  };

  const session = await createSession(db, user.id);
  return { user, session };
}

// 4. INICIO DE SESIÓN CON APPLE (CUENTA DE IPHONE)
export async function loginWithApple(
  db: any,
  data: {
    appleId?: string;
    email?: string;
    fullName?: string;
    identityToken?: string;
  }
): Promise<{ user: AuthUser; session: AuthSession }> {
  await ensureAuthTables(db);

  let cleanAppleId = data.appleId ? data.appleId.trim() : '';
  let cleanEmail = data.email ? data.email.trim().toLowerCase() : null;
  let fullName = data.fullName;

  // Si se envió un identityToken (JWT de Sign In with Apple)
  if (data.identityToken) {
    const payload = parseJwtPayload(data.identityToken);
    if (payload?.sub) cleanAppleId = payload.sub;
    if (payload?.email && !cleanEmail) cleanEmail = payload.email.trim().toLowerCase();
  }

  if (!cleanAppleId && !cleanEmail) {
    throw new Error('Identificador de Apple ID o correo no proporcionado.');
  }
  if (!cleanAppleId) {
    cleanAppleId = `apple_${(cleanEmail || 'user').replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  // Search by email or apple username
  let row = cleanEmail
    ? await db.prepare('SELECT id, email, phone, username, full_name, provider, avatar_url, created_at FROM auth_users WHERE email = ?').bind(cleanEmail).first()
    : await db.prepare('SELECT id, email, phone, username, full_name, provider, avatar_url, created_at FROM auth_users WHERE username = ?').bind(`apple_${cleanAppleId.slice(-8)}`).first();

  if (!row) {
    const userId = `usr_a_${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`;
    const createdAt = new Date().toISOString();
    const cleanName = fullName?.trim() || (cleanEmail ? cleanEmail.split('@')[0] : 'Usuario Apple ID');

    await db.prepare(
      'INSERT INTO auth_users (id, email, phone, username, full_name, provider, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      userId,
      cleanEmail,
      null,
      `apple_${cleanAppleId.slice(-8)}`,
      cleanName,
      'apple',
      createdAt
    ).run();

    row = {
      id: userId,
      email: cleanEmail,
      phone: null,
      username: `apple_${cleanAppleId.slice(-8)}`,
      full_name: cleanName,
      provider: 'apple',
      avatar_url: null,
      created_at: createdAt
    };
  }

  const user: AuthUser = {
    id: row.id,
    email: row.email,
    phone: row.phone,
    username: row.username,
    fullName: row.full_name,
    provider: row.provider,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at
  };

  const session = await createSession(db, user.id);
  return { user, session };
}

// 5. INICIO DE SESIÓN CON NÚMERO DE CELULAR (SMS / OTP)
export async function sendPhoneOTP(
  db: any,
  rawPhone: string
): Promise<{ ok: boolean; phone: string; codePreview?: string; sentViaSms: boolean; message: string }> {
  await ensureAuthTables(db);

  const cleanPhone = rawPhone.replace(/\D/g, '');
  if (cleanPhone.length < 10) {
    throw new Error('Ingresa un número celular válido (mínimo 10 dígitos).');
  }

  // Generate 6-digit numeric OTP code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const id = `otp_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  // 10 minutes expiry
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await db.prepare(
    'INSERT INTO auth_otps (id, phone, code, expires_at, used) VALUES (?, ?, ?, ?, 0)'
  ).bind(id, cleanPhone, code, expiresAt).run();

  let sentViaSms = false;
  let message = 'Código de verificación generado.';

  const env = typeof process !== 'undefined' ? process.env : {} as any;
  const twilioSid = env?.TWILIO_ACCOUNT_SID;
  const twilioAuth = env?.TWILIO_AUTH_TOKEN;
  const twilioFrom = env?.TWILIO_FROM_NUMBER;
  const colombiaPhone = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;

  if (twilioSid && twilioAuth && twilioFrom) {
    try {
      const basicAuth = btoa(`${twilioSid}:${twilioAuth}`);
      const body = new URLSearchParams({
        To: `+${colombiaPhone}`,
        From: twilioFrom,
        Body: `Brisa: Tu código de verificación es ${code}. Válido por 10 minutos.`
      });
      const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });
      if (twilioRes.ok) {
        sentViaSms = true;
        message = 'SMS enviado exitosamente a tu móvil.';
      } else {
        const errJson = await twilioRes.json().catch(() => ({}));
        console.warn('Twilio SMS no entregado:', errJson);
        message = 'Servicio SMS no disponible en este momento. Código provisto en pantalla para pruebas.';
      }
    } catch (e: any) {
      console.warn('Error conectando con Twilio:', e?.message);
    }
  }

  return {
    ok: true,
    phone: cleanPhone,
    codePreview: !sentViaSms ? code : undefined,
    sentViaSms,
    message
  };
}

export function getAuthConfig() {
  const env = typeof process !== 'undefined' ? process.env : {} as any;
  return {
    googleClientId: env?.GOOGLE_CLIENT_ID || env?.NEXT_PUBLIC_GOOGLE_CLIENT_ID || null,
    appleClientId: env?.APPLE_CLIENT_ID || null,
    smsConfigured: Boolean(env?.TWILIO_ACCOUNT_SID && env?.TWILIO_AUTH_TOKEN && env?.TWILIO_FROM_NUMBER)
  };
}

export async function verifyPhoneOTP(
  db: any,
  rawPhone: string,
  rawCode: string
): Promise<{ user: AuthUser; session: AuthSession }> {
  await ensureAuthTables(db);

  const cleanPhone = rawPhone.replace(/\D/g, '');
  const cleanCode = rawCode.trim();

  if (!cleanPhone || !cleanCode) {
    throw new Error('Ingresa el número celular y el código de 6 dígitos.');
  }

  // Find valid OTP
  const otpRow = await db.prepare(
    'SELECT id, phone, code, expires_at, used FROM auth_otps WHERE phone = ? AND code = ? AND used = 0 ORDER BY expires_at DESC LIMIT 1'
  ).bind(cleanPhone, cleanCode).first();

  if (!otpRow) {
    throw new Error('Código de verificación incorrecto o no encontrado.');
  }

  if (new Date(otpRow.expires_at).getTime() < Date.now()) {
    throw new Error('El código ha expirado. Solicita uno nuevo.');
  }

  // Mark as used
  await db.prepare('UPDATE auth_otps SET used = 1 WHERE id = ?').bind(otpRow.id).run();

  // Find or create user with this phone number
  let row = await db.prepare(
    'SELECT id, email, phone, username, full_name, provider, avatar_url, created_at FROM auth_users WHERE phone = ?'
  ).bind(cleanPhone).first();

  if (!row) {
    const userId = `usr_p_${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`;
    const createdAt = new Date().toISOString();
    const displayName = `Móvil +${cleanPhone.slice(-4)}`;

    await db.prepare(
      'INSERT INTO auth_users (id, email, phone, username, full_name, provider, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      userId,
      null,
      cleanPhone,
      `movil_${cleanPhone.slice(-6)}`,
      displayName,
      'phone',
      createdAt
    ).run();

    row = {
      id: userId,
      email: null,
      phone: cleanPhone,
      username: `movil_${cleanPhone.slice(-6)}`,
      full_name: displayName,
      provider: 'phone',
      avatar_url: null,
      created_at: createdAt
    };
  }

  const user: AuthUser = {
    id: row.id,
    email: row.email,
    phone: row.phone,
    username: row.username,
    fullName: row.full_name,
    provider: row.provider,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at
  };

  const session = await createSession(db, user.id);
  return { user, session };
}
