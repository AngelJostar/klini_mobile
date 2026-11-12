# Parámetros corporales integrados en el proyecto principal

Fecha: 9 de noviembre de 2026.

## Alcance real

La raíz de Klini Mobile ahora incluye el código de Parámetros corporales que se venía trabajando en la aplicación de revisión, no un acceso directo a otra carpeta. Está en `src/features/body-parameters/` y se abre mediante la ruta Expo Router `/parameters`, desde el botón «Parámetros corporales · espacio local» del portal.

Se conservaron Expo SDK 55, la identidad `mx.klini.mobile`, el portal WebView, sus cookies, los proveedores de autenticación/red/notificaciones y las rutas existentes. No se sustituyeron por la app de demostración. La carpeta de revisión original no se modificó.

Se trasladaron la lista, Todos/Favoritos, filtros, historial por parámetro, registro/edición manual, ventanas emergentes, fila «Conectar con Apple Health» debajo de las pestañas, información «i», switch alineado a la derecha y lectores/gestión de permisos de Salud. La fila no tiene las dos líneas divisorias.

## Datos y separación

Este módulo conserva el comportamiento local de la fuente. La pantalla lo identifica expresamente como demostración separada del expediente de Laravel. Los ejemplos siguen rotulados como ejemplos. No se importó información privada de archivos .env, sesiones o credenciales.

Se usa la clave nueva `@klini/parameters-preview:v1`. No reutiliza ni sobrescribe el estado de la app de revisión, las cookies del portal ni el expediente clínico remoto. Las preferencias de Apple Salud no prueban que Apple haya autorizado la lectura. Las lecturas HealthKit permanecen en memoria, sin envío al servidor ni a Klini IA.

La integración con pacientes reales y el almacenamiento de mediciones en Laravel NO forman parte de esta entrega. Hace falta definir identidad/perfil, API, consentimiento y reglas de sincronización antes de conectar ambos almacenes.

## Apple Watch / Apple Salud

El Apple Watch aporta sus mediciones a Salud del iPhone. Klini consulta HealthKit, no empareja directamente el reloj.

Se incorporaron HealthKit 16.2.0, Nitro 0.37.2, los permisos de solo lectura y el plugin de consolidación de pasos existente. Se conservaron las protecciones frente a permisos denegados, valores ausentes, fuentes duplicadas, cambios de fecha/zona horaria y respuestas tardías.

En Android, web y Expo Go, el switch está apagado y desactivado. En iPhone se necesita una NUEVA compilación nativa de esta app, con HealthKit habilitado y autorización explícita del usuario. No se compiló ni firmó una app iOS, ni se consultaron datos de Salud reales desde Windows. La compatibilidad nativa final debe validarse en esa compilación, no inferirse de un bundle JavaScript.

## Código y trazabilidad

- `src/features/body-parameters/`: componentes, dominio, persistencia y servicios trasladados.
- `src/app/parameters.tsx`: ruta y aviso de separación local.
- `src/components/patient/patient-web-portal.tsx`: entrada al módulo, manteniendo el portal.
- `plugins/withMergedHealthKitStatistics.cjs`: parche versionado de estadísticas HealthKit.
- `app.json`, `package.json` y lock: configuración y dependencias compatibles.
- `__tests__/body-parameters/`: pruebas de dominio/lectores/parche.
- `__tests__/parameters-ui-test.tsx`: pruebas de componentes.
- `docs/parameters-source-manifest.json`: origen y hashes de los archivos antes de adaptar imports/formato y claves locales.

Origen: `reference/android-zip-review-2026-10-27/klini-mobile`.

## Validación

Ejecutar desde la raíz:

```powershell
npm run typecheck
npm run lint
npm test -- --watch=false
npm run test:parameters
```

Se verificaron TypeScript, lint completo y las pruebas originales. Las exportaciones JavaScript/Hermes iOS y Android se generaron correctamente en `.build-tmp/parameters-integration/`. Esto no equivale a una compilación nativa.

En la validación inicial no se pudo realizar la inspección visual: la herramienta UI disponible no expuso ningún navegador ni aplicación. La posterior comprobación Android se describe a continuación.

### Actualización del cliente Android del simulador

Al abrir la integración en el cliente Android anterior se detectó `AsyncStorage is null`: el APK instalado no contenía las nuevas dependencias nativas. Se generó correctamente un nuevo APK de desarrollo para x86_64 con el mismo paquete y firma local y se instaló encima mediante `adb install -r`, sin desinstalar ni borrar datos. El autolinking generado incluye AsyncStorage y Nitro. Esto acredita una compilación nativa Android local; la compilación nativa iOS sigue pendiente.

Se añadió `metro.config.js` para excluir únicamente `.build-tmp` de la exploración, conservando los filtros predeterminados de Expo. Los sockets temporales de Gradle provocaban un cierre de Metro con `EACCES`; el servidor reiniciado genera y sirve el bundle Android del proyecto principal. TypeScript y lint completo volvieron a pasar.

El simulador presentó verificación de clases extremadamente lenta y un aviso ANR durante el primer arranque. Se intentó una precompilación ART, que se interrumpió al reiniciar el mismo AVD sin cargar su snapshot y sin borrar su almacenamiento. Después del arranque limpio, Klini abrió normalmente en aproximadamente tres segundos. Se comprobó el acceso nativo desde el portal y la ruta `/parameters`, con los seis parámetros visibles y sin el error de AsyncStorage ni el aviso ANR. La captura final se inspeccionó; el aviso de separación local requiere ajustar su área segura superior porque se solapa con la barra de estado. No se capturaron mediciones, se inició sesión ni se consultó Salud. No se estableció una causa única de la lentitud anterior del simulador. Evidencias locales: `.build-tmp/refresh-main/parameters-final.png`, `runtime-report.json` y `.build-tmp/refresh-main-android-build.log`.

## Pendiente antes de fusionar el resto de Klini móvil

La aplicación de revisión completa utiliza Expo 58 y un modelo de datos local. Migrar agenda, seguros, perfiles, IA y demás pantallas exige elegir entre:

1. Mantener el portal Laravel y portar módulos uno por uno con contratos de datos explícitos.
2. Migrar el runtime principal a Expo 58, integrar rutas separadas y conectar después el backend.

No se tomó esa decisión arquitectónica ni se hizo una actualización general de SDK. Tampoco se publicó, subió un commit, modificó EAS, emitió una póliza o creó una reserva.



### Resultado final

- TypeScript: aprobado.
- Lint completo: aprobado.
- Jest: 8 suites, 25 pruebas aprobadas (18 originales y 7 nuevas de componentes/acceso).
- Parámetros y HealthKit: 45 pruebas aprobadas. Total: 70.
- Configuración iOS inspeccionada: `mx.klini.mobile`, entitlement HealthKit activo, texto de lectura presente, sin permiso de escritura.
- Comprobación de versiones Expo: los módulos nuevos coinciden con SDK 55. Detectó tres parches pendientes de dependencias anteriores: expo 55.0.31 → 55.0.32, expo-dev-client 55.0.40 → 55.0.41 y expo-sharing 55.0.24 → 55.0.25. No se actualizaron para evitar una modificación general ajena a esta integración.
- npm informó 35 avisos de seguridad en el árbol completo (6 altos). No se ejecutó una actualización forzada de dependencias.
