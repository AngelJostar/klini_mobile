# Fase 9 calidad y seguridad

Este documento reúne la evidencia reproducible de KM-901 a KM-907. Las pruebas automatizadas pueden ejecutarse por desarrollo; KM-906 y KM-907 requieren además validación física y aceptación humana antes de cerrar la beta.

## Comandos de verificación

Desde `C:\laragon\www\klini-mobile`:

```powershell
npm.cmd test
npm.cmd run test:coverage
npm.cmd run lint
npm.cmd run typecheck
npx.cmd expo-doctor
```

Desde `C:\laragon\www\dr-sam-laravel`:

```powershell
php artisan test tests\Feature\Api\Mobile
vendor\bin\pint --test
```

## Evidencia de la ejecución

- Aplicación móvil: 5 suites y 12 pruebas automáticas aprobadas.
- Cobertura global inicial: 9.35 % de líneas; los módulos críticos ejercitados incluyen componentes de formulario, cliente HTTP, enrutamiento seguro de notificaciones, serialización de mezclas y filtrado de datos sensibles. Debe ampliarse en fases posteriores antes de exigir un umbral global.
- API móvil Laravel: 21 pruebas y 158 aserciones aprobadas.
- Compatibilidad Expo SDK 55: 20 de 20 comprobaciones aprobadas por Expo Doctor.
- Dependencias PHP: `composer audit --locked` sin vulnerabilidades conocidas después de actualizar versiones compatibles.
- Lint y TypeScript: aprobados.
- El análisis global de estilo de Laravel se interrumpió por duración excesiva; las pruebas funcionales del API sí finalizaron correctamente.

## KM-901 Pruebas unitarias

- Serialización de formularios clínicos y llaves idempotentes.
- Selección de etiquetas de catálogos.
- Cliente HTTP: token, respuestas exitosas, validación 422 y sesión 401.
- Filtro de rutas provenientes de notificaciones por rol.

## KM-902 Componentes y navegación

- Botones: estado ocupado y deshabilitado accesible.
- Campos: etiqueta y error anunciable.
- Estados de error: acción de reintento.
- Navegación desde notificaciones: bloqueo de destinos cruzados o externos.

## KM-903 Integración API

La suite Laravel valida autenticación, roles, propiedad de expedientes y documentos, auditoría, formularios clínicos, idempotencia y dispositivos push. Toda regresión debe impedir la liberación.

## KM-904 Android E2E

Los recorridos Maestro están en `.maestro/patient-smoke.yml` y `.maestro/doctor-smoke.yml`. Requieren Dr. Sam ejecutándose en el puerto 8000, el development build instalado y los usuarios demo disponibles.

```powershell
maestro test .maestro\patient-smoke.yml
maestro test .maestro\doctor-smoke.yml
```

## KM-905 Seguridad y privacidad

- Los tokens se guardan exclusivamente en SecureStore.
- El cliente no registra cuerpos HTTP, credenciales ni datos clínicos.
- Las rutas están protegidas por rol tanto en la app como en Laravel.
- Las descargas requieren autenticación y eliminan el archivo temporal.
- El backend limita propiedad de documentos, pacientes, citas y dispositivos.
- No colocar archivos `.env`, credenciales EAS, tokens push ni datos reales en Git.

La revisión automática no encontró `console.log`, tokens push ni credenciales incrustadas dentro de `src`. `composer audit --locked` quedó limpio tras actualizar las dependencias PHP dentro de sus restricciones compatibles. `npm audit` reporta avisos transitivos en la cadena de herramientas de Expo, Metro y Jest. No se aplicó `npm audit fix --force` porque propone versiones mayores incompatibles —incluido degradar Expo— y rompería SDK 55. Expo Doctor 20/20 es la referencia de compatibilidad; estos avisos deben revisarse al publicar cada actualización oficial de SDK.

## KM-906 Accesibilidad y dispositivos

Ejecutar la matriz siguiente con tamaño de texto normal y grande, modo claro y oscuro, teclado abierto y TalkBack habilitado.

| Dispositivo | Orientación | Texto | TalkBack | Resultado |
| --- | --- | --- | --- | --- |
| Pixel 8 Pro emulador | Vertical | Normal | No | Pendiente de ejecución visual |
| Pixel 8 Pro emulador | Vertical | Grande | Sí | Pendiente de ejecución visual |
| Android físico compacto | Vertical | Normal | Sí | Pendiente de dispositivo físico |
| Android físico grande | Vertical | Grande | No | Pendiente de dispositivo físico |

Criterios: ningún control queda oculto por el teclado; etiquetas y errores se anuncian; objetivos táctiles alcanzan al menos 48 puntos; el texto no se corta; contraste y foco son distinguibles.

## KM-907 Aceptación de usuarios

Usar exclusivamente datos de demostración. Paciente y Médico deben completar los recorridos de `docs/uat-checklist.md`. Registrar defecto, severidad, evidencia y decisión. La fase se considera aceptada cuando no existen defectos críticos o altos abiertos y ambos perfiles firman su resultado.
