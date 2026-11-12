import test from 'node:test';
import assert from 'node:assert/strict';
import { isMedicationAlertRecurrence, medicationAlertMatchesDate, medicationAlertRecurrenceLabel, nextMedicationAlertDate } from '../src/domain/medicationRecurrence';
import { applyMedicationReminderMutation, createMedicationCareWriter, getProfileMedicationCare, isMedicationAlert, type MedicationAlert, type MedicationCareAction } from '../src/domain/medicationCare';
import { appReducer, parseStoredState, validateAppState } from '../src/domain/reducer';
import { createDemoState } from '../src/domain/seed';
import { switchProfile } from '../src/domain/family';

const allDays = [0, 1, 2, 3, 4, 5, 6];
const now = new Date(2026, 10, 9, 12, 0, 30).getTime();
const child = { id: 'recurrence-child', name: 'Familiar de prueba', kind: 'Niño' as const };
const monthly = (anchorDate = '2026-01-01', intervalMonths: 1 | 6 = 1): MedicationAlert => ({ id: 'recurrence-alert', medicationName: 'Captura literal de prueba', concentration: 'Texto original', time: '09:00', days: [...allDays], enabled: true, recurrence: { type: 'monthly', intervalMonths, anchorDate } });
function ownerWithAlert(alert = monthly()) {
  const state = createDemoState(new Date(now));
  return appReducer(state, { type: 'SAVE_MEDICATION_ALERT', profileId: state.profile.id, alert }, now);
}

test('daily and weekly legacy alerts keep their calendar semantics and Spanish labels', () => {
  const daily = { days: allDays };
  assert.equal(medicationAlertRecurrenceLabel(daily), 'Todos los días');
  for (const date of ['2026-11-08', '2026-11-09', '2026-11-10']) assert.equal(medicationAlertMatchesDate(daily, date), true);
  const monday = { days: [1] };
  assert.equal(medicationAlertRecurrenceLabel(monday), 'Todos los lunes');
  assert.equal(medicationAlertRecurrenceLabel({ days: [0] }), 'Todos los domingos');
  assert.equal(medicationAlertRecurrenceLabel({ days: [5, 1, 3] }), 'Todos los lunes, miércoles y viernes');
  assert.equal(medicationAlertMatchesDate(monday, '2026-11-09'), true);
  assert.equal(medicationAlertMatchesDate(monday, '2026-11-08'), false);
  assert.equal(nextMedicationAlertDate(monday, '2026-11-09'), '2026-11-09');
  assert.equal(nextMedicationAlertDate(monday, '2026-11-09', false), '2026-11-16');
  assert.equal(nextMedicationAlertDate({ days: [0] }, '2026-11-09'), '2026-11-15');
});

test('monthly dates never precede the anchor and do not substitute a weekday or a short month end', () => {
  const first = monthly('2026-11-01');
  assert.equal(medicationAlertRecurrenceLabel(first), 'El 1 de cada mes');
  assert.equal(medicationAlertMatchesDate(first, '2026-10-01'), false);
  assert.equal(medicationAlertMatchesDate(first, '2026-11-01'), true);
  assert.equal(medicationAlertMatchesDate(first, '2026-12-01'), true);
  assert.equal(medicationAlertMatchesDate(first, '2026-12-02'), false);
  assert.equal(nextMedicationAlertDate(first, '2026-01-01'), '2026-11-01');
  assert.equal(nextMedicationAlertDate(first, '2026-11-01', false), '2026-12-01');
  const thirtyFirst = monthly('2026-01-31');
  assert.equal(medicationAlertMatchesDate(thirtyFirst, '2026-02-28'), false);
  assert.equal(medicationAlertMatchesDate(thirtyFirst, '2026-02-31'), false);
  assert.equal(nextMedicationAlertDate(thirtyFirst, '2026-01-31', false), '2026-03-31');
  assert.equal(nextMedicationAlertDate(thirtyFirst, '2026-04-01'), '2026-05-31');
  assert.equal(nextMedicationAlertDate(thirtyFirst, '2026-12-31', false), '2027-01-31');
});

test('six-month intervals retain the anchor phase across years and skip missing leap days', () => {
  const schedule = monthly('2024-02-29', 6);
  assert.equal(medicationAlertRecurrenceLabel(schedule), 'Cada 6 meses, el día 29');
  assert.equal(medicationAlertMatchesDate(schedule, '2024-08-29'), true);
  assert.equal(medicationAlertMatchesDate(schedule, '2025-02-28'), false);
  assert.equal(medicationAlertMatchesDate(schedule, '2025-03-29'), false);
  assert.equal(nextMedicationAlertDate(schedule, '2024-08-29', false), '2025-08-29');
  assert.equal(nextMedicationAlertDate(schedule, '2027-08-29', false), '2028-02-29');
  assert.equal(nextMedicationAlertDate(monthly('2026-08-31', 6), '2026-08-31', false), '2027-08-31', 'February has no 31st; do not shift to the 28th.');
  assert.equal(nextMedicationAlertDate(monthly('2199-08-31', 6), '2200-08-31', false), undefined);
});

test('recurrence validation rejects malformed anchors, intervals and ambiguous weekday combinations', () => {
  for (const invalid of [undefined, null, {}, { type: 'daily', intervalMonths: 1, anchorDate: '2026-01-01' }, { type: 'monthly', intervalMonths: 2, anchorDate: '2026-01-01' }, { type: 'monthly', intervalMonths: '6', anchorDate: '2026-01-01' }, { type: 'monthly', intervalMonths: 1, anchorDate: '2026-02-29' }, { type: 'monthly', intervalMonths: 1, anchorDate: '1899-12-31' }, { type: 'monthly', intervalMonths: 1, anchorDate: '2201-01-01' }]) assert.equal(isMedicationAlertRecurrence(invalid), false);
  assert.equal(isMedicationAlertRecurrence(monthly().recurrence), true);
  assert.equal(isMedicationAlert(monthly()), true);
  for (const days of [[], [1], [0, 0, 2, 3, 4, 5, 6]]) {
    const invalid = { ...monthly(), days };
    assert.equal(isMedicationAlert(invalid), false);
    assert.equal(medicationAlertMatchesDate(invalid, '2026-11-01'), false);
    assert.equal(nextMedicationAlertDate(invalid, '2026-11-01'), undefined);
  }
  assert.equal(nextMedicationAlertDate(monthly(), '2026-02-30'), undefined);
  assert.equal(medicationAlertMatchesDate({ days: [0, 0] }, '2026-11-08'), false);
  assert.equal(medicationAlertRecurrenceLabel({ days: [] }), 'Selecciona recurrencia');
  assert.equal(nextMedicationAlertDate({ days: [1] }, '2200-12-31', false), undefined);
});

test('monthly recurrence participates in semantic duplicate detection and survives reload without changing the legacy schema', () => {
  const state = ownerWithAlert();
  const profileId = state.profile.id;
  assert.throws(() => appReducer(state, { type: 'SAVE_MEDICATION_ALERT', profileId, alert: { ...monthly(), id: 'duplicate', medicationName: ' CAPTURA  LITERAL de prueba ', days: [...allDays].reverse() } }, now), /duplicados/);
  let next = appReducer(state, { type: 'SAVE_MEDICATION_ALERT', profileId, alert: { ...monthly('2026-01-01', 6), id: 'half-year' } }, now);
  next = appReducer(next, { type: 'SAVE_MEDICATION_ALERT', profileId, alert: { ...monthly('2026-02-01'), id: 'different-anchor' } }, now);
  next = appReducer(next, { type: 'SAVE_MEDICATION_ALERT', profileId, alert: { ...monthly(), id: 'legacy-daily', recurrence: undefined } }, now);
  assert.equal(next.medicationCare!.alerts.length, 4);
  assert.deepEqual(parseStoredState(JSON.stringify(next)).medicationCare, JSON.parse(JSON.stringify(next.medicationCare)));
  assert.equal(validateAppState(next, now), true);
  assert.equal(next.schemaVersion, 1);
  const malformed = { ...next, medicationCare: { ...next.medicationCare!, alerts: [{ ...monthly(), recurrence: { type: 'monthly', intervalMonths: 6, anchorDate: '2026-02-30' } }] } };
  assert.equal(validateAppState(malformed, now), false);
});

test('family switching, a treatment toggle and medication pruning retain the complete recurrence only in the original scope', () => {
  const base = createDemoState(new Date(now));
  const profileId = base.profile.id, medicationId = base.medications[0].id;
  let state = appReducer(base, { type: 'SAVE_MEDICATION_TREATMENT', profileId, treatment: { id: 'recurrence-treatment', name: 'Tratamiento capturado', medicationIds: [medicationId], startDate: '2026-01-01', active: true } }, now);
  const linked = { ...monthly(), medicationId, treatmentId: 'recurrence-treatment' };
  state = appReducer(state, { type: 'SAVE_MEDICATION_ALERT', profileId, alert: linked }, now);
  state = appReducer(state, { type: 'SAVE_MEDICATION_ALERT', profileId, alert: { ...monthly('2026-01-31', 6), id: 'manual-independent' } }, now);
  const family = switchProfile(state, child);
  assert.equal(family.medicationCare, undefined);
  const toggled = applyMedicationReminderMutation(family, profileId, { type: 'SET_TREATMENT_ALERTS_ENABLED', treatmentId: linked.treatmentId, enabled: false }, now);
  assert.deepEqual(getProfileMedicationCare(toggled, profileId)!.alerts[0], { ...linked, enabled: false });
  assert.equal(toggled.medicationCare, undefined);
  const owner = switchProfile(parseStoredState(JSON.stringify(toggled)));
  const pruned = appReducer(owner, { type: 'DELETE_MEDICATION', id: medicationId }, now);
  assert.deepEqual(pruned.medicationCare!.alerts, [{ ...monthly('2026-01-31', 6), id: 'manual-independent' }]);
});

test('reminder acknowledgement must match the monthly interval, even when every weekday is present', () => {
  const schedule = monthly('2026-05-09', 6);
  const state = ownerWithAlert(schedule);
  const mutation = { type: 'ACKNOWLEDGE_REMINDER' as const, alertId: schedule.id, date: '2026-11-09', time: '09:00', status: 'taken' as const, id: 'monthly-response', takeId: 'unused-manual-take' };
  const acknowledged = applyMedicationReminderMutation(state, state.profile.id, mutation, now);
  assert.equal(acknowledged.medicationCare!.reminderActions!.length, 1);
  assert.deepEqual(acknowledged.medicationCare!.takes, []);
  assert.equal(acknowledged.medicationCare!.reminderActions![0].doseSnapshot, 'Texto original');
  const wrongDayNow = new Date(2026, 10, 8, 12).getTime();
  assert.throws(() => applyMedicationReminderMutation(state, state.profile.id, { ...mutation, date: '2026-11-08' }, wrongDayNow), /horario cambió/);
  const wrongMonthNow = new Date(2026, 9, 9, 12).getTime();
  assert.throws(() => applyMedicationReminderMutation(state, state.profile.id, { ...mutation, date: '2026-10-09' }, wrongMonthNow), /horario cambió/);
  const beforeAnchor = ownerWithAlert(monthly('2027-05-09', 6));
  assert.throws(() => applyMedicationReminderMutation(beforeAnchor, state.profile.id, mutation, now), /horario cambió/);
});

test('a failed recurring-alert edit rolls back only its original scope and retry durably preserves recurrence', async () => {
  let current = ownerWithAlert(monthly('2026-01-31', 6));
  const profileId = current.profile.id;
  let writes = 0, durable = '';
  const write = createMedicationCareWriter({ current: () => current, generation: () => 0, publish: state => { current = state; }, reduce: (state, action) => appReducer(state, action, now), persist: async state => {
    writes++;
    if (writes === 1) { current = switchProfile(current, child); throw new Error('storage failed'); }
    durable = JSON.stringify(state);
  } });
  const action: MedicationCareAction = { type: 'SAVE_MEDICATION_ALERT', profileId, alert: { ...monthly('2026-01-31', 6), enabled: false } };
  await assert.rejects(write(action), /storage failed/);
  assert.equal(current.profile.id, child.id);
  assert.equal(current.medicationCare, undefined);
  assert.deepEqual(getProfileMedicationCare(current, profileId)!.alerts[0], monthly('2026-01-31', 6));
  await write(action);
  assert.deepEqual(getProfileMedicationCare(parseStoredState(durable), profileId)!.alerts[0], action.alert);
  assert.equal(current.medicationCare, undefined);
});
