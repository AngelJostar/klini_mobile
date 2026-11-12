import React, { Component, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { TurboModuleRegistry, StyleSheet, type TurboModule } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { getPaymentTestConfig } from '../services/paymentsConfig';
import { ApplePayTestContext, type ApplePayTestAvailability, type ApplePayTestButtonProps } from '../services/applePayTestContext';
import { readApplePayTestConfirmation, validateApplePayTestRequest, type ApplePayTestConfirmation } from '../services/applePayTestProtocol';
import { withWalletStripeOperation, WALLET_PAYMENT_URL_SCHEME } from '../services/walletNativePaymentsProtocol';

export { ApplePayTestButton, useApplePayTest } from '../services/applePayTestContext';

type StripeSdk = typeof import('@stripe/stripe-react-native');
const NativeSdkContext = createContext<{ sdk: StripeSdk | null; onUnavailable: () => void }>({ sdk: null, onUnavailable: () => {} });

/** Test the optional module before evaluating Stripe's getEnforcing import. */
function canLoadNativeStripe(): boolean {
  try {
    return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient && TurboModuleRegistry.get<TurboModule>('StripeSdk') !== null;
  } catch {
    return false;
  }
}

class NativeButtonBoundary extends Component<{ children: ReactNode; onUnavailable: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onUnavailable(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function NativeApplePayTestButton({ disabled = false, onPress }: ApplePayTestButtonProps) {
  const { sdk, onUnavailable } = useContext(NativeSdkContext);
  if (!sdk) return null;
  return <NativeButtonBoundary onUnavailable={onUnavailable}>
    <sdk.PlatformPayButton
      testID="wallet-apple-pay-native-confirm"
      accessibilityLabel="Recargar con Apple Pay, prueba sin cargos reales"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      type={sdk.PlatformPay.ButtonType.Reload}
      appearance={sdk.PlatformPay.ButtonStyle.Black}
      borderRadius={14}
      style={styles.button}
    />
  </NativeButtonBoundary>;
}

/**
 * Loads the SDK without changing its global credentials or reparenting app children.
 * Existing iOS binaries/Expo Go stay usable even without Stripe native modules.
 */
export default function StripeTestProvider({ children }: { children: ReactNode }) {
  const config = useMemo(() => getPaymentTestConfig(), []);
  const [sdk, setSdk] = useState<StripeSdk | null>(null);
  const [availability, setAvailability] = useState<ApplePayTestAvailability>(() => !config ? 'unconfigured' : canLoadNativeStripe() ? 'loading' : 'unsupported');
  const confirming = useRef(false);

  useEffect(() => {
    if (!config || availability !== 'loading') return;
    let current = true;
    const timeout = setTimeout(() => {
      current = false;
      setAvailability('unsupported');
    }, 10_000);
    void (async () => {
      // A dynamic import is essential: the SDK enforces StripeSdk at evaluation.
      const loadedSdk = await import('@stripe/stripe-react-native');
      if (!current) return;
      const supported = await loadedSdk.isPlatformPaySupported();
      if (!current) return;
      clearTimeout(timeout);
      if (supported) setSdk(loadedSdk);
      setAvailability(supported ? 'ready' : 'unsupported');
    })().catch(() => {
      if (!current) return;
      clearTimeout(timeout);
      setAvailability('unsupported');
    });
    return () => { current = false; clearTimeout(timeout); };
  }, [availability, config]);

  const onUnavailable = useCallback(() => {
    setSdk(null);
    setAvailability('unsupported');
  }, []);

  const confirm = useCallback(async (clientSecret: string, amountCents: number): Promise<ApplePayTestConfirmation> => {
    validateApplePayTestRequest(clientSecret, amountCents);
    if (availability !== 'ready' || !sdk || !config) throw new Error('Apple Pay de prueba no está disponible en esta compilación.');
    if (confirming.current) throw new Error('Ya hay un pago de prueba en curso.');
    confirming.current = true;
    try {
      return await withWalletStripeOperation(async () => {
        await sdk.initStripe({ publishableKey: config.publishableKey, merchantIdentifier: config.merchantIdentifier, urlScheme: WALLET_PAYMENT_URL_SCHEME });
        // The Intent must already exist: this call directly follows the native CTA.
        const result = await sdk.confirmPlatformPayPayment(clientSecret, {
          applePay: {
            merchantCountryCode: 'MX',
            currencyCode: 'MXN',
            cartItems: [{ label: 'Klini · consultas', amount: (amountCents / 100).toFixed(2), paymentType: sdk.PlatformPay.PaymentType.Immediate }],
          },
        }).catch(() => { throw new Error('No se pudo abrir Apple Pay de prueba. Intenta nuevamente.'); });
        return readApplePayTestConfirmation(result, clientSecret, amountCents);
      }).catch(() => { throw new Error('No se pudo completar el pago de prueba. Consulta su estado antes de intentar de nuevo.'); });
    } finally {
      confirming.current = false;
    }
  }, [availability, config, sdk]);

  const value = useMemo(() => ({ supported: availability === 'ready', availability, confirm, NativeButton: NativeApplePayTestButton }), [availability, confirm]);
  const nativeValue = useMemo(() => ({ sdk, onUnavailable }), [sdk, onUnavailable]);
  return <NativeSdkContext.Provider value={nativeValue}><ApplePayTestContext.Provider value={value}>{children}</ApplePayTestContext.Provider></NativeSdkContext.Provider>;
}

const styles = StyleSheet.create({ button: { width: '100%', height: 50 } });
