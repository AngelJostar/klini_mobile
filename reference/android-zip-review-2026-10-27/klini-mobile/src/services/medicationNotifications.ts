import { Platform } from 'react-native';
import { createMedicationNotificationSync, type MedicationNotificationAdapter } from './medicationNotificationSync';
import type { MedicationNotificationEntry } from './medicationNotificationPlan';
import type { NotificationTriggerInput } from 'expo-notifications';
import { medicationReminderPresentation, medicationNotificationReferenceData, subscribeMedicationReminderEventsWith, type MedicationReminderEvent } from './medicationReminderRuntime';

const CHANNEL_ID = 'klini-medication-reminders';
let notificationModule: Promise<typeof import('expo-notifications')> | undefined;
let handlerConfigured = false;
function loadNotifications() {
  // Some Expo Go editions lack a module eagerly loaded by expo-notifications. Keep it
  // behind an explicit action/sync and catch the rejected import; never break app startup.
  notificationModule ??= import('expo-notifications').then(notifications => {
    if (!handlerConfigured) {
      // This app has one central handler. SDK 58's documented default for other
      // notifications is banner/list/sound/badge; preserve that while our own popup
      // replaces only the medication banner. No notification contents supply UI text.
      notifications.setNotificationHandler({
        handleNotification: async notification => medicationReminderPresentation(notification),
      });
      handlerConfigured = true;
    }
    return notifications;
  });
  return notificationModule;
}

async function adapter(): Promise<MedicationNotificationAdapter | null> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return null;
  let notifications: typeof import('expo-notifications');
  try { notifications = await loadNotifications(); } catch { return null; }
  return {
    scheduled: async () => (await notifications.getAllScheduledNotificationsAsync()).map(item => item.identifier),
    cancel: id => notifications.cancelScheduledNotificationAsync(id),
    permission: async () => (await notifications.getPermissionsAsync()).granted,
    schedule: async (entry: MedicationNotificationEntry) => {
      // Hydrated enabled reminders may run with permission already granted, without
      // ever visiting the permission action that normally prepares this own channel.
      if (Platform.OS === 'android') {
        await notifications.setNotificationChannelAsync(CHANNEL_ID, {
          name: 'Recordatorios de Klini', importance: notifications.AndroidImportance.DEFAULT,
        });
      }
      const value = entry.trigger;
      const trigger: NotificationTriggerInput = value.kind === 'date'
        ? { type: notifications.SchedulableTriggerInputTypes.DATE, date: value.date, channelId: CHANNEL_ID }
        : value.kind === 'daily'
          ? { type: notifications.SchedulableTriggerInputTypes.DAILY, hour: value.hour, minute: value.minute, channelId: CHANNEL_ID }
          : { type: notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: value.weekday, hour: value.hour, minute: value.minute, channelId: CHANNEL_ID };
      return notifications.scheduleNotificationAsync({
        identifier: entry.identifier,
        content: { title: 'Recordatorio de Klini', body: 'Abre la app para ver el recordatorio.', sound: 'default', data: medicationNotificationReferenceData(entry) },
        trigger,
      });
    },
  };
}

/** Called only from Guardar/Activar, never by lifecycle synchronisation. */
export async function requestMedicationNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;
  try {
    const notifications = await loadNotifications();
    if (Platform.OS === 'android') {
      await notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Recordatorios de Klini', importance: notifications.AndroidImportance.DEFAULT,
      });
    }
    const existing = await notifications.getPermissionsAsync();
    if (existing.granted) return true;
    if (!existing.canAskAgain) return false;
    return (await notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } })).granted;
  } catch { return false; }
}

/** Reads OS permission without prompting, for an honest saved-alert status on entry. */
export async function readMedicationNotificationPermission(): Promise<'granted' | 'denied' | 'unavailable'> {
  try {
    const native = await adapter();
    if (!native) return 'unavailable';
    return await native.permission() ? 'granted' : 'denied';
  } catch { return 'unavailable'; }
}

export const syncMedicationAlerts = createMedicationNotificationSync(adapter);

/** Uses local native events only. Web/unsupported native modules fall back to the app clock. */
export function subscribeMedicationReminderEvents(listener: (event: MedicationReminderEvent) => void): () => void {
  return subscribeMedicationReminderEventsWith(async () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return null;
    const notifications = await loadNotifications();
    return {
      defaultActionIdentifier: notifications.DEFAULT_ACTION_IDENTIFIER,
      onReceived: callback => notifications.addNotificationReceivedListener(callback),
      onResponse: callback => notifications.addNotificationResponseReceivedListener(callback),
      lastResponse: () => notifications.getLastNotificationResponse(),
      clearLastResponse: () => notifications.clearLastNotificationResponse(),
    };
  }, listener);
}
