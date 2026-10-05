import { isNotificationPathAllowed } from '@/services/notifications/notification-routing';

describe('notification routing authorization', () => {
  test('patient can only open patient destinations', () => {
    expect(isNotificationPathAllowed('patient', '/patient/documents/7')).toBe(true);
    expect(isNotificationPathAllowed('patient', '/doctor/requests')).toBe(false);
  });

  test('doctor can only open doctor destinations', () => {
    expect(isNotificationPathAllowed('doctor', '/doctor/mixtures/21')).toBe(true);
    expect(isNotificationPathAllowed('doctor', '/patient/appointments')).toBe(false);
    expect(isNotificationPathAllowed('doctor', 'https://attacker.test')).toBe(false);
  });
});
