import { chromium, expect, type Browser, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createDemoState } from '../src/domain/seed';
import { STORAGE_KEY } from '../src/domain/reducer';
import { captureProfile } from '../src/domain/family';
import type { AppState } from '../src/domain/types';

const origin = 'http://127.0.0.1:8096';
const output = 'test-results/alert-controls';
const id = (page: Page, value: string) => page.locator(`[data-testid="${value}"]:visible`);
const toggle = (page: Page, value: string) => id(page, `medication-alert-toggle-${value}`).locator('input');
const readState = (page: Page): Promise<AppState> => page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), STORAGE_KEY);
type Controls = Window & { __alertToggleFailWrites?: number };
type Viewport = { width: number; height: number };

function contrastOnWhite(color: string) {
  const rgb = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 1.05 / (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] + 0.05);
}

function fixtureState() {
  const state = createDemoState(new Date('2026-11-09T12:00:00-06:00'));
  state.profile = { ...state.profile, id: 'qa-alert-owner', name: 'Perfil principal QA' };
  state.medicationReminderDemoVersion = 1;
  state.medications = [
    { id: 'qa-medication', name: 'Medicamento vinculado QA', dose: 'Dosis registrada QA', frequency: 'Según indicación', startDate: '2026-11-01', active: true },
    { id: 'qa-second-medication', name: 'Segundo medicamento QA', dose: 'Otra dosis literal QA', frequency: 'Según indicación', startDate: '2026-11-01', active: true },
  ];
  state.medicationCare = {
    treatments: [{ id: 'qa-treatment', name: 'Tratamiento QA', medicationIds: ['qa-medication', 'qa-second-medication'], startDate: '2026-11-01', active: true }],
    takes: [],
    alerts: [
      { id: 'qa-linked', medicationId: 'qa-medication', treatmentId: 'qa-treatment', time: '21:00', days: [0, 1, 2, 3, 4, 5, 6], enabled: false },
      { id: 'qa-manual', medicationName: 'Alerta manual QA', concentration: '10 mg literales QA', time: '22:00', days: [0, 1, 2, 3, 4, 5, 6], enabled: false },
    ],
  };
  const owner = captureProfile(state, 'Perfil principal');
  state.family = { ownerId: state.profile.id, profiles: {
    [state.profile.id]: owner,
    'qa-alert-child': { profile: { ...state.profile, id: 'qa-alert-child', name: 'Perfil familiar QA' }, kind: 'Niño', appointments: [], policies: [], claims: [], records: [], medications: [], messages: [], favorites: [], medicationCare: { treatments: [], takes: [], alerts: [] } },
  } };
  return state;
}

async function createContext(browser: Browser, viewport: Viewport) {
  const context = await browser.newContext({ viewport, timezoneId: 'America/Mexico_City', reducedMotion: 'reduce' });
  const errors: string[] = [], forbidden: string[] = [];
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== origin || request.method() !== 'GET') { forbidden.push(`${request.method()} ${url.origin}${url.pathname}`); await route.abort(); }
    else await route.continue();
  });
  await context.addInitScript(({ state, key }) => {
    if (!sessionStorage.getItem('qa-alert-controls-fixture')) {
      localStorage.setItem(key, JSON.stringify(state));
      localStorage.setItem('klini-managed-profiles-v1:qa-alert-owner', JSON.stringify([{ id: 'qa-alert-child', name: 'Perfil familiar QA', kind: 'Niño' }]));
      sessionStorage.setItem('qa-alert-controls-fixture', '1');
    }
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(storageKey: string, value: string) {
      const controls = window as Controls;
      if (this === localStorage && storageKey === key && (controls.__alertToggleFailWrites || 0) > 0) {
        controls.__alertToggleFailWrites!--;
        throw new DOMException('Synthetic alert persistence failure.', 'QuotaExceededError');
      }
      return original.call(this, storageKey, value);
    };
  }, { state: fixtureState(), key: STORAGE_KEY });
  const page = await context.newPage();
  await page.clock.install({ time: new Date('2026-11-09T12:00:00-06:00') });
  page.on('pageerror', error => errors.push(error.message));
  return { context, page, errors, forbidden };
}

async function verifyRecurrences(browser: Browser, viewport: Viewport) {
  const { context, page, errors, forbidden } = await createContext(browser, viewport);
  const checks: string[] = [];
  try {
    await page.goto(`${origin}/alerts`);
    await expect(id(page, 'alerts-folder')).toBeVisible({ timeout: 60000 });
    await id(page, 'medication-alert-tab-paused').click();
    await id(page, 'medication-alert-qa-manual').getByRole('button').click();
    const beforeCancel = (await readState(page)).medicationCare;
    for (const action of ['close', 'backdrop', 'escape']) {
      await id(page, 'alert-repeat-picker').click();
      const popup = id(page, 'alert-recurrence-popup');
      await expect(popup).toBeVisible();
      await expect(id(page, 'alert-recurrence-title')).toHaveText('Recurrencia');
      const bounds = await popup.boundingBox(), panel = await id(page, 'archive-popup').last().boundingBox();
      expect(bounds).not.toBeNull();
      expect(panel).not.toBeNull();
      expect(Math.abs(bounds!.x + bounds!.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(2);
      expect(Math.abs(bounds!.y + bounds!.height / 2 - (panel!.y + panel!.height / 2))).toBeLessThanOrEqual(24);
      expect(bounds!.y).toBeGreaterThanOrEqual(panel!.y);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
      await expect(popup).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      const labelColor = await popup.getByText('Todos los días', { exact: true }).evaluate(element => getComputedStyle(element).color);
      expect(contrastOnWhite(labelColor)).toBeGreaterThanOrEqual(4.5);
      const fills = await popup.locator('[data-testid^="alert-recurrence-"],[data-testid="alert-repeat-every-day"]').evaluateAll(elements => elements.map(element => getComputedStyle(element).backgroundColor));
      for (const fill of fills) {
        const channels = fill.match(/[\d.]+/g)!.map(Number);
        if (channels.length < 4 || channels[3] !== 0) expect(Math.max(...channels.slice(0, 3)) - Math.min(...channels.slice(0, 3))).toBeLessThanOrEqual(5);
      }
      if (action === 'close') await page.screenshot({ path: `${output}/recurrence-popup-${viewport.width}.png` });
      await id(page, 'alert-recurrence-monthly').click();
      await id(page, 'alert-recurrence-anchor-date').fill('2027-01-15');
      if (action === 'close') await id(page, 'alert-recurrence-close').click();
      else if (action === 'backdrop') await id(page, 'alert-recurrence-backdrop').click({ position: { x: 8, y: 60 } });
      else await page.keyboard.press('Escape');
      await expect(popup).toHaveCount(0);
      await expect(id(page, 'medication-alert-form')).toBeVisible();
      await expect(id(page, 'alert-recurrence-value')).toHaveText('Todos los días');
      await expect(id(page, 'alert-medication-name')).toHaveValue('Alerta manual QA');
      await expect(id(page, 'alert-medication-concentration')).toHaveValue('10 mg literales QA');
      await expect(id(page, 'alert-time')).toHaveValue('22:00');
      expect((await readState(page)).medicationCare).toEqual(beforeCancel);
    }
    await id(page, 'archive-detail-back').click();
    checks.push('Centered white/gray popup with readable labels; X/backdrop/Escape cancel local changes and preserve the underlying form and stored alert');
    for (const [mode, days, label] of [
      ['alert-repeat-every-day', [0, 1, 2, 3, 4, 5, 6], 'Todos los días'],
      ['alert-recurrence-monday', [1], 'Todos los lunes'],
      ['alert-recurrence-sunday', [0], 'Todos los domingos'],
    ] as const) {
      await id(page, 'medication-alert-qa-manual').getByRole('button').click();
      await expect(id(page, 'alert-repeat-picker')).toContainText('Recurrencia');
      await id(page, 'alert-repeat-picker').click();
      await expect(id(page, 'alert-recurrence-title')).toHaveText('Recurrencia');
      await expect(id(page, 'alert-recurrence-popup')).toBeVisible();
      await id(page, mode).click();
      await expect(id(page, 'alert-recurrence-value')).toHaveText(label);
      await id(page, 'save-medication-alert').click();
      await expect(id(page, 'alerts-folder')).toBeVisible();
      const alert = (await readState(page)).medicationCare!.alerts.find(item => item.id === 'qa-manual')!;
      expect(alert.days).toEqual(days);
      expect(alert.recurrence).toBeUndefined();
      expect(alert.enabled).toBe(false);
      await expect(id(page, 'medication-alert-recurrence-qa-manual')).toHaveText(label);
    }
    await id(page, 'medication-alert-qa-manual').getByRole('button').click();
    await id(page, 'alert-repeat-picker').click();
    await id(page, 'alert-recurrence-weekdays').click();
    for (let day = 0; day < 7; day++) {
      const dayControl = id(page, `alert-repeat-day-${day}`);
      if (await dayControl.getAttribute('aria-checked') === 'true') await dayControl.click();
    }
    await expect(id(page, 'alert-repeat-done')).toBeDisabled();
    for (const day of [1, 3, 5]) await id(page, `alert-repeat-day-${day}`).click();
    await id(page, 'alert-repeat-done').click();
    await expect(id(page, 'alert-recurrence-value')).toHaveText('Todos los lunes, miércoles y viernes');
    await id(page, 'save-medication-alert').click();
    await page.reload();
    await expect(id(page, 'alerts-folder')).toBeVisible();
    await id(page, 'medication-alert-tab-paused').click();
    expect((await readState(page)).medicationCare!.alerts.find(item => item.id === 'qa-manual')?.days).toEqual([1, 3, 5]);
    checks.push('Daily, Monday, Sunday and custom weekdays preserve one alert; weekly legacy data remains compatible after reload');

    await id(page, 'create-medication-alert').click();
    await id(page, 'alert-medication-name').fill('Mensual ficticio QA');
    await id(page, 'alert-medication-concentration').fill('20 mg literales QA');
    await id(page, 'alert-time').fill('20:20');
    await id(page, 'alert-repeat-picker').click();
    await id(page, 'alert-recurrence-monthly').click();
    await expect(id(page, 'alert-recurrence-anchor-date')).toHaveValue('2026-11-01');
    await id(page, 'alert-recurrence-anchor-date').scrollIntoViewIfNeeded();
    await expect(id(page, 'alert-recurrence-anchor-date')).toBeInViewport();
    await page.screenshot({ path: `${output}/monthly-options-${viewport.width}.png` });
    await id(page, 'alert-recurrence-anchor-date').fill('2026-02-30');
    const beforeInvalid = (await readState(page)).medicationCare;
    await id(page, 'alert-repeat-done').click();
    await expect(id(page, 'alert-recurrence-error')).toContainText(/fecha|AAAA-MM-DD/i);
    await expect(id(page, 'alert-recurrence-anchor-date')).toHaveValue('2026-02-30');
    expect((await readState(page)).medicationCare).toEqual(beforeInvalid);
    await id(page, 'alert-recurrence-anchor-date').fill('2026-11-09');
    await id(page, 'alert-repeat-done').click();
    await expect(id(page, 'alert-recurrence-value')).toHaveText('El 9 de cada mes');
    await page.evaluate(() => { (window as Controls).__alertToggleFailWrites = 1; });
    await id(page, 'save-medication-alert').click();
    await expect(id(page, 'medication-alert-error')).toContainText('No se pudo guardar');
    await expect(id(page, 'alert-recurrence-value')).toHaveText('El 9 de cada mes');
    expect((await readState(page)).medicationCare!.alerts).toHaveLength(2);
    await id(page, 'save-medication-alert').click();
    await expect(id(page, 'alerts-folder')).toBeVisible();
    let state = await readState(page);
    const monthly = state.medicationCare!.alerts.find(item => item.medicationName === 'Mensual ficticio QA')!;
    expect(monthly).toMatchObject({ enabled: false, days: [0, 1, 2, 3, 4, 5, 6], recurrence: { type: 'monthly', intervalMonths: 1, anchorDate: '2026-11-09' } });
    await toggle(page, monthly.id).click();
    await expect(toggle(page, monthly.id)).toBeChecked();
    await expect(toggle(page, monthly.id)).toBeEnabled();
    await page.waitForTimeout(500);
    await id(page, 'create-medication-alert').click();
    await id(page, 'alert-medication-name').fill('Semestral ficticio QA');
    await id(page, 'alert-medication-concentration').fill('30 mg literales QA');
    await id(page, 'alert-time').fill('21:10');
    await id(page, 'alert-repeat-picker').click();
    await id(page, 'alert-recurrence-six-months').click();
    await expect(id(page, 'alert-recurrence-anchor-date')).toHaveValue('2026-11-09');
    await id(page, 'alert-repeat-done').click();
    await expect(id(page, 'alert-recurrence-value')).toHaveText('Cada 6 meses, el día 9');
    await page.screenshot({ path: `${output}/six-month-form-${viewport.width}.png` });
    await id(page, 'save-medication-alert').click();
    await expect(id(page, 'alerts-folder')).toBeVisible();
    const semiannual = (await readState(page)).medicationCare!.alerts.find(item => item.medicationName === 'Semestral ficticio QA')!;
    expect(semiannual).toMatchObject({ recurrence: { type: 'monthly', intervalMonths: 6, anchorDate: '2026-11-09' }, days: [0, 1, 2, 3, 4, 5, 6], enabled: false });
    await toggle(page, semiannual.id).click();
    await expect(toggle(page, semiannual.id)).toBeChecked();
    await expect(toggle(page, semiannual.id)).toBeEnabled();
    await page.reload();
    await expect(id(page, 'medication-alert-recurrence-' + monthly.id)).toHaveText('El 9 de cada mes');
    await expect(id(page, 'medication-alert-recurrence-' + semiannual.id)).toHaveText('Cada 6 meses, el día 9');
    state = await readState(page);
    expect(state.medicationCare!.alerts).toHaveLength(4);
    expect(state.medications).toHaveLength(2);
    expect(state.medicationCare!.takes).toHaveLength(0);
    await page.screenshot({ path: `${output}/recurrences-saved-${viewport.width}.png` });
    checks.push('Invalid anchor does not save; monthly failed write retains draft and retries once; monthly/six-month metadata and switches survive reload');

    await page.goto(origin);
    for (const stamp of ['2026-11-08T20:20:00-06:00', '2026-12-08T20:20:00-06:00']) {
      await page.clock.setSystemTime(new Date(stamp));
      await page.waitForTimeout(1300);
      await expect(id(page, 'medication-reminder-popup')).toHaveCount(0);
    }
    await page.clock.setSystemTime(new Date('2026-12-09T20:20:00-06:00'));
    await expect(id(page, 'medication-reminder-popup')).toBeVisible({ timeout: 10000 });
    await expect(id(page, 'medication-reminder-name')).toHaveText('Mensual ficticio QA');
    await expect(id(page, 'medication-reminder-dose')).toHaveText('20 mg literales QA');
    await page.screenshot({ path: `${output}/monthly-popup-${viewport.width}.png` });
    await id(page, 'medication-reminder-close').click();
    await expect(id(page, 'medication-reminder-popup')).toHaveCount(0);
    for (const stamp of ['2026-12-10T20:20:00-06:00', '2026-12-09T21:10:00-06:00']) {
      await page.clock.setSystemTime(new Date(stamp));
      await page.waitForTimeout(1300);
      await expect(id(page, 'medication-reminder-popup')).toHaveCount(0);
    }
    await page.clock.setSystemTime(new Date('2027-05-09T21:10:00-06:00'));
    await expect(id(page, 'medication-reminder-popup')).toBeVisible({ timeout: 10000 });
    await expect(id(page, 'medication-reminder-name')).toHaveText('Semestral ficticio QA');
    await expect(id(page, 'medication-reminder-dose')).toHaveText('30 mg literales QA');
    await page.screenshot({ path: `${output}/six-month-popup-${viewport.width}.png` });
    await id(page, 'medication-reminder-close').click();
    await expect(id(page, 'medication-reminder-popup')).toHaveCount(0);
    state = await readState(page);
    expect(state.medicationCare!.takes).toHaveLength(0);
    expect(state.medicationCare!.reminderActions ?? []).toHaveLength(0);
    checks.push('Virtual local calendar: before anchor and wrong dates stay quiet; monthly Dec9 and six-month May9 open correct popup without system notifications');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    expect(errors).toEqual([]);
    expect(forbidden).toEqual([]);
    return { viewport, checks, errors, forbidden };
  } catch (error) {
    await page.screenshot({ path: `${output}/recurrence-failure-${viewport.width}.png` });
    throw error;
  } finally { await context.close(); }
}

async function verifySmallPopup(browser: Browser) {
  const viewport = { width: 320, height: 480 };
  const { context, page, errors, forbidden } = await createContext(browser, viewport);
  try {
    await page.goto(`${origin}/alerts`);
    await expect(id(page, 'alerts-folder')).toBeVisible({ timeout: 60000 });
    await id(page, 'medication-alert-tab-paused').click();
    await id(page, 'medication-alert-qa-manual').getByRole('button').click();
    const before = (await readState(page)).medicationCare;
    await id(page, 'alert-repeat-picker').click();
    await expect(id(page, 'alert-recurrence-popup')).toBeVisible();
    const bounds = await id(page, 'alert-recurrence-popup').boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
    await id(page, 'alert-recurrence-six-months').click();
    await id(page, 'alert-recurrence-anchor-date').fill('2026-11-09');
    await id(page, 'alert-repeat-done').scrollIntoViewIfNeeded();
    await expect(id(page, 'alert-repeat-done')).toBeInViewport();
    await page.screenshot({ path: `${output}/recurrence-popup-320x480.png` });
    await id(page, 'alert-repeat-done').click();
    await expect(id(page, 'alert-recurrence-popup')).toHaveCount(0);
    await expect(id(page, 'alert-recurrence-value')).toHaveText('Cada 6 meses, el día 9');
    expect((await readState(page)).medicationCare).toEqual(before);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    expect(errors).toEqual([]);
    expect(forbidden).toEqual([]);
    return { viewport, popupInsideViewport: true, scrollMakesDateAndDoneReachable: true, formReceivesSelectionWithoutPersisting: true, errors, forbidden };
  } finally { await context.close(); }
}

async function verifyOutsideCancel(browser: Browser, viewport: Viewport) {
  const { context, page, errors, forbidden } = await createContext(browser, viewport);
  try {
    await page.goto(`${origin}/alerts`);
    await expect(id(page, 'alerts-folder')).toBeVisible({ timeout: 60000 });
    await id(page, 'create-medication-alert').click();
    await id(page, 'alert-medication-name').fill('Borrador ficticio QA');
    await id(page, 'alert-medication-concentration').fill('25 mg literales QA');
    await id(page, 'alert-time').fill('17:40');
    const before = (await readState(page)).medicationCare;
    await id(page, 'alert-repeat-picker').click();
    await id(page, 'alert-recurrence-monthly').click();
    await id(page, 'alert-recurrence-anchor-date').fill('2027-01-15');
    await page.mouse.click(8, 80);
    await expect(id(page, 'alert-recurrence-popup')).toHaveCount(0);
    await expect(id(page, 'medication-alert-title')).toHaveText('Crear alerta');
    await expect(id(page, 'alert-medication-name')).toHaveValue('Borrador ficticio QA');
    await expect(id(page, 'alert-medication-concentration')).toHaveValue('25 mg literales QA');
    await expect(id(page, 'alert-time')).toHaveValue('17:40');
    await expect(id(page, 'alert-recurrence-value')).toHaveText('Todos los días');
    expect((await readState(page)).medicationCare).toEqual(before);
    await page.screenshot({ path: `${output}/outside-cancel-${viewport.width}.png` });
    expect(errors).toEqual([]);
    expect(forbidden).toEqual([]);
    return { viewport, outsidePoint: { x: 8, y: 80 }, closesPopupOnly: true, unsavedCreateDraftPreserved: true, storedStateUnchanged: true, errors, forbidden };
  } finally { await context.close(); }
}

async function main() {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  try {
    if (process.env.KLINI_ALERT_CONTROLS_SCOPE === 'outside-cancel') {
      const results = [];
      for (const viewport of [{ width: 393, height: 852 }, { width: 320, height: 640 }]) results.push(await verifyOutsideCancel(browser, viewport));
      await writeFile(`${output}/outside-cancel-report.json`, JSON.stringify({ result: 'PASS', testedAt: new Date().toISOString(), results }, null, 2));
      console.log('PASS recurrence outside cancel 393/320: create form and its unsaved fields remain intact.');
      return;
    }
    if (process.env.KLINI_ALERT_CONTROLS_SCOPE === 'recurrences') {
      const recurrences = [];
      for (const viewport of [{ width: 393, height: 852 }, { width: 320, height: 640 }]) recurrences.push(await verifyRecurrences(browser, viewport));
      const smallPopup = await verifySmallPopup(browser);
      await writeFile(`${output}/recurrence-report.json`, JSON.stringify({ result: 'PASS', testedAt: new Date().toISOString(), recurrences, smallPopup }, null, 2));
      console.log('PASS recurrence popup and virtual calendar at 393/320, with small 320x480 scroll.');
      return;
    }
    for (const viewport of [{ width: 393, height: 852 }, { width: 320, height: 640 }]) {
      const { context, page, errors, forbidden } = await createContext(browser, viewport);
      try {
        await page.goto(`${origin}/alerts`);
        await expect(id(page, 'alerts-folder')).toBeVisible({ timeout: 60000 });
        await id(page, 'medication-alert-tab-paused').click();
        await expect(id(page, 'medication-alert-tab-treatments')).toHaveCount(0);
        const linkedBefore = (await readState(page)).medicationCare!.alerts.find(item => item.id === 'qa-linked')!;
        await expect(toggle(page, 'qa-linked')).toBeEnabled();
        await toggle(page, 'qa-linked').click();
        await expect(toggle(page, 'qa-linked')).toBeChecked();
        await expect(id(page, 'medication-alert-notice')).toHaveCount(0);
        await expect.poll(async () => (await readState(page)).medicationCare?.alerts.find(item => item.id === 'qa-linked')?.enabled).toBe(true);
        expect((await readState(page)).medicationCare!.alerts.find(item => item.id === 'qa-linked')).toEqual({ ...linkedBefore, enabled: true });
        await page.goto(`${origin}/archive?archiveTab=medications`);
        await id(page, 'medication-tab-treatments').click();
        await expect(id(page, 'medication-treatment-qa-treatment')).toContainText('Alertas activas');
        await id(page, 'medication-treatment-qa-treatment').click();
        await expect(id(page, 'treatment-alerts-toggle').locator('input')).toBeChecked();
        await expect(page.locator('[data-testid^="treatment-medication-alert-"]')).toHaveCount(0);
        await id(page, 'treatment-manage-alerts').click();
        await expect(id(page, 'alert-medication-name')).toHaveValue('Medicamento vinculado QA');
        await expect(id(page, 'medication-alert-activation-note')).toHaveCount(0);
        await id(page, 'alert-medication-name').fill('Segundo medicamento QA');
        await expect(id(page, 'medication-alert-form')).toContainText('Tratamiento QA');
        await page.goto(`${origin}/alerts`);
        await toggle(page, 'qa-linked').click();
        await expect(toggle(page, 'qa-linked')).not.toBeChecked();
        await expect(id(page, 'medication-alert-tab-paused')).toHaveAttribute('aria-selected', 'true');
        await toggle(page, 'qa-manual').dblclick();
        await expect(toggle(page, 'qa-manual')).toBeEnabled();
        let state = await readState(page);
        expect(state.medicationCare!.alerts).toHaveLength(2);
        const manualAfterDoubleTap = state.medicationCare!.alerts.find(item => item.id === 'qa-manual')!;
        expect(await toggle(page, 'qa-manual').isChecked()).toBe(manualAfterDoubleTap.enabled);
        if (!manualAfterDoubleTap.enabled) await toggle(page, 'qa-manual').click();
        await expect(toggle(page, 'qa-manual')).toBeChecked();
        await expect(toggle(page, 'qa-manual')).toBeEnabled();
        state = await readState(page);
        expect(state.medicationCare!.alerts.find(item => item.id === 'qa-manual')).toMatchObject({ enabled: true, medicationName: 'Alerta manual QA', concentration: '10 mg literales QA' });
        expect(state.medications).toHaveLength(2);
        expect(state.medicationCare!.takes).toHaveLength(0);
        await page.screenshot({ path: `${output}/manual-active-${viewport.width}.png` });
        await page.evaluate(() => { (window as Controls).__alertToggleFailWrites = 1; });
        await toggle(page, 'qa-manual').click();
        await expect(id(page, 'medication-alert-error')).toContainText('No se pudo guardar');
        await expect(toggle(page, 'qa-manual')).toBeChecked();
        expect((await readState(page)).medicationCare!.alerts.find(item => item.id === 'qa-manual')?.enabled).toBe(true);
        await page.screenshot({ path: `${output}/retry-${viewport.width}.png` });
        await toggle(page, 'qa-manual').click();
        await expect(toggle(page, 'qa-manual')).not.toBeChecked();
        await expect(toggle(page, 'qa-manual')).toBeEnabled();
        await toggle(page, 'qa-linked').click();
        await expect(toggle(page, 'qa-linked')).toBeChecked();
        await expect(toggle(page, 'qa-linked')).toBeEnabled();
        await page.reload();
        await expect(toggle(page, 'qa-linked')).toBeChecked();
        await id(page, 'medication-alert-tab-paused').click();
        await expect(toggle(page, 'qa-manual')).not.toBeChecked();
        state = await readState(page);
        expect(state.medicationCare!.alerts).toHaveLength(2);
        const ownerCare = state.medicationCare;
        await page.goto(origin);
        await id(page, 'header-profile').click();
        await id(page, 'profile-select-qa-alert-child').click();
        await expect.poll(async () => (await readState(page)).profile.id).toBe('qa-alert-child');
        await expect(page.getByTestId('profile-drawer')).toHaveCount(0);
        await expect(id(page, 'home-tab-today')).toHaveAttribute('aria-selected', 'true');
        await page.goto(`${origin}/alerts`);
        await expect(id(page, 'alerts-folder')).toBeVisible();
        expect((await readState(page)).medicationCare?.alerts ?? []).toHaveLength(0);
        await expect(id(page, 'medication-alert-qa-linked')).toHaveCount(0);
        await expect(id(page, 'medication-alert-qa-manual')).toHaveCount(0);
        expect((await readState(page)).family?.profiles['qa-alert-owner'].medicationCare).toEqual(ownerCare);
        expect(errors).toEqual([]);
        expect(forbidden).toEqual([]);
        results.push({ viewport, linkedToggleReflectsTreatment: true, manualToggleNoMedicationCreated: true, unavailableSystemDeliveryKeepsEnabled: true, doubleTapSingleEntity: true, failedWriteRollbackRetry: true, reload: true, profileIsolation: true, errors, forbidden });
      } catch (error) {
        await page.screenshot({ path: `${output}/failure-${viewport.width}.png` });
        throw error;
      } finally { await context.close(); }
    }
    await writeFile(`${output}/controls-report.json`, JSON.stringify({ result: 'PASS', testedAt: new Date().toISOString(), results }, null, 2));
    if (process.env.KLINI_ALERT_CONTROLS_SCOPE === 'controls') {
      console.log('PASS Alertas controls at 393/320: toggles, shared treatment state, failed write/retry, reload and profiles.');
      return;
    }
    const recurrences = [];
    for (const viewport of [{ width: 393, height: 852 }, { width: 320, height: 640 }]) recurrences.push(await verifyRecurrences(browser, viewport));
    const smallPopup = await verifySmallPopup(browser);
    const outsideCancel = [];
    for (const viewport of [{ width: 393, height: 852 }, { width: 320, height: 640 }]) outsideCancel.push(await verifyOutsideCancel(browser, viewport));
    await writeFile(`${output}/report.json`, JSON.stringify({ result: 'PASS', testedAt: new Date().toISOString(), results, recurrences, smallPopup, outsideCancel, scope: 'Synthetic browser contexts and virtual local dates only; no emulator or native notification delivery; no external requests or POSTs.' }, null, 2));
    console.log('PASS Alertas controls 393/320: shared toggles, recurrence, virtual monthly/six-month popups, failed write/retry, reload and profiles.');
  } finally { await browser.close(); }
}
void main();
