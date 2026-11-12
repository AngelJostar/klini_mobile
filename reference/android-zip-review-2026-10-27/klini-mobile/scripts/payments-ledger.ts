import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { isTestRechargeAmount, TEST_RECHARGE_STATUSES, type CreatedTestRecharge, type RetrievedTestRecharge, type TestRecharge, type TestRechargeStatus, type TestWalletMovement, type TestWalletSnapshot } from '../src/domain/walletPayments';

const ACCOUNT = 'klini-development-test-account';
// Stripe may prune idempotency keys after 24 hours. Never recreate an unresolved
// PaymentIntent close to that boundary; it needs operator reconciliation instead.
const CREATE_RETRY_WINDOW = 23 * 60 * 60 * 1000;
const MAX_ORDERS = 1000;
const MAX_PENDING = 20;
interface Order { id: string; key: string; amountCents: number; createdAt: string; status: TestRechargeStatus; intentId?: string }
export interface PaymentLedger { version: 1; account: typeof ACCOUNT; orders: Order[]; movements: TestWalletMovement[] }
export interface PaymentStorage { read(): Promise<unknown | null>; write(ledger: PaymentLedger): Promise<void> }
export class PaymentError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}
const invalidStore = () => new PaymentError(503, 'storage_invalid', 'El registro de pagos de prueba requiere revisión.');
function validDate(value: unknown): value is string { return typeof value === 'string' && Number.isFinite(Date.parse(value)); }
const orderIdValid = (value: unknown): value is string => typeof value === 'string' && /^rch_[a-f0-9-]{36}$/.test(value);
function isLedger(value: unknown): value is PaymentLedger {
  if (!value || typeof value !== 'object') return false;
  const v = value as PaymentLedger;
  if (v.version !== 1 || v.account !== ACCOUNT || !Array.isArray(v.orders) || !Array.isArray(v.movements) || v.orders.length > MAX_ORDERS || v.movements.length > MAX_ORDERS) return false;
  if (!v.orders.every(o => o && orderIdValid(o.id) && typeof o.key === 'string' && /^[A-Za-z0-9_-]{16,128}$/.test(o.key) && isTestRechargeAmount(o.amountCents) && validDate(o.createdAt) && TEST_RECHARGE_STATUSES.includes(o.status) && (o.intentId === undefined || /^pi_[A-Za-z0-9]{1,200}$/.test(o.intentId)) && (o.status === 'creating' || !!o.intentId))) return false;
  if (new Set(v.orders.map(o => o.id)).size !== v.orders.length || new Set(v.orders.map(o => o.key)).size !== v.orders.length) return false;
  if (v.orders.filter(o => o.status !== 'succeeded' && o.status !== 'canceled').length > MAX_PENDING) return false;
  const intents = v.orders.flatMap(o => o.intentId ? [o.intentId] : []);
  if (new Set(intents).size !== intents.length) return false;
  if (!v.movements.every(m => {
    const order = v.orders.find(o => o.id === m?.orderId);
    return m && order && order.status === 'succeeded' && !!order.intentId && m.id === order.intentId && m.amountCents === order.amountCents && m.concept === 'Recarga de prueba' && validDate(m.createdAt);
  })) return false;
  return new Set(v.movements.map(m => m.id)).size === v.movements.length && new Set(v.movements.map(m => m.orderId)).size === v.movements.length && v.orders.every(o => o.status !== 'succeeded' || v.movements.some(m => m.orderId === o.id));
}

/** One process owns this test ledger. Atomic replacement never overwrites malformed data. */
export function createFilePaymentStorage(filePath: string): PaymentStorage {
  const target = resolve(filePath);
  return {
    async read() {
      try {
        const raw = await readFile(target, 'utf8');
        if (Buffer.byteLength(raw) > 2 * 1024 * 1024) throw invalidStore();
        return JSON.parse(raw);
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return null;
        throw invalidStore();
      }
    },
    async write(ledger) {
      await mkdir(dirname(target), { recursive: true, mode: 0o700 });
      const temporary = `${target}.${randomUUID()}.tmp`;
      let handle;
      try {
        handle = await open(temporary, 'wx', 0o600);
        await handle.writeFile(JSON.stringify(ledger), 'utf8');
        await handle.sync();
        await handle.close(); handle = undefined;
        await rename(temporary, target);
      } finally {
        await handle?.close().catch(() => undefined);
        await unlink(temporary).catch(() => undefined);
      }
    },
  };
}

export interface PaymentServiceOptions {
  secretKey?: string;
  storage: PaymentStorage;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  providerTimeoutMs?: number;
}
export function validateStripeTestKey(key?: string): string | undefined {
  if (!key) return undefined;
  if (key.trim() !== key || !/^(?:sk|rk)_test_[A-Za-z0-9]{16,512}$/.test(key)) throw new Error('Configura únicamente una clave privada de Stripe TEST: rk_test_ o sk_test_.');
  return key;
}
export function createTestPaymentService({ secretKey, storage, fetchImpl = fetch, now = () => new Date(), providerTimeoutMs = 15000 }: PaymentServiceOptions) {
  const key = validateStripeTestKey(secretKey);
  let ledger: PaymentLedger | null = null;
  let queue = Promise.resolve();
  let queued = 0;
  const serial = <T,>(work: () => Promise<T>): Promise<T> => {
    if (queued >= 8) return Promise.reject(new PaymentError(429, 'busy', 'Espera un momento y vuelve a consultar.'));
    queued++;
    const result = queue.then(work);
    queue = result.then(() => undefined, () => undefined);
    return result.finally(() => { queued--; });
  };
  const load = async () => {
    if (ledger) return ledger;
    let raw: unknown;
    try { raw = await storage.read(); } catch { throw invalidStore(); }
    if (raw === null) {
      const initial: PaymentLedger = { version: 1, account: ACCOUNT, orders: [], movements: [] };
      try { await storage.write(initial); } catch { throw new PaymentError(503, 'storage_unavailable', 'No se pudo guardar el registro de pagos de prueba.'); }
      ledger = initial;
    } else {
      if (!isLedger(raw)) throw invalidStore();
      ledger = structuredClone(raw);
    }
    return ledger;
  };
  const save = async (next: PaymentLedger) => {
    if (!isLedger(next)) throw invalidStore();
    try { await storage.write(structuredClone(next)); } catch { throw new PaymentError(503, 'storage_unavailable', 'No se pudo guardar el registro de pagos de prueba. Consulta de nuevo antes de iniciar otro pago.'); }
    ledger = next;
  };
  const requireConfigured = () => { if (!key) throw new PaymentError(503, 'not_configured', 'Stripe de prueba aún no está configurado.'); };
  const snapshot = (current: PaymentLedger): TestWalletSnapshot => ({ mode: 'test', currency: 'MXN', purpose: 'health_services', balanceCents: current.movements.reduce((sum, m) => sum + m.amountCents, 0), movements: structuredClone(current.movements), pendingRecharges: current.orders.filter(o => o.status !== 'succeeded' && o.status !== 'canceled').map(o => ({ ...publicOrder(o), idempotencyKey: o.key })) });
  const publicOrder = (order: Order): TestRecharge => ({ id: order.id, mode: 'test', purpose: 'health_services', amountCents: order.amountCents, currency: 'MXN', status: order.status });
  const callStripe = async (path: string, init: RequestInit = {}): Promise<Record<string, unknown>> => {
    requireConfigured();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), providerTimeoutMs);
    try {
      const response = await fetchImpl(`https://api.stripe.com/v1/${path}`, { ...init, redirect: 'error', headers: { Authorization: `Bearer ${key}`, 'Stripe-Version': '2026-10-28.endive', ...init.headers }, signal: controller.signal });
      if (!response.ok) throw new PaymentError(502, 'provider_unavailable', 'No se pudo consultar Stripe de prueba. Reintenta la misma operación.');
      if (!response.body || Number(response.headers.get('Content-Length')) > 100000) throw new Error();
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          size += part.value.byteLength;
          if (size > 100000) { await reader.cancel(); throw new Error(); }
          chunks.push(part.value);
        }
      } finally { reader.releaseLock(); }
      const raw = Buffer.concat(chunks).toString('utf8');
      const value: unknown = JSON.parse(raw);
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
      return value as Record<string, unknown>;
    } catch (error) {
      if (error instanceof PaymentError) throw error;
      throw new PaymentError(502, controller.signal.aborted ? 'provider_timeout' : 'provider_unavailable', 'No se pudo confirmar el estado de Stripe de prueba. Reintenta la misma operación.');
    } finally { clearTimeout(timer); }
  };
  const verify = (intent: Record<string, unknown>, order: Order) => {
    const metadata = intent.metadata as Record<string, unknown> | undefined;
    if (intent.object !== 'payment_intent' || typeof intent.id !== 'string' || !/^pi_[A-Za-z0-9]{1,200}$/.test(intent.id) || (order.intentId && intent.id !== order.intentId) || intent.livemode !== false || intent.amount !== order.amountCents || intent.currency !== 'mxn' || metadata?.klini_order_id !== order.id || metadata?.klini_account !== ACCOUNT || metadata?.klini_purpose !== 'health_services' || typeof intent.status !== 'string' || !TEST_RECHARGE_STATUSES.includes(intent.status as TestRechargeStatus) || intent.status === 'creating' || (intent.status === 'succeeded' && intent.amount_received !== order.amountCents)) {
      throw new PaymentError(502, 'provider_mismatch', 'La verificación del pago de prueba no coincidió. No se aplicó ningún saldo.');
    }
  };
  const reconcile = async (intent: Record<string, unknown>, order: Order): Promise<Order> => {
    verify(intent, order);
    const current = await load();
    const intentId = intent.id as string;
    if (current.orders.some(o => o.id !== order.id && o.intentId === intentId)) throw new PaymentError(502, 'provider_mismatch', 'El pago de prueba ya está asociado a otra operación.');
    // A verified completed order is terminal locally; an inconsistent provider
    // response cannot remove a previously committed credit.
    if (order.status === 'succeeded' && intent.status !== 'succeeded') throw new PaymentError(502, 'provider_mismatch', 'El estado del pago de prueba requiere revisión.');
    const nextOrder: Order = { ...order, intentId, status: intent.status as TestRechargeStatus };
    const movements = [...current.movements];
    if (intent.status === 'succeeded' && !movements.some(m => m.orderId === order.id)) movements.unshift({ id: intentId, orderId: order.id, amountCents: order.amountCents, createdAt: now().toISOString(), concept: 'Recarga de prueba' });
    if (order.intentId !== nextOrder.intentId || order.status !== nextOrder.status || movements.length !== current.movements.length) await save({ ...current, orders: current.orders.map(o => o.id === order.id ? nextOrder : o), movements });
    return nextOrder;
  };
  const retrieve = async (order: Order) => {
    if (!order.intentId) return { order, clientSecret: null };
    const intent = await callStripe(`payment_intents/${encodeURIComponent(order.intentId)}`);
    const next = await reconcile(intent, order);
    return { order: next, clientSecret: typeof intent.client_secret === 'string' && intent.client_secret.startsWith(`${intent.id}_secret_`) && /^pi_[A-Za-z0-9]+_secret_[A-Za-z0-9]+$/.test(intent.client_secret) ? intent.client_secret : null };
  };
  return {
    configured: !!key,
    wallet: () => serial(async () => { requireConfigured(); return snapshot(await load()); }),
    create: (input: unknown): Promise<CreatedTestRecharge> => serial(async () => {
      requireConfigured();
      const body = input as Record<string, unknown> | null;
      if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => !['amountCents', 'idempotencyKey', 'purpose'].includes(k)) || body.purpose !== 'health_services' || !isTestRechargeAmount(body.amountCents) || typeof body.idempotencyKey !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(body.idempotencyKey)) throw new PaymentError(422, 'invalid_recharge', 'Indica un monto válido y usa esta recarga solo para servicios de salud.');
      const current = await load();
      let order = current.orders.find(o => o.key === body.idempotencyKey);
      if (order && order.amountCents !== body.amountCents) throw new PaymentError(409, 'idempotency_conflict', 'Esta operación ya está asociada a otro monto.');
      if (!order) {
        if (current.orders.length >= MAX_ORDERS) throw new PaymentError(409, 'test_limit', 'El registro de pruebas alcanzó su límite.');
        if (current.orders.filter(o => o.status !== 'succeeded' && o.status !== 'canceled').length >= MAX_PENDING) throw new PaymentError(409, 'pending_limit', 'Revisa tus recargas pendientes antes de iniciar otra.');
        order = { id: `rch_${randomUUID()}`, key: body.idempotencyKey, amountCents: body.amountCents, createdAt: now().toISOString(), status: 'creating' };
        await save({ ...current, orders: [...current.orders, order] });
      }
      if (order.intentId) {
        const result = await retrieve(order);
        if (!result.clientSecret && result.order.status !== 'succeeded' && result.order.status !== 'canceled') throw new PaymentError(502, 'provider_invalid', 'Stripe de prueba no devolvió un pago utilizable.');
        return { ...publicOrder(result.order), clientSecret: result.clientSecret };
      }
      if (now().getTime() - Date.parse(order.createdAt) >= CREATE_RETRY_WINDOW || now().getTime() < Date.parse(order.createdAt)) throw new PaymentError(409, 'reconciliation_required', 'Esta operación pendiente requiere revisión antes de volver a cobrar.');
      const form = new URLSearchParams({ amount: String(order.amountCents), currency: 'mxn', 'allowed_payment_method_types[]': 'card', 'metadata[klini_order_id]': order.id, 'metadata[klini_account]': ACCOUNT, 'metadata[klini_purpose]': 'health_services' });
      const created = await callStripe('payment_intents', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': `klini_test_${order.id}` }, body: form.toString() });
      verify(created, order);
      // Persist the association before a second network call. A replayed create
      // may already be succeeded, but credits require an authoritative GET.
      const associated = { ...order, intentId: created.id as string, status: (created.status === 'succeeded' ? 'processing' : created.status) as TestRechargeStatus };
      if (current.orders.some(o => o.id !== order.id && o.intentId === associated.intentId)) throw new PaymentError(502, 'provider_mismatch', 'El pago de prueba ya está asociado a otra operación.');
      await save({ ...(await load()), orders: (await load()).orders.map(o => o.id === order.id ? associated : o) });
      const result = created.status === 'succeeded' ? await retrieve(associated) : { order: associated, clientSecret: null };
      const next = result.order;
      // Creation is not evidence of client authorization. Reconciliation only
      // credits an intent whose provider status and received amount are verified.
      const clientSecret = typeof created.client_secret === 'string' && created.client_secret.startsWith(`${created.id}_secret_`) && /^pi_[A-Za-z0-9]+_secret_[A-Za-z0-9]+$/.test(created.client_secret) ? created.client_secret : null;
      if (!clientSecret && next.status !== 'succeeded' && next.status !== 'canceled') throw new PaymentError(502, 'provider_invalid', 'Stripe de prueba no devolvió un pago utilizable.');
      return { ...publicOrder(next), clientSecret };
    }),
    retrieve: (id: string): Promise<RetrievedTestRecharge> => serial(async () => {
      requireConfigured();
      const current = await load();
      const order = current.orders.find(o => o.id === id);
      if (!order) throw new PaymentError(404, 'not_found', 'No se encontró esta recarga de prueba.');
      const result = await retrieve(order);
      return { ...publicOrder(result.order), ...(result.order.status === 'succeeded' ? { wallet: snapshot(await load()) } : {}) };
    }),
  };
}
