import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect, type Page } from '@playwright/test';
import { createDemoState } from '../src/domain/seed';
import { createAiSubscription } from '../src/domain/aiSubscription';

const origin = 'http://127.0.0.1:8096';
const endpoint = 'http://127.0.0.1:8098/chat';
const pendingQuestion = 'Pregunta pendiente ficticia para comprobar el cierre.';
const pendingAnswer = 'Esta respuesta pendiente no debe reaparecer después del cierre.';
const headers = { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'content-type, x-klini-dev-token', 'access-control-allow-methods': 'POST, OPTIONS' };

async function singleComposer(page: Page) {
  await expect(page.getByRole('textbox')).toHaveCount(1);
  await expect(page.getByTestId('home-search')).toHaveAttribute('autocorrect', 'on');
  await expect(page.getByTestId('home-search')).toHaveAttribute('spellcheck', 'true');
  await expect(page.getByTestId('home-search')).toHaveAttribute('autocapitalize', 'sentences');
  assert.equal(await page.getByTestId('home-search').evaluate(element => element === (window as typeof window & { collapseInput?: Element }).collapseInput), true, 'Closing must preserve the original input DOM node.');
}

async function restored(page: Page) {
  await expect(page.getByTestId('klini-ai-conversation')).toHaveCount(0);
  await expect(page.getByTestId('klini-ai-sheet')).toHaveCount(0);
  await singleComposer(page);
  for (const id of ['home-bottom-toolbar', 'home-search', 'header-menu', 'home-attachment-add', 'home-ai-submit', 'quick-register']) {
    await expect(page.getByTestId(id)).toBeVisible();
    await expect(page.getByTestId(id)).toBeInViewport();
  }
  for (const id of ['header-menu', 'home-attachment-add', 'home-ai-submit', 'quick-register']) await page.getByTestId(id).click({ trial: true });
  await expect(page.getByTestId('home-ai-submit')).toBeEnabled();
  await expect.poll(() => page.getByTestId('home-bottom-toolbar').evaluate(element => {
    const transform = new DOMMatrixReadOnly(getComputedStyle(element.parentElement!).transform);
    return Math.abs(transform.m42);
  })).toBeLessThanOrEqual(.5);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
}

async function open(page: Page, question: string, settled = true) {
  await page.getByTestId('home-search').fill(question);
  await page.getByTestId('home-ai-submit').click();
  await expect(page.getByTestId('klini-ai-conversation')).toBeVisible();
  await singleComposer(page);
  if (settled) {
    await expect.poll(() => page.getByTestId('klini-ai-sheet').evaluate(element => Math.abs(new DOMMatrixReadOnly(getComputedStyle(element).transform).m42))).toBeLessThanOrEqual(.5);
    await expect(page.getByTestId('ai-message-assistant')).toHaveCount(1);
  }
}

async function main() {
  await mkdir('test-results', { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.KLINI_CHROMIUM_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const results: object[] = [];
  try {
    for (const width of [393, 320]) {
      const state = createDemoState();
      state.profile.name = 'Perfil de prueba visual';
      state.family = undefined; state.appointments = []; state.messages = []; state.records = []; state.medications = [];
      state.aiSubscription = createAiSubscription(true);
      const context = await browser.newContext({ viewport: { width, height: width === 320 ? 640 : 852 }, timezoneId: 'America/Mexico_City' });
      const errors: string[] = [], unexpectedPosts: string[] = [], requests: string[] = [], cancelled: string[] = [];
      let releasePending: (() => void) | undefined;
      try {
        await context.addInitScript(value => localStorage.setItem('@klini/app-state:v1', value), JSON.stringify(state));
        await context.route('**/*', async route => {
          const request = route.request();
          if (request.url() === endpoint) {
            if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
            if (request.method() !== 'POST') return route.abort();
            const { question } = request.postDataJSON() as { question: string };
            requests.push(question);
            if (question === pendingQuestion) {
              await new Promise<void>(resolve => { releasePending = resolve; });
              if (request.failure()) return;
            }
            try {
              await route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ text: question === pendingQuestion ? pendingAnswer : 'Respuesta ficticia de la prueba visual.', action: null }) });
            } catch (cause) { if (!request.failure()) throw cause; }
            return;
          }
          if (request.method() === 'POST') { unexpectedPosts.push(request.url()); return route.abort(); }
          if (new URL(request.url()).origin !== origin) return route.abort();
          return route.continue();
        });
        const page = await context.newPage();
        page.on('pageerror', error => errors.push(error.message));
        page.on('requestfailed', request => {
          if (request.url() === endpoint && request.method() === 'POST') cancelled.push((request.postDataJSON() as { question: string }).question);
        });
        await page.goto(origin);
        await expect(page.getByTestId('home-search')).toBeVisible();
        await page.getByTestId('home-search').evaluate(element => { (window as typeof window & { collapseInput?: Element }).collapseInput = element; });
        await restored(page);

        await open(page, 'Pregunta ficticia para probar el asa.');
        const handle = page.getByTestId('ai-collapse');
        await expect(handle).toHaveAccessibleName('Bajar conversación');
        const bounds = await handle.boundingBox();
        assert.ok(bounds && bounds.width >= 44 && bounds.height >= 44);
        await page.getByTestId('home-search').fill('Borrador antes de bajar.');
        await handle.click();
        await restored(page);
        await expect(page.getByTestId('home-search')).toHaveValue('');
        await page.getByTestId('home-search').click();
        await expect(page.getByTestId('home-search')).toBeFocused();
        await page.getByTestId('home-search').fill('Texto después de bajar.');
        await expect(page.getByTestId('home-search')).toHaveValue('Texto después de bajar.');
        await page.getByTestId('home-search').fill('');
        await page.getByTestId('header-menu').click();
        await expect(page.getByTestId('header-panel')).toBeVisible();
        await page.getByTestId('header-panel').getByRole('button', { name: 'Cerrar panel', exact: true }).click();
        await expect(page.getByTestId('header-panel')).toHaveCount(0);
        await restored(page);
        await page.screenshot({ path: `test-results/klini-ai-collapsed-${width}.png` });

        await open(page, 'Pregunta ficticia para probar la equis.');
        await page.getByTestId('ai-close').click();
        await restored(page);

        await open(page, 'Pregunta ficticia para probar el fondo.');
        await page.getByTestId('home-search').fill('Borrador que conserva el cierre por fondo.');
        await page.getByTestId('dismiss-header-panel').click({ position: { x: 8, y: 8 } });
        await restored(page);
        await expect(page.getByTestId('home-search')).toHaveValue('Borrador que conserva el cierre por fondo.');

        await open(page, 'Pregunta ficticia para probar Escape.');
        await page.getByTestId('home-search').fill('Borrador que conserva Escape.');
        await page.keyboard.press('Escape');
        await restored(page);
        await expect(page.getByTestId('home-search')).toHaveValue('Borrador que conserva Escape.');

        await open(page, 'Pregunta ficticia para probar el menú desde IA.');
        await page.getByTestId('header-menu').click();
        await expect(page.getByTestId('klini-ai-conversation')).toHaveCount(0);
        await expect(page.getByTestId('header-panel')).toBeVisible();
        await page.getByTestId('header-panel').getByRole('button', { name: 'Cerrar panel', exact: true }).click();
        await expect(page.getByTestId('header-panel')).toHaveCount(0);
        await restored(page);

        await open(page, pendingQuestion, false);
        await expect.poll(() => requests.includes(pendingQuestion)).toBe(true);
        await expect(page.getByTestId('home-ai-submit')).toBeDisabled();
        await page.getByTestId('ai-collapse').click();
        await restored(page);
        await expect.poll(() => cancelled.includes(pendingQuestion)).toBe(true);
        releasePending?.(); releasePending = undefined;
        await expect(page.getByTestId('ai-error')).toHaveCount(0);

        // Dispatch directly while opening: a physical tap cannot reach the
        // offscreen handle at every point in the entrance animation.
        await page.getByTestId('home-search').fill('Pregunta ficticia para interrumpir la entrada.');
        await page.getByTestId('home-ai-submit').click();
        await page.getByTestId('ai-collapse').dispatchEvent('click');
        await restored(page);
        await open(page, 'Pregunta ficticia después de cancelar.');
        await expect(page.getByTestId('ai-message-assistant')).not.toContainText(pendingAnswer);
        await page.getByTestId('ai-close').click();
        await restored(page);

        await page.getByTestId('quick-register').click();
        await expect(page.getByTestId('record-entry-screen')).toBeVisible();
        await page.getByTestId('archive-close').last().click();
        await expect(page.getByTestId('record-entry-screen')).toHaveCount(0);
        await restored(page);
        assert.deepEqual(errors, []); assert.deepEqual(unexpectedPosts, []);
        results.push({ width, result: 'PASS', onePersistentComposer: true, spellingEnabled: true, closeMethods: ['handle', 'close-button', 'backdrop', 'Escape', 'AI-to-menu'], handleTarget: { width: bounds.width, height: bounds.height }, pendingRequestCancelled: cancelled.includes(pendingQuestion), openingInterruptedProgrammatically: true, menuAndRegisterWorked: true, mockedRequests: requests.length, providerRequests: 0 });
      } finally { releasePending?.(); await context.close(); }
    }
    const report = { result: 'PASS', syntheticDataOnly: true, providerRequests: 0, platform: 'web; native transform persistence requires device verification', results };
    await writeFile('test-results/klini-ai-collapse.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  } finally { await browser.close(); }
}

void main().catch(cause => { console.error(cause instanceof Error ? cause.message : 'Falló la prueba de cierre de IA.'); process.exitCode = 1; });
