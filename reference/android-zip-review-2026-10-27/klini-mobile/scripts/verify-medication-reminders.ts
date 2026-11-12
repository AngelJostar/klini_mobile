import { chromium, expect, type Browser, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createDemoState } from '../src/domain/seed';
import { STORAGE_KEY } from '../src/domain/reducer';
import { captureProfile } from '../src/domain/family';
import { addDays } from '../src/domain/dates';
import { isMedicationCare, SOFIA_MEDICATION_REMINDER_DEMO } from '../src/domain/medicationCare';
import type { AppState } from '../src/domain/types';

// A private browser context, fake local records and a virtual wall clock own this run.
const origin = process.env.KLINI_QA_ORIGIN || 'http://127.0.0.1:8096';
const output = 'test-results/medication-reminders';
const zone = 'America/Mexico_City';
const today = new Intl.DateTimeFormat('sv-SE', { timeZone: zone }).format(new Date());
const ownerId = 'qa-reminder-owner', childId = 'qa-reminder-child';
const medicationId = 'qa-reminder-medication', treatmentId = 'qa-reminder-treatment', alertId = 'qa-reminder-alert';
const wallTime = (day: string, time: string) => new Date(`${day}T${time}-06:00`);
const id = (page: Page, name: string) => page.locator(`[data-testid="${name}"]:visible`);
type Controls = Window & { __reminderFailWrites?: number; __reminderHidden?: boolean };
type Viewport = { width: number; height: number };

function fixtureState(): AppState {
  const state = createDemoState(wallTime(today, '19:59:00'));
  state.profile = { ...state.profile, id: ownerId, name: 'Perfil principal QA' };
  state.medicationReminderDemoVersion = 1;
  state.medications = [
    { id: medicationId, name: 'Atorvastatina QA', dose: '80 mg', frequency: 'Una vez al día', startDate: addDays(today, -1), active: true },
    { id: 'qa-future-medication', name: 'Medicamento futuro QA', dose: 'Dosis literal QA', frequency: 'Según indicación', startDate: addDays(today, 10), active: true },
  ];
  state.medicationCare = {
    treatments: [
      { id: treatmentId, name: 'Tratamiento ficticio QA', medicationIds: [medicationId], startDate: addDays(today, -1), active: true },
      { id: 'qa-future-treatment', name: 'Tratamiento futuro QA', medicationIds: ['qa-future-medication'], startDate: addDays(today, 10), active: true },
    ],
    takes: [],
    alerts: [
      { id: alertId, medicationId, treatmentId, time: '20:00', days: [0, 1, 2, 3, 4, 5, 6], enabled: false },
      { id: 'qa-future-alert', medicationId: 'qa-future-medication', treatmentId: 'qa-future-treatment', time: '20:00', days: [0, 1, 2, 3, 4, 5, 6], enabled: true },
    ],
  };
  const owner = captureProfile(state, 'Perfil principal');
  state.family = { ownerId, profiles: {
    [ownerId]: owner,
    [childId]: { profile: { ...state.profile, id: childId, name: 'Perfil familiar QA' }, kind: 'Niño', appointments: [], policies: [], claims: [], records: [], medications: [], messages: [], favorites: [], medicationCare: { treatments: [], takes: [], alerts: [] } },
  } };
  return state;
}

async function stateOf(page: Page): Promise<AppState> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), STORAGE_KEY);
}
async function careOf(page: Page) {
  const state = await stateOf(page);
  return state.medicationCare!;
}
async function setTime(page: Page, day: string, time: string) {
  await page.clock.setFixedTime(wallTime(day, time));
}
async function setBackground(page: Page, hidden: boolean) {
  await page.evaluate(value => {
    (window as Controls).__reminderHidden = value;
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}
async function createContext(browser: Browser, viewport: Viewport, fixture = fixtureState()) {
  const context = await browser.newContext({ viewport, timezoneId: zone, reducedMotion: 'reduce' });
  const forbiddenRequests: string[] = [], pageErrors: string[] = [];
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== origin || request.method() !== 'GET') {
      forbiddenRequests.push(`${request.method()} ${url.origin}${url.pathname}`);
      await route.abort();
    } else await route.continue();
  });
  await context.addInitScript(({ state, key, managedKey, child }) => {
    if (!sessionStorage.getItem('klini-reminder-fixture')) {
      localStorage.setItem(key, JSON.stringify(state));
      localStorage.setItem(managedKey, JSON.stringify([child]));
      sessionStorage.setItem('klini-reminder-fixture', '1');
    }
    Object.defineProperty(document, 'visibilityState', { configurable: true, get() { return (window as Controls).__reminderHidden ? 'hidden' : 'visible'; } });
    Object.defineProperty(document, 'hidden', { configurable: true, get() { return !!(window as Controls).__reminderHidden; } });
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(storageKey: string, value: string) {
      const controls = window as Controls;
      if (this === localStorage && storageKey === key && (controls.__reminderFailWrites || 0) > 0) {
        controls.__reminderFailWrites!--;
        throw new DOMException('Synthetic reminder persistence failure.', 'QuotaExceededError');
      }
      return original.call(this, storageKey, value);
    };
  }, { state: fixture, key: STORAGE_KEY, managedKey: `klini-managed-profiles-v1:${encodeURIComponent(fixture.profile.id)}`, child: { id: childId, name: 'Perfil familiar QA', kind: 'Niño' } });
  const page = await context.newPage();
  await setTime(page, today, '19:59:00');
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('dialog', dialog => { void dialog.accept(); });
  await page.goto(origin);
  await expect(id(page, 'header-profile')).toBeVisible({ timeout: 60000 });
  return { context, page, forbiddenRequests, pageErrors };
}

async function openTreatment(page: Page) {
  await page.goto(`${origin}/archive?archiveTab=medications`);
  await expect(id(page, 'medications-screen')).toBeVisible({ timeout: 60000 });
  await id(page, 'medication-tab-treatments').click();
  await id(page, `medication-treatment-${treatmentId}`).click();
  await expect(id(page, 'treatment-detail')).toBeVisible();
}
async function switchProfile(page: Page, profile: 'owner' | 'child') {
  await page.goto(origin);
  await expect(id(page, 'header-profile')).toBeVisible();
  await id(page, 'header-profile').click();
  await id(page, profile === 'owner' ? 'profile-select-owner' : `profile-select-${childId}`).click();
  await expect.poll(async () => (await stateOf(page)).profile.id).toBe(profile === 'owner' ? ownerId : childId);
  await expect(page.getByTestId('profile-drawer')).toHaveCount(0);
  await expect(id(page, 'home-tab-today')).toHaveAttribute('aria-selected', 'true');
}
async function capture(page: Page, name: string, viewport: Viewport) {
  await page.screenshot({ path: `${output}/${name}-${viewport.width}.png` });
}
async function assertValidCare(page: Page) {
  const state = await stateOf(page);
  const now = await page.evaluate(() => Date.now());
  // Validate with the same simulated clock used to record the synthetic occurrence.
  expect(isMedicationCare(state.medicationCare, state.medications, now)).toBe(true);
}

async function verifyDemoMigration(browser: Browser) {
  const fixture = createDemoState(wallTime(today, '19:59:00'));
  const { context, page, forbiddenRequests, pageErrors } = await createContext(browser, { width: 393, height: 852 }, fixture);
  try {
    const demo = SOFIA_MEDICATION_REMINDER_DEMO;
    await expect.poll(async () => (await stateOf(page)).medicationReminderDemoVersion).toBe(1);
    let state = await stateOf(page);
    expect(state.medications.filter(item => item.id === demo.medicationId)).toHaveLength(1);
    expect(state.medications.find(item => item.id === demo.medicationId)).toMatchObject({ name: 'Atorvastatina', dose: '80 mg', frequency: 'Una vez al día' });
    expect(state.medicationCare?.alerts.find(item => item.id === demo.alertId)).toMatchObject({ time: '20:00', enabled: true, days: [0, 1, 2, 3, 4, 5, 6] });
    // A stored disable remains the user's choice after hydration/reload.
    state.medicationCare!.alerts = state.medicationCare!.alerts.map(item => item.id === demo.alertId ? { ...item, enabled: false } : item);
    await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: STORAGE_KEY, value: state });
    await page.reload();
    await expect(id(page, 'header-profile')).toBeVisible();
    state = await stateOf(page);
    expect(state.medications.filter(item => item.id === demo.medicationId)).toHaveLength(1);
    expect(state.medicationCare?.alerts.find(item => item.id === demo.alertId)?.enabled).toBe(false);
    expect(pageErrors).toEqual([]);
    expect(forbiddenRequests).toEqual([]);
    return { knownFictionalOwnerOnly: true, stableDemoIds: true, dose80mgAndDaily20: true, migrationIdempotent: true, savedDisablePreserved: true };
  } finally { await context.close(); }
}

async function verifyViewport(browser: Browser, viewport: Viewport) {
  const { context, page, forbiddenRequests, pageErrors } = await createContext(browser, viewport);
  const checks: string[] = [];
  const popup = () => id(page, 'medication-reminder-popup');
  const treatmentSwitch = () => id(page, 'treatment-alerts-toggle').locator('input');
  try {
    expect((await stateOf(page)).medications.some(item => item.id === SOFIA_MEDICATION_REMINDER_DEMO.medicationId)).toBe(false);
    await openTreatment(page);
    await expect(treatmentSwitch()).not.toBeChecked();
    await page.evaluate(() => { (window as Controls).__reminderFailWrites = 1; });
    await treatmentSwitch().click();
    await expect(id(page, 'medications-error')).toContainText('No se pudo guardar');
    await expect(treatmentSwitch()).not.toBeChecked();
    expect((await careOf(page)).alerts.find(item => item.id === alertId)?.enabled).toBe(false);
    await treatmentSwitch().click();
    await expect(treatmentSwitch()).toBeChecked();
    await expect.poll(async () => (await careOf(page)).alerts.find(item => item.id === alertId)?.enabled).toBe(true);
    await capture(page, 'treatment-active', viewport);
    await page.goto(`${origin}/alerts`);
    const row = id(page, `medication-alert-${alertId}`);
    await expect(row).toBeVisible();
    await expect(id(page, 'medication-alert-notice')).toHaveCount(0);
    await expect(id(page, `medication-alert-toggle-${alertId}`).locator('input')).toBeChecked();
    const alertSwitch = () => id(page, `medication-alert-toggle-${alertId}`).locator('input');
    await expect(alertSwitch()).toBeEnabled();
    await page.evaluate(() => { (window as Controls).__reminderFailWrites = 1; });
    await alertSwitch().click();
    await expect(id(page, 'medication-alert-error')).toContainText('No se pudo guardar');
    await expect(alertSwitch()).toBeChecked();
    expect((await careOf(page)).alerts.find(item => item.id === alertId)?.enabled).toBe(true);
    await alertSwitch().click();
    await expect.poll(async () => (await careOf(page)).alerts.find(item => item.id === alertId)?.enabled).toBe(false);
    await id(page, 'medication-alert-tab-active').click();
    await expect(row).toHaveCount(0);
    await openTreatment(page);
    await expect(treatmentSwitch()).not.toBeChecked();
    await treatmentSwitch().click();
    await expect(treatmentSwitch()).toBeChecked();
    await page.goto(`${origin}/alerts`);
    await expect(row).toBeVisible();
    await expect(alertSwitch()).toBeChecked();
    await row.getByRole('button').click();
    await id(page, 'alert-medication-concentration').fill('80 mg');
    await id(page, 'save-medication-alert').click();
    await expect(row).toBeVisible();
    expect((await careOf(page)).alerts.filter(item => item.id === alertId)).toHaveLength(1);
    expect((await careOf(page)).alerts.find(item => item.id === alertId)?.enabled).toBe(true);
    await capture(page, 'alerts-active', viewport);
    await openTreatment(page);
    await treatmentSwitch().click();
    await expect(treatmentSwitch()).not.toBeChecked();
    await page.goto(`${origin}/alerts`);
    await expect(row).toHaveCount(0);
    await id(page, 'medication-alert-tab-paused').click();
    await expect(id(page, `medication-alert-toggle-${alertId}`).locator('input')).not.toBeChecked();
    await openTreatment(page);
    await treatmentSwitch().click();
    await expect(treatmentSwitch()).toBeChecked();
    await page.waitForTimeout(1200);
    await expect(popup()).toHaveCount(0);
    expect((await careOf(page)).takes).toHaveLength(0);
    checks.push('One configured state: treatment and Alertas switches both support write failure/retry; Alertas disable reflects in Tratamientos and treatment reactivation reflects back; linked edits preserve activation without an OS permission gate');

    await setTime(page, today, '20:00:00');
    await expect(popup()).toBeVisible({ timeout: 10000 });
    await expect(id(page, 'medication-reminder-name')).toContainText('Atorvastatina QA');
    await expect(id(page, 'medication-reminder-dose')).toContainText('80 mg');
    await expect(id(page, 'medication-reminder-time')).toContainText('20:00');
    for (const control of ['medication-reminder-take', 'medication-reminder-skip', 'medication-reminder-close']) await expect(id(page, control)).toBeInViewport();
    const box = await popup().boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    await capture(page, 'reminder-popup', viewport);
    await id(page, 'medication-reminder-take').click();
    await expect(popup()).toHaveCount(0);
    await expect.poll(async () => (await careOf(page)).reminderActions?.length).toBe(1);
    let care = await careOf(page);
    expect(care.reminderActions![0]).toMatchObject({ alertId, date: today, time: '20:00', status: 'taken', nameSnapshot: 'Atorvastatina QA', doseSnapshot: '80 mg', medicationId });
    expect(care.takes).toHaveLength(1);
    expect(care.takes[0]).toMatchObject({ id: care.reminderActions![0].takeId, medicationId, treatmentId, date: today, time: '20:00', dose: '80 mg', status: 'taken' });
    await setBackground(page, true);
    await setBackground(page, false);
    await page.waitForTimeout(1200);
    await expect(popup()).toHaveCount(0);
    await page.reload();
    await expect(id(page, 'header-profile')).toBeVisible();
    await page.waitForTimeout(1200);
    await expect(popup()).toHaveCount(0);
    expect((await careOf(page)).takes).toHaveLength(1);
    expect((await careOf(page)).reminderActions).toHaveLength(1);
    checks.push('20:00 popup shows current medication/dose; Tomar atomically saves one take and snapshot; resume/reload cannot duplicate the occurrence');

    const tomorrow = addDays(today, 1);
    await setTime(page, tomorrow, '20:00:00');
    await expect(popup()).toBeVisible({ timeout: 10000 });
    await id(page, 'medication-reminder-skip').click();
    await expect(popup()).toHaveCount(0);
    care = await careOf(page);
    expect(care.reminderActions).toHaveLength(2);
    expect(care.reminderActions!.find(item => item.date === tomorrow)).toMatchObject({ status: 'skipped', doseSnapshot: '80 mg' });
    expect(care.takes.find(item => item.date === tomorrow)).toMatchObject({ status: 'skipped', dose: '80 mg' });
    expect(care.takes).toHaveLength(2);
    checks.push('Next local day has a distinct occurrence; Descartar records the skipped take without changing prescribed dose');

    const thirdDay = addDays(today, 2);
    await setTime(page, thirdDay, '19:59:00');
    await switchProfile(page, 'child');
    await setTime(page, thirdDay, '20:00:00');
    await page.waitForTimeout(1500);
    await expect(popup()).toHaveCount(0);
    expect((await careOf(page)).takes).toHaveLength(0);
    expect((await careOf(page)).reminderActions ?? []).toHaveLength(0);
    expect((await stateOf(page)).family?.profiles[ownerId].medicationCare?.takes).toHaveLength(2);
    await setTime(page, thirdDay, '19:59:02');
    await switchProfile(page, 'owner');
    await setTime(page, thirdDay, '20:00:00');
    await expect(popup()).toBeVisible({ timeout: 10000 });
    await id(page, 'medication-reminder-close').click();
    await expect(popup()).toHaveCount(0);
    await setBackground(page, true);
    await setBackground(page, false);
    await page.waitForTimeout(1500);
    await expect(popup()).toHaveCount(0);
    expect((await careOf(page)).takes).toHaveLength(2);
    expect((await careOf(page)).reminderActions).toHaveLength(2);
    checks.push('Profile isolation; closing does not create a take/ack and suppresses that occurrence for the session');

    const fourthDay = addDays(today, 3);
    await setTime(page, fourthDay, '19:59:00');
    await setBackground(page, true);
    await setTime(page, fourthDay, '20:00:00');
    await page.waitForTimeout(1500);
    await expect(popup()).toHaveCount(0);
    await setBackground(page, false);
    await expect(popup()).toBeVisible({ timeout: 10000 });
    await page.evaluate(() => { (window as Controls).__reminderFailWrites = 1; });
    await id(page, 'medication-reminder-take').click();
    await expect(id(page, 'medication-reminder-error')).toContainText('No se pudo guardar');
    await expect(popup()).toBeVisible();
    expect((await careOf(page)).takes).toHaveLength(2);
    expect((await careOf(page)).reminderActions).toHaveLength(2);
    await capture(page, 'reminder-write-retry', viewport);
    await id(page, 'medication-reminder-take').click();
    await expect(popup()).toHaveCount(0);
    care = await careOf(page);
    expect(care.takes).toHaveLength(3);
    expect(care.reminderActions).toHaveLength(3);
    expect(care.reminderActions!.filter(item => item.date === fourthDay)).toHaveLength(1);
    expect(care.takes.filter(item => item.date === fourthDay)).toHaveLength(1);
    expect(care.takes.some(item => item.medicationId === 'qa-future-medication')).toBe(false);
    await page.reload();
    await expect(id(page, 'header-profile')).toBeVisible();
    await page.waitForTimeout(1200);
    await expect(popup()).toHaveCount(0);
    await page.goto(`${origin}/archive?archiveTab=medications`);
    await expect(id(page, 'medications-screen')).toBeVisible();
    const lastTake = (await careOf(page)).takes.find(item => item.date === fourthDay)!;
    await expect(id(page, `medication-take-${lastTake.id}`)).toContainText('80 mg');
    await expect(id(page, `medication-take-${lastTake.id}`)).toContainText('Tomada');
    await capture(page, 'reminder-saved-take', viewport);
    checks.push('Background waits for resume; failed response keeps popup and rolls back both entities; retry/reload saves once; future prescription never rings');

    for (const [offset, action] of [[4, 'backdrop'], [5, 'escape'], [6, 'browser-back']] as const) {
      await setTime(page, addDays(today, offset), '20:00:00');
      await expect(popup()).toBeVisible({ timeout: 10000 });
      if (action === 'backdrop') await id(page, 'medication-reminder-backdrop').click({ position: { x: 5, y: 5 } });
      else if (action === 'escape') await page.keyboard.press('Escape');
      else await page.goBack();
      await expect(popup()).toHaveCount(0);
      await page.waitForTimeout(1500);
      await expect(popup()).toHaveCount(0);
      expect((await careOf(page)).takes).toHaveLength(3);
      expect((await careOf(page)).reminderActions).toHaveLength(3);
    }
    checks.push('Backdrop, Escape and browser Back each close once without response or immediate reappearance');
    await assertValidCare(page);
    expect(pageErrors).toEqual([]);
    expect(forbiddenRequests).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    return { viewport, checks, pageErrors, forbiddenRequests };
  } catch (error) {
    await page.screenshot({ path: `${output}/failure-${viewport.width}.png` });
    throw error;
  } finally { await context.close(); }
}

async function verifyConfigurationLinks(browser: Browser, viewport: Viewport) {
  const fixture = fixtureState();
  const secondId = 'qa-second-medication';
  fixture.medications.push({ id: secondId, name: 'Segundo medicamento QA', dose: '10 mg registrados', frequency: 'Según indicación', startDate: addDays(today, -1), active: true });
  fixture.medicationCare!.treatments.find(item => item.id === treatmentId)!.medicationIds.push(secondId);
  fixture.medicationCare!.alerts.push({ id: 'qa-manual-alert', medicationName: 'Alerta manual ficticia QA', concentration: '5 mg literales', time: '21:15', days: [0, 1, 2, 3, 4, 5, 6], enabled: false });
  fixture.family!.profiles[ownerId] = captureProfile(fixture, 'Perfil principal');
  const { context, page, forbiddenRequests, pageErrors } = await createContext(browser, viewport, fixture);
  try {
    await openTreatment(page);
    await expect(page.locator('[data-testid^="treatment-medication-alert-"]')).toHaveCount(0);
    await id(page, 'treatment-manage-alerts').click();
    await id(page, 'alert-medication-name').fill('Segundo medicamento QA');
    await expect(id(page, 'medication-alert-activation-note')).toHaveCount(0);
    await id(page, 'alert-medication-concentration').fill('Concentración literal QA');
    await id(page, 'alert-time').fill('18:25');
    await id(page, 'save-medication-alert').click();
    await expect(id(page, 'alerts-folder')).toBeVisible();
    let care = await careOf(page);
    const configured = care.alerts.find(item => item.medicationId === secondId)!;
    expect(configured).toMatchObject({ medicationId: secondId, treatmentId, time: '18:25', concentration: 'Concentración literal QA', enabled: true });
    expect((await stateOf(page)).medications).toEqual(fixture.medications);
    await id(page, `medication-alert-${configured.id}`).getByRole('button').click();
    await id(page, 'alert-medication-name').fill('Nombre independiente QA');
    await id(page, 'save-medication-alert').click();
    await expect(id(page, 'alerts-folder')).toBeVisible();
    care = await careOf(page);
    const detached = care.alerts.find(item => item.id === configured.id)!;
    expect(detached).toMatchObject({ medicationName: 'Nombre independiente QA', concentration: 'Concentración literal QA', time: '18:25', enabled: false });
    expect(detached.medicationId).toBeUndefined();
    expect(detached.treatmentId).toBeUndefined();
    await openTreatment(page);
    await id(page, 'treatment-detail-more-options').click();
    await id(page, 'treatment-link-alert-qa-manual-alert').click();
    await id(page, `treatment-link-alert-qa-manual-alert-to-${secondId}`).click();
    await expect.poll(async () => (await careOf(page)).alerts.find(item => item.id === 'qa-manual-alert')?.enabled).toBe(true);
    care = await careOf(page);
    expect(care.alerts.find(item => item.id === 'qa-manual-alert')).toMatchObject({ medicationId: secondId, treatmentId, medicationName: 'Segundo medicamento QA', concentration: '5 mg literales', time: '21:15', days: [0, 1, 2, 3, 4, 5, 6], enabled: true });
    expect((await stateOf(page)).medications).toEqual(fixture.medications);
    expect(care.takes).toHaveLength(0);
    expect(care.alerts).toHaveLength(4);
    await expect(id(page, 'treatment-detail')).toBeVisible();
    await expect(id(page, 'treatment-alerts-toggle').locator('input')).toBeEnabled();
    await capture(page, 'manual-linked-treatment', viewport);
    await page.reload();
    await expect(id(page, 'medications-screen')).toBeVisible();
    expect((await careOf(page)).alerts.find(item => item.id === 'qa-manual-alert')?.enabled).toBe(true);
    await assertValidCare(page);
    expect(pageErrors).toEqual([]);
    expect(forbiddenRequests).toEqual([]);
    return { viewport, noPerMedicationBell: true, specificSecondMedicationViaFreeText: true, linkedRenameDetachesAndDisables: true, explicitManualLinkPreservesScheduleAndConcentration: true, noMedicationOrTakeCreated: true, reload: true, pageErrors, forbiddenRequests };
  } catch (error) {
    await page.screenshot({ path: `${output}/configuration-failure-${viewport.width}.png` });
    throw error;
  } finally { await context.close(); }
}

async function verifySystemPermission(browser: Browser, viewport: Viewport) {
  const { context, page, forbiddenRequests, pageErrors } = await createContext(browser, viewport);
  try {
    await openTreatment(page);
    await id(page, 'treatment-alerts-toggle').locator('input').click();
    await expect(id(page, 'treatment-alerts-toggle').locator('input')).toBeChecked();
    const before = await careOf(page);
    await id(page, 'treatment-detail-more-options').click();
    await id(page, 'treatment-notification-permission').click();
    await expect(id(page, 'treatment-detail')).toContainText('requieren permiso en un dispositivo compatible');
    await expect(id(page, 'treatment-alerts-toggle').locator('input')).toBeChecked();
    expect(await careOf(page)).toEqual(before);
    expect(pageErrors).toEqual([]);
    expect(forbiddenRequests).toEqual([]);
    return { viewport, explicitSystemPermissionAttempt: true, unavailableDoesNotChangeConfiguredActivation: true, pageErrors, forbiddenRequests };
  } finally { await context.close(); }
}

async function main() {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    if (process.env.KLINI_REMINDER_QA_SCOPE === 'permission') {
      const results = [];
      for (const viewport of [{ width: 393, height: 852 }, { width: 320, height: 640 }]) results.push(await verifySystemPermission(browser, viewport));
      await writeFile(`${output}/permission-report.json`, JSON.stringify({ testedAt: new Date().toISOString(), results }, null, 2));
      console.log('PASS explicit system-notification permission at393/320; unavailable web delivery preserves activation.');
      return;
    }
    if (process.env.KLINI_REMINDER_QA_SCOPE === 'configuration') {
      const results = [];
      for (const viewport of [{ width: 393, height: 852 }, { width: 320, height: 640 }]) results.push(await verifyConfigurationLinks(browser, viewport));
      await writeFile(`${output}/configuration-report.json`, JSON.stringify({ testedAt: new Date().toISOString(), results }, null, 2));
      console.log('PASS stable configuration links at393/320; linked detail remains open after saving.');
      return;
    }
    const migration = await verifyDemoMigration(browser);
    const results = [];
    for (const viewport of [{ width: 393, height: 852 }, { width: 320, height: 640 }]) results.push(await verifyViewport(browser, viewport));
    const configurationLinks = [];
    for (const viewport of [{ width: 393, height: 852 }, { width: 320, height: 640 }]) configurationLinks.push(await verifyConfigurationLinks(browser, viewport));
    const permission = [];
    for (const viewport of [{ width: 393, height: 852 }, { width: 320, height: 640 }]) permission.push(await verifySystemPermission(browser, viewport));
    await writeFile(`${output}/report.json`, JSON.stringify({ testedAt: new Date().toISOString(), today, migration, results, configurationLinks, permission, scope: 'Private browser contexts and synthetic records only; virtual Mexico City wall clock and visibility events; web in-app reminders, no system notification delivery or native device tested; no external request or POST permitted.' }, null, 2));
    console.log('PASS medication reminders 393/320: shared activation, 20:00 popup, taken/skipped atomic responses, idempotence, retry, profile isolation and background/resume.');
  } finally { await browser.close(); }
}
void main();
