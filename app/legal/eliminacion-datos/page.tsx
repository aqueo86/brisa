import { Trash2, ShieldAlert, CheckCircle, ArrowRight, UserX, AlertOctagon } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Eliminación de Cuenta y Datos · Brisa',
  description: 'Instrucciones y mecanismo para la eliminación permanente de tu cuenta y datos personales en Brisa.',
};

export default function EliminacionDatosPage() {
  return (
    <div>
      <div className="legal-title-section">
        <span className="eyebrow">DERECHO AL OLVIDO Y HABEAS DATA</span>
        <h1>Eliminación de Cuenta y Supresión de Datos</h1>
        <p className="legal-date">
          Conforme a las políticas de Google Play Store, Apple App Store y la Ley 1581 de 2012 de Colombia.
        </p>
      </div>

      <div className="legal-highlight danger-highlight">
        <AlertOctagon size={28} />
        <div>
          <strong>Acción definitiva e irreversible:</strong>
          <p>
            Al solicitar la eliminación de tu cuenta, todos tus datos y registros financieros personales serán borrados permanentemente de nuestros servidores. Esta acción no se puede deshacer.
          </p>
        </div>
      </div>

      <section>
        <h2>¿Qué información se elimina?</h2>
        <p>Cuando solicitas la eliminación de tu cuenta en Brisa, se suprimen de manera atómica e inmediata:</p>
        <ul>
          <li><strong>Historial completo de movimientos:</strong> Todos los ingresos, gastos y aportes a metas registrados.</li>
          <li><strong>Tarjetas de crédito y compras asociadas:</strong> Plásticos declarados, cuotas proyectadas y planes de amortización.</li>
          <li><strong>Gastos fijos y alertas:</strong> Compromisos mensuales recurrentes y fechas programadas.</li>
          <li><strong>Perfil financiero personal:</strong> Diagnóstico de ingresos, dificultades declaradas y metas de ahorro.</li>
          <li><strong>Historial de revisiones:</strong> Copias históricas y puntos de restauración de tu perfil.</li>
          <li><strong>Bandeja de mensajes (Inbox):</strong> Textos de SMS y notificaciones pegadas.</li>
          <li><strong>Informes generados:</strong> Reportes diarios, semanales o mensuales almacenados en el servidor.</li>
          <li><strong>Preferencias y configuración:</strong> Asignaciones del presupuesto y categorías favoritas.</li>
        </ul>
      </section>

      <section>
        <h2>Mecanismo 1: Eliminación directa desde la Aplicación (Recomendado)</h2>
        <p>Si tienes acceso a tu cuenta, puedes completar el proceso en menos de 1 minuto:</p>
        <ol>
          <li>Abre la aplicación <strong>Brisa</strong> e inicia sesión.</li>
          <li>En la barra lateral o en el encabezado superior, haz clic en tu avatar o en <strong>Mi espacio / Cuenta personal</strong>.</li>
          <li>En la parte inferior de la ventana de cuenta, pulsa en el botón rojo <strong>«Eliminar mi cuenta y todos mis datos»</strong>.</li>
          <li>Confirma la advertencia de seguridad. El sistema ejecutará el borrado inmediato en la base de datos y cerrará tu sesión.</li>
        </ol>
        <div style={{ marginTop: 20 }}>
          <Link href="/panel" className="primary" style={{ display: 'inline-flex' }}>
            Ir a Mi Cuenta en Brisa <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section>
        <h2>Mecanismo 2: Solicitud externa por correo electrónico</h2>
        <p>
          Si no tienes acceso a la aplicación, has desinstalado el navegador o deseas tramitar tu derecho de supresión de datos conforme a la Ley 1581 de 2012 (Habeas Data) sin entrar a la app:
        </p>
        <ol>
          <li>
            Envía un correo electrónico a nuestro canal de privacidad: <code>privacidad@brisa-finanzas.co</code>
          </li>
          <li>
            Usa el asunto: <strong>«Solicitud de Eliminación de Cuenta y Datos - Brisa»</strong>.
          </li>
          <li>
            Indica la dirección de correo electrónico con la cual te autenticabas en Brisa para identificar tus registros.
          </li>
        </ol>
        <p>
          Una vez validada la titularidad, nuestro equipo procederá a la supresión técnica total de los registros asociados a tu identificador en un plazo máximo de 48 horas hábiles, enviándote la constancia de eliminación por el mismo canal.
        </p>
      </section>

      <section>
        <h2>Período de retención de datos</h2>
        <p>
          Brisa <strong>no conserva copias ocultas ni datos residuales</strong> tras la eliminación. Una vez ejecutada la orden de borrado en la base de datos, los registros desaparecen de forma inmediata. Si en el futuro deseas volver a utilizar Brisa, podrás iniciar una cuenta completamente nueva desde cero.
        </p>
      </section>
    </div>
  );
}
