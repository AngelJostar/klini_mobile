import type { AppState, Medication } from './types';
import { parseDate, toISO } from './dates';
import { isMedicationAlertRecurrence, medicationAlertMatchesDate, type MedicationAlertRecurrence } from './medicationRecurrence';
export type { MedicationAlertRecurrence } from './medicationRecurrence';

/** Patient-entered records. These values never infer a prescription or a dose. */
export interface MedicationTreatment {
  id: string;
  name: string;
  medicationIds: string[];
  startDate: string;
  endDate?: string;
  active: boolean;
}
export interface MedicationTake {
  id: string;
  medicationId: string;
  treatmentId?: string;
  date: string;
  time: string;
  dose: string;
  status: 'taken' | 'skipped';
}
export interface MedicationAlert {
  id: string;
  medicationId?: string;
  /** Standalone reminders retain the user's text without creating a medication record. */
  medicationName?: string;
  concentration?: string;
  treatmentId?: string;
  time: string;
  /** Local weekdays: 0 Sunday ... 6 Saturday. Seven entries means every day. */
  days: number[];
  /** Optional anchored month interval. Its weekday set remains the canonical seven days. */
  recurrence?: MedicationAlertRecurrence;
  enabled: boolean;
}
export type Treatment = MedicationTreatment;
export type Take = MedicationTake;
export type Alert = MedicationAlert;
export interface MedicationReminderAction {
  id: string;
  alertId: string;
  date: string;
  time: string;
  status: 'taken' | 'skipped';
  recordedAt: string;
  nameSnapshot: string;
  doseSnapshot?: string;
  medicationId?: string;
  takeId?: string;
}
export interface MedicationCare {
  treatments: MedicationTreatment[];
  takes: MedicationTake[];
  alerts: MedicationAlert[];
  reminderActions?: MedicationReminderAction[];
}
export const emptyMedicationCare = (): MedicationCare => ({ treatments: [], takes: [], alerts: [] });

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const nonempty = (value: unknown): value is string => typeof value === 'string' && !!value.trim();
const date = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0, 4)) >= 1900 && Number(value.slice(0, 4)) <= 2200 && toISO(parseDate(value)) === value;
const time = (value: unknown): value is string => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const optionalId = (value: unknown) => value === undefined || nonempty(value);
const unique = <T>(values: T[]) => new Set(values).size === values.length;
const boundedText = (value: unknown, limit: number): value is string => nonempty(value) && value.length <= limit;
const normalizedAlertText = (value: string | undefined): string => (value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
export const medicationReminderOccurrenceKey = (alertId: string, day: string, clock: string): string => `${encodeURIComponent(alertId)}|${day}|${clock}`;

export function isMedicationReminderAction(value: unknown, now = Date.now()): value is MedicationReminderAction {
  if (!object(value) || !nonempty(value.id) || !nonempty(value.alertId) || !date(value.date) || !time(value.time) || (value.status !== 'taken' && value.status !== 'skipped') || !nonempty(value.nameSnapshot) || !optionalId(value.medicationId) || !optionalId(value.takeId) || (value.doseSnapshot !== undefined && !nonempty(value.doseSnapshot)) || typeof value.recordedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.recordedAt)) return false;
  const recorded = new Date(value.recordedAt);
  if (Number.isNaN(recorded.getTime()) || recorded.toISOString() !== value.recordedAt || recorded.getTime() > now) return false;
  const occurrence = parseDate(value.date);
  const [hours, minutes] = value.time.split(':').map(Number);
  occurrence.setHours(hours, minutes, 0, 0);
  return occurrence.getHours() === hours && occurrence.getMinutes() === minutes && occurrence.getTime() <= recorded.getTime();
}

export function isMedicationTreatment(value: unknown): value is MedicationTreatment {
  return object(value) && nonempty(value.id) && nonempty(value.name) && Array.isArray(value.medicationIds) && value.medicationIds.length > 0 && value.medicationIds.every(nonempty) && unique(value.medicationIds) && date(value.startDate) && (value.endDate === undefined || (date(value.endDate) && value.endDate >= value.startDate)) && typeof value.active === 'boolean';
}
export function isMedicationTake(value: unknown, now = Date.now()): value is MedicationTake {
  if (!object(value) || !nonempty(value.id) || !nonempty(value.medicationId) || !optionalId(value.treatmentId) || !date(value.date) || !time(value.time) || !nonempty(value.dose) || (value.status !== 'taken' && value.status !== 'skipped')) return false;
  const recordedAt = parseDate(value.date);
  const [hours, minutes] = value.time.split(':').map(Number);
  recordedAt.setHours(hours, minutes, 0, 0);
  return recordedAt.getTime() <= now;
}
export function isMedicationAlert(value: unknown): value is MedicationAlert {
  return object(value) && nonempty(value.id) && optionalId(value.medicationId) &&
    (value.medicationName === undefined || boundedText(value.medicationName, 120)) &&
    (value.concentration === undefined || boundedText(value.concentration, 80)) &&
    (nonempty(value.medicationId) || boundedText(value.medicationName, 120)) &&
    optionalId(value.treatmentId) && (value.treatmentId === undefined || nonempty(value.medicationId)) &&
    time(value.time) && Array.isArray(value.days) && value.days.length >= 1 && value.days.length <= 7 && value.days.every(day => Number.isInteger(day) && day >= 0 && day <= 6) && unique(value.days) &&
    (value.recurrence === undefined || (isMedicationAlertRecurrence(value.recurrence) && value.days.length === 7)) && typeof value.enabled === 'boolean';
}

/** Validates references against this profile only, including linked treatment membership. */
export function isMedicationCare(value: unknown, medications: readonly Medication[], now = Date.now()): value is MedicationCare {
  if (!object(value) || !Array.isArray(value.treatments) || !value.treatments.every(isMedicationTreatment) || !Array.isArray(value.takes) || !value.takes.every(item => isMedicationTake(item, now)) || !Array.isArray(value.alerts) || !value.alerts.every(isMedicationAlert)) return false;
  const care = value as unknown as MedicationCare;
  if (care.reminderActions !== undefined && (!Array.isArray(care.reminderActions) || !care.reminderActions.every(item => isMedicationReminderAction(item, now)) || !unique(care.reminderActions.map(item => item.id)) || !unique(care.reminderActions.map(item => medicationReminderOccurrenceKey(item.alertId, item.date, item.time))))) return false;
  if (![care.treatments, care.takes, care.alerts].every(items => unique(items.map(item => item.id)))) return false;
  const medicationIds = new Set(medications.map(item => item.id));
  const treatmentIds = new Map(care.treatments.map(item => [item.id, item]));
  const validReference = (item: MedicationTake | MedicationAlert) => item.medicationId === undefined
    ? item.treatmentId === undefined
    : medicationIds.has(item.medicationId) && (item.treatmentId === undefined || !!treatmentIds.get(item.treatmentId)?.medicationIds.includes(item.medicationId));
  return care.treatments.every(item => item.medicationIds.every(id => medicationIds.has(id))) && care.takes.every(validReference) && care.alerts.every(validReference) &&
    unique(care.takes.map(item => JSON.stringify([item.medicationId, item.treatmentId ?? '', item.date, item.time]))) &&
    unique(care.alerts.map(item => JSON.stringify([
      ...(item.medicationId ? ['record', item.medicationId, item.treatmentId ?? ''] : ['manual', normalizedAlertText(item.medicationName), normalizedAlertText(item.concentration)]),
      item.time, [...item.days].sort(), item.recurrence ? [item.recurrence.type, item.recurrence.intervalMonths, item.recurrence.anchorDate] : null,
    ])));
}

export function getProfileMedicationCare(state: AppState, profileId: string): MedicationCare | undefined {
  return state.profile.id === profileId ? state.medicationCare : state.family?.profiles[profileId]?.medicationCare;
}
function profileMedications(state: AppState, profileId: string): Medication[] | undefined {
  return state.profile.id === profileId ? state.medications : state.family?.profiles[profileId]?.medications;
}
export function setProfileMedicationCare(state: AppState, profileId: string, care: MedicationCare | undefined): AppState {
  const active = state.profile.id === profileId;
  const scope = state.family?.profiles[profileId];
  if (!active && !scope) throw new Error('No se encontró el perfil para guardar medicamentos.');
  const next = active ? { ...state, medicationCare: care } : { ...state };
  if (state.family && scope) {
    // Active scopes may be cached before a new medication was added. Keep its references aligned.
    next.family = { ...state.family, profiles: { ...state.family.profiles, [profileId]: { ...scope, medications: active ? state.medications : scope.medications, medicationCare: care } } };
  }
  return next;
}

/** A medication deletion also removes its records and empty treatments; no orphan histories remain. */
export function pruneMedicationCare(care: MedicationCare | undefined, medications: readonly Medication[]): MedicationCare | undefined {
  if (!care) return undefined;
  const ids = new Set(medications.map(item => item.id));
  const treatments = care.treatments.map(item => ({ ...item, medicationIds: item.medicationIds.filter(id => ids.has(id)) })).filter(item => item.medicationIds.length > 0);
  const treatmentIds = new Set(treatments.map(item => item.id));
  const valid = (item: MedicationTake | MedicationAlert) => item.medicationId === undefined
    ? item.treatmentId === undefined
    : ids.has(item.medicationId) && (item.treatmentId === undefined || treatmentIds.has(item.treatmentId));
  return { ...care, treatments, takes: care.takes.filter(valid), alerts: care.alerts.filter(valid) };
}

export type MedicationCareAction =
  | { type: 'SAVE_MEDICATION_TREATMENT'; profileId: string; treatment: MedicationTreatment }
  | { type: 'SAVE_MEDICATION_TAKE'; profileId: string; take: MedicationTake }
  | { type: 'SAVE_MEDICATION_ALERT'; profileId: string; alert: MedicationAlert }
  | { type: 'DELETE_MEDICATION_TAKE'; profileId: string; id: string }
  | { type: 'DELETE_MEDICATION_ALERT'; profileId: string; id: string };
export type MedicationCareCollection = 'treatments' | 'takes' | 'alerts';
export type MedicationCareItem = MedicationTreatment | MedicationTake | MedicationAlert;
export function medicationCareChange(action: MedicationCareAction): { collection: MedicationCareCollection; id: string; item?: MedicationCareItem } {
  switch (action.type) {
    case 'SAVE_MEDICATION_TREATMENT': return { collection: 'treatments', id: action.treatment.id, item: action.treatment };
    case 'SAVE_MEDICATION_TAKE': return { collection: 'takes', id: action.take.id, item: action.take };
    case 'SAVE_MEDICATION_ALERT': return { collection: 'alerts', id: action.alert.id, item: action.alert };
    case 'DELETE_MEDICATION_TAKE': return { collection: 'takes', id: action.id };
    case 'DELETE_MEDICATION_ALERT': return { collection: 'alerts', id: action.id };
  }
}
export function applyMedicationCareAction(state: AppState, action: MedicationCareAction, now = Date.now()): AppState {
  const medications = profileMedications(state, action.profileId);
  if (!medications) throw new Error('No se encontró el perfil para guardar medicamentos.');
  const care = getProfileMedicationCare(state, action.profileId) ?? emptyMedicationCare();
  const { collection, id, item } = medicationCareChange(action);
  if (!item && !care[collection].some(entry => entry.id === id)) throw new Error('No se encontró el registro de medicamento.');
  const items = care[collection].filter(entry => entry.id !== id);
  const candidate = { ...care, [collection]: item ? [...items, item] : items };
  if (!isMedicationCare(candidate, medications, now)) throw new Error('Revisa el medicamento, la dosis, las fechas y los horarios. No se admiten registros duplicados ni referencias de otro perfil.');
  return setProfileMedicationCare(state, action.profileId, candidate);
}

/** Undo one failed entity only when it still matches this attempt, preserving later edits/scopes. */
export function rollbackMedicationCareChange(state: AppState, action: MedicationCareAction, previous: MedicationCareItem | undefined): AppState {
  const medications = profileMedications(state, action.profileId);
  const care = getProfileMedicationCare(state, action.profileId);
  if (!care || !medications) return state;
  const { collection, id, item: expected } = medicationCareChange(action);
  const current = care[collection].find(entry => entry.id === id);
  if (JSON.stringify(current) !== JSON.stringify(expected)) return state;
  const items = care[collection].filter(entry => entry.id !== id);
  const candidate = { ...care, [collection]: previous ? [...items, previous] : items };
  // A medication deleted while storage was pending must not be resurrected by rollback.
  if (!isMedicationCare(candidate, medications)) return state;
  return setProfileMedicationCare(state, action.profileId, candidate);
}

/** Shared coordinator used by the store so tests exercise waiting, FIFO and reset contracts. */
export function createMedicationCareWriter(access: {
  current: () => AppState;
  generation: () => number;
  publish: (state: AppState) => void;
  persist: (state: AppState) => Promise<void>;
  reduce: (state: AppState, action: MedicationCareAction) => AppState;
}) {
  let tail: Promise<void> = Promise.resolve();
  return (action: MedicationCareAction): Promise<void> => {
    const generation = access.generation();
    const operation = tail.then(async () => {
      if (generation !== access.generation()) throw new Error('El guardado se canceló al restablecer la demostración.');
      const { collection, id } = medicationCareChange(action);
      const previous = getProfileMedicationCare(access.current(), action.profileId)?.[collection].find(item => item.id === id);
      const next = access.reduce(access.current(), action);
      access.publish(next);
      try {
        await access.persist(next);
        if (generation !== access.generation()) throw new Error('El guardado se canceló al restablecer la demostración.');
      } catch (error) {
        if (generation === access.generation()) {
          const rollback = rollbackMedicationCareChange(access.current(), action, previous);
          if (rollback !== access.current()) {
            access.publish(rollback);
            await access.persist(rollback).catch(() => undefined);
          }
        }
        throw error;
      }
    });
    tail = operation.catch(() => undefined);
    return operation;
  };
}

export const SOFIA_MEDICATION_REMINDER_DEMO = Object.freeze({
  ownerId: 'patient-sofia', medicationId: 'demo-medication-atorvastatin',
  treatmentId: 'demo-treatment-cholesterol', alertId: 'demo-alert-atorvastatin-2000',
});

/** Opt-in demo setup for the known fictional owner; the marker preserves later deletion/disable. */
export function provisionSofiaDemoMedicationCare(state: AppState, now = Date.now()): AppState {
  const demo = SOFIA_MEDICATION_REMINDER_DEMO;
  if (state.medicationReminderDemoVersion === 1 || (state.family?.ownerId ?? state.profile.id) !== demo.ownerId) return state;
  const medications = profileMedications(state, demo.ownerId);
  if (!medications) return state;
  const care = getProfileMedicationCare(state, demo.ownerId) ?? emptyMedicationCare();
  // Existing stable identifiers may have been edited. Never replace the user's saved values.
  if (medications.some(item => item.id === demo.medicationId) || care.treatments.some(item => item.id === demo.treatmentId) || care.alerts.some(item => item.id === demo.alertId)) return { ...state, medicationReminderDemoVersion: 1 };
  const today = toISO(new Date(now));
  const nextMedications = [...medications, { id: demo.medicationId, name: 'Atorvastatina', dose: '80 mg', frequency: 'Una vez al día', startDate: today, active: true }];
  const nextCare: MedicationCare = {
    ...care,
    treatments: [...care.treatments, { id: demo.treatmentId, name: 'Control de colesterol · Demostración', medicationIds: [demo.medicationId], startDate: today, active: true }],
    alerts: [...care.alerts, { id: demo.alertId, medicationId: demo.medicationId, treatmentId: demo.treatmentId, time: '20:00', days: [0, 1, 2, 3, 4, 5, 6], enabled: true }],
  };
  let next = state.profile.id === demo.ownerId ? { ...state, medications: nextMedications } : {
    ...state, family: { ...state.family!, profiles: { ...state.family!.profiles, [demo.ownerId]: { ...state.family!.profiles[demo.ownerId], medications: nextMedications } } },
  };
  next = setProfileMedicationCare(next, demo.ownerId, nextCare);
  return { ...next, medicationReminderDemoVersion: 1 };
}

export type MedicationReminderMutation =
  | { type: 'SET_TREATMENT_ALERTS_ENABLED'; treatmentId: string; enabled: boolean }
  | { type: 'ACKNOWLEDGE_REMINDER'; alertId: string; date: string; time: string; status: 'taken' | 'skipped'; occurrenceKey?: string; id: string; takeId: string; recordedAt?: number };

/** A group switch only changes existing schedules. It never creates a prescription or time. */
export function applyMedicationReminderMutation(state: AppState, profileId: string, mutation: MedicationReminderMutation, now = Date.now()): AppState {
  const medications = profileMedications(state, profileId);
  if (!medications) throw new Error('No se encontró el perfil del recordatorio.');
  const care = getProfileMedicationCare(state, profileId) ?? emptyMedicationCare();
  let candidate: MedicationCare;
  if (mutation.type === 'SET_TREATMENT_ALERTS_ENABLED') {
    if (typeof mutation.enabled !== 'boolean') throw new Error('Revisa el estado de las alertas.');
    const treatment = care.treatments.find(item => item.id === mutation.treatmentId);
    if (!treatment) throw new Error('No se encontró el tratamiento.');
    const linked = (alert: MedicationAlert) => alert.treatmentId === treatment.id || (!alert.treatmentId && !!alert.medicationId && treatment.medicationIds.includes(alert.medicationId));
    if (!care.alerts.some(linked)) throw new Error('Crea primero una alerta y elige su horario.');
    if (care.alerts.filter(linked).every(item => item.enabled === mutation.enabled)) return state;
    candidate = { ...care, alerts: care.alerts.map(item => linked(item) ? { ...item, enabled: mutation.enabled } : item) };
  } else {
    if (!date(mutation.date) || !time(mutation.time) || (mutation.status !== 'taken' && mutation.status !== 'skipped')) throw new Error('Revisa la fecha, el horario y la respuesta del recordatorio.');
    const occurrenceKey = medicationReminderOccurrenceKey(mutation.alertId, mutation.date, mutation.time);
    if (mutation.occurrenceKey !== undefined && mutation.occurrenceKey !== occurrenceKey) throw new Error('El recordatorio cambió. Vuelve a abrirlo.');
    if (care.reminderActions?.some(item => medicationReminderOccurrenceKey(item.alertId, item.date, item.time) === occurrenceKey)) return state;
    const alert = care.alerts.find(item => item.id === mutation.alertId);
    if (!alert) throw new Error('No se encontró la alerta.');
    if (!alert.enabled) throw new Error('La alerta está desactivada. Vuelve a revisar el recordatorio.');
    const confirmedAt = mutation.recordedAt ?? now;
    if (!Number.isFinite(confirmedAt) || confirmedAt > now) throw new Error('Revisa la hora de confirmación del recordatorio.');
    const occurrence = parseDate(mutation.date);
    const [hours, minutes] = mutation.time.split(':').map(Number);
    occurrence.setHours(hours, minutes, 0, 0);
    if (occurrence.getTime() > confirmedAt || confirmedAt - occurrence.getTime() > 24 * 60 * 60 * 1000 || occurrence.getHours() !== hours || occurrence.getMinutes() !== minutes || mutation.time !== alert.time || !medicationAlertMatchesDate(alert, mutation.date)) throw new Error('El recordatorio aún no vence, ya pasó o su horario cambió.');
    const medication = alert.medicationId ? medications.find(item => item.id === alert.medicationId) : undefined;
    if (alert.medicationId && !medication) throw new Error('No se encontró el medicamento de esta alerta.');
    const treatment = alert.treatmentId ? care.treatments.find(item => item.id === alert.treatmentId) : undefined;
    if (medication && !medication.active) throw new Error('El medicamento ya no está vigente.');
    if (alert.treatmentId && !treatment?.active) throw new Error('El tratamiento ya no está vigente.');
    if (medication && (mutation.date < medication.startDate || (medication.endDate && mutation.date > medication.endDate))) throw new Error('La fecha no corresponde al periodo del medicamento.');
    if (treatment && (mutation.date < treatment.startDate || (treatment.endDate && mutation.date > treatment.endDate))) throw new Error('La fecha no corresponde al periodo del tratamiento.');
    const dose = medication?.dose || alert.concentration;
    if (medication && !medication.dose.trim()) throw new Error('Completa la dosis registrada del medicamento antes de registrar su toma.');
    const recorded = new Date(confirmedAt);
    const clock = `${String(recorded.getHours()).padStart(2, '0')}:${String(recorded.getMinutes()).padStart(2, '0')}`;
    let takes = care.takes;
    let takeId: string | undefined;
    if (medication) {
      const existing = care.takes.find(item => item.medicationId === medication.id && item.treatmentId === alert.treatmentId && item.date === toISO(recorded) && item.time === clock);
      if (existing && (existing.status !== mutation.status || existing.dose !== medication.dose)) throw new Error('Ya existe una toma distinta en este minuto. Revisa ese registro antes de confirmar.');
      takeId = existing?.id ?? mutation.takeId;
      if (!existing) takes = [...takes, { id: takeId, medicationId: medication.id, treatmentId: alert.treatmentId, date: toISO(recorded), time: clock, dose: medication.dose, status: mutation.status }];
    }
    const action: MedicationReminderAction = { id: mutation.id, alertId: alert.id, date: mutation.date, time: mutation.time, status: mutation.status, recordedAt: recorded.toISOString(), nameSnapshot: medication?.name ?? alert.medicationName!, ...(dose && { doseSnapshot: dose }), ...(medication && { medicationId: medication.id }), ...(takeId && { takeId }) };
    candidate = { ...care, takes, reminderActions: [...(care.reminderActions ?? []), action] };
  }
  if (!isMedicationCare(candidate, medications, now)) throw new Error('No se pudo guardar la respuesta del recordatorio. Revisa sus datos.');
  return setProfileMedicationCare(state, profileId, candidate);
}

/** Revert matching entities only across one multi-entity reminder transaction. */
export function rollbackMedicationCareTransaction(state: AppState, profileId: string, previous: MedicationCare | undefined, expected: MedicationCare): AppState {
  const medications = profileMedications(state, profileId);
  const current = getProfileMedicationCare(state, profileId);
  if (!medications || !current) return state;
  let candidate = current;
  const before = previous ?? emptyMedicationCare();
  let changed = false;
  for (const collection of ['treatments', 'takes', 'alerts', 'reminderActions'] as const) {
    const oldItems = before[collection] ?? [], expectedItems = expected[collection] ?? [];
    let items: { id: string }[] = candidate[collection] ?? [];
    for (const id of new Set([...oldItems.map(item => item.id), ...expectedItems.map(item => item.id)])) {
      const oldItem = oldItems.find(item => item.id === id), expectedItem = expectedItems.find(item => item.id === id);
      if (JSON.stringify(oldItem) === JSON.stringify(expectedItem) || JSON.stringify(items.find(item => item.id === id)) !== JSON.stringify(expectedItem)) continue;
      const position = items.findIndex(item => item.id === id);
      if (oldItem && position >= 0) items = items.map(item => item.id === id ? oldItem : item);
      else if (oldItem) {
        const restoreAt = Math.min(oldItems.findIndex(item => item.id === id), items.length);
        items = [...items.slice(0, restoreAt), oldItem, ...items.slice(restoreAt)];
      } else items = items.filter(item => item.id !== id);
      changed = true;
    }
    if (items !== candidate[collection] && (candidate[collection] !== undefined || expected[collection] !== undefined || before[collection] !== undefined)) candidate = { ...candidate, [collection]: items };
  }
  return changed && isMedicationCare(candidate, medications) ? setProfileMedicationCare(state, profileId, candidate) : state;
}
