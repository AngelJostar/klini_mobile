# Billetera de servicios y Apple Pay / Stripe

## Estado y alcance

Integración preparada para cuentas paciente autenticadas y recargas destinadas únicamente a consultas y servicios presenciales (`health_services`, MXN). No incluye suscripciones, IA ni contenido digital. Se añade pago con saldo de una cita presencial propia, confirmada y futura, con tarifa publicada por el médico y devolución al cancelar. No crea reservas nuevas ni paga videollamadas; no incluye retiros o ajustes manuales. **No activar cobros LIVE hasta revisar, migrar y comprobar de extremo a extremo este consumo en el entorno de destino.** La configuración permanece desactivada por defecto. Se aplicó únicamente la primera migración local aditiva descrita abajo; las migraciones de tarifas y consultas están preparadas pero aún no aplicadas en MySQL; no se cambiaron variables, instalaron secretos, registraron webhooks, publicaron cambios ni migró la base de producción.

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
| `WALLET_SERVICE_REDEMPTION_ENABLED` | `false`. Habilita nuevos débitos de consultas y es requisito adicional de nuevas recargas LIVE. No detiene reversiones ni conciliación de pagos anteriores. Mantener apagada hasta revisión del flujo real. |
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
| `GET /consultations` | Lista citas propias confirmadas, futuras y presenciales, con médico y usuario médico activos. No crea cuentas ni cotizaciones. |
| `POST /consultations/{id}/quote` | Cuerpo vacío. Crea o recupera cotización inmutable durante 15 minutos con precio servidor. |
| `POST /consultation-payments` | `{quote_id:UUID,client_request_id:UUID}`. Debita saldo confirmado; nunca acepta precio del cliente. |
| `POST /recharges/{UUID}/cancel` | Consulta Stripe, solicita cancelación si el estado lo permite y vuelve a conciliar. No declara cancelado un pago confirmado o todavía en procesamiento. |

El snapshot contiene `mode`, `currency`, `scope`, `balance_cents` firmado, `available_balance_cents`, `blocked`, `blocked_reason` (solo `payment_dispute`, `payment_review` o null), últimos 100 `movements`, `has_more_movements`, hasta 20 `pending_recharges` y `payment_config`. El saldo es SUM completo del ledger, aunque el listado esté limitado. Los movimientos incluyen `id`, `order_id`, `service_payment_id`, `appointment_id`, `type` (`recharge`, `refund`, `service_payment` o `service_reversal`), importe firmado, modo/moneda/alcance y fecha. Recarga/reembolso: `order_id` UUID y campos de consulta null. Débito/reversión: `order_id` null, pago UUID y cita numérica. El modelo exige un único origen, signo correcto e historial inmutable; SQL conserva sus FK y fuentes únicas. El disponible es 0 si hay bloqueo y, en otro caso, max(0, balance). Las recargas pendientes incluyen ID, importe positivo, estado, modo/moneda/alcance y fecha. Una cuenta y modo solo pueden abrir una recarga pendiente; reintentar la misma solicitud sigue permitido.

`payment_config` contiene `enabled`, `service_payments_enabled`, `publishable_key`, `merchant_identifier`, `country:MX`, `min_amount_cents:5000`, `max_amount_cents:1000000`. En TEST sin configuración, GET devuelve saldo SQL y pagos desactivados sin contactar Stripe. En LIVE con credenciales/vinculación incompletas devuelve 503. Desactivar cualquiera de las banderas de cobro no bloquea consultas SQL, cancelaciones, refresh ni webhooks de órdenes anteriores mientras las credenciales sigan válidas. Las claves públicas/merchant se omiten al estar pausados los cobros.

Las respuestas de recarga contienen `{recharge:{id,amount_cents,status,mode,currency,scope,created_at},payment_intent_id,client_secret,wallet}`. El secreto aparece únicamente en crear/reanudar una orden pagable. El móvil debe vincular su prefijo al `payment_intent_id` y confirmar mediante el SDK nativo; una respuesta del SDK nunca incrementa saldo. `wallet` aparece solo para una recarga confirmada en servidor. Los estados son `creating`, `requires_payment_method`, `requires_confirmation`, `requires_action`, `processing`, `succeeded`, `canceled`.

## Idempotencia y recuperación

La transacción bloquea la cuenta antes de consultar o crear una orden. `(wallet_account_id, client_request_id)` es único y reutilizar una solicitud con otro importe devuelve 409. Cada orden utiliza siempre la clave Stripe `klini-wallet:{mode}:{orderUUID}`. Un timeout conserva la orden y el importe; crear con la misma solicitud o reanudar sin PI conocido repite esa misma clave. No se abre otra orden ni se cambia la clave.

La recuperación automática de una creación ambigua queda limitada a las primeras 23 horas. Stripe puede retirar sus claves idempotentes después de 24 horas; por ello, una creación desconocida más antigua necesita conciliación operativa antes de continuar. Una cancelación sin PI conocido tampoco se declara terminada. No borrar órdenes pendientes para “desbloquear” el flujo ni inventar un crédito.

El servidor verifica ID, modo real, importe, moneda, captura automática, métodos `card`, metadatos opacos de la orden y estado. `succeeded` también exige importe recibido completo y Charge pagado/capturado correspondiente. Crédito y reembolso se aplican juntos bajo bloqueo SQL, con fuente de movimiento única. No se incluyen datos clínicos, nombres o correo en metadata Stripe.

## Cotizaciones y consumo de consultas

`GET /consultations` devuelve `{appointments:[{id,doctor:{name},starts_at,modality:"Presencial",status:"confirmed",tariff,quote,payment}],has_more}`, limitado a 50. `tariff` es null o `{id,version,amount_cents,currency:"MXN",modality:"in_person"}`. No revela historia clínica ni citas ajenas. LIVE excluye médicos demo; TEST permite datos demo.

`POST /consultations/{id}/quote {}` devuelve `{quote}`. Quote contiene `id`, `appointment_id`, `tariff_id`, `tariff_version`, `amount_cents`, `currency`, `scope`, `mode`, `expires_at` y `status` derivado (`valid|expired|invalidated|paid`). Conserva el precio aceptado durante 15 minutos aunque el médico publique otro o retire su tarifa. Reutiliza una cotización vigente con la misma huella; una vencida requiere otra. La huella fija paciente, médico, unidad, consultorio, especialidad, modalidad, ubicación y fechas. Cambiar esos datos invalida la cotización; cambiar titularidad, estado o elegibilidad también impide pagar. Revisar el precio no cobra saldo.

`POST /consultation-payments` devuelve `{payment,wallet}`. Payment contiene `id`, `appointment_id`, `quote_id`, `amount_cents`, `currency`, `scope`, `mode`, `status` (`paid|reversed`), `paid_at` y `reversed_at`. El precio solo procede de la cotización servidor; exige saldo confirmado y cuenta propia del mismo modo. No llama a Stripe. Estado y snapshot se construyen dentro de la misma transacción; una excepción del snapshot revierte el débito. Las lecturas bloqueantes del ledger evitan devolver un SUM de una instantánea anterior al bloqueo de cuenta.

Repetir exactamente `quote_id` y `client_request_id` devuelve el mismo pago, incluso tras pausar redención o cancelar. Reutilizar la clave para otra cotización devuelve 409. Otra clave para una cotización/cita ya pagada devuelve 409: el cliente debe consultar su lista para conciliar, sin aceptar una clave que no queda vinculada. Restricciones SQL únicas: `(wallet_account_id,client_request_id)`, cotización y `(appointment_id,mode)`.

Este MVP permite un único ciclo financiero por cita y modo. Una cita pagada, incluso después de revertida, no admite cambios materiales ni reactivación desde cancelada. Responde 409: «Esta consulta tiene un pago registrado. Cancela y agenda una nueva cita para cambiarla.» Se necesita una nueva cita para cambiar precio, fecha, médico o titular. Los estados clínicos `in_progress` y `completed` conservan el pago; `no_show` tampoco devuelve saldo automáticamente.

Cancelar devuelve el importe original una sola vez mediante `service_reversal` con fuente única; devuelve saldo de billetera y no solicita un reembolso Stripe. Las cuatro rutas actuales (doctor web, doctor móvil, unidad y consulta externa) pasan por `Appointment::save`, que relee y bloquea la cita y envuelve estado y reversión en una misma transacción. Si falla el ledger, se revierte también el estado. Los controladores reautorizan al actor sobre la cita fresca bajo bloqueo antes de escribir estados o datos clínicos; consulta externa verifica su unidad. Se conservan las reglas de transición.

Orden de bloqueos: cita, paciente asociado al comprobar historia financiera, cuentas del titular ordenadas por ID, pagos. Las recargas solo bloquean cuenta→recarga y nunca solicitan cita. El vínculo de médico a cita bloquea cita→médico para evitar ciclos con FK de cotización. No se confía en el orden de un JOIN. Una incongruencia entre titular y cuenta de un pago detiene la mutación y exige revisión. No se soporta operar citas con pagos mediante SQL directo, mass/quiet updates, borrar historia financiera o reasignar `Patient.user_id` fuera de los servicios autorizados: esos caminos omiten hooks y permisos.

Las migraciones `2026_11_12_000002_create_doctor_consultation_tariffs.php` y `2026_11_12_000003_create_wallet_consultation_payments.php` están preparadas y probadas con SQLite aislado, **no aplicadas en MySQL local ni producción en esta entrega**. La tercera crea cotizaciones/pagos, permite `recharge_id` nullable y añade `service_payment_id` al ledger conservando sus FK. Su rollback se niega si existen pagos o movimientos de consultas. Revisar respaldo, SQL `--pretend` y esquema destino antes de una migración aditiva autorizada. SQLite no acredita concurrencia ni locks MySQL; ese ensayo sigue pendiente antes de LIVE.

## Webhook, reembolsos y disputas

Ruta preparada: `POST /api/integrations/stripe/wallet`. Destino propuesto de producción: `https://klini.us/api/integrations/stripe/wallet`. Todavía debe registrarse en Stripe mediante una operación autorizada de despliegue. Debe utilizar eventos snapshot de la versión fijada y secret del mismo entorno. No necesita Sanctum ni CSRF; exige firma Stripe válida sobre el cuerpo original, comparación constante y tolerancia de 300 segundos, también para marcas futuras.

Eventos: `payment_intent.succeeded`, `payment_intent.processing`, `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`, `refund.failed`, `refund.updated`. Los dos últimos bloquean para revisión cuando el reembolso falla o se cancela. No se admiten eventos Connect. Un webhook válido recupera el estado actual desde Stripe y verifica su correspondencia con una orden local. Los IDs de eventos se deduplican por modo; los movimientos tienen deduplicación propia para que un reintento o evento distinto no duplique dinero. Los payloads completos, datos de tarjeta y secretos no se almacenan.

Reembolsar una recarga ya consumida registra todo el débito real, aunque el saldo resulte negativo: se bloquea persistentemente para `payment_review`, disponible=0. Una reversión de consulta posterior puede cubrir el déficit, pero nunca desbloquea automáticamente ni inventa un crédito de deuda.

`charge.refunded` aplica solo el aumento de `amount_refunded` respecto al acumulado ya registrado; los movimientos de reembolso son negativos y los avisos atrasados nunca revierten el acumulado ni bloquean por sí solos la cuenta. Si un reembolso después falla o se cancela y llega el evento verificado correspondiente, la cuenta se bloquea para `payment_review` sin inventar un reabono automático. Consultar una recarga confirmada también verifica su Charge y recupera un reembolso o disputa cuyo webhook se haya retrasado. Una disputa abierta o cerrada bloquea persistentemente la billetera hasta una resolución manual deliberada; cerrar el evento no libera fondos automáticamente. No hay endpoint público para desbloquear ni reembolsar.

## Verificación y pendientes de activación

`php artisan wallet:preflight` es una comprobación de solo lectura: valida presencia de las siete tablas (wallet, tarifas, cotizaciones y pagos), vinculación/formato de credenciales sin mostrarlas, dominio canónico `https://klini.us`, modo y las tres banderas de cobro. No consulta filas de pacientes ni modifica configuración o dinero. Sin `--provider` no hace red y su resultado no autoriza LIVE. `php artisan wallet:preflight --provider` añade exclusivamente GET de cuenta/balance Stripe y exige cuenta esperada, país MX, cobros habilitados y modo correcto. Imprime solo nombres de comprobaciones y ready/not_ready; no claves, IDs de cuenta, payloads, datos clínicos ni tokens. El código de salida 1 y `not_ready_for_live` son esperados mientras falte redención real o la configuración permanezca apagada. Un resultado `ready_for_deployment_review` no sustituye la revisión de consumo, despliegue y autorización de cobro.

Las pruebas deben usar SQLite `:memory:` y `Http::fake` / `preventStrayRequests`, nunca pagos ni credenciales reales. Cubren autenticación personal, aislamiento de propietario/modo, importes, flags, claves repetidas, creación ambigua, confirmación, cancelación en carrera, recuperación, validación de respuestas, firma, eventos repetidos, reembolsos acumulativos, disputas y ledger paginado. Estas pruebas no sustituyen una comprobación de concurrencia MySQL ni una prueba de entrega HTTPS del webhook.

Antes de LIVE: aplicar y revisar la migración aditiva sobre el servidor correcto con respaldo; configurar secretos por canal privado; validar cuenta Stripe y Merchant ID/firma; desplegar TLS/webhook; verificar reintentos y supervisión; aplicar y revisar las migraciones de tarifa/consumo e integrar la reserva real confirmada con el móvil; verificar cancelaciones y reembolsos bajo concurrencia MySQL; ejecutar pruebas completas en TEST con la cuenta real autenticada. Después se requerirá autorización explícita para activar cobros. No usar la bandera de redención como sustituto de esa implementación.

Referencias oficiales consultadas: [webhooks y firma](https://docs.stripe.com/webhooks), [idempotencia](https://docs.stripe.com/api/idempotent_requests), [estados de pago](https://docs.stripe.com/payments/payment-intents/verifying-status), [cancelación](https://docs.stripe.com/api/payment_intents/cancel), [HTTP Laravel 12](https://laravel.com/docs/12.x/http-client).
