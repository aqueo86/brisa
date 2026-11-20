# Conexión de Google Drive

El perfil y los informes se guardan en la base privada de Brisa. La copia en Drive requiere configuración externa y consentimiento de la cuenta; no está activa sin un identificador OAuth válido.

1. En un proyecto propio de Google Cloud, habilitar Google Drive API y configurar la pantalla de consentimiento de Google Auth Platform.
2. Crear un cliente OAuth de tipo aplicación web. Añadir como origen JavaScript autorizado `https://brisa-finanzas-cristian.mediaintegral67.chatgpt.site`. Para pruebas locales, añadir `http://localhost:5173`.
3. Configurar el identificador público como variable de entorno de Sites `GOOGLE_DRIVE_CLIENT_ID`. En desarrollo se puede usar `.env`. No se necesita ni se debe incluir un secreto de cliente en el navegador.
4. Si la aplicación está en modo de prueba, añadir las cuentas autorizadas como usuarios de prueba. Completar los requisitos de publicación de Google antes de ofrecerla a otros usuarios.
5. En Brisa, guardar el perfil, generar un informe, conectar Drive y pulsar Guardar perfil e informe. Comprobar los enlaces devueltos por Google.

Se utiliza el alcance `https://www.googleapis.com/auth/drive.file`. Solo se gestionan los archivos usados por Brisa. El token permanece en memoria durante la sesión. La aplicación crea una carpeta privada, guarda el perfil JSON y el informe HTML, y actualiza el archivo del mismo período en posteriores copias. No solicita compartir públicamente los archivos.

Los informes se generan a petición o al abrir Brisa para el último período cerrado de la frecuencia elegida. No hay un proceso programado con la aplicación cerrada ni copias automáticas en Drive.

El acceso a Gmail es una integración pendiente e independiente: requiere permisos de correo, recepción de notificaciones y procesamiento en servidor. El inicio de sesión en Brisa no autoriza leer Gmail. La web tampoco puede abrir directamente la bandeja SMS de un iPhone; una integración con Atajos requeriría configurar el teléfono y un destino autenticado en el servidor.

Referencias: https://developers.google.com/identity/oauth2/web/guides/use-token-model y https://developers.google.com/workspace/drive/api/guides/manage-uploads
