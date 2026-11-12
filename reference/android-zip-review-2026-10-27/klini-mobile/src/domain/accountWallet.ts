/** Server-owned wallet. Never persisted in the local demonstration store. */
export type PaymentMode = 'test' | 'live';
export type WalletPaymentConfiguration = {
  mode: PaymentMode;
  publishableKey: string;
  merchantIdentifier: string;
  country: 'MX';
};
export const ACCOUNT_RECHARGE_STATUSES = ['creating', 'requires_payment_method', 'requires_confirmation', 'requires_action', 'processing', 'requires_capture', 'succeeded', 'canceled'] as const;
export type AccountRechargeStatus = typeof ACCOUNT_RECHARGE_STATUSES[number];
export interface AccountRecharge {
  id: string;
  amountCents: number;
  status: AccountRechargeStatus;
  mode: PaymentMode;
  currency: 'MXN';
  scope: 'health_services';
  createdAt: string;
}
export interface AccountWalletMovement {
  id: string;
  orderId: string | null;
  servicePaymentId: string | null;
  appointmentId: number | null;
  amountCents: number;
  type: 'recharge' | 'refund' | 'service_payment' | 'service_reversal';
  createdAt: string;
}
export interface AccountWallet {
  mode: PaymentMode;
  currency: 'MXN';
  scope: 'health_services';
  balanceCents: number;
  availableBalanceCents: number;
  blocked: boolean;
  servicePaymentsEnabled: boolean;
  movements: AccountWalletMovement[];
  hasMoreMovements: boolean;
  pendingRecharges: AccountRecharge[];
  paymentConfiguration: WalletPaymentConfiguration | null;
}
export interface AccountRechargeResult {
  recharge: AccountRecharge;
  paymentIntentId: string | null;
  clientSecret: string | null;
  wallet: AccountWallet | null;
}

export interface AccountConsultationTariff {
  id: number;
  version: number;
  amountCents: number;
  currency: 'MXN';
  modality: 'in_person';
}
export interface AccountConsultationQuote {
  id: string;
  appointmentId: number;
  tariffId: number;
  tariffVersion: number;
  amountCents: number;
  currency: 'MXN';
  scope: 'health_services';
  mode: PaymentMode;
  expiresAt: string;
  status: 'valid' | 'expired' | 'invalidated' | 'paid';
}
export interface AccountConsultationPayment {
  id: string;
  appointmentId: number;
  quoteId: string;
  amountCents: number;
  currency: 'MXN';
  scope: 'health_services';
  mode: PaymentMode;
  status: 'paid' | 'reversed';
  paidAt: string;
  reversedAt: string | null;
}
export interface AccountConsultation {
  id: number;
  doctor: { name: string };
  startsAt: string;
  modality: 'Presencial';
  status: 'confirmed';
  tariff: AccountConsultationTariff | null;
  quote: AccountConsultationQuote | null;
  payment: AccountConsultationPayment | null;
}
export interface AccountConsultationsResult {
  appointments: AccountConsultation[];
  hasMore: boolean;
}
export interface AccountConsultationPaymentResult {
  payment: AccountConsultationPayment;
  wallet: AccountWallet;
}

export const walletUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const MIN_ACCOUNT_RECHARGE_CENTS = 5000;
export const MAX_ACCOUNT_RECHARGE_CENTS = 1000000;
export function parseAccountRechargeAmount(input: string): number {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(input.trim());
  if (!match) throw new Error('Escribe el monto en pesos, con hasta dos decimales.');
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents < MIN_ACCOUNT_RECHARGE_CENTS || cents > MAX_ACCOUNT_RECHARGE_CENTS) throw new Error('Ingresa un importe entre $50 y $10,000 MXN.');
  return cents;
}

/** Opaque request identity, not an authentication credential. Retain it after ambiguous responses. */
export function newWalletRequestId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const value = Math.floor(Math.random() * 16);
    return (c === 'x' ? value : (value & 3) | 8).toString(16);
  });
}
