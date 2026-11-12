// Review --check first. --apply writes only the nine manifest paths after every baseline matches.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const stage = __dirname;
const manifest = JSON.parse(fs.readFileSync(path.join(stage, 'patch-manifest.json'), 'utf8'));
const destination = path.resolve(manifest.destination);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const mode = process.argv[2] ?? '--check';
if (!['--check', '--apply'].includes(mode) || process.argv.length > 3) throw new Error('Use --check or --apply only.');
const entries = manifest.files.map(entry => {
  const target = path.resolve(destination, entry.path);
  const source = path.resolve(stage, entry.path);
  if (!target.startsWith(destination + path.sep) || !source.startsWith(stage + path.sep)) throw new Error('Path outside reviewed roots.');
  const bytes = fs.readFileSync(source);
  if (sha(bytes) !== entry.staged_sha256) throw new Error('Staged file changed: ' + entry.path);
  const actual = fs.existsSync(target) ? sha(fs.readFileSync(target)) : null;
  return { ...entry, source, target, bytes, actual };
});
if (entries.every(entry => entry.actual === entry.staged_sha256)) {
  console.log(JSON.stringify({ status: 'already_applied', files: entries.length }));
  process.exit(0);
}
for (const entry of entries) {
  if (entry.actual !== entry.baseline_sha256) throw new Error('Backend changed since review; do not overwrite: ' + entry.path);
}
if (mode === '--apply') {
  for (const entry of entries) {
    fs.mkdirSync(path.dirname(entry.target), { recursive: true });
    fs.writeFileSync(entry.target, entry.bytes);
    if (sha(fs.readFileSync(entry.target)) !== entry.staged_sha256) throw new Error('Write verification failed: ' + entry.path);
  }
}
const report = { status: mode === '--check' ? 'baseline_match' : 'applied', files: entries.map(({ path: file, baseline_sha256, staged_sha256 }) => ({ path: file, baseline_sha256, staged_sha256 })), migrationExecuted: false, configurationOrPriceDataWritten: false };
if (mode === '--apply') fs.writeFileSync(path.join(stage, 'application-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
