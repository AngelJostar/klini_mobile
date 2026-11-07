import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { createDemoState } from '../src/domain/seed';
import { createAiSubscription } from '../src/domain/aiSubscription';
import type { AiRequest } from '../src/domain/kliniAi';

const origin = 'http://127.0.0.1:8096';
const endpoint = 'http://127.0.0.1:8098/chat';
const live = process.env.KLINI_AI_LIVE_TEST === '1';
const initialQuestion = 'Escenario ficticio de prueba: tengo alergia al perro y tomo montelukast y levocetirizina. No consultes mi expediente.';
const priorAnswer = 'Respuesta anterior simulada: vigila somnolencia y cambios de ánimo; consulta a tu médico. Este texto es un ejemplo ficticio para probar la continuidad.';
const turns = [
  { question: '¿Qué datos anoto antes de mi cita con el alergólogo?', mock: 'Anota tus síntomas, su frecuencia y las preguntas que quieres llevar a la consulta.', matches: /s[ií]ntomas|frecuencia|anota|lleva/i },
  { question: 'Ayúdame a redactar un mensaje breve para pedir esa cita.', mock: 'Hola, quisiera agendar una cita con el alergólogo para revisar mis síntomas. ¿Tienen horario disponible?', matches: /cita|agendar|consulta/i },
  { question: 'Cambiando de tema, ¿cuánto es 18 por 7? Responde solo con el número.', mock: '126', matches: /^126[.]?$/ },
  { question: '¿Y si a eso le sumo 4? Responde solo con el número.', mock: '130', matches: /^130[.]?$/ },
];

/** Fresh browser state, one controlled prior answer, then distinct current turns. */
async function main() {
  await mkdir('test-results', { recursive: true });
  const state = createDemoState();
  state.family = undefined; state.appointments = []; state.messages = []; state.records = []; state.medications = [];
  state.aiSubscription = createAiSubscription(true);
  const browser = await chromium.launch({ executablePath: process.env.KLINI_CHROMIUM_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Mexico_City' });
  const requests: AiRequest[] = [], errors: string[] = [], unexpectedPosts: string[] = [], answers: string[] = [];
  try {
    await context.addInitScript(value => localStorage.setItem('@klini/app-state:v1', value), JSON.stringify(state));
    await context.route('**/*', async route => {
      const request = route.request();
      if (request.url() === endpoint) {
        const headers = { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'content-type, x-klini-dev-token', 'access-control-allow-methods': 'POST, OPTIONS' };
        if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
        if (request.method() !== 'POST') return route.abort();
        requests.push(request.postDataJSON() as AiRequest);
        if (live && requests.length > 1) return route.continue();
        return route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ text: requests.length === 1 ? priorAnswer : turns[requests.length - 2].mock, action: null }) });
      }
      if (request.method() === 'POST') { unexpectedPosts.push(request.url()); return route.abort(); }
      if (new URL(request.url()).origin !== origin) return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    await expect(page.getByTestId('home-search')).toBeVisible();
    const ask = async (question: string, count: number) => {
      await page.getByTestId('home-search').fill(question);
      await page.getByTestId('home-ai-submit').click();
      await expect(page.getByTestId('ai-message-assistant')).toHaveCount(count, { timeout: 110000 });
      await expect(page.getByTestId('home-ai-submit')).toBeEnabled();
      assert.equal(requests.at(-1)?.question, question, 'Cada envío debe contener la pregunta nueva exacta.');
      await expect(page.getByTestId('home-search')).toHaveValue('');
      await expect(page.getByRole('textbox')).toHaveCount(1);
      return (await page.getByTestId('ai-message-assistant').last().innerText()).trim();
    };
    assert.equal(await ask(initialQuestion, 1), priorAnswer);
    for (const [index, turn] of turns.entries()) {
      const answer = await ask(turn.question, index + 2);
      assert.match(answer, turn.matches);
      assert.doesNotMatch(answer, /somnolencia|cambios de [aá]nimo/i, 'No debe repetir las precauciones del turno anterior.');
      assert.notEqual(answer, priorAnswer);
      if (answers.length) assert.notEqual(answer, answers.at(-1));
      answers.push(answer);
    }
    assert.equal(requests.length, 5);
    assert.equal(requests[3].history.length, 0, 'El cambio explícito de tema descarta el contexto clínico anterior.');
    assert.deepEqual(requests[3].context.records, []);
    assert.ok(requests[4].history.some(message => message.role === 'user' && message.text.includes('18 por 7')));
    assert.deepEqual(errors, []); assert.deepEqual(unexpectedPosts, []);
    await page.screenshot({ path: `test-results/klini-ai-turns-${live ? 'live' : 'mock'}.png` });
    const report = { result: 'PASS', mode: live ? 'real-provider-after-controlled-prior-answer' : 'mock-provider', syntheticDataOnly: true, currentQuestions: turns.map(turn => turn.question), answers, providerRequests: live ? 4 : 0, oneComposer: true };
    await writeFile(`test-results/klini-ai-turns-${live ? 'live' : 'mock'}.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  } finally { await browser.close(); }
}
void main().catch(cause => { console.error(cause instanceof Error ? cause.message : 'Falló la prueba de continuidad.'); process.exitCode = 1; });
