# Klini móvil

Aplicación de demostración en **React Native, Expo SDK 57 y TypeScript**. Incluye directorio médico, agenda, teleconsulta demostrativa, seguros y archivo clínico personal. Los cambios se conservan en el dispositivo; no necesitas API keys para probarla.

## Abrir en Android Studio

### 1. Preparar el equipo

En Windows, macOS o Linux instala:

- Node.js **22.13 o superior**; se recomienda **Node 24 LTS**.
- [Android Studio](https://developer.android.com/studio), Android SDK, Platform-Tools y Android Emulator.
- Para compilar la aplicación nativa: **JDK 17 o una versión compatible superior** y `JAVA_HOME` configurado.

En Android Studio abre **SDK Manager**, comprueba la ruta **Android SDK Location** e instala las plataformas y Build-Tools requeridas por Expo SDK 57. En **Device Manager → Create Virtual Device**, crea un teléfono Pixel, descarga una imagen compatible con tu procesador y enciéndelo. Sigue la [guía oficial del emulador de Expo](https://docs.expo.dev/workflow/android-studio-emulator/) para la configuración del SDK y Java.

Si la terminal no encuentra Android, usa la ruta real del SDK. Estos son ejemplos para la sesión actual:

**Windows, PowerShell**

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator"
```

**macOS, Terminal**

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
```

**Linux, Terminal**

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
```

Comprueba que el emulador iniciado aparece como dispositivo:

```bash
node --version
adb devices
```

### 2. Instalar y ejecutar

Descomprime el proyecto, abre una terminal **dentro de `klini-mobile`** y ejecuta:

```bash
npm ci
npm run android
```

Este comando inicia Metro y abre la aplicación en **Expo Go** dentro del emulador. Si aparece una incompatibilidad, instala la versión de Expo Go para **SDK 57 / Android** desde [expo.dev/go](https://expo.dev/go). La versión de Expo Go debe corresponder a la del proyecto; [Expo explica cómo resolver ese aviso](https://docs.expo.dev/troubleshooting/expo-go-version-mismatch/).

Mantén Metro abierto mientras pruebas. Para detenerlo, pulsa `Ctrl+C`.

### 3. Compilar una aplicación de desarrollo propia

Con el emulador activo, JDK y Android SDK configurados:

```bash
npm run android:native
```

Expo genera el proyecto Android, compila e instala un **development build**. La primera compilación descarga dependencias y tarda más. Después puedes abrir la carpeta `android` generada con Android Studio. Mantén las dependencias y configuración de Expo del proyecto.

## Vista web y comprobaciones

```bash
npm run web
```

La vista web permite recorrer los mismos menús. Los recordatorios locales de Android y el selector de compartir nativo se prueban en Android. Los archivos exportados se descargan en el navegador.

```bash
npm run test
npm run typecheck
npm run export:android
npm run export:web
```

`export:android` genera JavaScript y recursos de Android: **no genera un APK ni ejecuta un emulador**. Los resultados y el alcance de las comprobaciones se registran en `docs/VALIDACION.md`. La ejecución nativa en emulador debe comprobarse en un equipo con Android Studio; no se da por verificada por una exportación correcta.

## Probar los menús

1. **Directorio médico:** busca un perfil, elige modalidad y horario, registra paciente y forma de pago y confirma la cita local.
2. **Agenda:** abre la cita, añade notas, exporta un calendario `.ics`, reprograma o cancela.
3. **Teleconsulta:** abre una cita, completa la preparación manual y entra a la sala de demostración. También puedes configurar y abrir tu propio enlace HTTPS externo.
4. **Seguro médico:** edita pólizas, adjunta comprobantes y organiza gastos con estados locales.
5. **Archivo:** agrega o edita consultas, estudios, recetas, vacunas, notas y medicamentos. Los adjuntos admiten PDF, imágenes o texto hasta 2 MB.
6. **Tú:** edita perfil, contacto de emergencia y preferencias, consulta favoritos o exporta datos JSON. Activa recordatorios para solicitar permiso de avisos locales de citas 15 minutos antes en Android.

La referencia visual se conserva en [docs/Referencia_UI.png](docs/Referencia_UI.png). La interfaz mantiene las proporciones de Klini; el emulador muestra su propia barra de estado y controles del sistema Android.

## Datos y alcance

Todos los ejemplos son ficticios. Las reservas, gastos y estados se guardan localmente; no se contacta a médicos o aseguradoras, no se procesa un pago y no hay videollamada integrada. La apertura de una reunión o del marcador ocurre mediante una acción explícita de la persona. Consulta la matriz [FUNCIONES](docs/FUNCIONES.md).

AsyncStorage **no está cifrado** y esta versión no implementa autenticación ni bloqueo biométrico. Utiliza datos de prueba. La exportación JSON nativa conserva referencias a los adjuntos, **no sus bytes**: no es una copia completa y no hay importador de respaldos. Borrar los datos de la app o desinstalarla puede eliminar los registros y archivos locales. **Tú → Restablecer demostración** reinicia el contenido después de confirmar.

## APK opcional

No se incluye un APK precompilado. `eas.json` contiene un perfil `preview` para solicitar uno mediante EAS; requiere cuenta Expo y configurar el proyecto en esa cuenta:

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview
```

El APK estará disponible solo cuando esa compilación termine correctamente. Consulta la [guía oficial de APK de Expo](https://docs.expo.dev/build-reference/apk/).

## Si no abre

| Situación | Acción |
| --- | --- |
| `adb` no existe | Revisa `ANDROID_HOME`, añade `platform-tools` al `PATH` y abre otra terminal. |
| No encuentra emulador | Inícialo en Device Manager y revisa `adb devices`. |
| Expo Go incompatible | Instala la edición Android correspondiente a SDK 57; conserva el SDK del proyecto. |
| Metro conserva una versión anterior | Detén Metro y ejecuta `npx expo start --clear --go`; pulsa `a` con el emulador abierto. |
| Gradle pide Java o un SDK | Comprueba `java -version`, `JAVA_HOME` y el SDK Manager; instala la versión indicada por el error. |
| No aparecen avisos de citas | Revisa el permiso de notificaciones de Klini en Android y que la cita sea futura. La vista web no programa avisos. |
