import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';

import { parseManagedProfiles, upsertManagedProfile, type ManagedProfile } from '../domain/managedProfiles';
export { getProfessionalFormDefaults, healthDegreeTypes, healthProfessions, isProfessionalProfile, medicalSpecialties, professionalProfileLabel, profileKinds } from '../domain/managedProfiles';
export type { HealthDegreeType, HealthProfession, LegacyManagedProfessionalProfile, ManagedDoctorProfile, ManagedLicensedProfile, ManagedPatientProfile, ManagedProfessionalProfile, ManagedProfile, MedicalSpecialty, ProfessionalFormDefaults, ProfessionalType } from '../domain/managedProfiles';
const examples: ManagedProfile[] = [
  { id: 'demo-mateo', name: 'Mateo Salinas', kind: 'Niño' },
  { id: 'demo-valentina', name: 'Valentina Salinas', kind: 'Niña' },
  { id: 'demo-max', name: 'Max', kind: 'Mascota' },
  { id: 'demo-luna', name: 'Luna', kind: 'Mascota' },
];
export function useManagedProfiles(ownerId: string) {
  const key = 'klini-managed-profiles-v1:' + encodeURIComponent(ownerId);
  type Snapshot = { key: string; profiles: ManagedProfile[]; ready: boolean; error: string };
  const current = useRef<Snapshot>({ key: '', profiles: [], ready: false, error: '' });
  const [snapshot, setSnapshot] = useState<Snapshot>({ key: '', profiles: [], ready: false, error: '' });
  const activeSession = useRef<{ key: string; active: boolean } | null>(null);
  const pendingWrites = useRef(new Map<string, Promise<void>>());
  useEffect(() => {
    const session = { key, active: true };
    activeSession.current = session;
    const isCurrent = () => session.active;
    current.current = { key, profiles: [], ready: false, error: '' };
    setSnapshot(current.current);
    void (async () => {
      try {
        // Returning to an owner waits for any write started before leaving that owner.
        await pendingWrites.current.get(key)?.catch(() => undefined);
        if (!isCurrent()) return;
        const raw = await AsyncStorage.getItem(key);
        const data = raw === null ? examples : parseManagedProfiles(raw);
        if (!isCurrent()) return;
        if (raw === null) await AsyncStorage.setItem(key, JSON.stringify(data));
        if (isCurrent()) {
          current.current = { key, profiles: data, ready: true, error: '' };
          setSnapshot(current.current);
        }
      } catch {
        if (isCurrent()) {
          current.current = { key, profiles: [], ready: false, error: 'No se pudieron cargar los perfiles. Cierra esta ventana e intenta de nuevo.' };
          setSnapshot(current.current);
        }
      }
    })();
    return () => {
      session.active = false;
    };
  }, [key]);
  async function save(profile: ManagedProfile) {
    const saved = current.current;
    const session = activeSession.current;
    if (!saved.ready || saved.key !== key || !session?.active || session.key !== key || pendingWrites.current.has(key)) {
      throw Error('Espera a que terminen de cargar los perfiles.');
    }
    const next = upsertManagedProfile(saved.profiles, profile);
    const write = AsyncStorage.setItem(key, JSON.stringify(next));
    pendingWrites.current.set(key, write);
    try {
      await write;
      if (session.active) {
        current.current = { key, profiles: next, ready: true, error: '' };
        setSnapshot(current.current);
      }
    } finally {
      if (pendingWrites.current.get(key) === write) pendingWrites.current.delete(key);
    }
  }
  return {
    profiles: snapshot.key === key ? snapshot.profiles : [],
    ready: snapshot.key === key && snapshot.ready,
    error: snapshot.key === key ? snapshot.error : '',
    save,
  };
}
