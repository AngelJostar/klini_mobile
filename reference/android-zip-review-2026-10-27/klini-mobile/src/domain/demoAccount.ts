import type { AppState } from './types';
import { createAiSubscription, setProfileAiSubscription } from './aiSubscription';

/** Fictional demo account only. Not connected to server authentication. */
export const SOFIA_DEMO_ACCOUNT = Object.freeze({
  patientId: 'patient-sofia',
  displayName: 'Sofía Martínez',
  username: 'sofiamartinez',
  password: 'Demo2026',
});

/** Supply Sofia's requested demo access once, preserving later cancellations. */
export function provisionSofiaDemoAi(state: AppState, now = Date.now()): AppState {
  const id = SOFIA_DEMO_ACCOUNT.patientId;
  const scope = state.family?.profiles[id];
  if (state.profile.id !== id && !scope) return state;
  const existing = state.profile.id === id ? state.aiSubscription ?? scope?.aiSubscription : scope?.aiSubscription;
  if (existing !== undefined) return state.profile.id === id && state.aiSubscription === undefined ? setProfileAiSubscription(state, id, existing) : state;
  return setProfileAiSubscription(state, id, createAiSubscription(true, undefined, now));
}
