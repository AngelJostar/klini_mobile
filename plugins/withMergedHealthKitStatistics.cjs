const fs = require('node:fs');
const path = require('node:path');
const { withDangerousMod } = require('expo/config-plugins');
const marker = '// KLINI_MERGED_STATISTICS_V1';

function replaceExactly(source, before, after, count) {
  if (source.split(before).length - 1 !== count) throw new Error('HealthKit statistics patch: unexpected upstream source; review before building.');
  return source.split(before).join(after);
}

/** Version-guarded patch: merged APIs must not force separateBySource.
 * Keep the library's explicitly per-source APIs working as originally intended. */
function patchSources(version, helpers, quantities) {
  if (version !== '16.2.0') throw new Error('HealthKit statistics patch requires review for this dependency version.');
  if (helpers.includes(marker) || quantities.includes(marker)) {
    if (!helpers.includes(marker) || !quantities.includes(marker)) throw new Error('HealthKit statistics patch: incomplete prior patch.');
    return { helpers, quantities, changed: false };
  }
  let h = replaceExactly(helpers, 'func buildStatisticsOptions(statistics: [StatisticsOptions], quantityType: HKQuantityType) -> HKStatisticsOptions {',
    'func buildStatisticsOptions(statistics: [StatisticsOptions], quantityType: HKQuantityType, separateBySource: Bool = false) -> HKStatisticsOptions {', 1);
  h = replaceExactly(h, '  opts.insert(.separateBySource)', '  if separateBySource { opts.insert(.separateBySource) }', 1);
  let q = replaceExactly(quantities, '  options: StatisticsQueryOptionsWithStringUnit?\n) async throws ->',
    '  options: StatisticsQueryOptionsWithStringUnit?,\n  separateBySource: Bool = false\n) async throws ->', 2);
  q = replaceExactly(q, 'buildStatisticsOptions(statistics: statistics, quantityType: quantityType)',
    'buildStatisticsOptions(statistics: statistics, quantityType: quantityType, separateBySource: separateBySource)', 2);
  const start = q.indexOf('  func queryStatisticsForQuantitySeparateBySource(');
  const end = q.indexOf('  func aggregationStyle(');
  if (start < 0 || end <= start) throw new Error('HealthKit statistics patch: missing per-source API boundaries.');
  const perSource = replaceExactly(q.slice(start, end), '          options: options\n', '          options: options,\n          separateBySource: true\n', 2);
  q = q.slice(0, start) + perSource + q.slice(end);
  return { helpers: marker + '\n' + h, quantities: marker + '\n' + q, changed: true };
}

function patchDependency(projectRoot) {
  const root = path.join(projectRoot, 'node_modules', '@kingstinct', 'react-native-healthkit');
  const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
  const helpersPath = path.join(root, 'ios', 'Helpers.swift');
  const quantitiesPath = path.join(root, 'ios', 'QuantityTypeModule.swift');
  // Validate both complete transformations before writing either dependency file.
  const result = patchSources(version, fs.readFileSync(helpersPath, 'utf8'), fs.readFileSync(quantitiesPath, 'utf8'));
  if (result.changed) { fs.writeFileSync(helpersPath, result.helpers); fs.writeFileSync(quantitiesPath, result.quantities); }
  console.log('[Klini] HealthKit merged statistics patch verified (16.2.0).');
  return result.changed;
}
function withMergedHealthKitStatistics(config) {
  return withDangerousMod(config, ['ios', async config => {
    patchDependency(config.modRequest.projectRoot);
    return config;
  }]);
}
module.exports = withMergedHealthKitStatistics;
module.exports.patchSources = patchSources;
module.exports.patchDependency = patchDependency;
