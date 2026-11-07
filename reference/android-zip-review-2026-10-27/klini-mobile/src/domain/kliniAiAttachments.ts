export const AI_ATTACHMENT_MAX_COUNT = 3;
// Explicit chat picks stay at three; selected chart originals have their own slots.
export const AI_REQUEST_ATTACHMENT_MAX_COUNT = 23;
export const AI_ATTACHMENT_MAX_BYTES = 2 * 1024 * 1024;
export const AI_ATTACHMENTS_MAX_BYTES = 4 * 1024 * 1024;
export const AI_TEXT_ATTACHMENT_MAX_BYTES = 100 * 1024;
export const AI_ATTACHMENT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'] as const;
export type AiAttachmentMimeType = typeof AI_ATTACHMENT_MIME_TYPES[number];
export interface AiAttachment { id: string; name: string; mimeType: AiAttachmentMimeType; dataUri: string }
export class AiAttachmentLimitError extends Error {}

/** Saved chart files are local assets, never URLs to fetch from a restored chart. */
export function isLocalAiRecordUri(value: unknown): value is string {
  return typeof value === 'string' && !/[\s\u0000-\u001F\u007F]/.test(value)
    && /^(?:file:\/\/\/|content:\/\/|blob:|data:(?:image\/(?:jpeg|png|webp)|application\/pdf|text\/plain);base64,)/i.test(value);
}

const invalid = () => new Error('El archivo adjunto no es válido. Usa una imagen JPG, PNG o WebP, un PDF o un archivo TXT.');
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const base64Value = (code: number): number => code >= 65 && code <= 90 ? code - 65 : code >= 97 && code <= 122 ? code - 71 : code >= 48 && code <= 57 ? code + 4 : code === 43 ? 62 : code === 47 ? 63 : -1;

/** Portable byte access: neither browser/RN Buffer nor an atob polyfill is needed. */
function base64Bytes(value: string): { length: number; at: (index: number) => number } {
  if (!value.length || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw invalid();
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  if ((padding === 2 && (base64Value(value.charCodeAt(value.length - 3)) & 15) !== 0) || (padding === 1 && (base64Value(value.charCodeAt(value.length - 2)) & 3) !== 0)) throw invalid();
  const length = value.length / 4 * 3 - padding;
  if (length > AI_ATTACHMENT_MAX_BYTES) throw new AiAttachmentLimitError('Cada archivo puede pesar hasta 2 MB.');
  const at = (index: number): number => {
    const offset = Math.floor(index / 3) * 4;
    const a = base64Value(value.charCodeAt(offset)), b = base64Value(value.charCodeAt(offset + 1));
    const c = base64Value(value.charCodeAt(offset + 2)), d = base64Value(value.charCodeAt(offset + 3));
    return index % 3 === 0 ? (a << 2) | (b >> 4) : index % 3 === 1 ? ((b & 15) << 4) | (c >> 2) : ((c & 3) << 6) | d;
  };
  return { length, at };
}

/** Reject malformed UTF-8, binary controls and overlong/surrogate code points. */
function safeUtf8(bytes: ReturnType<typeof base64Bytes>): boolean {
  for (let index = 0; index < bytes.length; index++) {
    const first = bytes.at(index);
    if (first < 0x80) {
      if ((first < 32 && first !== 9 && first !== 10 && first !== 13) || first === 127) return false;
      continue;
    }
    const count = first >= 0xC2 && first <= 0xDF ? 1 : first >= 0xE0 && first <= 0xEF ? 2 : first >= 0xF0 && first <= 0xF4 ? 3 : 0;
    if (!count || index + count >= bytes.length) return false;
    const second = bytes.at(index + 1);
    if ((first === 0xE0 && second < 0xA0) || (first === 0xED && second > 0x9F) || (first === 0xF0 && second < 0x90) || (first === 0xF4 && second > 0x8F)) return false;
    for (let next = 1; next <= count; next++) if (bytes.at(index + next) < 0x80 || bytes.at(index + next) > 0xBF) return false;
    index += count;
  }
  return true;
}

function hasSignature(mimeType: AiAttachmentMimeType, bytes: ReturnType<typeof base64Bytes>): boolean {
  const starts = (signature: number[]) => bytes.length >= signature.length && signature.every((byte, index) => bytes.at(index) === byte);
  if (mimeType === 'image/jpeg') return starts([0xFF, 0xD8, 0xFF]);
  if (mimeType === 'image/png') return starts([137, 80, 78, 71, 13, 10, 26, 10]);
  if (mimeType === 'image/webp') return starts([82, 73, 70, 70]) && bytes.length >= 12 && [87, 69, 66, 80].every((byte, index) => bytes.at(index + 8) === byte);
  if (mimeType === 'application/pdf') return starts([37, 80, 68, 70, 45]);
  return safeUtf8(bytes);
}

/** Validate both client selections and the untrusted server wire payload. */
export function parseAiAttachments(value: unknown, { maxCount = AI_ATTACHMENT_MAX_COUNT }: { maxCount?: number } = {}): AiAttachment[] {
  if (!Number.isInteger(maxCount) || maxCount < 1 || maxCount > AI_REQUEST_ATTACHMENT_MAX_COUNT) throw invalid();
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw invalid();
  if (value.length > maxCount) throw new AiAttachmentLimitError(maxCount === AI_ATTACHMENT_MAX_COUNT ? 'Puedes adjuntar hasta 3 archivos por mensaje.' : 'La consulta contiene demasiados archivos originales.');
  const ids = new Set<string>();
  let totalBytes = 0;
  return value.map(entry => {
    const candidate = object(entry);
    if (typeof candidate.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(candidate.id) || ids.has(candidate.id)
      || typeof candidate.name !== 'string' || !candidate.name.trim() || candidate.name.length > 160 || /[\\/\u0000-\u001F\u007F]/.test(candidate.name)
      || !AI_ATTACHMENT_MIME_TYPES.includes(candidate.mimeType as AiAttachmentMimeType) || typeof candidate.dataUri !== 'string') throw invalid();
    const mimeType = candidate.mimeType as AiAttachmentMimeType;
    const prefix = `data:${mimeType};base64,`;
    if (!candidate.dataUri.startsWith(prefix)) throw invalid();
    if (candidate.dataUri.length > prefix.length + Math.ceil(AI_ATTACHMENT_MAX_BYTES / 3) * 4) throw new AiAttachmentLimitError('Cada archivo puede pesar hasta 2 MB.');
    const bytes = base64Bytes(candidate.dataUri.slice(prefix.length));
    if (!bytes.length) throw invalid();
    if (mimeType === 'text/plain' && bytes.length > AI_TEXT_ATTACHMENT_MAX_BYTES) throw new AiAttachmentLimitError('Los archivos TXT pueden pesar hasta 100 KB. Divide el contenido en archivos más pequeños.');
    if (!hasSignature(mimeType, bytes)) throw invalid();
    totalBytes += bytes.length;
    if (totalBytes > AI_ATTACHMENTS_MAX_BYTES) throw new AiAttachmentLimitError('Los archivos de un mensaje pueden pesar hasta 4 MB en total.');
    ids.add(candidate.id);
    return { id: candidate.id, name: candidate.name.trim(), mimeType, dataUri: candidate.dataUri };
  });
}
