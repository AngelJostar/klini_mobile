import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request as httpRequest, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createDemoState } from '../src/domain/seed';
import { buildKliniAiContext } from '../src/domain/kliniAi';
import { createKliniAiServer, validateKliniAiLanConfiguration } from '../scripts/ai-server';

const lanHost = '192.168.100.250';
const developmentToken = 'FAKE_ONLY_UNIT_TESTS_1234567890-abc';
const payload = () => ({ question: 'Hola', history: [], context: buildKliniAiContext(createDemoState(new Date(2026, 10, 2, 12))) });
const providerResponse = () => new Response(JSON.stringify({ status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify({ text: 'Respuesta de prueba local.', action: null }) }] }] }));
async function listen(server: Server): Promise<number> {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  return (server.address() as AddressInfo).port;
}
async function close(server: Server) {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
async function request(port: number, { host = '127.0.0.1', token, origin, method = 'POST', path = '/chat' }: {
  host?: string; token?: string; origin?: string; method?: string; path?: string;
} = {}): Promise<{ status: number; body: string; headers: Record<string, string | string[] | undefined> }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest({ hostname: '127.0.0.1', port, path, method, headers: {
      Host: `${host}:${port}`, 'Content-Type': 'application/json', ...(token && { 'X-Klini-Dev-Token': token }), ...(origin && { Origin: origin }),
    } }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode || 0, body, headers: response.headers }));
    });
    req.on('error', reject);
    req.end(method === 'POST' ? JSON.stringify(payload()) : undefined);
  });
}

test('LAN requires one canonical private IPv4 address and a bounded URL-safe local token', () => {
  assert.deepEqual(validateKliniAiLanConfiguration(), {});
  for (const host of ['10.0.0.1', '172.16.0.1', '172.31.255.254', lanHost]) assert.deepEqual(validateKliniAiLanConfiguration(host, developmentToken), { lanHost: host, developmentToken });
  for (const host of ['0.0.0.0', '127.0.0.1', 'localhost', 'example.invalid', '8.8.8.8', '172.15.0.1', '172.32.0.1', '192.169.0.1', '169.254.1.2', '192.168.001.1', '192.168.1.256', '192.168.1.1:8098', '::1', '::ffff:192.168.1.1', ' 192.168.1.1']) assert.throws(() => validateKliniAiLanConfiguration(host, developmentToken), /IPv4 privada/);
  for (const token of [undefined, '', 'short', 'x'.repeat(257), 'x'.repeat(31) + '/', 'x'.repeat(31) + ' ']) assert.throws(() => createKliniAiServer({ apiKey: '', model: '', lanHost, developmentToken: token }), /token de desarrollo válido/);
});

test('default loopback behavior stays usable without a token and rejects unconfigured LAN hosts', async () => {
  let calls = 0;
  const server = createKliniAiServer({ apiKey: 'fake-server-key', model: 'test-model', fetchImpl: (async () => { calls++; return providerResponse(); }) as typeof fetch });
  const port = await listen(server);
  try {
    assert.equal((await request(port, { host: lanHost, token: developmentToken })).status, 403);
    assert.equal(calls, 0);
    const result = await request(port);
    assert.equal(result.status, 200);
    assert.equal(JSON.parse(result.body).source, 'openai');
    assert.equal(calls, 1);
  } finally { await close(server); }
});

test('configured LAN accepts only its exact host, token and existing web origin', async () => {
  let calls = 0;
  const server = createKliniAiServer({ apiKey: 'fake-server-key', model: 'test-model', lanHost, developmentToken, fetchImpl: (async () => { calls++; return providerResponse(); }) as typeof fetch });
  const port = await listen(server);
  try {
    for (const token of [undefined, 'wrong', 'x'.repeat(developmentToken.length), `${developmentToken},${developmentToken}`]) {
      const response = await request(port, { host: lanHost, token });
      assert.equal(response.status, 401);
      assert.doesNotMatch(response.body, /FAKE_ONLY|fake-server-key/);
    }
    assert.equal((await request(port, { host: '192.168.100.251', token: developmentToken })).status, 403);
    assert.equal((await request(port, { host: lanHost, token: developmentToken, origin: 'http://192.168.100.250:8097' })).status, 403);
    assert.equal((await request(port, { host: lanHost, token: developmentToken, origin: 'https://external.invalid' })).status, 403);
    assert.equal(calls, 0);
    const preflight = await request(port, { host: lanHost, origin: 'http://127.0.0.1:8096', method: 'OPTIONS' });
    assert.equal(preflight.status, 204);
    assert.match(String(preflight.headers['access-control-allow-headers']), /X-Klini-Dev-Token/);
    const health = await request(port, { host: lanHost, method: 'GET', path: '/health' });
    assert.equal(health.status, 200);
    assert.doesNotMatch(health.body, /FAKE_ONLY|fake-server-key/);
    assert.equal(calls, 0);
    assert.equal((await request(port, { host: lanHost, token: developmentToken })).status, 200);
    assert.equal((await request(port, { host: lanHost, token: developmentToken, origin: 'http://127.0.0.1:8096' })).status, 200);
    assert.equal((await request(port)).status, 200);
    assert.equal(calls, 3);
  } finally { await close(server); }
});

test('a LAN socket still requires its token when the caller forges a loopback Host', async () => {
  let calls = 0;
  const server = createKliniAiServer({ apiKey: 'fake-server-key', model: 'test-model', lanHost, developmentToken, fetchImpl: (async () => { calls++; return providerResponse(); }) as typeof fetch });
  // The test runs on loopback without binding a real LAN interface. Override
  // only the server-side local address to exercise the second guard directly.
  server.prependListener('request', incoming => { Object.defineProperty(incoming.socket, 'localAddress', { value: lanHost, configurable: true }); });
  const port = await listen(server);
  try {
    assert.equal((await request(port)).status, 401);
    assert.equal(calls, 0);
    assert.equal((await request(port, { token: developmentToken })).status, 200);
    assert.equal(calls, 1);
  } finally { await close(server); }
});

test('the two interface listeners share the provider concurrency guard', async () => {
  let calls = 0;
  let release: (() => void) | undefined;
  const server = createKliniAiServer({ apiKey: 'fake-server-key', model: 'test-model', lanHost, developmentToken, fetchImpl: (async () => {
    calls++;
    await new Promise<void>(resolve => { release = resolve; });
    return providerResponse();
  }) as typeof fetch });
  const deviceServer = createServer((incoming, response) => server.emit('request', incoming, response));
  const port = await listen(server);
  const devicePort = await listen(deviceServer);
  try {
    const first = request(port);
    for (let count = 0; count < 100 && !calls; count++) await new Promise(resolve => setTimeout(resolve, 2));
    assert.equal(calls, 1);
    assert.equal((await request(devicePort, { host: lanHost, token: developmentToken })).status, 429);
    assert.equal(calls, 1);
    release?.();
    assert.equal((await first).status, 200);
  } finally { release?.(); await close(deviceServer); await close(server); }
});

test('LAN opt-in does not permit the development server in production', () => {
  const previous = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    assert.throws(() => createKliniAiServer({ apiKey: '', model: '', lanHost, developmentToken }), /solo está disponible para desarrollo local/);
  } finally {
    if (previous === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV');
    else process.env.NODE_ENV = previous;
  }
});
