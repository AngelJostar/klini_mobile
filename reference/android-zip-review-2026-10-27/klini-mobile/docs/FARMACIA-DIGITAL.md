# Farmacia digital móvil · 11 noviembre 2026

## Proyecto y separación
Esta implementación corresponde a la aplicación vigente en `reference/android-zip-review-2026-10-27/klini-mobile` (Expo 58 según package.json). Los cambios administrativos viven en el repositorio Laravel Dr. Sam, no en las pantallas móviles. La conexión del catálogo se configura mediante la variable pública de farmacia descrita abajo y conserva la separación respecto de los pagos existentes.

## Abrir
Desde Inicio abre el menú y **Farmacia digital**. **Programas de apego** abre la pestaña Apego de la misma tienda. La ruta Expo Router directa es `/pharmacy` o `/adherence-programs`.

Sin `EXPO_PUBLIC_PHARMACY_API_URL`, se muestra claramente **Demostración · Sin compras ni cargos reales**. Catálogo, carrito, pedidos, favoritos y solicitudes de programa son ficticios. Carrito/pedidos/programas se conservan por perfil mediante la cola del store; nunca se guardan recetas reales. La receta demo es solo una casilla de ejemplo.

## Conectar a administración
Configura fuera del repositorio, en el entorno público de Expo:
`EXPO_PUBLIC_PHARMACY_API_URL=http://IP_LAN_DEL_SERVIDOR:8000/api/mobile/v1`.
Para una instalación remota usa HTTPS. No pongas tokens o contraseñas en variables EXPO_PUBLIC. En desarrollo, después de editar el archivo `.env` estándar que carga Expo, realiza una recarga completa de la app mediante **Reload**; ese cambio no exige reiniciar Metro ni borrar su caché. Ver [variables de entorno en Expo](https://docs.expo.dev/guides/environment-variables/#reading-environment-variables-from-env-files). La dirección 127.0.0.1 sirve en el propio equipo, no desde el teléfono.

En modo conectado:
- El catálogo usa exclusivamente productos publicados por distribuidores autorizados; error, vacío y farmacia deshabilitada no se sustituyen silenciosamente con datos demo.
- Nombre, subtítulo, banner, color de precios, entrega, envío y términos provienen de la configuración administrativa.
- La sesión se inicia con una cuenta de paciente y vive solo en memoria. Cerrar/cambiar perfil o cerrar sesión revoca el token de forma best-effort, y elimina el estado local vinculado a la cuenta. Si la red impide revocarlo, no se reabre la sesión ni se conserva el token local.
- Enviar solicitud usa precios/importes validados por servidor y una clave UUID estable durante reintentos del mismo contenido. No confirma pago, reserva de stock ni dispensación.
- El modo conectado no procesa tarjetas ni Apple Pay. La opción administrativa checkout_available no se interpreta como cobro implementado.
- Receta PDF/JPG/PNG hasta 8 MB: se selecciona, se muestra el nombre, se solicita consentimiento explícito y solo al pulsar Enviar se transmite a Klini. El archivo queda pendiente de revisión. Alternativamente puede utilizarse el folio de una receta propia existente. No se persisten URI/bytes/tokens en AsyncStorage; el selector nativo usa caché temporal.
- Los programas reales de apego, canal de soporte y cancelación conectada permanecen explícitamente no habilitados. No se muestran acciones falsas como realizadas.

## Interfaz y controles
Incluye catálogo/búsqueda/filtros, selección de distribuidor y precio, carrito con cantidades y eliminación, cupón con aviso honesto de no disponibilidad, dirección/entrega, selección de pago ficticia, términos, revisión/confirmación, pedidos/recompra, ayuda, inscripción y solicitudes de apego demo. La descripción extendida dejó de ser un paso del flujo. Atrás y Escape regresan al paso anterior; cerrar descarta borradores efímeros y conserva solo datos demo ya guardados. Durante persistencia/envío se bloquean cierres y acciones duplicadas. El paso siguiente no recibe accidentalmente el segundo clic de una confirmación doble.

## Selección de distribuidor y precio Klini independiente — 12 de noviembre de 2026

Tocar una tarjeta, su imagen/nombre, su botón + o la promoción abre **¿Quién te lo entrega?** sobre el catálogo, siguiendo la referencia del usuario trabajada con Runway (tarea `49818dff-d3ae-41f8-909d-c12ae664deb6`). Muestra miniatura, presentación, precio por unidad en MXN y radios con vendedor/precio. Solo **Agregar al carrito** confirma una unidad; la cantidad se ajusta desde el carrito. X/fondo/Atrás/Escape cancelan; el fondo queda inerte, el foco web permanece dentro del diálogo y vuelve al control original al cerrar. La lista admite desplazamiento en alturas pequeñas.

Se presenta una oferta Klini identificada explícitamente y hasta tres distribuidores distintos disponibles, en el orden del catálogo. El marcador `provider.is_klini` proviene de configuración administrativa; no se deduce del nombre ni del precio mínimo. Si Klini no tiene oferta, aparece **Precio por configurar** deshabilitado. Una oferta Klini configurada sin stock conserva su precio con **Agotado**. Sin ofertas se informa que el precio no está disponible, sin presentar un cero ficticio. Se conserva el aviso de receta cuando corresponde.

El cliente consume `catalog_items[].offers[]` por identidad canónica exacta. Los productos anteriores sin vínculo universal permanecen separados; no se agrupan por parecido del nombre. El carrito guarda únicamente la oferta concreta, su ID, vendedor, precio y existencias; dos distribuidores del mismo producto son líneas distintas. Carrito/revisión/pedido muestran al vendedor. Recomprar busca esa misma oferta disponible, sin sustituirla por otra cuenta. El servidor sigue recalculando precios y disponibilidad al enviar: esta pantalla no bloquea una cotización ni habilita cobros.

### Administración del precio de Klini

En el backend local quedó instalada la migración aditiva `2026_11_12_000008_configure_klini_pharmacy_seller.php` (solo FK nullable). En **Superadministrador → Farmacia digital → Presentación**, el control **Distribuidor de venta Klini** identifica una cuenta distribuidora existente y activa. En **Ofertas Klini** el superadministrador edita el precio MXN de sus ofertas existentes, independiente de los otros distribuidores. La elección de cuenta no cambia su nombre ni activa publicación. Las ofertas se crean desde su panel de distribuidor y conservan las autorizaciones existentes de publicación/estado/stock.

La instalación no asignó una cuenta Klini, no creó ofertas ni cambió precios. La lectura posterior del catálogo público local confirmó 34 productos anteriores, cero artículos universales publicados y `klini_provider_id=null`. Para comparar alternativas del mismo artículo en ese catálogo, cada distribuidor debe publicar su oferta vinculada al mismo producto universal. Hasta configurar la oferta propia, la fila Klini permanece deshabilitada. La demo aislada sí incluye cuatro ofertas ficticias por producto, con protector solar a $320 Klini, $305 Farmasoma, $310 Surtiplaza y $330 Distribuidor C.

Los campos nuevos del estado son opcionales: carritos y pedidos anteriores conservan compatibilidad al hidratar. La compra demo valida IDs/precios/existencias contra sus ofertas autoritativas; no acepta precios arbitrarios. Los pedidos conectados conservan el indicador histórico `provider_is_klini` y el cliente comprueba que la respuesta corresponda a las ofertas/cantidades enviadas. Una respuesta inconsistente no confirma el envío ni vacía el carrito.

Las pantallas usan componentes reales, no capturas como interfaz. Las imágenes del catálogo usan URL validada y `contain` para mostrar el producto completo. Si falta la fotografía o falla su carga, se muestra un icono neutro con **Sin imagen**, sin inventar la apariencia de ese producto. Las 16 referencias del ZIP se revisaron visualmente en el contexto de trabajo. Los archivos de referencia no se copiaron al proyecto debido a una incompatibilidad de transferencia en Windows.

## Fotografías, proveedor y filtros · actualización verificada en web

Se generaron cuatro fotografías ficticias independientes para la demo mediante la herramienta integrada `image_gen`, una llamada por producto, sin API key ni CLI. Los PNG originales están en `assets/pharmacy-demo/`: `protector-solar-fps50-50ml-v1.png`, `gel-limpiador-turquesa-200ml-v1.png`, `tiras-glucosa-50-piezas-v1.png` y `medicamento-a-20-tabletas-v1.png`. Todos miden 1254×1254 y conservan alpha RGBA real, con esquinas totalmente transparentes y sombra sutil. No representan marcas o medicamentos reales. [El manifiesto](../assets/pharmacy-demo/pharmacy-demo-manifest-v1.json) registra los prompts íntegros, procedencia, hashes, dimensiones y comprobación de transparencia.

El contrato móvil conserva los metadatos opcionales `provider.id` y `provider.name` del catálogo; no deduce un proveedor a partir de la fotografía. Las fotos llegan al modo conectado mediante `image_url`, sujeta a la validación de URL existente.

Se completaron desde la interfaz administrativa, sin scripts de inserción en la base de datos, cuatro altas de **productos ficticios para demostración**, activos y asociados al proveedor 6, **Distribuidor de Medicamentos**:

| ID | Producto de demostración | Precio MXN | Receta |
| --- | --- | --- | --- |
| 2 | Protector solar FPS 50 | $320; anterior $360 | No |
| 3 | Gel limpiador | $180 | No |
| 4 | Tiras de glucosa | $240 | No |
| 5 | Medicamento A | $210 | Sí |

La lectura de la API LAN en el puerto 8002 confirmó farmacia habilitada y esos cuatro productos con `image_url` del mismo servidor, mediante `/api/mobile/v1/pharmacy/products/{id}/image`. Se configuró únicamente `EXPO_PUBLIC_PHARMACY_API_URL` en `.env.development.local`, ignorado por Git; se conservaron los demás valores. Las cuatro imágenes servidas devolvieron PNG y sus hashes coincidieron con los assets originales; evidencia en [api-image-verification.json](../test-results/pharmacy-live-catalog/api-image-verification.json). Las altas administrativas y la prueba web no implican una compra, dispensación o prueba física en el teléfono.

En esta sesión se reinició la vista previa de QA 8097 por caché desactualizada y aislamiento de red de la vista previa inicial. Metro principal 8096 se reinició para recoger la nueva configuración. Ambos devolvieron estado HTTP 200. Una lectura del bundle iOS en 8096 confirmó HTTP 200 y la inclusión de la URL configurada y `pharmacy-filter-popup`, sin imprimir su contenido. Es una comprobación del servidor, no una ejecución física en iPhone. Este reinicio observado no cambia la instrucción general de Expo: editar un `.env` estándar permite ver los nuevos valores públicos mediante una recarga completa.

El popup de filtros implementa **Especialidad**, **Tipo de producto** y **Laboratorio**, con valor **Todos** y opciones derivadas del catálogo; también **Solo promociones** y **Programas de apego**. Edita un borrador separado: aplicar cambia los filtros, mientras cerrar descarta los cambios del popup. La búsqueda se combina con los filtros y **Borrar filtros** restablece la selección.

QA web conectada al catálogo LAN aprobada a 390×844 y 320×640: cuatro productos del proveedor 6, cuatro fotos decodificadas a 1254×1254, acceso a los cuatro detalles, filtro por laboratorio y limpieza de filtros. Sin desbordamiento, errores de página/consola, solicitudes fallidas ni escrituras durante la prueba. [Resultado](../test-results/pharmacy-live-catalog/result.json); capturas `catalog-390.png` y `filters-390.png` de esa carpeta inspeccionadas visualmente. Backend: 37 pruebas y 438 aserciones aprobadas, con revisión independiente sin hallazgos reportados.

Límite: se sirvió el bundle iOS con HTTP 200, pero no se recorrió esta actualización en un iPhone. Las fotografías/filtros actuales son posteriores al build11 existente y no están incluidos en ese binario ya compilado. Los resultados anteriores de esta guía conservan su alcance histórico.

## Ampliación del catálogo del distribuidor demo: 30 altas adicionales

Se crearon 30 fichas desde los formularios del panel de **Distribuidor de Medicamentos**, con su cuenta demo existente y publicación ya autorizada. Son presentaciones en paquetes: ocho de protector solar FPS 50 (2–9 tubos de 50 mL), ocho de gel limpiador (2–9 frascos de 200 mL), ocho de tiras de glucosa (2–9 frascos de 50 piezas) y seis de Medicamento A (2–7 cajas de 20 tabletas). La descripción aclara que la foto ilustra una unidad y que se trata de productos ficticios. No se incorporaron marcas, principios activos ni indicaciones terapéuticas nuevas.

El catálogo queda en **34 productos**, todos del proveedor 6. Los cuatro productos originales se conservaron. Hay 16 promociones en total, tres presentaciones nuevas sin existencias para ejercitar ese estado, y siete fichas con requisito de receta incluyendo Medicamento A original. Cada ficha tiene precio por paquete, existencias y foto vinculada al producto, guardada desde el panel; no se usaron inserciones directas en la base de datos.

La revisión por lectura confirmó 34 PNG con respuesta 200 y hashes correspondientes a sus familias, cero fotos faltantes, nombres únicos y concordancia entre el catálogo completo y la paginación de productos (24 + 10). Los metadatos permanecieron idénticos durante la revisión de imágenes. Evidencia en `test-results/pharmacy-expanded-catalog/api-result.json`, `admin-creation-manifest.json` e `image-assignment-review.json`. La búsqueda «Paquete» del simulador Android mostró los 30 productos adicionales. No se crearon pedidos ni pagos, ni se modificó código de la app o del servidor para esta ampliación.

## Pruebas

- `npm run typecheck`
- `npm run lint` (documentar errores previos por separado)
- `npm test`
- `node --import tsx scripts/verify-pharmacy.ts` requiere una vista previa **demo** en localhost:8097 y Chrome instalado; usa perfil aislado y datos ficticios, bloquea llamadas externas y POST.
- `node node_modules/expo/bin/cli export --platform android --output-dir .expo/pharmacy-android --max-workers 2`
- `node node_modules/expo/bin/cli export --platform web --output-dir .expo/pharmacy-web --max-workers 2`

Las exportaciones generan JavaScript/recursos, no APK/IPA ni publicación. Pruebas nativas en iPhone/Android, conexión de red desde teléfono, permisos del selector y revisión farmacéutica real requieren validación separada. No se hicieron compras ni envíos a distribuidores durante QA.

## Farmacia digital · validación final del 11 de noviembre de 2026

- TypeScript global aprobado. Suite completa: **420/420 pruebas** aprobadas.
- ESLint de archivos de farmacia, store, rutas y pruebas: cero errores; una advertencia anterior en store.tsx. Lint global: conserva cinco errores y tres advertencias previos en Directorio, Teleconsulta y store, sin errores nuevos de farmacia.
- Demo web a 390×844 y 320×640: catálogo/filtros/vacío, detalle, carrito, dirección, selección de pago ficticia, fallo de persistencia y reintento, doble confirmación con un solo pedido, cancelación demo, programas de apego, receta ficticia, recarga persistida, Escape y ausencia de desbordamiento. Cero errores JavaScript y cero POST externos. Evidencia test-results/pharmacy/web-result.json; capturas de catálogo, filtros y pedido inspeccionadas.
- QA conectada con respuestas simuladas locales: once grupos aprobados, incluyendo receta pendiente, UUID estable al reintentar resultado incierto, cambio de cuenta sin datos de la anterior, nuevo UUID por cuenta, almacenamiento sin información privada/tokens, términos, cierre con revocación y login tardío revocado tras desmontar. También catálogo vacío/deshabilitado/error sin fallback demo. Cero errores y tráfico externo. Evidencia test-results/pharmacy-connected/result.json. No fueron solicitudes a distribuidores reales.
- Exportaciones de JavaScript/recursos Android, iOS y web repetidas después de las correcciones finales y aprobadas: .expo/pharmacy-android, .expo/pharmacy-ios, .expo/pharmacy-web. **No generan APK/IPA, no constituyen una prueba nativa y no se publicaron**.
- git diff --check aprobado. No se cambiaron archivos de entorno ni pagos existentes.
- Pendientes: recorrido en teléfono/emulador, red desde teléfono y selector nativo; pagos/dispensación, programas y soporte conectados no se presentan como implementados. Ver FARMACIA-DIGITAL.md para configurar la API y distinguir demostración de solicitudes reales.

## Corrección visual: farmacia sobre Inicio (11 de noviembre de 2026)

- PharmacyScreen conserva la ruta transparente existente y presenta un solo panel vertical blanco, sin fondo opaco ni cabecera Klini duplicada. Empieza después del área segura y los 68 px del encabezado real de Inicio. Logo, Hoy/Archivo y avatar permanecen al fondo; al cerrar se conserva la pestaña anterior.
- Cabecera con Volver, título, bolsa/contador y Cerrar; catálogo compacto con promoción, precio anterior y agregar; Comprar de nuevo permanece abajo. Producto, carrito, receta, dirección, confirmación, pedidos y Apego reutilizan el mismo marco sin animar una pantalla nueva en cada paso. Filtros/pago/condiciones se superponen dentro del panel, sin Modal nativo adicional.
- Se conservaron las operaciones de dominio, API, persistencia, precios y separación demo/conectado. Durante una operación pendiente los handlers impiden cerrar o regresar. No se modificaron Inicio, rutas, componentes compartidos, pagos ni configuración de servicios.
- Validación: TypeScript y ESLint de los archivos modificados aprobados; 420/420 pruebas; QA demo completa a 390×844 y 320×640; QA conectada con once grupos simulados locales, sin tráfico externo; nueva prueba scripts/verify-pharmacy-layout.ts a 372×637, 390×844 y 320×640 (geometría, fondo real, pestaña conservada, agregar destacado, regresar, filtros, cierre, reapertura, fondo, historial atrás/adelante, Escape y Apego). Capturas inspeccionadas en test-results/pharmacy-layout; resultados en result.json. Cero errores JavaScript.
- Exportación final Android/iOS/web aprobada en .expo/pharmacy-layout-final. No es una compilación APK/IPA ni una prueba nativa. Lint global conserva cinco errores y tres advertencias anteriores en DirectoryFlow, TeleconsultScreen y store.
- El servidor de pruebas 8097 tuvo caché desactualizado y se reinició de forma aislada. El servidor principal 8096 y la sesión del usuario no se reiniciaron. La verificación visual en emulador/dispositivo queda pendiente: el control nativo no está disponible en esta sesión. No se enviaron pedidos, recetas, compras ni pagos reales.

Comprobación del servidor principal al terminar: una lectura del bundle iOS en el puerto 8096 devolvió HTTP 200 con el nuevo pharmacy-popup, sin la cabecera ficticia ni referencias de código rotas. La consulta posterior Android falló; al comprobar de nuevo ya no había proceso ni puerto 8096 escuchando. No se determinó la causa, no se envió reload y no se detuvo ni relanzó ese servidor. Para ver la corrección en el development build hace falta volver a iniciar Metro 8096 en este proyecto y abrir/recargar la conexión desde el dispositivo. La exportación final de las tres plataformas permanece validada. La animación web sin Reducir movimiento se verificó entrando verticalmente desde y≈420 hasta y=68.
