import { chromium, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createDemoState } from '../src/domain/seed';
import { hydrateState, STORAGE_KEY, validateAppState } from '../src/domain/reducer';
import { switchProfile } from '../src/domain/family';
import type { AppState } from '../src/domain/types';
import type { ManagedDoctorProfile, ManagedPatientProfile } from '../src/domain/managedProfiles';

// Isolated UI fixtures only. This never contacts Stripe, authenticated APIs, or native payment SDKs.
const origin = 'http://127.0.0.1:8097';
const output = resolve('test-results/subscription-upgrade');
const fixedTime = '2026-11-12T18:00:00.000Z';
const readonlyRoute = resolve('src/app/subscription-upgrade-qa.tsx');
const readonlySource = `// TEMPORARY: generated and removed by scripts/verify-subscription-upgrade.ts.
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import SubscriptionPackagesPanel from '../components/SubscriptionPackagesPanel';
export default function SubscriptionUpgradeQA() {
  const [open, setOpen] = useState(true);
  return <View style={{ flex: 1, paddingTop: 30, paddingBottom: 20, backgroundColor: 'white' }}>{open ? <SubscriptionPackagesPanel onBack={() => setOpen(false)} onClose={() => setOpen(false)} demoUpgradeEnabled={false} /> : <Text testID="subscription-readonly-closed">Panel cerrado</Text>}</View>;
}
`;
const viewports = [{ width: 393, height: 852 }, { width: 320, height: 640 }, { width: 320, height: 400 }];
const orderedPlans = [
  { id: 'free', name: 'Gratuita', price: 0 },
  { id: 'basic', name: 'Básica', price: 50 },
  { id: 'pro', name: 'Pro', price: 99 },
  { id: 'integrated-ai', name: 'IA Integrada', price: 199 },
  { id: 'ai-max', name: 'IA MAX', price: 299 },
];
const professional: ManagedDoctorProfile = { id: 'demo-sofia-medical-oncology-v1', name: 'Sofía Martínez', kind: 'Profesional de la salud', professionalType: 'doctor', licenseNumber: '111111', specialty: 'Oncología Médica', demo: 'sofia-medical-oncology-v1' };
const child: ManagedPatientProfile = { id: 'qa-child-subscription', name: 'Paciente menor QA', kind: 'Niño' };
type Probe = { writes: number; failures: number; candidates: unknown[] };
type ProbeWindow = Window & { __kliniSubscriptionQA?: Probe };
type Run = { context: BrowserContext; page: Page; before: AppState; errors: string[]; external: string[] };

function seed(): AppState {
  let state = switchProfile(createDemoState(new Date(fixedTime)), child);
  state = switchProfile(state, professional); state = switchProfile(state);
  const restored = hydrateState(JSON.stringify(state), createDemoState(new Date(fixedTime))).state;
  if (!validateAppState(restored) || !restored.aiSubscription || restored.subscriptionPlan) throw new Error('The synthetic legacy Pro subscription fixture is invalid.');
  return restored;
}
const stored = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}') as AppState, STORAGE_KEY);
async function open(browser: Browser, viewport = viewports[0], path = '/'): Promise<Run> {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const external: string[] = [], errors: string[] = [], before = seed();
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === origin && request.method() === 'GET') return route.continue();
    external.push(request.method() + ' ' + url.origin + url.pathname); return route.abort();
  });
  await context.addInitScript(({ key, state, profiles }) => {
    if (!localStorage.getItem(key)) { localStorage.setItem(key, JSON.stringify(state)); localStorage.setItem('klini-managed-profiles-v1:patient-sofia', JSON.stringify(profiles)); }
  }, { key: STORAGE_KEY, state: before, profiles: [child, professional] });
  const page = await context.newPage(); page.setDefaultTimeout(10000); page.on('pageerror', error => errors.push(error.message));
  await page.clock.setFixedTime(new Date(fixedTime));
  await page.goto(origin + path, { waitUntil: 'domcontentloaded', timeout: 120000 });
  return { context, page, before, errors, external };
}
async function wallet(page: Page) {
  if (new URL(page.url()).pathname !== '/wallet') {
    await page.getByTestId('header-menu').click();
    await page.getByTestId('nav-wallet').click();
  }
  await expect(page.getByTestId('wallet-packages-open')).toBeVisible();
}
async function packages(page: Page) {
  await wallet(page); await page.getByTestId('wallet-packages-open').click();
  await expect(page.getByTestId('subscription-packages')).toBeVisible();
  await allPlansInPriceOrder(page);
}
async function allPlansInPriceOrder(page: Page) {
  const list = page.getByTestId('subscription-plan-list');
  await expect(list).toBeVisible();
  await expect(page.getByTestId('subscription-all-plans')).toHaveCount(0);
  await expect(list.locator('[data-testid^="subscription-package-"][data-testid$="-name"]')).toHaveText(orderedPlans.map(plan => plan.name));
  await expect(list.locator('[data-testid^="subscription-package-"][data-testid$="-price"]')).toHaveText(orderedPlans.map(plan => `$${plan.price} MXN / mes`));
  for (const plan of orderedPlans) await expect(list.getByTestId('subscription-package-' + plan.id)).toHaveCount(1);
}
async function plan(page: Page) {
  await page.getByTestId('subscription-upgrade-start').click();
  await expect(page.getByTestId('subscription-upgrade-continue')).toBeVisible();
}
async function payment(page: Page) {
  await page.getByTestId('subscription-upgrade-continue').click();
  await expect(page.getByTestId('subscription-payment-review')).toBeVisible();
}
async function confirmation(page: Page) {
  await page.getByTestId('subscription-payment-review').click();
  await expect(page.getByTestId('subscription-upgrade-confirm')).toBeVisible();
}
async function untouched(run: Run) {
  const state = await stored(run.page);
  expect(state.subscriptionPlan).toBeUndefined(); expect(state.aiSubscription).toEqual(run.before.aiSubscription); expect(state.wallet).toEqual(run.before.wallet);
  for (const id of [child.id, professional.id]) expect(state.family!.profiles[id]).toEqual(run.before.family!.profiles[id]);
}
async function unchangedAccessAndFunds(run: Run) {
  const state = await stored(run.page);
  expect(state.wallet).toEqual(run.before.wallet);
  for (const [id, expected] of Object.entries(run.before.family!.profiles)) {
    expect(state.family!.profiles[id]).toEqual(expected);
    if (id === state.profile.id) expect(state.aiSubscription).toEqual(expected.aiSubscription);
  }
}
async function probeStorage(page: Page, failOnce = false) {
  await page.evaluate(({ key, failOnce }) => {
    const original = Storage.prototype.setItem, probe: Probe = { writes: 0, failures: failOnce ? 1 : 0, candidates: [] };
    (window as ProbeWindow).__kliniSubscriptionQA = probe;
    Storage.prototype.setItem = function (storageKey: string, value: string) {
      if (this === window.localStorage && storageKey === key) {
        probe.writes++;
        const state = JSON.parse(value) as AppState;
        if (state.subscriptionPlan) probe.candidates.push(state.subscriptionPlan);
        if (probe.failures > 0) { probe.failures--; throw new DOMException('Synthetic subscription write failure', 'QuotaExceededError'); }
      }
      original.call(this, storageKey, value);
    };
  }, { key: STORAGE_KEY, failOnce });
}
async function layout(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const panel = page.getByTestId('subscription-packages'), viewport = page.viewportSize()!;
  const bounds = await panel.boundingBox(); expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(-1); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(bounds!.y).toBeGreaterThanOrEqual(-1); expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height + 1);
  expect(await panel.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  for (const id of ['subscription-upgrade-start', 'subscription-upgrade-continue', 'subscription-payment-review', 'subscription-upgrade-confirm', 'subscription-upgrade-return']) {
    const action = page.getByTestId(id);
    if (await action.count()) await expect(action).toBeInViewport({ ratio: 1 });
  }
}
async function snapshot(page: Page, name: string) { await layout(page); await page.screenshot({ path: resolve(output, name + '.png') }); }
async function finish(run: Run) { expect(run.errors).toEqual([]); expect(run.external).toEqual([]); await run.context.close(); }
async function chooseMethod(page: Page, method: 'visa' | 'mastercard' | 'apple-pay') {
  const button = page.getByTestId('subscription-payment-' + method);
  if (!await button.count()) await page.getByTestId('subscription-other-card').click();
  await button.click();
  await expect(page.getByTestId('subscription-payment-review')).toBeVisible();
}
async function confirmedConsent(page: Page) {
  const confirm = page.getByTestId('subscription-upgrade-confirm'), consent = page.getByTestId('subscription-upgrade-consent');
  await expect(confirm).toBeDisabled(); await expect(consent).toHaveAttribute('aria-checked', 'false');
  await consent.click(); await expect(consent).toHaveAttribute('aria-checked', 'true'); await expect(confirm).toBeEnabled();
}
async function closePackages(page: Page) {
  await page.getByTestId('subscription-upgrade-close').click(); await expect(page.getByTestId('wallet-sheet')).toHaveCount(0);
}
async function selectProfile(page: Page, id: string) {
  await page.getByTestId('header-profile').click();
  await page.getByTestId(id === 'patient-sofia' ? 'profile-select-owner' : 'profile-select-' + id).click();
  await expect(page.getByTestId('profile-drawer')).toHaveCount(0);
  await expect.poll(async () => (await stored(page)).profile.id).toBe(id);
}
async function happyScenarios(browser: Browser, results: Record<string, unknown>[]) {
  for (const [index, viewport] of viewports.entries()) {
    const method = (['visa', 'mastercard', 'apple-pay'] as const)[index];
    console.log('Subscription upgrade QA: success ' + viewport.width + 'x' + viewport.height + ' ' + method);
    const run = await open(browser, viewport), { page } = run;
    await packages(page);
    await expect(page.getByTestId('subscription-current-plan')).toContainText('Pro');
    await expect(page.getByTestId('subscription-next-plan')).toContainText('IA Integrada');
    await snapshot(page, 'overview-' + viewport.width + 'x' + viewport.height);
    await plan(page); await untouched(run); await snapshot(page, 'plan-' + viewport.width + 'x' + viewport.height);
    await expect(page.getByTestId('subscription-prorated-amount')).toHaveText('$48.39 MXN');
    await expect(page.getByTestId('subscription-renewal-date')).toContainText(/27.*nov.*2026/i);
    await payment(page); await chooseMethod(page, method); await snapshot(page, 'method-' + viewport.width + 'x' + viewport.height);
    await expect(page.getByTestId('subscription-payment-amount')).toContainText('$48.39');
    await expect(page.getByTestId('subscription-packages').locator('input')).toHaveCount(0);
    await confirmation(page);
    await expect(page.getByTestId('subscription-packages')).toContainText('$48.39');
    await expect(page.getByTestId('subscription-review-method')).toContainText(method === 'apple-pay' ? 'Apple Pay' : method === 'mastercard' ? /Mastercard/i : 'Visa');
    await confirmedConsent(page); await untouched(run); await snapshot(page, 'confirm-' + viewport.width + 'x' + viewport.height);
    await probeStorage(page);
    await page.getByTestId('subscription-upgrade-confirm').evaluate(element => { (element as HTMLElement).click(); (element as HTMLElement).click(); });
    await expect(page.getByTestId('subscription-upgrade-success')).toBeVisible();
    await expect.poll(async () => (await stored(page)).subscriptionPlan?.planId).toBe('integrated-ai');
    const first = (await stored(page)).subscriptionPlan!;
    expect(first.receipt).toMatchObject({ accountId: run.before.family!.ownerId, fromPlanId: 'pro', toPlanId: 'integrated-ai', amountCents: 4839, remainingDays: 15, totalDays: 31, periodSource: 'example', periodStart: '2026-10-27', periodEnd: '2026-11-27', currency: 'MXN' });
    expect(first.receipt).not.toHaveProperty('profileId'); expect(first.receipt).not.toHaveProperty('paymentMethod');
    expect(await page.evaluate(() => (window as ProbeWindow).__kliniSubscriptionQA?.writes)).toBe(1);
    await unchangedAccessAndFunds(run); await page.getByTestId('subscription-upgrade-return').scrollIntoViewIfNeeded();
    await snapshot(page, 'success-' + viewport.width + 'x' + viewport.height);
    await page.reload({ waitUntil: 'domcontentloaded' }); await packages(page);
    await expect(page.getByTestId('subscription-current-plan')).toContainText('IA Integrada');
    await expect(page.getByTestId('subscription-next-plan')).toContainText('IA MAX');
    await unchangedAccessAndFunds(run);
    if (index === 0) {
      await closePackages(page); await selectProfile(page, child.id); await packages(page);
      await expect(page.getByTestId('subscription-current-plan')).toContainText('IA Integrada');
      await expect(page.getByTestId('subscription-next-plan')).toContainText('IA MAX');
      await unchangedAccessAndFunds(run);
      await closePackages(page); await selectProfile(page, professional.id); await packages(page);
      await expect(page.getByTestId('subscription-current-plan')).toContainText('IA Integrada');
      await plan(page); await payment(page); await chooseMethod(page, 'apple-pay'); await confirmation(page); await confirmedConsent(page);
      await page.getByTestId('subscription-upgrade-confirm').click(); await expect(page.getByTestId('subscription-upgrade-success')).toBeVisible();
      const max = (await stored(page)).subscriptionPlan!;
      expect(max.planId).toBe('ai-max'); expect(max.receipt).toMatchObject({ accountId: run.before.family!.ownerId, fromPlanId: 'integrated-ai', toPlanId: 'ai-max', amountCents: 4839, basisUpgradeId: first.upgradeId, periodSource: 'stored', periodEnd: first.periodEnd });
      await page.getByTestId('subscription-upgrade-return').click();
      await expect(page.getByTestId('subscription-current-plan')).toContainText('IA MAX');
      await expect(page.getByTestId('subscription-next-plan')).toHaveCount(0); await expect(page.getByTestId('subscription-upgrade-start')).toHaveCount(0);
      await unchangedAccessAndFunds(run); await snapshot(page, 'max-no-next-plan');
      await closePackages(page); await selectProfile(page, run.before.family!.ownerId); await packages(page);
      await expect(page.getByTestId('subscription-current-plan')).toContainText('IA MAX'); await unchangedAccessAndFunds(run);
    }
    await finish(run); results.push({ viewport, scenario: 'persistent-upgrade-' + method, singleWriteForDoubleTap: true, proratedCents: 4839, globalAcrossProfiles: index === 0, maxWithoutNext: index === 0 });
  }
}
async function navigationScenario(browser: Browser, results: Record<string, unknown>[]) {
  console.log('Subscription upgrade QA: cancellation, methods, terms, back and Escape');
  const run = await open(browser), { page } = run;
  await packages(page); await plan(page); await closePackages(page); await untouched(run);
  await packages(page); await plan(page); await payment(page); await chooseMethod(page, 'mastercard'); await confirmation(page); await confirmedConsent(page);
  await page.getByTestId('subscription-upgrade-back').click(); await expect(page.getByTestId('subscription-payment-review')).toBeVisible();
  await confirmation(page); await expect(page.getByTestId('subscription-upgrade-consent')).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByTestId('subscription-upgrade-confirm')).toBeDisabled();
  await page.getByTestId('subscription-upgrade-back').click(); await chooseMethod(page, 'visa'); await confirmation(page);
  await expect(page.getByTestId('subscription-packages')).toContainText('Visa');
  await expect(page.getByTestId('subscription-upgrade-consent')).toHaveAttribute('aria-checked', 'false');
  await page.getByTestId('subscription-upgrade-terms').click();
  await expect(page.getByTestId('subscription-terms-panel')).toBeVisible();
  await expect(page.getByTestId('subscription-terms-close')).toBeVisible();
  await page.getByTestId('subscription-terms-close').click();
  await expect(page.getByTestId('subscription-upgrade-confirm')).toBeVisible();
  await expect(page.getByTestId('subscription-packages')).toContainText('$48.39');
  await confirmedConsent(page); await page.keyboard.press('Escape');
  await expect(page.getByTestId('subscription-payment-review')).toBeVisible();
  await confirmation(page); await expect(page.getByTestId('subscription-upgrade-consent')).toHaveAttribute('aria-checked', 'false');
  await page.keyboard.press('Escape'); await expect(page.getByTestId('subscription-payment-review')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.getByTestId('subscription-upgrade-continue')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.getByTestId('subscription-current-plan')).toContainText('Pro');
  await page.keyboard.press('Escape'); await expect(page.getByTestId('wallet-packages-open')).toBeVisible();
  await untouched(run); await finish(run); results.push({ scenario: 'back-escape-terms-cancel-without-write', consentResets: true, methodReviewed: true });
}
async function failureScenario(browser: Browser, results: Record<string, unknown>[]) {
  console.log('Subscription upgrade QA: storage failure preserves immutable quote and selected method');
  const run = await open(browser), { page } = run;
  await packages(page); await plan(page); await payment(page); await chooseMethod(page, 'mastercard'); await confirmation(page); await confirmedConsent(page);
  await probeStorage(page, true); await page.getByTestId('subscription-upgrade-confirm').click();
  await expect(page.getByTestId('subscription-upgrade-error')).toBeVisible();
  await expect(page.getByTestId('subscription-upgrade-confirm')).toBeVisible();
  await expect(page.getByTestId('subscription-upgrade-consent')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('subscription-packages')).toContainText(/Mastercard/i);
  await expect(page.getByTestId('subscription-packages')).toContainText('$48.39'); await untouched(run);
  const failed = await page.evaluate(() => (window as ProbeWindow).__kliniSubscriptionQA?.candidates[0]) as { upgradeId: string; receipt: unknown };
  expect(failed).toBeTruthy(); await snapshot(page, 'storage-failure-retry');
  await page.getByTestId('subscription-upgrade-confirm').click(); await expect(page.getByTestId('subscription-upgrade-success')).toBeVisible();
  const recovered = (await stored(page)).subscriptionPlan!;
  expect(recovered.upgradeId).toBe(failed.upgradeId); expect(recovered.receipt).toEqual(failed.receipt);
  await unchangedAccessAndFunds(run); await finish(run); results.push({ scenario: 'storage-failure-rollback-exact-quote-retry', sameUpgradeId: true, selectedMethodPreserved: true });
}
async function readonlyScenario(browser: Browser, results: Record<string, unknown>[]) {
  console.log('Subscription upgrade QA: connected-account readonly catalog');
  const run = await open(browser, viewports[0], '/subscription-upgrade-qa'), { page } = run;
  await expect(page.getByTestId('subscription-packages')).toBeVisible({ timeout: 120000 });
  await allPlansInPriceOrder(page);
  await expect(page.getByText('Planes de Klini', { exact: true })).toBeVisible();
  await expect(page.getByTestId('subscription-current-plan').getByText('Plan de ejemplo', { exact: true })).toBeVisible();
  await expect(page.getByTestId('subscription-next-plan').getByText('SIGUIENTE NIVEL', { exact: true })).toBeVisible();
  await expect(page.getByText('Comparación de planes de ejemplo', { exact: true })).toBeVisible();
  await expect(page.getByText('Un plan para toda tu cuenta', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('subscription-upgrade-start')).toBeDisabled();
  await page.getByTestId('subscription-upgrade-start').evaluate(element => (element as HTMLElement).click());
  await expect(page.getByTestId('subscription-upgrade-continue')).toHaveCount(0);
  await expect(page.getByTestId('subscription-payment-review')).toHaveCount(0);
  await expect(page.getByTestId('subscription-upgrade-confirm')).toHaveCount(0);
  await untouched(run); await snapshot(page, 'connected-catalog-readonly');
  await page.getByTestId('subscription-upgrade-close').click(); await expect(page.getByTestId('subscription-readonly-closed')).toBeVisible();
  await untouched(run); await finish(run); results.push({ scenario: 'connected-catalog-readonly-no-demo-confirmation', noEnabledPurchaseControls: true, exampleLabels: true, allFivePlansInPriceOrderOnEntry: true });
}
async function overviewScenarios(browser: Browser, results: Record<string, unknown>[]) {
  for (const viewport of viewports) {
    console.log('Subscription upgrade QA: overview capture ' + viewport.width + 'x' + viewport.height);
    const run = await open(browser, viewport), { page } = run;
    await packages(page);
    await expect(page.getByTestId('subscription-current-plan')).toContainText('Pro');
    await expect(page.getByTestId('subscription-next-plan')).toContainText('IA Integrada');
    await expect(page.getByTestId('subscription-package-pro-price')).toContainText('$99');
    await expect(page.getByTestId('subscription-package-integrated-ai-price')).toContainText('$199');
    await snapshot(page, 'overview-' + viewport.width + 'x' + viewport.height);
    await untouched(run); await finish(run); results.push({ viewport, scenario: 'initial-overview-all-five-plans-price-order', noChanges: true, allFivePlansInPriceOrderOnEntry: true });
  }
}

async function main() {
  await mkdir(output, { recursive: true });
  try { await access(readonlyRoute); throw new Error('Refusing to overwrite an existing subscription QA route.'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  await writeFile(readonlyRoute, readonlySource, 'utf8');
  let browser: Browser | undefined;
  const results: Record<string, unknown>[] = [];
  const overviewOnly = process.argv.includes('--overview-only');
  const reportFile = resolve(output, overviewOnly ? 'overview-result.json' : 'result.json');
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    if (overviewOnly) { await overviewScenarios(browser, results); await readonlyScenario(browser, results); }
    else { await happyScenarios(browser, results); await navigationScenario(browser, results); await failureScenario(browser, results); await readonlyScenario(browser, results); }
    await writeFile(reportFile, JSON.stringify({ passed: true, syntheticOnly: true, noExternalTraffic: true, noNativePayments: true, unchangedLegacyAiAndWallet: true, results }, null, 2));
    console.log('Subscription upgrade QA PASS: ' + results.length + ' isolated scenarios.');
  } catch (error) {
    const page = browser?.contexts().flatMap(context => context.pages()).at(-1);
    if (page) await page.screenshot({ path: resolve(output, 'failure.png') }).catch(() => undefined);
    await writeFile(reportFile, JSON.stringify({ passed: false, completed: results, error: error instanceof Error ? error.message : String(error) }, null, 2)); throw error;
  } finally {
    await browser?.close();
    if (await readFile(readonlyRoute, 'utf8') === readonlySource) await unlink(readonlyRoute);
    else throw new Error('The temporary subscription QA route changed externally; it was not removed.');
  }
}
void main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
