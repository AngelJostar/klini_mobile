import { medicalSpecialties as referenceMedicalSpecialties } from './medicalSpecialties';
import { isProfessionalVerification, type ProfessionalVerification } from './professionalVerification';

export const profileKinds = ['Niño', 'Niña', 'Mascota'] as const;
export const healthProfessions = [
  'Médico/a',
  'Enfermero/a',
  'Fisioterapeuta',
  'Psicólogo/a',
  'Nutriólogo/a',
  'Odontólogo/a',
  'Otro',
] as const;
export const medicalSpecialties: readonly string[] = ['Cardiología', ...referenceMedicalSpecialties];
export const healthDegreeTypes = ['Fisioterapia', 'Enfermería', 'Psicología', 'Nutrición', 'Odontología', 'Otra licenciatura'] as const;

export type HealthProfession = (typeof healthProfessions)[number];
export type MedicalSpecialty = (typeof medicalSpecialties)[number];
export type HealthDegreeType = (typeof healthDegreeTypes)[number];
export type ProfessionalType = 'doctor' | 'licensed';
export type ManagedPatientProfile = {
  id: string;
  name: string;
  kind: (typeof profileKinds)[number] | 'Adulto';
  birthDate?: string;
  sex?: string;
  email?: string;
  phone?: string;
};
export type ProfessionalBase = {
  id: string;
  name: string;
  kind: 'Profesional de la salud';
  demo?: 'sofia-medical-oncology-v1';
  verification?: ProfessionalVerification;
};
export type LegacyManagedProfessionalProfile = ProfessionalBase & {
  profession: HealthProfession;
  professionalType?: undefined;
  licenseNumber?: undefined;
  specialty?: undefined;
  degreeType?: undefined;
};
export type ManagedDoctorProfile = ProfessionalBase & {
  professionalType: 'doctor';
  licenseNumber: string;
  specialty: MedicalSpecialty;
  degreeType?: never;
  profession?: never;
};
export type ManagedLicensedProfile = ProfessionalBase & {
  professionalType: 'licensed';
  licenseNumber: string;
  degreeType: HealthDegreeType;
  specialty?: never;
  profession?: never;
};
export type ManagedProfessionalProfile = LegacyManagedProfessionalProfile | ManagedDoctorProfile | ManagedLicensedProfile;
export type ManagedProfile = ManagedPatientProfile | ManagedProfessionalProfile;

export type ProfessionalFormDefaults = {
  name: string;
  professionalType: ProfessionalType;
  licenseNumber: string;
  specialty: MedicalSpecialty | '';
  degreeType: HealthDegreeType | '';
};

export function isProfessionalProfile(profile: ManagedProfile): profile is ManagedProfessionalProfile {
  return profile.kind === 'Profesional de la salud';
}

/** Exact saved identity fields; whitespace trimmed by upsert does not invalidate unchanged data. */
export function sameProfessionalIdentity(left?: ManagedProfessionalProfile, right?: ManagedProfessionalProfile): boolean {
  if (!left || !right) return false;
  return left.id === right.id && left.name.trim() === right.name.trim() &&
    left.professionalType === right.professionalType && left.licenseNumber === right.licenseNumber &&
    left.specialty === right.specialty && left.degreeType === right.degreeType && left.profession === right.profession;
}

export function professionalProfileLabel(profile: ManagedProfessionalProfile): string {
  if (profile.professionalType === 'doctor') return profile.specialty;
  if (profile.professionalType === 'licensed') return profile.degreeType;
  return profile.profession;
}

export function getProfessionalFormDefaults(profile?: ManagedProfessionalProfile): ProfessionalFormDefaults {
  if (profile?.professionalType === 'doctor') {
    return { name: profile.name, professionalType: 'doctor', licenseNumber: profile.licenseNumber, specialty: profile.specialty, degreeType: '' };
  }
  if (profile?.professionalType === 'licensed') {
    return { name: profile.name, professionalType: 'licensed', licenseNumber: profile.licenseNumber, specialty: '', degreeType: profile.degreeType };
  }
  const legacyDegree: Partial<Record<HealthProfession, HealthDegreeType>> = {
    'Enfermero/a': 'Enfermería', Fisioterapeuta: 'Fisioterapia', 'Psicólogo/a': 'Psicología',
    'Nutriólogo/a': 'Nutrición', 'Odontólogo/a': 'Odontología', Otro: 'Otra licenciatura',
  };
  return {
    name: profile?.name ?? '',
    professionalType: !profile || profile.profession === 'Médico/a' ? 'doctor' : 'licensed',
    licenseNumber: '',
    specialty: '',
    degreeType: profile ? legacyDegree[profile.profession] ?? '' : '',
  };
}

export function isManagedProfile(value: unknown): value is ManagedProfile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const profile = value as Record<string, unknown>;
  if (
    typeof profile.id !== 'string' || !profile.id.trim() || profile.id.length > 255 ||
    typeof profile.name !== 'string' || !profile.name.trim() || profile.name.length > 255
  ) return false;
  if (profile.kind === 'Profesional de la salud') {
    if (profile.demo !== undefined && profile.demo !== 'sofia-medical-oncology-v1') return false;
    if (profile.verification !== undefined && !isProfessionalVerification(profile.verification)) return false;
    if (profile.professionalType === undefined) {
      return typeof profile.profession === 'string' &&
        healthProfessions.some(profession => profession === profile.profession) &&
        ['licenseNumber', 'specialty', 'degreeType'].every(field => profile[field] === undefined);
    }
    if (typeof profile.licenseNumber !== 'string' || !/^\d{1,20}$/.test(profile.licenseNumber) || profile.profession !== undefined) return false;
    if (profile.professionalType === 'doctor') {
      return typeof profile.specialty === 'string' && medicalSpecialties.includes(profile.specialty) && profile.degreeType === undefined;
    }
    return profile.professionalType === 'licensed' &&
      healthDegreeTypes.some(degree => degree === profile.degreeType) && profile.specialty === undefined;
  }
  return (profile.kind === 'Adulto' || profileKinds.some(kind => kind === profile.kind)) &&
    ['profession', 'professionalType', 'licenseNumber', 'specialty', 'degreeType', 'verification', 'demo'].every(field => profile[field] === undefined) &&
    ['birthDate', 'sex', 'email', 'phone'].every(field => profile[field] === undefined || typeof profile[field] === 'string');
}

export function parseManagedProfiles(raw: string): ManagedProfile[] {
  const data: unknown = JSON.parse(raw);
  if (
    !Array.isArray(data) || !data.every(isManagedProfile) ||
    new Set(data.map(profile => profile.id)).size !== data.length
  ) throw new Error('No se pudieron leer los perfiles guardados.');
  return data;
}

export function upsertManagedProfile(profiles: readonly ManagedProfile[], draft: ManagedProfile): ManagedProfile[] {
  let profile = { ...draft, name: typeof draft.name === 'string' ? draft.name.trim() : '' };
  if (!isManagedProfile(profile)) throw new Error('Revisa el nombre y el tipo de perfil.');
  if (isProfessionalProfile(profile) && profile.professionalType === undefined) {
    throw new Error('Completa la cédula y los datos del perfil profesional.');
  }
  const previous = profiles.find(item => item.id === profile.id);
  if (previous && isProfessionalProfile(previous) !== isProfessionalProfile(profile)) {
    throw new Error('No se puede cambiar un perfil personal por uno profesional ni al revés.');
  }
  if (profile.kind === 'Adulto' && previous?.kind !== 'Adulto') {
    throw new Error('Selecciona Niño, Niña o Mascota para agregar un perfil.');
  }
  if (isProfessionalProfile(profile)) {
    const previousProfessional = previous && isProfessionalProfile(previous) ? previous : undefined;
    const identityChanged = !sameProfessionalIdentity(previousProfessional, profile);
    if (identityChanged) {
      const verification = profile.verification;
      if (!verification) throw new Error('Graba un video y acepta el consentimiento para enviar estos datos profesionales a revisión.');
      if (previousProfessional?.verification && (
        Date.parse(verification.submittedAt) <= Date.parse(previousProfessional.verification.submittedAt) ||
        verification.video.uri === previousProfessional.verification.video.uri
      )) throw new Error('Los datos profesionales cambiaron. Graba un nuevo video para revisar la identidad actualizada.');
      if (profiles.some(item => item.id !== profile.id && isProfessionalProfile(item) && item.verification?.video.uri === verification.video.uri)) {
        throw new Error('Graba un video nuevo para este perfil profesional.');
      }
    } else if (previousProfessional?.verification && profile.verification === undefined) {
      profile = { ...profile, verification: previousProfessional.verification };
    }
  }
  return previous
    ? profiles.map(item => item.id === profile.id ? profile : item)
    : [...profiles, profile];
}
