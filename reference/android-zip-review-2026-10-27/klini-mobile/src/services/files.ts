import { shareClinicalRecordWith, shareMedicationWith } from './clinicalRecordShareWorkflow';
import { Platform, Share } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { Appointment, Attachment, Doctor, ClinicalRecord, Medication } from "../domain/types";
import { localDateTime } from "../domain/dates";

export async function savePhotoAttachment(uri: string): Promise<Attachment> {
  const capturedAt = Date.now();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    if (blob.size > 2 * 1024 * 1024) throw new Error('La foto supera 2 MB. Repite la captura.');
    const mimeType = blob.type || 'image/jpeg';
    const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const savedUri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('No se pudo conservar la foto.'));
      reader.readAsDataURL(blob);
    });
    return { uri: savedUri, name: `Foto-${capturedAt}.${extension}`, mimeType };
  }
  const name = `Foto-${capturedAt}.jpg`;
  const source = new File(uri);
  if (source.size > 2 * 1024 * 1024) throw new Error('La foto supera 2 MB. Repite la captura.');
  const dir = new Directory(Paths.document, 'attachments');
  dir.create({ idempotent: true, intermediates: true });
  const destination = new File(dir, name);
  await source.copy(destination);
  return { uri: destination.uri, name, mimeType: 'image/jpeg' };
}

export async function pickAttachment(mode: "file" | "photo" = "file"): Promise<Attachment | null> {
  const result = await DocumentPicker.getDocumentAsync({
    // Android's picker cache can sit outside the Expo Go experience sandbox.
    // Keep the granted content URI and copy it into our own documents below.
    copyToCacheDirectory: Platform.OS !== "android",
    multiple: false,
    type: mode === "photo" ? "image/*" : ["application/pdf", "image/*", "text/plain"],
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if ((asset.size || 0) > 2 * 1024 * 1024)
    throw new Error("Selecciona un archivo de hasta 2 MB.");
  const mimeType = asset.mimeType || "application/octet-stream";
  if (Platform.OS === "web") {
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    if (blob.size > 2 * 1024 * 1024)
      throw new Error("Selecciona un archivo de hasta 2 MB.");
    const uri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
      reader.readAsDataURL(blob);
    });
    return { uri, name: asset.name, mimeType };
  }
  const dir = new Directory(Paths.document, "attachments");
  dir.create({ idempotent: true, intermediates: true });
  const safeName = asset.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const file = new File(
    dir,
    `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safeName}`,
  );
  try {
    await new File(asset.uri).copy(file);
    // Providers may omit the original size; validate the completed private copy.
    if (file.size > 2 * 1024 * 1024)
      throw new Error("Selecciona un archivo de hasta 2 MB.");
  } catch (error) {
    // Only remove the destination created for this attempt, never the original.
    try { if (file.exists) file.delete(); } catch { /* Preserve the copy error. */ }
    throw error;
  }
  return { uri: file.uri, name: asset.name, mimeType };
}
export async function openAttachment(a: Attachment): Promise<void> {
  if (Platform.OS === "web") {
    // A blob URL can display PDFs/images without navigating away from the app.
    const blob = await (await fetch(a.uri)).blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = a.name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return;
  }
  if (!new File(a.uri).exists)
    throw new Error(
      "El archivo ya no está en este dispositivo. Vuelve a adjuntarlo.",
    );
  if (!(await Sharing.isAvailableAsync()))
    throw new Error(
      "No hay una aplicación disponible para compartir archivos.",
    );
  await Sharing.shareAsync(a.uri, {
    mimeType: a.mimeType,
    dialogTitle: `Abrir o compartir ${a.name}`,
  });
}
export async function exportText(
  filename: string,
  text: string,
  mimeType = "text/plain",
): Promise<void> {
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return;
  }
  const file = new File(Paths.cache, filename.replace(/[^a-zA-Z0-9._-]/g, "_"));
  file.create({ overwrite: true });
  file.write(text);
  if (!(await Sharing.isAvailableAsync()))
    throw new Error(
      "No está disponible la opción de compartir en este dispositivo.",
    );
  await Sharing.shareAsync(file.uri, {
    mimeType,
    dialogTitle: filename,
    UTI: mimeType === "text/calendar" ? "com.apple.ical.ics" : "public.text",
  });
}
/** Clinical records use the system sheet directly, like body-parameter exports. */
export async function shareClinicalRecord(record: ClinicalRecord, patientName: string): Promise<void> {
  return shareClinicalRecordWith(record, patientName, {
    text: (filename, content) => exportText(filename, content),
    attachment: async (attachment, content, title) => {
      // Never fetch remote URLs or silently send a summary when the selected original is missing.
      if (!/^(file:|content:|data:|blob:)/i.test(attachment.uri)) throw new Error('El adjunto no es un archivo local. Vuelve a adjuntarlo antes de compartir.');
      if (Platform.OS === 'ios') {
        if (!attachment.uri.startsWith('file:') || !new File(attachment.uri).exists) throw new Error('El archivo ya no está en este iPhone. Vuelve a adjuntarlo.');
        // RN presents UIActivityViewController with text + the unchanged original file.
        // Dismissing resolves normally; opening the sheet never means the item was sent.
        await Share.share({ title, message: content, url: attachment.uri }, { subject: title });
      } else {
        await openAttachment(attachment);
      }
    },
  });
}

export async function shareMedication(medication: Medication, patientName: string): Promise<void> {
  return shareMedicationWith(medication, patientName, (filename, content) => exportText(filename, content));
}

function escapeICS(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}
function stamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}
export function calendarContent(
  appointment: Appointment,
  doctor: Doctor,
): string {
  const start = localDateTime(appointment.date, appointment.time);
  const end = new Date(start.getTime() + 30 * 60000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Klini//Agenda local//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${appointment.id}@klini.local`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escapeICS("Consulta · " + doctor.name)}`,
    `LOCATION:${escapeICS(appointment.mode === "Teleconsulta" ? "Teleconsulta" : doctor.address)}`,
    `DESCRIPTION:${escapeICS("Cita registrada localmente en Klini. Confirma la reserva con tu consultorio.")}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
export async function exportCalendar(
  appointment: Appointment,
  doctor: Doctor,
): Promise<void> {
  return exportText(
    `Klini-cita-${appointment.date}.ics`,
    calendarContent(appointment, doctor),
    "text/calendar",
  );
}
