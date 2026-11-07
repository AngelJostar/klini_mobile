import type * as HealthKit from '@kingstinct/react-native-healthkit';
import type { HealthReading } from '../domain/appleHealth';
import { healthHistoryRange } from '../domain/appleHealthDates';
import { toISO } from '../domain/dates';

export type StepsReader = Pick<typeof HealthKit, 'queryStatisticsCollectionForQuantity'>;
export const STEP_COUNT = 'HKQuantityTypeIdentifierStepCount';
export function localDayKey(now = new Date()) {
  return `${toISO(now)}|${now.getTimezoneOffset()}|${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
}
/** HKStatisticsCollectionQuery, cumulativeSum, no separateBySource:
 * HealthKit consolidates sources; Klini never sums overlapping raw samples or source totals. */
export async function readDailySteps(reader: StepsReader, from: string, to: string, now = new Date()): Promise<HealthReading[]> {
  const { start, end } = healthHistoryRange(from, to);
  if (start > now) throw new Error('Selecciona fechas anteriores o iguales a hoy.');
  const until = new Date(Math.min(end.getTime(), now.getTime()));
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const statistics = await reader.queryStatisticsCollectionForQuantity(STEP_COUNT, ['cumulativeSum'], start, { day: 1 }, {
    unit: 'count', filter: { date: { startDate: start, endDate: until } },
  });
  // A period is at most 31 local calendar days, including DST days of 23/25 hours.
  // Reject duplicate/incorrect bins instead of silently adding them.
  const bins = new Map<string, typeof statistics[number]>();
  for (const stat of statistics) {
    if (!stat.startDate || !stat.endDate || !Number.isFinite(stat.startDate.getTime()) || !Number.isFinite(stat.endDate.getTime())) throw new Error('Salud devolvió fechas inválidas.');
    if (stat.startDate < start || stat.startDate >= until) continue;
    const day = toISO(stat.startDate);
    const midnight = new Date(stat.startDate); midnight.setHours(0, 0, 0, 0);
    const tomorrow = new Date(midnight); tomorrow.setDate(tomorrow.getDate() + 1);
    if (stat.startDate.getTime() !== midnight.getTime() || stat.endDate.getTime() !== tomorrow.getTime() || bins.has(day)) throw new Error('Salud devolvió intervalos diarios incompatibles.');
    const quantity = stat.sumQuantity;
    if (quantity && (quantity.unit !== 'count' || !Number.isFinite(quantity.quantity) || quantity.quantity < 0)) throw new Error('Salud devolvió un total inválido.');
    bins.set(day, stat);
  }
  const readings: HealthReading[] = [];
  for (const day = new Date(start); day < end && day <= now; day.setDate(day.getDate() + 1)) {
    const next = new Date(day); next.setDate(next.getDate() + 1);
    const key = toISO(day), stat = bins.get(key);
    readings.push({ id: STEP_COUNT, day: key, value: stat?.sumQuantity?.quantity, start: day.toISOString(), end: new Date(Math.min(next.getTime(), now.getTime())).toISOString(),
      source: 'Apple Salud · consolidado', sources: [...new Set(stat?.sources.map(source => source.name) ?? [])], timeZone: zone, updated: now.toISOString() });
  }
  return readings.reverse();
}
export async function readTodaySteps(reader: StepsReader, now = new Date()) {
  const day = toISO(now);
  return (await readDailySteps(reader, day, day, now))[0];
}
