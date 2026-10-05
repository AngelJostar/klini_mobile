import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'klini.access_token';

export const tokenStorage = {
  get: () => SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
  set: (token: string) => SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
  clear: () => SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
};
