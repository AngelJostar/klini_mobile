import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState as NativeAppState, Platform } from 'react-native';
import { router, usePathname, useRootNavigationState } from 'expo-router';
import { useAppStore } from '../state/store';
import { getDueMedicationReminders, isMedicationReminderEventCurrent, type MedicationReminderEvent } from '../services/medicationReminderRuntime';
import { subscribeMedicationReminderEvents } from '../services/medicationNotifications';

type ReminderContext = { event?: MedicationReminderEvent; dismiss: (key: string) => void; setResponding: (key: string, pending: boolean) => void };
const Context = createContext<ReminderContext>({ dismiss: () => undefined, setResponding: () => undefined });
export const useMedicationReminder = () => useContext(Context);
const eventKey = (event: MedicationReminderEvent) => `${event.profileId}|${event.occurrenceKey}`;
const foreground = () => NativeAppState.currentState !== 'background' && NativeAppState.currentState !== 'inactive'
  && (Platform.OS !== 'web' || typeof document === 'undefined' || document.visibilityState !== 'hidden');

/** One queue for clock, foreground notifications and notification taps. Clinical data stays in the store. */
export default function MedicationReminderProvider({ children }: React.PropsWithChildren) {
  const { ready, state } = useAppStore();
  const [queue, setQueue] = useState<MedicationReminderEvent[]>([]);
  const [active, setActive] = useState(foreground);
  const [respondingKeys, setRespondingKeys] = useState<ReadonlySet<string>>(new Set());
  const responding = useRef(new Set<string>());
  const offered = useRef(new Set<string>());
  const opening = useRef(false);
  const presented = useRef<string | undefined>(undefined);
  const path = usePathname();
  const navigation = useRootNavigationState();
  const dismiss = useCallback((key: string) => setQueue(items => items.filter(item => eventKey(item) !== key)), []);
  const setResponding = useCallback((key: string, pending: boolean) => {
    if (pending) responding.current.add(key); else responding.current.delete(key);
    setRespondingKeys(new Set(responding.current));
  }, []);

  useEffect(() => {
    if (!ready) return;
    const offer = (event: MedicationReminderEvent) => {
      if (!isMedicationReminderEventCurrent(state, event)) return;
      const key = eventKey(event);
      if (offered.current.has(key)) return;
      offered.current.add(key);
      // Bounded session cache. Persisted actions are the authority across launches.
      if (offered.current.size > 512) offered.current.delete(offered.current.values().next().value!);
      setQueue(items => [...items, event]);
    };
    const tick = () => {
      const visible = foreground();
      setActive(visible);
      setQueue(items => {
        const valid = items.filter(item => (item.profileId === state.profile.id && responding.current.has(eventKey(item))) || isMedicationReminderEventCurrent(state, item));
        return valid.length === items.length ? items : valid;
      });
      if (visible) getDueMedicationReminders(state).forEach(offer);
    };
    tick();
    const timer = setInterval(tick, 1000);
    const app = NativeAppState.addEventListener('change', tick);
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.addEventListener('visibilitychange', tick);
    const unsubscribe = subscribeMedicationReminderEvents(offer);
    return () => {
      clearInterval(timer); app.remove(); unsubscribe();
      if (Platform.OS === 'web' && typeof document !== 'undefined') document.removeEventListener('visibilitychange', tick);
    };
  }, [ready, state]);

  const event = queue.find(item => (item.profileId === state.profile.id && respondingKeys.has(eventKey(item))) || isMedicationReminderEventCurrent(state, item));
  useEffect(() => {
    if (path === '/medication-reminder') {
      opening.current = false;
      if (event) presented.current = eventKey(event);
      return;
    }
    // A history/back dismissal can reach the parent before the screen cleanup's
    // state update. Consume its displayed occurrence before considering another push.
    if (presented.current) {
      const key = presented.current; presented.current = undefined; opening.current = false;
      dismiss(key);
      return;
    }
    if (ready && navigation?.key && active && event && !opening.current) {
      opening.current = true;
      router.push('/medication-reminder');
    }
  }, [ready, navigation?.key, active, event, path, queue, dismiss]);

  return <Context.Provider value={{ event, dismiss, setResponding }}>{children}</Context.Provider>;
}

export { eventKey as medicationReminderSessionKey };
