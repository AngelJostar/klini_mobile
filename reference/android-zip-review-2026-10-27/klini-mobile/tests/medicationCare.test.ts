import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoState } from '../src/domain/seed';
import { appReducer, createPersistenceQueue, hydrateState, parseStoredState, validateAppState } from '../src/domain/reducer';
import { switchProfile } from '../src/domain/family';
import { createMedicationCareWriter, emptyMedicationCare, getProfileMedicationCare, isMedicationAlert, isMedicationCare, isMedicationTake, isMedicationTreatment, rollbackMedicationCareChange, type MedicationAlert, type MedicationCareAction, type MedicationTake, type MedicationTreatment } from '../src/domain/medicationCare';
import type { AppState } from '../src/domain/types';
import { buildKliniAiSelectionContext, parseKliniAiRequest } from '../src/domain/kliniAi';
import { selectKliniAiContext } from '../src/domain/kliniAiContext';

const now = new Date(2026, 10, 9, 12, 0, 35).getTime();
const child = { id: 'care-child', name: 'Mateo de prueba', kind: 'Niño' as const };
const treatment = (id = 'care-treatment'): MedicationTreatment => ({ id, name: 'Tratamiento de prueba', medicationIds: ['care-medication'], startDate: '2026-11-01', active: true });
const take = (id = 'care-take'): MedicationTake => ({ id, medicationId: 'care-medication', treatmentId: 'care-treatment', date: '2026-11-09', time: '08:15', dose: '1 tableta, según captura', status: 'taken' });
const alert = (id = 'care-alert'): MedicationAlert => ({ id, medicationId: 'care-medication', treatmentId: 'care-treatment', time: '09:00', days: [0, 1, 2, 3, 4, 5, 6], enabled: true });
function withMedication(state: AppState = createDemoState()): AppState {
  return appReducer(state, { type: 'ADD_MEDICATION', medication: { id: 'care-medication', name: 'Medicamento de prueba', dose: 'Texto original de dosis', frequency: 'Según receta', startDate: '2026-11-01', active: true } }, now);
}
function withCare(): AppState {
  const state = withMedication();
  let next = appReducer(state, { type: 'SAVE_MEDICATION_TREATMENT', profileId: state.profile.id, treatment: treatment() }, now);
  next = appReducer(next, { type: 'SAVE_MEDICATION_TAKE', profileId: state.profile.id, take: take() }, now);
  return appReducer(next, { type: 'SAVE_MEDICATION_ALERT', profileId: state.profile.id, alert: alert() }, now);
}
const held = () => {
  let release!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, release };
};

test('legacy schema 1 for an ordinary owner restores without injecting treatments, takes or alerts', () => {
  const owner = createDemoState();
  owner.profile = { ...owner.profile, id: 'ordinary-care-owner' };
  const legacy = switchProfile(owner, child);
  assert.equal(legacy.medicationCare, undefined);
  assert.equal(legacy.family!.profiles[legacy.family!.ownerId].medicationCare, undefined);
  const restored = hydrateState(JSON.stringify(legacy));
  assert.equal(restored.error, null);
  assert.deepEqual(restored.state.medications, legacy.medications);
  assert.equal(restored.state.medicationCare, undefined);
  assert.equal(restored.state.family!.profiles[legacy.family!.ownerId].medicationCare, undefined);
  const first = emptyMedicationCare();
  first.alerts.push(alert());
  assert.deepEqual(emptyMedicationCare(), { treatments: [], takes: [], alerts: [] });
});

test('captured treatment, take and alert preserve literal doses without changing the medication or generating events', () => {
  const original = withMedication();
  const saved = appReducer(original, { type: 'SAVE_MEDICATION_TREATMENT', profileId: original.profile.id, treatment: treatment() }, now);
  assert.deepEqual(saved.medicationCare!.takes, []);
  assert.deepEqual(saved.medicationCare!.alerts, []);
  const next = withCare();
  assert.equal(next.medicationCare!.takes[0].dose, '1 tableta, según captura');
  assert.equal(next.medications.at(-1)!.dose, 'Texto original de dosis');
  assert.equal(validateAppState(next, now), true);
  assert.deepEqual(parseStoredState(JSON.stringify(next)).medicationCare, next.medicationCare);
});

test('domain rejects invalid dates, future takes, malformed weekday sets and missing dose values', () => {
  for (const invalid of [{ ...treatment(), medicationIds: [] }, { ...treatment(), medicationIds: ['care-medication', 'care-medication'] }, { ...treatment(), endDate: '2026-10-31' }, { ...treatment(), startDate: '2026-02-30' }]) assert.equal(isMedicationTreatment(invalid), false);
  assert.equal(isMedicationTake({ ...take(), time: '12:00' }, now), true, 'Current minute is a completed/captured moment.');
  for (const invalid of [{ ...take(), time: '12:01' }, { ...take(), date: '2026-11-10' }, { ...take(), date: '2026-02-30' }, { ...take(), time: '24:00' }, { ...take(), dose: '  ' }, { ...take(), status: 'scheduled' }]) assert.equal(isMedicationTake(invalid, now), false);
  for (const invalid of [{ ...alert(), days: [] }, { ...alert(), days: [0, 0] }, { ...alert(), days: [7] }, { ...alert(), days: [-1] }, { ...alert(), days: [0.5] }, { ...alert(), time: '9:00' }, { ...alert(), enabled: 'yes' }]) assert.equal(isMedicationAlert(invalid), false);
});

test('all references must belong to this profile and linked treatment must contain the medication', () => {
  const state = withMedication();
  const care = { treatments: [treatment()], takes: [take()], alerts: [alert()] };
  assert.equal(isMedicationCare(care, state.medications, now), true);
  assert.equal(isMedicationCare(care, [], now), false);
  assert.equal(isMedicationCare({ ...care, takes: [{ ...take(), medicationId: state.medications[0].id }] }, state.medications, now), false);
  assert.equal(isMedicationCare({ ...care, alerts: [{ ...alert(), treatmentId: 'missing' }] }, state.medications, now), false);
  const family = switchProfile(state, child);
  assert.throws(() => appReducer(family, { type: 'SAVE_MEDICATION_TREATMENT', profileId: child.id, treatment: treatment() }, now), /otro perfil/);
  assert.throws(() => appReducer(state, { type: 'SAVE_MEDICATION_ALERT', profileId: 'missing', alert: { ...alert(), treatmentId: undefined } }, now), /perfil/);
});

test('duplicate takes and alerts are rejected by semantic key; editing the same entity stays valid', () => {
  const state = withCare();
  const profileId = state.profile.id;
  assert.throws(() => appReducer(state, { type: 'SAVE_MEDICATION_TAKE', profileId, take: { ...take('duplicate'), status: 'skipped' } }, now), /duplicados/);
  assert.throws(() => appReducer(state, { type: 'SAVE_MEDICATION_ALERT', profileId, alert: { ...alert('duplicate'), days: [6, 5, 4, 3, 2, 1, 0], enabled: false } }, now), /duplicados/);
  const changed = appReducer(state, { type: 'SAVE_MEDICATION_TAKE', profileId, take: { ...take(), status: 'skipped' } }, now);
  assert.equal(changed.medicationCare!.takes.length, 1);
  assert.equal(changed.medicationCare!.takes[0].status, 'skipped');
  const toggled = appReducer(changed, { type: 'SAVE_MEDICATION_ALERT', profileId, alert: { ...alert(), enabled: false } }, now);
  assert.equal(toggled.medicationCare!.alerts.length, 1);
  assert.equal(toggled.medicationCare!.alerts[0].enabled, false);
  assert.equal(state.medicationCare!.takes[0].status, 'taken');
});

test('invalid nested care is rejected at hydration instead of silently replaced with examples', () => {
  const state = withCare();
  const invalid = { ...state, medicationCare: { ...state.medicationCare!, alerts: [{ ...alert(), days: [0, 0] }] } };
  assert.equal(validateAppState(invalid, now), false);
  const fallback = createDemoState();
  const restored = hydrateState(JSON.stringify(invalid), fallback);
  assert.equal(restored.state, fallback);
  assert.ok(restored.error);
  let family = switchProfile(state, child);
  family = { ...family, family: { ...family.family!, profiles: { ...family.family!.profiles, [state.profile.id]: { ...family.family!.profiles[state.profile.id], medicationCare: invalid.medicationCare } } } };
  assert.equal(validateAppState(family, now), false);
});

test('owner care is not inherited by a legacy family scope and both remain isolated after reload', () => {
  const owner = withCare();
  let family = switchProfile(owner, child);
  assert.equal(family.medicationCare, undefined);
  assert.equal(validateAppState(family, now), true, 'Missing optional care must override the active care during scope validation.');
  family = withMedication(family);
  family = appReducer(family, { type: 'SAVE_MEDICATION_TREATMENT', profileId: child.id, treatment: { ...treatment(), name: 'Tratamiento infantil capturado' } }, now);
  assert.equal(family.medicationCare!.takes.length, 0);
  let restored = parseStoredState(JSON.stringify(family));
  restored = switchProfile(restored);
  assert.deepEqual(restored.medicationCare, owner.medicationCare);
  restored = switchProfile(restored, child);
  assert.equal(restored.medicationCare!.treatments[0].name, 'Tratamiento infantil capturado');
  assert.deepEqual(restored.medicationCare!.takes, []);
});

test('an explicit inactive profile update does not change the active profile and survives switching', () => {
  const owner = withCare();
  let family = switchProfile(owner, child);
  family = appReducer(family, { type: 'SAVE_MEDICATION_ALERT', profileId: owner.profile.id, alert: { ...alert(), enabled: false } }, now);
  assert.equal(family.medicationCare, undefined);
  assert.equal(family.profile.id, child.id);
  assert.equal(switchProfile(family).medicationCare!.alerts[0].enabled, false);
});

test('medication deletion cascades to takes/alerts and removes empty treatments, preserving other medication histories', () => {
  let state = withCare();
  state = appReducer(state, { type: 'ADD_MEDICATION', medication: { id: 'other-care-medication', name: 'Otro medicamento', dose: 'Captura', frequency: '', startDate: '2026-11-01', active: true } }, now);
  state = appReducer(state, { type: 'SAVE_MEDICATION_TREATMENT', profileId: state.profile.id, treatment: { ...treatment('mixed'), medicationIds: ['care-medication', 'other-care-medication'] } }, now);
  state = appReducer(state, { type: 'SAVE_MEDICATION_TAKE', profileId: state.profile.id, take: { ...take('other-take'), medicationId: 'other-care-medication', treatmentId: 'mixed' } }, now);
  state = switchProfile(switchProfile(state, child));
  const next = appReducer(state, { type: 'DELETE_MEDICATION', id: 'care-medication' }, now);
  assert.deepEqual(next.medicationCare!.treatments.map(item => item.id), ['mixed']);
  assert.deepEqual(next.medicationCare!.treatments[0].medicationIds, ['other-care-medication']);
  assert.deepEqual(next.medicationCare!.takes.map(item => item.id), ['other-take']);
  assert.deepEqual(next.medicationCare!.alerts, []);
  assert.equal(validateAppState(next, now), true);
  assert.deepEqual(next.family!.profiles[next.profile.id].medicationCare, next.medicationCare);
  assert.deepEqual(switchProfile(switchProfile(next, child)).medicationCare, next.medicationCare);
});

test('delete records is transactional and repeated deletion rejects without modifying source state', () => {
  const state = withCare();
  const withoutTake = appReducer(state, { type: 'DELETE_MEDICATION_TAKE', profileId: state.profile.id, id: 'care-take' }, now);
  const withoutBoth = appReducer(withoutTake, { type: 'DELETE_MEDICATION_ALERT', profileId: state.profile.id, id: 'care-alert' }, now);
  assert.deepEqual(withoutBoth.medicationCare!.takes, []);
  assert.deepEqual(withoutBoth.medicationCare!.alerts, []);
  assert.equal(withoutBoth.medicationCare!.treatments.length, 1);
  assert.throws(() => appReducer(withoutBoth, { type: 'DELETE_MEDICATION_TAKE', profileId: state.profile.id, id: 'care-take' }, now), /No se encontró/);
  assert.equal(state.medicationCare!.takes.length, 1);
});

test('writer waits for durable FIFO writes and serializes follow-up changes against the latest state', async () => {
  let current = withCare();
  const profileId = current.profile.id;
  const gate = held();
  let calls = 0;
  let durable = '';
  const queue = createPersistenceQueue({ async setItem(_key, snapshot) { calls += 1; if (calls === 1) await gate.promise; durable = snapshot; } });
  const write = createMedicationCareWriter({ current: () => current, generation: () => 0, publish: state => { current = state; }, persist: state => queue.write(JSON.stringify(state)), reduce: (state, action) => appReducer(state, action, now) });
  let completed = false;
  const first = write({ type: 'SAVE_MEDICATION_ALERT', profileId, alert: { ...alert(), enabled: false } }).then(() => { completed = true; });
  const second = write({ type: 'SAVE_MEDICATION_TAKE', profileId, take: { ...take(), status: 'skipped' } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(completed, false);
  assert.equal(calls, 1);
  assert.equal(current.medicationCare!.takes[0].status, 'taken', 'Second operation has not published before first durable completion.');
  current = appReducer(current, { type: 'UPDATE_PROFILE', patch: { name: 'Cambio concurrente conservado' } }, now);
  const unrelated = queue.write(JSON.stringify(current));
  gate.release();
  await Promise.all([first, second, unrelated]);
  await queue.flush();
  const restored = parseStoredState(durable);
  assert.equal(restored.profile.name, 'Cambio concurrente conservado');
  assert.equal(restored.medicationCare!.takes[0].status, 'skipped');
  assert.equal(restored.medicationCare!.alerts[0].enabled, false);
  assert.equal(completed, true);
});

test('write failure reverts only its entity on its original profile and a retry succeeds without duplicates', async () => {
  let current = withCare();
  const profileId = current.profile.id;
  const gate = held();
  let calls = 0;
  let durable = '';
  const queue = createPersistenceQueue({ async setItem(_key, snapshot) { calls += 1; if (calls === 1) { await gate.promise; throw new Error('disk unavailable'); } durable = snapshot; } });
  const write = createMedicationCareWriter({ current: () => current, generation: () => 0, publish: state => { current = state; }, persist: state => queue.write(JSON.stringify(state)), reduce: (state, action) => appReducer(state, action, now) });
  const attempted = write({ type: 'SAVE_MEDICATION_ALERT', profileId, alert: { ...alert(), enabled: false } });
  const rejected = assert.rejects(attempted, /disk unavailable/);
  await new Promise(resolve => setImmediate(resolve));
  current = switchProfile(current, child);
  current = withMedication(current);
  current = appReducer(current, { type: 'SAVE_MEDICATION_ALERT', profileId: child.id, alert: { ...alert(), treatmentId: undefined, time: '17:30' } }, now);
  const concurrent = queue.write(JSON.stringify(current));
  gate.release();
  await Promise.all([rejected, concurrent]);
  assert.equal(current.profile.id, child.id);
  assert.equal(current.medicationCare!.alerts[0].time, '17:30');
  assert.equal(getProfileMedicationCare(current, profileId)!.alerts[0].enabled, true);
  await write({ type: 'SAVE_MEDICATION_ALERT', profileId, alert: { ...alert(), enabled: false } });
  assert.equal(getProfileMedicationCare(parseStoredState(durable), profileId)!.alerts.length, 1);
  assert.equal(getProfileMedicationCare(current, profileId)!.alerts[0].enabled, false);
});

test('a failed deletion restores its record but a concurrent medication deletion cannot revive orphan data', () => {
  const state = withCare();
  const action: MedicationCareAction = { type: 'DELETE_MEDICATION_TAKE', profileId: state.profile.id, id: 'care-take' };
  const removed = appReducer(state, action, now);
  assert.deepEqual(rollbackMedicationCareChange(removed, action, take()).medicationCare!.takes, [take()]);
  const medicationRemoved = appReducer(removed, { type: 'DELETE_MEDICATION', id: 'care-medication' }, now);
  assert.equal(rollbackMedicationCareChange(medicationRemoved, action, take()), medicationRemoved);
  const saveAction: MedicationCareAction = { type: 'SAVE_MEDICATION_ALERT', profileId: state.profile.id, alert: { ...alert(), enabled: false } };
  const changed = appReducer(state, saveAction, now);
  const newer = appReducer(changed, { ...saveAction, alert: { ...alert(), time: '18:00' } }, now);
  assert.equal(rollbackMedicationCareChange(newer, saveAction, alert()), newer);
});

test('reset invalidates pending and queued writes and cannot restore a pre-reset family scope', async () => {
  let current = withCare();
  const profileId = current.profile.id;
  let generation = 0;
  let durable = '';
  let calls = 0;
  const gate = held();
  const queue = createPersistenceQueue({ async setItem(_key, snapshot) { calls += 1; if (calls === 1) await gate.promise; durable = snapshot; } });
  const write = createMedicationCareWriter({ current: () => current, generation: () => generation, publish: state => { current = state; }, persist: state => queue.write(JSON.stringify(state)), reduce: (state, action) => appReducer(state, action, now) });
  const first = assert.rejects(write({ type: 'SAVE_MEDICATION_ALERT', profileId, alert: { ...alert(), enabled: false } }), /restablecer/);
  const second = assert.rejects(write({ type: 'DELETE_MEDICATION_TAKE', profileId, id: 'care-take' }), /restablecer/);
  await new Promise(resolve => setImmediate(resolve));
  generation += 1;
  current = createDemoState();
  const reset = queue.write(JSON.stringify(current));
  gate.release();
  await Promise.all([first, second, reset]);
  await queue.flush();
  assert.equal(calls, 2);
  assert.deepEqual(parseStoredState(durable), current);
  assert.equal(current.medicationCare, undefined);
});

test('a duplicate semantic entry rejects before publishing and the queue still accepts a valid edit with the original ID', async () => {
  let current = withCare();
  const profileId = current.profile.id;
  let publishes = 0;
  let writes = 0;
  const write = createMedicationCareWriter({ current: () => current, generation: () => 0, publish: state => { publishes += 1; current = state; }, persist: async () => { writes += 1; }, reduce: (state, action) => appReducer(state, action, now) });
  await assert.rejects(write({ type: 'SAVE_MEDICATION_TAKE', profileId, take: take('accidental-second-id') }), /duplicados/);
  assert.equal(publishes, 0);
  assert.equal(writes, 0);
  assert.deepEqual(current.medicationCare!.takes, [take()]);
  await write({ type: 'SAVE_MEDICATION_TAKE', profileId, take: { ...take(), dose: 'Texto corregido' } });
  assert.equal(current.medicationCare!.takes.length, 1);
  assert.equal(current.medicationCare!.takes[0].id, 'care-take');
  assert.equal(current.medicationCare!.takes[0].dose, 'Texto corregido');
  assert.equal(writes, 1);
});

test('the AI context and wire allowlist exclude medication care instead of sending new histories or alerts implicitly', () => {
  const state = withCare();
  state.medicationCare = {
    ...state.medicationCare!,
    treatments: [{ ...treatment(), name: 'CARE_PRIVATE_TREATMENT_SENTINEL' }],
    takes: [{ ...take(), dose: 'CARE_PRIVATE_TAKE_SENTINEL' }],
    alerts: [{ id: 'private-manual-alert', medicationName: 'CARE_PRIVATE_MANUAL_NAME', concentration: 'CARE_PRIVATE_CONCENTRATION', time: '09:00', days: [1], enabled: true }],
  };
  const baseline = { ...state, medicationCare: undefined };
  const context = buildKliniAiSelectionContext(state, new Date(now));
  assert.deepEqual(context, buildKliniAiSelectionContext(baseline, new Date(now)));
  const selected = selectKliniAiContext('Revisa mis medicamentos', [], context);
  assert.equal(JSON.stringify(selected).includes('CARE_PRIVATE'), false);
  assert.equal(Object.hasOwn(selected, 'medicationCare'), false);
  const wire = parseKliniAiRequest({ question: 'Revisa mis medicamentos', history: [], context: { ...selected, medicationCare: state.medicationCare } });
  assert.equal(Object.hasOwn(wire.context, 'medicationCare'), false);
  assert.equal(JSON.stringify(wire).includes('CARE_PRIVATE'), false);
});

const manualAlert = (id = 'manual-alert'): MedicationAlert => ({ id, medicationName: 'Medicamento escrito por el usuario', concentration: '500 mg', time: '09:00', days: [0, 1, 2, 3, 4, 5, 6], enabled: true });

test('a standalone named alert roundtrips without a medication record, dose inference or treatment creation', () => {
  const original = switchProfile(createDemoState(), child);
  const next = appReducer(original, { type: 'SAVE_MEDICATION_ALERT', profileId: child.id, alert: manualAlert() }, now);
  assert.equal(isMedicationAlert(manualAlert()), true);
  assert.equal(isMedicationCare({ treatments: [], takes: [], alerts: [manualAlert()] }, [], now), true);
  assert.deepEqual(next.medications, []);
  assert.deepEqual(next.medicationCare!.treatments, []);
  assert.deepEqual(next.medicationCare!.takes, []);
  assert.deepEqual(next.medicationCare!.alerts[0], manualAlert());
  assert.equal(Object.hasOwn(next.medicationCare!.alerts[0], 'dose'), false);
  const restored = parseStoredState(JSON.stringify(next));
  assert.deepEqual(restored.medicationCare!.alerts, [manualAlert()]);
  assert.deepEqual(restored.medications, []);
  assert.equal(isMedicationAlert({ ...manualAlert(), concentration: undefined }), true);
});

test('standalone alerts require bounded nonempty names/concentrations and cannot link a treatment without a valid medication ID', () => {
  const missingName = { ...manualAlert(), medicationName: undefined };
  for (const invalid of [missingName, { ...manualAlert(), medicationName: '' }, { ...manualAlert(), medicationName: '  ' }, { ...manualAlert(), medicationName: 'x'.repeat(121) }, { ...manualAlert(), medicationName: 1 }, { ...manualAlert(), concentration: '' }, { ...manualAlert(), concentration: '   ' }, { ...manualAlert(), concentration: 'x'.repeat(81) }, { ...manualAlert(), concentration: 500 }, { ...manualAlert(), medicationId: '' }, { ...manualAlert(), treatmentId: 'care-treatment' }]) assert.equal(isMedicationAlert(invalid), false);
  const state = withCare();
  assert.equal(isMedicationAlert({ ...manualAlert(), medicationName: 'x'.repeat(120), concentration: 'x'.repeat(80) }), true);
  assert.throws(() => appReducer(state, { type: 'SAVE_MEDICATION_ALERT', profileId: state.profile.id, alert: { ...manualAlert(), medicationId: 'other-profile-medication' } }, now), /otro perfil/);
  assert.throws(() => appReducer(state, { type: 'SAVE_MEDICATION_ALERT', profileId: state.profile.id, alert: { ...manualAlert(), medicationId: 'care-medication', treatmentId: 'missing-treatment' } }, now), /otro perfil/);
});

test('manual duplicate detection normalizes names, concentration, weekday order and casing, while distinct concentrations remain distinct', () => {
  const original = switchProfile(createDemoState(), child);
  const first = { ...manualAlert(), medicationName: 'Vitamina   D', concentration: '1 000 UI', days: [1, 3, 5] };
  let state = appReducer(original, { type: 'SAVE_MEDICATION_ALERT', profileId: child.id, alert: first }, now);
  const duplicate = { ...first, id: 'duplicate-manual', medicationName: '  vItAmInA D  ', concentration: '  1   000 ui ', days: [5, 1, 3], enabled: false };
  assert.throws(() => appReducer(state, { type: 'SAVE_MEDICATION_ALERT', profileId: child.id, alert: duplicate }, now), /duplicados/);
  state = appReducer(state, { type: 'SAVE_MEDICATION_ALERT', profileId: child.id, alert: { ...first, enabled: false } }, now);
  assert.equal(state.medicationCare!.alerts.length, 1);
  state = appReducer(state, { type: 'SAVE_MEDICATION_ALERT', profileId: child.id, alert: { ...duplicate, id: 'different-concentration', concentration: '2 000 UI' } }, now);
  assert.equal(state.medicationCare!.alerts.length, 2);
  assert.deepEqual(state.medications, []);
});

test('deleting an unrelated medication preserves standalone alerts and legacy ID-based alert compatibility', () => {
  let state = withCare();
  const profileId = state.profile.id;
  const originalMedications = state.medications;
  state = appReducer(state, { type: 'SAVE_MEDICATION_ALERT', profileId, alert: manualAlert() }, now);
  assert.equal(isMedicationAlert(alert()), true, 'Legacy alerts without name/concentration remain valid.');
  const roundtrip = parseStoredState(JSON.stringify(state));
  assert.deepEqual(roundtrip.medicationCare!.alerts.find(item => item.id === 'care-alert'), alert());
  state = appReducer(state, { type: 'DELETE_MEDICATION', id: 'care-medication' }, now);
  assert.deepEqual(state.medicationCare!.alerts, [manualAlert()]);
  assert.equal(state.medications.length, originalMedications.length - 1);
  assert.equal(validateAppState(state, now), true);
  assert.deepEqual(parseStoredState(JSON.stringify(state)).medicationCare!.alerts, [manualAlert()]);
});

test('standalone alerts stay isolated per profile with identical IDs and survive switching and hydration', () => {
  const owner = createDemoState();
  let state = appReducer(owner, { type: 'SAVE_MEDICATION_ALERT', profileId: owner.profile.id, alert: manualAlert() }, now);
  state = switchProfile(state, child);
  assert.equal(state.medicationCare, undefined);
  state = appReducer(state, { type: 'SAVE_MEDICATION_ALERT', profileId: child.id, alert: { ...manualAlert(), medicationName: 'Otra captura familiar', concentration: undefined } }, now);
  state = parseStoredState(JSON.stringify(state));
  assert.equal(state.medicationCare!.alerts[0].medicationName, 'Otra captura familiar');
  assert.deepEqual(state.medications, []);
  state = switchProfile(state);
  assert.deepEqual(state.medicationCare!.alerts, [manualAlert()]);
  assert.deepEqual(state.medications, owner.medications);
});

test('a failed standalone alert save rolls back only the original profile and permits retry without a new medication', async () => {
  const owner = createDemoState();
  let current = owner;
  const profileId = owner.profile.id;
  const gate = held();
  let calls = 0;
  let durable = '';
  const queue = createPersistenceQueue({ async setItem(_key, snapshot) { calls += 1; if (calls === 1) { await gate.promise; throw new Error('manual alert storage failure'); } durable = snapshot; } });
  const write = createMedicationCareWriter({ current: () => current, generation: () => 0, publish: state => { current = state; }, persist: state => queue.write(JSON.stringify(state)), reduce: (state, action) => appReducer(state, action, now) });
  const rejection = assert.rejects(write({ type: 'SAVE_MEDICATION_ALERT', profileId, alert: manualAlert() }), /manual alert storage failure/);
  await new Promise(resolve => setImmediate(resolve));
  current = switchProfile(current, child);
  current = appReducer(current, { type: 'SAVE_MEDICATION_ALERT', profileId: child.id, alert: { ...manualAlert(), medicationName: 'Captura posterior del familiar' } }, now);
  const concurrent = queue.write(JSON.stringify(current));
  gate.release();
  await Promise.all([rejection, concurrent]);
  assert.equal(getProfileMedicationCare(current, profileId)!.alerts.length, 0);
  assert.equal(current.medicationCare!.alerts[0].medicationName, 'Captura posterior del familiar');
  await write({ type: 'SAVE_MEDICATION_ALERT', profileId, alert: manualAlert() });
  assert.deepEqual(switchProfile(parseStoredState(durable)).medicationCare!.alerts, [manualAlert()]);
  assert.deepEqual(switchProfile(current).medications, owner.medications);
  assert.deepEqual(current.medications, []);
});
