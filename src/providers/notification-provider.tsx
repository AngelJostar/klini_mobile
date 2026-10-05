import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/providers/auth-provider';
import { isNotificationPathAllowed } from '@/services/notifications/notification-routing';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  useEffect(() => {
    function open(notification: Notifications.Notification) {
      const path = notification.request.content.data?.path;
      if (typeof path !== 'string' || !user) return;
      if (isNotificationPathAllowed(user.role, path)) router.push(path as never);
    }
    const last = Notifications.getLastNotificationResponse();
    if (last?.notification) open(last.notification);
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => open(response.notification));
    return () => subscription.remove();
  }, [user]);
  return children;
}
