import type { AppState } from '../domain/types';
import { hasAiAccess } from '../domain/aiSubscription';
import { answerKliniAiDemo, buildKliniAiSelectionContext, parseKliniAiAnswer, parseKliniAiRequest, validateAiQuestion, validateKliniAiEndpoint, type AiAnswer, type AiMessage } from '../domain/kliniAi';
import { selectKliniAiContext, selectKliniAiHistory, shouldReadKliniAiRecordFiles } from '../domain/kliniAiContext';
import { parseAiAttachments, type AiAttachment } from '../domain/kliniAiAttachments';
import { prepareKliniAiRecordAttachments, type ReadAiRecordAttachment } from './kliniAiRecordAttachments';

export type { AiAnswer, AiAction, AiMessage, AiSource } from '../domain/kliniAi';
export interface AskKliniAiInput { question: string; history: AiMessage[]; state: AppState; attachments?: AiAttachment[]; signal?: AbortSignal }

/** Injectable transport permits isolated tests without sending any health data. */
export function createKliniAiService({ endpoint, development, lanHost, developmentToken, readRecordAttachment, fetchImpl = fetch, timeoutMs = 105000 }: {
  endpoint?: string; development: boolean; lanHost?: string; developmentToken?: string; readRecordAttachment?: ReadAiRecordAttachment; fetchImpl?: typeof fetch; timeoutMs?: number;
}) {
  return async ({ question, history, state, attachments, signal }: AskKliniAiInput): Promise<AiAnswer> => {
    if (!hasAiAccess(state.aiSubscription)) throw new Error('Activa Klini IA para usar el asistente.');
    const validQuestion = validateAiQuestion(question);
    const selectedAttachments = parseAiAttachments(attachments);
    if (signal?.aborted) throw new Error('La consulta fue cancelada.');
    if (!endpoint?.trim()) return selectedAttachments.length
      ? { source: 'demo', text: 'Los archivos están adjuntos, pero el modo demostración no puede leerlos. Conecta el servicio de Klini IA para consultar su contenido.' }
      : answerKliniAiDemo(validQuestion, state);
    const url = validateKliniAiEndpoint(endpoint.trim(), development, lanHost);
    const token = developmentToken?.trim();
    if (lanHost && new URL(url).hostname === lanHost && (!token || !/^[A-Za-z0-9_-]{32,256}$/.test(token))) throw new Error('La conexión de Klini IA cambió. Vuelve a abrir el proyecto en Expo Go.');
    const selectedHistory = selectKliniAiHistory(validQuestion, history.slice(-8));
    const context = selectKliniAiContext(validQuestion, selectedHistory, buildKliniAiSelectionContext(state));
    const controller = new AbortController();
    let timedOut = false;
    const cancel = () => controller.abort();
    signal?.addEventListener('abort', cancel);
    if (signal?.aborted) cancel();
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    try {
      const prepared = shouldReadKliniAiRecordFiles(validQuestion, selectedHistory)
        ? await prepareKliniAiRecordAttachments({ state, context, attachments: selectedAttachments, reader: readRecordAttachment, signal: controller.signal })
        : { attachments: selectedAttachments, recordFiles: [] };
      if (controller.signal.aborted) throw new Error('La consulta fue cancelada.');
      if (prepared.recordFiles.length && !prepared.recordFiles.some(file => file.status === 'included') && !selectedAttachments.length) {
        throw new Error(prepared.recordFiles.some(file => file.status === 'limit')
          ? 'No se pudieron revisar los archivos originales porque superan los límites de lectura. Reduce su tamaño o consulta menos documentos; el texto manual no sustituye los originales.'
          : 'No se pudieron abrir los archivos originales de los registros solicitados. Vuelve a adjuntarlos para poder revisarlos; el texto manual no sustituye los originales.');
      }
      const request = parseKliniAiRequest({ question: validQuestion, context, history: selectedHistory.map(message => ({ role: message.role, text: message.text })), ...(prepared.attachments.length && { attachments: prepared.attachments }), ...(prepared.recordFiles.length && { recordFiles: prepared.recordFiles }) });
      const response = await fetchImpl(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(development && token && { 'X-Klini-Dev-Token': token }) }, body: JSON.stringify(request), signal: controller.signal, redirect: 'error' });
      if (!response.ok) {
        let code: unknown;
        try { code = (await response.json() as { code?: unknown }).code; } catch { /* Do not reflect upstream bodies. */ }
        throw new Error(code === 'web_search_unavailable' ? 'No pudimos verificar la información en internet. Reintenta tu consulta.' : response.status === 401 ? 'La conexión de Klini IA cambió. Vuelve a abrir el proyecto en Expo Go.' : response.status === 503 ? 'El servicio de IA aún no está configurado en el servidor.' : response.status === 429 ? 'El asistente está atendiendo otra consulta. Intenta nuevamente.' : 'No se pudo consultar el asistente. Intenta nuevamente.');
      }
      if (Number(response.headers.get('content-length')) > 50000) throw new Error('El asistente devolvió una respuesta demasiado grande.');
      const text = await response.text();
      if (text.length > 50000) throw new Error('El asistente devolvió una respuesta demasiado grande.');
      let result: unknown;
      try { result = JSON.parse(text); } catch { throw new Error('El asistente no devolvió una respuesta válida.'); }
      return { ...parseKliniAiAnswer(result, context), source: 'openai' };
    } catch (cause) {
      if (controller.signal.aborted) throw new Error(timedOut ? 'La consulta tardó demasiado. Intenta nuevamente.' : 'La consulta fue cancelada.');
      if (cause instanceof TypeError || (cause instanceof Error && /^(?:fetch failed(?::.*)?|Network request failed|Could not connect to the server\.?|Failed to fetch)$/i.test(cause.message))) throw new Error('No se pudo conectar con el servicio de IA. Mantén el iPhone y la computadora en la misma red Wi-Fi y vuelve a intentar.');
      throw cause;
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
  };
}
