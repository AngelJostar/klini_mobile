import type { AppState, Medication } from './types';
import { appReducer } from './reducer';
import { applyMedicationReminderMutation, emptyMedicationCare, getProfileMedicationCare, isMedicationCare, rollbackMedicationCareChange, rollbackMedicationCareTransaction, setProfileMedicationCare, type MedicationCare, type MedicationCareItem, type MedicationReminderMutation, type MedicationTreatment } from './medicationCare';

/** Remove a failed addition from its original profile without restoring an old snapshot. */
export function rollbackMedicationAddition(state: AppState, profileId: string, medicationId: string): AppState {
  const activeHasAddition = state.profile.id === profileId && state.medications.some(medication => medication.id === medicationId);
  const scope = state.family?.profiles[profileId];
  const storedHasAddition = scope?.medications.some(medication => medication.id === medicationId) ?? false;
  // A reset, deletion or missing profile must not recreate anything or enqueue a stale snapshot.
  if (!activeHasAddition && !storedHasAddition) return state;

  const next = {
    ...state,
    medications: activeHasAddition ? state.medications.filter(medication => medication.id !== medicationId) : state.medications,
  };
  if (storedHasAddition && scope && state.family) {
    next.family = {
      ...state.family,
      profiles: {
        ...state.family.profiles,
        [profileId]: { ...scope, medications: scope.medications.filter(medication => medication.id !== medicationId) },
      },
    };
  }
  return next;
}

export type MedicationMutation =
  | { type: 'UPDATE_MEDICATION'; id: string; patch: Partial<Medication> }
  | { type: 'DELETE_MEDICATION'; id: string };
type ProfileMedicationAction = MedicationMutation | { type: 'ADD_MEDICATION'; medication: Medication };
const equal = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const medicationsFor = (state: AppState, profileId: string): Medication[] | undefined => state.profile.id === profileId ? state.medications : state.family?.profiles[profileId]?.medications;

/** Apply to the captured profile even if the user switched before a queued write began. */
export function applyProfileMedicationAction(state: AppState, profileId: string, action: ProfileMedicationAction, now = Date.now()): AppState {
  if (state.profile.id === profileId) return appReducer(state, action, now);
  const scope = state.family?.profiles[profileId];
  if (!scope || !state.family) throw new Error('No se encontró el perfil para guardar el medicamento.');
  const next = appReducer({ ...state, ...scope, medicationCare: scope.medicationCare, family: undefined }, action, now);
  return { ...state, family: { ...state.family, profiles: { ...state.family.profiles, [profileId]: { ...scope, medications: next.medications, medicationCare: next.medicationCare } } } };
}

/** Restore only values removed/changed by this attempt, never a complete earlier snapshot. */
export function rollbackMedicationMutation(state: AppState, profileId: string, id: string, expected: Medication | undefined, previous: Medication, expectedCare: MedicationCare | undefined, previousCare: MedicationCare | undefined): AppState {
  const medications = medicationsFor(state, profileId);
  if (!medications || !equal(medications.find(item => item.id === id), expected)) return state;
  const restoredMedications = medications.map(item => item.id === id ? previous : item);
  if (!expected) restoredMedications.push(previous);
  const scope = state.family?.profiles[profileId];
  let next = state.profile.id === profileId
    ? { ...state, medications: restoredMedications }
    : { ...state, family: { ...state.family!, profiles: { ...state.family!.profiles, [profileId]: { ...scope!, medications: restoredMedications } } } };
  let care = getProfileMedicationCare(state, profileId);
  // Updates do not change care. Deletions recover only matching cascade effects.
  if (!expected && previousCare) {
    const current = care ?? emptyMedicationCare();
    const after = expectedCare ?? emptyMedicationCare();
    let restored = current;
    for (const collection of ['treatments', 'takes', 'alerts'] as const) {
      for (const beforeItem of previousCare[collection]) {
        const afterItem = after[collection].find(item => item.id === beforeItem.id);
        if (equal(beforeItem, afterItem)) continue;
        const currentItem = restored[collection].find(item => item.id === beforeItem.id);
        if (!equal(currentItem, afterItem)) continue;
        const items: MedicationCareItem[] = restored[collection].filter(item => item.id !== beforeItem.id);
        const candidate = { ...restored, [collection]: [...items, beforeItem] };
        // A concurrent deletion or replacement of another reference must win over rollback.
        if (isMedicationCare(candidate, restoredMedications)) restored = candidate;
      }
    }
    care = restored;
  }
  next = setProfileMedicationCare(next, profileId, care);
  return next;
}

/** Shared scheduler prevents a failed care save from being revived by a deletion rollback. */
export function createMedicationWriteQueue(generation: () => number) {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(operation: () => Promise<T>): Promise<T> => {
    const requestedGeneration = generation();
    const pending = tail.then(() => {
      if (requestedGeneration !== generation()) throw new Error('El guardado se canceló al restablecer la demostración.');
      return operation();
    });
    tail = pending.catch(() => undefined);
    return pending;
  };
}

export function createMedicationMutationWriter(access: {
  current: () => AppState;
  generation: () => number;
  publish: (state: AppState) => void;
  persist: (state: AppState) => Promise<void>;
  now?: () => number;
}) {
  return async (profileId: string, action: MedicationMutation): Promise<void> => {
    const generation = access.generation();
    const previous = medicationsFor(access.current(), profileId)?.find(item => item.id === action.id);
    if (!previous) throw new Error('No se encontró el medicamento.');
    const previousCare = getProfileMedicationCare(access.current(), profileId);
    const next = applyProfileMedicationAction(access.current(), profileId, action, access.now?.());
    const expected = medicationsFor(next, profileId)?.find(item => item.id === action.id);
    const expectedCare = getProfileMedicationCare(next, profileId);
    access.publish(next);
    try {
      await access.persist(next);
      if (generation !== access.generation()) throw new Error('El guardado se canceló al restablecer la demostración.');
    } catch (error) {
      if (generation === access.generation()) {
        const rollback = rollbackMedicationMutation(access.current(), profileId, action.id, expected, previous, expectedCare, previousCare);
        if (rollback !== access.current()) {
          access.publish(rollback);
          await access.persist(rollback).catch(() => undefined);
        }
      }
      throw error;
    }
  };
}

/** Both entities are validated before publishing a single transaction or writing any storage. */
export function applyMedicationTreatmentWithMedication(state: AppState, profileId: string, treatment: MedicationTreatment, medication: Medication, now = Date.now()): AppState {
  if (typeof medication.dose !== 'string' || !medication.dose.trim() || typeof medication.frequency !== 'string' || !medication.frequency.trim()) throw new Error('Completa la dosis y la frecuencia del medicamento según tu receta.');
  const withMedication = applyProfileMedicationAction(state, profileId, { type: 'ADD_MEDICATION', medication }, now);
  return appReducer(withMedication, { type: 'SAVE_MEDICATION_TREATMENT', profileId, treatment: { ...treatment, medicationIds: [...treatment.medicationIds, medication.id] } }, now);
}

/** Revert this treatment and new medication only; subsequent independent changes are retained. */
export function rollbackMedicationTreatmentWithMedication(state: AppState, profileId: string, expectedTreatment: MedicationTreatment, medication: Medication, previousTreatment: MedicationTreatment | undefined): AppState {
  let next = rollbackMedicationCareChange(state, { type: 'SAVE_MEDICATION_TREATMENT', profileId, treatment: expectedTreatment }, previousTreatment);
  const currentMedication = medicationsFor(next, profileId)?.find(item => item.id === medication.id);
  if (!equal(currentMedication, medication)) return next;
  const care = getProfileMedicationCare(next, profileId);
  const subsequentlyReferenced = care?.treatments.some(item => item.medicationIds.includes(medication.id)) || care?.takes.some(item => item.medicationId === medication.id) || care?.alerts.some(item => item.medicationId === medication.id);
  // Never delete independently edited records merely to undo the earlier transaction.
  if (!subsequentlyReferenced) next = applyProfileMedicationAction(next, profileId, { type: 'DELETE_MEDICATION', id: medication.id });
  return next;
}

export function createMedicationTreatmentWithMedicationWriter(access: {
  current: () => AppState;
  generation: () => number;
  publish: (state: AppState) => void;
  persist: (state: AppState) => Promise<void>;
  now?: () => number;
}) {
  return async (profileId: string, treatment: MedicationTreatment, medication: Medication): Promise<void> => {
    const generation = access.generation();
    const previousTreatment = getProfileMedicationCare(access.current(), profileId)?.treatments.find(item => item.id === treatment.id);
    const next = applyMedicationTreatmentWithMedication(access.current(), profileId, treatment, medication, access.now?.());
    const expectedTreatment = getProfileMedicationCare(next, profileId)!.treatments.find(item => item.id === treatment.id)!;
    access.publish(next);
    try {
      await access.persist(next);
      if (generation !== access.generation()) throw new Error('El guardado se canceló al restablecer la demostración.');
    } catch (error) {
      if (generation === access.generation()) {
        const rollback = rollbackMedicationTreatmentWithMedication(access.current(), profileId, expectedTreatment, medication, previousTreatment);
        if (rollback !== access.current()) {
          access.publish(rollback);
          await access.persist(rollback).catch(() => undefined);
        }
      }
      throw error;
    }
  };
}

export function createMedicationReminderWriter(access: {
  current: () => AppState;
  generation: () => number;
  publish: (state: AppState) => void;
  persist: (state: AppState) => Promise<void>;
  now?: () => number;
}) {
  return async (profileId: string, mutation: MedicationReminderMutation): Promise<void> => {
    const generation = access.generation();
    const previous = getProfileMedicationCare(access.current(), profileId);
    const next = applyMedicationReminderMutation(access.current(), profileId, mutation, access.now?.());
    if (next === access.current()) return;
    const expected = getProfileMedicationCare(next, profileId)!;
    access.publish(next);
    try {
      await access.persist(next);
      if (generation !== access.generation()) throw new Error('El guardado se canceló al restablecer la demostración.');
    } catch (error) {
      if (generation === access.generation()) {
        const rollback = rollbackMedicationCareTransaction(access.current(), profileId, previous, expected);
        if (rollback !== access.current()) {
          access.publish(rollback);
          await access.persist(rollback).catch(() => undefined);
        }
      }
      throw error;
    }
  };
}
