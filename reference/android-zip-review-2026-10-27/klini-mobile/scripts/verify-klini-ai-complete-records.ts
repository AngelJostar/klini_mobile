import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { createDemoState } from '../src/domain/seed';
import { createAiSubscription } from '../src/domain/aiSubscription';
import { validateAppState } from '../src/domain/reducer';
import type { AiRecordFile, AiRequest } from '../src/domain/kliniAi';
import type { AiAttachment } from '../src/domain/kliniAiAttachments';

const origin = 'http://127.0.0.1:8096';
const endpoint = 'http://127.0.0.1:8098/chat';
const live = process.env.KLINI_AI_LIVE_TEST === '1';
const prompts = ['Revisa mis últimos análisis clínicos.', 'Revisa el archivo adjunto.'];
const recordIds = ['synthetic-complete-pdf', 'synthetic-complete-image', 'synthetic-complete-text', 'synthetic-complete-second-pdf'];
const dentalId = 'synthetic-irrelevant-dental';
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

async function syntheticPdf(result: string): Promise<string> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([620, 250]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText('LABORATORIO FICTICIO - SOLO PRUEBA DE SOFTWARE', { x: 22, y: 205, size: 16, font });
  page.drawText(result, { x: 22, y: 145, size: 26, font });
  page.drawText('No corresponde a una persona real. Valores artificiales.', { x: 22, y: 90, size: 14, font });
  return `data:application/pdf;base64,${Buffer.from(await pdf.save()).toString('base64')}`;
}

/** Generated originals and isolated browser storage; no real chart or personal files. */
async function main() {
  await mkdir('test-results', { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.KLINI_CHROMIUM_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Mexico_City' });
  const requests: AiRequest[] = [], errors: string[] = [], unexpectedPosts: string[] = [], blockedExternalRequests: string[] = [];
  const started = Date.now();
  try {
    await context.route('**/*', async route => {
      const request = route.request();
      if (request.url() === endpoint) {
        if (request.method() === 'POST') requests.push(request.postDataJSON() as AiRequest);
        if (live) return route.continue();
        const headers = { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'content-type, x-klini-dev-token', 'access-control-allow-methods': 'POST, OPTIONS' };
        if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
        const text = requests.length === 1
          ? 'Revisión simulada de cuatro originales ficticios: LDL 112 mg/dL, hemoglobina 13.7 g/dL, glucosa 94 mg/dL y triglicéridos 132 mg/dL. El LDL 999 mg/dL del texto manual contradice el original; no se confirma como resultado del documento.'
          : 'Segunda revisión simulada de los archivos adjuntos originales: LDL 112 mg/dL, hemoglobina 13.7 g/dL, glucosa 94 mg/dL y triglicéridos 132 mg/dL. El texto manual LDL 999 mg/dL sigue en contradicción con el PDF.';
        return route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ text, action: null }) });
      }
      if (request.method() === 'POST') { unexpectedPosts.push(request.url()); return route.abort(); }
      if (new URL(request.url()).origin !== origin) { blockedExternalRequests.push(request.url()); return route.abort(); }
      return route.continue();
    });
    const imagePage = await context.newPage();
    await imagePage.setViewportSize({ width: 780, height: 340 });
    await imagePage.setContent('<!doctype html><html lang="es"><body style="margin:0;padding:36px;font-family:Arial,sans-serif;background:white;color:#001f38"><h1 style="font-size:25px">LABORATORIO FICTICIO · SOLO PRUEBA DE SOFTWARE</h1><p style="font-size:36px">Hemoglobina 13.7 g/dL</p><p style="font-size:20px">No corresponde a una persona real. Valores artificiales.</p></body></html>');
    const png = await imagePage.screenshot({ type: 'png' });
    await imagePage.close();
    const originals = [
      await syntheticPdf('LDL: 112 mg/dL'),
      `data:image/png;base64,${png.toString('base64')}`,
      `data:text/plain;base64,${Buffer.from('LABORATORIO FICTICIO - SOLO PRUEBA DE SOFTWARE\nGlucosa: 94 mg/dL\nNo corresponde a una persona real. Valores artificiales.').toString('base64')}`,
      await syntheticPdf('Trigliceridos: 132 mg/dL'),
    ];
    const dentalOriginal = await syntheticPdf('CANARIO-DENTAL-PRIVADO-48721 - SIN RESULTADOS DE LABORATORIO');
    const state = createDemoState();
    state.profile = { ...state.profile, id: 'synthetic-complete-record-reader', name: 'Perfil de prueba' };
    state.family = undefined;
    state.aiSubscription = createAiSubscription(true);
    state.appointments = []; state.medications = []; state.messages = [];
    state.records = [
      { id: recordIds[0], type: 'Estudio', title: 'Foto original', date: '2026-11-03', doctorName: '', description: 'Dato manual ficticio: LDL 999 mg/dL. Este texto puede ser incorrecto; el resultado original está en el archivo.', attachment: { uri: originals[0], name: 'foto-1001.pdf', mimeType: 'application/pdf' } },
      { id: recordIds[1], type: 'Consulta', title: 'Registro de análisis', date: '2026-11-02', doctorName: '', description: 'Análisis clínicos sin valores en este texto manual.', attachment: { uri: originals[1], name: 'foto-1002.png', mimeType: 'image/png' } },
      { id: recordIds[2], type: 'Nota', title: 'Análisis clínicos', date: '2026-11-01', doctorName: '', description: '', attachment: { uri: originals[2], name: 'file-1003.txt', mimeType: 'text/plain' } },
      { id: recordIds[3], type: 'Estudio', title: 'Resultado', date: '2026-11-01', doctorName: '', description: '', attachment: { uri: originals[3], name: 'file-1004.pdf', mimeType: 'application/pdf' } },
      { id: dentalId, type: 'Consulta', title: 'Revisión dental', date: '2026-11-03', doctorName: '', description: 'Archivo adjunto.', attachment: { uri: dentalOriginal, name: 'file-1005.pdf', mimeType: 'application/pdf' } },
    ];
    assert.ok(validateAppState(state), 'La prueba requiere un historial ficticio válido.');
    await context.addInitScript(value => { localStorage.setItem('@klini/app-state:v1', value); }, JSON.stringify(state));
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    await expect(page.getByTestId('home-search')).toBeVisible();
    const answers: string[] = [];
    for (let index = 0; index < prompts.length; index++) {
      await page.getByTestId('home-search').fill(prompts[index]);
      await page.getByTestId('home-ai-submit').click();
      await expect(page.getByTestId('ai-message-assistant')).toHaveCount(index + 1, { timeout: 110000 });
      assert.equal(requests.length, index + 1, 'Cada pregunta debe generar una consulta nueva.');
      const request = requests[index];
      assert.equal(request.question, prompts[index]);
      assert.equal(request.attachments?.length, 4, 'Debe incluir los cuatro archivos originales, incluso el cuarto documento.');
      assert.equal(request.recordFiles?.length, 4, 'Debe vincular los cuatro originales con sus registros.');
      assert.deepEqual(request.recordFiles?.map(file => file.recordId).sort(), [...recordIds].sort());
      assert.ok(request.recordFiles?.every(file => file.status === 'included'));
      for (let fileIndex = 0; fileIndex < recordIds.length; fileIndex++) {
        const link: AiRecordFile | undefined = request.recordFiles?.find((file): boolean => file.recordId === recordIds[fileIndex]);
        const attachment: AiAttachment | undefined = request.attachments?.find((file): boolean => file.id === link?.attachmentId);
        assert.equal(attachment?.dataUri, originals[fileIndex], `Debe volver a leer el original ${recordIds[fileIndex]}.`);
      }
      assert.ok(!request.recordFiles?.some(file => file.recordId === dentalId), 'Una revisión de análisis no debe abrir el archivo dental.');
      assert.ok(!request.attachments?.some(file => file.dataUri === dentalOriginal), 'El PDF dental no corresponde a la pregunta.');
      assert.ok(request.context.records.some(record => record.id === recordIds[0] && /999/.test(record.text)), 'La contradicción del texto manual debe llegar identificada en el registro.');
      assert.doesNotMatch(JSON.stringify(request.context), /data:|"uri"/, 'El contexto de texto no debe contener rutas ni los bytes originales.');
      const answer = await page.getByTestId('ai-message-assistant').nth(index).innerText();
      await writeFile(`test-results/klini-ai-complete-records-${live ? 'live' : 'mock'}-turn-${index + 1}.json`, JSON.stringify({ syntheticDataOnly: true, question: prompts[index], answer }, null, 2));
      for (const value of [/112/, /13[.,]7/, /94/, /132/]) assert.match(answer, value, 'La respuesta debe considerar los resultados de todos los originales ficticios.');
      if (index === 0) {
        assert.match(answer, /999/, 'Debe advertir la discrepancia del registro manual.');
        assert.match(answer, /manual|contradic|discrepan|inconsisten|incorrect|no coincide|no concuerda/i, 'Debe distinguir el texto manual del documento original.');
      }
      answers.push(answer);
      await expect(page.getByRole('textbox')).toHaveCount(1);
    }
    assert.notEqual(answers[0], answers[1], 'Debe contestar la nueva pregunta, sin reciclar el mismo mensaje.');
    assert.deepEqual(errors, []); assert.deepEqual(unexpectedPosts, []);
    await page.screenshot({ path: `test-results/klini-ai-complete-records-${live ? 'live' : 'mock'}.png` });
    const report = {
      result: 'PASS', mode: live ? 'real-provider' : 'mock-provider', syntheticDataOnly: true,
      viewport: { width: 390, height: 844 }, explicitChatAttachments: 0, elapsedMs: Date.now() - started,
      fourOriginalsReadPerQuestion: true, manualOriginalDiscrepancyDetected: true, irrelevantDentalFileExcluded: true,
      requests: requests.map(request => ({ question: request.question, recordIds: request.context.records.map(record => record.id), recordFiles: request.recordFiles, attachments: request.attachments?.map(({ id, name, mimeType, dataUri }) => ({ id, name, mimeType, sha256: digest(dataUri) })) })),
      answers, blockedExternalRequestCount: blockedExternalRequests.length,
    };
    await writeFile(`test-results/klini-ai-complete-records-${live ? 'live' : 'mock'}.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  } finally { await browser.close(); }
}
void main().catch(cause => { console.error(cause instanceof Error ? cause.message : 'Falló la prueba completa de archivos guardados.'); process.exitCode = 1; });
