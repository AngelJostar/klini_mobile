# Billetera y accesos — 27 octubre 2026

Cambios limitados a la nueva app de revisión; no se modificó el código de la app principal.

## Fuente y adaptación

Todos los archivos de `exports/billetera-social.zip` se conservaron en `vendor/billetera-social/`: HTML, CSS, JavaScript, README, controlador, servicio y migración Laravel. Se portó el flujo web a componentes React Native en `src/screens/WalletScreen.tsx`, con el dominio en `src/domain/wallet.ts` y consulta de Tokens en `src/services/wallet.ts`.

La ventana entra desde abajo (320 ms) y sale hacia abajo (220 ms), respeta movimiento reducido, teclado, áreas seguras y Atrás de Android. Mantiene Tokens, saldo, recarga, historial, totales de créditos/débitos y conteo. Diseño blanco, azul marino y turquesa; reutiliza el recurso de billetera generado con Runway para el menú.

Las recargas siguen siendo de demostración, de $10 a $100,000 con hasta dos decimales, sin restricción de múltiplos. El saldo inicial ficticio de $860 reproduce la referencia. Persisten con el store y su cola FIFO; una escritura fallida revierte el importe y muestra error. Los estados antiguos sin billetera se amplían sin perder perfil ni citas; los datos corruptos se rechazan. La exportación/restablecimiento general incluye la billetera.

Tokens conserva el contrato GET `/wallet/tokens`, historial y reintento. Falta conectar la sesión autenticada del backend: `EXPO_PUBLIC_WALLET_API_URL` configura la base del servidor, que deberá admitir la sesión y el cliente móvil. No se inventa saldo de Tokens ni se conceden recompensas desde el cliente. Los PHP se copiaron pero no se desplegaron ni ejecutaron migraciones. El ZIP no contiene el flujo de suscripciones.

## Accesos

El perfil se abre desde las iniciales a la derecha; se quitó del lateral. Agenda se abre desde su icono del inicio; se quitó del lateral y se conserva en el buscador. El lateral entra desde el borde izquierdo.

## Validación

- TypeScript: aprobado.
- 24 pruebas de dominio: aprobadas, incluidas límites de recarga, duplicados, totales, migración y persistencia.
- Navegador: animación ascendente, recarga inválida/válida, persistencia tras recargar, historial, 320 px y Agenda desde inicio; aprobado.
- Regresión de buscador y menú: aprobada.
- Android emulador-5554: abrir billetera, recargar, cerrar con Atrás y abrir Agenda desde inicio; aprobado. Billetera queda abierta para revisión. La prueba añadió $200 ficticios.
- Lint de archivos nuevos/modificados de billetera y navegación: sin errores. El lint general conserva 5 errores previos en DirectoryFlow/TeleconsultScreen y 3 advertencias; véase `lint-wallet.log`.
- Capturas en `test-results/android-wallet.png`, `wallet-390.png`, `wallet-movements.png` y `wallet-320.png`.

No hay cobros reales ni backend autenticado conectado. La exportación Android genera un bundle Hermes, no un APK.


Logotipo PNG: assets/klini-logo.png, generado a partir de la referencia del usuario. Aplicado en inicio, carga, favicon e iconos configurados de Android/iOS. Los iconos nativos se reflejarán en una nueva compilación; Expo Go conserva su propio icono del sistema.
