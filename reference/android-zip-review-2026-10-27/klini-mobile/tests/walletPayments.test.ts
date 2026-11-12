import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { request as httpRequest } from 'node:http';
import { createFilePaymentStorage, createTestPaymentService, PaymentError, type PaymentLedger, type PaymentStorage } from '../scripts/payments-ledger';
import { createPaymentsServer, loadStripeTestKeyFile, validatePaymentsConfiguration } from '../scripts/payments-server';

const SECRET = `sk_test_${'t'.repeat(24)}`;
const RESTRICTED = `rk_test_${'r'.repeat(24)}`;
const TOKEN = 'development_token_' + 'a'.repeat(32);
const input = (key = 'request_1234567890123456', amountCents = 20000) => ({ amountCents, idempotencyKey: key, purpose: 'health_services' });
function memory() {
  let data: unknown = null;
  let writes = 0;
  const fail = new Set<number>();
  const storage: PaymentStorage = { read: async () => structuredClone(data), write: async next => { writes++; if (fail.delete(writes)) throw new Error('simulated-disk-error'); data = structuredClone(next); } };
  return { storage, fail, read: () => structuredClone(data) as PaymentLedger, replace: (value: unknown) => { data = structuredClone(value); }, writes: () => writes };
}
function stripe(expectedKey = SECRET) {
  const intents = new Map<string, Record<string, unknown>>();
  const byKey = new Map<string, string>();
  const calls: { path: string; method: string; key: string | null; form: string }[] = [];
  let createAmbiguous = false;
  let failGet = false;
  let override: ((intent: Record<string, unknown>) => Record<string, unknown>) | undefined;
  const fetchImpl: typeof fetch = async (url, init = {}) => {
    const path = String(url);
    assert.ok(path.startsWith('https://api.stripe.com/v1/payment_intents'));
    const headers = new Headers(init.headers);
    assert.equal(headers.get('Authorization'), `Bearer ${expectedKey}`);
    const method = init.method ?? 'GET';
    const key = headers.get('Idempotency-Key');
    calls.push({ path, method, key, form: String(init.body ?? '') });
    let intent: Record<string, unknown>;
    if (method === 'POST') {
      assert.ok(key);
      const known = byKey.get(key);
      if (known) intent = intents.get(known)!;
      else {
        const form = new URLSearchParams(String(init.body));
        const id = `pi_test${intents.size + 1}`;
        intent = { id, object: 'payment_intent', livemode: false, amount: Number(form.get('amount')), amount_received: 0, currency: form.get('currency'), status: 'requires_payment_method', client_secret: `${id}_secret_synthetic`, metadata: { klini_order_id: form.get('metadata[klini_order_id]'), klini_account: form.get('metadata[klini_account]'), klini_purpose: form.get('metadata[klini_purpose]') } };
        intents.set(id, intent); byKey.set(key, id);
      }
      if (createAmbiguous) { createAmbiguous = false; throw new Error('simulated-network-loss-with-private-key'); }
    } else {
      if (failGet) { failGet = false; return Response.json({ error: { message: 'private provider details' } }, { status: 503 }); }
      const id = path.split('/').at(-1)!;
      intent = intents.get(id)!;
      assert.ok(intent);
    }
    return Response.json(override ? override(structuredClone(intent)) : intent);
  };
  const succeed = () => { for (const intent of intents.values()) { intent.status = 'succeeded'; intent.amount_received = intent.amount; } };
  return { intents, calls, fetchImpl, succeed, ambiguous: () => { createAmbiguous = true; }, failGet: () => { failGet = true; }, override: (fn?: typeof override) => { override = fn; } };
}
function fixture() {
  const mem = memory(), provider = stripe();
  const service = createTestPaymentService({ secretKey: SECRET, storage: mem.storage, fetchImpl: provider.fetchImpl });
  return { mem, provider, service };
}

test('test payments reject live keys, unsafe LAN, short credentials and production', () => {
  for (const secretKey of [SECRET, RESTRICTED]) assert.equal(validatePaymentsConfiguration({ secretKey }).secretKey, secretKey);
  for (const secretKey of [`sk_live_${'x'.repeat(24)}`, `rk_live_${'x'.repeat(24)}`, `sk_org_${'x'.repeat(24)}`, `rk_org_${'x'.repeat(24)}`, `pk_test_${'x'.repeat(24)}`, `pk_live_${'x'.repeat(24)}`, `whsec_${'x'.repeat(24)}`, 'sk_test_short', 'rk_test_short', ...[SECRET, RESTRICTED].flatMap(key => [` ${key}`, `${key} `, `${key}\n`, `${key}\r\n`, `${key}\t`, key.replace('_test_', '_test_ ')])]) assert.throws(() => validatePaymentsConfiguration({ secretKey }));
  for (const lanHost of ['0.0.0.0', '8.8.8.8', '127.0.0.1', '192.168.1.999', 'localhost']) assert.throws(() => validatePaymentsConfiguration({ lanHost, developmentToken: TOKEN }));
  assert.throws(() => validatePaymentsConfiguration({ developmentToken: 'short' }));
  assert.throws(() => validatePaymentsConfiguration({ lanHost: '192.168.1.5' }));
  assert.equal(validatePaymentsConfiguration({ lanHost: '192.168.1.5', developmentToken: TOKEN }).lanHost, '192.168.1.5');
  const old = process.env.NODE_ENV;
  try { process.env.NODE_ENV = 'production'; assert.throws(() => createPaymentsServer()); }
  finally { if (old === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV'); else process.env.NODE_ENV = old; }
});

test('unconfigured Stripe fails closed without storage or provider activity', async () => {
  const mem = memory();
  const service = createTestPaymentService({ storage: mem.storage, fetchImpl: async () => { throw new Error('must not call'); } });
  for (const action of [() => service.wallet(), () => service.create(input()), () => service.retrieve('none')]) await assert.rejects(action, error => error instanceof PaymentError && error.code === 'not_configured');
  assert.equal(mem.writes(), 0);
});

test('only integer MXN health service amounts and opaque idempotency keys are accepted', async () => {
  const { service, provider, mem } = fixture();
  for (const body of [null, [], {}, input('short'), input('x'.repeat(129)), input('x'.repeat(16), 999), input('x'.repeat(16), 10000001), input('x'.repeat(16), 1000.1), input('x'.repeat(16), NaN), { ...input(), purpose: 'digital' }, { ...input(), purpose: 'subscription' }, { ...input(), userId: 'someone' }, { ...input(), status: 'succeeded' }, { ...input(), currency: 'usd' }]) await assert.rejects(() => service.create(body), error => error instanceof PaymentError && error.status === 422);
  assert.equal(provider.calls.length, 0); assert.equal(mem.writes(), 0);
});

test('server owns zero-based test balance; create does not credit; verified GET credits once', async () => {
  const { service, provider, mem } = fixture();
  assert.equal((await service.wallet()).balanceCents, 0);
  const created = await service.create(input());
  assert.equal(created.status, 'requires_payment_method'); assert.ok(created.clientSecret);
  assert.equal((await service.wallet()).balanceCents, 0);
  assert.equal(provider.calls[0].method, 'POST');
  const form = new URLSearchParams(provider.calls[0].form);
  assert.deepEqual(form.getAll('allowed_payment_method_types[]'), ['card']);
  assert.equal(form.has('payment_method_types[]'), false);
  assert.ok(mem.read().orders[0].intentId);
  const pending = await service.retrieve(created.id);
  assert.equal(pending.wallet, undefined); assert.equal('clientSecret' in pending, false);
  provider.succeed();
  const saved = await service.retrieve(created.id);
  assert.equal(saved.status, 'succeeded'); assert.equal(saved.wallet?.balanceCents, 20000);
  assert.equal(saved.wallet?.movements.length, 1);
  await Promise.all([service.retrieve(created.id), service.retrieve(created.id), service.create(input())]);
  assert.equal((await service.wallet()).movements.length, 1);
  assert.equal(provider.calls.filter(c => c.method === 'POST').length, 1);
});

test('durable order is written before Stripe; storage failure prevents provider creation', async () => {
  const { service, provider, mem } = fixture();
  mem.fail.add(2);
  await assert.rejects(() => service.create(input()), error => error instanceof PaymentError && error.code === 'storage_unavailable');
  assert.equal(provider.calls.length, 0);
  assert.equal(mem.read().orders.length, 0);
  const created = await service.create(input());
  assert.ok(created.id);
  assert.equal(provider.calls.length, 1);
});

test('ambiguous creation survives restart and retries same Stripe idempotency key', async () => {
  const { service, provider, mem } = fixture();
  provider.ambiguous();
  await assert.rejects(() => service.create(input()), error => error instanceof PaymentError && error.code === 'provider_unavailable');
  const pending = mem.read().orders[0];
  assert.equal(pending.status, 'creating'); assert.equal(pending.intentId, undefined);
  const restarted = createTestPaymentService({ secretKey: SECRET, storage: mem.storage, fetchImpl: provider.fetchImpl });
  const status = await restarted.retrieve(pending.id);
  assert.equal(status.status, 'creating'); assert.equal(provider.calls.length, 1);
  const wallet = await restarted.wallet();
  assert.equal(wallet.pendingRecharges[0].id, pending.id);
  assert.equal(wallet.pendingRecharges[0].idempotencyKey, input().idempotencyKey);
  assert.equal(JSON.stringify(wallet).includes('_secret_'), false);
  const recovered = await restarted.create(input());
  assert.equal(recovered.id, pending.id);
  assert.equal(provider.intents.size, 1);
  assert.equal(provider.calls[0].key, provider.calls[1].key);
  assert.equal((await restarted.wallet()).balanceCents, 0);
});

test('persist failure after Stripe create safely reuses provider intent and order', async () => {
  const { service, provider, mem } = fixture();
  mem.fail.add(3);
  await assert.rejects(() => service.create(input()), error => error instanceof PaymentError && error.code === 'storage_unavailable');
  const recovered = await service.create(input());
  assert.equal(recovered.id, mem.read().orders[0].id);
  assert.equal(provider.intents.size, 1);
  assert.equal(provider.calls[0].key, provider.calls[1].key);
});

test('duplicate requests serialize; reusing a key for another amount cannot charge', async () => {
  const { service, provider } = fixture();
  const [one, two] = await Promise.all([service.create(input()), service.create(input())]);
  assert.equal(one.id, two.id);
  assert.equal(provider.calls.filter(c => c.method === 'POST').length, 1);
  await assert.rejects(() => service.create(input(undefined, 50000)), error => error instanceof PaymentError && error.code === 'idempotency_conflict');
  assert.equal(provider.intents.size, 1);
});

test('unresolved creation older than 23 hours never reuses an expired Stripe key', async () => {
  const mem = memory(), provider = stripe();
  let clock = new Date('2026-11-09T20:00:00Z');
  const service = createTestPaymentService({ secretKey: SECRET, storage: mem.storage, fetchImpl: provider.fetchImpl, now: () => clock });
  provider.ambiguous();
  await assert.rejects(() => service.create(input()));
  clock = new Date(clock.getTime() + 23 * 3600000);
  await assert.rejects(() => service.create(input()), error => error instanceof PaymentError && error.code === 'reconciliation_required');
  assert.equal(provider.calls.length, 1);
});

test('canceled, action-required, capture-required and processing intents never credit', async () => {
  for (const status of ['canceled', 'requires_action', 'requires_capture', 'processing', 'requires_payment_method']) {
    const { service, provider } = fixture();
    const created = await service.create(input());
    for (const intent of provider.intents.values()) intent.status = status;
    assert.equal((await service.retrieve(created.id)).status, status);
    assert.equal((await service.wallet()).balanceCents, 0);
  }
});

test('provider account, order, purpose, currency, amount, mode, identity and received amount must match', async () => {
  const changes: ((value: Record<string, unknown>) => Record<string, unknown>)[] = [
    v => ({ ...v, livemode: true }), v => ({ ...v, currency: 'usd' }), v => ({ ...v, amount: 1 }), v => ({ ...v, amount_received: 1 }), v => ({ ...v, id: 'pi_other' }), v => ({ ...v, object: 'charge' }), v => ({ ...v, status: 'made_up' }),
    v => ({ ...v, metadata: { ...(v.metadata as object), klini_account: 'other' } }), v => ({ ...v, metadata: { ...(v.metadata as object), klini_order_id: 'other' } }), v => ({ ...v, metadata: { ...(v.metadata as object), klini_purpose: 'digital' } }),
  ];
  for (const change of changes) {
    const { service, provider } = fixture();
    const created = await service.create(input()); provider.succeed(); provider.override(change);
    await assert.rejects(() => service.retrieve(created.id), error => error instanceof PaymentError && error.code === 'provider_mismatch');
    assert.equal((await service.wallet()).balanceCents, 0);
  }
});

test('reconciliation persist failure and provider failure leave balance unchanged, then retry credits once', async () => {
  const { service, provider, mem } = fixture();
  const created = await service.create(input()); provider.succeed();
  provider.failGet();
  await assert.rejects(() => service.retrieve(created.id));
  assert.equal((await service.wallet()).balanceCents, 0);
  mem.fail.add(mem.writes() + 1);
  await assert.rejects(() => service.retrieve(created.id), error => error instanceof PaymentError && error.code === 'storage_unavailable');
  assert.equal((await service.wallet()).balanceCents, 0);
  const retried = await service.retrieve(created.id);
  assert.equal(retried.wallet?.balanceCents, 20000);
  const restarted = createTestPaymentService({ secretKey: SECRET, storage: mem.storage, fetchImpl: provider.fetchImpl });
  assert.equal((await restarted.retrieve(created.id)).wallet?.movements.length, 1);
});

test('replayed succeeded create must retrieve Stripe before crediting', async () => {
  const { service, provider, mem } = fixture();
  provider.ambiguous(); await assert.rejects(() => service.create(input())); provider.succeed(); provider.failGet();
  await assert.rejects(() => service.create(input()));
  assert.equal(mem.read().orders[0].status, 'processing');
  assert.equal((await service.wallet()).balanceCents, 0);
  const retried = await service.create(input());
  assert.equal(retried.status, 'succeeded');
  assert.equal((await service.wallet()).balanceCents, 20000);
});

test('malformed persisted ledger is not reset or overwritten', async () => {
  const mem = memory(), provider = stripe(); mem.replace({ version: 1, orders: [], movements: [] });
  const service = createTestPaymentService({ secretKey: SECRET, storage: mem.storage, fetchImpl: provider.fetchImpl });
  await assert.rejects(() => service.wallet(), error => error instanceof PaymentError && error.code === 'storage_invalid');
  assert.equal(mem.writes(), 0); assert.equal(provider.calls.length, 0);
});

test('atomic file storage roundtrip and private key loader reject corrupt/live input', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'klini-payments-test-'));
  try {
    const path = join(folder, 'ledger.json');
    const storage = createFilePaymentStorage(path);
    assert.equal(await storage.read(), null);
    const ledger: PaymentLedger = { version: 1, account: 'klini-development-test-account', orders: [], movements: [] };
    await storage.write(ledger); assert.deepEqual(await storage.read(), ledger);
    await writeFile(path, '{bad'); await assert.rejects(() => storage.read());
    assert.equal(await readFile(path, 'utf8'), '{bad');
    const keyFile = join(folder, 'key.env');
    for (const key of [SECRET, RESTRICTED]) {
      await writeFile(keyFile, `STRIPE_SECRET_KEY=${key}\nUNRELATED=value`);
      assert.equal(loadStripeTestKeyFile(keyFile), key);
    }
    for (const key of [`sk_live_${'x'.repeat(24)}`, `rk_live_${'x'.repeat(24)}`]) {
      await writeFile(keyFile, `STRIPE_SECRET_KEY=${key}`); assert.throws(() => loadStripeTestKeyFile(keyFile));
    }
  } finally { assert.ok(folder.startsWith(join(tmpdir(), 'klini-payments-test-'))); await rm(folder, { recursive: true, force: true }); }
});

test('HTTP bridge enforces token, origin/host, exact paths, method, JSON limits and sanitized errors', async () => {
  const previousKey = process.env.STRIPE_SECRET_KEY;
  try {
    for (const key of [SECRET, RESTRICTED]) {
      process.env.STRIPE_SECRET_KEY = key;
      const mem = memory(), provider = stripe(key);
      const server = createPaymentsServer({ secretKey: process.env.STRIPE_SECRET_KEY, developmentToken: TOKEN, storage: mem.storage, fetchImpl: provider.fetchImpl });
      server.listen(0, '127.0.0.1'); await once(server, 'listening');
      const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      const auth = { Authorization: `Bearer ${TOKEN}` };
      try {
        const health = await (await fetch(`${base}/health`)).json();
        assert.deepEqual(health, { development: true, mode: 'test', provider: 'stripe', configured: true, purpose: 'health_services' });
        assert.equal((await fetch(`${base}/wallet`)).status, 401);
        assert.equal((await fetch(`${base}/wallet`, { headers: { Authorization: 'Bearer short' } })).status, 401);
        assert.equal((await fetch(`${base}/wallet`, { headers: { ...auth, Origin: 'https://evil.example' } })).status, 403);
        const wrongHost = await new Promise<number | undefined>((resolve, reject) => {
          const request = httpRequest(`${base}/wallet`, { headers: { ...auth, Host: 'evil.example' } }, response => { response.resume(); response.on('end', () => resolve(response.statusCode)); });
          request.on('error', reject); request.end();
        });
        assert.equal(wrongHost, 403);
        assert.equal((await fetch(`${base}/wallet?token=secret`, { headers: auth })).status, 404);
        assert.equal((await fetch(`${base}/recharges`, { headers: auth })).status, 405);
        assert.equal((await fetch(`${base}/recharges`, { method: 'POST', headers: auth, body: '{}' })).status, 415);
        assert.equal((await fetch(`${base}/recharges`, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: 'x'.repeat(2049) })).status, 413);
        assert.equal((await fetch(`${base}/recharges`, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: '{bad' })).status, 400);
        const createdResponse = await fetch(`${base}/recharges`, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify(input()) });
        assert.equal(createdResponse.status, 200);
        const created = await createdResponse.json(); provider.succeed();
        const result = await (await fetch(`${base}/recharges/${created.id}`, { headers: auth })).json();
        assert.equal(result.wallet.balanceCents, 20000); assert.equal('clientSecret' in result, false);
        provider.failGet();
        const failed = await fetch(`${base}/recharges/${created.id}`, { headers: auth });
        const text = await failed.text(); assert.equal(failed.status, 502);
        assert.equal(text.includes('private provider details'), false); assert.equal(text.includes(key), false); assert.equal(text.includes(created.clientSecret), false);
        const wallet = await fetch(`${base}/wallet`, { headers: auth }); assert.equal(wallet.headers.get('cache-control'), 'private, no-store');
        assert.equal((await wallet.json()).balanceCents, 20000);
      } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
    }
  } finally { if (previousKey === undefined) Reflect.deleteProperty(process.env, 'STRIPE_SECRET_KEY'); else process.env.STRIPE_SECRET_KEY = previousKey; }
});
