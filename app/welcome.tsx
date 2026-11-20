'use client';

import { useState } from 'react';
import { ArrowUpRight, ShieldCheck, ChartNoAxesCombined, Wallet, Target, CalendarDays, LogOut } from 'lucide-react';
import AuthModal from './auth-modal';

export default function Welcome({
  signedIn,
  name,
  onPreviewContinue
}: {
  signedIn: boolean;
  name: string;
  onPreviewContinue?: () => void;
}) {
  function handleAuthSuccess(user: any) {
    window.location.href = '/panel';
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      });
    } catch {}
    window.location.href = '/';
  }

  return (
    <main className="welcome">
      <header className="welcome-header">
        <a className="welcome-brand" href="/" aria-label="Brisa inicio">
          <span><ChartNoAxesCombined size={30} /></span>
          brisa<span className="brand-dot">.</span>
        </a>
        <span className="welcome-private">
          <ShieldCheck size={17} />
          {onPreviewContinue ? 'Vista de muestra' : 'Tu espacio personal'}
        </span>
      </header>

      <div className="welcome-scene" aria-hidden="true">
        <div className="scene-card scene-one">
          <Wallet />Claridad para cada día
          <div className="scene-bars"><i /><i /><i /><i /><i /></div>
        </div>
        <div className="scene-card scene-two">
          <Target />Espacio para tus metas
          <div className="scene-ring" />
        </div>
        <div className="scene-card scene-three">
          <CalendarDays />Tus compromisos, a tiempo
          <span className="scene-check">✓</span>
        </div>
      </div>

      <div className="welcome-content">
        <section className="welcome-story">
          <span className="welcome-kicker">TU DINERO. TU VIDA. A TU RITMO.</span>
          <h1>Haz espacio<br />para lo que<br /><em>de verdad importa.</em></h1>
          <p>Tus gastos, tus ingresos y tus sueños.<br />Un solo lugar para volver a tener claridad.</p>
          <div className="welcome-features">
            <span>Google & Apple</span>
            <span>Celular SMS</span>
            <span>Usuario y contraseña</span>
            <span>Sincronización bancaria</span>
          </div>
          {onPreviewContinue && (
            <div style={{ marginTop: '28px' }}>
              <button
                type="button"
                className="welcome-enter welcome-demo-enter"
                style={{ maxWidth: '280px', background: '#ffffff14', color: '#e5f3ec', border: '1px solid #71d3a540' }}
                onClick={onPreviewContinue}
              >
                Explorar versión de prueba <ArrowUpRight size={18} />
              </button>
            </div>
          )}
        </section>

        <section className="welcome-login" style={{ padding: '20px' }}>
          {signedIn ? (
            <div style={{ textAlign: 'center', padding: '24px 12px' }}>
              <h2 style={{ fontSize: '26px', marginBottom: '8px' }}>Bienvenido de nuevo</h2>
              <p style={{ color: '#97b4a6', marginBottom: '24px' }}>{name || 'Tu cuenta está lista'}</p>
              <a className="welcome-enter" href="/panel" style={{ marginBottom: '14px' }}>
                Entrar a mi Brisa <ArrowUpRight size={20} />
              </a>
              <button
                type="button"
                onClick={handleLogout}
                className="welcome-switch"
                style={{ background: 'none', border: 'none', cursor: 'pointer', margin: '14px auto 0' }}
              >
                Cerrar sesión / Usar otra cuenta
              </button>
            </div>
          ) : (
            <AuthModal onSuccess={handleAuthSuccess} />
          )}
        </section>
      </div>

      <footer className="welcome-footer">
        <div className="welcome-footer-copy">
          <span>Un poco de claridad, todos los días.</span>
          <span> · </span>
          <span>La misma cuenta en web, iOS y Android.</span>
        </div>
        <div className="welcome-legal-links">
          <a href="/legal/privacidad">Privacidad</a>
          <span>·</span>
          <a href="/legal/terminos">Términos</a>
          <span>·</span>
          <a href="/legal/eliminacion-datos">Eliminación de datos</a>
        </div>
      </footer>
    </main>
  );
}
