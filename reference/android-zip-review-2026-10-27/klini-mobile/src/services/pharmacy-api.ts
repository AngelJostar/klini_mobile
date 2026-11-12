import type { CartLine, PharmacyAddress, Product } from '../domain/pharmacy';

export interface PharmacySettings {
  enabled: boolean; title: string; subtitle: string; bannerImageUrl?: string; accentColor?: string;
  shippingCents: number; deliveryEstimate: string; termsText: string; purchaseTermsUrl?: string; checkoutAvailable: boolean; ordersAvailable: boolean; notice: string;
}
export interface PharmacyCatalog { products: Product[]; settings: PharmacySettings }
export interface RemotePharmacyOrder {
  id: string; status: string; paymentStatus: string; createdAt: string; lines: CartLine[];
  subtotalCents: number; shippingCents: number; totalCents: number; prescriptionStatus?: string;
}
export interface PharmacyOrderInput {
  lines: CartLine[]; address: PharmacyAddress; termsAccepted: boolean;
  prescriptionId?: number; prescriptionUploadId?: number; clientRequestId?: string;
}
export interface PrescriptionFile { uri: string; name: string; mimeType: string; size?: number; file?: Blob }
export interface PrescriptionUpload { id: number; fileName: string; mimeType: string; sizeBytes: number; status: string; createdAt: string }
export class PharmacyApiError extends Error {
  constructor(readonly code: string, message: string, readonly status?: number) { super(message); this.name = 'PharmacyApiError'; }
}
const invalid = () => new PharmacyApiError('invalid_response', 'No se pudo verificar la respuesta de la farmacia.');
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, fallback = ''): string => typeof v === 'string' ? v.slice(0, 4000) : fallback;
function id(v: unknown): string {
  const value = String(v ?? '');
  if (!/^[1-9]\d{0,14}$/.test(value) || !Number.isSafeInteger(Number(value))) throw invalid();
  return value;
}
function integer(v: unknown, min = 0, max = 1000000): number {
  if (!Number.isSafeInteger(v) || Number(v) < min || Number(v) > max) throw invalid();
  return Number(v);
}
/** Contract: totals <= 1,000,000.00 MXN; catalog price <= 999,999.99 MXN; line quantity 1..99. No binary float multiplication. */
export function pharmacyDecimalToCents(value: unknown): number {
  if (typeof value !== 'string' && typeof value !== 'number') throw invalid();
  const match = /^(0|[1-9]\d{0,6})(?:\.(\d{1,2}))?$/.exec(String(value));
  if (!match) throw invalid();
  const result = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  if (!Number.isSafeInteger(result) || result > 100000000) throw invalid();
  return result;
}
function privateHost(host: string): boolean {
  if (['localhost', '[::1]'].includes(host)) return true;
  const parts = host.split('.').map(Number);
  return parts.length === 4 && parts.every(p => Number.isInteger(p) && p >= 0 && p <= 255) &&
    (parts[0] === 127 || parts[0] === 10 || (parts[0] === 192 && parts[1] === 168) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31));
}
export function validatePharmacyApiUrl(value: string): string {
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new PharmacyApiError('configuration', 'Configura la URL de la API de farmacia.'); }
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && privateHost(url.hostname))) ||
      url.username || url.password || url.search || url.hash || !/^\/api\/mobile\/v1\/?$/.test(url.pathname)) {
    throw new PharmacyApiError('configuration', 'La API debe usar HTTPS o una dirección local y terminar en /api/mobile/v1, sin credenciales.');
  }
  return url.origin + '/api/mobile/v1';
}
function safeImage(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 2048) return undefined;
  try {
    const url = new URL(value);
    if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && privateHost(url.hostname))) || url.username || url.password) return undefined;
    return url.href;
  } catch { return undefined; }
}
function productProvider(value: unknown): Product['provider'] {
  if (value == null) return undefined;
  if (!record(value) || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 2000 ||
      (value.is_klini !== undefined && typeof value.is_klini !== 'boolean')) throw invalid();
  return { id: id(value.id), name: value.name.trim(), ...(value.is_klini === undefined ? {} : {isKlini:value.is_klini}) };
}
function product(v: unknown): Product {
  if (!record(v) || !text(v.name).trim() || typeof v.requires_prescription !== 'boolean' ||
      (v.currency !== undefined && v.currency !== 'MXN')) throw invalid();
  const price = pharmacyDecimalToCents(v.price);
  const previous = v.compare_at_price == null ? undefined : pharmacyDecimalToCents(v.compare_at_price);
  return {
    id: id(v.id), catalogItemId: v.catalog_item_id == null ? undefined : id(v.catalog_item_id),
    name: text(v.name), presentation: text(v.presentation, 'Presentación no indicada') || 'Presentación no indicada',
    laboratory: text(v.laboratory, 'Laboratorio no indicado') || 'Laboratorio no indicado',
    specialty: text(v.specialty, 'General') || 'General', type: text(v.product_type, text(v.category, 'Producto')) || 'Producto',
    imageUrl: safeImage(v.image_url), priceCents: price, originalPriceCents: previous !== undefined && previous >= price ? previous : undefined,
    stock: integer(v.stock), requiresPrescription: v.requires_prescription,
    provider: productProvider(v.provider),
    programId: v.adherence_program_id == null ? undefined : id(v.adherence_program_id),
    description: text(v.description, 'Consulta las indicaciones del producto.') || 'Consulta las indicaciones del producto.',
  };
}
function catalogProduct(v: unknown): Product {
  if (!record(v) || !text(v.name).trim() || v.currency !== 'MXN' || typeof v.requires_prescription !== 'boolean' ||
      typeof v.available !== 'boolean' || !Array.isArray(v.offers) || v.offers.length > 10000) throw invalid();
  const catalogItemId=id(v.id);
  const offers=v.offers.map(product);
  if (offers.some(offer=>offer.catalogItemId!==catalogItemId || !offer.provider || offer.requiresPrescription!==v.requires_prescription) ||
      new Set(offers.map(offer=>offer.id)).size!==offers.length ||
      new Set(offers.map(offer=>offer.provider!.id)).size!==offers.length) throw invalid();
  const available=offers.filter(offer=>offer.stock>0);
  if (v.available!==(available.length>0)) throw invalid();
  const minimum=available.length ? Math.min(...available.map(offer=>offer.priceCents)) : null;
  if ((minimum===null && v.price_from!=null) || (minimum!==null && pharmacyDecimalToCents(v.price_from)!==minimum)) throw invalid();
  // A platform price is its own explicitly identified offer, never price_from or a name match.
  const representative=available.find(offer=>offer.provider?.isKlini===true) ?? available[0] ?? offers[0];
  return {
    ...(representative ?? {id:'catalog-'+catalogItemId, priceCents:0, stock:0, laboratory:'Laboratorio no indicado', specialty:'General', type:text(v.category,'Producto') || 'Producto'}),
    catalogItemId, name:text(v.name), presentation:text(v.presentation,'Presentación no indicada') || 'Presentación no indicada',
    description:text(v.description,'Consulta las indicaciones del producto.') || 'Consulta las indicaciones del producto.',
    requiresPrescription:v.requires_prescription, imageUrl:safeImage(v.image_url) ?? representative?.imageUrl, offers,
  };
}
function settings(v: unknown): PharmacySettings {
  if (!record(v) || typeof v.enabled !== 'boolean' || v.currency !== 'MXN') throw invalid();
  return {
    enabled: v.enabled, title: text(v.title, 'Farmacia digital'), subtitle: text(v.subtitle),
    bannerImageUrl: safeImage(v.banner_image_url), accentColor: typeof v.accent_color === 'string' && /^#[a-f\d]{6}$/i.test(v.accent_color) ? v.accent_color : undefined,
    shippingCents: pharmacyDecimalToCents(v.shipping_fee ?? '0'), deliveryEstimate: text(v.delivery_estimate, 'Por confirmar'),
    termsText: text(v.notice, 'La solicitud no implica pago ni reserva de existencias. Disponibilidad y receta sujetas a revisión.'),
    purchaseTermsUrl: safeImage(v.purchase_terms), checkoutAvailable: v.checkout_available === true,
    ordersAvailable: v.orders_available === true, notice: text(v.notice),
  };
}
function order(v: unknown): RemotePharmacyOrder {
  if (!record(v) || !Array.isArray(v.items) || v.items.length > 100 || v.currency !== 'MXN' ||
      !text(v.status) || !text(v.payment_status) || !text(v.created_at) || !Number.isFinite(Date.parse(text(v.created_at)))) throw invalid();
  const lines: CartLine[] = v.items.map(item => {
    if (!record(item)) throw invalid();
    const quantity = integer(item.quantity, 1, 99);
    const price = pharmacyDecimalToCents(item.unit_price);
    const p: Product = {
      id: id(item.product_id), name: text(item.product_name, text(item.name, 'Producto')),
      catalogItemId: item.catalog_item_id == null ? undefined : id(item.catalog_item_id),
      provider: item.provider_id == null && item.provider_name == null && item.provider_is_klini === undefined ? undefined :
        productProvider({id:item.provider_id,name:item.provider_name,...(item.provider_is_klini === undefined ? {} : {is_klini:item.provider_is_klini})}),
      presentation: text(item.presentation, 'Presentación no indicada'), laboratory: text(item.laboratory, 'Laboratorio no indicado'),
      specialty: 'General', type: 'Producto', imageUrl: safeImage(item.image_url), priceCents: price,
      stock: quantity, requiresPrescription: item.requires_prescription === true, description: 'Registro de solicitud. Consulta disponibilidad actual antes de volver a comprar.',
    };
    return { product: p, quantity };
  });
  const subtotalCents = pharmacyDecimalToCents(v.subtotal);
  const shippingCents = pharmacyDecimalToCents(v.shipping_fee ?? v.shipping_total ?? '0');
  const totalCents = pharmacyDecimalToCents(v.total);
  if (new Set(lines.map(line=>line.product.id)).size!==lines.length ||
      lines.reduce((sum, line) => sum + line.quantity * line.product.priceCents, 0) !== subtotalCents ||
      subtotalCents + shippingCents !== totalCents) throw invalid();
  return { id: id(v.id), status: text(v.status), paymentStatus: text(v.payment_status), createdAt: text(v.created_at),
    lines, subtotalCents, shippingCents, totalCents, prescriptionStatus: typeof v.prescription_status === 'string' ? v.prescription_status : undefined };
}
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** An opaque deduplication key, not a secret or authentication credential. */
export function createPharmacyRequestId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.floor(Math.random() * 16); return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });
}
const inputKeys = new WeakMap<PharmacyOrderInput, { key: string; signature: string }>();
function orderPayload(input: PharmacyOrderInput): Record<string, unknown> {
  if (!Array.isArray(input.lines) || input.lines.length < 1 || input.lines.length > 50 || input.termsAccepted !== true) {
    throw new PharmacyApiError('validation', 'Agrega productos y acepta las condiciones antes de enviar.');
  }
  const items = input.lines.map(line => ({ product_id: Number(id(line.product.id)), quantity: integer(line.quantity, 1, 99) }));
  if (new Set(items.map(i => i.product_id)).size !== items.length) throw new PharmacyApiError('validation', 'Hay productos repetidos en el carrito.');
  const a = input.address;
  if (!a || ![a.name, a.street, a.neighborhood].every(t => typeof t === 'string' && t.trim().length > 0) || a.name.length > 150 || a.street.length > 250 || a.neighborhood.length > 150 ||
      !/^\d{5}$/.test(a.postalCode) || (a.reference !== undefined && a.reference.length > 500)) {
    throw new PharmacyApiError('validation', 'Completa una dirección válida y el código postal de cinco dígitos.');
  }
  const payload = {
    items, address: { name: a.name.trim(), street: a.street.trim(), neighborhood: a.neighborhood.trim(), postal_code: a.postalCode, references: a.reference?.trim() || null },
    delivery_method: 'delivery', terms_accepted: true,
    ...(input.prescriptionId === undefined ? {} : { prescription_id: integer(input.prescriptionId, 1, Number.MAX_SAFE_INTEGER) }),
    ...(input.prescriptionUploadId === undefined ? {} : { prescription_upload_id: integer(input.prescriptionUploadId, 1, Number.MAX_SAFE_INTEGER) }),
  };
  const signature = JSON.stringify(payload);
  let previous = inputKeys.get(input);
  if (!previous || previous.signature !== signature) {
    const key = input.clientRequestId ?? createPharmacyRequestId();
    if (!uuidPattern.test(key)) throw new PharmacyApiError('validation', 'La solicitud necesita una clave válida. Intenta nuevamente.');
    previous = { key, signature }; inputKeys.set(input, previous);
  }
  return { ...payload, client_request_id: previous.key };
}
function tokenHeader(token: string): string {
  if (!token || token.length > 4096 || /[\s\r\n]/.test(token)) throw new PharmacyApiError('unauthenticated', 'Inicia sesión para continuar.', 401);
  return 'Bearer ' + token;
}
export function createPharmacyClient({ baseUrl, fetchImpl = fetch, timeoutMs = 20000 }: { baseUrl: string; fetchImpl?: typeof fetch; timeoutMs?: number }) {
  const base = validatePharmacyApiUrl(baseUrl);
  async function request(path: string, init: RequestInit = {}, signal?: AbortSignal, raw = false): Promise<unknown> {
    if (signal?.aborted) throw new PharmacyApiError('aborted', 'La operación se canceló.');
    const controller = new AbortController();
    const abort = () => controller.abort();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    signal?.addEventListener('abort', abort, { once: true });
    try {
      const response = await fetchImpl(base + path, { ...init, signal: controller.signal, redirect: 'error', credentials: 'omit', cache: 'no-store',
        headers: { Accept: 'application/json', ...init.headers } });
      let body: unknown;
      try { body = await response.json(); } catch { throw invalid(); }
      if (!response.ok) {
        const error = record(body) && record(body.error) ? body.error : undefined;
        const code = text(error?.code, 'http_error');
        // Server validation strings may contain reflected credentials or other private fields; do not echo raw bodies.
        const message = response.status === 401 ? 'La sesión expiró. Inicia sesión nuevamente.' :
          response.status === 403 ? 'Tu cuenta no tiene permiso para esta acción.' :
          response.status === 404 ? 'El producto o la solicitud ya no está disponible.' :
          response.status === 409 ? 'La solicitud cambió o ya fue enviada. Revisa Mis compras antes de reintentar.' :
          response.status === 422 ? 'Revisa los datos, la receta y las existencias antes de continuar.' :
          response.status === 429 ? 'Demasiados intentos. Espera un momento y vuelve a intentar.' :
          'La farmacia no pudo completar la solicitud. Intenta nuevamente.';
        throw new PharmacyApiError(code, message, response.status);
      }
      if (!record(body) || body.success === false || !('data' in body)) throw invalid();
      return raw ? body : body.data;
    } catch (error) {
      if (timedOut) throw new PharmacyApiError('timeout', 'La farmacia tardó demasiado. Revisa Mis compras antes de reintentar un envío.');
      if (controller.signal.aborted) throw new PharmacyApiError('aborted', 'La operación se canceló.');
      if (error instanceof PharmacyApiError) throw error;
      throw new PharmacyApiError('network', 'No se pudo conectar con la farmacia. Revisa tu conexión.');
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
  }
  async function pages(path: string, token: string | undefined, signal?: AbortSignal): Promise<unknown[]> {
    const result: unknown[] = [];
    for (let page = 1; page <= 200; page++) {
      const body = await request(path + '?page=' + page, token ? { headers: { Authorization: tokenHeader(token) } } : {}, signal, true);
      if (!record(body) || !Array.isArray(body.data)) throw invalid();
      result.push(...body.data);
      // Plain data[] responses are also supported; Laravel paginator metadata is verified when present.
      if (body.last_page === undefined) return result;
      const last = integer(body.last_page, 1, 200);
      if (body.current_page !== page) throw invalid();
      if (page >= last) return result;
    }
    throw invalid();
  }
  return {
    async loadPharmacyCatalog(signal?: AbortSignal): Promise<PharmacyCatalog> {
      const data = await request('/pharmacy/catalog', {}, signal);
      if (!record(data) || !Array.isArray(data.products) || data.products.length > 10000) throw invalid();
      const rawProducts = data.products.length >= 100 ? await pages('/pharmacy/products', undefined, signal) : data.products;
      const flatProducts = rawProducts.map(product);
      if (new Set(flatProducts.map(p => p.id)).size !== flatProducts.length) throw invalid();
      if (data.catalog_items===undefined) return {products:flatProducts,settings:settings(data.settings)};
      if (!Array.isArray(data.catalog_items) || data.catalog_items.length>10000) throw invalid();
      const rawCatalog=data.catalog_items.length>=100 ? await pages('/pharmacy/catalog-items',undefined,signal) : data.catalog_items;
      const grouped=rawCatalog.map(catalogProduct);
      const catalogIds=new Set(grouped.map(p=>p.catalogItemId));
      const offerIds=grouped.flatMap(p=>p.offers??[]).map(p=>p.id);
      if (catalogIds.size!==grouped.length || new Set(offerIds).size!==offerIds.length ||
          flatProducts.some(p=>p.catalogItemId!==undefined && !catalogIds.has(p.catalogItemId))) throw invalid();
      const legacy=flatProducts.filter(p=>p.catalogItemId===undefined);
      if (legacy.some(p=>offerIds.includes(p.id))) throw invalid();
      return { products:[...grouped,...legacy], settings: settings(data.settings) };
    },
    async loginPharmacy(login: string, password: string, signal?: AbortSignal): Promise<{ token: string; name: string }> {
      if (!login.trim() || !password || login.length > 255 || password.length > 1000) throw new PharmacyApiError('validation', 'Escribe tu cuenta y contraseña.');
      const data = await request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: login.trim(), password, device_name: 'Klini farmacia móvil' }) }, signal);
      if (!record(data) || typeof data.access_token !== 'string' || !record(data.user) || data.user.role !== 'patient') {
        if (record(data) && typeof data.access_token === 'string') {
          try { await request('/auth/logout', { method: 'POST', headers: { Authorization: tokenHeader(data.access_token) } }); } catch { /* Never expose or retain an unusable token. Server expiry remains the fallback if revocation fails. */ }
        }
        throw new PharmacyApiError('role_not_allowed', 'Inicia sesión con una cuenta de paciente para usar la farmacia.');
      }
      tokenHeader(data.access_token);
      return { token: data.access_token, name: text(data.user.name, 'Paciente') };
    },
    async loadPharmacyOrders(token: string, signal?: AbortSignal): Promise<RemotePharmacyOrder[]> {
      tokenHeader(token);
      return (await pages('/pharmacy/orders', token, signal)).map(order);
    },
    /** Aborting another request does not revoke a session. This endpoint revokes the current token. */
    async logoutPharmacy(token: string, signal?: AbortSignal): Promise<void> {
      try { await request('/auth/logout', { method: 'POST', headers: { Authorization: tokenHeader(token) } }, signal); }
      catch (error) { if (!(error instanceof PharmacyApiError) || error.status !== 401) throw error; }
    },
    async submitPharmacyOrder(token: string, input: PharmacyOrderInput, signal?: AbortSignal): Promise<RemotePharmacyOrder> {
      const payload = orderPayload(input);
      const selected=new Map(input.lines.map(line=>[line.product.id,line.quantity]));
      const result=order(await request('/pharmacy/orders', { method: 'POST', headers: { Authorization: tokenHeader(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload) }, signal));
      if (result.lines.length!==selected.size || result.lines.some(line=>selected.get(line.product.id)!==line.quantity)) throw invalid();
      return result;
    },
    async uploadPrescription(token: string, file: PrescriptionFile, signal?: AbortSignal): Promise<PrescriptionUpload> {
      if (!file || !['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimeType) || !file.name || file.name.length > 255 ||
          (file.size !== undefined && (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > 8 * 1024 * 1024)) ||
          (!file.file && !/^(file|content|blob):/.test(file.uri))) {
        throw new PharmacyApiError('validation', 'Selecciona una receta PDF, JPG o PNG de hasta 8 MB.');
      }
      if (file.file && (file.file.size > 8 * 1024 * 1024 || file.file.size === 0)) throw new PharmacyApiError('validation', 'La receta debe medir hasta 8 MB.');
      const form = new FormData();
      if (file.file) form.append('file', file.file, file.name);
      else form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
      const data = await request('/pharmacy/prescription-uploads', { method: 'POST', headers: { Authorization: tokenHeader(token) }, body: form }, signal);
      if (!record(data) || data.status !== 'pending_review') throw invalid();
      return { id: Number(id(data.id)), fileName: text(data.file_name), mimeType: text(data.mime_type), sizeBytes: integer(data.size_bytes, 1, 8 * 1024 * 1024), status: 'pending_review', createdAt: text(data.created_at) };
    },
  };
}
function configuredClient() {
  const baseUrl = process.env.EXPO_PUBLIC_PHARMACY_API_URL?.trim() ?? '';
  return createPharmacyClient({ baseUrl });
}
/** Invalid configuration is connected-but-broken, never a silent fallback to demo. */
export function pharmacyApiConfigured(): boolean { return !!process.env.EXPO_PUBLIC_PHARMACY_API_URL?.trim(); }
export const loadPharmacyCatalog = (signal?: AbortSignal) => configuredClient().loadPharmacyCatalog(signal);
export const loginPharmacy = (login: string, password: string, signal?: AbortSignal) => configuredClient().loginPharmacy(login, password, signal);
export const loadPharmacyOrders = (token: string, signal?: AbortSignal) => configuredClient().loadPharmacyOrders(token, signal);
export const submitPharmacyOrder = (token: string, input: PharmacyOrderInput, signal?: AbortSignal) => configuredClient().submitPharmacyOrder(token, input, signal);
export const uploadPrescription = (token: string, file: PrescriptionFile, signal?: AbortSignal) => configuredClient().uploadPrescription(token, file, signal);



export const logoutPharmacy = (token: string, signal?: AbortSignal) => configuredClient().logoutPharmacy(token, signal);



