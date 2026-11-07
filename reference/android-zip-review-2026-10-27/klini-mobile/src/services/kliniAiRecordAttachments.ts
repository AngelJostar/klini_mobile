import type { Attachment, AppState } from '../domain/types';
import type { AiRecordFile, KliniAiContext } from '../domain/kliniAi';
import { AI_REQUEST_ATTACHMENT_MAX_COUNT, AI_ATTACHMENTS_MAX_BYTES, AiAttachmentLimitError, isLocalAiRecordUri, parseAiAttachments, type AiAttachment } from '../domain/kliniAiAttachments';

export type ReadAiRecordAttachment = (attachment: Attachment, signal?: AbortSignal) => Promise<AiAttachment>;

/** Native base64 reads cannot be interrupted, but cancellation must prevent transport. */
async function readWithCancellation(reader: ReadAiRecordAttachment, attachment: Attachment, signal: AbortSignal): Promise<AiAttachment> {
  if (signal.aborted) throw new Error('La consulta fue cancelada.');
  return new Promise((resolve, reject) => {
    const cancel = () => reject(new Error('La consulta fue cancelada.'));
    signal.addEventListener('abort', cancel, { once: true });
    Promise.resolve().then(() => {
      if (signal.aborted) throw new Error('La consulta fue cancelada.');
      return reader(attachment, signal);
    }).then(resolve, reject).finally(() => signal.removeEventListener('abort', cancel));
  });
}

const bytes = (attachment: AiAttachment) => {
  const encoded = attachment.dataUri.slice(attachment.dataUri.indexOf(',') + 1);
  return encoded.length / 4 * 3 - (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0);
};

/** Only IDs already selected for this question can cause active-profile file reads. */
export async function prepareKliniAiRecordAttachments({ state, context, attachments, reader, signal }: {
  state: AppState; context: KliniAiContext; attachments: AiAttachment[]; reader?: ReadAiRecordAttachment; signal: AbortSignal;
}): Promise<{ attachments: AiAttachment[]; recordFiles: AiRecordFile[] }> {
  const merged = [...attachments];
  const recordFiles: AiRecordFile[] = [];
  const seen = new Map<string, Omit<AiRecordFile, 'recordId'>>();
  let totalBytes = merged.reduce((sum, attachment) => sum + bytes(attachment), 0);
  for (const selected of context.records) {
    if (signal.aborted) throw new Error('La consulta fue cancelada.');
    const attachment = state.records.find(record => record.id === selected.id)?.attachment;
    if (!attachment) continue;
    const previous = seen.get(attachment.uri);
    if (previous) { recordFiles.push({ recordId: selected.id, ...previous }); continue; }
    let result: Omit<AiRecordFile, 'recordId'>;
    if (merged.length >= AI_REQUEST_ATTACHMENT_MAX_COUNT || totalBytes >= AI_ATTACHMENTS_MAX_BYTES) result = { status: 'limit' };
    else if (!reader || !isLocalAiRecordUri(attachment.uri)) result = { status: 'unavailable' };
    else {
      try {
        const prepared = parseAiAttachments([await readWithCancellation(reader, attachment, signal)])[0];
        const size = bytes(prepared);
        if (totalBytes + size > AI_ATTACHMENTS_MAX_BYTES) result = { status: 'limit' };
        else {
          let id = prepared.id;
          let suffix = 0;
          while (merged.some(item => item.id === id)) id = `${prepared.id.slice(0, 94)}-r${++suffix}`;
          merged.push({ ...prepared, id });
          totalBytes += size;
          result = { status: 'included', attachmentId: id };
        }
      } catch (cause) {
        if (signal.aborted) throw new Error('La consulta fue cancelada.');
        result = { status: cause instanceof AiAttachmentLimitError ? 'limit' : 'unavailable' };
      }
    }
    seen.set(attachment.uri, result);
    recordFiles.push({ recordId: selected.id, ...result });
  }
  return { attachments: merged, recordFiles };
}
