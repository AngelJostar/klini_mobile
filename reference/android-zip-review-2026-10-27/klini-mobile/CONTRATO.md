# Contratos de la aplicación

Proyecto React Native con Expo SDK 57 y TypeScript. La raíz es la carpeta que contiene `package.json`.

## Estado y dominio

`src/domain/types.ts` define todos los modelos y la interfaz `StoreContext`. Las pantallas leen `useAppStore()`; `AppProvider` hidrata el estado y serializa las escrituras. Las validaciones de dominio están en `src/domain/reducer.ts`. Una reserva inválida lanza un error antes de modificar el estado. `addAppointment` devuelve el identificador de la cita; reprogramar conserva ese identificador.

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
