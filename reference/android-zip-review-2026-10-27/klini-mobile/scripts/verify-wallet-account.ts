import { chromium, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createDemoState } from '../src/domain/seed';
import { STORAGE_KEY } from '../src/domain/reducer';

// Isolated contract/UI fixtures only: no backend, Stripe, account, or payment is contacted.
const webOrigin = 'http://127.0.0.1:8097';
const apiOrigin = 'https://wallet-qa.example.test';
const apiPath = '/api/mobile/v1';
const output = resolve('test-results/wallet-account');
const routeFile = resolve('src/app/wallet-account-qa.tsx');
const routeSource = `// TEMPORARY: generated and removed by scripts/verify-wallet-account.ts.
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import WalletAccountScreen from '../screens/WalletAccountScreen';
import { WalletNativePaymentsContext, type WalletNativePayments } from '../services/walletNativePayments';
export default function WalletAccountQA() {
  const { native: result } = useLocalSearchParams<{ native?: string }>();
  const [visible, setVisible] = useState(true);
  const pay: WalletNativePayments['payCard'] = async () => { if (result === 'error') throw new Error('Synthetic native failure'); return { status: result === 'canceled' ? 'canceled' : 'completed' }; };
  return <WalletNativePaymentsContext.Provider value={{ availability: 'ready', applePaySupported: false, cardSupported: true, canUseApplePay: () => false, canUseCard: () => true, payApplePay: pay, payCard: pay, reset: async () => {}, NativeButton: null }}>{visible ? <WalletAccountScreen connection={{ baseUrl: '${apiOrigin}${apiPath}', mode: 'live' }} onClose={() => setVisible(false)} /> : <View><Pressable testID="wallet-qa-reopen" onPress={() => setVisible(true)}><Text>Abrir billetera</Text></Pressable></View>}</WalletNativePaymentsContext.Provider>;
}
`;
const token = '17|synthetic_patient_token_for_ui_tests';
const orderId = 'a173598f-a962-4d9f-8dd4-5e41f06da338';
const movementId = 'c173598f-a962-4d9f-8dd4-5e41f06da338';
const intentId = 'pi_syntheticIntent123';
const date = '2026-11-12T04:00:00.000000Z';
const quoteId = 'f173598f-a962-4d9f-8dd4-5e41f06da338';
const servicePaymentId = '1173598f-a962-4d9f-8dd4-5e41f06da338';
const reversalId = '2173598f-a962-4d9f-8dd4-5e41f06da338';
const viewports = [{ width: 393, height: 852 }, { width: 320, height: 640 }, { width: 320, height: 400 }];
const safe = (value: string) => value.replace(/(?:sk|rk|pk)_(?:test|live)_[A-Za-z0-9]+|Bearer\s+\S+|pi_[A-Za-z0-9]+_secret_[A-Za-z0-9]+/g, '[redacted]').slice(0, 1800);
const deferred = () => { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve; }); return { promise, release }; };

class Fixture {
  loginFailures = 0;
  createFailures = 0;
  createConflict = false;
  expireWallet = false;
  unknownMode = false;
  balance = 0;
  amount = 10000;
  status = 'requires_payment_method';
  created = false;
  movements: Record<string, unknown>[] = [];
  calls: { method: string; path: string }[] = [];
  createBodies: { amount_cents: number; client_request_id: string }[] = [];
  external: string[] = [];
  unexpected: string[] = [];
  refreshGate: ReturnType<typeof deferred> | null = null;
  createGate: ReturnType<typeof deferred> | null = null;
  walletGate: ReturnType<typeof deferred> | null = null;
  serviceEnabled = false;
  blocked = false;
  withConsultation = false;
  consultationQuoted = false;
  consultationPaid = false;
  consultationReversed = false;
  consultationCanceled = false;
  consultationRequestId: string | null = null;
  consultationBodies: { quote_id: string; client_request_id: string }[] = [];
  consultationTariff = { id: 7, version: 2, amount_cents: 10000, currency: 'MXN', modality: 'in_person' };
  consultationExpiresAt = new Date(Date.now() + 15 * 60000).toISOString();
  expireConsultations = false;
  expireQuote = false;
  expireServicePay = false;
  loseServiceResponse = false;
  serviceConflict = false;
  transportFailures = 0;
  consultationGate: ReturnType<typeof deferred> | null = null;
  servicePayGate: ReturnType<typeof deferred> | null = null;
  recharge() { return { id: orderId, mode: 'live', currency: 'MXN', scope: 'health_services', amount_cents: this.amount, status: this.status, created_at: date }; }
  wallet() { return { mode: this.unknownMode ? 'unknown' : 'live', currency: 'MXN', scope: 'health_services', balance_cents: this.balance, available_balance_cents: this.blocked ? 0 : Math.max(0, this.balance), blocked: this.blocked, movements: this.movements, has_more_movements: false, pending_recharges: this.created && !['succeeded', 'canceled'].includes(this.status) ? [this.recharge()] : [], payment_config: { enabled: !this.blocked, service_payments_enabled: this.serviceEnabled && !this.blocked, country: 'MX', publishable_key: 'pk_live_syntheticPublishable123', merchant_identifier: 'merchant.mx.klini.review', min_amount_cents: 5000, max_amount_cents: 1000000 } }; }
  enableConsultations() { this.withConsultation = true; this.serviceEnabled = true; this.balance = 30000; this.movements = [{ id: movementId, order_id: orderId, service_payment_id: null, appointment_id: null, mode: 'live', currency: 'MXN', scope: 'health_services', amount_cents: 30000, type: 'recharge', created_at: date }]; return this; }
  quote() { return { id: quoteId, appointment_id: 18, tariff_id: 7, tariff_version: 2, amount_cents: 10000, currency: 'MXN', scope: 'health_services', mode: 'live', expires_at: this.consultationExpiresAt, status: this.consultationReversed ? 'invalidated' : this.consultationPaid ? 'paid' : 'valid' }; }
  servicePayment() { return { id: servicePaymentId, appointment_id: 18, quote_id: quoteId, amount_cents: 10000, currency: 'MXN', scope: 'health_services', mode: 'live', status: this.consultationReversed ? 'reversed' : 'paid', paid_at: date, reversed_at: this.consultationReversed ? '2026-11-12T04:05:00Z' : null }; }
  consultations() { return { appointments: this.withConsultation && !this.consultationCanceled ? [{ id: 18, doctor: { name: 'Dra. Contrato QA' }, starts_at: '2026-11-13T12:00:00Z', modality: 'Presencial', status: 'confirmed', tariff: this.consultationTariff, quote: this.consultationQuoted ? this.quote() : null, payment: this.consultationPaid ? this.servicePayment() : null }] : [], has_more: false }; }
  commitService() { if (this.consultationPaid) return; this.consultationPaid = true; this.consultationQuoted = true; this.balance -= 10000; this.movements.unshift({ id: servicePaymentId, order_id: null, service_payment_id: servicePaymentId, appointment_id: 18, mode: 'live', currency: 'MXN', scope: 'health_services', amount_cents: -10000, type: 'service_payment', created_at: date }); }
  reverseService() { if (!this.consultationPaid || this.consultationReversed) return; this.consultationReversed = true; this.consultationCanceled = true; this.balance += 10000; this.movements.unshift({ id: reversalId, order_id: null, service_payment_id: servicePaymentId, appointment_id: 18, mode: 'live', currency: 'MXN', scope: 'health_services', amount_cents: 10000, type: 'service_reversal', created_at: '2026-11-12T04:05:00Z' }); }
  result(withWallet = false) { return { recharge: this.recharge(), payment_intent_id: intentId, client_secret: intentId + '_secret_syntheticSecret456', wallet: withWallet ? this.wallet() : null }; }
  async install(context: BrowserContext) {
    await context.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      if (url.origin === webOrigin && req.method() === 'GET') { await route.continue(); return; }
      if (url.origin !== apiOrigin) { this.external.push(url.origin + url.pathname); await route.abort(); return; }
      const path = url.pathname.replace(apiPath, '');
      this.calls.push({ method: req.method(), path });
      const respond = async (data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': webOrigin }, body: JSON.stringify({ success: status < 400, data }) });
      if (req.method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: { 'access-control-allow-origin': webOrigin, 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'authorization,content-type' } }); return; }
      if (path === '/auth/login' && req.method() === 'POST') {
        if (this.loginFailures-- > 0) { await respond(null, 401); return; }
        await respond({ access_token: token, user: { role: 'patient', name: 'Paciente QA' } }); return;
      }
      if (path === '/auth/logout' && req.method() === 'POST') { await respond({}); return; }
      if (req.headers().authorization !== 'Bearer ' + token) { this.unexpected.push('Missing synthetic authorization'); await respond(null, 401); return; }
      if (path === '/patient/wallet/consultations' && req.method() === 'GET') {
        const data = this.consultations(), gate = this.consultationGate, status = this.expireConsultations ? 401 : 200;
        if (gate) await gate.promise;
        await respond(status === 401 ? null : data, status); return;
      }
      if (path === '/patient/wallet/consultations/18/quote' && req.method() === 'POST') {
        if (this.expireQuote) { await respond(null, 401); return; }
        this.consultationQuoted = true; await respond({ quote: this.quote() }); return;
      }
      if (path === '/patient/wallet/consultation-payments' && req.method() === 'POST') {
        const body = req.postDataJSON() as { quote_id: string; client_request_id: string };
        this.consultationBodies.push(body);
        if (this.expireServicePay) { await respond(null, 401); return; }
        if (this.servicePayGate) await this.servicePayGate.promise;
        if (this.serviceConflict) { this.serviceConflict = false; this.commitService(); await respond(null, 409); return; }
        if (this.consultationPaid && body.client_request_id !== this.consultationRequestId) { await respond(null, 409); return; }
        if (!this.consultationPaid && (!this.serviceEnabled || this.blocked)) { await respond(null, 503); return; }
        this.consultationRequestId ??= body.client_request_id; this.commitService();
        if (this.loseServiceResponse) { this.loseServiceResponse = false; this.transportFailures++; await route.abort('failed'); return; }
        await respond({ payment: this.servicePayment(), wallet: this.wallet() }); return;
      }
      if (path === '/patient/wallet' && req.method() === 'GET') {
        const data = this.expireWallet ? null : this.wallet(), status = this.expireWallet ? 401 : 200;
        const gate = this.walletGate;
        if (gate) await gate.promise;
        await respond(data, status); return;
      }
      if (path === '/patient/wallet/recharges' && req.method() === 'POST') {
        const body = req.postDataJSON() as { amount_cents: number; client_request_id: string };
        this.createBodies.push(body);
        if (this.createConflict) { this.createConflict = false; this.created = true; this.amount = 20000; await respond(null, 409); return; }
        this.amount = body.amount_cents; this.created = true;
        if (this.createGate) await this.createGate.promise;
        if (this.createFailures-- > 0) { await respond(null, 503); return; }
        await respond(this.result()); return;
      }
      if (path.startsWith('/patient/wallet/recharges/' + orderId + '/') && req.method() === 'POST') {
        const action = path.split('/').at(-1);
        if (action === 'refresh') {
          if (this.refreshGate) await this.refreshGate.promise;
          this.status = 'succeeded'; this.balance = this.amount;
          this.movements = [{ id: movementId, order_id: orderId, service_payment_id: null, appointment_id: null, mode: 'live', currency: 'MXN', scope: 'health_services', amount_cents: this.amount, type: 'recharge', created_at: date }];
          await respond(this.result(true)); return;
        }
        if (action === 'cancel') { this.status = 'canceled'; await respond(this.result(true)); return; }
        if (action === 'resume') { await respond(this.result()); return; }
      }
      this.unexpected.push(req.method() + ' ' + path); await respond(null, 404);
    });
  }
  count(path: string) { return this.calls.filter(call => call.method !== 'OPTIONS' && call.path.endsWith(path)).length; }
}

type Run = { page: Page; context: BrowserContext; fixture: Fixture; errors: string[]; consoleErrors: string[]; localWallet: string | undefined };
async function open(browser: Browser, viewport: { width: number; height: number }, fixture = new Fixture(), native = 'completed'): Promise<Run> {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await fixture.install(context);
  const state = createDemoState();
  await context.addInitScript(({ state, key }) => localStorage.setItem(key, JSON.stringify(state)), { state, key: STORAGE_KEY });
  const page = await context.newPage(), errors: string[] = [], consoleErrors: string[] = [];
  page.on('pageerror', error => errors.push(safe(error.message)));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(safe(message.text())); });
  await page.goto(webOrigin + '/wallet-account-qa?native=' + native, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await expect(page.getByTestId('wallet-account-login-open')).toBeVisible({ timeout: 120000 });
  const localWallet = await page.evaluate(key => JSON.stringify(JSON.parse(localStorage.getItem(key) ?? '{}').wallet), STORAGE_KEY);
  return { page, context, fixture, errors, consoleErrors, localWallet };
}
async function login(run: Run, expectedBalance = '$0.00') {
  await run.page.getByTestId('wallet-account-login-open').click();
  await run.page.getByTestId('wallet-account-login').fill('patient.qa@example.test');
  await run.page.getByTestId('wallet-account-password').fill('synthetic-password-only');
  await run.page.getByTestId('wallet-account-login-submit').click();
  await expect(run.page.getByTestId('wallet-balance')).toHaveText(expectedBalance);
  await expect(run.page.getByTestId('wallet-account-test-badge')).toHaveCount(0);
}
async function layout(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const box = await page.getByTestId('wallet-sheet').boundingBox();
  expect(box).not.toBeNull();
  const viewport = page.viewportSize()!;
  expect(box!.x).toBeGreaterThanOrEqual(-1); expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
  expect(await page.getByTestId('wallet-sheet').evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
}
async function snapshot(page: Page, name: string) {
  await layout(page); await page.screenshot({ path: resolve(output, name + '.png') });
}
async function finish(run: Run) {
  const storedWallet = await run.page.evaluate(key => JSON.stringify(JSON.parse(localStorage.getItem(key) ?? '{}').wallet), STORAGE_KEY);
  expect(storedWallet).toBe(run.localWallet);
  expect(run.errors).toEqual([]); expect(run.fixture.external).toEqual([]); expect(run.fixture.unexpected).toEqual([]);
  // Deliberate 401/503 fixtures can produce browser status errors, never application errors.
  expect(run.consoleErrors.filter(value => !/^Failed to load resource: the server responded with a status of (401|409|503)/.test(value) && !(run.fixture.transportFailures && /^Failed to load resource: net::ERR_FAILED/.test(value)))).toEqual([]);
  await run.context.close();
}

async function openConsultations(browser: Browser, fixture: Fixture, viewport = viewports[0], balance = '$300.00') {
  const run = await open(browser, viewport, fixture);
  await login(run, balance);
  await run.page.getByTestId('wallet-consultations-open').click();
  return run;
}
async function reviewConsultation(run: Run) {
  await run.page.getByTestId('wallet-consultation-review-18').click();
  await expect(run.page.getByTestId('wallet-consultation-price')).toHaveText('$100.00');
}
async function consultationScenarios(browser: Browser, results: Record<string, unknown>[]) {
  for (const viewport of viewports) {
    console.log('Wallet consultation QA: immutable price and single debit ' + viewport.width + 'x' + viewport.height);
    const fixture = new Fixture().enableConsultations();
    fixture.consultationTariff = { ...fixture.consultationTariff, id: 8, version: 3, amount_cents: 15000 };
    const run = await openConsultations(browser, fixture, viewport);
    await reviewConsultation(run);
    fixture.servicePayGate = deferred();
    await run.page.getByTestId('wallet-consultation-pay').evaluate(element => { (element as HTMLElement).click(); (element as HTMLElement).click(); });
    await expect.poll(() => fixture.consultationBodies.length).toBe(1);
    await expect(run.page.getByTestId('wallet-close')).toHaveAttribute('aria-disabled', 'true');
    await expect(run.page.getByTestId('wallet-backsubpages')).toHaveAttribute('aria-disabled', 'true');
    fixture.servicePayGate.release();
    await expect(run.page.getByTestId('wallet-consultation-status')).toHaveText('Consulta pagada');
    expect(fixture.consultationBodies[0].quote_id).toBe(quoteId); expect(fixture.balance).toBe(20000);
    const listButton = run.page.getByRole('button', { name: 'Ver mis consultas', exact: true });
    await listButton.scrollIntoViewIfNeeded(); await expect(listButton).toBeInViewport();
    await snapshot(run.page, 'consultation-paid-' + viewport.width + 'x' + viewport.height);
    await run.page.getByTestId('wallet-backsubpages').click();
    await expect(run.page.getByTestId('wallet-balance')).toHaveText('$200.00');
    expect(fixture.consultationBodies).toHaveLength(1); await finish(run);
    results.push({ viewport, scenario: 'consultation-immutable-price-single-debit', pass: true });
  }
  for (const reversed of [false, true]) {
    console.log('Wallet consultation QA: lost response persists through close/reopen ' + (reversed ? 'reversed' : 'blocked'));
    const fixture = new Fixture().enableConsultations(); fixture.loseServiceResponse = true;
    const run = await openConsultations(browser, fixture); await reviewConsultation(run);
    await run.page.getByTestId('wallet-consultation-pay').click();
    await expect(run.page.getByTestId('wallet-consultation-error')).toBeVisible();
    await expect(run.page.getByTestId('wallet-consultation-pay')).toHaveText('Verificar pago');
    await run.page.getByTestId('wallet-backsubpages').click();
    await expect(run.page.getByTestId('wallet-consultations-open')).toContainText('Pago por verificar');
    await run.page.getByTestId('wallet-close').click();
    await expect(run.page.getByTestId('wallet-qa-reopen')).toBeVisible();
    fixture.serviceEnabled = false;
    if (reversed) fixture.reverseService(); else fixture.blocked = true;
    await run.page.getByTestId('wallet-qa-reopen').click();
    await expect(run.page.getByTestId('wallet-balance')).toHaveText(reversed ? '$300.00' : '$0.00');
    await run.page.getByTestId('wallet-consultations-open').click();
    await expect(run.page.getByTestId('wallet-consultation-pay')).toHaveText('Verificar pago');
    await expect(run.page.getByTestId('wallet-consultation-pay')).not.toHaveAttribute('aria-disabled', 'true');
    await run.page.getByTestId('wallet-consultation-pay').click();
    await expect(run.page.getByTestId('wallet-consultation-status')).toHaveText(reversed ? 'Pago devuelto' : 'Consulta pagada');
    expect(fixture.consultationBodies).toHaveLength(2); expect(fixture.consultationBodies[1]).toEqual(fixture.consultationBodies[0]);
    expect(fixture.movements.filter(m => m.type === 'service_payment')).toHaveLength(1);
    await snapshot(run.page, reversed ? 'consultation-reversed-retry' : 'consultation-blocked-exact-retry');
    await finish(run); results.push({ scenario: reversed ? 'consultation-reversed-exact-retry-after-close' : 'consultation-blocked-exact-retry-after-close', pass: true });
  }
  for (const paidAtQuote of [false, true]) {
    console.log('Wallet consultation QA: another device paid ' + (paidAtQuote ? 'before quote' : 'at POST'));
    const fixture = new Fixture().enableConsultations(), run = await openConsultations(browser, fixture);
    await expect(run.page.getByTestId('wallet-consultation-review-18')).toBeVisible();
    if (paidAtQuote) fixture.commitService(); else fixture.serviceConflict = true;
    await run.page.getByTestId('wallet-consultation-review-18').click();
    if (!paidAtQuote) await run.page.getByTestId('wallet-consultation-pay').click();
    await expect(run.page.getByTestId('wallet-consultation-status')).toHaveText('Consulta pagada');
    expect(fixture.consultationBodies).toHaveLength(paidAtQuote ? 0 : 1);
    expect(fixture.balance).toBe(20000); await finish(run);
    results.push({ scenario: paidAtQuote ? 'consultation-paid-quote-readonly-reconciliation' : 'consultation-409-readonly-reconciliation', pass: true });
  }
  for (const step of ['list', 'quote', 'pay'] as const) {
    console.log('Wallet consultation QA: expired session at ' + step);
    const fixture = new Fixture().enableConsultations();
    fixture.expireConsultations = step === 'list'; fixture.expireQuote = step === 'quote'; fixture.expireServicePay = step === 'pay';
    const run = await openConsultations(browser, fixture);
    if (step !== 'list') await run.page.getByTestId('wallet-consultation-review-18').click();
    if (step === 'pay') await run.page.getByTestId('wallet-consultation-pay').click();
    await expect(run.page.getByTestId('wallet-account-login-submit')).toBeVisible();
    await expect(run.page.getByTestId('wallet-account-error')).toContainText('Tu sesión expiró');
    fixture.expireConsultations = false; fixture.expireQuote = false; fixture.expireServicePay = false;
    await run.page.getByTestId('wallet-account-password').fill('synthetic-password-only');
    await run.page.getByTestId('wallet-account-login-submit').click();
    await expect(run.page.getByTestId('wallet-balance')).toHaveText('$300.00');
    await expect(run.page.getByTestId('wallet-consultations-open')).toContainText('Pagar con mi saldo');
    await finish(run); results.push({ scenario: 'consultation-401-' + step + '-clears-session-and-attempt', pass: true });
  }
  console.log('Wallet consultation QA: initial stale GET cannot overwrite fresh list');
  const staleFixture = new Fixture().enableConsultations(); staleFixture.consultationGate = deferred();
  const stale = await openConsultations(browser, staleFixture);
  await expect.poll(() => staleFixture.count('/consultations')).toBe(1);
  const gate = staleFixture.consultationGate; staleFixture.consultationGate = null; staleFixture.withConsultation = false;
  await stale.page.getByTestId('wallet-consultations-refresh').click();
  await expect(stale.page.getByText('No tienes consultas disponibles para pagar.', { exact: true })).toBeVisible();
  const oldResponse = stale.page.waitForResponse(response => response.url().endsWith('/patient/wallet/consultations') && response.request().method() === 'GET');
  gate.release(); await (await oldResponse).finished();
  await stale.page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(stale.page.getByTestId('wallet-consultation-review-18')).toHaveCount(0);
  await expect(stale.page.getByText('No tienes consultas disponibles para pagar.', { exact: true })).toBeVisible();
  await finish(stale); results.push({ scenario: 'consultation-stale-list-rejected', pass: true });
  for (const condition of ['expired', 'insufficient', 'paused', 'blocked'] as const) {
    console.log('Wallet consultation QA: no new debit when ' + condition);
    const fixture = new Fixture().enableConsultations();
    if (condition === 'expired') fixture.consultationExpiresAt = '2020-01-01T00:00:00Z';
    if (condition === 'insufficient') { fixture.balance = 5000; fixture.movements[0].amount_cents = 5000; }
    if (condition === 'paused') fixture.serviceEnabled = false;
    if (condition === 'blocked') fixture.blocked = true;
    const run = await openConsultations(browser, fixture, viewports[0], condition === 'insufficient' ? '$50.00' : condition === 'blocked' ? '$0.00' : '$300.00');
    if (condition === 'paused' || condition === 'blocked') await expect(run.page.getByTestId('wallet-consultation-review-18')).toHaveAttribute('aria-disabled', 'true');
    else {
      await reviewConsultation(run);
      if (condition === 'insufficient') await expect(run.page.getByTestId('wallet-consultation-pay')).toHaveAttribute('aria-disabled', 'true');
      else {
        await expect(run.page.getByTestId('wallet-consultation-pay')).toHaveCount(0);
        fixture.consultationExpiresAt = new Date(Date.now() + 15 * 60000).toISOString();
        await run.page.getByRole('button', { name: 'Actualizar importe', exact: true }).click();
        await expect(run.page.getByTestId('wallet-consultation-pay')).toBeVisible();
      }
    }
    expect(fixture.consultationBodies).toHaveLength(0); await finish(run);
    results.push({ scenario: 'consultation-no-new-debit-' + condition, pass: true });
  }
  console.log('Wallet consultation QA: explicit logout clears an indeterminate attempt');
  const logoutFixture = new Fixture().enableConsultations(); logoutFixture.loseServiceResponse = true;
  const logout = await openConsultations(browser, logoutFixture); await reviewConsultation(logout);
  await logout.page.getByTestId('wallet-consultation-pay').click(); await expect(logout.page.getByTestId('wallet-consultation-error')).toBeVisible();
  await logout.page.getByTestId('wallet-backsubpages').click(); await logout.page.getByTestId('wallet-account-logout').click();
  await expect(logout.page.getByTestId('wallet-account-login-open')).toBeVisible(); await login(logout, '$200.00');
  await expect(logout.page.getByTestId('wallet-consultations-open')).toContainText('Pagar con mi saldo');
  await logout.page.getByTestId('wallet-consultations-open').click(); await expect(logout.page.getByText('Pagada', { exact: true })).toBeVisible();
  await expect(logout.page.getByTestId('wallet-consultation-pay')).toHaveCount(0); expect(logoutFixture.consultationBodies).toHaveLength(1);
  await finish(logout); results.push({ scenario: 'consultation-logout-clears-in-memory-attempt', pass: true });
}

async function main() {
  await mkdir(output, { recursive: true });
  try { await access(routeFile); throw new Error('Refusing to overwrite an existing QA route.'); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  await writeFile(routeFile, routeSource, 'utf8');
  let browser: Browser | undefined;
  const results: Record<string, unknown>[] = [];
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    for (const viewport of process.argv.includes('--consultations-only') ? [] : viewports) {
      const size = viewport.width + 'x' + viewport.height;
      console.log('Wallet QA: success and login validation ' + size);
      const run = await open(browser, viewport), { page, fixture } = run;
      try {
        fixture.loginFailures = 1;
        await page.getByTestId('wallet-account-login-open').click();
        await page.getByTestId('wallet-account-login').fill('patient.qa@example.test');
        await page.getByTestId('wallet-account-password').fill('synthetic-password-only');
        await page.getByTestId('wallet-account-login-submit').click();
        await expect(page.getByTestId('wallet-account-error')).toBeVisible();
        await expect(page.getByTestId('wallet-account-password')).toHaveValue('');
        await snapshot(page, 'login-error-' + size);
        await page.getByTestId('wallet-account-password').fill('synthetic-password-only');
        await page.getByTestId('wallet-account-login-submit').click();
        await expect(page.getByTestId('wallet-balance')).toHaveText('$0.00');
        await snapshot(page, 'overview-' + size);
        await page.getByTestId('wallet-recharge-open').click();
        await page.getByTestId('wallet-account-amount').fill('49.99');
        await page.getByTestId('wallet-account-prepare').click();
        await expect(page.getByTestId('wallet-account-error')).toContainText('entre $50');
        expect(fixture.createBodies).toHaveLength(0);
        await page.getByTestId('wallet-account-preset-100').click();
        fixture.createGate = deferred();
        await page.getByTestId('wallet-account-prepare').evaluate(element => { (element as HTMLElement).click(); (element as HTMLElement).click(); });
        await expect.poll(() => fixture.createBodies.length).toBe(1);
        await expect(page.getByTestId('wallet-account-amount')).toHaveAttribute('readonly', '');
        fixture.createGate.release();
        await expect(page.getByTestId('wallet-account-status')).toHaveText('Por completar');
        await snapshot(page, 'payment-ready-' + size);
        fixture.refreshGate = deferred();
        await page.getByTestId('wallet-account-pay-card').click();
        await expect.poll(() => fixture.count('/refresh')).toBe(1);
        await expect(page.getByTestId('wallet-account-status')).toHaveText('Por completar');
        expect(fixture.balance).toBe(0); expect(fixture.movements).toHaveLength(0);
        fixture.refreshGate.release();
        await expect(page.getByTestId('wallet-account-status')).toHaveText('Recarga confirmada');
        await snapshot(page, 'confirmed-' + size);
        await page.getByTestId('wallet-account-done').click();
        await expect(page.getByTestId('wallet-balance')).toHaveText('$100.00');
        await expect(page.getByTestId('wallet-account-movement')).toHaveCount(1);
        await snapshot(page, 'credited-' + size);
        fixture.expireWallet = true;
        await page.getByTestId('wallet-account-refresh').click();
        await expect(page.getByTestId('wallet-account-login-submit')).toBeVisible();
        await expect(page.getByTestId('wallet-balance')).toHaveCount(0);
        await expect(page.getByTestId('wallet-account-password')).toHaveValue('');
        await finish(run);
        results.push({ viewport, scenario: 'login-validation-success-expiry', pass: true, singleCreate: fixture.createBodies.length === 1, creditOnlyAfterServer: true });
      } catch (error) { fixture.createGate?.release(); fixture.refreshGate?.release(); await page.screenshot({ path: resolve(output, 'failure-success-' + size + '.png') }); throw error; }

      console.log('Wallet QA: sheet cancellation and logout ' + size);
      const cancel = await open(browser, viewport, new Fixture(), 'canceled');
      await login(cancel); await cancel.page.getByTestId('wallet-recharge-open').click();
      await cancel.page.getByTestId('wallet-account-preset-100').click(); await cancel.page.getByTestId('wallet-account-prepare').click();
      await cancel.page.getByTestId('wallet-account-pay-card').click();
      await expect(cancel.page.getByTestId('wallet-account-status')).toHaveText('Recarga cancelada');
      expect(cancel.fixture.count('/cancel')).toBe(1); expect(cancel.fixture.count('/refresh')).toBe(0);
      await snapshot(cancel.page, 'canceled-' + size); await cancel.page.getByTestId('wallet-account-done').click();
      await expect(cancel.page.getByTestId('wallet-balance')).toHaveText('$0.00'); await expect(cancel.page.getByTestId('wallet-account-movement')).toHaveCount(0);
      await cancel.page.getByTestId('wallet-account-logout').click();
      await expect(cancel.page.getByTestId('wallet-account-login-open')).toBeVisible();
      await expect.poll(() => cancel.fixture.count('/auth/logout')).toBe(1);
      await expect(cancel.page.getByTestId('wallet-balance')).toHaveCount(0); await finish(cancel);
      results.push({ viewport, scenario: 'native-canceled-server-cancel-logout', pass: true, noCredit: true });

      console.log('Wallet QA: ambiguous request and resume ' + size);
      const retry = await open(browser, viewport); retry.fixture.createFailures = 1;
      await login(retry); await retry.page.getByTestId('wallet-recharge-open').click();
      await retry.page.getByTestId('wallet-account-preset-100').click(); await retry.page.getByTestId('wallet-account-prepare').click();
      await expect(retry.page.getByTestId('wallet-account-error')).toBeVisible();
      await expect(retry.page.getByTestId('wallet-account-amount')).toHaveAttribute('readonly', '');
      await expect(retry.page.getByTestId('wallet-account-preset-200')).toBeDisabled();
      await snapshot(retry.page, 'ambiguous-' + size); await retry.page.getByTestId('wallet-account-prepare').click();
      await expect(retry.page.getByTestId('wallet-account-status')).toHaveText('Por completar');
      expect(retry.fixture.createBodies).toHaveLength(2); expect(retry.fixture.createBodies[0]).toEqual(retry.fixture.createBodies[1]);
      await retry.page.getByTestId('wallet-backsubpages').click(); await expect(retry.page.getByTestId('wallet-account-pending')).toBeVisible();
      await expect(retry.page.getByTestId('wallet-balance')).toHaveText('$0.00');
      await retry.page.getByTestId('wallet-account-pending').click(); await retry.page.getByTestId('wallet-account-resume').click();
      await expect(retry.page.getByTestId('wallet-account-pay-card')).toBeVisible(); expect(retry.fixture.count('/resume')).toBe(1); expect(retry.fixture.createBodies).toHaveLength(2);
      await snapshot(retry.page, 'resumed-' + size); await finish(retry);
      results.push({ viewport, scenario: 'ambiguous-idempotent-retry-pending-resume', pass: true, sameRequest: true });

      console.log('Wallet QA: unknown API mode fails closed ' + size);
      const invalid = await open(browser, viewport); invalid.fixture.unknownMode = true;
      await invalid.page.getByTestId('wallet-account-login-open').click();
      await invalid.page.getByTestId('wallet-account-login').fill('patient.qa@example.test');
      await invalid.page.getByTestId('wallet-account-password').fill('synthetic-password-only'); await invalid.page.getByTestId('wallet-account-login-submit').click();
      await expect(invalid.page.getByText('Saldo sin consultar', { exact: true })).toBeVisible();
      await expect(invalid.page.getByTestId('wallet-balance')).toHaveCount(0);
      await expect(invalid.page.getByTestId('wallet-recharge-open')).toBeDisabled();
      expect(invalid.fixture.createBodies).toHaveLength(0); await snapshot(invalid.page, 'invalid-mode-' + size); await finish(invalid);
      results.push({ viewport, scenario: 'unknown-api-mode-fail-closed', pass: true });

      console.log('Wallet QA: conflict recovers existing pending recharge ' + size);
      const conflict = await open(browser, viewport);
      await login(conflict); await conflict.page.getByTestId('wallet-recharge-open').click();
      await conflict.page.getByTestId('wallet-account-preset-100').click(); conflict.fixture.createConflict = true;
      const walletReads = conflict.fixture.count('/patient/wallet');
      await conflict.page.getByTestId('wallet-account-prepare').click();
      await expect(conflict.page.getByTestId('wallet-account-status')).toHaveText('Por completar');
      await expect(conflict.page.getByTestId('wallet-account-review-amount')).toHaveText('$200.00');
      await expect(conflict.page.getByTestId('wallet-account-error')).toHaveCount(0);
      expect(conflict.fixture.createBodies).toHaveLength(1); expect(conflict.fixture.count('/patient/wallet')).toBeGreaterThan(walletReads);
      await conflict.page.getByTestId('wallet-account-resume').click();
      await expect(conflict.page.getByTestId('wallet-account-pay-card')).toBeVisible();
      expect(conflict.fixture.count('/resume')).toBe(1); expect(conflict.fixture.createBodies).toHaveLength(1);
      await snapshot(conflict.page, 'conflict-pending-' + size); await finish(conflict);
      results.push({ viewport, scenario: '409-existing-pending-recovery', pass: true, originalPendingAmountPreserved: true, noDuplicateCreate: true });

      console.log('Wallet QA: native error reconciles server success ' + size);
      const reconciled = await open(browser, viewport, new Fixture(), 'error');
      await login(reconciled); await reconciled.page.getByTestId('wallet-recharge-open').click();
      await reconciled.page.getByTestId('wallet-account-preset-100').click(); await reconciled.page.getByTestId('wallet-account-prepare').click();
      await reconciled.page.getByTestId('wallet-account-pay-card').click();
      await expect(reconciled.page.getByTestId('wallet-account-status')).toHaveText('Recarga confirmada');
      await expect(reconciled.page.getByTestId('wallet-account-error')).toHaveCount(0);
      expect(reconciled.fixture.count('/refresh')).toBe(1); expect(reconciled.fixture.count('/cancel')).toBe(0);
      await snapshot(reconciled.page, 'native-error-reconciled-' + size);
      await reconciled.page.getByTestId('wallet-account-done').click(); await expect(reconciled.page.getByTestId('wallet-balance')).toHaveText('$100.00');
      await expect(reconciled.page.getByTestId('wallet-account-movement')).toHaveCount(1); await finish(reconciled);
      results.push({ viewport, scenario: 'native-error-server-paid-reconciliation', pass: true, nativeErrorSuppressedOnlyAfterServerSuccess: true });

      console.log('Wallet QA: late GET cannot overwrite confirmed balance ' + size);
      const late = await open(browser, viewport);
      await login(late); await late.page.getByTestId('wallet-recharge-open').click();
      await late.page.getByTestId('wallet-account-preset-100').click(); await late.page.getByTestId('wallet-account-prepare').click();
      await expect(late.page.getByTestId('wallet-account-pay-card')).toBeVisible();
      const oldRead = deferred(); late.fixture.walletGate = oldRead;
      const beforeOldRead = late.fixture.count('/patient/wallet');
      await late.page.getByTestId('wallet-backsubpages').click();
      await expect.poll(() => late.fixture.count('/patient/wallet')).toBe(beforeOldRead + 1);
      // The stale overview has not received a pending row, so reopening must preserve the known result.
      await late.page.getByTestId('wallet-recharge-open').click();
      await expect(late.page.getByTestId('wallet-account-pay-card')).toBeVisible();
      expect(late.fixture.createBodies).toHaveLength(1);
      await late.page.getByTestId('wallet-account-pay-card').click();
      await expect(late.page.getByTestId('wallet-account-status')).toHaveText('Recarga confirmada');
      const oldResponse = late.page.waitForResponse(response => response.url() === apiOrigin + apiPath + '/patient/wallet' && response.request().method() === 'GET');
      oldRead.release(); await (await oldResponse).finished();
      await late.page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      // Hold the next fresh GET so it cannot conceal an overwrite from the earlier stale GET.
      const freshRead = deferred(); late.fixture.walletGate = freshRead;
      const beforeFreshRead = late.fixture.count('/patient/wallet');
      await late.page.getByTestId('wallet-account-done').click();
      await expect.poll(() => late.fixture.count('/patient/wallet')).toBe(beforeFreshRead + 1);
      await expect(late.page.getByTestId('wallet-balance')).toHaveText('$100.00');
      await expect(late.page.getByTestId('wallet-account-movement')).toHaveCount(1);
      await snapshot(late.page, 'late-get-protected-' + size); freshRead.release();
      await finish(late);
      results.push({ viewport, scenario: 'late-stale-get-cannot-overwrite-credit', pass: true, creditPreservedBeforeFreshRead: true, knownPendingPreserved: true });
    }
    await consultationScenarios(browser, results);
    await writeFile(resolve(output, 'result.json'), JSON.stringify({ passed: true, fixturesOnly: true, noExternalTraffic: true, noLocalWalletCredit: true, scenarios: results }, null, 2));
    console.log('Wallet QA PASS: ' + results.length + ' isolated viewport scenarios.');
  } catch (error) {
    await writeFile(resolve(output, 'result.json'), JSON.stringify({ passed: false, fixturesOnly: true, completed: results, error: safe(error instanceof Error ? error.message : String(error)) }, null, 2));
    throw error;
  } finally {
    await browser?.close();
    if (await readFile(routeFile, 'utf8') === routeSource) await unlink(routeFile);
    else throw new Error('The temporary QA route changed externally; it was not removed.');
  }
}

void main().catch(error => { console.error(safe(error instanceof Error ? error.message : String(error))); process.exitCode = 1; });
