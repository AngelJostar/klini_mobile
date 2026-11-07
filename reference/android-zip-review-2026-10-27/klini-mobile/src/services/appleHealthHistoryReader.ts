import { healthHistoryRange } from '../domain/appleHealthDates';
import { readDailySteps } from './appleHealthSteps';
import type * as HealthKit from '@kingstinct/react-native-healthkit';
import { HEALTH_CATEGORIES, type HealthCategory, type HealthReading } from '../domain/appleHealth';

export const HISTORY_PAGE_SIZE = 50;
export const HISTORY_MAX_SAMPLES = 1000;
export interface HealthHistoryReading extends HealthReading { uuid: string }
export interface HealthHistoryPage { readings: HealthHistoryReading[]; hasMore: boolean }
export type HistoryReader = Pick<typeof HealthKit, 'queryQuantitySamples' | 'queryCategorySamples' | 'queryStatisticsCollectionForQuantity'>;

export { healthHistoryRange } from '../domain/appleHealthDates';
/** Snapshot + UUID exclusions keep equal timestamps from losing samples between pages.
 * Never requests authorization, persists data or uses an unbounded native query. */
export async function readHealthHistory(reader: HistoryReader, id: HealthCategory, from: string, to: string, excluded: readonly string[] = [], snapshot = new Date()): Promise<HealthHistoryPage> {
  if (id === 'HKQuantityTypeIdentifierStepCount') {
    const readings = await readDailySteps(reader, from, to, snapshot);
    return { readings: readings.filter(reading => !excluded.includes(`steps-day-${reading.day}`)).map(reading => ({ ...reading, uuid: `steps-day-${reading.day}` })), hasMore: false };
  }
  const category = HEALTH_CATEGORIES.find(item => item.id === id);
  if (!category || excluded.length >= HISTORY_MAX_SAMPLES || new Set(excluded).size !== excluded.length) throw new Error('Acota el período para consultar más lecturas.');
  const { start, end } = healthHistoryRange(from, to);
  if (start > snapshot) throw new Error('Selecciona fechas anteriores o iguales a hoy.');
  const options = { limit: HISTORY_PAGE_SIZE + 1, ascending: false, filter: {
    date: { startDate: start, endDate: new Date(Math.min(end.getTime(), snapshot.getTime())), strictStartDate: true },
    ...(excluded.length ? { NOT: [{ uuids: [...excluded] }] } : {}),
  } };
  const samples = category.id === 'HKCategoryTypeIdentifierSleepAnalysis'
    ? await reader.queryCategorySamples(category.id, options)
    : await reader.queryQuantitySamples(category.id, { ...options, unit: category.unit });
  const seen = new Set(excluded);
  const readings: HealthHistoryReading[] = [];
  const stages: Record<number, string> = { 0: 'En cama', 1: 'Dormido', 2: 'Despierto', 3: 'Sueño ligero', 4: 'Sueño profundo', 5: 'REM' };
  for (const sample of samples.slice(0, HISTORY_PAGE_SIZE + 1)) {
    if (!sample.uuid || seen.has(sample.uuid)) continue;
    seen.add(sample.uuid);
    const startTime = sample.startDate.getTime(), endTime = sample.endDate.getTime();
    const value = 'quantity' in sample ? sample.quantity : (endTime - startTime) / 60000;
    if (!Number.isFinite(value) || !Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) throw new Error('Salud devolvió una lectura inválida.');
    readings.push({ id, uuid: sample.uuid, value, start: sample.startDate.toISOString(), end: sample.endDate.toISOString(), source: sample.sourceRevision.source.name,
      ...('value' in sample ? { stage: stages[sample.value] ?? 'Etapa no identificada' } : {}) });
  }
  readings.sort((a, b) => b.start!.localeCompare(a.start!) || a.uuid.localeCompare(b.uuid));
  return { readings: readings.slice(0, HISTORY_PAGE_SIZE), hasMore: readings.length > HISTORY_PAGE_SIZE };
}
