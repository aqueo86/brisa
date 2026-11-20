# Brisa para Android

Proyecto Android de un cliente conectado a la Brisa existente. Abre la aplicación web en una Custom Tab segura, conservando la sesión del navegador elegido. La barra del navegador permanece visible. No es una implementación nativa independiente ni funciona sin conexión.

No incluye un APK compilado. En el entorno donde se preparó este proyecto no había Java, Android SDK ni emulador; se debe compilar y probar antes de distribuirlo.

## Compilar e instalar

1. Abrir esta carpeta en Android Studio.
2. Usar JDK 17 y descargar Android SDK Platform 35 y Build Tools desde SDK Manager. Revisar y aceptar las licencias correspondientes.
3. Sincronizar Gradle. Se incluyen las versiones Gradle 8.9, Android Gradle Plugin 8.7.3 y AndroidX Browser 1.8.0.
4. Ejecutar `gradlew.bat assembleDebug` en Windows o `sh gradlew assembleDebug` en macOS/Linux. El APK de prueba se generará en `app/build/outputs/apk/debug/app-debug.apk`.
5. Instalar con Android Studio Run o `adb install -r app/build/outputs/apk/debug/app-debug.apk` en un dispositivo de pruebas autorizado.
6. Para distribución permanente, generar un APK firmado desde Android Studio y conservar la clave de firma privada fuera del repositorio. No se ha creado una clave ni publicado en Google Play.

## Verificación en el dispositivo

- Abrir Brisa, iniciar sesión con la cuenta que tiene acceso al sitio privado y comprobar los mismos movimientos que en la web.
- Registrar un gasto y comprobarlo en otro dispositivo.
- Revisar Gastos fijos, registrar un pago y comprobar que desaparezca su alerta.
- Verificar Atrás, rotación, teclado numérico, informes descargados y reconexión tras perder internet.
- Comprobar que no aparecen solicitudes de lectura de SMS o contactos ni de notificaciones: no se implementaron esos permisos.

La cuenta debe tener acceso al sitio privado. El uso desde Android no cambia la audiencia. Drive, Gmail y Atajos conservan su estado pendiente; esta envoltura no los activa.

Para una presentación a pantalla completa mediante Trusted Web Activity se necesita verificar la relación entre el dominio y el certificado real de firma mediante Digital Asset Links. No se ha publicado una asociación ficticia ni reducido la seguridad del sitio. La instalación desde Chrome de la versión web es una alternativa disponible sin compilar este proyecto.

Documentación: https://developer.android.com/develop/ui/views/layout/webapps/overview-of-android-custom-tabs y https://developer.android.com/build/building-cmdline
