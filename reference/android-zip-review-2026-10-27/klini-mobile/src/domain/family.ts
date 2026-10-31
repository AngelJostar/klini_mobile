import type { AppState, Patient, ProfileScope } from './types';
import type { ManagedProfile } from '../state/managedProfiles';

export function captureProfile(state: AppState, kind: string): ProfileScope {
  const { profile, appointments, policies, claims, records, medications, messages, favorites, aiSubscription } = state;
  return { profile, appointments, policies, claims, records, medications, messages, favorites, aiSubscription, kind };
}
export function switchProfile(state: AppState, target?: ManagedProfile): AppState {
  const ownerId = state.family?.ownerId ?? state.profile.id;
  const id = target?.id ?? ownerId;
  if (id === state.profile.id) return state;
  const profiles = { ...state.family?.profiles };
  profiles[state.profile.id] = captureProfile(state, profiles[state.profile.id]?.kind ?? 'Perfil principal');
  const destination = profiles[id] ?? (target ? {
    profile: { id, name: target.name, birthDate: target.birthDate ?? '', sex: target.sex ?? '', email: target.email ?? '', phone: target.phone ?? '', bloodType: '', allergies: '', emergencyName: '', emergencyPhone: '' },
    kind: target.kind, appointments: [], records: [], policies: [], claims: [], medications: [], messages: [], favorites: [],
  } : undefined);
  if (!destination) throw Error('No se encontró el perfil principal.');
  profiles[id] = destination;
  return { ...state, profile: destination.profile, appointments: destination.appointments, policies: destination.policies, claims: destination.claims, records: destination.records, medications: destination.medications, messages: destination.messages, favorites: destination.favorites, aiSubscription: destination.aiSubscription, family: { ownerId, profiles } };
}
export function editStoredProfile(state: AppState, id: string, { kind, ...patch }: Partial<Patient> & { kind?: string }): AppState {
  const renamedAppointments = (scope: Pick<ProfileScope, 'profile' | 'appointments'>) => scope.appointments.map(appointment =>
    patch.name && (appointment.patientId === id || (!appointment.patientId && appointment.patientName === scope.profile.name))
      ? { ...appointment, patientId: id, patientName: patch.name } : appointment);
  if (id === state.profile.id) {
    const next = { ...state, profile: { ...state.profile, ...patch, id }, appointments: renamedAppointments(state) };
    if (next.family) next.family = { ...next.family, profiles: { ...next.family.profiles, [id]: captureProfile(next, kind ?? next.family.profiles[id].kind) } };
    return next;
  }
  const scope = state.family?.profiles[id];
  if (!scope || !state.family) return state;
  return { ...state, family: { ...state.family, profiles: { ...state.family.profiles, [id]: { ...scope, kind: kind ?? scope.kind, profile: { ...scope.profile, ...patch, id }, appointments: renamedAppointments(scope) } } } };
}
