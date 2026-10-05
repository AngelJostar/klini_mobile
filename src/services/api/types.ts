export type MobileRole = 'patient' | 'doctor';

export type MobileUser = {
  id: number;
  name: string;
  username: string | null;
  email: string | null;
  role: MobileRole;
  role_label: string | null;
  profile_id: number | null;
};

export type LoginData = {
  token_type: 'Bearer';
  access_token: string;
  expires_at: string;
  user: MobileUser;
};

export type ApiSuccess<T> = { success: true; data: T; meta?: Record<string, unknown> };
export type ApiFailure = {
  success: false;
  error: { code: string; message: string; details?: Record<string, unknown> };
};
