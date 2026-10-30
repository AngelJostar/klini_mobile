import { chromium, expect } from '@playwright/test';
async function main() {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto('http://127.0.0.1:8096');
    await page.getByTestId('home-tab-archive').click();
    let searchY: number | undefined;
    for (const [menu, title] of [['menu-prescriptions', 'Recetas y medicamentos'], ['menu-medications', 'Análisis clínicos'], ['menu-records', 'Registros']]) {
      await page.getByTestId(menu).click();
      await expect(page.getByText(title, { exact: true }).last()).toBeVisible();
      await expect(page.getByTestId('history-records')).toBeVisible();
      await expect(page.getByTestId('history-filter-button')).toBeVisible();
      await expect(page.getByTestId('add-archive-item')).toBeVisible();
      await page.waitForTimeout(450);
      const box = await page.getByTestId('archive-search').boundingBox();
      if (searchY === undefined) searchY = box!.y;
      else expect(box!.y).toBeCloseTo(searchY, 0);
      await page.screenshot({ path: `test-results/${menu}-unified.png` });
      await page.getByTestId('add-archive-item').click();
      const entering = await page.getByTestId('archive-popup').boundingBox();
      await page.waitForTimeout(400);
      const settled = await page.getByTestId('archive-popup').boundingBox();
      expect(entering!.y).toBeGreaterThan(settled!.y + 10);
      await expect(page.getByTestId('record-categories')).toBeVisible();
      await page.getByTestId('archive-detail-back').click();
      await page.waitForTimeout(90);
      expect((await page.getByTestId('archive-popup').boundingBox())!.y).toBeGreaterThan(settled!.y + 5);
      await expect(page.getByTestId('record-categories')).toHaveCount(0);
      await page.getByTestId('archive-detail-back').click();
      await expect(page.getByTestId('archive-popup')).toHaveCount(0);
    }
    console.log('PASS archive menus share list, search, filters, add and back layout');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
