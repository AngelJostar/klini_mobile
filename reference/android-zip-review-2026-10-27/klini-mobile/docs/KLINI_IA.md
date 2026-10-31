# Klini IA

## Recorrido implementado

Billetera y suscripción muestra el plan de **$99 MXN al mes**. El recorrido permite conocer sus beneficios, revisar el perfil y el método de pago, autorizar el uso de información, activar una demostración y cancelarla. En web se representan Apple Pay y tarjeta; en iOS, App Store; en Android, Google Play. La selección de método no abre una pasarela ni hace cargos.

La activación se guarda después de completar la persistencia local. Es específica del perfil, requiere autorización y no se hereda al cambiar a un familiar. Cancelarla revoca el acceso. Este estado local solo habilita la demo; **no acredita una compra**.

Por petición del responsable de la demo, Sofía Martínez (`patient-sofia`) viene con Klini IA activa. Los perfiles anteriores de Sofía sin configuración de IA reciben este acceso al recuperarse; se conserva su información y cualquier estado explícito de activación o cancelación. Los demás perfiles continúan sin acceso por defecto. Restablecer la demo devuelve a Sofía a su estado inicial activo.

Con el servicio habilitado, el recuadro superior dice Pregunta a Klini y muestra IA. Enviar una pregunta abre una conversación bajo la barra, con mensajes, desplazamiento, un campo fijo para continuar, cierre y accesos al registro o cita cuando corresponde. Cambiar de perfil limpia la conversación. No se persiste el chat.

## Probar sin proveedor

Sin `EXPO_PUBLIC_KLINI_AI_URL`, las respuestas muestran el modo Demostración. Pueden localizar la próxima cita del perfil, mostrar sus medicamentos y citar el texto de los registros recientes. No utilizan un modelo ni interpretan resultados clínicos. La pantalla distingue esta limitación.

## Conectar un modelo en desarrollo local

1. Copiar `.env.ai.local.example` a `.env.ai.local` y completar `OPENAI_API_KEY` y `OPENAI_MODEL` con una clave del servidor y un modelo disponible en ese proyecto que admita Responses y Structured Outputs. El archivo local está excluido de Git. No poner estos valores en variables `EXPO_PUBLIC_*`.
2. Ejecutar `npm run ai:server`. Escucha solamente en `127.0.0.1:8098` y rechaza el modo de producción. No configurar un host público.
3. En el `.env` de Expo, añadir `EXPO_PUBLIC_KLINI_AI_URL=http://127.0.0.1:8098/chat` para web. Ese mismo valor sirve para el emulador Android al ejecutar `adb -s emulator-5560 reverse tcp:8098 tcp:8098`; reemplazar el identificador por el del emulador conectado. Si se configura exclusivamente Android, también puede usarse `http://10.0.2.2:8098/chat`. Hacer una recarga completa de la app tras cambiar la variable. El origen web permitido es `http://127.0.0.1:8096`.
4. Activar la demostración en Billetera, enviar una pregunta y comprobar el indicador IA conectada. Un error de conexión o proveedor permite reintentar; no se sustituye silenciosamente una respuesta fallida por una respuesta de demo.

El servidor carga `.env.ai.local` al iniciarse: después de editar la clave hay que reiniciarlo. `GET http://127.0.0.1:8098/health` informa si hay clave y modelo configurados, sin revelar la credencial ni consultar al proveedor. Configurado no significa que la clave se haya validado. Se preparó localmente `gpt-5.4-mini` como modelo inicial; la conexión real debe comprobarse con una pregunta sin datos clínicos antes de utilizar el expediente de prueba.

La integración usa Responses API con `store: false` y salida JSON validada. Solo permite acciones internas Agenda/Archivo y citas que existan en el contexto. El servidor limita tamaño, concurrencia y tiempo; no registra preguntas, expedientes, respuestas ni claves. La propiedad `store: false` no constituye una promesa de retención cero por parte del proveedor.

El contexto incluye hasta 20 citas futuras del paciente actual, los 20 registros más recientes (hasta 1,200 caracteres por registro), 20 medicamentos activos y ocho mensajes anteriores acotados. Se incluyen nombre y texto registrado; se excluyen los campos de contacto, otros perfiles, archivos adjuntos, URI, pólizas y datos de billetera. La conversación puede contener datos personales escritos por el usuario. El modelo debe citar el documento y fecha al explicar resultados, reconocer datos faltantes y evitar diagnósticos o cambios de tratamiento. La revisión médica sigue siendo necesaria.

## Pasos necesarios para cobrar y operar en producción

La app actual no tiene autenticación clínica ni un backend de suscripciones. No se ha conectado un proveedor de cobros ni una cuenta real de OpenAI durante esta implementación.

- Crear identidad autenticada y autorización de acceso a cada perfil. El servidor debe obtener el expediente desde esa identidad y comprobar su titularidad; no aceptar un expediente o un indicador de compra del cliente como fuente de autorización.
- Configurar el producto mensual de $99 MXN en App Store Connect y Google Play. El precio cobrado debe provenir del catálogo de la tienda; confirmar disponibilidad del importe en cada catálogo. Las compras nativas requieren una compilación de desarrollo, no Expo Go.
- Para checkout web, configurar un proveedor como Stripe con tarjeta y Apple Pay, dominio verificado y credenciales del servidor. Mostrar Apple Pay solo cuando el dispositivo y el proveedor indiquen compatibilidad. No capturar números de tarjeta en estas pantallas.
- Validar recibos y notificaciones de las tiendas o webhooks firmados e idempotentes del proveedor. Habilitar acceso solo tras verificar el pago; manejar pendiente, restauración, renovación, cancelación, expiración y reembolso. El evento de pago nunca debe contener el expediente clínico.
- Implementar una API autenticada para consultar el plan, iniciar la compra, restaurar y conversar. Reemplazar el puente local, verificar la suscripción y la autorización vigente en cada consulta, aplicar cuotas y conservar el consentimiento versionado en el servidor.
- Definir los términos y el aviso de privacidad del servicio antes de cobrar. El material clínico de las pruebas es ficticio.

Referencias técnicas: [OpenAI Responses](https://developers.openai.com/api/docs/guides/migrate-to-responses), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [seguridad de OpenAI](https://developers.openai.com/api/docs/guides/safety-best-practices), [compras en Expo](https://docs.expo.dev/guides/in-app-purchases/), [suscripciones digitales de Apple](https://developer.apple.com/app-store/review/guidelines/#in-app-purchase).
