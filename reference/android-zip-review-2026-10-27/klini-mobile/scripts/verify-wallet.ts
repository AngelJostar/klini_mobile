import { chromium, expect, type Browser, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createDemoState } from '../src/domain/seed';
import { createAiSubscription } from '../src/domain/aiSubscription';
import { captureProfile } from '../src/domain/family';
import { STORAGE_KEY } from '../src/domain/reducer';
import type { AppState } from '../src/domain/types';
import type { Wallet } from '../src/domain/wallet';

const origin = process.env.KLINI_WALLET_QA_ORIGIN || 'http://127.0.0.1:8096';
const output = 'test-results/wallet';
const tokenOnly = process.env.KLINI_WALLET_QA_SCOPE === 'tokens';
const packagesOnly = process.env.KLINI_WALLET_QA_SCOPE === 'packages';
const rechargeOnly = process.env.KLINI_WALLET_QA_SCOPE === 'recharge';
const geometryOnly = process.env.KLINI_WALLET_QA_SCOPE === 'geometry';
const smallRechargeOnly = process.env.KLINI_WALLET_QA_SCOPE === 'small';
const id = (page: Page, value: string) => page.locator(`[data-testid="${value}"]:visible`);
const readState = (page: Page): Promise<AppState> => page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), STORAGE_KEY);
type Controls = Window & { __walletFailWrites?: number; __walletWrites?: number };
type TokenMode = 'error' | 'success' | 'timeout' | 'late';
function releaseTokens(tokens: { release?: () => void }) { tokens.release?.(); tokens.release = undefined; }

function fixture() {
  const state = createDemoState(new Date('2026-11-09T12:00:00-06:00'));
  state.profile = { ...state.profile, id: 'qa-wallet-owner', name: 'Perfil billetera QA' };
  state.medicationReminderDemoVersion = 1;
  state.medicationCare = { treatments: [], takes: [], alerts: [] };
  state.aiSubscription = createAiSubscription(true, undefined, Date.parse('2026-11-09T18:00:00.000Z'));
  state.wallet = { balance: 860, movements: [
    { id: 'qa-wallet-newest', date: '9/11/2026', concept: 'Recarga previa QA', amount: 300 },
    { id: 'qa-wallet-middle', date: '8/11/2026', concept: 'Consumo previo QA', amount: -40 },
    { id: 'qa-wallet-oldest', date: '7/11/2026', concept: 'Movimiento anterior QA', amount: 600 },
  ] };
  state.family = { ownerId: state.profile.id, profiles: { [state.profile.id]: captureProfile(state, 'Perfil principal') } };
  return state;
}

async function harness(browser: Browser, width: number, reducedMotion: 'reduce' | 'no-preference' = 'reduce', height = width === 393 ? 852 : 640, emptyMovements = false) {
  const context = await browser.newContext({ viewport: { width, height }, timezoneId: 'America/Mexico_City', reducedMotion });
  const errors: string[] = [], forbidden: string[] = [];
  const tokens: { mode: TokenMode; requests: number; release?: () => void } = { mode: 'error', requests: 0 };
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() === 'GET' && url.pathname.endsWith('/wallet/tokens')) {
      tokens.requests++;
      if (tokens.mode === 'late' || tokens.mode === 'timeout') await new Promise<void>(resolve => { tokens.release = resolve; });
      if (tokens.mode === 'error') await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
      else await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true' }, body: JSON.stringify({ balance: 17, movements: [{ id: 101, amount: 20, concept: 'Ingreso de Tokens QA', created_at: '2026-11-09T18:00:00Z' }, { id: 102, amount: -3, concept: 'Consumo de Tokens QA', created_at: '2026-11-08T18:00:00Z' }] }) }).catch(() => undefined);
    } else if (url.origin !== origin || request.method() !== 'GET') {
      forbidden.push(`${request.method()} ${url.origin}${url.pathname}`); await route.abort();
    } else await route.continue();
  });
  const initial = fixture();
  if (emptyMovements) initial.wallet!.movements = [];
  await context.addInitScript(({ state, key }) => {
    if (!sessionStorage.getItem('qa-wallet-fixture')) {
      localStorage.setItem(key, JSON.stringify(state)); sessionStorage.setItem('qa-wallet-fixture', '1');
    }
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(storageKey: string, value: string) {
      const controls = window as Controls;
      if (this === localStorage && storageKey === key) {
        controls.__walletWrites = (controls.__walletWrites || 0) + 1;
        if ((controls.__walletFailWrites || 0) > 0) { controls.__walletFailWrites!--; throw new DOMException('Synthetic wallet storage failure.', 'QuotaExceededError'); }
      }
      return original.call(this, storageKey, value);
    };
  }, { state: initial, key: STORAGE_KEY });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install({ time: new Date('2026-11-09T12:00:00-06:00') });
  return { context, page, errors, forbidden, tokens };
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  const bounds = await id(page, 'wallet-sheet').boundingBox();
  expect(bounds).not.toBeNull(); expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
}

type SheetBounds = { x: number; y: number; width: number; height: number };
async function sheetBounds(page: Page): Promise<SheetBounds> {
  await noOverflow(page);
  return (await id(page, 'wallet-sheet').boundingBox())!;
}

async function sameSheet(page: Page, original: SheetBounds) {
  const current = await sheetBounds(page);
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    expect(Math.abs(current[key] - original[key]), `The wallet frame must keep the same ${key} throughout recharge`).toBeLessThanOrEqual(1);
  }
}

const packages = [
  { id: 'free', name: 'Gratuita', price: 0, storage: '50 MB' },
  { id: 'basic', name: 'Básica', price: 50, storage: '500 MB' },
  { id: 'pro', name: 'Pro', price: 99, storage: '2 GB' },
  { id: 'integrated-ai', name: 'IA Integrada', price: 199, storage: '5 GB' },
  { id: 'ai-max', name: 'IA MAX', price: 299, storage: '10 GB' },
];

async function verifyPackageBrowsing(page: Page, label: string, entry: 'wallet-packages-open' | 'wallet-upgrade-open' = 'wallet-upgrade-open', dismiss: 'back' | 'escape' = 'back', current: 'pro' | 'free' = 'pro') {
  const before = await readState(page);
  await page.evaluate(() => { (window as Controls).__walletWrites = 0; });
  await id(page, entry).click();
  await expect(id(page, 'subscription-packages')).toBeVisible();
  await expect(page.getByText('Tu suscripción', { exact: true })).toBeVisible();
  await expect(page.getByText('Un plan para toda tu cuenta', { exact: true })).toBeVisible();
  const currentIndex = packages.findIndex(plan => plan.id === current);
  const currentPlan = packages[currentIndex], nextPlan = packages[currentIndex + 1];
  await expect(id(page, 'subscription-current-plan').getByTestId(`subscription-package-${currentPlan.id}-name`)).toHaveText(currentPlan.name);
  await expect(id(page, 'subscription-current-plan').getByTestId(`subscription-package-${currentPlan.id}-price`)).toHaveText(`$${currentPlan.price} MXN / mes`);
  await expect(id(page, 'subscription-next-plan').getByTestId(`subscription-package-${nextPlan.id}-name`)).toHaveText(nextPlan.name);
  await expect(id(page, 'subscription-next-plan').getByTestId(`subscription-package-${nextPlan.id}-price`)).toHaveText(`$${nextPlan.price} MXN / mes`);
  await expect(id(page, 'subscription-upgrade-start')).toBeEnabled();
  await expect(page.getByTestId('subscription-all-plans')).toHaveCount(0);
  const planList = id(page, 'subscription-plan-list');
  await expect(planList.locator('[data-testid^="subscription-package-"][data-testid$="-name"]')).toHaveText(packages.map(plan => plan.name));
  await expect(planList.locator('[data-testid^="subscription-package-"][data-testid$="-price"]')).toHaveText(packages.map(plan => `$${plan.price} MXN / mes`));
  for (const plan of packages) await expect(planList.getByTestId(`subscription-package-${plan.id}`)).toHaveCount(1);
  await noOverflow(page);
  await page.screenshot({ path: `${output}/packages-top-${label}.png` });
  for (const plan of packages) {
    const card = id(page, `subscription-package-${plan.id}`);
    await card.scrollIntoViewIfNeeded();
    await expect(id(page, `subscription-package-${plan.id}-name`)).toHaveText(plan.name);
    await expect(id(page, `subscription-package-${plan.id}-price`)).toHaveText(`$${plan.price} MXN / mes`);
    await expect(id(page, `subscription-package-${plan.id}-storage`)).toHaveText(`${plan.storage} de almacenamiento`);
    const bounds = await card.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  }
  await page.getByText('Capacidad y beneficios propuestos para esta demostración.', { exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByText('Capacidad y beneficios propuestos para esta demostración.', { exact: true })).toBeVisible();
  await expect(page.getByText('Demostración · Sin cargos reales', { exact: true })).toBeVisible();
  await expect(id(page, 'subscription-manage-ai')).toBeEnabled();
  await noOverflow(page);
  await page.screenshot({ path: `${output}/packages-bottom-${label}.png` });
  expect(await readState(page)).toEqual(before);
  expect(await page.evaluate(() => (window as Controls).__walletWrites || 0)).toBe(0);
  if (dismiss === 'escape') await page.keyboard.press('Escape');
  else await id(page, 'subscription-upgrade-back').click();
  await expect(id(page, 'wallet-balance')).toBeVisible();
  await expect(id(page, 'subscription-packages')).toHaveCount(0);
  expect(await readState(page)).toEqual(before);
  expect(await page.evaluate(() => (window as Controls).__walletWrites || 0)).toBe(0);
}

async function verifyRecharge(page: Page, label: string): Promise<Wallet> {
  const before = (await readState(page)).wallet!;
  const geometry = await sheetBounds(page);
  await page.evaluate(() => { (window as Controls).__walletWrites = 0; });
  await id(page, 'wallet-recharge-open').click();
  await expect(id(page, 'wallet-balance')).toHaveCount(0);
  await expect(id(page, 'wallet-amount')).toHaveValue('200');
  await sameSheet(page, geometry);
  const apple = id(page, 'wallet-payment-apple-pay');
  const card = id(page, 'wallet-payment-card');
  await expect(apple).toHaveAttribute('aria-checked', 'true');
  await expect(card).toHaveAttribute('aria-checked', 'false');
  expect((await apple.boundingBox())!.y).toBeLessThan((await card.boundingBox())!.y);
  expect((await apple.boundingBox())!.y).toBeLessThan((await id(page, 'wallet-amount').boundingBox())!.y);
  await expect(page.getByText('Demostración · sin cargos reales', { exact: true })).toBeVisible();
  await expect(id(page, 'wallet-recharge-form').locator('input')).toHaveCount(1);
  await page.screenshot({ path: `${output}/recharge-methods-${label}.png` });

  await card.click();
  await expect(card).toHaveAttribute('aria-checked', 'true');
  await expect(apple).toHaveAttribute('aria-checked', 'false');
  for (const amount of [100, 200, 500]) {
    await id(page, `wallet-recharge-preset-${amount}`).click();
    await expect(id(page, 'wallet-amount')).toHaveValue(String(amount));
  }
  for (const [amount, message] of [['', 'sin símbolos'], ['9', 'entre $10'], ['100000.01', 'entre $10'], ['10.001', 'dos decimales'], ['3.4.5', 'sin símbolos']] as const) {
    await id(page, 'wallet-amount').fill(amount);
    await id(page, 'wallet-recharge-continue').click();
    await expect(id(page, 'wallet-message')).toContainText(message);
    await expect(id(page, 'wallet-recharge')).toHaveCount(0);
    expect((await readState(page)).wallet).toEqual(before);
  }
  for (const boundary of ['10', '100000']) {
    await id(page, 'wallet-amount').fill(boundary);
    await id(page, 'wallet-recharge-continue').click();
    await expect(id(page, 'wallet-recharge')).toBeEnabled();
    await sameSheet(page, geometry);
    expect((await readState(page)).wallet).toEqual(before);
    await id(page, 'wallet-backsubpages').click();
    await expect(id(page, 'wallet-amount')).toHaveValue(boundary);
    await expect(card).toHaveAttribute('aria-checked', 'true');
  }
  expect(await page.evaluate(() => (window as Controls).__walletWrites || 0)).toBe(0);

  await id(page, 'wallet-amount').fill('123,45');
  await id(page, 'wallet-recharge-continue').click();
  await expect(id(page, 'wallet-recharge-review-amount')).toHaveText('$123.45');
  await expect(id(page, 'wallet-recharge-review-balance')).toHaveText('$983.45');
  await expect(page.getByText('Tarjeta', { exact: true })).toBeVisible();
  await expect(id(page, 'wallet-amount')).toHaveCount(0);
  await sameSheet(page, geometry);
  await page.screenshot({ path: `${output}/recharge-review-${label}.png` });
  if (page.viewportSize()!.height <= 480) {
    await id(page, 'wallet-recharge-review-balance').scrollIntoViewIfNeeded();
    await expect(id(page, 'wallet-recharge-review-balance')).toBeVisible();
    await expect(id(page, 'wallet-recharge')).toBeVisible();
    const valueBounds = await id(page, 'wallet-recharge-review-balance').boundingBox();
    const footerBounds = await id(page, 'wallet-recharge').boundingBox();
    expect(valueBounds!.y + valueBounds!.height).toBeLessThanOrEqual(footerBounds!.y);
    await page.screenshot({ path: `${output}/recharge-review-scrolled-${label}.png` });
  }
  await page.keyboard.press('Escape');
  await expect(id(page, 'wallet-amount')).toHaveValue('123,45');
  await expect(card).toHaveAttribute('aria-checked', 'true');
  await id(page, 'wallet-recharge-continue').click();
  await page.evaluate(() => { (window as Controls).__walletFailWrites = 1; });
  await id(page, 'wallet-recharge').click();
  await expect(id(page, 'wallet-message')).toContainText('No se aplicó el importe');
  await expect(id(page, 'wallet-recharge-review-amount')).toHaveText('$123.45');
  expect((await readState(page)).wallet).toEqual(before);
  await sameSheet(page, geometry);
  await page.screenshot({ path: `${output}/recharge-retry-${label}.png` });
  await page.evaluate(() => { (window as Controls).__walletWrites = 0; });
  // All attempts share one event turn while persistence is pending. A successful
  // recharge must remain visible and only the first confirmation may write.
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('[data-testid="wallet-recharge"]')!.click();
    document.querySelector<HTMLElement>('[data-testid="wallet-recharge"]')!.click();
    document.querySelector<HTMLElement>('[data-testid="wallet-close"]')!.click();
    document.querySelector<HTMLElement>('[data-testid="wallet-backsubpages"]')!.click();
    document.querySelector<HTMLElement>('[data-testid="wallet-backdrop"]')!.click();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  });
  await expect(id(page, 'wallet-recharge-success')).toBeVisible();
  await expect(id(page, 'wallet-recharge')).toHaveCount(0);
  await sameSheet(page, geometry);
  const after = (await readState(page)).wallet!;
  expect(after.balance).toBe(983.45); expect(after.movements).toHaveLength(4);
  expect(after.movements[0]).toMatchObject({ concept: 'Recarga de demostración', amount: 123.45 });
  expect(new Set(after.movements.map(item => item.id)).size).toBe(4);
  expect(await page.evaluate(() => (window as Controls).__walletWrites || 0)).toBe(1);
  await page.screenshot({ path: `${output}/recharge-saved-${label}.png` });
  await id(page, 'wallet-recharge-return').click();
  await expect(id(page, 'wallet-balance')).toHaveText('$983.45');
  await sameSheet(page, geometry);
  await expect(page.locator('[data-testid^="wallet-movement-"]')).toHaveCount(2);
  await page.reload();
  await expect(id(page, 'wallet-balance')).toHaveText('$983.45');
  expect((await readState(page)).wallet).toEqual(after);
  await id(page, 'wallet-recharge-open').click();
  await apple.click();
  await id(page, 'wallet-recharge-preset-200').click();
  await id(page, 'wallet-recharge-continue').click();
  await expect(page.getByText('Apple Pay', { exact: true })).toBeVisible();
  await expect(id(page, 'wallet-recharge-review-amount')).toHaveText('$200.00');
  await expect(id(page, 'wallet-recharge-review-balance')).toHaveText('$1,183.45');
  expect((await readState(page)).wallet).toEqual(after);
  await id(page, 'wallet-backsubpages').click();
  await expect(apple).toHaveAttribute('aria-checked', 'true');
  await expect(id(page, 'wallet-amount')).toHaveValue('200');
  await id(page, 'wallet-backsubpages').click();
  await expect(id(page, 'wallet-balance')).toHaveText('$983.45');
  expect((await readState(page)).wallet).toEqual(after);
  return after;
}

async function verifyWallet(browser: Browser, width: number) {
  const { context, page, errors, forbidden, tokens } = await harness(browser, width);
  const checks: string[] = [];
  try {
    await page.goto(origin); await id(page, 'header-menu').click({ timeout: 60000 }); await id(page, 'nav-wallet').click();
    await expect(id(page, 'wallet-balance')).toHaveText('$860.00');
    await expect(id(page, 'wallet-amount')).toHaveCount(0);
    await expect(id(page, 'wallet-subscription-current')).toHaveText('Pro');
    await expect(id(page, 'wallet-ai-status')).toHaveText('Activa · demostración');
    await expect(id(page, 'wallet-upgrade-name')).toHaveText('IA Integrada');
    await expect(id(page, 'wallet-ai-card')).toContainText('$199 MXN / mes · 5 GB');
    await expect(id(page, 'wallet-upgrade-pending')).toHaveCount(0);
    await expect(id(page, 'wallet-upgrade-card')).toBeEnabled();
    await expect(id(page, 'wallet-packages-open')).toBeEnabled();
    await expect(page.locator('[data-testid^="wallet-movement-"]')).toHaveCount(2);
    await expect(page.getByTestId('wallet-movement-qa-wallet-middle')).toContainText('−$40.00');
    await expect(page.getByTestId('wallet-movement-qa-wallet-oldest')).toHaveCount(0);
    await noOverflow(page); await page.screenshot({ path: `${output}/overview-active-${width}.png` });
    checks.push('Menu entry, centered MXN balance, separate recharge entry, two recent movements, account Pro 99 display from preserved owner legacy IA access and next IA Integrada 199 plan');
    await verifyPackageBrowsing(page, `active-${width}`);
    await expect(id(page, 'wallet-subscription-current')).toHaveText('Pro');
    await expect(id(page, 'wallet-ai-status')).toHaveText('Activa · demostración');
    checks.push('Current/next account plans and all five package cards show exact names, MXN prices and storage; comparison scrolling/back preserves legacy IA access and all stored state without applying an upgrade');

    await id(page, 'wallet-movements-open').click();
    await expect(page.locator('[data-testid^="wallet-movement-"]')).toHaveCount(3);
    await expect(id(page, 'wallet-movement-qa-wallet-oldest')).toContainText('Movimiento anterior QA');
    await expect(page.getByText('$900.00', { exact: true })).toBeVisible();
    await noOverflow(page); await page.screenshot({ path: `${output}/movements-${width}.png` });
    await id(page, 'wallet-backsubpages').click();
    checks.push('Ver todos shows all three stored movements and credit/debit/count totals; back restores overview');

    const after = await verifyRecharge(page, String(width));
    checks.push('Same-size recharge/review/receipt, Apple Pay first and selected by default, card alternative without payment fields, amount presets/custom bounds/decimals, nonmutating review/back, failure rollback/retry, one durable write despite duplicate/close/back attempts, and reload persistence');

    await id(page, 'wallet-ai-open').click(); await expect(id(page, 'subscription-packages')).toBeVisible();
    await id(page, 'subscription-manage-ai').click(); await expect(id(page, 'ai-subscription-panel')).toBeVisible();
    await expect(id(page, 'ai-subscription-status')).toHaveText('Activa · demostración');
    await expect(id(page, 'ai-subscription-price')).toHaveText('$99 MXN / mes');
    await id(page, 'ai-subscription-cancel').click(); await id(page, 'ai-subscription-confirm-cancel').click();
    await expect(id(page, 'ai-subscription-cancelled')).toBeVisible(); await id(page, 'ai-subscription-return').click();
    await expect(id(page, 'wallet-subscription-current')).toHaveText('Gratuita');
    await expect(id(page, 'wallet-ai-status')).toHaveText('Plan gratuito');
    await expect(id(page, 'wallet-upgrade-name')).toHaveText('Básica');
    await expect(id(page, 'wallet-ai-card')).toContainText('$50 MXN / mes · 500 MB');
    await expect(id(page, 'wallet-upgrade-pending')).toHaveCount(0); await expect(id(page, 'wallet-upgrade-card')).toBeEnabled();
    expect((await readState(page)).wallet).toEqual(after);
    await page.screenshot({ path: `${output}/overview-inactive-${width}.png` });
    await page.reload(); await expect(id(page, 'wallet-subscription-current')).toHaveText('Gratuita');
    await verifyPackageBrowsing(page, `inactive-${width}`, 'wallet-packages-open', 'escape', 'free');
    await expect(id(page, 'wallet-ai-status')).toHaveText('Plan gratuito');
    checks.push('Inactive legacy subscription remains inactive after viewing all proposed packages; Escape returns to wallet without storage writes or balance changes');
    await id(page, 'wallet-ai-open').click(); await expect(id(page, 'subscription-packages')).toBeVisible();
    await id(page, 'subscription-manage-ai').click(); await expect(id(page, 'ai-subscription-price')).toHaveText('$99 MXN / mes');
    await id(page, 'ai-subscription-continue').click(); await expect(id(page, 'ai-subscription-activate')).toBeDisabled();
    await id(page, 'ai-subscription-consent').click(); await expect(id(page, 'ai-subscription-activate')).toBeEnabled();
    await id(page, 'ai-subscription-activate').click(); await expect(id(page, 'ai-subscription-success')).toBeVisible();
    await id(page, 'wallet-ai-back').click(); await expect(id(page, 'wallet-subscription-current')).toHaveText('Pro');
    expect((await readState(page)).aiSubscription?.status).toBe('active'); expect((await readState(page)).wallet).toEqual(after);
    expect((await readState(page)).subscriptionPlan).toBeUndefined();
    checks.push('Legacy IA management remains separate: saved cancellation changes the owner fallback to Gratuita across reload; consent-based 99 MXN reactivation restores Pro without applying a commercial upgrade or changing wallet balance');

    await id(page, 'wallet-tokens-open').click(); await expect(id(page, 'wallet-tokens-detail-status')).toHaveText('Sin conectar');
    await expect(id(page, 'wallet-tokens-retry')).toBeEnabled();
    await id(page, 'wallet-tokens-retry').click(); await expect(id(page, 'wallet-tokens-detail-status')).toHaveText('Sin conectar');
    expect((await readState(page)).wallet).toEqual(after);
    await page.screenshot({ path: `${output}/tokens-unavailable-${width}.png` });
    await id(page, 'wallet-backsubpages').click(); await id(page, 'wallet-close').click();
    await expect(id(page, 'wallet-sheet')).toHaveCount(0); await expect(id(page, 'header-menu')).toBeVisible();
    expect(errors).toEqual([]); expect(forbidden).toEqual([]);
    checks.push('Unavailable Tokens supports retry without fake balance; subpage back/close return to home without page errors or provider writes');
    return { width, checks, mockedTokenGets: tokens.requests, errors, forbidden };
  } catch (error) { await page.screenshot({ path: `${output}/failure-${width}.png` }); throw error; }
  finally { tokens.release?.(); await context.close(); }
}

async function verifyCloseRace(browser: Browser, width: number) {
  const { context, page, errors, forbidden, tokens } = await harness(browser, width, 'no-preference');
  try {
    await page.goto(`${origin}/wallet`); await expect(id(page, 'wallet-balance')).toHaveText('$860.00', { timeout: 60000 });
    const before = (await readState(page)).wallet;
    await id(page, 'wallet-recharge-open').click(); await id(page, 'wallet-amount').fill('321');
    await id(page, 'wallet-recharge-continue').click();
    await page.evaluate(() => { (window as Controls).__walletWrites = 0; });
    // Same event turn attempts the former close/submit race before an animation frame.
    await page.evaluate(() => {
      document.querySelector<HTMLElement>('[data-testid="wallet-close"]')!.click();
      document.querySelector<HTMLElement>('[data-testid="wallet-recharge"]')!.click();
    });
    await expect(id(page, 'wallet-sheet')).toHaveCount(0); expect((await readState(page)).wallet).toEqual(before);
    expect(await page.evaluate(() => (window as Controls).__walletWrites || 0)).toBe(0);
    await page.goto(`${origin}/wallet`); await expect(id(page, 'wallet-balance')).toHaveText('$860.00');
    await page.evaluate(() => { (window as Controls).__walletWrites = 0; });
    await page.evaluate(() => {
      document.querySelector<HTMLElement>('[data-testid="wallet-close"]')!.click();
      document.querySelector<HTMLElement>('[data-testid="wallet-recharge-open"]')!.click();
    });
    await expect(id(page, 'wallet-sheet')).toHaveCount(0); expect((await readState(page)).wallet).toEqual(before);
    expect(await page.evaluate(() => (window as Controls).__walletWrites || 0)).toBe(0);
    expect(errors).toEqual([]); expect(forbidden).toEqual([]);
    return { width, checks: ['Closing animation rejects immediate final recharge confirmation and recharge navigation: zero late writes/movements'], errors, forbidden };
  } finally { tokens.release?.(); await context.close(); }
}

async function verifyRechargeViewport(browser: Browser, width: number, height: number) {
  const { context, page, errors, forbidden, tokens } = await harness(browser, width, 'reduce', height);
  const label = `${width}x${height}`;
  try {
    await page.goto(`${origin}/wallet`);
    await expect(id(page, 'wallet-balance')).toHaveText('$860.00', { timeout: 60000 });
    await verifyRecharge(page, label);
    await id(page, 'wallet-close').click();
    await expect(id(page, 'wallet-sheet')).toHaveCount(0);
    expect(errors).toEqual([]); expect(forbidden).toEqual([]);
    return { width, height, checks: ['Recharge form/review/receipt keep the wallet geometry and scroll at this viewport; Apple Pay/card, presets/custom amount, valid boundaries, invalid input, back/draft, failure/retry, pending duplicate/close guards, receipt/return and reload use only synthetic local state'], errors, forbidden };
  } catch (error) { await page.screenshot({ path: `${output}/recharge-failure-${label}.png` }); throw error; }
  finally { tokens.release?.(); await context.close(); }
}

async function verifyEmptyWalletGeometry(browser: Browser) {
  const { context, page, errors, forbidden, tokens } = await harness(browser, 393, 'reduce', 852, true);
  try {
    await page.goto(`${origin}/wallet`);
    await expect(id(page, 'wallet-balance')).toHaveText('$860.00', { timeout: 60000 });
    await expect(page.locator('[data-testid^="wallet-movement-"]')).toHaveCount(0);
    const overview = await sheetBounds(page);
    await page.screenshot({ path: `${output}/empty-overview-393.png` });
    await page.evaluate(() => { (window as Controls).__walletWrites = 0; });
    await id(page, 'wallet-recharge-open').click();
    await expect(id(page, 'wallet-payment-apple-pay')).toHaveAttribute('aria-checked', 'true');
    await sameSheet(page, overview);
    const form = await sheetBounds(page);
    await page.screenshot({ path: `${output}/empty-recharge-393.png` });
    await id(page, 'wallet-recharge-preset-100').click();
    // The keyboard advances to review and must never execute the recharge.
    await id(page, 'wallet-amount').press('Enter');
    await expect(id(page, 'wallet-recharge-review')).toBeVisible();
    await expect(page.getByText('Apple Pay', { exact: true })).toBeVisible();
    await expect(id(page, 'wallet-recharge-review-amount')).toHaveText('$100.00');
    await expect(id(page, 'wallet-recharge-review-balance')).toHaveText('$960.00');
    await sameSheet(page, overview);
    const review = await sheetBounds(page);
    expect((await readState(page)).wallet!.movements).toHaveLength(0);
    expect(await page.evaluate(() => (window as Controls).__walletWrites || 0)).toBe(0);
    await id(page, 'wallet-recharge').click();
    await expect(id(page, 'wallet-recharge-success')).toBeVisible();
    await expect(id(page, 'wallet-recharge-success-balance')).toHaveText('$960.00');
    await sameSheet(page, overview);
    const success = await sheetBounds(page);
    await page.screenshot({ path: `${output}/empty-recharge-saved-393.png` });
    const saved = (await readState(page)).wallet!;
    expect(saved.balance).toBe(960); expect(saved.movements).toHaveLength(1);
    expect(saved.movements[0].amount).toBe(100);
    expect(await page.evaluate(() => (window as Controls).__walletWrites || 0)).toBe(1);
    await id(page, 'wallet-recharge-return').click();
    await expect(id(page, 'wallet-balance')).toHaveText('$960.00');
    await page.reload();
    await expect(id(page, 'wallet-balance')).toHaveText('$960.00');
    expect((await readState(page)).wallet).toEqual(saved);
    expect(errors).toEqual([]); expect(forbidden).toEqual([]);
    return { width: 393, height: 852, frames: { overview, form, review, success }, checks: ['Wallet with no movements and its recharge form/review/success retain identical dynamic geometry; Apple Pay demo completes once, Enter only opens review, and the actual receipt/balance/movement persist after return and reload'], errors, forbidden };
  } catch (error) { await page.screenshot({ path: `${output}/empty-geometry-failure-393.png` }); throw error; }
  finally { tokens.release?.(); await context.close(); }
}

async function verifyPackageViewport(browser: Browser, width: number, height: number) {
  const { context, page, errors, forbidden, tokens } = await harness(browser, width, 'reduce', height);
  try {
    await page.goto(`${origin}/wallet`); await expect(id(page, 'wallet-balance')).toHaveText('$860.00', { timeout: 60000 });
    await verifyPackageBrowsing(page, `${width}x${height}`, 'wallet-packages-open', 'escape');
    await expect(id(page, 'wallet-subscription-current')).toHaveText('Pro');
    const before = await readState(page);
    await page.evaluate(() => { (window as Controls).__walletWrites = 0; });
    await id(page, 'wallet-upgrade-open').click(); await expect(id(page, 'subscription-packages')).toBeVisible();
    await id(page, 'subscription-upgrade-close').click(); await expect(id(page, 'wallet-sheet')).toHaveCount(0);
    expect(await readState(page)).toEqual(before);
    expect(await page.evaluate(() => (window as Controls).__walletWrites || 0)).toBe(0);
    expect(errors).toEqual([]); expect(forbidden).toEqual([]);
    return { width, height, checks: ['Current/next plans and all five expanded package cards scroll within the sheet; Escape restores wallet and the subscription X closes without changing legacy IA access, account plan, wallet or any saved state'], errors, forbidden };
  } catch (error) { await page.screenshot({ path: `${output}/packages-failure-${width}x${height}.png` }); throw error; }
  finally { tokens.release?.(); await context.close(); }
}

async function verifyTokenRetry(browser: Browser, width: number) {
  const { context, page, errors, forbidden, tokens } = await harness(browser, width);
  const checks: string[] = [];
  try {
    await page.goto(`${origin}/wallet`); await expect(id(page, 'wallet-balance')).toHaveText('$860.00', { timeout: 60000 });
    await expect(id(page, 'wallet-tokens-status')).toHaveText('Sin conectar');
    expect(tokens.requests, 'Token scope needs a QA Metro with EXPO_PUBLIC_WALLET_API_URL pointing to this local origin').toBe(1);
    await id(page, 'wallet-tokens-open').click(); const before = (await readState(page)).wallet;
    tokens.mode = 'success'; await id(page, 'wallet-tokens-retry').click();
    await expect(id(page, 'wallet-tokens-detail-status')).toHaveText('17 Tokens');
    await expect(id(page, 'wallet-tokens-retry')).toHaveCount(0);
    await expect(page.getByText('Ingreso de Tokens QA', { exact: true })).toBeVisible();
    await expect(page.getByText('Consumo de Tokens QA', { exact: true })).toBeVisible();
    await expect(page.getByText('−3 Tokens', { exact: true })).toBeVisible(); expect((await readState(page)).wallet).toEqual(before);
    await noOverflow(page); await page.screenshot({ path: `${output}/tokens-synthetic-success-${width}.png` });
    checks.push('Synthetic GET failure/retry/success clears error, renders returned balance and signed token movements, and never changes MXN wallet');

    await id(page, 'wallet-close').click(); await expect(id(page, 'wallet-sheet')).toHaveCount(0);
    tokens.mode = 'timeout'; await page.goto(`${origin}/wallet`); await expect(id(page, 'wallet-tokens-status')).toHaveText('Consultando…');
    await id(page, 'wallet-tokens-open').click(); await page.clock.fastForward(10100);
    await expect(id(page, 'wallet-tokens-detail-status')).toHaveText('Sin conectar');
    await expect(page.getByText('La consulta de Tokens tardó demasiado. Inténtalo nuevamente.', { exact: true })).toBeVisible();
    releaseTokens(tokens); tokens.mode = 'success';
    await id(page, 'wallet-tokens-retry').click(); await expect(id(page, 'wallet-tokens-detail-status')).toHaveText('17 Tokens');
    checks.push('10 second timeout exposes retry; aborted response cannot replace state and retry recovers');

    await id(page, 'wallet-close').click(); await expect(id(page, 'wallet-sheet')).toHaveCount(0);
    tokens.mode = 'late'; await page.goto(`${origin}/wallet`); await expect(id(page, 'wallet-tokens-status')).toHaveText('Consultando…');
    await id(page, 'wallet-close').click(); await expect(id(page, 'wallet-sheet')).toHaveCount(0);
    releaseTokens(tokens); await page.clock.fastForward(11000);
    await expect(id(page, 'wallet-sheet')).toHaveCount(0); expect((await readState(page)).wallet).toEqual(before);
    expect(errors).toEqual([]); expect(forbidden).toEqual([]);
    checks.push('Closing unresolved Tokens aborts/cleans the request; a late synthetic response cannot reopen the sheet or mutate data');
    return { width, checks, mockedTokenGets: tokens.requests, errors, forbidden };
  } catch (error) { await page.screenshot({ path: `${output}/tokens-failure-${width}.png` }); throw error; }
  finally { tokens.release?.(); await context.close(); }
}

async function main() {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  try {
    if (geometryOnly) results.push(await verifyEmptyWalletGeometry(browser));
    else if (smallRechargeOnly) results.push(await verifyRechargeViewport(browser, 320, 480));
    else {
      for (const width of [393, 320]) {
        results.push(tokenOnly ? await verifyTokenRetry(browser, width) : packagesOnly ? await verifyPackageViewport(browser, width, width === 393 ? 852 : 640) : rechargeOnly ? await verifyRechargeViewport(browser, width, width === 393 ? 852 : 640) : await verifyWallet(browser, width));
        if (!tokenOnly && !packagesOnly) results.push(await verifyCloseRace(browser, width));
      }
      if (!tokenOnly && !rechargeOnly) results.push(await verifyPackageViewport(browser, 320, 480));
      if (!tokenOnly && !packagesOnly) results.push(await verifyRechargeViewport(browser, 320, 480));
      if (!tokenOnly && !packagesOnly) results.push(await verifyEmptyWalletGeometry(browser));
    }
    await writeFile(`${output}/${geometryOnly ? 'geometry-report' : smallRechargeOnly ? 'small-recharge-report' : tokenOnly ? 'tokens-report' : packagesOnly ? 'packages-report' : rechargeOnly ? 'recharge-report' : 'report'}.json`, JSON.stringify({ status: 'PASS', origin, syntheticDataOnly: true, realPayments: 0, results }, null, 2));
    console.log(`PASS: Wallet ${geometryOnly ? 'empty-wallet dynamic geometry and Apple Pay confirmation at 393' : smallRechargeOnly ? 'recharge scrolling/review/receipt at 320x480' : tokenOnly ? 'synthetic Tokens retry/timeout/cleanup at 393/320' : packagesOnly ? 'nonmutating account plan comparison at 393/320 plus 320x480' : rechargeOnly ? 'same-size recharge/Apple Pay/review/receipt/persistence/close race at 393/320 plus 320x480' : 'recharge/movements/subscriptions/packages/persistence/close race at 393/320 plus 320x480'}; no provider calls or charges.`);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
