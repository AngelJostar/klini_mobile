import type { HealthCategory, HealthReading } from './appleHealthReader';

export const appleHealthUnavailable = 'Apple Salud está disponible en un iPhone con una compilación de Klini que incluya HealthKit. No funciona en Android, web ni Expo Go.';
export async function connectAppleHealth(_categories: readonly HealthCategory[]): Promise<HealthReading[]> {
  throw new Error(appleHealthUnavailable);
}

export async function requestAppleHealthAccess(_categories: readonly HealthCategory[]): Promise<void> { throw new Error(appleHealthUnavailable); }
export async function queryAppleHealth(_categories: readonly HealthCategory[]): Promise<HealthReading[]> { throw new Error(appleHealthUnavailable); }
export async function observeAppleHealth(_categories: readonly HealthCategory[], _changed: () => void): Promise<() => void> { return () => {}; }

export async function queryAppleHealthHistory(_id: HealthCategory, _from: string, _to: string, _excluded: readonly string[], _snapshot: Date): Promise<import('./appleHealthHistoryReader').HealthHistoryPage> { throw new Error(appleHealthUnavailable); }
