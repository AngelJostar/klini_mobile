import type { ReactNode } from 'react';
import { WalletNativePaymentsContext, unsupportedWalletNativePayments } from '../services/walletNativePayments';

/** Web never evaluates the native Stripe module or presents a simulated payment button. */
export default function WalletPaymentProvider({ children }: { children: ReactNode }) {
  return <WalletNativePaymentsContext.Provider value={{ ...unsupportedWalletNativePayments, NativeButton: null }}>{children}</WalletNativePaymentsContext.Provider>;
}
