export const expoGoHealthMessage = 'Estás usando Expo Go. Apple Salud necesita una versión de desarrollo de Klini instalada en este iPhone. Abre Klini desde su propio icono después de instalarla; volver a escanear el QR con Expo Go no agrega HealthKit.';

/** Only explicitly authored messages may cross from native loading to the UI. */
export class AppleHealthSetupError extends Error {}
