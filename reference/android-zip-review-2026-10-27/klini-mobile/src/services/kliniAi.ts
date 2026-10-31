import type { AppState } from '../domain/types';
import { hasAiAccess } from '../domain/aiSubscription';
import { answerKliniAiDemo, buildKliniAiContext, parseKliniAiAnswer, parseKliniAiRequest, validateAiQuestion, validateKliniAiEndpoint, type AiAnswer, type AiMessage } from '../domain/kliniAi';

export type { AiAnswer, AiAction, AiMessage } from '../domain/kliniAi';
export interface AskKliniAiInput { question: string; history: AiMessage[]; state: AppState; signal?: AbortSignal }

/** Injectable transport permits isolated tests without sending any health data. */
export function createKliniAiService({ endpoint, development, fetchImpl = fetch, timeoutMs = 35000 }: {
  endpoint?: string; development: boolean; fetchImpl?: typeof fetch; timeoutMs?: number;
}) {
  return async ({ question, history, state, signal }: AskKliniAiInput): Promise<AiAnswer> => {
    if (!hasAiAccess(state.aiSubscription)) throw new Error('Activa Klini IA para usar el asistente.');
    const validQuestion = validateAiQuestion(question);
    if (signal?.aborted) throw new Error('La consulta fue cancelada.');
    if (!endpoint?.trim()) return answerKliniAiDemo(validQuestion, state);
    const url = validateKliniAiEndpoint(endpoint.trim(), development);
    const context = buildKliniAiContext(state);
    const request = parseKliniAiRequest({ question: validQuestion, context, history: history.slice(-8).map(message => ({ role: message.role, text: message.text })) });
    const controller = new AbortController();
    let timedOut = false;
    const cancel = () => controller.abort();
    signal?.addEventListener('abort', cancel);
    if (signal?.aborted) cancel();
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    try {
      const response = await fetchImpl(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal: controller.signal });
      if (!response.ok) throw new Error(response.status === 503 ? 'El servicio de IA aún no está configurado en el servidor.' : response.status === 429 ? 'El asistente está atendiendo otra consulta. Intenta nuevamente.' : 'No se pudo consultar el asistente. Intenta nuevamente.');
      if (Number(response.headers.get('content-length')) > 20000) throw new Error('El asistente devolvió una respuesta demasiado grande.');
      const text = await response.text();
      if (text.length > 20000) throw new Error('El asistente devolvió una respuesta demasiado grande.');
      let result: unknown;
      try { result = JSON.parse(text); } catch { throw new Error('El asistente no devolvió una respuesta válida.'); }
      return { ...parseKliniAiAnswer(result, context), source: 'openai' };
    } catch (cause) {
      if (controller.signal.aborted) throw new Error(timedOut ? 'La consulta tardó demasiado. Intenta nuevamente.' : 'La consulta fue cancelada.');
      if (cause instanceof TypeError) throw new Error('No se pudo conectar con el servicio de IA.');
      throw cause;
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
  };
}

export async function askKliniAi(input: AskKliniAiInput): Promise<AiAnswer> {
  return createKliniAiService({ endpoint: process.env.EXPO_PUBLIC_KLINI_AI_URL, development: typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production' })(input);
}
