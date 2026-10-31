import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import type { Attachment } from '../domain/types';

export async function saveInsuranceAcceptanceVideo(uri: string, mimeType: string): Promise<Attachment> {
  if (!/^video\/(mp4|webm|quicktime)(?:;.*)?$/i.test(mimeType)) throw new Error('La grabación debe ser un video compatible.');
  const extension = mimeType.includes('webm') ? 'webm' : mimeType.includes('quicktime') ? 'mov' : 'mp4';
  const name = `Aceptacion-demo-${Date.now()}.${extension}`;
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) throw new Error('No se pudo leer la grabación. Intenta de nuevo.');
    const blob = await response.blob();
    if (!blob.size || blob.size > 2 * 1024 * 1024) throw new Error('Graba un video corto, de hasta 2 MB, para conservarlo en esta demo.');
    const savedUri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('No se pudo conservar la grabación.'));
      reader.readAsDataURL(blob);
    });
    return { uri: savedUri, name, mimeType };
  }
  const source = new File(uri);
  if (!source.exists || !source.size) throw new Error('No se encontró la grabación. Intenta de nuevo.');
  if (source.size > 15 * 1024 * 1024) throw new Error('El video supera 15 MB. Repite la grabación con un mensaje corto.');
  const directory = new Directory(Paths.document, 'insurance-acceptance');
  directory.create({ idempotent: true, intermediates: true });
  const destination = new File(directory, name);
  source.copy(destination);
  return { uri: destination.uri, name, mimeType };
}
