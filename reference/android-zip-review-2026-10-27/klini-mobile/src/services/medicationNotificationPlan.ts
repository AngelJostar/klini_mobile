import { addDays, localDateTime, toISO } from '../domain/dates';
import type { AppState } from '../domain/types';
import { isMedicationAlert, type MedicationAlert } from '../domain/medicationCare';
import { medicationAlertMatchesDate, nextMedicationAlertDate } from '../domain/medicationRecurrence';

export const MEDICATION_NOTIFICATION_PREFIX = 'klini-medication-v1:';
export const MEDICATION_NOTIFICATION_EVENT_SUFFIX = 'event1';
export const MEDICATION_NOTIFICATION_LIMIT = 64;
export type MedicationNotificationTrigger =
  | { kind: 'daily'; hour: number; minute: number }
  | { kind: 'weekly'; weekday: number; hour: number; minute: number }
  | { kind: 'date'; date: number };
export interface MedicationNotificationEntry {
  identifier: string;
  trigger: MedicationNotificationTrigger;
}
export interface MedicationNotificationPlan {
  entries: MedicationNotificationEntry[];
  limited: boolean;
}

export function isMedicationAlertEligible(state: AppState, alert: MedicationAlert, now = new Date()): boolean {
  if (!isMedicationAlert(alert)) return false;
  // A reminder entered by hand has no linked prescription dates. Only an absent ID
  // selects this branch; an invalid/stale ID must never silently become a manual alert.
  if (alert.medicationId === undefined) return true;
  const medication = state.medications.find(item => item.id === alert.medicationId);
  const today = toISO(now);
  if (!medication?.active || (medication.endDate && medication.endDate < today)) return false;
  if (!alert.treatmentId) return true;
  const treatment = state.medicationCare?.treatments.find(item => item.id === alert.treatmentId);
  return !!treatment?.active && treatment.medicationIds.includes(medication.id) && (!treatment.endDate || treatment.endDate >= today);
}

/** Device-local calendar dates; names, doses and clinical data never leave this planner. */
export function planMedicationNotifications(
  state: AppState,
  now = new Date(),
  capacity = MEDICATION_NOTIFICATION_LIMIT,
): MedicationNotificationPlan {
  const entries: MedicationNotificationEntry[] = [];
  let limited = false;
  const today = toISO(now);
  const maxEntries = Math.max(0, Math.min(MEDICATION_NOTIFICATION_LIMIT, capacity));
  const add = (alertId: string, trigger: MedicationNotificationTrigger) => {
    const suffix = trigger.kind === 'date' ? String(trigger.date)
      : `${trigger.kind}:${'weekday' in trigger ? trigger.weekday : 'all'}:${trigger.hour}:${trigger.minute}:tz${now.getTimezoneOffset()}`;
    const identifier = `${MEDICATION_NOTIFICATION_PREFIX}${encodeURIComponent(state.profile.id)}:${encodeURIComponent(alertId)}:${suffix}:${MEDICATION_NOTIFICATION_EVENT_SUFFIX}`;
    entries.push({ identifier, trigger });
  };
  const alerts = [...(state.medicationCare?.alerts ?? [])].sort((a, b) => a.id.localeCompare(b.id));
  for (const alert of alerts) {
    if (!alert.enabled || !isMedicationAlertEligible(state, alert, now)) continue;
    const medication = alert.medicationId === undefined ? undefined : state.medications.find(item => item.id === alert.medicationId);
    const treatment = alert.treatmentId ? state.medicationCare?.treatments.find(item => item.id === alert.treatmentId) : undefined;
    const start = [medication?.startDate, treatment?.startDate].filter((value): value is string => !!value).sort().at(-1) ?? today;
    const end = [medication?.endDate, treatment?.endDate].filter((value): value is string => !!value).sort()[0];
    if (end && end < today) continue;
    const days = [...new Set(alert.days)].filter(day => Number.isInteger(day) && day >= 0 && day <= 6).sort();
    if (!days.length) continue;
    const [hour, minute] = alert.time.split(':').map(Number);
    if (alert.recurrence?.type === 'monthly') {
      // Real calendar dates preserve the anchor, including six-month intervals and
      // skipped short months. Keep the next occurrence even when it lies beyond
      // the rolling horizon; resume/foreground renews subsequent one-off dates.
      const horizon = addDays(today, 60);
      let date = nextMedicationAlertDate(alert, start > today ? start : today);
      let beyondHorizon = false;
      while (date) {
        if (end && date > end) break;
        const at = localDateTime(date, alert.time);
        const validTime = Number.isFinite(at.getTime()) && at.getTime() > now.getTime()
          && at.getHours() === hour && at.getMinutes() === minute;
        if (validTime && medicationAlertMatchesDate(alert, date)) {
          if (date > horizon) {
            if (beyondHorizon) { limited = true; break; }
            beyondHorizon = true;
          }
          add(alert.id, { kind: 'date', date: at.getTime() });
        }
        const next = nextMedicationAlertDate(alert, date, false);
        if (!next || next <= date) break;
        date = next;
      }
      continue;
    }
    if (!end && start <= today) {
      if (days.length === 7) add(alert.id, { kind: 'daily', hour, minute });
      else for (const day of days) add(alert.id, { kind: 'weekly', weekday: day + 1, hour, minute });
      continue;
    }
    // A repeating trigger cannot respect a future start or final date. Schedule a bounded
    // set of one-off occurrences instead, refreshed on foreground/resume. Never ring past end.
    const first = start > today ? start : today;
    const horizon = addDays(today, 60);
    const last = end && end < horizon ? end : horizon;
    if (!end || end > horizon) limited = true;
    if (first > horizon) { limited = true; continue; }
    for (let date = first; date <= last; date = addDays(date, 1)) {
      const at = localDateTime(date, alert.time);
      if (at.getTime() <= now.getTime() || !medicationAlertMatchesDate(alert, date)) continue;
      // DST gaps may move the wall-clock time forward. Do not silently ring at a different hour.
      if (at.getHours() !== hour || at.getMinutes() !== minute) continue;
      add(alert.id, { kind: 'date', date: at.getTime() });
    }
  }
  // Spread the available slots across the nearest occurrences, rather than allowing the
  // first finite treatment to consume the whole system quota before other medications.
  const nextTime = (trigger: MedicationNotificationTrigger): number => {
    if (trigger.kind === 'date') return trigger.date;
    const date = new Date(now);
    date.setHours(trigger.hour, trigger.minute, 0, 0);
    if (trigger.kind === 'weekly') date.setDate(date.getDate() + ((trigger.weekday - 1 - date.getDay() + 7) % 7));
    if (date.getTime() <= now.getTime()) date.setDate(date.getDate() + (trigger.kind === 'daily' ? 1 : 7));
    return date.getTime();
  };
  entries.sort((a, b) => nextTime(a.trigger) - nextTime(b.trigger) || a.identifier.localeCompare(b.identifier));
  return { entries: entries.slice(0, maxEntries), limited: limited || entries.length > maxEntries };
}

