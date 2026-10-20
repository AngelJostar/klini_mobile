# Portal móvil de paciente, entrega del 7 de octubre de 2026

La entrada `/portal` utiliza el adaptador React Native del paquete
`reference/paciente-movil-2026-10-07`. Abre `/patient` en el mismo origen configurado
en `EXPO_PUBLIC_API_URL`. El portal de Laravel conserva las vistas Blade, recursos,
estilos, scripts, formularios y navegación originales. No se transforma el HTML
en una reproducción de pantallas nativas.

## Servidor

Dr. Sam debe servir el portal, sus rutas web y sus recursos. Para el emulador Android:

```env
EXPO_PUBLIC_APP_ENV=local
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api/mobile/v1
```

En pruebas y producción se requiere HTTPS. Para un teléfono físico se utiliza el
dominio del servidor o su dirección LAN accesible desde el teléfono.

El acceso se realiza dentro del portal mediante la sesión web y cookies de Laravel.
La sesión de la API móvil es independiente; no se inyectan tokens en el HTML.
El botón Atrás de Android recorre el historial del portal. Los enlaces externos
HTTPS, telefónicos y de correo se abren en las aplicaciones correspondientes.
WebView conserva el almacenamiento DOM para perfiles, comunidades y actividad local.
En Android, WebView integra el selector de archivos y DownloadManager con cookies.
El archivo ICS que genera el botón de calendario se entrega al selector nativo
para abrirlo o guardarlo, conservando el código original del portal.

## Compilación

```powershell
npm.cmd run android
```

Después de instalar el nuevo build, los cambios JavaScript se sirven con
`npm.cmd run start:dev`. Se necesita recompilar al incorporar `react-native-webview`.

Si Java falla con `Unable to establish loopback connection` desde una ruta temporal
abreviada de Windows, se puede usar una carpeta temporal del proyecto para ese proceso:

```powershell
New-Item -ItemType Directory -Path .build-tmp -Force | Out-Null
$env:TEMP = (Resolve-Path .build-tmp).Path
$env:TMP = $env:TEMP
$env:JAVA_TOOL_OPTIONS = "-Djdk.net.unixdomain.tmpdir=$env:TEMP"
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21.0.12.1'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
npm.cmd run android
```

## Contenido de la entrega

Los 287 archivos del manifiesto SHA256 se verificaron sin diferencias. Las vistas,
CSS, controlador y modelos del portal ya coincidían con Dr. Sam. Se incorporaron
las 67 imágenes `public/images/patient-export` y el `public/js/communities.js` del
paquete que utiliza esas imágenes locales.

Las interacciones sociales, perfiles locales y reservas de comunidades conservan
la persistencia local del código entregado; no se convierten en servicios remotos.
Las citas, seguro, perfil y adjuntos utilizan los formularios Laravel existentes.

Verificaciones: lint y TypeScript, 14 pruebas Laravel del portal (145 aserciones),
y 32 pruebas JavaScript de calendario, perfiles y actividad social. El puente de
calendario tiene cuatro pruebas de validación de mensajes y limpieza de archivos.

Recorrido Android: inicio, comunidades, seguro, análisis, recetas, médicos, dispositivos, registro, Mi Salud, historial clínico y calendario. Las secciones abrieron sin imágenes rotas visibles ni desbordamiento horizontal. Se verificó el selector nativo con una descarga Blob ICS de prueba, sin crear citas ni enviar archivos. Capturas en artifacts/patient-portal. No se enviaron formularios que alteren datos clínicos durante este recorrido.
