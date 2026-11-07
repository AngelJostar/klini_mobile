import { readFileSync } from 'node:fs';
import { chromium, expect } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['camera'] });
  const page = await context.newPage();
  try {
    const fixture = 'data:image/png;base64,' + readFileSync('test-results/ocr-fixture.png').toString('base64');
    await page.addInitScript(image => { HTMLCanvasElement.prototype.toDataURL = function () { return image; }; }, fixture);
    await page.goto(process.env.KLINI_VERIFY_ORIGIN || 'http://127.0.0.1:8096');
    await page.getByTestId('home-tab-archive').click();
    await page.getByTestId('menu-history').click();
    await page.getByTestId('add-archive-item').click();
    await page.getByTestId('record-type-scan').click();
    await expect(page.getByTestId('record-categories')).toHaveCount(0);
    await expect(page.getByTestId('record-photo-popup')).toBeVisible();
    const allow = page.getByRole('button', { name: 'Permitir cámara', exact: true });
    if (await allow.isVisible()) await allow.click();
    await expect(page.getByTestId('record-photo-capture')).toBeEnabled({ timeout: 20000 });
    await page.screenshot({ path: 'test-results/record-photo-camera.png' });
    await page.getByTestId('record-photo-capture').click();
    await expect(page.getByTestId('record-photo-preview')).toBeVisible();
    await page.getByRole('button', { name: 'Repetir foto' }).click();
    await expect(page.getByTestId('record-photo-capture')).toBeEnabled();
    await page.getByTestId('record-photo-capture').click();
    await page.getByTestId('record-photo-transcribe').click();
    await expect(page.getByTestId('record-photo-popup')).toHaveCount(0, { timeout: 45000 });
    await expect(page.getByTestId('record-categories')).toBeVisible();
    await expect(page.getByTestId('record-review-sheet')).toHaveCount(0);
    await page.getByTestId('record-category-Todos').click();
    await page.getByTestId('record-category-continue').click();
    await expect(page.getByTestId('record-review-sheet')).toBeVisible();
    await expect(page.getByTestId('record-review-metadata')).toBeVisible();
    await expect(page.getByTestId('record-review-date-value')).toBeVisible();
    for (const name of ['doctor', 'specialty']) {
      const input = page.getByTestId(`record-review-${name}`);
      await expect(input).toHaveCount(1);
      await expect(input).toBeVisible();
      await expect(input).toBeEditable();
      await expect(input).toHaveAttribute('placeholder', 'Escribe aquí');
    }
    await expect(page.getByTestId('record-review-institution')).toBeVisible();
    await expect(page.getByTestId('record-review-institution')).toHaveAttribute('placeholder', 'Escribe aquí');
    await expect(page.getByTestId('record-review-institution')).toHaveValue('Hospital de Ejemplo');
    await page.getByTestId('record-review-edit').click();
    await expect(page.getByTestId('photo-review-date')).toBeVisible();
    await expect(page.getByLabel('Médico o laboratorio', { exact: true })).toBeVisible();
    await expect(page.getByTestId('record-review-institution')).toBeVisible();
    await expect(page.getByTestId('save-record')).toBeEnabled();
    await expect(page.getByTestId('save-record')).toBeInViewport();
    const review = await page.getByTestId('archive-popup').boundingBox();
    expect(review).not.toBeNull();
    expect(review!.x).toBeGreaterThanOrEqual(0);
    expect(review!.y).toBeGreaterThanOrEqual(0);
    expect(review!.x + review!.width).toBeLessThanOrEqual(390);
    expect(review!.y + review!.height).toBeLessThanOrEqual(844);
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('record-review-view').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^Foto-\d+\.png$/);
    expect(await download.failure()).toBeNull();
    await expect(page.getByTestId('record-review-sheet')).toBeVisible();
    await expect(page.getByTestId('record-review-summary-text')).toContainText('Hospital de Ejemplo');
    await page.screenshot({ path: 'test-results/record-photo-review.png' });
    await expect(page.getByLabel('Médico o laboratorio', { exact: true })).toHaveValue('Dra. Ana Ejemplo');
    await expect(page.getByTestId('record-review-institution')).toHaveValue('Hospital de Ejemplo');
    await page.screenshot({ path: 'test-results/record-photo-review-fields.png' });
    await page.getByTestId('photo-review-title').fill('Foto de prueba');
    await page.getByTestId('save-record').click();
    await expect(page.getByText('Foto de prueba', { exact: true })).toBeVisible();
    console.log('PASS real Vision OCR with synthetic image, review fields, attachment and save');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
