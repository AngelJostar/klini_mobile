import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEnrollmentDescription, getDemoMonthlyPrice, type EnrollmentDetails } from '../src/domain/insuranceEnrollment';

const complete: EnrollmentDetails = { age: '40', sex: 'Hombre', smoker: 'No', occupation: 'administrative' };
test('demo quote remains locked until all valid required fields are provided', () => {
  for (const patch of [{ age: '' }, { age: 'abc' }, { age: '17' }, { age: '81' }, { age: '40.5' }, { sex: '' }, { smoker: '' }, { occupation: '' }, { occupation: 'unknown' }]) {
    assert.equal(getDemoMonthlyPrice('integral', { ...complete, ...patch } as EnrollmentDetails), null);
  }
});
test('demo quote is deterministic and responds to changing plan and inputs', () => {
  assert.equal(getDemoMonthlyPrice('integral', complete), 1250);
  assert.equal(getDemoMonthlyPrice('essential', complete), 650);
  assert.equal(getDemoMonthlyPrice('family', complete), 1850);
  assert.equal(getDemoMonthlyPrice('integral', { ...complete, smoker: 'Sí' }), 1450);
  assert.equal(getDemoMonthlyPrice('integral', { ...complete, age: '50' }), 1400);
});
test('local application retains reviewed data, rejects a stale quote and states its demo scope', () => {
  const description = buildEnrollmentDescription('integral', complete, 'Sofía Martínez', 1250);
  assert.match(description, /Plan: Integral/);
  assert.match(description, /Sofía Martínez/);
  assert.match(description, /1,250/);
  assert.match(description, /No se ha enviado a una aseguradora/);
  assert.throws(() => buildEnrollmentDescription('family', complete, 'Sofía Martínez', 1250));
});
