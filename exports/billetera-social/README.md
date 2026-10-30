# Billetera de Klini

Componente web independiente extraído y adaptado de la billetera de usuario. Incluye Tokens, saldo disponible, recarga local y movimientos, con los estilos originales de esas secciones. Compatible con la WebView móvil actual. No incluye módulos médicos ni el flujo separado de suscripciones.

## Integración
Copia wallet.css y wallet.js en tus recursos públicos. Copia el dialog de wallet.html en tu página y carga ambos recursos una sola vez. Para abrir:

```js
window.KliniWallet.open({storageKey:'wallet-demo:'+usuario.id,initialBalance:0});
```

Usa una clave diferente por usuario. El saldo inicial se aplica sólo si no existe un saldo guardado. Para reproducir visualmente el ejemplo de la captura puedes indicar initialBalance:860; ese importe es ficticio.

Para conectar el menú lateral:
```js
window.addEventListener('social:menu-navigate', ({detail}) => {
  if(detail.destination==='wallet') window.KliniWallet.open({storageKey:'wallet-demo:'+usuario.id});
});
```

Reemplaza usuario.id por la identidad de tu sesión. Carga wallet.js antes de abrir la billetera.

## Tokens del servidor
El componente consulta GET /wallet/tokens con la sesión web actual. Se incluyen el controlador, servicio y migración Laravel en backend/. La migración requiere users y community_activities, presentes en el paquete social entregado anteriormente. No ejecutes migraciones duplicadas. La ruta autenticada es:

```php
Route::get('/wallet/tokens', [\App\Http\Controllers\Wallet\TokenWalletController::class, 'show'])->middleware('auth');
```

La recompensa de 1 Token se acredita desde el controlador de creación de eventos mediante TokenWallet::creditEvent dentro de su transacción; ese controlador está en el paquete social anterior. El frontend no puede conceder Tokens. La respuesta de consulta contiene balance, unit y movements.

## Alcance
Los Tokens y su historial proceden del servidor. El saldo en pesos, sus movimientos y las recargas de esta versión se guardan en localStorage y son únicamente una demostración; no aceptan tarjetas ni cobran dinero. Para operar dinero real hay que sustituir este flujo por un proveedor de pagos y un ledger del servidor. No se incluyeron credenciales ni datos de usuarios.

Abrir wallet.html directamente permite previsualizar el componente, pero los Tokens necesitan el servidor autenticado y mostrarán un error de consulta fuera de él.
