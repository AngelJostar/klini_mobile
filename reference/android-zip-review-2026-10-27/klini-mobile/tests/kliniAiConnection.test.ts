import test from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateKliniAiHost, resolveKliniAiConnection } from '../src/domain/kliniAiConnection';
import { validateKliniAiEndpoint } from '../src/domain/kliniAi';
import { createKliniAiService } from '../src/services/kliniAi';
import { createDemoState } from '../src/domain/seed';
import { createAiSubscription } from '../src/domain/aiSubscription';

const endpoint = 'http://127.0.0.1:8098/chat';
const lanHost = '192.168.100.250';
const developmentToken = 'FAKE_DEVELOPMENT_TOKEN_ONLY_123456789';
const value = createDemoState();
value.aiSubscription = createAiSubscription(true);
const input = { question: 'Hola', history: [], state: value };

test('Expo Go resolves the private Metro host only for native development', () => {
  for (const platform of ['ios', 'android']) {
    assert.deepEqual(resolveKliniAiConnection({ endpoint, development: true, platform, expoHostUri: `${lanHost}:8097` }), { endpoint: `http://${lanHost}:8098/chat`, lanHost });
    assert.deepEqual(resolveKliniAiConnection({ endpoint: `http://${lanHost}:8098/chat`, development: true, platform, expoHostUri: `${lanHost}:8097` }), { endpoint: `http://${lanHost}:8098/chat`, lanHost });
  }
  for (const options of [
    { development: true, platform: 'web', expoHostUri: `${lanHost}:8097` },
    { development: false, platform: 'ios', expoHostUri: `${lanHost}:8097` },
    { development: true, platform: 'android', expoHostUri: '127.0.0.1:8096' },
    { development: true, platform: 'ios' },
  ]) assert.deepEqual(resolveKliniAiConnection({ endpoint, ...options }), { endpoint });
  assert.deepEqual(resolveKliniAiConnection({ development: true, platform: 'ios', expoHostUri: `${lanHost}:8097` }), { endpoint: undefined });
});

test('LAN resolution never trusts public hosts, malformed URIs or changes invalid endpoints', () => {
  for (const host of ['10.0.2.2', '172.16.0.1', '172.31.255.254', lanHost]) assert.equal(isPrivateKliniAiHost(host), true);
  for (const host of ['0.0.0.0', '8.8.8.8', '172.15.0.1', '172.32.0.1', '192.169.1.1', '192.168.001.1', '10.0.0.256', 'localhost', '192.168.1.1.evil']) assert.equal(isPrivateKliniAiHost(host), false);
  for (const expoHostUri of ['8.8.8.8:8097', `${lanHost}:0`, `${lanHost}:65536`, `user@${lanHost}:8097`, `${lanHost}:8097/path`, `${lanHost}:8097?x=y`, 'public.example:8097', '']) assert.deepEqual(resolveKliniAiConnection({ endpoint, development: true, platform: 'ios', expoHostUri }), { endpoint });
  for (const invalid of ['not a URL', `${endpoint}?x=y`, 'http://user:password@127.0.0.1:8098/chat', 'http://127.0.0.1:8097/chat', 'https://public.example/chat']) assert.deepEqual(resolveKliniAiConnection({ endpoint: invalid, development: true, platform: 'ios', expoHostUri: `${lanHost}:8097` }), { endpoint: invalid });
});

test('LAN URLs need the exact trusted host and retain all bridge restrictions', () => {
  assert.equal(validateKliniAiEndpoint(`http://${lanHost}:8098/chat`, true, lanHost), `http://${lanHost}:8098/chat`);
  for (const invalid of [`http://${lanHost}:8098/chat?x=y`, `http://${lanHost}:8098/chat#x`, `http://${lanHost}:8097/chat`, `http://${lanHost}:8098/other`, `http://user:secret@${lanHost}:8098/chat`, 'http://192.168.100.251:8098/chat', 'http://8.8.8.8:8098/chat']) assert.throws(() => validateKliniAiEndpoint(invalid, true, lanHost));
  assert.throws(() => validateKliniAiEndpoint(`http://${lanHost}:8098/chat`, true));
  assert.throws(() => validateKliniAiEndpoint(`http://${lanHost}:8098/chat`, false, lanHost));
});

test('the native LAN transport sends the development token as a header, never in chart data', async () => {
  let calls = 0;
  const service = createKliniAiService({ endpoint: `http://${lanHost}:8098/chat`, lanHost, development: true, developmentToken, fetchImpl: (async (url, init) => {
    calls++;
    assert.equal(url, `http://${lanHost}:8098/chat`);
    assert.equal(new Headers(init?.headers).get('X-Klini-Dev-Token'), developmentToken);
    assert.equal(String(init?.body).includes(developmentToken), false);
    assert.equal(init?.redirect, 'error');
    return new Response(JSON.stringify({ text: 'Conexión de prueba correcta.', action: null }));
  }) as typeof fetch });
  assert.equal((await service(input)).source, 'openai');
  assert.equal(calls, 1);
  const missingToken = createKliniAiService({ endpoint: `http://${lanHost}:8098/chat`, lanHost, development: true, fetchImpl: (async () => { throw new Error('Must not fetch'); }) as typeof fetch });
  await assert.rejects(missingToken(input), /Vuelve a abrir el proyecto en Expo Go/);
});

test('iOS fetch errors and expired development sessions show actionable errors without raw details', async () => {
  for (const cause of [new Error('fetch failed: Could not connect to the server.'), new Error('Network request failed'), new TypeError('Failed to fetch')]) {
    const service = createKliniAiService({ endpoint, development: true, fetchImpl: (async () => { throw cause; }) as typeof fetch });
    await assert.rejects(service(input), error => error instanceof Error && /misma red Wi-Fi/.test(error.message) && !/fetch failed|TypeError/.test(error.message));
  }
  const unauthorized = createKliniAiService({ endpoint, development: true, fetchImpl: (async () => new Response('{}', { status: 401 })) as typeof fetch });
  await assert.rejects(unauthorized(input), /Vuelve a abrir el proyecto en Expo Go/);
});
