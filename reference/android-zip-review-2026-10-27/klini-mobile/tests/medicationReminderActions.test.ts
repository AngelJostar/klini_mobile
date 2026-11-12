import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoState } from '../src/domain/seed';
import { appReducer, createPersistenceQueue, hydrateState, parseStoredState, validateAppState } from '../src/domain/reducer';
import { switchProfile } from '../src/domain/family';
import { applyMedicationReminderMutation, getProfileMedicationCare, isMedicationReminderAction, medicationReminderOccurrenceKey, provisionSofiaDemoMedicationCare, SOFIA_MEDICATION_REMINDER_DEMO as demo, type MedicationReminderMutation } from '../src/domain/medicationCare';
import { createMedicationReminderWriter, createMedicationWriteQueue } from '../src/domain/medicationPersistence';
import type { AppState } from '../src/domain/types';

const now = new Date(2026, 10, 8, 20, 7, 30).getTime();
const child = { id: 'reminder-child', name: 'Perfil familiar de prueba', kind: 'Niño' as const };
function example(): AppState { return provisionSofiaDemoMedicationCare(createDemoState(new Date(now)), now); }
const ack = (status: 'taken' | 'skipped' = 'taken', id = 'ack-1'): Extract<MedicationReminderMutation, { type: 'ACKNOWLEDGE_REMINDER' }> => ({ type: 'ACKNOWLEDGE_REMINDER', alertId: demo.alertId, date: '2026-11-08', time: '20:00', status, id, takeId: `take-${id}` });
const deferred = () => { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve; }); return { promise, release }; };

test('fresh and saved Sofia demo setup is explicit, idempotent and enabled without asserting OS permission', () => {
  const baseline = createDemoState();
  assert.equal(baseline.medicationCare, undefined, 'The base fixture remains free of extra injected references.');
  const setup = hydrateState(null, baseline).state;
  assert.equal(setup.medicationReminderDemoVersion, 1);
  assert.equal(setup.medications.find(item => item.id === demo.medicationId)!.name, 'Atorvastatina');
  assert.equal(setup.medications.find(item => item.id === demo.medicationId)!.dose, '80 mg');
  assert.equal(setup.medicationCare!.treatments[0].name, 'Control de colesterol · Demostración');
  assert.deepEqual(setup.medicationCare!.alerts[0], { id: demo.alertId, medicationId: demo.medicationId, treatmentId: demo.treatmentId, time: '20:00', days: [0, 1, 2, 3, 4, 5, 6], enabled: true });
  assert.equal(provisionSofiaDemoMedicationCare(setup), setup);
  assert.deepEqual(hydrateState(JSON.stringify(setup)).state.medicationCare, setup.medicationCare);
  assert.equal(setup.settings.reminders, false, 'Appointment preference and OS delivery are independent.');
  assert.equal(validateAppState(setup), true);
});

test('demo setup targets only the known primary Sofia owner, including an inactive owner while a child is active', () => {
  const ordinary = createDemoState();
  ordinary.profile = { ...ordinary.profile, id: 'ordinary-reminder-owner' };
  assert.equal(provisionSofiaDemoMedicationCare(ordinary, now), ordinary);
  const family = switchProfile(createDemoState(new Date(now)), child);
  const setup = provisionSofiaDemoMedicationCare(family, now);
  assert.equal(setup.profile.id, child.id);
  assert.deepEqual(setup.medications, []);
  assert.equal(setup.medicationCare, undefined);
  assert.equal(switchProfile(setup).medications.find(item => item.id === demo.medicationId)!.dose, '80 mg');
  assert.equal(validateAppState(setup, now), true);
  const sofiaAsFamily = switchProfile(ordinary, { ...child, id: demo.ownerId });
  assert.equal(provisionSofiaDemoMedicationCare(sofiaAsFamily, now), sofiaAsFamily);
});

test('the durable setup marker prevents deleted or disabled examples from being resurrected on hydrate', () => {
  let state = example();
  state = applyMedicationReminderMutation(state, state.profile.id, { type: 'SET_TREATMENT_ALERTS_ENABLED', treatmentId: demo.treatmentId, enabled: false }, now);
  assert.equal(hydrateState(JSON.stringify(state)).state.medicationCare!.alerts[0].enabled, false);
  state = appReducer(state, { type: 'DELETE_MEDICATION', id: demo.medicationId }, now);
  const restored = hydrateState(JSON.stringify(state)).state;
  assert.equal(restored.medicationReminderDemoVersion, 1);
  assert.equal(restored.medications.some(item => item.id === demo.medicationId), false);
  assert.deepEqual(restored.medicationCare, { treatments: [], takes: [], alerts: [] });
  const collision = appReducer(createDemoState(new Date(now)), { type: 'ADD_MEDICATION', medication: { id: demo.medicationId, name: 'Valor editado que se conserva', dose: 'Texto', frequency: '', startDate: '2026-11-01', active: false } }, now);
  const safe = provisionSofiaDemoMedicationCare(collision, now);
  assert.equal(safe.medications.at(-1)!.name, 'Valor editado que se conserva');
  assert.equal(safe.medicationCare, undefined);
  assert.equal(safe.medicationReminderDemoVersion, 1);
  assert.equal(validateAppState({ ...state, medicationReminderDemoVersion: 2 }, now), false);
});

test('a treatment switch changes existing linked schedules together and never invents a new time', () => {
  let state = example();
  const profileId = state.profile.id;
  state = appReducer(state, { type: 'SAVE_MEDICATION_ALERT', profileId, alert: { id: 'medication-level-alert', medicationId: demo.medicationId, time: '08:00', days: [1], enabled: true } }, now);
  state = appReducer(state, { type: 'SAVE_MEDICATION_ALERT', profileId, alert: { id: 'unrelated-manual-alert', medicationName: 'Captura libre', time: '10:00', days: [1], enabled: true } }, now);
  const disabled = applyMedicationReminderMutation(state, profileId, { type: 'SET_TREATMENT_ALERTS_ENABLED', treatmentId: demo.treatmentId, enabled: false }, now);
  assert.deepEqual(disabled.medicationCare!.alerts.map(item => [item.id, item.enabled]), [[demo.alertId, false], ['medication-level-alert', false], ['unrelated-manual-alert', true]]);
  const enabled = applyMedicationReminderMutation(disabled, profileId, { type: 'SET_TREATMENT_ALERTS_ENABLED', treatmentId: demo.treatmentId, enabled: true }, now);
  assert.deepEqual(enabled.medicationCare!.alerts, state.medicationCare!.alerts);
  assert.equal(applyMedicationReminderMutation(enabled, profileId, { type: 'SET_TREATMENT_ALERTS_ENABLED', treatmentId: demo.treatmentId, enabled: true }, now), enabled);
  const without = appReducer(state, { type: 'SAVE_MEDICATION_TREATMENT', profileId, treatment: { id: 'unscheduled-treatment', name: 'Sin horario', medicationIds: [state.medications[0].id], startDate: '2026-11-01', active: true } }, now);
  assert.throws(() => applyMedicationReminderMutation(without, profileId, { type: 'SET_TREATMENT_ALERTS_ENABLED', treatmentId: 'unscheduled-treatment', enabled: true }, now), /elige su horario/);
});

test('acknowledging a linked reminder atomically records the literal dose at the real confirmation time', () => {
  const state = example();
  const key = medicationReminderOccurrenceKey(demo.alertId, '2026-11-08', '20:00');
  assert.equal(medicationReminderOccurrenceKey('alert with spaces/1', '2026-11-08', '20:00'), 'alert%20with%20spaces%2F1|2026-11-08|20:00');
  const next = applyMedicationReminderMutation(state, state.profile.id, { ...ack(), occurrenceKey: key }, now);
  assert.deepEqual(next.medicationCare!.takes[0], { id: 'take-ack-1', medicationId: demo.medicationId, treatmentId: demo.treatmentId, date: '2026-11-08', time: '20:07', dose: '80 mg', status: 'taken' });
  assert.deepEqual(next.medicationCare!.reminderActions![0], { id: 'ack-1', alertId: demo.alertId, date: '2026-11-08', time: '20:00', status: 'taken', recordedAt: new Date(now).toISOString(), nameSnapshot: 'Atorvastatina', doseSnapshot: '80 mg', medicationId: demo.medicationId, takeId: 'take-ack-1' });
  assert.equal(isMedicationReminderAction(next.medicationCare!.reminderActions![0], now), true);
  assert.equal(applyMedicationReminderMutation(next, state.profile.id, ack('skipped', 'opposite-replay'), now + 1000), next);
  assert.equal(next.medicationCare!.takes.length, 1);
  assert.equal(next.medicationCare!.reminderActions!.length, 1);
  assert.equal(validateAppState(next, now), true);
  const delayed = applyMedicationReminderMutation(state, state.profile.id, { ...ack(), recordedAt: now }, now + 120000);
  assert.equal(delayed.medicationCare!.takes[0].time, '20:07', 'A pending FIFO write must preserve the actual click time.');
  assert.equal(delayed.medicationCare!.reminderActions![0].recordedAt, new Date(now).toISOString());
});

test('a manual reminder records only an explicit response snapshot without creating a medication or dose', () => {
  let state = switchProfile(createDemoState(new Date(now)), child);
  state = appReducer(state, { type: 'SAVE_MEDICATION_ALERT', profileId: child.id, alert: { id: 'manual', medicationName: 'Texto del paciente', concentration: '500 mg', time: '20:00', days: [0], enabled: true } }, now);
  const result = applyMedicationReminderMutation(state, child.id, { ...ack('skipped'), alertId: 'manual' }, now);
  assert.deepEqual(result.medications, []);
  assert.deepEqual(result.medicationCare!.takes, []);
  assert.deepEqual(result.medicationCare!.reminderActions![0], { id: 'ack-1', alertId: 'manual', date: '2026-11-08', time: '20:00', status: 'skipped', recordedAt: new Date(now).toISOString(), nameSnapshot: 'Texto del paciente', doseSnapshot: '500 mg' });
  const deleted = appReducer(result, { type: 'DELETE_MEDICATION_ALERT', profileId: child.id, id: 'manual' }, now);
  assert.deepEqual(parseStoredState(JSON.stringify(deleted)).medicationCare!.reminderActions, result.medicationCare!.reminderActions);
  const linked = applyMedicationReminderMutation(example(), demo.ownerId, ack(), now);
  const medicationDeleted = appReducer(linked, { type: 'DELETE_MEDICATION', id: demo.medicationId }, now);
  assert.deepEqual(medicationDeleted.medicationCare!.reminderActions, linked.medicationCare!.reminderActions);
  assert.deepEqual(medicationDeleted.medicationCare!.takes, []);
  assert.equal(validateAppState(medicationDeleted, now), true);
});

test('future, stale, malformed and impossible reminder responses fail before changing state', () => {
  const state = example();
  const before = JSON.stringify(state);
  const invalid: MedicationReminderMutation[] = [
    { ...ack(), date: '2026-11-09' }, { ...ack(), time: '21:00' }, { ...ack(), date: '2026-02-30' },
    { ...ack(), time: '25:00' }, { ...ack(), occurrenceKey: 'another-occurrence' }, { ...ack(), alertId: 'missing' },
    { ...ack(), date: '2026-11-07' },
  ];
  for (const mutation of invalid) assert.throws(() => applyMedicationReminderMutation(state, state.profile.id, mutation, now));
  assert.equal(JSON.stringify(state), before);
  const result = applyMedicationReminderMutation(state, state.profile.id, ack(), now);
  const action = result.medicationCare!.reminderActions![0];
  assert.equal(isMedicationReminderAction({ ...action, recordedAt: new Date(now + 1).toISOString() }, now), false);
  assert.equal(isMedicationReminderAction({ ...action, recordedAt: '2026-02-30T00:00:00.000Z' }, now), false);
  assert.equal(validateAppState({ ...result, medicationCare: { ...result.medicationCare!, reminderActions: [action, { ...action, id: 'same-occurrence' }] } }, now), false);
});

test('an existing matching take in the confirmation minute is reused and a contradictory one is never overwritten', () => {
  let state = example();
  state = appReducer(state, { type: 'SAVE_MEDICATION_TAKE', profileId: state.profile.id, take: { id: 'manually-recorded', medicationId: demo.medicationId, treatmentId: demo.treatmentId, date: '2026-11-08', time: '20:07', dose: '80 mg', status: 'taken' } }, now);
  const acknowledged = applyMedicationReminderMutation(state, state.profile.id, ack(), now);
  assert.equal(acknowledged.medicationCare!.takes.length, 1);
  assert.equal(acknowledged.medicationCare!.reminderActions![0].takeId, 'manually-recorded');
  assert.throws(() => applyMedicationReminderMutation(state, state.profile.id, ack('skipped'), now), /toma distinta/);
});

test('acknowledgment rejects disabled, inactive and expired events but an already answered occurrence stays idempotent', () => {
  const state = example();
  const disabled = applyMedicationReminderMutation(state, state.profile.id, { type: 'SET_TREATMENT_ALERTS_ENABLED', treatmentId: demo.treatmentId, enabled: false }, now);
  assert.throws(() => applyMedicationReminderMutation(disabled, state.profile.id, ack(), now), /desactivada/);
  const inactiveMedication = appReducer(state, { type: 'UPDATE_MEDICATION', id: demo.medicationId, patch: { active: false } }, now);
  assert.throws(() => applyMedicationReminderMutation(inactiveMedication, state.profile.id, ack(), now), /no está vigente/);
  const inactiveTreatment = appReducer(state, { type: 'SAVE_MEDICATION_TREATMENT', profileId: state.profile.id, treatment: { ...state.medicationCare!.treatments[0], active: false } }, now);
  assert.throws(() => applyMedicationReminderMutation(inactiveTreatment, state.profile.id, ack(), now), /no está vigente/);
  assert.throws(() => applyMedicationReminderMutation(state, state.profile.id, ack(), now + 24 * 60 * 60 * 1000), /ya pasó/);
  const recorded = applyMedicationReminderMutation(state, state.profile.id, ack(), now);
  const thenDisabled = applyMedicationReminderMutation(recorded, state.profile.id, { type: 'SET_TREATMENT_ALERTS_ENABLED', treatmentId: demo.treatmentId, enabled: false }, now);
  assert.equal(applyMedicationReminderMutation(thenDisabled, state.profile.id, ack('skipped', 'replay'), now + 48 * 60 * 60 * 1000), thenDisabled);
});

test('failed group toggle rolls every matching alert back together without changing order or unrelated records', async () => {
  let original = example();
  original = appReducer(original, { type: 'SAVE_MEDICATION_ALERT', profileId: original.profile.id, alert: { id: 'second-linked', medicationId: demo.medicationId, treatmentId: demo.treatmentId, time: '08:00', days: [1], enabled: true } }, now);
  let current = original;
  let calls = 0, publishes = 0;
  const gate = deferred();
  const writer = createMedicationReminderWriter({ current: () => current, generation: () => 0, publish: state => { current = state; publishes += 1; }, persist: async () => { calls += 1; if (calls === 1) { await gate.promise; throw new Error('group write failed'); } }, now: () => now });
  const rejected = assert.rejects(writer(original.profile.id, { type: 'SET_TREATMENT_ALERTS_ENABLED', treatmentId: demo.treatmentId, enabled: false }), /group write failed/);
  assert.equal(publishes, 1);
  assert.equal(calls, 1);
  assert.equal(current.medicationCare!.alerts.every(item => !item.enabled), true);
  current = appReducer(current, { type: 'UPDATE_PROFILE', patch: { name: 'Edición independiente' } }, now);
  gate.release(); await rejected;
  assert.deepEqual(current.medicationCare!.alerts, original.medicationCare!.alerts);
  assert.equal(current.profile.name, 'Edición independiente');
  assert.equal(calls, 2);
  assert.equal(validateAppState(current, now), true);
});

test('a failed acknowledgment reverts take and action together, preserves another profile, and retries once durably', async () => {
  let current = example();
  const profileId = current.profile.id;
  const gate = deferred();
  let calls = 0;
  let durable = '';
  const queue = createPersistenceQueue({ async setItem(_key, snapshot) { calls += 1; if (calls === 1) { await gate.promise; throw new Error('ack storage failed'); } durable = snapshot; } });
  const writer = createMedicationReminderWriter({ current: () => current, generation: () => 0, publish: state => { current = state; }, persist: state => queue.write(JSON.stringify(state)), now: () => now });
  const failed = assert.rejects(writer(profileId, ack()), /ack storage failed/);
  assert.equal(current.medicationCare!.takes.length, 1);
  assert.equal(current.medicationCare!.reminderActions!.length, 1);
  current = switchProfile(current, child);
  current = appReducer(current, { type: 'SAVE_MEDICATION_ALERT', profileId: child.id, alert: { id: demo.alertId, medicationName: 'Aviso de otro perfil', time: '20:00', days: [0], enabled: true } }, now);
  current = applyMedicationReminderMutation(current, child.id, ack('skipped', 'child-response'), now);
  const concurrent = queue.write(JSON.stringify(current));
  gate.release();
  await Promise.all([failed, concurrent]);
  assert.equal(getProfileMedicationCare(current, profileId)!.takes.length, 0);
  assert.equal(getProfileMedicationCare(current, profileId)!.reminderActions!.length, 0);
  assert.equal(current.medicationCare!.reminderActions![0].nameSnapshot, 'Aviso de otro perfil');
  await writer(profileId, ack('taken', 'retry'));
  const owner = switchProfile(parseStoredState(durable));
  assert.equal(owner.medicationCare!.takes.length, 1);
  assert.equal(owner.medicationCare!.reminderActions!.length, 1);
  assert.equal(owner.medicationCare!.reminderActions![0].id, 'retry');
});

test('the scheduler waits for the one acknowledgment write, ignores replay, and cancels pending work after reset', async () => {
  let current = example();
  let generation = 0, calls = 0;
  const gate = deferred();
  const writer = createMedicationReminderWriter({ current: () => current, generation: () => generation, publish: state => { current = state; }, persist: async () => { calls += 1; if (calls === 1) await gate.promise; }, now: () => now });
  const schedule = createMedicationWriteQueue(() => generation);
  let completed = false;
  const first = schedule(() => writer(demo.ownerId, ack())).then(() => { completed = true; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(completed, false);
  assert.equal(calls, 1);
  gate.release(); await first;
  await schedule(() => writer(demo.ownerId, ack('skipped', 'replay')));
  assert.equal(calls, 1, 'Replay is a complete no-op, including persistence.');
  const blocker = deferred();
  const waiting = schedule(() => blocker.promise);
  await new Promise(resolve => setImmediate(resolve));
  const cancelled = assert.rejects(schedule(() => writer(demo.ownerId, { type: 'SET_TREATMENT_ALERTS_ENABLED', treatmentId: demo.treatmentId, enabled: false })), /restablecer/);
  generation += 1;
  current = createDemoState(new Date(now));
  blocker.release(); await Promise.all([waiting, cancelled]);
  assert.equal(current.medicationCare, undefined);
});
