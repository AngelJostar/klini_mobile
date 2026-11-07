import { watchHealthDay } from '../src/services/appleHealthDayWatcher';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readDailySteps, readTodaySteps, localDayKey, type StepsReader } from '../src/services/appleHealthSteps';
import { readHealthHistory, type HistoryReader } from '../src/services/appleHealthHistoryReader';
import { readAppleHealthSamples, type HealthReader } from '../src/services/appleHealthReader';

const local = (day: number, hour = 0) => new Date(2026, 10, day, hour);
function bin(day: number, value?: number) {
  return { startDate: local(day), endDate: local(day + 1), sources: [{ name: 'iPhone', bundleIdentifier: 'test.phone' }, { name: 'Apple Watch', bundleIdentifier: 'test.watch' }], ...(value === undefined ? {} : { sumQuantity: { quantity: value, unit: 'count' } }) };
}
test('daily steps use the HealthKit consolidated sum and never add source or raw sample totals', async () => {
  let calls = 0;
  const reader = { queryStatisticsCollectionForQuantity: async (id, statistics, anchor, interval, options) => {
    calls++; assert.equal(id, 'HKQuantityTypeIdentifierStepCount'); assert.deepEqual(statistics, ['cumulativeSum']);
    assert.deepEqual(interval, { day: 1 }); assert.equal(anchor.getTime(), local(5).getTime());
    assert.equal(options?.unit, 'count'); assert.equal(options?.filter?.date?.startDate?.getTime(), local(5).getTime());
    assert.equal(options?.filter?.date?.endDate?.getTime(), local(5, 14).getTime());
    assert.equal(options?.filter?.sources, undefined); assert.equal(options?.filter?.date?.strictStartDate, undefined);
    return [bin(5, 4200)] as never;
  } } satisfies StepsReader;
  const reading = await readTodaySteps(reader, local(5, 14));
  assert.equal(reading.value, 4200); assert.equal(reading.day, '2026-11-05'); assert.equal(calls, 1);
  assert.deepEqual(reading.sources, ['iPhone', 'Apple Watch']); assert.equal(reading.end, local(5, 14).toISOString());
});
test('history has one row per local day; missing totals stay absent and a measured zero stays zero', async () => {
  const reader = { queryStatisticsCollectionForQuantity: async () => [bin(3, 5500), bin(4, 0)] } as unknown as HistoryReader;
  const page = await readHealthHistory(reader, 'HKQuantityTypeIdentifierStepCount', '2026-11-03', '2026-11-05', [], local(5, 14));
  assert.equal(page.hasMore, false); assert.equal(page.readings.length, 3);
  assert.deepEqual(page.readings.map(row => row.value), [undefined, 0, 5500]);
  assert.deepEqual(page.readings.map(row => row.day), ['2026-11-05', '2026-11-04', '2026-11-03']);
  assert.equal(new Set(page.readings.map(row => row.uuid)).size, 3);
});
test('steps failures stay category errors, other parameters still return latest samples', async () => {
  const reader = {
    queryStatisticsCollectionForQuantity: async () => { throw new Error('unavailable'); },
    getMostRecentQuantitySample: async () => ({ quantity: 70, startDate: local(5), endDate: local(5), sourceRevision: { source: { name: 'Watch' } } }),
  } as unknown as HealthReader;
  const readings = await readAppleHealthSamples(reader, ['HKQuantityTypeIdentifierHeartRate', 'HKQuantityTypeIdentifierStepCount']);
  assert.equal(readings[0].value, 70); assert.equal(readings[1].error, true);
});
test('new day gets a fresh total and does not carry yesterday forward', async () => {
  const reader = { queryStatisticsCollectionForQuantity: async (_id, _stats, anchor) => [bin(anchor.getDate(), anchor.getDate() === 5 ? 100 : undefined)] } satisfies StepsReader;
  assert.equal((await readTodaySteps(reader, local(5, 23))).value, 100);
  assert.equal((await readTodaySteps(reader, local(6, 1))).value, undefined);
  assert.notEqual(localDayKey(local(5, 23)), localDayKey(local(6, 1)));
});
test('calendar days use local midnight across 23/25-hour days and differ across timezones', () => {
  const code = `import {readDailySteps,localDayKey} from './src/services/appleHealthSteps.ts';
    let captured; const reader={queryStatisticsCollectionForQuantity:async(...args)=>{captured=args;return []}};
    const now=new Date(process.env.TEST_INSTANT);
    const day=new Date(now);day.setHours(0,0,0,0);const end=new Date(day);end.setDate(end.getDate()+1);
    const key=localDayKey(now).split('|')[0];const readings=await readDailySteps(reader,key,key,now);
    console.log(JSON.stringify({key,hours:(end-day)/3600000,anchor:captured[2].toISOString(),interval:captured[3],count:readings.length}));`;
  const run = (zone: string, instant: string) => JSON.parse(execFileSync(process.execPath, ['--import','tsx','--input-type=module','-e',code], { env: { ...process.env, TZ: zone, TEST_INSTANT: instant }, encoding: 'utf8', windowsHide: true }));
  assert.equal(run('America/New_York', '2026-03-08T18:00:00Z').hours, 23);
  assert.equal(run('America/New_York', '2026-11-01T18:00:00Z').hours, 25);
  const ny = run('America/New_York','2026-11-05T02:00:00Z'), tokyo = run('Asia/Tokyo','2026-11-05T02:00:00Z');
  assert.equal(ny.key, '2026-11-04'); assert.equal(tokyo.key, '2026-11-05'); assert.notEqual(ny.anchor, tokyo.anchor);
  assert.deepEqual(ny.interval, {day:1});
});
test('invalid, duplicate and misaligned daily bins are rejected without inventing a total', async () => {
  for (const bins of [[bin(5, -1)], [bin(5, 10), bin(5, 20)], [{ ...bin(5, 10), startDate: local(5, 1) }]]) {
    const reader = { queryStatisticsCollectionForQuantity: async () => bins } as unknown as StepsReader;
    await assert.rejects(readDailySteps(reader, '2026-11-05', '2026-11-05', local(5, 14)));
  }
});

test('day watcher refreshes at midnight and removes both foreground timers', () => {
  let now = local(5, 23), changed = 0, removed = 0;
  let midnight!: () => void, periodic!: () => void;
  const stop = watchHealthDay(() => changed++, () => now, {
    once: (callback, ms) => { midnight = callback; assert.equal(ms, 3600000); return () => { removed++; }; },
    repeat: (callback, ms) => { periodic = callback; assert.equal(ms, 15000); return () => { removed++; }; },
  });
  periodic(); assert.equal(changed, 0);
  now = local(6); midnight(); assert.equal(changed, 1);
  periodic(); assert.equal(changed, 1); stop(); assert.equal(removed, 2);
});
