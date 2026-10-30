import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractDocumentFields, validateTranscription } from '../src/domain/transcription';

test('keeps the full transcription and identifies explicit document headers', () => {
  const text = 'Hospital de Ejemplo\nDra. Ana Ejemplo\nDescripción: texto ficticio\nNo legible: [???]';
  assert.deepEqual(validateTranscription(extractDocumentFields(text)), { text, doctorName: 'Dra. Ana Ejemplo', institution: 'Hospital de Ejemplo' });
});
test('does not invent missing headers or mistake a patient name for a doctor', () => {
  assert.deepEqual(extractDocumentFields('Paciente: Ana\nTexto de ejemplo'), { text: 'Paciente: Ana\nTexto de ejemplo', doctorName: '', institution: '' });
});
test('rejects blank, oversized and malformed recognition results without truncating text', () => {
  for (const data of [null, {}, { text: '' }, { text: 'x'.repeat(10001) }, { text: 'Texto', doctorName: 42, institution: '' }]) assert.throws(() => validateTranscription(data));
});
