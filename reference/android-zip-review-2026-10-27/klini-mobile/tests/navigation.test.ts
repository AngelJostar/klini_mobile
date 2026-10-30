import assert from 'node:assert/strict';
import test from 'node:test';
import { searchHome } from '../src/domain/navigation';
import { DEMO_DOCTORS } from '../src/domain/seed';

test('home search ignores accents, casing and repeated whitespace across doctor and specialty', () => {
  const results = searchHome('  ELENA   medicina ', DEMO_DOCTORS);
  assert.equal(results.length, 1);
  assert.equal(results[0].destination.doctorId, 'doctor-elena');
  assert.equal(searchHome('rios', DEMO_DOCTORS)[0].destination.doctorId, 'doctor-elena');
});

test('medical menu search opens archive with the intended filter', () => {
  assert.deepEqual(searchHome('analisis', DEMO_DOCTORS)[0].destination, {
    section: 'archive',
    recordType: 'Estudio',
  });
  assert.deepEqual(searchHome('recetas', DEMO_DOCTORS)[0].destination, {
    section: 'archive',
    recordType: 'Receta',
  });
});

test('empty searches show shortcuts and unmatched input produces an empty state', () => {
  assert.equal(searchHome('   ', DEMO_DOCTORS).length, 4);
  assert.equal(searchHome('zzzzzzzz', DEMO_DOCTORS).length, 0);
});
