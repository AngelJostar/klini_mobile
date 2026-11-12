import type { ClinicalRecord, Medication } from './types';

export function recordShareText(record: ClinicalRecord, patientName: string): string {
  return [
    'Klini · Nota del historial',
    patientName,
    `${record.type} · ${record.date}${record.time ? ` · ${record.time}` : ''}`,
    record.title,
    record.doctorName && `Profesional: ${record.doctorName}`,
    record.specialty,
    record.institution && `Institución: ${record.institution}`,
    record.reason && `Motivo: ${record.reason}`,
    record.description,
    record.attachment && `Archivo adjunto: ${record.attachment.name}`,
  ].filter(Boolean).join('\n');
}

export function medicationShareText(medication: Medication, patientName: string): string {
  return [
    'Klini · Medicamento registrado', patientName, medication.name,
    `Dosis registrada: ${medication.dose}`, `Frecuencia registrada: ${medication.frequency}`,
    `Inicio: ${medication.startDate}`, `Fin: ${medication.endDate || 'No registrado'}`,
    `Estado en Klini: ${medication.active ? 'Vigente' : 'Anterior'}`,
    'Información registrada en Klini; no modifica ni sustituye una receta.',
  ].join('\n');
}
