'use client';
import { useState, useEffect } from 'react';
import MobileInstall from './mobile-install';
import DevicePermissions from './device-permissions';
import {
  Smartphone,
  Mail,
  MessageSquare,
  Zap,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  Play,
  Eye,
  EyeOff,
  ExternalLink,
  CreditCard,
  Plus,
  Trash2,
  Building2,
  Wallet
} from 'lucide-react';
import { money } from '@/lib/finance';
import type { UserBankAccount } from '@/lib/sync';

interface SyncEvent {
  id: string;
  source: string;
  description: string;
  amount: number;
  status: 'registered' | 'pending' | 'duplicate';
  created_at: string;
}

const COLOMBIAN_BANKS = [
  'Bancolombia',
  'Nequi',
  'Daviplata',
  'Nu Colombia',
  'Davivienda',
  'BBVA Colombia',
  'Banco de Bogotá',
  'Scotiabank Colpatria',
  'Lulo Bank',
  'Banco Falabella',
  'Banco de Occidente',
  'Itaú',
  'RappiCard'
];

export default function AutomationSettings({
  onInbox,
  onProfile,
  onMovementCreated
}: {
  onInbox: () => void;
  onProfile: () => void;
  onMovementCreated?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [forwardingEmail, setForwardingEmail] = useState('');
  const [autoRegister, setAutoRegister] = useState(true);
  const [bankAccounts, setBankAccounts] = useState<UserBankAccount[]>([]);
  const [recentEvents, setRecentEvents] = useState<SyncEvent[]>([]);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [simulating, setSimulating] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedGuide, setSelectedGuide] = useState<'apple_pay' | 'google_pay' | 'email' | 'sms'>('apple_pay');

  // New account form state
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newBank, setNewBank] = useState('Bancolombia');
  const [newType, setNewType] = useState<'savings' | 'checking' | 'credit_card' | 'digital_wallet'>('savings');
  const [newLastFour, setNewLastFour] = useState('');
  const [newCustomName, setNewCustomName] = useState('');
  const [addingAccount, setAddingAccount] = useState(false);

  async function loadConfig() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/sync/config');
      if (!res.ok) throw new Error('No se pudo cargar la configuración de sincronización.');
      const data = await res.json();
      setToken(data.token || '');
      setWebhookUrl(data.webhookUrl || '');
      setForwardingEmail(data.forwardingEmail || '');
      setAutoRegister(Boolean(data.autoRegister));
      setRecentEvents(data.recentEvents || []);
      setBankAccounts(data.bankAccounts || []);
    } catch (err: any) {
      setError(err?.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConfig();
  }, []);

  async function copyToClipboard(text: string, type: 'webhook' | 'email') {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'webhook') {
        setCopiedWebhook(true);
        setTimeout(() => setCopiedWebhook(false), 2500);
      } else {
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2500);
      }
    } catch {
      setMessage('Selecciona el texto para copiarlo manualmente.');
    }
  }

  async function handleRotateToken() {
    if (!confirm('¿Seguro que deseas regenerar tu token? Los atajos o integraciones configuradas previamente deberán actualizarse con la nueva URL.')) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/sync/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rotate_token' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al renovar token.');
      setToken(data.token);
      setWebhookUrl(data.webhookUrl);
      setMessage('Token de sincronización renovado con éxito.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleAutoRegister(newValue: boolean) {
    try {
      setAutoRegister(newValue);
      const res = await fetch('/api/sync/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_auto_register', autoRegister: newValue })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(newValue ? 'Modo activo: Registro directo automático en tus movimientos.' : 'Modo activo: Los pagos recibidos esperarán tu confirmación en la Bandeja.');
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault();
    setAddingAccount(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/sync/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_account',
          bank: newBank,
          accountType: newType,
          lastFour: newLastFour,
          customName: newCustomName || `${newBank} *${newLastFour}`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al vincular cuenta.');
      setBankAccounts(data.bankAccounts || []);
      setNewLastFour('');
      setNewCustomName('');
      setShowAddAccount(false);
      setMessage(`¡Cuenta ${data.account.customName} vinculada con éxito! Los movimientos recibidos para los dígitos *${data.account.lastFour} se asignarán a esta cuenta.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAddingAccount(false);
    }
  }

  async function handleDeleteAccount(id: string, name: string) {
    if (!confirm(`¿Eliminar la vinculación de "${name}"?`)) return;
    try {
      const res = await fetch('/api/sync/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_account', id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al desvincular cuenta.');
      setBankAccounts(data.bankAccounts || []);
      setMessage('Cuenta desvinculada correctamente.');
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleSimulate(type: 'apple_pay' | 'google_pay' | 'email' | 'sms') {
    setSimulating(type);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/sync/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_simulate', type })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error en la prueba de sincronización.');

      if (data.result?.action === 'registered') {
        setMessage(`¡Pago registrado automáticamente! ${data.result.movement.description} por ${money(data.result.movement.amount)} asignado a "${data.result.movement.account}" (${data.result.movement.source}).`);
        if (onMovementCreated) onMovementCreated();
      } else if (data.result?.action === 'inbox') {
        setMessage(`Movimiento preparado en tu Bandeja de Entrada: ${data.result.movement.description} por ${money(data.result.movement.amount)}.`);
      } else if (data.result?.action === 'skipped') {
        setMessage('Aviso: Movimiento idéntico detectado hoy. El protector de duplicados evitó registrar dos veces el pago.');
      }

      if (data.recentEvents) setRecentEvents(data.recentEvents);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSimulating(null);
    }
  }

  return (
    <div className="sync-hub-container">
      <MobileInstall />
      <DevicePermissions />

      {/* Hero Card & Inbound Credentials */}
      <section className="card sync-hero-card">
        <div className="sync-hero-header">
          <span className="big-colored-icon"><Zap size={30} /></span>
          <div>
            <span className="eyebrow">SINCRONIZACIÓN MULTIUSUARIO AUTOMÁTICA</span>
            <h2>Tus Cuentas, Alertas y Pagos en Vivo</h2>
            <p>Vincula tus números de cuenta y tarjetas para que cuando pagues con Apple Pay, Google Pay, o recibas un correo o SMS de tu banco, el gasto se registre automáticamente en la cuenta correcta.</p>
          </div>
        </div>

        {error && <div className="form-error" role="alert">{error}</div>}
        {message && <div className="info-note" role="status">{message}</div>}

        {/* 1. Vinculación de Cuentas y Tarjetas del Usuario */}
        <div className="card linked-accounts-section">
          <div className="row-between section-heading">
            <div>
              <h3><Building2 size={18} /> Mis Cuentas y Tarjetas Bancarias</h3>
              <p className="small muted">Registra los últimos 4 dígitos de tus tarjetas o cuentas. Cuando llegue una notificación bancaria, Brisa detectará esos dígitos y asociará el gasto a tu cuenta exacta.</p>
            </div>
            <button
              type="button"
              className="primary"
              onClick={() => setShowAddAccount(!showAddAccount)}
            >
              <Plus size={16} /> {showAddAccount ? 'Cerrar formulario' : 'Vincular nueva cuenta'}
            </button>
          </div>

          {showAddAccount && (
            <form onSubmit={handleAddAccount} className="form add-account-form">
              <div className="form-grid">
                <label>
                  Banco o Entidad Financiera
                  <select
                    value={newBank}
                    onChange={e => setNewBank(e.target.value)}
                  >
                    {COLOMBIAN_BANKS.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Tipo de Instrumento
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value as any)}
                  >
                    <option value="savings">Cuenta de Ahorros</option>
                    <option value="credit_card">Tarjeta de Crédito</option>
                    <option value="checking">Cuenta Corriente</option>
                    <option value="digital_wallet">Billetera Digital (Nequi/Daviplata)</option>
                  </select>
                </label>
              </div>

              <div className="form-grid">
                <label>
                  Últimos 4 dígitos (como aparece en los SMS o correos)
                  <input
                    type="text"
                    required
                    maxLength={4}
                    placeholder="Ej. 4567"
                    value={newLastFour}
                    onChange={e => setNewLastFour(e.target.value.replace(/\D/g, ''))}
                  />
                </label>
                <label>
                  Nombre personalizado
                  <input
                    type="text"
                    maxLength={50}
                    placeholder={`Ej. ${newBank} Nómina`}
                    value={newCustomName}
                    onChange={e => setNewCustomName(e.target.value)}
                  />
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setShowAddAccount(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="primary"
                  disabled={addingAccount}
                >
                  <Plus size={16} /> {addingAccount ? 'Vinculando…' : 'Guardar y Activar Detección'}
                </button>
              </div>
            </form>
          )}

          <div className="bank-accounts-grid">
            {bankAccounts.length === 0 ? (
              <div className="empty-accounts-box">
                <Wallet size={28} />
                <p>Aún no has vinculado cuentas bancarias o tarjetas. Pulsa <strong>«Vincular nueva cuenta»</strong> para que el motor identifique automáticamente de dónde salió cada pago.</p>
              </div>
            ) : (
              bankAccounts.map(acc => (
                <div key={acc.id} className="bank-account-card">
                  <div className="row-between">
                    <span className="account-card-bank"><strong>{acc.bank}</strong></span>
                    <button
                      type="button"
                      className="icon-button danger-icon"
                      title="Desvincular cuenta"
                      onClick={() => handleDeleteAccount(acc.id, acc.customName)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <strong className="account-card-name">{acc.customName}</strong>
                  <div className="account-card-footer">
                    <span className="account-badge">
                      {acc.accountType === 'credit_card' ? '💳 Tarjeta Crédito' : acc.accountType === 'digital_wallet' ? '📱 Billetera' : '🏦 Ahorros'}
                    </span>
                    <span className="account-card-digits">Terminada en <strong>*{acc.lastFour}</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 2. Credenciales y Canales Inbound */}
        <div className="sync-config-box">
          <div className="row-between sync-config-title">
            <span className="sync-badge online">
              <i className="status-dot-pulse" /> Motor de Sincronización Activo
            </span>
            <label className="sync-toggle-label">
              <input
                type="checkbox"
                checked={autoRegister}
                onChange={e => handleToggleAutoRegister(e.target.checked)}
              />
              <span><strong>Registro 100% automático</strong> (sin confirmación previa)</span>
            </label>
          </div>

          {/* Webhook URL */}
          <label className="sync-url-label">
            <span>Tu Webhook Privado (Para Apple Pay, Atajos y Apps de Notificaciones)</span>
            <div className="sync-input-group">
              <input
                type="text"
                readOnly
                value={showToken ? webhookUrl : webhookUrl.replace(/token=([a-zA-Z0-9_-]{10})[a-zA-Z0-9_-]+/, 'token=$1••••••••••••••••')}
                className="sync-url-input"
              />
              <button
                type="button"
                className="icon-button"
                title={showToken ? 'Ocultar token' : 'Ver token'}
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
              <button
                type="button"
                className="primary sync-copy-btn"
                onClick={() => copyToClipboard(webhookUrl, 'webhook')}
              >
                {copiedWebhook ? <><Check size={16} /> Copiado</> : <><Copy size={16} /> Copiar URL</>}
              </button>
            </div>
            <small className="muted">Protegido con tu token único. Los eventos recibidos se asignarán directamente a tus cuentas registradas.</small>
          </label>

          {/* Forwarding Email */}
          {forwardingEmail && (
            <label className="sync-url-label" style={{ marginTop: 12 }}>
              <span>Tu Correo Dedicado de Reenvío (Para Gmail / Outlook / Yahoo)</span>
              <div className="sync-input-group">
                <input
                  type="text"
                  readOnly
                  value={forwardingEmail}
                  className="sync-url-input"
                />
                <button
                  type="button"
                  className="primary sync-copy-btn"
                  onClick={() => copyToClipboard(forwardingEmail, 'email')}
                >
                  {copiedEmail ? <><Check size={16} /> Copiado</> : <><Copy size={16} /> Copiar Correo</>}
                </button>
              </div>
              <small className="muted">Crea una regla de reenvío automático en Gmail para que los correos de compra de tus bancos se reenvíen aquí.</small>
            </label>
          )}

          <div className="sync-actions-row">
            <button
              type="button"
              className="text-button"
              onClick={handleRotateToken}
              disabled={loading}
            >
              <RefreshCw size={14} /> Regenerar token de seguridad
            </button>
            <button
              type="button"
              className="text-button"
              onClick={onInbox}
            >
              <MessageSquare size={14} /> Ver bandeja de entrada
            </button>
          </div>
        </div>

        {/* 3. Simulador en Vivo */}
        <div className="sync-simulator-card">
          <div className="row-between">
            <div>
              <h3>⚡ Simular eventos de pago en vivo</h3>
              <p className="small muted">
                {bankAccounts.length > 0
                  ? `Probando con tu cuenta vinculada: "${bankAccounts[0].customName}" (*${bankAccounts[0].lastFour}). Haz clic para verificar cómo Brisa asigna el movimiento.`
                  : 'Haz clic en cualquier botón para comprobar de inmediato cómo Brisa procesa la transacción en segundo plano.'}
              </p>
            </div>
          </div>
          <div className="simulator-buttons-grid">
            <button
              type="button"
              className="secondary simulator-btn"
              disabled={!!simulating}
              onClick={() => handleSimulate('apple_pay')}
            >
              <Play size={15} />
              <span>{simulating === 'apple_pay' ? 'Enviando…' : '🍎 Simular Apple Pay ($32.000 Juan Valdez)'}</span>
            </button>
            <button
              type="button"
              className="secondary simulator-btn"
              disabled={!!simulating}
              onClick={() => handleSimulate('google_pay')}
            >
              <Play size={15} />
              <span>{simulating === 'google_pay' ? 'Enviando…' : '🤖 Simular Google Pay ($48.500 Éxito)'}</span>
            </button>
            <button
              type="button"
              className="secondary simulator-btn"
              disabled={!!simulating}
              onClick={() => handleSimulate('email')}
            >
              <Play size={15} />
              <span>{simulating === 'email' ? 'Enviando…' : '✉️ Simular Correo Bancario ($125.000)'}</span>
            </button>
            <button
              type="button"
              className="secondary simulator-btn"
              disabled={!!simulating}
              onClick={() => handleSimulate('sms')}
            >
              <Play size={15} />
              <span>{simulating === 'sms' ? 'Enviando…' : '💬 Simular Notificación / SMS ($19.000)'}</span>
            </button>
          </div>
        </div>

        {/* Recent Events History */}
        {recentEvents.length > 0 && (
          <div className="recent-sync-events">
            <h4>Últimas transacciones sincronizadas</h4>
            <div className="sync-events-table">
              {recentEvents.map(evt => (
                <div key={evt.id} className="sync-event-row">
                  <span className={`sync-event-status ${evt.status}`}>
                    {evt.status === 'registered' ? 'Registrado ✓' : evt.status === 'duplicate' ? 'Duplicado evitado' : 'En bandeja'}
                  </span>
                  <span className="sync-event-source"><strong>{evt.source}</strong></span>
                  <span className="sync-event-desc">{evt.description}</span>
                  <strong className="sync-event-amount">{money(evt.amount)}</strong>
                  <span className="small muted">{new Date(evt.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Channel Guides Grid */}
      <div className="section-heading" style={{ marginTop: 28 }}>
        <div>
          <h2>Canales de Sincronización</h2>
          <p>Selecciona un método para ver el paso a paso detallado y habilitarlo en tu dispositivo o cuenta bancaria.</p>
        </div>
      </div>

      <div className="sync-channels-tabs">
        <button
          className={selectedGuide === 'apple_pay' ? 'selected' : ''}
          onClick={() => setSelectedGuide('apple_pay')}
        >
          🍎 Apple Pay & Atajos iPhone
        </button>
        <button
          className={selectedGuide === 'google_pay' ? 'selected' : ''}
          onClick={() => setSelectedGuide('google_pay')}
        >
          🤖 Google Pay & Android
        </button>
        <button
          className={selectedGuide === 'email' ? 'selected' : ''}
          onClick={() => setSelectedGuide('email')}
        >
          ✉️ Correos de Bancos (Gmail / Outlook)
        </button>
        <button
          className={selectedGuide === 'sms' ? 'selected' : ''}
          onClick={() => setSelectedGuide('sms')}
        >
          💬 Mensajes SMS de Bancos
        </button>
      </div>

      {/* Selected Channel Detailed Guide */}
      <section className="card sync-guide-detail">
        {selectedGuide === 'apple_pay' && (
          <div>
            <div className="guide-header">
              <span className="big-colored-icon"><CreditCard size={28} /></span>
              <div>
                <h3>Cómo configurar Apple Pay (iPhone y Apple Watch)</h3>
                <p>En iOS 17+, la aplicación nativa <strong>Atajos (Shortcuts)</strong> tiene un disparador oficial de <strong>Transacción</strong> que detecta pagos de Apple Pay en datáfonos o en internet.</p>
              </div>
            </div>

            <ol className="sync-step-list">
              <li>
                <strong>Abre la app Atajos en tu iPhone:</strong> Ve a la pestaña inferior <em>«Automatización»</em> y pulsa el botón <strong>+</strong> (arriba a la derecha).
              </li>
              <li>
                <strong>Elige el disparador de Apple Pay:</strong> Busca y selecciona <strong>«Transacción»</strong>.
                <ul>
                  <li>En <em>Tarjeta</em>: selecciona «Cualquier tarjeta» (o tu tarjeta bancaria favorita).</li>
                  <li>En <em>Categoría</em>: selecciona «Cualquiera».</li>
                  <li>Marca <strong>«Ejecutar inmediatamente»</strong> y desmarca <em>«Notificar al ejecutar»</em> para que sea 100% silencioso. Pulsa <em>Siguiente</em>.</li>
                </ul>
              </li>
              <li>
                <strong>Añade la acción de envío a Brisa:</strong> Toca <em>«Nueva automatización vacía»</em> -&gt; <em>«Añadir acción»</em> -&gt; busca <strong>«Obtener contenido de URL»</strong>.
                <ul>
                  <li>En <em>URL</em>: pega tu URL de sincronización personal copiada arriba.</li>
                  <li>Toca la flecha azul para desplegar las opciones avanzadas:</li>
                  <li>En <em>Método</em>: selecciona <strong>POST</strong>.</li>
                  <li>En <em>Encabezados</em>: añade <code>Content-Type: application/json</code>.</li>
                  <li>En <em>Cuerpo de la solicitud</em>: selecciona <strong>JSON</strong> y añade el campo <code>text</code> con el valor de la variable <em>«Entrada de atajo»</em>.</li>
                </ul>
              </li>
              <li>
                <strong>¡Listo!</strong> Cada vez que acerques tu iPhone o Apple Watch a un datáfono o compres con Apple Pay, la transacción se enviará de forma automática y transparente a Brisa.
              </li>
            </ol>
            <div className="info-note">
              <strong>Formato JSON de ejemplo para Atajos:</strong>
              <pre className="code-snippet">
{`{
  "source": "Apple Pay",
  "amount": [Importe de transacción],
  "merchant": [Comercio],
  "date": [Fecha de transacción]
}`}
              </pre>
            </div>
          </div>
        )}

        {selectedGuide === 'google_pay' && (
          <div>
            <div className="guide-header">
              <span className="big-colored-icon"><Smartphone size={28} /></span>
              <div>
                <h3>Cómo configurar Google Pay y Notificaciones Bancarias en Android</h3>
                <p>En Android, Google Wallet y las aplicaciones de bancos colombianos (Bancolombia, Nequi, Daviplata, Nu, Scotiabank) generan notificaciones inmediatas cada vez que realizas un pago.</p>
              </div>
            </div>

            <ol className="sync-step-list">
              <li>
                <strong>Método 1 — Con la app Android de Brisa (Recomendado):</strong>
                <ul>
                  <li>Nuestra app incluye el servicio <code>BrisaNotificationListener</code>.</li>
                  <li>En tu teléfono ve a: <strong>Ajustes → Aplicaciones → Acceso especial → Acceso a notificaciones</strong>.</li>
                  <li>Activa el permiso para <strong>Brisa</strong>.</li>
                  <li>Cada vez que Google Pay o tu banco emitan una notificación de compra o débito, la app la captura y la envía a tu cuenta automáticamente.</li>
                </ul>
              </li>
              <li>
                <strong>Método 2 — Con MacroDroid o Tasker (Para navegadores o PWA):</strong>
                <ul>
                  <li>Crea un disparador: <em>Notificación recibida</em> de la app «Google Wallet» o «Bancolombia».</li>
                  <li>Acción: <em>Solicitud HTTP POST</em> a tu URL de sincronización de Brisa con el texto de la notificación en el cuerpo JSON.</li>
                </ul>
              </li>
            </ol>
            <div className="info-note">
              Brisa filtra automáticamente notificaciones publicitarias o códigos OTP para procesar únicamente débitos, compras aprobadas e ingresos verificables.
            </div>
          </div>
        )}

        {selectedGuide === 'email' && (
          <div>
            <div className="guide-header">
              <span className="big-colored-icon"><Mail size={28} /></span>
              <div>
                <h3>Cómo sincronizar Correos Electrónicos Bancarios (Gmail / Outlook)</h3>
                <p>Los bancos envían un correo por cada transferencia, débito o pago con tarjeta (Bancolombia, Nequi, Davivienda, Nu, etc.). Puedes reenviarlos automáticamente a Brisa.</p>
              </div>
            </div>

            <ol className="sync-step-list">
              <li>
                <strong>Opción A — Regla de Reenvío en Gmail / Outlook:</strong>
                <ul>
                  <li>En Gmail, entra a <strong>Configuración (icono engranaje) → Ver todos los ajustes → Filtros y direcciones bloqueadas</strong>.</li>
                  <li>Pulsa <em>«Crear un filtro nuevo»</em>.</li>
                  <li>En el campo <em>De</em>, ingresa los remitentes de tus bancos:
                    <br />
                    <code>notificaciones@bancolombia.com.co OR notificaciones@nequi.com.co OR avisos@nu.com.co OR alertas@davivienda.com</code>
                  </li>
                  <li>Pulsa <em>Crear filtro</em> y marca <em>«Reenviar»</em> hacia tu correo dedicado: <strong>{forwardingEmail || 'movimientos+[tu-cuenta]@sync.brisa.co'}</strong>.</li>
                </ul>
              </li>
              <li>
                <strong>Opción B — Google Apps Script (100% Gratuito y Directo):</strong>
                <ul>
                  <li>Entra a <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-button inline">script.google.com <ExternalLink size={13} /></a> y crea un nuevo proyecto.</li>
                  <li>Pega este script que revisa tus correos bancarios y los envía automáticamente a Brisa:</li>
                </ul>
                <pre className="code-snippet">
{`function syncBankEmailsToBrisa() {
  var webhook = "${webhookUrl || 'TU_URL_DE_WEBHOOK'}";
  var threads = GmailApp.search('label:unread (from:bancolombia OR from:nequi OR from:nu) subject:(compra OR comprobante OR transferencia)', 0, 5);
  for (var i = 0; i < threads.length; i++) {
    var msg = threads[i].getMessages().pop();
    var payload = {
      source: "Correo bancario",
      sender: msg.getFrom(),
      subject: msg.getSubject(),
      body: msg.getPlainBody()
    };
    UrlFetchApp.fetch(webhook, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload)
    });
    threads[i].markRead();
  }
}`}
                </pre>
                <p className="small muted">Programa este script para ejecutarse cada 5 o 10 minutos con el reloj de Google Apps Script. ¡Tus compras por correo se registrarán sin que tengas que abrir la app!</p>
              </li>
            </ol>
          </div>
        )}

        {selectedGuide === 'sms' && (
          <div>
            <div className="guide-header">
              <span className="big-colored-icon"><MessageSquare size={28} /></span>
              <div>
                <h3>Cómo sincronizar Mensajes de Texto (SMS) Bancarios</h3>
                <p>Captura los SMS de compras y transferencias que llegan a tu número celular de forma automática.</p>
              </div>
            </div>

            <ol className="sync-step-list">
              <li>
                <strong>En iPhone:</strong>
                <ul>
                  <li>Abre la app <strong>Atajos</strong> → Pestaña <strong>Automatización</strong> → <strong>+</strong>.</li>
                  <li>Selecciona el evento <strong>«Mensaje»</strong>.</li>
                  <li>En <em>Remitente</em>: selecciona el contacto o número de tu banco (ej. Bancolombia, Nequi, Davivienda).</li>
                  <li>En <em>El mensaje contiene</em>: puedes colocar palabras como <code>compraste</code> o <code>pago</code> (o dejarlo en blanco para todos los mensajes de ese banco).</li>
                  <li>Selecciona <em>«Ejecutar inmediatamente»</em>.</li>
                  <li>Acción: <em>«Obtener contenido de URL»</em> (POST con tu URL de Brisa y el texto del SMS).</li>
                </ul>
              </li>
              <li>
                <strong>En Android:</strong>
                <ul>
                  <li>El servicio <code>BrisaNotificationListener</code> de Android ya intercepta las notificaciones de SMS de Google Mensajes o Samsung Mensajes cuando provienen de bancos y contienen valores monetarios.</li>
                  <li>Solo asegúrate de tener activo el permiso en <em>Ajustes → Acceso a notificaciones → Brisa</em>.</li>
                </ul>
              </li>
            </ol>
          </div>
        )}
      </section>

      <div className="goal-note" style={{ marginTop: 24 }}>
        <ShieldCheck size={24} />
        <p><strong>Privacidad y Control Absoluto:</strong> Tu webhook está encriptado con tu token privado. Brisa no almacena contraseñas bancarias ni tiene acceso para mover dinero; únicamente recibe y clasifica los comprobantes de tus transacciones para organizar tus finanzas personales.</p>
        <button className="text-button" onClick={onInbox}>Revisar bandeja de entrada</button>
      </div>
    </div>
  );
}
