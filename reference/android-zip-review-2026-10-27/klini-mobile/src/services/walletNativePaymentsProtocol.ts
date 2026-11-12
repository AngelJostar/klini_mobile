import { MIN_ACCOUNT_RECHARGE_CENTS, MAX_ACCOUNT_RECHARGE_CENTS, type PaymentMode, type WalletPaymentConfiguration } from '../domain/accountWallet';

export const WALLET_PAYMENT_RETURN_URL = 'klini-review://stripe-redirect';
export const WALLET_PAYMENT_URL_SCHEME = 'klini-review';
export type WalletNativePaymentRequest = { clientSecret: string; amountCents: number };
export type WalletNativePaymentResult = { status: 'completed' | 'canceled' };
export type WalletNativeBuildConfiguration = { mode: PaymentMode; merchantIdentifier: string };
type IntentResult = {
  error?: { code?: string };
  paymentIntent?: { id: string; amount: number; currency: string; livemode: boolean; status: string };
};

export function validateWalletNativeRequest(config: WalletPaymentConfiguration, request: WalletNativePaymentRequest): void {
  if (!config || !['test', 'live'].includes(config.mode) || config.country !== 'MX' ||
      typeof config.publishableKey !== 'string' || !new RegExp(`^pk_${config.mode}_[A-Za-z0-9]{12,}$`).test(config.publishableKey) ||
      typeof config.merchantIdentifier !== 'string' || !/^merchant\.[A-Za-z0-9][A-Za-z0-9.-]{2,199}$/.test(config.merchantIdentifier)) {
    throw new Error('La configuración de pagos de tu cuenta no está disponible.');
  }
  if (!request || typeof request.clientSecret !== 'string' || !/^pi_[A-Za-z0-9]+_secret_[A-Za-z0-9]+$/.test(request.clientSecret) || request.clientSecret.trim() !== request.clientSecret ||
      !Number.isSafeInteger(request.amountCents) || request.amountCents < MIN_ACCOUNT_RECHARGE_CENTS || request.amountCents > MAX_ACCOUNT_RECHARGE_CENTS) {
    throw new Error('La solicitud de recarga no es válida. Consulta su estado e intenta nuevamente.');
  }
}

/** The server cannot select a different Apple merchant or mode from this binary. */
export function walletNativeConfigurationMatches(config: WalletPaymentConfiguration, build: WalletNativeBuildConfiguration): boolean {
  try {
    validateWalletNativeRequest(config, { clientSecret: 'pi_validation_secret_validation', amountCents: MIN_ACCOUNT_RECHARGE_CENTS });
    return config.mode === build.mode && !!build.merchantIdentifier && config.merchantIdentifier === build.merchantIdentifier;
  } catch { return false; }
}

/** A client result only permits server reconciliation; it never credits the wallet. */
export function readWalletNativePaymentResult(result: IntentResult, config: WalletPaymentConfiguration, request: WalletNativePaymentRequest): WalletNativePaymentResult {
  validateWalletNativeRequest(config, request);
  if (result.error?.code === 'Canceled') return { status: 'canceled' };
  if (readWalletNativePaymentStatus(result, config, request) !== 'Succeeded') throw new Error('El pago aún no está confirmado. Consulta el estado de tu recarga.');
  return { status: 'completed' };
}

/** Check the server-created Intent BEFORE displaying an amount or confirming it. */
export function readWalletNativePaymentStatus(result: IntentResult, config: WalletPaymentConfiguration, request: WalletNativePaymentRequest): string {
  validateWalletNativeRequest(config, request);
  if (result.error) throw new Error('No se pudo verificar el pago. Consulta el estado de tu recarga.');
  const intent = result.paymentIntent;
  if (!intent || intent.id !== request.clientSecret.split('_secret_')[0] || intent.amount !== request.amountCents || typeof intent.currency !== 'string' || intent.currency.toLowerCase() !== 'mxn' || intent.livemode !== (config.mode === 'live') || typeof intent.status !== 'string') {
    throw new Error('No se pudo verificar el pago. Consulta el estado de tu recarga.');
  }
  return intent.status;
}

let stripeOperationActive = false;

/** Stripe has one native global configuration. Hold this across init AND the full UI/3DS flow. */
export async function withWalletStripeOperation<T>(operation: () => Promise<T>): Promise<T> {
  if (stripeOperationActive) throw new Error('Ya hay un pago en curso. Termínalo antes de continuar.');
  stripeOperationActive = true;
  try { return await operation(); } finally { stripeOperationActive = false; }
}

export function isWalletPaymentReturnURL(url: string): boolean {
  return /^klini-review:\/\/stripe-redirect(?:[/?#]|$)/.test(url);
}
