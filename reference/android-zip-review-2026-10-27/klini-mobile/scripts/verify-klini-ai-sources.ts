import { chromium, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import type { AiRequest } from '../src/domain/kliniAi';

const origin = 'http://127.0.0.1:8096';
const chatEndpoint = 'http://127.0.0.1:8098/chat';
const sourceUrl = 'https://www.niaid.nih.gov/diseases-conditions/allergic-diseases';
const fakeAnswer = [
  '**Información general**\nEsta es una respuesta ficticia para comprobar la presentación de fuentes. La referencia aparece junto a la explicación y se abre únicamente cuando la persona la pulsa. [1]',
  '**Cómo leer la respuesta**\nLa información general puede explicarse sin consultar registros personales. Esta prueba comprueba el formato de párrafos y negritas; no evalúa contenido médico ni consulta a un modelo.',
  '• Las preguntas generales reciben una explicación clara.\n• Las preguntas personales pueden utilizar registros pertinentes.\n• Las referencias permiten consultar la información utilizada.',
  'Un texto extenso debe permanecer dentro del panel de conversación. La cabecera y el recuadro para escribir siguen visibles mientras se recorre la respuesta. El desplazamiento permite llegar al final sin ampliar la pantalla ni cubrir los controles.',
  'Esta segunda explicación añade contenido deliberadamente para comprobar pantallas pequeñas. Todos los datos de esta respuesta son de prueba. Ningún resultado, antecedente o tratamiento del perfil debe enviarse para responder esta pregunta general.',
  '**Consulta la fuente**\nEl enlace siguiente usa el título de la página y su dominio. En esta prueba, abrirlo muestra una página local interceptada: no se descarga la página externa. [1]',
].join('\n\n');

async function checkLayout(page: Page) {
  await expect.poll(() => page.getByTestId('klini-ai-sheet').evaluate(element => Math.abs(new DOMMatrixReadOnly(getComputedStyle(element).transform).m42))).toBeLessThanOrEqual(.5);
  const viewport = page.viewportSize()!;
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  const conversation = (await page.getByTestId('klini-ai-conversation').boundingBox())!;
  expect(conversation.x).toBeGreaterThanOrEqual(0);
  expect(conversation.x + conversation.width).toBeLessThanOrEqual(viewport.width);
  expect(conversation.y + conversation.height).toBeLessThanOrEqual(viewport.height);
  await expect(page.getByTestId('klini-ai-sheet').getByTestId('klini-ai-conversation')).toBeVisible();
  await expect(page.getByTestId('klini-ai-sheet').getByTestId('home-bottom-toolbar')).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveCount(1);
  await expect(page.getByTestId('ai-message-input')).toHaveCount(0);
  const input = await page.getByTestId('home-search').boundingBox();
  const close = await page.getByTestId('ai-close').boundingBox();
  const messages = page.getByTestId('ai-messages');
  const dimensions = await messages.evaluate(element => ({ content: element.scrollHeight, viewport: element.clientHeight, width: element.clientWidth, scrollWidth: element.scrollWidth }));
  expect(dimensions.content).toBeGreaterThan(dimensions.viewport);
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width);
  await messages.evaluate(element => { element.scrollTop = 0; });
  expect(await page.getByTestId('home-search').boundingBox()).toEqual(input);
  expect(await page.getByTestId('ai-close').boundingBox()).toEqual(close);
  await messages.evaluate(element => { element.scrollTop = element.scrollHeight; });
  expect(await page.getByTestId('home-search').boundingBox()).toEqual(input);
  expect(await page.getByTestId('ai-close').boundingBox()).toEqual(close);
  await expect(page.getByTestId('home-search')).toBeInViewport();
  await expect(page.getByTestId('home-ai-submit')).toBeInViewport();
  await expect(page.getByTestId('ai-close')).toBeInViewport();
  await expect(page.getByTestId('ai-message-sources')).toBeInViewport();
}

async function main() {
  await mkdir('test-results', { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.KLINI_CHROMIUM_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Mexico_City' });
  const page = await context.newPage();
  const errors: string[] = [], unexpectedPosts: string[] = [], sourceNavigations: string[] = [], requests: AiRequest[] = [];
  page.on('pageerror', error => errors.push(error.message));
  // Every chat response is synthetic. No request can reach the AI bridge or OpenAI.
  await context.route('**/*', async route => {
    const request = route.request();
    if (request.url() === chatEndpoint) {
      const headers = { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'content-type, x-klini-dev-token', 'access-control-allow-methods': 'POST, OPTIONS' };
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      if (request.method() === 'POST') {
        requests.push(request.postDataJSON() as AiRequest);
        return route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ text: fakeAnswer, action: null, sources: [{ id: '1', title: 'Allergic Diseases — NIAID', url: sourceUrl }] }) });
      }
      return route.abort();
    }
    if (request.url() === sourceUrl) {
      sourceNavigations.push(request.url());
      return route.fulfill({ contentType: 'text/html', body: '<title>Fuente interceptada</title><p>Prueba local del enlace. No se accedió al sitio externo.</p>' });
    }
    if (request.method() === 'POST') { unexpectedPosts.push(request.url()); return route.abort(); }
    if (new URL(request.url()).origin !== origin) return route.abort();
    return route.continue();
  });
  try {
    await page.goto(origin);
    await expect(page.getByTestId('home-ai-submit')).toBeVisible();
    await page.getByTestId('home-search').fill('¿Qué es una alergia?');
    await page.getByTestId('home-ai-submit').click();
    await expect(page.getByTestId('ai-message-assistant')).toHaveCount(1);
    await expect(page.getByTestId('home-search')).toHaveValue('');
    await expect(page.getByTestId('ai-mode')).toContainText('IA conectada');
    await expect(page.getByTestId('ai-error')).toHaveCount(0);
    expect(requests).toHaveLength(1);
    expect(requests[0].context.profile.name).toBe('');
    expect(requests[0].context.records).toEqual([]);
    expect(requests[0].context.medications).toEqual([]);
    expect(requests[0].context.appointments).toEqual([]);
    expect(JSON.stringify(requests[0])).not.toMatch(/Sofía|Martínez|Elena|Ríos/);
    expect(sourceNavigations).toEqual([]);
    await expect(page.getByTestId('ai-message-assistant').getByText('Información general', { exact: true })).toHaveCSS('font-weight', '700');
    const inline = page.getByTestId('ai-inline-source-1').first();
    await expect(inline).toHaveAttribute('role', 'link');
    await inline.scrollIntoViewIfNeeded();
    // Expo Linking uses noopener, so the new tab is a context page, not an opener popup.
    const firstPopup = context.waitForEvent('page');
    await inline.click();
    const inlinePopup = await firstPopup;
    await inlinePopup.waitForLoadState('domcontentloaded');
    expect(inlinePopup.url()).toBe(sourceUrl);
    await inlinePopup.close();
    expect(sourceNavigations).toHaveLength(1);
    const source = page.getByTestId('ai-source-link-1');
    await expect(source).toHaveAttribute('role', 'link');
    await expect(source).toContainText('Allergic Diseases — NIAID');
    await expect(source).toContainText('niaid.nih.gov');
    await source.scrollIntoViewIfNeeded();
    const secondPopup = context.waitForEvent('page');
    await source.click();
    const sourcesPopup = await secondPopup;
    await sourcesPopup.waitForLoadState('domcontentloaded');
    expect(sourcesPopup.url()).toBe(sourceUrl);
    await sourcesPopup.close();
    expect(sourceNavigations).toHaveLength(2);
    for (const width of [393, 390, 320]) {
      await page.setViewportSize({ width, height: width === 320 ? 640 : width === 393 ? 852 : 844 });
      await checkLayout(page);
      await page.screenshot({ path: `test-results/klini-ai-sources-${width}.png` });
    }
    await page.getByTestId('ai-close').click();
    await expect(page.getByTestId('klini-ai-conversation')).toHaveCount(0);
    await expect(page.getByTestId('home-search')).toHaveValue('');
    expect(errors).toEqual([]);
    expect(unexpectedPosts).toEqual([]);
    console.log(JSON.stringify({ result: 'PASS', mockedChatRequests: requests.length, liveModelRequests: 0, interceptedSourceNavigations: sourceNavigations.length, generalContextEmpty: true, unifiedSheetSingleComposer: true, widths: [393, 390, 320], pageErrors: errors }, null, 2));
  } finally { await context.close(); await browser.close(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
