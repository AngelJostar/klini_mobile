import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import type { AppState, Appointment } from '../src/domain/types';

const testNow = new Date('2026-10-30T12:00:00-06:00');

function dateParts(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
  return {
    day: capitalize(date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric' })),
    month: `de ${capitalize(date.toLocaleDateString('es-MX', { month: 'long' }))}`,
  };
}

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.KLINI_CHROMIUM_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Mexico_City' });
  await page.clock.install({ time: testNow });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const readState = () => page.evaluate(() => JSON.parse(localStorage.getItem('@klini/app-state:v1')!) as AppState);
  const appointmentRows = page.locator('[data-testid^="agenda-open-"]');
  const groups = page.locator('[data-testid^="agenda-group-"]');

  async function assertAppointments(expected: Appointment[], descending = false) {
    const sorted = [...expected].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`) * (descending ? -1 : 1));
    await expect(appointmentRows).toHaveCount(sorted.length);
    assert.deepEqual(await appointmentRows.evaluateAll(elements => elements.map(element => element.getAttribute('data-testid'))), sorted.map(appointment => `agenda-open-${appointment.id}`), 'Appointments follow the selected chronological order across dates and times');
    const dates = [...new Set(sorted.map(appointment => appointment.date))];
    assert.deepEqual(await groups.evaluateAll(elements => elements.map(element => element.getAttribute('data-testid'))), dates.map(date => `agenda-group-${date}`), 'One group per date in chronological order');
    for (const date of dates) {
      const heading = page.getByTestId(`agenda-heading-${date}`);
      const labels = dateParts(date);
      await expect(heading).toContainText(labels.day);
      await expect(heading).toContainText(labels.month);
      const dayFont = await page.getByTestId(`agenda-day-label-${date}`).evaluate(element => parseFloat(getComputedStyle(element).fontSize));
      const monthFont = await page.getByTestId(`agenda-month-label-${date}`).evaluate(element => parseFloat(getComputedStyle(element).fontSize));
      assert.ok(monthFont < dayFont, 'The month is smaller than the day');
    }
  }

  async function fixedBookingButton() {
    const button = page.getByTestId('agenda-book');
    await expect(button).toBeInViewport();
    const before = await button.boundingBox();
    const scroll = page.getByTestId('agenda-scroll');
    await scroll.evaluate(element => { element.scrollTop = element.scrollHeight; });
    await expect(button).toBeInViewport();
    assert.deepEqual(await button.boundingBox(), before, 'Agendar cita stays fixed while Agenda scrolls');
    await expect(button).toHaveCSS('background-color', 'rgb(221, 245, 242)');
    await expect(button).toHaveCSS('border-radius', '20px');
    await scroll.evaluate(element => { element.scrollTop = 0; });
  }

  async function openFilters() {
    await page.getByTestId('agenda-options').click();
    const popup = page.getByTestId('agenda-filter-popup');
    await expect(popup).toBeVisible();
    await expect(page.getByTestId('agenda-filter-close')).toBeInViewport();
    await expect(page.getByTestId('agenda-filter-apply')).toBeInViewport();
    const bounds = await popup.boundingBox();
    const viewport = page.viewportSize()!;
    assert.ok(bounds && bounds.x >= 0 && bounds.y >= 0);
    assert.ok(bounds.x + bounds.width <= viewport.width && bounds.y + bounds.height <= viewport.height, 'Filter popup fits the mobile viewport');
    return popup;
  }

  async function applyFilters() {
    await page.getByTestId('agenda-filter-apply').click();
    await expect(page.getByTestId('agenda-filter-popup')).toHaveCount(0);
  }

  async function assertClearFilters() {
    const clear = page.getByTestId('agenda-clear-filters');
    await expect(clear).toBeVisible();
    await expect(clear).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(clear).toHaveCSS('border-top-width', '0px');
    const bounds = await clear.boundingBox();
    const options = await page.getByTestId('agenda-options').boundingBox();
    assert.ok(bounds && options && bounds.y >= options.y + options.height - 1, 'Clear filters is plain text below the filter icon');
  }

  async function clearFilters() {
    await page.getByTestId('agenda-clear-filters').click();
    await expect(page.getByTestId('agenda-clear-filters')).toHaveCount(0);
  }

  try {
    await page.goto('http://127.0.0.1:8096');
    await page.getByTestId('menu-agenda').click();
    await page.getByTestId('agenda-popup').waitFor();
    const positions: number[] = [];
    for (let index = 0; index < 28; index++) {
      positions.push(await page.getByTestId('agenda-popup').evaluate(element => element.getBoundingClientRect().y));
      await page.evaluate(() => new Promise(requestAnimationFrame));
    }
    assert.ok(Math.max(...positions) > positions.at(-1)! + 10);
    assert.equal((await page.getByTestId('agenda-popup').boundingBox())?.width, 390);
    const state = await readState();
    const upcoming = state.appointments.filter(appointment => appointment.status === 'scheduled' && new Date(`${appointment.date}T${appointment.time}:00-06:00`).getTime() >= testNow.getTime());
    const history = state.appointments.filter(appointment => appointment.status === 'completed' || (appointment.status === 'scheduled' && new Date(`${appointment.date}T${appointment.time}:00-06:00`).getTime() < testNow.getTime()));
    const cancelled = state.appointments.filter(appointment => appointment.status === 'cancelled');
    assert.equal(state.appointments.length, 3, 'A fresh demo has three appointments across three dates');
    await assertAppointments(state.appointments);
    await expect(page.getByTestId('agenda-calendar')).toHaveCount(0);
    await expect(page.getByTestId('agenda-calendar-toggle')).toHaveAccessibleName('Mostrar calendario');
    const toggle = await page.getByTestId('agenda-calendar-toggle').boundingBox();
    const options = await page.getByTestId('agenda-options').boundingBox();
    assert.ok(toggle && options);
    assert.ok(Math.abs(toggle.y + toggle.height / 2 - options.y - options.height / 2) <= 1, 'Filters align with Mostrar calendario');
    await fixedBookingButton();
    await page.screenshot({ path: 'test-results/agenda-calendar-collapsed.png' });

    await expect(page.getByTestId('agenda-clear-filters')).toHaveCount(0);
    const panelBounds = await page.getByTestId('agenda-popup').boundingBox();
    await openFilters();
    assert.deepEqual(await page.getByTestId('agenda-popup').boundingBox(), panelBounds, 'Opening filter options keeps the Agenda panel stationary');
    await page.getByTestId('agenda-filter-upcoming').click();
    await assertAppointments(state.appointments);
    await page.getByTestId('agenda-filter-close').click();
    await expect(page.getByTestId('agenda-filter-popup')).toHaveCount(0);
    await expect(page.getByTestId('agenda-clear-filters')).toHaveCount(0);
    await openFilters();
    await applyFilters();
    await assertAppointments(state.appointments);
    await expect(page.getByTestId('agenda-clear-filters')).toHaveCount(0);

    await openFilters();
    await page.getByTestId('agenda-filter-history').click();
    await assertAppointments(state.appointments);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('agenda-filter-popup')).toHaveCount(0);
    await openFilters();
    await applyFilters();
    await assertAppointments(state.appointments);

    await openFilters();
    await page.getByTestId('agenda-filter-upcoming').click();
    await assertAppointments(state.appointments);
    await page.screenshot({ path: 'test-results/agenda-filter-popup-390.png' });
    await applyFilters();
    await assertAppointments(upcoming);
    await assertClearFilters();
    await openFilters();
    await page.getByTestId('agenda-filter-history').click();
    await assertAppointments(upcoming);
    await applyFilters();
    await assertAppointments(history, true);
    await openFilters();
    await page.getByTestId('agenda-filter-cancelled').click();
    await assertAppointments(history, true);
    await applyFilters();
    await assertAppointments(cancelled, true);
    await openFilters();
    await page.getByTestId('agenda-filter-all').click();
    await assertAppointments(cancelled, true);
    await applyFilters();
    await assertAppointments(state.appointments);
    await expect(page.getByTestId('agenda-clear-filters')).toHaveCount(0);

    await openFilters();
    await page.getByTestId('agenda-date-today').click();
    await assertAppointments(state.appointments);
    await page.keyboard.press('Escape');
    await openFilters();
    await applyFilters();
    await assertAppointments(state.appointments);
    await openFilters();
    await page.getByTestId('agenda-date-today').click();
    await applyFilters();
    await assertAppointments(state.appointments.filter(appointment => appointment.date === '2026-10-30'));
    await assertClearFilters();
    await clearFilters();
    await assertAppointments(state.appointments);

    const collapsedButton = await page.getByTestId('agenda-book').boundingBox();
    await page.getByTestId('agenda-calendar-toggle').click();
    await expect(page.getByTestId('agenda-calendar')).toBeVisible();
    await expect(page.getByTestId('agenda-calendar-toggle')).toHaveAccessibleName('Ocultar calendario');
    assert.deepEqual(await page.getByTestId('agenda-book').boundingBox(), collapsedButton, 'Booking button stays fixed when calendar opens');
    await assertAppointments(state.appointments);
    const originalPanel = await page.getByTestId('agenda-popup').boundingBox();
    const originalCalendar = await page.getByTestId('agenda-next-month').boundingBox();
    for (let month = 0; month < 12; month++) {
      await page.getByTestId('agenda-next-month').click();
      assert.equal(await page.locator('[data-testid^="agenda-day-20"]').count(), 42);
      assert.deepEqual(await page.getByTestId('agenda-popup').boundingBox(), originalPanel, 'Popup stays fixed across months');
      assert.deepEqual(await page.getByTestId('agenda-next-month').boundingBox(), originalCalendar, 'Calendar stays fixed across months');
    }
    for (let month = 0; month < 12; month++) await page.getByTestId('agenda-prev-month').click();
    await assertAppointments(state.appointments);
    await page.getByTestId('agenda-day-2026-10-31').click();
    await assertAppointments(state.appointments.filter(appointment => appointment.date === '2026-10-31'));
    await page.getByTestId('agenda-calendar-toggle').click();
    await expect(page.getByTestId('agenda-calendar')).toHaveCount(0);
    await assertAppointments(state.appointments.filter(appointment => appointment.date === '2026-10-31'));
    await assertClearFilters();
    await openFilters();
    await page.getByTestId('agenda-filter-upcoming').click();
    await applyFilters();
    await assertAppointments(upcoming.filter(appointment => appointment.date === '2026-10-31'));
    await openFilters();
    await page.getByTestId('agenda-filter-all').click();
    await applyFilters();
    await assertAppointments(state.appointments.filter(appointment => appointment.date === '2026-10-31'));
    await openFilters();
    await page.getByTestId('agenda-date-all').click();
    await page.getByTestId('agenda-filter-cancelled').click();
    await assertAppointments(state.appointments.filter(appointment => appointment.date === '2026-10-31'));
    await page.keyboard.press('Escape');
    await openFilters();
    await applyFilters();
    await assertAppointments(state.appointments.filter(appointment => appointment.date === '2026-10-31'));
    await openFilters();
    await page.getByTestId('agenda-date-all').click();
    await applyFilters();
    await assertAppointments(state.appointments);
    await expect(page.getByTestId('agenda-clear-filters')).toHaveCount(0);
    await openFilters();
    await page.getByTestId('agenda-date-today').click();
    await page.getByTestId('agenda-filter-upcoming').click();
    await applyFilters();
    await assertAppointments(upcoming.filter(appointment => appointment.date === '2026-10-30'));
    await clearFilters();
    await assertAppointments(state.appointments);
    await page.screenshot({ path: 'test-results/agenda-popup-390.png' });

    await appointmentRows.first().click();
    await expect(page.getByTestId('appointment-export-calendar')).toBeVisible();
    await expect(page.getByTestId('appointment-notes')).toHaveCount(0);
    await expect(page.getByText('Motivo de consulta', { exact: true })).toHaveCount(0);
    await page.getByTestId('agenda-detail-back').click();
    await assertAppointments(state.appointments);
    await page.setViewportSize({ width: 320, height: 640 });
    await fixedBookingButton();
    await page.screenshot({ path: 'test-results/agenda-popup-320.png' });
    await openFilters();
    await page.getByTestId('agenda-filter-upcoming').click();
    await assertAppointments(state.appointments);
    await page.screenshot({ path: 'test-results/agenda-filter-popup-320.png' });
    await applyFilters();
    await assertAppointments(upcoming);
    await assertClearFilters();
    await clearFilters();
    await assertAppointments(state.appointments);
    await fixedBookingButton();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.getByTestId('agenda-close').click();
    await page.getByTestId('menu-agenda').click();
    await expect(page.getByTestId('agenda-calendar')).toHaveCount(0);
    await assertAppointments(state.appointments);
    await page.getByTestId('agenda-book').click();
    await page.waitForURL('**/directory');
    assert.deepEqual(errors, []);
    console.log('PASS Agenda all dates, popup filters with Apply and discarded drafts, explicit date preservation, plain clear text, aligned toolbar, fixed CTA, detail/back, 390/320px and booking');
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
