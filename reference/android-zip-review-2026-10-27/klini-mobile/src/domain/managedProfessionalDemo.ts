import { isProfessionalProfile, type ManagedDoctorProfile, type ManagedProfile } from './managedProfiles';

export const SOFIA_PROFESSIONAL_DEMO_ID = 'demo-sofia-medical-oncology-v1';
export const SOFIA_PROFESSIONAL_DEMO_MARKER = 'sofia-medical-oncology-v1' as const;

const canonicalName = (name: string) => name.normalize('NFC').trim();

/** Provision only the requested local fixture; never submit identity proof or replace saved records. */
export function ensureSofiaDemoProfessionalProfile(
  profiles: ManagedProfile[],
  owner: { id: string; name?: string },
): ManagedProfile[] {
  if (owner.id !== 'patient-sofia' || !owner.name || canonicalName(owner.name) !== 'Sofía Martínez') return profiles;
  if (profiles.some(profile => profile.id === SOFIA_PROFESSIONAL_DEMO_ID || (
    isProfessionalProfile(profile) && profile.professionalType === 'doctor' &&
    canonicalName(profile.name) === 'Sofía Martínez' && profile.licenseNumber === '111111' &&
    profile.specialty === 'Oncología Médica'
  ))) return profiles;

  const demo: ManagedDoctorProfile = {
    id: SOFIA_PROFESSIONAL_DEMO_ID,
    name: owner.name.trim(),
    kind: 'Profesional de la salud',
    professionalType: 'doctor',
    licenseNumber: '111111',
    specialty: 'Oncología Médica',
    demo: SOFIA_PROFESSIONAL_DEMO_MARKER,
  };
  return [...profiles, demo];
}
