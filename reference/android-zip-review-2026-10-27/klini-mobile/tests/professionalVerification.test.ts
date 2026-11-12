import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfessionalVerification, isProfessionalVerification, PROFESSIONAL_IDENTITY_CONSENT_VERSION, PROFESSIONAL_VERIFICATION_MAX_DATA_BYTES, type ProfessionalVerification } from '../src/domain/professionalVerification';
import { isManagedProfile, parseManagedProfiles, sameProfessionalIdentity, upsertManagedProfile, type ManagedDoctorProfile, type ManagedLicensedProfile, type ManagedPatientProfile, type ManagedProfessionalProfile } from '../src/domain/managedProfiles';
import { createDemoState } from '../src/domain/seed';
import { switchProfile } from '../src/domain/family';
import type { Attachment } from '../src/domain/types';

const now = Date.UTC(2026, 0, 10, 12);
const file: Attachment = { uri: 'file:///private/klini/professional-identity.mp4', name: 'professional-identity.mp4', mimeType: 'video/mp4' };
const child: ManagedPatientProfile = { id: 'identity-child', name: 'Perfil familiar', kind: 'Niña' };
const doctor: ManagedDoctorProfile = { id: 'identity-doctor', name: 'Elena Ríos', kind: 'Profesional de la salud', professionalType: 'doctor', licenseNumber: '00000001', specialty: 'Cardiología' };
const licensed: ManagedLicensedProfile = { id: 'identity-licensed', name: 'Andrea Ruiz', kind: 'Profesional de la salud', professionalType: 'licensed', licenseNumber: '00000002', degreeType: 'Fisioterapia' };
function proof(sequence = 0, video: Attachment = { ...file, uri: `file:///private/klini/professional-${sequence}.mp4` }): ProfessionalVerification {
  return createProfessionalVerification({ video, challenge: '0017', durationSeconds: 3.5, consentedAt: new Date(now + sequence * 1000 - 1000).toISOString() }, now + sequence * 1000);
}

test('professional identity submissions roundtrip as local pending records with explicit consent and no elevated role', () => {
  const video = { ...file };
  const verification = createProfessionalVerification({ video, durationSeconds: 2, consentedAt: new Date(now - 1000).toISOString(), challenge: '0017' }, now);
  assert.equal(verification.mode, 'local-demo');
  assert.equal(verification.status, 'pending');
  assert.equal(verification.consentVersion, PROFESSIONAL_IDENTITY_CONSENT_VERSION);
  assert.equal(verification.challenge, '0017');
  assert.equal(verification.submittedAt, new Date(now).toISOString());
  assert.notEqual(verification.video, video, 'The saved proof owns a metadata copy, not the mutable capture draft.');
  const pendingDoctor = { ...doctor, verification };
  const saved = upsertManagedProfile([child], pendingDoctor);
  const restored = parseManagedProfiles(JSON.stringify(saved));
  assert.deepEqual(restored, [child, pendingDoctor]);
  assert.equal(isProfessionalVerification(verification, now), true);
  assert.equal(isProfessionalVerification({ ...verification, durationSeconds: 20 }, now), true);
  assert.equal(Object.hasOwn(restored[1], 'isVerified'), false);
  const owner = createDemoState();
  const active = switchProfile(owner, pendingDoctor);
  assert.equal(active.profile.id, pendingDoctor.id);
  assert.equal(Object.hasOwn(active.family!.profiles[pendingDoctor.id].professional!, 'verification'), false);
  assert.deepEqual(active.records, []);
  assert.equal(owner.family, undefined);
});

test('verification validates timestamp order, challenge, duration and consent while rejecting client approval claims', () => {
  const valid = proof();
  const invalid: unknown[] = [
    { ...valid, mode: 'production' }, { ...valid, status: 'approved' }, { ...valid, status: 'rejected' },
    { ...valid, approved: true }, { ...valid, consentVersion: 'other' }, { ...valid, consentedAt: '' },
    { ...valid, consentedAt: new Date(now + 1).toISOString() }, { ...valid, submittedAt: new Date(now + 1).toISOString() },
    { ...valid, submittedAt: '2026-02-30T12:00:00.000Z' }, { ...valid, submittedAt: '2026-01-10' },
    { ...valid, submittedAt: '2026-01-10T12:00:00Z' }, { ...valid, challenge: '123' }, { ...valid, challenge: '12345' },
    { ...valid, challenge: 17 }, { ...valid, challenge: 'ab12' }, { ...valid, durationSeconds: 1.99 },
    { ...valid, durationSeconds: 20.01 }, { ...valid, durationSeconds: NaN }, { ...valid, durationSeconds: Infinity },
  ];
  for (const value of invalid) assert.equal(isProfessionalVerification(value, now), false);
  assert.throws(() => createProfessionalVerification({ video: file, durationSeconds: 1, consentedAt: valid.consentedAt, challenge: '0017' }, now), /entre 2 y 20/);
  assert.throws(() => createProfessionalVerification({ video: file, durationSeconds: 3, consentedAt: valid.consentedAt, challenge: '0017' }, NaN));
});

test('only bounded local video attachments are accepted, with matching filename, MIME and data header', () => {
  const valid = proof();
  for (const video of [
    { uri: 'file:///private/clip.mov', name: 'clip.mov', mimeType: 'video/quicktime' },
    { uri: 'data:video/webm;base64,AAAA', name: 'clip.webm', mimeType: 'video/webm' },
    { uri: 'file:///C:/Klini/clip%20local.mp4', name: 'clip local.mp4', mimeType: 'video/mp4' },
  ]) assert.equal(isProfessionalVerification({ ...valid, video }, now), true);
  const invalidVideos = [
    { ...file, uri: 'https://example.com/clip.mp4' }, { ...file, uri: 'http://example.com/clip.mp4' },
    { ...file, uri: 'file://server/share/clip.mp4' }, { ...file, uri: 'content://media/clip' }, { ...file, uri: 'ph://asset' },
    { ...file, uri: 'file:///clip.mp4?token=abc' }, { ...file, uri: 'file:///clip.mp4#fragment' }, { ...file, uri: 'file:///%00.mp4' },
    { ...file, uri: `file:///${'a'.repeat(4096)}.mp4` }, { ...file, uri: 'data:video/webm;base64,AAAA' },
    { ...file, uri: 'data:video/mp4;base64,' }, { ...file, uri: 'data:video/mp4;base64,***=' }, { ...file, uri: 'data:video/mp4;base64,AAAAA' },
    { ...file, name: '' }, { ...file, name: '   ' }, { ...file, name: 'clip.pdf' }, { ...file, name: '../clip.mp4' },
    { ...file, name: `${'a'.repeat(181)}.mp4` }, { ...file, mimeType: 'audio/mp4' }, { ...file, approved: true },
  ];
  for (const video of invalidVideos) assert.equal(isProfessionalVerification({ ...valid, video }, now), false);
  const limitData = Buffer.alloc(PROFESSIONAL_VERIFICATION_MAX_DATA_BYTES).toString('base64');
  assert.equal(isProfessionalVerification({ ...valid, video: { ...file, uri: `data:video/mp4;base64,${limitData}` } }, now), true);
  const oversizedData = Buffer.alloc(PROFESSIONAL_VERIFICATION_MAX_DATA_BYTES + 1).toString('base64');
  assert.equal(isProfessionalVerification({ ...valid, video: { ...file, uri: `data:video/mp4;base64,${oversizedData}` } }, now), false);
});

test('legacy professional profiles still read unchanged while new submissions require pending verification', () => {
  const legacy = [child, doctor, licensed, { id: 'old-profession-only', name: 'Profesional anterior', kind: 'Profesional de la salud', profession: 'Fisioterapeuta' }];
  assert.deepEqual(parseManagedProfiles(JSON.stringify(legacy)), legacy);
  assert.throws(() => upsertManagedProfile([child], doctor), /video/);
  assert.throws(() => upsertManagedProfile([child], licensed), /video/);
  assert.deepEqual(upsertManagedProfile([child, doctor], { ...doctor, name: ` ${doctor.name} ` }), [child, doctor]);
  assert.deepEqual(upsertManagedProfile([licensed], licensed), [licensed]);
  assert.throws(() => upsertManagedProfile([doctor], { ...doctor, licenseNumber: '00000003' }), /video/);
  assert.throws(() => upsertManagedProfile([licensed], { ...licensed, name: 'Nombre modificado' }), /video/);
});

test('an unchanged professional identity retains its previous pending submission even when omitted by the draft', () => {
  const verification = proof();
  const previous = { ...doctor, verification };
  const saved = upsertManagedProfile([child, previous], { ...doctor, name: `  ${doctor.name} ` });
  assert.deepEqual(saved, [child, previous]);
  assert.equal((saved[1] as ManagedProfessionalProfile).verification, verification);
  assert.equal(sameProfessionalIdentity(previous, doctor), true);
  assert.equal(sameProfessionalIdentity(previous, { ...doctor, name: ` ${doctor.name} ` }), true);
  assert.equal(sameProfessionalIdentity(undefined, doctor), false);
});

test('identity changes cannot reuse the old recording, timestamps or verification and require a new pending submission', () => {
  const previous = { ...doctor, verification: proof() };
  const modifications: ManagedProfessionalProfile[] = [
    { ...doctor, name: 'Elena actualizada' }, { ...doctor, licenseNumber: '00000099' }, { ...doctor, specialty: 'Medicina general' },
    { ...licensed, id: doctor.id, name: doctor.name },
  ];
  for (const draft of modifications) {
    assert.equal(sameProfessionalIdentity(previous, draft), false);
    assert.throws(() => upsertManagedProfile([previous], draft), /video/);
    assert.throws(() => upsertManagedProfile([previous], { ...draft, verification: { ...previous.verification } }), /nuevo video/);
    assert.throws(() => upsertManagedProfile([previous], { ...draft, verification: proof(1, previous.verification.video) }), /nuevo video/);
    const sameTimeNewVideo = { ...proof(2), submittedAt: previous.verification.submittedAt, consentedAt: previous.verification.consentedAt };
    assert.throws(() => upsertManagedProfile([previous], { ...draft, verification: sameTimeNewVideo }), /nuevo video/);
    const verification = proof(3);
    const updated = upsertManagedProfile([previous], { ...draft, verification });
    assert.deepEqual(updated, [{ ...draft, verification }]);
    assert.equal((updated[0] as ManagedProfessionalProfile).verification!.status, 'pending');
  }
  const previousLicensed = { ...licensed, verification: proof() };
  assert.equal(sameProfessionalIdentity(previousLicensed, { ...licensed, degreeType: 'Enfermería' }), false);
  assert.throws(() => upsertManagedProfile([previousLicensed], { ...previousLicensed, degreeType: 'Enfermería' }), /nuevo video/);
});

test('families cannot carry professional verification and a video cannot be reused for another identity', () => {
  const verification = proof();
  const previous = { ...doctor, verification };
  const familyWithProof = { ...child, verification };
  assert.equal(isManagedProfile(familyWithProof), false);
  assert.throws(() => parseManagedProfiles(JSON.stringify([familyWithProof])));
  assert.throws(() => upsertManagedProfile([child], familyWithProof), /tipo de perfil/);
  assert.throws(() => upsertManagedProfile([previous], { ...licensed, verification }), /video nuevo/);
  assert.throws(() => parseManagedProfiles(JSON.stringify([{ ...previous, verification: { ...verification, status: 'approved' } }])));
});

test('submissions preserve independent owner collections and professional selection opens separate local records', () => {
  const firstOwnerProfiles = [child, { ...doctor, verification: proof() }];
  const secondOwnerProfiles = [{ ...child, id: 'second-owner-child' }];
  const beforeFirst = JSON.stringify(firstOwnerProfiles);
  const beforeSecond = JSON.stringify(secondOwnerProfiles);
  const saved = upsertManagedProfile(firstOwnerProfiles, { ...licensed, verification: proof(1) });
  assert.equal(saved.length, 3);
  assert.equal(JSON.stringify(firstOwnerProfiles), beforeFirst);
  assert.equal(JSON.stringify(secondOwnerProfiles), beforeSecond);
  const owner = createDemoState();
  const familyState = switchProfile(owner, child);
  const beforeState = JSON.stringify(familyState);
  const active = switchProfile(familyState, { ...licensed, verification: proof(1) });
  assert.equal(active.profile.id, licensed.id);
  assert.deepEqual(active.records, []);
  assert.equal(JSON.stringify(familyState), beforeState);
  assert.equal(familyState.profile.id, child.id);
});
