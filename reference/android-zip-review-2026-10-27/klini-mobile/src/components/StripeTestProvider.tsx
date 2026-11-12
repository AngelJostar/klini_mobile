import type { ReactNode } from 'react';
import { getPaymentTestConfig } from '../services/paymentsConfig';
import { ApplePayTestContext, unavailableApplePayTestConfirmation } from '../services/applePayTestContext';

export { ApplePayTestButton, useApplePayTest } from '../services/applePayTestContext';

/** Web/Android deliberately do not import the native Stripe SDK. */
export default function StripeTestProvider({ children }: { children: ReactNode }) {
  return <ApplePayTestContext.Provider value={{
    supported: false,
    availability: getPaymentTestConfig() ? 'unsupported' : 'unconfigured',
    confirm: unavailableApplePayTestConfirmation,
    NativeButton: null,
  }}>{children}</ApplePayTestContext.Provider>;
}
