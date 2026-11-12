export type PaymentTestConfig = { publishableKey: string; merchantIdentifier: string };

/** Public configuration only. Secret Stripe keys and session tokens never belong here. */
export function getPaymentTestConfig(): PaymentTestConfig | null {
  const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? '';
  const merchantIdentifier = process.env.EXPO_PUBLIC_APPLE_MERCHANT_ID?.trim() ?? '';
  if (!/^pk_test_[A-Za-z0-9]{12,}$/.test(publishableKey) || !/^merchant\.[A-Za-z0-9][A-Za-z0-9.-]{2,199}$/.test(merchantIdentifier)) return null;
  return { publishableKey, merchantIdentifier };
}

export function validatePaymentTestApiUrl(value: string): string {
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error('Escribe la dirección del servidor de pruebas.'); }
  const privateHost = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]' || /^10\.(?:\d{1,3}\.){2}\d{1,3}$/.test(url.hostname) || /^192\.168\.\d{1,3}\.\d{1,3}$/.test(url.hostname) || /^172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(url.hostname);
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && privateHost)) || url.username || url.password || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) throw new Error('Usa HTTPS o la dirección local del servidor de pruebas, sin rutas ni credenciales.');
  return url.origin;
}

export function getPaymentTestApiUrl(): string {
  const configured = process.env.EXPO_PUBLIC_PAYMENTS_TEST_API_URL?.trim() ?? '';
  if (!configured) return '';
  try { return validatePaymentTestApiUrl(configured); } catch { return ''; }
}
