import { createServer, type IncomingMessage } from 'node:http';
import { readFileSync } from 'node:fs';
import { timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { pathToFileURL } from 'node:url';
import { parseEnv } from 'node:util';
import {
  buildKliniAiOpenAiRequest,
  buildKliniAiWebSearchRequest,
  KliniAiCitationError,
  parseKliniAiPlanResponse,
  parseKliniAiProviderResponse,
  parseKliniAiRequest,
  parseKliniAiWebEvidence,
  sanitizeKliniAiWebQuery,
} from '../src/domain/kliniAi';
import { selectKliniAiContext, selectKliniAiHistory } from '../src/domain/kliniAiContext';

// Development bridge only. Production needs authenticated users, server-side
// subscription checks, consent and a deployment-specific privacy review.
// No client subscription flag is accepted as authorization by this bridge.
const WEB_ORIGIN = 'http://127.0.0.1:8096';
const BODY_LIMIT = 6 * 1024 * 1024;
const TEXT_BODY_LIMIT = 65536;
const HTTP_SERVER_OPTIONS = { requestTimeout: 10000, headersTimeout: 5000, maxHeaderSize: 8192, keepAliveTimeout: 1000 };
const WEB_SEARCH_ERROR = 'No se pudo consultar internet. Intenta nuevamente para obtener una respuesta con fuentes verificadas.';
/** LAN access is opt-in, bounded to one private IPv4 interface and one local token. */
export function validateKliniAiLanConfiguration(lanHost?: string, developmentToken?: string): { lanHost?: string; developmentToken?: string } {
  if (!lanHost) return {};
  const octets = lanHost.split('.').map(Number);
  if (isIP(lanHost) !== 4 || !(octets[0] === 10 || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) || (octets[0] === 192 && octets[1] === 168))) throw new Error('La conexión local de Klini IA requiere una dirección IPv4 privada.');
  if (!developmentToken || !/^[A-Za-z0-9_-]{32,256}$/.test(developmentToken)) throw new Error('La conexión local de Klini IA requiere un token de desarrollo válido.');
  return { lanHost, developmentToken };
}
function matchesDevelopmentToken(value: string | string[] | undefined, expected: string): boolean {
  if (typeof value !== 'string' || value.length !== expected.length) return false;
  const provided = Buffer.from(value, 'utf8');
  const configured = Buffer.from(expected, 'utf8');
  return provided.length === configured.length && timingSafeEqual(provided, configured);
}
/** Read only the explicitly configured dotenv file, without evaluation or logs. */
export function loadKliniAiKeyFile(filePath: string): string {
  try {
    const content = readFileSync(filePath, 'utf8');
    if (Buffer.byteLength(content, 'utf8') > 65536) throw new Error();
    const apiKey = parseEnv(content).OPENAI_API_KEY?.trim();
    if (!apiKey || !/^sk-[a-zA-Z0-9_-]{16,512}$/.test(apiKey)) throw new Error();
    return apiKey;
  } catch {
    throw new Error('No se pudo cargar la credencial local de Klini IA.');
  }
}
class RequestError extends Error { constructor(readonly status: number, message: string, readonly code?: string) { super(message); } }
async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > BODY_LIMIT) throw new RequestError(413, 'Solicitud demasiado grande.');
    chunks.push(Buffer.from(chunk));
  }
  let body: unknown;
  try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new RequestError(400, 'Solicitud no válida.'); }
  // Keep the original metadata bound independently of the base64 transport.
  const metadata = body && typeof body === 'object' && !Array.isArray(body)
    ? Object.fromEntries(Object.entries(body).filter(([field]) => field !== 'attachments')) : body;
  if (Buffer.byteLength(JSON.stringify(metadata), 'utf8') > TEXT_BODY_LIMIT) throw new RequestError(413, 'Solicitud demasiado grande.');
  return body;
}

export function createKliniAiServer({ apiKey = process.env.OPENAI_API_KEY, model = process.env.OPENAI_MODEL, fetchImpl = fetch, providerTimeoutMs = 90000, lanHost, developmentToken }: {
  apiKey?: string; model?: string; fetchImpl?: typeof fetch; providerTimeoutMs?: number; lanHost?: string; developmentToken?: string;
} = {}) {
  if (process.env.NODE_ENV === 'production') throw new Error('Este servidor solo está disponible para desarrollo local.');
  const lan = validateKliniAiLanConfiguration(lanHost, developmentToken);
  const modelName = model?.trim() || '';
  // Only expose a bounded model slug. A key accidentally pasted into this
  // configuration field must never be reflected by the health endpoint.
  const visibleModel = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(modelName) && !/^sk-/i.test(modelName) ? modelName : null;
  let busy = false;
  return createServer(HTTP_SERVER_OPTIONS, async (request, response) => {
    const reply = (status: number, body: unknown) => {
      if (response.destroyed || response.writableEnded) return;
      response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      response.end(JSON.stringify(body));
    };
    const allowedHosts = ['127.0.0.1', 'localhost', '10.0.2.2', '[::1]'].map(host => `${host}:${request.socket.localPort}`);
    if (lan.lanHost) allowedHosts.push(`${lan.lanHost}:${request.socket.localPort}`);
    if (!allowedHosts.includes(request.headers.host || '') || (request.headers.origin && request.headers.origin !== WEB_ORIGIN)) { request.resume(); reply(403, { error: 'Origen no permitido.' }); return; }
    response.setHeader('Access-Control-Allow-Origin', WEB_ORIGIN);
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Klini-Dev-Token');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.setHeader('Vary', 'Origin');
    if (request.url !== '/chat' && request.url !== '/health') { request.resume(); reply(404, { error: 'Ruta no disponible.' }); return; }
    if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return; }
    if (request.url === '/health') {
      request.resume();
      if (request.method !== 'GET') { reply(405, { error: 'Método no permitido.' }); return; }
      reply(200, { development: true, keyConfigured: !!apiKey?.trim(), modelConfigured: visibleModel !== null, model: visibleModel, webSearch: true });
      return;
    }
    if (request.method !== 'POST') { request.resume(); reply(405, { error: 'Método no permitido.' }); return; }
    // Checking the interface as well as Host prevents a LAN caller from using
    // a loopback Host header to bypass the local device token.
    const usesLan = lan.lanHost && (request.headers.host === `${lan.lanHost}:${request.socket.localPort}` || request.socket.localAddress === lan.lanHost || request.socket.localAddress === `::ffff:${lan.lanHost}`);
    if (usesLan && !matchesDevelopmentToken(request.headers['x-klini-dev-token'], lan.developmentToken!)) { request.resume(); reply(401, { error: 'La conexión local de Klini IA no está autorizada.' }); return; }
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers['content-type'] || '')) { request.resume(); reply(415, { error: 'Se requiere JSON.' }); return; }
    if (Number(request.headers['content-length']) > BODY_LIMIT) { request.resume(); reply(413, { error: 'Solicitud demasiado grande.' }); return; }
    if (!apiKey?.trim() || !model?.trim()) { request.resume(); reply(503, { error: 'El servicio de IA aún no está configurado.' }); return; }
    if (busy) { request.resume(); reply(429, { error: 'Intenta nuevamente en unos momentos.' }); return; }
    busy = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), providerTimeoutMs);
    const disconnected = () => { if (!response.writableEnded) controller.abort(); };
    response.on('close', disconnected);
    request.on('aborted', disconnected);
    try {
      let validatedPayload;
      try { validatedPayload = parseKliniAiRequest(await readBody(request)); }
      catch (cause) { throw cause instanceof RequestError ? cause : new RequestError(400, 'Solicitud no válida.'); }
      const history = selectKliniAiHistory(validatedPayload.question, validatedPayload.history);
      const context = selectKliniAiContext(validatedPayload.question, history, validatedPayload.context);
      const recordFiles = validatedPayload.recordFiles?.filter(file => context.records.some(record => record.id === file.recordId));
      const savedFileIds = new Set(validatedPayload.recordFiles?.flatMap(file => file.attachmentId ? [file.attachmentId] : []));
      const retainedFileIds = new Set(recordFiles?.flatMap(file => file.attachmentId ? [file.attachmentId] : []));
      const payload = { ...validatedPayload, history, context, ...(recordFiles && { recordFiles }), ...(validatedPayload.attachments && { attachments: validatedPayload.attachments.filter(file => !savedFileIds.has(file.id) || retainedFileIds.has(file.id)) }) };
      // A single deadline and signal cover planning, isolated retrieval and
      // synthesis. A disconnected client cannot leave later stages running.
      const callProvider = async (body: unknown, webSearch = false): Promise<unknown> => {
        try {
          controller.signal.throwIfAborted();
          const result = await fetchImpl('https://api.openai.com/v1/responses', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify(body), signal: controller.signal,
          });
          if (result.status === 401 || (!webSearch && result.status === 403)) throw new RequestError(502, 'Revisa la credencial y los permisos del servicio de IA.', 'provider_auth');
          if (result.status === 429) throw new RequestError(502, 'El proveedor de IA alcanzó un límite de uso. Revisa su cuota antes de intentar nuevamente.', 'provider_limit');
          if (!result.ok) throw new RequestError(502, 'El proveedor de IA no pudo responder.');
          const raw = await result.text();
          controller.signal.throwIfAborted();
          if (raw.length > 100000) throw new RequestError(502, 'La respuesta del proveedor no es válida.');
          return JSON.parse(raw);
        } catch (cause) {
          if (controller.signal.aborted || !webSearch || (cause instanceof RequestError && (cause.code === 'provider_auth' || cause.code === 'provider_limit'))) throw cause;
          throw new RequestError(502, WEB_SEARCH_ERROR, 'web_search_unavailable');
        }
      };
      const initial = await callProvider(buildKliniAiOpenAiRequest(payload, model));
      const plan = parseKliniAiPlanResponse(initial, payload.context);
      let answer = plan.webSearchQuery ? plan.answer : parseKliniAiProviderResponse(initial, payload.context);
      if (plan.webSearchQuery) {
        let evidence;
        try {
          // Retain known identifiers only for this privacy filter. The provider
          // receives the selected context above, never the unselected chart.
          const query = sanitizeKliniAiWebQuery(plan.webSearchQuery, validatedPayload);
          // Retrieval receives only a vetted general query. Neither the chart
          // nor conversation history is included in the tool-bearing request.
          evidence = parseKliniAiWebEvidence(await callProvider(buildKliniAiWebSearchRequest(query, model), true));
        } catch (cause) {
          if (controller.signal.aborted || (cause instanceof RequestError && (cause.code === 'provider_auth' || cause.code === 'provider_limit'))) throw cause;
          throw new RequestError(502, WEB_SEARCH_ERROR, 'web_search_unavailable');
        }
        const synthesis = buildKliniAiOpenAiRequest(payload, model, evidence);
        try {
          answer = parseKliniAiProviderResponse(await callProvider(synthesis), payload.context, evidence);
        } catch (cause) {
          if (!(cause instanceof KliniAiCitationError)) throw cause;
          // Retry only citation validation, once, using the same vetted evidence.
          // Never pass the rejected answer back as trusted instructions or search again.
          const repair = { ...synthesis, instructions: synthesis.instructions + '\nLa respuesta anterior no cumplió la validación de citas. Genera una respuesta nueva con citas [id] junto a los hallazgos respaldados, usando solo webEvidence.sources. No inventes identificadores ni recomendaciones personalizadas.' };
          try {
            answer = parseKliniAiProviderResponse(await callProvider(repair), payload.context, evidence);
          } catch (retryCause) {
            if (!(retryCause instanceof KliniAiCitationError)) throw retryCause;
            throw new RequestError(502, WEB_SEARCH_ERROR, 'web_search_unavailable');
          }
        }
      }
      reply(200, { ...answer, source: 'openai' });
    } catch (cause) {
      const status = controller.signal.aborted ? 504 : cause instanceof RequestError ? cause.status : 502;
      reply(status, { error: status === 504 ? 'La consulta tardó demasiado.' : cause instanceof RequestError ? cause.message : 'No se pudo consultar el asistente.', ...(cause instanceof RequestError && cause.code ? { code: cause.code } : {}) });
    } finally { clearTimeout(timer); response.removeListener('close', disconnected); request.removeListener('aborted', disconnected); busy = false; }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.env.KLINI_AI_HOST && process.env.KLINI_AI_HOST !== '127.0.0.1') throw new Error('El servidor de desarrollo solo puede escuchar en 127.0.0.1.');
  const lan = validateKliniAiLanConfiguration(process.env.KLINI_AI_LAN_HOST, process.env.KLINI_AI_DEV_TOKEN);
  if (process.env.KLINI_AI_KEY_FILE) process.env.OPENAI_API_KEY = loadKliniAiKeyFile(process.env.KLINI_AI_KEY_FILE);
  const server = createKliniAiServer(lan);
  server.listen(8098, '127.0.0.1', () => console.log('Klini IA: servidor de desarrollo en http://127.0.0.1:8098/chat'));
  if (lan.lanHost) {
    // Both interfaces share the same provider handler, deadline and busy flag.
    createServer(HTTP_SERVER_OPTIONS, (request, response) => server.emit('request', request, response))
      .listen(8098, lan.lanHost, () => console.log(`Klini IA: conexión de dispositivo en http://${lan.lanHost}:8098/chat`));
  }
}
