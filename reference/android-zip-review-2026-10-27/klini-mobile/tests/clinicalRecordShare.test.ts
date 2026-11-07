import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shareClinicalRecordWith } from '../src/services/clinicalRecordShareWorkflow';
import { recordShareText } from '../src/domain/shareRecord';
import type { ClinicalRecord } from '../src/domain/types';

const record: ClinicalRecord = { id: 'selected-record', type: 'Receta', title: 'Receta de prueba', date: '2026-11-05', time: '10:30', doctorName: 'Profesional de prueba', specialty: 'General', institution: 'Institución de prueba', reason: 'Seguimiento', description: 'Contenido completo\nSegunda línea' };
test('all clinical record categories export only the selected content through the parameter text flow', async () => {
  for (const type of ['Consulta', 'Receta', 'Estudio', 'Procedimiento', 'Nota'] as const) {
    const selected = { ...record, type };
    const frozen = JSON.stringify(selected); let calls = 0;
    await shareClinicalRecordWith(selected, 'Paciente de prueba', {
      text: async (filename, content) => {
        calls++; assert.ok(filename.endsWith('.txt')); assert.ok(filename.includes(selected.id));
        for (const value of ['Paciente de prueba', selected.title, selected.description, selected.date, selected.time!, selected.doctorName, selected.institution!]) assert.ok(content.includes(value));
        assert.equal(content, recordShareText(selected, 'Paciente de prueba'));
      }, attachment: async () => { assert.fail('no attachment to share'); },
    });
    assert.equal(calls, 1); assert.equal(JSON.stringify(selected), frozen);
  }
});
test('PDF and image attachments preserve their URI/name/MIME and selected record context', async () => {
  for (const file of [{uri:'file:///private/recipe.pdf',name:'Receta.pdf',mimeType:'application/pdf'}, {uri:'file:///private/test.jpg',name:'Análisis.jpg',mimeType:'image/jpeg'}]) {
    const selected = { ...record, attachment: { ...file } }; const original = JSON.stringify(selected); let calls = 0;
    await shareClinicalRecordWith(selected, 'Paciente de prueba', {
      text: async () => assert.fail('must not silently replace the original with text'),
      attachment: async (attachment, content, title) => {
        calls++; assert.deepEqual(attachment, file); assert.notEqual(attachment, selected.attachment);
        assert.ok(content.includes(selected.description)); assert.ok(content.includes(file.name)); assert.ok(!content.includes(file.uri)); assert.equal(title, selected.title);
      },
    });
    assert.equal(calls, 1); assert.equal(JSON.stringify(selected), original);
  }
});
test('canceling is not a failure or a mutation; missing original and unavailable sharing do not silently fall back', async () => {
  const original = JSON.stringify(record);
  await shareClinicalRecordWith(record, 'Paciente', { text: async () => { throw Object.assign(new Error('cancelled'),{name:'AbortError'}); }, attachment: async () => {} });
  assert.equal(JSON.stringify(record), original);
  await assert.rejects(shareClinicalRecordWith(record, 'Paciente', { text: async () => { throw new Error('sharing unavailable'); }, attachment: async () => {} }), /sharing unavailable/);
  await assert.rejects(shareClinicalRecordWith({ ...record, attachment: {uri:'file:///missing.pdf',name:'Missing.pdf',mimeType:'application/pdf'} }, 'Paciente', {
    text: async () => assert.fail('must not replace a missing file'), attachment: async () => { throw new Error('missing original'); },
  }), /missing original/);
});
