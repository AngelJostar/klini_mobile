import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureSofiaDemoProfessionalProfile, SOFIA_PROFESSIONAL_DEMO_ID, SOFIA_PROFESSIONAL_DEMO_MARKER } from '../src/domain/managedProfessionalDemo';
import { isProfessionalProfile, parseManagedProfiles, upsertManagedProfile, type ManagedDoctorProfile, type ManagedPatientProfile, type ManagedProfile } from '../src/domain/managedProfiles';
import { createProfessionalVerification } from '../src/domain/professionalVerification';
import { createDemoState } from '../src/domain/seed';
import { switchProfile } from '../src/domain/family';

const owner = { id: 'patient-sofia', name: 'Sofía Martínez' };
const child: ManagedPatientProfile = { id: 'saved-child', name: 'Familiar guardado', kind: 'Niña' };
function fixture(): ManagedDoctorProfile {
  const profile = ensureSofiaDemoProfessionalProfile([], owner)[0];
  assert.equal(isProfessionalProfile(profile) && profile.professionalType === 'doctor', true);
  return profile as ManagedDoctorProfile;
}

test('the requested physician fixture persists as a clearly marked local demo without identity proof or a new patient', () => {
  const profiles = ensureSofiaDemoProfessionalProfile([], owner);
  assert.deepEqual(profiles, [{
    id: SOFIA_PROFESSIONAL_DEMO_ID, name: owner.name, kind: 'Profesional de la salud',
    professionalType: 'doctor', licenseNumber: '111111', specialty: 'Oncología Médica',
    demo: SOFIA_PROFESSIONAL_DEMO_MARKER,
  }]);
  assert.deepEqual(parseManagedProfiles(JSON.stringify(profiles)), profiles);
  assert.equal(Object.hasOwn(profiles[0], 'verification'), false);
  assert.equal(Object.hasOwn(profiles[0], 'role'), false);
  assert.equal(Object.hasOwn(profiles[0], 'isVerified'), false);
});

test('provisioning preserves existing records, order and the active family patient', () => {
  const legacy: ManagedProfile = { id: 'old-professional', name: 'Anterior', kind: 'Profesional de la salud', profession: 'Enfermero/a' };
  const previous: ManagedProfile[] = [child, legacy];
  const previousJson = JSON.stringify(previous);
  const patientState = switchProfile(createDemoState(), child);
  const patientJson = JSON.stringify(patientState);
  const next = ensureSofiaDemoProfessionalProfile(previous, owner);
  assert.equal(next.length, 3);
  assert.equal(next[0], child);
  assert.equal(next[1], legacy);
  assert.equal(JSON.stringify(previous), previousJson);
  assert.equal(JSON.stringify(patientState), patientJson);
  assert.equal(patientState.profile.id, child.id);
  const professionalState = switchProfile(patientState, next[2]);
  assert.equal(professionalState.profile.id, SOFIA_PROFESSIONAL_DEMO_ID);
  assert.deepEqual(professionalState.records, []);
  assert.equal(JSON.stringify(patientState), patientJson);
});

test('restoring the collection repeatedly never duplicates or replaces the fixed demo', () => {
  const first = ensureSofiaDemoProfessionalProfile([child], owner);
  assert.equal(ensureSofiaDemoProfessionalProfile(first, owner), first);
  const restored = parseManagedProfiles(JSON.stringify(first));
  assert.equal(ensureSofiaDemoProfessionalProfile(restored, owner), restored);
  assert.equal(restored.length, 2);
});

test('an equivalent existing physician keeps its identity, real local video and original position', () => {
  const submittedAt = Date.UTC(2026, 10, 1, 12);
  const previousDoctor: ManagedDoctorProfile = {
    ...fixture(), id: 'previous-sofia-doctor', demo: undefined,
    verification: createProfessionalVerification({
      video: { uri: 'file:///private/identity/previous.mp4', name: 'previous.mp4', mimeType: 'video/mp4' },
      durationSeconds: 3, challenge: '1234', consentedAt: new Date(submittedAt - 1000).toISOString(),
    }, submittedAt),
  };
  const previous = [previousDoctor, child];
  assert.equal(ensureSofiaDemoProfessionalProfile(previous, owner), previous);
  assert.equal(previous[0], previousDoctor);
  assert.equal(previousDoctor.verification!.video.uri, 'file:///private/identity/previous.mp4');
});

test('fixed ID collisions and unrelated saved professional identities are never overwritten', () => {
  for (const collision of [
    { ...child, id: SOFIA_PROFESSIONAL_DEMO_ID },
    { ...fixture(), name: 'Otra identidad guardada', licenseNumber: '222222' },
  ]) {
    const previous = [collision];
    assert.equal(ensureSofiaDemoProfessionalProfile(previous, owner), previous);
  }
  const unrelated: ManagedDoctorProfile = { ...fixture(), id: 'different-doctor', name: 'Otra persona', licenseNumber: '222222', demo: undefined };
  const next = ensureSofiaDemoProfessionalProfile([unrelated], owner);
  assert.equal(next[0], unrelated);
  assert.equal(next.length, 2);
});

test('the fixture is restricted to the seeded owner and canonical account name, including Unicode composition', () => {
  for (const otherOwner of [
    { ...owner, id: 'another-owner' }, { ...owner, id: 'saved-child' },
    { ...owner, name: 'Otra persona' }, { ...owner, name: 'Sofia Martinez' },
    { id: owner.id }, { ...owner, name: '' },
  ]) {
    const previous = [child];
    assert.equal(ensureSofiaDemoProfessionalProfile(previous, otherOwner), previous);
  }
  const composed = { ...owner, name: ` ${owner.name.normalize('NFD')} ` };
  const next = ensureSofiaDemoProfessionalProfile([], composed);
  assert.equal(next.length, 1);
  assert.equal(next[0].name, composed.name.trim());
  assert.equal(ensureSofiaDemoProfessionalProfile(next, owner), next);
});

test('the demo marker does not bypass normal professional submission and identity-change validation', () => {
  const demo = fixture();
  assert.throws(() => upsertManagedProfile([], demo), /video/);
  assert.throws(() => upsertManagedProfile([demo], { ...demo, licenseNumber: '222222' }), /video/);
  assert.deepEqual(upsertManagedProfile([demo], demo), [demo]);
  assert.throws(() => parseManagedProfiles(JSON.stringify([{ ...demo, demo: 'verified' }])));
  assert.throws(() => parseManagedProfiles(JSON.stringify([{ ...child, demo: SOFIA_PROFESSIONAL_DEMO_MARKER }])));
});
