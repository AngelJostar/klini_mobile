process.env.EXPO_PUBLIC_API_URL = 'http://127.0.0.1:8000/api/mobile/v1';
process.env.EXPO_PUBLIC_APP_ENV = 'test';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
}));
