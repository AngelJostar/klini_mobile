# Funciones de Klini

Esta matriz corresponde al código de la aplicación móvil. **Local** significa que la acción funciona con datos en el dispositivo; no acredita una operación con un consultorio o aseguradora.

| Módulo | Implementado en la demostración | Para un servicio real |
| --- | --- | --- |
| Inicio | Cuatro accesos en una fila, próxima cita local, perfil y dock Hoy/Archivo/Tú. Ventanas flotantes con volver/cerrar. | Identidad y datos de una cuenta autenticada. |
| Directorio | Búsqueda por médico/especialidad/ciudad; modalidad, aseguradora y favoritos; perfiles, opiniones y precios ficticios. | Catálogo verificado, credenciales, opiniones auténticas y disponibilidad del prestador. |
| Reserva | Ocho pasos con horario, paciente propio u otra persona, motivo, forma de pago, póliza elegible y revisión. Registra la cita y evita cruces locales de 30 minutos. | Agenda del médico, bloqueo concurrente de horarios, confirmaciones y notificaciones remotas. |
| Agenda | Vistas y filtros por fecha/estado, detalle, notas, reprogramación, cancelación y marcado de atención. Exportación `.ics`. | Sincronización de calendarios y cambios aceptados por el consultorio. Exportar `.ics` no agrega un evento sin la acción del usuario. |
| Recordatorios | Avisos locales 15 minutos antes de citas futuras, si se activa la preferencia y se concede permiso en Android. Reprogramar/cancelar vuelve a sincronizarlos. | Push remoto, entrega controlada por servidor y sincronización entre dispositivos. En web no se programan avisos. |
| Teleconsulta | Preparación manual, sala simulada con contador y controles de cámara/micrófono simulados. Notas personales, adjuntos locales, cierre y exportación de resumen. | Video/audio en tiempo real, pruebas de dispositivos, sala del profesional, chat y documentos médicos emitidos por este. |
| Reunión externa | Guarda un enlace HTTPS general o por cita y lo abre al pulsar el botón. No transmite automáticamente notas o archivos. | Una integración autenticada con el proveedor; Klini no verifica asistencia ni finalización de la reunión externa. |
| Pólizas | Crear, editar y eliminar datos; vigencia por fechas, cobertura escrita, adjuntos y contacto. Abrir el marcador requiere introducir/confirmar un teléfono real. | Validación de póliza, elegibilidad, cobertura y contacto oficial con la aseguradora. |
| Gastos/seguimientos | CRUD, importe, fecha, póliza, referencia `LOCAL-…`, comprobantes y estado elegido por el usuario. | Envío de reclamaciones, folio oficial, autorización, reembolso y conciliación con aseguradora. |
| Archivo clínico | Historial ordenado por fecha; búsqueda y tipo Consulta/Estudio/Receta/Vacuna/Nota; crear, editar, eliminar y abrir adjuntos. | Expediente firmado por profesionales, interoperabilidad, auditoría y control de acceso por identidad. |
| Medicamentos | Nombre, dosis y frecuencia copiadas de receta, fechas y estado vigente/anterior; alta, edición y eliminación. | Prescripción y revisión clínica. La app no recomienda dosis ni cambios de tratamiento. |
| Perfil/favoritos | Editar datos personales, alergias, grupo sanguíneo y contacto de emergencia con validación; consultar/quitar favoritos. | Verificación de identidad, cuentas familiares, permisos y sincronización. |
| Datos/preferencias | Persistencia local, manejo de errores, exportación JSON y restablecimiento con confirmación. | Respaldo completo con restauración, almacenamiento protegido, autenticación y recuperación de cuenta. |

## Archivos y conservación

El selector admite PDF, imágenes y texto de hasta **2 MB por archivo**. Android copia el adjunto al almacenamiento de documentos de la app; abrirlo utiliza las opciones nativas de compartir. En web se conserva una representación local y abrir/exportar descarga el archivo.

En Android la exportación JSON incluye referencias a los adjuntos, no sus bytes. **No es un respaldo completo** y no hay importador. Desinstalar, borrar datos de la app o limpiar el almacenamiento del navegador puede eliminar contenido local.

## Qué debe verificarse en Android

La barra de estado, navegación del sistema y selectores son los de Android, aunque la interfaz de Klini conserve las proporciones y el lenguaje visual de la referencia. La ejecución nativa, el selector de archivos, el menú de compartir, los permisos y los recordatorios deben probarse en un emulador o dispositivo Android. Consulta `VALIDACION.md` para distinguir las comprobaciones realizadas de las pendientes.

Esta versión usa AsyncStorage sin cifrado, no implementa autenticación ni bloqueo biométrico y está preparada para trabajar con **datos ficticios**. No procesa cobros, no conecta con aseguradoras y no contiene una videollamada médica integrada.
