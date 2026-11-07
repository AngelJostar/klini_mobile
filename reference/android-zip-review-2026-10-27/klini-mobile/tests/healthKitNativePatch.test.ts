import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { patchSources } = require('../plugins/withMergedHealthKitStatistics.cjs');

const helpers = `func buildStatisticsOptions(statistics: [StatisticsOptions], quantityType: HKQuantityType) -> HKStatisticsOptions {
  var opts = HKStatisticsOptions()
  opts.insert(.separateBySource)
  return opts
}`;
const quantities = `func queryStatisticsForQuantityInternal(
  options: StatisticsQueryOptionsWithStringUnit?
) async throws -> HKStatistics? {
  buildStatisticsOptions(statistics: statistics, quantityType: quantityType)
}
func queryStatisticsCollectionForQuantityInternal(
  options: StatisticsQueryOptionsWithStringUnit?
) async throws -> HKStatisticsCollection? {
  buildStatisticsOptions(statistics: statistics, quantityType: quantityType)
}
  func queryStatisticsForQuantitySeparateBySource(
          options: options
  ) {}
  func queryStatisticsCollectionForQuantitySeparateBySource(
          options: options
  ) {}
  func aggregationStyle() {}
  func queryStatisticsCollectionForQuantity() {
          options: options
  }
`;
test('native statistics default to merged while explicitly per-source APIs retain separation', () => {
  const result = patchSources('16.2.0', helpers, quantities);
  assert.equal(result.changed, true);
  assert.match(result.helpers, /if separateBySource \{ opts.insert\(\.separateBySource\) \}/);
  assert.equal((result.quantities.match(/separateBySource: Bool = false/g) || []).length, 2);
  assert.equal((result.quantities.match(/separateBySource: true/g) || []).length, 2);
  const merged = result.quantities.slice(result.quantities.indexOf('  func aggregationStyle'));
  assert.doesNotMatch(merged, /separateBySource: true/);
  assert.deepEqual(patchSources('16.2.0', result.helpers, result.quantities), { ...result, changed: false });
});
test('upstream changes and partial patches fail closed before native compilation', () => {
  assert.throws(() => patchSources('16.3.0', helpers, quantities), /requires review/);
  assert.throws(() => patchSources('16.2.0', helpers.replace('opts.insert', 'opts.remove'), quantities), /unexpected upstream/);
  const patched = patchSources('16.2.0', helpers, quantities);
  assert.throws(() => patchSources('16.2.0', patched.helpers, quantities), /incomplete prior patch/);
});
test('actual installed dependency matches the reviewed native patch and CNG configuration', () => {
  const h = readFileSync('node_modules/@kingstinct/react-native-healthkit/ios/Helpers.swift', 'utf8');
  const q = readFileSync('node_modules/@kingstinct/react-native-healthkit/ios/QuantityTypeModule.swift', 'utf8');
  const installed = JSON.parse(readFileSync('node_modules/@kingstinct/react-native-healthkit/package.json', 'utf8')).version;
  const reviewed = patchSources(installed, h, q);
  assert.match(reviewed.helpers, /if separateBySource \{ opts.insert\(\.separateBySource\) \}/);
  assert.equal((reviewed.quantities.match(/separateBySource: true/g) || []).length, 2);
  assert.equal((reviewed.quantities.match(/separateBySource: Bool = false/g) || []).length, 2);
  assert.equal(patchSources('16.2.0', reviewed.helpers, reviewed.quantities).changed, false);
  const config = JSON.parse(readFileSync('app.json', 'utf8'));
  assert.ok(config.expo.plugins.includes('./plugins/withMergedHealthKitStatistics.cjs'));
});
