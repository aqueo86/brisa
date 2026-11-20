# Brisa web y Android

## Versión HTML/web

Aplicación completa: https://brisa-finanzas-cristian.mediaintegral67.chatgpt.site/

Guía HTML: `/mobile.html`. Esta guía puede abrirse como documento HTML, pero no contiene una réplica independiente de la aplicación. El dashboard genera HTML en el servidor y utiliza JavaScript, autenticación y una base de datos privada. Copiar el HTML por sí solo no permite conservar esas funciones.

La versión web tiene manifiesto, iconos de 192 y 512 píxeles, metadatos móviles, instalación desde Configuración y página sin conexión. El service worker no almacena respuestas de API, páginas privadas ni movimientos. Requiere internet para operar. La disponibilidad de instalación depende del navegador y del acceso al sitio privado; si no se ofrece la instalación completa, se puede añadir un acceso a la pantalla de inicio.

El archivo ZIP web contiene el código completo necesario para seguir desarrollando esta aplicación, incluidos su servidor y las migraciones. No contiene dependencias instaladas ni credenciales. Sigue utilizando el proyecto de Sites existente, su autenticación y su base de datos; para alojarlo fuera de Sites se deben adaptar esos servicios. Las instrucciones de arranque están en README.md.

## Android

La carpeta `android/` contiene un cliente Android con icono propio que abre la aplicación en una Custom Tab. Comparte la sesión del navegador empleado. No usa un WebView para capturar el inicio de sesión. No incluye permisos de SMS, contactos o notificaciones. La barra segura del navegador permanece visible.

Se intentó compilar y el entorno no tenía Java; tampoco se detectó Android SDK. No se generó ni probó un APK. Android Studio, JDK 17 y Android SDK 35 son los requisitos pendientes. Las instrucciones y comprobaciones de dispositivo están en `android/README.md`.

Instalar la web desde Chrome permite utilizarla desde la pantalla de inicio sin esperar a compilar el proyecto Android. Ambas opciones dependen del servidor y conservan el acceso privado. No se publicó en Google Play ni se crearon claves de firma de producción.

## Validación

- Compilar web y comprobar TypeScript.
- Revisar manifiesto e iconos y que Configuración incluya la instalación.
- Probar a 390 píxeles: navegación inferior desplazable, registro de gastos y perfil sin desbordamientos.
- En un Android real: instalar, iniciar sesión, registrar un movimiento y verlo en la web; cerrar y volver a abrir; comprobar el retorno tras pérdida de conexión.
- Probar el APK cuando estén disponibles las herramientas y el dispositivo. La comprobación web no sustituye esta prueba.
