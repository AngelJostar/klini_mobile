import { createServer, type IncomingMessage } from 'node:http';
import { pathToFileURL } from 'node:url';
import { buildKliniAiOpenAiRequest, parseKliniAiProviderResponse, parseKliniAiRequest } from '../src/domain/kliniAi';

// Development bridge only. Production needs authenticated users, server-side
// subscription checks, consent and a deployment-specific privacy review.
// No client subscription flag is accepted as authorization by this bridge.
const WEB_ORIGIN = 'http://127.0.0.1:8096';
const BODY_LIMIT = 65536;
class RequestError extends Error { constructor(readonly status: number, message: string, readonly code?: string) { super(message); } }
async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > BODY_LIMIT) throw new RequestError(413, 'Solicitud demasiado grande.');
    chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new RequestError(400, 'Solicitud no válida.'); }
}

export function createKliniAiServer({ apiKey = process.env.OPENAI_API_KEY, model = process.env.OPENAI_MODEL, fetchImpl = fetch, providerTimeoutMs = 25000 }: {
  apiKey?: string; model?: string; fetchImpl?: typeof fetch; providerTimeoutMs?: number;
} = {}) {
  if (process.env.NODE_ENV === 'production') throw new Error('Este servidor solo está disponible para desarrollo local.');
  const modelName = model?.trim() || '';
  // Only expose a bounded model slug. A key accidentally pasted into this
  // configuration field must never be reflected by the health endpoint.
  const visibleModel = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(modelName) && !/^sk-/i.test(modelName) ? modelName : null;
  let busy = false;
  return createServer({ requestTimeout: 10000, headersTimeout: 5000, maxHeaderSize: 8192, keepAliveTimeout: 1000 }, async (request, response) => {
    const reply = (status: number, body: unknown) => {
      if (response.destroyed || response.writableEnded) return;
      response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      response.end(JSON.stringify(body));
    };
    const allowedHosts = ['127.0.0.1', 'localhost', '10.0.2.2', '[::1]'].map(host => `${host}:${request.socket.localPort}`);
    if (!allowedHosts.includes(request.headers.host || '') || (request.headers.origin && request.headers.origin !== WEB_ORIGIN)) { request.resume(); reply(403, { error: 'Origen no permitido.' }); return; }
    response.setHeader('Access-Control-Allow-Origin', WEB_ORIGIN);
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.setHeader('Vary', 'Origin');
    if (request.url !== '/chat' && request.url !== '/health') { request.resume(); reply(404, { error: 'Ruta no disponible.' }); return; }
    if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return; }
    if (request.url === '/health') {
      request.resume();
      if (request.method !== 'GET') { reply(405, { error: 'Método no permitido.' }); return; }
      reply(200, { development: true, keyConfigured: !!apiKey?.trim(), modelConfigured: visibleModel !== null, model: visibleModel });
      return;
    }
    if (request.method !== 'POST') { request.resume(); reply(405, { error: 'Método no permitido.' }); return; }
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers['content-type'] || '')) { request.resume(); reply(415, { error: 'Se requiere JSON.' }); return; }
    if (Number(request.headers['content-length']) > BODY_LIMIT) { request.resume(); reply(413, { error: 'Solicitud demasiado grande.' }); return; }
    if (!apiKey?.trim() || !model?.trim()) { request.resume(); reply(503, { error: 'El servicio de IA aún no está configurado.' }); return; }
    if (busy) { request.resume(); reply(429, { error: 'Intenta nuevamente en unos momentos.' }); return; }
    busy = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), providerTimeoutMs);
    const disconnected = () => { if (!response.writableEnded) controller.abort(); };
    response.on('close', disconnected);
    try {
      let payload;
      try { payload = parseKliniAiRequest(await readBody(request)); }
      catch (cause) { throw cause instanceof RequestError ? cause : new RequestError(400, 'Solicitud no válida.'); }
      const result = await fetchImpl('https://api.openai.com/v1/responses', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(buildKliniAiOpenAiRequest(payload, model)), signal: controller.signal,
      });
      if (result.status === 401 || result.status === 403) throw new RequestError(502, 'Revisa la credencial y los permisos del servicio de IA.', 'provider_auth');
      if (result.status === 429) throw new RequestError(502, 'El proveedor de IA alcanzó un límite de uso. Revisa su cuota antes de intentar nuevamente.', 'provider_limit');
      if (!result.ok) throw new RequestError(502, 'El proveedor de IA no pudo responder.');
      const raw = await result.text();
      if (raw.length > 100000) throw new RequestError(502, 'La respuesta del proveedor no es válida.');
      const answer = parseKliniAiProviderResponse(JSON.parse(raw), payload.context);
      reply(200, { ...answer, source: 'openai' });
    } catch (cause) {
      const status = controller.signal.aborted ? 504 : cause instanceof RequestError ? cause.status : 502;
      reply(status, { error: status === 504 ? 'La consulta tardó demasiado.' : cause instanceof RequestError ? cause.message : 'No se pudo consultar el asistente.', ...(cause instanceof RequestError && cause.code ? { code: cause.code } : {}) });
    } finally { clearTimeout(timer); response.removeListener('close', disconnected); busy = false; }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.env.KLINI_AI_HOST && process.env.KLINI_AI_HOST !== '127.0.0.1') throw new Error('El servidor de desarrollo solo puede escuchar en 127.0.0.1.');
  createKliniAiServer().listen(8098, '127.0.0.1', () => console.log('Klini IA: servidor de desarrollo en http://127.0.0.1:8098/chat'));
}
