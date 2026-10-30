import type { AppState } from '../domain/types';

/** Review-only: Expo Go installed here lacks the SDK 58 topic subscription module.
 * Restore reminders.original.txt and validate in a development build before integration.
 */
export function syncReminders(_state: AppState): Promise<void> {
  return Promise.resolve();
}
