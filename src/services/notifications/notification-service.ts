import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { enablePushDevice } from './notification-api';
import { pushTokenStorage } from './push-token-storage';

export async function registerPushNotifications() {
  if (Platform.OS === 'web') throw new Error('Las notificaciones móviles no están disponibles en web.');
  if (!Device.isDevice) throw new Error('Las notificaciones requieren un dispositivo o emulador compatible.');
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('klini-general', {
      name: 'Avisos de Klini',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#008F83',
    });
  }
  const current = await Notifications.getPermissionsAsync();
  const permission = current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') throw new Error('Activa el permiso de notificaciones en la configuración del dispositivo.');
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('Falta vincular el proyecto con EAS para generar el token push.');
  const pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await enablePushDevice(pushToken, Platform.OS as 'android' | 'ios', Device.deviceName);
  await pushTokenStorage.set(pushToken);
  return pushToken;
}

export async function sendLocalTestNotification(path: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Klini Mobile', body: 'Notificación de prueba lista.', data: { path } },
    trigger: null,
  });
}
