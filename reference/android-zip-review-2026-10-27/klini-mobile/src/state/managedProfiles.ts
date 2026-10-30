import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
export const profileKinds = ['Niño', 'Niña', 'Adulto', 'Mascota'] as const;
export type ManagedProfile = { id: string; name: string; kind: (typeof profileKinds)[number]; birthDate?: string; sex?: string; email?: string; phone?: string };
const examples: ManagedProfile[] = [
  { id: 'demo-mateo', name: 'Mateo Salinas', kind: 'Niño' },
  { id: 'demo-valentina', name: 'Valentina Salinas', kind: 'Niña' },
  { id: 'demo-max', name: 'Max', kind: 'Mascota' },
  { id: 'demo-luna', name: 'Luna', kind: 'Mascota' },
];
export function useManagedProfiles(ownerId: string) {
  const [profiles, setProfiles] = useState<ManagedProfile[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  const key = 'klini-managed-profiles-v1:' + encodeURIComponent(ownerId);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(key);
        const data: unknown = raw === null ? examples : JSON.parse(raw);
        if (
          !Array.isArray(data) ||
          !data.every(
            (p) =>
              p &&
              typeof p.id === 'string' &&
              typeof p.name === 'string' &&
              p.name.trim() &&
              profileKinds.includes(p.kind) &&
              ['birthDate', 'sex', 'email', 'phone'].every(field => p[field] === undefined || typeof p[field] === 'string'),
          ) ||
          new Set(data.map((p) => p.id)).size !== data.length
        )
          throw Error('invalid');
        if (!active) return;
        if (raw === null) await AsyncStorage.setItem(key, JSON.stringify(data));
        if (active) {
          setProfiles(data);
          setReady(true);
        }
      } catch {
        if (active)
          setError('No se pudieron cargar los perfiles. Cierra esta ventana e intenta de nuevo.');
      }
    })();
    return () => {
      active = false;
    };
  }, [key]);
  async function save(profile: ManagedProfile) {
    if (!ready || saving.current) throw Error('Espera a que terminen de cargar los perfiles.');
    const name = profile.name.trim();
    if (!name || name.length > 255 || !profileKinds.includes(profile.kind))
      throw Error('Revisa el nombre y el tipo de perfil.');
    const next = profiles.some((p) => p.id === profile.id)
      ? profiles.map((p) => (p.id === profile.id ? { ...profile, name } : p))
      : [...profiles, { ...profile, name }];
    saving.current = true;
    try {
      await AsyncStorage.setItem(key, JSON.stringify(next));
      setProfiles(next);
    } finally {
      saving.current = false;
    }
  }
  return { profiles, ready, error, save };
}
