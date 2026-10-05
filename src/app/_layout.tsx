import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ContentState } from '@/components/ui/content-state';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { NetworkProvider } from '@/providers/network-provider';
import { NotificationProvider } from '@/providers/notification-provider';
import { QueryProvider } from '@/providers/query-provider';

export default function RootLayout() {
  return (
    <QueryProvider>
      <AuthProvider>
        <NetworkProvider>
          <NotificationProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </NotificationProvider>
        </NetworkProvider>
      </AuthProvider>
    </QueryProvider>
  );
}

function RootNavigator() {
  const { user, isRestoring } = useAuth();
  if (isRestoring) return <ContentState loading title="Restaurando sesión" />;

  return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={!user}><Stack.Screen name="(auth)" /></Stack.Protected>
        <Stack.Protected guard={user?.role === 'patient'}><Stack.Screen name="(patient)" /></Stack.Protected>
        <Stack.Protected guard={user?.role === 'doctor'}><Stack.Screen name="(doctor)" /></Stack.Protected>
      </Stack>
  );
}
