# MusicPlay - Proyecto Final PDM

Aplicación de música para web y Android desarrollada como proyecto final de Programación de Dispositivos Móviles (PDM).

Este repositorio contiene el cliente Angular/Ionic y el proyecto nativo `android/`. El backend Spring Boot, la base de datos y el servicio Python de recomendaciones se ejecutan por separado y no están incluidos.

## Estructura del repositorio

```text
android/              Proyecto nativo Android, recursos y Gradle Wrapper
assets/               Imágenes y logotipos utilizados por la aplicación
e2e/                  Pruebas de interfaz con Playwright
src/app/core/         Servicios de API, sesión, biblioteca y reproductor
src/app/layout/       Navegación y estructura de la interfaz
src/app/pages/        Acceso, inicio, biblioteca y administración
src/app/shared/       Componentes compartidos
src/environments/     Configuración de la API para web y Android
capacitor.config.ts   Configuración de Capacitor
```

`.gitignore` excluye dependencias, cachés, compilaciones, resultados de pruebas, ajustes locales, credenciales, herramientas de modernización y las carpetas vacías del cliente anterior. El código nativo de `android/` se conserva. Después de clonar, `npm ci` y `npm run android:sync` regeneran los recursos y plugins necesarios.

El cliente completo usa TypeScript, Angular 22 y componentes standalone de Ionic 9. Capacitor 8 incluye el proyecto nativo en `android/`. Se conservan los recursos originales, el tema oscuro, el acento verde, el degradado del reproductor y los contratos de la API de Spring.

## Desarrollo web

Requiere Node 22.22.3+, 24.15+ o 26 y npm. Se recomienda Node 24 LTS.

```powershell
npm ci
npm start
```

Abre `http://localhost:4200`. El frontend necesita Spring en el puerto 8080 y el servicio Python de recomendaciones detrás del proxy de Spring. No se abre un HTML directamente desde el explorador de archivos.

```powershell
npm run build
```

La aplicación compilada queda en `www/browser`. Publica **el contenido de esa carpeta**. La navegación con hash (`/#/home`) permite recargar rutas en hosting estático y en Android; `<base href="./">` admite subcarpetas como GitHub Pages.

## API y autenticación

- `src/environments/environment.ts`: usa siempre `https://23r23nf9-8080.use2.devtunnels.ms`, incluso al ejecutar Angular en localhost. Cambia esta URL por el dominio de tu backend cuando corresponda.
- `src/environments/environment.android.ts`: URL HTTPS de la API para el dispositivo. `localhost` dentro de Android apunta al propio dispositivo. El túnel incluido es el del proyecto original y debe estar activo o sustituirse.
- `ApiService` adjunta el JWT y resuelve las rutas de portadas/audio. `SessionService` conserva las claves `jwtToken` y `guestMode` del cliente original.
- Los guards controlan sesión, preferencias iniciales y rol administrador. El backend sigue siendo responsable de autorizar cada operación.

Para Google en web, configura en Spring:

```properties
OAUTH_SUCCESS_URL=http://localhost:4200/
OAUTH_FAILURE_URL=http://localhost:4200/
```

Para web publicada, usa la raíz HTTPS de la aplicación (incluye la subcarpeta cuando corresponda). No agregues `#/home` a estas variables: Spring añade `?token=...` o `?oauthError=...` y Angular procesa el resultado antes de navegar.

Para Google en Android, el navegador del sistema regresa a la app mediante:

```properties
OAUTH_SUCCESS_URL=musicplay://auth/callback
OAUTH_FAILURE_URL=musicplay://auth/callback
```

El manifiesto registra ese enlace y el plugin App recibe el token. La URI de redirección autorizada en Google continúa siendo el callback HTTPS de **Spring**, `/login/oauth2/code/google`. Las variables anteriores son el destino final después de ese callback. El backend actual tiene un único par de destinos; para probar web y Android con Google simultáneamente se necesitan instancias/perfiles con destinos distintos.

## Android

El proyecto `android/` ya está generado. Requiere JDK 21, Android Studio 2025.2.1 o posterior y Android SDK 36. La versión mínima es Android 7 / API 24.

```powershell
npm run android:sync
npm run android:open
```

Selecciona un dispositivo o emulador y ejecuta la app desde Android Studio. También puedes usar `npm run android:run`. Si recreas la plataforma desde cero, `npm run android:add` la genera; conserva los cambios propios del manifiesto y del tema al hacerlo.

`capacitor.config.ts` define `com.musicplay.app`, el nombre MusicPlay, `webDir: 'www/browser'`, el fondo oscuro y el origen `https://localhost`. No incluye un `server.url`: el APK carga los archivos compilados dentro del dispositivo. Spring admite ese origen mediante CORS. Para desarrollar con API HTTP en emulador, configura una variante de desarrollo con `10.0.2.2:8080` y habilita HTTP/mixed content únicamente en esa variante; la configuración incluida usa HTTPS.

Después de sincronizar, puedes compilar con `cd android` y `.\gradlew.bat assembleDebug --no-daemon` en PowerShell. El APK de depuración se genera en `android/app/build/outputs/apk/debug/app-debug.apk`. No incluye una firma de distribución. Los archivos generados por `cap sync`, los builds y la configuración local del SDK están excluidos de Git.

## Vistas migradas

| Cliente anterior | Angular |
| --- | --- |
| `page/index.html` + `app.js` | Landing con tendencias, álbumes y recientes |
| `login.js`, `register.js` | Formularios de acceso y registro, Google e invitado |
| `camContra.js` | Recuperación por correo, código y nueva contraseña |
| `preferencias.js` | Selección inicial de artista |
| `home.js`, `views/*` | Inicio, búsqueda, canciones, artistas, álbumes, favoritos y playlists |
| `components/*`, `state.js`, `router.js` | Layout Ionic, servicios con signals y Angular Router |
| `admin.js` | CRUD de canciones, artistas, álbumes y géneros con multipart |

Las listas de ejemplo se sustituyen por los datos reales del backend. El reproductor conserva cola, siguiente/anterior, reproducción aleatoria, progreso, volumen, metadatos y registro de reproducciones. Cambiar entre vistas musicales mantiene la reproducción; cerrar sesión o salir del área musical la detiene.

## Diseño y comprobaciones

`src/styles.css` concentra el tema y los puntos de adaptación. La biblioteca usa `ion-split-pane` en escritorio y `ion-menu` en móvil. El reproductor se compacta en pantallas pequeñas; los formularios y las tarjetas cambian de columnas y las tablas de administración permiten desplazamiento horizontal propio. Se respetan las áreas seguras del dispositivo.

```powershell
npm run test:e2e
```

Las doce pruebas usan Chrome instalado y una API simulada; cubren anchuras de 360, 768 y 1440 px, errores de ejecución, acceso, invitado, búsqueda, reproducción persistente, avance del audio sin saltos automáticos, búsqueda manual con la barra de progreso, favoritos, recuperación, preferencias, envíos multipart y recepción del token OAuth. Guardan capturas de referencia en `test-results/`. No sustituyen las pruebas con el backend real, una cuenta Google o un dispositivo Android.

Referencias: [compatibilidad de Angular](https://angular.dev/reference/versions), [Ionic Angular](https://ionicframework.com/docs/angular/overview) y [configuración de Capacitor](https://capacitorjs.com/docs/config).
