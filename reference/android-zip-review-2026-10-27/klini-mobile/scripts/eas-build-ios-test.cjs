/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

// Scope the archive to this app even when its Git repository has a parent root.
const projectRoot = fs.realpathSync(path.join(__dirname, '..'));
const easIgnore = path.join(projectRoot, '.easignore');
const npmCli = process.env.npm_execpath;
const profile = process.argv[2] || 'development';

if (!fs.existsSync(easIgnore) || !fs.statSync(easIgnore).isFile()) {
  throw new Error('Falta .easignore en la raíz de la app. No se iniciará la compilación.');
}
if (!npmCli || !fs.existsSync(npmCli)) {
  throw new Error('Ejecuta este comando mediante npm run build:ios:test.');
}
if (process.argv.length > 3 || !['development', 'payments-test'].includes(profile)) {
  throw new Error('Solo se admiten los perfiles development y payments-test, sin opciones adicionales.');
}

const child = spawn(process.execPath, [
  npmCli, 'exec', '--yes', '--package=eas-cli@latest', '--', 'eas',
  'build', '--platform', 'ios', '--profile', profile,
  '--non-interactive', '--freeze-credentials', '--no-wait',
], {
  cwd: projectRoot,
  env: { ...process.env, EAS_NO_VCS: '1', EAS_PROJECT_ROOT: projectRoot },
  stdio: 'inherit',
  shell: false,
});

child.once('error', () => {
  console.error('No se pudo iniciar EAS CLI.');
  process.exitCode = 1;
});
child.once('exit', (code) => {
  process.exitCode = code ?? 1;
});
