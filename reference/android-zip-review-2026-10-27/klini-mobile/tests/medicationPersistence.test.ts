import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoState } from '../src/domain/seed';
import { switchProfile } from '../src/domain/family';
import { appReducer, createPersistenceQueue, parseStoredState, validateAppState } from '../src/domain/reducer';
import { applyProfileMedicationAction, createMedicationMutationWriter, createMedicationTreatmentWithMedicationWriter, createMedicationWriteQueue, rollbackMedicationAddition, rollbackMedicationMutation } from '../src/domain/medicationPersistence';
import { createMedicationCareWriter, getProfileMedicationCare } from '../src/domain/medicationCare';
import type { AppState, Medication } from '../src/domain/types';

const child = { id: 'medication-child', name: 'Mateo de prueba', kind: 'Niño' as const };
const medication = (id: string): Medication => ({ id, name: 'Medicamento de prueba', dose: '', frequency: '', startDate: '2026-11-09', active: true });
const add = (state: AppState, id: string) => appReducer(state, { type: 'ADD_MEDICATION', medication: medication(id) });

test('failed addition rollback preserves later medications, profile edits and clinical records', () => {
  const owner = createDemoState();
  let current = add(owner, 'failed-medication');
  current = add(current, 'later-medication');
  current = appReducer(current, { type: 'UPDATE_PROFILE', patch: { name: 'Nombre actualizado' } });
  current = appReducer(current, { type: 'ADD_RECORD', record: { id: 'later-note', title: 'Nota de prueba', type: 'Nota', date: '2026-11-09', doctorName: '', description: 'Cambio posterior.' } });

  const result = rollbackMedicationAddition(current, owner.profile.id, 'failed-medication');
  assert.deepEqual(result.medications.map(item => item.id), [...owner.medications.map(item => item.id), 'later-medication']);
  assert.equal(result.profile, current.profile);
  assert.equal(result.profile.name, 'Nombre actualizado');
  assert.equal(result.records, current.records);
  assert.equal(validateAppState(result), true);
});

test('rollback removes the original owner addition after switching without removing a child medication with the same ID', () => {
  const owner = createDemoState();
  let current = switchProfile(add(owner, 'shared-local-id'), child);
  current = add(current, 'shared-local-id');
  const result = rollbackMedicationAddition(current, owner.profile.id, 'shared-local-id');

  assert.equal(result.medications, current.medications);
  assert.equal(result.medications[0].id, 'shared-local-id');
  assert.deepEqual(switchProfile(result).medications, owner.medications);
  assert.equal(validateAppState(result), true);
});

test('rollback follows a family member back into its saved scope after returning to the owner', () => {
  const owner = createDemoState();
  let current = switchProfile(owner, child);
  current = add(current, 'child-failed');
  current = add(current, 'child-later');
  current = switchProfile(current);
  const result = rollbackMedicationAddition(current, child.id, 'child-failed');

  assert.equal(result.medications, current.medications);
  assert.deepEqual(switchProfile(result, child).medications.map(item => item.id), ['child-later']);
  assert.equal(validateAppState(result), true);
});

test('rollback clears both active and cached copies without discarding newer active medications', () => {
  const owner = createDemoState();
  let current = switchProfile(switchProfile(add(owner, 'failed-roundtrip'), child));
  current = add(current, 'newer-active');
  const result = rollbackMedicationAddition(current, owner.profile.id, 'failed-roundtrip');

  assert.equal(result.medications.some(item => item.id === 'failed-roundtrip'), false);
  assert.equal(result.family!.profiles[owner.profile.id].medications.some(item => item.id === 'failed-roundtrip'), false);
  assert.equal(result.medications.some(item => item.id === 'newer-active'), true);
  assert.equal(validateAppState(result), true);
});

test('a stale failure is a no-op after deletion or demo reset and cannot recreate the old profile', () => {
  const owner = createDemoState();
  const removed = appReducer(add(owner, 'already-deleted'), { type: 'DELETE_MEDICATION', id: 'already-deleted' });
  assert.equal(rollbackMedicationAddition(removed, owner.profile.id, 'already-deleted'), removed);

  const reset = createDemoState();
  assert.equal(rollbackMedicationAddition(reset, child.id, 'child-before-reset'), reset);
  assert.equal(rollbackMedicationAddition(reset, owner.profile.id, 'owner-before-reset'), reset);
  assert.equal(reset.family, undefined);
});

test('a failed FIFO write rolls back only the original addition after a concurrent profile switch and remains correct after reload', async () => {
  const owner = createDemoState();
  const profileId = owner.profile.id;
  let current = add(owner, 'failed-fifo');
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let durable = '';
  let calls = 0;
  const queue = createPersistenceQueue({
    async setItem(_key, snapshot) {
      calls += 1;
      if (calls === 1) { await held; throw new Error('storage unavailable'); }
      durable = snapshot;
    },
  });

  const attemptedSave = queue.write(JSON.stringify(current)).catch(async error => {
    current = rollbackMedicationAddition(current, profileId, 'failed-fifo');
    await queue.write(JSON.stringify(current));
    throw error;
  });
  const rejection = assert.rejects(attemptedSave, /storage unavailable/);
  current = switchProfile(current, child);
  current = add(current, 'child-concurrent');
  current = appReducer(current, { type: 'UPDATE_PROFILE', patch: { name: 'Mateo actualizado' } });
  const concurrentSave = queue.write(JSON.stringify(current));
  await Promise.resolve();
  assert.equal(calls, 1, 'The later snapshot must wait behind the pending write.');
  release();
  await rejection;
  await concurrentSave;
  await queue.flush();

  const restored = parseStoredState(durable);
  assert.equal(calls, 3);
  assert.equal(restored.profile.name, 'Mateo actualizado');
  assert.equal(restored.medications[0].id, 'child-concurrent');
  assert.deepEqual(switchProfile(restored).medications, owner.medications);
  assert.equal(validateAppState(restored), true);
});

test('a failed write finishing after reset leaves the reset snapshot last and does not enqueue old family data', async () => {
  let current = add(switchProfile(createDemoState(), child), 'child-before-reset');
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let durable = '';
  let calls = 0;
  const queue = createPersistenceQueue({
    async setItem(_key, snapshot) {
      calls += 1;
      if (calls === 1) { await held; throw new Error('storage unavailable'); }
      durable = snapshot;
    },
  });
  const attemptedSave = queue.write(JSON.stringify(current)).catch(async error => {
    const rollback = rollbackMedicationAddition(current, child.id, 'child-before-reset');
    if (rollback !== current) {
      current = rollback;
      await queue.write(JSON.stringify(current));
    }
    throw error;
  });
  const rejection = assert.rejects(attemptedSave, /storage unavailable/);
  current = appReducer(current, { type: 'RESET', state: createDemoState() });
  const reset = queue.write(JSON.stringify(current));
  release();
  await rejection;
  await reset;
  await queue.flush();

  assert.equal(calls, 2, 'A stale rollback must not write another snapshot after reset.');
  assert.deepEqual(parseStoredState(durable), current);
  assert.equal(current.family, undefined);
  assert.equal(current.medications.some(item => item.id === 'child-before-reset'), false);
});

function medicationWithCare(): AppState {
  let state = add(createDemoState(), 'persisted-medication');
  const profileId = state.profile.id;
  state = appReducer(state, { type: 'SAVE_MEDICATION_TREATMENT', profileId, treatment: { id: 'persisted-treatment', name: 'Tratamiento capturado', medicationIds: ['persisted-medication'], startDate: '2026-11-01', active: true } });
  state = appReducer(state, { type: 'SAVE_MEDICATION_TAKE', profileId, take: { id: 'persisted-take', medicationId: 'persisted-medication', treatmentId: 'persisted-treatment', date: '2026-11-01', time: '08:00', dose: 'Dosis capturada', status: 'taken' } });
  return appReducer(state, { type: 'SAVE_MEDICATION_ALERT', profileId, alert: { id: 'persisted-alert', medicationId: 'persisted-medication', treatmentId: 'persisted-treatment', time: '09:00', days: [1, 2, 3, 4, 5], enabled: true } });
}
const deferred = () => {
  let release!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, release };
};

test('persisted update waits for the physical write and keeps the captured original profile after switching', async () => {
  let current = medicationWithCare();
  const profileId = current.profile.id;
  const gate = deferred();
  let durable = '';
  const queue = createPersistenceQueue({ async setItem(_key, snapshot) { await gate.promise; durable = snapshot; } });
  const schedule = createMedicationWriteQueue(() => 0);
  const mutate = createMedicationMutationWriter({ current: () => current, generation: () => 0, publish: state => { current = state; }, persist: state => queue.write(JSON.stringify(state)) });
  let complete = false;
  const pending = schedule(() => mutate(profileId, { type: 'UPDATE_MEDICATION', id: 'persisted-medication', patch: { dose: 'Dosis corregida' } })).then(() => { complete = true; });
  current = switchProfile(current, child);
  current = add(current, 'child-concurrent');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(complete, false);
  assert.equal(current.profile.id, child.id);
  assert.equal(current.medications[0].id, 'child-concurrent');
  gate.release();
  await pending;
  assert.equal(switchProfile(parseStoredState(durable)).medications.find(item => item.id === 'persisted-medication')!.dose, 'Dosis corregida');
  assert.equal(complete, true);
});

test('failed persisted update restores only its medication and a retry durably saves without duplicates', async () => {
  let current = medicationWithCare();
  const original = current.medications.find(item => item.id === 'persisted-medication')!;
  const profileId = current.profile.id;
  const gate = deferred();
  let calls = 0;
  let durable = '';
  const queue = createPersistenceQueue({ async setItem(_key, snapshot) { calls += 1; if (calls === 1) { await gate.promise; throw new Error('disk offline'); } durable = snapshot; } });
  const schedule = createMedicationWriteQueue(() => 0);
  const mutate = createMedicationMutationWriter({ current: () => current, generation: () => 0, publish: state => { current = state; }, persist: state => queue.write(JSON.stringify(state)) });
  const rejected = assert.rejects(schedule(() => mutate(profileId, { type: 'UPDATE_MEDICATION', id: original.id, patch: { dose: 'Intento fallido' } })), /disk offline/);
  await new Promise(resolve => setImmediate(resolve));
  current = appReducer(current, { type: 'UPDATE_PROFILE', patch: { name: 'Cambio posterior conservado' } });
  current = add(current, 'later-medication');
  const otherWrite = queue.write(JSON.stringify(current));
  gate.release();
  await Promise.all([rejected, otherWrite]);
  assert.deepEqual(current.medications.find(item => item.id === original.id), original);
  assert.equal(current.profile.name, 'Cambio posterior conservado');
  assert.equal(current.medications.at(-1)!.id, 'later-medication');
  await schedule(() => mutate(profileId, { type: 'UPDATE_MEDICATION', id: original.id, patch: { dose: 'Reintento guardado' } }));
  const restored = parseStoredState(durable);
  assert.equal(restored.medications.filter(item => item.id === original.id).length, 1);
  assert.equal(restored.medications.find(item => item.id === original.id)!.dose, 'Reintento guardado');
  assert.equal(restored.medicationCare!.takes.length, 1);
});

test('failed persisted deletion restores its medication and cascade on the original owner while preserving child edits', async () => {
  const original = medicationWithCare();
  let current = original;
  const profileId = original.profile.id;
  const gate = deferred();
  let calls = 0;
  let durable = '';
  const queue = createPersistenceQueue({ async setItem(_key, snapshot) { calls += 1; if (calls === 1) { await gate.promise; throw new Error('disk offline'); } durable = snapshot; } });
  const mutate = createMedicationMutationWriter({ current: () => current, generation: () => 0, publish: state => { current = state; }, persist: state => queue.write(JSON.stringify(state)) });
  const rejected = assert.rejects(mutate(profileId, { type: 'DELETE_MEDICATION', id: 'persisted-medication' }), /disk offline/);
  assert.deepEqual(current.medicationCare, { treatments: [], takes: [], alerts: [] });
  current = switchProfile(current, child);
  current = add(current, 'child-medication');
  const otherWrite = queue.write(JSON.stringify(current));
  gate.release();
  await Promise.all([rejected, otherWrite]);
  const owner = switchProfile(parseStoredState(durable));
  assert.deepEqual(owner.medications, original.medications);
  assert.deepEqual(owner.medicationCare, original.medicationCare);
  assert.equal(current.profile.id, child.id);
  assert.equal(current.medications[0].id, 'child-medication');
  assert.equal(current.medicationCare, undefined);
  assert.equal(validateAppState(current), true);
});

test('deletion rollback restores a mixed treatment without overwriting unrelated later care', () => {
  let original = medicationWithCare();
  original = add(original, 'remaining-medication');
  const profileId = original.profile.id;
  original = appReducer(original, { type: 'SAVE_MEDICATION_TREATMENT', profileId, treatment: { ...original.medicationCare!.treatments[0], medicationIds: ['persisted-medication', 'remaining-medication'] } });
  const previous = original.medications.find(item => item.id === 'persisted-medication')!;
  const attempted = appReducer(original, { type: 'DELETE_MEDICATION', id: previous.id });
  let current = appReducer(attempted, { type: 'SAVE_MEDICATION_ALERT', profileId, alert: { id: 'later-alert', medicationId: 'remaining-medication', time: '18:00', days: [0], enabled: false } });
  current = rollbackMedicationMutation(current, profileId, previous.id, undefined, previous, attempted.medicationCare, original.medicationCare);
  assert.deepEqual(current.medicationCare!.treatments, original.medicationCare!.treatments);
  assert.deepEqual(current.medicationCare!.takes, original.medicationCare!.takes);
  assert.deepEqual(current.medicationCare!.alerts.map(item => item.id).sort(), ['later-alert', 'persisted-alert']);
  assert.equal(validateAppState(current), true);
});

test('stale update/delete failures cannot overwrite a replacement medication or newer care entities', () => {
  const original = medicationWithCare();
  const profileId = original.profile.id;
  const previous = original.medications.find(item => item.id === 'persisted-medication')!;
  const changed = appReducer(original, { type: 'UPDATE_MEDICATION', id: previous.id, patch: { name: 'Intento fallido' } });
  const newer = appReducer(changed, { type: 'UPDATE_MEDICATION', id: previous.id, patch: { name: 'Cambio más reciente' } });
  assert.equal(rollbackMedicationMutation(newer, profileId, previous.id, changed.medications.find(item => item.id === previous.id), previous, changed.medicationCare, original.medicationCare), newer);
  const deleted = appReducer(original, { type: 'DELETE_MEDICATION', id: previous.id });
  const replacement = appReducer(deleted, { type: 'ADD_MEDICATION', medication: { ...previous, name: 'Registro de reemplazo' } });
  assert.equal(rollbackMedicationMutation(replacement, profileId, previous.id, undefined, previous, deleted.medicationCare, original.medicationCare), replacement);
});

test('shared scheduler does not revive a failed care addition when a later medication deletion also fails', async () => {
  let current = medicationWithCare();
  const profileId = current.profile.id;
  const gate = deferred();
  let calls = 0;
  let durable = '';
  const queue = createPersistenceQueue({ async setItem(_key, snapshot) { calls += 1; if (calls === 1) { await gate.promise; throw new Error('care failed'); } if (calls === 3) throw new Error('delete failed'); durable = snapshot; } });
  const schedule = createMedicationWriteQueue(() => 0);
  const access = { current: () => current, generation: () => 0, publish: (state: AppState) => { current = state; }, persist: (state: AppState) => queue.write(JSON.stringify(state)) };
  const careWriter = createMedicationCareWriter({ ...access, reduce: appReducer });
  const mutate = createMedicationMutationWriter(access);
  const failedCare = assert.rejects(schedule(() => careWriter({ type: 'SAVE_MEDICATION_ALERT', profileId, alert: { id: 'failed-care-addition', medicationId: 'persisted-medication', time: '20:00', days: [0], enabled: true } })), /care failed/);
  const failedDelete = assert.rejects(schedule(() => mutate(profileId, { type: 'DELETE_MEDICATION', id: 'persisted-medication' })), /delete failed/);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(current.medications.some(item => item.id === 'persisted-medication'), true, 'Deletion must wait until the care operation and its rollback finish.');
  gate.release();
  await Promise.all([failedCare, failedDelete]);
  await queue.flush();
  const restored = parseStoredState(durable);
  assert.equal(restored.medications.some(item => item.id === 'persisted-medication'), true);
  assert.deepEqual(restored.medicationCare!.alerts.map(item => item.id), ['persisted-alert']);
  assert.equal(calls, 4);
});

test('reset invalidates a pending persisted deletion and queued update without resurrecting old care', async () => {
  let current = medicationWithCare();
  const profileId = current.profile.id;
  let generation = 0;
  const gate = deferred();
  let calls = 0;
  let durable = '';
  const queue = createPersistenceQueue({ async setItem(_key, snapshot) { calls += 1; if (calls === 1) { await gate.promise; throw new Error('disk offline'); } durable = snapshot; } });
  const schedule = createMedicationWriteQueue(() => generation);
  const mutate = createMedicationMutationWriter({ current: () => current, generation: () => generation, publish: state => { current = state; }, persist: state => queue.write(JSON.stringify(state)) });
  const pending = assert.rejects(schedule(() => mutate(profileId, { type: 'DELETE_MEDICATION', id: 'persisted-medication' })), /disk offline/);
  const queued = assert.rejects(schedule(() => mutate(profileId, { type: 'UPDATE_MEDICATION', id: 'persisted-medication', patch: { dose: 'No debe aplicarse' } })), /restablecer/);
  await new Promise(resolve => setImmediate(resolve));
  generation += 1;
  current = createDemoState();
  const reset = queue.write(JSON.stringify(current));
  gate.release();
  await Promise.all([pending, queued, reset]);
  assert.equal(calls, 2);
  assert.deepEqual(parseStoredState(durable), current);
  assert.equal(current.medicationCare, undefined);
});

test('queued profile actions reject missing profiles and persist deletion only after validation', () => {
  const state = medicationWithCare();
  assert.throws(() => applyProfileMedicationAction(state, 'absent-profile', { type: 'DELETE_MEDICATION', id: 'persisted-medication' }), /perfil/);
  const family = switchProfile(state, child);
  assert.throws(() => applyProfileMedicationAction(family, state.profile.id, { type: 'UPDATE_MEDICATION', id: 'persisted-medication', patch: { id: 'changed-identity' } }), /identificador/);
  const deleted = applyProfileMedicationAction(family, state.profile.id, { type: 'DELETE_MEDICATION', id: 'persisted-medication' });
  assert.equal(deleted.medicationCare, undefined);
  assert.deepEqual(getProfileMedicationCare(deleted, state.profile.id), { treatments: [], takes: [], alerts: [] });
  assert.equal(validateAppState(deleted), true);
});

const inlineMedication = (id = 'atomic-medication'): Medication => ({ id, name: 'Medicamento capturado en tratamiento', dose: '1 tableta según receta', frequency: 'Cada 12 horas', startDate: '2026-11-01', active: true });
const inlineTreatment = (id = 'atomic-treatment') => ({ id, name: 'Tratamiento con captura inline', medicationIds: ['persisted-medication'], startDate: '2026-11-01', active: true });

test('inline treatment and new medication publish and persist together once, retaining selected medications', async () => {
  const original = medicationWithCare();
  let current = original;
  const treatment = inlineTreatment();
  const gate = deferred();
  let publishes = 0;
  let writes = 0;
  let complete = false;
  let durable = '';
  const writer = createMedicationTreatmentWithMedicationWriter({ current: () => current, generation: () => 0, publish: state => { publishes += 1; current = state; }, persist: async state => { writes += 1; await gate.promise; durable = JSON.stringify(state); } });
  const pending = writer(original.profile.id, treatment, inlineMedication()).then(() => { complete = true; });
  assert.equal(publishes, 1);
  assert.equal(writes, 1);
  assert.equal(complete, false);
  assert.deepEqual(current.medicationCare!.treatments.find(item => item.id === treatment.id)!.medicationIds, ['persisted-medication', 'atomic-medication']);
  assert.deepEqual(treatment.medicationIds, ['persisted-medication'], 'The caller draft must remain unchanged.');
  assert.equal(current.medications.at(-1)!.dose, '1 tableta según receta');
  assert.equal(current.medicationCare!.takes.length, original.medicationCare!.takes.length);
  gate.release();
  await pending;
  assert.equal(complete, true);
  assert.equal(publishes, 1);
  assert.equal(writes, 1);
  assert.equal(validateAppState(parseStoredState(durable)), true);
});

test('invalid inline medication or treatment never publishes, writes or leaves an orphan medication', async () => {
  const current = medicationWithCare();
  let publishes = 0;
  let writes = 0;
  const writer = createMedicationTreatmentWithMedicationWriter({ current: () => current, generation: () => 0, publish: () => { publishes += 1; }, persist: async () => { writes += 1; } });
  const invalidMedications = [{ ...inlineMedication(), dose: ' ' }, { ...inlineMedication(), frequency: '' }, { ...inlineMedication(), name: '' }, { ...inlineMedication(), startDate: '2026-02-30' }, { ...inlineMedication(), endDate: '2026-10-01' }];
  for (const medication of invalidMedications) await assert.rejects(writer(current.profile.id, inlineTreatment(), medication));
  const invalidTreatments = [{ ...inlineTreatment(), name: '' }, { ...inlineTreatment(), medicationIds: ['other-profile-medication'] }, { ...inlineTreatment(), medicationIds: ['persisted-medication', 'persisted-medication'] }, { ...inlineTreatment(), endDate: '2026-01-01' }];
  for (const treatment of invalidTreatments) await assert.rejects(writer(current.profile.id, treatment, inlineMedication()));
  await assert.rejects(writer('missing-profile', inlineTreatment(), inlineMedication()), /perfil/);
  assert.equal(publishes, 0);
  assert.equal(writes, 0);
  assert.equal(current.medications.some(item => item.id === 'atomic-medication'), false);
  assert.equal(current.medicationCare!.treatments.some(item => item.id === 'atomic-treatment'), false);
});

test('failed atomic save removes both entities from the original scope and preserves a switched profile and later data', async () => {
  const original = medicationWithCare();
  let current = original;
  const profileId = original.profile.id;
  const gate = deferred();
  let calls = 0;
  let durable = '';
  const queue = createPersistenceQueue({ async setItem(_key, snapshot) { calls += 1; if (calls === 1) { await gate.promise; throw new Error('atomic disk failure'); } durable = snapshot; } });
  const writer = createMedicationTreatmentWithMedicationWriter({ current: () => current, generation: () => 0, publish: state => { current = state; }, persist: state => queue.write(JSON.stringify(state)) });
  const rejected = assert.rejects(writer(profileId, inlineTreatment(), inlineMedication()), /atomic disk failure/);
  current = switchProfile(current, child);
  current = add(current, 'later-child-medication');
  current = appReducer(current, { type: 'UPDATE_PROFILE', patch: { name: 'Perfil posterior conservado' } });
  const concurrent = queue.write(JSON.stringify(current));
  gate.release();
  await Promise.all([rejected, concurrent]);
  await queue.flush();
  const restored = parseStoredState(durable);
  assert.equal(restored.profile.id, child.id);
  assert.equal(restored.profile.name, 'Perfil posterior conservado');
  assert.equal(restored.medications[0].id, 'later-child-medication');
  const owner = switchProfile(restored);
  assert.deepEqual(owner.medications, original.medications);
  assert.deepEqual(owner.medicationCare, original.medicationCare);
  assert.equal(validateAppState(restored), true);
});

test('atomic retry with newly allocated IDs persists exactly one medication and treatment', async () => {
  let current = medicationWithCare();
  const originalMedicationCount = current.medications.length;
  const originalTreatmentCount = current.medicationCare!.treatments.length;
  const profileId = current.profile.id;
  let calls = 0;
  let durable = '';
  const queue = createPersistenceQueue({ async setItem(_key, snapshot) { calls += 1; if (calls === 1) throw new Error('first attempt failed'); durable = snapshot; } });
  const writer = createMedicationTreatmentWithMedicationWriter({ current: () => current, generation: () => 0, publish: state => { current = state; }, persist: state => queue.write(JSON.stringify(state)) });
  const schedule = createMedicationWriteQueue(() => 0);
  await assert.rejects(schedule(() => writer(profileId, inlineTreatment('attempt-one-treatment'), inlineMedication('attempt-one-medication'))), /first attempt failed/);
  assert.equal(current.medications.length, originalMedicationCount);
  assert.equal(current.medicationCare!.treatments.length, originalTreatmentCount);
  await schedule(() => writer(profileId, inlineTreatment('retry-treatment'), inlineMedication('retry-medication')));
  const restored = parseStoredState(durable);
  assert.equal(restored.medications.length, originalMedicationCount + 1);
  assert.equal(restored.medicationCare!.treatments.length, originalTreatmentCount + 1);
  assert.equal(restored.medications.some(item => item.id === 'attempt-one-medication'), false);
  assert.deepEqual(restored.medicationCare!.treatments.find(item => item.id === 'retry-treatment')!.medicationIds, ['persisted-medication', 'retry-medication']);
  assert.equal(calls, 3);
});

test('failed extension of an existing treatment restores that treatment and removes only its inline medication', async () => {
  const original = medicationWithCare();
  let current = original;
  const profileId = original.profile.id;
  let calls = 0;
  const writer = createMedicationTreatmentWithMedicationWriter({ current: () => current, generation: () => 0, publish: state => { current = state; }, persist: async () => { calls += 1; if (calls === 1) throw new Error('extension failed'); } });
  const pending = assert.rejects(writer(profileId, { ...inlineTreatment('persisted-treatment'), name: 'Edición fallida' }, inlineMedication()), /extension failed/);
  current = add(current, 'unrelated-new-medication');
  await pending;
  assert.deepEqual(current.medicationCare!.treatments, original.medicationCare!.treatments);
  assert.equal(current.medications.some(item => item.id === 'atomic-medication'), false);
  assert.equal(current.medications.some(item => item.id === 'unrelated-new-medication'), true);
  assert.deepEqual(current.medicationCare!.takes, original.medicationCare!.takes);
  assert.deepEqual(current.medicationCare!.alerts, original.medicationCare!.alerts);
  assert.equal(validateAppState(current), true);
});

test('atomic creation targets the captured owner even when a queued operation begins under a child profile', async () => {
  const original = medicationWithCare();
  let current = original;
  const profileId = original.profile.id;
  let durable = '';
  const schedule = createMedicationWriteQueue(() => 0);
  const writer = createMedicationTreatmentWithMedicationWriter({ current: () => current, generation: () => 0, publish: state => { current = state; }, persist: async state => { durable = JSON.stringify(state); } });
  const pending = schedule(() => writer(profileId, inlineTreatment(), inlineMedication()));
  current = switchProfile(current, child);
  await pending;
  assert.equal(current.profile.id, child.id);
  assert.deepEqual(current.medications, []);
  assert.equal(current.medicationCare, undefined);
  const restored = switchProfile(parseStoredState(durable));
  assert.equal(restored.medications.at(-1)!.id, 'atomic-medication');
  assert.deepEqual(restored.medicationCare!.treatments.find(item => item.id === 'atomic-treatment')!.medicationIds, ['persisted-medication', 'atomic-medication']);
});

test('reset cancels pending and queued atomic creations without restoring their medications or treatments', async () => {
  let current = medicationWithCare();
  const profileId = current.profile.id;
  let generation = 0;
  let calls = 0;
  let durable = '';
  const gate = deferred();
  const queue = createPersistenceQueue({ async setItem(_key, snapshot) { calls += 1; if (calls === 1) await gate.promise; durable = snapshot; } });
  const schedule = createMedicationWriteQueue(() => generation);
  const writer = createMedicationTreatmentWithMedicationWriter({ current: () => current, generation: () => generation, publish: state => { current = state; }, persist: state => queue.write(JSON.stringify(state)) });
  const pending = assert.rejects(schedule(() => writer(profileId, inlineTreatment(), inlineMedication())), /restablecer/);
  const queued = assert.rejects(schedule(() => writer(profileId, inlineTreatment('queued-treatment'), inlineMedication('queued-medication'))), /restablecer/);
  await new Promise(resolve => setImmediate(resolve));
  generation += 1;
  current = createDemoState();
  const reset = queue.write(JSON.stringify(current));
  gate.release();
  await Promise.all([pending, queued, reset]);
  assert.equal(calls, 2);
  assert.deepEqual(parseStoredState(durable), current);
  assert.equal(current.medicationCare, undefined);
  assert.equal(current.medications.some(item => item.id === 'atomic-medication' || item.id === 'queued-medication'), false);
});
