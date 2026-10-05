import { useState } from 'react';
import { Alert, Text } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { useAuth } from '@/providers/auth-provider';
import { disablePushDevice } from '@/services/notifications/notification-api';
import { registerPushNotifications, sendLocalTestNotification } from '@/services/notifications/notification-service';
import { pushTokenStorage } from '@/services/notifications/push-token-storage';
import { colors } from '@/theme/tokens';

export function PushSettingsCard() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  async function enable() {
    setBusy(true);
    try {
      await registerPushNotifications();
      Alert.alert('Notificaciones activadas', 'Este dispositivo recibirá avisos de Klini Mobile.');
    } catch (error) {
      Alert.alert('No fue posible activar', error instanceof Error ? error.message : 'Intenta nuevamente.');
    } finally { setBusy(false); }
  }
  async function disable() {
    setBusy(true);
    try {
      const token = await pushTokenStorage.get();
      if (token) await disablePushDevice(token);
      await pushTokenStorage.clear();
      Alert.alert('Notificaciones desactivadas', 'Este dispositivo dejó de recibir avisos.');
    } catch (error) {
      Alert.alert('No fue posible desactivar', error instanceof Error ? error.message : 'Intenta nuevamente.');
    } finally { setBusy(false); }
  }
  async function test() {
    try { await sendLocalTestNotification(user?.role === 'doctor' ? '/doctor/requests' : '/patient/notifications'); }
    catch (error) { Alert.alert('No fue posible generar la prueba', error instanceof Error ? error.message : 'Intenta nuevamente.'); }
  }
  return <AppCard><Text style={{ color: colors.text, fontSize: 17, fontWeight: '800' }}>Avisos en este dispositivo</Text><Text style={{ color: colors.textMuted, lineHeight: 21 }}>Puedes activar o revocar los avisos sin afectar tu cuenta.</Text><AppButton label="Activar notificaciones" loading={busy} onPress={() => void enable()} /><AppButton label="Probar aviso local" variant="outline" disabled={busy} onPress={() => void test()} /><AppButton label="Desactivar en este dispositivo" variant="outline" disabled={busy} onPress={() => void disable()} /></AppCard>;
}
