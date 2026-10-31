import { chromium, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { AppState } from '../src/domain/types';

const origin = 'http://127.0.0.1:8096';
const storageKey = '@klini/app-state:v1';

async function stored(page: Page): Promise<AppState> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), storageKey);
}

async function mintButton(page: Page, id: string) {
  const button = page.getByTestId(id);
  await expect(button).toBeInViewport();
  await expect(button).toHaveCSS('background-color', 'rgb(221, 245, 242)');
  const bounds = await button.boundingBox();
  expect(bounds!.height).toBeGreaterThanOrEqual(34);
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
}

async function recordAcceptance(page: Page) {
  await page.getByTestId('insurance-record-acceptance').click();
  await expect(page.getByTestId('insurance-acceptance-recorder')).toBeVisible();
  await page.getByTestId('insurance-recorder-permission').click();
  await expect(page.getByTestId('insurance-recorder-start')).toBeEnabled();
  await expect.poll(() => page.locator('video[aria-label="Cámara frontal"]').evaluate(element => (element as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(2);
  await page.getByTestId('insurance-recorder-start').click();
  await expect(page.getByTestId('insurance-recorder-stop')).toBeDisabled();
  await page.waitForTimeout(2300);
  await expect(page.getByTestId('insurance-recorder-stop')).toBeEnabled();
  await page.getByTestId('insurance-recorder-stop').click();
  await expect(page.getByTestId('insurance-recorder-use')).toBeVisible();
  await expect(page.locator('video[aria-label="Revisar video grabado"]')).toBeVisible();
  await page.getByTestId('insurance-recorder-use').click();
  await expect(page.getByTestId('insurance-acceptance-recorder')).toHaveCount(0);
  await expect(page.getByTestId('insurance-acceptance-preview')).toContainText('Grabación lista');
  await expect(page.getByTestId('insurance-submit-application')).toBeEnabled();
}

async function main() {
  await mkdir('test-results', { recursive: true });
  await mkdir('.expo', { recursive: true });
  const syntheticVideo = resolve('.expo/insurance-recorder-test.y4m');
  const frames = Array.from({ length: 30 }, () => Buffer.concat([Buffer.from('FRAME\n'), Buffer.alloc(320 * 240, 130), Buffer.alloc(320 * 240 / 2, 128)]));
  await writeFile(syntheticVideo, Buffer.concat([Buffer.from('YUV4MPEG2 W320 H240 F15:1 Ip A1:1 C420jpeg\n'), ...frames]));
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-video-capture=${syntheticVideo}`, '--autoplay-policy=no-user-gesture-required'],
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['camera', 'microphone'] });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => void dialog.accept());
  try {
    await page.goto(origin);
    await page.getByTestId('menu-insurance').click();
    await page.getByTestId('insurance-new').click();
    await expect(page.getByRole('heading', { name: 'Elige un plan', exact: true })).toBeVisible();
    const initial = await stored(page);
    expect(initial).not.toBeNull();
    await expect(page.getByTestId('insurance-enrollment-next')).toHaveCount(0);
    for (const id of ['essential', 'integral', 'family']) await expect(page.getByTestId(`insurance-plan-${id}`)).toHaveRole('button');
    await page.getByTestId('insurance-plan-detail-essential').click();
    await expect(page.getByTestId('insurance-enrollment-popup')).toContainText('Hospitalización');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('insurance-enrollment-popup')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Elige un plan', exact: true })).toBeVisible();
    await page.screenshot({ path: 'test-results/insurance-enrollment-plans.png' });
    await page.setViewportSize({ width: 320, height: 640 });
    await expect(page.getByTestId('insurance-enrollment-next')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.screenshot({ path: 'test-results/insurance-enrollment-plans-320.png' });
    await page.getByTestId('insurance-plan-essential').click();
    await expect(page.getByRole('heading', { name: 'Tu seguro', exact: true })).toBeVisible();
    await expect(page.getByText('Plan Esencial', { exact: true })).toBeVisible();
    await expect(page.getByTestId('insurance-quote-contract')).toBeDisabled();
    await page.getByTestId('insurance-quote-age').fill('17');
    await expect(page.getByTestId('insurance-quote-contract')).toBeDisabled();
    await expect(page.getByText('Para esta demostración, escribe una edad de 18 a 80 años.')).toBeVisible();
    await page.getByTestId('insurance-quote-age').fill('40');
    await page.getByTestId('insurance-sex-male').click();
    await page.getByTestId('insurance-smoker-no').click();
    await expect(page.getByTestId('insurance-quote-contract')).toBeDisabled();
    await page.getByTestId('insurance-occupation').click();
    await expect(page.getByTestId('insurance-enrollment-popup-close')).toBeInViewport();
    await page.getByTestId('insurance-occupation-administrative').click();
    await expect(page.getByTestId('insurance-quote-contract')).toBeEnabled();
    await expect(page.getByTestId('insurance-quote-price')).toContainText('650');
    await page.getByTestId('insurance-detail-back').click();
    await page.getByTestId('insurance-plan-integral').getByText(/^Desde /).click();
    await expect(page.getByText('Plan Integral', { exact: true })).toBeVisible();
    await expect(page.getByTestId('insurance-quote-age')).toHaveValue('40');
    await expect(page.getByTestId('insurance-quote-price')).toContainText('1,250');
    await page.getByTestId('insurance-detail-back').click();
    await page.getByTestId('insurance-plan-family').getByText('Familiar', { exact: true }).click();
    await expect(page.getByText('Plan Familiar', { exact: true })).toBeVisible();
    await expect(page.getByTestId('insurance-quote-price')).toContainText('1,850');
    await page.getByTestId('insurance-detail-back').click();
    await page.getByTestId('insurance-plan-integral').click();
    await expect(page.getByTestId('insurance-quote-price')).toContainText('1,250');
    await mintButton(page, 'insurance-quote-contract');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.screenshot({ path: 'test-results/insurance-enrollment-quote-320.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'test-results/insurance-enrollment-quote.png' });
    await page.getByTestId('insurance-quote-contract').click();
    await expect(page.getByRole('heading', { name: 'Revisa tu solicitud', exact: true })).toBeVisible();
    await mintButton(page, 'insurance-review-sign');
    await page.getByTestId('insurance-review-change-plan').click();
    await expect(page.getByTestId('insurance-enrollment-next')).toHaveCount(0);
    await page.getByTestId('insurance-plan-integral').click();
    await expect(page.getByTestId('insurance-quote-age')).toHaveValue('40');
    await expect(page.getByTestId('insurance-occupation')).toContainText('Administrativo');
    await page.getByTestId('insurance-quote-contract').click();
    await page.getByTestId('insurance-review-quote').click();
    await expect(page.getByTestId('insurance-enrollment-popup')).toContainText('1,250');
    await expect(page.getByTestId('insurance-enrollment-popup')).toContainText('40 años');
    await page.getByTestId('insurance-enrollment-popup-close').click();
    await page.getByTestId('insurance-review-contract').click();
    await expect(page.getByTestId('insurance-enrollment-popup')).toContainText('no autorizan cobros');
    await page.keyboard.press('Escape');
    await page.screenshot({ path: 'test-results/insurance-enrollment-review.png' });
    await page.getByTestId('insurance-review-sign').click();
    await expect(page.getByTestId('insurance-submit-application')).toBeDisabled();
    await page.getByTestId('insurance-video-contract').click();
    await expect(page.getByTestId('insurance-enrollment-popup')).toContainText('Contrato de demostración');
    await page.keyboard.press('Escape');
    await page.screenshot({ path: 'test-results/insurance-enrollment-video.png' });
    await recordAcceptance(page);

    // A new plan or quote must be accepted again; the previous recording cannot sign changed data.
    await page.getByTestId('insurance-detail-back').click();
    await page.getByTestId('insurance-review-edit').click();
    await page.getByTestId('insurance-quote-age').fill('41');
    await expect(page.getByTestId('insurance-quote-price')).toContainText('1,265');
    await page.getByTestId('insurance-quote-age').fill('40');
    await page.getByTestId('insurance-quote-contract').click();
    await page.getByTestId('insurance-review-sign').click();
    await expect(page.getByTestId('insurance-submit-application')).toBeDisabled();
    await recordAcceptance(page);
    await page.setViewportSize({ width: 320, height: 640 });
    await mintButton(page, 'insurance-record-again');
    await mintButton(page, 'insurance-submit-application');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.screenshot({ path: 'test-results/insurance-enrollment-acceptance-320.png' });
    await page.evaluate(key => {
      const original = Storage.prototype.setItem;
      let failNext = true;
      Storage.prototype.setItem = function (name, value) {
        if (this === localStorage && name === key && failNext) {
          failNext = false;
          throw new DOMException('Synthetic local persistence failure', 'QuotaExceededError');
        }
        original.call(this, name, value);
      };
      (window as typeof window & { restoreKliniStorage?: () => void }).restoreKliniStorage = () => { Storage.prototype.setItem = original; };
    }, storageKey);
    await page.getByTestId('insurance-submit-application').click();
    await expect(page.getByTestId('insurance-enrollment-success')).toHaveCount(0);
    await expect(page.getByRole('alert').filter({ hasText: /guardar|registrar/i }).first()).toBeVisible();
    await expect(page.getByTestId('insurance-submit-application')).toBeEnabled();
    await expect.poll(async () => (await stored(page)).records.length).toBe(initial.records.length);
    await page.evaluate(() => (window as typeof window & { restoreKliniStorage?: () => void }).restoreKliniStorage?.());
    await page.getByTestId('insurance-submit-application').evaluate(element => { (element as HTMLElement).click(); (element as HTMLElement).click(); });
    await expect(page.getByTestId('insurance-enrollment-success')).toContainText('Solicitud de demostración registrada');
    await expect.poll(async () => (await stored(page)).records.length).toBe(initial.records.length + 1);
    const saved = await stored(page);
    expect(saved.policies).toEqual(initial.policies);
    const applications = saved.records.filter(record => record.title === 'Solicitud de seguro · Plan Integral');
    expect(applications).toHaveLength(1);
    expect(applications[0].description).toContain('Administrativo');
    expect(applications[0].description).toContain('1,250');
    expect(applications[0].attachment?.mimeType).toMatch(/^video\//);
    expect(applications[0].attachment?.uri).toMatch(/^data:video\/[^;]+;base64,/);
    await page.screenshot({ path: 'test-results/insurance-enrollment-success-320.png' });
    await page.getByTestId('insurance-enrollment-return').click();
    await expect(page.getByTestId('insurance-new')).toBeVisible();
    await page.getByTestId('insurance-close').click();
    await page.waitForURL(url => url.pathname === '/');
    await page.reload();
    await page.getByTestId('menu-insurance').click();
    const restored = await stored(page);
    expect(restored.records.find(record => record.id === applications[0].id)).toEqual(applications[0]);
    expect(restored.policies).toEqual(initial.policies);
    expect(errors).toEqual([]);
    console.log('PASS insurance enrollment: one-tap plan rows including price, independent plan details, three plan prices, no Next footer, form validation, quote, edit, contract, real synthetic video recording, invalidating old acceptance, failed persistence rollback and retry, one local record, unchanged policies, reload persistence, mint CTAs and 320px');
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
