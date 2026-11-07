import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createDemoState } from '../src/domain/seed';
import {
  buildKliniAiContext, buildKliniAiOpenAiRequest, parseKliniAiRequest, sanitizeKliniAiWebQuery,
} from '../src/domain/kliniAi';
import {
  AI_ATTACHMENT_MAX_BYTES, AI_ATTACHMENTS_MAX_BYTES, AI_REQUEST_ATTACHMENT_MAX_COUNT, AI_TEXT_ATTACHMENT_MAX_BYTES,
  parseAiAttachments, type AiAttachment, type AiAttachmentMimeType,
} from '../src/domain/kliniAiAttachments';
import { createKliniAiServer } from '../scripts/ai-server';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJ1sAAAAASUVORK5CYII=', 'base64');
const attachment = (mimeType: AiAttachmentMimeType = 'image/png', bytes: Uint8Array = png, id = 'upload-1', name = 'archivo.png'): AiAttachment => ({ id, name, mimeType, dataUri: `data:${mimeType};base64,${Buffer.from(bytes).toString('base64')}` });
const pdf = (length = 30) => { const bytes = Buffer.alloc(length, 32); bytes.write('%PDF-1.7\n'); return bytes; };
const request = (attachments?: AiAttachment[]) => ({ question: 'Explica el documento adjunto y consulta fuentes actuales.', history: [], context: buildKliniAiContext(createDemoState()), ...(attachments && { attachments }) });
const completion = (text: string, webSearchQuery: string | null = null) => ({ status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify({ text, action: null, webSearchQuery }) }] }] });
const post = (url: string, payload: unknown) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
function currentContent(payload: ReturnType<typeof buildKliniAiOpenAiRequest>) {
  const message = payload.input.at(-1);
  assert.ok(message);
  assert.equal(message.role, 'user');
  assert.ok(Array.isArray(message.content));
  return message.content;
}
async function listen(server: Server) {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/chat`;
}
async function close(server: Server) {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

test('portable attachment validation accepts supported signatures and safe UTF-8 without Buffer globals', () => {
  const cases = [
    attachment(), attachment('image/jpeg', Uint8Array.from([255, 216, 255, 224])),
    attachment('image/webp', Uint8Array.from([82, 73, 70, 70, 4, 0, 0, 0, 87, 69, 66, 80])),
    attachment('application/pdf', pdf(), 'pdf-1', 'Resultado.pdf'),
    attachment('text/plain', Buffer.from('Información del documento\nGlucosa: 98 mg/dL\tFecha: 2026\r\n🙂'), 'txt-1', 'nota.txt'),
  ];
  const original = globalThis.Buffer;
  try {
    (globalThis as unknown as { Buffer: unknown }).Buffer = undefined;
    for (const candidate of cases) assert.deepEqual(parseAiAttachments([candidate]), [candidate]);
    assert.deepEqual(parseAiAttachments(undefined), []);
    assert.deepEqual(parseAiAttachments([]), []);
  } finally { globalThis.Buffer = original; }
});

test('attachments reject unsupported types, remote/local URLs, MIME mismatches and malformed base64', () => {
  const valid = attachment();
  for (const dataUri of ['https://example.org/image.png', 'file:///private/image.png', 'content://private/1', 'data:image/png,plain', 'data:image/png;base64,', 'data:image/png;base64,AAAA\nAAAA', 'data:image/png;base64,@@==', 'data:image/png;base64,A===', 'data:image/png;base64,AA']) {
    assert.throws(() => parseAiAttachments([{ ...valid, dataUri }]));
  }
  for (const candidate of [
    { ...valid, mimeType: 'image/gif' }, { ...valid, mimeType: 'image/heic' },
    { ...valid, mimeType: 'application/pdf' }, attachment('image/png', pdf()),
    attachment('image/jpeg', png), attachment('image/webp', Buffer.from('not a webp file')),
  ]) assert.throws(() => parseAiAttachments([candidate]));
  for (const dataUri of ['data:text/plain;base64,YR==', 'data:text/plain;base64,YWF=']) assert.throws(() => parseAiAttachments([{ ...valid, mimeType: 'text/plain', dataUri }]));
});

test('attachment metadata is bounded and duplicate IDs cannot overwrite a selection', () => {
  const valid = attachment();
  for (const candidate of [{ ...valid, id: '' }, { ...valid, id: 'with spaces' }, { ...valid, name: '../document.png' }, { ...valid, name: 'C:\\private.png' }, { ...valid, name: 'line\nbreak.png' }, { ...valid, name: '' }, { ...valid, name: 'a'.repeat(161) }]) assert.throws(() => parseAiAttachments([candidate]));
  assert.throws(() => parseAiAttachments([valid, valid]));
  assert.throws(() => parseAiAttachments(Array.from({ length: 4 }, (_, index) => ({ ...valid, id: String(index) }))), /hasta 3/);
  assert.throws(() => parseAiAttachments(null));
  assert.throws(() => parseAiAttachments({}));
  assert.deepEqual(parseAiAttachments([{ ...valid, ignored: 'not part of the contract' }]), [valid]);
});

test('chat keeps its three-file limit while the bounded wire parser can accept twenty-three originals', () => {
  const files = Array.from({ length: AI_REQUEST_ATTACHMENT_MAX_COUNT }, (_, index) => attachment('application/pdf', pdf(), `wire-${index}`, `Resultado-${index}.pdf`));
  assert.equal(AI_REQUEST_ATTACHMENT_MAX_COUNT, 23);
  assert.throws(() => parseAiAttachments(files), /hasta 3/);
  assert.deepEqual(parseAiAttachments(files, { maxCount: AI_REQUEST_ATTACHMENT_MAX_COUNT }), files);
  assert.throws(() => parseAiAttachments([...files, { ...files[0], id: 'wire-overflow' }], { maxCount: AI_REQUEST_ATTACHMENT_MAX_COUNT }));
  assert.throws(() => parseAiAttachments(files, { maxCount: AI_REQUEST_ATTACHMENT_MAX_COUNT + 1 }));
});

test('more than three wire attachments require valid selected-record links and at most three unlinked chat files', () => {
  const state = createDemoState();
  state.records = Array.from({ length: 20 }, (_, index) => ({ id: `record-${index}`, type: 'Estudio', title: 'Estudio ficticio', date: '2026-11-01', doctorName: '', description: 'Sin cifras transcritas.' }));
  const files = Array.from({ length: 23 }, (_, index) => attachment('application/pdf', pdf(), `wire-${index}`, `Resultado-${index}.pdf`));
  const recordFiles = state.records.map((record, index) => ({ recordId: record.id, status: 'included', attachmentId: files[index].id }));
  const base = { ...request(), context: buildKliniAiContext(state), attachments: files, recordFiles };
  const parsed = parseKliniAiRequest(base);
  assert.equal(parsed.attachments?.length, 23);
  assert.deepEqual(parsed.recordFiles, recordFiles);
  const content = currentContent(buildKliniAiOpenAiRequest(parsed, 'test-model'));
  assert.equal(content.filter(part => part.type !== 'input_text').length, 23);
  assert.equal(content.length, 45); // 20 saved-record associations, 23 originals, metadata and question.
  assert.match(sanitizeKliniAiWebQuery('glucosa interpretación criterios actuales', parsed), /glucosa/);
  assert.throws(() => parseKliniAiRequest({ ...base, recordFiles: undefined }));
  assert.throws(() => parseKliniAiRequest({ ...base, recordFiles: [] }));
  assert.throws(() => parseKliniAiRequest({ ...base, recordFiles: recordFiles.slice(1) }));
  assert.throws(() => parseKliniAiRequest({ ...base, recordFiles: [{ ...recordFiles[0], recordId: 'unknown-record' }, ...recordFiles.slice(1)] }));
  assert.throws(() => parseKliniAiRequest({ ...base, recordFiles: [{ ...recordFiles[0], attachmentId: 'missing-file' }, ...recordFiles.slice(1)] }));
  assert.throws(() => parseKliniAiRequest({ ...base, attachments: [...files, { ...files[0], id: 'overflow' }] }));
});

test('decoded byte limits are exact, including aggregate and smaller TXT limits', () => {
  const large = attachment('application/pdf', pdf(AI_ATTACHMENT_MAX_BYTES), 'large-1', 'grande.pdf');
  assert.equal(parseAiAttachments([large]).length, 1);
  assert.throws(() => parseAiAttachments([attachment('application/pdf', pdf(AI_ATTACHMENT_MAX_BYTES + 1))]), /2 MB/);
  assert.equal(parseAiAttachments([large, { ...large, id: 'large-2' }]).length, 2);
  assert.equal(AI_ATTACHMENTS_MAX_BYTES, 2 * AI_ATTACHMENT_MAX_BYTES);
  assert.throws(() => parseAiAttachments([large, { ...large, id: 'large-2' }, attachment('application/pdf', pdf(), 'small-3')]), /4 MB/);
  assert.equal(parseAiAttachments([attachment('text/plain', Buffer.alloc(AI_TEXT_ATTACHMENT_MAX_BYTES, 65), 'text-1', 'nota.txt')]).length, 1);
  assert.throws(() => parseAiAttachments([attachment('text/plain', Buffer.alloc(AI_TEXT_ATTACHMENT_MAX_BYTES + 1, 65), 'text-1', 'nota.txt')]), /100 KB/);
});

test('TXT rejects binary controls, malformed sequences, overlong encoding and surrogate code points', () => {
  for (const bytes of [[0], [27], [127], [255], [0xC0, 0xAF], [0xE2, 0x82], [0xED, 0xA0, 0x80], [0xF4, 0x90, 0x80, 0x80], [0x80]]) assert.throws(() => parseAiAttachments([attachment('text/plain', Uint8Array.from(bytes), 'text-1', 'nota.txt')]));
});

test('Responses receives real image/file content and only attachment metadata in its JSON text', () => {
  const files = [attachment(), attachment('application/pdf', pdf(), 'pdf-1', 'Resultado'), attachment('text/plain', Buffer.from('Texto legible'), 'text-1', 'nota.txt')];
  const payload = parseKliniAiRequest(request(files));
  assert.deepEqual(payload.attachments, files);
  for (const evidence of [undefined, { text: 'Hallazgo [1].', sources: [{ id: '1', title: 'Fuente', url: 'https://www.nih.gov/' }] }]) {
    const provider = buildKliniAiOpenAiRequest(payload, 'test-model', evidence);
    const content = currentContent(provider);
    assert.equal(content.length, 5);
    assert.equal(content[1].type, 'input_image');
    assert.equal((content[1] as { image_url: string }).image_url, files[0].dataUri);
    assert.equal((content[1] as { detail?: string }).detail, 'high');
    assert.equal(content[2].type, 'input_file');
    assert.equal((content[2] as { file_data: string }).file_data, files[1].dataUri);
    assert.equal((content[2] as { filename: string }).filename, 'Resultado.pdf');
    assert.equal((content[2] as { detail?: string }).detail, 'high');
    assert.equal(content[3].type, 'input_file');
    assert.equal('detail' in content[3], false);
    const text = (content[0] as { text: string }).text;
    assert.doesNotMatch(text, /base64|dataUri/);
    const metadata = JSON.parse(text);
    assert.deepEqual(metadata.attachedFiles.map((item: { name: string }) => item.name), files.map(file => file.name));
    assert.equal('question' in metadata, false);
    assert.equal('history' in metadata, false);
    assert.deepEqual(content.at(-1), { type: 'input_text', text: payload.question });
  }
});

test('file-bearing web queries remove file identifiers and individual numbers', () => {
  const payload = request([attachment('text/plain', Buffer.from('Documento privado, resultado 105.5 mg/dL'), 'private-file-id', 'CanarioPrivado.txt')]);
  const query = sanitizeKliniAiWebQuery('CanarioPrivado.txt private-file-id glucosa en ayuno 105.5 mg/dL criterios 2026', payload);
  assert.match(query, /glucosa/);
  assert.doesNotMatch(query, /canario|privado|private|file|105|2026|mg|dl|txt|\d/i);
  const medicalName = request([attachment('text/plain', Buffer.from('Documento de prueba'), 'uploaded-document', 'Glucosa en ayuno.pdf')]);
  assert.match(sanitizeKliniAiWebQuery('interpretacion glucosa en ayuno criterios actuales', medicalName), /glucosa en ayuno/);
});

test('server accepts a valid upload above the old 64 KiB limit and sends it as image content', async () => {
  const uploaded = Buffer.alloc(100000, 0); png.copy(uploaded);
  const file = attachment('image/png', uploaded);
  let called = false;
  const server = createKliniAiServer({ apiKey: 'fake-key', model: 'test-model', fetchImpl: (async (_url, init) => {
    called = true;
    const body = JSON.parse(String(init?.body));
    const content = body.input.at(-1).content;
    assert.ok(Array.isArray(content));
    assert.equal(content[1].type, 'input_image');
    assert.equal(content[1].image_url, file.dataUri);
    assert.deepEqual(content.at(-1), { type: 'input_text', text: request([file]).question });
    return new Response(JSON.stringify(completion('Recibí el archivo de prueba.')));
  }) as typeof fetch });
  const url = await listen(server);
  try {
    assert.equal((await post(url, request([file]))).status, 200);
    assert.equal(called, true);
    assert.equal((await post(url, { ...request(), unexpected: 'x'.repeat(66000) })).status, 413);
  } finally { await close(server); }
});

test('server rejects forged file payloads before contacting the provider', async () => {
  let calls = 0;
  const server = createKliniAiServer({ apiKey: 'fake-key', model: 'test-model', fetchImpl: (async () => { calls++; return new Response('{}'); }) as typeof fetch });
  const url = await listen(server);
  try {
    const invalid = { ...attachment(), dataUri: 'https://private.example.org/results.png' };
    assert.equal((await post(url, request([invalid]))).status, 400);
    assert.equal(calls, 0);
  } finally { await close(server); }
});

test('three-stage retrieval excludes attachments, their names and extracted content from its tool request', async () => {
  const files = [attachment('text/plain', Buffer.from('TextoPacienteCanario 105.5 mg/dL'), 'file-canary-id', 'PacienteCanario.txt')];
  const bodies: Record<string, unknown>[] = [];
  const server = createKliniAiServer({ apiKey: 'fake-key', model: 'test-model', fetchImpl: (async (_url, init) => {
    const body = JSON.parse(String(init?.body)); bodies.push(body);
    if (bodies.length === 1) return new Response(JSON.stringify(completion('Consultaré información general.', 'PacienteCanario.txt glucosa ayuno criterios 105.5 mg/dL')));
    if (bodies.length === 2) return new Response(JSON.stringify({ status: 'completed', output: [
      { type: 'web_search_call', status: 'completed' },
      { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Información general [fuente]', annotations: [{ type: 'url_citation', start_index: 20, end_index: 28, url: 'https://www.nih.gov/', title: 'NIH' }] }] },
    ] }));
    return new Response(JSON.stringify(completion('Esta es una explicación general con su fuente [1].')));
  }) as typeof fetch });
  const url = await listen(server);
  const payload = { ...request(files), history: [
    { role: 'user', text: 'HISTORY_USER_CANARY: revisa el documento adjunto.' },
    { role: 'assistant', text: 'HISTORY_ASSISTANT_CANARY: respuesta anterior de prueba.' },
  ] };
  try {
    const response = await post(url, payload);
    assert.equal(response.status, 200);
    assert.equal(bodies.length, 3);
    const lookup = JSON.stringify(bodies[1]);
    assert.doesNotMatch(lookup, /PacienteCanario|TextoPacienteCanario|base64|dataUri|input_file|105|mg\/dL|attachedFiles|HISTORY_USER_CANARY|HISTORY_ASSISTANT_CANARY/i);
    for (const index of [0, 2]) {
      const turns = bodies[index].input as { role: string; phase?: string; content: string | { type: string; text?: string }[] }[];
      assert.deepEqual(turns.map(turn => turn.role), ['user', 'assistant', 'user']);
      assert.equal(turns[0].content, payload.history[0].text);
      assert.equal(turns[1].content, payload.history[1].text);
      assert.equal(turns[1].phase, 'final_answer');
      const content = turns.at(-1)?.content;
      assert.ok(Array.isArray(content));
      assert.equal(content[1].type, 'input_file');
      assert.deepEqual(content.at(-1), { type: 'input_text', text: payload.question });
      const metadata = JSON.parse(content[0].text || '');
      assert.equal('question' in metadata, false);
      assert.equal('history' in metadata, false);
      if (index === 0) assert.equal('webEvidence' in metadata, false);
      else {
        assert.deepEqual(metadata.webEvidence.sources, [{ id: '1', title: 'NIH', url: 'https://www.nih.gov/' }]);
        assert.match(metadata.webEvidence.text, /\[1\]/);
      }
    }
    assert.equal((await response.json()).sources.length, 1);
  } finally { await close(server); }
});
