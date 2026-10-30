import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.KLINI_CHROMIUM_EXECUTABLE_PATH });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const output = path.resolve('dist-web');
  await context.route('http://klini.test/**', async route => {
    const url = new URL(route.request().url());
    const requested = path.resolve(output, decodeURIComponent(url.pathname).replace(/^\//, ''));
    const file = requested.startsWith(output + path.sep) && fs.existsSync(requested) && fs.statSync(requested).isFile() ? requested : path.join(output, 'index.html');
    const mime: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png', '.json': 'application/json' };
    await route.fulfill({ path: file, contentType: mime[path.extname(file)] });
  });
  const storedRecords = () => page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('@klini/app-state:v1') || '{}');
    return (state.records || []) as { title: string; type: string; attachment?: { name: string } }[];
  });
  async function save(title: string, type: string, attachment?: string) {
    await page.getByTestId('record-title').fill(title);
    await page.getByTestId('save-record').click();
    await expect.poll(async () => (await storedRecords()).find(record => record.title === title)).toMatchObject({ title, type, ...(attachment ? { attachment: { name: attachment } } : {}) });
    await page.reload();
    await expect.poll(async () => (await storedRecords()).some(record => record.title === title)).toBe(true);
    await expect(page.getByTestId('record-categories')).toBeVisible();
  }
  try {
    fs.mkdirSync('test-results', { recursive: true });
    await page.goto('http://klini.test/');
    await page.getByTestId('quick-register').click();
    const categories = page.getByTestId('record-categories').getByRole('button');
    await expect(categories).toHaveCount(8);
    for (let index = 0; index < 8; index++) {
      const category = categories.nth(index);
      const border = await category.locator(':scope > div').first().evaluate(element => getComputedStyle(element).borderColor);
      await category.click();
      await expect(page.getByTestId('record-type-popup')).toBeVisible();
      for (const mode of ['photo', 'text', 'file']) await expect(page.getByTestId(`record-type-${mode}`)).toBeVisible();
      if (index === 1) await page.screenshot({ path: 'test-results/register-type-popup.png' });
      await page.getByTestId('record-type-close').click();
      await expect(category).not.toHaveAttribute('aria-selected', 'true');
      expect(await category.locator(':scope > div').first().evaluate(element => getComputedStyle(element).borderColor)).toBe(border);
    }
    const consult = page.getByTestId('record-category-Consulta');
    await consult.hover();
    await page.mouse.down();
    await expect(consult).toHaveCSS('opacity', '0.65');
    await page.mouse.up();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('record-type-popup')).toHaveCount(0);
    await consult.click();
    await page.getByTestId('record-type-text').click();
    await save('Consulta texto de prueba', 'Consulta');

    await page.getByTestId('record-category-Vacuna').click();
    const photoChooser = page.waitForEvent('filechooser');
    await page.getByTestId('record-type-photo').click();
    const photo = await photoChooser;
    expect(await photo.element().getAttribute('accept')).toBe('image/*');
    await photo.setFiles({ name: 'vacuna-prueba.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZkAAAAASUVORK5CYII=', 'base64') });
    await expect(page.getByText('vacuna-prueba.png', { exact: true })).toBeVisible();
    await save('Vacuna foto de prueba', 'Vacuna', 'vacuna-prueba.png');

    await page.getByTestId('record-category-Alergia').click();
    const fileChooser = page.waitForEvent('filechooser');
    await page.getByTestId('record-type-file').click();
    await (await fileChooser).setFiles({ name: 'alergia-prueba.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF') });
    await expect(page.getByText('alergia-prueba.pdf', { exact: true })).toBeVisible();
    await save('Alergia archivo de prueba', 'Alergia', 'alergia-prueba.pdf');

    await page.getByTestId('record-category-continue').click();
    await expect(page.getByTestId('record-type-popup')).toBeVisible();
    await page.getByTestId('record-type-text').click();
    await page.getByTestId('archive-detail-back').click();
    await expect(page.getByTestId('record-categories')).toBeVisible();
    await page.setViewportSize({ width: 320, height: 700 });
    await page.getByTestId('record-category-Todos').click();
    await expect(page.getByTestId('record-type-file')).toBeVisible();
    const box = await page.getByTestId('record-type-popup').boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(320);
    await page.screenshot({ path: 'test-results/register-type-popup-small.png' });
    await page.getByTestId('record-type-close').click();
    await page.screenshot({ path: 'test-results/register-categories-no-selection.png' });
    expect(errors).toEqual([]);
    console.log('PASS: ocho categorías, transparencia, cerrar/volver, texto, foto y PDF, categoría y persistencia, ventana de 320 px.');
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
