import assert from 'node:assert/strict';
import test from 'node:test';
import type { WalletPaymentConfiguration } from '../src/domain/accountWallet';
import { isWalletPaymentReturnURL, readWalletNativePaymentResult, readWalletNativePaymentStatus, validateWalletNativeRequest, walletNativeConfigurationMatches, withWalletStripeOperation } from '../src/services/walletNativePaymentsProtocol';

const config: WalletPaymentConfiguration = { mode: 'test', country: 'MX', publishableKey: 'pk_test_fixture123456', merchantIdentifier: 'merchant.mx.klini.review' };
const request = { clientSecret: 'pi_fixture123_secret_fixture456', amountCents: 10_000 };
const succeeded = { paymentIntent: { id: 'pi_fixture123', status: 'Succeeded', amount: 10_000, currency: 'mxn', livemode: false } };

test('account native payments bind the key mode, compiled mode and exact merchant', () => {
  assert.doesNotThrow(() => validateWalletNativeRequest(config, request));
  assert.equal(walletNativeConfigurationMatches(config, { mode: 'test', merchantIdentifier: config.merchantIdentifier }), true);
  assert.equal(walletNativeConfigurationMatches(config, { mode: 'live', merchantIdentifier: config.merchantIdentifier }), false);
  assert.equal(walletNativeConfigurationMatches(config, { mode: 'test', merchantIdentifier: 'merchant.other.account' }), false);
  assert.equal(walletNativeConfigurationMatches(config, { mode: 'test', merchantIdentifier: '' }), false);
  for (const mutation of [{ mode: 'live' }, { country: 'US' }, { publishableKey: 'sk_test_private' }, { publishableKey: `${config.publishableKey}\n` }]) {
    assert.throws(() => validateWalletNativeRequest({ ...config, ...mutation } as WalletPaymentConfiguration, request));
  }
});

test('native completion requires the same amount, mode, currency and settled Intent', () => {
  assert.deepEqual(readWalletNativePaymentResult(succeeded, config, request), { status: 'completed' });
  for (const mutation of [{ id: 'pi_other' }, { amount: 9999 }, { currency: 'usd' }, { livemode: true }, { status: 'Processing' }]) {
    assert.throws(() => readWalletNativePaymentResult({ paymentIntent: { ...succeeded.paymentIntent, ...mutation } }, config, request));
  }
  const live = { ...config, mode: 'live' as const, publishableKey: 'pk_live_fixture123456' };
  assert.deepEqual(readWalletNativePaymentResult({ paymentIntent: { ...succeeded.paymentIntent, livemode: true } }, live, request), { status: 'completed' });
  assert.deepEqual(readWalletNativePaymentResult({ error: { code: 'Canceled' } }, config, request), { status: 'canceled' });
  assert.throws(() => readWalletNativePaymentResult({ error: { code: 'pi_private_secret_sensitive' } }, config, request), error => error instanceof Error && !error.message.includes('sensitive'));
});

test('native account request shares the $50–$10,000 bounds and rejects non-Intent credentials', () => {
  for (const amountCents of [5000, 1_000_000]) assert.doesNotThrow(() => validateWalletNativeRequest(config, { ...request, amountCents }));
  for (const amountCents of [999, 1000, 4999, 5000.01, NaN, Infinity, 1_000_001, 10_000_000]) assert.throws(() => validateWalletNativeRequest(config, { ...request, amountCents }));
  for (const clientSecret of ['sk_test_private', 'seti_fixture_secret_other', `${request.clientSecret}\n`]) assert.throws(() => validateWalletNativeRequest(config, { ...request, clientSecret }));
});

test('preflight checks unpaid Intent identity without requiring a completed charge', () => {
  assert.equal(readWalletNativePaymentStatus({ paymentIntent: { ...succeeded.paymentIntent, status: 'RequiresPaymentMethod' } }, config, request), 'RequiresPaymentMethod');
  for (const mutation of [{ amount: 20_000 }, { livemode: true }, { currency: 'usd' }, { id: 'pi_other' }]) {
    assert.throws(() => readWalletNativePaymentStatus({ paymentIntent: { ...succeeded.paymentIntent, status: 'RequiresPaymentMethod', ...mutation } }, config, request));
  }
});

test('TEST and account native operations cannot overlap global Stripe initialization', async () => {
  let release!: () => void;
  let secondRan = false;
  const first = withWalletStripeOperation(() => new Promise<void>(resolve => { release = resolve; }));
  await assert.rejects(withWalletStripeOperation(async () => { secondRan = true; }));
  assert.equal(secondRan, false);
  release();
  await first;
  await assert.rejects(withWalletStripeOperation(async () => { throw new Error('fixture failure'); }));
  assert.equal(await withWalletStripeOperation(async () => 'released'), 'released');
});

test('3DS callback handler accepts only the exact registered scheme and redirect endpoint', () => {
  for (const url of ['klini-review://stripe-redirect', 'klini-review://stripe-redirect?source=fixture', 'klini-review://stripe-redirect/complete']) assert.equal(isWalletPaymentReturnURL(url), true);
  for (const url of ['https://stripe-redirect', 'other://stripe-redirect', 'klini-review://stripe-redirect.attacker.test', 'klini-review://stripe-redirected']) assert.equal(isWalletPaymentReturnURL(url), false);
});
