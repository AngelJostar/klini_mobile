import React, { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AccountConsultation, AccountConsultationQuote } from '../domain/accountWallet';
import type { AccountWalletClient } from '../services/accountWallet';

type Session = { token: string; name: string };
export type WalletConsultationAttempt = { appointment: AccountConsultation; quote: AccountConsultationQuote; requestId: string };
type Access = { session: Session | null; signIn: (session: Session) => void; signOut: (client?: AccountWalletClient) => void; consultationAttempt: WalletConsultationAttempt | null; rememberConsultationAttempt: (token: string, attempt: WalletConsultationAttempt | null) => void };
const Context = createContext<Access>({ session: null, signIn: () => {}, signOut: () => {}, consultationAttempt: null, rememberConsultationAttempt: () => {} });

/** App-session memory only. Never writes passwords, bearer tokens or balances to AsyncStorage. */
export default function WalletAccountSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const currentSession = useRef<Session | null>(null);
  const [pending, setPending] = useState<{ token: string; attempt: WalletConsultationAttempt } | null>(null);
  const signIn = useCallback((next: Session) => {
    if (currentSession.current?.token !== next.token) setPending(null);
    currentSession.current = next; setSession(next);
  }, []);
  const signOut = useCallback((client?: AccountWalletClient) => {
    const previous = currentSession.current;
    currentSession.current = null; setSession(null); setPending(null);
    if (previous && client) void client.logout(previous.token).catch(() => undefined);
  }, []);
  const rememberConsultationAttempt = useCallback((token: string, attempt: WalletConsultationAttempt | null) => {
    if (currentSession.current?.token !== token) return;
    setPending(attempt ? { token, attempt } : null);
  }, []);
  const value = useMemo<Access>(() => ({ session, signIn, signOut, consultationAttempt: session && pending?.token === session.token ? pending.attempt : null, rememberConsultationAttempt }), [session, signIn, signOut, pending, rememberConsultationAttempt]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useWalletAccountSession = () => useContext(Context);
