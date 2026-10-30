import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.KLINI_CHROMIUM_EXECUTABLE_PATH,
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  fs.mkdirSync('test-results', { recursive: true });
  try {
    await page.goto('http://127.0.0.1:8096');
    await page.getByTestId('header-menu').waitFor();
    await page.getByTestId('header-menu').click();
    await page.getByTestId('nav-wallet').waitFor();
    const positions: number[] = [];
    for (let frame = 0; frame < 24; frame++) {
      positions.push(await page.getByTestId('header-panel').evaluate(element => element.getBoundingClientRect().x));
      await page.evaluate(() => new Promise(requestAnimationFrame));
    }
    assert.ok(Math.min(...positions) < -1, 'Drawer begins to the left of its final position');
    assert.ok(Math.abs(positions[positions.length - 1]) < 1, 'Drawer ends at the left screen edge');
    await page.screenshot({ path: 'test-results/menu-390.png' });
    await page.getByTestId('menu-interactions').click();
    await page.getByTestId('nav-messages').waitFor();
    await page.getByTestId('menu-interactions').click();
    assert.equal(await page.getByTestId('nav-messages').count(), 0);
    // Tapping outside dismisses the panel without opening the obscured home action.
    await page.getByTestId('dismiss-header-panel').click({ position: { x: 385, y: 100 } });
    await page.getByTestId('header-panel').waitFor({ state: 'hidden' });
    assert.equal(await page.getByTestId('nav-wallet').count(), 0);
    await page.getByTestId('home-search').fill('rios');
    await page.getByTestId('nav-doctor-elena').waitFor();
    await page.getByTestId('nav-doctor-elena').click();
    await page.getByText('Conoce a tu médico', { exact: true }).waitFor();
    await page.goBack();
    await page.getByTestId('home-search').fill('zzzzzzz');
    await page.getByText('No encontramos resultados', { exact: true }).waitFor();
    await page.getByTestId('clear-search').click();
    await page.getByTestId('nav-agenda').waitFor();
    await page.getByTestId('home-search').fill('recetas');
    await page.getByTestId('nav-prescriptions').click();
    await page.waitForURL('**/archive?recordType=Receta');
    await page.getByText('Mi archivo', { exact: true }).waitFor();
    await page.goBack();
    await page.getByTestId('header-menu').click();
    await page.getByTestId('nav-devices').click();
    await page.getByText('Este espacio está por llegar', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
    await page.setViewportSize({ width: 320, height: 640 });
    await page.getByTestId('header-menu').click();
    await page.getByTestId('nav-communities').scrollIntoViewIfNeeded();
    assert.equal(await page.getByTestId('nav-agenda').count(), 0);
    assert.equal(
      await page.getByTestId('nav-profile').count(),
      0,
      'Profile is not duplicated in the left menu',
    );
    await page.screenshot({ path: 'test-results/menu-320.png' });
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    assert.ok(fits, 'No horizontal overflow at 320px');
    await page.getByTestId('header-profile').click();
    await page.getByText('Mi perfil', { exact: true }).waitFor();
    assert.deepEqual(errors, [], 'No uncaught browser errors');
    console.log(
      'PASS: menu, submenu, outside dismissal, doctor search/navigation, empty state, clear, archive filter, pending section, 320px layout/profile',
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
