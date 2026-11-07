# Contratos de la aplicación

Proyecto React Native con Expo SDK 57 y TypeScript. La raíz es la carpeta que contiene `package.json`.

## Estado y dominio

`src/domain/types.ts` define todos los modelos y la interfaz `StoreContext`. Las pantallas leen `useAppStore()`; `AppProvider` hidrata el estado y serializa las escrituras. Las validaciones de dominio están en `src/domain/reducer.ts`. Una reserva inválida lanza un error antes de modificar el estado. `addAppointment` devuelve el identificador de la cita; reprogramar conserva ese identificador.

`addRecordPersisted` devuelve el identificador del registro solo después de completar la escritura FIFO. Si falla, elimina únicamente ese registro del estado actual, conserva los demás cambios y permite reintentar. El flujo de solicitud de seguro usa esta acción para confirmar el guardado del video y los datos; `addRecord` conserva su contrato síncrono para los flujos existentes.

Las fechas se almacenan como `AAAA-MM-DD`, los horarios como `HH:mm`, y se interpretan en la zona local del dispositivo. Las citas duran 30 minutos para comprobar cruces. `patientId` conserva la identidad del titular cuando cambia su nombre. Las pólizas se comprueban para la fecha de la cita y la aseguradora aceptada por el perfil de ejemplo.

## Navegación

`App.tsx` administra el inicio y un solo `Modal`. Cada pantalla usa `Sheet` como panel interior desplazable; puede tener `onBack`, `onClose` y `footer`.

| Pantalla | Propiedades |
| --- | --- |
| `DirectoryFlow` | `onClose`, `onBooked(id)`, `initialDoctorId?`, `initialMode?`, `rescheduleId?` |
| `AgendaScreen` | `onClose`, `onBook`, `onReschedule(id)`, `onTeleconsult(id)` |
| `TeleconsultScreen` | `onClose`, `onBook`, `appointmentId?` |
| `InsuranceScreen`, `ArchiveScreen`, `ProfileScreen` | `onClose` |

## Componentes y servicios

`src/components/ui.tsx` exporta paleta, estilos, `Icon`, `Button`, `TextField`, `Card`, `Chip`, `SectionTitle`, `Row`, `Avatar`, `Empty`, `Sheet`, `notify` y `confirmAction`.

`src/services/files.ts` expone `pickAttachment`, `openAttachment`, `exportText` y `exportCalendar`. En Android los adjuntos se copian a documentos privados de la app; compartir utiliza la interfaz del sistema. `src/services/reminders.ts` sincroniza avisos locales de citas futuras. Ninguno de esos servicios implementa un backend clínico remoto.

Consulta `docs/FUNCIONES.md` para el alcance y `docs/VALIDACION.md` para las comprobaciones ejecutadas.

## Acceso a Klini IA

`AppState.aiSubscription` es un campo opcional de `ProfileScope`; los datos anteriores siguen siendo válidos. Sofía (`patient-sofia`) recibe acceso inicial de demostración en el seed y, tras validar datos anteriores, cuando todavía no tiene un estado de IA. Las cancelaciones explícitas y los otros perfiles se conservan. Solo admite activaciones de demostración con estado, fecha y consentimiento versionado válidos. `setAiSubscription(active)` captura el perfil de destino, serializa las operaciones y espera la persistencia FIFO. Si falla, revierte únicamente la suscripción afectada en el estado actual, aun cuando se haya cambiado de perfil. Restablecer invalida las activaciones pendientes.

El chat es efímero y se desmonta al cambiar de perfil; cancela las peticiones pendientes. El cliente comprueba el acceso antes de construir contexto. `selectKliniAiContext` selecciona datos mediante reglas deterministas de términos en español y referencias de seguimiento del usuario: preguntas generales reciben contexto clínico vacío y preguntas personales solo los elementos pertinentes. La selección se repite tras validar la solicitud en el servidor; no habilita acceso a otro perfil ni constituye una búsqueda semántica de todo el expediente.

La primera petición a Responses API devuelve una respuesta estructurada y una consulta web opcional. Si hay consulta, se generaliza y se filtran identificadores conocidos antes de una petición independiente con `web_search`, sin enviar el JSON clínico ni el historial. Una tercera petición sintetiza la evidencia con el contexto seleccionado. Sin búsqueda se conserva el recorrido de una sola petición. Todas las etapas comparten cancelación y un plazo de 90 segundos; el cliente dispone de 105 segundos. La indisponibilidad de la búsqueda o la ausencia de fuentes utilizables se devuelve como `web_search_unavailable`, sin sustituirla silenciosamente por una respuesta sin fuentes. Los errores de autenticación, cuota y plazo conservan sus mensajes específicos.

`AiMessage` y `AiAnswer` admiten `sources?: AiSource[]`; cada fuente tiene `id`, `title` y `url`. Solo las anotaciones `url_citation` de una búsqueda completada crean fuentes, tras validar URL y asignar identificadores locales. La síntesis cita esos identificadores; se rechazan citas desconocidas o marcadores de fuente sin una búsqueda. El JSON del modelo no puede crear fuentes consultadas por sí mismo. Las citas pulsables y la lista Fuentes son independientes de las acciones internas Agenda/Archivo. No se persisten mensajes ni fuentes.

El servicio solo admite el puente local en desarrollo. La credencial privada ya configurada permanece exclusivamente en el servidor. Se usa `store: false`, sin prometer retención cero del proveedor. Las activaciones locales nunca autorizan un servicio de pago en producción. La integración, configuración de servidor y dependencias externas pendientes se describen en `docs/KLINI_IA.md`.
