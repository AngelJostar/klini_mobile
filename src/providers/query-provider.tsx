import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

import { ApiError } from '@/services/api/client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnMount: true,
      refetchOnReconnect: true,
      retry: (failureCount, error) => shouldRetry(failureCount, error),
    },
    mutations: { retry: false },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    function onAppStateChange(status: AppStateStatus) {
      if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
    }
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function shouldRetry(failureCount: number, error: unknown) {
  if (failureCount >= 1) return false;
  if (!(error instanceof ApiError)) return true;
  return error.status === 0 || error.status >= 500;
}
