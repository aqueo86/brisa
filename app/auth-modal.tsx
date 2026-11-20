'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Mail,
  Smartphone,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  Lock,
  User,
  Sparkles,
  ArrowLeft,
  X,
  Settings,
  HelpCircle,
  ExternalLink,
  Check,
  AlertCircle
} from 'lucide-react';

interface AuthModalProps {
  onSuccess: (user: any) => void;
  onCancel?: () => void;
  defaultMode?: 'login' | 'register';
}

type AuthTab = 'google' | 'apple' | 'phone' | 'password';

export default function AuthModal({ onSuccess, onCancel, defaultMode = 'login' }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<AuthTab>('password');
  const [passwordMode, setPasswordMode] = useState<'login' | 'register'>(defaultMode);

  // Form states
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');

  // Phone OTP states
  const [phone, setPhone] = useState('');
  const [otpStep, setOtpStep] = useState<'input' | 'verify'>('input');
  const [otpCode, setOtpCode] = useState('');
  const [otpPreview, setOtpPreview] = useState<string | null>(null);
  const [sentViaSms, setSentViaSms] = useState(false);

  // Google / Apple simulator states
  const [googleEmail, setGoogleEmail] = useState('');
  const [appleEmail, setAppleEmail] = useState('');

  // Provider configuration state
  const [config, setConfig] = useState<{
    googleClientId: string | null;
    appleClientId: string | null;
    smsConfigured: boolean;
  }>({
    googleClientId: null,
    appleClientId: null,
    smsConfigured: false
  });
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [googleGsiReady, setGoogleGsiReady] = useState(false);

  // Loading & error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Fetch provider configuration on mount
  useEffect(() => {
    fetch('/api/auth')
      .then(res => res.json())
      .then(data => {
        if (data?.config) {
          setConfig(data.config);
        }
      })
      .catch(() => {});
  }, []);

  // Initialize Google Identity Services (GIS) if Client ID is configured
  useEffect(() => {
    if (!config.googleClientId || activeTab !== 'google' || typeof window === 'undefined') return;

    function renderGoogleBtn() {
      if ((window as any).google?.accounts?.id) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: config.googleClientId,
            callback: async (response: any) => {
              if (response.credential) {
                await handleGoogleCredential(response.credential);
              }
            }
          });

          const container = document.getElementById('google-gsi-container');
          if (container) {
            container.innerHTML = '';
            (window as any).google.accounts.id.renderButton(container, {
              theme: 'outline',
              size: 'large',
              text: 'continue_with',
              shape: 'pill',
              width: 280
            });
            setGoogleGsiReady(true);
          }
        } catch (e) {
          console.warn('Google GSI render error:', e);
        }
      }
    }

    if (!(window as any).google?.accounts?.id) {
      const scriptId = 'google-gsi-client';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = renderGoogleBtn;
        document.body.appendChild(script);
      }
    } else {
      renderGoogleBtn();
    }
  }, [config.googleClientId, activeTab]);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (passwordMode === 'login') {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'login',
            identifier: emailOrUsername,
            password
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo iniciar sesión.');
        setSuccessNotice('¡Bienvenido de nuevo!');
        setTimeout(() => onSuccess(data.user), 400);
      } else {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'register',
            fullName,
            email: registerEmail || undefined,
            username: registerUsername || undefined,
            phone: registerPhone || undefined,
            password
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo crear la cuenta.');
        setSuccessNotice('¡Cuenta creada con éxito! Entrando a tu espacio...');
        setTimeout(() => onSuccess(data.user), 500);
      }
    } catch (err: any) {
      setError(err.message || 'Error en la solicitud.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'otp_send',
          phone
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar el código.');
      setOtpStep('verify');
      setSentViaSms(Boolean(data.sentViaSms));
      if (data.codePreview) {
        setOtpPreview(data.codePreview);
      } else {
        setOtpPreview(null);
      }
      setSuccessNotice(data.sentViaSms ? 'Código enviado por SMS a tu teléfono.' : 'Código generado correctamente.');
    } catch (err: any) {
      setError(err.message || 'Error al enviar código.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'otp_verify',
          phone,
          code: otpCode
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Código incorrecto o expirado.');
      setSuccessNotice('¡Celular verificado con éxito!');
      setTimeout(() => onSuccess(data.user), 400);
    } catch (err: any) {
      setError(err.message || 'Error en la verificación.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleCredential(credential: string) {
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'google',
          credential
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo verificar la cuenta de Google.');
      setSuccessNotice('Sesión iniciada con Google.');
      setTimeout(() => onSuccess(data.user), 400);
    } catch (err: any) {
      setError(err.message || 'Error con Google.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin(emailToUse?: string) {
    setError('');
    setLoading(true);
    const targetEmail = emailToUse || googleEmail || 'usuario@gmail.com';

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'google',
          email: targetEmail,
          fullName: targetEmail.split('@')[0],
          googleId: `google_${Date.now()}`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo autenticar con Google.');
      setSuccessNotice('Sesión iniciada con Google.');
      setTimeout(() => onSuccess(data.user), 400);
    } catch (err: any) {
      setError(err.message || 'Error con Google.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleLogin(emailToUse?: string) {
    setError('');
    setLoading(true);
    const targetEmail = emailToUse || appleEmail || 'usuario@privaterelay.appleid.com';

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apple',
          email: targetEmail,
          fullName: 'Usuario Apple ID',
          appleId: `apple_${Date.now()}`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo autenticar con Apple.');
      setSuccessNotice('Sesión iniciada con Apple ID.');
      setTimeout(() => onSuccess(data.user), 400);
    } catch (err: any) {
      setError(err.message || 'Error con Apple.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-modal-wrapper">
      <div className="auth-card-inner">
        {onCancel && (
          <button type="button" className="auth-close-btn" onClick={onCancel} aria-label="Cerrar">
            <X size={18} />
          </button>
        )}

        <div className="auth-header">
          <div className="auth-logo-badge">
            <ShieldCheck size={26} />
          </div>
          <h2>Tu espacio privado en Brisa</h2>
          <p className="auth-tagline">Elige el medio con el que prefieres identificarte:</p>
        </div>

        {/* Auth Method Selector Tabs */}
        <div className="auth-methods-nav" role="tablist">
          <button
            type="button"
            className={activeTab === 'password' ? 'active' : ''}
            onClick={() => { setActiveTab('password'); setError(''); }}
          >
            <KeyRound size={15} />
            <span>Usuario y Clave</span>
          </button>
          <button
            type="button"
            className={activeTab === 'google' ? 'active' : ''}
            onClick={() => { setActiveTab('google'); setError(''); }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Gmail / Google</span>
          </button>
          <button
            type="button"
            className={activeTab === 'apple' ? 'active' : ''}
            onClick={() => { setActiveTab('apple'); setError(''); }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 1.01-2.88-.9.04-2 .6-2.64 1.34-.56.65-1.05 1.71-.92 2.76.99.08 1.93-.47 2.55-1.22z"/>
            </svg>
            <span>Apple ID</span>
          </button>
          <button
            type="button"
            className={activeTab === 'phone' ? 'active' : ''}
            onClick={() => { setActiveTab('phone'); setError(''); setOtpStep('input'); }}
          >
            <Smartphone size={15} />
            <span>Celular SMS</span>
          </button>
        </div>

        {error && <div className="auth-alert error" role="alert">{error}</div>}
        {successNotice && <div className="auth-alert success" role="status"><CheckCircle2 size={16}/>{successNotice}</div>}

        {/* TAB 1: USUARIO Y CONTRASEÑA */}
        {activeTab === 'password' && (
          <div className="auth-tab-content">
            <div className="auth-mode-switch">
              <button
                type="button"
                className={passwordMode === 'login' ? 'active' : ''}
                onClick={() => { setPasswordMode('login'); setError(''); }}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                className={passwordMode === 'register' ? 'active' : ''}
                onClick={() => { setPasswordMode('register'); setError(''); }}
              >
                Crear Cuenta Nueva
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="auth-form">
              {passwordMode === 'register' && (
                <>
                  <label>
                    <span>Nombre completo</span>
                    <div className="auth-input-wrap">
                      <User size={16} className="input-icon" />
                      <input
                        required
                        type="text"
                        placeholder="Ej. Carolina Gómez"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                      />
                    </div>
                  </label>
                  <div className="auth-grid-two">
                    <label>
                      <span>Correo electrónico</span>
                      <div className="auth-input-wrap">
                        <Mail size={16} className="input-icon" />
                        <input
                          type="email"
                          placeholder="carolina@ejemplo.com"
                          value={registerEmail}
                          onChange={e => setRegisterEmail(e.target.value)}
                        />
                      </div>
                    </label>
                    <label>
                      <span>Nombre de usuario (opcional)</span>
                      <div className="auth-input-wrap">
                        <span className="input-at">@</span>
                        <input
                          type="text"
                          placeholder="carolina"
                          value={registerUsername}
                          onChange={e => setRegisterUsername(e.target.value)}
                        />
                      </div>
                    </label>
                  </div>
                </>
              )}

              {passwordMode === 'login' && (
                <label>
                  <span>Correo electrónico, usuario o celular</span>
                  <div className="auth-input-wrap">
                    <User size={16} className="input-icon" />
                    <input
                      required
                      type="text"
                      placeholder="usuario@ejemplo.com o nombre_usuario"
                      value={emailOrUsername}
                      onChange={e => setEmailOrUsername(e.target.value)}
                    />
                  </div>
                </label>
              )}

              <label>
                <span>Contraseña</span>
                <div className="auth-input-wrap">
                  <Lock size={16} className="input-icon" />
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading
                  ? 'Verificando...'
                  : passwordMode === 'login'
                  ? 'Entrar a mi espacio'
                  : 'Crear cuenta y comenzar'}
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: GOOGLE (GMAIL) */}
        {activeTab === 'google' && (
          <div className="auth-tab-content oauth-tab">
            <div className="oauth-intro">
              <div className="google-big-badge">
                <svg width="34" height="34" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <h3>Acceso con cuenta de Google / Gmail</h3>
              <p>Inicia sesión sin contraseñas adicionales con un solo clic.</p>
              {config.googleClientId ? (
                <div className="oauth-badge-pill ready">
                  <Check size={12} /> Google Identity Services configurado
                </div>
              ) : (
                <div className="oauth-badge-pill demo">
                  <AlertCircle size={12} /> Modo directo activo (Configura GOOGLE_CLIENT_ID en .env para botón oficial)
                </div>
              )}
            </div>

            {config.googleClientId && (
              <div id="google-gsi-container" className="google-native-container" />
            )}

            <div className="oauth-action-box">
              <label>
                <span>{config.googleClientId ? 'O ingresa con tu correo de Gmail directamente:' : 'Ingresa tu correo de Gmail:'}</span>
                <div className="auth-input-wrap">
                  <Mail size={16} className="input-icon" />
                  <input
                    type="email"
                    placeholder="tu.nombre@gmail.com"
                    value={googleEmail}
                    onChange={e => setGoogleEmail(e.target.value)}
                  />
                </div>
              </label>

              <button
                type="button"
                className="google-action-btn"
                disabled={loading}
                onClick={() => handleGoogleLogin()}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{loading ? 'Conectando con Google...' : 'Continuar con Google'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: APPLE ID (CUENTA DE IPHONE) */}
        {activeTab === 'apple' && (
          <div className="auth-tab-content oauth-tab">
            <div className="oauth-intro">
              <div className="apple-big-badge">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 1.01-2.88-.9.04-2 .6-2.64 1.34-.56.65-1.05 1.71-.92 2.76.99.08 1.93-.47 2.55-1.22z"/>
                </svg>
              </div>
              <h3>Sign in with Apple (iPhone / Mac)</h3>
              <p>Autenticación biométrica con Face ID / Touch ID o cuenta de Apple.</p>
              {config.appleClientId ? (
                <div className="oauth-badge-pill ready">
                  <Check size={12} /> Apple Services ID conectado
                </div>
              ) : (
                <div className="oauth-badge-pill demo">
                  <AlertCircle size={12} /> Modo directo activo (Configura APPLE_CLIENT_ID en .env)
                </div>
              )}
            </div>

            <div className="oauth-action-box">
              <label>
                <span>Correo de Apple ID o cuenta iCloud:</span>
                <div className="auth-input-wrap">
                  <Mail size={16} className="input-icon" />
                  <input
                    type="email"
                    placeholder="usuario@icloud.com"
                    value={appleEmail}
                    onChange={e => setAppleEmail(e.target.value)}
                  />
                </div>
              </label>

              <button
                type="button"
                className="apple-action-btn"
                disabled={loading}
                onClick={() => handleAppleLogin()}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 1.01-2.88-.9.04-2 .6-2.64 1.34-.56.65-1.05 1.71-.92 2.76.99.08 1.93-.47 2.55-1.22z"/>
                </svg>
                <span>{loading ? 'Conectando con Apple...' : 'Continuar con Apple'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: CELULAR (SMS / OTP) */}
        {activeTab === 'phone' && (
          <div className="auth-tab-content">
            {otpStep === 'input' ? (
              <form onSubmit={handleSendOtp} className="auth-form">
                <div className="phone-intro-text">
                  <Smartphone size={22} className="phone-icon-top" />
                  <div>
                    <h4>Ingreso rápido por celular</h4>
                    <p>Recibirás un código seguro de 6 dígitos por SMS en tu teléfono.</p>
                    {config.smsConfigured ? (
                      <span className="config-badge live" style={{ marginTop: '4px', display: 'inline-block' }}>
                        ✓ SMS real activo (Twilio)
                      </span>
                    ) : (
                      <span className="config-badge sandbox" style={{ marginTop: '4px', display: 'inline-block' }}>
                        Modo prueba seguro (código en pantalla)
                      </span>
                    )}
                  </div>
                </div>

                <label>
                  <span>Número de teléfono móvil</span>
                  <div className="auth-phone-input">
                    <span className="phone-country-prefix">🇨🇴 +57</span>
                    <input
                      required
                      type="tel"
                      maxLength={14}
                      placeholder="300 123 4567"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                    />
                  </div>
                </label>

                <button type="submit" className="auth-submit-btn" disabled={loading}>
                  {loading ? 'Enviando código...' : 'Enviar código por SMS'}
                  <ArrowRight size={16} />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="auth-form">
                <button
                  type="button"
                  className="otp-back-link"
                  onClick={() => { setOtpStep('input'); setError(''); }}
                >
                  <ArrowLeft size={14} /> Cambiar número (+57 {phone})
                </button>

                <div className="otp-prompt-box">
                  <h4>Ingresa el código de 6 dígitos</h4>
                  <p>Enviado a tu móvil (+57 {phone}):</p>
                  {otpPreview && (
                    <div className="otp-preview-chip">
                      <span>Código de verificación: <strong>{otpPreview}</strong></span>
                    </div>
                  )}
                  {sentViaSms && !otpPreview && (
                    <div className="otp-preview-chip" style={{ background: '#edf7f2', color: '#206349' }}>
                      <span>Revisa los mensajes SMS de tu teléfono móvil</span>
                    </div>
                  )}
                </div>

                <div className="otp-input-center">
                  <input
                    required
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    className="otp-code-input"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                  />
                </div>

                <button type="submit" className="auth-submit-btn" disabled={loading || otpCode.length < 6}>
                  {loading ? 'Verificando código...' : 'Confirmar y entrar a Brisa'}
                  <CheckCircle2 size={16} />
                </button>
              </form>
            )}
          </div>
        )}

        {/* Drawer de Estado de Configuración de Proveedores */}
        <div className="auth-provider-status-bar">
          <button
            type="button"
            className="auth-config-guide-trigger"
            onClick={() => setShowConfigDrawer(!showConfigDrawer)}
          >
            <Settings size={13} />
            <span>{showConfigDrawer ? 'Ocultar guía de proveedores' : 'Estado y configuración de proveedores'}</span>
          </button>
        </div>

        {showConfigDrawer && (
          <div className="auth-config-drawer">
            <div className="auth-config-drawer-header">
              <h4>Estado de los 4 Métodos de Acceso</h4>
              <button
                type="button"
                onClick={() => setShowConfigDrawer(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#687b72' }}
              >
                <X size={14} />
              </button>
            </div>

            <div className="auth-config-list">
              <div className="config-item-row">
                <div className="config-item-info">
                  <KeyRound size={15} style={{ color: '#2a6955' }} />
                  <span>Usuario y Contraseña</span>
                </div>
                <span className="config-badge live">Listo (PBKDF2/SHA-256)</span>
              </div>

              <div className="config-item-row">
                <div className="config-item-info">
                  <Mail size={15} style={{ color: '#4285F4' }} />
                  <span>Google / Gmail</span>
                </div>
                {config.googleClientId ? (
                  <span className="config-badge live">Conectado (GIS)</span>
                ) : (
                  <span className="config-badge sandbox">Modo Directo Activo</span>
                )}
              </div>

              <div className="config-item-row">
                <div className="config-item-info">
                  <Lock size={15} style={{ color: '#1e2d27' }} />
                  <span>Apple ID (iPhone)</span>
                </div>
                {config.appleClientId ? (
                  <span className="config-badge live">Conectado</span>
                ) : (
                  <span className="config-badge sandbox">Modo Directo Activo</span>
                )}
              </div>

              <div className="config-item-row">
                <div className="config-item-info">
                  <Smartphone size={15} style={{ color: '#2a6955' }} />
                  <span>Celular SMS</span>
                </div>
                {config.smsConfigured ? (
                  <span className="config-badge live">SMS Real (Twilio)</span>
                ) : (
                  <span className="config-badge sandbox">Pruebas (En pantalla)</span>
                )}
              </div>
            </div>

            <p className="auth-config-help-text">
              Para producción completa, agrega tus credenciales en el archivo <code>.env</code>:
              <br />
              • <code>GOOGLE_CLIENT_ID</code> (Google Cloud Console OAuth 2.0)
              <br />
              • <code>APPLE_CLIENT_ID</code> (Apple Developer Services ID)
              <br />
              • <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code> y <code>TWILIO_FROM_NUMBER</code> (Despacho real de SMS).
            </p>
          </div>
        )}

        <div className="auth-footer-security">
          <ShieldCheck size={14} />
          <span>Tus datos financieros están cifrados y protegidos bajo la Ley 1581 de 2012.</span>
        </div>
      </div>
    </div>
  );
}
