import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoState } from '../src/domain/seed';
import { appReducer, parseStoredState, validateAppState } from '../src/domain/reducer';
import { recordShareText } from '../src/domain/shareRecord';
import { filterDateToISO, matchesHistoryFilters, emptyHistoryFilters } from '../src/domain/historyFilters';

test('new history categories survive persistence without changing existing records', () => {
  let state = createDemoState();
  const original = [...state.records];
  for (const type of ['Procedimiento', 'Hospitalización', 'Alergia', 'Antecedente'] as const) {
    state = appReducer(state, { type: 'ADD_RECORD', record: { id: type, type, title: `Registro ${type}`, date: '2026-10-28', doctorName: '', description: '' } });
  }
  const restored = parseStoredState(JSON.stringify(state));
  assert.equal(validateAppState(restored), true);
  for (const record of original) assert.deepEqual(restored.records.find(item => item.id === record.id), record);
  for (const type of ['Procedimiento', 'Hospitalización', 'Alergia', 'Antecedente']) assert.equal(restored.records.find(item => item.id === type)?.type, type);
});

test('consultation fields persist and sharing only includes the selected note', () => {
  const state = createDemoState();
  const record = { ...state.records[0], time: '10:30', specialty: 'Medicina general', institution: 'Hospital de prueba', reason: 'Revisión de rutina' };
  const updated = appReducer(state, { type: 'UPDATE_RECORD', id: record.id, patch: record });
  const restored = parseStoredState(JSON.stringify(updated));
  assert.deepEqual(restored.records.find(item => item.id === record.id), record);
  const message = recordShareText(record, state.profile.name);
  assert.ok(message.includes('10:30'));
  assert.ok(message.includes('Revisión de rutina'));
  assert.ok(!message.includes(state.records[1].title));
  assert.equal(validateAppState({ ...state, records: [{ ...record, time: '25:80' }] }), false);
});

test('history date range is inclusive and combines specialty and institution', () => {
  const record = { ...createDemoState().records[0], date: '2026-10-20', specialty: 'Medicina general', institution: 'Hospital A' };
  assert.equal(filterDateToISO('29/02/2024'), '2024-02-29');
  assert.equal(filterDateToISO('29/02/2026'), null);
  assert.equal(filterDateToISO('31/04/2026'), null);
  assert.equal(filterDateToISO(''), '');
  assert.equal(matchesHistoryFilters(record, emptyHistoryFilters), true);
  assert.equal(matchesHistoryFilters(record, { from: '2026-10-20', to: '2026-10-20', specialty: 'Medicina general', institution: 'Hospital A' }), true);
  assert.equal(matchesHistoryFilters(record, { ...emptyHistoryFilters, from: '2026-10-21' }), false);
  assert.equal(matchesHistoryFilters(record, { ...emptyHistoryFilters, institution: 'Hospital B' }), false);
  assert.equal(matchesHistoryFilters(record, { ...emptyHistoryFilters, specialty: 'Pediatría' }), false);
});
