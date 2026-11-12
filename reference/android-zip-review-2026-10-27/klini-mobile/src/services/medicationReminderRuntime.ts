import type { AppState } from '../domain/types';
import { medicationReminderOccurrenceKey, type MedicationAlert } from '../domain/medicationCare';
import { addDays, localDateTime, toISO } from '../domain/dates';
import { medicationAlertMatchesDate } from '../domain/medicationRecurrence';
import { isMedicationAlertEligible, MEDICATION_NOTIFICATION_EVENT_SUFFIX, MEDICATION_NOTIFICATION_PREFIX, type MedicationNotificationEntry } from './medicationNotificationPlan';

export interface MedicationReminderEvent {
  profileId: string;
  alertId: string;
  date: string;
  time: string;
  occurrenceKey: string;
  source: 'clock' | 'notification' | 'response';
}
const KIND = 'klini-medication-reminder';
const MAX_AGE = 24 * 60 * 60 * 1000;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const isTime = (value: unknown): value is string => typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
const localTime = (date: Date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
const identity = (part: string): string | undefined => {
  try {
    const decoded = decodeURIComponent(part);
    return decoded.length > 0 && decoded.length <= 256 && !/[\u0000-\u001f]/.test(decoded) && encodeURIComponent(decoded) === part ? decoded : undefined;
  } catch { return undefined; }
};
type ScheduleReference = { profileId: string; alertId: string; time: string } & (
  | { triggerKind: 'daily' }
  | { triggerKind: 'weekly'; weekday: number }
  | { triggerKind: 'date'; scheduledAt: number; date: string }
);

/** No names, concentrations, doses or clinical text are included in this opaque reference. */
export function medicationNotificationReferenceData(entry: MedicationNotificationEntry): Record<string, string | number> {
  const reference = parseIdentifier(entry.identifier);
  if (!reference) throw new Error('No se encontró la referencia del recordatorio.');
  if (entry.trigger.kind !== reference.triggerKind) throw new Error('La referencia del recordatorio no coincide.');
  if (entry.trigger.kind === 'date' && (reference.triggerKind !== 'date' || reference.scheduledAt !== entry.trigger.date)) throw new Error('La fecha del recordatorio no coincide.');
  if (entry.trigger.kind !== 'date' && reference.time !== `${String(entry.trigger.hour).padStart(2, '0')}:${String(entry.trigger.minute).padStart(2, '0')}`) throw new Error('La hora del recordatorio no coincide.');
  if (entry.trigger.kind === 'weekly' && (reference.triggerKind !== 'weekly' || reference.weekday !== entry.trigger.weekday)) throw new Error('El día del recordatorio no coincide.');
  return { kind: KIND, version: 1, ...reference };
}

function parseIdentifier(identifier: unknown): ScheduleReference | undefined {
  if (typeof identifier !== 'string' || !identifier.startsWith(MEDICATION_NOTIFICATION_PREFIX) || identifier.length > 1024) return;
  const parts = identifier.slice(MEDICATION_NOTIFICATION_PREFIX.length).split(':');
  const profileId = identity(parts[0] ?? ''); const alertId = identity(parts[1] ?? '');
  if (!profileId || !alertId || parts.at(-1) !== MEDICATION_NOTIFICATION_EVENT_SUFFIX) return;
  if (parts.length === 4 && /^\d{12,15}$/.test(parts[2])) {
    const scheduledAt = Number(parts[2]); const date = new Date(scheduledAt);
    if (!Number.isFinite(date.getTime())) return;
    return { profileId, alertId, triggerKind: 'date', scheduledAt, date: toISO(date), time: localTime(date) };
  }
  // prefix:profile:alert:kind:day:hour:minute:tzOffset:event1
  if (parts.length !== 8 || !/^(?:daily|weekly)$/.test(parts[2]) || !/^tz-?\d{1,4}$/.test(parts[6]) || Math.abs(Number(parts[6].slice(2))) > 900) return;
  if (!/^\d{1,2}$/.test(parts[4]) || !/^\d{1,2}$/.test(parts[5])) return;
  const time = `${parts[4].padStart(2, '0')}:${parts[5].padStart(2, '0')}`;
  if (!isTime(time)) return;
  if (parts[2] === 'daily' && parts[3] === 'all') return { profileId, alertId, triggerKind: 'daily', time };
  if (parts[2] === 'weekly' && /^[1-7]$/.test(parts[3])) return { profileId, alertId, triggerKind: 'weekly', weekday: Number(parts[3]), time };
}

export function isOwnMedicationReminderNotification(value: unknown): boolean {
  if (!object(value) || !object(value.request) || !object(value.request.content) || !object(value.request.content.data)) return false;
  return typeof value.request.identifier === 'string' && value.request.identifier.startsWith(MEDICATION_NOTIFICATION_PREFIX) && value.request.content.data.kind === KIND;
}

/** The one app-wide policy preserves SDK 58 defaults for unrelated notifications. */
export function medicationReminderPresentation(value: unknown) {
  const own = isOwnMedicationReminderNotification(value);
  return { shouldShowBanner: !own, shouldShowList: !own, shouldPlaySound: true, shouldSetBadge: !own };
}

/** Untrusted OS metadata can select an occurrence only; all display text comes from current state. */
export function parseMedicationReminderEvent(value: unknown, source: 'notification' | 'response', now = new Date()): MedicationReminderEvent | null {
  if (!Number.isFinite(now.getTime())) return null;
  if (!object(value) || !object(value.request) || !object(value.request.content) || !object(value.request.content.data)) return null;
  if (source !== 'notification' && source !== 'response') return null;
  const deliveredAt = value.date;
  if (typeof deliveredAt !== 'number' || !Number.isFinite(deliveredAt) || deliveredAt > now.getTime() || now.getTime() - deliveredAt > MAX_AGE) return null;
  const reference = parseIdentifier(value.request.identifier);
  const data = value.request.content.data;
  if (!reference || data.kind !== KIND || data.version !== 1 || data.profileId !== reference.profileId || data.alertId !== reference.alertId || data.time !== reference.time || data.triggerKind !== reference.triggerKind) return null;
  if (reference.triggerKind === 'weekly' && data.weekday !== reference.weekday) return null;
  if (reference.triggerKind === 'date' && (data.scheduledAt !== reference.scheduledAt || data.date !== reference.date)) return null;
  let date: string;
  if (reference.triggerKind === 'date') date = reference.date;
  else {
    const delivered = new Date(deliveredAt);
    date = toISO(delivered);
    if (reference.triggerKind === 'weekly') date = addDays(date, -((delivered.getDay() - (reference.weekday - 1) + 7) % 7));
    if (localDateTime(date, reference.time).getTime() > deliveredAt) date = addDays(date, reference.triggerKind === 'daily' ? -1 : -7);
  }
  const occurrence = localDateTime(date, reference.time);
  if (localTime(occurrence) !== reference.time || occurrence.getTime() > deliveredAt || occurrence.getTime() > now.getTime() || now.getTime() - occurrence.getTime() > MAX_AGE) return null;
  return { profileId: reference.profileId, alertId: reference.alertId, date, time: reference.time, occurrenceKey: medicationReminderOccurrenceKey(reference.alertId, date, reference.time), source };
}

function inAlertWindow(state: AppState, alert: MedicationAlert, date: string): boolean {
  const medication = alert.medicationId ? state.medications.find(item => item.id === alert.medicationId) : undefined;
  const treatment = alert.treatmentId ? state.medicationCare?.treatments.find(item => item.id === alert.treatmentId) : undefined;
  const start = [medication?.startDate, treatment?.startDate].filter((value): value is string => !!value).sort().at(-1);
  const end = [medication?.endDate, treatment?.endDate].filter((value): value is string => !!value).sort()[0];
  return (!start || date >= start) && (!end || date <= end);
}

export function isMedicationReminderEventCurrent(state: AppState, event: MedicationReminderEvent, now = new Date()): boolean {
  if (!Number.isFinite(now.getTime()) || !['clock', 'notification', 'response'].includes(event.source)) return false;
  if (event.profileId !== state.profile.id || !isTime(event.time) || !/^\d{4}-\d{2}-\d{2}$/.test(event.date)) return false;
  const at = localDateTime(event.date, event.time);
  if (!Number.isFinite(at.getTime()) || toISO(at) !== event.date || localTime(at) !== event.time || at.getTime() > now.getTime() || now.getTime() - at.getTime() > MAX_AGE || event.occurrenceKey !== medicationReminderOccurrenceKey(event.alertId, event.date, event.time)) return false;
  const alert = state.medicationCare?.alerts.find(item => item.id === event.alertId);
  if (!alert?.enabled || alert.time !== event.time || !medicationAlertMatchesDate(alert, event.date) || !isMedicationAlertEligible(state, alert, now) || !inAlertWindow(state, alert, event.date)) return false;
  return !state.medicationCare?.reminderActions?.some(action => medicationReminderOccurrenceKey(action.alertId, action.date, action.time) === event.occurrenceKey);
}

/** Exact local-minute generation only. Neither reading the clock nor this fallback requests OS permissions. */
export function getDueMedicationReminders(state: AppState, now = new Date(), seen?: ReadonlySet<string>): MedicationReminderEvent[] {
  if (!Number.isFinite(now.getTime())) return [];
  const date = toISO(now); const time = localTime(now);
  return (state.medicationCare?.alerts ?? []).flatMap(alert => {
    if (!alert.enabled || alert.time !== time) return [];
    const occurrenceKey = medicationReminderOccurrenceKey(alert.id, date, time);
    const event: MedicationReminderEvent = { profileId: state.profile.id, alertId: alert.id, date, time, occurrenceKey, source: 'clock' };
    return !seen?.has(occurrenceKey) && isMedicationReminderEventCurrent(state, event, now) ? [event] : [];
  });
}

export interface MedicationReminderEventsAdapter {
  defaultActionIdentifier: string;
  onReceived: (listener: (notification: unknown) => void) => { remove: () => void };
  onResponse: (listener: (response: unknown) => void) => { remove: () => void };
  lastResponse: () => unknown | Promise<unknown>;
  clearLastResponse: () => void;
}

/** Lazy adapter with testable cleanup; native and web never need a provider or a push token. */
export function subscribeMedicationReminderEventsWith(
  load: () => Promise<MedicationReminderEventsAdapter | null>,
  listener: (event: MedicationReminderEvent) => void,
  now: () => Date = () => new Date(),
): () => void {
  let active = true;
  const subscriptions: { remove: () => void }[] = [];
  const seen = new Set<string>();
  const emit = (notification: unknown, source: 'notification' | 'response') => {
    if (!active) return false;
    const event = parseMedicationReminderEvent(notification, source, now());
    if (!event) return false;
    const key = `${event.profileId}|${event.occurrenceKey}`;
    if (seen.has(key)) return true;
    seen.add(key);
    if (seen.size > 256) seen.delete(seen.values().next().value!);
    try { listener(event); } catch { seen.delete(key); return false; }
    return true;
  };
  const cleanup = () => { active = false; subscriptions.splice(0).forEach(subscription => { try { subscription.remove(); } catch { /* Already removed. */ } }); };
  void Promise.resolve().then(load).then(async adapter => {
    if (!active || !adapter) return;
    const response = (value: unknown) => {
      if (!object(value) || value.actionIdentifier !== adapter.defaultActionIdentifier) return;
      if (emit(value.notification, 'response')) { try { adapter.clearLastResponse(); } catch { /* Does not affect delivery. */ } }
    };
    subscriptions.push(adapter.onReceived(value => { emit(value, 'notification'); }));
    subscriptions.push(adapter.onResponse(response));
    try {
      const last = await adapter.lastResponse();
      if (active) response(last);
    } catch { /* A failed cold-start read must not remove working live listeners. */ }
  }).catch(cleanup);
  return cleanup;
}
