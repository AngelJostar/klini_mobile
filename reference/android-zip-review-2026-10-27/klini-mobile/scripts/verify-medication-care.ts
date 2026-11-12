import { chromium, expect, type Browser, type Locator, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createDemoState } from '../src/domain/seed';
import { STORAGE_KEY, validateAppState } from '../src/domain/reducer';
import { captureProfile } from '../src/domain/family';
import { addDays } from '../src/domain/dates';
import type { AppState, Medication } from '../src/domain/types';
import type { MedicationCare } from '../src/domain/medicationCare';

// A separate browser context owns synthetic localStorage. No native device is used.
const origin = process.env.KLINI_QA_ORIGIN || 'http://127.0.0.1:8096';
const output = 'test-results/medication-care';
const zone = 'America/Mexico_City';
const today = new Intl.DateTimeFormat('sv-SE', { timeZone: zone }).format(new Date());
const yesterday = addDays(today, -1);
const childId = 'qa-medication-child';
const child = { id: childId, name: 'Perfil familiar QA', kind: 'Niño' as const };
type Controls = Window & { __medicationFailWrites?: number };
type Viewport = { width: number; height: number };

function fixtureState(): AppState {
  const state = createDemoState();
  const medication = (id: string, name: string, active = true): Medication => ({ id, name, dose: 'Dosis registrada', frequency: 'Según indicación médica', startDate: addDays(today, -10), active });
  state.medications = [medication('qa-med-a', 'Medicamento A'), medication('qa-med-b', 'Medicamento B'), medication('qa-med-c', 'Medicamento C'), medication('qa-med-d', 'Medicamento D', false), medication('qa-med-legacy', 'Medicamento previo sin tratamiento')];
  state.medicationCare = {
    treatments: [
      { id: 'qa-treatment-a', name: 'Tratamiento A', medicationIds: ['qa-med-a', 'qa-med-b'], startDate: addDays(today, -10), active: true },
      { id: 'qa-treatment-b', name: 'Tratamiento B', medicationIds: ['qa-med-c'], startDate: addDays(today, -10), active: true },
      { id: 'qa-treatment-c', name: 'Tratamiento C', medicationIds: ['qa-med-d'], startDate: addDays(today, -10), endDate: yesterday, active: false },
    ],
    takes: [
      { id: 'qa-take-a', medicationId: 'qa-med-a', treatmentId: 'qa-treatment-a', date: today, time: '00:00', dose: '1 tableta registrada', status: 'taken' },
      { id: 'qa-take-b', medicationId: 'qa-med-c', treatmentId: 'qa-treatment-b', date: today, time: '00:00', dose: 'Dosis registrada', status: 'taken' },
      { id: 'qa-take-skipped', medicationId: 'qa-med-b', treatmentId: 'qa-treatment-a', date: today, time: '00:00', dose: 'Dosis registrada', status: 'skipped' },
      { id: 'qa-take-history', medicationId: 'qa-med-d', treatmentId: 'qa-treatment-c', date: yesterday, time: '08:00', dose: 'Dosis anterior', status: 'taken' },
    ],
    alerts: [{ id: 'qa-alert-active', medicationId: 'qa-med-a', treatmentId: 'qa-treatment-a', time: '09:00', days: [0, 1, 2, 3, 4, 5, 6], enabled: true }],
  };
  const owner = captureProfile(state, 'Perfil principal');
  state.family = { ownerId: state.profile.id, profiles: {
    [state.profile.id]: owner,
    [childId]: { profile: { id: childId, name: child.name, birthDate: '', sex: '', email: '', phone: '', bloodType: '', allergies: '', emergencyName: '', emergencyPhone: '' }, kind: 'Niño', appointments: [], policies: [], claims: [], records: [], medications: [], messages: [], favorites: [] },
  } };
  expect(validateAppState(state)).toBe(true);
  return state;
}

const id = (page: Page, testID: string) => page.locator(`[data-testid="${testID}"]:visible`);
const click = async (target: Locator) => { await target.scrollIntoViewIfNeeded(); await target.click(); };
async function stateOf(page: Page): Promise<AppState> { return page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), STORAGE_KEY); }
async function careOf(page: Page): Promise<MedicationCare> { return (await stateOf(page)).medicationCare || { treatments: [], takes: [], alerts: [] }; }
async function settled(page: Page) {
  await expect.poll(() => id(page, 'archive-popup').last().evaluate(element => {
    const transform = getComputedStyle(element).transform;
    return transform === 'none' ? 0 : Math.abs(new DOMMatrixReadOnly(transform).m42);
  })).toBeLessThan(0.5);
}
async function capture(page: Page, name: string, width: number) { await settled(page); await page.screenshot({ path: `${output}/${name}-${width}.png` }); }
async function openMedications(page: Page) {
  await click(id(page, 'home-tab-archive'));
  await click(id(page, 'menu-medications'));
  await expect(id(page, 'medications-screen')).toBeVisible({ timeout: 60000 });
  await settled(page);
}
async function closePanels(page: Page) {
  while (await id(page, 'archive-close').count()) {
    await id(page, 'archive-close').last().click();
    await expect.poll(() => id(page, 'archive-close').count(), { timeout: 10000 }).toBeLessThanOrEqual(1);
    await page.waitForTimeout(240);
  }
}
async function fillInlineMedication(page: Page, name: string) {
  await id(page, 'treatment-medication-name').fill(name);
  await id(page, 'treatment-medication-dose').fill('Dosis literal QA');
  await click(id(page, 'treatment-medication-frequency'));
  await click(id(page, 'treatment-medication-frequency-choice-as-prescribed'));
}
async function selectDay(page: Page, date: string) {
  await click(id(page, 'medication-calendar-open'));
  const day = id(page, `medication-calendar-day-${date}`);
  if (!(await day.count())) await click(id(page, 'medication-calendar-previous'));
  await click(id(page, `medication-calendar-day-${date}`));
  await expect(id(page, 'medication-calendar')).toHaveCount(0);
}

async function createContext(browser: Browser, viewport: Viewport, fixture?: AppState) {
  const context = await browser.newContext({ viewport, timezoneId: zone, reducedMotion: 'reduce' });
  const forbiddenRequests: string[] = [], pageErrors: string[] = [];
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== origin || request.method() !== 'GET') {
      forbiddenRequests.push(`${request.method()} ${url.origin}${url.pathname}`);
      await route.abort();
    } else await route.continue();
  });
  const initial = fixture ?? fixtureState();
  // This suite owns its fixture; demo provisioning is covered by reminder QA.
  initial.medicationReminderDemoVersion = 1;
  await context.addInitScript(({ initialState, key, managedKey, childProfile }) => {
    if (!sessionStorage.getItem('klini-medication-care-fixture')) {
      localStorage.setItem(key, JSON.stringify(initialState));
      localStorage.setItem(managedKey, JSON.stringify([childProfile]));
      sessionStorage.setItem('klini-medication-care-fixture', '1');
    }
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(storageKey: string, value: string) {
      const controls = window as Controls;
      if (this === localStorage && storageKey === key && (controls.__medicationFailWrites || 0) > 0) {
        controls.__medicationFailWrites!--;
        throw new DOMException('Synthetic medication persistence failure.', 'QuotaExceededError');
      }
      return original.call(this, storageKey, value);
    };
  }, { initialState: initial, key: STORAGE_KEY, managedKey: `klini-managed-profiles-v1:${encodeURIComponent(initial.profile.id)}`, childProfile: child });
  const page = await context.newPage();
  await page.clock.install({ time: new Date(`${today}T12:00:00-06:00`) });
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('dialog', dialog => { void dialog.accept(); });
  await page.goto(origin);
  await expect(id(page, 'header-profile')).toBeVisible({ timeout: 60000 });
  return { context, page, initial, forbiddenRequests, pageErrors };
}

async function verifyViewport(browser: Browser, viewport: Viewport) {
  const { context, page, initial, forbiddenRequests, pageErrors } = await createContext(browser, viewport);
  const checks: string[] = [];
  try {
    await openMedications(page);
    await expect(id(page, 'medication-tab-takes')).toHaveAttribute('aria-selected', 'true');
    await expect(id(page, 'medication-take-qa-take-a')).toContainText('Tomada');
    await expect(id(page, 'medication-take-qa-take-b')).toContainText('Tomada');
    await expect(id(page, 'medication-take-qa-take-skipped')).toContainText('Descartada');
    await expect(id(page, 'medication-take-qa-take-history')).toHaveCount(0);
    expect((await careOf(page)).takes).toHaveLength(4);
    await capture(page, 'takes', viewport.width);
    checks.push('Toma: two taken, one skipped, no generated takes');

    await click(id(page, 'medication-tab-treatments'));
    await expect(id(page, 'medication-treatment-qa-treatment-a')).toContainText('2 medicamentos · Vigente');
    await expect(id(page, 'medication-treatment-qa-treatment-a')).toContainText('Alertas activas');
    await expect(id(page, 'medication-treatment-qa-treatment-b')).toContainText('Alertas desactivadas');
    await expect(id(page, 'medication-treatment-qa-treatment-c')).toContainText('Finalizado');
    await expect(id(page, 'medication-unassigned-qa-med-legacy')).toHaveCount(0);
    await expect(page.getByText('Medicamentos sin tratamiento', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Aún no tienes tratamientos guardados.', { exact: true })).toHaveCount(0);
    await expect(id(page, 'medications-add-medication')).toHaveCount(0);
    await capture(page, 'treatments', viewport.width);
    await click(id(page, 'medication-new-treatment'));
    await expect(id(page, 'treatment-medication-qa-med-legacy')).toContainText('Medicamento previo sin tratamiento');
    await click(id(page, 'archive-detail-back'));
    expect((await stateOf(page)).medications.find(item => item.id === 'qa-med-legacy')?.name).toBe('Medicamento previo sin tratamiento');
    await click(id(page, 'medication-tab-takes'));
    checks.push('Clean treatment list; legacy medication retained in storage and selectable in a new treatment');

    await click(id(page, 'medication-calendar-open'));
    await expect(id(page, 'medication-calendar-next')).toHaveAttribute('aria-disabled', 'true');
    await expect(id(page, `medication-calendar-day-${today}`)).toHaveAttribute('aria-selected', 'true');
    const future = id(page, `medication-calendar-day-${addDays(today, 1)}`);
    if (await future.count()) await expect(future).toHaveAttribute('aria-disabled', 'true');
    await page.keyboard.press('Escape');
    await expect(id(page, 'medication-calendar')).toHaveCount(0);
    await expect(id(page, 'medications-screen')).toBeVisible();
    await expect(id(page, 'medication-calendar-open')).toBeFocused();
    await selectDay(page, yesterday);
    await expect(id(page, 'medication-take-qa-take-history')).toBeVisible();
    await expect(id(page, 'medication-take-qa-take-a')).toHaveCount(0);
    checks.push('Date filter, blocked future, Escape and focus restoration');

    if (viewport.width === 320) {
      await page.setViewportSize({ width: 320, height: 400 });
      await click(id(page, 'medication-calendar-open'));
      const popup = await id(page, 'medication-calendar').boundingBox();
      expect(popup).not.toBeNull();
      expect(popup!.x).toBeGreaterThanOrEqual(0);
      expect(popup!.y).toBeGreaterThanOrEqual(0);
      expect(popup!.x + popup!.width).toBeLessThanOrEqual(320);
      expect(popup!.y + popup!.height).toBeLessThanOrEqual(400);
      await id(page, 'medication-calendar-today').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${output}/calendar-small-320.png` });
      await page.keyboard.press('Escape');
      await page.setViewportSize(viewport);
      checks.push('Calendar fits 320×400 and scrolls');
    }

    await click(id(page, 'medication-register-take'));
    await id(page, 'medication-take-dose').fill('');
    await id(page, 'medication-take-time').fill('25:99');
    await click(id(page, 'medication-take-save'));
    await expect(id(page, 'medications-error')).toContainText(/Revisa/);
    expect((await careOf(page)).takes).toHaveLength(4);
    await id(page, 'medication-take-dose').fill('Dosis capturada QA');
    await id(page, 'medication-take-time').fill('23:50');
    await id(page, 'medication-take-date').fill(yesterday);
    await click(id(page, 'medication-take-save'));
    await expect(id(page, 'medications-screen')).toBeVisible();
    const createdTake = (await careOf(page)).takes.find(take => take.dose === 'Dosis capturada QA')!;
    expect(createdTake).toBeTruthy();
    await click(id(page, `medication-take-${createdTake.id}`));
    await id(page, 'medication-take-dose').fill('Dosis editada QA');
    await click(id(page, 'medication-take-status-skipped'));
    await click(id(page, 'medication-take-save'));
    await expect(id(page, `medication-take-${createdTake.id}`)).toContainText('Descartada');
    expect((await careOf(page)).takes).toHaveLength(5);
    await page.reload();
    await expect(id(page, 'medications-screen')).toBeVisible();
    await selectDay(page, yesterday);
    await expect(id(page, `medication-take-${createdTake.id}`)).toContainText('Dosis editada QA');
    await click(id(page, `medication-take-${createdTake.id}`));
    await click(id(page, 'medication-take-delete'));
    await expect(id(page, `medication-take-${createdTake.id}`)).toHaveCount(0);
    expect((await careOf(page)).takes).toHaveLength(4);
    checks.push('Take invalid input, explicit create, taken→skipped edit, persistence and delete');

    await page.waitForTimeout(500);
    await click(id(page, 'medication-register-take'));
    await id(page, 'medication-take-dose').fill('Reintento único QA');
    await id(page, 'medication-take-time').fill('23:51');
    await id(page, 'medication-take-date').fill(yesterday);
    await page.evaluate(() => { (window as Controls).__medicationFailWrites = 1; });
    await click(id(page, 'medication-take-save'));
    await expect(id(page, 'medication-take-form')).toBeVisible();
    await expect(id(page, 'medications-error')).toContainText('No se pudo guardar');
    await expect(id(page, 'medication-take-dose')).toHaveValue('Reintento único QA');
    expect((await careOf(page)).takes).toHaveLength(4);
    await click(id(page, 'medication-take-save'));
    await expect(id(page, 'medications-screen')).toBeVisible();
    expect((await careOf(page)).takes.filter(take => take.dose === 'Reintento único QA')).toHaveLength(1);
    checks.push('Failed persistence keeps draft, rollback and retry writes one entity');

    await click(id(page, 'medication-tab-treatments'));
    await page.waitForTimeout(500);
    await click(id(page, 'medication-new-treatment'));
    await click(id(page, 'treatment-save'));
    await expect(id(page, 'treatment-error')).toContainText('Revisa');
    await id(page, 'treatment-name').fill('Tratamiento nuevo QA');
    await click(id(page, 'treatment-medication-qa-med-a'));
    await click(id(page, 'treatment-medication-qa-med-c'));
    await expect(id(page, 'treatment-medication-qa-med-a')).toHaveAttribute('aria-checked', 'true');
    await click(id(page, 'treatment-more-options'));
    await id(page, 'treatment-active').locator('input').uncheck();
    await capture(page, 'new-treatment', viewport.width);
    await click(id(page, 'treatment-save'));
    await expect(id(page, 'medications-screen')).toBeVisible();
    const treatment = (await careOf(page)).treatments.find(item => item.name === 'Tratamiento nuevo QA')!;
    expect(treatment.medicationIds).toEqual(['qa-med-a', 'qa-med-c']);
    await expect(id(page, `medication-treatment-${treatment.id}`)).toContainText('Finalizado');
    await click(id(page, `medication-treatment-${treatment.id}`));
    await click(id(page, 'treatment-detail-more-options'));
    await click(id(page, 'treatment-edit'));
    await expect(id(page, 'treatment-name')).toHaveValue('Tratamiento nuevo QA');
    await expect(id(page, 'treatment-add-medication')).toHaveCount(0);
    const medicationCountBeforeInline = (await stateOf(page)).medications.length;
    await id(page, 'treatment-medication-name').fill('Medicamento agregado al tratamiento QA');
    await click(id(page, 'treatment-save'));
    await expect(id(page, 'treatment-error')).toContainText('Completa el medicamento');
    expect((await stateOf(page)).medications).toHaveLength(medicationCountBeforeInline);
    await fillInlineMedication(page, 'Medicamento agregado al tratamiento QA');
    await click(id(page, 'treatment-more-options'));
    await id(page, 'treatment-active').locator('input').check();
    await page.evaluate(() => { (window as Controls).__medicationFailWrites = 1; });
    await click(id(page, 'treatment-save'));
    await expect(id(page, 'treatment-error')).toContainText('No se pudo guardar');
    await expect(id(page, 'treatment-medication-name')).toHaveValue('Medicamento agregado al tratamiento QA');
    expect((await stateOf(page)).medications).toHaveLength(medicationCountBeforeInline);
    expect((await careOf(page)).treatments.find(item => item.id === treatment.id)?.medicationIds).toHaveLength(2);
    await click(id(page, 'treatment-save'));
    await expect(id(page, `medication-treatment-${treatment.id}`)).toContainText('3 medicamentos · Vigente');
    expect((await stateOf(page)).medications.filter(item => item.name === 'Medicamento agregado al tratamiento QA')).toHaveLength(1);
    expect((await careOf(page)).takes).toHaveLength(5);
    checks.push('Inline medication in treatment: required fields, atomic failed write/retry without orphan or duplicate, active state and selected medications retained');

    await click(id(page, `medication-treatment-${treatment.id}`));
    await click(id(page, 'treatment-manage-alerts'));
    await expect(id(page, 'medication-alert-form')).toContainText('Tratamiento nuevo QA');
    await expect(id(page, 'alert-medication-picker')).toHaveCount(0);
    await expect(id(page, 'alert-medication-name')).toHaveValue('Medicamento A');
    await id(page, 'alert-medication-concentration').fill('50 mg');
    await id(page, 'alert-time').fill('25:99');
    await click(id(page, 'save-medication-alert'));
    await expect(id(page, 'medication-alert-error')).toContainText('HH:mm');
    await id(page, 'alert-time').fill('10:30');
    await click(id(page, 'alert-repeat-picker'));
    await click(id(page, 'alert-recurrence-weekdays'));
    for (let day = 0; day < 7; day++) if (await id(page, `alert-repeat-day-${day}`).getAttribute('aria-checked') === 'true') await click(id(page, `alert-repeat-day-${day}`));
    await expect(id(page, 'alert-repeat-done')).toBeDisabled();
    for (const day of [1, 3, 5]) await click(id(page, `alert-repeat-day-${day}`));
    await click(id(page, 'alert-repeat-done'));
    await expect(id(page, 'alert-repeat-picker')).toContainText('Todos los lunes, miércoles y viernes');
    await capture(page, 'create-alert', viewport.width);
    await click(id(page, 'save-medication-alert'));
    await expect(id(page, 'alerts-folder')).toBeVisible();
    const alert = (await careOf(page)).alerts.find(item => item.treatmentId === treatment.id)!;
    expect(alert).toMatchObject({ medicationId: 'qa-med-a', concentration: '50 mg', enabled: true, time: '10:30', days: [1, 3, 5] });
    await expect(id(page, `medication-alert-toggle-${alert.id}`).locator('input')).toBeChecked();
    await expect(id(page, `medication-alert-toggle-${alert.id}`).locator('input')).toBeEnabled();
    await expect(id(page, 'medication-alert-activation-note')).toHaveCount(0);
    await expect(id(page, 'medication-alert-notice')).toHaveCount(0);
    expect((await careOf(page)).alerts.filter(item => item.id === alert.id)).toHaveLength(1);
    expect((await careOf(page)).alerts.find(item => item.id === alert.id)?.enabled).toBe(true);
    await capture(page, 'alerts', viewport.width);
    await page.goto(`${origin}/alerts`);
    await expect(id(page, 'alerts-folder')).toBeVisible();
    await click(id(page, 'medication-alert-tab-active'));
    await expect(id(page, `medication-alert-${alert.id}`)).toContainText('10:30');
    await id(page, `medication-alert-${alert.id}`).getByRole('button').click();
    await click(id(page, 'delete-medication-alert'));
    await expect(id(page, `medication-alert-${alert.id}`)).toHaveCount(0);
    expect((await careOf(page)).alerts.find(item => item.id === alert.id)).toBeUndefined();
    await expect(id(page, 'medication-alert-toggle-qa-alert-active').locator('input')).toBeChecked();
    await expect(id(page, 'medication-alert-toggle-qa-alert-active').locator('input')).toBeEnabled();
    await click(id(page, 'medication-alert-tab-active'));
    await expect(id(page, 'medication-alert-qa-alert-active')).toBeVisible();
    await click(id(page, 'medication-alert-tab-paused'));
    await expect(id(page, 'medication-alert-tab-paused')).toHaveAttribute('aria-selected', 'true');
    await expect(id(page, 'medication-alert-qa-alert-active')).toHaveCount(0);
    expect((await careOf(page)).alerts.find(item => item.id === 'qa-alert-active')?.enabled).toBe(true);
    checks.push('Linked alert, invalid hour, repeat days, save/edit/delete; interactive alert switch reflects configured activation independently of system notifications');

    await closePanels(page);
    const ownerSnapshot = await careOf(page);
    await click(id(page, 'header-profile'));
    await click(id(page, `profile-select-${childId}`));
    await expect.poll(async () => (await stateOf(page)).profile.id).toBe(childId);
    await expect(page.getByTestId('profile-drawer')).toHaveCount(0);
    await expect(id(page, 'home-tab-today')).toHaveAttribute('aria-selected', 'true');
    await openMedications(page);
    await expect(id(page, 'medication-takes-empty')).toBeVisible();
    await expect(id(page, 'medication-take-qa-take-a')).toHaveCount(0);
    await click(id(page, 'medication-tab-treatments'));
    await expect(id(page, 'medication-treatment-qa-treatment-a')).toHaveCount(0);
    await expect(page.getByText('Aún no tienes tratamientos guardados.', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Medicamentos sin tratamiento', { exact: true })).toHaveCount(0);
    await expect(id(page, 'medications-add-medication')).toHaveCount(0);
    await capture(page, 'treatments-empty-family', viewport.width);
    await click(id(page, 'medication-new-treatment'));
    await id(page, 'treatment-name').fill('Tratamiento familiar QA');
    await expect(id(page, 'treatment-add-medication')).toHaveCount(0);
    await fillInlineMedication(page, 'Medicamento familiar QA');
    await expect(id(page, 'treatment-name')).toHaveValue('Tratamiento familiar QA');
    expect((await stateOf(page)).medications).toHaveLength(0);
    await id(page, 'treatment-medication-name').scrollIntoViewIfNeeded();
    await capture(page, 'inline-medication-family', viewport.width);
    await page.evaluate(() => { (window as Controls).__medicationFailWrites = 1; });
    await click(id(page, 'treatment-save'));
    await expect(id(page, 'treatment-error')).toContainText('No se pudo guardar');
    expect((await stateOf(page)).medications).toHaveLength(0);
    expect((await careOf(page)).treatments).toHaveLength(0);
    await expect(id(page, 'treatment-medication-name')).toHaveValue('Medicamento familiar QA');
    await click(id(page, 'treatment-save'));
    await expect(id(page, 'medications-screen')).toBeVisible();
    expect((await careOf(page)).treatments).toHaveLength(1);
    expect((await stateOf(page)).medications.filter(item => item.name === 'Medicamento familiar QA')).toHaveLength(1);
    expect((await stateOf(page)).family?.profiles[initial.profile.id].medicationCare).toEqual(ownerSnapshot);
    await closePanels(page);
    await click(id(page, 'menu-alerts'));
    await expect(id(page, 'alerts-folder')).toContainText('Aún no tienes alertas');
    await capture(page, 'alerts-empty-family', viewport.width);
    await closePanels(page);
    await click(id(page, 'header-profile'));
    await click(id(page, 'profile-select-owner'));
    await expect.poll(async () => (await stateOf(page)).profile.id).toBe(initial.profile.id);
    await expect(page.getByTestId('profile-drawer')).toHaveCount(0);
    await expect(id(page, 'home-tab-today')).toHaveAttribute('aria-selected', 'true');
    expect(await careOf(page)).toEqual(ownerSnapshot);
    expect((await stateOf(page)).family?.profiles[childId].medicationCare?.treatments).toHaveLength(1);
    checks.push('Family medication/treatment/alert isolation and owner data retained');

    await openMedications(page);
    await click(id(page, 'medication-tab-treatments'));
    await click(id(page, 'medication-treatment-qa-treatment-a'));
    await click(id(page, 'treatment-detail-medication-qa-med-a'));
    await id(page, 'medication-name').fill('Medicamento A editado QA');
    await page.evaluate(() => { (window as Controls).__medicationFailWrites = 1; });
    await click(id(page, 'save-medication'));
    await expect(id(page, 'medication-error')).toContainText('No se pudo guardar');
    await expect(id(page, 'medication-name')).toHaveValue('Medicamento A editado QA');
    expect((await stateOf(page)).medications.find(item => item.id === 'qa-med-a')?.name).toBe('Medicamento A');
    await click(id(page, 'save-medication'));
    await expect(id(page, 'medications-screen')).toBeVisible();
    expect((await stateOf(page)).medications.find(item => item.id === 'qa-med-a')?.name).toBe('Medicamento A editado QA');
    await click(id(page, 'medication-treatment-qa-treatment-a'));
    await click(id(page, 'treatment-detail-medication-qa-med-a'));
    await click(id(page, 'medication-delete'));
    await expect(id(page, 'medications-screen')).toBeVisible();
    const afterDeletion = await stateOf(page);
    expect(afterDeletion.medications.some(item => item.id === 'qa-med-a')).toBe(false);
    expect(afterDeletion.medicationCare?.treatments.find(item => item.id === 'qa-treatment-a')?.medicationIds).toEqual(['qa-med-b']);
    expect(afterDeletion.medicationCare?.treatments.every(item => !item.medicationIds.includes('qa-med-a'))).toBe(true);
    expect(afterDeletion.medicationCare?.takes.some(item => item.medicationId === 'qa-med-a')).toBe(false);
    expect(afterDeletion.medicationCare?.alerts.some(item => item.medicationId === 'qa-med-a')).toBe(false);
    expect(afterDeletion.medicationCare?.takes.some(item => item.id === 'qa-take-b')).toBe(true);
    expect(afterDeletion.family?.profiles[childId].medications[0].name).toBe('Medicamento familiar QA');
    checks.push('Medication edit failed write/retry and deletion prunes linked takes, alerts and treatment membership');

    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    expect(validateAppState(await stateOf(page))).toBe(true);
    expect(pageErrors).toEqual([]);
    expect(forbiddenRequests).toEqual([]);
    return { viewport, checks, pageErrors, forbiddenRequests };
  } catch (error) {
    await page.screenshot({ path: `${output}/failure-${viewport.width}.png` });
    throw error;
  } finally { await context.close(); }
}

async function verifyStandaloneAlerts(browser: Browser, viewport: Viewport) {
  const fixture = createDemoState();
  fixture.medications = [];
  fixture.medicationCare = { treatments: [], takes: [], alerts: [] };
  const { context, page, initial, forbiddenRequests, pageErrors } = await createContext(browser, viewport, fixture);
  try {
    await click(id(page, 'home-tab-archive'));
    await click(id(page, 'menu-alerts'));
    await expect(id(page, 'create-medication-alert')).toHaveCount(1);
    await click(id(page, 'create-medication-alert'));
    await expect(id(page, 'medication-alert-form')).toBeVisible();
    await expect(id(page, 'alert-medication-picker')).toHaveCount(0);
    await expect(id(page, 'alert-medication-options')).toHaveCount(0);
    await expect(id(page, 'alert-add-medication')).toHaveCount(0);
    await expect(id(page, 'alert-medication-name')).toBeEditable();
    await expect(id(page, 'alert-medication-concentration')).toBeEditable();
    expect(await id(page, 'alert-medication-name').evaluate(element => element.tagName)).toBe('INPUT');
    await expect(id(page, 'alert-medication-name')).toHaveAttribute('spellcheck', 'true');
    await click(id(page, 'save-medication-alert'));
    await expect(id(page, 'medication-alert-error')).toContainText(/medicamento/i);
    await id(page, 'alert-medication-name').fill('Vitamina ficticia QA');
    await id(page, 'alert-medication-concentration').fill('10 mg');
    await id(page, 'alert-time').fill('09:35');
    await page.evaluate(() => { (window as Controls).__medicationFailWrites = 1; });
    await click(id(page, 'save-medication-alert'));
    await expect(id(page, 'medication-alert-error')).toContainText('No se pudo guardar');
    await expect(id(page, 'alert-medication-name')).toHaveValue('Vitamina ficticia QA');
    await expect(id(page, 'alert-medication-concentration')).toHaveValue('10 mg');
    expect((await stateOf(page)).medications).toHaveLength(0);
    expect((await careOf(page)).alerts).toHaveLength(0);
    await capture(page, 'standalone-alert-form', viewport.width);
    await click(id(page, 'save-medication-alert'));
    await expect(id(page, 'alerts-folder')).toBeVisible();
    let saved = await stateOf(page);
    const alert = saved.medicationCare!.alerts[0];
    expect(saved.medications).toHaveLength(0);
    expect(alert).toMatchObject({ medicationName: 'Vitamina ficticia QA', concentration: '10 mg', time: '09:35', enabled: false });
    expect(alert.medicationId).toBeUndefined();
    expect(alert.treatmentId).toBeUndefined();
    const row = id(page, `medication-alert-${alert.id}`);
    await expect(row).toContainText('Vitamina ficticia QA');
    await expect(row).toContainText('10 mg');
    await row.getByRole('button').click();
    await id(page, 'alert-medication-name').fill('Vitamina ficticia QA editada');
    await id(page, 'alert-medication-concentration').fill('25 mg');
    await click(id(page, 'save-medication-alert'));
    await expect(id(page, 'alerts-folder')).toBeVisible();
    expect((await careOf(page)).alerts).toHaveLength(1);
    expect((await careOf(page)).alerts[0]).toMatchObject({ id: alert.id, medicationName: 'Vitamina ficticia QA editada', concentration: '25 mg', enabled: false });
    await page.reload();
    await expect(id(page, 'alerts-folder')).toBeVisible();
    await click(id(page, 'medication-alert-tab-paused'));
    await expect(row).toContainText('Vitamina ficticia QA editada');
    await expect(row).toContainText('25 mg');
    const standaloneSwitch = () => id(page, `medication-alert-toggle-${alert.id}`).locator('input');
    await expect(standaloneSwitch()).toBeEnabled();
    await expect(standaloneSwitch()).not.toBeChecked();
    await page.evaluate(() => { (window as Controls).__medicationFailWrites = 1; });
    await standaloneSwitch().click();
    await expect(id(page, 'medication-alert-error')).toContainText('No se pudo guardar');
    await expect(standaloneSwitch()).not.toBeChecked();
    expect((await careOf(page)).alerts[0].enabled).toBe(false);
    await standaloneSwitch().click();
    await expect.poll(async () => (await careOf(page)).alerts[0].enabled).toBe(true);
    await expect(standaloneSwitch()).toBeChecked();
    await expect(id(page, 'medication-alert-notice')).toHaveCount(0);
    expect((await stateOf(page)).medications).toHaveLength(0);
    await page.reload();
    await expect(id(page, 'alerts-folder')).toBeVisible();
    await expect(row).toContainText('Vitamina ficticia QA editada');
    await expect(standaloneSwitch()).toBeChecked();
    await standaloneSwitch().click();
    await expect.poll(async () => (await careOf(page)).alerts[0].enabled).toBe(false);
    await click(id(page, 'medication-alert-tab-active'));
    await expect(row).toHaveCount(0);
    await click(id(page, 'medication-alert-tab-paused'));
    await expect(standaloneSwitch()).not.toBeChecked();
    expect((await careOf(page)).alerts).toHaveLength(1);
    expect((await stateOf(page)).medications).toHaveLength(0);
    await capture(page, 'standalone-alert-saved', viewport.width);
    const ownerCare = await careOf(page);
    await closePanels(page);
    await click(id(page, 'header-profile'));
    await click(id(page, `profile-select-${childId}`));
    await expect.poll(async () => (await stateOf(page)).profile.id).toBe(childId);
    await expect(page.getByTestId('profile-drawer')).toHaveCount(0);
    await expect(id(page, 'home-tab-today')).toHaveAttribute('aria-selected', 'true');
    await click(id(page, 'menu-alerts'));
    await expect(id(page, 'alerts-folder')).toContainText('Aún no tienes alertas.');
    await expect(page.getByText('Vitamina ficticia QA editada', { exact: true })).toHaveCount(0);
    await click(id(page, 'create-medication-alert'));
    await id(page, 'alert-medication-name').fill('Alerta familiar QA');
    await id(page, 'alert-medication-concentration').fill('5 mcg');
    await id(page, 'alert-time').fill('10:05');
    await click(id(page, 'save-medication-alert'));
    await expect(id(page, 'alerts-folder')).toBeVisible();
    saved = await stateOf(page);
    expect(saved.medications).toHaveLength(0);
    expect(saved.medicationCare!.alerts).toHaveLength(1);
    expect(saved.medicationCare!.alerts[0]).toMatchObject({ medicationName: 'Alerta familiar QA', concentration: '5 mcg', enabled: false });
    expect(saved.family!.profiles[initial.profile.id].medicationCare).toEqual(ownerCare);
    await closePanels(page);
    await click(id(page, 'header-profile'));
    await click(id(page, 'profile-select-owner'));
    await expect.poll(async () => (await stateOf(page)).profile.id).toBe(initial.profile.id);
    await expect(page.getByTestId('profile-drawer')).toHaveCount(0);
    await expect(id(page, 'home-tab-today')).toHaveAttribute('aria-selected', 'true');
    await click(id(page, 'menu-alerts'));
    await click(id(page, 'medication-alert-tab-paused'));
    await expect(id(page, `medication-alert-${alert.id}`)).toContainText('Vitamina ficticia QA editada');
    await expect(page.getByText('Alerta familiar QA', { exact: true })).toHaveCount(0);
    expect((await stateOf(page)).medications).toHaveLength(0);
    expect(validateAppState(await stateOf(page))).toBe(true);
    expect(pageErrors).toEqual([]);
    expect(forbiddenRequests).toEqual([]);
    return { viewport, standaloneWithoutMedicationRecords: true, freeTextNameAndConcentration: true, predictiveInputAttributes: true, failedWriteRetry: true, directToggleFailureRetry: true, directToggleReloadAndDisable: true, editAndReload: true, profileIsolation: true, newlyConfiguredAlertsStartDisabled: true, pageErrors, forbiddenRequests };
  } catch (error) {
    await page.screenshot({ path: `${output}/standalone-alert-failure-${viewport.width}.png` });
    throw error;
  } finally { await context.close(); }
}

async function main() {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const results = [];
    for (const viewport of [{ width: 393, height: 852 }, { width: 320, height: 640 }]) results.push(await verifyViewport(browser, viewport));
    const standaloneAlerts = [];
    for (const viewport of [{ width: 393, height: 852 }, { width: 320, height: 640 }]) standaloneAlerts.push(await verifyStandaloneAlerts(browser, viewport));
    await writeFile(`${output}/report.json`, JSON.stringify({ testedAt: new Date().toISOString(), today, results, standaloneAlerts, scope: 'Synthetic browser state only; configured alerts may run inside the open app without web system notifications. No native device, remote provider or clinical records accessed. Predictive keyboard behavior on native devices was not exercised.' }, null, 2));
    console.log('PASS medication care at 393/320px: explicit takes, treatments, calendar, persistence/retry, profile isolation, linked and standalone free-text alerts. No external requests or POSTs.');
  } finally { await browser.close(); }
}
void main();

