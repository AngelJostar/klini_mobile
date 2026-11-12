const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const stage = __dirname;
const target = 'C:/laragon/www/dr-sam';
const originals = JSON.parse(fs.readFileSync(path.join(stage, 'source-hashes.json'), 'utf8'));
const files = [
  'app/Models/Doctor.php',
  'app/Models/DoctorConsultationTariff.php',
  'app/Services/DoctorConsultationTariffService.php',
  'app/Http/Controllers/Doctor/DoctorPortalController.php',
  'routes/web.php',
  'resources/views/doctor/dashboard.blade.php',
  'resources/views/doctor/partials/consultation-tariff.blade.php',
  'database/migrations/2026_11_12_000002_create_doctor_consultation_tariffs.php',
  'tests/Feature/DoctorConsultationTariffTest.php',
];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const plans = files.map(relative => {
  const source = path.resolve(stage, relative);
  const destination = path.resolve(target, relative);
  if (!destination.startsWith(path.resolve(target) + path.sep) || !source.startsWith(path.resolve(stage) + path.sep)) throw new Error('Path outside the fixed scope.');
  const before = fs.existsSync(destination) ? hash(fs.readFileSync(destination)) : null;
  if (before !== (originals[relative] ?? null)) throw new Error('Source changed; reconcile before applying: ' + relative);
  const bytes = fs.readFileSync(source);
  return { relative, destination, bytes, before, after: hash(bytes) };
});
const apply = process.argv[2] === '--apply';
if (process.argv[2] !== '--check' && !apply) throw new Error('Use --check or --apply.');
if (apply) {
  for (const plan of plans) {
    fs.mkdirSync(path.dirname(plan.destination), { recursive: true });
    fs.writeFileSync(plan.destination, plan.bytes);
    if (hash(fs.readFileSync(plan.destination)) !== plan.after) throw new Error('Readback mismatch: ' + plan.relative);
  }
}
fs.writeFileSync(path.join(stage, 'apply-report.json'), JSON.stringify({ applied: apply, files: plans.map(({ relative, before, after }) => ({ path: relative, before, after })) }, null, 2));
process.stdout.write(JSON.stringify({ applied: apply, files: plans.length, hashGuard: true, readback: apply }) + '\n');
