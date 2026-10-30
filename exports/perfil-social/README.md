# Perfil de usuario: cuenta, actividad y cierre de sesión

Componente web para la WebView actual de Klini. Adaptado a la aplicación social sin módulos médicos ni datos personales de la captura.

## Archivos
- profile.html: panel Tu cuenta, identidad, Cambiar perfil, solicitudes, actividad, cierre del panel y cierre de sesión con confirmación/cancelación.
- profile.css y profile.js: presentación y navegación entre los flujos.
- activity.css y activity.js: componentes originales de solicitudes y actividad, con filtros para todo, likes, mensajes y reposts, y ejemplos opcionales.
- backend/routes/social-profile.php: consulta/edición del nombre del usuario autenticado y cierre real de sesión en Laravel.

## Integrar en Laravel
1. Copia los CSS/JS a public y el dialog de profile.html a tu vista. Conserva los identificadores y atributos data-. Sólo debe existir una instancia del panel.
2. En el head incluye `<meta name="csrf-token" content="{{ csrf_token() }}">`.
3. Antes de cargar profile.js agrega:

```html
<script>
window.KliniProfileConfig = {
  endpoint: '/social/profile',
  logoutUrl: '/social/logout',
  loginUrl: '/login'
};
</script>
```

4. Carga profile.js y después activity.js. Copia social-profile.php a routes y agrega en routes/web.php: `require __DIR__.'/social-profile.php';`. Requiere la autenticación web y tabla users existentes. No registres rutas duplicadas. Si ya tienes cierre de sesión, puedes adaptar logoutUrl para usarlo, siempre que acepte POST con CSRF y responda JSON sin redirección.
5. Abre con `window.KliniProfile.open()` o un botón con data-profile-panel-open. Para conectar el menú lateral:

```js
window.addEventListener('social:menu-navigate', ({detail}) => {
  if (detail.destination === 'profile') window.KliniProfile.open();
});
```

## Interacciones del feed
El código original escucha drsam:communities-action. Conecta onAction del componente de comunidades:

```js
onAction: detail => window.dispatchEvent(new CustomEvent('drsam:communities-action', {detail}))
```

Al seleccionar actividad se emite social:open-post: conecta su detail al feed existente. Las solicitudes y la actividad se conservan como demostración local por usuario, igual que el prototipo. El botón de cargar ejemplos puede quitarse cambiando data-demo a false. No son solicitudes sincronizadas con una red social real.

## Cambiar perfil y cerrar sesión
Cambiar perfil abre la edición del nombre visible de la propia cuenta, persistida en users.name. No copia perfiles familiares o roles clínicos. Este paquete no incorpora suplantación ni cambio entre usuarios: si necesitas varios perfiles sociales autorizados, requiere un modelo y autorización del servidor específicos.

Cerrar panel (×) sólo oculta la pantalla. Cerrar sesión abre confirmación; Cancelar regresa a Tu cuenta. Confirmar hace POST, invalida la sesión y regenera el token CSRF del servidor; sólo después lleva al login. Ante error muestra el mensaje y permite reintentar. La actividad local de demostración permanece en el dispositivo, separada por id. No se modifica la sesión del otro simulador.

Abierto como archivo local puedes ver la maqueta; guardar el perfil y cerrar sesión requieren Laravel autenticado. No contiene credenciales ni implementa registro/login. Los identificadores patient/DrSam heredados son adaptadores JavaScript de compatibilidad, sin relación con médicos o tablas de pacientes.
