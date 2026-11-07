import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoState } from '../src/domain/seed';
import { buildKliniAiContext, buildKliniAiOpenAiRequest, buildKliniAiWebSearchRequest, isSafeAiSourceUrl, parseKliniAiAnswer, parseKliniAiProviderResponse, parseKliniAiWebEvidence, sanitizeKliniAiWebQuery } from '../src/domain/kliniAi';

const sourceUrl = 'https://www.niaid.nih.gov/diseases-conditions/allergic-diseases';
const context = buildKliniAiContext(createDemoState(new Date(2026, 10, 1, 12)));
const completion = (answer: unknown) => ({ status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify(answer) }] }] });
function evidence(url = sourceUrl) {
  const text = 'Información general sobre alergias. (fuente)';
  return { status: 'completed', output: [
    { type: 'web_search_call', status: 'completed' },
    { type: 'message', role: 'assistant', content: [{ type: 'output_text', text, annotations: [{ type: 'url_citation', url, title: 'Allergic Diseases | NIAID', start_index: text.indexOf('(fuente)'), end_index: text.length }] }] },
  ] };
}

test('source URLs permit public HTTPS only, never credentials, IPs, local services or app schemes', () => {
  assert.equal(isSafeAiSourceUrl(sourceUrl), true);
  assert.equal(isSafeAiSourceUrl('https://medlineplus.gov/spanish/allergy.html'), true);
  for (const url of ['http://www.niaid.nih.gov/page', 'https://user:pass@www.niaid.nih.gov', 'https://127.0.0.1', 'https://[::1]', 'https://2130706433', 'https://0x7f000001', 'https://localhost', 'https://api.localhost', 'https://api.internal', 'https://server.local', 'file:///tmp/a', 'javascript:alert(1)', 'https://example.org:8098/chat', 'https://www.niaid.nih.gov\\@evil.com', 'https://bad host.com']) {
    assert.equal(isSafeAiSourceUrl(url), false, url);
  }
});

test('sources are built only from completed search annotations, deduplicated and mapped to inline IDs', () => {
  const result = parseKliniAiWebEvidence(evidence());
  assert.equal(result.text, 'Información general sobre alergias.  [1]');
  assert.deepEqual(result.sources, [{ id: '1', title: 'Allergic Diseases | NIAID', url: sourceUrl }]);
  const repeat = evidence();
  repeat.output.push(repeat.output[1]);
  assert.equal(parseKliniAiWebEvidence(repeat).sources.length, 1);
  for (const invalid of [{ status: 'incomplete', output: [] }, completion({ text: 'Inventé una fuente', sources: [{ id: '1', title: 'Fake', url: sourceUrl }] }), evidence('http://127.0.0.1/chat')]) assert.throws(() => parseKliniAiWebEvidence(invalid));
});

test('final synthesis cannot invent or omit citations or substitute model-authored source URLs', () => {
  const verified = parseKliniAiWebEvidence(evidence());
  const answer = parseKliniAiProviderResponse(completion({ text: 'Explicación educativa [1].', action: null, sources: [{ id: '1', title: 'Fake', url: 'https://untrusted.org' }] }), context, verified);
  assert.equal(answer.sources?.[0].url, sourceUrl);
  assert.throws(() => parseKliniAiProviderResponse(completion({ text: 'Explicación [99].', action: null }), context, verified));
  assert.throws(() => parseKliniAiProviderResponse(completion({ text: 'Explicación sin cita.', action: null }), context, verified));
  assert.throws(() => parseKliniAiProviderResponse(completion({ text: 'Fuente inventada [1].', action: null }), context));
  assert.throws(() => parseKliniAiAnswer({ text: 'OK', sources: [{ id: '1', title: 'Unsafe', url: 'http://localhost' }] }, context));
  assert.deepEqual(parseKliniAiAnswer(answer, context), answer);
  const secondSource = { id: '2', title: 'MedlinePlus', url: 'https://medlineplus.gov/spanish/allergy.html' };
  const grouped = parseKliniAiProviderResponse(completion({ text: 'Explicación [1, 2].', action: null }), context, { ...verified, sources: [...verified.sources, secondSource] });
  assert.equal(grouped.text, 'Explicación [1] [2].');
  assert.equal(grouped.sources?.length, 2);
  assert.throws(() => parseKliniAiProviderResponse(completion({ text: 'Explicación [1, 99].', action: null }), context, verified));
});

test('provider commentary is separate from the final structured answer', () => {
  const response = completion({ text: 'Explicación general válida.', action: null, webSearchQuery: null });
  const final = { ...response.output[0], phase: 'final_answer' };
  const commentary = { type: 'message', role: 'assistant', phase: 'commentary', content: [{ type: 'output_text', text: 'Voy a revisar la pregunta.' }] };
  assert.equal(parseKliniAiProviderResponse({ status: 'completed', output: [commentary, final] }, context).text, 'Explicación general válida.');
  assert.equal(parseKliniAiProviderResponse({ status: 'completed', output: [commentary, response.output[0]] }, context).text, 'Explicación general válida.');
});

test('web query removes known identifiers, contacts and individual measurements, while retaining the general topic', () => {
  const request = { question: 'Tengo alergia', history: [], context: { ...context, profile: { name: 'Sofía Martínez' } } };
  const query = sanitizeKliniAiWebQuery('Sofía Martínez sofia@correo.com 5551234567 glucosa 120 mg/dl alergia perros opciones actuales', request);
  assert.doesNotMatch(query, /sofia|martinez|correo|555|120|mg|dl/);
  assert.match(query, /alergia perros opciones actuales/);
  assert.equal(sanitizeKliniAiWebQuery('diabetes tipo 2 guías 2026 y covid-19', request), 'diabetes tipo 2 guias 2026 y covid-19');
  assert.throws(() => sanitizeKliniAiWebQuery('Sofía Martínez', request));
  const search = buildKliniAiWebSearchRequest(query, 'configured-model');
  assert.equal(search.tool_choice, 'required');
  assert.equal(search.tools[0].type, 'web_search');
  assert.equal(search.store, false);
  assert.equal(typeof search.input, 'string');
  assert.doesNotMatch(JSON.stringify(search), /records|appointments|medications|Sofía|Martínez/);
  const final = buildKliniAiOpenAiRequest(request, 'configured-model', parseKliniAiWebEvidence(evidence()));
  assert.deepEqual(final.text.format.schema.properties.webSearchQuery, { type: 'null' });
});
