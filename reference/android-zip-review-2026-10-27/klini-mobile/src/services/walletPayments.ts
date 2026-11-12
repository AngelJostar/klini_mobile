import { isTestRechargeAmount, TEST_RECHARGE_STATUSES, type CreatedTestRecharge, type RetrievedTestRecharge, type TestRecharge, type TestWalletSnapshot } from '../domain/walletPayments';
import { validatePaymentTestApiUrl } from './paymentsConfig';

export class PaymentTestClientError extends Error {
  constructor(readonly code: string, message: string) { super(message); this.name = 'PaymentTestClientError'; }
}
const orderIdPattern = /^rch_[a-f0-9-]{36}$/;
const requestKeyPattern = /^[A-Za-z0-9_-]{16,128}$/;
const rechargeFields = ['id', 'mode', 'purpose', 'amountCents', 'currency', 'status'];
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const onlyFields = (value: Record<string, unknown>, fields: readonly string[]) => Object.keys(value).every(key => fields.includes(key));
const protocolError = () => new PaymentTestClientError('invalid_response', 'El servidor devolvió datos de pago que no se pudieron verificar.');
function isRecharge(value: unknown): value is TestRecharge {
  return record(value) && typeof value.id === 'string' && orderIdPattern.test(value.id) && value.mode === 'test' && value.currency === 'MXN' && value.purpose === 'health_services' && isTestRechargeAmount(value.amountCents) && TEST_RECHARGE_STATUSES.includes(value.status as TestRecharge['status']) && (!('livemode' in value) || value.livemode === false);
}
function isWallet(value: unknown): value is TestWalletSnapshot {
  if (!record(value) || !onlyFields(value, ['mode', 'currency', 'purpose', 'balanceCents', 'movements', 'pendingRecharges']) || value.mode !== 'test' || value.currency !== 'MXN' || value.purpose !== 'health_services' || !Number.isSafeInteger(value.balanceCents) || (value.balanceCents as number) < 0 || !Array.isArray(value.movements) || value.movements.length > 1000 || !Array.isArray(value.pendingRecharges) || value.pendingRecharges.length > 20) return false;
  const ids = new Set<string>(), orders = new Set<string>(), pendingIds = new Set<string>(), keys = new Set<string>();
  let total = 0;
  for (const movement of value.movements) {
    if (!record(movement) || !onlyFields(movement, ['id', 'orderId', 'amountCents', 'createdAt', 'concept']) || typeof movement.id !== 'string' || !/^pi_[A-Za-z0-9]{1,200}$/.test(movement.id) || typeof movement.orderId !== 'string' || !orderIdPattern.test(movement.orderId) || !isTestRechargeAmount(movement.amountCents) || movement.concept !== 'Recarga de prueba' || typeof movement.createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(movement.createdAt)) return false;
    const date = new Date(movement.createdAt);
    if (Number.isNaN(date.getTime()) || date.toISOString() !== movement.createdAt || ids.has(movement.id) || orders.has(movement.orderId)) return false;
    ids.add(movement.id); orders.add(movement.orderId); total += movement.amountCents;
    if (!Number.isSafeInteger(total)) return false;
  }
  for (const pending of value.pendingRecharges) {
    if (!isRecharge(pending) || !record(pending) || !onlyFields(pending, [...rechargeFields, 'idempotencyKey']) || typeof pending.idempotencyKey !== 'string' || !requestKeyPattern.test(pending.idempotencyKey) || pending.status === 'succeeded' || pending.status === 'canceled' || pendingIds.has(pending.id) || orders.has(pending.id) || keys.has(pending.idempotencyKey)) return false;
    pendingIds.add(pending.id); keys.add(pending.idempotencyKey);
  }
  return total === value.balanceCents;
}

export function parsePaymentTestAmount(draft: string): number {
  const value = draft.trim();
  if (!/^\d+(?:[.,]\d+)?$/.test(value)) throw new Error('Escribe el monto en pesos, sin símbolos.');
  if (/[.,]\d{3,}$/.test(value)) throw new Error('Usa como máximo dos decimales.');
  const amountCents = Math.round(Number(value.replace(',', '.')) * 100);
  if (!isTestRechargeAmount(amountCents)) throw new Error('Ingresa un importe entre $10 y $100,000.');
  return amountCents;
}

export type PaymentTestClient = {
  getWallet: (signal?: AbortSignal) => Promise<TestWalletSnapshot>;
  createRecharge: (amountCents: number, idempotencyKey: string, signal?: AbortSignal) => Promise<CreatedTestRecharge>;
  getRecharge: (id: string, expectedAmountCents: number, signal?: AbortSignal) => Promise<RetrievedTestRecharge>;
};

/** A runtime token authorizes one local test account. Never persists a token or credits the app store. */
export function createPaymentTestClient({ baseUrl, accessToken, fetchImpl = fetch, timeoutMs = 15000 }: { baseUrl: string; accessToken: string; fetchImpl?: typeof fetch; timeoutMs?: number }): PaymentTestClient {
  const origin = validatePaymentTestApiUrl(baseUrl);
  const token = accessToken.trim();
  if (!/^[A-Za-z0-9_-]{32,256}$/.test(token) || /^(?:sk_|pk_|rk_|whsec_)/.test(token)) throw new Error('Introduce el token de conexión local, no una clave de Stripe.');
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) throw new Error('El plazo de conexión de prueba no es válido.');
  async function request(path: string, body?: unknown, signal?: AbortSignal): Promise<unknown> {
    if (signal?.aborted) throw new PaymentTestClientError('canceled', 'Consulta cancelada.');
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    let expired = false;
    const timer = setTimeout(() => { expired = true; controller.abort(); }, timeoutMs);
    try {
      const response = await fetchImpl(origin + path, { method: body === undefined ? 'GET' : 'POST', headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), credentials: 'omit', redirect: 'error', cache: 'no-store', signal: controller.signal });
      if (response.redirected || (response.url && new URL(response.url).origin !== origin)) throw protocolError();
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw new PaymentTestClientError('unauthorized', 'No se autorizó la conexión al servidor de pruebas. Revisa el token.');
        if (response.status === 409) throw new PaymentTestClientError('reconciliation_required', 'Hay una recarga pendiente. Revisa su estado antes de crear otra.');
        if (response.status === 503) throw new PaymentTestClientError('not_configured', 'El servidor de pagos de prueba todavía no está disponible o configurado.');
        throw new PaymentTestClientError('request_failed', 'No se pudo verificar la recarga. Revisa su estado antes de intentar otra.');
      }
      if (Number(response.headers.get('content-length') || 0) > 512000) throw protocolError();
      const text = await response.text();
      if (text.length > 512000) throw protocolError();
      try { return JSON.parse(text); } catch { throw protocolError(); }
    } catch (error) {
      if (error instanceof PaymentTestClientError) throw error;
      if (expired) throw new PaymentTestClientError('timeout', 'El servidor tardó demasiado. Consulta el estado de la misma recarga antes de repetir el pago.');
      if (signal?.aborted) throw new PaymentTestClientError('canceled', 'Consulta cancelada.');
      throw new PaymentTestClientError('network', 'No se pudo conectar con el servidor de pagos de prueba.');
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
  }
  return {
    async getWallet(signal) {
      const value = await request('/wallet', undefined, signal);
      if (!isWallet(value)) throw protocolError();
      return value;
    },
    async createRecharge(amountCents, idempotencyKey, signal) {
      if (!isTestRechargeAmount(amountCents) || !requestKeyPattern.test(idempotencyKey)) throw new Error('La solicitud de recarga no es válida.');
      const value = await request('/recharges', { amountCents, idempotencyKey, purpose: 'health_services' }, signal);
      if (!isRecharge(value) || !record(value) || !onlyFields(value, [...rechargeFields, 'clientSecret']) || value.amountCents !== amountCents || !(value.clientSecret === null || (typeof value.clientSecret === 'string' && /^pi_[A-Za-z0-9]+_secret_[A-Za-z0-9]+$/.test(value.clientSecret)))) throw protocolError();
      return value as unknown as CreatedTestRecharge;
    },
    async getRecharge(id, expectedAmountCents, signal) {
      if (!orderIdPattern.test(id) || !isTestRechargeAmount(expectedAmountCents)) throw new Error('La referencia de recarga no es válida.');
      const value = await request('/recharges/' + id, undefined, signal);
      if (!isRecharge(value) || !record(value) || !onlyFields(value, [...rechargeFields, 'wallet']) || value.id !== id || value.amountCents !== expectedAmountCents) throw protocolError();
      if (value.status === 'succeeded') {
        if (!isWallet(value.wallet) || value.wallet.movements.filter(movement => movement.orderId === id && movement.amountCents === expectedAmountCents).length !== 1) throw protocolError();
      } else if ('wallet' in value) throw protocolError();
      return value as unknown as RetrievedTestRecharge;
    },
  };
}
