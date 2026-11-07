import { chromium, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const origin = 'http://127.0.0.1:8096';
const endpoint = 'http://127.0.0.1:8098/chat';
const kinds = ['weight', 'heart-rate', 'blood-pressure', 'glucose', 'oxygen', 'temperature'] as const;
type Box = { x: number; y: number; width: number; height: number };

async function box(page: Page, id: string): Promise<Box> {
  await expect(page.getByTestId(id)).toBeVisible();
  const value = await page.getByTestId(id).boundingBox();
  expect(value, id).not.toBeNull();
  return value!;
}

async function fits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'No horizontal overflow').toBe(false);
}

async function aboveToolbar(page: Page, id: string, toolbar: Box) {
  await box(page, id);
  await expect(page.getByTestId(id)).toHaveCSS('opacity', '1');
  await expect.poll(async () => {
    const value = await page.getByTestId(id).boundingBox();
    return value ? value.y + value.height : Infinity;
  }).toBeLessThanOrEqual(toolbar.y + 1);
}

async function directWriting(page: Page) {
  await expect(page.getByTestId('home-search')).toBeFocused();
  // Let focus/change state updates and scheduled frames finish before checking
  // that neither the former questions popup nor a conversation opened.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(page.getByTestId('header-panel')).toHaveCount(0);
  await expect(page.getByTestId('ai-ask-question')).toHaveCount(0);
  await expect(page.getByTestId('klini-ai-conversation')).toHaveCount(0);
}

async function homeOrder(page: Page) {
  const viewport = page.viewportSize()!;
  const nav = await box(page, 'home-top-navigation');
  const pager = await box(page, 'home-pager');
  await expect(page.getByTestId('home-profile-name')).toHaveCount(0);
  await expect(page.getByTestId('home-fixed-logo')).toHaveCount(0);
  const toolbar = await box(page, 'home-bottom-toolbar');
  const search = await box(page, 'home-search');
  const avatar = await box(page, 'header-profile');
  const logo = await box(page, 'home-top-logo');
  const today = await box(page, 'home-tab-today');
  expect(logo.y + logo.height / 2).toBeCloseTo(today.y + today.height / 2, 0);
  expect(logo.x + logo.width).toBeLessThanOrEqual(today.x - 4 + .5);
  expect(logo.x).toBeGreaterThanOrEqual(0);
  expect(nav.y + nav.height).toBeLessThanOrEqual(pager.y + 1);
  expect(toolbar.y).toBeGreaterThan(viewport.height * .75);
  expect(toolbar.y + toolbar.height).toBeLessThanOrEqual(viewport.height + 1);
  expect(search.y).toBeGreaterThanOrEqual(toolbar.y);
  expect(avatar.y).toBeLessThan(nav.y + nav.height);
  expect(avatar.x).toBeGreaterThan(viewport.width * .75);
  for (const id of ['home-tab-today', 'home-tab-archive', 'header-profile', 'header-menu', 'home-search', 'home-attachment-add', 'quick-register']) await expect(page.getByTestId(id)).toBeInViewport();
  await fits(page);
  return { nav, toolbar };
}

async function openBody(page: Page) {
  await page.getByTestId('home-tab-archive').click();
  await expect(page.getByTestId('menu-records')).toBeInViewport();
  await expect(page.getByTestId('home-profile-name')).toHaveCount(0);
  await expect(page.getByTestId('menu-records')).toHaveAccessibleName('Parámetros corporales');
  await page.getByTestId('menu-records').click();
  await expect(page.getByTestId('body-parameters-screen')).toBeVisible();
  await expect.poll(() => page.getByTestId('archive-popup').evaluate(element => Math.abs(new DOMMatrixReadOnly(getComputedStyle(element).transform).m42))).toBeLessThanOrEqual(.5);
}

async function verifyBody(page: Page, width: number) {
  await openBody(page);
  for (const kind of kinds) await expect(page.getByTestId(`body-row-${kind}`)).toBeVisible();
  await expect(page.getByTestId(/^body-row-/)).toHaveCount(6);
  await expect(page.getByTestId('body-tab-all')).toContainText('Todos');
  await expect(page.getByTestId('body-tab-favorites')).toContainText('Favoritos');
  await expect(page.getByTestId('body-add-record')).toHaveCount(0);
  await expect(page.getByTestId('body-history-add-record')).toHaveCount(0);
  await fits(page);
  await page.screenshot({ path: `test-results/body-parameters-list-${width}.png` });

  await page.getByTestId('body-row-weight').click();
  await expect(page.getByTestId('body-parameter-history')).toBeVisible();
  await page.getByTestId('body-history-add-record').click();
  await expect(page.getByTestId('body-entry-popup')).toBeVisible();
  await expect(page.getByTestId('body-entry-popup')).toContainText('Peso');
  await expect(page.getByTestId('body-parameter-history')).toBeVisible();
  await page.getByTestId('body-form-value').fill('72.4');
  await page.getByTestId('body-form-save').click();
  await expect(page.getByTestId('body-entry-popup')).toHaveCount(0);
  await expect(page.getByTestId('body-history-latest-value')).toContainText(/72[.,]4/);
  await page.getByTestId('archive-detail-back').click();
  await expect(page.getByTestId('body-row-weight')).toContainText(/72[.,]4/);
  await page.getByTestId('body-row-weight').click();
  await expect(page.getByTestId('body-detail-favorite')).toBeVisible();
  await page.getByTestId('body-detail-favorite').click();
  await page.getByTestId('archive-detail-back').click();
  await page.getByTestId('body-tab-favorites').click();
  await expect(page.getByTestId(/^body-row-/)).toHaveCount(1);
  await expect(page.getByTestId('body-row-weight')).toContainText(/72[.,]4/);
  await page.screenshot({ path: `test-results/body-parameters-favorite-${width}.png` });
  await page.getByTestId('archive-close').click();
  await expect(page.getByTestId('body-parameters-screen')).toHaveCount(0);

  await page.reload();
  await expect(page.getByTestId('home-bottom-toolbar')).toBeVisible();
  await openBody(page);
  await expect(page.getByTestId('body-row-weight')).toContainText(/72[.,]4/);
  await page.getByTestId('body-tab-favorites').click();
  await expect(page.getByTestId(/^body-row-/)).toHaveCount(1);
  await expect(page.getByTestId('body-row-weight')).toBeVisible();
  await page.getByTestId('body-tab-all').click();
  for (const kind of kinds) {
    await page.getByTestId(`body-row-${kind}`).click();
    await expect(page.getByTestId('body-parameter-history')).toBeVisible();
    await page.getByTestId(/^body-history-row-/).first().click();
    await expect(page.getByTestId('body-parameter-detail')).toBeVisible();
    await expect(page.getByTestId('archive-detail-back')).toBeVisible();
    await fits(page);
    await page.getByTestId('archive-detail-back').click();
    await expect(page.getByTestId('body-parameter-history')).toBeVisible();
    await page.getByTestId('archive-detail-back').click();
    await expect(page.getByTestId(`body-row-${kind}`)).toBeVisible();
  }
  await page.getByTestId('body-row-weight').click();
  await page.getByTestId('body-detail-favorite').click();
  await page.getByTestId('archive-detail-back').click();
  await page.getByTestId('body-tab-favorites').click();
  await expect(page.getByTestId(/^body-row-/)).toHaveCount(0);
  await page.getByTestId('body-tab-all').click();
  // Each history starts a popup for its own parameter, including blood
  // pressure's second value. Escape discards the unconfirmed entry.
  for (const kind of kinds) {
    await page.getByTestId(`body-row-${kind}`).click();
    const count = await page.getByTestId(/^body-history-row-/).count();
    await page.getByTestId('body-history-add-record').click();
    await expect(page.getByTestId('body-entry-popup')).toBeVisible();
    await expect(page.getByTestId('body-form-value')).toHaveValue('');
    await expect(page.getByTestId('body-form-secondary')).toHaveCount(kind === 'blood-pressure' ? 1 : 0);
    if (kind === 'heart-rate' || kind === 'blood-pressure') {
      await expect(page.getByTestId('body-entry-popup')).toContainText(kind === 'heart-rate' ? 'Frecuencia cardiaca' : 'Presión arterial');
      await page.getByTestId('body-form-value').fill(kind === 'heart-rate' ? '75' : '120');
      if (kind === 'blood-pressure') {
        await page.getByTestId('body-form-secondary').fill('130');
        await page.getByTestId('body-form-save').click();
        await expect(page.getByTestId('body-entry-error')).toBeVisible();
        await expect(page.getByTestId(/^body-history-row-/)).toHaveCount(count);
        await page.getByTestId('body-form-secondary').fill('80');
      }
      await page.getByTestId('body-form-note').fill('Medición manual ficticia desde popup.');
      await page.screenshot({ path: `test-results/body-entry-${kind}-${width}.png` });
      await page.getByTestId('body-form-save').click();
      await expect(page.getByTestId('body-entry-popup')).toHaveCount(0);
      await expect(page.getByTestId(/^body-history-row-/)).toHaveCount(count + 1);
      await expect(page.getByTestId(/^body-history-row-/).filter({ hasText: kind === 'heart-rate' ? '75' : '120/80' })).toHaveCount(1);
    } else {
      await page.getByTestId('body-form-value').fill('99');
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('body-entry-popup')).toHaveCount(0);
      await expect(page.getByTestId('body-parameter-history')).toBeVisible();
      await expect(page.getByTestId(/^body-history-row-/)).toHaveCount(count);
    }
    await page.getByTestId('archive-detail-back').click();
  }
  await fits(page);
  await page.getByTestId('archive-close').click();
  await expect(page.getByTestId('body-parameters-screen')).toHaveCount(0);
  await page.getByTestId('home-tab-today').click();
}

async function main() {
  await mkdir('test-results', { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.KLINI_CHROMIUM_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const results: unknown[] = [];
  try {
    for (const width of [393, 390, 320]) {
      const height = width === 320 ? 640 : width === 393 ? 852 : 844;
      // A fresh nonpersistent context never accesses the user's Chrome profile
      // or the application's existing local storage.
      const context = await browser.newContext({ viewport: { width, height }, timezoneId: 'America/Mexico_City' });
      const errors: string[] = [], unexpectedPosts: string[] = [];
      let mockedChatRequests = 0;
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await context.route('**/*', async route => {
        const request = route.request();
        if (request.url() === endpoint) {
          const headers = { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'content-type, x-klini-dev-token', 'access-control-allow-methods': 'POST, OPTIONS' };
          if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
          if (request.method() === 'POST') {
            mockedChatRequests++;
            return route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ text: 'Respuesta ficticia para comprobar la posición de la conversación.', action: null, source: 'openai' }) });
          }
          return route.abort();
        }
        if (request.method() === 'POST') { unexpectedPosts.push(request.url()); return route.abort(); }
        if (new URL(request.url()).origin !== origin) return route.abort();
        return route.continue();
      });
      try {
        await page.goto(origin);
        const initial = await homeOrder(page);
        await page.screenshot({ path: `test-results/home-order-${width}.png` });
        await page.getByTestId('header-menu').click();
        await aboveToolbar(page, 'header-panel', initial.toolbar);
        await expect(page.getByTestId('header-panel').getByText('Recetas', { exact: true })).toHaveCount(0);
        await expect(page.getByTestId('header-panel').getByTestId('nav-prescriptions')).toHaveCount(0);
        await fits(page);
        await page.screenshot({ path: `test-results/home-space-menu-${width}.png` });
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('header-panel')).toHaveCount(0);

        await page.getByTestId('home-attachment-add').click();
        await aboveToolbar(page, 'ai-attachment-menu', initial.toolbar);
        for (const mode of ['camera', 'photos', 'files']) await expect(page.getByTestId(`ai-attachment-${mode}`)).toBeVisible();
        await fits(page);
        await page.screenshot({ path: `test-results/home-attachment-upward-${width}.png` });
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('ai-attachment-menu')).toHaveCount(0);

        await page.getByTestId('home-search').click();
        await directWriting(page);
        expect(mockedChatRequests).toBe(0);
        await page.getByTestId('home-search').fill('Estoy escribiendo una pregunta sin enviarla.');
        await directWriting(page);
        expect(mockedChatRequests).toBe(0);
        await fits(page);
        await page.screenshot({ path: `test-results/home-direct-writing-${width}.png` });
        await page.getByTestId('home-search').fill('');
        await page.getByTestId('home-search').evaluate(element => (element as HTMLInputElement).blur());
        await page.getByTestId('home-ai-submit').click();
        await directWriting(page);
        await page.getByTestId('home-search').press('Enter');
        await directWriting(page);
        expect(mockedChatRequests).toBe(0);
        await page.getByTestId('home-search').fill('Hola Klini, envío con Enter.');
        await directWriting(page);
        expect(mockedChatRequests).toBe(0);
        await page.getByTestId('home-search').press('Enter');
        await expect(page.getByTestId('ai-message-assistant')).toHaveCount(1);
        expect(mockedChatRequests).toBe(1);
        await expect(page.getByTestId('header-panel')).toHaveCount(0);
        await page.getByTestId('ai-close').click();
        await expect(page.getByTestId('klini-ai-conversation')).toHaveCount(0);
        await page.getByTestId('home-search').fill('Hola Klini, envío con el botón IA.');
        await directWriting(page);
        expect(mockedChatRequests).toBe(1);
        await page.getByTestId('home-ai-submit').click();
        await expect(page.getByTestId('ai-message-assistant')).toHaveCount(1);
        await expect.poll(() => page.getByTestId('klini-ai-sheet').evaluate(element => Math.abs(new DOMMatrixReadOnly(getComputedStyle(element).transform).m42))).toBeLessThanOrEqual(.5);
        const conversation = await box(page, 'klini-ai-conversation');
        expect(conversation.y + conversation.height).toBeLessThanOrEqual(initial.toolbar.y + 1);
        await expect(page.getByTestId('klini-ai-sheet').getByTestId('klini-ai-conversation')).toBeVisible();
        await expect(page.getByTestId('klini-ai-sheet').getByTestId('home-bottom-toolbar')).toBeVisible();
        await expect(page.getByRole('textbox')).toHaveCount(1);
        await expect(page.getByTestId('ai-message-input')).toHaveCount(0);
        await expect(page.getByTestId('home-search')).toBeInViewport();
        await expect(page.getByTestId('home-search')).toHaveValue('');
        // The same bottom field sends follow-ups without closing or resetting the chat.
        await page.getByTestId('home-search').fill('Continuación desde el mismo cuadro.');
        await expect(page.getByTestId('ai-message-user')).toHaveCount(1);
        expect(mockedChatRequests).toBe(2);
        await page.getByTestId('home-search').press('Enter');
        await expect(page.getByTestId('ai-message-assistant')).toHaveCount(2);
        await expect(page.getByTestId('ai-message-user')).toHaveCount(2);
        await expect(page.getByTestId('home-search')).toHaveValue('');
        await fits(page);
        await page.screenshot({ path: `test-results/home-bottom-ai-chat-${width}.png` });
        await page.getByTestId('ai-close').click();
        await verifyBody(page, width);
        await homeOrder(page);
        expect(mockedChatRequests).toBe(3);
        expect(unexpectedPosts).toEqual([]);
        expect(errors).toEqual([]);
        results.push({ width, height, profileNameHidden: true, topLogoAligned: true, bottomSearch: true, directWritingWithoutSuggestions: true, typingDoesNotSubmit: true, emptyBadgeFocusesInput: true, emptyEnterDoesNotSubmit: true, enterAndBadgeSubmit: true, upwardMenus: true, menuRecipesAbsent: true, bodyRows: kinds.length, measurementAndFavoritePersist: true, allRowDetails: true, allParameterEntryPopups: true, heartRateAndPressureSaved: true, invalidPressureRejected: true, escapeDiscardsEntry: true, noHorizontalOverflow: true, mockedChatRequests, liveModelRequests: 0 });
      } catch (error) {
        await page.screenshot({ path: `test-results/home-body-verification-failure-${width}.png` }).catch(() => undefined);
        throw error;
      } finally { await context.close(); }
    }
    console.log(JSON.stringify({ result: 'PASS', results }, null, 2));
  } finally { await browser.close(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
