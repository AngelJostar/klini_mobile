/** Contract for the separate, single-account Stripe TEST wallet. Never a clinical profile. */
export type TestRechargeStatus = 'creating' | 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'requires_capture' | 'succeeded' | 'canceled';
export interface TestWalletMovement {
  id: string;
  orderId: string;
  amountCents: number;
  createdAt: string;
  concept: 'Recarga de prueba';
}
export interface TestWalletSnapshot {
  mode: 'test';
  currency: 'MXN';
  purpose: 'health_services';
  balanceCents: number;
  movements: TestWalletMovement[];
  pendingRecharges: (TestRecharge & { idempotencyKey: string })[];
}
export interface TestRecharge {
  id: string;
  mode: 'test';
  purpose: 'health_services';
  amountCents: number;
  currency: 'MXN';
  status: TestRechargeStatus;
}
export interface CreatedTestRecharge extends TestRecharge { clientSecret: string | null }
export interface RetrievedTestRecharge extends TestRecharge { wallet?: TestWalletSnapshot }
export const TEST_RECHARGE_STATUSES: readonly TestRechargeStatus[] = ['creating', 'requires_payment_method', 'requires_confirmation', 'requires_action', 'processing', 'requires_capture', 'succeeded', 'canceled'];
export function isTestRechargeAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1000 && value <= 10000000;
}
