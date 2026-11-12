# Apple Salud — primera etapa

Estado del código revisado el 9 de noviembre de 2026: [comparación con los avances de DOT y ajuste de disponibilidad por plataforma](APPLE-SALUD-COMPARACION-2026-11-09.md). Las secciones de instaladores que siguen documentan su validación histórica; esta revisión no genera un nuevo IPA.

Implementado en la app de revisión que contiene Parámetros corporales (esta carpeta), no en el proyecto distinto de la raíz del repositorio. Su package.json actual declara Expo 58 y React Native 0.88.0; no se cambió el SDK. La referencia anterior a SDK 55 corresponde al otro proyecto.

## Estado actual de instalación

### Instalador vigente: versión autónoma 1.0.0 (3)

Build **d9f4601b-6210-4055-a98e-60d37300ae46**, terminado **FINISHED** el 5 de noviembre de 2026 a las 01:05:33 UTC. Instalar la actualización desde Safari del iPhone registrado: https://expo.dev/accounts/guillermogherzigs-team/projects/klini/builds/d9f4601b-6210-4055-a98e-60d37300ae46 . Puede requerir iniciar sesión con la cuenta Expo autorizada del proyecto. No se publicó en App Store ni TestFlight y no se abrió ningún túnel.

El perfil standalone es distribución interna, developmentClient false, iOS Release y dispositivo físico. Reutiliza el certificado y perfil ad hoc existentes; el perfil contiene un iPhone. Conserva el bundle mx.klini.review y requiere iOS 16.4 o posterior. La inspección del IPA confirmó main.jsbundle embebido (4.455.915 bytes), el selector apple-health-options-popup incluido y ausencia de EXDevLauncherController en el ejecutable. No necesita Metro para cargar su JavaScript. Su apertura física y la lectura de Salud todavía deben confirmarse en el iPhone.

HealthKit continúa firmado y habilitado, con descripción de lectura presente, descripción de escritura ausente y sin entrega de Salud en segundo plano. get-task-allow es false. El verificador de enlace nativo devuelve passed true, sin bibliotecas embebidas ausentes ni imports fuertes de ExpoModulesCore sin resolver. Evidencia: .expo/standalone-ipa-verification.json y .expo/standalone-linkage.json.

El perfil desactiva dotenv y la serialización de variables del cliente con EXPO_NO_DOTENV=1 y EXPO_NO_CLIENT_ENV_VARS=1. EAS confirmó la configuración resuelta y ausencia de variables Plain text/Sensitive en preview. La exportación Release previa y el análisis de los 159 archivos del IPA (38.602.723 bytes descomprimidos), comparando en memoria las credenciales y endpoints configurados localmente sin imprimir sus valores, no encontraron coincidencias. Evidencia: .expo/standalone-secret-preflight.json y .expo/standalone-secret-scan.json. No equivale a una auditoría exhaustiva de todo secreto posible.

Privacidad verificada: internalDistributionBuildPrivacy es PRIVATE. La API de Expo rechaza la consulta anónima del nuevo build con UNAUTHORIZED_ERROR y no devuelve datos ni URL. Sin embargo, una vez conocido el enlace directo del IPA, tanto el anterior como el nuevo respondieron mediante redirecciones al CDN con HTTP 200 sin sesión. PRIVATE restringe la obtención del enlace por la API/proyecto, pero no impide reutilizar enlaces directos ni redistribuir el archivo ya obtenido. La firma ad hoc limita la instalación al iPhone registrado, no cifra el código. Se entrega la página privada del build, no el enlace directo del archivo. Evidencia: .expo/standalone-download-privacy.json.

Pruebas: TypeScript y 183 pruebas aprobados. Lint global ejecutado: cinco errores y tres advertencias preexistentes (.expo/standalone-final-lint.log); no se modificaron los archivos que los generan. El paquete enviado fue inspeccionado: 232 archivos, sin entornos, credenciales, perfiles ni registros de cierre. La compilación iOS y el análisis final del artefacto aprobaron.

Limitaciones: IA conserva el modo demostración existente al no configurarse un endpoint remoto. El OCR indica que falta activar el servicio y permite continuar con la foto. Ninguno de los servicios locales pasó a estar accesible por internet. Salud lee directamente en el iPhone con autorización del propietario. Esta app autónoma requiere un nuevo instalador para incorporar futuros cambios nativos o de JavaScript; no se configuró ni publicó OTA.

### Historial: versiones de desarrollo

**Versión de desarrollo 1.0.0 (2)**. Build `dcb8f53f-905d-401c-b2ca-fa2f85b6febd` terminado **FINISHED** el 4 de noviembre de 2026 a las 18:26:47 UTC. Instalar la actualización desde Safari del iPhone: https://expo.dev/accounts/guillermogherzigs-team/projects/klini/builds/dcb8f53f-905d-401c-b2ca-fa2f85b6febd . Mantiene el bundle, certificado y perfil ad hoc del iPhone. Abrir Klini y conectar a Metro `http://192.168.100.250:8099`. Falta confirmar apertura y lectura real de Salud en el dispositivo.

La versión 1.0.0 (1) descrita abajo tiene un fallo DYLD confirmado; su compilación exitosa no acreditó que abriera en el iPhone. El registro proporcionado por el propietario identifica un símbolo Swift de ExpoModulesCore ausente al cargar ExpoCamera. La verificación del IPA anterior reproduce el mismo problema en ExpoCamera y ExpoFileSystem (`.expo/apple-health-linkage-before.json`). No usar el build 1 como instalador corregido.

Se alinearon los parches recomendados por `npx expo install --fix` dentro del SDK 58: Expo 58.0.23, Core 58.0.30, autolinking 58.0.17, dev client 58.0.18 y RN 0.88.1. `package-lock.json` actualizado. `expo.autolinking.ios.buildFromSource: [".*"]` en package.json obliga a compilar módulos iOS desde fuente, evitando la mezcla de frameworks precompilados con APIs Swift distintas. El resolvedor devuelve `configuration.buildFromSource: [".*"]`. Referencia oficial: https://docs.expo.dev/guides/prebuilt-expo-modules/ . No se cambió de SDK ni se tocaron proyectos nativos a mano.

Validación posterior: dependencias compatibles según verificación online, expo-doctor 20/20, TypeScript aprobado y 183 pruebas aprobadas. Lint general conserva cinco errores y tres advertencias previos. Se añadió `scripts/verify-ios-linkage.py`, sin dependencias externas, que inspecciona bibliotecas embebidas e imports fuertes de ExpoModulesCore sin imprimir identificadores del iPhone. Ejecutado contra el build 1 devuelve `passed: false` y los dos imports ausentes del registro. El build 2 se lanzó con caché limpia y firma existente. Metro 8099 se reinició con las versiones nuevas sin detener Expo Go 8097 ni Klini IA 8098.

**Verificación del build 2:** los logs de Pods confirmaron `All modules will build from source`, y Fastlane compiló ExpoModulesCore y ExpoCamera desde sus fuentes. `python scripts/verify-ios-linkage.py .expo/apple-health-development-build2.ipa` devuelve `passed: true`, cero bibliotecas embebidas ausentes y cero imports fuertes de ExpoModulesCore sin resolver. Evidencia: `.expo/apple-health-linkage-after.json`; el mismo verificador reproduce el fallo del IPA anterior. La inspección del ejecutable firmado confirma HealthKit habilitado y entrega de Salud en segundo plano ausente; conserva descripción de lectura, no solicita escritura, y enlaza Cámara y el lanzador de desarrollo. Bundle `mx.klini.review`, build `2`, mínimo iOS 16.4. Evidencia sin identificadores del dispositivo: `.expo/apple-health-ipa-build2-verification.json`. Esto corrige el enlace binario implicado en el registro; la prueba de apertura física y permisos sigue pendiente del propietario.

La firma está configurada: certificado existente reutilizado y perfil ad hoc activo con el iPhone registrado. El build corregido `36df3e49-41ef-48b1-9e9c-aa1589304b49` terminó **FINISHED** el 4 de noviembre de 2026 a las 16:30:56 UTC. EAS confirmó `Archive Succeeded` y la firma de `Klini.app`. Es distribución INTERNAL para iPhone físico, versión 1.0.0 (1). El primer build falló por un nombre de target discrepante; `expo.name: Klini` corrigió ese problema sin cambiar la identidad iOS.

Instalar desde Safari en el iPhone registrado: https://expo.dev/accounts/guillermogherzigs-team/projects/klini/builds/36df3e49-41ef-48b1-9e9c-aa1589304b49 . Usar la opción de instalación de esa página; abrir directamente un `.ipa` en Safari puede descargar el archivo en lugar de instalarlo. No se publicó en App Store ni TestFlight.

Se descargó e inspeccionó localmente el IPA generado: bundle `mx.klini.review`, nombre `Klini`, mínimo iOS 16.4, descripción de lectura de Salud presente y descripción de escritura ausente. El perfil contiene un dispositivo. La inspección del bloque de entitlements del ejecutable firmado confirmó `com.apple.developer.healthkit: true` y ausencia de `com.apple.developer.healthkit.background-delivery`. El perfil permite más capacidades que la app; la comprobación del ejecutable confirma que la app no solicita entrega de Salud en segundo plano. Evidencia sin identificadores del dispositivo: `.expo/apple-health-ipa-verification.json`. La instalación y las lecturas reales todavía no se han verificado en el teléfono.

Metro para la versión de desarrollo está preparado en `http://192.168.100.250:8099`, con respuesta HTTP 200 al manifiesto iOS y `/status` correcto. No se detuvieron Expo Go (8097) ni Klini IA (8098). Tras instalar el build terminado, abrir **Klini** desde su icono y seleccionar o introducir la URL de Metro; luego Archivo → Parámetros corporales → Apple Salud. El iPhone y la computadora deben poder comunicarse por la red local. No se modificaron reglas de firewall ni ajustes del teléfono. Instalar y conceder los permisos en Salud siguen siendo acciones del propietario.

### Diagnóstico posterior a instalación

El propietario informa que la app abre y se cierra inmediatamente, incluso con Modo de desarrollador activado y el iPhone reiniciado. Se confirmó de nuevo que Metro responde por loopback y por la IP LAN, puerto 8099, y que generó el bundle iOS sin error de empaquetado. La advertencia de caché de Metro indica recuperación mediante full crawl y no impidió servir el manifiesto ni generar el bundle; no demuestra la causa del cierre nativo.

El IPA contiene el lanzador de desarrollo, esquemas `klini-review` y `exp+klini`, descripción de red local y Bonjour. Las nueve dependencias dinámicas `@rpath` del ejecutable están incluidas en Frameworks; la revisión estática no detectó una biblioteca ausente. Esto no verifica carga en el dispositivo ni descarta un fallo en inicialización nativa o JavaScript. No se encontraron herramientas locales `idevice_id`, `idevicesyslog` o `idevicecrashreport` para recoger el diagnóstico del iPhone desde este equipo.

Próximo dato necesario: el registro `.ips` de **Klini** inmediatamente posterior a reproducir el cierre, desde Ajustes → Privacidad y seguridad → Análisis y mejoras → Datos del análisis. Compartir únicamente el registro reciente de Klini, no todos los diagnósticos del teléfono. Si no aparece, esperar unos minutos tras reproducir y volver a buscar. La excepción y los threads de ese registro permiten distinguir fallo de carga, aborto nativo o error del runtime. No se modificó código ni se lanzó otro build por conjetura, ni se alteraron certificados durante este diagnóstico.

## Alcance

### Túnel de desarrollo: preparado, aún sin abrir

El propietario eligió usar la app desde otra red mediante túnel. Se instaló `@expo/ngrok` como dependencia de desarrollo con `npx expo install --dev @expo/ngrok`, desde npm, según la documentación oficial de Expo CLI. No agrega un módulo a la app instalada y no requiere recompilar iOS.

`npm run start:tunnel` usa `scripts/start-dev-tunnel.cjs`: servidor separado en 8102, `--dev-client --tunnel --clear`, sin cargar dotenv y eliminando variables públicas/credenciales heredadas del proceso hijo. Las URLs y el token de IA/OCR quedan vacíos en ese servidor. No altera los servidores LAN existentes ni expone el backend 8098; Klini IA real y OCR locales no quedan accesibles por este túnel. Apple Salud lee en el iPhone mediante HealthKit, pero la carga del JavaScript sí requiere el túnel y la computadora encendida/conectada.

La apertura pública fue **rechazada por revisión automática antes de ejecutarse**: elegir «Conexión por túnel» no se consideró autorización explícita para exponer el servidor/bundle privado a un tercero y a cualquiera que obtenga el enlace. Se comprobó el historial y no había autorización adicional de ese alcance. No se reintentó ni se inició el servidor 8102. No hay URL o QR de túnel, ni prueba desde otra red. Pendiente: consentimiento explícito para publicar temporalmente el servidor y el código de desarrollo mediante ngrok/Expo; después verificar el manifiesto, enlace custom iOS, ausencia de secretos en bundle y prueba del propietario desde el iPhone.

Fuentes: https://docs.expo.dev/more/expo-cli/#tunneling y https://docs.expo.dev/guides/environment-variables/#disabling-environment-variables . Expo advierte que las URLs de túnel son públicas; el subdominio aleatorio no equivale a autenticación.

### Selección en popup

La fila principal conserva «Conectar con Apple Health», el botón de información y el switch. Al activar el switch en iPhone compatible se abre `AppleHealthOptionsPopup`, una tarjeta vertical sobre fondo atenuado con las cinco categorías y Conectar / actualizar. Esos controles ya no se despliegan entre los registros corporales.

El popup respeta áreas seguras y permite desplazarse en pantallas pequeñas u horizontal. Se cierra con X, fondo exterior o navegación Atrás; en web aislada también con Escape. Al cerrar, la fila vuelve a su estado apagado (el switch indica opciones abiertas, no permisos concedidos). Las categorías elegidas se conservan durante la misma visita a Parámetros; las lecturas se borran al cerrar. El fondo queda sin interacción y fuera del árbol accesible mientras el popup está abierto. No se añadió otro Modal nativo.

La autorización granular sigue requiriendo pulsar Conectar; abrir el switch y seleccionar categorías no consulta HealthKit. Sin categorías el botón queda desactivado. La lectura, mensajes, fuente/fecha, borrado al ir al fondo y ausencia de persistencia/envío se mantienen. Los módulos nativos, la firma y la configuración no cambiaron: **no requiere otro build** para el cliente de desarrollo instalado; recargar desde Metro 8099 recibe el JavaScript actualizado. No se publicó una actualización OTA.

Validación: TypeScript, lint específico y 183 pruebas aprobados; lint global conserva cinco errores y tres advertencias previos. Bundle iOS Hermes generado en `.expo/apple-health-popup-ios`. `scripts/verify-apple-health-popup.ts` prueba los componentes reales en una presentación aislada a 390×844, 320×568 y 844×390: apertura, cinco categorías verticales, selección conservada, X/fondo, Escape, botón desactivado sin categorías y ausencia de desbordamiento. La presentación simula disponibilidad de iOS pero utiliza el servicio web y no accede a HealthKit ni a datos personales. Capturas en `test-results/apple-health-options-*.png`. La app web real conserva el switch no compatible desactivado, popup de información, filtros e historial. La revisión visual y permisos nativos en el iPhone siguen pendientes del propietario.

En Archivo → Parámetros corporales aparece el renglón Conectar con Apple Health. En una compilación de Klini para iPhone que incluya HealthKit, el interruptor muestra las categorías y el botón Conectar / actualizar. HealthKit solicita autorización granular **solo de lectura** para frecuencia cardiaca, reposo, pasos, energía activa y sueño. No se consulta nada antes de pulsar ese botón ni se solicita escritura.

Se muestra la última muestra de cada categoría con valor, unidad, intervalo y fuente real. Pasos y energía son el último intervalo de la fuente, **no totales diarios**. Sueño es el último segmento, con su etapa (incluso despierto o en cama), **no el total de una noche**. No se suman muestras superpuestas de varias fuentes. No hay actualización automática ni en segundo plano.

Apple no permite saber si se otorgó permiso de lectura; una consulta completada no se anuncia como permiso concedido. Datos ausentes o acceso denegado producen el mismo estado sin datos. Un error en una categoría no elimina los resultados de las demás.

Las muestras viven únicamente en el estado del componente. Se borran al cerrar la vista, cambiar de perfil, navegar al historial o pasar la app al fondo. No se guardan en AsyncStorage, expediente ni copias exportadas; no se envían a backend, observabilidad o Klini IA. Borrar la vista no revoca permisos. Para revocarlos: Salud → perfil → Apps → Klini (los nombres pueden variar según iOS).

## Interfaz

El renglón compacto contiene Conectar con Apple Health, el botón de información **i** y el interruptor. La información se abre en un popup centrado sobre Parámetros corporales, con corazón rosa, título Apple Salud y texto dentro de un recuadro claro. Incluye la explicación de lectura voluntaria, conservación de la vista y disponibilidad según plataforma. Se cierra con X o el fondo; también admite Escape en web y la acción Volver en Android, conservando la pantalla de parámetros debajo.

En Android, web y Expo Go el interruptor permanece apagado y desactivado; el botón **i** explica por qué Apple Salud no está disponible en ese entorno. Abrir la información no consulta datos ni solicita permisos.

En una compilación nativa de iPhone compatible, activar el interruptor solo despliega las categorías y el botón Conectar / actualizar Apple Salud. La autorización y lectura comienzan únicamente al pulsar ese botón. Apagar el interruptor oculta las opciones y borra los resultados de esta vista; no revoca los permisos ya concedidos en Salud.

## Dependencias y configuración

- `@kingstinct/react-native-healthkit` 16.2.0, core 16.2.0, `react-native-nitro-modules` 0.37.2, instalados con `npx expo install`; lock actualizado.
- HealthKit declara React >=19, RN >=0.79 y Nitro >=0.35. Usa Nitro/JSI y código generado para la arquitectura nueva. Esto satisface los requisitos declarados del proyecto; no demuestra compilación nativa con RN 0.88.
- Plugin oficial en app.json, explicación en español, `NSHealthUpdateUsageDescription: false`, `background: false`. Introspección confirma HealthKit habilitado sin entitlement de entrega en segundo plano y sin descripción de escritura.
- Carga diferida exclusivamente en iOS; Android/web no importan el módulo nativo. Expo Go muestra un error explicativo sin consultar HealthKit.

## Probar en iPhone

### Estado de preparación y bloqueos (4 de noviembre de 2026)

Actualización del intento de instalación: `eas whoami` confirmó sesión Expo válida con rol Owner en la organización configurada; `eas project:info` confirmó `@guillermogherzigs-team/klini` y el ID existente. `eas device:list --json` respondió `No Apple teams found for account guillermogherzigs-team`; esto no verifica ni invalida la membresía Apple del propietario, solo muestra que EAS no tiene un equipo asociado disponible.

Revisión posterior autorizada expresamente por el propietario: se reintentó una sola vez `eas credentials --platform ios` y esta vez el menú abrió correctamente. Se seleccionó `development`, se omitió el inicio de sesión Apple para consultar el estado EAS y se confirmó: proyecto `@guillermogherzigs-team/klini`, bundle `mx.klini.review`, **`No credentials set up yet!`**. Se abrió únicamente el submenú Build Credentials para leer las opciones; no se seleccionó ninguna operación de configuración, asociación, creación o borrado. Se canceló la sesión de terminal.

El siguiente cambio persistente propuesto por EAS es **`All: Set up all the required credentials to build your project`**. Para continuar hace falta confirmación específica para configurar la firma de `mx.klini.review`: reutilizar o crear un certificado de distribución y un perfil ad hoc con el iPhone del propietario. La autorización de revisión no equivale a autorizar esas modificaciones. El inicio de sesión Apple y su segundo factor deben completarse por un canal seguro por el propietario; no enviar contraseña ni códigos por chat. No se verificó la membresía ni el equipo Apple solo por disponer del correo de la cuenta. Estado final de este intento: revisión completada, firma sin configurar, build e instalación bloqueados, ninguna credencial creada o alterada, ningún dispositivo registrado y ninguna publicación.

Actualización posterior: el propietario **sí autorizó específicamente configurar la firma, reutilizar o crear el certificado y generar el perfil con su iPhone**. Se abrió EAS Credentials con `development`, se aceptó iniciar sesión Apple y se introdujo únicamente el Apple ID proporcionado por el propietario. EAS solicitó la contraseña; no había sesión Apple reutilizable que evitara ese paso. No se introdujo, leyó ni solicitó la contraseña en chat. Se canceló ese proceso sin autenticar.

Para el ingreso seguro se abrió una terminal PowerShell visible, en esta carpeta, ejecutando `npx --yes eas-cli@latest credentials --platform ios` (PID inicial 33476). El propietario debe seleccionar `development`, aceptar inicio de sesión, ingresar su Apple ID, contraseña y segundo factor directamente en esa terminal. La creación/asociación de firma ya está autorizada; aún no se ejecutó ni confirmó su resultado. La terminal interactiva quedó en manos del propietario; no se capturará su contenido durante la autenticación. Una vez completado el acceso, confirmar el equipo y firma, registrar el iPhone si corresponde y comprobar el resultado antes de reintentar el build. El bloqueo actual es autenticación Apple pendiente de intervención del propietario, no falta de permiso para configurar la firma. No hay todavía enlace de instalación.

Actualización tras el ingreso del propietario y registro del iPhone: la consulta directa de EAS confirmó **un dispositivo registrado**. Se restauró la sesión Apple local existente sin introducir ni leer contraseña o segundo factor. Se reutilizó el certificado de distribución que el propietario acababa de crear; no se creó otro certificado. Se seleccionó el único iPhone registrado y EAS creó y confirmó un perfil **ad hoc activo** para `mx.klini.review`. La sincronización de capacidades devolvió `No updates`. EAS confirmó `All credentials are ready to build`. Se inició un build de desarrollo con `--non-interactive --freeze-credentials --no-wait`; el proceso pasó la preparación de firma y comenzó a comprimir/subir el proyecto. No es una publicación en App Store. La declaración de cifrado continúa sin modificarse en app.json y EAS solo mostró una advertencia, no un bloqueo para este build interno.

Paquete y build: el intento con el repositorio completo preparó 540 MB; se canceló al inicio de la subida (0 MB indicados) y `build:list` confirmó que no se había creado ningún build. Se utilizó el flujo documentado No VCS con `EAS_NO_VCS=1` y `EAS_PROJECT_ROOT` igual a esta carpeta, únicamente en el entorno del comando. Así se aplica la `.easignore` de esta app y no se suben los proyectos ajenos del repositorio. `build:inspect --stage archive` confirmó 228 archivos / 13,06 MB sin comprimir y cero archivos `.env*`, `credentials.json`, `.p12`, `.p8`, `.pem` o `.mobileprovision`. Contiene package.json y AppleHealthPanel. El paquete comprimido de 10,5 MB subió correctamente.

Build de desarrollo creado: `0a9b779d-552f-424a-b2f8-a0f0c390d4de`, inicialmente `IN_QUEUE`. Seguimiento: https://expo.dev/accounts/guillermogherzigs-team/projects/klini/builds/0a9b779d-552f-424a-b2f8-a0f0c390d4de . Aún no equivale a un instalador terminado ni a lectura de Salud probada en el iPhone.

Ese primer build terminó `ERRORED` en `CONFIGURE_XCODE_PROJECT`: `Could not find target 'KliniRevisin' in project.pbxproj`. Los logs de Pods confirmaron que Expo había generado `KliniRevision`. Para corregir la discrepancia de normalización del nombre con acento entre herramientas, `expo.name` se cambió a `Klini`; no se cambió el bundle, scheme, certificado ni perfil. TypeScript aprobó nuevamente y lint global conservó los cinco errores y tres advertencias anteriores (`.expo/apple-health-xcode-name-lint.log`). No se editaron proyectos nativos a mano.

Se inició el build corregido `36df3e49-41ef-48b1-9e9c-aa1589304b49` con el mismo perfil ad hoc y paquete reducido. Seguimiento: https://expo.dev/accounts/guillermogherzigs-team/projects/klini/builds/36df3e49-41ef-48b1-9e9c-aa1589304b49 . También se inició Metro para development client en el puerto 8099, sin detener el servidor Expo Go 8097 ni Klini IA 8098. Logs locales: `.expo/apple-health-metro.log` y `.expo/apple-health-metro-error.log`. La lectura de Salud seguirá requiriendo la instalación y autorización del propietario en el iPhone; ningún dato real de Salud fue consultado en este proceso.

`eas build --platform ios --profile development --non-interactive --freeze-credentials --no-wait` se detuvo: `EAS CLI couldn't find any credentials suitable for internal distribution`. No se obtuvo build instalable. Se añadió `.easignore` para excluir entornos locales, firmas, archivos generados y resultados de pruebas del paquete de compilación. No se imprimió contenido de secretos.

El intento interactivo con credenciales congeladas llegó a la declaración `iOS app only uses standard/exempt encryption?`; se canceló sin guardar una respuesta en app.json. No se debe responder esa declaración ni cambiar `ITSAppUsesNonExemptEncryption` sin revisar y confirmar el alcance con el propietario.

La revisión automática rechazó ejecutar `eas credentials --platform ios` porque ese menú puede crear/modificar certificados, perfiles o capacidades y aún no existe autorización específica para dichas acciones. El comando rechazado no se ejecutó. No se reintentó por otra vía. Hace falta autorización explícita para abrir la gestión interactiva con alcance de revisión, y confirmación separada antes de cualquier modificación. No se solicitó contraseña por chat, inició sesión Apple, creó firma, registró dispositivo ni publicó.

TypeScript volvió a aprobar. Lint global ejecutado y conserva cinco errores y tres advertencias anteriores (`.expo/apple-health-install-lint.log`).

La pantalla ahora reconoce Expo Go desde el inicio, muestra una explicación específica y oculta selección/conexión de Salud en ese entorno. Los errores de configuración conocidos se conservan; los mensajes crudos de excepciones nativas no se muestran. No es un fallo del emparejamiento del Watch ni algo que se arregle concediendo permisos dentro de Expo Go.

Verificación de esta corrección: TypeScript, lint específico y tres pruebas de lectura aprobados; bundle iOS Hermes aprobado en `.expo/apple-health-ios-setup` (log `.expo/apple-health-ios-setup-export.log`). Lint global ejecutado: cinco errores y tres advertencias anteriores, sin errores nuevos. El mensaje nuevo requiere recargar el JavaScript en el dispositivo; no se operó el iPhone ni se verificó visualmente Expo Go en él.

Preparado: expo-dev-client ~58.0.15, plugin HealthKit y perfil `development` con `developmentClient: true`, `distribution: internal` e `ios.simulator: false`. `npm run start:dev` inicia Metro para el cliente de desarrollo. No se modificaron credenciales, cuenta, identificador iOS ni el proyecto EAS.

Configuración existente: owner `guillermogherzigs-team`, proyecto EAS `e6eec200-1155-4dc5-94d0-4d596afcd755`, bundle `mx.klini.review`. Estos valores no acreditan que la sesión actual tenga acceso al proyecto. No se encontró EAS CLI instalado en el proyecto ni como comando global; `npx eas-cli@latest` puede descargarlo al ejecutarse.

Pendiente de verificar con el propietario antes de compilar:

- Cuenta Expo con acceso al proyecto y sesión válida (`npx eas-cli@latest whoami`, consulta sin iniciar sesión). Si no hay sesión, el propietario debe iniciar sesión explícitamente; no compartir contraseñas ni códigos en el chat.
- Membresía activa Apple Developer y equipo correcto, con acceso al App ID `mx.klini.review` y HealthKit. La distribución ad hoc necesita certificado/perfil válidos y el UDID del iPhone incluido en ese perfil. No se consultó Apple ni se comprobó existencia o vigencia de esas credenciales.
- Autorizar, si hiciera falta, registro del iPhone (`npx eas-cli@latest device:create`), configuración de capacidad HealthKit, generación/renovación de firma y perfil. Esas acciones modifican el portal Apple; no se ejecutaron.
- Autorizar la compilación remota: sube el código del proyecto a Expo y puede consumir cuota. No publica la app, pero no es una operación exclusivamente local. Revisar el contenido enviado y excluir archivos locales sensibles antes de proceder.
- Confirmar disponibilidad de imagen EAS/Xcode compatible con Expo 58, RN 0.88 y Nitro. Los requisitos de pares y el bundle pasan; aún no hay prueba de compilación de Pods/Swift con este conjunto.

Una vez resueltos los requisitos y autorizado el build, ejecutar desde **esta carpeta**:

```powershell
npx eas-cli@latest build --platform ios --profile development
```

Detenerse si ofrece crear credenciales o alterar capacidades sin autorización específica. No usar `submit` ni `update` para esta etapa. Cuando termine, abrir el enlace/QR de instalación **en Safari del iPhone registrado**, instalar Klini y abrir su propio icono. El QR de instalación no es el QR de Metro de Expo Go.

En iOS 16 o posterior, ejecutar una versión interna puede requerir Modo de desarrollador. Es un ajuste de seguridad que el propietario debe decidir y operar personalmente; no se cambió ni se autorizó en este trabajo. Si no desea habilitarlo, valorar separadamente una distribución por TestFlight, que necesita firma y envío autorizados y no se inició aquí.

Después iniciar Metro sin sustituir inadvertidamente el servidor existente en 8097. Por ejemplo, si se elige un puerto libre:

```powershell
npm run start:dev -- --port 8098
```

Abrir la dirección de ese servidor desde el cliente Klini instalado (misma red accesible). Este comando no incorpora HealthKit a Expo Go: primero debe estar instalada la nueva app. No se cambió firewall ni red. Probar inicialmente solo Apple Salud; no enviar consultas ni adjuntos a IA durante la comprobación de mediciones.

Referencias: [creación de development builds](https://docs.expo.dev/develop/development-builds/create-a-build/), [distribución interna y UDID](https://docs.expo.dev/build/internal-distribution/), [proceso y firma iOS](https://docs.expo.dev/build-reference/ios-builds/), [requisito Modo de desarrollador](https://docs.expo.dev/guides/ios-developer-mode/).

1. Desde esta carpeta, ejecutar `npm ci` si se clonó en otro equipo.
2. Revisar la configuración EAS de desarrollo ya existente y la identidad iOS `mx.klini.review`. Usar la cuenta y firma autorizadas del equipo; esta implementación no crea credenciales.
3. Compilar cuando esté autorizado: `npx eas-cli@latest build --platform ios --profile development`. HealthKit requiere una compilación nueva; una actualización JavaScript o Expo Go no lo incorporan. En macOS también puede compilarse mediante `npx expo run:ios --device`.
4. Instalar la compilación en el iPhone registrado. Iniciar `npx expo start --dev-client` y abrir el proyecto desde ese cliente.
5. Comprobar primero que el Watch enlazado produce datos en Salud. En Klini abrir Archivo → Parámetros corporales → Apple Salud; seleccionar categorías y conectar. Autorizar únicamente lo deseado.
6. Verificar en dispositivo real: autorización completa/parcial, rechazo/cancelación, ausencia de muestras, revocación desde Salud, fechas/unidades/fuentes frente a Salud, borrar vista, cerrar y cambiar de perfil, fondo y reintento. No usar mediciones personales en capturas ni logs compartidos.

No se inició EAS, publicación ni firma desde este entorno Windows. Pendientes: compilación iOS, validación nativa y dispositivo físico. No se afirma conexión efectiva con un Watch hasta completar esas pruebas.

## Fuentes técnicas

- https://docs.expo.dev/versions/v58.0.0/
- https://docs.expo.dev/config-plugins/introduction/
- https://github.com/kingstinct/react-native-healthkit (README, tipos y plugin de la versión instalada)

## Validación local

TypeScript y lint específico de los archivos de Apple Salud aprobados. Tres pruebas de contrato comprueban lectura seleccionada después de autorización, cancelación sin consultas, ausencia de datos, fallos parciales, fuente/fecha y distinción de segmentos despiertos. El lint general conserva cinco errores anteriores en DirectoryFlow y TeleconsultScreen, y advertencias anteriores; no se modificaron esos archivos.

El 4 de noviembre de 2026: `npm test` completo aprobó 183 pruebas. El primer intento dentro del sandbox falló en conexiones loopback de pruebas de IA; fuera del sandbox pasaron sin cambiar configuración. Evidencia: `.expo/apple-health-all-tests-unrestricted.log`.

`npx expo export --platform ios --output-dir .expo/apple-health-ios` aprobó y generó bytecode Hermes (1.619 módulos). El primer intento falló por permisos de escritura del temporal de Hermes; fuera del sandbox aprobó. Evidencia: `.expo/apple-health-ios-export-unrestricted.log`. Esto valida el bundle JavaScript, no Pods, Swift, firma ni ejecución nativa.

Exportación web aprobada en `.expo/apple-health-web`. Chrome local en 8097 verificó el panel, explicación de plataforma no compatible, ausencia de botón nativo y ausencia de desbordamiento a 390/320 px; se bloquearon peticiones a hosts externos. Capturas: `.expo/apple-health-web-390.png` y `.expo/apple-health-web-320.png`. No se consultaron ni capturaron mediciones reales.


## Selección persistente y actualización automática — 5 noviembre 2026

Se guarda únicamente `settings.appleHealth` (perfil titular, habilitación, categorías seleccionadas y categorías cuya autorización ya se solicitó). No implica que Apple haya concedido lectura: HealthKit no revela la denegación de lectura. La validación rechaza campos de mediciones en estas preferencias y admite cuentas anteriores sin ellas.

Las categorías activadas aparecen al principio de Parámetros corporales, antes de los registros manuales, con valor, unidad, etapa de sueño cuando corresponde, intervalo de medición y fuente. Una lectura ausente o denegada muestra un estado sin lecturas; cero es un valor válido. Los registros manuales y su historial permanecen accesibles.

La primera activación solicita acceso solo de lectura a las categorías elegidas. Guardar cambios solicita únicamente categorías nuevas. Las consultas automáticas no llaman a autorización. La selección y activación sobreviven al cierre de Klini; desactivar pausa la consulta sin revocar los permisos de Salud. Solo el perfil titular puede vincularse a Salud de este iPhone.

Mientras el listado está montado y la app está activa: consulta inicial, observadores de HealthKit y respaldo cada 60 segundos. Al regresar al primer plano se consulta otra vez. Al salir del listado o pasar a inactive/background se cancelan observadores y temporizadores y se descartan resultados pendientes. No se habilitó entrega en segundo plano. No es tiempo real: depende del registro del Watch y su sincronización con Salud. Pasos, actividad y sueño siguen mostrando el último intervalo disponible, no totales diarios/nocturnos.

Las lecturas no se incorporan a registros, exportación, almacenamiento, servidor ni contexto de IA. La nueva versión autónoma incorpora este JavaScript, por lo que requiere reinstalar el build nuevo; no depende de Metro. IA/OCR remotos siguen sin configurarse en el perfil autónomo.

Verificación: typecheck y lint de archivos modificados pasan; 189 pruebas completas pasan, incluidos los casos de hidratación y reanudación. Modal probado mediante fixture web en 390/320 px y horizontal (no HealthKit nativo). Lint global conserva cinco errores y tres advertencias ajenos al cambio. Falta prueba física de permisos, sincronización, reapertura y lecturas en el iPhone. Las dos capturas de Library no pudieron materializarse en Windows por `os.setxattr`; no se verificó fidelidad gráfica propia. Se conservó el diseño existente y se implementó el requisito escrito.


Build autónomo 4 solicitado: `1b2476b7-f5db-47c8-b263-23c2a1676a1d`, perfil `standalone`, número iOS `4`, certificado/perfil reutilizados sin cambios. Expo confirmó `internalDistributionBuildPrivacy: PRIVATE`. Se entrega únicamente la página autenticada del build. La restricción de la página no equivale a blindar una URL directa del IPA ya conocida; en verificaciones anteriores dicha URL podía descargarse sin sesión. La firma ad hoc limita la instalación al dispositivo incluido en el perfil, no la descarga del archivo. No se abrió túnel ni se publicó en tienda.


### Resultado verificado del build 4

Finalizado el 5 noviembre 2026 a las 02:04:01 UTC. Instalación: https://expo.dev/accounts/guillermogherzigs-team/projects/klini/builds/1b2476b7-f5db-47c8-b263-23c2a1676a1d

IPA descargado y revisado localmente: 13.104.251 bytes; JavaScript integrado 4.468.568 bytes; marcadores de selección persistente y lecturas automáticas presentes; sin controlador de development launcher. Entitlements extraídos de la firma del ejecutable (no solo del perfil): HealthKit activo, background delivery ausente. Perfil ad hoc incluye un dispositivo. Comprobación de enlace nativo: sin bibliotecas incrustadas faltantes ni imports fuertes de ExpoModulesCore sin resolver. Escaneo de los 235 archivos del IPA: sin coincidencias de los secretos/endpoints configurados localmente ni patrones de clave privada o tokens comprobados. Esto no equivale a una auditoría exhaustiva de todas las dependencias.

La consulta anónima del build 4 devolvió UNAUTHORIZED_ERROR; el proyecto sigue PRIVATE. La URL directa del artefacto, una vez conocida, sigue respondiendo HTTP 200 sin sesión. No se comparte aquí esa URL. Esta limitación real de descarga permanece; la instalación continúa restringida por la firma ad hoc.

Prueba pendiente en iPhone: instalar sobre Klini existente sin desinstalar; abrir Parámetros → Apple Salud → seleccionar → Guardar selección y activar; autorizar en la hoja de Apple. Comprobar filas al principio con valor/fuente/fecha, cerrar y abrir Klini, regresar desde Salud, cambiar selección, desactivar, probar una categoría sin lecturas o denegada. No fue posible ejecutar estas comprobaciones físicas desde este equipo.


## Filas uniformes de parámetros — build 5, 5 noviembre 2026

Apple Salud y los registros guardados comparten ahora `BodyParameterListRow`: ícono a la izquierda, nombre y fuente debajo del nombre, lectura y unidad a la derecha, chevrón. Las filas de Salud mantienen la prioridad y las actualizaciones anteriores. La fila conserva fecha abreviada cuando existe una medición; al tocarla muestra fuente y fecha/intervalo completos, estado sin lectura o error y límites de sincronización. Las categorías de pasos, energía y sueño indican que muestran el último intervalo. No se presentan números de ejemplo como fallback de datos de Salud.

Al seleccionar frecuencia cardiaca de Salud se suprime la fila guardada de frecuencia cardiaca en la lista principal para evitar duplicados. Sus registros no se borran; el detalle expandido de la lectura ofrece acceso explícito a su historial guardado. Al desactivar Salud vuelve la fila guardada. El pie diferencia lecturas del iPhone de otros registros de ejemplo y cada fila guardada de ejemplo se identifica como tal.

Verificación: 189 pruebas pasan, typecheck y lint de los archivos editados pasan. Lint global conserva cinco errores y tres advertencias ajenos. Fixture local probado en 320 y 390 px con datos sintéticos (69 lpm, cero pasos, energía grande, fase REM, fuente larga, ausencia de lectura); revisados sus píxeles, alineación, ausencia de desbordamiento, fuente y detalle completo. Prueba integrada con AppProvider y preferencias persistidas comprueba que Salud sustituye la fila de ejemplo de frecuencia cardiaca y conserva acceso al historial. También se conserva la prueba del modal en 320/390 px y horizontal. Ninguna de estas pruebas accede a HealthKit real.

Captura Library `libfile_97cf15c1ed7c81918eda84eea31695eb` resuelta como IMG_3367.jpeg. La transferencia por helper oficial vuelve a fallar en Windows por ausencia de `os.setxattr`; no existe copia final ni inspección propia de sus píxeles. Se continuó según la solicitud escrita y el diseño ya existente. La descripción visual recibida del hilo principal se usó como contexto, no como verificación propia.

Compilación interna autónoma solicitada: `0283d336-0b81-4e08-b113-5e8226cc1c5f`, número iOS 5, mismo perfil standalone, bundle y firma reutilizados; no se publicó en tienda ni se abrió túnel. El funcionamiento físico y la lectura HealthKit en iPhone siguen pendientes de prueba del usuario.

Prueba integrada adicional: desactivar Salud elimina la fila nativa, restaura la fila guardada de frecuencia cardiaca y mantiene las categorías seleccionadas en almacenamiento. Expo sigue PRIVATE y la consulta anónima del build 5 devuelve UNAUTHORIZED_ERROR.


### Instalador verificado del build 5

FINISHED: 2026-11-05T02:36:39.642Z. Página de instalación autenticada: https://expo.dev/accounts/guillermogherzigs-team/projects/klini/builds/0283d336-0b81-4e08-b113-5e8226cc1c5f

IPA: 12.768.598 bytes. JavaScript integrado: 4.487.156 bytes; presentes actualización automática, selección persistente y detalle de filas/historial guardado. Sin development launcher. Firma del ejecutable: HealthKit true, background delivery false. Perfil ad hoc para un dispositivo. Enlace nativo correcto, sin imports ExpoModulesCore no resueltos ni frameworks incrustados faltantes. Escaneo de 232 archivos: sin coincidencias de secretos/endpoints locales configurados ni patrones de credenciales comprobados. No es una auditoría exhaustiva de dependencias.

Distribución sigue PRIVATE y consulta anónima del build rechazada. La URL directa del IPA, si se conoce, todavía responde HTTP 200 sin sesión; no se comparte aquí. Firma ad hoc restringe instalación al dispositivo registrado. No hubo publicación en tienda ni túnel.

Instalar sobre la app existente sin desinstalar para conservar preferencias. Prueba física pendiente: diseño real en iPhone, permisos, lecturas, sincronización y reanudación. IA/OCR remotos siguen sin configurar en esta versión autónoma. Revisión visual de la captura adjunta pendiente por el fallo de transferencia documentado; sí se revisaron píxeles de las capturas sintéticas generadas por las pruebas locales.


## Historial real de Apple Salud — build 6

Al tocar cualquiera de las cinco categorías se abre `AppleHealthHistoryPopup`, usando el mismo `ArchivePopup` vertical que los parámetros base: encabezado, regreso, cierre, valor destacado, agrupación mensual, filas con fecha/fuente/valor y chevrón; tocar una muestra abre su detalle con inicio, fin, unidad, fuente y etapa de sueño. Volver regresa al historial; cerrar regresa a Parámetros. No se modifica ni exporta la muestra ni se agrega a registros o contexto de IA.

Consulta silenciosa de HealthKit mediante `queryQuantitySamples`/`queryCategorySamples`, sin nuevas solicitudes de autorización. Período inicial: últimos siete días del calendario local. Filtro Desde/Hasta (inclusive) permite hasta 31 días por consulta, incluidas fechas antiguas. Fechas inválidas o invertidas se rechazan antes de consultar. Muestras ordenadas por inicio descendente, cantidades en lpm/pasos/kcal y sueño en minutos por segmento con su etapa; no son totales diarios ni noches completas. Se muestran todas las fuentes autorizadas tal como Salud las devuelve; pueden existir solapamientos entre fuentes, sin sumarlos.

Páginas de 50 muestras, consulta nativa limitada a 51 para detectar continuación. Se excluyen UUIDs ya cargados para no perder muestras de igual timestamp ni duplicarlas entre páginas. Cache temporal limitada a 1,000 muestras por período; al alcanzar el límite se pide acotar fechas. Solo se renderizan 50 filas a la vez dentro del ScrollView del popup existente, sin una lista virtual anidada. La consulta limita timestamps al momento de inicio de la sesión; Salud puede cambiar o sincronizar muestras retroactivamente y no ofrece aquí una instantánea transaccional.

Observadores de HealthKit y respaldo de 60 segundos actualizan solo la primera página; navegar páginas anteriores conserva la consulta hasta Actualizar historial. Al volver al primer plano se vuelve a consultar. Al cerrar, cambiar categoría/período o pasar al fondo se detienen temporizadores/observadores y se descartan resultados pendientes. Las consultas nativas en curso no exponen cancelación en esta API; sus respuestas se ignoran tras invalidar la sesión. La lista y el detalle se borran de la UI al pasar al fondo. No hay entrega en segundo plano ni garantía de tiempo real.

Ausencia de lecturas y denegación de permiso de lectura son indistinguibles para HealthKit: se indica explícitamente sin inventar datos. Errores se muestran con reintento; la consulta no solicita permisos repetidamente. Historial de registros guardados de Klini sigue disponible por un acceso separado para frecuencia cardiaca, sin mezclarlo con muestras de Salud.

Verificación: 194 pruebas pasan. Casos nuevos cubren paginación con fechas iguales, UUIDs excluidos, límites, cero, sueño/REM, ausencia de datos, errores, fechas, resultados tardíos al cerrar, reintento y navegación estable. Typecheck/lint de archivos editados pasan; lint global mantiene cinco errores y tres advertencias anteriores. Fixture web con datos sintéticos prueba las cinco categorías, listas de 50/2 muestras, detalle, regreso, cierre, filtros inválidos y estados vacío/error en 320 y 390 px; la prueba integrada confirma acceso desde la pantalla real, ausencia del duplicado y acceso al historial guardado. No es una prueba de HealthKit en un iPhone.

Build autónomo solicitado: `0cba520e-e16a-4b5c-820d-ea55edd2d157`, número iOS 6, mismo perfil standalone, mismo certificado y perfil reutilizados. Sin túnel ni publicación en tienda. Las preferencias y actualización de la lista se conservan; los datos de Salud siguen sin servidor, IA ni persistencia local.

Revisados los píxeles de las capturas sintéticas de historial y detalle en 320 px: encabezado, flecha de regreso, cierre, cifra destacada, unidad, fechas completas y fuente legibles. La captura de detalle se tomó sobre el panel tras esperar la animación. Pruebas en 390 px también pasan. La consulta anónima del build 6 fue rechazada (UNAUTHORIZED_ERROR) y el proyecto conserva PRIVATE.


### Resultado del build 6

FINISHED: 2026-11-05T03:13:01.221Z. Instalación: https://expo.dev/accounts/guillermogherzigs-team/projects/klini/builds/0cba520e-e16a-4b5c-820d-ea55edd2d157

IPA verificado: 12.778.260 bytes; JavaScript integrado 4.507.314 bytes. Presentes marcadores de historial, selección persistente y actualización automática; sin development launcher. Firma del ejecutable con HealthKit activo y sin background delivery. Perfil ad hoc para un dispositivo. Comprobación de enlace: sin frameworks incrustados faltantes ni imports fuertes ExpoModulesCore no resueltos. Escaneo de 232 archivos sin coincidencias de secretos/endpoints locales configurados ni patrones de credenciales comprobados; no equivale a una auditoría exhaustiva de dependencias.

Expo conserva PRIVATE y rechaza consultas anónimas del build. Una URL directa del artefacto ya conocida todavía permite HTTP 200 sin sesión: limitación comprobada nuevamente, no se comparte esa URL aquí. Firma ad hoc limita instalación al iPhone registrado.

Instalar sobre Klini existente sin desinstalar para conservar preferencias. Prueba física pendiente: tocar cada categoría del Watch/Salud, verificar historial real con fechas/fuente/unidades, paginar, acotar fechas, abrir detalle y regresar; probar ausencia/denegación de lectura, reanudación y sincronización del Watch. No se afirma probado el funcionamiento en el iPhone. IA/OCR remotos siguen sin configurarse en esta versión independiente.


## Pasos como total diario — build 7

Pasos ya no consulta `getMostRecentQuantitySample`. Tanto la fila principal como el historial usan `queryStatisticsCollectionForQuantity` de HealthKit, con `cumulativeSum`, unidad count, ancla a medianoche local e intervalo de calendario `{ day: 1 }`. No se usa separación por fuente ni se suman muestras individuales o subtotales del iPhone y Watch: se muestra la cifra consolidada de Salud. Las fuentes disponibles se identifican en el detalle como contexto; no se atribuye el agregado entero a una sola fuente.

La fila muestra Hoy/total diario y hora de consulta. El detalle diario identifica fecha, inicio y fin, zona horaria y fuentes disponibles. Hoy es parcial hasta la consulta. Los días anteriores muestran el total accesible que Salud devuelve; pueden cambiar después por sincronización o correcciones. Un sumQuantity ausente no se convierte a cero. Cero se muestra únicamente si HealthKit entrega un total numérico cero. Ni ausencia ni denegación de lectura pueden distinguirse por esta API.

Historial: un agregado por día, hasta 31 días de calendario inclusive, con filtro de fechas existente. Se incluyen días sin total con estado Sin lectura. No se presenta la paginación de 50 muestras, pues hay como máximo 31 totales diarios. Actividad, sueño y frecuencias conservan sus consultas e historial anteriores. No se persisten ni se envían estos datos a servidor o IA.

Los límites diarios se calculan con calendario local, no añadiendo 24 horas: se contemplan días de 23/25 horas. HealthKit recibe el ancla local y devuelve intervalos diarios; si devuelve bins desalineados o duplicados, valores negativos/no finitos o unidades incompatibles, se muestra error en lugar de inventar una cifra. Los días se interpretan en la zona horaria actual del iPhone, incluso al revisar datos pasados.

En primer plano, la lista y el historial de pasos vigilan medianoche mediante un temporizador y comprueban cambio de día/zona cada 15 segundos. Al detectar cambio se invalida la sesión anterior, se limpian datos temporales y se consulta otra vez. Al abrir o regresar a la app se consulta inmediatamente. El período inicial de siete días del historial avanza con el día local; un período elegido explícitamente por el usuario se conserva. Temporizadores y observadores se detienen en segundo plano y al cerrar. No hay ejecución de salud en segundo plano ni garantía de tiempo real; depende de sincronización de Salud.

Pruebas: 201 pasan; typecheck y lint de archivos modificados pasan. Lint global mantiene cinco errores y tres advertencias previos. Los casos nuevos cubren la llamada acumulada consolidada, ausencia versus cero, historial diario, errores por categoría, cambio de día sin arrastrar ayer, días de 23/25 horas y diferencia de fecha entre Nueva York/Tokio, bins inválidos y limpieza de temporizadores. Fixture visual probado en 320/390 px con datos sintéticos y detalle diario revisado por píxeles. Falta contrastar valores con Salud, cambio real de zona y sincronización del Watch en el iPhone.

Build autónomo solicitado: `9c2681fb-0788-4e10-9186-551ecb95e796`, número iOS 7, mismo perfil standalone, certificado/perfil reutilizados. Sin publicación en tienda ni túnel. La consolidación se delega a HealthKit; no se promete coincidencia instantánea con todas las vistas/apps de Salud.


Referencias técnicas consultadas para Pasos: documentación versionada de Expo SDK 58; tipos y código Swift de @kingstinct/react-native-healthkit 16.2.0 (`queryStatisticsCollectionForQuantity`, `cumulativeSum`, `IntervalComponents.day`, serialización de sumQuantity y fuentes); Apple HealthKit/Reading data/Statistics collection query y WWDC19 Exploring New Data Representations in HealthKit. No se añadieron dependencias ni capacidades nativas. Proyecto mantiene PRIVATE y consulta anónima del build 7 devuelve UNAUTHORIZED_ERROR.


### Instalador verificado del build 7

FINISHED: 2026-11-05T03:52:45.545Z. Instalación: https://expo.dev/accounts/guillermogherzigs-team/projects/klini/builds/9c2681fb-0788-4e10-9186-551ecb95e796

IPA: 12.782.591 bytes. JavaScript integrado: 4.517.648 bytes; presentes estadísticas diarias, historial, selección persistente y actualización automática. Sin development launcher. Firma del ejecutable: HealthKit true, background delivery false. Perfil ad hoc para un dispositivo. Enlace nativo sin bibliotecas incrustadas faltantes ni imports fuertes ExpoModulesCore no resueltos. Escaneo de 232 archivos sin coincidencias de secretos/endpoints locales configurados ni patrones de credenciales comprobados. Esto no es una auditoría exhaustiva de dependencias.

La página/API de Expo conserva PRIVATE y rechaza consultas anónimas. El artefacto directo ya conocido todavía permite HTTP 200 sin sesión; no se comparte esa URL. La firma ad hoc limita la instalación al iPhone registrado.

Instalar sobre Klini existente sin desinstalar para conservar preferencias. Pendiente en el iPhone: contrastar total de hoy y días previos con Salud, sincronizar Apple Watch, cambiar de día/zona horaria y reabrir, verificar cero versus ausencia y permisos. Las pruebas locales no equivalen a esta verificación física. No se publicó en tienda ni se abrió túnel. IA/OCR remotos siguen sin configurarse en esta versión autónoma.


## Diagnóstico de descarga del build 7

Nueva consulta autenticada confirma FINISHED/INTERNAL/standalone, versión 1.0.0 (7), artefacto disponible con HTTP 200 y tamaño 12.782.591 bytes. Expo informa expiración del build el 19 noviembre 2026 a las 03:47:05.899 UTC. No está caducado en el momento de revisión.

Perfil embebido: bundle correcto, HealthKit, un dispositivo, no distribución universal, vencimiento 4 noviembre 2027 14:47:13 UTC. Certificado público incluido: válido desde 4 noviembre 2026 14:47:14 UTC hasta 4 noviembre 2027 14:47:13 UTC. iOS mínimo 16.4. EAS device:list devuelve un iPhone cuyo identificador coincide con el único dispositivo del perfil. No se consultó revocación actual directamente en Apple ni se verificó que el usuario esté intentando instalar en ese mismo iPhone; esa parte sigue pendiente.

Proyecto sigue PRIVATE, consulta anónima rechazada con UNAUTHORIZED_ERROR. La página requiere una sesión autorizada de Expo; la cuenta de Apple Developer no sustituye ese acceso. No se cambió visibilidad, membresía, firma, capacidades ni credenciales y no se creó otro build. No se comparte la URL directa del artefacto como bypass de la restricción.

Acción segura: abrir en Safari del iPhone registrado la página https://expo.dev/accounts/guillermogherzigs-team/projects/klini/builds/9c2681fb-0788-4e10-9186-551ecb95e796 con una cuenta de Expo autorizada; usar Install en esa página, no guardar el IPA en Archivos. Hace falta captura/mensaje exacto para distinguir acceso al proyecto, descarga del artefacto o rechazo de instalación de iOS. No se da la incidencia por resuelta ni se atribuye sin evidencia a la sesión del navegador.


## Recarga del enlace de instalación — diagnóstico adicional

La página de build responde HTTP 200 sin redirección HTTP en una petición anónima (su control de sesión se realiza en la aplicación web/API); no se puede reproducir desde este equipo el flujo de Safari del usuario ni sus cookies.

Se inspeccionó la implementación oficial de EAS CLI `getInternalDistributionInstallUrl` (build/build/utils/url.js). Para iOS construye el esquema `itms-services` con `action=download-manifest` y el endpoint `/v2/projects/{projectId}/builds/{buildId}/manifest.plist`. Se probó exactamente el endpoint del build 7: HTTP 200, text/xml, plist válido con un software-package y los íconos; sin redirección. El IPA referenciado respondió 200 y su SHA-256 coincide exactamente con el IPA del build 7 previamente verificado (12.782.591 bytes). No apunta a una compilación anterior ni a Metro.

El manifiesto actualmente puede consultarse sin sesión pese a PRIVATE. El instalador alternativo oficial no cambia visibilidad, firma, permisos ni credenciales, pero tampoco añade autenticación al manifiesto/artefacto existente: subsiste la limitación de descarga ya documentada. La instalación sigue limitada al dispositivo ad hoc. No se ha publicado ningún archivo nuevo ni creado un enlace de alojamiento público alternativo.

Candidato de instalación oficial directa, sin credenciales ni tokens: itms-services://?action=download-manifest;url=https://api.expo.dev/v2/projects/e6eec200-1155-4dc5-94d0-4d596afcd755/builds/9c2681fb-0788-4e10-9186-551ecb95e796/manifest.plist

Abrir/copiar en Safari del iPhone registrado permite intentar el traspaso directo a iOS, evitando la pantalla web que se recarga. No se afirma probado en iPhone. Falta confirmar si aparece el aviso de instalar Klini: si no aparece, investigar navegador/traspaso de esquema; si aparece y luego falla, obtener el mensaje de iOS y registro de instalación. No desinstalar la app existente ni modificar ajustes de privacidad para probar.

Comprobación adicional de recursos: íconos HEAD 200. La URL firmada del software-package rechaza HEAD con 403, pero GET vuelve a responder 200, 12.782.591 bytes y hash idéntico al build 7. La firma de esa URL está ligada al método de solicitud; no se interpreta HEAD 403 como evidencia de fallo de descarga GET ni como causa confirmada del problema del iPhone. No se exponen parámetros firmados.


## Investigación de Pasos/Sueño sin lectura y corrección nativa — build 8

La foto adjunta (`libfile_f8c39918dd3c81918febaa6fbbebfe0d`) corresponde a Actividad del Apple Watch, no a Salud del iPhone ni a sueño. La descripción visual del hilo principal confirma pasos/distancia/pisos; no demuestra sincronización ni permisos de Klini. La materialización local por Library volvió a fallar por `os.setxattr` ausente en Windows; no hubo inspección propia de píxeles ni copia final.

Pasos usa estadísticas diarias del día local hasta la consulta; ausencia de sumQuantity queda como Sin lectura. Sueño usa la última muestra accesible de SleepAnalysis sin filtro de hoy (puede ser de una noche anterior); no depende de pasos ni de los anillos de Actividad. Las consultas son separadas por categoría. Seleccionar una categoría conserva la preferencia y solicita la hoja de Apple solo si es nueva; requested significa solicitud completada, nunca permiso concedido. HealthKit no informa denegación de lectura; una categoría vacía no demuestra por sí sola error de Klini. Errores de consulta se distinguen de ausencia y no se sustituyen por ceros o ejemplos.

Hallazgo verificable adicional en la dependencia 16.2.0: `ios/Helpers.swift` insertaba incondicionalmente `.separateBySource` dentro de `buildStatisticsOptions`, incluso para las APIs nominalmente consolidadas. Esto contradice la intención del código JS de Pasos y los comentarios de los builds anteriores que afirmaban no usar separación por fuente. Se corrige mediante plugin CNG `plugins/withMergedHealthKitStatistics.cjs`: separación false por defecto en las consultas consolidadas; true únicamente en las dos APIs explícitas SeparateBySource. Los archivos generados ios/android no se editan a mano. La transformación es idempotente, exige versión 16.2.0 y forma de código conocida y aborta ante cambios o parche incompleto. No se actualizó la dependencia ni se cambiaron permisos/capacidades.

Este hallazgo corrige consolidación nativa, pero NO confirma que sea la causa de Sin lectura ni explica sueño vacío. Sigue pendiente verificar en el iPhone: datos de hoy en Salud → Explorar → Actividad → Pasos; registros en Salud → Explorar → Sueño; lectura de cada categoría en Salud → perfil → Apps/Apps y servicios → Klini; y volver a Klini. No se solicitan/exportan registros personales. No se asume que usar Actividad requiera otra integración. Registrar sueño requiere datos de sueño reales; actividad no los implica.

Se agregó ayuda contextual en historial/detalle sin lecturas y aclaración de permisos en selector e información. Información de Apple Salud ahora muestra `Constants.platform.ios.buildNumber`, leído del Info.plist nativo, para confirmar la compilación instalada. No se puede consultar remotamente qué build está abierto en el iPhone del usuario ni su estado de permisos. El build 7 disponible en Expo no prueba la instalación actual.

Pruebas nativas de transformación: consolidación default false, APIs por fuente preservadas, idempotencia, rechazo de versión/formato desconocido y parche incompleto. Configuración Expo prebuild resuelve el plugin y verificación local sobre la dependencia pasa. La compilación en EAS se solicita sin caché para volver a compilar Swift. HealthKit real y permisos continúan pendientes de prueba física.


Build 8 solicitado: `8376aa2e-d04c-4d23-80c2-5b2e951e6098`, perfil standalone, número nativo 8. Los logs remotos de PREBUILD ya confirman `[Klini] HealthKit merged statistics patch verified (16.2.0)` antes de INSTALL_PODS. La revisión anterior de Pasos comprobaba la API JavaScript pero no el flag forzado en Swift; esta verificación nativa corrige esa omisión. La consolidación real y los datos accesibles requieren comparación en iPhone. 207 pruebas pasan, typecheck/lint de archivos cambiados pasan; lint global mantiene cinco errores y tres advertencias ajenos. Distribución PRIVATE con consultas anónimas rechazadas.


### Build 8 terminado y verificado

FINISHED: 2026-11-05T04:44:01.451Z. Página de instalación: https://expo.dev/accounts/guillermogherzigs-team/projects/klini/builds/8376aa2e-d04c-4d23-80c2-5b2e951e6098

IPA 12.783.080 bytes; JavaScript integrado 4.519.292 bytes. Presentes historial, estadísticas diarias, selección/actualización, ayuda por categoría y número nativo instalado. Ausente `record-share-popup` del bundle: no quedan rutas activas al selector propio; la hoja de iOS se solicita directamente al pulsar enviar. Sin development launcher ni necesidad de Metro. Logs remotos confirman parche de estadísticas aplicado en PREBUILD y compilación terminada sin errores. Enlace nativo: sin frameworks incrustados faltantes ni imports fuertes de ExpoModulesCore no resueltos. Firma del ejecutable con HealthKit true, background delivery false, perfil ad hoc para un iPhone.

Escaneo de 232 archivos sin coincidencias de secretos/endpoints locales configurados ni patrones de credenciales comprobados. No es una auditoría exhaustiva de dependencias. Proyecto conserva PRIVATE y consulta anónima del build es rechazada; el artefacto directo conocido aún responde 200 sin sesión, limitación ya documentada. No se comparte la URL del IPA. No se cambiaron credenciales, membresías ni capacidades; no se publicó en tienda ni se abrió túnel.

Manifest oficial de instalación comprobado (HTTP 200): itms-services://?action=download-manifest;url=https://api.expo.dev/v2/projects/e6eec200-1155-4dc5-94d0-4d596afcd755/builds/8376aa2e-d04c-4d23-80c2-5b2e951e6098/manifest.plist

Instalar encima de Klini sin desinstalar. Verificar compilación 8 en información de Apple Salud. Comprobar datos de Pasos y Sueño en Salud del iPhone y permiso de lectura de ambas categorías en Klini; volver a la app. Falta prueba física de lectura, consolidación frente a Salud y de la hoja de compartir con TXT/PDF/imagen, cancelación y aplicaciones instaladas. La corrección nativa de consolidación no confirma la causa de las lecturas vacías ni garantiza que exista sueño registrado. No se accedió a datos de Salud del teléfono ni se enviaron a servidores/IA.


### Revisión adicional de Pasos/Sueño junto al build 9

El usuario volvió a solicitar comenzar la implementación mientras se compilaba Medicamentos. La lectura funcional y la corrección nativa ya estaban incluidas en ese build; no se sustituyó la consulta real por datos de prueba ni se cambió a sumar intervalos. Se añadieron cuatro pruebas de contrato explícitas: autorización conjunta solo toRead de StepCount/SleepAnalysis antes de consultar; etapas 0..5 y segmento de 90 minutos cruzando medianoche sin llamarlo total nocturno; ausencia/denegación indistinguibles frente a fallo técnico por categoría; solicitud de autorización no completada impide consultas. La batería completa ahora tiene 213 pruebas y todas pasan; typecheck y lint del nuevo test pasan. No hubo cambios adicionales de producción después de subir el build 9, por lo que su código de app corresponde al código probado.

Build 9 `6513489f-1822-41f6-8a70-e1070e10c128` terminado y auditado; conserva la corrección nativa de consolidación del build 8, Pasos diarios, Sueño por segmentos/etapas, historial, actualización y ayuda. Continúa la limitación: desde este equipo no se conoce qué build está abierto en el iPhone, sus permisos ni sus registros personales. Debe comprobarse compilación 9 en información de Apple Salud, que existan pasos de hoy en Salud → Explorar → Actividad → Pasos y registros en Salud → Explorar → Sueño, y que Salud → perfil → Apps/Apps y servicios → Klini permita lectura de ambos. Regresar a Klini desencadena nueva consulta sin pulsar Conectar. No se confirma resolución de Sin lectura hasta esa prueba física. Actividad del Watch no exige otra integración ni demuestra existencia de sueño. No se accedió/transmitió Salud del dispositivo.
