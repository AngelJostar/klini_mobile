import Constants from 'expo-constants';

import { AppleHealthSetupError, expoGoHealthMessage } from './appleHealthErrors';
import { readAppleHealth, readAppleHealthSamples, type HealthCategory, type HealthReading } from './appleHealthReader';

export const appleHealthUnavailable = 'Instala una nueva compilación de Klini para iPhone con HealthKit. Apple Salud no funciona en Expo Go.';
export async function connectAppleHealth(categories: readonly HealthCategory[]): Promise<HealthReading[]> {
  if (Constants.executionEnvironment === 'storeClient') throw new AppleHealthSetupError(expoGoHealthMessage);
  let health: typeof import('@kingstinct/react-native-healthkit');
  try {
    // Load only after the explicit action, so old dev clients still open safely.
    health = await import('@kingstinct/react-native-healthkit');
  } catch {
    throw new AppleHealthSetupError(appleHealthUnavailable);
  }
  if (!await health.isHealthDataAvailable()) throw new AppleHealthSetupError('Apple Salud no está disponible en este dispositivo.');
  return readAppleHealth(health, categories);
}

export async function requestAppleHealthAccess(categories: readonly HealthCategory[]): Promise<void> {
  const health = await loadHealth();
  if (categories.length && !await health.requestAuthorization({ toRead: [...categories] })) throw new Error('No se completó la autorización.');
}
async function loadHealth() {
  if (Constants.executionEnvironment === 'storeClient') throw new AppleHealthSetupError(expoGoHealthMessage);
  const health = await import('@kingstinct/react-native-healthkit');
  if (!await health.isHealthDataAvailable()) throw new AppleHealthSetupError(appleHealthUnavailable);
  return health;
}
export async function queryAppleHealth(categories: readonly HealthCategory[]) {
  return readAppleHealthSamples(await loadHealth(), categories);
}
export async function observeAppleHealth(categories: readonly HealthCategory[], changed: () => void) {
  const health = await loadHealth();
  const subscriptions: { remove: () => void }[] = [];
  for (const id of categories) {
    try { subscriptions.push(health.subscribeToChanges(id, changed)); } catch { /* Timed foreground refresh remains available. */ }
  }
  return () => subscriptions.forEach(subscription => subscription.remove());
}

export async function queryAppleHealthHistory(id: HealthCategory, from: string, to: string, excluded: readonly string[], snapshot: Date) {
  const { readHealthHistory } = await import('./appleHealthHistoryReader');
  return readHealthHistory(await loadHealth(), id, from, to, excluded, snapshot);
}
