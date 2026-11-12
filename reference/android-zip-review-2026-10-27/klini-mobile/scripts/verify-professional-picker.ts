import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createDemoState } from '../src/domain/seed';
import { STORAGE_KEY } from '../src/domain/reducer';

const origin = process.env.KLINI_QA_ORIGIN ?? 'http://127.0.0.1:8097';
const output = 'test-results/professional-picker';
async function main() {
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  await mkdir(output, { recursive: true });
  const results = [];
  for (const viewport of [{ width: 393, height: 852 }, { width: 320, height: 640 }, { width: 393, height: 400 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    await context.addInitScript(({ key, state }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
    }, { key: STORAGE_KEY, state: createDemoState() });
    // No authenticated API, camera, persistence submissions or external traffic.
    await context.route('**/*', route => new URL(route.request().url()).origin === origin && route.request().method() === 'GET' ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    await page.getByTestId('header-profile').click();
    const demo = page.getByTestId('profile-select-demo-sofia-medical-oncology-v1');
    await expect(demo).toContainText('Sofía Martínez');
    await expect(demo).toContainText('Oncología Médica');
    await expect(page.getByTestId('professional-demo-status-demo-sofia-medical-oncology-v1')).toContainText('sin verificar');
    await page.getByTestId('managed-profile-demo-sofia-medical-oncology-v1').click();
    await expect(page.getByTestId('professional-profile-name')).toHaveValue('Sofía Martínez');
    await expect(page.getByTestId('professional-profile-name')).not.toBeEditable();
    await expect(page.getByTestId('professional-profile-license')).toHaveValue('111111');
    await expect(page.getByTestId('professional-profile-specialty')).toContainText('Oncología Médica');
    await page.screenshot({ path: `${output}/sofia-demo-${viewport.width}x${viewport.height}.png` });
    await page.getByTestId('profile-back').click();
    await page.getByTestId('profile-add-professional').click();
    await expect(page.getByTestId('professional-profile-name')).toHaveValue('Sofía Martínez');
    await expect(page.getByTestId('professional-profile-name')).not.toBeEditable();
    await page.getByTestId('professional-profile-license').fill('0000123456');
    const before = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).map(([key, value]) => [key, JSON.parse(value)])));
    const trigger = page.getByTestId('professional-profile-specialty');
    const popup = page.getByTestId('professional-picker-popup');
    const search = page.getByTestId('professional-picker-search');
    await trigger.click();
    await expect(popup).toBeVisible();
    await expect(popup).toHaveAttribute('aria-modal', 'true');
    expect(await popup.evaluate(element => element.closest('[data-testid="profile-drawer"]'))).toBeNull();
    const bounds = (await popup.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
    const overflow = await popup.evaluate(element => Array.from(element.querySelectorAll<HTMLElement>('*')).filter(node => node.clientWidth && node.scrollWidth > node.clientWidth + 2 && getComputedStyle(node).overflowX !== 'hidden').map(node => node.getAttribute('data-testid')));
    expect(overflow).toEqual([]);
    await search.fill('NEFRO');
    await expect(popup.getByRole('radio', { name: 'Nefrología', exact: true })).toBeVisible();
    await page.screenshot({ path: `${output}/search-${viewport.width}x${viewport.height}.png` });
    await popup.getByRole('radio', { name: 'Nefrología', exact: true }).click();
    await expect(popup).toHaveCount(0);
    await expect(trigger).toContainText('Nefrología');
    await expect(page.getByTestId('professional-profile-name')).toHaveValue('Sofía Martínez');
    await expect(page.getByTestId('professional-profile-license')).toHaveValue('0000123456');

    await trigger.click();
    await search.fill('nefro');
    await expect(popup.getByRole('radio', { name: 'Nefrología', exact: true })).toHaveAttribute('aria-checked', 'true');
    await search.fill('zz sin coincidencias');
    await expect(popup.getByText('No encontramos resultados.')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(popup).toHaveCount(0);
    await expect(trigger).toContainText('Nefrología');
    await expect(trigger).toBeFocused();
    await expect(page.getByTestId('professional-profile-form')).toBeVisible();

    await trigger.click();
    await expect(search).toHaveValue('');
    for (let index = 0; index < 20; index++) {
      await page.keyboard.press('Tab');
      expect(await popup.evaluate(element => element.contains(document.activeElement))).toBe(true);
    }
    await page.getByTestId('professional-picker-close').click();
    await expect(popup).toHaveCount(0);
    await trigger.click();
    await page.getByTestId('professional-picker-backdrop').click({ position: { x: 3, y: 3 } });
    await expect(popup).toHaveCount(0);
    await expect(trigger).toContainText('Nefrología');

    await page.getByTestId('professional-type-licensed').click();
    const degree = page.getByTestId('professional-profile-degreeType');
    await degree.click();
    await search.fill('psico');
    await popup.getByRole('radio', { name: 'Psicología', exact: true }).click();
    await expect(degree).toContainText('Psicología');
    await page.getByTestId('professional-type-doctor').click();
    await expect(trigger).toContainText('Nefrología');
    await expect(page.getByTestId('professional-profile-license')).toHaveValue('0000123456');
    await trigger.click();
    await page.screenshot({ path: `${output}/popup-${viewport.width}x${viewport.height}.png` });
    expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).map(([key, value]) => [key, JSON.parse(value)])))).toEqual(before);
    await page.getByTestId('professional-picker-close').click();
    await page.reload();
    await expect(page.getByTestId('profile-drawer')).toBeVisible();
    await expect(demo).toHaveCount(1);
    expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).map(([key, value]) => [key, JSON.parse(value)])))).toEqual(before);
    expect(errors).toEqual([]);
    results.push({ viewport, bounds, independentPopup: true, searchAndSelection: true, cancelPreservesDraft: true, focusContained: true, noPersistenceWrites: true });
    await context.close();
  }
  await writeFile(`${output}/result.json`, JSON.stringify({ passed: true, results }, null, 2));
  console.log('PASS: independent professional picker, search, selection, dismissal, draft preservation and focus at 393/320/compact heights.');
} finally {
  await browser.close();
}
}
main().catch(error => { console.error(error); process.exitCode = 1; });
