import type { AppState } from './types';

/** Local demo access only. This does not represent a purchase or production entitlement. */
export type AiSubscription = {
  status: 'active' | 'cancelled';
  activatedAt: string;
  consentVersion: 1;
  mode: 'demo';
};

export function isAiSubscription(value: unknown): value is AiSubscription {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const subscription = value as Record<string, unknown>;
  if ((subscription.status !== 'active' && subscription.status !== 'cancelled') || subscription.consentVersion !== 1 || subscription.mode !== 'demo' || typeof subscription.activatedAt !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(subscription.activatedAt)) return false;
  const date = new Date(subscription.activatedAt);
  return !Number.isNaN(date.getTime()) && date.toISOString() === subscription.activatedAt;
}

export function hasAiAccess(subscription: unknown): boolean {
  return isAiSubscription(subscription) && subscription.status === 'active';
}

export function createAiSubscription(active: boolean, previous?: AiSubscription, now = Date.now()): AiSubscription {
  return {
    status: active ? 'active' : 'cancelled',
    activatedAt: !active && previous ? previous.activatedAt : new Date(now).toISOString(),
    consentVersion: 1,
    mode: 'demo',
  };
}

export function getProfileAiSubscription(state: AppState, profileId: string): AiSubscription | undefined {
  return state.profile.id === profileId ? state.aiSubscription : state.family?.profiles[profileId]?.aiSubscription;
}

export function setProfileAiSubscription(state: AppState, profileId: string, subscription: AiSubscription | undefined): AppState {
  const scope = state.family?.profiles[profileId];
  if (state.profile.id !== profileId && !scope) throw new Error('No se encontró el perfil para actualizar Klini IA.');
  const next = state.profile.id === profileId ? { ...state, aiSubscription: subscription } : { ...state };
  if (state.family && scope) {
    next.family = { ...state.family, profiles: { ...state.family.profiles, [profileId]: { ...scope, aiSubscription: subscription } } };
  }
  return next;
}

/** Undo only this change on the latest state, including an owner who is no longer active. */
export function rollbackAiSubscription(state: AppState, profileId: string, expected: AiSubscription, previous: AiSubscription | undefined): AppState {
  if (getProfileAiSubscription(state, profileId) !== expected) return state;
  return setProfileAiSubscription(state, profileId, previous);
}
