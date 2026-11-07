import test from 'node:test';
import assert from 'node:assert/strict';
import type { ClinicalRecord } from '../src/domain/types';
import { allBodyParameterReadings, bodyParameterDraftFromReading, bodyParameterFromDraft, bodyParameterHistory, bodyParameterRecord, emptyBodyParameterFilters, filterBodyParameterReadings, listBodyParameters, newBodyParameterDraft, parseBodyParameterRecord, validateBodyParameter, validateBodyParameterFilters, type BodyParameterFilters, type BodyParameterInput } from '../src/domain/bodyParameters';

const now = new Date(2026, 10, 2, 12, 30);
const draft = () => ({ ...newBodyParameterDraft(now), value: '70,2' });
const record = (id = 'measurement'): ClinicalRecord => ({ id, ...bodyParameterRecord(bodyParameterFromDraft(draft(), false, now), now) });

test('Sofía alone receives six explicitly illustrative readings with the reference values and sources', () => {
  const values = listBodyParameters('patient-sofia', [], now);
  assert.equal(values.length, 6);
  assert.deepEqual(values.map(value => value.value), [68.4, 72, 118, 92, 98, 36.5]);
  assert.equal(values[2].secondary, 76);
  assert.equal(values[1].source, 'Apple Watch');
  assert.equal(values[3].source, 'Abbott');
  assert.ok(values.every(value => value.origin === 'demo' && !value.favorite));
  assert.deepEqual(listBodyParameters('child-profile', [], now), []);
});

test('manual measurements round trip through ordinary Nota records with fixed units and favorite state', () => {
  const value = bodyParameterFromDraft(draft(), true, now);
  const clinicalRecord = { id: 'manual', ...bodyParameterRecord(value, now) };
  assert.equal(clinicalRecord.type, 'Nota');
  assert.match(clinicalRecord.description, /capturado manualmente/);
  const parsed = parseBodyParameterRecord(clinicalRecord, now);
  assert.equal(parsed?.value, 70.2);
  assert.equal(parsed?.unit, 'kg');
  assert.equal(parsed?.favorite, true);
  assert.equal(parsed?.origin, 'manual');
  assert.equal(parsed?.recordId, 'manual');
  assert.throws(() => validateBodyParameter({ ...value, unit: 'lb' }, now), /unidad/);
  assert.throws(() => validateBodyParameter({ ...value, source: 'Apple Watch' }, now), /manualmente/);
});

test('capture rejects malformed values, broad invalid limits, impossible dates, future dates and invalid times', () => {
  for (const value of ['', '-1', 'Infinity', '70.222', '0', '701', '7e2']) assert.throws(() => bodyParameterFromDraft({ ...draft(), value }, false, now));
  for (const date of ['2026-02-31', '2026-11-03', '02/11/2026']) assert.throws(() => bodyParameterFromDraft({ ...draft(), date }, false, now));
  assert.throws(() => bodyParameterFromDraft({ ...draft(), time: '25:00' }, false, now));
  assert.throws(() => bodyParameterFromDraft({ ...draft(), kind: 'oxygen', value: '101' }, false, now));
  assert.throws(() => bodyParameterFromDraft({ ...draft(), kind: 'heart-rate', value: '72.5' }, false, now));
});

test('blood pressure requires two integers in the correct order', () => {
  const bloodPressure = { ...draft(), kind: 'blood-pressure' as const, value: '118', secondary: '76' };
  assert.equal(bodyParameterFromDraft(bloodPressure, false, now).secondary, 76);
  for (const secondary of ['', '0', '120', '76.5']) assert.throws(() => bodyParameterFromDraft({ ...bloodPressure, secondary }, false, now));
});

test('latest manual records replace demo values and favorite metadata survives JSON persistence', () => {
  const original = record('first');
  const later = { id: 'later', ...bodyParameterRecord(bodyParameterFromDraft({ ...draft(), value: '71', time: '12:31' }, true, now), now) };
  const readings = listBodyParameters('patient-sofia', JSON.parse(JSON.stringify([original, later])), now);
  assert.equal(readings.length, 6);
  assert.equal(readings[0].id, 'later');
  assert.equal(readings[0].favorite, true);
  assert.equal(readings[0].value, 71);
  assert.deepEqual(listBodyParameters('another-profile', [original], now).map(value => value.id), ['first']);
});

test('malformed or unrelated notes are ignored and saved demo favorites remain visibly illustrative', () => {
  const original = record();
  assert.equal(parseBodyParameterRecord({ ...original, description: 'Una nota sin mediciones.' }, now), null);
  assert.equal(parseBodyParameterRecord({ ...original, description: '\n[KLINI_BODY_PARAMETER_V1]\n{"version":1}' }, now), null);
  const example = listBodyParameters('patient-sofia', [], now)[1];
  const favorite = { id: 'saved-demo-favorite', ...bodyParameterRecord({ ...example, favorite: true }, now) };
  assert.match(favorite.description, /Dato de ejemplo.*No proviene de un dispositivo conectado/);
  assert.equal(listBodyParameters('patient-sofia', [favorite], now)[1].favorite, true);
  assert.equal(listBodyParameters('patient-sofia', [favorite], now)[1].origin, 'demo');
  assert.deepEqual(listBodyParameters('another-profile', [favorite], now), []);
});

test('weight history has three dated illustrative readings in descending local chronology across months', () => {
  const history = bodyParameterHistory('patient-sofia', [], 'weight', now);
  assert.deepEqual(history.map(reading => [reading.date, reading.time, reading.value, reading.source]), [
    ['2026-11-02', '08:15', 68.4, 'Manual'], ['2026-11-01', '08:10', 68.6, 'Báscula inteligente'], ['2026-10-30', '08:20', 68.8, 'Manual'],
  ]);
  assert.equal(history[0].note, 'En ayunas');
  assert.deepEqual(history.map(reading => reading.demoKey), ['weight-current', 'weight-previous', 'weight-earlier']);
  assert.equal(allBodyParameterReadings('patient-sofia', [], now).length, 8);
  assert.equal(bodyParameterHistory('patient-sofia', [], 'glucose', now).length, 1);
});

test('demo keys overlay favorites and edits without duplicate virtual readings and preserve stable view IDs', () => {
  const original = bodyParameterHistory('patient-sofia', [], 'weight', now)[1];
  const first: ClinicalRecord = { id: 'first-save', ...bodyParameterRecord({ ...original, favorite: true }, now) };
  const updated: ClinicalRecord = { id: 'second-save', ...bodyParameterRecord({ ...original, value: 69.1, date: '2026-10-29', note: 'Ejemplo editado', favorite: true }, now) };
  const history = bodyParameterHistory('patient-sofia', [first, updated], 'weight', now);
  assert.equal(history.length, 3);
  const edited = history.find(reading => reading.demoKey === original.demoKey)!;
  assert.equal(edited.id, original.id);
  assert.equal(edited.recordId, 'second-save');
  assert.equal(edited.value, 69.1);
  assert.equal(edited.note, 'Ejemplo editado');
  assert.equal(edited.favorite, true);
  assert.equal(edited.origin, 'demo');
  assert.equal(history[2].id, edited.id);
  assert.equal(history.some(reading => reading.value === 68.6), false);
});

test('all manual readings remain independent and the overview keeps its existing manual-priority behavior', () => {
  const first = { id: 'manual-older', ...bodyParameterRecord(bodyParameterFromDraft({ ...draft(), date: '2026-10-28', value: '72.4' }, false, now), now) };
  const second = { id: 'manual-newer', ...bodyParameterRecord(bodyParameterFromDraft({ ...draft(), date: '2026-10-29', value: '72.3' }, true, now), now) };
  const records = [first, second];
  const before = JSON.stringify(records);
  assert.equal(bodyParameterHistory('patient-sofia', records, 'weight', now).length, 5);
  assert.equal(listBodyParameters('patient-sofia', records, now)[0].id, 'manual-newer');
  assert.equal(allBodyParameterReadings('patient-sofia', records, now).filter(reading => reading.origin === 'manual').length, 2);
  assert.equal(JSON.stringify(records), before);
});

test('legacy V1 notes without optional fields still parse and demo favorites overlay the current example', () => {
  const legacy = { ...record('legacy'), description: '\n[KLINI_BODY_PARAMETER_V1]\n' + JSON.stringify({ version: 1, kind: 'weight', value: 68.4, unit: 'kg', source: 'Manual', origin: 'demo', favorite: true }) };
  const parsed = parseBodyParameterRecord(legacy, now)!;
  assert.equal(parsed.note, undefined);
  assert.equal(parsed.demoKey, 'weight-current');
  const history = bodyParameterHistory('patient-sofia', [legacy], 'weight', now);
  assert.equal(history.length, 3);
  assert.equal(history.find(reading => reading.demoKey === 'weight-current')?.recordId, 'legacy');
  assert.equal(history.find(reading => reading.demoKey === 'weight-current')?.favorite, true);
});

test('notes and demo lineage round trip through editable drafts without claiming a device connection', () => {
  const example = bodyParameterHistory('patient-sofia', [], 'weight', now)[1];
  const editing = { ...bodyParameterDraftFromReading(example), value: '68,7', note: '  Después del desayuno  ' };
  const manualInput = bodyParameterFromDraft(editing, true, now);
  assert.equal(manualInput.source, 'Manual');
  assert.equal(manualInput.origin, 'manual');
  assert.equal(manualInput.demoKey, example.demoKey);
  const demoInput = validateBodyParameter({ ...manualInput, source: example.source, origin: 'demo' }, now);
  const saved = { id: 'edited-example', ...bodyParameterRecord(demoInput, now) };
  assert.match(saved.description, /No proviene de un dispositivo conectado/);
  assert.equal(parseBodyParameterRecord(saved, now)?.note, 'Después del desayuno');
  assert.throws(() => validateBodyParameter({ ...manualInput, source: 'Báscula inteligente' }, now), /manualmente/);
  assert.throws(() => validateBodyParameter({ ...manualInput, note: 'x'.repeat(501) }, now), /500/);
  assert.throws(() => validateBodyParameter({ ...manualInput, demoKey: 'glucose-current' }, now), /referencia/);
});

test('history date, source and value filters include both bounds and normalize decimal commas', () => {
  const history = bodyParameterHistory('patient-sofia', [], 'weight', now);
  const filters = validateBodyParameterFilters({ ...emptyBodyParameterFilters, from: ' 2026-11-01 ', to: '2026-11-02', min: '68,4', max: '68,6' }, 'weight');
  assert.deepEqual(filters, { from: '2026-11-01', to: '2026-11-02', min: '68.4', max: '68.6', source: 'all' });
  assert.deepEqual(filterBodyParameterReadings(history, filters).map(reading => reading.value), [68.4, 68.6]);
  assert.deepEqual(filterBodyParameterReadings(history, { ...emptyBodyParameterFilters, source: 'Báscula inteligente' }).map(reading => reading.value), [68.6]);
  assert.deepEqual(filterBodyParameterReadings(history, { ...emptyBodyParameterFilters, min: '68.6', max: '68.6' }).map(reading => reading.value), [68.6]);
  assert.deepEqual(filterBodyParameterReadings(history, { ...emptyBodyParameterFilters, from: '2027-01-01' }), []);
  assert.deepEqual(filterBodyParameterReadings([], { ...emptyBodyParameterFilters, max: '1200' }), []);
});

test('invalid filter dates, sources, numbers and reversed intervals are rejected without mutating the draft', () => {
  const invalid: Partial<BodyParameterFilters>[] = [
    { from: '2026-02-31' }, { to: '02/11/2026' }, { from: '2026-11-02', to: '2026-11-01' },
    { min: '-1' }, { min: 'NaN' }, { max: '1e2' }, { min: '70', max: '60' }, { max: '701' }, { source: 'Dispositivo real' as BodyParameterFilters['source'] },
  ];
  for (const patch of invalid) assert.throws(() => validateBodyParameterFilters({ ...emptyBodyParameterFilters, ...patch }, 'weight'));
  assert.deepEqual(emptyBodyParameterFilters, { from: '', to: '', source: 'all', min: '', max: '' });
});

test('filtering blood pressure uses its primary value and demo history never leaks to another profile', () => {
  const bp = bodyParameterHistory('patient-sofia', [], 'blood-pressure', now);
  assert.equal(filterBodyParameterReadings(bp, { ...emptyBodyParameterFilters, min: '118', max: '118' }).length, 1);
  const illustrative = bodyParameterHistory('patient-sofia', [], 'weight', now)[0];
  const saved = { id: 'private-example', ...bodyParameterRecord({ ...illustrative, favorite: true }, now) };
  assert.deepEqual(bodyParameterHistory('different-profile', [saved], 'weight', now), []);
  const ownManual: BodyParameterInput = bodyParameterFromDraft({ ...draft(), note: 'Mi nota' }, false, now);
  const manual = { id: 'own-manual', ...bodyParameterRecord(ownManual, now) };
  assert.deepEqual(bodyParameterHistory('different-profile', [saved, manual], 'weight', now).map(reading => reading.id), ['own-manual']);
});

test('overview filters find historical source/date matches before selecting one reading per parameter', () => {
  const sourceFilters = { ...emptyBodyParameterFilters, source: 'Báscula inteligente' as const };
  const matchingSource = listBodyParameters('patient-sofia', [], now, sourceFilters);
  assert.deepEqual(matchingSource.map(reading => [reading.kind, reading.value, reading.date, reading.source]), [
    ['weight', 68.6, '2026-11-01', 'Báscula inteligente'],
  ]);
  assert.deepEqual(listBodyParameters('patient-sofia', [], now, { ...emptyBodyParameterFilters, from: '2026-11-01', to: '2026-11-01' }).map(reading => reading.value), [68.6]);
  assert.deepEqual(listBodyParameters('patient-sofia', [], now, { ...emptyBodyParameterFilters, from: '2026-10-30', to: '2026-10-30' }).map(reading => reading.value), [68.8]);
  assert.deepEqual(listBodyParameters('patient-sofia', [], now, { ...emptyBodyParameterFilters, source: 'Manual', from: '2026-11-02', to: '2026-11-02' }).map(reading => reading.kind), ['weight', 'blood-pressure', 'temperature']);
  assert.deepEqual(listBodyParameters('patient-sofia', [], now, { ...emptyBodyParameterFilters, from: '2027-01-01' }), []);
  assert.deepEqual(listBodyParameters('another-profile', [], now, sourceFilters), []);
});

test('overview date/source validation ignores numeric bounds across units but still validates dates and source', () => {
  const filters = { ...emptyBodyParameterFilters, from: ' 2026-11-02 ', min: 'not a number', max: '-1' };
  const before = { ...filters };
  assert.deepEqual(validateBodyParameterFilters(filters), { ...emptyBodyParameterFilters, from: '2026-11-02' });
  assert.deepEqual(listBodyParameters('patient-sofia', [], now, filters).map(reading => reading.unit), ['kg', 'lpm', 'mmHg', 'mg/dL', '%', '°C']);
  assert.deepEqual(filters, before);
  assert.throws(() => validateBodyParameterFilters(filters, 'weight'), /límite/);
  assert.throws(() => validateBodyParameterFilters({ ...emptyBodyParameterFilters, from: '2026-02-31' }), /fechas/);
  assert.throws(() => validateBodyParameterFilters({ ...emptyBodyParameterFilters, from: '2026-11-02', to: '2026-11-01' }), /anterior/);
  assert.throws(() => validateBodyParameterFilters({ ...emptyBodyParameterFilters, source: 'Otro dispositivo' as BodyParameterFilters['source'] }), /fuente/);
});

test('overview filtering preserves manual priority, reading metadata and independent base favorites without mutation', () => {
  const first = { id: 'manual-older', ...bodyParameterRecord(bodyParameterFromDraft({ ...draft(), date: '2026-10-28', value: '72.4' }, false, now), now) };
  const second = { id: 'manual-newer', ...bodyParameterRecord(bodyParameterFromDraft({ ...draft(), date: '2026-10-29', value: '72.3' }, true, now), now) };
  const records = [first, second];
  const sourceFilters = { ...emptyBodyParameterFilters, source: 'Báscula inteligente' as const };
  const before = JSON.stringify({ records, sourceFilters });
  const base = listBodyParameters('patient-sofia', records, now);
  const manual = listBodyParameters('patient-sofia', records, now, { ...emptyBodyParameterFilters, source: 'Manual' });
  assert.equal(base[0].id, 'manual-newer');
  assert.equal(manual[0].id, 'manual-newer');
  assert.equal(manual[0].favorite, true);
  assert.deepEqual(listBodyParameters('patient-sofia', records, now, emptyBodyParameterFilters), base);
  const historical = listBodyParameters('patient-sofia', records, now, sourceFilters)[0];
  assert.equal(historical.demoKey, 'weight-previous');
  assert.equal(historical.origin, 'demo');
  assert.equal(historical.favorite, false);
  assert.equal(base.find(reading => reading.kind === historical.kind)?.favorite, true);
  assert.equal(listBodyParameters('patient-sofia', records, now, { ...emptyBodyParameterFilters, from: '2026-10-28', to: '2026-10-28' })[0].id, 'manual-older');
  assert.equal(JSON.stringify({ records, sourceFilters }), before);
  assert.equal(listBodyParameters('patient-sofia', records, now)[0].favorite, true);
});
