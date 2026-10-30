import { chromium, expect } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:8096');
    await page.getByTestId('home-tab-archive').click();
    await page.getByTestId('menu-history').click();
    await page.getByTestId('add-archive-item').click();
    await page.getByTestId('record-category-Todos').click();
    await page.getByTestId('record-type-scan').click();
    await page.getByTestId('record-scan-demo').click();
    await expect(page.getByTestId('record-photo-preview')).toBeVisible();
    await page.screenshot({ path: 'test-results/demo-prescription-scan.png' });
    await page.getByTestId('record-photo-transcribe').click();
    await expect(page.getByTestId('record-photo-review')).toBeVisible({ timeout: 45000 });
    await expect(page.getByTestId('photo-review-text')).toHaveValue(/DEMO-A/);
    await page.getByTestId('photo-review-details').click();
    await expect(page.getByLabel('Médico o laboratorio', { exact: true })).toHaveValue('Dra. Ana Ejemplo');
    await expect(page.getByLabel('Institución u hospital', { exact: true })).toHaveValue(/CLINICA DEMO KLINI/i);
    await page.getByTestId('photo-review-title').fill('Receta ficticia de demostración');
    await page.screenshot({ path: 'test-results/demo-prescription-review.png' });
    await page.getByTestId('photo-review-save').click();
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
