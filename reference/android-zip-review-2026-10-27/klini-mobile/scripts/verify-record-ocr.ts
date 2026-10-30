import { readFileSync } from 'node:fs';
import { chromium, expect } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['camera'] });
  const page = await context.newPage();
  try {
    const fixture = 'data:image/png;base64,' + readFileSync('test-results/ocr-fixture.png').toString('base64');
    await page.addInitScript(image => { HTMLCanvasElement.prototype.toDataURL = function () { return image; }; }, fixture);
    await page.goto('http://127.0.0.1:8096');
    await page.getByTestId('home-tab-archive').click();
    await page.getByTestId('menu-history').click();
    await page.getByTestId('add-archive-item').click();
    await page.getByTestId('record-category-Todos').click();
    await page.getByTestId('record-type-scan').click();
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
    await expect(page.getByTestId('record-photo-review')).toBeVisible();
    await page.getByTestId('photo-review-view').click();
    await expect(page.getByTestId('photo-review-full-image')).toBeVisible();
    await page.getByTestId('photo-preview-close').click();
    await expect(page.getByTestId('photo-review-text')).toHaveValue(/Hospital de Ejemplo/);
    await page.screenshot({ path: 'test-results/record-photo-review.png' });
    const collapsed = await page.getByTestId('record-photo-review').boundingBox();
    await page.getByTestId('photo-review-details').click();
    await expect(page.getByLabel('Médico o laboratorio', { exact: true })).toHaveValue('Dra. Ana Ejemplo');
    await expect(page.getByLabel('Institución u hospital', { exact: true })).toHaveValue('Hospital de Ejemplo');
    const expanded = await page.getByTestId('record-photo-review').boundingBox();
    expect(expanded!.y).toBeCloseTo(collapsed!.y, 0);
    expect(expanded!.height).toBeGreaterThan(collapsed!.height);
    expect(expanded!.y + expanded!.height).toBeLessThanOrEqual(844);
    await page.screenshot({ path: 'test-results/record-photo-review-expanded.png' });
    await page.getByTestId('photo-review-title').fill('Foto de prueba');
    await page.getByTestId('photo-review-save').click();
    await expect(page.getByText('Foto de prueba', { exact: true })).toBeVisible();
    console.log('PASS real Vision OCR with synthetic image, review fields, attachment and save');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
