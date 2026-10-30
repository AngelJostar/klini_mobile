import { test } from 'node:test';
import assert from 'node:assert/strict';
import { medicalSpecialties, specialtyOptions, specialtySearchKey } from '../src/domain/medicalSpecialties';

test('catalogue retains saved labels and supports accent-insensitive sub-specialty search', () => {
  const options = specialtyOptions(['cardiología pediátrica', 'Especialidad personalizada']);
  const found = options.filter(value => specialtySearchKey(value).includes('cardiologia pediatrica'));
  assert.deepEqual(found, ['cardiología pediátrica']);
  assert.ok(options.includes('Especialidad personalizada'));
  assert.equal(new Set(medicalSpecialties.map(specialtySearchKey)).size, medicalSpecialties.length);
  assert.ok(options.includes('Medicina del Sueño'));
});
