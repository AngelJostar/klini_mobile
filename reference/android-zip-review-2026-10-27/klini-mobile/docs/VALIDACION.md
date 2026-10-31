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

## Ver mi seguro — 30 de octubre de 2026

- TypeScript aprobado y 34 pruebas de dominio aprobadas.
- `scripts/verify-insurance-flow.ts`: aprobado en Chrome, con selección y cambio de póliza, alta local, cuatro ventanas, búsqueda de hospitales/médicos sin acentos, condiciones, cierre/Escape, cuatro PDF válidos, persistencia tras recargar y vista de 320 px.
- Los PDF fueron renderizados e inspeccionados; la exportación conserva acentos y datos actuales. Se comprobó paginación con texto largo.
- Exportación Android aprobada en `.expo/insurance-android-check`. No equivale a un APK compilado.
- Inicio Mi seguro abierto y comprobado visualmente en Expo Go en el emulador 5560, después de corregir la caché de Metro y usar la entrada CommonJS de pdf-lib. Captura: `test-results/insurance-android.png`.
- Lint general ejecutado: conserva cinco errores y tres advertencias previas en Directorio, Teleconsulta y store. Los nuevos archivos pasan la validación de tipos; el servicio y las ventanas se verificaron individualmente con ESLint.
- Pendiente la comprobación del menú nativo de compartir PDF en Android/iPhone. Las descargas web sí se ejercitaron.

## Agenda completa y nuevo seguro — 30 de octubre de 2026

- `npm run typecheck`: aprobado. `npm test`: 37 pruebas aprobadas, incluidas validación de datos de cotización, cálculo de ejemplo y rechazo de una cotización desactualizada al registrar la solicitud.
- `scripts/verify-agenda-popup.ts`: aprobado; todas las fechas iniciales, agrupación y orden cronológico, mes menor en el encabezado, filtros junto al calendario, calendario oculto al abrir y botón fijo en 390 y 320 px.
- `scripts/verify-booking-agenda-focus.ts`: aprobado; cita nueva del 2 de noviembre visible al volver a Agenda, recarga persistente y reprogramación al 3 de noviembre sin duplicados ni ocultar las demás fechas.
- `scripts/verify-insurance-flow.ts`: aprobado nuevamente después de integrar la contratación de demostración; conserva selección de pólizas, cuatro ventanas, PDF, alta local y persistencia.
- `scripts/verify-insurance-enrollment.ts`: aprobado en Chrome. Recorre planes, datos obligatorios, precio de ejemplo de $1,250 MXN, edición, cotización/contrato, dos grabaciones de video y audio sintéticos con `getUserMedia`/`MediaRecorder` reales, invalidación al editar, guardado único y recarga persistente. Simula un fallo de almacenamiento: no confirma éxito, revierte el registro fallido y permite reintentar sin duplicarlo. Las pólizas existentes no cambian. Botones menta y ausencia de desbordamiento comprobados en 390 y 320 px.
- El navegador usa un archivo Y4M sintético generado por el script, porque la cámara virtual predeterminada de esta instalación de Chrome terminaba su pista antes de grabar. No se utilizaron cámara ni micrófono personales durante la prueba.
- ESLint individual aprobado para Agenda, sus componentes, el flujo nuevo de seguro, el grabador, el servicio de archivos y sus pruebas. El lint general conserva los cinco errores y tres advertencias previos descritos arriba.
- Selección de planes y formulario del seguro abiertos y revisados visualmente en Expo Go, emulador `emulator-5560`. Capturas: `test-results/insurance-enrollment-plans-android.png` y `test-results/insurance-enrollment-quote-android.png`.
- Icono de Directorio médico simplificado a un estetoscopio blanco mediante Runway e integrado en el recurso local. Comprobado en el inicio del emulador: `test-results/directory-icon-android.png`.
- Exportación Android final aprobada en `.expo/insurance-enrollment-android-check`, con el icono actualizado y el nuevo flujo. No genera un APK.
- La grabación nativa con cámara/micrófono y la persistencia del video tras reiniciar Android/iPhone quedan pendientes de un dispositivo de prueba. La exportación JavaScript de Android no acredita esas operaciones ni genera un APK.

## Proporciones de Directorio — 30 de octubre de 2026

Normalizado el cuerpo visible del icono de Directorio contra Agenda (246 × 258 px dentro del lienzo original), manteniendo el contenedor, el espaciado y los textos. El ajuste ensancha el recurso y compensa su desplazamiento vertical. Revisión visual en Chrome a 390/320 px sin errores JavaScript ni desbordamiento, y captura de Expo Go en `test-results/home-icons-proportions-android.png`. TypeScript y ESLint de `App.tsx` aprobados; lint general conserva cinco errores y tres advertencias previos.

## Ventana de filtros de Agenda — 30 de octubre de 2026

- `npm run typecheck` y ESLint de `AgendaScreen.tsx`, `AgendaFilterPopup.tsx` y `verify-agenda-popup.ts`: aprobados. El lint general conserva los cinco errores y tres advertencias previos.
- `scripts/verify-agenda-popup.ts`: aprobado en Chrome a 390/320 px. Comprueba la ventana pequeña, selección temporal hasta Aplicar, descarte por X/Escape, fechas/estados, conservación del día elegido en calendario, Borrar filtros como texto sin fondo/borde debajo del icono, restauración de todas las citas y botón Agendar fijo.
- `scripts/verify-booking-agenda-focus.ts`: aprobado nuevamente; la reserva nueva sigue visible dentro de todas las fechas, persiste tras recargar y se reprograma sin duplicarse.
- Expo Go, emulador `emulator-5560`: comprobados abrir filtros, aplicar Próximas, mostrar y pulsar Borrar filtros, y cerrar con Atrás sin salir de Agenda. Capturas: `test-results/agenda-filters-popup-android.png` y `test-results/agenda-filters-active-android.png`.
- Exportación Android aprobada en `.expo/agenda-filters-android-check`; no genera un APK.

## Posición estable y selector de fecha — 30 de octubre de 2026

- El espacio de Borrar filtros se reserva desde el inicio, dentro del área de controles. Aplicar y borrar conservan exactamente la posición del contenedor de citas, el botón de filtros y el botón Agendar, comprobado a 390/320 px y con calendario abierto/cerrado.
- Fecha usa ahora un selector delgado azul claro con la opción seleccionada en blanco. Conserva áreas táctiles de 44 px y selección temporal hasta Aplicar.
- `scripts/verify-agenda-popup.ts`, TypeScript y ESLint de ambos componentes aprobados. El lint general conserva cinco errores y tres advertencias previos.
- Capturas: `test-results/agenda-date-segmented-control.png` y `test-results/agenda-date-today-selected.png`.

## Acceso a pólizas y paneles ampliados — 30 de octubre de 2026

- Cada póliza abre su resumen con un toque; se retiró el botón inferior Ver seguro. Verificado con dos pólizas, regreso y recarga persistente.
- `scripts/verify-insurance-flow.ts`: aprobado a 390/320 px. Los tres detalles de Coberturas conservan su borde superior, posición horizontal y ancho, extendiéndose hasta el margen inferior seguro. No incluyen Ver póliza, tampoco en el menú principal de Coberturas.
- Con 24 párrafos ficticios se comprobó desplazamiento hasta el final, cabecera y pie fijos y regreso sin heredar el desplazamiento.
- Red médica amplía Médicos desde el mismo borde superior. Con 14 perfiles ficticios se llegó al último registro; búsquedas con cero o un resultado, detalle y regreso conservan el marco. Hospitales vuelve a su tamaño compacto.
- Conservados los cuatro PDF válidos, adjuntos y búsqueda. TypeScript y ESLint de los archivos modificados aprobados. Lint general: cinco errores y tres advertencias previos sin cambios.
- Exportación Android aprobada en `.expo/insurance-popups-android-check`; no genera un APK. Los nuevos paneles ampliados se verificaron funcionalmente en Chrome; no se completó su recorrido nativo en esta revisión.

## Selección directa de plan — 30 de octubre de 2026

- Esencial, Integral y Familiar son botones de fila completa: tocar el nombre, icono o precio abre directamente el formulario. Se retiró Siguiente; Ver detalle conserva su acción independiente.
- `scripts/verify-insurance-enrollment.ts`: aprobado. Comprueba avance con un toque en los tres planes, precios de ejemplo de $650/$1,250/$1,850 MXN, regreso con los datos conservados, detalle sin avanzar y ausencia de Siguiente. El recorrido de grabación, fallo de almacenamiento, reintento y persistencia sigue aprobado.
- TypeScript y ESLint de los dos archivos modificados aprobados. Revisión visual a 320 px sin desbordamiento; capturas `test-results/insurance-enrollment-plans.png` y `test-results/insurance-enrollment-plans-320.png`. El lint general conserva los errores y advertencias previos documentados arriba.

## Klini IA, suscripción y colores de Red médica — 30 de octubre de 2026

- `npm test`: 55 pruebas aprobadas. Incluye ocho nuevas pruebas de suscripción/aislamiento/persistencia y diez de contexto, límites, acciones del modelo, errores, cancelación y puente HTTP. Las conexiones de las pruebas son locales y el proveedor está sustituido; no se enviaron preguntas ni datos a OpenAI.
- `npm run typecheck`: aprobado. ESLint individual de los archivos modificados y nuevos: aprobado. `npm run lint` conserva cinco errores y tres advertencias previos en Directorio, Teleconsulta y store; no aparecieron errores nuevos.
- `scripts/verify-klini-ai.ts`: aprobado en Chrome. Verifica precio de $99 MXN/mes, consentimiento inicialmente desmarcado y reiniciado al cambiar de método, activación, fallo simulado de almacenamiento y reintento, persistencia y cancelación. Ningún cambio de saldo ni petición a un modelo real.
- Chat comprobado con próxima cita del paciente, acceso a su detalle, texto del expediente y medicamentos ficticios actuales. Cabecera y compositor fijos, desplazamiento de mensajes, cierre, nueva pregunta y ausencia de desbordamiento a 390/320 px. Cambio de Sofía a Mateo y regreso conserva el acceso separado y limpia la conversación; recarga y cancelación revocan el acceso correspondiente.
- Revisión visual de `test-results/klini-ai-overview-390.png`, `test-results/klini-ai-conversation-390.png` y `test-results/klini-ai-chat-scroll-320.png`: aprobada. El precio y la activación se identifican como demostración sin cargos.
- El selector Hospitales/Médicos usa fondo `#E9F0F6`, selección blanca y texto azul marino; la opción inactiva usa azul grisáceo. Ambos estados se comprobaron en Chrome y se revisó visualmente `test-results/network-hospitals-colors.png`; también se guardó `test-results/network-doctors-colors.png`. Conserva búsqueda, acciones y expansión de Médicos.
- Exportación Android aprobada en `.expo/klini-ai-android-check` (1,458 módulos). No genera un APK. El teclado, áreas seguras y botones Atrás de las nuevas pantallas quedan pendientes de una prueba nativa; estas comprobaciones de interfaz se hicieron en Chrome.
- No se configuraron claves de OpenAI, productos de las tiendas ni pasarela de cobros. El puente implementado es solo para desarrollo local y no autoriza suscripciones de producción; el trabajo externo pendiente está detallado en `docs/KLINI_IA.md`.

## Sofía con Klini IA activa — 30 de octubre de 2026

- Sofía inicia con el servicio activo en el seed de demostración. La recuperación de datos válidos anteriores agrega este acceso únicamente si aún no existe un estado de IA para `patient-sofia`, también cuando su perfil está guardado dentro de la familia. Se preservan los registros y los estados explícitos de cancelación.
- `npm test`: 60 pruebas aprobadas. Incluyen 13 casos de suscripción, configuración inicial de Sofía, migración, aislamiento familiar, sincronización de estado familiar existente y conservación de cancelaciones. TypeScript aprobado; ESLint de los archivos modificados sin errores. El lint general conserva los cinco errores y tres advertencias previos.
- `scripts/verify-klini-ai.ts`: aprobado con Sofía activa al inicio, plan de $99 MXN/mes y acceso desde la barra. Cancelar y recargar conserva la cancelación; siguen aprobados reactivación, errores de guardado, conversación y cambio de perfil.
- Comprobación de solo lectura en Expo Go, `emulator-5560`: Billetera muestra Activa · demostración, Gestionar y $99 MXN/mes; la barra muestra Pregunta a Klini e IA, con Sofía Martínez como perfil. Evidencia `test-results/sofia-ai-active-android.xml`. No se modificó la navegación del usuario ni se realizaron cargos.

## Panel de búsqueda a media pantalla y preparación de OpenAI — 30 de octubre de 2026

- El popup de sugerencias termina en la mitad de la pantalla: a 390 × 844, marco x24/y68/ancho342/alto354, borde inferior 422; a 320 × 640, x24/y68/ancho272/alto252, borde inferior 320. Los accesos inferiores se alcanzan mediante desplazamiento interno. Cierre aprobado, menú lateral y conversación conservan su tamaño.
- Se retiró la frase Consulta tu agenda o pregunta por la información de tu expediente, sin reservar su espacio. Capturas `test-results/search-half-390.png` y `test-results/search-half-320.png` revisadas. TypeScript y ESLint de HomeToolbar aprobados.
- Se añadió GET /health al puente local, con las mismas restricciones de Host y CORS. Solo revela indicadores de configuración y un nombre de modelo validado. No invoca OpenAI ni expone claves. Las 12 pruebas del servicio y TypeScript/ESLint de sus archivos están aprobados; la suite completa suma 62 pruebas aprobadas. Lint general conserva los cinco errores y tres advertencias previos.
- Servidor local iniciado y reenvío 8098 preparado en emulator-5560. OpenAI sigue pendiente de la credencial del usuario: la comprobación real de /health informa keyConfigured:false, y /chat devuelve 503 sin hacer una petición al proveedor. No se ha afirmado una respuesta real ni se cambió el endpoint de Expo mientras falta la clave.
