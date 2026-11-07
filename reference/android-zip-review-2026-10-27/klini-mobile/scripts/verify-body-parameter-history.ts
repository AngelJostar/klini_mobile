import { chromium, expect, type Page } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';

const origin = 'http://127.0.0.1:8096';
const storageKey = '@klini/app-state:v1';
const now = new Date('2026-11-02T12:00:00-06:00');
const rowPrefix = 'body-history-row-';
const currentRow = `${rowPrefix}body-demo-weight-current`;
const previousRow = `${rowPrefix}body-demo-weight-previous`;
const earlierRow = `${rowPrefix}body-demo-weight-earlier`;
const note = 'En ayunas · edición ficticia de prueba';
type StoredReading = { id: string; kind: string; value: number; note?: string; favorite: boolean; demoKey?: string };

async function storedReadings(page: Page, kind: string): Promise<StoredReading[]> {
  return page.evaluate(({ key, targetKind }) => {
    const state = JSON.parse(localStorage.getItem(key)!);
    return state.records.flatMap((record: { id: string; description: string }) => {
      const marker = '[KLINI_BODY_PARAMETER_V1]';
      const offset = record.description.lastIndexOf(marker);
      if (offset < 0) return [];
      try {
        const payload = JSON.parse(record.description.slice(offset + marker.length).trim());
        return payload.kind === targetKind ? [{ ...payload, id: record.id }] : [];
      } catch { return []; }
    });
  }, { key: storageKey, targetKind: kind });
}

async function fits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  const bounds = await page.getByTestId('archive-popup').boundingBox();
  const viewport = page.viewportSize()!;
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1);
}

async function openBody(page: Page) {
  await expect(page.getByTestId('home-tab-archive')).toBeVisible();
  await page.getByTestId('home-tab-archive').click();
  await expect(page.getByTestId('menu-records')).toBeInViewport();
  await page.getByTestId('menu-records').click();
  await expect(page.getByTestId('body-parameters-screen')).toBeVisible();
  await expect.poll(() => page.getByTestId('archive-popup').evaluate(element => Math.abs(new DOMMatrixReadOnly(getComputedStyle(element).transform).m42))).toBeLessThanOrEqual(.5);
}

async function weightHistory(page: Page) {
  await page.getByTestId('body-row-weight').click();
  await expect(page.getByTestId('body-parameter-history')).toBeVisible();
  await expect(page.getByTestId('body-history-title')).toContainText('Peso');
}

async function checkEntryPopup(page: Page, width: number) {
  const popup = page.getByTestId('body-entry-popup');
  await expect(popup).toBeVisible();
  await expect(popup).toContainText('Agregar registro');
  await expect(popup).toContainText('Peso');
  // Adding a measurement overlays the existing history; cancelling must not
  // navigate to a replacement form screen or create a record.
  await expect(page.getByTestId('body-parameter-history')).toBeVisible();
  await expect(page.getByTestId('body-parameter-form')).toHaveCount(0);
  const bounds = await popup.boundingBox();
  const viewport = page.viewportSize()!;
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(16);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width - 15);
  expect(bounds!.y).toBeGreaterThan(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
  expect(bounds!.x + bounds!.width / 2).toBeCloseTo(viewport.width / 2, 0);
  const date = await page.getByTestId('body-form-date').boundingBox();
  const time = await page.getByTestId('body-form-time').boundingBox();
  expect(date!.x + date!.width).toBeLessThan(time!.x);
  expect(date!.y + date!.height / 2).toBeCloseTo(time!.y + time!.height / 2, 0);
  for (const id of ['body-form-value', 'body-form-date', 'body-form-time', 'body-form-note', 'body-form-save', 'body-entry-close']) {
    await expect(page.getByTestId(id)).toBeInViewport();
    const control = await page.getByTestId(id).boundingBox();
    expect(control!.x).toBeGreaterThanOrEqual(bounds!.x);
    expect(control!.x + control!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width);
  }
  await fits(page);
  await page.screenshot({ path: `test-results/body-entry-popup-${width}.png` });
}

async function rows(page: Page, count: number) {
  await expect(page.getByTestId(/^body-history-row-/)).toHaveCount(count);
}

async function openFilters(page: Page) {
  await page.getByTestId('body-history-filters').click();
  await expect(page.getByTestId('body-filters-popup')).toBeVisible();
}

async function source(page: Page, value: 'all' | 'manual' | 'smart-scale') {
  await page.getByTestId('body-filter-source').click();
  await page.getByTestId(`body-filter-source-${value}`).click();
}

async function applyFilters(page: Page) {
  await page.getByTestId('body-filters-apply').click();
  await expect(page.getByTestId('body-filters-popup')).toHaveCount(0);
}

async function clearFilters(page: Page) {
  await page.getByTestId('body-history-clear-filters').click();
  await rows(page, 3);
  await expect(page.getByTestId('body-history-clear-filters')).toHaveCount(0);
}

async function checkFilterLayout(page: Page) {
  const popup = page.getByTestId('body-filters-popup');
  const bounds = await popup.boundingBox();
  const viewport = page.viewportSize()!;
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(16);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width - 15);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
  await expect(popup.getByText('Fecha', { exact: true })).toHaveCount(0);
  for (const [field, label] of [['from', 'Desde'], ['to', 'Hasta']] as const) {
    const caption = await popup.getByText(label, { exact: true }).boundingBox();
    const input = await page.getByTestId(`body-filter-${field}`).boundingBox();
    expect(caption!.y + caption!.height).toBeLessThanOrEqual(input!.y);
  }
  const sourceRow = page.getByTestId('body-filter-source');
  const sourceLabel = await sourceRow.getByText('Fuente', { exact: true }).boundingBox();
  const sourceValue = await sourceRow.getByText('Todas', { exact: true }).boundingBox();
  expect(sourceLabel!.x + sourceLabel!.width).toBeLessThan(sourceValue!.x);
  expect(sourceLabel!.y + sourceLabel!.height / 2).toBeCloseTo(sourceValue!.y + sourceValue!.height / 2, 0);
  const clear = await page.getByTestId('body-filters-clear').boundingBox();
  const apply = await page.getByTestId('body-filters-apply').boundingBox();
  expect(clear!.x + clear!.width).toBeLessThan(apply!.x);
  expect(clear!.y + clear!.height / 2).toBeCloseTo(apply!.y + apply!.height / 2, 0);
  for (const id of ['body-filter-from', 'body-filter-to', 'body-filter-source', 'body-filters-clear', 'body-filters-apply']) {
    await expect(page.getByTestId(id)).toBeInViewport();
    const control = await page.getByTestId(id).boundingBox();
    expect(control!.x).toBeGreaterThanOrEqual(bounds!.x);
    expect(control!.x + control!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width);
  }
}

async function checkOverviewFilters(page: Page, width: number) {
  const title = await page.getByTestId('body-list-title').boundingBox();
  const control = await page.getByTestId('body-list-filters').boundingBox();
  const overviewPanel = await page.getByTestId('archive-popup').boundingBox();
  expect(control!.width).toBe(44);
  expect(control!.height).toBe(44);
  expect(title!.y + title!.height).toBeLessThanOrEqual(control!.y);
  expect(control!.x).toBeGreaterThanOrEqual(overviewPanel!.x);
  expect(control!.x + control!.width).toBeLessThanOrEqual(overviewPanel!.x + overviewPanel!.width);
  const tabs = await page.getByRole('tablist').boundingBox();
  expect(tabs!.width).toBeGreaterThanOrEqual(176);
  expect(tabs!.width).toBeLessThanOrEqual(190);
  expect(tabs!.height).toBeGreaterThanOrEqual(28);
  expect(tabs!.height).toBeLessThanOrEqual(30);
  expect(tabs!.x + tabs!.width / 2).toBeCloseTo(overviewPanel!.x + overviewPanel!.width / 2, 0);
  expect(control!.x).toBeGreaterThanOrEqual(tabs!.x + tabs!.width);
  expect(control!.y + control!.height / 2).toBeCloseTo(tabs!.y + tabs!.height / 2, 0);
  await expect(page.getByTestId('body-tab-favorites')).toHaveAccessibleName('Favoritos (0)');
  await page.screenshot({ path: `test-results/body-overview-top-filter-${width}.png` });
  await page.getByTestId('body-list-filters').click();
  await expect(page.getByTestId('body-filters-popup')).toBeVisible();
  await expect(page.getByTestId('body-filter-min')).toHaveCount(0);
  await expect(page.getByTestId('body-filter-max')).toHaveCount(0);
  await checkFilterLayout(page);
  await page.screenshot({ path: `test-results/body-overview-filters-${width}.png` });
  await page.getByTestId('body-filter-from').fill('01/11/2026');
  await page.getByTestId('body-filter-to').fill('01/11/2026');
  await source(page, 'smart-scale');
  await applyFilters(page);
  await expect(page.getByTestId(/^body-row-/)).toHaveCount(1);
  await expect(page.getByTestId('body-row-weight')).toContainText(/68[.,]6/);
  await page.getByTestId('body-list-filters').click();
  await page.getByTestId('body-filter-from').fill('01/11/2027');
  await page.getByTestId('body-filters-close').click();
  await expect(page.getByTestId('body-row-weight')).toContainText(/68[.,]6/);
  await weightHistory(page);
  await rows(page, 3);
  const favorite = await page.getByTestId('body-detail-favorite').boundingBox();
  const historyControl = await page.getByTestId('body-history-filters').boundingBox();
  const historyPanel = await page.getByTestId('archive-popup').boundingBox();
  const historyValue = await page.getByTestId('body-history-latest-value').boundingBox();
  expect(historyControl!.width).toBe(44);
  expect(historyControl!.height).toBe(44);
  expect(historyControl!.x).toBeGreaterThanOrEqual(favorite!.x + favorite!.width);
  expect(historyControl!.y).toBeCloseTo(favorite!.y, 0);
  expect(historyControl!.x - historyPanel!.x).toBeCloseTo(control!.x - overviewPanel!.x, 0);
  expect(historyControl!.y - historyPanel!.y).toBeCloseTo(control!.y - overviewPanel!.y, 0);
  expect(historyValue!.y).toBeCloseTo(historyControl!.y, 0);
  expect(historyValue!.x + historyValue!.width).toBeLessThanOrEqual(favorite!.x);
  await page.getByTestId('body-detail-favorite').click();
  await openFilters(page);
  await expect(page.getByTestId('body-filter-min')).toBeVisible();
  await source(page, 'manual');
  await applyFilters(page);
  await rows(page, 2);
  await page.getByTestId('archive-detail-back').click();
  await expect(page.getByTestId('body-row-weight')).toContainText(/68[.,]6/);
  await page.getByTestId('body-tab-favorites').click();
  await expect(page.getByTestId('body-tab-favorites')).toHaveAccessibleName('Favoritos (1)');
  await expect(page.getByTestId(/^body-row-/)).toHaveCount(1);
  await expect(page.getByTestId('body-row-weight')).toContainText(/68[.,]6/);
  await page.getByTestId('body-list-clear-filters').click();
  await expect(page.getByTestId('body-list-clear-filters')).toHaveCount(0);
  await page.getByTestId('body-tab-all').click();
  await expect(page.getByTestId(/^body-row-/)).toHaveCount(6);
  await weightHistory(page);
  await rows(page, 3);
  await page.getByTestId('body-detail-favorite').click();
  await page.getByTestId('archive-detail-back').click();
  await fits(page);
}

async function checkFilters(page: Page, width: number) {
  await openFilters(page);
  await checkFilterLayout(page);
  await page.screenshot({ path: `test-results/body-history-filters-layout-${width}.png` });
  await source(page, 'smart-scale');
  await applyFilters(page);
  await rows(page, 1);
  await expect(page.getByTestId(previousRow)).toContainText('Báscula inteligente');
  await clearFilters(page);

  await openFilters(page);
  await page.getByTestId('body-filter-calendar-from').click();
  await expect(page.getByTestId('body-filter-calendar')).toBeVisible();
  await page.getByRole('button', { name: '01/11/2026', exact: true }).click();
  await expect(page.getByTestId('body-filter-from')).toHaveValue('01/11/2026');
  await page.getByTestId('body-filter-to').fill('01/11/2026');
  await applyFilters(page);
  await rows(page, 1);
  await expect(page.getByTestId(previousRow)).toBeVisible();
  await clearFilters(page);

  await openFilters(page);
  await page.getByTestId('body-filter-min').fill('68,5');
  await page.getByTestId('body-filter-max').fill('68,7');
  await applyFilters(page);
  await rows(page, 1);
  await expect(page.getByTestId(previousRow)).toBeVisible();
  await openFilters(page);
  await page.getByTestId('body-filters-clear').click();
  if (await page.getByTestId('body-filters-popup').count()) await applyFilters(page);
  await rows(page, 3);

  await openFilters(page);
  await source(page, 'manual');
  await applyFilters(page);
  await rows(page, 2);
  await openFilters(page);
  await source(page, 'smart-scale');
  await page.getByTestId('body-filter-min').fill('200');
  await page.getByTestId('body-filters-close').click();
  await expect(page.getByTestId('body-filters-popup')).toHaveCount(0);
  await rows(page, 2);
  await expect(page.getByTestId(currentRow)).toBeVisible();
  await expect(page.getByTestId(earlierRow)).toBeVisible();
  await clearFilters(page);

  await openFilters(page);
  await page.getByTestId('body-filter-from').fill('31/02/2026');
  await page.getByTestId('body-filters-apply').click();
  await expect(page.getByTestId('body-filters-error')).toBeVisible();
  await expect(page.getByTestId('body-filters-popup')).toBeVisible();
  await page.getByTestId('body-filters-close').click();
  await rows(page, 3);
  await openFilters(page);
  await page.getByTestId('body-filter-min').fill('70');
  await page.getByTestId('body-filter-max').fill('60');
  await page.getByTestId('body-filters-apply').click();
  await expect(page.getByTestId('body-filters-error')).toBeVisible();
  await page.getByTestId('body-filters-close').click();
  await rows(page, 3);

  await openFilters(page);
  await page.getByTestId('body-filter-min').fill('200');
  await page.getByTestId('body-filter-max').fill('250');
  await page.screenshot({ path: `test-results/body-history-filters-${width}.png` });
  await applyFilters(page);
  await rows(page, 0);
  await expect(page.getByTestId('body-parameter-history')).toContainText(/No hay|Sin registros|No encontramos/);
  await fits(page);
  await page.screenshot({ path: `test-results/body-history-no-results-${width}.png` });
  await clearFilters(page);
}

async function main() {
  await mkdir('test-results', { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.KLINI_CHROMIUM_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const results: unknown[] = [];
  try {
    for (const width of [393, 390, 320]) {
      const height = width === 393 ? 852 : width === 390 ? 844 : 640;
      const context = await browser.newContext({ viewport: { width, height }, timezoneId: 'America/Mexico_City', acceptDownloads: true });
      // Keep a predictable month boundary while allowing Date.now to advance
      // at its real rate. RN Animated uses that clock; freezing it would stop
      // popup transitions even when requestAnimationFrame still runs.
      await context.addInitScript(`(() => {
        const NativeDate = Date;
        const offset = ${now.getTime()} - NativeDate.now();
        globalThis.Date = new Proxy(NativeDate, {
          construct: (target, args) => Reflect.construct(target, args.length ? args : [target.now() + offset]),
          apply: () => new NativeDate(NativeDate.now() + offset).toString(),
          get: (target, property, receiver) => property === 'now' ? () => NativeDate.now() + offset : Reflect.get(target, property, receiver),
        });
      })();`);
      const page = await context.newPage();
      const errors: string[] = [], posts: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      // No chat/provider or external communication is needed for these records.
      await context.route('**/*', route => {
        const request = route.request();
        if (request.method() === 'POST') { posts.push(request.url()); return route.abort(); }
        if (new URL(request.url()).origin !== origin) return route.abort();
        return route.continue();
      });
      try {
        await page.goto(origin);
        await openBody(page);
        await expect(page.getByTestId(/^body-row-/)).toHaveCount(6);
        await checkOverviewFilters(page, width);
        await page.getByTestId('body-row-heart-rate').click();
        await page.getByTestId('body-detail-favorite').click();
        await expect.poll(async () => (await storedReadings(page, 'heart-rate')).filter(item => item.favorite).length).toBe(1);
        const otherFavorite = await storedReadings(page, 'heart-rate');
        await page.getByTestId('archive-detail-back').click();
        await expect(page.getByTestId('body-tab-favorites')).toHaveAccessibleName('Favoritos (1)');
        await page.screenshot({ path: `test-results/body-overview-compact-tabs-${width}.png` });
        await page.getByTestId('body-tab-favorites').click();
        await expect(page.getByTestId(/^body-row-/)).toHaveCount(1);
        await page.screenshot({ path: `test-results/body-overview-favorites-tab-${width}.png` });
        await page.getByTestId('body-tab-all').click();
        await weightHistory(page);
        await rows(page, 3);
        await expect(page.getByTestId('body-history-latest-value')).toContainText(/68[.,]4/);
        await expect(page.getByTestId('body-history-month-2026-11')).toBeVisible();
        await expect(page.getByTestId('body-history-month-2026-10')).toBeVisible();
        await expect(page.getByTestId(previousRow)).toContainText('Báscula inteligente');
        await fits(page);
        await page.screenshot({ path: `test-results/body-history-weight-${width}.png` });
        await checkFilters(page, width);

        await page.getByTestId(currentRow).click();
        await expect(page.getByTestId('body-parameter-detail')).toBeVisible();
        await expect(page.getByTestId('body-detail-note')).toContainText('En ayunas');
        const downloadEvent = page.waitForEvent('download');
        await page.getByTestId('body-detail-share').click();
        const download = await downloadEvent;
        expect(download.suggestedFilename()).toMatch(/\.txt$/i);
        const downloadedPath = await download.path();
        expect(downloadedPath).not.toBeNull();
        const exported = await readFile(downloadedPath!, 'utf8');
        expect(exported).toMatch(/Peso/);
        expect(exported).toMatch(/68[.,]4/);
        expect(exported).toMatch(/En ayunas/);
        await page.getByTestId('body-detail-edit').click();
        await page.getByTestId('body-form-value').fill('68.5');
        await page.getByTestId('body-form-note').fill(note);
        await page.getByTestId('body-form-save').click();
        await expect(page.getByTestId('body-parameter-detail')).toBeVisible();
        await expect(page.getByTestId('body-detail-note')).toContainText(note);
        await expect.poll(async () => (await storedReadings(page, 'weight')).length).toBe(1);
        const editedId = (await storedReadings(page, 'weight'))[0].id;
        await page.getByTestId('body-detail-edit').click();
        await page.getByTestId('body-form-note').fill(`${note} · guardado de nuevo`);
        await page.getByTestId('body-form-save').click();
        await expect(page.getByTestId('body-parameter-detail')).toBeVisible();
        await expect.poll(async () => (await storedReadings(page, 'weight')).length).toBe(1);
        expect((await storedReadings(page, 'weight'))[0].id).toBe(editedId);
        await page.getByTestId('archive-detail-back').click();
        await rows(page, 3);
        await expect(page.getByTestId(currentRow)).toContainText(/68[.,]5/);

        await page.getByTestId('body-history-add-record').click();
        await checkEntryPopup(page, width);
        const beforeCancelledDraft = await storedReadings(page, 'weight');
        await page.getByTestId('body-form-value').fill('99.9');
        await page.getByTestId('body-form-note').fill('Borrador cancelado; no debe persistirse.');
        await page.getByTestId('body-entry-close').click();
        await expect(page.getByTestId('body-entry-popup')).toHaveCount(0);
        await rows(page, 3);
        expect(await storedReadings(page, 'weight')).toEqual(beforeCancelledDraft);
        await page.getByTestId('body-history-add-record').click();
        await expect(page.getByTestId('body-form-value')).toHaveValue('');
        await expect(page.getByTestId('body-form-note')).toHaveValue('');
        await page.getByTestId('body-form-save').click();
        await expect(page.getByTestId('body-entry-error')).toBeVisible();
        await expect(page.getByTestId('body-entry-popup')).toBeVisible();
        expect(await storedReadings(page, 'weight')).toEqual(beforeCancelledDraft);
        await page.getByTestId('body-form-value').fill('74.2');
        await page.getByTestId('body-form-date').click();
        await page.getByTestId('body-entry-date-input').fill('2026-02-31');
        await page.getByTestId('body-entry-date-done').click();
        await page.getByTestId('body-form-save').click();
        await expect(page.getByTestId('body-entry-error')).toContainText('fecha válida');
        expect(await storedReadings(page, 'weight')).toEqual(beforeCancelledDraft);
        await page.getByTestId('body-form-date').click();
        await page.getByTestId('body-entry-date-input').fill('2026-11-02');
        await page.getByTestId('body-entry-date-done').click();
        await page.getByTestId('body-form-date').click();
        await expect(page.getByTestId('body-entry-calendar-day-2026-11-03')).toBeDisabled();
        await page.getByTestId('body-entry-calendar-day-2026-11-01').click();
        await expect(page.getByTestId('body-form-date')).toContainText(/01.*nov.*2026/);
        await page.getByTestId('body-form-date').click();
        await page.getByTestId('body-entry-calendar-day-2026-11-02').click();
        await page.getByTestId('body-form-time').fill('11:59');
        await page.getByTestId('body-form-note').fill('Medición manual ficticia para verificar el historial.');
        await page.getByTestId('body-form-save').click();
        await expect(page.getByTestId('body-entry-popup')).toHaveCount(0);
        await expect(page.getByTestId('body-parameter-history')).toBeVisible();
        await rows(page, 4);
        await expect(page.getByTestId('body-history-latest-value')).toContainText(/74[.,]2/);
        await expect.poll(async () => (await storedReadings(page, 'weight')).length).toBe(2);
        expect(await storedReadings(page, 'heart-rate')).toEqual(otherFavorite);
        await page.getByTestId('body-detail-favorite').click();
        await page.getByTestId('archive-detail-back').click();
        await page.getByTestId('body-tab-favorites').click();
        await expect(page.getByTestId(/^body-row-/)).toHaveCount(2);
        await expect(page.getByTestId('body-tab-favorites')).toHaveAccessibleName('Favoritos (2)');
        await expect(page.getByTestId('body-row-heart-rate')).toBeVisible();
        await expect(page.getByTestId('body-row-weight')).toBeVisible();
        await page.getByTestId('body-row-weight').click();
        await page.getByTestId('body-detail-favorite').click();
        await page.getByTestId('archive-detail-back').click();
        await page.getByTestId('body-tab-favorites').click();
        await expect(page.getByTestId(/^body-row-/)).toHaveCount(1);
        await expect(page.getByTestId('body-tab-favorites')).toHaveAccessibleName('Favoritos (1)');
        await expect(page.getByTestId('body-row-heart-rate')).toBeVisible();
        expect(await storedReadings(page, 'heart-rate')).toEqual(otherFavorite);
        await page.getByTestId('archive-close').click();
        await expect(page.getByTestId('body-parameters-screen')).toHaveCount(0);
        await page.reload();
        await openBody(page);
        await weightHistory(page);
        await rows(page, 4);
        await expect(page.getByTestId('body-history-latest-value')).toContainText(/74[.,]2/);
        await page.getByTestId(currentRow).click();
        await expect(page.getByTestId('body-detail-note')).toContainText(`${note} · guardado de nuevo`);
        await expect(page.getByTestId('body-parameter-detail')).toContainText(/68[.,]5/);
        await fits(page);
        await page.screenshot({ path: `test-results/body-history-edited-detail-${width}.png` });
        await page.getByTestId('archive-detail-back').click();
        await page.screenshot({ path: `test-results/body-history-persisted-${width}.png` });
        expect((await storedReadings(page, 'weight')).length).toBe(2);
        expect(await storedReadings(page, 'heart-rate')).toEqual(otherFavorite);
        expect(posts).toEqual([]);
        expect(errors).toEqual([]);
        results.push({ width, height, platform: 'Chrome mobile viewport', nativeIos: false, demoHistoryRows: 3, monthGroups: 2, latestValue: true, individualDetail: true, explicitLocalDownload: true, editNoteValueWithoutDuplicate: true, dateSourceValueFilters: true, calendarDateSelection: true, decimalComma: true, invalidFiltersRejected: true, cancelDiscardsDraft: true, centeredAddPopup: true, pairedDateTime: true, entryCalendarSelection: true, invalidEntryDateRejected: true, futureEntryDateDisabled: true, cancelEntryDiscardsDraft: true, invalidEntryDoesNotPersist: true, clearRestoresHistory: true, emptyResults: true, manualHistoryRows: 4, persistedAfterReload: true, otherCategoryFavoritePreserved: true, noHorizontalOverflow: true, externalMessages: 0, liveModelRequests: 0 });
      } catch (error) {
        await page.screenshot({ path: `test-results/body-history-failure-${width}.png` }).catch(() => undefined);
        throw error;
      } finally { await context.close(); }
    }
    console.log(JSON.stringify({ result: 'PASS', results }, null, 2));
  } finally { await browser.close(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
