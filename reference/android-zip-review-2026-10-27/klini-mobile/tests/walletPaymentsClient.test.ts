import assert from 'node:assert/strict';
import test from 'node:test';
import { createPaymentTestClient, parsePaymentTestAmount } from '../src/services/walletPayments';
import { validatePaymentTestApiUrl } from '../src/services/paymentsConfig';
import type { CreatedTestRecharge, RetrievedTestRecharge, TestRecharge, TestWalletSnapshot } from '../src/domain/walletPayments';

const BASE = 'http://127.0.0.1:8099';
const TOKEN = `qa_session_${'a'.repeat(40)}`;
const KEY = 'qa_recharge_1234567890123456';
const ORDER = 'rch_4d398c39-3d53-4cf5-a527-3bb38bc32bc6';
const OTHER_ORDER = 'rch_9f925804-e030-43ed-9e5c-3a79737ac234';
const SECRET = 'pi_fixture123_secret_fixture456';
const recharge = (overrides: Partial<TestRecharge> = {}): TestRecharge => ({ id: ORDER, mode: 'test', currency: 'MXN', purpose: 'health_services', amountCents: 20000, status: 'requires_payment_method', ...overrides });
const created = (overrides: Partial<CreatedTestRecharge> = {}): CreatedTestRecharge => ({ ...recharge(), clientSecret: SECRET, ...overrides });
const emptyWallet = (): TestWalletSnapshot => ({ mode: 'test', currency: 'MXN', purpose: 'health_services', balanceCents: 0, movements: [], pendingRecharges: [] });
const paidWallet = (): TestWalletSnapshot => ({ ...emptyWallet(), balanceCents: 20000, movements: [{ id: 'pi_fixture123', orderId: ORDER, amountCents: 20000, createdAt: '2026-11-09T20:00:00.000Z', concept: 'Recarga de prueba' }] });
type Request = { url: string; init: RequestInit };
function fixture(body: unknown, status = 200) {
  const requests: Request[] = [];
  const fetchImpl: typeof fetch = async (url, init = {}) => { requests.push({ url: String(url), init }); return Response.json(body, { status }); };
  const client = createPaymentTestClient({ baseUrl: BASE, accessToken: TOKEN, fetchImpl });
  return { client, requests };
}

test('payment amount parsing converts decimal pesos exactly into bounded integer cents', () => {
  for (const [text, cents] of [['10', 1000], ['10.01', 1001], ['123,45', 12345], ['100000', 10000000], [' 200.00 ', 20000]] as const) assert.equal(parsePaymentTestAmount(text), cents);
  for (const text of ['', '9.99', '100000.01', '10.001', '1e3', '$200', '1,000.00', '-100', '+100', 'Infinity', 'NaN', '0', '20 00']) assert.throws(() => parsePaymentTestAmount(text));
});

test('test API URLs use HTTPS or private local HTTP and cannot contain routes or credentials', () => {
  for (const url of [BASE, 'http://localhost:8099/', 'http://[::1]:8099', 'http://192.168.1.5:8099', 'http://10.0.1.7:8099', 'http://172.16.1.7:8099', 'https://payments.example.test']) assert.equal(validatePaymentTestApiUrl(url), new URL(url).origin);
  for (const url of ['http://payments.example.test', 'http://8.8.8.8', 'http://172.15.1.1', 'http://172.32.1.1', 'ftp://localhost', 'https://user:password@payments.example.test', `${BASE}/wallet`, `${BASE}?token=anything`, `${BASE}#private`, 'not a URL']) assert.throws(() => validatePaymentTestApiUrl(url));
});

test('development access token remains runtime-only and rejects misplaced Stripe credentials', async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => { calls++; return Response.json(emptyWallet()); };
  for (const accessToken of ['', 'short', 'x'.repeat(257), 'space '.repeat(8), `sk_test_${'s'.repeat(40)}`, `sk_live_${'s'.repeat(40)}`, `pk_test_${'p'.repeat(40)}`, `pk_live_${'p'.repeat(40)}`, `whsec_${'w'.repeat(40)}`]) {
    assert.throws(() => createPaymentTestClient({ baseUrl: BASE, accessToken, fetchImpl }));
  }
  assert.equal(calls, 0);
  const client = createPaymentTestClient({ baseUrl: BASE, accessToken: TOKEN, fetchImpl });
  await client.getWallet(); assert.equal(calls, 1);
});

test('requests send only required test service fields and opaque runtime authorization', async () => {
  const { client, requests } = fixture(created());
  assert.deepEqual(await client.createRecharge(20000, KEY), created());
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, `${BASE}/recharges`);
  assert.equal(requests[0].init.method, 'POST');
  assert.equal(new Headers(requests[0].init.headers).get('Authorization'), `Bearer ${TOKEN}`);
  assert.deepEqual(JSON.parse(String(requests[0].init.body)), { amountCents: 20000, idempotencyKey: KEY, purpose: 'health_services' });
  assert.equal(String(requests[0].init.body).includes(TOKEN), false);
  assert.equal(requests[0].url.includes(TOKEN), false);
});

test('invalid client inputs fail before any network request', async () => {
  const { client, requests } = fixture(emptyWallet());
  for (const amount of [0, 999, 10000001, 1000.1, NaN, Infinity, Number.MAX_SAFE_INTEGER]) await assert.rejects(async () => client.createRecharge(amount, KEY));
  for (const key of ['', 'short', 'x'.repeat(129), 'a b'.repeat(8)]) await assert.rejects(async () => client.createRecharge(20000, key));
  for (const id of ['', 'pi_fixture123', `${ORDER}/extra`, `${ORDER}?token=x`, 'rch_not-a-uuid']) await assert.rejects(async () => client.getRecharge(id, 20000));
  for (const amount of [0, 999, 10000001, 1000.1]) await assert.rejects(async () => client.getRecharge(ORDER, amount));
  assert.equal(requests.length, 0);
  for (const timeoutMs of [0, -1, NaN, Infinity, 60001]) assert.throws(() => createPaymentTestClient({ baseUrl: BASE, accessToken: TOKEN, timeoutMs }));
});

test('wallet accepts zero or verified credit totals and keeps pending orders uncredited', async () => {
  const pending = { ...recharge({ status: 'processing' }), idempotencyKey: KEY };
  const wallet = { ...emptyWallet(), pendingRecharges: [pending] };
  const { client, requests } = fixture(wallet);
  assert.deepEqual(await client.getWallet(), wallet);
  assert.equal(requests[0].url, `${BASE}/wallet`);
  assert.equal(new Headers(requests[0].init.headers).get('Authorization'), `Bearer ${TOKEN}`);
  assert.deepEqual(await fixture(paidWallet()).client.getWallet(), paidWallet());
});

test('wallet rejects mode, scope, malformed cents, mismatched totals and duplicate credits', async () => {
  const paid = paidWallet(), movement = paid.movements[0];
  const invalid: unknown[] = [null, [], {}, { ...paid, mode: 'live' }, { ...paid, currency: 'USD' }, { ...paid, purpose: 'digital' }, { ...paid, balanceCents: -1 }, { ...paid, balanceCents: 20000.1 }, { ...paid, balanceCents: 20001 }, { ...paid, balanceCents: Number.MAX_SAFE_INTEGER + 1 }, { ...paid, clientSecret: SECRET }, { ...paid, movements: [{ ...movement, amountCents: -20000 }] }, { ...paid, movements: [{ ...movement, amountCents: 999 }] }, { ...paid, movements: [{ ...movement, concept: 'Subscription' }] }, { ...paid, movements: [{ ...movement, createdAt: 'not a date' }] }, { ...paid, movements: [{ ...movement, createdAt: '2026-02-30T20:00:00.000Z' }] }, { ...paid, movements: [{ ...movement, orderId: 'foreign' }] }, { ...paid, movements: [{ ...movement, client_secret: SECRET }] }, { ...paid, movements: [movement, movement], balanceCents: 40000 }, { ...paid, movements: [movement, { ...movement, id: 'pi_other' }], balanceCents: 40000 }, { ...paid, movements: [movement, { ...movement, orderId: OTHER_ORDER }], balanceCents: 40000 }];
  for (const wallet of invalid) await assert.rejects(() => fixture(wallet).client.getWallet());
});

test('pending recharge recovery rejects malformed, duplicate, settled or secret-bearing records', async () => {
  const pending = { ...recharge({ status: 'creating' }), idempotencyKey: KEY };
  const variants: unknown[] = [{ ...pending, id: 'foreign' }, { ...pending, mode: 'live' }, { ...pending, purpose: 'subscription' }, { ...pending, currency: 'USD' }, { ...pending, amountCents: 999 }, { ...pending, status: 'succeeded' }, { ...pending, status: 'canceled' }, { ...pending, idempotencyKey: 'short' }, { ...pending, clientSecret: SECRET }, { ...pending, secretKey: `sk_test_${'s'.repeat(40)}` }];
  for (const order of variants) await assert.rejects(() => fixture({ ...emptyWallet(), pendingRecharges: [order] }).client.getWallet());
  await assert.rejects(() => fixture({ ...emptyWallet(), pendingRecharges: [pending, pending] }).client.getWallet());
  await assert.rejects(() => fixture({ ...emptyWallet(), pendingRecharges: [pending, { ...pending, id: OTHER_ORDER }] }).client.getWallet());
  await assert.rejects(() => fixture({ ...paidWallet(), pendingRecharges: [pending] }).client.getWallet());
});

test('create response must match requested amount, test scope and a PaymentIntent client secret', async () => {
  const unresolved = created({ status: 'creating', clientSecret: null });
  assert.deepEqual(await fixture(unresolved).client.createRecharge(20000, KEY), unresolved);
  const invalid = [{ ...created(), id: 'pi_fixture123' }, { ...created(), mode: 'live' }, { ...created(), currency: 'USD' }, { ...created(), purpose: 'subscription' }, { ...created(), amountCents: 20001 }, { ...created(), status: 'unknown' }, { ...created(), clientSecret: 'sk_test_private' }, { ...created(), clientSecret: 'seti_fixture_secret_private' }, { ...created(), clientSecret: `${SECRET}\n` }];
  for (const value of invalid) await assert.rejects(() => fixture(value).client.createRecharge(20000, KEY));
});

test('recharge verification checks order and amount and never invents a pending balance', async () => {
  const value: RetrievedTestRecharge = recharge({ status: 'processing' });
  const { client, requests } = fixture(value);
  assert.deepEqual(await client.getRecharge(ORDER, 20000), value);
  assert.equal(requests[0].url, `${BASE}/recharges/${ORDER}`);
  for (const invalid of [{ ...value, id: OTHER_ORDER }, { ...value, amountCents: 20001 }, { ...value, currency: 'USD' }, { ...value, purpose: 'digital' }, { ...value, mode: 'live' }, { ...value, clientSecret: SECRET }, { ...value, wallet: paidWallet() }]) await assert.rejects(() => fixture(invalid).client.getRecharge(ORDER, 20000));
});

test('succeeded verification requires one matching server credit and a self-consistent wallet', async () => {
  const result: RetrievedTestRecharge = { ...recharge({ status: 'succeeded' }), wallet: paidWallet() };
  assert.deepEqual(await fixture(result).client.getRecharge(ORDER, 20000), result);
  const otherMovement = { ...paidWallet().movements[0], orderId: OTHER_ORDER };
  const invalid: unknown[] = [{ ...result, wallet: undefined }, { ...result, wallet: emptyWallet() }, { ...result, wallet: { ...paidWallet(), movements: [otherMovement] } }, { ...result, wallet: { ...paidWallet(), balanceCents: 20001 } }, { ...result, wallet: { ...paidWallet(), balanceCents: 40000, movements: [...paidWallet().movements, { ...paidWallet().movements[0], id: 'pi_duplicate' }] } }, { ...result, wallet: { ...paidWallet(), balanceCents: 10000, movements: [{ ...paidWallet().movements[0], amountCents: 10000 }] } }];
  for (const value of invalid) await assert.rejects(() => fixture(value).client.getRecharge(ORDER, 20000));
});

test('HTTP and transport errors never expose Stripe secrets, runtime tokens or provider messages', async () => {
  const sensitive = `${TOKEN} ${SECRET} sk_test_private_provider provider-details`;
  for (const status of [400, 401, 403, 409, 422, 429, 500, 502, 503]) {
    await assert.rejects(() => fixture({ error: { code: 'provider_unavailable', message: sensitive } }, status).client.getWallet(), error => error instanceof Error && !error.message.includes(TOKEN) && !error.message.includes(SECRET) && !error.message.includes('provider-details'));
  }
  const client = createPaymentTestClient({ baseUrl: BASE, accessToken: TOKEN, fetchImpl: async () => { throw new Error(sensitive); } });
  await assert.rejects(() => client.getWallet(), error => error instanceof Error && !error.message.includes(TOKEN) && !error.message.includes(SECRET) && !error.message.includes('provider-details'));
});

test('malformed JSON, oversized payloads and redirected responses are rejected safely', async () => {
  const variants = [new Response('{invalid'), new Response('x'.repeat(512001)), new Response('{}', { headers: { 'content-length': '512001' } })];
  const redirected = Response.json(emptyWallet());
  Object.defineProperty(redirected, 'redirected', { value: true }); variants.push(redirected);
  const wrongOrigin = Response.json(emptyWallet());
  Object.defineProperty(wrongOrigin, 'url', { value: 'https://other.example/wallet' }); variants.push(wrongOrigin);
  for (const response of variants) {
    const client = createPaymentTestClient({ baseUrl: BASE, accessToken: TOKEN, fetchImpl: async () => response });
    await assert.rejects(() => client.getWallet());
  }
});

test('requests omit cookies, forbid redirects and bypass caches without changing idempotency on retry', async () => {
  const { client, requests } = fixture(created());
  await client.createRecharge(20000, KEY); await client.createRecharge(20000, KEY);
  assert.equal(requests.length, 2);
  for (const request of requests) {
    assert.equal(request.init.credentials, 'omit'); assert.equal(request.init.redirect, 'error'); assert.equal(request.init.cache, 'no-store');
    assert.equal(new Headers(request.init.headers).get('Content-Type'), 'application/json');
    assert.equal(JSON.parse(String(request.init.body)).idempotencyKey, KEY);
  }
});

test('timeout and caller cancellation abort the request without accepting late wallet data', async () => {
  const signals: AbortSignal[] = [];
  const fetchImpl: typeof fetch = async (_url, init) => new Promise((_resolve, reject) => {
    const signal = init?.signal; assert.ok(signal); signals.push(signal);
    if (signal.aborted) reject(new DOMException('Synthetic aborted request', 'AbortError'));
    else signal.addEventListener('abort', () => reject(new DOMException('Synthetic aborted request', 'AbortError')), { once: true });
  });
  const client = createPaymentTestClient({ baseUrl: BASE, accessToken: TOKEN, fetchImpl, timeoutMs: 20 });
  await assert.rejects(() => client.getWallet());
  assert.equal(signals[0].aborted, true);
  const controller = new AbortController();
  const pending = client.getWallet(controller.signal); controller.abort();
  await assert.rejects(() => pending); assert.equal(signals[1].aborted, true);
  const alreadyAborted = new AbortController(); alreadyAborted.abort();
  await assert.rejects(() => client.getWallet(alreadyAborted.signal));
});
