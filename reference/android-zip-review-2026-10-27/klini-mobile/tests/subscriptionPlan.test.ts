import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoState } from '../src/domain/seed';
import { appReducer, hydrateState, parseStoredState, validateAppState } from '../src/domain/reducer';
import { switchProfile } from '../src/domain/family';
import { createAiSubscription, hasAiAccess } from '../src/domain/aiSubscription';
import { subscriptionPackages } from '../src/domain/subscriptionPackages';
import { applySubscriptionUpgrade, createSubscriptionPlanWriter, createSubscriptionUpgradeQuote, getSubscriptionOverview, isSubscriptionPlan, isSubscriptionUpgradeQuote, type SubscriptionPlan, type SubscriptionPlanId, type SubscriptionUpgradeQuote } from '../src/domain/subscriptionPlan';
import type { AppState } from '../src/domain/types';

const now = new Date(2026, 10, 12, 12).getTime();
const child = { id: 'subscription-child', name: 'Familiar', kind: 'Niña' as const };
const doctor = { id: 'subscription-doctor', name: 'Nombre anterior', kind: 'Profesional de la salud' as const, professionalType: 'doctor' as const, licenseNumber: '111111', specialty: 'Oncología Médica' };
const quote = (state = createDemoState(new Date(now)), target: SubscriptionPlanId = 'integrated-ai', time = now) => createSubscriptionUpgradeQuote(state, target, time);
const tick = () => new Promise<void>(resolve => setImmediate(resolve));

function existingPlan(planId: 'pro' | 'integrated-ai' | 'ai-max', periodStart: string, periodEnd: string): SubscriptionPlan {
  const index = subscriptionPackages.findIndex(plan => plan.id === planId);
  const [year, month, day] = periodStart.split('-').map(Number);
  const [lastYear, lastMonth, lastDay] = periodEnd.split('-').map(Number);
  const totalDays = (Date.UTC(lastYear, lastMonth - 1, lastDay) - Date.UTC(year, month - 1, day)) / 86_400_000;
  const created = new Date(year, month - 1, day, 12).toISOString();
  const receipt: SubscriptionUpgradeQuote = {
    mode: 'demo', currency: 'MXN', upgradeId: 'fixture_upgrade', accountId: 'patient-sofia',
    fromPlanId: subscriptionPackages[index - 1].id, toPlanId: planId,
    periodStart, periodEnd, periodSource: 'stored', asOfDate: periodStart, quotedAt: created,
    amountCents: (subscriptionPackages[index].monthlyPrice - subscriptionPackages[index - 1].monthlyPrice) * 100,
    remainingDays: totalDays, totalDays, basisUpgradeId: 'fixture_previous', basisLegacyActivation: null,
  };
  return { mode: 'demo', planId, periodStart, periodEnd, changedAt: created, consentVersion: 1, upgradeId: receipt.upgradeId, receipt };
}

test('legacy owner IA99 is displayed as Pro99 for the whole account without changing legacy AI access', () => {
  const owner = createDemoState(new Date(now));
  const before = JSON.stringify(owner);
  for (const active of [owner, switchProfile(owner, child), switchProfile(owner, doctor)]) {
    const overview = getSubscriptionOverview(active, now);
    assert.equal(overview.accountId, owner.profile.id);
    assert.equal(overview.currentPlan.id, 'pro');
    assert.equal(overview.currentPlan.monthlyPrice, 99);
    assert.equal(overview.nextPlan!.id, 'integrated-ai');
    assert.equal(overview.periodSource, 'example');
    assert.equal(overview.totalDays, 31);
    assert.equal(overview.remainingDays, 15);
    assert.equal(active.subscriptionPlan, undefined);
  }
  assert.equal(JSON.stringify(owner), before);
  const noAi = { ...owner, aiSubscription: createAiSubscription(false, owner.aiSubscription, now) };
  let active = switchProfile(noAi, child);
  active = appReducer(active, { type: 'SET_AI_SUBSCRIPTION', profileId: child.id, subscription: createAiSubscription(true, undefined, now) });
  assert.equal(getSubscriptionOverview(active, now).currentPlan.id, 'free', 'A child AI entitlement never becomes the account plan.');
});

test('Pro99 to IA199 quotes exactly48.39MXN for15 of31calendar days with an explicit example period', () => {
  const value = quote();
  assert.equal(value.amountCents, 4839);
  assert.equal(value.remainingDays, 15);
  assert.equal(value.totalDays, 31);
  assert.equal(value.periodStart, '2026-10-27');
  assert.equal(value.periodEnd, '2026-11-27');
  assert.equal(value.periodSource, 'example');
  assert.equal(Object.isFrozen(value), true);
  assert.equal(isSubscriptionUpgradeQuote(value), true);
});

test('stored periods prorate integer cents across28,29,30and31day cycles and count the current calendar day', () => {
  for (const [start, end, today, total, remaining] of [
    ['2026-02-01', '2026-03-01', [2026, 1, 15], 28, 14],
    ['2028-02-01', '2028-03-01', [2028, 1, 15], 29, 15],
    ['2026-04-01', '2026-05-01', [2026, 3, 16], 30, 15],
    ['2026-10-27', '2026-11-27', [2026, 10, 26], 31, 1],
  ] as const) {
    const state = { ...createDemoState(new Date(now)), subscriptionPlan: existingPlan('pro', start, end) };
    const value = quote(state, 'integrated-ai', new Date(today[0], today[1], today[2], 23, 59, 59).getTime());
    assert.equal(value.totalDays, total);
    assert.equal(value.remainingDays, remaining);
    assert.equal(value.amountCents, Math.round(10000 * remaining / total));
    assert.equal(value.periodSource, 'stored');
  }
});

test('only the immediately higher plan can be quoted, with expired and future periods rejected', () => {
  const state = createDemoState(new Date(now));
  for (const target of ['free', 'basic', 'pro', 'ai-max', 'unknown'] as SubscriptionPlanId[]) assert.throws(() => quote(state, target), /siguiente/);
  const free = { ...state, aiSubscription: undefined };
  assert.equal(quote(free, 'basic').amountCents, 2419);
  assert.throws(() => quote(free, 'pro'), /siguiente/);
  const maximum = { ...state, subscriptionPlan: existingPlan('ai-max', '2026-11-01', '2026-12-01') };
  assert.equal(getSubscriptionOverview(maximum, now).nextPlan, null);
  assert.throws(() => quote(maximum), /siguiente/);
  const expired = { ...state, subscriptionPlan: existingPlan('pro', '2026-10-01', '2026-11-01') };
  assert.throws(() => quote(expired), /terminó/);
  const future = { ...state, subscriptionPlan: existingPlan('pro', '2026-12-01', '2027-01-01') };
  assert.throws(() => quote(future), /no ha comenzado/);
});

test('confirmation records one account receipt without touching money, medical data, AI consent or permissions', () => {
  const owner = createDemoState(new Date(now));
  const value = quote(owner);
  const next = appReducer(owner, { type: 'UPGRADE_SUBSCRIPTION_PLAN', quote: value, now });
  assert.equal(next.subscriptionPlan!.planId, 'integrated-ai');
  assert.deepEqual(next.subscriptionPlan!.receipt, value);
  const { subscriptionPlan: ignored, ...other } = next;
  assert.ok(ignored);
  assert.deepEqual(other, owner);
  assert.equal(hasAiAccess(next.aiSubscription), hasAiAccess(owner.aiSubscription));
  const noAi = { ...owner, aiSubscription: undefined };
  const basic = applySubscriptionUpgrade(noAi, quote(noAi, 'basic'), now);
  assert.equal(hasAiAccess(basic.aiSubscription), false);
  const pro = applySubscriptionUpgrade(basic, quote(basic, 'pro'), now);
  const integrated = applySubscriptionUpgrade(pro, quote(pro), now);
  assert.equal(integrated.subscriptionPlan!.planId, 'integrated-ai');
  assert.equal(hasAiAccess(integrated.aiSubscription), false, 'Choosing the IA-labelled commercial demo does not grant an AI entitlement.');
  assert.equal(isSubscriptionPlan(next.subscriptionPlan), true);
  assert.equal(validateAppState(next), true);
});

test('one account plan and receipt survive family/professional switches and reload without snapshot copies', () => {
  const owner = createDemoState(new Date(now));
  const value = quote(owner);
  let active = switchProfile(owner, child);
  active = applySubscriptionUpgrade(active, value, now);
  const plan = active.subscriptionPlan;
  for (const target of [doctor, child, undefined]) {
    active = switchProfile(active, target);
    assert.equal(active.subscriptionPlan, plan);
    assert.equal(getSubscriptionOverview(active, now).currentPlan.id, 'integrated-ai');
    assert.equal(validateAppState(active), true);
    for (const scope of Object.values(active.family!.profiles)) assert.equal(Object.hasOwn(scope, 'subscriptionPlan'), false);
  }
  const restored = parseStoredState(JSON.stringify(active));
  assert.deepEqual(restored.subscriptionPlan, plan);
  assert.equal(getSubscriptionOverview(switchProfile(restored, doctor), now).currentPlan.id, 'integrated-ai');
});

test('stale days, changed account/legacy basis, skipped plans and altered quote totals are rejected', () => {
  const state = createDemoState(new Date(now));
  const value = quote(state);
  for (const altered of [
    { ...value, amountCents: 1 }, { ...value, accountId: 'other-account' }, { ...value, toPlanId: 'ai-max' },
    { ...value, remainingDays: 16 }, { ...value, mode: 'live' }, { ...value, currency: 'USD' },
    { ...value, periodStart: '2026-10-26' }, { ...value, quotedAt: new Date(now + 1).toISOString() },
    { ...value, clientSecret: 'not-a-payment' },
  ]) assert.throws(() => applySubscriptionUpgrade(state, altered as SubscriptionUpgradeQuote, now));
  assert.throws(() => applySubscriptionUpgrade(state, value, now + 86_400_000), /fecha/);
  const changed = { ...state, aiSubscription: createAiSubscription(true, undefined, now + 1) };
  assert.throws(() => applySubscriptionUpgrade(changed, value, now + 1), /cambió/);
  const applied = applySubscriptionUpgrade(state, value, now);
  assert.equal(applySubscriptionUpgrade(applied, value, now + 86_400_000), applied, 'An exact replay is a no-op, even on a later day.');
  assert.throws(() => applySubscriptionUpgrade(applied, { ...value, upgradeId: 'another_confirmation' }, now), /siguiente/);
});

test('optional global plan stays backward compatible and malformed receipts or per-profile duplicates fail hydration', () => {
  const legacy = createDemoState(new Date(now));
  assert.equal(hydrateState(JSON.stringify(legacy)).state.subscriptionPlan, undefined);
  const valid = switchProfile(applySubscriptionUpgrade(legacy, quote(legacy), now), child);
  for (const mutate of [
    (state: AppState) => { Object.assign(state.subscriptionPlan!, { mode: 'live' }); },
    (state: AppState) => { Object.assign(state.subscriptionPlan!, { planId: 'free' }); },
    (state: AppState) => { Object.assign(state.subscriptionPlan!.receipt, { amountCents: 0 }); },
    (state: AppState) => { Object.assign(state.subscriptionPlan!.receipt, { accountId: child.id }); },
    (state: AppState) => { Object.assign(state.subscriptionPlan!, { periodEnd: '2026-02-30' }); },
    (state: AppState) => { Object.assign(state.subscriptionPlan!, { paymentMethod: 'card' }); },
    (state: AppState) => { Object.assign(state.family!.profiles[child.id], { subscriptionPlan: state.subscriptionPlan }); },
  ]) {
    const invalid = structuredClone(valid);
    mutate(invalid);
    const raw = JSON.stringify(invalid);
    assert.equal(validateAppState(invalid), false);
    assert.throws(() => parseStoredState(raw));
    assert.ok(hydrateState(raw).error);
    assert.equal(JSON.stringify(invalid), raw);
  }
});

function writerHarness(initial = createDemoState(new Date(now))) {
  let state = initial, generation = 0;
  const writes: { state: AppState; resolve: () => void; reject: (reason: Error) => void }[] = [];
  const write = createSubscriptionPlanWriter({ current: () => state, generation: () => generation,
    publish: value => { state = value; }, now: () => now, reduce: appReducer,
    persist: value => new Promise<void>((resolve, reject) => { writes.push({ state: value, resolve, reject }); }) });
  return { write, writes, get state() { return state; }, set state(value) { state = value; }, reset() { generation++; state = createDemoState(new Date(now + 1000)); } };
}

test('serialized duplicate confirmations persist once, and mutable caller drafts cannot change a queued quote', async () => {
  const h = writerHarness();
  const mutable = { ...quote(h.state) };
  const first = h.write(mutable), second = h.write({ ...mutable });
  mutable.amountCents = 1;
  await tick();
  assert.equal(h.writes.length, 1);
  assert.equal(h.state.subscriptionPlan!.receipt.amountCents, 4839);
  h.state = switchProfile(h.state, child);
  h.writes[0].resolve();
  await Promise.all([first, second]);
  assert.equal(h.writes.length, 1);
  assert.equal(h.state.profile.id, child.id);
  assert.equal(h.state.subscriptionPlan!.receipt.amountCents, 4839);
});

test('failed persistence rolls back only the global plan while preserving later profile and record changes', async () => {
  const h = writerHarness();
  const first = h.write(quote(h.state));
  const rejected = assert.rejects(first, /synthetic-write/);
  await tick();
  const note = { id: 'later-note', type: 'Nota' as const, title: 'Nota posterior', date: '2026-11-12', doctorName: '', description: 'Dato de prueba' };
  h.state = appReducer(h.state, { type: 'ADD_RECORD', record: note });
  h.state = switchProfile(h.state, child);
  h.writes[0].reject(new Error('synthetic-write'));
  await tick();
  assert.equal(h.writes.length, 2);
  assert.equal(h.state.subscriptionPlan, undefined);
  assert.equal(h.state.profile.id, child.id);
  assert.equal(h.state.family!.profiles[h.state.family!.ownerId].records.at(-1)!.id, note.id);
  h.writes[1].resolve();
  await rejected;
  const retry = h.write(quote(h.state));
  await tick();
  h.writes[2].resolve();
  await retry;
  assert.equal(h.state.subscriptionPlan!.planId, 'integrated-ai');
});

test('rollback never replaces a newer account plan, and reset invalidates both in-flight and queued confirmations', async () => {
  const h = writerHarness();
  const first = h.write(quote(h.state));
  const rejected = assert.rejects(first, /synthetic-write/);
  await tick();
  h.state = applySubscriptionUpgrade(h.state, quote(h.state, 'ai-max'), now);
  const newer = h.state.subscriptionPlan;
  h.writes[0].reject(new Error('synthetic-write'));
  await rejected;
  assert.equal(h.state.subscriptionPlan, newer);
  assert.equal(h.writes.length, 1);

  const reset = writerHarness();
  const firstReset = reset.write(quote(reset.state));
  const firstCancelled = assert.rejects(firstReset, /restablecer/);
  await tick();
  const queued = reset.write(quote(reset.state, 'ai-max'));
  const queuedCancelled = assert.rejects(queued, /restablecer/);
  reset.reset();
  reset.writes[0].resolve();
  await Promise.all([firstCancelled, queuedCancelled]);
  assert.equal(reset.state.subscriptionPlan, undefined);
  assert.equal(reset.writes.length, 1);
});
