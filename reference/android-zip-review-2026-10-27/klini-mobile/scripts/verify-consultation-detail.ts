import { chromium, expect } from '@playwright/test';
async function main() {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto('http://127.0.0.1:8096');
    await page.getByTestId('home-tab-archive').click();
    await page.getByTestId('menu-history').click();
    await expect(page.getByText('Tu historia, organizada.', { exact: true })).toHaveCount(0);
    await page.waitForTimeout(400);
    const historySearch = await page.getByTestId('archive-search').boundingBox();
    const historyPanel = await page.getByTestId('archive-popup').boundingBox();
    await page.getByTestId('history-category-Consulta').click();
    const categorySearch = await page.getByTestId('archive-search').boundingBox();
    for (const axis of ['x', 'y', 'width', 'height'] as const) expect(categorySearch![axis]).toBeCloseTo(historySearch![axis], 0);
    expect((await page.getByTestId('archive-popup').boundingBox())!.y).toBeCloseTo(historyPanel!.y, 0);
    await expect(page.getByText(/Sofía Martínez · \d+ registros?/)).toHaveCount(0);
    await expect(page.getByTestId('history-records')).toContainText('Consulta general');
    await page.waitForTimeout(400);
    const box = await page.getByTestId('archive-popup').boundingBox();
    await page.screenshot({ path: 'test-results/consultation-list.png' });
    await page.getByTestId('history-send-record-demo-consulta').click();
    await expect(page.getByTestId('record-share-popup')).toBeVisible();
    await expect(page.getByTestId('share-preview')).toContainText('Consulta general');
    await expect(page.getByTestId('share-preview')).not.toContainText('Biometría hemática');
    await expect(page.getByTestId('share-whatsapp')).toBeVisible();
    await expect(page.getByTestId('share-social')).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'test-results/consultation-share.png' });
    await page.getByTestId('record-share-close').click();
    await page.getByTestId('history-open-record-demo-consulta').click();
    await expect(page.getByText('Motivo', { exact: true })).toBeVisible();
    await expect(page.getByText('Resumen', { exact: true })).toBeVisible();
    expect((await page.getByTestId('archive-popup').boundingBox())!.y).toBeCloseTo(box!.y, 0);
    await page.getByTestId('edit-record').click();
    await page.getByTestId('record-time').fill('10:30');
    await page.getByTestId('record-specialty').fill('Medicina general');
    await page.getByTestId('record-reason').fill('Revisión de rutina.');
    await page.getByTestId('save-record').click();
    await page.getByTestId('history-open-record-demo-consulta').click();
    await expect(page.getByText('Revisión de rutina.', { exact: true })).toBeVisible();
    await expect(page.getByText('Medicina general', { exact: true })).toBeVisible();
    await page.screenshot({ path: 'test-results/consultation-detail.png' });
    await page.getByTestId('detail-send').click();
    await expect(page.getByTestId('share-preview')).toContainText('Revisión de rutina.');
    await page.getByTestId('record-share-close').click();
    await page.getByTestId('archive-detail-back').click();
    await expect(page.getByTestId('history-records')).toBeVisible();
    console.log('PASS category list, selected note detail/edit, share chooser, no automatic send, stable height and back');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

