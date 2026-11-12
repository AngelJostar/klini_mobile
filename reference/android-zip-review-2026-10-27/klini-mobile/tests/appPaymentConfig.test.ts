import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

type Plugin = string | [string, Record<string, unknown>?];
type Config = {
  plugins?: Plugin[];
  extra?: Record<string, unknown>;
  ios?: { infoPlist?: Record<string, unknown>; [key: string]: unknown };
  [key: string]: unknown;
};
type GeneratedConfig = Config & {
  plugins: Plugin[];
  extra: Record<string, unknown>;
  ios: { infoPlist: Record<string, unknown>; [key: string]: unknown };
};
const require = createRequire(import.meta.url);
const appConfig = require('../app.config.js') as (input: { config: Config }) => GeneratedConfig;
const MODE = 'EXPO_PUBLIC_PAYMENTS_MODE';
const MERCHANT = 'EXPO_PUBLIC_APPLE_MERCHANT_ID';
const PUBLIC_KEY = 'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY';
const publicVariables = [MODE, MERCHANT, PUBLIC_KEY] as const;
const merchant = 'merchant.mx.klini.review';
const testKey = 'pk_test_syntheticPublishable123456';
const liveKey = 'pk_live_syntheticPublishable123456';

/** No dotenv or private configuration: replace only the three public inputs, then restore. */
function configured(env: Partial<Record<typeof publicVariables[number], string>> = {}, config: Config = {}): GeneratedConfig {
  const previous = publicVariables.map(name => [name, process.env[name]] as const);
  try {
    for (const name of publicVariables) {
      const value = env[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    return appConfig({ config });
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

function options(config: GeneratedConfig, name: string): Record<string, unknown> {
  const matches = config.plugins.filter(plugin => (Array.isArray(plugin) ? plugin[0] : plugin) === name);
  assert.equal(matches.length, 1, `${name} must be configured exactly once`);
  assert.ok(Array.isArray(matches[0]));
  return matches[0][1] ?? {};
}

test('payment config defaults to TEST without requiring a public key or enabling an Apple merchant', () => {
  const output = configured();
  assert.equal(output.extra.walletPaymentMode, 'test');
  assert.equal(output.extra.walletPaymentMerchantIdentifier, '');
  assert.deepEqual(options(output, 'expo-build-properties'), { ios: { useFrameworks: 'dynamic' } });
  assert.equal(output.plugins.some(plugin => (Array.isArray(plugin) ? plugin[0] : plugin) === '@stripe/stripe-react-native'), false);
  assert.equal(output.ios.infoPlist.CFBundleAllowMixedLocalizations, true);
  assert.deepEqual(output.ios.infoPlist.CFBundleLocalizations, ['es']);
});

test('existing embedded TEST configuration retains its merchant and does not opt into LIVE', () => {
  for (const mode of [undefined, 'test']) {
    const output = configured({ [MODE]: mode, [MERCHANT]: merchant, [PUBLIC_KEY]: testKey });
    assert.equal(output.extra.walletPaymentMode, 'test');
    assert.equal(output.extra.walletPaymentMerchantIdentifier, merchant);
    assert.deepEqual(options(output, '@stripe/stripe-react-native'), { merchantIdentifier: merchant, enableGooglePay: false });
  }
});

test('LIVE requires an explicit mode but accepts backend-supplied keys without embedding one', () => {
  const withoutKey = configured({ [MODE]: 'live', [MERCHANT]: merchant });
  assert.equal(withoutKey.extra.walletPaymentMode, 'live');
  assert.equal(withoutKey.extra.walletPaymentMerchantIdentifier, merchant);
  assert.deepEqual(options(withoutKey, '@stripe/stripe-react-native'), { merchantIdentifier: merchant, enableGooglePay: false });
  assert.equal(Object.hasOwn(withoutKey.extra, 'publishableKey'), false);
  assert.equal(Object.hasOwn(withoutKey.extra, 'stripePublishableKey'), false);
  assert.equal(configured({ [MODE]: 'live', [MERCHANT]: merchant, [PUBLIC_KEY]: liveKey }).extra.walletPaymentMode, 'live');
  // The separate diagnostic TEST provider may retain its public TEST key in a LIVE-capable build.
  assert.equal(configured({ [MODE]: 'live', [MERCHANT]: merchant, [PUBLIC_KEY]: testKey }).extra.walletPaymentMode, 'live');
});

test('malformed payment modes, keys and merchants fail closed, including LIVE keys in TEST', () => {
  for (const mode of ['LIVE', 'TEST', 'production', 'sandbox', ' ', 'live,test']) assert.throws(() => configured({ [MODE]: mode }));
  for (const mode of [undefined, 'test']) assert.throws(() => configured({ [MODE]: mode, [PUBLIC_KEY]: liveKey }));
  for (const publicKey of ['public-invalid', 'pk_test_short', 'pk_live_short', 'pk_test_invalid-key-123456']) {
    assert.throws(() => configured({ [PUBLIC_KEY]: publicKey }));
    assert.throws(() => configured({ [MODE]: 'live', [PUBLIC_KEY]: publicKey }));
  }
  for (const invalidMerchant of ['merchant.', 'mx.klini.review', 'merchant.mx/klini', `merchant.${'a'.repeat(202)}`]) assert.throws(() => configured({ [MERCHANT]: invalidMerchant }));
});

test('payment plugins deduplicate and merge existing iOS, Android and unrelated options', () => {
  const unrelated: Plugin = ['expo-camera', { cameraPermission: 'Permiso existente' }];
  const input: Config = {
    name: 'Klini', scheme: 'klini-review', android: { package: 'mx.klini.review' },
    plugins: [
      'expo-font', unrelated,
      '@stripe/stripe-react-native', ['@stripe/stripe-react-native', { merchantIdentifier: 'merchant.old.value', enableGooglePay: true }],
      'expo-build-properties',
      ['expo-build-properties', { customOption: 'keep', ios: { useFrameworks: 'static', deploymentTarget: '16.0' }, android: { minSdkVersion: 26 } }],
      ['expo-build-properties', { otherOption: true, ios: { buildReactNativeFromSource: true }, android: { compileSdkVersion: 36 } }],
    ],
  };
  const before = structuredClone(input);
  const output = configured({ [MERCHANT]: merchant }, input);
  assert.deepEqual(input, before, 'configuration must not mutate its input');
  assert.deepEqual(output.plugins.slice(0, 2), ['expo-font', unrelated]);
  assert.deepEqual(options(output, '@stripe/stripe-react-native'), { merchantIdentifier: merchant, enableGooglePay: false });
  assert.deepEqual(options(output, 'expo-build-properties'), {
    customOption: 'keep', otherOption: true,
    ios: { useFrameworks: 'dynamic', deploymentTarget: '16.0', buildReactNativeFromSource: true },
    android: { minSdkVersion: 26, compileSdkVersion: 36 },
  });
  assert.equal(output.name, 'Klini'); assert.equal(output.scheme, 'klini-review');
  assert.deepEqual(output.android, { package: 'mx.klini.review' });
});

test('Spanish PaymentSheet localization preserves other locales, Info.plist fields and extra values', () => {
  const output = configured({ [MODE]: 'test', [MERCHANT]: merchant }, {
    extra: { existing: { keep: true }, walletPaymentMode: 'live', walletPaymentMerchantIdentifier: 'merchant.old.value' },
    ios: { bundleIdentifier: 'mx.klini.review', supportsTablet: false, infoPlist: {
      CFBundleAllowMixedLocalizations: false, CFBundleLocalizations: ['en', 'fr', 'es', 'en'],
      NSCameraUsageDescription: 'Texto existente', NSAppTransportSecurity: { NSAllowsArbitraryLoads: false, NSAllowsLocalNetworking: true },
    } },
  });
  assert.deepEqual(output.extra, { existing: { keep: true }, walletPaymentMode: 'test', walletPaymentMerchantIdentifier: merchant });
  assert.equal(output.ios.bundleIdentifier, 'mx.klini.review'); assert.equal(output.ios.supportsTablet, false);
  assert.equal(output.ios.infoPlist.CFBundleAllowMixedLocalizations, true);
  assert.deepEqual(output.ios.infoPlist.CFBundleLocalizations, ['en', 'fr', 'es']);
  assert.equal(output.ios.infoPlist.NSCameraUsageDescription, 'Texto existente');
  assert.deepEqual(output.ios.infoPlist.NSAppTransportSecurity, { NSAllowsArbitraryLoads: false, NSAllowsLocalNetworking: true });
});
