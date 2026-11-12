import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getProfessionalFormDefaults,
  healthDegreeTypes,
  healthProfessions,
  isProfessionalProfile,
  professionalProfileLabel,
  parseManagedProfiles,
  upsertManagedProfile,
  type ManagedPatientProfile,
  type ManagedDoctorProfile,
  type ManagedLicensedProfile,
  type LegacyManagedProfessionalProfile,
  type ManagedProfile,
  type ManagedProfessionalProfile,
} from '../src/domain/managedProfiles';
import { createProfessionalVerification } from '../src/domain/professionalVerification';
import { switchProfile } from '../src/domain/family';
import { createDemoState } from '../src/domain/seed';

const child: ManagedPatientProfile = {
  id: 'child-mateo', name: 'Mateo Salinas', kind: 'Niño', birthDate: '2020-05-15',
  sex: 'Masculino', email: 'familia@example.com', phone: '5512345678',
};
const professional: ManagedLicensedProfile = {
  id: 'professional-andrea', name: 'Andrea Ruiz', kind: 'Profesional de la salud', professionalType: 'licensed', licenseNumber: '00000002', degreeType: 'Fisioterapia',
};
const doctor: ManagedDoctorProfile = {
  id: 'professional-luis', name: 'Luis Martínez', kind: 'Profesional de la salud', professionalType: 'doctor', licenseNumber: '00000001', specialty: 'Cardiología',
};
let proofSequence = 0;
function submitted<T extends ManagedProfessionalProfile>(profile: T): T {
  proofSequence += 1;
  const now = Date.UTC(2026, 0, 1, 12, 0, proofSequence);
  return { ...profile, verification: createProfessionalVerification({ video: { uri: `file:///test/${profile.id}-${proofSequence}.mp4`, name: `video-${proofSequence}.mp4`, mimeType: 'video/mp4' }, durationSeconds: 3, consentedAt: new Date(now - 1000).toISOString(), challenge: '0123' }, now) };
}

test('legacy managed family profiles load unchanged alongside a professional after reload', () => {
  const legacy = [child, { id: 'pet-max', name: 'Max', kind: 'Mascota' }, { id: 'adult-legacy', name: 'Adulto guardado', kind: 'Adulto' }];
  const previous = parseManagedProfiles(JSON.stringify(legacy));
  assert.deepEqual(previous, legacy);
  const pending = submitted(professional);
  const saved = upsertManagedProfile(previous, pending);
  const restored = parseManagedProfiles(JSON.stringify(saved));
  assert.deepEqual(restored, [...legacy, pending]);
  assert.deepEqual(previous, legacy);
  assert.equal(isProfessionalProfile(restored[0]), false);
  assert.equal(isProfessionalProfile(restored[3]), true);
});

test('licensed professional edits preserve identity and family fields while accepting each offered degree', () => {
  let profiles: ManagedProfile[] = [child, professional];
  for (const degreeType of healthDegreeTypes) {
    const pending = submitted({ ...professional, name: '  Andrea Ruíz  ', degreeType });
    profiles = upsertManagedProfile(profiles, pending);
    const restored = parseManagedProfiles(JSON.stringify(profiles));
    assert.deepEqual(restored[0], child);
    assert.deepEqual(restored[1], { ...pending, name: 'Andrea Ruíz' });
    assert.equal(restored.length, 2);
  }
});

test('family edits still allow changing family kind and trim names without changing professional entries', () => {
  const edited = upsertManagedProfile([child, professional], { ...child, name: '  Mateo Actualizado ', kind: 'Niña' });
  assert.deepEqual(edited[0], { ...child, name: 'Mateo Actualizado', kind: 'Niña' });
  assert.deepEqual(edited[1], professional);
  assert.deepEqual(child.name, 'Mateo Salinas');
});

test('legacy adult profiles remain editable but no new adult profile or conversion to adult is allowed', () => {
  const adult: ManagedPatientProfile = { ...child, id: 'adult-legacy', name: 'Persona guardada', kind: 'Adulto' };
  const loaded = parseManagedProfiles(JSON.stringify([adult, child]));
  const edited = upsertManagedProfile(loaded, { ...adult, name: 'Nombre actualizado' });
  assert.deepEqual(edited[0], { ...adult, name: 'Nombre actualizado' });
  assert.deepEqual(edited[1], child);
  assert.throws(() => upsertManagedProfile(loaded, { ...adult, id: 'new-adult' }), /Niño, Niña o Mascota/);
  assert.throws(() => upsertManagedProfile(loaded, { ...child, kind: 'Adulto' }), /Niño, Niña o Mascota/);
  const converted = upsertManagedProfile(loaded, { ...adult, kind: 'Niña' });
  assert.deepEqual(converted[0], { ...adult, kind: 'Niña' });
});

test('invalid stored professions, malformed family fields and duplicate identities are rejected', () => {
  for (const data of [
    [{ ...professional, professionalType: undefined }],
    [{ ...professional, profession: 'Cirujano sin opción registrada' }],
    [{ ...professional, profession: 3 }],
    [{ ...professional, name: ' ' }],
    [{ ...professional, id: '' }],
    [{ ...child, email: false }],
    [{ ...child, profession: 'Médico/a' }],
    [child, { ...professional, id: child.id }],
    { profiles: [professional] },
  ]) assert.throws(() => parseManagedProfiles(JSON.stringify(data)));
  assert.throws(() => parseManagedProfiles('{broken'));
  assert.deepEqual(parseManagedProfiles('[]'), []);
});

test('doctor and degree credentials persist exactly as entered without discarding leading zeros', () => {
  const pendingDoctor = submitted(doctor);
  const pendingProfessional = submitted(professional);
  const saved = upsertManagedProfile(upsertManagedProfile([child], pendingDoctor), pendingProfessional);
  const loaded = parseManagedProfiles(JSON.stringify(saved));
  assert.deepEqual(loaded, [child, pendingDoctor, pendingProfessional]);
  assert.equal(doctor.licenseNumber, '00000001');
  assert.equal(professional.licenseNumber, '00000002');
  assert.equal(professionalProfileLabel(doctor), 'Cardiología');
  assert.equal(professionalProfileLabel(professional), 'Fisioterapia');
  for (const licenseNumber of ['0', '00000000000000000000']) {
    const pending = submitted({ ...doctor, licenseNumber });
    assert.deepEqual(upsertManagedProfile([], pending)[0], pending);
  }
});

test('professional credentials reject missing, numeric, mixed and oversized license strings before changing data', () => {
  const profiles: ManagedProfile[] = [child, doctor, professional];
  const before = JSON.stringify(profiles);
  for (const template of [doctor, professional]) {
    for (const licenseNumber of [undefined, null, '', 1, '123abc', '123.4', '-1', ' 123', '123 ', '1e3', '0'.repeat(21)]) {
      const draft = { ...template, licenseNumber };
      assert.throws(() => parseManagedProfiles(JSON.stringify([draft])));
      assert.throws(() => upsertManagedProfile(profiles, draft as unknown as ManagedProfile));
    }
  }
  assert.equal(JSON.stringify(profiles), before);
});

test('each professional branch requires its own fields and rejects fields from another branch or the old shape', () => {
  for (const draft of [
    { ...doctor, specialty: undefined },
    { ...doctor, specialty: '' },
    { ...doctor, specialty: 'Especialidad fuera del catálogo' },
    { ...doctor, degreeType: 'Fisioterapia' },
    { ...doctor, profession: 'Médico/a' },
    { ...professional, degreeType: undefined },
    { ...professional, degreeType: 'Licenciatura fuera del catálogo' },
    { ...professional, specialty: 'Cardiología' },
    { ...professional, profession: 'Fisioterapeuta' },
    { ...professional, professionalType: 'unknown' },
    { ...child, professionalType: 'doctor', licenseNumber: '00000001', specialty: 'Cardiología' },
  ]) {
    assert.throws(() => parseManagedProfiles(JSON.stringify([draft])));
    assert.throws(() => upsertManagedProfile([], draft as unknown as ManagedProfile));
  }
});

test('old professional records round trip unchanged but a save requires complete doctor or degree fields', () => {
  const legacy: LegacyManagedProfessionalProfile[] = healthProfessions.map((profession, index) => ({
    id: `old-professional-${index}`, name: `Profesional anterior ${index}`, kind: 'Profesional de la salud', profession,
  }));
  const serialized = JSON.stringify([child, ...legacy]);
  const restored = parseManagedProfiles(serialized);
  assert.equal(JSON.stringify(restored), serialized);
  for (const profile of legacy) {
    assert.equal(professionalProfileLabel(profile), profile.profession);
    assert.throws(() => upsertManagedProfile(restored, { ...profile, name: 'Nombre editado' }), /Completa la cédula/);
    assert.throws(() => upsertManagedProfile(restored, { ...profile, id: 'new-incomplete' }), /Completa la cédula/);
  }
  const pending = submitted({ ...professional, id: legacy[2].id });
  const upgraded = upsertManagedProfile(restored, pending);
  assert.equal(upgraded.length, restored.length);
  assert.deepEqual(upgraded.find(profile => profile.id === legacy[2].id), pending);
  assert.deepEqual(upgraded[0], child);
  assert.equal(JSON.stringify(restored), serialized);
});

test('form defaults preserve completed fields, derive only a legacy profession hint and never invent a license', () => {
  assert.deepEqual(getProfessionalFormDefaults(doctor), { name: doctor.name, professionalType: 'doctor', licenseNumber: '00000001', specialty: 'Cardiología', degreeType: '' });
  assert.deepEqual(getProfessionalFormDefaults(professional), { name: professional.name, professionalType: 'licensed', licenseNumber: '00000002', specialty: '', degreeType: 'Fisioterapia' });
  const legacy: LegacyManagedProfessionalProfile = { id: 'old', name: 'Andrea anterior', kind: 'Profesional de la salud', profession: 'Fisioterapeuta' };
  assert.deepEqual(getProfessionalFormDefaults(legacy), { name: legacy.name, professionalType: 'licensed', licenseNumber: '', specialty: '', degreeType: 'Fisioterapia' });
  assert.deepEqual(getProfessionalFormDefaults({ ...legacy, profession: 'Médico/a' }), { name: legacy.name, professionalType: 'doctor', licenseNumber: '', specialty: '', degreeType: '' });
  assert.deepEqual(getProfessionalFormDefaults(), { name: '', professionalType: 'doctor', licenseNumber: '', specialty: '', degreeType: '' });
});

test('explicit changes between completed professional branches retain one identity and cannot downgrade to legacy', () => {
  const previous: ManagedProfile[] = [child, doctor];
  const pending = submitted({ ...professional, id: doctor.id });
  const changed = upsertManagedProfile(previous, pending);
  assert.equal(changed.length, previous.length);
  assert.deepEqual(changed[0], child);
  assert.deepEqual(changed[1], pending);
  assert.throws(() => upsertManagedProfile(changed, { id: doctor.id, name: doctor.name, kind: 'Profesional de la salud', profession: 'Médico/a' }), /Completa la cédula/);
});

test('failed drafts and attempts to change profile role leave the existing list intact', () => {
  const profiles: ManagedProfile[] = [child, professional];
  const before = JSON.stringify(profiles);
  for (const draft of [
    { ...professional, profession: 'Desconocida' },
    { ...professional, name: ' ' },
    { ...professional, id: child.id },
    { ...child, id: professional.id },
  ]) assert.throws(() => upsertManagedProfile(profiles, draft as ManagedProfile));
  assert.equal(JSON.stringify(profiles), before);
});

test('professional profiles have an independent context and cannot overwrite a matching patient identity', () => {
  const owner = createDemoState();
  const before = JSON.stringify(owner);
  const active = switchProfile(owner, professional);
  assert.equal(active.profile.id, professional.id);
  assert.equal(active.profile.name, owner.profile.name);
  assert.deepEqual(active.records, []);
  assert.throws(() => switchProfile(owner, { ...professional, id: owner.profile.id }), /principal/);
  assert.equal(JSON.stringify(owner), before);
  const family = switchProfile(owner, child);
  const familyBefore = JSON.stringify(family);
  assert.throws(() => switchProfile(family, { ...professional, id: child.id }), /personal.*profesional/);
  assert.equal(JSON.stringify(family), familyBefore);
  assert.equal(switchProfile(family).profile.id, owner.profile.id);
});
