import { chromium, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createDemoState } from '../src/domain/seed';
import { hydrateState, STORAGE_KEY, validateAppState } from '../src/domain/reducer';
import { switchProfile } from '../src/domain/family';
import type { AppState } from '../src/domain/types';
import type { ManagedDoctorProfile, ManagedPatientProfile } from '../src/domain/managedProfiles';

// Browser-only synthetic fixtures. No backend, identity recording, or external request is allowed.
const origin = 'http://127.0.0.1:8097';
const output = resolve('test-results/professional-selection');
const professional: ManagedDoctorProfile = { id: 'demo-sofia-medical-oncology-v1', name: 'Sofía Martínez', kind: 'Profesional de la salud', professionalType: 'doctor', licenseNumber: '111111', specialty: 'Oncología Médica', demo: 'sofia-medical-oncology-v1' };
const child: ManagedPatientProfile = { id: 'qa-child-selection', name: 'Paciente menor QA', kind: 'Niño', birthDate: '2016-01-01' };
const clinicalKeys = ['appointments', 'policies', 'claims', 'records', 'medications', 'messages', 'favorites'] as const;
const managedKey = 'klini-managed-profiles-v1:patient-sofia';
const viewports = [{ width: 393, height: 852 }, { width: 320, height: 640 }, { width: 320, height: 400 }];
type StorageProbe = { writes: number; remainingFailures: number };
type ProbeWindow = Window & { __kliniSelectionStorage?: StorageProbe };

function seed(): AppState {
  const owner = createDemoState();
  const selected = switchProfile(owner, child);
  selected.records = [{ id: 'qa-child-exclusive-note', type: 'Nota', title: 'Nota exclusiva del menor QA', date: owner.records[0].date, doctorName: 'Profesional ficticio QA', description: 'Registro sintético para comprobar separación de contextos.' }];
  const restored = switchProfile(selected);
  const state = hydrateState(JSON.stringify(restored), createDemoState()).state;
  if (!validateAppState(state)) throw new Error('The synthetic professional selection fixture is invalid.');
  return state;
}
const stored = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}') as AppState, STORAGE_KEY);
const selectedId = async (page: Page) => (await stored(page)).profile.id;
async function drawer(page: Page) {
  if (new URL(page.url()).pathname === '/profile') await expect(page.getByTestId('profile-drawer')).toBeVisible();
  else if (await page.getByTestId('profile-drawer').count() === 0) await page.getByTestId('header-profile').click();
  await expect(page.getByTestId('profile-select-' + professional.id)).toBeVisible();
}
async function layout(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const bounds = await page.getByTestId('profile-drawer').boundingBox(), viewport = page.viewportSize()!;
  expect(bounds).not.toBeNull(); expect(bounds!.x).toBeGreaterThanOrEqual(-1); expect(bounds!.y).toBeGreaterThanOrEqual(-1);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1); expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height + 1);
}
async function probeStorage(page: Page, failOnce = false) {
  await page.evaluate(({ key, failOnce }) => {
    const original = Storage.prototype.setItem;
    const probe: StorageProbe = { writes: 0, remainingFailures: failOnce ? 1 : 0 };
    (window as ProbeWindow).__kliniSelectionStorage = probe;
    Storage.prototype.setItem = function (storageKey: string, value: string) {
      if (this === window.localStorage && storageKey === key) {
        probe.writes++;
        if (probe.remainingFailures > 0) { probe.remainingFailures--; throw new DOMException('Synthetic single write failure', 'QuotaExceededError'); }
      }
      original.call(this, storageKey, value);
    };
  }, { key: STORAGE_KEY, failOnce });
}
async function finish(context: BrowserContext, errors: string[], external: string[]) {
  expect(errors).toEqual([]); expect(external).toEqual([]); await context.close();
}
async function selectionFinished(page: Page, id: string) {
  await expect.poll(() => selectedId(page)).toBe(id);
  await expect(page.getByTestId('profile-drawer')).toHaveCount(0);
  await selectedHomePage(page, 'today');
  await expect(page.getByTestId('professional-profile-form')).toHaveCount(0);
}
async function archiveThenDrawer(page: Page) {
  await page.getByTestId('home-tab-archive').click();
  await selectedHomePage(page, 'archive');
  await drawer(page);
}
async function selectedHomePage(page: Page, selected: 'today' | 'archive') {
  const today = page.getByTestId('home-tab-today'), archive = page.getByTestId('home-tab-archive');
  await expect(today.getByText('Hoy', { exact: true })).toHaveCSS('font-weight', selected === 'today' ? '700' : '400');
  await expect(archive.getByText('Archivo', { exact: true })).toHaveCSS('font-weight', selected === 'archive' ? '700' : '400');
  await expect(today).toHaveAttribute('aria-selected', selected === 'today' ? 'true' : 'false');
  await expect(archive).toHaveAttribute('aria-selected', selected === 'archive' ? 'true' : 'false');
  const scrollLeft = () => page.getByTestId('home-pager').evaluate(element => element.scrollLeft);
  if (selected === 'today') await expect.poll(scrollLeft).toBeLessThan(1);
  else await expect.poll(scrollLeft).toBeGreaterThan(page.viewportSize()!.width - 2);
}
async function measureDismissal(page: Page) {
  return page.evaluate(async id => {
    const initial = document.querySelector<HTMLElement>('[data-testid="profile-drawer"]');
    const row = document.querySelector<HTMLElement>('[data-testid="profile-select-' + id + '"]');
    if (!initial || !row) throw new Error('The profile drawer is not ready for the motion measurement.');
    const panelWidth = initial.getBoundingClientRect().width;
    const samples: { elapsedMs: number; translateX: number; backdropOpacity: number; actionsBlocked: boolean }[] = [];
    const started = performance.now(); row.click();
    while (performance.now() - started <= 2500) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const panel = document.querySelector<HTMLElement>('[data-testid="profile-drawer"]');
      if (!panel) break;
      const transform = getComputedStyle(panel).transform;
      const backdrop = document.querySelector<HTMLElement>('[data-testid="profile-drawer-backdrop"]');
      const owner = document.querySelector<HTMLElement>('[data-testid="profile-select-owner"]');
      samples.push({ elapsedMs: performance.now() - started, translateX: transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m41, backdropOpacity: backdrop ? Number(getComputedStyle(backdrop).opacity) : -1, actionsBlocked: getComputedStyle(panel).pointerEvents === 'none' || owner?.getAttribute('aria-disabled') === 'true' });
    }
    return { elapsedMs: performance.now() - started, panelWidth, samples };
  }, professional.id);
}
async function verifyMotion(browser: Browser) {
  console.log('Professional selection QA: one-second motion and active-profile reselection');
  const viewport = viewports[0], context = await browser.newContext({ viewport, reducedMotion: 'no-preference', serviceWorkers: 'block' });
  const external: string[] = [], errors: string[] = [], state = seed();
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === origin && request.method() === 'GET') return route.continue();
    external.push(request.method() + ' ' + url.origin + url.pathname); return route.abort();
  });
  await context.addInitScript(({ appKey, state, managedKey, profiles }) => {
    localStorage.setItem(appKey, JSON.stringify(state)); localStorage.setItem(managedKey, JSON.stringify(profiles));
  }, { appKey: STORAGE_KEY, state, managedKey, profiles: [child, professional] });
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 120000 }); await archiveThenDrawer(page);
  const translation = () => page.getByTestId('profile-drawer').evaluate(element => { const transform = getComputedStyle(element).transform; return transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m41; });
  await expect.poll(translation).toBeLessThan(0.5); await probeStorage(page);
  const pending = measureDismissal(page);
  void pending.catch(() => undefined);
  await expect.poll(translation, { intervals: [20, 30, 50] }).toBeGreaterThan(60);
  await page.screenshot({ path: resolve(output, 'selection-motion-middle.png') });
  const motion = await pending; await selectionFinished(page, professional.id);
  expect(motion.elapsedMs).toBeGreaterThanOrEqual(850); expect(motion.elapsedMs).toBeLessThan(1800);
  const middle = motion.samples.filter(sample => sample.translateX > 25 && sample.translateX < motion.panelWidth - 25);
  expect(middle.length).toBeGreaterThan(5); expect(middle.every(sample => sample.actionsBlocked)).toBe(true);
  expect(middle.some(sample => sample.backdropOpacity > 0.1 && sample.backdropOpacity < 0.9)).toBe(true);
  const at = (fraction: number) => motion.samples.reduce((best, sample) => Math.abs(sample.elapsedMs - motion.elapsedMs * fraction) < Math.abs(best.elapsedMs - motion.elapsedMs * fraction) ? sample : best);
  expect(at(.25).translateX / (motion.panelWidth + 20)).toBeLessThan(.22);
  expect(at(.75).translateX / (motion.panelWidth + 20)).toBeGreaterThan(.78);
  expect(await page.evaluate(() => (window as ProbeWindow).__kliniSelectionStorage?.writes)).toBe(1);
  await archiveThenDrawer(page); await expect(page.getByTestId('profile-select-' + professional.id)).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(translation).toBeLessThan(0.5);
  const reselect = await measureDismissal(page); await selectionFinished(page, professional.id);
  expect(reselect.elapsedMs).toBeGreaterThanOrEqual(850); expect(reselect.elapsedMs).toBeLessThan(1800);
  await archiveThenDrawer(page); await expect.poll(translation).toBeLessThan(0.5);
  const interruptedPending = measureDismissal(page);
  void interruptedPending.catch(() => undefined);
  await expect.poll(translation, { intervals: [20, 30] }).toBeGreaterThan(20);
  const changedAt = Date.now(); await page.emulateMedia({ reducedMotion: 'reduce' });
  const interrupted = await interruptedPending; await selectionFinished(page, professional.id);
  const afterPreferenceChangeMs = Date.now() - changedAt;
  expect(interrupted.elapsedMs).toBeLessThan(850); expect(afterPreferenceChangeMs).toBeLessThan(500);
  await finish(context, errors, external);
  return { viewport, motion: 'no-preference', selectionDurationMs: motion.elapsedMs, activeReselectionDurationMs: reselect.elapsedMs, slideAndFade: true, actionsBlockedDuringExit: true, reducedMotionDuringExit: true, interruptedDurationMs: interrupted.elapsedMs, afterPreferenceChangeMs, easedQuarterTranslation: at(.25).translateX, easedThreeQuarterTranslation: at(.75).translateX, samples: motion.samples };
}

async function main() {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results: Record<string, unknown>[] = [];
  try {
    for (const viewport of viewports) {
      console.log('Professional selection QA ' + viewport.width + 'x' + viewport.height);
      const state = seed(), ownerId = state.profile.id;
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce', serviceWorkers: 'block' });
      const external: string[] = [], errors: string[] = [];
      await context.route('**/*', route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin === origin && request.method() === 'GET') return route.continue();
        external.push(request.method() + ' ' + url.origin + url.pathname); return route.abort();
      });
      await context.addInitScript(({ appKey, state, managedKey, profiles }) => {
        if (!localStorage.getItem(appKey)) { localStorage.setItem(appKey, JSON.stringify(state)); localStorage.setItem(managedKey, JSON.stringify(profiles)); }
      }, { appKey: STORAGE_KEY, state, managedKey, profiles: [child, professional] });
      const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
      await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await expect(page.getByTestId('header-profile')).toBeVisible({ timeout: 120000 }); await archiveThenDrawer(page);
      await expect(page.getByTestId('profile-select-owner')).toHaveAttribute('aria-pressed', 'true');
      await probeStorage(page);
      await page.getByTestId('profile-close').click(); await expect(page.getByTestId('profile-drawer')).toHaveCount(0);
      await selectedHomePage(page, 'archive'); expect(await selectedId(page)).toBe(ownerId);
      expect(await page.evaluate(() => (window as ProbeWindow).__kliniSelectionStorage?.writes)).toBe(0);
      await drawer(page);
      const row = page.getByTestId('profile-select-' + professional.id);
      const reducedStart = Date.now();
      await row.evaluate(element => { (element as HTMLElement).click(); (element as HTMLElement).click(); });
      await selectionFinished(page, professional.id);
      const reducedDismissMs = Date.now() - reducedStart;
      expect(reducedDismissMs).toBeLessThan(700);
      await expect(page.getByTestId('header-professional-avatar')).toHaveCount(1);
      await expect(page.getByTestId('header-profile')).toHaveAttribute('aria-label', /Sofía Martínez, Oncología Médica/);
      const selected = await stored(page);
      for (const key of clinicalKeys) { expect(selected[key]).toEqual([]); expect(selected.family!.profiles[ownerId][key]).toEqual(state[key]); }
      expect(selected.family!.profiles[professional.id].professional).toMatchObject({ id: professional.id, name: state.profile.name, specialty: 'Oncología Médica' });
      expect(selected.family!.profiles[professional.id].professional).not.toHaveProperty('verification');
      expect(await page.evaluate(() => (window as ProbeWindow).__kliniSelectionStorage?.writes)).toBe(1);
      await page.screenshot({ path: resolve(output, 'header-professional-' + viewport.width + 'x' + viewport.height + '.png') });
      await drawer(page); await expect(row).toHaveAttribute('aria-pressed', 'true');
      await row.scrollIntoViewIfNeeded(); await layout(page); await page.screenshot({ path: resolve(output, 'selected-' + viewport.width + 'x' + viewport.height + '.png') });
      await page.reload({ waitUntil: 'domcontentloaded' }); await drawer(page);
      await expect(row).toHaveAttribute('aria-pressed', 'true'); await expect(page.getByTestId('header-professional-avatar')).toHaveCount(1);
      await expect.poll(() => selectedId(page)).toBe(professional.id);
      await page.getByTestId('profile-select-' + child.id).click(); await selectionFinished(page, child.id);
      await expect(page.getByTestId('header-professional-avatar')).toHaveCount(0);
      expect((await stored(page)).records.map(record => record.id)).toEqual(['qa-child-exclusive-note']);
      await drawer(page);
      await page.getByTestId('managed-profile-' + professional.id).click();
      await expect(page.getByTestId('professional-profile-form')).toBeVisible();
      await expect(page.getByTestId('professional-profile-name')).toHaveValue(state.profile.name);
      await expect(page.getByTestId('professional-profile-name')).not.toBeEditable();
      await expect(page.getByTestId('professional-profile-license')).toHaveValue('111111');
      await expect(page.getByTestId('professional-profile-specialty')).toContainText('Oncología Médica');
      expect(await selectedId(page)).toBe(child.id); await expect(page.getByTestId('header-professional-avatar')).toHaveCount(0);
      await expect(page.getByTestId('profile-drawer')).toBeVisible();
      await page.getByTestId('profile-back').click();
      await page.getByTestId('profile-info-avatar-' + professional.id).click(); await selectionFinished(page, professional.id);
      await drawer(page); await expect(row).toHaveAttribute('aria-pressed', 'true');
      // Selecting the already active profile also dismisses the drawer and restores Hoy.
      await page.getByTestId('profile-close').click(); await expect(page.getByTestId('profile-drawer')).toHaveCount(0);
      await archiveThenDrawer(page); await row.click(); await selectionFinished(page, professional.id);
      // A direct profile URL has no preceding modal navigation to rely on.
      await page.goto(origin + '/profile', { waitUntil: 'domcontentloaded' }); await drawer(page);
      await page.getByTestId('profile-select-owner').click(); await selectionFinished(page, ownerId);
      const restored = await stored(page); for (const key of clinicalKeys) expect(restored[key]).toEqual(state[key]);
      await expect(page.getByTestId('header-professional-avatar')).toHaveCount(0);
      if (viewport.width === 393) {
        await archiveThenDrawer(page); await probeStorage(page, true); await row.click();
        await expect(page.getByText('No se pudo guardar el cambio de perfil. Intenta de nuevo.', { exact: true })).toBeVisible();
        await expect(page.getByTestId('profile-select-owner')).toHaveAttribute('aria-pressed', 'true');
        await expect.poll(() => selectedId(page)).toBe(ownerId); await expect(page.getByTestId('header-professional-avatar')).toHaveCount(0);
        await expect(page.getByTestId('profile-drawer')).toBeVisible();
        await selectedHomePage(page, 'archive');
        await page.screenshot({ path: resolve(output, 'storage-failure-remains-open.png') });
        await row.click(); await selectionFinished(page, professional.id);
        await expect(page.getByText('No se pudo guardar el cambio de perfil. Intenta de nuevo.', { exact: true })).toHaveCount(0);
        await page.screenshot({ path: resolve(output, 'retry-after-storage-failure.png') });
      }
      await finish(context, errors, external);
      results.push({ viewport, selectedByRowAndAvatar: true, editorSeparate: true, clinicalContextsIsolated: true, persistsAfterReload: true, singleWriteOnDoubleTap: true, autoDismiss: true, returnsArchiveToToday: true, manualClosePreservesArchiveWithoutSelectionWrite: true, directProfileNavigation: true, reselectActiveDismisses: true, reducedDismissMs, rollbackAndRetry: viewport.width === 393 });
    }
    results.push(await verifyMotion(browser));
    await writeFile(resolve(output, 'result.json'), JSON.stringify({ passed: true, syntheticOnly: true, noExternalTraffic: true, noIdentityRecording: true, results }, null, 2));
    console.log('Professional selection QA PASS at 393/320/compact sizes.');
  } catch (error) {
    const last = browser.contexts().flatMap(context => context.pages()).at(-1);
    if (last) await last.screenshot({ path: resolve(output, 'failure.png') }).catch(() => undefined);
    await writeFile(resolve(output, 'result.json'), JSON.stringify({ passed: false, completed: results, error: error instanceof Error ? error.message : String(error) }, null, 2)); throw error;
  } finally { await browser.close(); }
}
void main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
