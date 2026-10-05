export type AppEnvironment = 'local' | 'test' | 'production';

const appEnvironment = process.env.EXPO_PUBLIC_APP_ENV ?? 'local';
const apiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!['local', 'test', 'production'].includes(appEnvironment)) {
  throw new Error('EXPO_PUBLIC_APP_ENV debe ser local, test o production.');
}

if (!apiUrl) {
  throw new Error('Falta configurar EXPO_PUBLIC_API_URL. Copia .env.example como .env.');
}

export const env = {
  appEnvironment: appEnvironment as AppEnvironment,
  apiUrl: apiUrl.replace(/\/$/, ''),
  isProduction: appEnvironment === 'production',
} as const;
