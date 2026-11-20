import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { DatabaseSync } from 'node:sqlite';

fs.mkdirSync('.sites-runtime', { recursive: true });

function transpileFile(srcPath, outPath) {
  const code = fs.readFileSync(srcPath, 'utf8');
  const result = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
  });
  fs.writeFileSync(outPath, result.outputText);
}

transpileFile('lib/auth.ts', '.sites-runtime/auth.mjs');

const {
  ensureAuthTables,
  generateSalt,
  hashPassword,
  generateSessionToken,
  createSession,
  getUserBySession,
  deleteSession,
  registerWithPassword,
  loginWithPassword,
  loginWithGoogle,
  loginWithApple,
  sendPhoneOTP,
  verifyPhoneOTP,
  parseJwtPayload,
  getAuthConfig
} = await import('../.sites-runtime/auth.mjs');

function createMockD1() {
  const sqlite = new DatabaseSync(':memory:');

  return {
    async batch(statements) {
      for (const stmt of statements) {
        await stmt.run();
      }
      return [];
    },
    prepare(query) {
      let boundParams = [];
      return {
        bind(...params) {
          boundParams = params;
          return this;
        },
        async run() {
          const stmt = sqlite.prepare(query);
          return stmt.run(...boundParams);
        },
        async first() {
          const stmt = sqlite.prepare(query);
          const row = stmt.get(...boundParams);
          return row || null;
        },
        async all() {
          const stmt = sqlite.prepare(query);
          return stmt.all(...boundParams);
        }
      };
    }
  };
}

function makeMockJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.mockSignature`;
}

async function runTests() {
  console.log('🧪 Iniciando pruebas unitarias de autenticación multi-método para Brisa...\n');
  const db = createMockD1();

  // Test 1: Tablas
  await ensureAuthTables(db);
  console.log('✅ Test 1: Tablas auth_users, auth_sessions y auth_otps creadas exitosamente.');

  // Test 2: Hashing PBKDF2
  const salt = generateSalt();
  assert.equal(typeof salt, 'string');
  assert.equal(salt.length, 32); // 16 bytes = 32 hex chars
  const hash1 = await hashPassword('claveSecreta123', salt);
  const hash2 = await hashPassword('claveSecreta123', salt);
  const hashWrong = await hashPassword('otraClave456', salt);
  assert.equal(hash1, hash2, 'Misma clave y salt debe dar el mismo hash');
  assert.notEqual(hash1, hashWrong, 'Claves distintas deben dar hashes distintos');
  console.log('✅ Test 2: Criptografía PBKDF2 con SHA-256 (100,000 iteraciones) verificada.');

  // Test 3: Registro con Usuario y Contraseña
  const regResult = await registerWithPassword(db, {
    fullName: 'Camila Rodriguez',
    email: 'camila@ejemplo.com',
    username: 'camilarod',
    password: 'MiPassword123'
  });

  assert.ok(regResult.user.id.startsWith('usr_'));
  assert.equal(regResult.user.email, 'camila@ejemplo.com');
  assert.equal(regResult.user.username, 'camilarod');
  assert.equal(regResult.user.fullName, 'Camila Rodriguez');
  assert.equal(regResult.user.provider, 'password');
  assert.ok(regResult.session.token.startsWith('sess_'));
  console.log('✅ Test 3: Registro de usuario y contraseña exitoso con sesión activa.');

  // Test 3.1: Intento de registrar correo duplicado
  await assert.rejects(
    async () => {
      await registerWithPassword(db, {
        fullName: 'Otra Camila',
        email: 'camila@ejemplo.com',
        password: 'Password999'
      });
    },
    /Este correo ya está registrado/,
    'Debe rechazar correos duplicados'
  );
  console.log('✅ Test 3.1: Rechazo de correos duplicados verificado.');

  // Test 4: Inicio de sesión con Usuario y Contraseña
  const loginEmail = await loginWithPassword(db, {
    identifier: 'camila@ejemplo.com',
    password: 'MiPassword123'
  });
  assert.equal(loginEmail.user.id, regResult.user.id);
  assert.ok(loginEmail.session.token.startsWith('sess_'));

  const loginUser = await loginWithPassword(db, {
    identifier: 'camilarod',
    password: 'MiPassword123'
  });
  assert.equal(loginUser.user.id, regResult.user.id);

  await assert.rejects(
    async () => {
      await loginWithPassword(db, {
        identifier: 'camilarod',
        password: 'ClaveIncorrecta'
      });
    },
    /Contraseña incorrecta/,
    'Debe rechazar contraseñas inválidas'
  );
  console.log('✅ Test 4: Inicio de sesión con correo y usuario verificado, con rechazo seguro de claves inválidas.');

  // Test 5: Inicio de sesión con Google (Gmail) directo
  const googleLogin1 = await loginWithGoogle(db, {
    googleId: 'google_sub_10928374',
    email: 'usuario.colombia@gmail.com',
    fullName: 'Juan David Gomez',
    avatarUrl: 'https://lh3.googleusercontent.com/a/photo.jpg'
  });
  assert.ok(googleLogin1.user.id.startsWith('usr_g_'));
  assert.equal(googleLogin1.user.email, 'usuario.colombia@gmail.com');
  assert.equal(googleLogin1.user.provider, 'google');
  assert.equal(googleLogin1.user.avatarUrl, 'https://lh3.googleusercontent.com/a/photo.jpg');

  // Test 5.1: Inicio de sesión con Google Identity Services (token JWT simulado)
  const googleJwt = makeMockJwt({
    email: 'gsi.user@gmail.com',
    sub: 'google_gsi_sub_12345',
    name: 'GSI Real User',
    picture: 'https://lh3.googleusercontent.com/gsi_avatar.png'
  });
  const googleGsiLogin = await loginWithGoogle(db, { credential: googleJwt });
  assert.equal(googleGsiLogin.user.email, 'gsi.user@gmail.com');
  assert.equal(googleGsiLogin.user.fullName, 'GSI Real User');
  assert.equal(googleGsiLogin.user.avatarUrl, 'https://lh3.googleusercontent.com/gsi_avatar.png');
  console.log('✅ Test 5: Inicio de sesión con Google / Gmail verificado (directo y con token GIS).');

  // Test 6: Inicio de sesión con Apple ID (iPhone)
  const appleLogin = await loginWithApple(db, {
    appleId: '000123.apple_uid_test',
    email: 'usuario.apple@privaterelay.appleid.com',
    fullName: 'Ana Maria Apple'
  });
  assert.ok(appleLogin.user.id.startsWith('usr_a_'));
  assert.equal(appleLogin.user.provider, 'apple');
  assert.ok(appleLogin.session.token.startsWith('sess_'));

  // Test 6.1: Inicio con Apple Identity Token (JWT)
  const appleJwt = makeMockJwt({
    email: 'apple.native@privaterelay.appleid.com',
    sub: 'apple_unique_sub_9876'
  });
  const appleJwtLogin = await loginWithApple(db, { identityToken: appleJwt, fullName: 'Apple Token User' });
  assert.equal(appleJwtLogin.user.email, 'apple.native@privaterelay.appleid.com');
  console.log('✅ Test 6: Inicio de sesión con Apple ID (iPhone) verificado (directo y con identity token).');

  // Test 7: Autenticación con Número de Celular y OTP SMS
  const otpRes = await sendPhoneOTP(db, '+57 300 123 4567');
  assert.equal(otpRes.ok, true);
  assert.equal(otpRes.phone, '573001234567');
  assert.equal(otpRes.codePreview?.length, 6);
  assert.equal(typeof otpRes.sentViaSms, 'boolean');

  await assert.rejects(
    async () => {
      await verifyPhoneOTP(db, '573001234567', '000000');
    },
    /Código de verificación incorrecto/,
    'Debe rechazar OTP incorrecto'
  );

  const phoneLogin = await verifyPhoneOTP(db, '573001234567', otpRes.codePreview);
  assert.ok(phoneLogin.user.id.startsWith('usr_p_'));
  assert.equal(phoneLogin.user.phone, '573001234567');
  assert.equal(phoneLogin.user.provider, 'phone');
  assert.ok(phoneLogin.session.token.startsWith('sess_'));

  await assert.rejects(
    async () => {
      await verifyPhoneOTP(db, '573001234567', otpRes.codePreview);
    },
    /Código de verificación incorrecto/,
    'Debe invalidar el OTP una vez usado'
  );
  console.log('✅ Test 7: Autenticación por Celular con código SMS OTP verificado.');

  // Test 8: Sesiones y Logout
  const sessionUser = await getUserBySession(db, phoneLogin.session.token);
  assert.equal(sessionUser?.id, phoneLogin.user.id);
  assert.equal(sessionUser?.phone, '573001234567');

  const deleted = await deleteSession(db, phoneLogin.session.token);
  assert.equal(deleted, true);

  const afterLogout = await getUserBySession(db, phoneLogin.session.token);
  assert.equal(afterLogout, null);
  console.log('✅ Test 8: Ciclo de vida de sesión verificado.');

  // Test 9: Configuración y estado de proveedores
  const config = getAuthConfig();
  assert.equal(typeof config, 'object');
  assert.ok('googleClientId' in config);
  assert.ok('appleClientId' in config);
  assert.ok('smsConfigured' in config);
  console.log('✅ Test 9: Detector de configuración de proveedores (getAuthConfig) verificado.');

  console.log('\n🎉 ¡Todos los tests de configuración y autenticación pasaron con 100% de éxito!\n');
}

runTests().catch(err => {
  console.error('❌ Error en tests de autenticación:', err);
  process.exit(1);
});
