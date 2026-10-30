import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.KLINI_CHROMIUM_EXECUTABLE_PATH,
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto('http://127.0.0.1:8096');
    await page.getByTestId('header-menu').click();
    await expect(page.getByTestId('nav-agenda')).toHaveCount(0);
    await page.getByTestId('nav-wallet').click();
    await page.getByTestId('wallet-sheet').waitFor();
    const positions: number[] = [];
    for (let i = 0; i < 30; i++) {
      positions.push(
        await page.getByTestId('wallet-sheet').evaluate((el) => el.getBoundingClientRect().y),
      );
      await page.evaluate(() => new Promise(requestAnimationFrame));
    }
    assert.ok(Math.max(...positions) > positions.at(-1)! + 20, 'wallet slides upward');
    await expect(page.getByTestId('wallet-balance')).toHaveText('$860.00');
    await page.screenshot({ path: 'test-results/wallet-390.png' });
    await page.getByTestId('wallet-amount').fill('9');
    await page.getByTestId('wallet-recharge').click();
    await expect(page.getByTestId('wallet-message')).toContainText('entre $10');
    await expect(page.getByTestId('wallet-balance')).toHaveText('$860.00');
    await page.getByTestId('wallet-amount').fill('123,45');
    await page.getByTestId('wallet-recharge').click();
    await expect(page.getByTestId('wallet-message')).toContainText('guardada');
    await expect(page.getByTestId('wallet-balance')).toHaveText('$983.45');
    await page.getByText('Movimientos recientes', { exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByText('Recarga de demostración', { exact: true })).toBeVisible();
    await page.screenshot({ path: 'test-results/wallet-movements.png' });
    await page.reload();
    await expect(page.getByTestId('wallet-balance')).toHaveText('$983.45');
    await page.setViewportSize({ width: 320, height: 640 });
    await page.getByTestId('wallet-recharge').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/wallet-320.png' });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await page.getByTestId('wallet-close').click();
    await page.getByTestId('menu-agenda').click();
    await page.waitForURL('**/agenda');
    assert.deepEqual(errors, []);
    console.log(
      'PASS: upward animation, recharge validation, persistence, movements, 320px, agenda on home.',
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
