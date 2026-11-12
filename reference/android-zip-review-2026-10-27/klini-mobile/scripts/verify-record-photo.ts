import { chromium, expect, type Locator } from '@playwright/test';

async function step(scope: Locator, active: number) {
  for (let number = 1; number <= 4; number++) {
    const item = scope.getByTestId(`record-flow-step-${number}`);
    if (number === active) await expect(item).toHaveAttribute('aria-current', 'step');
    else await expect(item).not.toHaveAttribute('aria-current', 'step');
  }
}

async function main() {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['camera'] });
  const page = await context.newPage();
  const origin = process.env.KLINI_VERIFY_ORIGIN || 'http://127.0.0.1:8096';
  const providerRequests: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', async route => {
    if (route.request().method() === 'POST') { providerRequests.push(route.request().url()); return route.abort(); }
    if (new URL(route.request().url()).origin !== new URL(origin).origin) return route.abort();
    return route.continue();
  });
  try {
    await page.goto(origin);
    await page.getByTestId('home-tab-archive').click();
    await page.getByTestId('menu-history').click();
    await page.getByTestId('add-archive-item').click();
    await page.getByTestId('registration-document').click();
    await step(page.getByTestId('record-entry-screen'), 1);
    await page.getByTestId('record-type-photo').click();
    await expect(page.getByTestId('record-categories')).toHaveCount(0);
    await expect(page.getByTestId('record-photo-popup')).toBeVisible();
    await step(page.getByTestId('record-photo-popup'), 2);
    const allow = page.getByRole('button', { name: 'Permitir cámara', exact: true });
    // The browser context already grants camera permission. Wait for the
    // asynchronous permission read instead of clicking a disappearing button.
    await expect(allow).toHaveCount(0);
    await expect(page.getByTestId('record-photo-capture')).toBeEnabled({ timeout: 20000 });
    await page.screenshot({ path: 'test-results/record-photo-camera.png' });
    await page.getByTestId('record-photo-capture').click();
    await expect(page.getByTestId('record-photo-preview')).toBeVisible();
    await page.getByRole('button', { name: 'Repetir foto' }).click();
    await expect(page.getByTestId('record-photo-capture')).toBeEnabled();
    await page.getByTestId('record-photo-capture').click();
    await page.getByTestId('record-photo-use').click();
    await expect(page.getByTestId('record-photo-popup')).toHaveCount(0);
    await expect(page.getByTestId('record-category-popup')).toBeVisible();
    await step(page.getByTestId('record-category-popup'), 3);
    await expect(page.getByTestId('record-review-sheet')).toHaveCount(0);
    await page.getByTestId('record-category-back').click();
    await expect(page.getByTestId('record-photo-preview')).toBeVisible();
    await step(page.getByTestId('record-photo-popup'), 2);
    await page.getByTestId('record-photo-use').click();
    await expect(page.getByTestId('record-category-popup')).toBeVisible();
    await expect(page.getByTestId('record-category-continue')).toBeDisabled();
    await page.getByTestId('record-category-Todos').click();
    await expect(page.getByTestId('record-category-Todos')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('record-review-sheet')).toHaveCount(0);
    await page.getByTestId('record-category-continue').click();
    await expect(page.getByTestId('record-review-sheet')).toBeVisible();
    await step(page.getByTestId('record-review-sheet'), 4);
    await expect(page.getByTestId('record-review-metadata')).toBeVisible();
    await expect(page.getByTestId('record-review-date-value')).toBeVisible();
    for (const name of ['doctor', 'specialty']) {
      const input = page.getByTestId(`record-review-${name}`);
      await expect(input).toHaveCount(1);
      await expect(input).toBeVisible();
      await expect(input).toBeEditable();
      await expect(input).toHaveAttribute('placeholder', 'Escribe aquí');
      await expect(input).toHaveValue('');
    }
    await expect(page.getByTestId('record-review-institution')).toBeVisible();
    await expect(page.getByTestId('record-review-institution')).toHaveAttribute('placeholder', 'Escribe aquí');
    await expect(page.getByTestId('record-review-institution')).toHaveValue('');
    await expect(page.getByTestId('record-review-summary-title')).toHaveCount(0);
    await expect(page.getByText('Por revisar', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Sin texto agregado.', { exact: true })).toHaveCount(0);
    await expect(page.getByTestId('record-review-description-edit')).toContainText('Agregar');
    await expect(page.getByTestId('photo-review-text')).toHaveCount(0);
    await expect(page.getByTestId('photo-review-title')).toHaveCount(0);
    await expect(page.getByTestId('save-record')).toBeEnabled();
    await expect(page.getByTestId('save-record')).toBeInViewport();
    await expect.poll(() => page.getByTestId('archive-popup').evaluate(element => Math.abs(new DOMMatrixReadOnly(getComputedStyle(element).transform).m42))).toBeLessThanOrEqual(.5);
    const review = await page.getByTestId('archive-popup').boundingBox();
    expect(review).not.toBeNull();
    expect(review!.x).toBeGreaterThanOrEqual(0);
    expect(review!.y).toBeGreaterThanOrEqual(0);
    expect(review!.x + review!.width).toBeLessThanOrEqual(390);
    expect(review!.y + review!.height).toBeLessThanOrEqual(844.5);
    expect(review!.height).toBeGreaterThan(844 * .65);
    expect(review!.y + review!.height).toBeCloseTo(844, 0);
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('record-review-view').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^Foto-\d+\.png$/);
    expect(await download.failure()).toBeNull();
    const original = await page.evaluate(async url => {
      const blob = await (await fetch(url)).blob();
      return { type: blob.type, size: blob.size, header: Array.from(new Uint8Array(await blob.slice(0, 3).arrayBuffer())) };
    }, download.url());
    expect(original.type).toBe('image/png');
    expect(original.size).toBeGreaterThan(0);
    expect(original.header).toEqual([137, 80, 78]);
    await expect(page.getByTestId('record-review-sheet')).toBeVisible();
    await page.screenshot({ path: 'test-results/record-photo-review.png' });
    // Both fields are editable directly in the summary, before opening the pencil.
    const metadata = { doctorName: 'Dra. Elena de prueba', specialty: 'Medicina general de prueba' };
    await page.getByTestId('record-review-doctor').fill(metadata.doctorName);
    await page.getByTestId('record-review-specialty').fill(metadata.specialty);
    await expect(page.getByTestId('photo-review-title')).toHaveCount(0);
    await page.getByTestId('record-review-category').click();
    await expect(page.getByTestId('record-category-popup')).toBeVisible();
    await expect(page.getByTestId('record-category-Todos')).toHaveAttribute('aria-selected', 'true');
    await page.getByTestId('record-category-continue').click();
    await expect(page.getByTestId('record-review-sheet')).toBeVisible();
    await expect(page.getByTestId('record-review-doctor')).toHaveValue(metadata.doctorName);
    await expect(page.getByTestId('record-review-specialty')).toHaveValue(metadata.specialty);
    for (const width of [393, 320]) {
      await page.setViewportSize({ width, height: width === 393 ? 852 : 640 });
      const summary = page.getByTestId('record-review-metadata');
      const summaryBounds = await summary.boundingBox();
      expect(summaryBounds).not.toBeNull();
      for (const [name, label] of [['doctor', 'Médico o laboratorio'], ['specialty', 'Especialidad'], ['institution', 'Hospital o institución']]) {
        const input = page.getByTestId(`record-review-${name}`);
        await expect(input).toHaveCount(1);
        await expect(input).toBeInViewport({ ratio: 1 });
        const inputBounds = await input.boundingBox();
        const labelBounds = await summary.getByText(label, { exact: true }).boundingBox();
        expect(inputBounds).not.toBeNull();
        expect(labelBounds).not.toBeNull();
        expect(labelBounds!.y + labelBounds!.height, `${label} sits above its input`).toBeLessThanOrEqual(inputBounds!.y + .5);
        expect(inputBounds!.x, `${label} starts at the summary's left edge`).toBeCloseTo(summaryBounds!.x, 0);
        expect(inputBounds!.width, `${label} uses the full summary width`).toBeCloseTo(summaryBounds!.width, 0);
        expect(await input.evaluate(element => getComputedStyle(element).textAlign)).toBe('left');
      }
      await expect(page.getByTestId('record-review-institution')).toBeInViewport({ ratio: 1 });
      await expect(page.getByTestId('save-record')).toBeInViewport({ ratio: 1 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      await page.screenshot({ path: `test-results/record-review-compact-photo-${width}.png` });
      await page.screenshot({ path: `test-results/record-review-inline-fields-${width}.png` });
      await page.screenshot({ path: `test-results/record-review-stacked-fields-${width}.png` });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByTestId('record-review-institution').fill('Hospital ficticio de prueba');
    await page.getByTestId('record-review-description-edit').click();
    await expect(page.getByTestId('record-review-description-popup')).toBeVisible();
    await expect(page.getByTestId('photo-review-text')).toHaveValue('');
    await page.getByTestId('photo-review-text').fill('Descripción temporal que se cancela');
    await page.getByTestId('record-review-description-close').click();
    await expect(page.getByTestId('record-review-description-popup')).toHaveCount(0);
    await expect(page.getByTestId('record-review-summary-text')).toHaveCount(0);
    await page.getByTestId('record-review-description-edit').click();
    await expect(page.getByTestId('photo-review-text')).toHaveValue('');
    await page.getByTestId('photo-review-text').fill('Texto revisado de prueba');
    for (const width of [393, 320]) {
      const height = width === 393 ? 852 : 640;
      await page.setViewportSize({ width, height });
      const popup = page.getByTestId('record-review-description-popup');
      await expect(popup).toBeVisible();
      const bounds = await popup.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(8);
      expect(bounds!.y).toBeGreaterThan(8);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width - 8);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height - 8);
      expect(bounds!.x + bounds!.width / 2).toBeCloseTo(width / 2, 0);
      await expect(page.getByTestId('photo-review-text')).toBeInViewport({ ratio: 1 });
      await expect(page.getByTestId('record-review-description-save')).toBeInViewport({ ratio: 1 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      await page.screenshot({ path: `test-results/record-review-description-popup-${width}.png` });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByTestId('record-review-description-save').click();
    await expect(page.getByTestId('record-review-summary-text')).toHaveText('Texto revisado de prueba');
    await expect(page.getByTestId('photo-review-text')).toHaveCount(0);
    await page.getByTestId('record-review-description-edit').click();
    await expect(page.getByTestId('photo-review-text')).toHaveValue('Texto revisado de prueba');
    await page.getByTestId('photo-review-text').fill('Cambio temporal descartado con Escape');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('record-review-description-popup')).toHaveCount(0);
    await expect(page.getByTestId('record-review-sheet')).toBeVisible();
    await expect(page.getByTestId('record-review-summary-text')).toHaveText('Texto revisado de prueba');
    await expect(page.getByTestId('record-review-doctor')).toHaveValue(metadata.doctorName);
    await expect(page.getByTestId('record-review-specialty')).toHaveValue(metadata.specialty);
    await expect(page.getByTestId('record-review-institution')).toHaveValue('Hospital ficticio de prueba');
    await page.getByTestId('record-review-description-edit').click();
    await page.getByTestId('photo-review-text').fill('');
    await page.getByTestId('record-review-description-save').click();
    await expect(page.getByTestId('record-review-description-edit')).toContainText('Agregar');
    await expect(page.getByTestId('record-review-summary-text')).toHaveCount(0);
    await page.getByTestId('record-review-description-edit').click();
    await page.getByTestId('photo-review-text').fill('Texto revisado de prueba');
    await page.getByTestId('record-review-description-save').click();
    await page.getByTestId('record-review-edit').click();
    for (const name of ['doctor', 'specialty']) await expect(page.getByTestId(`record-review-${name}`)).toHaveCount(1);
    await expect(page.getByTestId('photo-review-text')).toHaveCount(0);
    await page.screenshot({ path: 'test-results/record-photo-review-fields.png' });
    await page.getByTestId('photo-review-title').fill('Foto de prueba');
    await page.getByTestId('save-record').click();
    await expect(page.getByText('Foto de prueba', { exact: true })).toBeVisible();
    const savedPhoto = async () => page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem('@klini/app-state:v1') || '{}');
      return state.records?.filter((record: { title: string }) => record.title === 'Foto de prueba') ?? [];
    });
    const expectedPhoto = { type: 'Nota', title: 'Foto de prueba', ...metadata, description: 'Texto revisado de prueba', institution: 'Hospital ficticio de prueba', attachment: { mimeType: 'image/png' } };
    await expect.poll(savedPhoto).toMatchObject([expectedPhoto]);
    await page.reload();
    await expect(page.getByTestId('quick-register')).toBeVisible();
    expect(await savedPhoto()).toHaveLength(1);
    expect(await savedPhoto()).toMatchObject([expectedPhoto]);
    expect(providerRequests).toEqual([]);
    expect(errors).toEqual([]);
    console.log('PASS four-step photo flow, simulated camera, retake, category popup, inline doctor/specialty editing and category round trip, compact fields and description popup at 393/320, popup cancel/confirm/Escape/clear, original PNG download, final save and reload persistence; no provider calls');
  } catch (error) {
    await page.screenshot({ path: 'test-results/record-photo-flow-failure.png' }).catch(() => undefined);
    console.error('Visible registration alerts:', await page.getByRole('alert').allTextContents());
    console.error('Browser errors:', errors);
    throw error;
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
