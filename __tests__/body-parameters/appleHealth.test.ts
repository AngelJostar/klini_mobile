import assert from 'node:assert/strict';
import { test } from 'node:test';

import { HEALTH_CATEGORIES, readAppleHealth, type HealthReader } from '../../src/features/body-parameters/services/appleHealthReader';

test('requests only selected read types, before querying; denied/empty access stays empty', async () => {
  const events: unknown[] = [];
  const reader = {
    requestAuthorization: async (options: unknown) => { events.push(options); return true; },
    getMostRecentQuantitySample: async (id: string) => { events.push(id); return undefined; },
    getMostRecentCategorySample: async () => { throw new Error('must not query unselected sleep'); },
  } as unknown as HealthReader;
  assert.deepEqual(await readAppleHealth(reader, ['HKQuantityTypeIdentifierHeartRate']), [{ id: 'HKQuantityTypeIdentifierHeartRate' }]);
  assert.deepEqual(events, [{ toRead: ['HKQuantityTypeIdentifierHeartRate'] }, 'HKQuantityTypeIdentifierHeartRate']);
});

test('authorization failure never queries or returns measurements', async () => {
  let queried = false;
  const reader = {
    requestAuthorization: async () => { throw new Error('cancelled'); },
    getMostRecentQuantitySample: async () => { queried = true; },
  } as unknown as HealthReader;
  await assert.rejects(readAppleHealth(reader, ['HKQuantityTypeIdentifierHeartRate']));
  assert.equal(queried, false);
  assert.deepEqual(await readAppleHealth(reader, []), []);
});

test('partial query failure preserves other samples, source, time and sleep stage', async () => {
  const startDate = new Date('2026-11-03T23:00:00Z');
  const endDate = new Date('2026-11-03T23:30:00Z');
  const sample = { quantity: 72, value: 2, startDate, endDate, sourceRevision: { source: { name: 'Test Watch' } } };
  const reader = {
    requestAuthorization: async () => true,
    getMostRecentQuantitySample: async (id: string) => {
      if (id.includes('Resting')) throw new Error('query failed');
      return sample;
    },
    getMostRecentCategorySample: async () => sample,
  } as unknown as HealthReader;
  const result = await readAppleHealth(reader, HEALTH_CATEGORIES.map(item => item.id));
  assert.equal(result[0].value, 72);
  assert.equal(result[0].source, 'Test Watch');
  assert.equal(result[0].start, startDate.toISOString());
  assert.equal(result[1].error, true);
  assert.equal(result[4].value, 30);
  assert.equal(result[4].stage, 'Despierto'); // never labels awake time as total sleep
});
