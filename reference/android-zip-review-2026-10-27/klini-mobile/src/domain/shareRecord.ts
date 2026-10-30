import type { ClinicalRecord } from './types';

export function recordShareText(record: ClinicalRecord, patientName: string): string {
  return [
    'Klini · Nota del historial',
    patientName,
    `${record.type} · ${record.date}${record.time ? ` · ${record.time}` : ''}`,
    record.title,
    record.doctorName && `Profesional: ${record.doctorName}`,
    record.specialty,
    record.reason && `Motivo: ${record.reason}`,
    record.description,
  ].filter(Boolean).join('\n');
}
