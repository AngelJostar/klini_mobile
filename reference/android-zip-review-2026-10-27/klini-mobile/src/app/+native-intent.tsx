import { isWalletPaymentReturnURL } from '../services/walletNativePaymentsProtocol';

/** Stripe consumes the original URL through Linking; Router receives only the wallet route. */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return isWalletPaymentReturnURL(path) ? '/wallet' : path;
}
