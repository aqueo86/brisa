import { AlertTriangle, BookOpen, ShieldAlert, Sparkles, Scale } from 'lucide-react';

export const metadata = {
  title: 'Términos y Condiciones de Uso · Brisa',
  description: 'Términos de servicio, licencia EULA y exención de responsabilidad financiera de Brisa Finanzas Personales.',
};

export default function TerminosPage() {
  return (
    <div>
      <div className="legal-title-section">
        <span className="eyebrow">CONDICIONES DE SERVICIO Y LICENCIA</span>
        <h1>Términos y Condiciones de Uso</h1>
        <p className="legal-date">
          Última actualización: 29 de septiembre de 2026 · Versión 1.2
        </p>
      </div>

      <div className="legal-highlight warning-highlight">
        <AlertTriangle size={28} />
        <div>
          <strong>Aviso Legal Financiero Imprescindible:</strong>
          <p>
            Brisa es una herramienta digital de registro privado, organización y educación financiera personal. <strong>NO es una entidad financiera ni está vigilada por la Superintendencia Financiera de Colombia (SFC)</strong>. No capta dinero, no abre cuentas de depósito ni realiza transferencias de fondos.
          </p>
        </div>
      </div>

      <section>
        <h2>1. Aceptación de los Términos</h2>
        <p>
          Al acceder, instalar o utilizar la aplicación web o móvil <strong>Brisa · Finanzas personales</strong> (la «Aplicación»), declaras ser mayor de edad con plena capacidad legal y aceptas de manera vinculante estos Términos y Condiciones, así como nuestra <a href="/legal/privacidad">Política de Privacidad</a>. Si no estás de acuerdo con alguna disposición, te solicitamos abstenerte de utilizar la Aplicación.
        </p>
      </section>

      <section>
        <h2>2. Naturaleza del Servicio y Exención de Responsabilidad Financiera</h2>
        <p>
          En estricto cumplimiento del marco legal y financiero de la República de Colombia y las normativas para tiendas de aplicaciones:
        </p>
        <ul>
          <li>
            <strong>Sin intermediación financiera:</strong> Brisa no es un banco, establecimiento de crédito, compañía de financiamiento, sociedad fiduciaria, SEDPE ni asesor de inversión matriculado.
          </li>
          <li>
            <strong>Sin captación ni custodia de dinero:</strong> La Aplicación en ningún momento recibe, almacena, transfiere ni custodia dinero de los usuarios. Cualquier registro de «saldo», «ingreso», «gasto» o «aporte a meta» es una anotación contable digital que realizas de manera voluntaria.
          </li>
          <li>
            <strong>Diferencia entre flujo registrado y saldo bancario:</strong> La cifra de «Disponible del mes» representa la diferencia matemática entre tus entradas registradas, gastos y asignaciones a metas dentro de Brisa. No equivale ni sustituye el saldo oficial de tus extractos o cuentas bancarias.
          </li>
          <li>
            <strong>Simulaciones de crédito e intereses:</strong> Los cronogramas de cuotas y cálculos de intereses (conversión de Tasa Efectiva Anual E.A. a mensual) son estimaciones matemáticas aproximadas. No contemplan cuotas de manejo, seguros de vida deudores, cargos de cobranza, mora ni fluctuaciones contractuales que tu entidad bancaria aplique. La única fuente oficial de tu deuda es el extracto emitido por tu banco.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Uso de Funciones de Inteligencia Artificial (Apple Store Guideline 1.2 / 5.6.4)</h2>
        <p>
          La Aplicación integra funciones de procesamiento de lenguaje natural y visión artificial provistas por <strong>Google Gemini</strong> con las siguientes condiciones indispensables:
        </p>
        <ul>
          <li>
            <strong>Carácter de asistencia en la digitación:</strong> La IA se utiliza exclusivamente para acelerar la preparación de borradores de gastos o ingresos a partir de texto o fotos de recibos que tú envías.
          </li>
          <li>
            <strong>Verificación obligatoria del usuario:</strong> Los modelos de inteligencia artificial pueden cometer errores, alucinaciones numéricas o clasificaciones imprecisas. Es responsabilidad exclusiva y obligatoria del usuario revisar y confirmar el monto, la fecha y la categoría antes de guardar cualquier movimiento.
          </li>
          <li>
            <strong>No asesoría financiera ni de inversión:</strong> Las respuestas de la IA no constituyen recomendaciones de inversión, promesas de rentabilidad, consejos tributarios ni asesoría legal o contable.
          </li>
          <li>
            <strong>Mecanismo de reporte y descarte:</strong> Si una sugerencia de la IA es incorrecta o inadecuada, cuentas con la opción inmediata de editarla, descartarla o reintentar sin que se guarde ningún cambio en tu cuenta.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Licencia de Uso (EULA) y Propiedad Intelectual</h2>
        <p>
          Sujeto al cumplimiento de estos Términos, se te otorga una licencia personal, no exclusiva, intransferible y revocable para utilizar la Aplicación en tus dispositivos personales compatibles.
        </p>
        <p>
          Todos los derechos de propiedad intelectual sobre el código, interfaces, diseños, marcas, logotipos («brisa.») y componentes gráficos son de exclusiva titularidad de los creadores de Brisa o sus respectivos licenciantes. Queda prohibida la descompilación, ingeniería inversa o explotación comercial no autorizada.
        </p>
      </section>

      <section>
        <h2>5. Obligaciones y Conducta del Usuario</h2>
        <p>Al utilizar Brisa, te comprometes a:</p>
        <ol>
          <li>Mantener la confidencialidad de tu sesión y accesos.</li>
          <li>No ingresar datos de terceros sin contar con la debida autorización previa e informada.</li>
          <li>No utilizar la Aplicación para fines ilícitos, fraude o actividades prohibidas por la legislación colombiana.</li>
          <li>No intentar vulnerar la seguridad, autenticación o integridad de los servidores y bases de datos.</li>
        </ol>
      </section>

      <section>
        <h2>6. Limitación de Responsabilidad</h2>
        <p>
          En la máxima medida permitida por la ley aplicable, Brisa se proporciona «tal cual» («as is») y «según disponibilidad». No garantizamos que el servicio sea ininterrumpido o esté completamente libre de errores.
        </p>
        <p>
          En ningún caso seremos responsables por pérdidas financieras directas o indirectas, multas bancarias, decisiones de endeudamiento o discrepancias derivadas de la información registrada por el usuario o de estimaciones matemáticas proyectadas.
        </p>
      </section>

      <section>
        <h2>7. Terminación y Eliminación de la Cuenta</h2>
        <p>
          Puedes terminar tu relación con Brisa en cualquier momento eliminando tu cuenta y todos tus datos mediante el botón disponible en la aplicación o a través de nuestra página web pública de <a href="/legal/eliminacion-datos">Eliminación de Cuenta</a>.
        </p>
      </section>

      <section>
        <h2>8. Ley Aplicable y Jurisdicción</h2>
        <p>
          Estos Términos y Condiciones se rigen e interpretan de conformidad con las leyes de la <strong>República de Colombia</strong>. Cualquier controversia será sometida a los mecanismos alternativos de resolución de conflictos o ante los jueces competentes de Colombia.
        </p>
      </section>
    </div>
  );
}
