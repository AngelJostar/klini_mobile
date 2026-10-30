# Continuar Klini con Codex

## Objetivo y punto de partida

Mantén una aplicación móvil funcional de demostración con identidad Klini: azul `#082441`, turquesa `#00AAA5`, superficies claras, ventanas de vidrio esmerilado y cuatro iconos pequeños en una fila en Inicio. Conserva [docs/Referencia_UI.png](docs/Referencia_UI.png) como referencia; implementa la interfaz con componentes reales, sin usar la captura como pantalla interactiva.

Antes de cambiar código, lee `README.md`, `docs/FUNCIONES.md`, `docs/VALIDACION.md` si existe, `CONTRATO.md` y `package.json`. Revisa el estado actual de los archivos: otros agentes pueden haber terminado cambios desde la última conversación. No des por probada una función por estar dibujada en una captura.

## Arquitectura actual

| Ruta | Responsabilidad |
| --- | --- |
| `App.tsx` | Inicio adaptable, dock Hoy/Archivo/Tú y un solo `Modal` nativo. Controla rutas mediante estado y sincroniza recordatorios. |
| `src/components/ui.tsx` | Paleta y componentes reutilizables; `Sheet` es el panel desplazable dentro del modal del padre. |
| `src/screens/DirectoryFlow.tsx` | Búsqueda, filtros, perfil, horario, paciente, revisión y confirmación local en ocho pasos; también reprograma. |
| `src/screens/*Screen.tsx` | Agenda, teleconsulta, seguros, archivo y perfil. Las acciones modifican el store o llaman servicios. |
| `src/domain/types.ts` | Contratos y versión del estado persistido. |
| `src/domain/reducer.ts` | Reductor puro, validación del estado, integridad de referencias, cruces de citas y cola de persistencia. |
| `src/domain/dates.ts`, `seed.ts` | Fechas de calendario locales y datos ficticios relativos al día de inicio. |
| `src/state/store.tsx` | Contexto React, hidratación de AsyncStorage, commits y persistencia FIFO. Expone `storageError`. |
| `src/services/files.ts` | Selector y apertura de adjuntos, exportación de texto/JSON y calendario ICS. |
| `src/services/reminders.ts` | Avisos locales nativos de citas, con permisos y cancelación/reprogramación. En web no programa avisos. |
| `tests/` | Pruebas automatizadas. El alcance real ejecutado se documenta en `docs/VALIDACION.md`. |

## Reglas de implementación

- Mantén Expo SDK 57, TypeScript estricto y el archivo lock. Comprueba compatibilidad de Expo antes de añadir dependencias; no cambies de SDK como solución rápida.
- Usa `useAppStore()` y acciones del reductor para modificar datos. No escribas AsyncStorage directamente desde pantallas ni mutaciones paralelas que eviten la cola FIFO.
- Conserva validación al hidratar y mensajes de error. Los datos malformados no deben sobrescribirse silenciosamente al arrancar. Un cambio de esquema necesita migración y pruebas.
- Usa fechas locales para la agenda. Evita `new Date('AAAA-MM-DD')`, que interpreta UTC. Mantén la comprobación de cruces por médico y paciente y los estados de cita.
- Usa `Sheet` dentro del único modal de `App`; no apiles modales nativos para cada paso. Respeta áreas seguras, teclado, pantallas pequeñas, desplazamiento y el botón Atrás de Android.
- Todos los controles visibles deben funcionar o tener un estado desactivado explicado. Atrapa errores de archivos, enlaces, persistencia y notificaciones. Mantén etiquetas accesibles y `testID` estables para acciones críticas.
- La teleconsulta integrada es una simulación. Sus controles no activan cámara o micrófono. Los enlaces de reunión solo admiten HTTPS sin credenciales y se abren por acción explícita. Las notas personales no son chat médico ni recetas.
- Seguros y gastos son registros locales. No simules una autorización de cobertura, un envío a aseguradora, un pago ni una reserva real. Un cambio de estado local debe conservar esa distinción.
- No presentes `biometricLock` como protección implementada. AsyncStorage no está cifrado y no hay autenticación. No incorpores datos clínicos reales, secretos o credenciales al repositorio.
- Conserva la distinción entre exportación JSON y respaldo de archivos. No prometas restauración mientras no exista y se pruebe un importador.
- No publiques, conectes servicios remotos ni contactes a personas como parte de una modificación local de la demo, salvo petición explícita.

## Comandos

Requiere Node >=22.13; se recomienda Node 24 LTS.

```bash
npm ci
npm run test
npm run typecheck
npm run export:android
npm run export:web
```

Para revisar interfaz usa `npm run web`. Para el emulador Android con Expo Go SDK 57 usa `npm run android`. Para compilar un development build, con JDK y SDK configurados, usa `npm run android:native`. `npm run test:e2e` requiere la configuración y los navegadores de Playwright; revisa los archivos de prueba antes de ejecutarlo.

Después de un cambio significativo, ejecuta las pruebas adecuadas y TypeScript, comprueba la exportación de la plataforma afectada y revisa el flujo en su interfaz. Añade pruebas de invariantes y comportamiento, no copias de la implementación. Registra comandos, resultados y lo que no se pudo comprobar; una exportación JavaScript no acredita una compilación APK ni una ejecución nativa.

## Prompt de traspaso

> Continúa el proyecto Klini de esta carpeta. Primero lee AGENTS.md, README.md, docs/FUNCIONES.md y docs/VALIDACION.md; inspecciona el código actual y el lock. Implementa mi siguiente solicitud manteniendo el diseño y todas las rutas funcionales. Conserva la persistencia y las validaciones de dominio. Usa datos ficticios y diferencia la simulación local de cualquier servicio real. Ejecuta las comprobaciones apropiadas y entrega los cambios con su validación concreta y límites pendientes, sin afirmar que existe un APK, un emulador probado o un backend conectado si no hay evidencia.
