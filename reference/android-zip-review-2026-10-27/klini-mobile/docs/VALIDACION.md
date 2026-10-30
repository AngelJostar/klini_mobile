# Validación de esta entrega

Fecha: 26 de octubre de 2026. Entorno de validación: Node 24.22.1, Linux, Expo SDK 57 y React Native 0.86.3.

| Comprobación | Resultado |
| --- | --- |
| `npm run typecheck` | Sin errores TypeScript en aplicación, pruebas y utilidades. |
| `npm test` | 19 pruebas de dominio aprobadas. |
| `npx expo-doctor` | 21 de 21 comprobaciones aprobadas. |
| `npx expo install --check` | Dependencias compatibles con el SDK. |
| `npm run export:android` | Bundle Hermes y recursos Android generados correctamente. |
| `npm run export:web` | Aplicación web compilada correctamente. |
| `npm run test:e2e` | Seis recorridos de interfaz aprobados en Chromium, anchos de 390 y 320 px; sin errores JavaScript. |

## Comportamientos comprobados

Las pruebas de dominio verifican fechas y horarios, conflictos de 30 minutos por profesional o paciente, cancelación y liberación de horarios, reprogramación sin duplicar la cita, preservación de identidad al cambiar el nombre, pólizas vigentes y aceptadas, protección de referencias, rechazo de datos corruptos y persistencia FIFO incluso después de errores.

Las pruebas de interfaz recorren una reserva completa, notas, exportación de calendario, reprogramación, cancelación y recarga persistente; edición de perfil; alta de póliza y alta/baja de gasto local; creación y edición de registro clínico; preparación, notas, sala simulada y resumen de teleconsulta. También comprueban los cuatro accesos en una fila y ausencia de desbordamiento horizontal a 320 px. Los datos utilizados son ficticios.

## Repetir las pruebas de interfaz

```bash
npm ci
npm run export:web
npx playwright install chromium
npm run test:e2e
```

El script intercepta las peticiones de la aplicación y sirve los archivos exportados desde disco; no requiere un servidor HTTP ni servicios de terceros. Guarda los resultados temporales en `test-results`, excluido de la entrega. Opcionalmente, `KLINI_CHROMIUM_EXECUTABLE_PATH` permite usar un Chromium ya instalado.

## Alcance de la verificación nativa

Este entorno no tiene Android SDK, `adb` ni un emulador Android. **No se generó un APK y no se ejecutó una instalación nativa.** Una exportación Hermes correcta confirma la resolución y compilación del JavaScript para Android; no reemplaza la compilación de Gradle ni la prueba en un dispositivo.

En tu emulador deben verificarse: áreas seguras y teclado, botón Atrás del sistema, selector y persistencia de archivos después de reiniciar, menú de compartir/calendario, apertura del marcador y reuniones externas, permisos de notificaciones y entrega de recordatorios. Las llamadas a médicos, aseguradoras, pagos, autenticación y videollamada integrada no están conectadas; su alcance se indica en `FUNCIONES.md`.


## Registro por categoría — 29 de octubre de 2026

Verificado sobre la versión actual de esta carpeta (Expo 58, sin cambiar dependencias):

- `npm run typecheck`: aprobado.
- ESLint de `ArchiveScreen.tsx`, `RecordTypePopup.tsx`, `files.ts`, `verify-register.ts` y `verify-history.ts`: aprobado.
- `npm run lint`: ejecutado; conserva cinco errores previos de `react-hooks/set-state-in-effect` en `DirectoryFlow.tsx` y `TeleconsultScreen.tsx`, además de tres advertencias ajenas a Registro.
- `npm run export:web` y `npm run export:android`: aprobados. La exportación Android no genera un APK.
- `node --import tsx scripts/verify-register.ts`: aprobado en Chromium. Las ocho categorías abren Foto/Texto/Archivo adjunto; la categoría conserva el estilo de Historial, sin borde de selección. Verificados cierre y Escape, selección de imagen y PDF, texto, categoría guardada, adjuntos persistidos tras recargar y ancho de 320 px.
- `node --import tsx scripts/verify-history.ts`: aprobado; creación desde Historial, búsqueda, filtros y ventana pequeña.
- `scripts/verify-android-register.ps1 -device emulator-5558`: aprobado en Expo Go. Se verificó abrir el selector desde una categoría, las tres opciones, apertura del formulario Texto y regreso con Atrás, sin guardar datos. La selección nativa de archivos/fotos no se ejercitó en este recorrido.

Capturas: `test-results/register-type-popup.png`, `test-results/register-type-popup-small.png`, `test-results/register-categories-no-selection.png`, `test-results/android-register-type-popup.png` y `test-results/android-register-categories.png`.
