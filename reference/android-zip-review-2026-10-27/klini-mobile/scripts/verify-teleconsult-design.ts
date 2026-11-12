import { chromium, expect, type Browser, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createDemoState } from '../src/domain/seed';
import { STORAGE_KEY, validateAppState } from '../src/domain/reducer';

const origin = process.env.KLINI_QA_ORIGIN || 'http://127.0.0.1:8096';
const output = 'test-results/teleconsult-join';
const id = (page: Page, value: string) => page.locator(`[data-testid="${value}"]:visible`);

function fixture() {
  const state = createDemoState(new Date('2026-11-09T12:00:00-06:00'));
  const original = state.appointments.find(item => item.mode === 'Teleconsulta')!;
  state.appointments = [
    { ...original, id: 'qa-teleconsult-upcoming', date: '2026-11-10', meetingUrl: 'https://example.com/qa-meeting' },
    { ...original, id: 'qa-teleconsult-past-scheduled', date: '2026-11-04' },
    { ...original, id: 'qa-teleconsult-completed', date: '2026-11-03', status: 'completed' },
    { ...original, id: 'qa-teleconsult-cancelled', date: '2026-11-02', status: 'cancelled' },
  ];
  state.messages = [];
  state.medicationReminderDemoVersion = 1;
  expect(validateAppState(state)).toBe(true);
  return state;
}

async function settled(page: Page) {
  await expect.poll(() => id(page, 'teleconsult-popup').last().evaluate(element => {
    const transform = getComputedStyle(element).transform;
    return transform === 'none' ? 0 : Math.abs(new DOMMatrixReadOnly(transform).m42);
  })).toBeLessThan(0.5);
}

async function verify(browser: Browser, viewport: { width: number; height: number }) {
  const context = await browser.newContext({ viewport, timezoneId: 'America/Mexico_City' });
  const errors: string[] = [], forbidden: string[] = [];
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== origin || request.method() !== 'GET') {
      forbidden.push(`${request.method()} ${url.origin}${url.pathname}`);
      await route.abort();
    } else await route.continue();
  });
  await context.addInitScript(({ state, key }) => localStorage.setItem(key, JSON.stringify(state)), { state: fixture(), key: STORAGE_KEY });
  const page = await context.newPage();
  await page.clock.install({ time: new Date('2026-11-09T12:00:00-06:00') });
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(origin);
    await id(page, 'menu-teleconsult').click({ timeout: 60000 });
    await expect(id(page, 'teleconsult-popup')).toBeVisible();
    await settled(page);
    const popup = await id(page, 'teleconsult-popup').boundingBox();
    expect(popup?.width).toBe(viewport.width);
    const join = id(page, 'teleconsult-join-qa-teleconsult-past-scheduled');
    await expect(join).toBeVisible();
    await expect(join).toHaveText('Unirse');
    const details = await id(page, 'teleconsult-appointment-qa-teleconsult-past-scheduled').boundingBox();
    const joinBox = await join.boundingBox();
    expect(joinBox!.x).toBeGreaterThanOrEqual(details!.x + details!.width);
    expect(joinBox!.height).toBeGreaterThanOrEqual(44);
    expect(joinBox!.x + joinBox!.width).toBeLessThanOrEqual(viewport.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.screenshot({ path: `${output}/upcoming-${viewport.width}.png` });

    // Detail and join stay separate, without nested accessible buttons.
    await id(page, 'teleconsult-appointment-qa-teleconsult-upcoming').click();
    await expect(id(page, 'teleconsult-appointment-detail')).toBeVisible();
    await id(page, 'teleconsult-detail-back').click();
    await settled(page);
    await id(page, 'teleconsult-join-qa-teleconsult-upcoming').click();
    await expect(page.getByText('Antes de entrar', { exact: true })).toBeVisible();
    await expect(page.getByText('Enlace configurado por ti', { exact: true })).toBeVisible();
    await expect(id(page, 'teleconsult-enter-demo')).toBeDisabled();
    await expect(id(page, 'teleconsult-open-meeting')).toBeDisabled();
    for (const check of ['sound', 'camera', 'privacy']) await id(page, `teleconsult-check-${check}`).click();
    await expect(id(page, 'teleconsult-enter-demo')).toBeEnabled();
    await expect(id(page, 'teleconsult-open-meeting')).toBeEnabled();
    expect(context.pages()).toHaveLength(1);
    await page.screenshot({ path: `${output}/preparation-${viewport.width}.png` });
    await id(page, 'teleconsult-enter-demo').click();
    await expect(page.getByText('Sala de demostración', { exact: true })).toBeVisible();
    await expect(page.getByText('No hay un médico conectado', { exact: true })).toBeVisible();
    await id(page, 'teleconsult-detail-back').click();
    await id(page, 'teleconsult-detail-back').click();
    await settled(page);

    await id(page, 'teleconsult-tab-history').click();
    await expect(id(page, 'teleconsult-tab-history')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[data-testid^="teleconsult-join-"]:visible')).toHaveCount(0);
    await id(page, 'teleconsult-appointment-qa-teleconsult-completed').click();
    await expect(id(page, 'teleconsult-detail-status')).toHaveText('Cita completada');
    await id(page, 'teleconsult-detail-back').click();
    await id(page, 'teleconsult-tab-scheduled').click();
    await expect(id(page, 'teleconsult-join-qa-teleconsult-upcoming')).toBeVisible();
    await id(page, 'teleconsult-book').click();
    await page.waitForURL('**/directory?mode=Teleconsulta');
    await expect(id(page, 'booking-search-submit')).toBeVisible();
    expect(errors).toEqual([]);
    expect(forbidden).toEqual([]);
    return { viewport, status: 'PASS', checks: ['Unirse visible for scheduled appointments, including unchanged prior demo dates', 'Separate detail and join actions', 'Accessible 44px target and no horizontal overflow', 'Preparation and explicit demo room entry; no automatic external connection', 'Completed/cancelled history has no join action', 'Existing booking navigation'], pageErrors: errors, forbiddenRequests: forbidden };
  } finally {
    await context.close();
  }
}

async function main() {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    const reports = [];
    for (const viewport of [{ width: 393, height: 852 }, { width: 320, height: 640 }]) reports.push(await verify(browser, viewport));
    await writeFile(`${output}/report.json`, JSON.stringify(reports, null, 2));
    console.log('PASS Teleconsulta Unirse: 393/320, preparation, demo room, history and booking.');
  } finally { await browser.close(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });

