import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { queryClient } from '@/providers/query-provider';
import { setApiAccessToken, setUnauthorizedHandler } from '@/services/api/client';
import type { MobileUser } from '@/services/api/types';
import * as authApi from '@/services/auth/auth-api';
import { tokenStorage } from '@/services/auth/token-storage';
import { disablePushDevice } from '@/services/notifications/notification-api';
import { pushTokenStorage } from '@/services/notifications/push-token-storage';

type AuthContextValue = { user: MobileUser | null; isRestoring: boolean; signIn: (login: string, password: string) => Promise<void>; signOut: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const clearSession = useCallback(async () => { setApiAccessToken(null); setUser(null); queryClient.clear(); await tokenStorage.clear(); }, []);

  useEffect(() => { setUnauthorizedHandler(clearSession); return () => setUnauthorizedHandler(null); }, [clearSession]);
  useEffect(() => {
    async function restoreSession() {
      try {
        const token = await tokenStorage.get();
        if (!token) return;
        setApiAccessToken(token);
        const data = await authApi.getCurrentUser();
        setUser(data.user);
      } catch { await clearSession(); }
      finally { setIsRestoring(false); }
    }
    void restoreSession();
  }, [clearSession]);

  const signIn = useCallback(async (loginValue: string, password: string) => {
    const data = await authApi.login(loginValue, password);
    await tokenStorage.set(data.access_token);
    setApiAccessToken(data.access_token);
    setUser(data.user);
  }, []);
  const signOut = useCallback(async () => {
    try {
      const pushToken = await pushTokenStorage.get();
      if (pushToken) await disablePushDevice(pushToken);
      await authApi.logout();
    } finally {
      await pushTokenStorage.clear();
      await clearSession();
    }
  }, [clearSession]);
  const value = useMemo(() => ({ user, isRestoring, signIn, signOut }), [isRestoring, signIn, signOut, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.');
  return context;
}
