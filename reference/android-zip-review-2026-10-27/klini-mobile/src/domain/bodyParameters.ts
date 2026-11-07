import type { ClinicalRecord } from './types';
import { addDays, toISO } from './dates';

export const BODY_PARAMETERS = [
  { kind: 'weight', label: 'Peso', unit: 'kg', icon: 'scale-outline', min: .1, max: 700, decimals: 1 },
  { kind: 'heart-rate', label: 'Frecuencia cardiaca', unit: 'lpm', icon: 'heart-outline', min: 1, max: 350, decimals: 0 },
  { kind: 'blood-pressure', label: 'Presión arterial', unit: 'mmHg', icon: 'speedometer-outline', min: 1, max: 350, decimals: 0 },
  { kind: 'glucose', label: 'Glucosa', unit: 'mg/dL', icon: 'water-outline', min: 1, max: 1500, decimals: 1 },
  { kind: 'oxygen', label: 'Oxigenación', unit: '%', icon: 'pulse-outline', min: 0, max: 100, decimals: 1 },
  { kind: 'temperature', label: 'Temperatura', unit: '°C', icon: 'thermometer-outline', min: 20, max: 50, decimals: 1 },
] as const;
export type BodyParameterKind = typeof BODY_PARAMETERS[number]['kind'];
export type BodyParameterSource = 'Manual' | 'Apple Watch' | 'Abbott' | 'Oxímetro' | 'Báscula inteligente';
export interface BodyParameterInput {
  kind: BodyParameterKind;
  value: number;
  secondary?: number;
  unit: string;
  date: string;
  time: string;
  source: BodyParameterSource;
  origin: 'manual' | 'demo';
  favorite: boolean;
  note?: string;
  demoKey?: string;
}
export interface BodyParameterReading extends BodyParameterInput { id: string; recordId?: string }
export interface BodyParameterDraft { kind: BodyParameterKind; value: string; secondary: string; date: string; time: string; note?: string; demoKey?: string }
export interface BodyParameterFilters { from: string; to: string; source: BodyParameterSource | 'all'; min: string; max: string }
export const emptyBodyParameterFilters: BodyParameterFilters = { from: '', to: '', source: 'all', min: '', max: '' };
const marker = '\n[KLINI_BODY_PARAMETER_V1]\n';
const sources: BodyParameterSource[] = ['Manual', 'Apple Watch', 'Abbott', 'Oxímetro', 'Báscula inteligente'];

export function bodyParameterDefinition(kind: BodyParameterKind) {
  const definition = BODY_PARAMETERS.find(item => item.kind === kind);
  if (!definition) throw new Error('Selecciona un parámetro corporal.');
  return definition;
}

/** Broad capture limits validate input format; they are not healthy/normal ranges. */
export function validateBodyParameter(input: BodyParameterInput, now = new Date()): BodyParameterInput {
  const definition = bodyParameterDefinition(input.kind);
  if (input.unit !== definition.unit) throw new Error(`La unidad de ${definition.label.toLowerCase()} debe ser ${definition.unit}.`);
  const validNumber = (value: number) => Number.isFinite(value) && value >= definition.min && value <= definition.max
    && Math.abs(value * 10 ** definition.decimals - Math.round(value * 10 ** definition.decimals)) < .000001;
  if (!validNumber(input.value)) throw new Error(`Revisa el valor de ${definition.label.toLowerCase()}: usa ${definition.min} a ${definition.max} ${definition.unit}${definition.decimals ? ', con hasta un decimal' : ', sin decimales'}.`);
  if (input.kind === 'blood-pressure') {
    if (!Number.isInteger(input.secondary) || Number(input.secondary) < 1 || Number(input.secondary) > 250 || Number(input.secondary) >= input.value) throw new Error('Revisa la presión: captura ambos números enteros y la sistólica mayor que la diastólica.');
  } else if (input.secondary !== undefined) throw new Error('Este parámetro solo necesita un valor.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error('Usa una fecha con formato AAAA-MM-DD.');
  const [year, month, day] = input.date.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  if (year < 1900 || toISO(date) !== input.date || input.date > toISO(now)) throw new Error('Captura una fecha válida que no esté en el futuro.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) throw new Error('Usa una hora válida con formato HH:mm.');
  if (!sources.includes(input.source) || !['manual', 'demo'].includes(input.origin) || typeof input.favorite !== 'boolean') throw new Error('El origen del registro no es válido.');
  if (input.origin === 'manual' && input.source !== 'Manual') throw new Error('Los registros nuevos se capturan manualmente.');
  if (input.note !== undefined && (typeof input.note !== 'string' || input.note.length > 500 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(input.note))) throw new Error('La nota debe ser texto de hasta 500 caracteres.');
  if (input.demoKey !== undefined && (typeof input.demoKey !== 'string' || !input.demoKey.startsWith(`${input.kind}-`) || input.demoKey.length <= input.kind.length + 1 || !/^[a-z0-9-]{1,80}$/.test(input.demoKey))) throw new Error('La referencia del registro de ejemplo no es válida.');
  return { kind: input.kind, value: input.value, ...(input.secondary !== undefined && { secondary: input.secondary }), unit: input.unit, date: input.date, time: input.time, source: input.source, origin: input.origin, favorite: input.favorite, ...(input.note?.trim() && { note: input.note.trim() }), ...(input.demoKey && { demoKey: input.demoKey }) };
}

export function newBodyParameterDraft(now = new Date()): BodyParameterDraft {
  return { kind: 'weight', value: '', secondary: '', date: toISO(now), time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, note: '' };
}

export function bodyParameterFromDraft(draft: BodyParameterDraft, favorite = false, now = new Date()): BodyParameterInput {
  const number = (text: string) => /^\d{1,4}(?:[.,]\d{1,2})?$/.test(text.trim()) ? Number(text.trim().replace(',', '.')) : NaN;
  return validateBodyParameter({
    kind: draft.kind, value: number(draft.value),
    ...(draft.kind === 'blood-pressure' && { secondary: number(draft.secondary) }),
    unit: bodyParameterDefinition(draft.kind).unit, date: draft.date.trim(), time: draft.time.trim(),
    source: 'Manual', origin: 'manual', favorite, note: draft.note, demoKey: draft.demoKey,
  }, now);
}

export function bodyParameterDraftFromReading(reading: BodyParameterInput): BodyParameterDraft {
  return { kind: reading.kind, value: String(reading.value), secondary: reading.secondary === undefined ? '' : String(reading.secondary), date: reading.date, time: reading.time, note: reading.note || '', ...(reading.demoKey && { demoKey: reading.demoKey }) };
}

export function formatBodyParameterValue(reading: Pick<BodyParameterInput, 'value' | 'secondary' | 'kind'>): string {
  return reading.kind === 'blood-pressure' ? `${reading.value}/${reading.secondary}` : String(reading.value);
}

/** Existing profile-scoped Nota persistence avoids changing AppState's schema. */
export function bodyParameterRecord(input: BodyParameterInput, now = new Date()): Omit<ClinicalRecord, 'id'> {
  const value = validateBodyParameter(input, now);
  const definition = bodyParameterDefinition(value.kind);
  const { date, time, ...payload } = value;
  return {
    type: 'Nota', title: `Parámetro corporal · ${definition.label}`, date, time,
    doctorName: 'Registro personal', institution: value.origin === 'demo' ? `Fuente de ejemplo: ${value.source}` : 'Captura manual',
    description: `${value.origin === 'demo' ? 'Dato de ejemplo. No proviene de un dispositivo conectado.' : 'Registro corporal capturado manualmente en este dispositivo.'}\n${definition.label}: ${formatBodyParameterValue(value)} ${value.unit}.\nFuente: ${value.source}.${value.note ? `\nNota: ${value.note}` : ''}${marker}${JSON.stringify({ version: 1, ...payload })}`,
  };
}

export function parseBodyParameterRecord(record: ClinicalRecord, now = new Date()): BodyParameterReading | null {
  if (record.type !== 'Nota' || !record.description.includes(marker)) return null;
  try {
    const payload = JSON.parse(record.description.slice(record.description.lastIndexOf(marker) + marker.length));
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) || payload.version !== 1) return null;
    const input = validateBodyParameter({ kind: payload.kind, value: payload.value, secondary: payload.secondary, unit: payload.unit, source: payload.source, origin: payload.origin, favorite: payload.favorite, date: record.date, time: record.time || '', note: payload.note, demoKey: payload.demoKey }, now);
    if (input.origin === 'demo' && !input.demoKey) input.demoKey = `${input.kind}-current`;
    return { ...input, id: record.id, recordId: record.id };
  } catch { return null; }
}

/** All readings retain independent manual entries; a demoKey overlays one example. */
export function allBodyParameterReadings(profileId: string, records: ClinicalRecord[], now = new Date()): BodyParameterReading[] {
  const saved = records.map((record, index) => ({ reading: parseBodyParameterRecord(record, now), index }))
    .filter((entry): entry is { reading: BodyParameterReading; index: number } => entry.reading !== null && (profileId === 'patient-sofia' || entry.reading.origin !== 'demo'));
  const readings: BodyParameterReading[] = [];
  const overlays = new Map<string, BodyParameterReading>();
  // Record insertion order resolves old duplicate demo saves, including edits that
  // intentionally move a reading to an earlier measurement date.
  for (const { reading } of saved) {
    if (reading.demoKey) overlays.set(reading.demoKey, { ...reading, id: `body-demo-${reading.demoKey}` });
    else readings.push(reading);
  }
  if (profileId === 'patient-sofia') {
    const examples: { kind: BodyParameterKind; value: number; secondary?: number; source: BodyParameterSource; dayOffset?: number; time?: string; note?: string; key?: string }[] = [
      { kind: 'weight', value: 68.4, source: 'Manual', time: '08:15', note: 'En ayunas' },
      { kind: 'weight', value: 68.6, source: 'Báscula inteligente', dayOffset: -1, time: '08:10', key: 'weight-previous' },
      { kind: 'weight', value: 68.8, source: 'Manual', dayOffset: -3, time: '08:20', key: 'weight-earlier' },
      { kind: 'heart-rate', value: 72, source: 'Apple Watch' }, { kind: 'blood-pressure', value: 118, secondary: 76, source: 'Manual' },
      { kind: 'glucose', value: 92, source: 'Abbott' }, { kind: 'oxygen', value: 98, source: 'Oxímetro' }, { kind: 'temperature', value: 36.5, source: 'Manual' },
    ];
    for (const example of examples) {
      const demoKey = example.key || `${example.kind}-current`;
      if (!overlays.has(demoKey)) overlays.set(demoKey, {
        kind: example.kind, value: example.value, ...(example.secondary !== undefined && { secondary: example.secondary }), source: example.source,
        id: `body-demo-${demoKey}`, demoKey, unit: bodyParameterDefinition(example.kind).unit,
        date: addDays(toISO(now), example.dayOffset || 0), time: example.time || '09:00', origin: 'demo', favorite: false, ...(example.note && { note: example.note }),
      });
    }
  }
  readings.push(...overlays.values());
  return readings.map((reading, index) => ({ reading, index }))
    .sort((a, b) => `${b.reading.date} ${b.reading.time}`.localeCompare(`${a.reading.date} ${a.reading.time}`) || b.index - a.index).map(entry => entry.reading);
}

export function bodyParameterHistory(profileId: string, records: ClinicalRecord[], kind: BodyParameterKind, now = new Date()): BodyParameterReading[] {
  bodyParameterDefinition(kind);
  return allBodyParameterReadings(profileId, records, now).filter(reading => reading.kind === kind);
}

export function listBodyParameters(profileId: string, records: ClinicalRecord[], now = new Date(), filters?: BodyParameterFilters): BodyParameterReading[] {
  const allReadings = allBodyParameterReadings(profileId, records, now);
  // Filter before choosing one reading per kind so an older matching source or
  // date remains discoverable. Summary filters never compare different units.
  const readings = (filters ? filterBodyParameterReadings(allReadings, validateBodyParameterFilters(filters)) : allReadings)
    .sort((a, b) => Number(a.origin === 'demo') - Number(b.origin === 'demo')
      || `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  const latest = new Map<BodyParameterKind, BodyParameterReading>();
  for (const reading of readings) if (!latest.has(reading.kind)) latest.set(reading.kind, reading);
  return BODY_PARAMETERS.flatMap(definition => latest.has(definition.kind) ? [latest.get(definition.kind)!] : []);
}

function normalizedFilters(filters: BodyParameterFilters, kind?: BodyParameterKind): BodyParameterFilters {
  const definition = kind === undefined ? undefined : bodyParameterDefinition(kind);
  const from = filters.from.trim(), to = filters.to.trim();
  const validDate = (text: string) => {
    if (!text) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
    const [year, month, day] = text.split('-').map(Number);
    return year >= 1900 && toISO(new Date(year, month - 1, day, 12)) === text;
  };
  if (!validDate(from) || !validDate(to)) throw new Error('Usa fechas válidas con formato AAAA-MM-DD.');
  if (from && to && from > to) throw new Error('La fecha inicial debe ser anterior o igual a la final.');
  if (filters.source !== 'all' && !sources.includes(filters.source)) throw new Error('Selecciona una fuente válida.');
  const number = (text: string) => {
    if (!text.trim()) return '';
    const value = /^\d{1,5}(?:[.,]\d{1,2})?$/.test(text.trim()) ? Number(text.trim().replace(',', '.')) : NaN;
    if (!Number.isFinite(value) || value < 0 || (definition && value > definition.max)) throw new Error(`Captura un límite de valor válido${definition ? ` en ${definition.unit}` : ''}.`);
    return String(value);
  };
  const min = number(filters.min), max = number(filters.max);
  if (min && max && Number(min) > Number(max)) throw new Error('El valor mínimo debe ser menor o igual al máximo.');
  return { from, to, source: filters.source, min, max };
}

/** Summary filters use dates/source; numeric bounds belong to one parameter. */
export function validateBodyParameterFilters(filters: BodyParameterFilters, kind?: BodyParameterKind): BodyParameterFilters {
  return normalizedFilters(kind === undefined ? { ...filters, min: '', max: '' } : filters, kind);
}

/** Inclusive dates and primary values (systolic value for blood pressure). */
export function filterBodyParameterReadings(readings: BodyParameterReading[], filters: BodyParameterFilters): BodyParameterReading[] {
  const value = normalizedFilters(filters);
  return readings.filter(reading => (!value.from || reading.date >= value.from) && (!value.to || reading.date <= value.to)
    && (value.source === 'all' || reading.source === value.source)
    && (!value.min || reading.value >= Number(value.min)) && (!value.max || reading.value <= Number(value.max)));
}
