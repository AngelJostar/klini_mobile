import { chromium, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createDemoState } from '../src/domain/seed';
import { STORAGE_KEY } from '../src/domain/reducer';
import type { AppState } from '../src/domain/types';

const origin = process.env.KLINI_VERIFY_ORIGIN || 'http://127.0.0.1:8096';
const output = 'test-results/archive-home-shortcuts';
const medicationName = 'Medicamento ficticio guardado';
const documentTitles = ['Estudio ficticio reservado al historial', 'Receta ficticia reservada al historial'];
const fixture = createDemoState(new Date('2026-11-09T12:00:00-06:00'));
// This empty-folder regression uses an ordinary owner. Sofia's intentional demo
// migration and populated alerts are covered in verify-medication-reminders.
fixture.profile.id = 'qa-shortcuts-owner';
fixture.profile.name = 'Perfil ficticio de verificación';
fixture.medications = [{ id: 'shortcut-medication-fixture', name: medicationName, dose: 'Dosis ficticia', frequency: 'Según receta', startDate: '2026-11-01', active: true }];
fixture.records = [
  { id: 'shortcut-study-fixture', type: 'Estudio', title: documentTitles[0], date: '2026-11-08', doctorName: '', description: 'Documento ficticio de prueba.' },
  { id: 'shortcut-prescription-fixture', type: 'Receta', title: documentTitles[1], date: '2026-11-07', doctorName: '', description: 'Documento ficticio de prueba.' },
];

async function stored(page: Page): Promise<AppState> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), STORAGE_KEY);
}

async function settledPopup(page: Page) {
  const panel = page.getByTestId('archive-popup').last();
  await expect.poll(() => panel.evaluate(element => {
    const transform = getComputedStyle(element).transform;
    return transform === 'none' ? 0 : Math.abs(new DOMMatrixReadOnly(transform).m42);
  })).toBeLessThan(.5);
  const viewport = page.viewportSize()!;
  await expect.poll(async () => (await panel.boundingBox())!.y).toBeCloseTo(viewport.height * .18, 0);
  const bounds = await panel.boundingBox();
  expect(bounds!.x).toBeCloseTo(0, 0);
  expect(bounds!.width).toBeCloseTo(viewport.width, 0);
  expect(bounds!.y + bounds!.height).toBeCloseTo(viewport.height, 0);
  await expect(page.getByTestId('archive-close').last()).toBeInViewport({ ratio: 1 });
}

async function close(page: Page) {
  await page.getByTestId('archive-close').last().click();
  await expect(page.getByTestId('archive-popup')).toHaveCount(0);
  await expect(page.getByTestId('menu-medications')).toBeInViewport();
  await expect(page.getByTestId('quick-register')).toBeVisible();
}

async function verify(page: Page, width: number) {
  await page.goto(origin);
  await expect(page.getByTestId('quick-register')).toBeVisible();
  const initial = await stored(page);
  await page.getByTestId('home-tab-archive').click();
  await expect(page.getByTestId('menu-medications')).toBeInViewport();
  const shortcuts = [
    ['menu-history', 'Historial'],
    ['menu-medications', 'Medicamentos'],
    ['menu-alerts', 'Alertas'],
    ['menu-records', 'Parámetros corporales'],
  ] as const;
  const shortcutBoxes = [];
  for (const [id, label] of shortcuts) {
    const shortcut = page.getByTestId(id);
    await expect(shortcut).toHaveRole('button');
    await expect(shortcut).toHaveAccessibleName(label);
    await expect(shortcut).toBeInViewport();
    const box = await shortcut.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    shortcutBoxes.push(box!);
  }
  for (let index = 1; index < shortcutBoxes.length; index++) {
    expect(shortcutBoxes[index].y).toBeCloseTo(shortcutBoxes[0].y, 0);
    expect(shortcutBoxes[index].x).toBeGreaterThanOrEqual(shortcutBoxes[index - 1].x + shortcutBoxes[index - 1].width - 1);
  }
  await expect(page.getByTestId('menu-prescriptions')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: `${output}/home-${width}.png` });

  // Medication data is separate from both prescription and study documents.
  await page.getByTestId('menu-medications').click();
  await expect(page.getByRole('heading', { name: 'Medicamentos', exact: true })).toBeVisible();
  await expect(page.getByTestId('medication-tab-takes')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('medication-takes-list')).toBeVisible();
  await page.getByTestId('medication-tab-treatments').click();
  await expect(page.getByTestId('medication-treatments-list')).toBeVisible();
  await expect(page.getByTestId('medication-unassigned-shortcut-medication-fixture')).toHaveCount(0);
  await expect(page.getByText(medicationName, { exact: true })).toHaveCount(0);
  await expect(page.getByText('Aún no tienes tratamientos guardados.', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Medicamentos sin tratamiento', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('medications-add-medication')).toHaveCount(0);
  for (const title of documentTitles) await expect(page.getByText(title, { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('record-entry-screen')).toHaveCount(0);
  await settledPopup(page);
  await page.screenshot({ path: `${output}/medications-${width}.png` });
  await page.getByTestId('medication-new-treatment').click();
  await expect(page.getByTestId('treatment-medication-shortcut-medication-fixture')).toContainText(medicationName);
  await expect(page.getByTestId('treatment-medication-shortcut-medication-fixture')).toContainText('Dosis ficticia');
  await expect(page.getByTestId('treatment-add-medication')).toHaveCount(0);
  await expect(page.getByTestId('treatment-medication-name')).toBeEditable();
  await expect(page.getByTestId('treatment-medication-name')).toHaveValue('');
  await expect(page.getByTestId('treatment-medication-dose')).toBeEditable();
  await expect(page.getByTestId('treatment-medication-frequency')).toBeVisible();
  await expect(page.getByTestId('record-entry-screen')).toHaveCount(0);
  await page.getByTestId('archive-detail-back').click();
  await expect(page.getByTestId('medication-treatments-list')).toBeVisible();
  expect((await stored(page)).medications).toEqual(initial.medications);
  await close(page);

  await page.getByTestId('menu-alerts').click();
  await expect(page.getByRole('heading', { name: 'Alertas', exact: true })).toBeVisible();
  await expect(page.getByTestId('alerts-folder')).toBeVisible();
  await expect(page.getByText('Aún no tienes alertas.', { exact: true })).toBeVisible();
  await expect(page.getByTestId('create-medication-alert')).toBeVisible();
  await expect(page.getByText(medicationName, { exact: true })).toHaveCount(0);
  for (const title of documentTitles) await expect(page.getByText(title, { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('add-archive-item')).toHaveCount(0);
  await settledPopup(page);
  await page.screenshot({ path: `${output}/alerts-${width}.png` });
  await close(page);

  await page.getByTestId('menu-history').click();
  await expect(page.getByTestId('history-categories')).toBeVisible();
  await close(page);
  await page.getByTestId('menu-records').click();
  await expect(page.getByRole('heading', { name: 'Parámetros corporales', exact: true })).toBeVisible();
  await close(page);

  await page.getByTestId('quick-register').click();
  await expect(page.getByTestId('registration-choice')).toBeVisible();
  await settledPopup(page);
  const optionBoxes = [];
  for (const kind of ['medication', 'document']) {
    const button = page.getByTestId(`registration-${kind}`);
    await expect(button).toBeInViewport();
    await expect(button).toHaveRole('button');
    const box = await button.boundingBox();
    const style = await button.evaluate(element => {
      const computed = getComputedStyle(element);
      return { radius: parseFloat(computed.borderRadius), background: computed.backgroundColor };
    });
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(style.radius).toBeGreaterThanOrEqual(box!.height / 2 - 1);
    expect(style.background, 'The options use the requested neutral surface').toBe('rgb(248, 249, 250)');
    optionBoxes.push(box!);
  }
  expect(optionBoxes[1].y).toBeGreaterThanOrEqual(optionBoxes[0].y + optionBoxes[0].height + 12);
  expect(optionBoxes[0].x + optionBoxes[0].width / 2).toBeCloseTo(optionBoxes[1].x + optionBoxes[1].width / 2, 0);
  await page.screenshot({ path: `${output}/registration-choice-${width}.png` });
  await page.getByTestId('registration-document').click();
  await expect(page.getByTestId('record-entry-screen')).toBeVisible();
  await page.getByTestId('archive-detail-back').click();
  await expect(page.getByTestId('registration-choice')).toBeVisible();
  await page.getByTestId('registration-medication').click();
  await expect(page.getByTestId('medication-name')).toBeVisible();
  await close(page);

  const after = await stored(page);
  expect(after.records).toEqual(initial.records);
  expect(after.medications).toEqual(initial.medications);
  expect(after.family).toEqual(initial.family);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  return { width, height: page.viewportSize()!.height, semanticShortcuts: true, medicationDestination: true, cleanTreatmentsView: true, savedMedicationSelectable: true, documentsExcludedFromMedicationList: true, emptyAlerts: true, originalDestinationsPreserved: true, verticalNeutralOvalChoices: true, choiceDestinations: true, noDataChanges: true, noHorizontalOverflow: true };
}

async function main() {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.KLINI_CHROMIUM_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const results = [];
  try {
    for (const width of [393, 320]) {
      const context = await browser.newContext({ viewport: { width, height: width === 393 ? 852 : 640 }, reducedMotion: 'reduce', timezoneId: 'America/Mexico_City' });
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
        if (!sessionStorage.getItem('archive-shortcut-fixture')) {
          localStorage.setItem(key, JSON.stringify(state));
          sessionStorage.setItem('archive-shortcut-fixture', '1');
        }
      }, { state: fixture, key: STORAGE_KEY });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      try {
        results.push(await verify(page, width));
        expect(errors).toEqual([]);
        expect(forbiddenRequests, 'No live API or provider calls').toEqual([]);
      } catch (error) {
        await page.screenshot({ path: `${output}/failure-${width}.png` }).catch(() => undefined);
        throw error;
      } finally { await context.close(); }
    }
    const result = { result: 'PASS', results, liveProviderRequests: 0 };
    await writeFile(`${output}/result.json`, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  } finally { await browser.close(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
