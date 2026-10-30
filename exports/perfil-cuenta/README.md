# Perfil / Tu cuenta — Klini

Código del menú mostrado en la captura, extraído de la app web anterior. No está integrado en la nueva app Expo.

## Archivos
- `index.html`: vista previa con datos ficticios. Abrir desde un servidor HTTP local.
- `js/klini-profiles.js`: selector Cambiar perfil, tarjetas, información, edición, usar perfil, agregar perfil y botón Cerrar sesión. Estilos e iconos SVG incluidos dentro del componente.
- `js/patient-profile-panel.js`: coordinación de perfiles, formularios, foto, guardado local, modales y cierre de sesión. Se conserva completo para no cortar dependencias internas; también contiene funciones de otros módulos de la app original.
- `js/patient-social.js` y `css/patient-social.css`: solicitudes, aceptar/rechazar y actividad con filtros de likes, mensajes y reposts.
- `css/patient-profile-panel.css`: estilos originales del panel y flujos.
- `js/subscriptions-mobile-pan.js` y su CSS: dependencia cargada por el script original.
- `laravel/profile-panel.blade.php`: fragmento original con datos del paciente, rutas y CSRF; requiere el contexto de la vista original (`$patient`, `$statusText`).

## Flujos
1. Tu cuenta → Cambiar perfil → desplegar Información del perfil → Editar información o Usar este perfil.
2. Cambiar perfil → Agregar perfil → formulario, foto y confirmación.
3. Tu cuenta → Solicitudes de seguidores → aceptar/rechazar; actividad → filtros y acciones.
4. Cambiar perfil → Cerrar sesión → Cancelar o confirmar Cerrar sesión.

## Integración
Cargar primero `klini-profiles.js`, después `patient-profile-panel.js` y finalmente `patient-social.js`, con sus CSS y el fragmento HTML. Abrir mediante `window.DrSamPatientProfilePanel.open()` o un botón con `data-profile-panel-open`. El selector comunica `profile-add` y `profile-logout` al panel.

## Cerrar sesión
El botón del selector emite `profile-logout`. El panel abre la confirmación y `submitLogout` envía POST a `data-logout-url` con cookies same-origin y cabecera `X-CSRF-TOKEN` tomada de `data-csrf-token`. Espera JSON `{ "redirect": "/" }`. Solo redirige tras una respuesta satisfactoria; maneja error, timeout de 15 segundos y bloqueo de doble clic.

La vista previa no tiene sesión ni CSRF: confirmar muestra un error, no simula un cierre real. Para integrarlo, el backend debe invalidar la sesión y devolver la respuesta descrita. No se incluye un backend de autenticación ni se ha probado una desconexión real. Los perfiles locales no sustituyen autorización de cuentas en servidor.

Se preservaron los originales JS/CSS. No se incluyen credenciales ni datos personales reales en la vista previa.

Validación: sintaxis JavaScript aprobada. Vista previa comprobada en Chromium a 390 px: abrir selector, abrir/cancelar cierre de sesión y abrir alta de perfil, sin errores JavaScript. Dependencia subscriptions-mobile-pan copiada de C:/laragon/www/dr-sam/public, ya que no venía en la carpeta de referencia.
