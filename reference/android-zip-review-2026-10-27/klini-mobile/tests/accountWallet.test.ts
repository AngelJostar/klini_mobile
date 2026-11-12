import assert from 'node:assert/strict';
import test from 'node:test';
import { newWalletRequestId, parseAccountRechargeAmount, walletUuid, type AccountConsultationQuote, type AccountRecharge, type PaymentMode } from '../src/domain/accountWallet';
import { AccountWalletError, accountWalletSelected, createAccountWalletClient, getAccountWalletConnection, readAccountConsultationQuote, readAccountConsultations, readAccountWallet, validateAccountWalletConnection } from '../src/services/accountWallet';

const BASE = 'http://127.0.0.1:8002/api/mobile/v1';
const LIVE_BASE = 'https://api.example.test/api/mobile/v1';
const TOKEN = '17|synthetic_patient_token_for_contract_tests';
const ORDER = 'a173598f-a962-4d9f-8dd4-5e41f06da338';
const OTHER_ORDER = 'b173598f-a962-4d9f-8dd4-5e41f06da338';
const MOVEMENT = 'c173598f-a962-4d9f-8dd4-5e41f06da338';
const REQUEST = 'd173598f-a962-4d9f-8dd4-5e41f06da338';
const INTENT = 'pi_syntheticIntent123';
const SECRET = INTENT + '_secret_syntheticSecret456';
const DATE = '2026-11-12T04:00:00.000000Z';
const QUOTE = 'f173598f-a962-4d9f-8dd4-5e41f06da338';
const PAYMENT = '1173598f-a962-4d9f-8dd4-5e41f06da338';
const REVERSAL = '2173598f-a962-4d9f-8dd4-5e41f06da338';

const paymentConfig = (mode: PaymentMode = 'test') => ({ enabled: true, service_payments_enabled: true, country: 'MX', publishable_key: `pk_${mode}_syntheticPublishable123`, merchant_identifier: 'merchant.mx.klini.review', min_amount_cents: 5000, max_amount_cents: 1000000 });
const recharge = (overrides: Record<string, unknown> = {}, mode: PaymentMode = 'test') => ({ id: ORDER, mode, currency: 'MXN', scope: 'health_services', amount_cents: 20000, status: 'requires_payment_method', created_at: DATE, ...overrides });
const movement = (overrides: Record<string, unknown> = {}, mode: PaymentMode = 'test') => ({ id: MOVEMENT, order_id: ORDER, service_payment_id: null, appointment_id: null, mode, currency: 'MXN', scope: 'health_services', amount_cents: 20000, type: 'recharge', created_at: DATE, ...overrides });
const wallet = (overrides: Record<string, unknown> = {}, mode: PaymentMode = 'test') => ({ mode, currency: 'MXN', scope: 'health_services', balance_cents: 0, available_balance_cents: overrides.blocked ? 0 : Math.max(0, Number(overrides.balance_cents ?? 0)), blocked: false, movements: [], has_more_movements: false, pending_recharges: [], payment_config: paymentConfig(mode), ...overrides });
const paidWallet = () => wallet({ balance_cents: 20000, movements: [movement()] });
const result = (overrides: Record<string, unknown> = {}) => ({ recharge: recharge(), payment_intent_id: INTENT, client_secret: SECRET, wallet: null, ...overrides });
const entry = (overrides: Partial<AccountRecharge> = {}): AccountRecharge => ({ id: ORDER, mode: 'test', currency: 'MXN', scope: 'health_services', amountCents: 20000, status: 'requires_payment_method', createdAt: DATE, ...overrides });
const tariff = (overrides: Record<string, unknown> = {}) => ({ id: 7, version: 2, amount_cents: 10000, currency: 'MXN', modality: 'in_person', ...overrides });
const quote = (overrides: Record<string, unknown> = {}, mode: PaymentMode = 'test') => ({ id: QUOTE, appointment_id: 18, tariff_id: 7, tariff_version: 2, amount_cents: 10000, currency: 'MXN', scope: 'health_services', mode, expires_at: '2026-11-12T04:15:00Z', status: 'valid', ...overrides });
const payment = (overrides: Record<string, unknown> = {}, mode: PaymentMode = 'test') => ({ id: PAYMENT, appointment_id: 18, quote_id: QUOTE, amount_cents: 10000, currency: 'MXN', scope: 'health_services', mode, status: 'paid', paid_at: DATE, reversed_at: null, ...overrides });
const consultation = (overrides: Record<string, unknown> = {}) => ({ id: 18, doctor: { name: 'Dra. Contrato' }, starts_at: '2026-11-13T12:00:00Z', modality: 'Presencial', status: 'confirmed', tariff: tariff(), quote: null, payment: null, ...overrides });
const serviceMovement = (overrides: Record<string, unknown> = {}, mode: PaymentMode = 'test') => movement({ id: PAYMENT, order_id: null, service_payment_id: PAYMENT, appointment_id: 18, type: 'service_payment', amount_cents: -10000, ...overrides }, mode);
const serviceWallet = (overrides: Record<string, unknown> = {}) => wallet({ balance_cents: 10000, movements: [serviceMovement(), movement()], ...overrides });
type Call = { url: string; init: RequestInit };

function fixture(data: unknown, { status = 200, mode = 'test' as PaymentMode } = {}) {
  const calls: Call[] = [];
  const client = createAccountWalletClient({ baseUrl: mode === 'live' ? LIVE_BASE : BASE, mode, fetchImpl: async (url, init = {}) => {
    calls.push({ url: String(url), init });
    return Response.json({ success: true, data }, { status });
  } });
  return { client, calls };
}

test('account recharge amounts use exact cents and the first-stage 50..10000 MXN limits', () => {
  for (const [input, expected] of [['50', 5000], ['50.01', 5001], ['123,45', 12345], ['10000', 1000000], [' 200.00 ', 20000]] as const) assert.equal(parseAccountRechargeAmount(input), expected);
  for (const input of ['', '0', '49.99', '10000.01', '50.000', '1e3', '$100', '-100', '+100', '1,000.00', 'Infinity', 'NaN']) assert.throws(() => parseAccountRechargeAmount(input));
  const first = newWalletRequestId(), second = newWalletRequestId();
  assert.match(first, walletUuid); assert.match(second, walletUuid); assert.notEqual(first, second);
});

test('connection requires explicit strict mode and HTTPS for live or private HTTP for test', () => {
  for (const baseUrl of [BASE, 'http://localhost:8002/api/mobile/v1/', 'http://[::1]:8002/api/mobile/v1', 'http://192.168.1.2/api/mobile/v1', 'http://10.0.1.2/api/mobile/v1', 'http://172.16.1.2/api/mobile/v1', 'http://172.31.1.2/api/mobile/v1']) {
    assert.equal(validateAccountWalletConnection(baseUrl, 'test').mode, 'test');
    assert.throws(() => validateAccountWalletConnection(baseUrl, 'live'), { code: 'configuration' });
  }
  assert.deepEqual(validateAccountWalletConnection(LIVE_BASE + '/', 'live'), { baseUrl: LIVE_BASE, mode: 'live' });
  for (const mode of ['', 'TEST', 'sandbox', 'production', null, undefined]) assert.throws(() => validateAccountWalletConnection(LIVE_BASE, mode), { code: 'configuration' });
  for (const baseUrl of ['http://api.example.test/api/mobile/v1', 'http://8.8.8.8/api/mobile/v1', 'http://172.15.1.2/api/mobile/v1', 'http://172.32.1.2/api/mobile/v1', 'ftp://localhost/api/mobile/v1', LIVE_BASE + '/wallet', LIVE_BASE + '?token=synthetic', LIVE_BASE + '#fragment', 'https://name:password@api.example.test/api/mobile/v1', 'not a URL']) assert.throws(() => validateAccountWalletConnection(baseUrl, 'test'), { code: 'configuration' });
});

test('nonempty invalid public configuration selects the connected flow and never a demo fallback', () => {
  const oldUrl = process.env.EXPO_PUBLIC_PAYMENTS_API_URL, oldMode = process.env.EXPO_PUBLIC_PAYMENTS_MODE;
  try {
    delete process.env.EXPO_PUBLIC_PAYMENTS_API_URL; delete process.env.EXPO_PUBLIC_PAYMENTS_MODE;
    assert.equal(accountWalletSelected(), false);
    assert.throws(getAccountWalletConnection, { code: 'configuration' });
    for (const [url, mode] of [['not a URL', 'test'], [BASE, 'live'], ['', 'test'], [BASE, 'sandbox']]) {
      process.env.EXPO_PUBLIC_PAYMENTS_API_URL = url; process.env.EXPO_PUBLIC_PAYMENTS_MODE = mode;
      assert.equal(accountWalletSelected(), true); assert.throws(getAccountWalletConnection, { code: 'configuration' });
    }
    process.env.EXPO_PUBLIC_PAYMENTS_API_URL = BASE; process.env.EXPO_PUBLIC_PAYMENTS_MODE = 'test';
    assert.deepEqual(getAccountWalletConnection(), { baseUrl: BASE, mode: 'test' });
  } finally {
    if (oldUrl === undefined) delete process.env.EXPO_PUBLIC_PAYMENTS_API_URL; else process.env.EXPO_PUBLIC_PAYMENTS_API_URL = oldUrl;
    if (oldMode === undefined) delete process.env.EXPO_PUBLIC_PAYMENTS_MODE; else process.env.EXPO_PUBLIC_PAYMENTS_MODE = oldMode;
  }
});

test('wallet accepts server-owned totals, partial movement history and signed refunds', () => {
  assert.equal(readAccountWallet(wallet(), 'test').balanceCents, 0);
  const partial = readAccountWallet(wallet({ balance_cents: 90000, has_more_movements: true, movements: [movement()] }), 'test');
  assert.equal(partial.balanceCents, 90000); assert.equal(partial.hasMoreMovements, true);
  const refund = readAccountWallet(wallet({ balance_cents: 15000, movements: [movement(), movement({ id: OTHER_ORDER, type: 'refund', amount_cents: -5000 })] }), 'test');
  assert.equal(refund.movements[1].amountCents, -5000);
  assert.equal(readAccountWallet(wallet({ payment_config: { enabled: false, service_payments_enabled: true, country: 'MX', min_amount_cents: 5000, max_amount_cents: 1000000 } }), 'test').paymentConfiguration, null);
});

test('wallet rejects crossed modes, wrong currency/scope, malformed totals and configuration', () => {
  for (const value of [null, [], {}, wallet({ mode: 'live' }), wallet({ currency: 'USD' }), wallet({ scope: 'digital' }), wallet({ balance_cents: -1 }), wallet({ balance_cents: 1.5 }), wallet({ balance_cents: Number.MAX_SAFE_INTEGER + 1 }), wallet({ blocked: 'false' }), wallet({ has_more_movements: 1 }), wallet({ payment_config: null }), wallet({ payment_config: { ...paymentConfig(), country: 'US' } }), wallet({ payment_config: { ...paymentConfig(), enabled: 'true' } }), wallet({ payment_config: { ...paymentConfig(), publishable_key: paymentConfig('live').publishable_key } }), wallet({ payment_config: { ...paymentConfig(), publishable_key: 'sk_test_syntheticPrivateOnly' } }), wallet({ payment_config: { ...paymentConfig(), merchant_identifier: 'wrong' } }), wallet({ movements: [movement({}, 'live')] }), wallet({ pending_recharges: [recharge({}, 'live')] })]) assert.throws(() => readAccountWallet(value, 'test'), { code: 'invalid_response' });
  assert.throws(() => readAccountWallet(wallet(), 'live'), { code: 'invalid_response' });
  assert.equal(readAccountWallet(wallet({}, 'live'), 'live').paymentConfiguration?.mode, 'live');
});

test('wallet rejects duplicated arrays, malformed movements and settled pending entries', () => {
  const pending = recharge();
  for (const value of [wallet({ movements: [movement(), movement()] }), wallet({ pending_recharges: [pending, pending] }), wallet({ movements: Array.from({ length: 101 }, () => movement()) }), wallet({ pending_recharges: Array.from({ length: 21 }, () => pending) }), wallet({ movements: [movement({ id: 'not-a-uuid' })] }), wallet({ movements: [movement({ order_id: 'not-an-order' })] }), wallet({ movements: [movement({ amount_cents: 1.5 })] }), wallet({ movements: [movement({ type: 'refund', amount_cents: 0 })] }), wallet({ movements: [movement({ created_at: 'not-a-date' })] }), wallet({ pending_recharges: [recharge({ status: 'succeeded' })] }), wallet({ pending_recharges: [recharge({ status: 'canceled' })] }), wallet({ pending_recharges: [recharge({ amount_cents: 4999 })] }), wallet({ pending_recharges: [recharge({ amount_cents: 1000001 })] })]) assert.throws(() => readAccountWallet(value, 'test'), { code: 'invalid_response' });
});

test('one order cannot have duplicate recharge credits or be credited and pending at the same time', () => {
  assert.throws(() => readAccountWallet(wallet({ balance_cents: 40000, movements: [movement(), movement({ id: OTHER_ORDER })] }), 'test'), { code: 'invalid_response' });
  assert.throws(() => readAccountWallet(wallet({ balance_cents: 20000, movements: [movement()], pending_recharges: [recharge()] }), 'test'), { code: 'invalid_response' });
  const partialRefunds = readAccountWallet(wallet({ balance_cents: 10000, movements: [movement(), movement({ id: OTHER_ORDER, type: 'refund', amount_cents: -5000 }), movement({ id: REQUEST, type: 'refund', amount_cents: -5000 })] }), 'test');
  assert.equal(partialRefunds.movements.length, 3);
});

test('complete movement history must sum exactly to the server balance', () => {
  for (const value of [wallet({ balance_cents: 1 }), wallet({ balance_cents: 19999, movements: [movement()] }), wallet({ balance_cents: 20001, movements: [movement()] })]) {
    assert.throws(() => readAccountWallet(value, 'test'), { code: 'invalid_response' });
  }
  assert.equal(readAccountWallet(paidWallet(), 'test').balanceCents, 20000);
  // A truncated page cannot establish the whole ledger sum.
  assert.equal(readAccountWallet(wallet({ balance_cents: 90000, has_more_movements: true, movements: [movement()] }), 'test').balanceCents, 90000);
});

test('complete history rejects orphan refunds and refunds exceeding their own order credit', () => {
  const otherCredit = movement({ id: OTHER_ORDER, order_id: OTHER_ORDER });
  const orphan = movement({ id: REQUEST, order_id: OTHER_ORDER, type: 'refund', amount_cents: -5000 });
  const excessive = movement({ id: REQUEST, type: 'refund', amount_cents: -20001 });
  const firstPartial = movement({ id: REQUEST, type: 'refund', amount_cents: -15000 });
  const secondPartial = movement({ id: 'e173598f-a962-4d9f-8dd4-5e41f06da338', type: 'refund', amount_cents: -6000 });
  // Each DTO has a nonnegative balance matching its total, so only the order-level check can reject it.
  for (const value of [wallet({ balance_cents: 15000, movements: [movement(), orphan] }), wallet({ balance_cents: 19999, movements: [movement(), otherCredit, excessive] }), wallet({ balance_cents: 19000, movements: [movement(), otherCredit, firstPartial, secondPartial] })]) {
    assert.throws(() => readAccountWallet(value, 'test'), { code: 'invalid_response' });
  }
  assert.equal(readAccountWallet(wallet({ movements: [movement(), movement({ id: REQUEST, type: 'refund', amount_cents: -20000 })] }), 'test').balanceCents, 0);
  // A refund's credit can be on an earlier page; the partial response still uses the server total.
  assert.equal(readAccountWallet(wallet({ balance_cents: 15000, has_more_movements: true, movements: [orphan] }), 'test').balanceCents, 15000);
});

test('consultation debits reduce available funds and cancellation reverses the exact service source', () => {
  const paid = readAccountWallet(serviceWallet(), 'test');
  assert.equal(paid.balanceCents, 10000); assert.equal(paid.availableBalanceCents, 10000);
  assert.deepEqual(paid.movements[0], { id: PAYMENT, orderId: null, servicePaymentId: PAYMENT, appointmentId: 18, type: 'service_payment', amountCents: -10000, createdAt: DATE });
  const reversed = readAccountWallet(serviceWallet({ balance_cents: 20000, movements: [serviceMovement({ id: REVERSAL, type: 'service_reversal', amount_cents: 10000 }), serviceMovement(), movement()] }), 'test');
  assert.equal(reversed.balanceCents, 20000); assert.equal(reversed.availableBalanceCents, 20000);
});

test('a recharge refund after consumption preserves a signed debt and a later reversal never unblocks it', () => {
  const refund = movement({ id: OTHER_ORDER, type: 'refund', amount_cents: -20000 });
  const blockedConfig = { ...paymentConfig(), enabled: false, service_payments_enabled: false };
  const debt = readAccountWallet(serviceWallet({ balance_cents: -10000, blocked: true, payment_config: blockedConfig, movements: [refund, serviceMovement(), movement()] }), 'test');
  assert.equal(debt.balanceCents, -10000); assert.equal(debt.availableBalanceCents, 0); assert.equal(debt.blocked, true);
  const restored = readAccountWallet(serviceWallet({ balance_cents: 0, blocked: true, payment_config: blockedConfig, movements: [serviceMovement({ id: REVERSAL, type: 'service_reversal', amount_cents: 10000 }), refund, serviceMovement(), movement()] }), 'test');
  assert.equal(restored.availableBalanceCents, 0); assert.equal(restored.blocked, true); assert.equal(restored.servicePaymentsEnabled, false);
  const positiveBlocked = readAccountWallet(wallet({ balance_cents: 20000, blocked: true, payment_config: blockedConfig, movements: [movement()] }), 'test');
  assert.equal(positiveBlocked.availableBalanceCents, 0);
  assert.throws(() => readAccountWallet(wallet({ balance_cents: -10000, has_more_movements: true }), 'test'), { code: 'invalid_response' });
});

test('service collection and spending flags are independent and available funds must match the signed balance', () => {
  const spendingOnly = readAccountWallet(wallet({ payment_config: { ...paymentConfig(), enabled: false } }), 'test');
  assert.equal(spendingOnly.paymentConfiguration, null); assert.equal(spendingOnly.servicePaymentsEnabled, true);
  const collectionOnly = readAccountWallet(wallet({ payment_config: { ...paymentConfig(), service_payments_enabled: false } }), 'test');
  assert.ok(collectionOnly.paymentConfiguration); assert.equal(collectionOnly.servicePaymentsEnabled, false);
  for (const candidate of [wallet({ available_balance_cents: undefined }), wallet({ available_balance_cents: -1 }), wallet({ available_balance_cents: 0.5 }), serviceWallet({ available_balance_cents: 20000 }), wallet({ payment_config: { ...paymentConfig(), service_payments_enabled: undefined } }), wallet({ payment_config: { ...paymentConfig(), service_payments_enabled: 'true' } }), wallet({ blocked: true }), wallet({ blocked: true, payment_config: { ...paymentConfig(), enabled: false } })]) {
    assert.throws(() => readAccountWallet(candidate, 'test'), { code: 'invalid_response' });
  }
});

test('movement sources, debit uniqueness and exact cancellation amounts cannot cross appointments', () => {
  const badSources = [serviceMovement({ order_id: ORDER }), serviceMovement({ service_payment_id: null }), serviceMovement({ appointment_id: null }), serviceMovement({ appointment_id: 18.5 }), serviceMovement({ amount_cents: 10000 }), serviceMovement({ amount_cents: -4999 }), movement({ service_payment_id: PAYMENT }), movement({ appointment_id: 18 }), movement({ order_id: null }), serviceMovement({ type: 'service_reversal', amount_cents: -10000 })];
  for (const candidate of badSources) assert.throws(() => readAccountWallet(wallet({ movements: [candidate], has_more_movements: true }), 'test'), { code: 'invalid_response' });
  for (const movements of [
    [serviceMovement(), serviceMovement({ id: OTHER_ORDER })],
    [serviceMovement(), serviceMovement({ id: OTHER_ORDER, service_payment_id: OTHER_ORDER })],
    [serviceMovement(), serviceMovement({ id: REVERSAL, type: 'service_reversal', amount_cents: 5000 })],
    [serviceMovement(), serviceMovement({ id: REVERSAL, type: 'service_reversal', amount_cents: 10000, appointment_id: 19 })],
    [serviceMovement({ id: REVERSAL, type: 'service_reversal', amount_cents: 10000 }), serviceMovement({ id: OTHER_ORDER, type: 'service_reversal', amount_cents: 10000 })],
  ]) assert.throws(() => readAccountWallet(wallet({ movements, has_more_movements: true }), 'test'), { code: 'invalid_response' });
  const orphan = serviceMovement({ id: REVERSAL, type: 'service_reversal', amount_cents: 10000 });
  assert.throws(() => readAccountWallet(wallet({ balance_cents: 10000, movements: [orphan] }), 'test'), { code: 'invalid_response' });
  assert.equal(readAccountWallet(wallet({ balance_cents: 10000, movements: [orphan], has_more_movements: true }), 'test').balanceCents, 10000);
});

test('consultations GET only reads eligible own consultation data without creating a quote', async () => {
  const { client, calls } = fixture({ appointments: [consultation()], has_more: false });
  const value = await client.consultations(TOKEN);
  assert.equal(value.appointments[0].doctor.name, 'Dra. Contrato'); assert.equal(value.appointments[0].tariff?.amountCents, 10000); assert.equal(value.appointments[0].quote, null);
  assert.equal(calls[0].url, BASE + '/patient/wallet/consultations'); assert.equal(calls[0].init.method, 'GET'); assert.equal(calls[0].init.body, undefined);
  const withoutTariff = readAccountConsultations({ appointments: [consultation({ tariff: null })], has_more: true }, 'test');
  assert.equal(withoutTariff.appointments[0].tariff, null); assert.equal(withoutTariff.hasMore, true);
});

test('consultation list validates identity, eligibility, tariff history and quote/payment binding', () => {
  const paid = consultation({ quote: quote({ status: 'paid' }), payment: payment() });
  assert.equal(readAccountConsultations({ appointments: [paid], has_more: false }, 'test').appointments[0].payment?.id, PAYMENT);
  // A valid immutable quote retains its old published price after a physician publishes a new tariff version.
  assert.equal(readAccountConsultations({ appointments: [consultation({ tariff: tariff({ id: 8, version: 3, amount_cents: 15000 }), quote: quote() })], has_more: false }, 'test').appointments[0].quote?.amountCents, 10000);
  const invalidEntries = [consultation({ id: 0 }), consultation({ doctor: { name: '' } }), consultation({ starts_at: 'invalid' }), consultation({ modality: 'Virtual' }), consultation({ status: 'scheduled' }), consultation({ tariff: undefined }), consultation({ tariff: tariff({ amount_cents: 4999 }) }), consultation({ tariff: tariff({ currency: 'USD' }) }), consultation({ tariff: tariff({ modality: 'online' }) }), consultation({ quote: quote({ appointment_id: 19 }) }), consultation({ quote: quote({}, 'live') }), consultation({ quote: quote({ tariff_version: 1 }) }), consultation({ quote: quote({ amount_cents: 10001 }) }), consultation({ quote: quote({ status: 'paid' }) }), consultation({ payment: payment() }), consultation({ quote: quote(), payment: payment() }), consultation({ quote: quote({ status: 'paid' }), payment: payment({ quote_id: OTHER_ORDER }) }), consultation({ quote: quote({ status: 'paid' }), payment: payment({ appointment_id: 19 }) }), consultation({ quote: quote({ status: 'paid' }), payment: payment({ amount_cents: 10001 }) }), consultation({ quote: quote({ status: 'paid' }), payment: payment({ reversed_at: DATE }) })];
  for (const candidate of invalidEntries) assert.throws(() => readAccountConsultations({ appointments: [candidate], has_more: false }, 'test'), { code: 'invalid_response' });
  for (const value of [{ appointments: [paid, paid], has_more: false }, { appointments: Array.from({ length: 51 }, () => consultation()), has_more: true }, { appointments: [], has_more: 'false' }]) assert.throws(() => readAccountConsultations(value, 'test'), { code: 'invalid_response' });
});

test('quote request validates the appointment and returns a bound immutable cents/version quote', async () => {
  const { client, calls } = fixture({ quote: quote() });
  for (const id of [0, -1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]) await assert.rejects(client.quoteConsultation(TOKEN, id), { code: 'validation' });
  assert.equal(calls.length, 0);
  const value = await client.quoteConsultation(TOKEN, 18);
  assert.equal(value.tariffId, 7); assert.equal(value.tariffVersion, 2); assert.equal(value.expiresAt, '2026-11-12T04:15:00Z');
  assert.equal(calls[0].url, BASE + '/patient/wallet/consultations/18/quote'); assert.equal(calls[0].init.method, 'POST'); assert.deepEqual(JSON.parse(String(calls[0].init.body)), {});
  for (const candidate of [quote({ id: 'bad' }), quote({ appointment_id: 19 }), quote({ tariff_id: 0 }), quote({ tariff_version: 1.5 }), quote({ amount_cents: 5000.1 }), quote({ amount_cents: 1000001 }), quote({ status: 'unknown' }), quote({ expires_at: 'invalid' }), quote({ scope: 'digital' }), quote({ currency: 'USD' }), quote({}, 'live')]) await assert.rejects(fixture({ quote: candidate }).client.quoteConsultation(TOKEN, 18), { code: 'invalid_response' });
});

test('consultation payment sends only bound quote and retained request identity and verifies the server debit', async () => {
  const expected = readAccountConsultationQuote(quote(), 'test');
  const { client, calls } = fixture({ payment: payment(), wallet: serviceWallet() });
  const value = await client.payConsultation(TOKEN, expected, REQUEST);
  assert.equal(value.payment.appointmentId, 18); assert.equal(value.wallet.balanceCents, 10000); assert.equal(value.wallet.availableBalanceCents, 10000);
  assert.equal(calls[0].url, BASE + '/patient/wallet/consultation-payments'); assert.equal(calls[0].init.method, 'POST');
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), { quote_id: QUOTE, client_request_id: REQUEST });
  for (const candidate of [{ ...expected, mode: 'live' }, { ...expected, scope: 'digital' }, { ...expected, amountCents: 0 }, { ...expected, tariffVersion: 0 }]) await assert.rejects(client.payConsultation(TOKEN, candidate as AccountConsultationQuote, REQUEST), { code: 'invalid_response' });
  await assert.rejects(client.payConsultation(TOKEN, expected, 'invalid'), { code: 'validation' }); assert.equal(calls.length, 1);
  for (const candidate of [{ payment: payment({ quote_id: OTHER_ORDER }), wallet: serviceWallet() }, { payment: payment({ appointment_id: 19 }), wallet: serviceWallet() }, { payment: payment({ amount_cents: 15000 }), wallet: serviceWallet() }, { payment: payment({}, 'live'), wallet: serviceWallet() }, { payment: payment(), wallet: paidWallet() }, { payment: payment(), wallet: serviceWallet({ movements: [serviceMovement({ appointment_id: 19 }), movement()] }) }, { payment: payment(), wallet: serviceWallet({ balance_cents: 5000, movements: [serviceMovement({ amount_cents: -15000 }), movement()] }) }]) await assert.rejects(fixture(candidate).client.payConsultation(TOKEN, expected, REQUEST), { code: 'invalid_response' });
});

test('exact retries accept the original reversed payment without spending again or inventing funds', async () => {
  const expected = readAccountConsultationQuote(quote({ status: 'invalidated', expires_at: '2020-01-01T00:00:00Z' }), 'test');
  const reversal = serviceMovement({ id: REVERSAL, type: 'service_reversal', amount_cents: 10000 });
  const reversed = { payment: payment({ status: 'reversed', reversed_at: '2026-11-12T04:05:00Z' }), wallet: serviceWallet({ balance_cents: 20000, movements: [reversal, serviceMovement(), movement()] }) };
  const { client, calls } = fixture(reversed);
  const first = await client.payConsultation(TOKEN, expected, REQUEST), second = await client.payConsultation(TOKEN, expected, REQUEST);
  assert.equal(first.payment.status, 'reversed'); assert.equal(second.wallet.balanceCents, 20000); assert.equal(calls[0].init.body, calls[1].init.body);
  for (const candidate of [{ ...reversed, wallet: paidWallet() }, { ...reversed, payment: payment({ status: 'reversed', reversed_at: null }) }, { ...reversed, payment: payment({ status: 'reversed', reversed_at: '2026-11-12T03:59:00Z' }) }, { ...reversed, payment: payment() }]) await assert.rejects(fixture(candidate).client.payConsultation(TOKEN, expected, REQUEST), { code: 'invalid_response' });
});

test('an ambiguous consultation payment is never retried automatically and reuses its exact original payload', async () => {
  const calls: Call[] = [], expected = readAccountConsultationQuote(quote(), 'test');
  const client = createAccountWalletClient({ baseUrl: BASE, mode: 'test', fetchImpl: async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (calls.length === 1) throw new Error('Synthetic response lost');
    return Response.json({ success: true, data: { payment: payment(), wallet: serviceWallet() } });
  } });
  await assert.rejects(client.payConsultation(TOKEN, expected, REQUEST), { code: 'network' }); assert.equal(calls.length, 1);
  await client.payConsultation(TOKEN, expected, REQUEST); assert.equal(calls.length, 2); assert.equal(calls[0].init.body, calls[1].init.body);
});

test('consultation conflicts and unavailability remain actionable without exposing backend diagnostics', async () => {
  const expected = readAccountConsultationQuote(quote(), 'test');
  for (const status of [409, 422, 503]) {
    const { client, calls } = fixture({ error: TOKEN + SECRET }, { status });
    await assert.rejects(client.payConsultation(TOKEN, expected, REQUEST), error => error instanceof AccountWalletError && error.status === status && !error.message.includes('recarga') && !error.message.includes(TOKEN) && !error.message.includes(SECRET));
    assert.equal(calls.length, 1);
  }
  const { client, calls } = fixture({ error: 'already paid' }, { status: 409 });
  await assert.rejects(client.payConsultation(TOKEN, expected, OTHER_ORDER), { code: 'http_409' });
  assert.equal(calls.length, 1); assert.equal(JSON.parse(String(calls[0].init.body)).client_request_id, OTHER_ORDER);
});

test('Stripe keys and header-breaking values cannot substitute for a patient token', async () => {
  const { client, calls } = fixture(wallet());
  for (const token of ['', 'bad token', 'line\r\nbreak', 'x'.repeat(4097), 'sk_test_syntheticPrivateOnly', 'sk_live_syntheticPrivateOnly', 'rk_test_syntheticRestrictedOnly', 'pk_test_syntheticPublishable123', 'whsec_syntheticWebhookOnly']) await assert.rejects(client.wallet(token), { code: 'unauthenticated' });
  assert.equal(calls.length, 0);
  await client.wallet(TOKEN); assert.equal(calls.length, 1);
});

test('login uses a request body and refuses nonpatient sessions after trying to revoke them', async () => {
  const valid = fixture({ access_token: TOKEN, user: { role: 'patient', name: 'Paciente de contrato' } });
  assert.deepEqual(await valid.client.login(' patient@example.test ', 'synthetic-password'), { token: TOKEN, name: 'Paciente de contrato' });
  assert.equal(valid.calls[0].url, BASE + '/auth/login');
  assert.deepEqual(JSON.parse(String(valid.calls[0].init.body)), { login: 'patient@example.test', password: 'synthetic-password', device_name: 'Klini billetera móvil' });
  assert.equal(valid.calls[0].url.includes('synthetic-password'), false);
  const denied = fixture({ access_token: TOKEN, user: { role: 'provider', name: 'Distribuidor' } });
  await assert.rejects(denied.client.login('provider', 'synthetic-password'), { code: 'role' });
  assert.equal(denied.calls.length, 2); assert.equal(denied.calls[1].url, BASE + '/auth/logout');
  assert.equal(new Headers(denied.calls[1].init.headers).get('Authorization'), 'Bearer ' + TOKEN);
});

test('request safeguards omit cookies, disallow redirects and never put a PAT in the URL', async () => {
  const { client, calls } = fixture(wallet());
  await client.wallet(TOKEN);
  const request = calls[0];
  assert.equal(request.url, BASE + '/patient/wallet'); assert.equal(request.init.method, 'GET');
  assert.equal(new Headers(request.init.headers).get('Authorization'), 'Bearer ' + TOKEN);
  assert.equal(request.url.includes(TOKEN), false); assert.equal(request.init.body, undefined);
  assert.equal(request.init.credentials, 'omit'); assert.equal(request.init.redirect, 'error'); assert.equal(request.init.cache, 'no-store');
});

test('create sends only amount and opaque request identity and validates before fetch', async () => {
  const { client, calls } = fixture(result());
  for (const amount of [0, 4999, 1000001, 5000.5, NaN, Infinity]) await assert.rejects(client.create(TOKEN, amount, REQUEST), { code: 'validation' });
  for (const requestId of ['', 'not-a-uuid', REQUEST + '?secret=x']) await assert.rejects(client.create(TOKEN, 20000, requestId), { code: 'validation' });
  assert.equal(calls.length, 0);
  const value = await client.create(TOKEN, 20000, REQUEST);
  assert.equal(value.recharge.amountCents, 20000); assert.equal(value.clientSecret, SECRET);
  assert.equal(calls[0].url, BASE + '/patient/wallet/recharges'); assert.equal(calls[0].init.method, 'POST');
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), { amount_cents: 20000, client_request_id: REQUEST });
  assert.equal(String(calls[0].init.body).includes(TOKEN), false);
});

test('creation and refresh reject mismatched amount, account order or environment', async () => {
  for (const value of [result({ recharge: recharge({ amount_cents: 20001 }) }), result({ recharge: recharge({}, 'live') }), result({ recharge: recharge({ currency: 'USD' }) }), result({ recharge: recharge({ scope: 'storage' }) })]) await assert.rejects(fixture(value).client.create(TOKEN, 20000, REQUEST), { code: 'invalid_response' });
  for (const value of [result({ recharge: recharge({ id: OTHER_ORDER }) }), result({ recharge: recharge({ amount_cents: 19999 }) }), result({ wallet: wallet({}, 'live') })]) await assert.rejects(fixture(value).client.update(TOKEN, entry(), 'refresh'), { code: 'invalid_response' });
});

test('client secret must belong to the exact returned PaymentIntent and never be a private key', async () => {
  for (const value of [result({ client_secret: 'pi_anotherIntent_secret_syntheticSecret456' }), result({ payment_intent_id: 'pi_anotherIntent' }), result({ payment_intent_id: null }), result({ payment_intent_id: 'seti_syntheticSetupIntent' }), result({ client_secret: 'sk_test_syntheticPrivateOnly' }), result({ client_secret: 'seti_syntheticSetup_secret_syntheticSecret456' }), result({ client_secret: SECRET + '\n' })]) await assert.rejects(fixture(value).client.create(TOKEN, 20000, REQUEST), { code: 'invalid_response' });
  const unresolved = result({ recharge: recharge({ status: 'creating' }), payment_intent_id: null, client_secret: null });
  assert.equal((await fixture(unresolved).client.create(TOKEN, 20000, REQUEST)).clientSecret, null);
});

test('success requires a matching server credit, while a pending response invents no balance', async () => {
  const confirmed = result({ recharge: recharge({ status: 'succeeded' }), client_secret: null, wallet: paidWallet() });
  const value = await fixture(confirmed).client.update(TOKEN, entry(), 'refresh');
  assert.equal(value.wallet?.balanceCents, 20000);
  for (const missing of [null, wallet(), wallet({ balance_cents: 20000, movements: [movement({ order_id: OTHER_ORDER })] }), wallet({ balance_cents: 10000, movements: [movement({ amount_cents: 10000 })] })]) await assert.rejects(fixture({ ...confirmed, wallet: missing }).client.update(TOKEN, entry(), 'refresh'), { code: 'invalid_response' });
  assert.equal((await fixture(result()).client.update(TOKEN, entry(), 'refresh')).wallet, null);
});

test('refresh, cancel and resume target the same validated order with an empty action body', async () => {
  for (const action of ['refresh', 'cancel', 'resume'] as const) {
    const { client, calls } = fixture(result());
    await client.update(TOKEN, entry(), action);
    assert.equal(calls[0].url, `${BASE}/patient/wallet/recharges/${ORDER}/${action}`);
    assert.equal(calls[0].init.method, 'POST'); assert.deepEqual(JSON.parse(String(calls[0].init.body)), {});
  }
  const { client, calls } = fixture(result());
  await assert.rejects(client.update(TOKEN, entry({ id: ORDER + '/cancel' }), 'resume'), { code: 'invalid_response' });
  await assert.rejects(client.update(TOKEN, entry({ mode: 'live' }), 'resume'), { code: 'invalid_response' });
  assert.equal(calls.length, 0);
});

test('an ambiguous create has no automatic retry and a manual retry retains identical identity and payload', async () => {
  const calls: Call[] = [];
  const client = createAccountWalletClient({ baseUrl: BASE, mode: 'test', fetchImpl: async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (calls.length === 1) throw new Error('Synthetic connection lost after request');
    return Response.json({ success: true, data: result() });
  } });
  await assert.rejects(client.create(TOKEN, 20000, REQUEST), { code: 'network' }); assert.equal(calls.length, 1);
  await client.create(TOKEN, 20000, REQUEST); assert.equal(calls.length, 2);
  assert.equal(calls[0].url, calls[1].url); assert.equal(calls[0].init.body, calls[1].init.body);
  assert.equal(JSON.parse(String(calls[1].init.body)).client_request_id, REQUEST);
});

test('HTTP and transport failures never reflect backend secrets, credentials or private messages', async () => {
  const privateMessage = TOKEN + ' ' + SECRET + ' sk_test_syntheticPrivateOnly provider-private-diagnostic';
  const safe = (error: unknown) => error instanceof AccountWalletError && ![TOKEN, SECRET, 'syntheticPrivateOnly', 'provider-private-diagnostic'].some(value => error.message.includes(value));
  for (const status of [400, 401, 403, 409, 422, 429, 500, 503]) await assert.rejects(fixture({ error: privateMessage }, { status }).client.wallet(TOKEN), safe);
  const client = createAccountWalletClient({ baseUrl: BASE, mode: 'test', fetchImpl: async () => { throw new Error(privateMessage); } });
  await assert.rejects(client.wallet(TOKEN), safe);
});

test('invalid envelopes, oversized payloads, redirects and foreign origins are rejected', async () => {
  const responses = [new Response('{malformed'), new Response('x'.repeat(512001)), new Response('{}', { headers: { 'content-length': '512001' } }), Response.json({ success: false, data: wallet() }), Response.json({ data: wallet() }), Response.json({ success: true })];
  const redirected = Response.json({ success: true, data: wallet() }); Object.defineProperty(redirected, 'redirected', { value: true }); responses.push(redirected);
  const foreign = Response.json({ success: true, data: wallet() }); Object.defineProperty(foreign, 'url', { value: 'https://foreign.example.test/patient/wallet' }); responses.push(foreign);
  for (const response of responses) {
    const client = createAccountWalletClient({ baseUrl: BASE, mode: 'test', fetchImpl: async () => response });
    await assert.rejects(client.wallet(TOKEN), { code: 'invalid_response' });
  }
});

test('timeout and caller abort cancel transport without a late acceptance or retry', async () => {
  const signals: AbortSignal[] = [];
  const fetchImpl: typeof fetch = async (_url, init) => new Promise((_resolve, reject) => {
    const signal = init?.signal; assert.ok(signal); signals.push(signal);
    if (signal.aborted) reject(new DOMException('Synthetic abort', 'AbortError'));
    else signal.addEventListener('abort', () => reject(new DOMException('Synthetic abort', 'AbortError')), { once: true });
  });
  const client = createAccountWalletClient({ baseUrl: BASE, mode: 'test', fetchImpl, timeoutMs: 20 });
  await assert.rejects(client.wallet(TOKEN), { code: 'timeout' }); assert.equal(signals[0].aborted, true);
  const controller = new AbortController(), waiting = client.wallet(TOKEN, controller.signal); controller.abort();
  await assert.rejects(waiting, { code: 'aborted' }); assert.equal(signals[1].aborted, true);
  const already = new AbortController(); already.abort(); await assert.rejects(client.wallet(TOKEN, already.signal), { code: 'aborted' }); assert.equal(signals.length, 2);
  for (const timeoutMs of [0, -1, NaN, Infinity, 60001]) assert.throws(() => createAccountWalletClient({ baseUrl: BASE, mode: 'test', timeoutMs }), { code: 'configuration' });
});
