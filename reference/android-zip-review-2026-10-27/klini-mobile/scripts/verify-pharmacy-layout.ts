import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createDemoState } from '../src/domain/seed';
import { STORAGE_KEY } from '../src/domain/reducer';
const origin = 'http://127.0.0.1:8097';
async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  await mkdir('test-results/pharmacy-layout', { recursive: true });
  try {
    for (const viewport of [{ width: 372, height: 637 }, { width: 390, height: 844 }, { width: 320, height: 640 }]) {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
      const errors: string[] = [];
      const forbidden: string[] = [];
      await context.route('**/*', async route => {
        const request = route.request();
        if (new URL(request.url()).origin !== origin || request.method() !== 'GET') { forbidden.push(request.method()); await route.abort(); }
        else await route.continue();
      });
      await context.addInitScript(({ state, key }) => { localStorage.setItem(key, JSON.stringify(state)); }, { state: createDemoState(), key: STORAGE_KEY });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(origin);
      await expect(page.getByTestId('header-menu')).toBeVisible({ timeout: 120000 });
      await page.getByTestId('home-tab-archive').click();
      await expect.poll(() => page.getByTestId('home-pager').evaluate(element => Math.round(element.scrollLeft))).toBe(viewport.width);
      await page.getByTestId('header-menu').click();
      await page.getByTestId('nav-pharmacy').click();
      await expect(page.getByTestId('pharmacy-popup')).toBeVisible();
      await expect(page.getByTestId('pharmacy-search')).toBeVisible();
      const popup = await page.getByTestId('pharmacy-popup').boundingBox();
      const header = await page.getByTestId('home-top-navigation').boundingBox();
      expect(popup!.y).toBeCloseTo(68, 0);
      expect(popup!.x).toBe(0);
      expect(popup!.width).toBe(viewport.width);
      expect(header!.y + header!.height).toBeLessThanOrEqual(popup!.y);
      await expect(page.getByTestId('home-top-logo')).toHaveCount(1);
      await expect(page.getByText('Tu bienestar, cerca de ti')).toHaveCount(0);
      await page.screenshot({ path: `test-results/pharmacy-layout/catalog-${viewport.width}.png` });
      await page.getByTestId('pharmacy-add-featured').click();
      await expect(page.getByTestId('pharmacy-seller-popup')).toBeVisible();
      await page.getByTestId('pharmacy-seller-option-demo-sunscreen').click();
      await page.getByTestId('pharmacy-seller-add').click();
      await expect(page.getByTestId('pharmacy-cart')).toHaveAttribute('aria-label', 'Carrito, 1 productos');
      await page.getByTestId('pharmacy-product-demo-cleanser').click();
      expect((await page.getByTestId('pharmacy-popup').boundingBox())!.y).toBe(popup!.y);
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('pharmacy-search')).toBeVisible();
      await page.getByTestId('pharmacy-filters').click();
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('pharmacy-apply-filters')).toHaveCount(0);
      await expect(page.getByTestId('pharmacy-popup')).toBeVisible();
      await page.getByTestId('pharmacy-close').click();
      await expect(page.getByTestId('pharmacy-popup')).toHaveCount(0);
      await expect.poll(() => page.getByTestId('home-pager').evaluate(element => Math.round(element.scrollLeft))).toBe(viewport.width);
      await page.getByTestId('header-menu').click();
      await page.getByTestId('nav-pharmacy').click();
      await expect(page.getByTestId('pharmacy-search')).toBeVisible();
      await page.getByTestId('pharmacy-backdrop').click({ position: { x: 5, y: 5 } });
      await expect(page.getByTestId('pharmacy-popup')).toHaveCount(0);
      await expect.poll(() => page.getByTestId('home-pager').evaluate(element => Math.round(element.scrollLeft))).toBe(viewport.width);
      await page.getByTestId('home-tab-today').click();
      await page.getByTestId('header-menu').click();
      await page.getByTestId('nav-pharmacy').click();
      await expect(page.getByTestId('pharmacy-search')).toBeVisible();
      await page.screenshot({ path: `test-results/pharmacy-layout/today-${viewport.width}.png` });
      await page.goBack();
      await expect(page.getByTestId('pharmacy-popup')).toHaveCount(0);
      await page.goForward();
      await expect(page.getByTestId('pharmacy-search')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('pharmacy-popup')).toHaveCount(0);
      await page.getByTestId('header-menu').click();
      await page.getByTestId('nav-adherence-programs').click();
      await expect(page.getByRole('tab', { name: 'Apego', exact: true }).getByText('Apego')).toHaveCSS('font-weight', '600');
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('pharmacy-popup')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      expect(errors).toEqual([]);
      expect(forbidden).toEqual([]);
      results.push({ viewport, popup, header, preservedHome: true, checks: 'full-width,real-home,stable-top,featured-add,product-back,filters-cancel,close,reopen,backdrop,history-back-forward,escape,adherence,no-overflow', errors });
      await context.close();
    }
    await writeFile('test-results/pharmacy-layout/result.json', JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
