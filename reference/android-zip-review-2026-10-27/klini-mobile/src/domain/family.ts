import type { AppState, Patient, ProfessionalProfileDescriptor, ProfileScope } from './types';
import { isManagedProfile, isProfessionalProfile, type ManagedProfile, type ManagedProfessionalProfile } from './managedProfiles';

const professionalKind = 'Profesional de la salud';
const descriptorFields = new Set(['id', 'name', 'kind', 'demo', 'professionalType', 'licenseNumber', 'specialty', 'degreeType', 'profession']);

/** This is local display metadata only: proof, approval claims and backend roles are never copied. */
export function isProfessionalProfileDescriptor(value: unknown): value is ProfessionalProfileDescriptor {
  return isManagedProfile(value) && isProfessionalProfile(value) && Object.keys(value).every(key => descriptorFields.has(key));
}

function professionalDescriptor(target: ManagedProfessionalProfile, name: string): ProfessionalProfileDescriptor {
  const base = { id: target.id, name: name.trim(), kind: professionalKind as 'Profesional de la salud', ...(target.demo ? { demo: target.demo } : {}) };
  if (target.professionalType === 'doctor') return { ...base, professionalType: 'doctor', licenseNumber: target.licenseNumber, specialty: target.specialty };
  if (target.professionalType === 'licensed') return { ...base, professionalType: 'licensed', licenseNumber: target.licenseNumber, degreeType: target.degreeType };
  return { ...base, profession: target.profession };
}

function accountOwner(state: AppState): Patient {
  const owner = state.family ? state.family.profiles[state.family.ownerId]?.profile : state.profile;
  if (!owner) throw new Error('No se encontró el perfil principal.');
  return owner;
}

function canonicalProfessionalScope(scope: ProfileScope, ownerName: string): ProfileScope {
  if (!isProfessionalProfileDescriptor(scope.professional) || scope.professional.id !== scope.profile.id) {
    throw new Error('No se encontraron los datos del perfil profesional.');
  }
  return { ...scope, profile: { ...scope.profile, name: ownerName.trim() }, professional: { ...scope.professional, name: ownerName.trim() } };
}

export function captureProfile(state: AppState, kind: string): ProfileScope {
  const { profile, appointments, policies, claims, records, medications, messages, favorites, aiSubscription, medicationCare, pharmacy } = state;
  const scope = { profile, appointments, policies, claims, records, medications, messages, favorites, aiSubscription, medicationCare, pharmacy, kind };
  return kind === professionalKind
    ? canonicalProfessionalScope({ ...scope, professional: state.family?.profiles[profile.id]?.professional }, accountOwner(state).name)
    : scope;
}

function profilesWithCurrent(state: AppState): Record<string, ProfileScope> {
  return { ...state.family?.profiles, [state.profile.id]: captureProfile(state, state.family?.profiles[state.profile.id]?.kind ?? 'Perfil principal') };
}

function activateScope(state: AppState, profiles: Record<string, ProfileScope>, id: string): AppState {
  const ownerId = state.family?.ownerId ?? state.profile.id;
  const stored = profiles[id];
  const destination = stored?.kind === professionalKind ? canonicalProfessionalScope(stored, profiles[ownerId]?.profile.name ?? '') : stored;
  if (!destination) throw Error('No se encontró el perfil principal.');
  if (destination.kind !== professionalKind && destination.professional !== undefined) throw new Error('Revisa el tipo de perfil guardado.');
  if (id === ownerId && destination.kind === professionalKind) throw new Error('El titular debe conservar su perfil general.');
  if (destination.profile.id !== id) throw new Error('Revisa el identificador del perfil guardado.');
  profiles[id] = destination;
  return { ...state, profile: destination.profile, appointments: destination.appointments, policies: destination.policies, claims: destination.claims, records: destination.records, medications: destination.medications, messages: destination.messages, favorites: destination.favorites, aiSubscription: destination.aiSubscription, medicationCare: destination.medicationCare, pharmacy: destination.pharmacy, family: { ownerId, profiles } };
}

export function switchProfile(state: AppState, target?: ManagedProfile): AppState {
  const owner = accountOwner(state);
  if (target && (!isManagedProfile(target) || target.id === owner.id)) throw new Error('No se puede reemplazar el perfil principal con otro perfil.');
  if (!target && state.profile.id === owner.id) return state;
  const profiles = profilesWithCurrent(state);
  const id = target?.id ?? owner.id;
  const existing = profiles[id];
  if (target) {
    const professional = isProfessionalProfile(target);
    if (existing && (existing.kind === professionalKind) !== professional) throw new Error('No se puede convertir un perfil personal en profesional ni al revés.');
    if (professional) {
      const descriptor = professionalDescriptor(target, owner.name);
      if (existing && !isProfessionalProfileDescriptor(existing.professional)) throw new Error('Revisa los datos del perfil profesional.');
      if (id === state.profile.id && existing?.professional && state.profile.name === descriptor.name &&
        Array.from(descriptorFields).every(field =>
          (existing.professional as unknown as Record<string, unknown>)[field] === (descriptor as unknown as Record<string, unknown>)[field])) return state;
      profiles[id] = existing
        ? { ...existing, profile: { ...existing.profile, name: descriptor.name }, professional: descriptor }
        : { profile: { id, name: descriptor.name, birthDate: '', sex: '', email: '', phone: '', bloodType: '', allergies: '', emergencyName: '', emergencyPhone: '' }, kind: professionalKind,
          professional: descriptor, appointments: [], records: [], policies: [], claims: [], medications: [], messages: [], favorites: [] };
    } else if (id === state.profile.id) {
      return state;
    } else if (!existing) {
      profiles[id] = { profile: { id, name: target.name, birthDate: target.birthDate ?? '', sex: target.sex ?? '', email: target.email ?? '', phone: target.phone ?? '', bloodType: '', allergies: '', emergencyName: '', emergencyPhone: '' },
        kind: target.kind, appointments: [], records: [], policies: [], claims: [], medications: [], messages: [], favorites: [] };
    }
  }
  return activateScope(state, profiles, id);
}

/** Restore only an already stored context, for example after a failed persisted selection. */
export function restoreStoredProfile(state: AppState, id: string): AppState {
  const profiles = profilesWithCurrent(state);
  if (!Object.hasOwn(profiles, id)) throw new Error('No se encontró el perfil guardado.');
  return activateScope(state, profiles, id);
}

function synchronizeProfessionalNames(state: AppState): AppState {
  if (!state.family) return state;
  const name = accountOwner(state).name;
  const profiles = Object.fromEntries(Object.entries(state.family.profiles).map(([id, scope]) => [id,
    scope.kind === professionalKind ? canonicalProfessionalScope(scope, name) : scope]));
  return { ...state, profile: profiles[state.profile.id]?.kind === professionalKind ? { ...state.profile, name: name.trim() } : state.profile,
    family: { ...state.family, profiles } };
}

export function editStoredProfile(state: AppState, id: string, { kind, ...patch }: Partial<Patient> & { kind?: string }): AppState {
  const originalKind = state.family?.profiles[id]?.kind;
  if (originalKind === professionalKind && ((kind !== undefined && kind !== professionalKind) ||
    (patch.name !== undefined && patch.name.trim() !== accountOwner(state).name.trim()))) {
    throw new Error('El nombre y tipo profesional pertenecen al titular de la cuenta.');
  }
  if (originalKind !== professionalKind && kind === professionalKind) throw new Error('No se puede convertir un perfil personal en profesional.');
  const patientKey = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase().replace(/\s+/g, ' ');
  const renamedAppointments = (scope: Pick<ProfileScope, 'profile' | 'appointments'>) => scope.appointments.map(appointment =>
    patch.name && (appointment.patientId === id || (!appointment.patientId && patientKey(appointment.patientName) === patientKey(scope.profile.name)))
      ? { ...appointment, patientId: id, patientName: patch.name } : appointment);
  if (id === state.profile.id) {
    const next = { ...state, profile: { ...state.profile, ...patch, id }, appointments: renamedAppointments(state) };
    if (next.family) next.family = { ...next.family, profiles: { ...next.family.profiles, [id]: captureProfile(next, kind ?? next.family.profiles[id].kind) } };
    return synchronizeProfessionalNames(next);
  }
  const scope = state.family?.profiles[id];
  if (!scope || !state.family) return state;
  return synchronizeProfessionalNames({ ...state, family: { ...state.family, profiles: { ...state.family.profiles, [id]: { ...scope, kind: kind ?? scope.kind, profile: { ...scope.profile, ...patch, id }, appointments: renamedAppointments(scope) } } } });
}
