import { test } from 'node:test';
import assert from 'node:assert/strict';
import { healthHistoryRange, readHealthHistory, type HistoryReader, type HealthHistoryPage } from '../src/services/appleHealthHistoryReader';
import { createHistorySession, type HistoryView } from '../src/services/appleHealthHistorySession';

const id = 'HKQuantityTypeIdentifierHeartRate' as const;
const snapshot = new Date('2026-11-05T23:00:00Z');
const sample = (uuid: string, value = 69) => ({ uuid, quantity: value, startDate: new Date('2026-11-04T20:00:00Z'), endDate: new Date('2026-11-04T20:01:00Z'), sourceRevision: { source: { name: 'Test Watch' } } });
const tick = () => new Promise(resolve => setImmediate(resolve));
test('history reads bounded descending pages without authorization; UUID exclusions preserve equal timestamps', async () => {
  const calls: any[] = [];
  const reader = { queryQuantitySamples: async (_id: unknown, options: any) => {
    calls.push(options);
    const excluded = options.filter.NOT?.[0].uuids ?? [];
    return Array.from({ length: 52 }, (_, i) => sample(`sample-${i}`)).filter(item => !excluded.includes(item.uuid)).slice(0, options.limit);
  } } as unknown as HistoryReader;
  const first = await readHealthHistory(reader, id, '2026-11-01', '2026-11-05', [], snapshot);
  assert.equal(first.readings.length, 50); assert.equal(first.hasMore, true);
  assert.equal(calls[0].limit, 51); assert.equal(calls[0].ascending, false); assert.equal(calls[0].unit, 'count/min');
  const second = await readHealthHistory(reader, id, '2026-11-01', '2026-11-05', first.readings.map(item => item.uuid), snapshot);
  assert.equal(second.readings.length, 2); assert.equal(second.hasMore, false);
  assert.equal(new Set([...first.readings, ...second.readings].map(item => item.uuid)).size, 52);
  assert.equal(first.readings[0].source, 'Test Watch'); assert.equal(first.readings[0].value, 69);
});
test('sleep history maps actual segments and stages; quantities preserve zero', async () => {
  const reader = { queryCategorySamples: async () => [{ ...sample('sleep'), quantity: undefined, value: 5 }], queryQuantitySamples: async () => [sample('zero', 0)] } as unknown as HistoryReader;
  // Category samples do not carry a quantity field.
  reader.queryCategorySamples = (async () => [{ uuid: 'sleep', value: 5, startDate: sample('x').startDate, endDate: sample('x').endDate, sourceRevision: sample('x').sourceRevision }]) as never;
  const sleep = await readHealthHistory(reader, 'HKCategoryTypeIdentifierSleepAnalysis', '2026-11-01', '2026-11-05', [], snapshot);
  assert.equal(sleep.readings[0].value, 1); assert.equal(sleep.readings[0].stage, 'REM');
  assert.equal((await readHealthHistory(reader, id, '2026-11-01', '2026-11-05', [], snapshot)).readings[0].value, 0);
});
test('empty/denied access is empty, errors propagate and invalid periods never query', async () => {
  let calls = 0;
  const reader = { queryQuantitySamples: async () => { calls++; return []; } } as unknown as HistoryReader;
  assert.deepEqual(await readHealthHistory(reader, id, '2026-11-01', '2026-11-05', [], snapshot), { readings: [], hasMore: false });
  for (const [from, to] of [['2026-02-30', '2026-03-01'], ['2026-11-05', '2026-11-01'], ['2026-01-01', '2026-02-01']]) assert.throws(() => healthHistoryRange(from, to));
  assert.doesNotThrow(() => healthHistoryRange('2026-01-01', '2026-01-31'));
  await assert.rejects(readHealthHistory(reader, id, '2026-11-06', '2026-11-07', [], snapshot));
  assert.equal(calls, 1);
  reader.queryQuantitySamples = async () => { throw new Error('native failure'); };
  await assert.rejects(readHealthHistory(reader, id, '2026-11-01', '2026-11-05', [], snapshot));
});
test('history session ignores pending results after close, and retries errors', async () => {
  const states: HistoryView[] = []; let resolve!: (page: HealthHistoryPage) => void;
  const session = createHistorySession(() => new Promise(done => { resolve = done; }), value => states.push(value));
  session.refresh(); session.next(); assert.equal(states.length, 1);
  session.stop(); resolve({ readings: [], hasMore: false }); await tick(); assert.equal(states.length, 1);
  let calls = 0;
  const retry = createHistorySession(async () => { if (!calls++) throw new Error('failed'); return { readings: [], hasMore: false }; }, value => states.push(value));
  retry.refresh(); await tick(); assert.equal(states.at(-1)?.error, true);
  retry.refresh(); await tick(); assert.equal(states.at(-1)?.error, false); retry.stop();
});
test('page navigation remains stable during auto refresh and is bounded at 1000 samples', async () => {
  let view!: HistoryView; let calls = 0;
  const session = createHistorySession(async excluded => ({ readings: Array.from({length:50},(_, i)=>({ id, uuid: `sample-${excluded.length+i}`, value:i })), hasMore: true }), value => { view = value; });
  session.refresh(); await tick();
  for (let i = 0; i < 19; i++) { session.next(); await tick(); calls++; }
  assert.equal(view.page, 19); assert.equal(view.limited, true);
  session.next(); await tick(); assert.equal(view.page, 19);
  session.autoRefresh(); await tick(); assert.equal(view.page, 19);
  session.previous(); assert.equal(view.page, 18); assert.equal(view.limited, false);
  session.next(); assert.equal(view.page, 19); assert.equal(calls, 19); session.stop();
});
