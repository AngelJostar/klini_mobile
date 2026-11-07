import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { File as LocalFile } from 'expo-file-system';
import { AI_ATTACHMENT_MAX_BYTES, AiAttachmentLimitError, isLocalAiRecordUri, parseAiAttachments, type AiAttachment } from '../domain/kliniAiAttachments';
import type { Attachment } from '../domain/types';

const readError = () => new Error('No se pudo leer el archivo. Vuelve a seleccionarlo.');
const unsupportedError = () => new Error('Usa una imagen JPG, PNG o WEBP, un PDF o un archivo TXT.');
const supportedFiles = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'];

function checkSize(size: number): void {
  if (!Number.isSafeInteger(size) || size <= 0) throw new Error('El archivo está vacío o no se puede leer.');
  if (size > AI_ATTACHMENT_MAX_BYTES) throw new AiAttachmentLimitError('Selecciona un archivo de hasta 2 MB.');
}

async function readLocalBase64(uri: string, pickedFile?: Blob): Promise<string> {
  if (Platform.OS === 'web') {
    let blob: Blob;
    try {
      if (pickedFile) blob = pickedFile;
      else {
        const response = await fetch(uri);
        if (!response.ok) throw readError();
        blob = await response.blob();
      }
    } catch { throw readError(); }
    checkSize(blob.size);
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(readError());
      reader.onabort = () => reject(readError());
      reader.onload = () => {
        const encoded = typeof reader.result === 'string' ? reader.result.match(/^data:[^,]*;base64,([A-Za-z0-9+/=]+)$/)?.[1] : undefined;
        if (!encoded) reject(readError());
        else resolve(encoded);
      };
      try { reader.readAsDataURL(blob); } catch { reject(readError()); }
    });
  }
  let file: LocalFile;
  let size: number;
  try {
    file = new LocalFile(uri);
    if (!file.exists) throw readError();
    size = file.size;
  } catch { throw readError(); }
  checkSize(size);
  try { return await file.base64(); } catch { throw readError(); }
}

/** Inspect a small decoded header without depending on Node Buffer on native. */
function headerBytes(base64: string): number[] {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const character of base64.slice(0, 48)) {
    const value = alphabet.indexOf(character);
    if (value < 0) break;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) { bits -= 8; bytes.push((buffer >> bits) & 255); }
  }
  return bytes;
}

function actualMime(base64: string, name: string, hint: string | undefined, imageOnly: boolean): AiAttachment['mimeType'] {
  const bytes = headerBytes(base64);
  const ascii = String.fromCharCode(...bytes);
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return 'image/png';
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') return 'image/webp';
  if (ascii.startsWith('%PDF-')) {
    if (imageOnly) throw unsupportedError();
    return 'application/pdf';
  }
  if ((ascii.slice(4, 8) === 'ftyp' && /heic|heif|mif1|msf1|hevc|hevx/.test(ascii.slice(8))) || /\.(?:heic|heif)$/i.test(name) || /image\/(?:heic|heif)/i.test(hint || '')) throw new Error('La imagen está en formato HEIC. Conviértela a JPG o PNG y vuelve a adjuntarla.');
  if (imageOnly) throw unsupportedError();
  if (hint === 'text/plain' || /\.txt$/i.test(name)) return 'text/plain';
  throw unsupportedError();
}

function validatedAttachment(base64: string, name: string, hint?: string, imageOnly = false): AiAttachment {
  const mimeType = actualMime(base64, name, hint, imageOnly);
  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf', 'text/plain': 'txt' }[mimeType];
  const stem = name.replace(/[\u0000-\u001F\u007F/\\]/g, '_').replace(/\.[a-z0-9]{1,10}$/i, '').trim().slice(0, 145) || 'Adjunto';
  const candidate: AiAttachment = {
    id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name: `${stem}.${extension}`,
    mimeType,
    dataUri: `data:${mimeType};base64,${base64}`,
  };
  return parseAiAttachments([candidate])[0];
}

/** Read a camera cache URI for this conversation without persisting it in Archivo. */
export async function prepareAiPhotoAttachment(uri: string): Promise<AiAttachment> {
  const base64 = await readLocalBase64(uri);
  return validatedAttachment(base64, `Foto-${Date.now()}.jpg`, undefined, true);
}

/** Reuse the saved original; do not ask the user to pick an already stored study. */
export async function prepareAiRecordAttachment(attachment: Attachment, signal?: AbortSignal): Promise<AiAttachment> {
  if (signal?.aborted) throw new Error('La consulta fue cancelada.');
  if (!isLocalAiRecordUri(attachment.uri)
    || (Platform.OS === 'web' ? !/^(?:data:|blob:)/i.test(attachment.uri) : !/^(?:file:\/\/\/|content:\/\/)/i.test(attachment.uri))) throw readError();
  const base64 = await readLocalBase64(attachment.uri);
  if (signal?.aborted) throw new Error('La consulta fue cancelada.');
  return validatedAttachment(base64, attachment.name, attachment.mimeType);
}

/** System pickers return one ephemeral attachment; the chat owns total/count limits. */
export async function pickAiAttachment(mode: 'photos' | 'files'): Promise<AiAttachment | null> {
  if (mode === 'photos') {
    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsMultipleSelection: false, allowsEditing: false,
        base64: false, quality: .7, exif: false,
      });
    } catch { throw new Error('No se pudieron abrir tus fotos. Revisa los permisos y vuelve a intentarlo.'); }
    if (result.canceled) return null;
    const asset = result.assets[0];
    if (!asset?.uri) throw readError();
    const base64 = await readLocalBase64(asset.uri, asset.file);
    return validatedAttachment(base64, asset.fileName || `Foto-${Date.now()}.jpg`, asset.mimeType, true);
  }
  let result: DocumentPicker.DocumentPickerResult;
  try {
    result = await DocumentPicker.getDocumentAsync({ type: supportedFiles, multiple: false, copyToCacheDirectory: true, base64: false });
  } catch { throw new Error('No se pudo abrir el selector de archivos. Vuelve a intentarlo.'); }
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset?.uri) throw readError();
  const base64 = await readLocalBase64(asset.uri, asset.file);
  return validatedAttachment(base64, asset.name, asset.mimeType);
}
