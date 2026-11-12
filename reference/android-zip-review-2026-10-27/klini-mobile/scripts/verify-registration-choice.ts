import { chromium, expect, type Locator, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createDemoState } from '../src/domain/seed';
import { switchProfile } from '../src/domain/family';
import { STORAGE_KEY } from '../src/domain/reducer';
import type { AppState } from '../src/domain/types';

const origin = process.env.KLINI_VERIFY_ORIGIN || 'http://127.0.0.1:8096';
const output = 'test-results';
const child = { id: 'registration-child-fixture', name: 'Perfil infantil ficticio', kind: 'Niño' as const };
const childState = switchProfile(createDemoState(), child);
childState.medications = [{ id: 'child-medication-fixture', name: 'Registro de otro perfil', dose: 'Dosis ficticia', frequency: 'Según receta', startDate: '2026-01-01', active: true }];
const fixture = switchProfile(childState);
const childSnapshot = fixture.family!.profiles[child.id];
type FailureControls = Window & { __registrationFailWrites?: number };

async function stored(page: Page): Promise<AppState> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), STORAGE_KEY);
}

async function reachable(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeInViewport();
  await locator.click();
}

async function assertChoice(page: Page) {
  const choice = page.getByTestId('registration-choice');
  await expect(choice).toBeVisible();
  await expect(choice.getByText('¿Qué deseas agregar?', { exact: true })).toBeVisible();
  await expect(page.getByTestId('record-entry-screen')).toHaveCount(0);
  await expect(page.getByTestId('medication-name')).toHaveCount(0);
  const panel = page.getByTestId('archive-popup').last();
  await expect.poll(() => panel.evaluate(element => {
    const transform = getComputedStyle(element).transform;
    return transform === 'none' ? 0 : Math.abs(new DOMMatrixReadOnly(transform).m42);
  })).toBeLessThan(.5);
  const bounds = await panel.boundingBox();
  const viewport = page.viewportSize()!;
  expect(bounds).not.toBeNull();
  expect(bounds!.height).toBeGreaterThan(viewport.height * .65);
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(bounds!.y + bounds!.height).toBeCloseTo(viewport.height, 0);
  const buttons = [];
  for (const kind of ['medication', 'document']) {
    const button = page.getByTestId(`registration-${kind}`);
    await expect(button).toBeInViewport();
    await expect(button).toHaveRole('button');
    const box = await button.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(48);
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeLessThanOrEqual(220);
    expect(Math.abs(box!.x + box!.width / 2 - viewport.width / 2)).toBeLessThan(1);
    const appearance = await button.evaluate(element => {
      const style = getComputedStyle(element);
      return {
        radius: parseFloat(style.borderRadius),
        background: style.backgroundColor.match(/\d+/g)!.slice(0, 3).map(Number),
        border: style.borderColor.match(/\d+/g)!.slice(0, 3).map(Number),
        shadow: style.boxShadow,
        textColors: Array.from(element.querySelectorAll('*'))
          .filter(child => child.childElementCount === 0 && child.textContent?.trim())
          .map(child => getComputedStyle(child).color.match(/\d+/g)!.slice(0, 3).map(Number)),
      };
    });
    const radius = appearance.radius;
    expect(radius, 'Registration choices use oval buttons').toBeGreaterThanOrEqual(box!.height / 2 - 1);
    expect(Math.min(...appearance.background), 'Choices have a white or light gray background').toBeGreaterThanOrEqual(240);
    expect(Math.max(...appearance.background) - Math.min(...appearance.background), 'Choice backgrounds are neutral').toBeLessThanOrEqual(8);
    expect(Math.min(...appearance.border), 'Choices have a light gray border').toBeGreaterThanOrEqual(200);
    expect(Math.max(...appearance.border) - Math.min(...appearance.border), 'Choice borders are neutral').toBeLessThanOrEqual(16);
    expect(appearance.shadow).toBe('none');
    for (const color of appearance.textColors) {
      expect(Math.max(...color) - Math.min(...color), 'Choice text and icons use neutral colors').toBeLessThanOrEqual(40);
    }
    buttons.push(box!);
  }
  expect(Math.abs(buttons[0].x - buttons[1].x)).toBeLessThan(1);
  expect(buttons[1].y - buttons[0].y - buttons[0].height, 'Documento appears below Medicamento with a calm gap').toBeGreaterThanOrEqual(16);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
}

async function step(page: Page, scope: string, number: number) {
  const progress = page.getByTestId(scope).getByTestId('record-flow-steps');
  await expect(progress).toBeVisible();
  await expect(progress.getByTestId(`record-flow-step-${number}`)).toHaveAttribute('aria-current', 'step');
  for (let index = 1; index <= 4; index++) await expect(progress.getByTestId(`record-flow-step-${index}`)).toBeVisible();
}

async function close(page: Page) {
  await page.getByTestId('archive-close').last().click();
  await expect(page.getByTestId('archive-popup')).toHaveCount(0);
  await expect(page.getByTestId('quick-register')).toBeVisible();
}

async function open(page: Page) {
  await page.getByTestId('quick-register').click();
  await assertChoice(page);
}

async function verify(page: Page, width: number) {
  await page.goto(origin);
  await expect(page.getByTestId('quick-register')).toBeVisible();
  const initial = await stored(page);
  const assertNoSave = async () => {
    const state = await stored(page);
    expect(state.records).toEqual(initial.records);
    expect(state.medications).toEqual(initial.medications);
    expect(state.family!.profiles[child.id]).toEqual(childSnapshot);
  };
  await page.getByTestId('home-tab-archive').click();
  await open(page);
  await page.screenshot({ path: `${output}/registration-choice-${width}.png` });
  await page.getByTestId('registration-document').click();
  await step(page, 'record-entry-screen', 1);
  for (const kind of ['photo', 'scan', 'text', 'file']) await expect(page.getByTestId(`record-type-${kind}`)).toBeInViewport();
  await page.getByTestId('archive-detail-back').click();
  await assertChoice(page);
  await page.getByTestId('registration-medication').click();
  await expect(page.getByTestId('medication-name')).toBeVisible();
  await expect(page.getByTestId('record-flow-steps')).toHaveCount(0);
  await page.getByTestId('medication-name').fill('Borrador ficticio descartado');
  await page.getByTestId('archive-detail-back').click();
  await assertChoice(page);
  await assertNoSave();
  await close(page);
  await assertNoSave();

  // The Historial add button exposes the same initial choice.
  await page.getByTestId('menu-history').click();
  await expect(page.getByTestId('history-categories')).toBeVisible();
  await page.getByTestId('add-archive-item').click();
  await assertChoice(page);
  await page.getByTestId('archive-detail-back').click();
  await expect(page.getByTestId('history-categories')).toBeVisible();
  await assertNoSave();
  await close(page);

  await open(page);
  await page.getByTestId('registration-medication').click();
  await expect(page.getByTestId('medication-name')).toHaveValue('');
  await reachable(page.getByTestId('save-medication'));
  await expect(page.getByRole('alert')).toContainText('nombre');
  await assertNoSave();
  const name = `Medicamento ficticio ${width}`;
  await page.getByTestId('medication-name').fill(name);
  await page.getByTestId('medication-dose').fill('Una unidad ficticia');
  await page.getByTestId('medication-frequency').click();
  await page.getByRole('button', { name: 'Cada 8 horas', exact: true }).click();
  await expect(page.getByTestId('medication-frequency')).toContainText('Cada 8 horas');
  await page.screenshot({ path: `${output}/registration-medication-${width}.png` });
  await expect(page.getByTestId('medication-additional-options')).toHaveCount(0);
  await reachable(page.getByTestId('medication-more-options'));
  await expect(page.getByTestId('medication-start-date')).toBeEditable();
  await expect(page.getByTestId('medication-end-date')).toBeEditable();
  await reachable(page.getByTestId('medication-more-options'));
  await expect(page.getByTestId('medication-additional-options')).toHaveCount(0);
  await assertNoSave();
  await page.evaluate(() => { (window as FailureControls).__registrationFailWrites = 1; });
  await reachable(page.getByTestId('save-medication'));
  await expect(page.getByTestId('medication-error')).toBeVisible();
  await expect(page.getByTestId('medication-name')).toHaveValue(name);
  await expect.poll(async () => (await stored(page)).medications.length).toBe(initial.medications.length);
  await assertNoSave();
  // A rapid repeat after a failed write must commit only one medication.
  await page.getByTestId('save-medication').click({ clickCount: 2 });
  await expect(page.getByTestId('medication-name')).toHaveCount(0);
  await expect(page.getByTestId('medication-tab-treatments')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText(name, { exact: true })).toHaveCount(0);
  await expect(page.getByText('Aún no tienes tratamientos guardados.', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Medicamentos sin tratamiento', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('medications-add-medication')).toHaveCount(0);
  await expect.poll(async () => (await stored(page)).medications.length).toBe(initial.medications.length + 1);
  let saved = await stored(page);
  expect(saved.medications.filter(item => item.name === name)).toHaveLength(1);
  expect(saved.medications.find(item => item.name === name)).toMatchObject({ dose: 'Una unidad ficticia', frequency: 'Cada 8 horas', active: true });
  expect(saved.records).toEqual(initial.records);
  expect(saved.family!.profiles[child.id]).toEqual(childSnapshot);
  const savedMedication = saved.medications.find(item => item.name === name)!;
  // Let the existing post-save double-submit guard finish before a new action.
  await page.waitForTimeout(500);
  await reachable(page.getByTestId('medication-new-treatment'));
  await expect(page.getByTestId(`treatment-medication-${savedMedication.id}`)).toContainText(name);
  await expect(page.getByTestId(`treatment-medication-${savedMedication.id}`)).toContainText('Una unidad ficticia');
  await expect(page.getByTestId('treatment-add-medication')).toHaveCount(0);
  await expect(page.getByTestId('treatment-medication-name')).toBeEditable();
  await expect(page.getByTestId('treatment-medication-dose')).toBeEditable();
  await expect(page.getByTestId('treatment-medication-frequency')).toBeVisible();
  await page.getByTestId('archive-detail-back').click();
  await expect(page.getByTestId('medication-treatments-list')).toBeVisible();
  await expect(page.getByText('Medicamentos sin tratamiento', { exact: true })).toHaveCount(0);
  await close(page);
  await page.reload();
  await expect(page.getByTestId('quick-register')).toBeVisible();
  saved = await stored(page);
  expect(saved.medications.filter(item => item.name === name)).toHaveLength(1);
  expect(saved.family!.profiles[child.id]).toEqual(childSnapshot);

  // Documento keeps the existing four-step capture → category → review flow.
  await open(page);
  await page.getByTestId('registration-document').click();
  await step(page, 'record-entry-screen', 1);
  await page.getByTestId('record-type-text').click();
  await step(page, 'record-text-popup', 2);
  const description = `Documento ficticio de prueba ${width}`;
  await page.getByTestId('record-text-input').fill(description);
  await page.getByTestId('record-text-save').click();
  await step(page, 'record-category-popup', 3);
  await expect(page.getByTestId('record-category-continue')).toBeDisabled();
  await page.getByTestId('record-category-Consulta').click();
  await page.getByTestId('record-category-continue').click();
  await step(page, 'record-review-sheet', 4);
  await expect(page.getByTestId('record-review-summary-text')).toHaveText(description);
  expect((await stored(page)).records).toEqual(initial.records);
  await page.getByTestId('save-record').click();
  await expect(page.getByTestId('history-records')).toBeVisible();
  await expect.poll(async () => (await stored(page)).records.length).toBe(initial.records.length + 1);
  await close(page);
  await page.reload();
  await expect(page.getByTestId('quick-register')).toBeVisible();
  saved = await stored(page);
  expect(saved.records.filter(record => record.description === description)).toHaveLength(1);
  expect(saved.medications.filter(item => item.name === name)).toHaveLength(1);
  expect(saved.medications.some(item => item.name === 'Borrador ficticio descartado')).toBe(false);
  expect(saved.family!.profiles[child.id]).toEqual(childSnapshot);
  return { width, height: page.viewportSize()!.height, verticalNeutralChoices: true, globalAndHistoryEntry: true, backAndCloseDiscardDraft: true, medicationValidates: true, optionalFieldsExpandable: true, failedWriteRollsBackAndRetainsDraft: true, rapidDoubleClickSavesOnce: true, cleanTreatmentsView: true, savedMedicationSelectable: true, documentFourSteps: true, noSaveBeforeConfirmation: true, profileIsolation: true, persistsAfterReload: true, noHorizontalOverflow: true };
}

async function main() {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.KLINI_CHROMIUM_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const results = [];
  try {
    for (const width of [393, 320]) {
      const context = await browser.newContext({ viewport: { width, height: width === 393 ? 852 : 640 }, timezoneId: 'America/Mexico_City', reducedMotion: 'reduce' });
      const errors: string[] = [], forbiddenRequests: string[] = [];
      await context.route('**/*', async route => {
        const request = route.request();
        if (new URL(request.url()).origin !== new URL(origin).origin || request.method() !== 'GET') {
          forbiddenRequests.push(`${request.method()} ${request.url()}`);
          return route.abort();
        }
        return route.continue();
      });
      await context.addInitScript(({ state, key }) => {
        if (!sessionStorage.getItem('registration-choice-fixture')) {
          localStorage.setItem(key, JSON.stringify(state));
          sessionStorage.setItem('registration-choice-fixture', '1');
        }
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function(storageKey: string, value: string) {
          const controls = window as FailureControls;
          if (this === localStorage && storageKey === key && (controls.__registrationFailWrites ?? 0) > 0) {
            controls.__registrationFailWrites!--;
            throw new DOMException('Fallo local de prueba.', 'QuotaExceededError');
          }
          return original.call(this, storageKey, value);
        };
      }, { state: fixture, key: STORAGE_KEY });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      try {
        results.push(await verify(page, width));
        expect(errors).toEqual([]);
        expect(forbiddenRequests, 'No live API/provider requests').toEqual([]);
      } catch (error) {
        await page.screenshot({ path: `${output}/registration-choice-failure-${width}.png` }).catch(() => undefined);
        throw error;
      } finally { await context.close(); }
    }
    const result = { result: 'PASS', results, liveProviderRequests: 0 };
    await writeFile(`${output}/registration-choice-result.json`, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  } finally { await browser.close(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
