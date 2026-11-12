import { recordShareText, medicationShareText } from '../domain/shareRecord';
import type { Attachment, ClinicalRecord, Medication } from '../domain/types';

export interface RecordShareActions {
  text: (filename: string, content: string) => Promise<void>;
  attachment: (file: Attachment, content: string, title: string) => Promise<void>;
}
/** Only the selected snapshot is handed to the system sheet. No destinations, sending or mutations. */
export async function shareClinicalRecordWith(record: ClinicalRecord, patientName: string, actions: RecordShareActions): Promise<void> {
  const content = recordShareText(record, patientName);
  try {
    if (record.attachment) await actions.attachment({ ...record.attachment }, content, record.title);
    else await actions.text(`Klini-${record.type}-${record.date}-${record.id}.txt`, content);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return;
    throw error;
  }
}

export async function shareMedicationWith(medication: Medication, patientName: string, text: RecordShareActions['text']): Promise<void> {
  try {
    await text(`Klini-medicamento-${medication.startDate}-${medication.id}.txt`, medicationShareText(medication, patientName));
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return;
    throw error;
  }
}
