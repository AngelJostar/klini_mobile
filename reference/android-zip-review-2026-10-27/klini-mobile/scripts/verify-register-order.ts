import { chromium, expect, type Locator, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const origin = process.env.KLINI_VERIFY_ORIGIN || 'http://127.0.0.1:8096';
const storageKey = '@klini/app-state:v1';
const modes = ['photo', 'scan', 'text', 'file'] as const;
type SavedRecord = { id: string; type: string; title: string; date: string; doctorName: string; specialty?: string; institution?: string; time?: string; description: string; attachment?: { name: string; mimeType: string; uri: string } };

async function records(page: Page): Promise<SavedRecord[]> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{}').records || [], storageKey);
}

async function step(scope: Locator, active: number) {
  const progress = scope.getByTestId('record-flow-steps');
  await expect(progress).toBeVisible();
  for (let number = 1; number <= 4; number++) {
    const item = progress.getByTestId(`record-flow-step-${number}`);
    await expect(item).toBeVisible();
    if (number === active) await expect(item).toHaveAttribute('aria-current', 'step');
    else await expect(item).not.toHaveAttribute('aria-current', 'step');
    await expect(item).toHaveAccessibleName(new RegExp(`Paso ${number} de 4`));
  }
}

async function settledSheet(page: Page) {
  const panel = page.getByTestId('archive-popup').last();
  await expect(panel).toBeVisible();
  await expect.poll(() => panel.evaluate(element => Math.abs(new DOMMatrixReadOnly(getComputedStyle(element).transform).m42))).toBeLessThanOrEqual(.5);
  const bounds = await panel.boundingBox();
  expect(bounds).not.toBeNull();
  const viewport = page.viewportSize()!;
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(bounds!.height, 'Steps 1 and 4 use the large bottom sheet').toBeGreaterThan(viewport.height * .65);
  expect(bounds!.y + bounds!.height).toBeCloseTo(viewport.height, 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'No horizontal overflow').toBe(false);
  return bounds!;
}

async function entry(page: Page) {
  const screen = page.getByTestId('record-entry-screen');
  await expect(screen).toBeVisible();
  for (const id of ['record-category-popup', 'record-review-sheet', 'record-text-popup', 'record-photo-popup', 'record-file-action']) await expect(page.getByTestId(id)).toHaveCount(0);
  await step(screen, 1);
  const panel = await settledSheet(page);
  for (const mode of modes) {
    const option = page.getByTestId(`record-type-${mode}`);
    await expect(option).toBeInViewport();
    const bounds = await option.boundingBox();
    expect(bounds!.width, `${mode} touch target width`).toBeGreaterThanOrEqual(48);
    expect(bounds!.height, `${mode} touch target height`).toBeGreaterThanOrEqual(48);
    expect(bounds!.y).toBeGreaterThan(panel.y + 44);
    expect(bounds!.x).toBeGreaterThanOrEqual(panel.x);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(panel.x + panel.width);
  }
  await expect(page.getByTestId(/^record-type-(photo|scan|text|file)$/)).toHaveCount(4);
}

async function categories(page: Page) {
  const popup = page.getByTestId('record-category-popup');
  await expect(popup).toBeVisible();
  for (const id of ['record-review-sheet', 'record-text-popup', 'record-photo-popup', 'record-file-action']) await expect(page.getByTestId(id)).toHaveCount(0);
  await step(popup, 3);
  const bounds = await popup.boundingBox();
  const viewport = page.viewportSize()!;
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(8);
  expect(bounds!.y, 'Category selection is a centered popup').toBeGreaterThan(8);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width - 8);
  expect(bounds!.y + bounds!.height, 'Category popup leaves space below').toBeLessThanOrEqual(viewport.height - 8);
  expect(bounds!.x + bounds!.width / 2).toBeCloseTo(viewport.width / 2, 0);
  expect(Math.abs(bounds!.y + bounds!.height / 2 - viewport.height / 2)).toBeLessThanOrEqual(20);
  await expect(page.getByTestId('record-categories').getByRole('button')).toHaveCount(8);
  for (const kind of ['Consulta', 'Vacuna', 'Alergia', 'Todos']) await expect(page.getByTestId(`record-category-${kind}`)).toBeInViewport();
  await expect(page.getByTestId('record-category-continue')).toBeInViewport();
}

async function chooseCategory(page: Page, kind: string) {
  await page.getByTestId(`record-category-${kind}`).click();
  await categories(page);
  await expect(page.getByTestId(`record-category-${kind}`)).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('record-category-continue')).toBeEnabled();
  await page.getByTestId('record-category-continue').click();
  await review(page);
}

async function review(page: Page) {
  const screen = page.getByTestId('record-review-sheet');
  await expect(screen).toBeVisible();
  for (const id of ['record-category-popup', 'record-photo-popup', 'record-text-popup', 'record-file-action']) await expect(page.getByTestId(id)).toHaveCount(0);
  await step(screen, 4);
  await settledSheet(page);
  await expect(page.getByTestId('record-review-date-value')).toBeVisible();
  for (const name of ['doctor', 'specialty']) {
    const input = page.getByTestId(`record-review-${name}`);
    await expect(input).toHaveCount(1);
    await expect(input).toBeVisible();
    await expect(input).toBeEditable();
    await expect(input).toHaveAttribute('placeholder', 'Escribe aquí');
  }
  await expect(page.getByTestId('record-review-institution')).toBeVisible();
  await expect(page.getByTestId('record-review-institution')).toHaveAttribute('placeholder', 'Escribe aquí');
  await expect(page.getByTestId('record-review-summary-title')).toHaveCount(0);
  await expect(screen.getByText('Por revisar', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('record-review-edit')).toBeVisible();
  await expect(page.getByTestId('save-record')).toBeEnabled();
  await expect(page.getByTestId('save-record')).toBeInViewport();
}

async function openQuick(page: Page) {
  await page.getByTestId('quick-register').click();
  await entry(page);
}

async function closeSheet(page: Page) {
  await page.getByTestId('archive-close').last().click();
  await expect(page.getByTestId('record-entry-screen')).toHaveCount(0);
  await expect(page.getByTestId('record-review-sheet')).toHaveCount(0);
  await expect(page.getByTestId('quick-register')).toBeVisible();
}

async function textCapture(page: Page) {
  await page.getByTestId('record-type-text').click();
  const popup = page.getByTestId('record-text-popup');
  await expect(popup).toBeVisible();
  await step(popup, 2);
  await expect(page.getByTestId('record-categories')).toHaveCount(0);
  await expect(page.getByTestId('record-review-sheet')).toHaveCount(0);
  await expect(page.getByTestId('record-text-save')).toHaveText('Continuar');
}

async function fileAction(page: Page, filename?: string) {
  const popup = page.getByTestId('record-file-action');
  await expect(popup).toBeVisible();
  await step(popup, 2);
  for (const id of ['record-categories', 'record-review-sheet', 'save-record']) await expect(page.getByTestId(id)).toHaveCount(0);
  await expect(page.getByTestId('record-file-select')).toBeInViewport();
  await expect(page.getByTestId('record-file-continue')).toBeInViewport();
  if (filename) {
    await expect(popup.getByText(filename, { exact: true })).toBeVisible();
    await expect(page.getByTestId('record-file-continue')).toBeEnabled();
  } else await expect(page.getByTestId('record-file-continue')).toBeDisabled();
}

async function demoToCategories(page: Page) {
  await page.getByTestId('record-type-scan').click();
  const popup = page.getByTestId('record-photo-popup');
  await expect(popup).toHaveAccessibleName('Escaneo');
  await step(popup, 2);
  await expect(page.getByTestId('record-categories')).toHaveCount(0);
  // Use the bundled fictitious image and its ordinary Use action, without OCR.
  await page.getByTestId('record-scan-demo').click();
  await expect(page.getByTestId('record-photo-preview')).toBeVisible();
  await page.getByTestId('record-photo-use').click();
  await categories(page);
}

async function verifyViewport(page: Page, width: number, chooserCount: () => number) {
  await page.goto(origin);
  await expect(page.getByTestId('quick-register')).toBeVisible();
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key) !== null, storageKey)).toBe(true);
  const initialCount = (await records(page)).length;
  const count = async (added = 0) => expect.poll(async () => (await records(page)).length).toBe(initialCount + added);
  await page.getByTestId('home-tab-archive').click();
  await openQuick(page);
  await page.screenshot({ path: `test-results/register-four-steps-type-${width}.png` });
  await closeSheet(page);
  await count();
  await openQuick(page);
  await page.getByTestId('archive-detail-back').click();
  await expect(page.getByTestId('record-entry-screen')).toHaveCount(0);
  await openQuick(page);

  await textCapture(page);
  await page.getByTestId('record-text-save').click();
  await expect(page.getByRole('alert')).toContainText('Escribe tu registro');
  await page.getByTestId('record-text-input').fill('Borrador ficticio que se cancela');
  await page.getByTestId('record-text-back').click();
  await entry(page);
  await count();
  // Back before Continue must retain the unfinished text when the same method
  // is reopened, without classifying or persisting the draft.
  await textCapture(page);
  await expect(page.getByTestId('record-text-input')).toHaveValue('Borrador ficticio que se cancela');
  await count();
  await page.getByTestId('record-text-back').click();
  await entry(page);
  for (const mode of ['photo', 'scan'] as const) {
    await page.getByTestId(`record-type-${mode}`).click();
    const popup = page.getByTestId('record-photo-popup');
    await expect(popup).toHaveAccessibleName(mode === 'photo' ? 'Foto' : 'Escaneo');
    await step(popup, 2);
    await expect(page.getByTestId('record-categories')).toHaveCount(0);
    if (mode === 'photo') await expect(page.getByTestId('record-photo-transcribe')).toHaveCount(0);
    else await expect(page.getByTestId('record-scan-demo')).toBeVisible();
    await page.getByTestId('record-photo-back').click();
    await entry(page);
    await count();
  }

  const canceledChooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('record-type-file').click();
  const canceledChooser = await canceledChooserPromise;
  await expect(page.getByTestId('record-categories')).toHaveCount(0);
  await canceledChooser.element().dispatchEvent('cancel');
  await fileAction(page);
  await count();
  const oversizedChooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('record-file-select').click();
  const oversizedChooser = await oversizedChooserPromise;
  await oversizedChooser.setFiles({ name: `archivo-demasiado-grande-${width}.pdf`, mimeType: 'application/pdf', buffer: Buffer.alloc(2 * 1024 * 1024 + 1) });
  await expect(page.getByText(/Selecciona un archivo de hasta 2 MB\./)).toBeVisible();
  await fileAction(page);
  await count();
  await page.getByTestId('record-file-back').click();
  await entry(page);

  const textTitle = `Consulta ficticia de captura ${width}`;
  const description = `${textTitle}\nNota de prueba local sin datos reales.`;
  await textCapture(page);
  await page.getByTestId('record-text-input').fill(description);
  await page.screenshot({ path: `test-results/register-four-steps-text-${width}.png` });
  await page.getByTestId('record-text-save').click();
  await categories(page);
  await expect(page.getByTestId('record-category-continue')).toBeDisabled();
  await count();
  await page.screenshot({ path: `test-results/register-four-steps-categories-${width}.png` });
  await page.getByTestId('record-category-back').click();
  await expect(page.getByTestId('record-text-input')).toHaveValue(description);
  await step(page.getByTestId('record-text-popup'), 2);
  await page.getByTestId('record-text-save').click();
  await categories(page);
  await chooseCategory(page, 'Consulta');
  await expect(page.getByTestId('record-review-summary-text')).toHaveText(description);
  await expect(page.getByTestId('record-review-doctor')).toHaveValue('');
  await expect(page.getByTestId('record-review-specialty')).toHaveValue('');
  await expect(page.getByTestId('record-review-institution')).toHaveValue('');
  await expect(page.getByTestId('photo-review-title')).toHaveCount(0);
  await count();
  await page.screenshot({ path: `test-results/register-four-steps-text-review-${width}.png` });
  await page.getByTestId('archive-detail-back').click();
  await categories(page);
  await expect(page.getByTestId('record-category-Consulta')).toHaveAttribute('aria-selected', 'true');
  await page.getByTestId('record-category-continue').click();
  await review(page);
  await expect(page.getByTestId('record-review-summary-text')).toHaveText(description);
  await page.getByTestId('save-record').click();
  await expect(page.getByTestId('history-records')).toBeVisible();
  await expect.poll(async () => (await records(page)).find(record => record.title === textTitle)).toMatchObject({ type: 'Consulta', description });
  await count(1);
  await closeSheet(page);

  // A staged scan is not persisted by capture, classification, or review.
  await openQuick(page);
  await demoToCategories(page);
  await count(1);
  await chooseCategory(page, 'Alergia');
  await expect(page.getByTestId('record-review-view')).toBeVisible();
  await page.getByTestId('record-review-category').click();
  await categories(page);
  await expect(page.getByTestId('record-category-Alergia')).toHaveAttribute('aria-selected', 'true');
  await page.getByTestId('record-category-continue').click();
  await review(page);
  await page.getByTestId('record-review-edit').click();
  const scanTitle = `Alergia escaneo ficticio ${width}`;
  await page.getByTestId('photo-review-title').fill(scanTitle);
  await page.getByTestId('record-review-description-edit').click();
  await page.getByTestId('photo-review-text').fill('Resumen ficticio revisado del escaneo.');
  await page.getByTestId('record-review-description-save').click();
  await count(1);
  await page.getByTestId('save-record').click();
  await expect(page.getByTestId('history-records')).toBeVisible();
  await expect.poll(async () => (await records(page)).find(record => record.title === scanTitle)).toMatchObject({ type: 'Alergia', description: 'Resumen ficticio revisado del escaneo.', attachment: { mimeType: 'image/jpeg' } });
  await count(2);
  await closeSheet(page);

  const pdf = { name: `vacuna-ficticia-${width}.pdf`, mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% Archivo ficticio para verificar el selector local.\n%%EOF') };
  await openQuick(page);
  let chooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('record-type-file').click();
  let chooser = await chooserPromise;
  await expect(page.getByTestId('record-categories')).toHaveCount(0);
  await chooser.setFiles(pdf);
  await fileAction(page, pdf.name);
  await count(2);
  await page.getByTestId('record-file-back').click();
  await entry(page);
  await textCapture(page);
  await expect(page.getByTestId('record-text-input')).toHaveValue('');
  const noteTitle = `Texto ficticio sin categoría ${width}`;
  await page.getByTestId('record-text-input').fill(noteTitle);
  await page.getByTestId('record-text-save').click();
  await categories(page);
  await chooseCategory(page, 'Todos');
  await expect(page.getByText(pdf.name, { exact: true })).toHaveCount(0);
  await page.getByTestId('save-record').click();
  await expect(page.getByTestId('history-records')).toBeVisible();
  await expect.poll(async () => (await records(page)).find(record => record.title === noteTitle)).toMatchObject({ type: 'Nota', description: noteTitle });
  expect((await records(page)).find(record => record.title === noteTitle)?.attachment).toBeUndefined();
  await count(3);
  await closeSheet(page);

  await openQuick(page);
  chooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('record-type-file').click();
  chooser = await chooserPromise;
  await chooser.setFiles(pdf);
  await fileAction(page, pdf.name);
  const choosersBeforeCategory = chooserCount();
  await page.getByTestId('record-file-continue').click();
  await categories(page);
  await expect(page.getByTestId('record-category-continue')).toBeDisabled();
  await page.getByTestId('record-category-Vacuna').click();
  await expect(page.getByTestId('record-category-Vacuna')).toHaveAttribute('aria-selected', 'true');
  await count(3);
  await page.getByTestId('record-category-back').click();
  await fileAction(page, pdf.name);
  expect(chooserCount(), 'Returning to a captured attachment must not reopen its picker').toBe(choosersBeforeCategory);
  await page.getByTestId('record-file-continue').click();
  await categories(page);
  await expect(page.getByTestId('record-category-Vacuna')).toHaveAttribute('aria-selected', 'true');
  await page.getByTestId('record-category-Todos').click();
  await expect(page.getByTestId('record-category-Todos')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('record-category-Vacuna')).toHaveAttribute('aria-selected', 'false');
  await chooseCategory(page, 'Consulta');
  await page.getByTestId('record-review-edit').click();
  await page.getByTestId('record-review-time').fill('25:00');
  await page.getByTestId('record-review-category').click();
  await categories(page);
  await chooseCategory(page, 'Vacuna');
  expect(chooserCount()).toBe(choosersBeforeCategory);
  await expect(page.getByTestId('record-review-view')).toBeVisible();
  await page.getByTestId('record-review-edit').click();
  // A Consultation-only value must remain editable after reclassification;
  // otherwise an invalid hidden hour can block saving with no recovery path.
  await expect(page.getByTestId('record-review-time')).toBeVisible();
  await expect(page.getByTestId('record-review-time')).toHaveValue('25:00');
  await page.getByTestId('save-record').click();
  await expect(page.getByRole('alert')).toContainText('hora');
  await count(3);
  await page.getByTestId('record-review-time').fill('12:00');
  await page.getByTestId('photo-review-title').fill('');
  await page.getByTestId('save-record').click();
  await expect(page.getByRole('alert')).toContainText('título');
  await count(3);
  const fileTitle = `Vacuna PDF ficticio ${width}`;
  await page.getByTestId('photo-review-title').fill(fileTitle);
  await page.getByTestId('photo-review-date').fill('2026-02-30');
  await page.getByTestId('save-record').click();
  await expect(page.getByRole('alert')).toContainText('fecha');
  await count(3);
  const fileMetadata = { date: '2026-10-20', doctorName: 'Laboratorio ficticio Klini', specialty: 'Laboratorio de prueba', institution: 'Centro de prueba', time: '12:00', description: 'Documento ficticio para verificar los datos conservados.' };
  await page.getByTestId('photo-review-date').fill(fileMetadata.date);
  await page.getByTestId('record-review-doctor').fill(fileMetadata.doctorName);
  await page.getByTestId('record-review-specialty').fill(fileMetadata.specialty);
  await page.getByTestId('record-review-institution').fill(fileMetadata.institution);
  await page.getByTestId('record-review-description-edit').click();
  await page.getByTestId('photo-review-text').fill(fileMetadata.description);
  await page.getByTestId('record-review-description-save').click();
  await page.getByTestId('archive-detail-back').click();
  await categories(page);
  await expect(page.getByTestId('record-category-Vacuna')).toHaveAttribute('aria-selected', 'true');
  await page.getByTestId('record-category-continue').click();
  await review(page);
  await expect(page.getByTestId('record-review-summary-text')).toHaveText(fileMetadata.description);
  await expect(page.getByTestId('record-review-doctor')).toHaveValue(fileMetadata.doctorName);
  await expect(page.getByTestId('record-review-specialty')).toHaveValue(fileMetadata.specialty);
  await expect(page.getByTestId('record-review-institution')).toHaveValue(fileMetadata.institution);
  await page.screenshot({ path: `test-results/register-four-steps-file-review-${width}.png` });
  await count(3);
  await page.getByTestId('save-record').click();
  await expect(page.getByTestId('history-records')).toBeVisible();
  await expect.poll(async () => (await records(page)).find(record => record.title === fileTitle)).toMatchObject({ type: 'Vacuna', ...fileMetadata, attachment: { name: pdf.name, mimeType: 'application/pdf' } });
  await count(4);
  await closeSheet(page);

  await openQuick(page);
  await textCapture(page);
  await page.getByTestId('record-text-input').fill('Captura ficticia descartada sin categoría');
  await page.getByTestId('record-text-save').click();
  await categories(page);
  await page.getByTestId('record-category-close').click();
  await expect(page.getByTestId('record-category-popup')).toHaveCount(0);
  await count(4);
  await page.reload();
  await expect(page.getByTestId('quick-register')).toBeVisible();
  const saved = await records(page);
  expect(saved).toHaveLength(initialCount + 4);
  for (const title of [textTitle, scanTitle, noteTitle, fileTitle]) expect(saved.filter(record => record.title === title)).toHaveLength(1);
  for (const title of ['Borrador ficticio que se cancela', 'Captura ficticia descartada sin categoría']) expect(saved.some(record => record.title === title)).toBe(false);
  expect(saved.find(record => record.title === fileTitle)).toMatchObject({ type: 'Vacuna', ...fileMetadata, attachment: { name: pdf.name, mimeType: 'application/pdf' } });
  return { width, height: page.viewportSize()!.height, progressOnEveryStep: true, largeTypeAndReviewSheets: true, centeredCategoryPopup: true, explicitCategoryContinue: true, captureBeforeCategory: true, summaryBeforeSave: true, metadataAlwaysVisible: true, editableReviewValidates: true, unfinishedTextPreservedOnBack: true, textPreservedOnBack: true, filePreservedOnBack: true, fileMetadataPreservedOnBack: true, categoryPreservedOnBack: true, timeValidationRecoverableAfterCategoryChange: true, changingMethodClearsDraft: true, scanDemoBeforeCategory: true, photoCancelBeforeCategory: true, fileCancelRecoverable: true, oversizedFileRejected: true, noRecordsBeforeFinalSave: true, savesWithCorrectCategory: 4, noDuplicateRecords: true, persistsAfterReload: true, noHorizontalOverflow: true };
}

async function main() {
  await mkdir('test-results', { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.KLINI_CHROMIUM_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const results: unknown[] = [];
  try {
    for (const width of [393, 320]) {
      // Every viewport gets temporary storage; no real record or profile changes.
      const context = await browser.newContext({ viewport: { width, height: width === 393 ? 852 : 640 }, timezoneId: 'America/Mexico_City' });
      const page = await context.newPage();
      const errors: string[] = [], blockedPosts: string[] = [];
      let fileChoosers = 0;
      page.on('pageerror', error => errors.push(error.message));
      page.on('filechooser', () => fileChoosers++);
      await context.route('**/*', async route => {
        const request = route.request();
        if (request.method() === 'POST') { blockedPosts.push(request.url()); return route.abort(); }
        if (new URL(request.url()).origin !== new URL(origin).origin) return route.abort();
        return route.continue();
      });
      try {
        results.push({ ...await verifyViewport(page, width, () => fileChoosers), fileChoosers, liveProviderRequests: 0 });
        expect(fileChoosers, 'Only explicit file captures open a picker').toBe(4);
        expect(blockedPosts, 'Registration does not contact a provider').toEqual([]);
        expect(errors).toEqual([]);
      } catch (error) {
        await page.screenshot({ path: `test-results/register-four-steps-failure-${width}.png` }).catch(() => undefined);
        throw error;
      } finally { await context.close(); }
    }
    const result = { result: 'PASS', results };
    await writeFile('test-results/register-four-steps-result.json', JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  } finally { await browser.close(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
