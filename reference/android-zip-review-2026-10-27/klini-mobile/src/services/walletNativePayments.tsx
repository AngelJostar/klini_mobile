import { createContext, useContext, type ComponentType } from 'react';
import type { WalletPaymentConfiguration } from '../domain/accountWallet';
import type { WalletNativePaymentRequest, WalletNativePaymentResult } from './walletNativePaymentsProtocol';
export type { WalletNativePaymentRequest, WalletNativePaymentResult } from './walletNativePaymentsProtocol';

export type WalletNativeApplePayButtonProps = {
  configuration: WalletPaymentConfiguration;
  disabled?: boolean;
  onPress: () => void;
};
export type WalletNativePayments = {
  availability: 'loading' | 'ready' | 'unsupported';
  applePaySupported: boolean;
  cardSupported: boolean;
  canUseApplePay: (configuration: WalletPaymentConfiguration) => boolean;
  canUseCard: (configuration: WalletPaymentConfiguration) => boolean;
  payApplePay: (configuration: WalletPaymentConfiguration, request: WalletNativePaymentRequest) => Promise<WalletNativePaymentResult>;
  payCard: (configuration: WalletPaymentConfiguration, request: WalletNativePaymentRequest) => Promise<WalletNativePaymentResult>;
  reset: () => Promise<void>;
};

const unavailable = async (): Promise<never> => { throw new Error('Los pagos no están disponibles en esta compilación.'); };
export const unsupportedWalletNativePayments: WalletNativePayments = {
  availability: 'unsupported', applePaySupported: false, cardSupported: false,
  canUseApplePay: () => false, canUseCard: () => false, payApplePay: unavailable, payCard: unavailable, reset: async () => {},
};
export const WalletNativePaymentsContext = createContext<WalletNativePayments & { NativeButton: ComponentType<WalletNativeApplePayButtonProps> | null }>({ ...unsupportedWalletNativePayments, NativeButton: null });

export function useWalletNativePayments(): WalletNativePayments { return useContext(WalletNativePaymentsContext); }

/** Render only the SDK's official native button, for the merchant compiled into this app. */
export function WalletNativeApplePayButton(props: WalletNativeApplePayButtonProps) {
  const { NativeButton, canUseApplePay } = useContext(WalletNativePaymentsContext);
  return NativeButton && canUseApplePay(props.configuration) ? <NativeButton {...props} /> : null;
}
