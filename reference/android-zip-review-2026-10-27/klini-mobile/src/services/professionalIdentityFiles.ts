import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import type { Attachment } from '../domain/types';
import {
  isOwnedProfessionalIdentityCapture,
  isOwnedProfessionalIdentityVideo,
  isProfessionalWebVideoSource,
  professionalVideoMime,
  PROFESSIONAL_IDENTITY_NATIVE_MAX_BYTES,
  PROFESSIONAL_IDENTITY_WEB_MAX_BYTES,
} from './professionalIdentityVideoPolicy';

const identityDirectory = () => new Directory(Paths.document, 'professional-identity');

/** Copies an actual locally captured clip; never downloads a URL or transmits media. */
export async function saveProfessionalIdentityVideo(uri: string, mimeType: string): Promise<Attachment> {
  const mime = professionalVideoMime(mimeType);
  const extension = mime === 'video/webm' ? 'webm' : mime === 'video/quicktime' ? 'mov' : 'mp4';
  const suffix = Math.random().toString(36).slice(2, 12).padEnd(8, '0');
  const name = `Professional-identity-${Date.now()}-${suffix}.${extension}`;
  if (Platform.OS === 'web') {
    if (!isProfessionalWebVideoSource(uri, window.location.origin)) throw new Error('La grabación debe proceder de la cámara de esta app.');
    const response = await fetch(uri);
    if (!response.ok) throw new Error('No se pudo leer la grabación. Intenta de nuevo.');
    const source = await response.blob();
    if (!source.size || source.size > PROFESSIONAL_IDENTITY_WEB_MAX_BYTES) throw new Error('Graba un video de hasta 2 MB para conservarlo en este navegador.');
    if (source.type && professionalVideoMime(source.type) !== mime) throw new Error('El formato de la grabación no coincide con el video.');
    const blob = new Blob([source], { type: mime });
    const savedUri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('No se pudo conservar la grabación.'));
      reader.onerror = () => reject(new Error('No se pudo conservar la grabación.'));
      reader.onabort = () => reject(new Error('Se canceló la lectura de la grabación.'));
      reader.readAsDataURL(blob);
    });
    return { uri: savedUri, name, mimeType: mime };
  }
  if (!/^file:\/\/\//.test(uri) || /[?#]/.test(uri)) throw new Error('La grabación debe ser un archivo local de la cámara.');
  const source = new File(uri);
  if (!source.exists || !source.size) throw new Error('No se encontró la grabación. Intenta de nuevo.');
  if (source.size > PROFESSIONAL_IDENTITY_NATIVE_MAX_BYTES) throw new Error('El video supera 15 MB. Repite la grabación con un mensaje corto.');
  const directory = identityDirectory();
  directory.create({ idempotent: true, intermediates: true });
  const destination = new File(directory, name);
  try {
    source.copy(destination);
    if (!destination.exists || !destination.size || destination.size > PROFESSIONAL_IDENTITY_NATIVE_MAX_BYTES) throw new Error('No se pudo conservar el video completo. Repite la grabación.');
    return { uri: destination.uri, name, mimeType: mime };
  } catch (error) {
    try { if (destination.exists) destination.delete(); } catch { /* Keep the original copy failure. */ }
    throw error;
  }
}

/** Deletes only this feature's generated private file; data URLs are released by their owner. */
export async function discardProfessionalIdentityVideo(video: Attachment | string | null | undefined): Promise<void> {
  if (Platform.OS === 'web' || !video) return;
  const uri = typeof video === 'string' ? video : video.uri;
  if (!isOwnedProfessionalIdentityVideo(uri, identityDirectory().uri)) return;
  const file = new File(uri);
  if (file.exists) file.delete();
}

/** Called only for a clip returned by the recorder; never removes arbitrary local files. */
export async function discardProfessionalIdentityCapture(uri: string): Promise<void> {
  if (Platform.OS === 'web' || !isOwnedProfessionalIdentityCapture(uri, Paths.cache.uri)) return;
  const file = new File(uri);
  if (file.exists) file.delete();
}
