import { ShieldCheck, Lock, EyeOff, UserCheck, FileText, Globe } from 'lucide-react';

export const metadata = {
  title: 'Política de Privacidad y Tratamiento de Datos · Brisa',
  description: 'Tratamiento de datos personales de Brisa conforme a la Ley 1581 de 2012 de Colombia, Google Play y Apple App Store.',
};

export default function PrivacidadPage() {
  return (
    <div>
      <div className="legal-title-section">
        <span className="eyebrow">TRANSPARENCIA Y PRIVACIDAD</span>
        <h1>Política de Privacidad y Tratamiento de Datos Personales</h1>
        <p className="legal-date">
          Última actualización: 29 de septiembre de 2026 · Versión 1.2
        </p>
      </div>

      <div className="legal-highlight">
        <ShieldCheck size={28} />
        <div>
          <strong>Compromiso fundamental de Brisa:</strong>
          <p>
            Tus datos financieros son exclusivamente tuyos. No vendemos, no alquilamos ni compartimos tu información financiera con centrales de riesgo, bancos ni anunciantes publicitarios. Brisa funciona como una libreta personal segura y digital.
          </p>
        </div>
      </div>

      <section>
        <h2>1. Identificación del Responsable del Tratamiento</h2>
        <p>
          La presente Política de Tratamiento de la Información rige para la aplicación web y móvil <strong>Brisa · Finanzas personales</strong> (en adelante, «Brisa»). Brisa opera en cumplimiento de la <strong>Ley Estatutaria 1581 de 2012</strong>, su Decreto Reglamentario 1377 de 2013 de la República de Colombia (Régimen de Protección de Datos Personales y Habeas Data), el Reglamento General de Protección de Datos (GDPR) y las directrices de privacidad de <strong>Google Play Store</strong> y <strong>Apple App Store</strong>.
        </p>
        <p>
          Para el ejercicio de tus derechos de Habeas Data o consultas sobre tus datos, puedes comunicarte a través del canal oficial de soporte: <code>privacidad@brisa-finanzas.co</code> o directamente mediante el mecanismo automatizado dentro de la aplicación.
        </p>
      </section>

      <section>
        <h2>2. Información que recopilamos</h2>
        <p>Brisa recopila únicamente la información indispensable para brindarte el servicio de gestión de tus finanzas personales:</p>
        <ul>
          <li>
            <strong>Datos de Identidad y Acceso:</strong> Identificador de usuario, nombre de visualización y dirección de correo electrónico provistos al iniciar sesión mediante el proveedor de autenticación.
          </li>
          <li>
            <strong>Registros Financieros Voluntarios:</strong> Movimientos de ingresos, gastos y aportes a metas (concepto, monto en pesos colombianos COP, fecha, categoría y cuenta o medio de pago declarado).
          </li>
          <li>
            <strong>Planificación Financiera:</strong> Gastos fijos recurrentes, metas de ahorro con fecha y monto objetivo, y tarjetas de crédito declaradas (nombre personalizado, banco emisor, cupo, fechas de corte y pago, y de manera opcional exclusivamente los últimos 4 dígitos para tu propia identificación visual).
          </li>
          <li>
            <strong>Información Procesada por el Asistente:</strong> Fragmentos de texto o fotos de comprobantes/facturas que decidas enviar voluntariamente al Asistente inteligente para clasificar un movimiento.
          </li>
        </ul>

        <div className="info-box-danger">
          <EyeOff size={22} />
          <div>
            <strong>Datos que NUNCA solicitamos ni almacenamos:</strong>
            <ul>
              <li>Números completos de tarjetas de crédito o débito (PAN).</li>
              <li>Códigos de seguridad (CVV / CVC) ni fechas de vencimiento de tarjetas.</li>
              <li>Contraseñas, claves de acceso o PIN de portales bancarios.</li>
              <li>Acceso en segundo plano a la bandeja de SMS o llamadas del teléfono.</li>
              <li>Ubicación geográfica por GPS ni agenda de contactos.</li>
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2>3. Finalidades del Tratamiento de Datos</h2>
        <p>La información personal y financiera que ingresas en Brisa se utiliza estrictamente para:</p>
        <ol>
          <li>Calcular balances mensuales, disponible real acumulado y comparativas frente a tu presupuesto (regla 50/30/20).</li>
          <li>Proyectar cronogramas estimados de cuotas e intereses de tus compras a crédito.</li>
          <li>Mostrar alertas visuales de vencimiento de gastos fijos mientras utilizas la aplicación.</li>
          <li>Generar informes financieros periódicos (diarios, semanales o mensuales) para tu propia descarga o consulta.</li>
          <li>Permitir la descarga de copias de seguridad completas en formato JSON estructurado.</li>
        </ol>
      </section>

      <section>
        <h2>4. Proveedores de Terceros y Transferencia de Datos</h2>
        <p>Brisa no cede tus datos a terceros con fines comerciales ni publicitarios. Los únicos servicios externos integrados son:</p>
        <ul>
          <li>
            <strong>Google Gemini API (Inteligencia Artificial):</strong> Cuando utilizas el Asistente conversacional o envías una foto de recibo, únicamente se transmite a Google el texto o imagen de esa solicitud específica para que el modelo extraiga los datos estructurados. No se envía tu historial financiero previo. Puedes consultar la política de Google en su portal de privacidad de IA.
          </li>
          <li>
            <strong>Google Drive API (Opcional):</strong> Si decides conectar tu Google Drive para respaldos, se emplea el alcance mínimo restringido <code>drive.file</code>. Brisa únicamente tiene acceso para crear y actualizar la carpeta «Brisa · Finanzas personales» y los archivos que ella misma genera. No lee ni modifica ningún otro documento de tu Drive.
          </li>
          <li>
            <strong>Infraestructura de Almacenamiento Cifrada:</strong> Los registros se alojan en bases de datos con cifrado en reposo y en tránsito (HTTPS / TLS 1.3).
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Derechos de los Titulares (Habeas Data)</h2>
        <p>
          De conformidad con el Artículo 8 de la Ley 1581 de 2012 de Colombia y las normativas internacionales de protección al consumidor, tienes derecho a:
        </p>
        <ul>
          <li><strong>Conocer:</strong> Acceder a la totalidad de tus datos personales y financieros en cualquier momento.</li>
          <li><strong>Actualizar y Rectificar:</strong> Corregir cualquier registro, categoría, monto o preferencia directamente desde la interfaz.</li>
          <li><strong>Portabilidad:</strong> Descargar un respaldo completo de tus datos en archivo JSON o tus movimientos en formato CSV compatible con Excel.</li>
          <li><strong>Suprimir / Derecho al Olvido:</strong> Exigir la eliminación total e inmediata de tus registros y cuenta.</li>
        </ul>
      </section>

      <section>
        <h2>6. Mecanismo de Eliminación de Cuenta y Datos</h2>
        <p>
          En cumplimiento de las políticas obligatorias de <strong>Google Play Console</strong> y <strong>Apple App Store (Guideline 5.1.1(v))</strong>:
        </p>
        <p>
          Puedes eliminar tu cuenta y todos tus registros de forma instantánea y definitiva en cualquier momento mediante cualquiera de las siguientes dos vías:
        </p>
        <ol>
          <li>
            <strong>Desde la Aplicación:</strong> Ingresa a <em>Mi Espacio → Cuenta personal → Eliminar mi cuenta y todos mis datos</em> y confirma la acción.
          </li>
          <li>
            <strong>Desde la Web Pública:</strong> Accede a nuestra página de eliminación en línea: <a href="/legal/eliminacion-datos">brisa.app/legal/eliminacion-datos</a>.
          </li>
        </ol>
        <p>
          La eliminación es atómica e inmediata: se borran permanentemente todos los movimientos, compras de crédito, tarjetas, gastos fijos, metas, informes e historial de revisiones de los servidores.
        </p>
      </section>

      <section>
        <h2>7. Seguridad de la Información</h2>
        <p>
          Implementamos medidas técnicas, humanas y administrativas acordes a la Ley 1273 de 2009 de Colombia contra accesos no autorizados. Todas las conexiones viajan mediante protocolos seguros HTTPS/TLS, los endpoints mutables validan estrictamente el origen de las peticiones para prevenir ataques CSRF, y las consultas a la base de datos están parametrizadas contra inyección SQL.
        </p>
      </section>

      <section>
        <h2>8. Modificaciones a la Política de Privacidad</h2>
        <p>
          Cualquier actualización sustancial a esta política será informada dentro de la aplicación. El uso continuado del servicio después de la publicación de cambios constituye la aceptación de los mismos.
        </p>
      </section>
    </div>
  );
}
