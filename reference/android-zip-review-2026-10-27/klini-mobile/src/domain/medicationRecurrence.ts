import { addDays, parseDate, toISO } from './dates';

/** Month intervals keep the chosen calendar day; short months are skipped, never clamped. */
export interface MedicationAlertRecurrence {
  type: 'monthly';
  intervalMonths: 1 | 6;
  anchorDate: string;
}
export interface MedicationRecurrenceSchedule {
  days: readonly number[];
  recurrence?: MedicationAlertRecurrence;
}

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const validDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0, 4)) >= 1900 && Number(value.slice(0, 4)) <= 2200 && toISO(parseDate(value)) === value;
const validDays = (days: readonly number[]): boolean => Array.isArray(days) && days.length >= 1 && days.length <= 7 && new Set(days).size === days.length && days.every(day => Number.isInteger(day) && day >= 0 && day <= 6);
const validSchedule = (alert: MedicationRecurrenceSchedule): boolean => validDays(alert.days) && (alert.recurrence === undefined || (isMedicationAlertRecurrence(alert.recurrence) && alert.days.length === 7));

export function isMedicationAlertRecurrence(value: unknown): value is MedicationAlertRecurrence {
  return object(value) && value.type === 'monthly' && (value.intervalMonths === 1 || value.intervalMonths === 6) && validDate(value.anchorDate);
}

/** Works with legacy daily/weekly alerts and the optional anchored monthly recurrence. */
export function medicationAlertMatchesDate(alert: MedicationRecurrenceSchedule, date: string): boolean {
  if (!validDate(date) || !validSchedule(alert)) return false;
  const at = parseDate(date);
  if (alert.recurrence === undefined) return alert.days.includes(at.getDay());
  const anchor = parseDate(alert.recurrence.anchorDate);
  const months = (at.getFullYear() - anchor.getFullYear()) * 12 + at.getMonth() - anchor.getMonth();
  return date >= alert.recurrence.anchorDate && at.getDate() === anchor.getDate() && months >= 0 && months % alert.recurrence.intervalMonths === 0;
}

/** Earliest matching local date, bounded by the persisted calendar range (1900–2200). */
export function nextMedicationAlertDate(alert: MedicationRecurrenceSchedule, fromDate: string, inclusive = true): string | undefined {
  if (!validDate(fromDate) || !validSchedule(alert)) return undefined;
  const first = inclusive ? fromDate : addDays(fromDate, 1);
  if (!validDate(first)) return undefined;
  if (alert.recurrence === undefined) {
    for (let offset = 0; offset < 7; offset++) {
      const candidate = addDays(first, offset);
      if (!validDate(candidate)) return undefined;
      if (medicationAlertMatchesDate(alert, candidate)) return candidate;
    }
    return undefined;
  }
  const anchor = parseDate(alert.recurrence.anchorDate);
  const from = parseDate(first);
  const anchorMonth = anchor.getFullYear() * 12 + anchor.getMonth();
  const fromMonth = from.getFullYear() * 12 + from.getMonth();
  const interval = alert.recurrence.intervalMonths;
  let month = anchorMonth + Math.max(0, Math.ceil((fromMonth - anchorMonth) / interval)) * interval;
  for (; month <= 2200 * 12 + 11; month += interval) {
    const year = Math.floor(month / 12), monthOfYear = month % 12;
    const candidate = new Date(year, monthOfYear, anchor.getDate(), 12);
    // A Date constructor overflows e.g. February 31. Such a month has no occurrence.
    if (candidate.getFullYear() !== year || candidate.getMonth() !== monthOfYear) continue;
    const date = toISO(candidate);
    if (date >= first && medicationAlertMatchesDate(alert, date)) return date;
  }
  return undefined;
}

export function medicationAlertRecurrenceLabel(alert: MedicationRecurrenceSchedule): string {
  if (!validSchedule(alert)) return 'Selecciona recurrencia';
  if (alert.recurrence) {
    const day = parseDate(alert.recurrence.anchorDate).getDate();
    return alert.recurrence.intervalMonths === 1 ? `El ${day} de cada mes` : `Cada 6 meses, el día ${day}`;
  }
  const days = [...alert.days].sort((a, b) => a - b);
  if (days.length === 7) return 'Todos los días';
  const names = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];
  const selected = days.map(day => names[day]);
  return `Todos los ${selected.length === 1 ? selected[0] : `${selected.slice(0, -1).join(', ')} y ${selected.at(-1)}`}`;
}
