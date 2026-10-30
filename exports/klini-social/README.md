# Código Klini Social

Exportación separada del código actual. No modifica Klini. Contiene la app Expo SDK 55 y un módulo Laravel 12 con los componentes sociales existentes. La app móvil es un contenedor WebView: las pantallas se sirven desde Laravel.

## Incluido
- Inicio, comunidades y agenda con sus componentes actuales; reservas, cancelaciones y actividades publicadas por administradores.
- Cinco botones inferiores: Inicio, Comunidades, Publicar, Buscar (lupa) y Agenda. Los dos botones antes clínicos se adaptaron al uso social.
- Perfil con identidad de la sesión, solicitudes y billetera Token.
- Administrador social sencillo para clases, eventos, talleres, podcasts y lives. Publicar/ocultar, cupos y reservas usan el servidor.
- Código de tarjeta/billetera de demostración y modales de tamaño consistente.

## No incluido
Soporte médico, médicos, pacientes del modelo clínico, expedientes, consultas, signos vitales, recetas, vinculación con profesionales, archivos privados, credenciales ni base de datos. Los identificadores internos heredados `patient` en los componentes JavaScript sólo identifican al usuario social; no requieren el modelo Patient. No se copió el panel médico ni sus menús.

## Instalar servidor
1. Usa un proyecto Laravel 12 con autenticación web existente y tabla `users` (id, name, email). Este paquete es un módulo, no una instalación completa de Laravel.
2. Copia `backend/app`, `backend/public`, `backend/resources` y las migraciones a ese proyecto. Revisa conflictos antes de reemplazar archivos existentes. No copies sobre tu producción sin respaldo.
3. En `routes/web.php` agrega: `require __DIR__.'/social.php';` y copia `backend/routes/social.php` a `routes/social.php`. No registres dos veces las rutas si ya existen en el administrador original.
4. En `AppServiceProvider::boot()` define una autorización explícita para administradores, por ejemplo:
```php
\Illuminate\Support\Facades\Gate::define('manage-social-communities', fn ($user) => in_array($user->role, ['admin', 'community_admin'], true));
```
Adapta la regla a tu sistema real de roles. Los demás usuarios sólo necesitan sesión autenticada. El controlador verifica además la propiedad de cada actividad al administrarla.
5. Ejecuta `php artisan migrate`, `php artisan serve --host=0.0.0.0 --port=8000`. Entra con el login de tu proyecto y abre `/social` o `/social/admin`.

## Conectar al administrador de comunidades existente
Usa el mismo servidor y base de datos para ambas interfaces. Se conservan las rutas `/communities/activities`, `/communities/activities/{id}`, `/{id}/reservation`, `/{id}/attendees` y `/wallet/tokens`; no necesitas relaciones con médicos. Las llamadas web usan sesión y CSRF. Si el administrador vive en otro servidor, necesita un adaptador de autenticación/API; cambiar sólo la URL no comparte sesiones ni base de datos.

## Instalar móvil
En `mobile`: `npm install`, copia `.env.example` a `.env`, configura `EXPO_PUBLIC_PORTAL_URL`, ejecuta `npm run lint`, `npm run typecheck`, `npm run android`.
Android emulador: `http://10.0.2.2:8000/social`. Dispositivo físico: dirección LAN del servidor. En producción usa HTTPS. El login se abre dentro de la WebView según tu aplicación Laravel. Las dependencias nativas requieren compilar la app; no se incluyen APK, node_modules ni vendor.

## Alcance real antes de reutilizar
Las actividades, reservas y ledger Token usan Laravel/MySQL. El feed de ejemplo, reacciones, solicitudes, historias de demostración y catálogos conservan el comportamiento local del prototipo actual. Publicar crea un borrador local; Buscar filtra perfiles y comunidades del catálogo local. Agenda muestra las reservaciones de clases, eventos, talleres y demás actividades. No existe todavía un servicio multiusuario para esos datos. El perfil conserva identidad y accesos sociales, pero no el editor clínico original. Para una red social de producción hay que implementar publicaciones/seguidores/moderación y edición de perfil persistentes.
Los pagos son una DEMOSTRACIÓN: no hay cobro bancario ni débito de dinero real. La billetera Token es un ledger de recompensas, no una cuenta bancaria. No conectar tarjetas reales sin un proveedor de pagos con tokenización. No se incluyen credenciales ni datos privados de usuarios.

Documentación compatible: https://docs.expo.dev/versions/v55.0.0/ . El manifiesto de archivos permite verificar el contenido del paquete.
