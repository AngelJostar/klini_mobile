export const PROFESSIONAL_IDENTITY_MIN_SECONDS = 2;
export const PROFESSIONAL_IDENTITY_MAX_SECONDS = 20;
export const PROFESSIONAL_IDENTITY_WEB_MAX_BYTES = 2 * 1024 * 1024;
export const PROFESSIONAL_IDENTITY_NATIVE_MAX_BYTES = 15 * 1024 * 1024;

export function professionalVideoMime(value: string): 'video/mp4' | 'video/webm' | 'video/quicktime' {
  const mime = value.split(';')[0].trim().toLowerCase();
  if (mime !== 'video/mp4' && mime !== 'video/webm' && mime !== 'video/quicktime') throw new Error('La grabación debe ser un video compatible.');
  return mime;
}

export function isProfessionalWebVideoSource(uri: string, origin: string): boolean {
  if (/^data:video\/(?:mp4|webm|quicktime)(?:;[^,]*)?;base64,[A-Za-z0-9+/]+={0,2}$/i.test(uri)) return true;
  try { return uri.startsWith('blob:') && new URL(uri).origin === origin && origin !== 'null'; }
  catch { return false; }
}

/** A direct child with our generated basename only. No decoding or traversal is permitted. */
export function isOwnedProfessionalIdentityVideo(uri: string, directoryUri: string): boolean {
  if (!/^file:\/\/\//.test(uri) || !/^file:\/\/\//.test(directoryUri)) return false;
  const prefix = `${directoryUri.replace(/\/+$/, '')}/`;
  return uri.startsWith(prefix) && /^Professional-identity-\d+-[a-z0-9]{8,12}\.(?:mp4|webm|mov)$/.test(uri.slice(prefix.length));
}

/** Camera cache cleanup is restricted to Expo's UUID-named clips, never documents/photos. */
export function isOwnedProfessionalIdentityCapture(uri: string, cacheUri: string): boolean {
  if (!/^file:\/\/\//.test(uri) || !/^file:\/\/\//.test(cacheUri)) return false;
  const prefix = `${cacheUri.replace(/\/+$/, '')}/Camera/`;
  return uri.startsWith(prefix) && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(?:mp4|mov|webm)$/i.test(uri.slice(prefix.length));
}
