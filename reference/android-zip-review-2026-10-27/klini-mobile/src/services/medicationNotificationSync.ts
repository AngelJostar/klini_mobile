import type { AppState } from '../domain/types';
import {
  MEDICATION_NOTIFICATION_LIMIT,
  MEDICATION_NOTIFICATION_PREFIX,
  planMedicationNotifications,
  type MedicationNotificationEntry,
} from './medicationNotificationPlan';

export interface MedicationNotificationResult {
  scheduled: number;
  unavailable?: boolean;
  error?: string;
  notice?: string;
}
export interface MedicationNotificationAdapter {
  scheduled: () => Promise<string[]>;
  cancel: (id: string) => Promise<void>;
  permission: () => Promise<boolean>;
  schedule: (entry: MedicationNotificationEntry) => Promise<string>;
}

/** Only this namespace is reconciled. A new profile/reset supersedes any in-flight schedule. */
export function createMedicationNotificationSync(
  load: () => Promise<MedicationNotificationAdapter | null>,
  now: () => Date = () => new Date(),
) {
  let queue = Promise.resolve<MedicationNotificationResult>({ scheduled: 0 });
  let generation = 0;
  return (state: AppState): Promise<MedicationNotificationResult> => {
    const requested = ++generation;
    const run = async (): Promise<MedicationNotificationResult> => {
      if (requested !== generation) return { scheduled: 0 };
      const created: string[] = [];
      let adapter: MedicationNotificationAdapter | null = null;
      try {
        adapter = await load();
        if (!adapter) return { scheduled: 0, unavailable: true };
        const scheduled = await adapter.scheduled();
        const own = scheduled.filter(id => id.startsWith(MEDICATION_NOTIFICATION_PREFIX));
        if (requested !== generation) return { scheduled: 0 };
        const capacity = Math.max(0, MEDICATION_NOTIFICATION_LIMIT - (scheduled.length - own.length));
        const plan = planMedicationNotifications(state, now(), capacity);
        const allowed = plan.entries.length > 0 && await adapter.permission();
        const desired = new Map((allowed ? plan.entries : []).map(entry => [entry.identifier, entry]));
        for (const id of own) {
          if (!desired.has(id)) await adapter.cancel(id);
          if (requested !== generation) return { scheduled: 0 };
        }
        if (!capacity && plan.limited) return { scheduled: 0, error: 'Se alcanzó el límite de recordatorios del dispositivo.' };
        if (plan.entries.length && !allowed) return { scheduled: 0, error: 'Las notificaciones de la app están desactivadas.' };
        for (const entry of desired.values()) {
          if (requested !== generation) return { scheduled: 0 };
          if (own.includes(entry.identifier)) continue;
          const id = await adapter.schedule(entry);
          created.push(id);
          if (requested !== generation) {
            await adapter.cancel(id);
            return { scheduled: 0 };
          }
        }
        return { scheduled: desired.size, ...(plan.limited ? { notice: 'Se programaron los próximos avisos. Abre Klini periódicamente para renovar los recordatorios de fechas futuras.' } : {}) };
      } catch {
        if (adapter) await Promise.all(created.map(id => adapter!.cancel(id).catch(() => undefined)));
        return { scheduled: 0, error: 'No se pudieron programar los avisos en este dispositivo.' };
      }
    };
    queue = queue.then(run, run);
    return queue;
  };
}
