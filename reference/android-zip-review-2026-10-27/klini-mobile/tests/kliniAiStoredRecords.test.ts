import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { PDFDocument } from 'pdf-lib';
import { createKliniAiServer } from '../scripts/ai-server';
import { createAiSubscription } from '../src/domain/aiSubscription';
import {
  buildKliniAiContext, buildKliniAiOpenAiRequest, parseKliniAiRequest, sanitizeKliniAiWebQuery,
  type AiMessage, type AiRequest,
} from '../src/domain/kliniAi';
import { AI_ATTACHMENT_MAX_BYTES, AI_REQUEST_ATTACHMENT_MAX_COUNT, AI_TEXT_ATTACHMENT_MAX_BYTES, type AiAttachment, type AiAttachmentMimeType } from '../src/domain/kliniAiAttachments';
import { createDemoState } from '../src/domain/seed';
import type { AppState, Attachment, ClinicalRecord } from '../src/domain/types';
import { createKliniAiService } from '../src/services/kliniAi';

const endpoint = 'http://127.0.0.1:8098/chat';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJ1sAAAAASUVORK5CYII=', 'base64');
const pdfBytes = (length = 40) => { const bytes = Buffer.alloc(length, 32); bytes.write('%PDF-1.7\n'); return bytes; };
async function clinicalPdf(): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.addPage([420, 200]).drawText('SOLO PRUEBA DE SOFTWARE. LDL ficticio: 112 mg/dL.', { x: 20, y: 140, size: 12 });
  return document.save({ useObjectStreams: false });
}
const upload = (id: string, mimeType: AiAttachmentMimeType = 'text/plain', bytes: Uint8Array = Buffer.from('LDL ficticio: 112 mg/dL.')): AiAttachment => ({
  id, name: `${id}.${mimeType === 'application/pdf' ? 'pdf' : mimeType === 'text/plain' ? 'txt' : 'png'}`, mimeType,
  dataUri: `data:${mimeType};base64,${Buffer.from(bytes).toString('base64')}`,
});
const savedFile = (name: string, mimeType = 'text/plain', uri = `file:///synthetic-only/${encodeURIComponent(name)}`): Attachment => ({ name, mimeType, uri });
const record = (id: string, patch: Partial<ClinicalRecord> = {}): ClinicalRecord => ({
  id, type: 'Estudio', title: 'Perfil de lípidos', date: '2026-11-02', doctorName: 'Profesional de prueba',
  description: 'Texto del historial: colesterol total ficticio 190 mg/dL.', attachment: savedFile(`${id}.txt`), ...patch,
});
function stateWith(records: ClinicalRecord[]): AppState {
  const state = createDemoState();
  state.profile = { ...state.profile, id: 'synthetic-profile', name: 'Perfil de prueba' };
  state.aiSubscription = createAiSubscription(true);
  state.records = records;
  state.appointments = [];
  state.medications = [];
  return state;
}
type ReadAttachment = (attachment: Attachment, signal?: AbortSignal) => Promise<AiAttachment>;
function harness(readRecordAttachment?: ReadAttachment, options: { timeoutMs?: number; endpoint?: string } = {}) {
  const requests: AiRequest[] = [];
  const service = createKliniAiService({
    endpoint, development: true, readRecordAttachment, ...options,
    fetchImpl: (async (_url, init) => {
      requests.push(JSON.parse(String(init?.body)) as AiRequest);
      return new Response(JSON.stringify({ text: 'Respuesta de prueba, sin consultar proveedores.', action: null }));
    }) as typeof fetch,
  });
  return { service, requests };
}
const input = (state: AppState, question = 'Revisa mi último estudio de lípidos', history: AiMessage[] = []) => ({ state, question, history });
function currentContent(payload: ReturnType<typeof buildKliniAiOpenAiRequest>) {
  const message = payload.input.at(-1);
  assert.ok(message);
  assert.equal(message.role, 'user');
  assert.ok(Array.isArray(message.content));
  return message.content;
}

test('saved result files supplement clinical text with real PDF, image and TXT content and a record link', async () => {
  const cases: [AiAttachmentMimeType, Buffer][] = [
    ['application/pdf', pdfBytes()], ['image/png', png], ['text/plain', Buffer.from('LDL ficticio: 112 mg/dL.')],
  ];
  for (const [mimeType, bytes] of cases) {
    const current = record('current', { attachment: savedFile('Resultado de prueba', mimeType) });
    const older = record('older', { date: '2026-10-01' });
    const unrelated = record('unrelated', { title: 'Revisión dental', type: 'Consulta', description: 'Encías de prueba.' });
    const file = upload('stored-result', mimeType, bytes);
    const reads: Attachment[] = [];
    const { service, requests } = harness(async candidate => { reads.push(candidate); return file; });
    assert.equal((await service(input(stateWith([older, unrelated, current])))).source, 'openai');
    assert.deepEqual(reads, [current.attachment]);
    assert.equal(requests.length, 1);
    const request = requests[0];
    assert.deepEqual(request.context.records.map(item => item.id), ['current']);
    assert.match(request.context.records[0].text, /190 mg\/dL/);
    assert.deepEqual(request.attachments, [file]);
    assert.deepEqual(request.recordFiles, [{ recordId: 'current', status: 'included', attachmentId: file.id }]);
    assert.doesNotMatch(JSON.stringify(request), /file:\/\/\/|synthetic-only|"uri"/);

    const provider = buildKliniAiOpenAiRequest(request, 'synthetic-model');
    const content = currentContent(provider);
    assert.equal(content.length, 4);
    const metadata = JSON.parse((content[0] as { text: string }).text);
    assert.equal('question' in metadata, false);
    assert.equal('history' in metadata, false);
    assert.deepEqual(content.at(-1), { type: 'input_text', text: request.question });
    assert.deepEqual(metadata.recordFiles, request.recordFiles);
    assert.deepEqual(metadata.attachedFiles, [{ id: file.id, name: file.name, mimeType, recordIds: ['current'] }]);
    assert.doesNotMatch(JSON.stringify(metadata), /base64|dataUri|file:\/\/\/|synthetic-only/);
    assert.equal(content[1].type, 'input_text');
    assert.deepEqual(JSON.parse((content[1] as { text: string }).text), { savedOriginal: {
      attachmentId: file.id, name: file.name,
      records: [{ id: current.id, title: current.title, date: current.date, manualText: current.description }],
    } });
    const original = content[2];
    if (mimeType.startsWith('image/')) {
      assert.equal(original.type, 'input_image');
      assert.equal((original as { image_url: string }).image_url, file.dataUri);
      assert.equal((original as { detail?: string }).detail, 'high');
    } else {
      assert.equal(original.type, 'input_file');
      assert.equal((original as { file_data: string }).file_data, file.dataUri);
      if (mimeType === 'application/pdf') assert.equal((original as { detail?: string }).detail, 'high');
      else assert.equal('detail' in original, false);
    }
  }
});

test('text-only selected records remain usable without inventing an attached file', async () => {
  const state = stateWith([record('text-only', { attachment: undefined, description: 'LDL ficticio: 113 mg/dL.' })]);
  let reads = 0;
  const { service, requests } = harness(async () => { reads++; throw new Error('No file should be read'); });
  await service(input(state));
  assert.equal(reads, 0);
  assert.match(requests[0].context.records[0].text, /113 mg\/dL/);
  assert.deepEqual(requests[0].attachments ?? [], []);
  assert.deepEqual(requests[0].recordFiles ?? [], []);
});

test('explicit chat files keep priority without restricting saved originals to three attachments', async () => {
  const state = stateWith([record('newest'), record('next', { date: '2026-11-01' }), record('oldest', { date: '2026-10-31' })]);
  const explicit = upload('explicit-file');
  const reads: string[] = [];
  const { service, requests } = harness(async candidate => { reads.push(candidate.name); return upload(candidate.name.replace('.txt', '')); });
  await service({ ...input(state, 'Revisa mi historial completo'), attachments: [explicit] });
  assert.deepEqual(requests[0].attachments?.map(file => file.id), ['explicit-file', 'newest', 'next', 'oldest']);
  assert.deepEqual(reads, ['newest.txt', 'next.txt', 'oldest.txt']);
  assert.deepEqual(requests[0].recordFiles, [
    { recordId: 'newest', status: 'included', attachmentId: 'newest' },
    { recordId: 'next', status: 'included', attachmentId: 'next' },
    { recordId: 'oldest', status: 'included', attachmentId: 'oldest' },
  ]);
});

test('up to twenty selected saved originals and three explicit chat files fit the wire contract', async () => {
  const records = Array.from({ length: 25 }, (_, index) => record(`saved-${index + 1}`, { date: `2026-11-${String(index + 1).padStart(2, '0')}` }));
  const explicit = [upload('explicit-one'), upload('explicit-two'), upload('explicit-three')];
  const reads: string[] = [];
  const { service, requests } = harness(async candidate => { reads.push(candidate.name); return upload(candidate.name.replace('.txt', '')); });
  await service({ ...input(stateWith(records), 'Revisa mi historial completo'), attachments: explicit });
  const request = requests[0];
  assert.equal(reads.length, 20);
  assert.equal(request.context.records.length, 20);
  assert.equal(request.recordFiles?.length, 20);
  assert.equal(request.recordFiles?.every(file => file.status === 'included'), true);
  assert.equal(request.attachments?.length, AI_REQUEST_ATTACHMENT_MAX_COUNT);
  assert.deepEqual(request.attachments?.slice(0, 3), explicit);
  assert.deepEqual(reads, Array.from({ length: 20 }, (_, index) => `saved-${25 - index}.txt`));
  assert.equal(currentContent(buildKliniAiOpenAiRequest(request, 'synthetic-model')).length, 45);
});

test('a recent lab request reads the original even when twenty-five newer unrelated notes exist', async () => {
  const notes = Array.from({ length: 25 }, (_, index) => record(`note-${index}`, {
    type: 'Nota', title: 'Nota dental', date: `2026-11-${String(index + 1).padStart(2, '0')}`,
    description: 'Revisión dental de prueba.',
  }));
  const study = record('older-study', { date: '2026-01-01', description: 'Documento pendiente de lectura; sin valores transcritos.', attachment: savedFile('older-lab.pdf', 'application/pdf') });
  const pdf = upload('older-original', 'application/pdf', await clinicalPdf());
  const state = stateWith([...notes, study]);
  assert.equal(buildKliniAiContext(state).records.some(item => item.id === study.id), false);
  const reads: string[] = [];
  const { service, requests } = harness(async candidate => { reads.push(candidate.name); return pdf; });
  await service(input(state, 'Revisa mi último estudio'));
  assert.deepEqual(reads, ['older-lab.pdf']);
  assert.deepEqual(requests[0].context.records.map(item => item.id), ['older-study']);
  assert.deepEqual(requests[0].attachments, [pdf]);
  assert.equal((await PDFDocument.load(Buffer.from(pdf.dataUri.split(',')[1], 'base64'))).getPageCount(), 1);
});

test('broad clinical analysis requests read all selected original PDFs and reread them on an attachment followup', async () => {
  const bytes = await clinicalPdf();
  const studies = Array.from({ length: 5 }, (_, index) => record(`lab-${index}`, {
    date: `2026-11-${String(10 - index).padStart(2, '0')}`, title: `Análisis clínico de prueba ${index + 1}`,
    description: 'Documento pendiente de lectura; sin resultados numéricos en el texto.',
    attachment: savedFile(`original-${index}.pdf`, 'application/pdf'),
  }));
  const dental = record('dental', { type: 'Consulta', title: 'Revisión dental', date: '2026-11-11', description: 'Nota dental de prueba.' });
  const reads: string[] = [];
  const { service, requests } = harness(async candidate => { reads.push(candidate.name); return upload(candidate.name.replace('.pdf', ''), 'application/pdf', bytes); });
  const question = 'revisa mis últimos análisis clínicos';
  await service(input(stateWith([dental, ...studies]), question));
  await service(input(stateWith([dental, ...studies]), 'revisa el archivo adjunto', [
    { id: 'user-request', role: 'user', text: question },
    { id: 'assistant-response', role: 'assistant', text: 'Respuesta anterior de prueba. También menciono revisión dental.' },
  ]));
  const expectedNames = studies.map(item => item.attachment!.name);
  assert.deepEqual(reads, [...expectedNames, ...expectedNames]);
  for (const request of requests) {
    assert.deepEqual(request.context.records.map(item => item.id), studies.map(item => item.id));
    assert.equal(request.attachments?.length, 5);
    assert.equal(request.recordFiles?.every(file => file.status === 'included'), true);
    for (const attached of request.attachments ?? []) {
      assert.equal(attached.mimeType, 'application/pdf');
      assert.equal(attached.dataUri, `data:application/pdf;base64,${Buffer.from(bytes).toString('base64')}`);
    }
    assert.doesNotMatch(JSON.stringify(request.context.records), /112|mg\/dL/);
  }
});

test('a standalone explicit attachment request does not read or transmit unrelated clinical records', async () => {
  const explicit = upload('explicit-document', 'application/pdf', await clinicalPdf());
  let reads = 0;
  const { service, requests } = harness(async () => { reads++; return upload('must-not-read'); });
  await service({ ...input(stateWith([record('unrelated-clinical')]), 'revisa el archivo adjunto'), attachments: [explicit] });
  assert.equal(reads, 0);
  assert.deepEqual(requests[0].context.records, []);
  assert.deepEqual(requests[0].attachments, [explicit]);
  assert.deepEqual(requests[0].recordFiles ?? [], []);
});

test('saved records sharing the same local URI are read once and link to the same included file', async () => {
  const shared = savedFile('shared.txt');
  const newer = record('newer', { attachment: shared, description: 'Dato manual ficticio A: LDL 999 mg/dL.' });
  const older = record('older', { attachment: { ...shared, name: 'Another label.txt' }, date: '2026-10-01', description: 'Dato manual ficticio B: LDL 888 mg/dL.' });
  const state = stateWith([newer, older]);
  let reads = 0;
  const { service, requests } = harness(async () => { reads++; return upload('shared-file'); });
  await service(input(state, 'Revisa mi historial completo'));
  assert.equal(reads, 1);
  assert.equal(requests[0].attachments?.length, 1);
  assert.deepEqual(requests[0].recordFiles, [
    { recordId: 'newer', status: 'included', attachmentId: 'shared-file' },
    { recordId: 'older', status: 'included', attachmentId: 'shared-file' },
  ]);
  const content = currentContent(buildKliniAiOpenAiRequest(requests[0], 'synthetic-model'));
  assert.equal(content.length, 4);
  assert.equal(content[1].type, 'input_text');
  assert.deepEqual(JSON.parse((content[1] as { text: string }).text), { savedOriginal: {
    attachmentId: 'shared-file', name: 'shared-file.txt',
    records: [newer, older].map(item => ({ id: item.id, title: item.title, date: item.date, manualText: item.description })),
  } });
  assert.equal(content[2].type, 'input_file');
  assert.equal((content[2] as { file_data: string }).file_data, requests[0].attachments![0].dataUri);
  assert.equal(content.filter(item => item.type === 'input_file').length, 1);
});

test('each saved original is adjacent to its own unverified manual text while explicit files keep no saved-source block', async () => {
  const first = record('ldl-record', { title: 'Foto original', description: 'Dato manual ficticio: LDL 999 mg/dL.', attachment: savedFile('ldl-original.pdf', 'application/pdf') });
  const second = record('blood-record', { title: 'Biometría hemática', date: '2026-11-01', description: 'Texto manual ficticio: hemoglobina 14 g/dL.', attachment: savedFile('blood-original.png', 'image/png') });
  const unavailable = record('missing-record', { date: '2026-10-31', description: 'UNAVAILABLE_DESCRIPTION_CANARY', attachment: savedFile('missing-original.pdf', 'application/pdf') });
  const ldlOriginal = upload('ldl-document', 'application/pdf', await clinicalPdf());
  const bloodOriginal = upload('blood-image', 'image/png', png);
  const explicit = upload('explicit-chat', 'text/plain', Buffer.from('Archivo explícito, sin vínculo con el historial.'));
  const { service, requests } = harness(async candidate => {
    if (candidate.name === first.attachment!.name) return ldlOriginal;
    if (candidate.name === second.attachment!.name) return bloodOriginal;
    throw new Error('Missing synthetic original');
  });
  await service({ ...input(stateWith([first, second, unavailable]), 'Revisa mi historial completo'), attachments: [explicit] });
  const content = currentContent(buildKliniAiOpenAiRequest(requests[0], 'synthetic-model'));
  assert.equal(content.length, 7);
  assert.equal(content[1].type, 'input_file');
  assert.equal((content[1] as { file_data: string }).file_data, explicit.dataUri);
  for (const [sourceIndex, original, saved] of [[2, ldlOriginal, first], [4, bloodOriginal, second]] as const) {
    assert.equal(content[sourceIndex].type, 'input_text');
    const source = JSON.parse((content[sourceIndex] as { text: string }).text);
    assert.deepEqual(source, { savedOriginal: {
      attachmentId: original.id, name: original.name,
      records: [{ id: saved.id, title: saved.title, date: saved.date, manualText: saved.description }],
    } });
    assert.doesNotMatch(JSON.stringify(source), /base64|dataUri|file:\/\/\/|synthetic-only|doctorName|institution|UNAVAILABLE_DESCRIPTION_CANARY/);
    const binary = content[sourceIndex + 1];
    if (binary.type === 'input_file') assert.equal(binary.file_data, original.dataUri);
    else { assert.equal(binary.type, 'input_image'); assert.equal((binary as { image_url: string }).image_url, original.dataUri); }
  }
  assert.match((content[2] as { text: string }).text, /999/);
  assert.deepEqual(content.at(-1), { type: 'input_text', text: requests[0].question });
});

test('a saved-file ID collision cannot replace an explicitly attached chat file', async () => {
  const explicit = upload('shared-id', 'text/plain', Buffer.from('Texto explícito de prueba.'));
  const saved = upload('shared-id', 'text/plain', Buffer.from('Resultado guardado de prueba: LDL 114 mg/dL.'));
  const { service, requests } = harness(async () => saved);
  await service({ ...input(stateWith([record('clinical')])), attachments: [explicit] });
  const files = requests[0].attachments ?? [];
  assert.equal(files.length, 2);
  assert.deepEqual(files[0], explicit);
  assert.notEqual(files[1].id, explicit.id);
  assert.equal(files[1].dataUri, saved.dataUri);
  assert.deepEqual(requests[0].recordFiles, [{ recordId: 'clinical', status: 'included', attachmentId: files[1].id }]);
});

test('unreadable and invalid saved files report unavailable while preserving the requested record text', async () => {
  const state = stateWith([record('missing'), record('malformed', { date: '2026-11-01' }), record('good', { date: '2026-10-31' })]);
  const { service, requests } = harness(async candidate => {
    if (candidate.name === 'missing.txt') throw new Error('Private loader path must never reach transport: /private/canary');
    if (candidate.name === 'malformed.txt') return { ...upload('malformed'), dataUri: 'https://invalid.example/result.txt' };
    return upload('good-file');
  });
  await service(input(state, 'Revisa mi historial completo'));
  assert.deepEqual(requests[0].recordFiles, [
    { recordId: 'missing', status: 'unavailable' }, { recordId: 'malformed', status: 'unavailable' },
    { recordId: 'good', status: 'included', attachmentId: 'good-file' },
  ]);
  assert.equal(requests[0].context.records.length, 3);
  assert.deepEqual(requests[0].attachments?.map(file => file.id), ['good-file']);
  assert.doesNotMatch(JSON.stringify(requests[0]), /private\/canary|invalid\.example|Private loader/);
});

test('a missing reader and restored remote file URLs cannot silently imply that file content was reviewed', async () => {
  const noReader = harness();
  await assert.rejects(noReader.service(input(stateWith([record('no-reader')]))), /original/i);
  assert.equal(noReader.requests.length, 0);
  let reads = 0;
  const remote = harness(async () => { reads++; return upload('must-not-be-read'); });
  await assert.rejects(remote.service(input(stateWith([record('remote', { attachment: savedFile('remote.txt', 'text/plain', 'https://private.example/results.txt') })]))), error => {
    assert.ok(error instanceof Error);
    assert.match(error.message, /original/i);
    assert.doesNotMatch(error.message, /private\.example|remote\.txt/);
    return true;
  });
  assert.equal(reads, 0);
  assert.equal(remote.requests.length, 0);
});

test('failure to read every requested original stops text-only fallback before contacting the provider', async () => {
  for (const readRecordAttachment of [
    async () => { throw new Error('PRIVATE_PATH_CANARY file:///private/missing-original.pdf'); },
    async () => upload('too-large', 'application/pdf', pdfBytes(AI_ATTACHMENT_MAX_BYTES + 1)),
  ]) {
    const { service, requests } = harness(readRecordAttachment);
    await assert.rejects(service(input(stateWith([record('original')]))), error => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /original/i);
      assert.doesNotMatch(error.message, /PRIVATE_PATH_CANARY|file:\/\/\/|private\/|base64/);
      return true;
    });
    assert.equal(requests.length, 0);
  }
});

test('an explicit chat file can still be reviewed when a selected saved original is unavailable', async () => {
  const explicit = upload('explicit-readable');
  const { service, requests } = harness(async () => { throw new Error('Unavailable fixture'); });
  await service({ ...input(stateWith([record('missing-original')])), attachments: [explicit] });
  assert.deepEqual(requests[0].attachments, [explicit]);
  assert.deepEqual(requests[0].recordFiles, [{ recordId: 'missing-original', status: 'unavailable' }]);
});

test('automatic attachments respect the shared four MiB budget without displacing explicit files', async () => {
  const explicit = upload('explicit-large', 'application/pdf', pdfBytes(AI_ATTACHMENT_MAX_BYTES));
  const files = [record('fits'), record('exceeds', { date: '2026-11-01' })];
  const { service, requests } = harness(async candidate => upload(candidate.name.replace('.txt', ''), 'application/pdf', pdfBytes(candidate.name === 'fits.txt' ? AI_ATTACHMENT_MAX_BYTES : 40)));
  await service({ ...input(stateWith(files), 'Revisa mi historial completo'), attachments: [explicit] });
  assert.deepEqual(requests[0].attachments?.map(file => file.id), ['explicit-large', 'fits']);
  assert.deepEqual(requests[0].recordFiles, [
    { recordId: 'fits', status: 'included', attachmentId: 'fits' }, { recordId: 'exceeds', status: 'limit' },
  ]);
});

test('individual saved-file size limits are reported as partial review rather than missing data', async () => {
  const { service, requests } = harness(async candidate => candidate.name === 'large-pdf.txt'
    ? upload('large-pdf', 'application/pdf', pdfBytes(AI_ATTACHMENT_MAX_BYTES + 1))
    : candidate.name === 'large-txt.txt' ? upload('large-txt', 'text/plain', Buffer.alloc(AI_TEXT_ATTACHMENT_MAX_BYTES + 1, 65)) : upload('readable'));
  await service(input(stateWith([record('large-pdf'), record('large-txt', { date: '2026-11-01' }), record('readable', { date: '2026-10-31' })]), 'Revisa mi historial completo'));
  assert.deepEqual(requests[0].attachments?.map(file => file.id), ['readable']);
  assert.deepEqual(requests[0].recordFiles, [
    { recordId: 'large-pdf', status: 'limit' }, { recordId: 'large-txt', status: 'limit' },
    { recordId: 'readable', status: 'included', attachmentId: 'readable' },
  ]);
  assert.equal(requests[0].context.records.length, 3);
});

test('web queries exclude saved filenames even when the original file could not be included', async () => {
  const { service, requests } = harness();
  const state = stateWith([record('clinical', { attachment: savedFile('ArchivoCanarioPrivado.txt') })]);
  await service({ ...input(state), attachments: [upload('explicit-readable')] });
  const query = sanitizeKliniAiWebQuery('ArchivoCanarioPrivado.txt colesterol LDL interpretación criterios', requests[0]);
  assert.match(query, /colesterol ldl/);
  assert.doesNotMatch(query, /archivo|canario|privado|txt/i);
  assert.deepEqual(requests[0].recordFiles, [{ recordId: 'clinical', status: 'unavailable' }]);
});

test('general knowledge, record counts, chart opt-outs and another person never trigger automatic file reads', async () => {
  for (const question of [
    '¿Qué es el colesterol LDL?', '¿Cuántos estudios tengo?', 'No uses mi expediente: explica el LDL.',
    'Revisa los resultados de mi hijo',
  ]) {
    let reads = 0;
    const { service, requests } = harness(async () => { reads++; return upload('unnecessary'); });
    await service(input(stateWith([record('clinical')]), question));
    assert.equal(reads, 0, question);
    assert.deepEqual(requests[0].attachments ?? [], [], question);
    assert.deepEqual(requests[0].recordFiles ?? [], [], question);
  }
});

test('automatic file selection stays in the active profile even when family records share the topic', async () => {
  const state = stateWith([record('active-record')]);
  const family = stateWith([record('family-record', { description: 'FAMILY_SECRET_CANARY' })]);
  family.profile = { ...family.profile, id: 'family-profile', name: 'Familiar de prueba' };
  state.family = { ownerId: state.profile.id, profiles: { [family.profile.id]: { ...family, kind: 'Hijo' } } };
  const reads: string[] = [];
  const { service, requests } = harness(async candidate => { reads.push(candidate.name); return upload('active-file'); });
  await service(input(state));
  assert.deepEqual(reads, ['active-record.txt']);
  assert.deepEqual(requests[0].recordFiles, [{ recordId: 'active-record', status: 'included', attachmentId: 'active-file' }]);
  assert.doesNotMatch(JSON.stringify(requests[0]), /family-record|FAMILY_SECRET_CANARY|Familiar de prueba/);
});

test('referential followups reload only the prior user topic rather than records introduced by the assistant', async () => {
  const state = stateWith([
    record('lipids'), record('dental', { title: 'Revisión dental', description: 'Encías de prueba.', date: '2026-11-01' }),
  ]);
  const history: AiMessage[] = [
    { id: 'user-before', role: 'user', text: 'Revisa mi último estudio de lípidos' },
    { id: 'assistant-before', role: 'assistant', text: 'También consultaré tu revisión dental.' },
  ];
  const reads: string[] = [];
  const { service, requests } = harness(async candidate => { reads.push(candidate.name); return upload('followup-file'); });
  await service(input(state, '¿Y eso qué significa?', history));
  assert.deepEqual(reads, ['lipids.txt']);
  assert.deepEqual(requests[0].context.records.map(item => item.id), ['lipids']);
  assert.deepEqual(requests[0].recordFiles, [{ recordId: 'lipids', status: 'included', attachmentId: 'followup-file' }]);
});

test('demo mode never reads saved files or starts transport', async () => {
  let reads = 0;
  const { service, requests } = harness(async () => { reads++; return upload('not-read'); }, { endpoint: undefined });
  assert.equal((await service(input(stateWith([record('clinical')])))).source, 'demo');
  assert.equal(reads, 0);
  assert.equal(requests.length, 0);
});

test('cancellation while loading a stored file aborts the loader signal and prevents POST', { timeout: 2000 }, async () => {
  const controller = new AbortController();
  let loaderSignal: AbortSignal | undefined;
  let markStarted: (() => void) | undefined;
  const started = new Promise<void>(resolve => { markStarted = resolve; });
  let finishRead: ((value: AiAttachment) => void) | undefined;
  const { service, requests } = harness(async (_file, signal) => {
    loaderSignal = signal;
    markStarted?.();
    return new Promise<AiAttachment>(resolve => { finishRead = resolve; });
  });
  const pending = service({ ...input(stateWith([record('clinical')])), signal: controller.signal });
  await started;
  controller.abort();
  try {
    await assert.rejects(pending, /cancelada/);
    assert.equal(loaderSignal?.aborted, true);
    assert.equal(requests.length, 0);
  } finally { finishRead?.(upload('cancelled-file')); }
});

test('a stalled stored-file read shares the overall timeout and cannot later send chart data', { timeout: 2000 }, async () => {
  let loaderSignal: AbortSignal | undefined;
  let finishRead: ((value: AiAttachment) => void) | undefined;
  const { service, requests } = harness(async (_file, signal) => {
    loaderSignal = signal;
    return new Promise<AiAttachment>(resolve => { finishRead = resolve; });
  }, { timeoutMs: 20 });
  try {
    await assert.rejects(service(input(stateWith([record('clinical')]))), /tardó demasiado/);
    assert.equal(loaderSignal?.aborted, true);
    assert.equal(requests.length, 0);
  } finally { finishRead?.(upload('too-late-file')); }
  await Promise.resolve();
  assert.equal(requests.length, 0);
});

test('record-file parser retains valid links and rejects unknown records, dangling files and duplicate statuses', () => {
  const context = buildKliniAiContext(stateWith([record('clinical'), record('second')]));
  const file = upload('actual-file');
  const base = { question: 'Revisa mi historial completo', context, history: [], attachments: [file] };
  const valid = [{ recordId: 'clinical', status: 'included', attachmentId: file.id }, { recordId: 'second', status: 'unavailable' }];
  assert.deepEqual(parseKliniAiRequest({ ...base, recordFiles: valid }).recordFiles, valid);
  for (const recordFiles of [
    [{ recordId: 'outside-context', status: 'included', attachmentId: file.id }],
    [{ recordId: 'clinical', status: 'included', attachmentId: 'missing-file' }],
    [{ recordId: 'clinical', status: 'included' }],
    [{ recordId: 'clinical', status: 'unknown' }],
    [{ recordId: 'clinical', status: ['unavailable'] }],
    [{ recordId: 'clinical', status: ['limit'] }],
    [{ recordId: 'clinical', status: 'unavailable', attachmentId: file.id }],
    [{ recordId: 'clinical', status: 'limit', attachmentId: file.id }],
    [{ recordId: 'clinical', status: 'included', attachmentId: file.id }, { recordId: 'clinical', status: 'unavailable' }],
    [{ recordId: 'clinical', status: 'unavailable' }, { recordId: 'clinical', status: 'unavailable' }],
    null, {},
  ]) assert.throws(() => parseKliniAiRequest({ ...base, recordFiles }));
  assert.throws(() => parseKliniAiRequest({ ...base, attachments: [], recordFiles: [valid[0]] }));
});

test('the server removes saved files for discarded chart records while retaining explicit chat attachments', { timeout: 5000 }, async () => {
  const explicit = upload('explicit-chat', 'text/plain', Buffer.from('Pregunta general de prueba.'));
  const saved = upload('saved-clinical', 'text/plain', Buffer.from('SAVED_RECORD_CANARY: LDL ficticio 116 mg/dL.'));
  let providerCalls = 0;
  const server = createKliniAiServer({ apiKey: 'fake-test-key', model: 'synthetic-model', fetchImpl: (async (_url, init) => {
    providerCalls++;
    const provider = JSON.parse(String(init?.body));
    const content = provider.input.at(-1).content;
    assert.ok(Array.isArray(content));
    const metadata = JSON.parse(content[0].text);
    assert.deepEqual(metadata.context.records, []);
    assert.deepEqual(metadata.recordFiles ?? [], []);
    assert.deepEqual(metadata.attachedFiles, [{ id: explicit.id, name: explicit.name, mimeType: explicit.mimeType }]);
    assert.equal('question' in metadata, false);
    assert.equal('history' in metadata, false);
    assert.equal(content.length, 3);
    assert.equal(content[1].type, 'input_file');
    assert.equal(content[1].file_data, explicit.dataUri);
    assert.deepEqual(content.at(-1), { type: 'input_text', text: '¿Qué es el colesterol LDL?' });
    assert.equal(JSON.stringify(provider).includes(saved.dataUri), false);
    assert.doesNotMatch(JSON.stringify(metadata), /SAVED_RECORD_CANARY|saved-clinical|file:\/\/\//);
    return new Response(JSON.stringify({ status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{
      type: 'output_text', text: JSON.stringify({ text: 'Explicación general de prueba.', action: null, webSearchQuery: null }),
    }] }] }));
  }) as typeof fetch });
  const url = await new Promise<string>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}/chat`);
    });
  });
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      question: '¿Qué es el colesterol LDL?', history: [], context: buildKliniAiContext(stateWith([record('clinical')])),
      attachments: [explicit, saved], recordFiles: [{ recordId: 'clinical', status: 'included', attachmentId: saved.id }],
    }) });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).text, 'Explicación general de prueba.');
    assert.equal(providerCalls, 1);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
