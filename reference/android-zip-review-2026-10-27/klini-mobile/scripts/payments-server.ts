import { timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer, type IncomingMessage } from 'node:http';
import { isIP } from 'node:net';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseEnv } from 'node:util';
import { createFilePaymentStorage, createTestPaymentService, PaymentError, validateStripeTestKey, type PaymentServiceOptions } from './payments-ledger';

const WEB_ORIGIN = 'http://127.0.0.1:8096';
const BODY_LIMIT = 2048;
const HTTP_OPTIONS = { requestTimeout: 10000, headersTimeout: 5000, maxHeaderSize: 8192, keepAliveTimeout: 1000 };

export function validatePaymentsConfiguration({ secretKey, developmentToken, lanHost }: { secretKey?: string; developmentToken?: string; lanHost?: string }) {
  if (process.env.NODE_ENV === 'production') throw new Error('El servidor de pagos de prueba no admite producción.');
  validateStripeTestKey(secretKey);
  if (developmentToken !== undefined && !/^[A-Za-z0-9_-]{32,256}$/.test(developmentToken)) throw new Error('Configura un token privado de desarrollo de al menos 32 caracteres.');
  if (lanHost) {
    const octets = lanHost.split('.').map(Number);
    if (isIP(lanHost) !== 4 || !(octets[0] === 10 || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) || (octets[0] === 192 && octets[1] === 168))) throw new Error('Los pagos de prueba admiten solo una interfaz LAN IPv4 privada.');
    if (!developmentToken) throw new Error('La interfaz LAN requiere un token privado de desarrollo.');
  }
  return { secretKey, developmentToken, lanHost };
}
export function loadStripeTestKeyFile(filePath: string): string {
  try {
    const raw = readFileSync(filePath, 'utf8');
    if (Buffer.byteLength(raw) > 65536) throw new Error();
    const key = parseEnv(raw).STRIPE_SECRET_KEY;
    if (!key) throw new Error();
    return validateStripeTestKey(key)!;
  } catch { throw new Error('No se pudo cargar la clave privada de Stripe de prueba.'); }
}
function matchesBearer(value: string | undefined, token: string) {
  const expected = `Bearer ${token}`;
  if (typeof value !== 'string') return false;
  const left = Buffer.from(value), right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > BODY_LIMIT) throw new PaymentError(413, 'body_limit', 'La solicitud es demasiado grande.');
    chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new PaymentError(400, 'invalid_json', 'La solicitud JSON no es válida.'); }
}

/** Local, single-account Stripe TEST bridge; no production or clinical identity. */
export function createPaymentsServer(options: Partial<PaymentServiceOptions> & { developmentToken?: string; lanHost?: string; dataFile?: string } = {}) {
  const config = validatePaymentsConfiguration(options);
  const service = createTestPaymentService({ ...options, storage: options.storage ?? createFilePaymentStorage(options.dataFile ?? resolve('.local/payments-test-ledger.json')) });
  const server = createServer(HTTP_OPTIONS, async (request, response) => {
    const reply = (status: number, value: unknown) => {
      if (response.destroyed || response.writableEnded) return;
      response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
      response.end(JSON.stringify(value));
    };
    const reject = (status: number, code: string, error: string) => { request.resume(); reply(status, { error, code }); };
    const hosts = ['127.0.0.1', 'localhost', '[::1]', '10.0.2.2', ...(config.lanHost ? [config.lanHost] : [])].map(host => `${host}:${request.socket.localPort}`);
    if (!hosts.includes(request.headers.host ?? '') || (request.headers.origin !== undefined && request.headers.origin !== WEB_ORIGIN)) { reject(403, 'origin_denied', 'Origen no permitido.'); return; }
    response.setHeader('Access-Control-Allow-Origin', WEB_ORIGIN);
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.setHeader('Vary', 'Origin');
    const path = request.url ?? '';
    const rechargeMatch = /^\/recharges\/(rch_[a-f0-9-]{36})$/.exec(path);
    if (!['/health', '/wallet', '/recharges'].includes(path) && !rechargeMatch) { reject(404, 'not_found', 'Ruta no disponible.'); return; }
    if (request.method === 'OPTIONS') { request.resume(); response.writeHead(204); response.end(); return; }
    if (path === '/health') {
      if (request.method !== 'GET') { reject(405, 'method_not_allowed', 'Método no permitido.'); return; }
      request.resume();
      reply(200, { development: true, mode: 'test', provider: 'stripe', configured: service.configured && !!config.developmentToken, purpose: 'health_services' });
      return;
    }
    if (!config.developmentToken) { reject(503, 'not_configured', 'Configura el acceso privado del servidor de pruebas.'); return; }
    if (!matchesBearer(request.headers.authorization, config.developmentToken)) { reject(401, 'unauthorized', 'El acceso al servidor de pruebas no está autorizado.'); return; }
    if (!service.configured) { reject(503, 'not_configured', 'Stripe de prueba aún no está configurado.'); return; }
    if ((path === '/recharges' && request.method !== 'POST') || (path !== '/recharges' && request.method !== 'GET')) { reject(405, 'method_not_allowed', 'Método no permitido.'); return; }
    try {
      if (path === '/wallet') { request.resume(); reply(200, await service.wallet()); }
      else if (rechargeMatch) { request.resume(); reply(200, await service.retrieve(rechargeMatch[1])); }
      else {
        if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers['content-type'] ?? '')) { reject(415, 'json_required', 'Se requiere JSON.'); return; }
        if (Number(request.headers['content-length']) > BODY_LIMIT) { reject(413, 'body_limit', 'La solicitud es demasiado grande.'); return; }
        reply(200, await service.create(await readBody(request)));
      }
    } catch (error) {
      // Provider messages, client secrets and credentials never enter logs/errors.
      if (error instanceof PaymentError) reply(error.status, { error: error.message, code: error.code });
      else reply(503, { error: 'El servidor de pruebas no pudo completar la operación.', code: 'payment_unavailable' });
    }
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const secretKey = process.env.KLINI_PAYMENTS_KEY_FILE ? loadStripeTestKeyFile(process.env.KLINI_PAYMENTS_KEY_FILE) : process.env.STRIPE_SECRET_KEY;
  if (process.env.KLINI_PAYMENTS_HOST && process.env.KLINI_PAYMENTS_HOST !== '127.0.0.1') throw new Error('La escucha predeterminada debe permanecer en 127.0.0.1.');
  const config = validatePaymentsConfiguration({ secretKey, developmentToken: process.env.KLINI_PAYMENTS_DEV_TOKEN, lanHost: process.env.KLINI_PAYMENTS_LAN_HOST });
  const server = createPaymentsServer({ ...config, dataFile: process.env.KLINI_PAYMENTS_DATA_FILE });
  server.listen(8099, '127.0.0.1', () => console.log('Klini pagos TEST: http://127.0.0.1:8099 (cuenta local de pruebas, sin producción).'));
  if (config.lanHost) createServer(HTTP_OPTIONS, (request, response) => server.emit('request', request, response)).listen(8099, config.lanHost, () => console.log('Klini pagos TEST: interfaz privada de dispositivo habilitada.'));
}
