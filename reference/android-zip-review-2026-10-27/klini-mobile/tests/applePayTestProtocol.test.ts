import assert from 'node:assert/strict';
import test from 'node:test';
import { readApplePayTestConfirmation, validateApplePayTestRequest } from '../src/services/applePayTestProtocol';

const clientSecret = 'pi_fixture123_secret_fixture456';
const settled = { paymentIntent: { id: 'pi_fixture123', status: 'Succeeded', amount: 10_000, currency: 'mxn', livemode: false } };

test('Apple Pay accepts only bounded integer-cent requests and PaymentIntent secrets', () => {
  assert.doesNotThrow(() => validateApplePayTestRequest(clientSecret, 1000));
  assert.doesNotThrow(() => validateApplePayTestRequest(clientSecret, 10_000_000));
  for (const amount of [0, 999, 1000.1, NaN, Infinity, 10_000_001]) {
    assert.throws(() => validateApplePayTestRequest(clientSecret, amount));
  }
  for (const secret of ['sk_test_fixture', 'pk_test_fixture', 'seti_fixture_secret_test', 'pi_fixture_secret_', `${clientSecret}\n`]) {
    assert.throws(() => validateApplePayTestRequest(secret, 1000));
  }
});

test('Apple Pay cancellation stays distinct from confirmation without exposing provider errors', () => {
  assert.deepEqual(readApplePayTestConfirmation({ error: { code: 'Canceled' } }, clientSecret, 10_000), { status: 'canceled' });
  assert.throws(() => readApplePayTestConfirmation({ error: { code: 'pi_sensitive_secret_data' } }, clientSecret, 10_000), error => error instanceof Error && !error.message.includes('pi_sensitive'));
});

test('Apple Pay requires the same settled Intent, currency, and amount before reporting confirmation', () => {
  assert.deepEqual(readApplePayTestConfirmation(settled, clientSecret, 10_000), { status: 'confirmed' });
  for (const mutation of [{ id: 'pi_different' }, { currency: 'usd' }, { amount: 10_001 }, { status: 'Processing' }, { status: 'RequiresCapture' }, { livemode: true }]) {
    assert.throws(() => readApplePayTestConfirmation({ paymentIntent: { ...settled.paymentIntent, ...mutation } }, clientSecret, 10_000));
  }
  assert.throws(() => readApplePayTestConfirmation({}, clientSecret, 10_000));
});
