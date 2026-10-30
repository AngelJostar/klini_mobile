# Revisión aislada de Klini Android — 27 octubre 2026

Origen: Klini_App_Android (2).zip. No se incorporó código a src/ de la aplicación principal.

## Ejecución
Desde esta carpeta: `npx expo start --go --lan --port 8096`.
Para Android: `adb reverse tcp:8096 tcp:8096` y abrir `exp://127.0.0.1:8096` en Expo Go.

## Adaptación
Inicio con título de mayor tamaño, cuatro accesos y gráficos creados con Runway (tarea 7de8c79f-f5af-4ba4-8a86-3973fb2272db). Los originales del inicio y dependencias están en App.original.txt, package.original.json y package-lock.original.json. SDK actualizado de 57 a 58 únicamente aquí para el Expo Go instalado en el emulador.

## Estructura que estamos evaluando
- App.tsx: inicio y navegación original mediante modales y estado local.
- src/screens/: Agenda, Directorio, Teleconsulta, Seguro, Archivo y Perfil.
- src/domain/: tipos, datos ficticios y reglas de reservas.
- src/state/: estado compartido y persistencia local con AsyncStorage.
- src/services/: adjuntos, exportación de calendario y recordatorios.
- src/components/ui.tsx: componentes y estilos compartidos.

La navegación original no usa Expo Router. Una eventual integración deberá adaptarla al router del proyecto principal. Los datos son ficticios; la teleconsulta y reservas no representan servicios conectados a un backend clínico.

Recordatorios desactivados únicamente en esta revisión: Expo Go 58.0.5 no incluye ExpoTopicSubscriptionModule requerido por expo-notifications 58.1.6. Original conservado en src/services/reminders.original.txt. Se eliminaron espacios JSX sueltos que provocaban errores de texto nativo.


Validación: TypeScript sin errores; 19/19 pruebas de dominio; lint de la app principal sin errores; lint del inicio de revisión sin errores y con una advertencia de dependencias de useEffect heredada del ZIP. Comprobación manual en Android: inicio y apertura de Agenda. Servidor activo en exp://127.0.0.1:8096. No se validaron todos los flujos.
