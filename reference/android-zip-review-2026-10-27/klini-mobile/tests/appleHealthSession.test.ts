import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHealthSession } from '../src/services/appleHealthSession';
import { isAppleHealthPreferences } from '../src/domain/appleHealth';
import { readAppleHealthSamples } from '../src/services/appleHealthReader';
import { appReducer, hydrateState } from '../src/domain/reducer';
import { createDemoState } from '../src/domain/seed';

const tick = () => new Promise(resolve => setImmediate(resolve));
test('stopped sessions discard pending results and remove late observers', async () => {
  let finish!: (value: []) => void;
  let removeObserver!: (value: () => void) => void;
  let removed = 0;
  let published = 0;
  let cancelled = 0;
  const stop = createHealthSession({
    read: () => new Promise(resolve => { finish = resolve; }),
    observe: () => new Promise(resolve => { removeObserver = resolve; }),
    publish: () => published++, interval: () => () => { cancelled++; },
  });
  stop(); finish([]); removeObserver(() => { removed++; }); await tick();
  assert.equal(published, 0); assert.equal(removed, 1); assert.equal(cancelled, 1);
});
test('change notifications coalesce instead of starting concurrent reads', async () => {
  let changed!: () => void;
  let finish!: (value: []) => void;
  let calls = 0;
  const stop = createHealthSession({
    read: () => { calls++; return new Promise(resolve => { finish = resolve; }); },
    observe: async callback => { changed = callback; return () => {}; },
    publish: () => {}, interval: () => () => {},
  });
  changed(); changed(); assert.equal(calls, 1);
  finish([]); await tick(); assert.equal(calls, 2);
  stop(); finish([]);
});
test('silent reading never requests authorization and preserves a zero reading', async () => {
  const readings = await readAppleHealthSamples({
    queryStatisticsCollectionForQuantity: async (_id, _stats, anchor) => { const end = new Date(anchor); end.setDate(end.getDate()+1); return [{startDate:anchor,endDate:end,sumQuantity:{quantity:0,unit:'count'},sources:[]}]; },
    getMostRecentQuantitySample: async () => ({ quantity: 0, startDate: new Date(0), endDate: new Date(0), sourceRevision: { source: { name: 'Test' } } }) as never,
    getMostRecentCategorySample: async () => undefined,
  }, ['HKQuantityTypeIdentifierStepCount']);
  assert.equal(readings[0].value, 0);
});
test('preferences accept only category settings, never measurements', () => {
  const prefs = { ownerId: 'owner', enabled: true, selected: ['HKQuantityTypeIdentifierHeartRate'], requested: ['HKQuantityTypeIdentifierHeartRate'] };
  assert.equal(isAppleHealthPreferences(prefs), true);
  assert.equal(isAppleHealthPreferences({ ...prefs, readings: [{ value: 63 }] }), false);
  assert.equal(isAppleHealthPreferences({ ...prefs, requested: [] }), false);
  assert.equal(isAppleHealthPreferences({ ...prefs, selected: [] }), false);
});

test('selection survives storage hydration and legacy accounts remain valid', () => {
  const initial = createDemoState();
  assert.equal(hydrateState(JSON.stringify(initial)).error, null);
  const prefs = { ownerId: initial.profile.id, enabled: true, selected: ['HKQuantityTypeIdentifierHeartRate' as const], requested: ['HKQuantityTypeIdentifierHeartRate' as const] };
  const next = appReducer(initial, { type: 'UPDATE_SETTINGS', patch: { appleHealth: prefs } });
  const restored = hydrateState(JSON.stringify(next));
  assert.equal(restored.error, null);
  assert.deepEqual(restored.state.settings.appleHealth, prefs);
  assert.ok(hydrateState(JSON.stringify({ ...next, settings: { ...next.settings, appleHealth: { ...prefs, value: 63 } } })).error);
});

test('foreground restart reads again and failures publish an empty error state', async () => {
  let attempts = 0;
  const values: boolean[] = [];
  const deps = {
    read: async () => { attempts++; throw new Error('unavailable'); },
    observe: async () => () => {},
    publish: (readings: unknown[], error?: boolean) => { assert.deepEqual(readings, []); values.push(!!error); },
    interval: () => () => {},
  };
  const stop = createHealthSession(deps); await tick(); stop();
  const stopAgain = createHealthSession(deps); await tick(); stopAgain();
  assert.equal(attempts, 2); assert.deepEqual(values, [true, true]);
});
