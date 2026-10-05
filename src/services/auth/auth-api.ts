import { Platform } from 'react-native';

import { apiRequest } from '@/services/api/client';
import type { LoginData, MobileUser } from '@/services/api/types';

export function login(loginValue: string, password: string) {
  return apiRequest<LoginData>('auth/login', {
    method: 'POST',
    body: JSON.stringify({ login: loginValue.trim(), password, device_name: `Klini Mobile (${Platform.OS})` }),
  });
}
export function getCurrentUser() { return apiRequest<{ user: MobileUser }>('me'); }
export function logout() { return apiRequest<{ message: string }>('auth/logout', { method: 'POST' }); }

export function forgotPassword(loginValue: string) {
  return apiRequest<{ message: string }>('auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ login: loginValue.trim() }),
  });
}

export function resetPassword(email: string, token: string, password: string) {
  return apiRequest<{ message: string }>('auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), token, password, password_confirmation: password }),
  });
}

export function changePassword(currentPassword: string, password: string) {
  return apiRequest<{ message: string }>('auth/password', {
    method: 'PUT',
    body: JSON.stringify({ current_password: currentPassword, password, password_confirmation: password }),
  });
}
