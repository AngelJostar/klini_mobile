import { ACCOUNT_RECHARGE_STATUSES, MIN_ACCOUNT_RECHARGE_CENTS, MAX_ACCOUNT_RECHARGE_CENTS, walletUuid, type AccountConsultation, type AccountConsultationPayment, type AccountConsultationPaymentResult, type AccountConsultationQuote, type AccountConsultationsResult, type AccountRecharge, type AccountRechargeResult, type AccountWallet, type PaymentMode } from '../domain/accountWallet';

export class AccountWalletError extends Error {
  constructor(readonly code: string, message: string, readonly status?: number) { super(message); this.name = 'AccountWalletError'; }
}
export type AccountWalletConnection = { baseUrl: string; mode: PaymentMode };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const invalid = () => new AccountWalletError('invalid_response', 'No se pudo verificar la respuesta de tu billetera.');
const timestamp = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)$/.test(v) && Number.isFinite(Date.parse(v));
function integer(v: unknown, min: number, max = Number.MAX_SAFE_INTEGER): number {
  if (!Number.isSafeInteger(v) || Number(v) < min || Number(v) > max) throw invalid();
  return Number(v);
}
function uuid(v: unknown): string { if (typeof v !== 'string' || !walletUuid.test(v)) throw invalid(); return v; }
function localHost(host: string): boolean {
  if (['localhost', '[::1]'].includes(host)) return true;
  const p = host.split('.').map(Number);
  return p.length === 4 && p.every(n => Number.isInteger(n) && n >= 0 && n <= 255) && (p[0] === 127 || p[0] === 10 || (p[0] === 192 && p[1] === 168) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31));
}
export function validateAccountWalletConnection(baseUrl: string, mode: unknown): AccountWalletConnection {
  if (mode !== 'test' && mode !== 'live') throw new AccountWalletError('configuration', 'Configura el entorno de pagos de Klini.');
  let url: URL;
  try { url = new URL(baseUrl.trim()); } catch { throw new AccountWalletError('configuration', 'La conexión de pagos todavía no está configurada.'); }
  if ((url.protocol !== 'https:' && !(mode === 'test' && url.protocol === 'http:' && localHost(url.hostname))) || url.username || url.password || url.search || url.hash || !/^\/api\/mobile\/v1\/?$/.test(url.pathname)) {
    throw new AccountWalletError('configuration', 'Los pagos reales requieren una API HTTPS válida de Klini.');
  }
  return { baseUrl: url.origin + '/api/mobile/v1', mode };
}
/** Presence selects the connected flow, even if invalid: configuration errors never fall back to fake credit. */
export function accountWalletSelected(): boolean { return !!(process.env.EXPO_PUBLIC_PAYMENTS_API_URL?.trim() || process.env.EXPO_PUBLIC_PAYMENTS_MODE?.trim()); }
export function getAccountWalletConnection(): AccountWalletConnection {
  return validateAccountWalletConnection(process.env.EXPO_PUBLIC_PAYMENTS_API_URL ?? '', process.env.EXPO_PUBLIC_PAYMENTS_MODE?.trim());
}
function recharge(v: unknown, mode: PaymentMode): AccountRecharge {
  if (!record(v) || v.mode !== mode || v.currency !== 'MXN' || v.scope !== 'health_services' || !ACCOUNT_RECHARGE_STATUSES.includes(v.status as AccountRecharge['status']) || !timestamp(v.created_at)) throw invalid();
  return { id: uuid(v.id), amountCents: integer(v.amount_cents, MIN_ACCOUNT_RECHARGE_CENTS, MAX_ACCOUNT_RECHARGE_CENTS), mode, currency: 'MXN', scope: 'health_services', status: v.status as AccountRecharge['status'], createdAt: v.created_at };
}
export function readAccountWallet(value: unknown, mode: PaymentMode): AccountWallet {
  if (!record(value) || value.mode !== mode || value.currency !== 'MXN' || value.scope !== 'health_services' || typeof value.blocked !== 'boolean' || typeof value.has_more_movements !== 'boolean' || !Array.isArray(value.movements) || value.movements.length > 100 || !Array.isArray(value.pending_recharges) || value.pending_recharges.length > 20 || !record(value.payment_config) || value.payment_config.country !== 'MX' || typeof value.payment_config.enabled !== 'boolean' || typeof value.payment_config.service_payments_enabled !== 'boolean') throw invalid();
  const movements = value.movements.map((v): AccountWallet['movements'][number] => {
    if (!record(v) || v.mode !== mode || v.currency !== 'MXN' || v.scope !== 'health_services' || !['recharge', 'refund', 'service_payment', 'service_reversal'].includes(String(v.type)) || !timestamp(v.created_at)) throw invalid();
    const amountCents = integer(v.amount_cents, -MAX_ACCOUNT_RECHARGE_CENTS, MAX_ACCOUNT_RECHARGE_CENTS);
    const service = v.type === 'service_payment' || v.type === 'service_reversal';
    if ((v.type === 'recharge' && amountCents < MIN_ACCOUNT_RECHARGE_CENTS) || (v.type === 'refund' && amountCents >= 0) || (v.type === 'service_payment' && amountCents > -MIN_ACCOUNT_RECHARGE_CENTS) || (v.type === 'service_reversal' && amountCents < MIN_ACCOUNT_RECHARGE_CENTS)) throw invalid();
    if (service ? v.order_id !== null : v.service_payment_id !== null || v.appointment_id !== null) throw invalid();
    return { id: uuid(v.id), orderId: service ? null : uuid(v.order_id), servicePaymentId: service ? uuid(v.service_payment_id) : null, appointmentId: service ? integer(v.appointment_id, 1) : null, type: v.type as AccountWallet['movements'][number]['type'], amountCents, createdAt: v.created_at };
  });
  const pending = value.pending_recharges.map(v => recharge(v, mode));
  const creditedOrders = movements.filter(m => m.type === 'recharge').map(m => m.orderId);
  if (new Set(movements.map(m => m.id)).size !== movements.length || new Set(creditedOrders).size !== creditedOrders.length || new Set(pending.map(p => p.id)).size !== pending.length || pending.some(p => p.status === 'succeeded' || p.status === 'canceled' || creditedOrders.includes(p.id))) throw invalid();
  const balanceCents = integer(value.balance_cents, -Number.MAX_SAFE_INTEGER);
  const availableBalanceCents = integer(value.available_balance_cents, 0);
  if (availableBalanceCents !== (value.blocked ? 0 : Math.max(0, balanceCents)) || (balanceCents < 0 && !value.blocked) || (value.blocked && (value.payment_config.enabled || value.payment_config.service_payments_enabled))) throw invalid();
  const debits = movements.filter(m => m.type === 'service_payment'), reversals = movements.filter(m => m.type === 'service_reversal');
  if (new Set(debits.map(m => m.servicePaymentId)).size !== debits.length || new Set(reversals.map(m => m.servicePaymentId)).size !== reversals.length || new Set(debits.map(m => m.appointmentId)).size !== debits.length) throw invalid();
  for (const movement of reversals) {
    const debit = debits.find(m => m.servicePaymentId === movement.servicePaymentId);
    if ((!debit && !value.has_more_movements) || (debit && (movement.appointmentId !== debit.appointmentId || movement.amountCents !== -debit.amountCents))) throw invalid();
  }
  if (!value.has_more_movements) {
    const sum = movements.reduce((total, movement) => total + movement.amountCents, 0);
    if (!Number.isSafeInteger(sum) || sum !== balanceCents) throw invalid();
    for (const movement of movements.filter(m => m.type === 'refund')) {
      const credit = movements.find(m => m.type === 'recharge' && m.orderId === movement.orderId);
      const refunded = movements.filter(m => m.type === 'refund' && m.orderId === movement.orderId).reduce((total, m) => total - m.amountCents, 0);
      if (!credit || refunded > credit.amountCents) throw invalid();
    }
  }
  let paymentConfiguration: AccountWallet['paymentConfiguration'] = null;
  const config = value.payment_config;
  if (config.enabled) {
    if (typeof config.publishable_key !== 'string' || !new RegExp('^pk_' + mode + '_[A-Za-z0-9]{12,}$').test(config.publishable_key) || typeof config.merchant_identifier !== 'string' || !/^merchant\.[A-Za-z0-9][A-Za-z0-9.-]{2,199}$/.test(config.merchant_identifier)) throw invalid();
    paymentConfiguration = { mode, publishableKey: config.publishable_key, merchantIdentifier: config.merchant_identifier, country: 'MX' };
  }
  return { mode, currency: 'MXN', scope: 'health_services', balanceCents, availableBalanceCents, blocked: value.blocked, servicePaymentsEnabled: config.service_payments_enabled as boolean, movements, hasMoreMovements: value.has_more_movements, pendingRecharges: pending, paymentConfiguration };
}
function result(v: unknown, mode: PaymentMode, expected?: { id?: string; amountCents: number }): AccountRechargeResult {
  if (!record(v) || !(v.client_secret === null || (typeof v.client_secret === 'string' && /^pi_[A-Za-z0-9]+_secret_[A-Za-z0-9]+$/.test(v.client_secret)))) throw invalid();
  if (!(v.payment_intent_id === null || (typeof v.payment_intent_id === 'string' && /^pi_[A-Za-z0-9]{1,200}$/.test(v.payment_intent_id))) || (typeof v.client_secret === 'string' && (typeof v.payment_intent_id !== 'string' || !v.client_secret.startsWith(v.payment_intent_id + '_secret_')))) throw invalid();
  const entry = recharge(v.recharge, mode);
  if (expected && (entry.amountCents !== expected.amountCents || (expected.id && entry.id !== expected.id))) throw invalid();
  const wallet = v.wallet === null ? null : readAccountWallet(v.wallet, mode);
  if (entry.status === 'succeeded' && (!wallet || !wallet.movements.some(m => m.orderId === entry.id && m.type === 'recharge' && m.amountCents === entry.amountCents))) throw invalid();
  return { recharge: entry, paymentIntentId: v.payment_intent_id, clientSecret: v.client_secret, wallet };
}
export function readAccountConsultationQuote(value: unknown, mode: PaymentMode, appointmentId?: number): AccountConsultationQuote {
  if (!record(value) || value.mode !== mode || value.currency !== 'MXN' || value.scope !== 'health_services' || !['valid', 'expired', 'invalidated', 'paid'].includes(String(value.status)) || !timestamp(value.expires_at)) throw invalid();
  const quote = { id: uuid(value.id), appointmentId: integer(value.appointment_id, 1), tariffId: integer(value.tariff_id, 1), tariffVersion: integer(value.tariff_version, 1), amountCents: integer(value.amount_cents, MIN_ACCOUNT_RECHARGE_CENTS, MAX_ACCOUNT_RECHARGE_CENTS), currency: 'MXN' as const, scope: 'health_services' as const, mode, expiresAt: value.expires_at, status: value.status as AccountConsultationQuote['status'] };
  if (appointmentId !== undefined && quote.appointmentId !== appointmentId) throw invalid();
  return quote;
}
function consultationPayment(value: unknown, mode: PaymentMode, quote: AccountConsultationQuote): AccountConsultationPayment {
  if (!record(value) || value.mode !== mode || value.currency !== 'MXN' || value.scope !== 'health_services' || !['paid', 'reversed'].includes(String(value.status)) || !timestamp(value.paid_at) || (value.status === 'paid' ? value.reversed_at !== null : !timestamp(value.reversed_at))) throw invalid();
  const payment: AccountConsultationPayment = { id: uuid(value.id), appointmentId: integer(value.appointment_id, 1), quoteId: uuid(value.quote_id), amountCents: integer(value.amount_cents, MIN_ACCOUNT_RECHARGE_CENTS, MAX_ACCOUNT_RECHARGE_CENTS), currency: 'MXN', scope: 'health_services', mode, status: value.status as AccountConsultationPayment['status'], paidAt: value.paid_at, reversedAt: value.reversed_at as string | null };
  if (payment.appointmentId !== quote.appointmentId || payment.quoteId !== quote.id || payment.amountCents !== quote.amountCents || (payment.reversedAt !== null && Date.parse(payment.reversedAt) < Date.parse(payment.paidAt))) throw invalid();
  return payment;
}
export function readAccountConsultations(value: unknown, mode: PaymentMode): AccountConsultationsResult {
  if (!record(value) || !Array.isArray(value.appointments) || value.appointments.length > 50 || typeof value.has_more !== 'boolean') throw invalid();
  const appointments = value.appointments.map((entry): AccountConsultation => {
    if (!record(entry) || !record(entry.doctor) || typeof entry.doctor.name !== 'string' || !entry.doctor.name.trim() || entry.doctor.name.length > 200 || !timestamp(entry.starts_at) || entry.modality !== 'Presencial' || entry.status !== 'confirmed') throw invalid();
    const id = integer(entry.id, 1);
    let tariff: AccountConsultation['tariff'] = null;
    if (entry.tariff !== null) {
      const candidate = entry.tariff;
      if (!record(candidate) || candidate.currency !== 'MXN' || candidate.modality !== 'in_person') throw invalid();
      tariff = { id: integer(candidate.id, 1), version: integer(candidate.version, 1), amountCents: integer(candidate.amount_cents, MIN_ACCOUNT_RECHARGE_CENTS, MAX_ACCOUNT_RECHARGE_CENTS), currency: 'MXN', modality: 'in_person' };
    }
    const quote = entry.quote === null ? null : readAccountConsultationQuote(entry.quote, mode, id);
    if (quote && tariff?.id === quote.tariffId && (tariff.version !== quote.tariffVersion || tariff.amountCents !== quote.amountCents)) throw invalid();
    const payment = entry.payment === null ? null : quote ? consultationPayment(entry.payment, mode, quote) : (() => { throw invalid(); })();
    if ((quote?.status === 'paid' && payment?.status !== 'paid') || (payment?.status === 'paid' && quote?.status !== 'paid') || (payment?.status === 'reversed' && quote?.status !== 'invalidated')) throw invalid();
    return { id, doctor: { name: entry.doctor.name }, startsAt: entry.starts_at, modality: 'Presencial', status: 'confirmed', tariff, quote, payment };
  });
  const quotes = appointments.flatMap(entry => entry.quote ? [entry.quote.id] : []), payments = appointments.flatMap(entry => entry.payment ? [entry.payment.id] : []);
  if (new Set(appointments.map(entry => entry.id)).size !== appointments.length || new Set(quotes).size !== quotes.length || new Set(payments).size !== payments.length) throw invalid();
  return { appointments, hasMore: value.has_more };
}
function quotePayload(quote: AccountConsultationQuote): unknown {
  return { id: quote.id, appointment_id: quote.appointmentId, tariff_id: quote.tariffId, tariff_version: quote.tariffVersion, amount_cents: quote.amountCents, currency: quote.currency, scope: quote.scope, mode: quote.mode, expires_at: quote.expiresAt, status: quote.status };
}
function consultationResult(value: unknown, mode: PaymentMode, quote: AccountConsultationQuote): AccountConsultationPaymentResult {
  if (!record(value)) throw invalid();
  const payment = consultationPayment(value.payment, mode, quote), wallet = readAccountWallet(value.wallet, mode);
  const debit = wallet.movements.find(m => m.type === 'service_payment' && m.servicePaymentId === payment.id);
  const reversal = wallet.movements.find(m => m.type === 'service_reversal' && m.servicePaymentId === payment.id);
  // A successful response must show the corresponding server debit; it never creates a local credit/debit.
  if (!debit || debit.appointmentId !== payment.appointmentId || debit.amountCents !== -payment.amountCents || (payment.status === 'paid' ? !!reversal : !reversal || reversal.appointmentId !== payment.appointmentId || reversal.amountCents !== payment.amountCents)) throw invalid();
  return { payment, wallet };
}
function bearer(token: string): string {
  if (!token || token.length > 4096 || /\s/.test(token) || /^(?:sk_|rk_|pk_|whsec_)/.test(token)) throw new AccountWalletError('unauthenticated', 'Inicia sesión para abrir tu billetera.', 401);
  return 'Bearer ' + token;
}
export function createAccountWalletClient({ baseUrl, mode, fetchImpl = fetch, timeoutMs = 20000 }: AccountWalletConnection & { fetchImpl?: typeof fetch; timeoutMs?: number }) {
  const config = validateAccountWalletConnection(baseUrl, mode);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) throw new AccountWalletError('configuration', 'El plazo de conexión no es válido.');
  async function request(path: string, { token, body, signal, context = 'wallet' }: { token?: string; body?: unknown; signal?: AbortSignal; context?: 'wallet' | 'recharge' | 'consultation' } = {}): Promise<unknown> {
    if (signal?.aborted) throw new AccountWalletError('aborted', 'La consulta se canceló.');
    const controller = new AbortController(); let expired = false;
    const abort = () => controller.abort(); signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => { expired = true; controller.abort(); }, timeoutMs);
    try {
      const response = await fetchImpl(config.baseUrl + path, { method: body === undefined ? 'GET' : 'POST', headers: { Accept: 'application/json', ...(token ? { Authorization: bearer(token) } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), credentials: 'omit', redirect: 'error', cache: 'no-store', signal: controller.signal });
      if (response.redirected || (response.url && new URL(response.url).origin !== new URL(config.baseUrl).origin)) throw invalid();
      if (!response.ok) {
        const conflict = context === 'consultation' ? 'Revisa el saldo y actualiza el estado de la consulta antes de continuar.' : context === 'recharge' ? 'Ya hay una recarga pendiente. Consulta su estado antes de continuar.' : 'Actualiza tu billetera antes de continuar.';
        const unavailable = context === 'consultation' ? 'El pago de consultas todavía no está disponible. Tu saldo se conserva.' : context === 'recharge' ? 'Las recargas todavía no están disponibles. Tu saldo se conserva.' : 'Tu billetera no está disponible en este momento. Tu saldo se conserva.';
        const message = response.status === 401 ? 'Tu sesión expiró. Inicia sesión nuevamente.' : response.status === 403 ? 'Esta cuenta no puede usar la billetera.' : response.status === 409 ? conflict : response.status === 422 ? (context === 'consultation' ? 'Revisa los datos de la consulta.' : 'Revisa el monto o los datos de acceso.') : response.status === 429 ? 'Espera un momento antes de volver a intentar.' : response.status === 503 ? unavailable : 'No se pudo confirmar la operación. Consulta su estado antes de repetir el pago.';
        throw new AccountWalletError('http_' + response.status, message, response.status);
      }
      if (Number(response.headers.get('content-length') || 0) > 512000) throw invalid();
      const raw = await response.text(); if (raw.length > 512000) throw invalid();
      let data: unknown; try { data = JSON.parse(raw); } catch { throw invalid(); }
      if (!record(data) || data.success !== true || !('data' in data)) throw invalid();
      return data.data;
    } catch (error) {
      if (error instanceof AccountWalletError) throw error;
      if (expired) throw new AccountWalletError('timeout', context === 'recharge' ? 'La conexión tardó demasiado. Consulta la misma recarga antes de repetir el pago.' : context === 'consultation' ? 'La conexión tardó demasiado. Actualiza la consulta y conserva la misma solicitud antes de volver a intentar.' : 'La conexión tardó demasiado. Actualiza tu billetera antes de continuar.');
      if (signal?.aborted) throw new AccountWalletError('aborted', 'La consulta se canceló.');
      throw new AccountWalletError('network', 'No se pudo conectar. Revisa tu conexión e intenta nuevamente.');
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
  }
  const path = '/patient/wallet';
  return {
    async login(login: string, password: string, signal?: AbortSignal): Promise<{ token: string; name: string }> {
      if (!login.trim() || login.length > 255 || !password || password.length > 1000) throw new AccountWalletError('validation', 'Escribe tu correo o usuario y contraseña.');
      const data = await request('/auth/login', { body: { login: login.trim(), password, device_name: 'Klini billetera móvil' }, signal });
      if (!record(data) || typeof data.access_token !== 'string' || !record(data.user)) throw invalid();
      const token = data.access_token; bearer(token);
      if (data.user.role !== 'patient' || typeof data.user.name !== 'string') {
        try { await request('/auth/logout', { token, body: {} }); } catch { /* Revocation failure never authorizes use. */ }
        throw new AccountWalletError('role', 'Inicia sesión con una cuenta de paciente.');
      }
      return { token, name: data.user.name.slice(0, 200) };
    },
    async logout(token: string) { await request('/auth/logout', { token, body: {} }); },
    async wallet(token: string, signal?: AbortSignal) { bearer(token); return readAccountWallet(await request(path, { token, signal }), mode); },
    async create(token: string, amountCents: number, requestId: string, signal?: AbortSignal) {
      bearer(token); if (!Number.isSafeInteger(amountCents) || amountCents < MIN_ACCOUNT_RECHARGE_CENTS || amountCents > MAX_ACCOUNT_RECHARGE_CENTS || !walletUuid.test(requestId)) throw new AccountWalletError('validation', 'Revisa el monto de la recarga.');
      return result(await request(path + '/recharges', { token, body: { amount_cents: amountCents, client_request_id: requestId }, signal, context: 'recharge' }), mode, { amountCents });
    },
    async update(token: string, entry: AccountRecharge, action: 'refresh' | 'cancel' | 'resume', signal?: AbortSignal) {
      bearer(token); if (!walletUuid.test(entry.id) || entry.mode !== mode) throw invalid();
      return result(await request(path + '/recharges/' + entry.id + '/' + action, { token, body: {}, signal, context: 'recharge' }), mode, { id: entry.id, amountCents: entry.amountCents });
    },
    async consultations(token: string, signal?: AbortSignal): Promise<AccountConsultationsResult> {
      bearer(token);
      return readAccountConsultations(await request(path + '/consultations', { token, signal, context: 'consultation' }), mode);
    },
    async quoteConsultation(token: string, appointmentId: number, signal?: AbortSignal): Promise<AccountConsultationQuote> {
      bearer(token);
      if (!Number.isSafeInteger(appointmentId) || appointmentId < 1) throw new AccountWalletError('validation', 'Elige una consulta válida.');
      const value = await request(path + '/consultations/' + appointmentId + '/quote', { token, body: {}, signal, context: 'consultation' });
      if (!record(value)) throw invalid();
      return readAccountConsultationQuote(value.quote, mode, appointmentId);
    },
    async payConsultation(token: string, quote: AccountConsultationQuote, requestId: string, signal?: AbortSignal): Promise<AccountConsultationPaymentResult> {
      bearer(token);
      if (!record(quote) || typeof requestId !== 'string' || !walletUuid.test(requestId)) throw new AccountWalletError('validation', 'Revisa la consulta antes de pagar.');
      const expected = readAccountConsultationQuote(quotePayload(quote), mode);
      // Expiry and payment state are authoritative on the server. An exact retry can return a historical payment.
      return consultationResult(await request(path + '/consultation-payments', { token, body: { quote_id: expected.id, client_request_id: requestId }, signal, context: 'consultation' }), mode, expected);
    },
  };
}
export type AccountWalletClient = ReturnType<typeof createAccountWalletClient>;
