import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Preserve the portal's existing Blob-based calendar download on mobile.
export const portalCalendarBridge = `
(function () {
  if (window.__kliniCalendarBridge) return;
  window.__kliniCalendarBridge = true;
  const blobs = new Map();
  const create = URL.createObjectURL.bind(URL);
  const revoke = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = function (blob) {
    const url = create(blob);
    blobs.set(url, blob);
    return url;
  };
  URL.revokeObjectURL = function (url) { blobs.delete(url); revoke(url); };
  document.addEventListener('click', function (event) {
    const link = event.target.closest && event.target.closest('a[download]');
    if (!link || !link.download.endsWith('.ics')) return;
    const blob = blobs.get(link.href);
    if (!blob || !blob.type.startsWith('text/calendar') || blob.size > 1048576) return;
    event.preventDefault();
    const reader = new FileReader();
    reader.onload = function () {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'klini.calendar', base64: String(reader.result).split(',')[1]
      }));
    };
    reader.readAsDataURL(blob);
  }, true);
})(); true;
`;

export async function sharePortalCalendar(message: string) {
  const data = JSON.parse(message) as { type?: string; base64?: unknown };
  if (data.type !== 'klini.calendar' || typeof data.base64 !== 'string') return;
  if (data.base64.length > 1_400_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data.base64)) return;
  if (!(await Sharing.isAvailableAsync())) throw new Error('No hay una aplicación para abrir el calendario.');
  const file = new File(Paths.cache, `cita-medica-${Date.now()}.ics`);
  try {
    file.create();
    file.write(data.base64, { encoding: 'base64' });
    await Sharing.shareAsync(file.uri, { mimeType: 'text/calendar', UTI: 'com.apple.ical.ics', dialogTitle: 'Guardar cita en calendario' });
  } finally {
    if (file.exists) file.delete();
  }
}
