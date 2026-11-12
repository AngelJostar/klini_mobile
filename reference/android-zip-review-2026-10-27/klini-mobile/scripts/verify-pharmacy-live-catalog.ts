import { chromium, expect, type Locator, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createDemoState } from '../src/domain/seed';
import { STORAGE_KEY } from '../src/domain/reducer';

// This runner reads the real local catalog. It never creates products, logs in, or submits an order.
const webOrigin = 'http://127.0.0.1:8097';
const apiOrigin = 'http://192.168.100.250:8002';
const catalogUrl = apiOrigin + '/api/mobile/v1/pharmacy/catalog';
const output = 'test-results/pharmacy-live-catalog';
const viewports = [{ width: 390, height: 844 }, { width: 320, height: 640 }];

type LiveProduct = { id: number; name: string; image_url: string; laboratory?: string; provider: { id: number; name: string } };
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const clean = (message: string) => message.replace(/(?:sk|rk)_(?:test|live)_[A-Za-z0-9]+|Bearer\s+\S+/g, '[redacted]').slice(0, 2000);
const publicUrl = (value: string) => { const url = new URL(value); return url.origin + url.pathname; };

function productsFromResponse(body: unknown): LiveProduct[] {
  expect(record(body) && record(body.data)).toBe(true);
  const data = (body as { data: Record<string, unknown> }).data;
  expect(record(data.settings) && data.settings.enabled === true).toBe(true);
  expect(Array.isArray(data.products)).toBe(true);
  const products = data.products as unknown[];
  expect(products).toHaveLength(4);
  for (const value of products) {
    expect(record(value)).toBe(true);
    const product = value as Record<string, unknown>;
    expect(Number.isSafeInteger(product.id) && Number(product.id) > 0).toBe(true);
    expect(typeof product.name === 'string' && product.name.trim().length > 0).toBe(true);
    expect(record(product.provider)).toBe(true);
    const provider = product.provider as Record<string, unknown>;
    expect(Number.isSafeInteger(provider.id) && Number(provider.id) > 0).toBe(true);
    expect(typeof provider.name === 'string' && provider.name.trim().length > 0).toBe(true);
    expect(typeof product.image_url).toBe('string');
    const image = new URL(product.image_url as string);
    expect(image.origin).toBe(apiOrigin);
    expect(image.username || image.password).toBe('');
  }
  expect(new Set(products.map(value => (value as LiveProduct).id)).size).toBe(4);
  return products as LiveProduct[];
}

async function loadedImage(container: Locator, imageUrl: string) {
  await expect.poll(() => container.locator('img').evaluateAll((nodes, expected) => nodes.some(node => {
    const image = node as HTMLImageElement;
    return image.currentSrc === expected && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
  }), imageUrl), { timeout: 30000, message: 'The real catalog image must finish decoding.' }).toBe(true);
  return container.locator('img').evaluateAll((nodes, expected) => nodes.filter(node => (node as HTMLImageElement).currentSrc === expected).map(node => {
    const image = node as HTMLImageElement;
    return { width: image.naturalWidth, height: image.naturalHeight };
  }), imageUrl);
}

async function noHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(await page.getByTestId('pharmacy-popup').evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
}

async function main() {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results: Record<string, unknown>[] = [];
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce', serviceWorkers: 'block' });
      const errors: string[] = [], consoleErrors: string[] = [], blocked: { method: string; url: string }[] = [], failedRequests: string[] = [];
      const reads: { method: string; url: string }[] = [];
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()) || ![webOrigin, apiOrigin].includes(url.origin)) {
          blocked.push({ method: request.method(), url: publicUrl(request.url()) });
          await route.abort();
          return;
        }
        if (url.origin === apiOrigin) reads.push({ method: request.method(), url: publicUrl(request.url()) });
        await route.continue();
      });
      // Only the local profile is seeded to bypass onboarding. Catalog data is never seeded or intercepted.
      await context.addInitScript(({ state, key }) => localStorage.setItem(key, JSON.stringify(state)), { state: createDemoState(), key: STORAGE_KEY });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(clean(error.message)));
      page.on('console', message => { if (message.type() === 'error') consoleErrors.push(clean(message.text())); });
      page.on('requestfailed', request => failedRequests.push(publicUrl(request.url())));
      try {
        await page.goto(webOrigin, { waitUntil: 'domcontentloaded' });
        await expect(page.getByTestId('header-menu')).toBeVisible({ timeout: 120000 });
        await page.getByTestId('header-menu').click();
        const catalogResponse = page.waitForResponse(response => response.url() === catalogUrl && response.request().method() === 'GET', { timeout: 30000 });
        await page.getByTestId('nav-pharmacy').click();
        const response = await catalogResponse;
        expect(response.status()).toBe(200);
        const products = productsFromResponse(await response.json());
        const popup = page.getByTestId('pharmacy-popup');
        const cards = page.locator('[data-testid^="pharmacy-product-"]');
        await expect(cards).toHaveCount(4);
        await expect(popup.getByText('Precios MXN', { exact: true })).toBeVisible();
        await expect(popup.getByText('Datos de ejemplo', { exact: true })).toHaveCount(0);
        const images = [];
        for (const product of products) {
          const card = page.getByTestId('pharmacy-product-' + product.id);
          await expect(card.getByText(product.name, { exact: true })).toHaveCount(1);
          images.push({ id: product.id, provider: product.provider, dimensions: await loadedImage(card, product.image_url) });
        }
        await expect(popup.getByText('Sin imagen', { exact: true })).toHaveCount(0);
        await noHorizontalOverflow(page);
        await page.screenshot({ path: `${output}/catalog-${viewport.width}.png` });
        await cards.last().locator('..').scrollIntoViewIfNeeded();
        await page.screenshot({ path: `${output}/catalog-bottom-${viewport.width}.png` });
        for (const product of products) {
          await page.getByTestId('pharmacy-product-' + product.id).click();
          const sellers = page.getByTestId('pharmacy-seller-popup');
          await expect(sellers).toContainText(product.name);
          await expect(page.getByTestId('pharmacy-add-detail')).toHaveCount(0);
          await expect(sellers.getByRole('button', { name: 'Agregar al carrito', exact: true })).toBeVisible();
          await loadedImage(sellers, product.image_url);
          await noHorizontalOverflow(page);
          await page.screenshot({ path: `${output}/sellers-${product.id}-${viewport.width}.png` });
          await page.keyboard.press('Escape');
          await expect(page.getByTestId('pharmacy-search')).toBeVisible();
        }
        await page.getByTestId('pharmacy-filters').click();
        const filters = page.getByTestId('pharmacy-filter-popup');
        for (const field of ['specialty', 'type', 'laboratory']) await expect(page.getByTestId('pharmacy-filter-field-' + field)).toBeVisible();
        await expect(filters.getByRole('checkbox', { name: 'Solo promociones', exact: true })).toBeVisible();
        await expect(filters.getByRole('checkbox', { name: 'Programas de apego', exact: true })).toBeVisible();
        await expect(page.getByTestId('pharmacy-filter-clear')).toBeVisible();
        await expect(page.getByTestId('pharmacy-apply-filters')).toBeVisible();
        const filterBounds = await filters.boundingBox();
        expect(filterBounds).not.toBeNull();
        expect(filterBounds!.x).toBeGreaterThanOrEqual(0);
        expect(filterBounds!.x + filterBounds!.width).toBeLessThanOrEqual(viewport.width + 1);
        expect(filterBounds!.y).toBeGreaterThanOrEqual(0);
        expect(filterBounds!.y + filterBounds!.height).toBeLessThanOrEqual(viewport.height + 1);
        await noHorizontalOverflow(page);
        await page.screenshot({ path: `${output}/filters-${viewport.width}.png` });
        const laboratory = products[0].laboratory || 'Laboratorio no indicado';
        await page.getByTestId('pharmacy-filter-field-laboratory').click();
        await filters.getByRole('button', { name: laboratory, exact: true }).click();
        await page.getByTestId('pharmacy-apply-filters').click();
        await expect(cards).toHaveCount(products.filter(product => (product.laboratory || 'Laboratorio no indicado') === laboratory).length);
        await page.getByTestId('pharmacy-filters').click();
        await page.getByTestId('pharmacy-filter-clear').click();
        await page.getByTestId('pharmacy-apply-filters').click();
        await expect(cards).toHaveCount(4);
        await noHorizontalOverflow(page);
        expect(errors).toEqual([]);
        expect(consoleErrors).toEqual([]);
        expect(blocked).toEqual([]);
        expect(failedRequests).toEqual([]);
        results.push({ viewport, passed: true, productCount: products.length, providers: [...new Map(products.map(product => [product.provider.id, product.provider])).values()], images, filterBounds, reads, errors, consoleErrors, blocked, failedRequests });
      } catch (error) {
        await page.screenshot({ path: `${output}/failure-${viewport.width}.png` }).catch(() => undefined);
        results.push({ viewport, passed: false, failure: clean(error instanceof Error ? error.message : String(error)), reads, errors, consoleErrors, blocked, failedRequests });
        throw error;
      } finally {
        await writeFile(`${output}/result.json`, JSON.stringify({ webOrigin, apiOrigin, catalogSource: 'real local backend; no response mocks', results }, null, 2));
        await context.close();
      }
    }
    console.log(JSON.stringify({ passed: true, viewports: viewports.map(viewport => viewport.width), productCount: 4, writes: 0, output }));
  } finally { await browser.close(); }
}

main().catch(error => { console.error(clean(error instanceof Error ? error.message : String(error))); process.exitCode = 1; });
