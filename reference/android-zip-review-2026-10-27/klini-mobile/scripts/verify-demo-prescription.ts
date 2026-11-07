import { chromium, expect } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto(process.env.KLINI_VERIFY_ORIGIN || 'http://127.0.0.1:8096');
    await page.getByTestId('home-tab-archive').click();
    await page.getByTestId('menu-history').click();
    await page.getByTestId('add-archive-item').click();
    await page.getByTestId('record-type-scan').click();
    await expect(page.getByTestId('record-categories')).toHaveCount(0);
    await expect(page.getByTestId('record-photo-popup')).toBeVisible();
    await page.getByTestId('record-scan-demo').click();
    await expect(page.getByTestId('record-photo-preview')).toBeVisible();
    await page.screenshot({ path: 'test-results/demo-prescription-scan.png' });
    await page.getByTestId('record-photo-transcribe').click();
    await expect(page.getByTestId('record-categories')).toBeVisible({ timeout: 45000 });
    await expect(page.getByTestId('record-photo-popup')).toHaveCount(0);
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
    await expect(page.getByTestId('record-review-institution')).toHaveValue(/CLINICA DEMO KLINI/i);
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
    await expect(page.getByTestId('record-review-summary-text')).toContainText('DEMO-A');
    await expect(page.getByLabel('Médico o laboratorio', { exact: true })).toHaveValue('Dra. Ana Ejemplo');
    await expect(page.getByTestId('record-review-institution')).toHaveValue(/CLINICA DEMO KLINI/i);
    await page.getByTestId('photo-review-title').fill('Receta ficticia de demostración');
    await page.screenshot({ path: 'test-results/demo-prescription-review.png' });
    await page.getByTestId('save-record').click();
    await expect(page.getByText('Receta ficticia de demostración', { exact: true })).toBeVisible();
    await page.waitForTimeout(500);
    const saved = await page.evaluate(() => Object.values(localStorage).join('\n'));
    expect(saved).toContain('Receta ficticia de demostración');
    expect(saved).toContain('DEMO-A');
    expect(saved).toContain('data:image/jpeg;base64,');
    await page.reload();
    const restored = await page.evaluate(() => Object.values(localStorage).join('\n'));
    expect(restored).toContain('Dra. Ana Ejemplo');
    expect(restored).toContain('DEMO-A');
    console.log('PASS bundled demo image, live OCR, extracted fields and persistent photo + transcription');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
