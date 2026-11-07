import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shareMedicationWith } from '../src/services/clinicalRecordShareWorkflow';
import type { Medication } from '../src/domain/types';

const medication: Medication = { id:'medication-selected', name:'Medicamento de prueba', dose:'Dosis literal de la receta', frequency:'Frecuencia literal', startDate:'2026-11-05', active:true };
test('medication sharing exports one TXT with the selected patient and all registered fields without changing treatment', async () => {
  for (const item of [medication, { ...medication, active:false, endDate:'2026-11-10' }]) {
    const original = JSON.stringify(item); let calls = 0;
    await shareMedicationWith(item,'Paciente de prueba',async (filename, content) => {
      calls++; assert.equal(filename,`Klini-medicamento-${item.startDate}-${item.id}.txt`);
      for (const value of ['Paciente de prueba',item.name,item.dose,item.frequency,item.startDate,item.endDate || 'No registrado',item.active ? 'Vigente' : 'Anterior']) assert.ok(content.includes(value));
      assert.ok(content.includes('no modifica ni sustituye una receta'));
      assert.ok(!content.includes('Otro medicamento')); assert.ok(!content.includes('file://'));
    });
    assert.equal(calls,1); assert.equal(JSON.stringify(item),original);
  }
});
test('medication sharing cancellation is harmless and unavailable system sheet errors propagate',async () => {
  const original = JSON.stringify(medication);
  await shareMedicationWith(medication,'Paciente',async()=>{throw Object.assign(new Error('cancelled'),{name:'AbortError'});});
  assert.equal(JSON.stringify(medication),original);
  await assert.rejects(shareMedicationWith(medication,'Paciente',async()=>{throw new Error('not available');}),/not available/);
});
