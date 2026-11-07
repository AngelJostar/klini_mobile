const { spawn } = require('node:child_process');
const path = require('node:path');

// This public development tunnel serves the app, not the local AI/OCR services.
// Do not load .env files or inline credentials from the invoking terminal.
const env = { ...process.env };
for (const key of Object.keys(env)) {
  if (/^EXPO_PUBLIC_|^OPENAI_|^KLINI_|(?:_KEY|_TOKEN)$|SECRET|PASSWORD/i.test(key)) delete env[key];
}
Object.assign(env, {
  EXPO_NO_DOTENV: '1',
  EXPO_PUBLIC_KLINI_AI_URL: '',
  EXPO_PUBLIC_KLINI_AI_DEV_TOKEN: '',
  EXPO_PUBLIC_OCR_URL: '',
  CI: '1',
});
const cli = path.join(path.dirname(require.resolve('expo/package.json')), 'bin', 'cli');
const child = spawn(process.execPath, [cli, 'start', '--dev-client', '--tunnel', '--port', '8102', '--clear'], {
  cwd: process.cwd(), env, stdio: 'inherit', windowsHide: true,
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
