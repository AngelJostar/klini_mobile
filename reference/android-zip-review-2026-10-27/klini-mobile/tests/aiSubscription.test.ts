import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoState } from '../src/domain/seed';
import { appReducer, hydrateState, parseStoredState, validateAppState } from '../src/domain/reducer';
import { switchProfile } from '../src/domain/family';
import { createAiSubscription, getProfileAiSubscription, hasAiAccess, isAiSubscription, rollbackAiSubscription } from '../src/domain/aiSubscription';

const now = Date.parse('2026-10-30T12:00:00.000Z');
const child = { id: 'child-ai-demo', name: 'Perfil infantil de ejemplo', kind: 'Niño' as const };
const active = () => createAiSubscription(true, undefined, now);

function unsubscribedOwner() {
  const state = createDemoState();
  delete state.aiSubscription;
  state.profile = { ...state.profile, id: 'patient-ai-unit' };
  return state;
}

test('old saved states for other profiles remain compatible and have no AI access by default', () => {
  const previous = unsubscribedOwner();
  assert.equal(Object.hasOwn(previous, 'aiSubscription'), false);
  const restored = hydrateState(JSON.stringify(previous));
  assert.equal(restored.error, null);
  assert.equal(restored.state.aiSubscription, undefined);
  assert.equal(hasAiAccess(restored.state.aiSubscription), false);
});

test('the Sofia demonstration starts with valid active AI access while keeping its existing health data', () => {
  const state = createDemoState();
  assert.equal(state.profile.id, 'patient-sofia');
  assert.equal(hasAiAccess(state.aiSubscription), true);
  assert.equal(state.aiSubscription?.mode, 'demo');
  assert.equal(state.aiSubscription?.consentVersion, 1);
  assert.ok(state.records.length);
  assert.ok(state.appointments.length);
});

test('legacy Sofia data gains demo AI access without replacing records or altering other profiles', () => {
  const legacy = createDemoState();
  delete legacy.aiSubscription;
  const restored = hydrateState(JSON.stringify(legacy));
  assert.equal(restored.error, null);
  assert.equal(hasAiAccess(restored.state.aiSubscription), true);
  assert.deepEqual(restored.state.records, legacy.records);
  assert.deepEqual(restored.state.appointments, legacy.appointments);
  assert.deepEqual(restored.state.policies, legacy.policies);

  const childActive = switchProfile(legacy, child);
  const family = hydrateState(JSON.stringify(childActive));
  assert.equal(family.error, null);
  assert.equal(family.state.profile.id, child.id);
  assert.equal(hasAiAccess(family.state.aiSubscription), false);
  assert.equal(hasAiAccess(getProfileAiSubscription(family.state, legacy.profile.id)), true);
  assert.equal(hasAiAccess(switchProfile(family.state).aiSubscription), true);
  assert.deepEqual(family.state.records, childActive.records);
});

test('an explicit Sofia cancellation stays cancelled across repeated hydration and profile switching', () => {
  const sofia = createDemoState();
  const cancelled = createAiSubscription(false, sofia.aiSubscription, now);
  const state = appReducer(sofia, { type: 'SET_AI_SUBSCRIPTION', profileId: sofia.profile.id, subscription: cancelled });
  const once = hydrateState(JSON.stringify(state));
  const twice = hydrateState(JSON.stringify(once.state));
  assert.equal(once.error, null);
  assert.equal(twice.error, null);
  assert.deepEqual(twice.state.aiSubscription, cancelled);
  const childActive = switchProfile(twice.state, child);
  const restoredChild = hydrateState(JSON.stringify(childActive));
  assert.equal(restoredChild.error, null);
  assert.equal(hasAiAccess(restoredChild.state.aiSubscription), false);
  assert.deepEqual(switchProfile(restoredChild.state).aiSubscription, cancelled);

  const personalized = { ...sofia, aiSubscription: createAiSubscription(true, undefined, now - 60_000) };
  assert.deepEqual(hydrateState(JSON.stringify(personalized)).state.aiSubscription, personalized.aiSubscription);
});

test('Sofia demo provisioning never repairs or grants access through malformed subscription data', () => {
  const invalid = { ...createDemoState(), aiSubscription: { ...active(), consentVersion: 0 } };
  const fallback = unsubscribedOwner();
  assert.equal(validateAppState(invalid), false);
  assert.throws(() => parseStoredState(JSON.stringify(invalid)));
  const restored = hydrateState(JSON.stringify(invalid), fallback);
  assert.ok(restored.error);
  assert.equal(restored.state, fallback);
  assert.equal(hasAiAccess(restored.state.aiSubscription), false);
});

test('legacy active Sofia restores an existing family subscription without replacing its activation or cancellation', () => {
  for (const enabled of [true, false]) {
    const sofia = createDemoState();
    const saved = createAiSubscription(enabled, undefined, now);
    let state = appReducer(sofia, { type: 'SET_AI_SUBSCRIPTION', profileId: sofia.profile.id, subscription: saved });
    state = switchProfile(switchProfile(state, child));
    delete state.aiSubscription;
    const restored = hydrateState(JSON.stringify(state));
    assert.equal(restored.error, null);
    assert.deepEqual(restored.state.aiSubscription, saved);
    assert.equal(hasAiAccess(restored.state.aiSubscription), enabled);
  }
});

test('demo access requires a valid active consent and timestamp; cancellation retains its activation date', () => {
  const subscription = active();
  assert.equal(hasAiAccess(subscription), true);
  assert.equal(subscription.mode, 'demo');
  const cancelled = createAiSubscription(false, subscription, now + 60_000);
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.activatedAt, subscription.activatedAt);
  assert.equal(hasAiAccess(cancelled), false);
  assert.equal(hasAiAccess(createAiSubscription(true, cancelled, now + 120_000)), true);
  for (const value of [undefined, null, [], 'active', { ...subscription, status: 'paid' }, { ...subscription, mode: 'production' }, { ...subscription, consentVersion: 0 }, { ...subscription, activatedAt: '2026-10-30' }, { ...subscription, activatedAt: '2026-02-31T12:00:00.000Z' }]) {
    assert.equal(isAiSubscription(value), false);
    assert.equal(hasAiAccess(value), false);
  }
});

test('malformed hydrated AI data is rejected on the active and inactive profile', () => {
  const owner = unsubscribedOwner();
  const invalid = { ...owner, aiSubscription: { ...active(), consentVersion: 2 } };
  assert.equal(validateAppState(invalid), false);
  assert.throws(() => parseStoredState(JSON.stringify(invalid)));
  const restored = hydrateState(JSON.stringify(invalid), owner);
  assert.equal(restored.state, owner);
  assert.ok(restored.error);
  const family = switchProfile(owner, child);
  const malformedFamily = {
    ...family,
    family: { ...family.family!, profiles: { ...family.family!.profiles, [owner.profile.id]: { ...family.family!.profiles[owner.profile.id], aiSubscription: { ...active(), mode: 'paid' } } } },
  };
  assert.equal(validateAppState(malformedFamily), false);
});

test('reducer validates AI activations before mutating state and permits an explicit inactive target', () => {
  const owner = unsubscribedOwner();
  const subscription = active();
  const next = appReducer(owner, { type: 'SET_AI_SUBSCRIPTION', profileId: owner.profile.id, subscription });
  assert.equal(next.aiSubscription, subscription);
  assert.equal(owner.aiSubscription, undefined);
  assert.equal(next.records, owner.records);
  assert.throws(() => appReducer(owner, { type: 'SET_AI_SUBSCRIPTION', profileId: 'missing-profile', subscription }));
  assert.throws(() => appReducer(owner, { type: 'SET_AI_SUBSCRIPTION', profileId: owner.profile.id, subscription: { ...subscription, mode: 'production' } as never }));
  const family = switchProfile(owner, child);
  const changed = appReducer(family, { type: 'SET_AI_SUBSCRIPTION', profileId: owner.profile.id, subscription });
  assert.equal(changed.profile.id, child.id);
  assert.equal(changed.aiSubscription, undefined);
  assert.equal(getProfileAiSubscription(changed, owner.profile.id), subscription);
});

test('owner and child subscriptions remain isolated across switching, cancellation and reload', () => {
  const owner = unsubscribedOwner();
  let state = appReducer(owner, { type: 'SET_AI_SUBSCRIPTION', profileId: owner.profile.id, subscription: active() });
  state = switchProfile(state, child);
  assert.equal(hasAiAccess(state.aiSubscription), false);
  state = appReducer(state, { type: 'SET_AI_SUBSCRIPTION', profileId: child.id, subscription: active() });
  state = switchProfile(state);
  assert.equal(hasAiAccess(state.aiSubscription), true);
  state = appReducer(state, { type: 'SET_AI_SUBSCRIPTION', profileId: owner.profile.id, subscription: createAiSubscription(false, state.aiSubscription, now + 60_000) });
  state = switchProfile(parseStoredState(JSON.stringify(state)), child);
  assert.equal(hasAiAccess(state.aiSubscription), true);
  state = switchProfile(state);
  assert.equal(hasAiAccess(state.aiSubscription), false);
  assert.equal(state.aiSubscription?.status, 'cancelled');
});

test('rollback restores only the failed subscription while preserving concurrent unrelated edits', () => {
  const owner = unsubscribedOwner();
  const subscription = active();
  let state = appReducer(owner, { type: 'SET_AI_SUBSCRIPTION', profileId: owner.profile.id, subscription });
  state = appReducer(state, { type: 'UPDATE_PROFILE', patch: { name: 'Sofía de prueba actualizada' } });
  state = appReducer(state, { type: 'ADD_RECORD', record: { id: 'ai-concurrent-note', title: 'Nota de ejemplo', type: 'Nota', date: '2026-10-30', doctorName: '', description: 'Edición que debe conservarse.' } });
  const rolledBack = rollbackAiSubscription(state, owner.profile.id, subscription, undefined);
  assert.equal(rolledBack.aiSubscription, undefined);
  assert.equal(rolledBack.profile.name, 'Sofía de prueba actualizada');
  assert.equal(rolledBack.records, state.records);
  assert.equal(rolledBack.records.at(-1)?.id, 'ai-concurrent-note');
  assert.equal(validateAppState(rolledBack), true);
});

test('rollback follows its original profile after switching without revoking another family member', () => {
  const owner = unsubscribedOwner();
  const subscription = active();
  let state = appReducer(owner, { type: 'SET_AI_SUBSCRIPTION', profileId: owner.profile.id, subscription });
  state = switchProfile(state, child);
  const childSubscription = createAiSubscription(true, undefined, now + 60_000);
  state = appReducer(state, { type: 'SET_AI_SUBSCRIPTION', profileId: child.id, subscription: childSubscription });
  const rolledBack = rollbackAiSubscription(state, owner.profile.id, subscription, undefined);
  assert.equal(rolledBack.aiSubscription, childSubscription);
  assert.equal(getProfileAiSubscription(rolledBack, owner.profile.id), undefined);
  assert.equal(switchProfile(rolledBack).aiSubscription, undefined);
  assert.equal(validateAppState(rolledBack), true);
});

test('stale failure cannot overwrite a newer subscription or a reset', () => {
  const owner = unsubscribedOwner();
  const attempted = active();
  let state = appReducer(owner, { type: 'SET_AI_SUBSCRIPTION', profileId: owner.profile.id, subscription: attempted });
  const later = createAiSubscription(false, attempted, now + 60_000);
  state = appReducer(state, { type: 'SET_AI_SUBSCRIPTION', profileId: owner.profile.id, subscription: later });
  assert.equal(rollbackAiSubscription(state, owner.profile.id, attempted, undefined), state);
  const reset = unsubscribedOwner();
  assert.equal(rollbackAiSubscription(reset, owner.profile.id, attempted, undefined), reset);
});

