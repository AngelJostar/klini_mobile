import { Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { Appointment, Attachment, Doctor } from "../domain/types";
import { localDateTime } from "../domain/dates";

export async function savePhotoAttachment(uri: string): Promise<Attachment> {
  const name = `Foto-${Date.now()}.jpg`;
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    if (blob.size > 2 * 1024 * 1024) throw new Error('La foto supera 2 MB. Repite la captura.');
    const savedUri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('No se pudo conservar la foto.'));
      reader.readAsDataURL(blob);
    });
    return { uri: savedUri, name, mimeType: 'image/jpeg' };
  }
  const source = new File(uri);
  if (source.size > 2 * 1024 * 1024) throw new Error('La foto supera 2 MB. Repite la captura.');
  const dir = new Directory(Paths.document, 'attachments');
  dir.create({ idempotent: true, intermediates: true });
  const destination = new File(dir, name);
  source.copy(destination);
  return { uri: destination.uri, name, mimeType: 'image/jpeg' };
}

export async function pickAttachment(mode: "file" | "photo" = "file"): Promise<Attachment | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
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
  await new File(asset.uri).copy(file);
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
