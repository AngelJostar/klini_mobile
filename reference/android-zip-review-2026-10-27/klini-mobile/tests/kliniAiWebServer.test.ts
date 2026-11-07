import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createDemoState } from '../src/domain/seed';
import { buildKliniAiContext } from '../src/domain/kliniAi';
import { createKliniAiServer } from '../scripts/ai-server';

const query = 'alergia perros humanos inmunoterapia guías actuales';
const sourceUrl = 'https://www.niaid.nih.gov/diseases-conditions/allergic-diseases';
const completion = (text: string, webSearchQuery: string | null = null) => ({
  status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify({ text, action: null, webSearchQuery }) }] }],
});
const searchEvidence = () => {
  const statement = 'Información educativa sobre enfermedades alérgicas.';
  const text = `${statement} [fuente]`;
  return {
    status: 'completed', output: [
      { id: 'search-test-only', type: 'web_search_call', status: 'completed', action: { type: 'search', queries: [query] } },
      { type: 'message', role: 'assistant', content: [{ type: 'output_text', text, annotations: [{ type: 'url_citation', start_index: statement.length + 1, end_index: text.length, url: sourceUrl, title: 'Allergic Diseases | NIAID' }] }] },
    ],
  };
};
const requestPayload = () => {
  const value = createDemoState(new Date(2026, 10, 1, 12));
  value.profile.name = 'Paciente Privado Canary';
  const context = buildKliniAiContext(value);
  context.records = [{ id: 'private-record-id', title: 'Registro privado canario', date: '2026-11-01', type: 'Análisis', doctorName: 'Médica privada canaria', institution: 'Institución privada canaria', text: 'Texto clínico privado canario' }];
  return { question: '¿Qué opciones generales hay para la alergia a perros? Consulta fuentes actuales.', history: [{ role: 'user', text: 'Historial privado canario' }], context };
};
const providerResponse = (body: unknown) => new Response(JSON.stringify(body));
const fakeFetch = (handler: (body: Record<string, unknown>, init: RequestInit) => Promise<Response>) => (async (_url: string | URL | Request, init?: RequestInit) => {
  assert.ok(init);
  return handler(JSON.parse(String(init.body)), init);
}) as typeof fetch;
async function listen(server: Server): Promise<string> {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/chat`;
}
async function close(server: Server) {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
const post = (url: string, signal?: AbortSignal) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestPayload()), signal });

test('general answers without retrieval make one provider call and expose web capability in health', async () => {
  let calls = 0;
  const server = createKliniAiServer({ apiKey: 'fake-server-key', model: 'test-model', fetchImpl: fakeFetch(async () => {
    calls++;
    return providerResponse(completion('Puedo explicar información general aunque no haya un estudio registrado.'));
  }) });
  const url = await listen(server);
  try {
    const health = await (await fetch(url.replace('/chat', '/health'))).json();
    assert.equal(health.webSearch, true);
    const response = await post(url);
    assert.equal(response.status, 200);
    const answer = await response.json();
    assert.equal(answer.source, 'openai');
    assert.equal(answer.sources?.length || 0, 0);
    assert.equal(calls, 1);
  } finally { await close(server); }
});

test('web retrieval is isolated from the chart and history; final answer exposes only verified citations', async () => {
  const bodies: Record<string, unknown>[] = [];
  const signals: (AbortSignal | null | undefined)[] = [];
  const server = createKliniAiServer({ apiKey: 'fake-server-key', model: 'test-model', fetchImpl: fakeFetch(async (body, init) => {
    bodies.push(body); signals.push(init.signal);
    if (bodies.length === 1) return providerResponse(completion('Voy a verificar fuentes actuales.', query));
    if (bodies.length === 2) return providerResponse(searchEvidence());
    return providerResponse(completion('La información general se explica con una fuente consultada [1].'));
  }) });
  const url = await listen(server);
  try {
    const response = await post(url);
    assert.equal(response.status, 200);
    const answer = await response.json();
    assert.equal(bodies.length, 3);
    assert.ok(signals.every(signal => signal === signals[0]));
    const currentMessage = (bodies[0].input as { role: string; content: unknown }[]).at(-1)!;
    assert.equal(currentMessage.role, 'user');
    assert.ok(Array.isArray(currentMessage.content));
    const initialInput = JSON.parse(currentMessage.content[0].text);
    assert.deepEqual(initialInput.context.records, []);
    assert.equal(initialInput.context.profile.name, '');
    const lookup = JSON.stringify(bodies[1]);
    assert.match(lookup, /web_search/);
    assert.doesNotMatch(lookup, /canari|Canary|private-record-id|Paciente Privado|profile|appointments|medications/i);
    assert.match(JSON.stringify(bodies[2]), /niaid\.nih\.gov/);
    assert.equal(answer.source, 'openai');
    assert.equal(answer.sources.length, 1);
    assert.equal(answer.sources[0].id, '1');
    assert.equal(answer.sources[0].url, sourceUrl);
    assert.match(answer.text, /\[1\]/);
  } finally { await close(server); }
});

test('a missing or unknown synthesis citation is regenerated once using the same verified evidence', async () => {
  for (const invalidText of ['Respuesta sin referencias.', 'Respuesta con referencia inventada [9].']) {
    const bodies: Record<string, unknown>[] = [];
    const server = createKliniAiServer({ apiKey: 'fake-server-key', model: 'test-model', fetchImpl: fakeFetch(async body => {
      bodies.push(body);
      if (bodies.length === 1) return providerResponse(completion('Verificaré fuentes.', query));
      if (bodies.length === 2) return providerResponse(searchEvidence());
      return providerResponse(completion(bodies.length === 3 ? invalidText : 'Explicación general respaldada por la evidencia [1].'));
    }) });
    const url = await listen(server);
    try {
      const response = await post(url);
      assert.equal(response.status, 200);
      const answer = await response.json();
      assert.equal(answer.sources[0].url, sourceUrl);
      assert.match(answer.text, /\[1\]/);
      assert.equal(bodies.length, 4);
      assert.deepEqual(bodies[3].input, bodies[2].input);
      assert.equal(bodies[3].store, false);
      assert.equal(bodies[3].tools, undefined);
      assert.doesNotMatch(JSON.stringify(bodies[3]), new RegExp(invalidText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    } finally { await close(server); }
  }
});

test('repeated invalid synthesis citations fail safely after a single repair', async () => {
  let calls = 0;
  const server = createKliniAiServer({ apiKey: 'fake-server-key', model: 'test-model', fetchImpl: fakeFetch(async () => {
    calls++;
    if (calls === 1) return providerResponse(completion('Verificaré fuentes.', query));
    if (calls === 2) return providerResponse(searchEvidence());
    return providerResponse(completion('INVALID ANSWER WITHOUT SOURCES'));
  }) });
  const url = await listen(server);
  try {
    const response = await post(url);
    assert.equal(response.status, 502);
    const answer = await response.json();
    assert.equal(answer.code, 'web_search_unavailable');
    assert.doesNotMatch(JSON.stringify(answer), /INVALID|fake-server-key/);
    assert.equal(calls, 4);
  } finally { await close(server); }
});

test('failed or uncited retrieval gives a safe actionable error without a synthesized fallback', async () => {
  for (const result of [new Response('PRIVATE PROVIDER FAILURE', { status: 500 }), new Response('PRIVATE TOOL PERMISSION FAILURE', { status: 403 }), providerResponse(completion('Sin fuentes verificadas.'))]) {
    let calls = 0;
    const server = createKliniAiServer({ apiKey: 'fake-server-key', model: 'test-model', fetchImpl: fakeFetch(async () => ++calls === 1 ? providerResponse(completion('Verificaré fuentes.', query)) : result) });
    const url = await listen(server);
    try {
      const response = await post(url);
      assert.equal(response.status, 502);
      const answer = await response.json();
      assert.equal(answer.code, 'web_search_unavailable');
      assert.match(answer.error, /internet/);
      assert.doesNotMatch(JSON.stringify(answer), /PRIVATE|fake-server-key/);
      assert.equal(calls, 2);
    } finally { await close(server); }
  }
});

test('an identifying search plan is rejected before any tool-bearing provider request', async () => {
  let calls = 0;
  const server = createKliniAiServer({ apiKey: 'fake-server-key', model: 'test-model', fetchImpl: fakeFetch(async () => {
    calls++;
    return providerResponse(completion('Buscaré información.', 'Paciente Privado Canary'));
  }) });
  const url = await listen(server);
  try {
    const response = await post(url);
    assert.equal(response.status, 502);
    assert.equal((await response.json()).code, 'web_search_unavailable');
    assert.equal(calls, 1);
  } finally { await close(server); }
});

test('a general answer cannot invent citation markers without a verified search', async () => {
  let calls = 0;
  const server = createKliniAiServer({ apiKey: 'fake-server-key', model: 'test-model', fetchImpl: fakeFetch(async () => {
    calls++;
    return providerResponse(completion('Esta supuesta fuente nunca se consultó [1].'));
  }) });
  const url = await listen(server);
  try {
    const response = await post(url);
    assert.equal(response.status, 502);
    assert.equal(calls, 1);
    assert.doesNotMatch(await response.text(), /supuesta fuente/);
  } finally { await close(server); }
});

test('the shared deadline aborts retrieval rather than starting a synthesis after timeout', async () => {
  let calls = 0;
  let retrievalAborted = false;
  const server = createKliniAiServer({ apiKey: 'fake-server-key', model: 'test-model', providerTimeoutMs: 40, fetchImpl: fakeFetch(async (_body, init) => {
    calls++;
    if (calls === 1) return providerResponse(completion('Verificaré fuentes.', query));
    return new Promise<Response>((_resolve, reject) => init.signal?.addEventListener('abort', () => {
      retrievalAborted = true;
      reject(new Error('PRIVATE TIMEOUT DETAIL'));
    }, { once: true }));
  }) });
  const url = await listen(server);
  try {
    const response = await post(url);
    assert.equal(response.status, 504);
    assert.equal(retrievalAborted, true);
    assert.equal(calls, 2);
    assert.doesNotMatch(await response.text(), /PRIVATE/);
  } finally { await close(server); }
});
