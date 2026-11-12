# Comparación de Apple Salud con los avances de DOT

Revisión del 9 de noviembre de 2026 sobre esta aplicación: `reference/android-zip-review-2026-10-27/klini-mobile`, Expo 58.0.23 y React Native 0.88.1. Es la versión con **Tu atención / Tu archivo**, servida al emulador desde Metro 8096. El proyecto Expo 55 de la raíz del repositorio es otra aplicación.

## Fuentes comparadas

Se revisaron el código local, el historial Git disponible y los resultados del chat **Integrar Apple Salud** (`01a1a53a-59f4-7659-be1e-df106ea71000`). Sus avances de los builds 4–9 ya están en esta carpeta; el build 10 agrega un ajuste del país inicial del Directorio. El commit local `e4f5f42c892e09c86b4cd95d3e1d07ff5a1d46b5` contiene los archivos de Salud revisados. No se encontró una revisión HealthKit posterior en las referencias Git locales disponibles.

La copia de Parámetros en el proyecto Expo 55 deriva de esta fuente, según `docs/parameters-integration-2026-11-09.md` de la raíz. Antes del ajuste de runtime de esta revisión, se comprobó equivalencia semántica de 20 archivos de parámetros/Salud y del plugin nativo; también coincidieron los 19 hashes relevantes del manifiesto de integración. Por ello no se sobrescribieron los avances existentes con la copia de la raíz.

## Avances conservados

| Avance del chat | Implementación en esta carpeta |
| --- | --- |
| Selección por titular y «Apple Salud · administrar» | `src/domain/appleHealth.ts`, `AppleHealthPanel.tsx`, `BodyParametersScreen.tsx`. Se persisten preferencias, no muestras de Salud. |
| Lecturas elegidas primero, fuente/fecha y sin duplicar FC de ejemplo | `AppleHealthLiveReadings.tsx` y `BodyParameterListRow.tsx`. Con FC/Pasos/Sueño seleccionados se muestran esas tres filas y los otros cinco parámetros guardados. |
| Actualización al abrir, reanudar y recibir cambios | `appleHealthSession.ts`: observadores y consulta cada 60 segundos en primer plano; descarta respuestas tardías de sesiones cerradas. |
| Pasos diarios consolidados | `appleHealthSteps.ts`, `appleHealthDayWatcher.ts` y `plugins/withMergedHealthKitStatistics.cjs`: estadísticas de Salud, días locales y cambios de zona/horario; no suma fuentes superpuestas. Parche nativo revisado para HealthKit 16.2.0. |
| Sueño con etapa y duración | `appleHealthReader.ts`: último segmento con etapa y fechas, sin presentarlo como total nocturno. |
| Historial y detalle de lecturas | `AppleHealthHistoryPopup.tsx`, `appleHealthHistory.ts`: consultas de hasta 31 días, páginas de 50 y límite de 1.000 muestras. |
| Compartir registros y medicamentos seleccionados | `ArchiveScreen.tsx` y `clinicalRecordShareWorkflow.ts`; continúa el flujo existente sin modificar el registro. |

## Diferencia entre las capturas y corrección aplicada

La captura del iPhone muestra una compilación nativa compatible, con Salud activada y tres categorías elegidas. Android y Expo Go no incluyen HealthKit: deben conservar los parámetros guardados y mostrar la conexión apagada. Las capturas por sí solas no acreditan que uno de los proyectos tenga código más reciente.

Se corrigió un caso real: una preferencia `enabled` recuperada de otro entorno podía montar lecturas de Salud y ocultar la frecuencia cardiaca guardada aun en Android, web o Expo Go. `canUseAppleHealthRuntime` ahora comparte la misma condición en pantalla, fila de conexión y opciones. Solo permite activar la presentación en iOS `bare`/`standalone`; los entornos incompatibles mantienen la preferencia original sin modificarla, el switch apagado y la FC guardada visible. La importación del módulo nativo sigue siendo diferida; autorizar/leer requiere la acción y los permisos existentes.

## Validación y límites

Los resultados ejecutados están registrados en [VALIDACION.md](VALIDACION.md). La regresión de runtime usa preferencias activadas en fixtures aislados, sin acceder a datos del iPhone. Las pruebas unitarias usan lectores simulados.

Falta la comprobación física de esta revisión en una compilación compatible del iPhone: permisos, datos disponibles en Salud, sincronización Watch → iPhone, reanudación y contraste con las lecturas originales. Expo Go Android no puede acreditar esos pasos. No se generó un nuevo IPA ni se publicó una actualización.

La lectura sigue siendo voluntaria y solo de consulta. Las muestras son temporales, se limpian al cerrar/ir al fondo y no se envían a Laravel ni a Klini IA. No hay entrega en segundo plano ni garantía de tiempo real; denegación y ausencia de muestras no pueden distinguirse como permisos concedidos. Favoritos/filtros actuales afectan a registros guardados; las filas fijadas de Salud conservan su comportamiento anterior.
