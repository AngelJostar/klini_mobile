# Menú desplegable izquierdo

Versión independiente adaptada del menú de tres puntos de Klini, para reutilizar en la aplicación social. Incluye HTML, CSS y JavaScript sin dependencias. Conserva el estilo del desplegable y las tarjetas Billetera y Suscripción e Interacciones. Excluye seguro y soporte médico, conforme al alcance social solicitado. Agrega accesos a comunidades, agenda y perfil.

Abre `menu.html` para ver el componente. Copia `.social-menu-host` en tu cabecera y carga `menu.css` y `menu.js` una sola vez. Se cierra al pulsar fuera, Escape o seleccionar una opción. Es un componente web compatible con la WebView actual, no un componente React Native.

Conecta sus opciones con tu navegación:

```js
window.addEventListener('social:menu-navigate', ({ detail }) => {
  // Usa tu router o abre la pantalla existente según detail.destination:
  // wallet, requests, messages, alerts, communities, calendar, profile.
  abrirPantalla(detail.destination);
});
```

`abrirPantalla` es un ejemplo: reemplázalo por tu función real. El componente no implementa pagos, suscripciones, mensajes o autenticación; sólo emite la selección para conectar las pantallas existentes. No contiene contadores ficticios ni datos personales.

Origen de referencia: `resources/views/patient/dashboard.blade.php`, bloque `data-support-toggle` / `patient-support-menu`, y estilos `.patient-portal-menu` del servidor Klini. La extracción no incluye el Blade completo porque contiene los módulos médicos excluidos.
