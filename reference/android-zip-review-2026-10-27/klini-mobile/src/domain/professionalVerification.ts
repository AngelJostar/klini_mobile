import type { Attachment } from './types';

export const PROFESSIONAL_IDENTITY_CONSENT_VERSION = 'professional-identity-v1' as const;
export const PROFESSIONAL_VERIFICATION_MAX_DATA_BYTES = 2 * 1024 * 1024;

/** A local submission for review. It never grants a verified role or clinical permissions. */
export interface ProfessionalVerification {
  mode: 'local-demo';
  status: 'pending';
  submittedAt: string;
  consentedAt: string;
  consentVersion: typeof PROFESSIONAL_IDENTITY_CONSENT_VERSION;
  challenge: string;
  video: Attachment;
  durationSeconds: number;
}
export type ProfessionalVerificationInput = Pick<ProfessionalVerification, 'video' | 'durationSeconds' | 'consentedAt' | 'challenge'>;

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const timestamp = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
};
const videoExtensions: Record<string, string> = { 'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov' };
const verificationKeys = ['mode', 'status', 'submittedAt', 'consentedAt', 'consentVersion', 'challenge', 'video', 'durationSeconds'];

function isLocalVideo(value: unknown): value is Attachment {
  if (!object(value) || Object.keys(value).some(key => !['uri', 'name', 'mimeType'].includes(key)) || typeof value.uri !== 'string' || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 180 || /[\u0000-\u001f\u007f/\\]/.test(value.name) || typeof value.mimeType !== 'string') return false;
  const extension = videoExtensions[value.mimeType];
  if (!extension || !value.name.toLowerCase().endsWith(extension)) return false;
  if (value.uri.startsWith('data:')) {
    const prefix = `data:${value.mimeType};base64,`;
    if (!value.uri.startsWith(prefix) || value.uri.length > prefix.length + Math.ceil(PROFESSIONAL_VERIFICATION_MAX_DATA_BYTES / 3) * 4) return false;
    const encoded = value.uri.slice(prefix.length);
    if (!encoded || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) return false;
    const padding = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0;
    return encoded.length * 3 / 4 - padding <= PROFESSIONAL_VERIFICATION_MAX_DATA_BYTES;
  }
  if (!value.uri.startsWith('file:///') || value.uri.length > 4096 || /[\u0000-\u0020\u007f\\]/.test(value.uri)) return false;
  try {
    const uri = new URL(value.uri);
    const path = decodeURIComponent(uri.pathname);
    return uri.protocol === 'file:' && !uri.hostname && !uri.username && !uri.password && !uri.search && !uri.hash && path.startsWith('/') && !path.startsWith('//') && path.length > 1 && !/[\u0000-\u001f\u007f\\]/.test(path);
  } catch { return false; }
}

export function isProfessionalVerification(value: unknown, now: number = Date.now()): value is ProfessionalVerification {
  return object(value) && Object.keys(value).every(key => verificationKeys.includes(key)) &&
    value.mode === 'local-demo' && value.status === 'pending' && value.consentVersion === PROFESSIONAL_IDENTITY_CONSENT_VERSION &&
    timestamp(value.submittedAt) && timestamp(value.consentedAt) && Date.parse(value.consentedAt) <= Date.parse(value.submittedAt) && Date.parse(value.submittedAt) <= now &&
    typeof value.challenge === 'string' && /^\d{4}$/.test(value.challenge) && isLocalVideo(value.video) &&
    typeof value.durationSeconds === 'number' && Number.isFinite(value.durationSeconds) && value.durationSeconds >= 2 && value.durationSeconds <= 20;
}

export function createProfessionalVerification(input: ProfessionalVerificationInput, now: number = Date.now()): ProfessionalVerification {
  if (!Number.isFinite(now)) throw new Error('No se pudo registrar la fecha de envío.');
  const verification: ProfessionalVerification = {
    mode: 'local-demo', status: 'pending', submittedAt: new Date(now).toISOString(),
    consentedAt: input.consentedAt, consentVersion: PROFESSIONAL_IDENTITY_CONSENT_VERSION,
    challenge: input.challenge, video: { ...input.video }, durationSeconds: input.durationSeconds,
  };
  if (!isProfessionalVerification(verification, now)) throw new Error('Revisa el consentimiento y graba un video local de entre 2 y 20 segundos.');
  return verification;
}
