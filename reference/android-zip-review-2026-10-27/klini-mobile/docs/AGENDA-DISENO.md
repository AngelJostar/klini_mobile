# Etapa 1: Agenda

Referencia del usuario aplicada como UI nativa, no como una imagen de pantalla. Apoyo visual Runway: tarea bbdddc04-9b6d-40b7-9356-30d81572d64f, completada.

Ventana blanca de ancho completo con entrada desde abajo, cierre superior derecho, fondo atenuado y movimiento reducido. Calendario de lunes a domingo con días contiguos, selección turquesa, próxima cita seleccionada inicialmente, lista del día y botón Agendar cita. Opciones de historial, canceladas, próximas y todas las fechas disponibles en el botón de filtros. Se preservan detalle, notas, cancelación, reprogramación, exportación y teleconsulta.

Validación: TypeScript aprobado; prueba de interfaz `scripts/verify-agenda-popup.ts` aprobada para animación ascendente, ancho completo, cambio de mes, detalle/volver, cierre, nueva reserva y pantalla de 320 px. Lint general mantiene cinco errores previos en DirectoryFlow/TeleconsultScreen; sin errores de Agenda. Capturas: `test-results/agenda-popup-390.png` y `test-results/android-agenda-popup.png`.

Directorio, teleconsulta y seguro quedan para sus siguientes etapas.
