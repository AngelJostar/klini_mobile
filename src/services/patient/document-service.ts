import { fetch } from 'expo/fetch';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { env } from '@/config/env';
import { ApiError, getApiAccessToken } from '@/services/api/client';

export async function openPatientDocument(id: number, name: string, mimeType?: string | null) {
  const token = getApiAccessToken();
  if (!token) throw new ApiError('Tu sesión terminó. Inicia sesión nuevamente.', 'unauthenticated', 401);
  const safeName = `${id}-${name}`.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  const file = new File(Paths.cache, safeName || `documento-${id}`);
  try {
    const response = await fetch(`${env.apiUrl}/patient/documents/${id}/download`, { headers: { Authorization: `Bearer ${token}`, Accept: mimeType ?? '*/*' } });
    if (!response.ok) throw new ApiError(response.status === 404 ? 'El archivo ya no está disponible.' : 'No pudimos descargar el documento.', 'document_download_failed', response.status);
    file.create({ overwrite: true });
    file.write(await response.bytes());
    if (!(await Sharing.isAvailableAsync())) throw new Error('No hay una aplicación disponible para abrir este archivo.');
    await Sharing.shareAsync(file.uri, { mimeType: mimeType ?? undefined, dialogTitle: 'Abrir documento clínico' });
  } finally {
    if (file.exists) file.delete();
  }
}
