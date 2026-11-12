export type ApplePayTestConfirmation = { status: 'confirmed' | 'canceled' };

export type ApplePayTestIntentResult = {
  error?: { code?: string };
  paymentIntent?: { id: string; status: string; amount: number; currency: string; livemode: boolean };
};

/** Amounts cross the native/server boundary only as integer MXN cents. */
export function validateApplePayTestRequest(clientSecret: string, amountCents: number): void {
  if (clientSecret.trim() !== clientSecret || !/^pi_[A-Za-z0-9]+_secret_[A-Za-z0-9]+$/.test(clientSecret) || !Number.isSafeInteger(amountCents) || amountCents < 1000 || amountCents > 10_000_000) {
    throw new Error('La solicitud de pago de prueba no es válida.');
  }
}

/** Never forward SDK/provider messages, which may contain payment identifiers. */
export function readApplePayTestConfirmation(result: ApplePayTestIntentResult, clientSecret: string, amountCents: number): ApplePayTestConfirmation {
  if (result.error?.code === 'Canceled') return { status: 'canceled' };
  if (result.error) throw new Error('Apple Pay no pudo completar el pago de prueba. Intenta nuevamente.');
  const intent = result.paymentIntent;
  if (!intent || intent.livemode !== false || intent.id !== clientSecret.split('_secret_')[0] || intent.amount !== amountCents || intent.currency.toLowerCase() !== 'mxn') {
    throw new Error('No se pudo verificar el resultado de Apple Pay. Revisa el estado del pago de prueba.');
  }
  if (intent.status !== 'Succeeded') {
    throw new Error('El pago de prueba aún no está confirmado. Revisa su estado antes de intentar otro pago.');
  }
  // This result does not credit a wallet. The backend must verify settlement.
  return { status: 'confirmed' };
}
