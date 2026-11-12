import { chromium, expect, type Browser, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createDemoState } from '../src/domain/seed';
import { captureProfile } from '../src/domain/family';
import { STORAGE_KEY } from '../src/domain/reducer';
import type { AppState } from '../src/domain/types';
import type { RetrievedTestRecharge, TestRecharge, TestWalletSnapshot } from '../src/domain/walletPayments';

const origin = process.env.KLINI_PAYMENTS_QA_ORIGIN || 'http://127.0.0.1:8096';
const paymentOrigin = 'http://127.0.0.1:8099';
const output = 'test-results/wallet-payments';
const token = `qa_session_${'a'.repeat(40)}`;
const orderId = 'rch_4d398c39-3d53-4cf5-a527-3bb38bc32bc6';
const requestKey = 'qa_recharge_1234567890123456';
const id = (page: Page, value: string) => page.locator(`[data-testid="${value}"]:visible`);
const readState = (page: Page): Promise<AppState> => page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), STORAGE_KEY);
const emptyWallet = (): TestWalletSnapshot => ({ mode: 'test', currency: 'MXN', purpose: 'health_services', balanceCents: 0, movements: [], pendingRecharges: [] });
const pending = (): TestRecharge & { idempotencyKey: string } => ({ id: orderId, mode: 'test', currency: 'MXN', purpose: 'health_services', amountCents: 20000, status: 'processing', idempotencyKey: requestKey });
const creditedWallet = (): TestWalletSnapshot => ({ ...emptyWallet(), balanceCents: 20000, movements: [{ id: 'pi_fixture123', orderId, amountCents: 20000, createdAt: '2026-11-09T20:00:00.000Z', concept: 'Recarga de prueba' }] });
type Mode = 'failure' | 'empty' | 'pending' | 'creating' | 'malformed' | 'late';
type Controls = Window & { __paymentWalletWrites?: number };

function fixture() {
  const state = createDemoState(new Date('2026-11-09T12:00:00-06:00'));
  state.profile = { ...state.profile, id: 'qa-payment-owner', name: 'Perfil pagos QA' };
  state.medicationReminderDemoVersion = 1;
  state.medicationCare = { treatments: [], takes: [], alerts: [] };
  state.wallet = { balance: 860, movements: [] };
  state.family = { ownerId: state.profile.id, profiles: { [state.profile.id]: captureProfile(state, 'Perfil principal') } };
  return state;
}

async function harness(browser: Browser, width: number, height: number) {
  const context = await browser.newContext({ viewport: { width, height }, timezoneId: 'America/Mexico_City', reducedMotion: 'reduce' });
  const errors: string[] = [], forbidden: string[] = [];
  const payment = { mode: 'failure' as Mode, walletGets: 0, statusGets: 0, recoveryPosts: [] as { amountCents: number; idempotencyKey: string; purpose: string }[], release: undefined as (() => void) | undefined, status: 'processing' as 'processing' | 'succeeded' | 'canceled' | 'invalid' };
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === paymentOrigin) {
      const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization,content-type,accept', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Cache-Control': 'no-store' };
      if (request.method() === 'OPTIONS') { await route.fulfill({ status: 204, headers }); return; }
      expect(request.headers().authorization).toBe(`Bearer ${token}`);
      if (request.method() !== 'POST') expect(request.postData()).toBeNull();
      if (request.method() === 'GET' && url.pathname === '/wallet') {
        payment.walletGets++;
        if (payment.mode === 'late') await new Promise<void>(resolve => { payment.release = resolve; });
        if (payment.mode === 'failure') await route.fulfill({ status: 503, headers, contentType: 'application/json', body: JSON.stringify({ error: { message: 'private-provider-error-must-not-render' } }) });
        else await route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(payment.mode === 'malformed' ? { ...emptyWallet(), balanceCents: 1 } : payment.mode === 'pending' || payment.mode === 'creating' ? { ...emptyWallet(), pendingRecharges: [{ ...pending(), ...(payment.mode === 'creating' ? { status: 'creating' } : {}) }] } : emptyWallet()) }).catch(() => undefined);
      } else if (payment.mode === 'creating' && request.method() === 'POST' && url.pathname === '/recharges') {
        const body = request.postDataJSON();
        expect(body).toEqual({ amountCents: 20000, idempotencyKey: requestKey, purpose: 'health_services' });
        payment.recoveryPosts.push(body);
        if (payment.recoveryPosts.length === 1) await route.fulfill({ status: 502, headers, contentType: 'application/json', body: JSON.stringify({ error: { message: 'private-provider-ambiguous-create' } }) });
        else {
          const value = { ...pending(), status: 'requires_payment_method', clientSecret: 'pi_fixture123_secret_fixture456' };
          Reflect.deleteProperty(value, 'idempotencyKey');
          await route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(value) });
        }
      } else if (request.method() === 'GET' && url.pathname === `/recharges/${orderId}`) {
        payment.statusGets++;
        const value: RetrievedTestRecharge = { ...pending(), status: payment.status === 'invalid' ? 'succeeded' : payment.status };
        Reflect.deleteProperty(value, 'idempotencyKey');
        if (payment.status === 'succeeded') value.wallet = creditedWallet();
        if (payment.status === 'invalid') value.wallet = { ...creditedWallet(), balanceCents: 20001 };
        await route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(value) });
      } else { forbidden.push(`${request.method()} ${url.origin}${url.pathname}`); await route.abort(); }
    } else if (url.origin !== origin || request.method() !== 'GET') {
      forbidden.push(`${request.method()} ${url.origin}${url.pathname}`); await route.abort();
    } else await route.continue();
  });
  await context.addInitScript(({ state, key }) => {
    if (!sessionStorage.getItem('qa-payment-fixture')) {
      localStorage.setItem(key, JSON.stringify(state)); sessionStorage.setItem('qa-payment-fixture', '1');
    }
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(storageKey, value) {
      if (this === localStorage && storageKey === key) {
        const controls = window as Controls;
        controls.__paymentWalletWrites = (controls.__paymentWalletWrites || 0) + 1;
      }
      return original.call(this, storageKey, value);
    };
  }, { state: fixture(), key: STORAGE_KEY });
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  return { context, page, payment, errors, forbidden };
}

async function verifyRecovery(browser: Browser, width: number) {
  const height = width === 393 ? 852 : 640;
  const { context, page, payment, errors, forbidden } = await harness(browser, width, height);
  try {
    payment.mode = 'creating';
    await open(page); const beforeWallet = (await readState(page)).wallet;
    await page.evaluate(() => { (window as Controls).__paymentWalletWrites = 0; });
    await fillConnection(page); await id(page, 'apple-pay-test-connect').click();
    await id(page, `apple-pay-test-resume-${orderId}`).click();
    await expect(id(page, 'apple-pay-test-status')).toHaveText('Por preparar');
    await id(page, 'apple-pay-test-prepare').click();
    await expect(id(page, 'apple-pay-test-error')).toBeVisible();
    await expect(page.getByText('private-provider-ambiguous-create')).toHaveCount(0);
    await expect(id(page, 'apple-pay-test-new')).toHaveCount(0);
    await id(page, 'apple-pay-test-prepare').click();
    await expect(id(page, 'apple-pay-test-status')).toHaveText('Por completar');
    await expect(id(page, 'apple-pay-test-prepare')).toHaveCount(0);
    expect(payment.recoveryPosts).toHaveLength(2);
    expect(payment.recoveryPosts[0]).toEqual(payment.recoveryPosts[1]);
    await expect(id(page, 'apple-pay-test-balance')).toHaveText('$0.00');
    await assertIsolated(page, beforeWallet);
    await id(page, 'apple-pay-test-reconcile').click();
    await expect(id(page, 'apple-pay-test-status')).toHaveText('En proceso');
    await expect(id(page, 'apple-pay-test-new')).toHaveCount(0);
    payment.status = 'canceled'; await id(page, 'apple-pay-test-reconcile').click();
    await expect(id(page, 'apple-pay-test-status')).toHaveText('Cancelada');
    await expect(id(page, 'apple-pay-test-new')).toBeEnabled();
    await expect(id(page, 'apple-pay-test-balance')).toHaveText('$0.00');
    await assertIsolated(page, beforeWallet);
    await page.screenshot({ path: `${output}/recovery-${width}.png` });
    expect(errors).toEqual([]); expect(forbidden).toEqual([]);
    return { width, height, checks: ['Ambiguous recovered creating order reuses the same key/amount across two mocked POST attempts, stores no credentials, cannot start another while pending, and canceled server status never credits'], mockedRecoveryPosts: payment.recoveryPosts.length, errors, forbidden };
  } catch (error) { await page.screenshot({ path: `${output}/recovery-failure-${width}.png` }).catch(() => undefined); throw error; }
  finally { payment.release?.(); await context.close(); }
}

async function open(page: Page) {
  await page.goto(`${origin}/wallet`);
  await expect(id(page, 'wallet-balance')).toHaveText('$860.00', { timeout: 60000 });
  await id(page, 'wallet-apple-pay-test-open').click();
  await expect(id(page, 'apple-pay-test-panel')).toBeVisible();
  await expect(page.getByText('Stripe TEST · sin cargos reales', { exact: true })).toBeVisible();
}

async function fillConnection(page: Page) {
  await id(page, 'apple-pay-test-server').fill(paymentOrigin);
  await id(page, 'apple-pay-test-token').fill(token);
  await expect(id(page, 'apple-pay-test-token')).toHaveAttribute('type', 'password');
}

async function assertIsolated(page: Page, beforeWallet: AppState['wallet']) {
  expect((await readState(page)).wallet).toEqual(beforeWallet);
  expect(await page.evaluate(() => (window as Controls).__paymentWalletWrites || 0)).toBe(0);
  expect(await page.evaluate(secret => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }).includes(secret), token)).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
}

async function verify(browser: Browser, width: number, height: number) {
  const { context, page, payment, errors, forbidden } = await harness(browser, width, height);
  const checks: string[] = [];
  const label = `${width}x${height}`;
  try {
    await open(page);
    const original = await id(page, 'wallet-sheet').boundingBox(); expect(original).not.toBeNull();
    const beforeWallet = (await readState(page)).wallet;
    await page.evaluate(() => { (window as Controls).__paymentWalletWrites = 0; });
    await fillConnection(page);
    await id(page, 'apple-pay-test-server').fill('http://public.example.test');
    await id(page, 'apple-pay-test-connect').click();
    await expect(id(page, 'apple-pay-test-error')).toBeVisible(); expect(payment.walletGets).toBe(0);
    await fillConnection(page);
    await id(page, 'apple-pay-test-token').fill(`sk_test_${'x'.repeat(40)}`);
    await id(page, 'apple-pay-test-connect').click();
    await expect(id(page, 'apple-pay-test-error')).toBeVisible(); expect(payment.walletGets).toBe(0);
    await fillConnection(page);
    await id(page, 'apple-pay-test-connect').click();
    await expect(id(page, 'apple-pay-test-error')).toBeVisible(); expect(payment.walletGets).toBe(1);
    await expect(page.getByText('private-provider-error-must-not-render')).toHaveCount(0);
    payment.mode = 'malformed'; await id(page, 'apple-pay-test-connect').click();
    await expect(id(page, 'apple-pay-test-error')).toBeVisible(); expect(payment.walletGets).toBe(2);
    await expect(id(page, 'apple-pay-test-balance')).toHaveCount(0);
    payment.mode = 'empty'; await id(page, 'apple-pay-test-connect').click();
    await expect(id(page, 'apple-pay-test-balance')).toHaveText('$0.00');
    await expect(id(page, 'apple-pay-test-token')).toHaveCount(0);
    await expect(id(page, 'apple-pay-test-continue')).toBeDisabled();
    await expect(page.getByText(/Apple Pay requiere un iPhone con una compilación compatible|Falta configurar Stripe de prueba y Apple Pay en la compilación para iPhone/)).toBeVisible();
    for (const amount of [100, 200, 500]) { await id(page, `apple-pay-test-preset-${amount}`).click(); await expect(id(page, 'apple-pay-test-amount')).toHaveValue(String(amount)); }
    await assertIsolated(page, beforeWallet);
    checks.push('Invalid server/token, sanitized provider failure, malformed balance rejection, retry, zero server balance, runtime-only token and web Apple Pay gating');
    await page.screenshot({ path: `${output}/connected-${label}.png` });

    await id(page, 'apple-pay-test-packages').click();
    await expect(id(page, 'subscription-packages')).toBeVisible();
    await expect(id(page, 'apple-pay-test-panel')).toHaveCount(0);
    await expect(page.getByTestId('subscription-all-plans')).toHaveCount(0);
    const planList = id(page, 'subscription-plan-list');
    await expect(planList.locator('[data-testid^="subscription-package-"][data-testid$="-name"]')).toHaveText(['Gratuita', 'Básica', 'Pro', 'IA Integrada', 'IA MAX']);
    await expect(planList.locator('[data-testid^="subscription-package-"][data-testid$="-price"]')).toHaveText([0, 50, 99, 199, 299].map(price => `$${price} MXN / mes`));
    await expect(id(page, 'subscription-current-plan').getByTestId('subscription-package-pro-name')).toHaveText('Pro');
    await expect(id(page, 'subscription-current-plan').getByTestId('subscription-package-pro-price')).toHaveText('$99 MXN / mes');
    await expect(id(page, 'subscription-next-plan').getByTestId('subscription-package-integrated-ai-name')).toHaveText('IA Integrada');
    await expect(id(page, 'subscription-next-plan').getByTestId('subscription-package-integrated-ai-price')).toHaveText('$199 MXN / mes');
    await expect(id(page, 'subscription-upgrade-start')).toBeEnabled();
    await assertIsolated(page, beforeWallet);
    await id(page, 'subscription-upgrade-back').click();
    await expect(id(page, 'wallet-balance')).toHaveText('$860.00');
    checks.push('The account Pro 99/current and IA Integrada 199/next plan comparison stays separate from TEST consultation balance; browsing and back preserve stored state without applying an upgrade');

    await id(page, 'wallet-apple-pay-test-open').click();
    await expect(id(page, 'apple-pay-test-token')).toHaveValue('');
    await fillConnection(page); payment.mode = 'pending';
    await id(page, 'apple-pay-test-connect').click();
    await expect(id(page, `apple-pay-test-resume-${orderId}`)).toBeVisible();
    await expect(id(page, 'apple-pay-test-amount')).toHaveCount(0);
    await expect(id(page, 'apple-pay-test-balance')).toHaveText('$0.00');
    await id(page, `apple-pay-test-resume-${orderId}`).click();
    await expect(id(page, 'apple-pay-test-review-amount')).toContainText('$200.00');
    await id(page, 'apple-pay-test-reconcile').click();
    await expect(id(page, 'apple-pay-test-status')).toHaveText('En proceso');
    await expect(id(page, 'apple-pay-test-balance')).toHaveText('$0.00');
    await expect(id(page, 'apple-pay-test-new')).toHaveCount(0);
    payment.status = 'invalid'; await id(page, 'apple-pay-test-reconcile').click();
    await expect(id(page, 'apple-pay-test-error')).toBeVisible();
    await expect(id(page, 'apple-pay-test-balance')).toHaveText('$0.00');
    payment.status = 'succeeded'; await id(page, 'apple-pay-test-reconcile').click();
    await expect(id(page, 'apple-pay-test-success')).toBeVisible();
    await expect(id(page, 'apple-pay-test-balance')).toHaveText('$200.00');
    await assertIsolated(page, beforeWallet);
    checks.push('Pending recovery keeps one order, requires server verification, rejects mismatched credit totals, and credits only the confirmed isolated test balance');
    await page.screenshot({ path: `${output}/verified-${label}.png` });
    await id(page, 'apple-pay-test-new').click();
    await expect(id(page, 'apple-pay-test-amount')).toHaveValue('200.00');
    await expect(id(page, 'apple-pay-test-continue')).toBeDisabled();

    await id(page, 'apple-pay-test-disconnect').click();
    await expect(id(page, 'apple-pay-test-token')).toHaveValue('');
    await expect(id(page, 'apple-pay-test-balance')).toHaveCount(0);
    await fillConnection(page); payment.mode = 'late';
    const beforeGets = payment.walletGets;
    await id(page, 'apple-pay-test-connect').evaluate(element => { element.dispatchEvent(new MouseEvent('click', { bubbles: true })); element.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await expect.poll(() => payment.walletGets).toBe(beforeGets + 1);
    await expect(id(page, 'apple-pay-test-connect')).toBeDisabled();
    await expect(id(page, 'wallet-close')).toBeDisabled();
    await page.keyboard.press('Escape'); await expect(id(page, 'apple-pay-test-panel')).toBeVisible();
    payment.release?.(); payment.release = undefined;
    await expect(id(page, 'apple-pay-test-balance')).toHaveText('$0.00');
    await assertIsolated(page, beforeWallet);
    checks.push('Disconnect clears credentials; double connection serializes and busy close/Escape cannot discard an unresolved request');
    const current = await id(page, 'wallet-sheet').boundingBox();
    for (const key of ['x', 'y', 'width', 'height'] as const) expect(Math.abs(current![key] - original![key])).toBeLessThanOrEqual(1);
    await page.reload();
    await expect(id(page, 'wallet-balance')).toHaveText('$860.00', { timeout: 60000 });
    await id(page, 'wallet-apple-pay-test-open').click();
    await expect(id(page, 'apple-pay-test-token')).toHaveValue('');
    await expect(id(page, 'apple-pay-test-balance')).toHaveCount(0);
    expect(errors).toEqual([]); expect(forbidden).toEqual([]);
    checks.push('Same wallet sheet geometry, no overflow, reload clears connection, no provider calls, no POSTs, no app wallet persistence');
    return { width, height, checks, mockedWalletGets: payment.walletGets, mockedStatusGets: payment.statusGets, errors, forbidden };
  } catch (error) { await page.screenshot({ path: `${output}/failure-${label}.png` }).catch(() => undefined); throw error; }
  finally { payment.release?.(); await context.close(); }
}

async function main() {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const results = [];
    for (const [width, height] of [[393, 852], [320, 640], [320, 480]]) results.push(await verify(browser, width, height));
    for (const width of [393, 320]) results.push(await verifyRecovery(browser, width));
    await writeFile(`${output}/report.json`, JSON.stringify({ status: 'PASS', origin, syntheticDataOnly: true, nativeApplePayTested: false, providerCalls: 0, realCharges: 0, results }, null, 2));
    console.log('PASS: isolated Stripe TEST wallet connection/recovery/verification/scope/credentials at 393/320/320x480; native Apple Pay unavailable on web.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
