# Transcripción de Escaneo

Se implementó un puente local para Google Cloud Vision DOCUMENT_TEXT_DETECTION, que reconoce texto impreso y manuscrito. No está activado sin una credencial. No se ha medido la precisión con documentos reales.

## Activación de desarrollo

1. En un proyecto de Google Cloud con facturación, habilitar Cloud Vision API y crear una clave restringida a esta API. Configurar `GOOGLE_VISION_API_KEY` únicamente en el entorno del servidor. Nunca en variables EXPO_PUBLIC ni en Git.
2. Ejecutar `node --import tsx scripts/ocr-server.ts`. Escucha únicamente en 127.0.0.1:8097; no guarda imágenes ni registra su contenido.
3. Configurar `EXPO_PUBLIC_OCR_URL=http://127.0.0.1:8097/transcribe` en el entorno de Metro y reiniciarlo. Para el emulador de paciente, ejecutar `adb -s emulator-5558 reverse tcp:8097 tcp:8097`.
4. El origen web permitido es http://127.0.0.1:8096; se puede cambiar mediante OCR_WEB_ORIGIN.

Al pulsar Transcribir se envía la imagen a Google a través del puente. La siguiente pantalla muestra el texto completo y conserva la foto; Guardar persiste ambos usando el store existente. Los errores mantienen la captura para reintentar o Usar foto. Cerrar cancela la espera de la app. El proveedor podría terminar una petición ya enviada.

El médico y la institución se sugieren a partir de encabezados explícitos del texto reconocido, mediante reglas conservadoras, no mediante extracción semántica de entidades. Los campos no detectados permanecen vacíos/editables. No interpreta dosis ni completa texto ilegible; toda transcripción debe revisarse contra la foto. Por ahora reconoce la página completa, sin recorte de zonas marcadas.

Este puente es para desarrollo local con datos ficticios. Antes de publicarlo se necesita un servidor HTTPS autenticado, límites por usuario y gestión de credenciales del proveedor; no exponer directamente este servidor de desarrollo. La demo móvil todavía usa almacenamiento local sin cifrar.

Referencias: https://docs.cloud.google.com/vision/docs/handwriting y https://docs.cloud.google.com/vision/docs/reference/rest/v1/images/annotate.
