import { chromium, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import type { AiRequest } from '../src/domain/kliniAi';
import type { AiAttachment } from '../src/domain/kliniAiAttachments';

const origin = 'http://127.0.0.1:8096';
const endpoint = 'http://127.0.0.1:8098/chat';
const fileName = 'Analisis-ficticio.txt';
const fileText = 'Documento ficticio para probar adjuntos. Sin datos de pacientes reales.';
const imageName = 'foto-prueba.png';
const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+yBncAAAAASUVORK5CYII=', 'base64');
type AttachmentRequest = AiRequest & { attachments?: AiAttachment[] };

async function openMenu(page: Page) {
  await page.getByTestId('home-attachment-add').click();
  await expect(page.getByTestId('ai-attachment-menu')).toBeVisible();
  await expect(page.getByTestId('header-panel')).toHaveCount(0);
  for (const mode of ['camera', 'photos', 'files']) await expect(page.getByTestId(`ai-attachment-${mode}`)).toBeVisible();
}

async function selectFile(page: Page, mode: 'photos' | 'files', file: { name: string; mimeType: string; buffer: Buffer }) {
  await openMenu(page);
  const chooser = page.waitForEvent('filechooser');
  await page.getByTestId(`ai-attachment-${mode}`).click();
  await (await chooser).setFiles(file);
  await expect(page.getByTestId('home-attachment-add')).toBeEnabled();
}

async function fits(page: Page) {
  if (await page.getByTestId('klini-ai-sheet').count()) await expect.poll(() => page.getByTestId('klini-ai-sheet').evaluate(element => Math.abs(new DOMMatrixReadOnly(getComputedStyle(element).transform).m42))).toBeLessThanOrEqual(.5);
  const viewport = page.viewportSize()!;
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  for (const id of ['home-attachment-add', 'home-search', 'home-ai-submit']) await expect(page.getByTestId(id)).toBeInViewport();
  for (const id of ['ai-attachment-menu', 'ai-attachment-area', 'klini-ai-conversation']) {
    if (!(await page.getByTestId(id).count())) continue;
    const box = await page.getByTestId(id).boundingBox();
    if (!box) continue;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  }
}

async function main() {
  await mkdir('test-results', { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.KLINI_CHROMIUM_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Mexico_City' });
  const page = await context.newPage();
  const requests: AttachmentRequest[] = [], unexpectedPosts: string[] = [], errors: string[] = [];
  let releaseFirstAnswer: (() => void) | undefined;
  page.on('pageerror', error => errors.push(error.message));
  // All chat calls are intercepted; neither the bridge nor a model is contacted.
  await context.route('**/*', async route => {
    const request = route.request();
    if (request.url() === endpoint) {
      const headers = { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'content-type, x-klini-dev-token', 'access-control-allow-methods': 'POST, OPTIONS' };
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      if (request.method() === 'POST') {
        requests.push(request.postDataJSON() as AttachmentRequest);
        if (requests.length === 1) await new Promise<void>(resolve => { releaseFirstAnswer = resolve; });
        return route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ text: 'Respuesta ficticia: recibí los archivos seleccionados para esta pregunta.', action: null }) });
      }
      return route.abort();
    }
    if (request.method() === 'POST') { unexpectedPosts.push(request.url()); return route.abort(); }
    if (new URL(request.url()).origin !== origin) return route.abort();
    return route.continue();
  });
  try {
    await page.goto(origin);
    await expect(page.getByTestId('home-attachment-add')).toBeVisible();
    await openMenu(page);
    await fits(page);
    await page.screenshot({ path: 'test-results/klini-ai-attachments-menu-390.png' });
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('ai-attachment-menu')).toHaveCount(0);
    await openMenu(page);
    await page.getByTestId('ai-attachment-dismiss').click({ position: { x: 12, y: 350 } });
    await expect(page.getByTestId('ai-attachment-menu')).toHaveCount(0);
    await openMenu(page);
    await page.getByTestId('ai-attachment-camera').click();
    await expect(page.getByTestId('record-photo-popup')).toBeVisible();
    await expect(page.getByTestId('record-photo-popup')).toContainText('Foto para Klini IA');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('record-photo-popup')).toHaveCount(0);
    expect(requests).toHaveLength(0);

    // A real picker cancel resolves without showing an error or sending a question.
    await openMenu(page);
    const cancelChooser = page.waitForEvent('filechooser');
    await page.getByTestId('ai-attachment-files').click();
    await (await cancelChooser).element().dispatchEvent('cancel');
    await expect(page.getByTestId('home-attachment-add')).toBeEnabled();
    await expect(page.getByTestId('ai-attachment-error')).toHaveCount(0);
    await expect(page.getByTestId('ai-attachment-chip')).toHaveCount(0);

    await selectFile(page, 'files', { name: 'demasiado-grande.txt', mimeType: 'text/plain', buffer: Buffer.alloc(2 * 1024 * 1024 + 1, 'x') });
    await expect(page.getByTestId('ai-attachment-error')).toContainText('2 MB');
    await expect(page.getByTestId('ai-attachment-chip')).toHaveCount(0);
    await page.getByTestId('ai-attachment-error-close').click();
    await selectFile(page, 'files', { name: fileName, mimeType: 'text/plain', buffer: Buffer.from(fileText, 'utf8') });
    await expect(page.getByTestId('ai-attachment-chip')).toHaveCount(1);
    await expect(page.getByTestId('ai-attachment-chip')).toContainText(fileName);
    expect(requests).toHaveLength(0);
    await page.getByRole('button', { name: `Quitar ${fileName}`, exact: true }).click();
    await expect(page.getByTestId('ai-attachment-area')).toHaveCount(0);
    await selectFile(page, 'files', { name: fileName, mimeType: 'text/plain', buffer: Buffer.from(fileText, 'utf8') });
    await selectFile(page, 'photos', { name: imageName, mimeType: 'image/png', buffer: tinyPng });
    await expect(page.getByTestId('ai-attachment-chip')).toHaveCount(2);
    await expect(page.getByTestId('ai-attachment-chip').last()).toContainText(imageName);
    expect(requests).toHaveLength(0);

    for (const width of [393, 390, 320]) {
      await page.setViewportSize({ width, height: width === 320 ? 640 : width === 393 ? 852 : 844 });
      await fits(page);
      await page.screenshot({ path: `test-results/klini-ai-attachments-selected-${width}.png` });
    }
    await page.getByTestId('home-search').fill('Explica los archivos adjuntos.');
    await page.getByTestId('home-ai-submit').click();
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0].attachments).toHaveLength(2);
    const textAttachment = requests[0].attachments!.find(attachment => attachment.name === fileName)!;
    expect(textAttachment.dataUri).toBe(`data:text/plain;base64,${Buffer.from(fileText, 'utf8').toString('base64')}`);
    expect(requests[0].attachments!.find(attachment => attachment.name === imageName)?.mimeType).toBe('image/png');
    await expect(page.getByTestId('home-attachment-add')).toBeDisabled();
    await expect(page.getByTestId('home-ai-submit')).toBeDisabled();
    await expect(page.getByTestId('home-search')).toBeEditable();
    await page.getByTestId('home-search').fill('Borrador mientras responde.');
    await page.getByTestId('home-search').press('Enter');
    await expect(page.getByTestId('home-search')).toHaveValue('Borrador mientras responde.');
    expect(requests).toHaveLength(1);
    releaseFirstAnswer!();
    await expect(page.getByTestId('ai-message-assistant')).toHaveCount(1);
    await expect(page.getByTestId('home-search')).toHaveValue('Borrador mientras responde.');
    await expect(page.getByTestId('home-ai-submit')).toBeEnabled();
    await page.getByTestId('home-search').fill('');
    await expect(page.getByTestId('ai-message-attachment')).toHaveCount(2);
    await expect(page.getByTestId('ai-message-user')).toContainText(fileName);
    await expect(page.getByTestId('ai-message-user')).toContainText(imageName);
    expect(await page.getByTestId('ai-message-user').innerText()).not.toContain('base64');
    for (const width of [393, 390, 320]) {
      await page.setViewportSize({ width, height: width === 320 ? 640 : width === 393 ? 852 : 844 });
      await fits(page);
      await expect(page.getByTestId('klini-ai-sheet').getByTestId('klini-ai-conversation')).toBeVisible();
      await expect(page.getByTestId('klini-ai-sheet').getByTestId('home-bottom-toolbar')).toBeVisible();
      await expect(page.getByTestId('klini-ai-sheet').getByTestId('ai-attachment-area')).toBeVisible();
      await expect(page.getByRole('textbox')).toHaveCount(1);
      const area = (await page.getByTestId('ai-attachment-area').boundingBox())!;
      const conversation = (await page.getByTestId('klini-ai-conversation').boundingBox())!;
      expect(conversation.y + conversation.height).toBeLessThanOrEqual(area.y);
      const toolbar = (await page.getByTestId('home-bottom-toolbar').boundingBox())!;
      expect(area.y + area.height).toBeLessThanOrEqual(toolbar.y);
      await expect(page.getByTestId('home-search')).toBeInViewport();
      await expect(page.getByTestId('home-search')).toHaveValue('');
      await page.screenshot({ path: `test-results/klini-ai-attachments-chat-${width}.png` });
    }
    await page.getByTestId('home-search').fill('Resume el texto del primer archivo.');
    await expect(page.getByTestId('ai-message-assistant')).toHaveCount(1);
    await page.getByTestId('home-ai-submit').click();
    await expect(page.getByTestId('ai-message-assistant')).toHaveCount(2);
    expect(requests).toHaveLength(2);
    expect(requests[1].attachments).toEqual(requests[0].attachments);
    expect(JSON.stringify(requests[1].history)).not.toContain('base64');
    expect(JSON.stringify(requests[1].history)).not.toContain('dataUri');
    await page.getByTestId('ai-close').click();
    await expect(page.getByTestId('klini-ai-conversation')).toHaveCount(0);
    await expect(page.getByTestId('ai-attachment-chip')).toHaveCount(0);
    await expect(page.getByTestId('ai-attachment-area')).toHaveCount(0);
    await expect(page.getByTestId('home-search')).toHaveValue('');
    await expect(page.getByTestId('home-attachment-add')).toBeEnabled();
    await selectFile(page, 'files', { name: fileName, mimeType: 'text/plain', buffer: Buffer.from(fileText, 'utf8') });
    expect(requests).toHaveLength(2);
    // Files alone can be sent explicitly via the IA badge with a helpful default prompt.
    await page.getByTestId('home-ai-submit').click();
    await expect(page.getByTestId('ai-message-assistant')).toHaveCount(1);
    expect(requests).toHaveLength(3);
    expect(requests[2].question).toBe('Ayúdame a entender los archivos adjuntos.');
    expect(requests[2].attachments).toHaveLength(1);
    expect(requests[2].history).toEqual([]);
    await expect(page.getByTestId('ai-message-user')).toContainText(fileName);
    await page.getByTestId('ai-close').click();
    await expect(page.getByTestId('ai-attachment-area')).toHaveCount(0);
    expect(unexpectedPosts).toEqual([]);
    expect(errors).toEqual([]);
    console.log(JSON.stringify({ result: 'PASS', mockedChatRequests: requests.length, liveModelRequests: 0, pickerCancelWithoutError: true, filesAndPhotosAttached: true, filesOnlyPrompt: true, followupRetainsFiles: true, closeClearsFiles: true, unifiedSheetSingleComposer: true, widths: [393, 390, 320], pageErrors: errors }, null, 2));
  } finally { releaseFirstAnswer?.(); await context.close(); await browser.close(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
