# Billetera de servicios y Apple Pay / Stripe

## Estado y alcance

Integración preparada para cuentas paciente autenticadas y recargas destinadas únicamente a consultas y servicios presenciales (`health_services`, MXN). No incluye suscripciones, IA ni contenido digital. No hay endpoint de gasto, compra de consulta, retiro ni ajuste manual en esta entrega. **No activar cobros LIVE hasta implementar y verificar la reserva y el consumo de saldo en la contratación real de servicios.** La configuración permanece desactivada por defecto. Se aplicó únicamente la migración local aditiva descrita abajo; no se cambiaron variables, instalaron secretos, registraron webhooks, publicaron cambios ni migró la base de producción.

El saldo proviene exclusivamente del ledger SQL por usuario, modo, moneda y alcance. No se importa ni se suma el saldo del servidor demostrativo Apple Pay TEST, JSON, AsyncStorage ni la billetera local del móvil. Las cuentas TEST y LIVE son filas distintas, con identidad SQL única `(user_id, mode, currency, scope)`. El cliente nunca elige usuario, modo, moneda o alcance.

### Verificación local del 11 de noviembre de 2026

Se aplicó `database/migrations/2026_11_12_000001_create_mobile_wallet_tables.php` exclusivamente en MySQL local `dr_sam`, después de comprobar servidor loopback, las tres banderas en false, seguimiento de migraciones existente y ausencia de las cuatro tablas nuevas. Se revisó `--pretend` antes de aplicar la creación aditiva; no se modificaron registros existentes ni producción. El helper de operación local quedó en `C:/laragon/www/klini_mobile/tmp/wallet-local-schema-preflight.php`.

La comprobación posterior, solo lectura, confirmó cero filas en `mobile_wallet_accounts`, `mobile_wallet_recharges`, `mobile_wallet_movements` y `mobile_wallet_webhook_events`, tanto antes como después de un GET sin credenciales a `http://192.168.100.250:8002/api/mobile/v1/patient/wallet`. La respuesta fue 401 con `error.code=unauthenticated`; no creó cuentas ni movimientos. Las tres banderas continuaron en false.

`wallet:preflight` se ejecutó sin `--provider`: `sql_tables: ready`, `provider_check: not_run` y `wallet_preflight: not_ready_for_live` (salida 1 esperada). Dominio/configuración/activación/redención siguen pendientes; no hubo consultas a Stripe ni pruebas de cobro reales. Evidencia local sanitizada: `C:/laragon/www/klini_mobile/.local/wallet-readiness-evidence-2026-11-11/` contiene `preflight.txt`, `table-counts-before.json`, `table-counts-after.json` y `unauthenticated-get.json`. Los timestamps UTC del 12 de noviembre corresponden a la noche del 11 de noviembre en Ciudad de México.

## Autenticación y transporte

Se reutiliza `POST /api/mobile/v1/auth/login` y el token personal Sanctum del usuario con capacidad `mobile:access`. Todas las rutas de billetera exigen Bearer PAT real, usuario paciente activo y perfil `Patient` activo. No se acepta sesión web, token compartido de desarrollo ni perfil administrado perteneciente a otro usuario. Las cuentas demo no acceden a LIVE.

LIVE exige HTTPS; HTTP se permite únicamente en TEST sobre loopback o IP privada IPv4. La base dev actual puede utilizar `http://192.168.100.250:8002/api/mobile/v1`. El destino de producción propuesto es `https://klini.us/api/mobile/v1`; debe verificarse acceso al servidor, certificado, proxy confiable, configuración segura de Laravel, base de datos, respaldos y operación antes de desplegar. No se ha cambiado DNS ni publicado este destino.

## Configuración de servidor (sin valores de credenciales)

`config/wallet-payments.php` declara:

| Variable | Valor inicial / requisito |
|---|---|
| `WALLET_PAYMENTS_ENABLED` | `false`. Habilita crear o reanudar pagos; puede pausarse manteniendo conciliación de órdenes existentes. |
| `WALLET_PAYMENTS_LIVE_ENABLED` | `false`. Barrera adicional para nuevos pagos LIVE; no impide conciliar órdenes anteriores. |
| `WALLET_SERVICE_REDEMPTION_ENABLED` | `false`. No habilitar hasta existir contratación/consumo servidor real y probado. Solo controla nuevos pagos. |
| `WALLET_PAYMENTS_MODE` | `test`; solo `test` o `live`. |
| `STRIPE_SECRET_KEY` | Secreto servidor de la cuenta y modo correctos; nunca viaja al móvil. |
| `STRIPE_PUBLISHABLE_KEY` | Clave pública del mismo modo. |
| `STRIPE_WALLET_WEBHOOK_SECRET` | Secreto de firma del endpoint de esta integración y modo. |
| `STRIPE_ACCOUNT_ID` | Cuenta `acct_…` esperada; obligatoria en LIVE. |
| `APPLE_PAY_MERCHANT_IDENTIFIER` | Merchant ID configurado y firmado en la app nativa. |

El guard actual admite únicamente secretos servidor `sk_test_…` o `sk_live_…` del modo correspondiente. Se requiere una credencial servidor dedicada a esta integración, provisionada por un canal privado; no se reutiliza la clave restringida TEST histórica `rk_…`, que estas reglas rechazan. No copiar secretos al móvil, a esta documentación ni a logs. La clave pública también debe corresponder al mismo modo.

La versión Stripe está fijada en `2026-10-28.endive`. En LIVE, antes de operaciones con Stripe se comprueba la cuenta esperada, país MX y `balance.livemode=true`; crear o reanudar también exige `charges_enabled=true`. Un prefijo de clave no basta para esta comprobación. No se configura una URL de proveedor arbitraria: las llamadas REST van exclusivamente a `https://api.stripe.com/v1`, sin redirecciones ni reintentos automáticos de POST. Laravel HTTP evita una dependencia adicional del SDK servidor.

## API

Todas las respuestas usan `MobileApiResponse`: `{success:true,data:…}` o `{success:false,error:{code,message,…}}`. No se devuelven errores crudos de Stripe, claves privadas, direcciones clínicas, datos de tarjeta ni payloads de webhook.

| Método y ruta bajo `/api/mobile/v1/patient/wallet` | Operación |
|---|---|
| `GET /` | Snapshot SQL propio, sin llamadas Stripe ni escrituras. |
| `POST /recharges` | `{amount_cents:int,client_request_id:UUID}`. Importe entre 5000 y 1000000 centavos ($50–$10,000 MXN). |
| `GET /recharges/{UUID}` | Estado SQL propio, sin Stripe ni `client_secret`. |
| `POST /recharges/{UUID}/refresh` | Recupera y verifica el estado Stripe; concilia crédito, reembolso y disputa. Nunca devuelve `client_secret`. |
| `POST /recharges/{UUID}/resume` | Recupera la misma orden; devuelve secreto solo al propietario y si aún puede pagarse. |
| `POST /recharges/{UUID}/cancel` | Consulta Stripe, solicita cancelación si el estado lo permite y vuelve a conciliar. No declara cancelado un pago confirmado o todavía en procesamiento. |

El snapshot contiene `mode`, `currency`, `scope`, `balance_cents`, `blocked`, `blocked_reason` (solo `payment_dispute`, `payment_review` o null), últimos 100 `movements`, `has_more_movements`, hasta 20 `pending_recharges` y `payment_config`. El saldo es SUM completo del ledger, aunque el listado esté limitado. Los movimientos incluyen `id`, `order_id`, `type` (`recharge` o `refund`), `amount_cents` firmado, modo/moneda/alcance y fecha. Las recargas pendientes incluyen ID, importe positivo, estado, modo/moneda/alcance y fecha. Una cuenta y modo solo pueden abrir una recarga pendiente; reintentar la misma solicitud sigue permitido.

`payment_config` contiene `enabled`, `publishable_key`, `merchant_identifier`, `country:MX`, `min_amount_cents:5000`, `max_amount_cents:1000000`. En TEST sin configuración, GET devuelve saldo SQL y pagos desactivados sin contactar Stripe. En LIVE con credenciales/vinculación incompletas devuelve 503. Desactivar cualquiera de las banderas de cobro no bloquea consultas SQL, cancelaciones, refresh ni webhooks de órdenes anteriores mientras las credenciales sigan válidas. Las claves públicas/merchant se omiten al estar pausados los cobros.

Las respuestas de recarga contienen `{recharge:{id,amount_cents,status,mode,currency,scope,created_at},payment_intent_id,client_secret,wallet}`. El secreto aparece únicamente en crear/reanudar una orden pagable. El móvil debe vincular su prefijo al `payment_intent_id` y confirmar mediante el SDK nativo; una respuesta del SDK nunca incrementa saldo. `wallet` aparece solo para una recarga confirmada en servidor. Los estados son `creating`, `requires_payment_method`, `requires_confirmation`, `requires_action`, `processing`, `succeeded`, `canceled`.

## Idempotencia y recuperación

La transacción bloquea la cuenta antes de consultar o crear una orden. `(wallet_account_id, client_request_id)` es único y reutilizar una solicitud con otro importe devuelve 409. Cada orden utiliza siempre la clave Stripe `klini-wallet:{mode}:{orderUUID}`. Un timeout conserva la orden y el importe; crear con la misma solicitud o reanudar sin PI conocido repite esa misma clave. No se abre otra orden ni se cambia la clave.

La recuperación automática de una creación ambigua queda limitada a las primeras 23 horas. Stripe puede retirar sus claves idempotentes después de 24 horas; por ello, una creación desconocida más antigua necesita conciliación operativa antes de continuar. Una cancelación sin PI conocido tampoco se declara terminada. No borrar órdenes pendientes para “desbloquear” el flujo ni inventar un crédito.

El servidor verifica ID, modo real, importe, moneda, captura automática, métodos `card`, metadatos opacos de la orden y estado. `succeeded` también exige importe recibido completo y Charge pagado/capturado correspondiente. Crédito y reembolso se aplican juntos bajo bloqueo SQL, con fuente de movimiento única. No se incluyen datos clínicos, nombres o correo en metadata Stripe.

## Webhook, reembolsos y disputas

Ruta preparada: `POST /api/integrations/stripe/wallet`. Destino propuesto de producción: `https://klini.us/api/integrations/stripe/wallet`. Todavía debe registrarse en Stripe mediante una operación autorizada de despliegue. Debe utilizar eventos snapshot de la versión fijada y secret del mismo entorno. No necesita Sanctum ni CSRF; exige firma Stripe válida sobre el cuerpo original, comparación constante y tolerancia de 300 segundos, también para marcas futuras.

Eventos: `payment_intent.succeeded`, `payment_intent.processing`, `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`, `refund.failed`, `refund.updated`. Los dos últimos bloquean para revisión cuando el reembolso falla o se cancela. No se admiten eventos Connect. Un webhook válido recupera el estado actual desde Stripe y verifica su correspondencia con una orden local. Los IDs de eventos se deduplican por modo; los movimientos tienen deduplicación propia para que un reintento o evento distinto no duplique dinero. Los payloads completos, datos de tarjeta y secretos no se almacenan.

`charge.refunded` aplica solo el aumento de `amount_refunded` respecto al acumulado ya registrado; los movimientos de reembolso son negativos y los avisos atrasados nunca revierten el acumulado ni bloquean por sí solos la cuenta. Si un reembolso después falla o se cancela y llega el evento verificado correspondiente, la cuenta se bloquea para `payment_review` sin inventar un reabono automático. Consultar una recarga confirmada también verifica su Charge y recupera un reembolso o disputa cuyo webhook se haya retrasado. Una disputa abierta o cerrada bloquea persistentemente la billetera hasta una resolución manual deliberada; cerrar el evento no libera fondos automáticamente. No hay endpoint público para desbloquear ni reembolsar.

## Verificación y pendientes de activación

`php artisan wallet:preflight` es una comprobación de solo lectura: valida presencia de las cuatro tablas, vinculación/formato de credenciales sin mostrarlas, dominio canónico `https://klini.us`, modo y las tres banderas de cobro. No consulta filas de pacientes ni modifica configuración o dinero. Sin `--provider` no hace red y su resultado no autoriza LIVE. `php artisan wallet:preflight --provider` añade exclusivamente GET de cuenta/balance Stripe y exige cuenta esperada, país MX, cobros habilitados y modo correcto. Imprime solo nombres de comprobaciones y ready/not_ready; no claves, IDs de cuenta, payloads, datos clínicos ni tokens. El código de salida 1 y `not_ready_for_live` son esperados mientras falte redención real o la configuración permanezca apagada. Un resultado `ready_for_deployment_review` no sustituye la revisión de consumo, despliegue y autorización de cobro.

Las pruebas deben usar SQLite `:memory:` y `Http::fake` / `preventStrayRequests`, nunca pagos ni credenciales reales. Cubren autenticación personal, aislamiento de propietario/modo, importes, flags, claves repetidas, creación ambigua, confirmación, cancelación en carrera, recuperación, validación de respuestas, firma, eventos repetidos, reembolsos acumulativos, disputas y ledger paginado. Estas pruebas no sustituyen una comprobación de concurrencia MySQL ni una prueba de entrega HTTPS del webhook.

Antes de LIVE: aplicar y revisar la migración aditiva sobre el servidor correcto con respaldo; configurar secretos por canal privado; validar cuenta Stripe y Merchant ID/firma; desplegar TLS/webhook; verificar reintentos y supervisión; incorporar reserva/consumo de saldo vinculado al servicio real con conciliación de cancelaciones/reembolsos; ejecutar pruebas completas en TEST con la cuenta real autenticada. Después se requerirá autorización explícita para activar cobros. No usar la bandera de redención como sustituto de esa implementación.

Referencias oficiales consultadas: [webhooks y firma](https://docs.stripe.com/webhooks), [idempotencia](https://docs.stripe.com/api/idempotent_requests), [estados de pago](https://docs.stripe.com/payments/payment-intents/verifying-status), [cancelación](https://docs.stripe.com/api/payment_intents/cancel), [HTTP Laravel 12](https://laravel.com/docs/12.x/http-client).
