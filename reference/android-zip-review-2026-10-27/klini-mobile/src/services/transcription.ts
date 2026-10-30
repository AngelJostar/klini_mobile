import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { validateTranscription, type Transcription } from '../domain/transcription';

export async function transcribePhoto(uri: string, signal: AbortSignal): Promise<Transcription> {
  const endpoint = process.env.EXPO_PUBLIC_OCR_URL;
  if (!endpoint) throw new Error('La transcripción está pendiente de activar. Configura el servicio de reconocimiento. Puedes continuar con Usar foto.');
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal.addEventListener('abort', cancel);
  if (signal.aborted) cancel();
  const timeout = setTimeout(cancel, 45000);
  try {
    let image: string;
    if (Platform.OS === 'web') {
      const blob = await (await fetch(uri, { signal: controller.signal })).blob();
      if (blob.size > 2 * 1024 * 1024) throw new Error('La foto supera 2 MB. Repite la captura.');
      image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = () => reject(new Error('No se pudo leer la foto.'));
        reader.readAsDataURL(blob);
      });
    } else {
      const file = new File(uri);
      if (file.size > 2 * 1024 * 1024) throw new Error('La foto supera 2 MB. Repite la captura.');
      image = await file.base64();
    }
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image }), signal: controller.signal });
    if (!response.ok) throw new Error(response.status === 503 ? 'El servicio de reconocimiento aún no está configurado.' : 'No se pudo transcribir. Intenta nuevamente o usa la foto sin transcribir.');
    return validateTranscription(await response.json());
  } catch (error) {
    if (controller.signal.aborted) throw new Error('La transcripción se interrumpió o tardó demasiado. Intenta nuevamente.');
    throw error;
  } finally { clearTimeout(timeout); signal.removeEventListener('abort', cancel); }
}
