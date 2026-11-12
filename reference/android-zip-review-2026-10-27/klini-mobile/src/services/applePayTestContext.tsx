import { createContext, useContext, type ComponentType } from 'react';
import type { ApplePayTestConfirmation } from './applePayTestProtocol';

export type ApplePayTestAvailability = 'unconfigured' | 'unsupported' | 'ready' | 'loading';
export type ApplePayTestButtonProps = { disabled?: boolean; onPress: () => void };
export type ApplePayTestAccess = {
  supported: boolean;
  availability: ApplePayTestAvailability;
  confirm: (clientSecret: string, amountCents: number) => Promise<ApplePayTestConfirmation>;
};

export const unavailableApplePayTestConfirmation: ApplePayTestAccess['confirm'] = async () => {
  throw new Error('Apple Pay de prueba no está disponible en esta compilación.');
};

export const ApplePayTestContext = createContext<ApplePayTestAccess & { NativeButton: ComponentType<ApplePayTestButtonProps> | null }>({
  supported: false,
  availability: 'unconfigured',
  confirm: unavailableApplePayTestConfirmation,
  NativeButton: null,
});

export function useApplePayTest(): ApplePayTestAccess {
  const { supported, availability, confirm } = useContext(ApplePayTestContext);
  return { supported, availability, confirm };
}

/** Returns no imitation payment button when a native Apple Pay sheet cannot open. */
export function ApplePayTestButton(props: ApplePayTestButtonProps) {
  const { availability, NativeButton } = useContext(ApplePayTestContext);
  return availability === 'ready' && NativeButton ? <NativeButton {...props} /> : null;
}
