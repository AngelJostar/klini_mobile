import test from 'node:test';
import assert from 'node:assert/strict';
import { captureProfile, editStoredProfile, restoreStoredProfile, switchProfile } from '../src/domain/family';
import { createDemoState } from '../src/domain/seed';
import { appReducer, hydrateState, parseStoredState, validateAppState } from '../src/domain/reducer';
import { createProfessionalVerification } from '../src/domain/professionalVerification';
import type { AppState } from '../src/domain/types';
import type { ManagedDoctorProfile, ManagedLicensedProfile, ManagedPatientProfile } from '../src/domain/managedProfiles';

const doctor: ManagedDoctorProfile = { id: 'select-professional-doctor', name: 'Nombre profesional anterior', kind: 'Profesional de la salud', professionalType: 'doctor', specialty: 'Oncología Médica', licenseNumber: '111111' };
const licensed: ManagedLicensedProfile = { id: 'select-professional-licensed', name: 'Nombre anterior', kind: 'Profesional de la salud', professionalType: 'licensed', degreeType: 'Enfermería', licenseNumber: '000022' };
const child: ManagedPatientProfile = { id: 'select-child', name: 'Niña guardada', kind: 'Niña' };
const emptyCollections = ['appointments', 'records', 'policies', 'claims', 'medications', 'messages', 'favorites'] as const;
const note = { id: 'professional-note', type: 'Nota' as const, title: 'Registro independiente', date: '2026-11-12', doctorName: '', description: 'Dato ficticio de este contexto' };

test('a professional selection opens an empty independent context with account name and no inherited entitlements', () => {
  const owner = createDemoState();
  const before = JSON.stringify(owner);
  const active = switchProfile(owner, doctor);
  assert.equal(active.profile.id, doctor.id);
  assert.equal(active.profile.name, owner.profile.name);
  for (const field of ['birthDate', 'sex', 'email', 'phone', 'bloodType', 'allergies', 'emergencyName', 'emergencyPhone'] as const) assert.equal(active.profile[field], '');
  for (const key of emptyCollections) assert.deepEqual(active[key], []);
  assert.equal(active.aiSubscription, undefined);
  assert.equal(active.medicationCare, undefined);
  assert.equal(active.pharmacy, undefined);
  assert.equal(active.wallet, owner.wallet);
  assert.equal(active.settings, owner.settings);
  assert.equal(active.doctors, owner.doctors);
  assert.deepEqual(active.family!.profiles[doctor.id].professional, { ...doctor, name: owner.profile.name });
  assert.equal(JSON.stringify(owner), before);
  assert.equal(validateAppState(active), true);
});

test('professional, owner and family collections restore independently after reload', () => {
  const owner = createDemoState();
  let active = switchProfile(owner, child);
  active = appReducer(active, { type: 'ADD_RECORD', record: { ...note, id: 'child-note' } });
  active = switchProfile(active, doctor);
  active = appReducer(active, { type: 'ADD_RECORD', record: note });
  active = switchProfile(active, licensed);
  assert.deepEqual(active.records, []);
  active = switchProfile(parseStoredState(JSON.stringify(active)), doctor);
  assert.deepEqual(active.records, [note]);
  assert.equal(active.family!.profiles[doctor.id].professional!.licenseNumber, '111111');
  active = switchProfile(active, child);
  assert.equal(active.records[0].id, 'child-note');
  active = switchProfile(active);
  assert.deepEqual(active.records, owner.records);
  assert.deepEqual(active.appointments, owner.appointments);
  assert.deepEqual(active.aiSubscription, owner.aiSubscription);
  assert.equal(validateAppState(active), true);
});

test('restoring a previous stored context preserves changes made after the attempted selection', () => {
  const owner = createDemoState();
  let active = switchProfile(switchProfile(owner, child), doctor);
  active = appReducer(active, { type: 'ADD_RECORD', record: note });
  active = editStoredProfile(active, child.id, { name: 'Nombre familiar actualizado' });
  const restored = restoreStoredProfile(active, owner.profile.id);
  assert.equal(restored.profile.id, owner.profile.id);
  assert.deepEqual(restored.records, owner.records);
  assert.equal(restored.family!.profiles[child.id].profile.name, 'Nombre familiar actualizado');
  assert.deepEqual(restored.family!.profiles[doctor.id].records, [note]);
  assert.deepEqual(switchProfile(restored, doctor).records, [note]);
  assert.throws(() => restoreStoredProfile(restored, 'unknown-profile'), /guardado/);
  assert.equal(validateAppState(restored), true);
});

test('reselecting the same professional is a no-op while changed metadata refreshes without clearing its records', () => {
  let active = switchProfile(createDemoState(), doctor);
  active = appReducer(active, { type: 'ADD_RECORD', record: note });
  assert.equal(switchProfile(active, doctor), active);
  const changed = switchProfile(active, { ...doctor, specialty: 'Cardiología', licenseNumber: '000099' });
  assert.deepEqual(changed.records, [note]);
  assert.equal(changed.family!.profiles[doctor.id].professional!.specialty, 'Cardiología');
  assert.equal(changed.profile.name, 'Sofía Martínez');
  assert.equal(validateAppState(changed), true);
});

test('account name changes update professional display metadata without renaming family profiles or copying records', () => {
  let active = switchProfile(switchProfile(switchProfile(createDemoState(), child), licensed), doctor);
  active = appReducer(active, { type: 'ADD_RECORD', record: note });
  const ownerId = active.family!.ownerId;
  active = editStoredProfile(active, ownerId, { name: 'Sofía Nombre Nuevo' });
  assert.equal(active.profile.name, 'Sofía Nombre Nuevo');
  assert.equal(active.family!.profiles[doctor.id].professional!.name, 'Sofía Nombre Nuevo');
  assert.equal(active.family!.profiles[licensed.id].professional!.name, 'Sofía Nombre Nuevo');
  assert.equal(active.family!.profiles[child.id].profile.name, child.name);
  assert.deepEqual(active.records, [note]);
  assert.throws(() => editStoredProfile(active, doctor.id, { name: 'Otra persona' }), /titular/);
  active = switchProfile(active);
  active = appReducer(active, { type: 'UPDATE_PROFILE', patch: { name: 'Sofía Último Nombre' } });
  assert.equal(active.family!.profiles[doctor.id].professional!.name, 'Sofía Último Nombre');
  assert.equal(switchProfile(active, doctor).profile.name, 'Sofía Último Nombre');
  assert.equal(validateAppState(active), true);
});

test('selection strips identity videos and untrusted role or approval claims from the persisted descriptor', () => {
  const now = Date.UTC(2026, 10, 1, 12);
  const verification = createProfessionalVerification({ video: { uri: 'file:///private/identity/real-recorded.mp4', name: 'real-recorded.mp4', mimeType: 'video/mp4' }, durationSeconds: 3, challenge: '0123', consentedAt: new Date(now - 1000).toISOString() }, now);
  const draft = { ...doctor, verification, role: 'doctor', approved: true };
  const active = switchProfile(createDemoState(), draft);
  const descriptor = active.family!.profiles[doctor.id].professional!;
  for (const field of ['verification', 'video', 'role', 'approved']) assert.equal(Object.hasOwn(descriptor, field), false);
  assert.equal(Object.hasOwn(captureProfile(active, 'Profesional de la salud'), 'professional'), true);
  assert.equal(draft.verification, verification);
  assert.equal(validateAppState(active), true);
});

test('selection cannot reuse the owner or family identity for a professional or convert a professional into a patient', () => {
  const owner = createDemoState();
  const family = switchProfile(owner, child);
  const active = switchProfile(family, doctor);
  const before = JSON.stringify(active);
  assert.throws(() => switchProfile(active, { ...doctor, id: owner.profile.id }), /principal/);
  assert.throws(() => switchProfile(active, { ...doctor, id: child.id }), /personal.*profesional/);
  assert.throws(() => switchProfile(active, { ...child, id: doctor.id }), /personal.*profesional/);
  assert.throws(() => editStoredProfile(active, child.id, { kind: 'Profesional de la salud' }), /convertir/);
  assert.throws(() => switchProfile(active, { ...doctor, licenseNumber: 'not-digits' }), /principal/);
  assert.equal(JSON.stringify(active), before);
});

test('malformed professional scope metadata fails hydration without overwriting the stored payload', () => {
  const valid = switchProfile(createDemoState(), doctor);
  for (const mutate of [
    (state: AppState) => { state.family!.profiles[doctor.id].professional = undefined; },
    (state: AppState) => { state.family!.profiles[doctor.id].professional = { ...doctor, id: child.id, name: state.profile.name }; },
    (state: AppState) => { state.family!.profiles[doctor.id].professional = { ...doctor, name: 'Otra persona' }; },
    (state: AppState) => { Object.assign(state.family!.profiles[doctor.id].professional!, { role: 'doctor' }); },
    (state: AppState) => { Object.assign(state.family!.profiles[doctor.id].professional!, { verification: {} }); },
    (state: AppState) => { state.family!.profiles[doctor.id].kind = 'Niño'; },
    (state: AppState) => { state.family!.profiles[state.family!.ownerId].kind = 'Profesional de la salud'; },
  ]) {
    const invalid = structuredClone(valid);
    mutate(invalid);
    const raw = JSON.stringify(invalid);
    assert.equal(validateAppState(invalid), false);
    assert.throws(() => parseStoredState(raw));
    assert.notEqual(hydrateState(raw).error, null);
    assert.equal(JSON.stringify(invalid), raw);
  }
});

test('legacy family data and profession-only records remain compatible with the optional descriptor extension', () => {
  const family = switchProfile(createDemoState(), child);
  assert.equal(JSON.stringify(parseStoredState(JSON.stringify(family))), JSON.stringify(family));
  const old = { id: 'old-professional', name: 'Nombre guardado antes', kind: 'Profesional de la salud' as const, profession: 'Enfermero/a' as const };
  const active = switchProfile(family, old);
  assert.deepEqual(active.family!.profiles[old.id].professional, { ...old, name: 'Sofía Martínez' });
  assert.equal(Object.hasOwn(active.family!.profiles[old.id].professional!, 'licenseNumber'), false);
  const restored = parseStoredState(JSON.stringify(active));
  assert.equal(restored.profile.id, old.id);
  assert.equal(validateAppState(restored), true);
});
