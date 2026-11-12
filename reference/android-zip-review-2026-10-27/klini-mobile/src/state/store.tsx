import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppState, StoreContext } from "../domain/types";
import {
  appReducer,
  createId,
  createPersistenceQueue,
  hydrateState,
  STORAGE_KEY,
  validateAppState,
} from "../domain/reducer";
import type { AppAction } from "../domain/reducer";
import { createDemoState } from "../domain/seed";
import { switchProfile, editStoredProfile, restoreStoredProfile } from '../domain/family';
import { createAiSubscription, getProfileAiSubscription, rollbackAiSubscription } from '../domain/aiSubscription';
import { createSubscriptionPlanWriter } from '../domain/subscriptionPlan';
import { applyProfileMedicationAction, createMedicationMutationWriter, createMedicationReminderWriter, createMedicationTreatmentWithMedicationWriter, createMedicationWriteQueue, rollbackMedicationAddition, type MedicationMutation } from '../domain/medicationPersistence';
import { createMedicationCareWriter, provisionSofiaDemoMedicationCare, pruneMedicationCare, setProfileMedicationCare, type MedicationCareAction, type MedicationReminderMutation } from '../domain/medicationCare';

import { createPharmacyWriter, createPharmacyDemoOrder, DEMO_PROGRAMS, type PharmacyState } from '../domain/pharmacy';

const Context = createContext<StoreContext | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => createDemoState());
  const stateRef = useRef(state);
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const mounted = useRef(true);
  const queueRef = useRef<ReturnType<typeof createPersistenceQueue> | null>(
    null,
  );
  const aiSubscriptionQueue = useRef<Promise<void>>(Promise.resolve());
  const profileSelectionQueue = useRef<Promise<void>>(Promise.resolve());
  const subscriptionPlanWriter = useRef<ReturnType<typeof createSubscriptionPlanWriter> | null>(null);
  const medicationCareWriter = useRef<ReturnType<typeof createMedicationCareWriter> | null>(null);
  const medicationMutationWriter = useRef<ReturnType<typeof createMedicationMutationWriter> | null>(null);
  const medicationTreatmentWithMedicationWriter = useRef<ReturnType<typeof createMedicationTreatmentWithMedicationWriter> | null>(null);
  const medicationReminderWriter = useRef<ReturnType<typeof createMedicationReminderWriter> | null>(null);
  const medicationWriteQueue = useRef<ReturnType<typeof createMedicationWriteQueue> | null>(null);
  const pharmacyWriter = useRef<ReturnType<typeof createPharmacyWriter> | null>(null);
  const resetGeneration = useRef(0);
  if (queueRef.current === null)
    queueRef.current = createPersistenceQueue(AsyncStorage);

  const persist = (next: AppState): Promise<void> =>
    queueRef.current!.write(JSON.stringify(next)).then(
      () => {
        if (mounted.current) setStorageError(null);
      },
      () => {
        const message =
          "No se pudo guardar la información en este dispositivo. Tus cambios siguen visibles en esta sesión.";
        if (mounted.current) setStorageError(message);
        throw new Error(message);
      },
    );

  useEffect(() => {
    let active = true;
    mounted.current = true;
    const restore = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!active) return;
        const result = hydrateState(raw, createDemoState());
        stateRef.current = result.state;
        setState(result.state);
        setStorageError(result.error);
        readyRef.current = true;
        setReady(true);
        // Persist valid demo defaults and migrations; never overwrite malformed data.
        if (raw === null || (!result.error && raw !== JSON.stringify(result.state))) void persist(result.state).catch(() => undefined);
      } catch {
        if (!active) return;
        setStorageError(
          "No se pudo leer la información guardada. Se muestra una demostración local.",
        );
        readyRef.current = true;
        setReady(true);
      }
    };
    void restore();
    return () => {
      active = false;
      mounted.current = false;
    };
    // Persistence uses refs and a single FIFO queue; hydration runs once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ensureReady = () => {
    if (!readyRef.current)
      throw new Error("Espera a que termine de cargar la información.");
  };
  const commit = (action: AppAction): AppState => {
    ensureReady();
    const next = appReducer(stateRef.current, action);
    // This update is synchronous: a second action in the same event sees the first.
    stateRef.current = next;
    setState(next);
    void persist(next).catch(() => undefined);
    return next;
  };
  const scheduleMedicationWrite = <T,>(operation: () => Promise<T>): Promise<T> => {
    if (medicationWriteQueue.current === null) medicationWriteQueue.current = createMedicationWriteQueue(() => resetGeneration.current);
    return medicationWriteQueue.current(operation);
  };
  const writeMedicationCare = (action: MedicationCareAction): Promise<void> => {
    ensureReady();
    if (medicationCareWriter.current === null) {
      medicationCareWriter.current = createMedicationCareWriter({
        current: () => stateRef.current,
        generation: () => resetGeneration.current,
        publish: next => {
          stateRef.current = next;
          if (mounted.current) setState(next);
        },
        persist,
        reduce: appReducer,
      });
    }
    return scheduleMedicationWrite(() => medicationCareWriter.current!(action));
  };
  const writeMedicationMutation = (profileId: string, action: MedicationMutation): Promise<void> => {
    ensureReady();
    if (medicationMutationWriter.current === null) {
      medicationMutationWriter.current = createMedicationMutationWriter({
        current: () => stateRef.current,
        generation: () => resetGeneration.current,
        publish: next => {
          stateRef.current = next;
          if (mounted.current) setState(next);
        },
        persist,
      });
    }
    return scheduleMedicationWrite(() => medicationMutationWriter.current!(profileId, action));
  };
  const writeMedicationReminder = (profileId: string, mutation: MedicationReminderMutation): Promise<void> => {
    ensureReady();
    if (medicationReminderWriter.current === null) {
      medicationReminderWriter.current = createMedicationReminderWriter({
        current: () => stateRef.current, generation: () => resetGeneration.current,
        publish: next => { stateRef.current = next; if (mounted.current) setState(next); }, persist,
      });
    }
    return scheduleMedicationWrite(() => medicationReminderWriter.current!(profileId, mutation));
  };

  const writePharmacy = <T,>(change: (previous: PharmacyState) => { pharmacy: PharmacyState; result: T }): Promise<T> => {
    ensureReady();
    if (pharmacyWriter.current === null) pharmacyWriter.current = createPharmacyWriter({
      current: () => stateRef.current, generation: () => resetGeneration.current,
      publish: next => { stateRef.current = next; if (mounted.current) setState(next); }, persist, reduce: appReducer,
    });
    return pharmacyWriter.current(stateRef.current.profile.id, change);
  };
  const value: StoreContext = {
    setPharmacyCartPersisted: cart => {
      const snapshot = cart.map(line => ({product: {...line.product}, quantity: line.quantity}));
      return writePharmacy(previous => ({pharmacy: {...previous, cart: snapshot}, result: undefined}));
    },
    createPharmacyDemoOrderPersisted: input => {
      const snapshot = {...input, address: {...input.address}, lines: input.lines.map(line => ({product: {...line.product}, quantity: line.quantity}))};
      const id = createId('DEMO');
      return writePharmacy(previous => {
        // A repeated confirmation of the same submitted cart must not create another order.
        if (JSON.stringify(previous.cart) !== JSON.stringify(snapshot.lines)) throw new Error('El carrito cambió. Revisa los productos antes de confirmar.');
        const order = createPharmacyDemoOrder(snapshot, id);
        return {pharmacy: {...previous, cart: [], orders: [order, ...previous.orders]}, result: id};
      });
    },
    requestPharmacyProgramPersisted: programId => writePharmacy(previous => {
      if (!DEMO_PROGRAMS.some(program => program.id === programId && program.expiresAt >= new Date().toISOString().slice(0,10))) throw new Error('Este programa no está disponible.');
      if (previous.programRequests.some(request => request.programId === programId)) throw new Error('Ya existe una solicitud local para este programa.');
      return {pharmacy: {...previous, programRequests: [...previous.programRequests, {id:createId('program'),programId,createdAt:new Date().toISOString(),status:'review',mode:'demo'}]},result:undefined};
    }),
    cancelPharmacyDemoOrderPersisted: id => writePharmacy(previous => {
      const order=previous.orders.find(item=>item.id===id);
      if (!order) throw new Error('No se encontró el pedido local.');
      if (order.status==='cancelled') throw new Error('El pedido local ya está cancelado.');
      return {pharmacy:{...previous,orders:previous.orders.map(item=>item.id===id?{...item,status:'cancelled'}:item)},result:undefined};
    }),
    togglePharmacyFavoritePersisted: id => writePharmacy(previous => ({pharmacy:{...previous,favorites:previous.favorites.includes(id)?previous.favorites.filter(item=>item!==id):[...previous.favorites,id]},result:undefined})),
    ownerProfile: state.family && state.family.ownerId !== state.profile.id
      ? state.family.profiles[state.family.ownerId].profile : state.profile,
    profileKind: state.family?.profiles[state.profile.id]?.kind ?? 'Perfil principal',
    professionalProfile: state.family?.profiles[state.profile.id]?.professional,
    selectProfile: async (profile) => {
      ensureReady();
      const generation = resetGeneration.current;
      const operation = profileSelectionQueue.current.then(async () => {
        if (generation !== resetGeneration.current) throw new Error('El cambio de perfil se canceló al restablecer la demostración.');
        const previous = stateRef.current;
        const previousId = previous.profile.id;
        const next = switchProfile(stateRef.current, profile);
        if (!validateAppState(next)) throw new Error('Revisa los datos del perfil antes de seleccionarlo.');
        if (next === stateRef.current) return;
        stateRef.current = next;
        if (mounted.current) setState(next);
        try {
          await persist(next);
          if (generation !== resetGeneration.current) throw new Error('El cambio de perfil se canceló al restablecer la demostración.');
        }
        catch {
          if (generation !== resetGeneration.current) throw new Error('El cambio de perfil se canceló al restablecer la demostración.');
          if (stateRef.current.profile.id === next.profile.id) {
            const previousProfessional = previous.family?.profiles[previousId]?.professional;
            const rollback = previousId !== next.profile.id ? restoreStoredProfile(stateRef.current, previousId) : previousProfessional ? switchProfile(stateRef.current, previousProfessional) : stateRef.current;
            stateRef.current = rollback;
            if (mounted.current) setState(rollback);
            await persist(rollback).catch(() => undefined);
          }
          throw new Error('No se pudo guardar el cambio de perfil. Intenta de nuevo.');
        }
      });
      profileSelectionQueue.current = operation.catch(() => undefined);
      return operation;
    },
    editFamilyProfile: async (id, patch) => {
      ensureReady();
      const next = editStoredProfile(stateRef.current, id, patch);
      if (!validateAppState(next)) throw new Error('Revisa los datos del perfil.');
      stateRef.current = next;
      setState(next);
      await persist(next);
    },
    rechargeWallet: async (amount) => {
      ensureReady();
      const previous = stateRef.current.wallet;
      const next = appReducer(stateRef.current, { type: 'RECHARGE_WALLET', amount, id: createId('MOV'), date: new Date().toLocaleDateString('es-MX') });
      stateRef.current = next;
      setState(next);
      try { await persist(next); }
      catch {
        const rollback = { ...stateRef.current, wallet: previous };
        stateRef.current = rollback;
        setState(rollback);
        void persist(rollback).catch(() => undefined);
        throw new Error('No se pudo guardar la recarga local. No se aplicó el importe.');
      }
    },
    upgradeSubscription: (quote) => {
      ensureReady();
      if (subscriptionPlanWriter.current === null) {
        subscriptionPlanWriter.current = createSubscriptionPlanWriter({
          current: () => stateRef.current,
          generation: () => resetGeneration.current,
          publish: next => { stateRef.current = next; if (mounted.current) setState(next); },
          persist,
          reduce: appReducer,
        });
      }
      return subscriptionPlanWriter.current(quote);
    },
    setAiSubscription: (active) => {
      ensureReady();
      // Capture the requested profile before awaiting another activation or a profile switch.
      const profileId = stateRef.current.profile.id;
      const requestedGeneration = resetGeneration.current;
      const operation = aiSubscriptionQueue.current.then(async () => {
        if (requestedGeneration !== resetGeneration.current) throw new Error('La activación de Klini IA se canceló al restablecer la demostración.');
        const previous = getProfileAiSubscription(stateRef.current, profileId);
        const subscription = createAiSubscription(active, previous);
        const next = appReducer(stateRef.current, { type: 'SET_AI_SUBSCRIPTION', profileId, subscription });
        stateRef.current = next;
        if (mounted.current) setState(next);
        try {
          await persist(next);
        } catch (error) {
          const rollback = rollbackAiSubscription(stateRef.current, profileId, subscription, previous);
          if (rollback !== stateRef.current) {
            stateRef.current = rollback;
            if (mounted.current) setState(rollback);
            await persist(rollback).catch(() => undefined);
          }
          throw error;
        }
      });
      // A failed activation must not prevent the next explicit attempt or cancellation.
      aiSubscriptionQueue.current = operation.catch(() => undefined);
      return operation;
    },
    state,
    ready,
    storageError,
    updateProfile: (patch) => {
      commit({ type: "UPDATE_PROFILE", patch });
    },
    addAppointment: (input) => {
      const id = createId("appointment");
      commit({
        type: "ADD_APPOINTMENT",
        appointment: { ...input, id, createdAt: new Date().toISOString() },
      });
      return id;
    },
    updateAppointment: (id, patch) => {
      commit({ type: "UPDATE_APPOINTMENT", id, patch });
    },
    addPolicy: (input) => {
      const id = createId("policy");
      commit({ type: "ADD_POLICY", policy: { ...input, id } });
      return id;
    },
    updatePolicy: (id, patch) => {
      commit({ type: "UPDATE_POLICY", id, patch });
    },
    deletePolicy: (id) => {
      commit({ type: "DELETE_POLICY", id });
    },
    addClaim: (input) => {
      const id = createId("claim");
      commit({
        type: "ADD_CLAIM",
        claim: { ...input, id, folio: `LOCAL-${id.slice(-12).toUpperCase()}` },
      });
      return id;
    },
    updateClaim: (id, patch) => {
      commit({ type: "UPDATE_CLAIM", id, patch });
    },
    deleteClaim: (id) => {
      commit({ type: "DELETE_CLAIM", id });
    },
    addRecord: (input) => {
      const id = createId("record");
      commit({ type: "ADD_RECORD", record: { ...input, id } });
      return id;
    },
    addRecordPersisted: async (input) => {
      ensureReady();
      const profileId = stateRef.current.profile.id;
      const id = createId("record");
      const next = appReducer(stateRef.current, { type: "ADD_RECORD", record: { ...input, id } });
      stateRef.current = next;
      setState(next);
      try {
        await persist(next);
      } catch (error) {
        // Remove only this failed addition, preserving subsequent edits and profile changes.
        const current = stateRef.current;
        const rollback = { ...current, records: current.profile.id === profileId ? current.records.filter(record => record.id !== id) : current.records };
        const scope = current.family?.profiles[profileId];
        if (scope && current.family) {
          rollback.family = { ...current.family, profiles: { ...current.family.profiles, [profileId]: { ...scope, records: scope.records.filter(record => record.id !== id) } } };
        }
        stateRef.current = rollback;
        if (mounted.current) setState(rollback);
        await persist(rollback).catch(() => undefined);
        throw error;
      }
      return id;
    },
    updateRecord: (id, patch) => {
      commit({ type: "UPDATE_RECORD", id, patch });
    },
    deleteRecord: (id) => {
      commit({ type: "DELETE_RECORD", id });
    },
    addMedication: (input) => {
      const id = createId("medication");
      commit({ type: "ADD_MEDICATION", medication: { ...input, id } });
      return id;
    },
    addMedicationPersisted: async (input) => {
      ensureReady();
      const profileId = stateRef.current.profile.id;
      const requestedGeneration = resetGeneration.current;
      const id = createId("medication");
      const medication = { ...input, id };
      return scheduleMedicationWrite(async () => {
        const next = applyProfileMedicationAction(stateRef.current, profileId, { type: "ADD_MEDICATION", medication });
        stateRef.current = next;
        if (mounted.current) setState(next);
        try {
          await persist(next);
          if (requestedGeneration !== resetGeneration.current) throw new Error('El guardado del medicamento se canceló al restablecer la demostración.');
        } catch (error) {
          if (requestedGeneration === resetGeneration.current) {
            let rollback = rollbackMedicationAddition(stateRef.current, profileId, id);
            if (rollback !== stateRef.current) {
              const medications = rollback.profile.id === profileId ? rollback.medications : rollback.family?.profiles[profileId]?.medications;
              const care = rollback.profile.id === profileId ? rollback.medicationCare : rollback.family?.profiles[profileId]?.medicationCare;
              if (medications && care) rollback = setProfileMedicationCare(rollback, profileId, pruneMedicationCare(care, medications));
            }
            if (rollback !== stateRef.current) {
              stateRef.current = rollback;
              if (mounted.current) setState(rollback);
              await persist(rollback).catch(() => undefined);
            }
          }
          throw error;
        }
        return id;
      });
    },
    updateMedication: (id, patch) => {
      commit({ type: "UPDATE_MEDICATION", id, patch });
    },
    deleteMedication: (id) => {
      commit({ type: "DELETE_MEDICATION", id });
    },
    updateMedicationPersisted: (id, patch) => {
      ensureReady();
      return writeMedicationMutation(stateRef.current.profile.id, { type: 'UPDATE_MEDICATION', id, patch: { ...patch } });
    },
    deleteMedicationPersisted: id => {
      ensureReady();
      return writeMedicationMutation(stateRef.current.profile.id, { type: 'DELETE_MEDICATION', id });
    },
    saveMedicationTreatment: async (input, existingId) => {
      ensureReady();
      const id = existingId ?? createId('treatment');
      await writeMedicationCare({ type: 'SAVE_MEDICATION_TREATMENT', profileId: stateRef.current.profile.id, treatment: { ...input, medicationIds: [...input.medicationIds], id } });
      return id;
    },
    saveMedicationTreatmentWithMedication: async (input, medicationInput, existingId) => {
      ensureReady();
      const profileId = stateRef.current.profile.id;
      const id = existingId ?? createId('treatment');
      const treatment = { ...input, medicationIds: [...input.medicationIds], id };
      const medication = { ...medicationInput, id: createId('medication') };
      if (medicationTreatmentWithMedicationWriter.current === null) {
        medicationTreatmentWithMedicationWriter.current = createMedicationTreatmentWithMedicationWriter({
          current: () => stateRef.current,
          generation: () => resetGeneration.current,
          publish: next => {
            stateRef.current = next;
            if (mounted.current) setState(next);
          },
          persist,
        });
      }
      await scheduleMedicationWrite(() => medicationTreatmentWithMedicationWriter.current!(profileId, treatment, medication));
      return id;
    },
    saveMedicationTake: async (input, existingId) => {
      ensureReady();
      const id = existingId ?? createId('take');
      await writeMedicationCare({ type: 'SAVE_MEDICATION_TAKE', profileId: stateRef.current.profile.id, take: { ...input, id } });
      return id;
    },
    saveMedicationAlert: async (input, existingId) => {
      ensureReady();
      const id = existingId ?? createId('alert');
      await writeMedicationCare({ type: 'SAVE_MEDICATION_ALERT', profileId: stateRef.current.profile.id, alert: { ...input, days: [...input.days], ...(input.recurrence && { recurrence: { ...input.recurrence } }), id } });
      return id;
    },
    deleteMedicationTake: async id => {
      ensureReady();
      await writeMedicationCare({ type: 'DELETE_MEDICATION_TAKE', profileId: stateRef.current.profile.id, id });
    },
    deleteMedicationAlert: async id => {
      ensureReady();
      await writeMedicationCare({ type: 'DELETE_MEDICATION_ALERT', profileId: stateRef.current.profile.id, id });
    },
    setMedicationTreatmentAlertsEnabled: (treatmentId, enabled) => {
      ensureReady();
      return writeMedicationReminder(stateRef.current.profile.id, { type: 'SET_TREATMENT_ALERTS_ENABLED', treatmentId, enabled });
    },
    acknowledgeMedicationReminder: (alertId, date, time, status, occurrenceKey) => {
      ensureReady();
      return writeMedicationReminder(stateRef.current.profile.id, { type: 'ACKNOWLEDGE_REMINDER', alertId, date, time, status, occurrenceKey, id: createId('reminder-action'), takeId: createId('take'), recordedAt: Date.now() });
    },
    addMessage: (input) => {
      commit({
        type: "ADD_MESSAGE",
        message: {
          ...input,
          id: createId("message"),
          createdAt: new Date().toISOString(),
        },
      });
    },
    toggleFavorite: (id) => {
      commit({ type: "TOGGLE_FAVORITE", id });
    },
    updateSettings: (patch) => {
      commit({ type: "UPDATE_SETTINGS", patch });
    },
    resetDemo: async () => {
      ensureReady();
      // Pending saves and queued activations must not report success or revive pre-reset data.
      resetGeneration.current += 1;
      const next = appReducer(stateRef.current, {
        type: "RESET",
        state: provisionSofiaDemoMedicationCare(createDemoState()),
      });
      stateRef.current = next;
      setState(next);
      // Enqueue after pending writes and await this write; no remove/write race.
      await persist(next);
    },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAppStore(): StoreContext {
  const value = useContext(Context);
  if (!value)
    throw new Error("useAppStore debe utilizarse dentro de AppProvider.");
  return value;
}
