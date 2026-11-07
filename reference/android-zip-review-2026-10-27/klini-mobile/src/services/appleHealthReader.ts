import { readTodaySteps } from './appleHealthSteps';
import type * as HealthKit from '@kingstinct/react-native-healthkit';

import { HEALTH_CATEGORIES, type HealthCategory, type HealthReading } from '../domain/appleHealth';
export { HEALTH_CATEGORIES, type HealthCategory, type HealthReading } from '../domain/appleHealth';

export type HealthReader = Pick<typeof HealthKit, 'requestAuthorization' | 'getMostRecentQuantitySample' | 'getMostRecentCategorySample' | 'queryStatisticsCollectionForQuantity'>;

/** Does not persist samples, log them, or send them to an API. A completed
 * authorization sheet does not reveal whether Apple granted read access. */
export async function readAppleHealth(reader: HealthReader, categories: readonly HealthCategory[]): Promise<HealthReading[]> {
  const selected = HEALTH_CATEGORIES.filter(category => categories.includes(category.id));
  if (!selected.length) return [];
  const completed = await reader.requestAuthorization({ toRead: selected.map(category => category.id) });
  if (!completed) throw new Error('La solicitud de lectura no se completó.');
  return readAppleHealthSamples(reader, categories);
}

/** Silent reads after an explicit authorization request. Never opens a permission sheet. */
export async function readAppleHealthSamples(reader: Pick<HealthReader, 'getMostRecentQuantitySample' | 'getMostRecentCategorySample' | 'queryStatisticsCollectionForQuantity'>, categories: readonly HealthCategory[]): Promise<HealthReading[]> {
  const selected = HEALTH_CATEGORIES.filter(category => categories.includes(category.id));
  return Promise.all(selected.map(async category => {
    try {
      if (category.id === 'HKQuantityTypeIdentifierStepCount') return await readTodaySteps(reader);
      if (category.id === 'HKCategoryTypeIdentifierSleepAnalysis') {
        const sample = await reader.getMostRecentCategorySample(category.id);
        if (!sample) return { id: category.id };
        const stages: Record<number, string> = { 0: 'En cama', 1: 'Dormido', 2: 'Despierto', 3: 'Sueño ligero', 4: 'Sueño profundo', 5: 'REM' };
        return { id: category.id, value: Math.max(0, (sample.endDate.getTime() - sample.startDate.getTime()) / 60000), stage: stages[sample.value] ?? 'Etapa no identificada', source: sample.sourceRevision.source.name, start: sample.startDate.toISOString(), end: sample.endDate.toISOString() };
      }
      const sample = await reader.getMostRecentQuantitySample(category.id, category.unit);
      if (!sample || !Number.isFinite(sample.quantity)) return { id: category.id };
      return { id: category.id, value: sample.quantity, source: sample.sourceRevision.source.name, start: sample.startDate.toISOString(), end: sample.endDate.toISOString() };
    } catch {
      return { id: category.id, error: true };
    }
  }));
}
