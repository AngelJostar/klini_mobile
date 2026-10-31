import { chromium, expect, type Page } from '@playwright/test';
import type { AppState } from '../src/domain/types';

async function confirm(page: Page) {
  await page.getByTestId('booking-schedule-next').click();
  await page.getByTestId('booking-service-next').click();
  await page.getByTestId('booking-patient-next').click();
  await page.getByTestId('booking-consent-details').click();
  await page.getByTestId('booking-consent-demo').click();
  await page.getByTestId('booking-confirm').click();
  await page.getByTestId('booking-view-agenda').click();
}

async function main() {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Mexico_City' });
  await page.clock.install({ time: new Date('2026-10-30T12:00:00-06:00') });
  try {
    await page.goto('http://127.0.0.1:8096');
    await page.getByTestId('menu-directory').click();
    await page.getByTestId('booking-search-submit').click();
    await page.getByTestId('booking-doctor-doctor-elena').click();
    await page.getByTestId('booking-profile-next').click();
    await page.getByTestId('booking-calendar-toggle').click();
    await page.getByTestId('booking-calendar-day-2026-11-02').click();
    await page.getByRole('button', { name: 'Seleccionar 09:00', exact: true }).click();
    await confirm(page);

    const readState = () => page.evaluate(() => JSON.parse(localStorage.getItem('@klini/app-state:v1')!) as AppState);
    await expect.poll(async () => (await readState()).appointments.length).toBe(4);
    const created = (await readState()).appointments.find(a => !a.id.startsWith('appointment-demo'))!;
    expect(created.date).toBe('2026-11-02');
    await expect(page.locator('[data-testid^="agenda-open-"]')).toHaveCount(4);
    await expect(page.getByTestId(`agenda-open-${created.id}`)).toBeVisible();
    await expect(page.getByTestId('agenda-heading-2026-11-02')).toContainText('Lunes 2');
    await expect(page.getByTestId('agenda-heading-2026-11-02')).toContainText('de Noviembre');
    await expect(page.getByTestId('agenda-calendar')).toHaveCount(0);
    await page.waitForTimeout(450);
    await expect(page.getByTestId(`agenda-open-${created.id}`)).toBeInViewport();
    await page.screenshot({ path: 'test-results/agenda-new-booking-november-2.png' });
    await page.getByTestId('agenda-calendar-toggle').click();
    await expect(page.getByText('Noviembre 2026', { exact: true })).toBeVisible();
    await expect(page.getByTestId('agenda-day-2026-11-02').locator('div').first()).not.toHaveCSS('border-color', 'rgb(36, 86, 196)');
    await expect(page.locator('[data-testid^="agenda-open-"]')).toHaveCount(4);
    await page.reload();
    await expect(page.getByTestId(`agenda-open-${created.id}`)).toBeVisible();
    await expect(page.locator('[data-testid^="agenda-open-"]')).toHaveCount(4);
    await expect(page.getByTestId(`agenda-open-${created.id}`)).toBeInViewport();

    await page.getByTestId(`agenda-open-${created.id}`).click();
    await page.getByTestId('appointment-reschedule').click();
    await page.getByTestId('booking-calendar-toggle').click();
    await page.getByTestId('booking-calendar-day-2026-11-03').click();
    await page.getByRole('button', { name: 'Seleccionar 09:00', exact: true }).click();
    await confirm(page);
    await expect(page.getByTestId('agenda-heading-2026-11-03')).toContainText('Martes 3');
    await expect(page.getByTestId('agenda-heading-2026-11-03')).toContainText('de Noviembre');
    await expect(page.locator('[data-testid^="agenda-open-"]')).toHaveCount(4);
    await expect(page.getByTestId(`agenda-open-${created.id}`)).toBeVisible();
    await expect.poll(async () => (await readState()).appointments.find(a => a.id === created.id)?.date).toBe('2026-11-03');
    expect((await readState()).appointments).toHaveLength(4);
    await page.reload();
    await expect(page.getByTestId(`agenda-open-${created.id}`)).toBeVisible();
    await expect(page.getByTestId('agenda-heading-2026-11-03')).toContainText('Martes 3');
    await expect(page.locator('[data-testid^="agenda-open-"]')).toHaveCount(4);
    await expect(page.getByTestId(`agenda-open-${created.id}`)).toBeInViewport();
    console.log('PASS new booking on Nov 2 focused within all dates, correct calendar month without automatic filtering, persisted reload and rescheduling without duplicate');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
