import type { AppState } from './types';
import { hasAiAccess } from './aiSubscription';
import { addDays, toISO } from './dates';
import { subscriptionPackages, type SubscriptionPackage } from './subscriptionPackages';

export type SubscriptionPlanId = SubscriptionPackage['id'];
export type SubscriptionUpgradeQuote = Readonly<{
  mode: 'demo'; currency: 'MXN'; upgradeId: string; accountId: string;
  fromPlanId: SubscriptionPlanId; toPlanId: SubscriptionPlanId;
  periodStart: string; periodEnd: string; periodSource: 'stored' | 'example';
  asOfDate: string; quotedAt: string; amountCents: number; remainingDays: number; totalDays: number;
  basisUpgradeId: string | null;
  basisLegacyActivation: string | null;
}>;
export type SubscriptionPlan = Readonly<{
  mode: 'demo'; planId: SubscriptionPlanId; periodStart: string; periodEnd: string;
  changedAt: string; consentVersion: 1; upgradeId: string; receipt: SubscriptionUpgradeQuote;
}>;
export type SubscriptionOverview = Readonly<{
  mode: 'demo'; accountId: string; currentPlan: SubscriptionPackage; nextPlan: SubscriptionPackage | null;
  periodStart: string; periodEnd: string; periodSource: 'stored' | 'example';
  remainingDays: number; totalDays: number; legacyAiAccess: boolean;
}>;

const quoteFields = ['mode', 'currency', 'upgradeId', 'accountId', 'fromPlanId', 'toPlanId', 'periodStart', 'periodEnd', 'periodSource', 'asOfDate', 'quotedAt', 'amountCents', 'remainingDays', 'totalDays', 'basisUpgradeId', 'basisLegacyActivation'] as const;
const planFields = ['mode', 'planId', 'periodStart', 'periodEnd', 'changedAt', 'consentVersion', 'upgradeId', 'receipt'];
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const id = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 255;
const upgradeId = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,180}$/.test(value);
const planIndex = (value: unknown) => subscriptionPackages.findIndex(plan => plan.id === value);
const timestamp = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
let quoteSequence = 0;

function calendarDay(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1900 || year > 2200) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date.getTime() / 86_400_000 : null;
}

function periodDays(start: unknown, end: unknown): number | null {
  const first = calendarDay(start), last = calendarDay(end);
  if (first === null || last === null || last <= first || last - first > 31) return null;
  return last - first;
}

function proratedCents(from: SubscriptionPlanId, to: SubscriptionPlanId, remaining: number, total: number): number {
  const difference = subscriptionPackages[planIndex(to)].monthlyPrice * 100 - subscriptionPackages[planIndex(from)].monthlyPrice * 100;
  // Round once, after prorating the difference, so the receipt always uses integer cents.
  return Math.round(difference * remaining / total);
}

export function isSubscriptionUpgradeQuote(value: unknown): value is SubscriptionUpgradeQuote {
  if (!object(value) || Object.keys(value).length !== quoteFields.length || !Object.keys(value).every(field => quoteFields.includes(field as typeof quoteFields[number])) ||
    value.mode !== 'demo' || value.currency !== 'MXN' || !upgradeId(value.upgradeId) || !id(value.accountId) ||
    planIndex(value.fromPlanId) < 0 || planIndex(value.toPlanId) !== planIndex(value.fromPlanId) + 1 ||
    !['stored', 'example'].includes(String(value.periodSource)) || !timestamp(value.quotedAt) ||
    (value.basisUpgradeId !== null && !upgradeId(value.basisUpgradeId)) ||
    (value.basisLegacyActivation !== null && !timestamp(value.basisLegacyActivation))) return false;
  const total = periodDays(value.periodStart, value.periodEnd), today = calendarDay(value.asOfDate);
  if (total === null || today === null || today < calendarDay(value.periodStart)! || today >= calendarDay(value.periodEnd)! ||
    value.totalDays !== total || value.remainingDays !== calendarDay(value.periodEnd)! - today ||
    Math.abs(today - Math.floor(Date.parse(value.quotedAt) / 86_400_000)) > 1 ||
    (value.periodSource === 'example' ? value.basisUpgradeId !== null || total !== 31 || value.remainingDays !== 15 : value.basisUpgradeId === null || value.basisLegacyActivation !== null)) return false;
  return Number.isSafeInteger(value.amountCents) && value.amountCents === proratedCents(value.fromPlanId as SubscriptionPlanId, value.toPlanId as SubscriptionPlanId, Number(value.remainingDays), total);
}

export function isSubscriptionPlan(value: unknown): value is SubscriptionPlan {
  if (!object(value) || Object.keys(value).length !== planFields.length || !Object.keys(value).every(field => planFields.includes(field)) || value.mode !== 'demo' ||
    planIndex(value.planId) < 0 || !timestamp(value.changedAt) || value.consentVersion !== 1 || !upgradeId(value.upgradeId) ||
    !isSubscriptionUpgradeQuote(value.receipt) || periodDays(value.periodStart, value.periodEnd) === null) return false;
  return value.planId === value.receipt.toPlanId && value.upgradeId === value.receipt.upgradeId &&
    value.periodStart === value.receipt.periodStart && value.periodEnd === value.receipt.periodEnd &&
    Date.parse(value.changedAt) >= Date.parse(value.receipt.quotedAt);
}

function account(state: AppState) {
  const ownerId = state.family?.ownerId ?? state.profile.id;
  const owner = state.profile.id === ownerId ? state : state.family?.profiles[ownerId];
  if (!owner) throw new Error('No se encontró el titular de la cuenta.');
  return { id: ownerId, aiSubscription: owner.aiSubscription };
}

export function getSubscriptionOverview(state: AppState, now = Date.now()): SubscriptionOverview {
  if (!Number.isFinite(now) || !Number.isFinite(new Date(now).getTime())) throw new Error('No se pudo determinar el periodo de la suscripción.');
  const owner = account(state);
  const saved = state.subscriptionPlan;
  if (saved !== undefined && (!isSubscriptionPlan(saved) || saved.receipt.accountId !== owner.id)) throw new Error('Revisa los datos guardados de la suscripción.');
  const currentId = saved?.planId ?? (hasAiAccess(owner.aiSubscription) ? 'pro' : 'free');
  const index = planIndex(currentId);
  const today = toISO(new Date(now));
  const start = saved?.periodStart ?? addDays(today, -16);
  const end = saved?.periodEnd ?? addDays(today, 15);
  const total = periodDays(start, end);
  if (calendarDay(today) === null || total === null) throw new Error('No se pudo determinar el periodo de la suscripción.');
  return Object.freeze({ mode: 'demo', accountId: owner.id, currentPlan: subscriptionPackages[index], nextPlan: subscriptionPackages[index + 1] ?? null,
    periodStart: start, periodEnd: end, periodSource: saved ? 'stored' : 'example',
    remainingDays: Math.max(0, Math.min(total, calendarDay(end)! - calendarDay(today)!)), totalDays: total, legacyAiAccess: hasAiAccess(owner.aiSubscription) });
}

export function createSubscriptionUpgradeQuote(state: AppState, targetPlanId: SubscriptionPlanId, now = Date.now()): SubscriptionUpgradeQuote {
  const overview = getSubscriptionOverview(state, now);
  if (!overview.nextPlan || overview.nextPlan.id !== targetPlanId) throw new Error('Selecciona únicamente el siguiente plan disponible.');
  if (!overview.remainingDays) throw new Error('El periodo de demostración terminó. Revisa un nuevo periodo antes de cambiar de plan.');
  if (calendarDay(toISO(new Date(now)))! < calendarDay(overview.periodStart)!) throw new Error('El periodo de demostración todavía no ha comenzado.');
  quoteSequence += 1;
  return Object.freeze({ mode: 'demo', currency: 'MXN', upgradeId: `upgrade_${now.toString(36)}_${quoteSequence.toString(36)}_${Math.random().toString(36).slice(2, 12)}`,
    accountId: overview.accountId, fromPlanId: overview.currentPlan.id, toPlanId: targetPlanId,
    periodStart: overview.periodStart, periodEnd: overview.periodEnd, periodSource: overview.periodSource,
    asOfDate: toISO(new Date(now)), quotedAt: new Date(now).toISOString(), amountCents: proratedCents(overview.currentPlan.id, targetPlanId, overview.remainingDays, overview.totalDays),
    remainingDays: overview.remainingDays, totalDays: overview.totalDays, basisUpgradeId: state.subscriptionPlan?.upgradeId ?? null,
    basisLegacyActivation: state.subscriptionPlan ? null : account(state).aiSubscription?.activatedAt ?? null });
}

const sameQuote = (left: SubscriptionUpgradeQuote, right: SubscriptionUpgradeQuote) => quoteFields.every(field => left[field] === right[field]);

/** The receipt changes the local commercial demo only. It never grants AI, storage or payment entitlements. */
export function applySubscriptionUpgrade(state: AppState, quote: SubscriptionUpgradeQuote, now = Date.now()): AppState {
  if (!isSubscriptionUpgradeQuote(quote) || quote.accountId !== account(state).id) throw new Error('Revisa la cotización y la cuenta antes de confirmar.');
  if (state.subscriptionPlan?.upgradeId === quote.upgradeId) {
    if (!isSubscriptionPlan(state.subscriptionPlan) || !sameQuote(state.subscriptionPlan.receipt, quote)) throw new Error('La confirmación ya existe con otros datos.');
    return state;
  }
  if (!Number.isFinite(now) || Date.parse(quote.quotedAt) > now || quote.asOfDate !== toISO(new Date(now))) throw new Error('La cotización cambió de fecha. Revisa el cambio de plan otra vez.');
  const fresh = createSubscriptionUpgradeQuote(state, quote.toPlanId, now);
  if (!sameQuote(quote, { ...fresh, upgradeId: quote.upgradeId, quotedAt: quote.quotedAt })) throw new Error('La cotización cambió. Revisa el cambio de plan otra vez.');
  const receipt = Object.freeze({ ...quote });
  const plan: SubscriptionPlan = Object.freeze({ mode: 'demo', planId: quote.toPlanId, periodStart: quote.periodStart, periodEnd: quote.periodEnd,
    changedAt: new Date(now).toISOString(), consentVersion: 1, upgradeId: quote.upgradeId, receipt });
  return { ...state, subscriptionPlan: plan };
}

export type SubscriptionPlanAction = { type: 'UPGRADE_SUBSCRIPTION_PLAN'; quote: SubscriptionUpgradeQuote; now: number };

/** Serialize confirmations while sharing the app store's physical FIFO and targeted rollback. */
export function createSubscriptionPlanWriter(options: {
  current: () => AppState; generation: () => number; publish: (state: AppState) => void; persist: (state: AppState) => Promise<void>;
  reduce: (state: AppState, action: SubscriptionPlanAction) => AppState; now?: () => number;
}) {
  let tail: Promise<void> = Promise.resolve();
  return function upgrade(quote: SubscriptionUpgradeQuote): Promise<void> {
    if (!isSubscriptionUpgradeQuote(quote)) return Promise.reject(new Error('Revisa la cotización antes de confirmar.'));
    const captured = Object.freeze({ ...quote });
    const generation = options.generation();
    const operation = tail.then(async () => {
      if (generation !== options.generation()) throw new Error('El cambio de plan se canceló al restablecer la demostración.');
      const previous = options.current().subscriptionPlan;
      const current = options.current();
      const next = options.reduce(current, { type: 'UPGRADE_SUBSCRIPTION_PLAN', quote: captured, now: (options.now ?? Date.now)() });
      if (next === current) return;
      const plan = next.subscriptionPlan;
      options.publish(next);
      try {
        await options.persist(next);
      } catch (error) {
        if (generation === options.generation() && options.current().subscriptionPlan === plan) {
          const rollback = { ...options.current(), subscriptionPlan: previous };
          options.publish(rollback);
          await options.persist(rollback).catch(() => undefined);
        }
        throw error;
      }
      if (generation !== options.generation()) throw new Error('El cambio de plan se canceló al restablecer la demostración.');
    });
    tail = operation.catch(() => undefined);
    return operation;
  };
}
