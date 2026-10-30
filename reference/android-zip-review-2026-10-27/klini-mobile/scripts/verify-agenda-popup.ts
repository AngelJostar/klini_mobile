import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
async function main() {
 const browser = await chromium.launch({ executablePath: process.env.KLINI_CHROMIUM_EXECUTABLE_PATH });
 const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
 const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
 try {
  await page.goto('http://127.0.0.1:8096'); await page.getByTestId('menu-agenda').click();
  await page.getByTestId('agenda-popup').waitFor();
  const positions: number[] = [];
  for(let i=0;i<28;i++){positions.push(await page.getByTestId('agenda-popup').evaluate(e=>e.getBoundingClientRect().y));await page.evaluate(()=>new Promise(requestAnimationFrame));}
  assert.ok(Math.max(...positions)>positions.at(-1)!+10);
  assert.equal((await page.getByTestId('agenda-popup').boundingBox())?.width,390);
  await page.screenshot({path:'test-results/agenda-popup-390.png'});
  const day = await page.locator('[data-testid^="agenda-day-"][aria-pressed="true"]').count();
  const originalPanel = await page.getByTestId('agenda-popup').boundingBox();
  const originalCalendar = await page.getByTestId('agenda-next-month').boundingBox();
  for (let month = 0; month < 12; month++) {
    await page.getByTestId('agenda-next-month').click();
    assert.equal(await page.locator('[data-testid^="agenda-day-"]').count(), 42);
    assert.deepEqual(await page.getByTestId('agenda-popup').boundingBox(), originalPanel, 'Popup stays fixed across months');
    assert.deepEqual(await page.getByTestId('agenda-next-month').boundingBox(), originalCalendar, 'Calendar stays fixed across months');
  }
  for (let month = 0; month < 12; month++) await page.getByTestId('agenda-prev-month').click();
  await page.locator('[data-testid^="agenda-open-"]').first().click();
  await expect(page.getByTestId('appointment-reschedule')).toBeVisible();
  await expect(page.getByTestId('appointment-notes')).toHaveCount(0);
  await expect(page.getByText('Motivo de consulta', { exact: true })).toHaveCount(0);
  await page.getByTestId('agenda-detail-back').click();
  await page.setViewportSize({width:320,height:640});
  await page.getByTestId('agenda-book').scrollIntoViewIfNeeded();
  await page.screenshot({path:'test-results/agenda-popup-320.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.getByTestId('agenda-close').click(); await page.getByTestId('menu-agenda').click();
  await page.getByTestId('agenda-book').click(); await page.waitForURL('**/directory');
  assert.deepEqual(errors,[]); console.log('PASS agenda slide, full width, month navigation, detail/back, 320px, close, booking',day);
 } finally {await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
