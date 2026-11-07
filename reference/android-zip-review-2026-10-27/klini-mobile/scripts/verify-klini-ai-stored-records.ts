import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { createDemoState } from '../src/domain/seed';
import { createAiSubscription } from '../src/domain/aiSubscription';
import { validateAppState } from '../src/domain/reducer';
import type { AiRequest } from '../src/domain/kliniAi';

const origin = 'http://127.0.0.1:8096';
const endpoint = 'http://127.0.0.1:8098/chat';
const live = process.env.KLINI_AI_LIVE_TEST === '1';

/** Isolated browser storage and generated PDF; never opens the user's chart. */
async function main() {
  await mkdir('test-results', { recursive: true });
  const pdf = await PDFDocument.create();
  const pdfPage = pdf.addPage([580, 240]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdfPage.drawText('LABORATORIO FICTICIO - SOLO PRUEBA DE SOFTWARE', { x: 24, y: 195, size: 16, font });
  pdfPage.drawText('LDL: 112 mg/dL', { x: 24, y: 145, size: 26, font });
  pdfPage.drawText('Documento de prueba. No corresponde a un paciente real.', { x: 24, y: 95, size: 14, font });
  const dataUri = `data:application/pdf;base64,${Buffer.from(await pdf.save()).toString('base64')}`;
  const state = createDemoState();
  state.profile = { ...state.profile, id: 'synthetic-record-reader', name: 'Perfil de prueba' };
  state.family = undefined;
  state.aiSubscription = createAiSubscription(true);
  state.appointments = []; state.medications = []; state.messages = [];
  state.records = [{
    id: 'synthetic-saved-study', type: 'Estudio', title: 'Biometría hemática de prueba', date: '2026-11-02', doctorName: 'Laboratorio ficticio',
    description: 'Dato ficticio escrito en el historial: glucosa 94 mg/dL. Los otros resultados están en el archivo original.',
    attachment: { uri: dataUri, name: 'Estudio-de-prueba.pdf', mimeType: 'application/pdf' },
  }];
  assert.ok(validateAppState(state), 'La prueba requiere un historial ficticio válido.');
  const browser = await chromium.launch({ executablePath: process.env.KLINI_CHROMIUM_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Mexico_City' });
  const requests: AiRequest[] = [], errors: string[] = [], unexpectedPosts: string[] = [];
  const started = Date.now();
  try {
    await context.addInitScript(value => { localStorage.setItem('@klini/app-state:v1', value); }, JSON.stringify(state));
    await context.route('**/*', async route => {
      const request = route.request();
      if (request.url() === endpoint) {
        if (request.method() === 'POST') requests.push(request.postDataJSON() as AiRequest);
        if (live) return route.continue();
        const headers = { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'content-type, x-klini-dev-token', 'access-control-allow-methods': 'POST, OPTIONS' };
        if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
        return route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ text: 'Prueba simulada: LDL 112 mg/dL en el archivo y glucosa 94 mg/dL en el texto.', action: null }) });
      }
      if (request.method() === 'POST') { unexpectedPosts.push(request.url()); return route.abort(); }
      if (new URL(request.url()).origin !== origin) return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    await expect(page.getByTestId('home-search')).toBeVisible();
    await page.getByTestId('home-search').fill('Revisa el LDL de mi última biometría hemática de prueba. Dime únicamente el LDL del PDF y la glucosa escrita en la descripción del historial. Son datos ficticios: no hagas interpretación clínica ni busques internet.');
    await page.getByTestId('home-ai-submit').click();
    await expect(page.getByTestId('ai-message-assistant')).toHaveCount(1, { timeout: 110000 });
    assert.equal(requests.length, 1);
    assert.equal(requests[0].context.records[0]?.id, 'synthetic-saved-study', 'Debe usar el historial ficticio aislado.');
    assert.equal(requests[0].attachments?.[0].dataUri === dataUri, true, `Debe abrir el PDF guardado; estado=${JSON.stringify(requests[0].recordFiles)}`);
    assert.equal(requests[0].recordFiles?.[0].recordId, 'synthetic-saved-study');
    assert.equal(requests[0].recordFiles?.[0].status, 'included');
    assert.match(requests[0].context.records[0].text, /94 mg\/dL/);
    assert.doesNotMatch(requests[0].context.records[0].text, /112/);
    assert.doesNotMatch(JSON.stringify(requests[0].context), /data:|"uri"/);
    const answer = await page.getByTestId('ai-message-assistant').innerText();
    assert.match(answer, /112/); assert.match(answer, /94/);
    await expect(page.getByRole('textbox')).toHaveCount(1);
    await page.screenshot({ path: `test-results/klini-ai-stored-records-${live ? 'live' : 'mock'}.png` });
    assert.deepEqual(errors, []); assert.deepEqual(unexpectedPosts, []);
    const report = { result: 'PASS', mode: live ? 'real-provider' : 'mock-provider', syntheticDataOnly: true, storedFileReadByExpoRuntime: true, explicitChatAttachments: 0, elapsedMs: Date.now() - started, answer };
    await writeFile(`test-results/klini-ai-stored-records-${live ? 'live' : 'mock'}.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  } finally { await browser.close(); }
}
void main().catch(cause => { console.error(cause instanceof Error ? cause.message : 'Falló la prueba de archivos guardados.'); process.exitCode = 1; });
