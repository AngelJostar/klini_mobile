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
import { switchProfile, editStoredProfile } from '../domain/family';

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
        // Only initialize an empty store. Malformed data is not overwritten on mount.
        if (raw === null) void persist(result.state).catch(() => undefined);
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

  const value: StoreContext = {
    ownerProfile: state.family && state.family.ownerId !== state.profile.id
      ? state.family.profiles[state.family.ownerId].profile : state.profile,
    profileKind: state.family?.profiles[state.profile.id]?.kind ?? 'Perfil principal',
    selectProfile: async (profile) => {
      ensureReady();
      const next = switchProfile(stateRef.current, profile);
      if (!validateAppState(next)) throw new Error('Revisa los datos del perfil antes de seleccionarlo.');
      stateRef.current = next;
      setState(next);
      await persist(next);
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
    updateMedication: (id, patch) => {
      commit({ type: "UPDATE_MEDICATION", id, patch });
    },
    deleteMedication: (id) => {
      commit({ type: "DELETE_MEDICATION", id });
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
      const next = appReducer(stateRef.current, {
        type: "RESET",
        state: createDemoState(),
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
