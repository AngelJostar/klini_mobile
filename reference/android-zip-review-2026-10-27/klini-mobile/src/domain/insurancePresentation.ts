import type { Policy } from './types';
import { todayISO, parseDate } from './dates';

export function insurancePlanName(policy: Policy): string {
  return policy.id === 'policy-demo' ? 'GMM Corporativo Plus' : policy.insurer;
}
export function maskedPolicyNumber(policy: Policy): string {
  const number = policy.number.replace(/[^a-zA-Z0-9]/g, '');
  return `••••${number.slice(-4)}`;
}
export function insuranceStatus(policy: Policy): string {
  const today = todayISO();
  return policy.startDate > today ? 'Por comenzar' : policy.endDate < today ? 'Vencida' : 'Vigente';
}
export function insuranceExpiryLabel(policy: Policy): string {
  return parseDate(policy.endDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}
