import assert from 'node:assert/strict';
import { test } from 'node:test';

import { readAppleHealth, readAppleHealthSamples, type HealthReader } from '../../src/features/body-parameters/services/appleHealthReader';

const steps = 'HKQuantityTypeIdentifierStepCount' as const;
const sleep = 'HKCategoryTypeIdentifierSleepAnalysis' as const;
const start = new Date('2026-11-03T23:30:00Z'), end = new Date('2026-11-04T01:00:00Z');
test('explicit setup requests both read types without writes, then reads consolidated steps and an independent sleep segment', async () => {
  const events: unknown[] = [];
  const reader = {
    requestAuthorization: async (options: unknown) => { events.push(options); return true; },
    queryStatisticsCollectionForQuantity: async (id: string, statistics: unknown, anchor: Date) => {
      events.push('steps'); assert.equal(id, steps); assert.deepEqual(statistics, ['cumulativeSum']);
      const tomorrow = new Date(anchor); tomorrow.setDate(tomorrow.getDate() + 1);
      return [{ startDate:anchor, endDate:tomorrow, sumQuantity:{unit:'count',quantity:3796}, sources:[] }];
    },
    getMostRecentCategorySample: async (id: string) => { events.push('sleep'); assert.equal(id,sleep); return { value:5, startDate:start, endDate:end, sourceRevision:{source:{name:'Test Watch'}} }; },
    getMostRecentQuantitySample: async () => assert.fail('steps must not use a raw interval or another type'),
  } as unknown as HealthReader;
  const readings = await readAppleHealth(reader,[steps,sleep]);
  assert.deepEqual(events[0],{toRead:[steps,sleep]});
  assert.equal(readings[0].value,3796); assert.equal(readings[1].value,90); assert.equal(readings[1].stage,'REM');
  assert.equal(readings[1].start,start.toISOString()); assert.equal(readings[1].end,end.toISOString());
});
test('sleep preserves all HealthKit stages and cross-midnight segment duration without claiming a nightly total',async()=>{
  const stages=['En cama','Dormido','Despierto','Sueño ligero','Sueño profundo','REM'];
  for(let value=0;value<stages.length;value++) {
    const reader={getMostRecentCategorySample:async()=>({value,startDate:start,endDate:end,sourceRevision:{source:{name:'Test Watch'}}})} as unknown as HealthReader;
    const [reading]=await readAppleHealthSamples(reader,[sleep]);
    assert.equal(reading.stage,stages[value]); assert.equal(reading.value,90); assert.equal(reading.source,'Test Watch');
  }
});
test('missing/denied types remain absent while native failures are technical errors, independently',async()=>{
  const reader={queryStatisticsCollectionForQuantity:async()=>[],getMostRecentCategorySample:async()=>undefined} as unknown as HealthReader;
  const missing=await readAppleHealthSamples(reader,[steps,sleep]);
  assert.ok(missing.every(reading=>reading.value===undefined && !reading.error));
  reader.getMostRecentCategorySample=async()=>{throw new Error('native failure');};
  const partial=await readAppleHealthSamples(reader,[steps,sleep]);
  assert.equal(partial[0].error,undefined); assert.equal(partial[1].error,true);
});
test('unfinished authorization never starts steps or sleep reads',async()=>{
  const reader={requestAuthorization:async()=>false,queryStatisticsCollectionForQuantity:async()=>assert.fail('must not read'),getMostRecentCategorySample:async()=>assert.fail('must not read')} as unknown as HealthReader;
  await assert.rejects(readAppleHealth(reader,[steps,sleep]),/no se completó/);
});
