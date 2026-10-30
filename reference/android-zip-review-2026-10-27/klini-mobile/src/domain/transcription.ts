export type Transcription = { text: string; doctorName: string; institution: string };

// Only explicit labels are extracted; the original OCR text is retained verbatim.
export function extractDocumentFields(text: string): Transcription {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const doctor = lines.find(line => /^(?:Dr\.?|Dra\.?|Médico|Medico|Laboratorio)\s*[:. ]/i.test(line));
  const institution = lines.find(line => /^(?:Institución|Institucion|Hospital|Clínica|Clinica|Centro médico|Centro medico)\b/i.test(line));
  return { text, doctorName: (doctor ?? '').slice(0, 120), institution: (institution ?? '').slice(0, 160) };
}

export function validateTranscription(value: unknown): Transcription {
  const data = value as Partial<Transcription> | null;
  if (!data || typeof data.text !== 'string' || !data.text.trim()) throw new Error('No se detectó texto legible. Repite la foto con buena luz.');
  if (data.text.length > 10000) throw new Error('El documento es demasiado largo. Escanea una sección por registro.');
  if (typeof data.doctorName !== 'string' || data.doctorName.length > 120 || typeof data.institution !== 'string' || data.institution.length > 160) throw new Error('La respuesta de transcripción no es válida.');
  return { text: data.text, doctorName: data.doctorName, institution: data.institution };
}
