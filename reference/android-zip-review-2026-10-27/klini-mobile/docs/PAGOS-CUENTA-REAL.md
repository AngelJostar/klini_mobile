# Billetera de cuenta y preparación de pagos reales

## Alcance

El usuario eligió **klini.us** y **recargas para consultas y servicios presenciales**. Los planes digitales de IA y almacenamiento conservan su flujo independiente; la recarga no compra derechos digitales ni cambia una suscripción local.

Esta integración añade una billetera autenticada al backend Laravel y sustituye el flujo de Recargar cuando se selecciona explícitamente la API de cuenta. Las recargas solo se acreditan después de la verificación de Stripe en servidor. No se importan los **$300 MXN de TEST**, el ledger local de desarrollo ni el saldo ficticio de AsyncStorage.

Las cuatro tablas de billetera ya se instalaron únicamente en MySQL de desarrollo local mediante la migración aditiva revisada. Las tres banderas de cobro/redención siguen desactivadas. La base del servidor de klini.us no se ha migrado.

El dominio responde por HTTPS y `/api/mobile/v1/me` exige autenticación (HTTP401). En la comprobación de preparación, `/api/mobile/v1/patient/wallet` todavía devolvió HTTP404. No se ha desplegado esta integración ni habilitado cobros reales.

## Flujo móvil

1. Billetera → Iniciar sesión con una cuenta de paciente.
2. Recargar → elegir $100, $200, $500 u otro monto de **$50 a $10,000 MXN**.
3. Continuar prepara una sola orden en el servidor. Apple Pay aparece primero, mediante el botón oficial, en un iPhone compatible; Tarjeta abre PaymentSheet de Stripe con la apariencia de Klini.
4. La app consulta al servidor. Solo una respuesta verificada muestra «Recarga confirmada» y actualiza el saldo.

Cerrar la hoja de pago solicita cancelar la orden en Stripe. Si la red falla o Stripe aún procesa la operación, se conserva la misma referencia para consultar su estado. Una recarga pendiente se puede consultar, continuar o cancelar desde Billetera. No se acredita dinero por el resultado nativo por sí solo.

Las credenciales de paciente permanecen en memoria durante la sesión de la aplicación. La contraseña se limpia después del intento de acceso; no se escriben bearer tokens ni balances en AsyncStorage. La sesión de cuenta identifica al pagador remoto, independientemente del perfil de demostración seleccionado. El cierre de sesión limpia la sesión nativa de PaymentSheet, retira el token de memoria y solicita su revocación al servidor; si falla esa solicitud, el vencimiento del token servidor sigue vigente.

Web y Expo Go no muestran botones que imiten un pago nativo. La versión instalada debe coincidir con el modo y Merchant ID compilados. El retorno 3DS se dirige a Billetera y Stripe recibe la URL original; si la app se cerró, el usuario inicia sesión y consulta la orden que conserva el servidor.

## Configuración y activación

`payments.account.public.env.example` contiene únicamente la propuesta de configuración pública. No se copió a los archivos privados ni se cambiaron las variables de la compilación TEST actual. Una configuración de cuenta inválida muestra un error; nunca vuelve silenciosamente a una recarga de demostración.

El servidor usa autenticación Sanctum, órdenes y movimientos SQL por usuario/modo, idempotencia y webhooks firmados. TEST y LIVE se separan explícitamente. El modo LIVE debe permanecer deshabilitado hasta disponer de:

- API desplegada en klini.us y base de datos migrada con respaldo y revisión.
- Cuenta Stripe LIVE de México habilitada, claves del mismo entorno y webhook HTTPS firmado, almacenados solo en el servidor.
- Configuración Apple Pay de la cuenta LIVE verificada con el Merchant del binario.
- Consumo de saldo vinculado a una reserva/servicio real en el servidor. La agenda local de demostración no descuenta este saldo ni acredita una reserva real.
- Nueva compilación firmada de iPhone con este código y el modo correspondiente. El build11 instalado conserva el flujo TEST anterior.

La bandera de redención del servidor no se debe activar para saltarse el trabajo pendiente de reservas/consumo. No se realizaron cargos reales, cambios DNS, publicación, subida a EAS o despliegue como parte de esta preparación.

## Consultas y tarifas: implementación preparada

El usuario definió que **cada médico fija su tarifa desde su panel**. El panel Mis Consultorios permite a su titular activo publicar o retirar su tarifa de consulta presencial, entre $50 y $10,000 MXN en esta primera etapa. Cada publicación conserva una versión inmutable; no se asignan precios por defecto ni se usan los importes ficticios del directorio móvil.

En Billetera → Mis consultas se consultan citas presenciales propias, confirmadas y futuras del servidor. Revisar pago solicita una cotización con el precio del médico y vigencia de 15 minutos. Pagar con saldo requiere una confirmación explícita; el servidor comprueba cita, pagador, médico, cotización y fondos bajo bloqueo, debita una sola vez y devuelve el saldo SQL. Una tarifa nueva no cambia el importe de una cotización vigente. Los médicos de demostración quedan excluidos de cobros LIVE.

El cliente conserva en memoria la misma cita/cotización/UUID ante una respuesta incierta, incluso al cerrar y volver a abrir Billetera. No reintenta automáticamente ni escribe saldo en AsyncStorage. Permite verificar ese intento histórico aunque se suspendan los pagos nuevos. Cerrar sesión o cambiar de cuenta limpia el intento. Un 401 vuelve al acceso de paciente y las respuestas atrasadas no sustituyen la lista más reciente.

Cancelar la cita desde los paneles existentes devuelve exactamente el pago una sola vez, dentro de la misma transacción. Los cambios de médico, paciente, horario o modalidad después de pagar exigen cancelar y agendar otra cita; una cita cancelada con pago histórico no se reutiliza. Los movimientos distinguen consulta y devolución. Un reembolso de una recarga ya consumida conserva el saldo contable negativo y bloquea la billetera para revisión; el saldo disponible se muestra en cero y una devolución posterior no la desbloquea automáticamente.

Rutas autenticadas adicionales: `GET /patient/wallet/consultations`, `POST /patient/wallet/consultations/{id}/quote`, `POST /patient/wallet/consultation-payments`. GET no crea cotizaciones. Repetir la misma clave devuelve el pago original; una clave nueva para una cotización pagada devuelve 409 y la app consulta el estado registrado. `payment_config.service_payments_enabled` controla redención de manera independiente a las recargas.

Las migraciones aditivas `2026_11_12_000002_create_doctor_consultation_tariffs` y `2026_11_12_000003_create_wallet_consultation_payments` están preparadas y **no se han aplicado en MySQL local o remoto**. No se publicaron tarifas, consumieron fondos reales ni activaron banderas. Antes de LIVE faltan ejecutar/revisar esas migraciones, pruebas concurrentes en MySQL y aceptación completa en TEST, despliegue y configuración privada del servidor de klini.us, y una nueva compilación/prueba física.

## Fuentes

- [Expo58: Stripe y configuración nativa](https://docs.expo.dev/versions/v58.0.0/sdk/stripe/)
- [Expo Router: retornos nativos](https://docs.expo.dev/router/advanced/native-intent/)
- [Stripe: PaymentSheet React Native](https://docs.stripe.com/payments/accept-a-payment?payment-ui=mobile&platform=react-native)
- [Stripe: webhooks](https://docs.stripe.com/webhooks)
- [Apple: compras dentro de la app y servicios elegibles](https://developer.apple.com/app-store/review/guidelines/#in-app-purchase)

La validación ejecutada y sus límites se registran en `VALIDACION.md`. Una exportación de JavaScript no acredita instalación, cobro LIVE, entrega de webhooks ni prueba física de 3DS.
