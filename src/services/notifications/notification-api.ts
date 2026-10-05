import { apiRequest } from '@/services/api/client';

export const enablePushDevice = (pushToken: string, platform: 'android' | 'ios', deviceName?: string | null) =>
  apiRequest<{ enabled: boolean }>('devices/push', {
    method: 'PUT',
    body: JSON.stringify({ push_token: pushToken, platform, device_name: deviceName }),
  });

export const disablePushDevice = (pushToken: string) =>
  apiRequest<{ enabled: boolean }>('devices/push', {
    method: 'DELETE',
    body: JSON.stringify({ push_token: pushToken }),
  });
