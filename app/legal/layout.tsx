import Link from 'next/link';
import { ChartNoAxesCombined, ArrowLeft, ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Brisa · Legal y Privacidad',
  description: 'Políticas de privacidad, términos de servicio y normatividad legal de Brisa Finanzas Personales.',
};

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="legal-shell">
      <header className="legal-header">
        <div className="legal-header-inner">
          <Link href="/" className="brand" aria-label="Brisa inicio">
            <span className="brand-mark">
              <ChartNoAxesCombined size={22} />
            </span>
            brisa<span className="brand-period">.</span>
          </Link>
          <div className="legal-nav">
            <Link href="/panel" className="secondary small-btn">
              <ArrowLeft size={15} /> Volver a la App
            </Link>
          </div>
        </div>
      </header>
      <main className="legal-main">
        <div className="legal-subnav">
          <Link href="/legal/privacidad">Política de Privacidad</Link>
          <span>·</span>
          <Link href="/legal/terminos">Términos y Condiciones</Link>
          <span>·</span>
          <Link href="/legal/eliminacion-datos">Eliminación de Cuenta y Datos</Link>
        </div>
        <article className="legal-content">{children}</article>
      </main>
      <footer className="legal-footer">
        <div className="legal-footer-inner">
          <div>
            <strong>brisa.</strong> · Finanzas personales en calma.
            <p className="small muted" style={{ marginTop: 6 }}>
              Cumplimiento normativo Ley 1581 de 2012 (Colombia) y directrices de Google Play y Apple App Store.
            </p>
          </div>
          <div className="legal-badges">
            <span className="badge-item">
              <ShieldCheck size={16} /> Datos cifrados y privados
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
