import React, { Component, createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, TurboModuleRegistry, type TurboModule } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Linking from 'expo-linking';
import type { WalletPaymentConfiguration } from '../domain/accountWallet';
import { WalletNativePaymentsContext, type WalletNativeApplePayButtonProps } from '../services/walletNativePayments';
import { isWalletPaymentReturnURL, readWalletNativePaymentResult, readWalletNativePaymentStatus, validateWalletNativeRequest, walletNativeConfigurationMatches, withWalletStripeOperation, WALLET_PAYMENT_RETURN_URL, WALLET_PAYMENT_URL_SCHEME, type WalletNativeBuildConfiguration, type WalletNativePaymentRequest, type WalletNativePaymentResult } from '../services/walletNativePaymentsProtocol';

type StripeSdk = typeof import('@stripe/stripe-react-native');
const NativeSdkContext = createContext<{ sdk: StripeSdk | null; onUnavailable: () => void }>({ sdk: null, onUnavailable: () => {} });

function canLoadNativeStripe(): boolean {
  try { return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient && TurboModuleRegistry.get<TurboModule>('StripeSdk') !== null; }
  catch { return false; }
}

function compiledPaymentConfiguration(): WalletNativeBuildConfiguration {
  const extra = Constants.expoConfig?.extra;
  return {
    mode: extra?.walletPaymentMode === 'live' ? 'live' : 'test',
    merchantIdentifier: typeof extra?.walletPaymentMerchantIdentifier === 'string' ? extra.walletPaymentMerchantIdentifier : '',
  };
}

class NativeButtonBoundary extends Component<{ children: ReactNode; onUnavailable: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onUnavailable(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function NativeApplePayButton({ configuration, disabled = false, onPress }: WalletNativeApplePayButtonProps) {
  const { sdk, onUnavailable } = useContext(NativeSdkContext);
  if (!sdk) return null;
  return <NativeButtonBoundary onUnavailable={onUnavailable}><sdk.PlatformPayButton
    testID="wallet-account-apple-pay-confirm"
    accessibilityLabel={configuration.mode === 'test' ? 'Recargar con Apple Pay en modo de prueba' : 'Recargar con Apple Pay'}
    accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    type={sdk.PlatformPay.ButtonType.Reload} appearance={sdk.PlatformPay.ButtonStyle.Black}
    borderRadius={14} style={styles.button}
  /></NativeButtonBoundary>;
}

/** Load optional native APIs without changing global Stripe credentials on mount. */
export default function WalletPaymentProvider({ children }: { children: ReactNode }) {
  const build = useMemo(() => compiledPaymentConfiguration(), []);
  const [sdk, setSdk] = useState<StripeSdk | null>(null);
  const [availability, setAvailability] = useState<'loading' | 'ready' | 'unsupported'>(() => canLoadNativeStripe() ? 'loading' : 'unsupported');
  const [applePaySupported, setApplePaySupported] = useState(false);

  useEffect(() => {
    if (availability !== 'loading') return;
    let current = true;
    const timeout = setTimeout(() => { current = false; setAvailability('unsupported'); }, 10_000);
    void (async () => {
      const loaded = await import('@stripe/stripe-react-native');
      // This native capability query does not require initStripe.
      const supported = Platform.OS === 'ios' && await loaded.isPlatformPaySupported();
      if (!current) return;
      clearTimeout(timeout);
      setSdk(loaded);
      setApplePaySupported(supported);
      setAvailability('ready');
    })().catch(() => {
      if (!current) return;
      clearTimeout(timeout);
      setAvailability('unsupported');
    });
    return () => { current = false; clearTimeout(timeout); };
  }, [availability]);

  useEffect(() => {
    if (!sdk) return;
    let current = true;
    const handle = (url: string) => {
      if (current && isWalletPaymentReturnURL(url)) void sdk.handleURLCallback(url).catch(() => {});
    };
    const subscription = Linking.addEventListener('url', ({ url }) => handle(url));
    void Linking.getInitialURL().then(url => { if (url) handle(url); }).catch(() => {});
    return () => { current = false; subscription.remove(); };
  }, [sdk]);

  const onUnavailable = useCallback(() => { setAvailability('unsupported'); setApplePaySupported(false); setSdk(null); }, []);
  const canUseCard = useCallback((config: WalletPaymentConfiguration) => availability === 'ready' && walletNativeConfigurationMatches(config, build), [availability, build]);
  const canUseApplePay = useCallback((config: WalletPaymentConfiguration) => availability === 'ready' && applePaySupported && walletNativeConfigurationMatches(config, build), [availability, applePaySupported, build]);

  const runPayment = useCallback(async (config: WalletPaymentConfiguration, request: WalletNativePaymentRequest, method: 'apple_pay' | 'card'): Promise<WalletNativePaymentResult> => {
    validateWalletNativeRequest(config, request);
    if (availability !== 'ready' || !sdk) throw new Error('Los pagos no están disponibles en esta compilación.');
    if (!walletNativeConfigurationMatches(config, build)) throw new Error('Esta compilación no coincide con la configuración de pagos de tu cuenta.');
    if (method === 'apple_pay' && !canUseApplePay(config)) throw new Error('Apple Pay no está disponible en este dispositivo.');
    return withWalletStripeOperation<WalletNativePaymentResult>(async () => {
      // Both this provider and the separate TEST provider take the same lock.
      await sdk.initStripe({ publishableKey: config.publishableKey, merchantIdentifier: config.merchantIdentifier, urlScheme: WALLET_PAYMENT_URL_SCHEME });
      const currentStatus = readWalletNativePaymentStatus(await sdk.retrievePaymentIntent(request.clientSecret), config, request);
      if (currentStatus === 'Succeeded') return { status: 'completed' };
      if (!['RequiresPaymentMethod', 'RequiresConfirmation', 'RequiresAction'].includes(currentStatus)) throw new Error('Consulta el estado de la recarga antes de continuar.');
      if (method === 'apple_pay') {
        const result = await sdk.confirmPlatformPayPayment(request.clientSecret, { applePay: {
          merchantCountryCode: config.country, currencyCode: 'MXN',
          cartItems: [{ label: 'Klini · servicios de salud', amount: (request.amountCents / 100).toFixed(2), paymentType: sdk.PlatformPay.PaymentType.Immediate }],
        } });
        return readWalletNativePaymentResult(result, config, request);
      }
      const initialized = await sdk.initPaymentSheet({
        merchantDisplayName: 'Klini', paymentIntentClientSecret: request.clientSecret,
        returnURL: WALLET_PAYMENT_RETURN_URL, allowsDelayedPaymentMethods: false,
        link: { display: sdk.PaymentSheet.LinkDisplay.NEVER },
        style: 'alwaysLight', primaryButtonLabel: `Recargar $${(request.amountCents / 100).toFixed(2)} MXN`,
        appearance: { colors: { primary: '#007D79', background: '#FFFFFF', componentBackground: '#F4F8F8', componentBorder: '#DDE9EB', primaryText: '#082441', secondaryText: '#6E8799' }, shapes: { borderRadius: 14, borderWidth: 1 }, primaryButton: { colors: { background: '#082441', text: '#FFFFFF' } } },
      });
      if (initialized.error) throw new Error('No se pudo abrir el formulario de pago.');
      const presented = await sdk.presentPaymentSheet();
      if (presented.didCancel || presented.error?.code === 'Canceled') return { status: 'canceled' };
      if (presented.error) throw new Error('No se pudo confirmar el pago.');
      return readWalletNativePaymentResult(await sdk.retrievePaymentIntent(request.clientSecret), config, request);
    }).catch(() => { throw new Error('No se pudo completar el pago. Consulta el estado de tu recarga antes de intentar de nuevo.'); });
  }, [availability, build, canUseApplePay, sdk]);

  const payApplePay = useCallback((config: WalletPaymentConfiguration, request: WalletNativePaymentRequest) => runPayment(config, request, 'apple_pay'), [runPayment]);
  const payCard = useCallback((config: WalletPaymentConfiguration, request: WalletNativePaymentRequest) => runPayment(config, request, 'card'), [runPayment]);
  const reset = useCallback(async () => {
    if (!sdk) return;
    await withWalletStripeOperation(async () => { await sdk.resetPaymentSheetCustomer(); }).catch(() => { throw new Error('No se pudo cerrar la sesión de pagos. Termina el pago en curso e intenta nuevamente.'); });
  }, [sdk]);
  const value = useMemo(() => ({ availability, applePaySupported, cardSupported: availability === 'ready', canUseApplePay, canUseCard, payApplePay, payCard, reset, NativeButton: NativeApplePayButton }), [availability, applePaySupported, canUseApplePay, canUseCard, payApplePay, payCard, reset]);
  const nativeValue = useMemo(() => ({ sdk, onUnavailable }), [sdk, onUnavailable]);
  return <NativeSdkContext.Provider value={nativeValue}><WalletNativePaymentsContext.Provider value={value}>{children}</WalletNativePaymentsContext.Provider></NativeSdkContext.Provider>;
}

const styles = StyleSheet.create({ button: { width: '100%', height: 50 } });
