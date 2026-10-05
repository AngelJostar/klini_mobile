import * as SecureStore from 'expo-secure-store';

const KEY = 'klini_mobile_push_token';

export const pushTokenStorage = {
  get: () => SecureStore.getItemAsync(KEY),
  set: (value: string) => SecureStore.setItemAsync(KEY, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
  clear: () => SecureStore.deleteItemAsync(KEY),
};
