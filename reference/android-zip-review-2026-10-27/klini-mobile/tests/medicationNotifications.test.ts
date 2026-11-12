import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoState } from '../src/domain/seed';
import type { AppState } from '../src/domain/types';
import type { MedicationAlert } from '../src/domain/medicationCare';
import { toISO } from '../src/domain/dates';
import { isMedicationAlertEligible, MEDICATION_NOTIFICATION_PREFIX, planMedicationNotifications, type MedicationNotificationEntry } from '../src/services/medicationNotificationPlan';
import { createMedicationNotificationSync, type MedicationNotificationAdapter } from '../src/services/medicationNotificationSync';

const now = new Date(2026, 10, 9, 10, 0);
function state(alerts: MedicationAlert[] = [alert()]): AppState {
  return { ...createDemoState(), medications: [{ id: 'med', name: 'Nombre que no debe aparecer en la notificación', dose: 'Texto de dosis privado', frequency: 'Según receta', startDate: '2026-11-01', active: true }], medicationCare: { treatments: [], takes: [], alerts } };
}
function alert(patch: Partial<MedicationAlert> = {}): MedicationAlert {
  return { id: 'alert', medicationId: 'med', time: '11:05', days: [0, 1, 2, 3, 4, 5, 6], enabled: true, ...patch };
}
function manualAlert(patch: Partial<MedicationAlert> = {}): MedicationAlert {
  return { id: 'manual-alert', medicationName: 'Medicamento manual de prueba', concentration: 'Concentración privada', time: '09:30', days: [0, 1, 2, 3, 4, 5, 6], enabled: true, ...patch };
}
function adapter(initial: string[] = []) {
  const scheduled = new Map(initial.map(id => [id, undefined as MedicationNotificationEntry | undefined]));
  const cancelled: string[] = [];
  const created: MedicationNotificationEntry[] = [];
  let granted = true;
  const value: MedicationNotificationAdapter = {
    scheduled: async () => [...scheduled.keys()],
    cancel: async id => { cancelled.push(id); scheduled.delete(id); },
    permission: async () => granted,
    schedule: async entry => { created.push(entry); scheduled.set(entry.identifier, entry); return entry.identifier; },
  };
  return { value, scheduled, cancelled, created, deny: () => { granted = false; } };
}

test('daily and weekly local triggers preserve the chosen time and Expo Sunday=1 mapping', () => {
  const daily = planMedicationNotifications(state(), now);
  assert.deepEqual(daily.entries[0].trigger, { kind: 'daily', hour: 11, minute: 5 });
  const weekly = planMedicationNotifications(state([alert({ days: [0, 2, 6] })]), now);
  assert.deepEqual(weekly.entries.map(item => item.trigger).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))), [0, 2, 6].map(day => ({ kind: 'weekly', weekday: day + 1, hour: 11, minute: 5 })));
  assert.equal(JSON.stringify(daily).includes('privado'), false);
  assert.equal(JSON.stringify(daily).includes('Nombre'), false);
});

test('a named manual reminder schedules daily without a medication record and never includes its free text', () => {
  const input = state([manualAlert()]); input.medications = [];
  const plan = planMedicationNotifications(input, now);
  assert.equal(isMedicationAlertEligible(input, input.medicationCare!.alerts[0], now), true);
  assert.deepEqual(plan.entries.map(entry => entry.trigger), [{ kind: 'daily', hour: 9, minute: 30 }]);
  assert.equal(plan.limited, false);
  assert.equal(JSON.stringify(plan).includes('Medicamento manual'), false);
  assert.equal(JSON.stringify(plan).includes('Concentración privada'), false);
  assert.deepEqual(Object.keys(plan.entries[0]).sort(), ['identifier', 'trigger']);
});

test('manual weekly reminders use the chosen local weekdays and ignore unrelated expired medication dates', () => {
  const input = state([manualAlert({ days: [2, 4] })]);
  input.medications[0].active = false; input.medications[0].endDate = '2026-11-08';
  const plan = planMedicationNotifications(input, now);
  assert.deepEqual(plan.entries.map(entry => entry.trigger), [
    { kind: 'weekly', weekday: 3, hour: 9, minute: 30 },
    { kind: 'weekly', weekday: 5, hour: 9, minute: 30 },
  ]);
  assert.equal(plan.limited, false);
});

test('missing legacy IDs without a manual name and stale linked IDs cannot silently become standalone reminders', () => {
  for (const invalid of [
    alert({ medicationId: undefined }),
    manualAlert({ medicationName: '' }),
    manualAlert({ medicationName: '   ' }),
    manualAlert({ medicationId: 'missing-record' }),
    manualAlert({ medicationId: '' }),
    manualAlert({ treatmentId: 'missing-treatment' }),
  ]) {
    const input = state([invalid]);
    assert.equal(isMedicationAlertEligible(input, invalid, now), false);
    assert.deepEqual(planMedicationNotifications(input, now).entries, []);
  }
});

test('legacy linked alerts retain finite prescription bounds even when they also contain display text', () => {
  const input = state([alert({ medicationName: 'Nombre manual de presentación', concentration: 'Texto privado' })]);
  input.medications[0].endDate = '2026-11-10';
  const plan = planMedicationNotifications(input, now);
  assert.equal(plan.entries.length, 2);
  assert.equal(plan.entries.every(entry => entry.trigger.kind === 'date'), true);
  assert.equal(plan.limited, false);
});

test('only alerts and medication references from the active profile can be planned', () => {
  const input = state([]);
  input.family = { ownerId: 'another-profile', profiles: { 'another-profile': { profile: { ...input.profile, id: 'another-profile' }, appointments: [], policies: [], claims: [], records: [], medications: input.medications, messages: [], favorites: [], kind: 'Perfil principal', medicationCare: { treatments: [], takes: [], alerts: [alert()] } } } };
  assert.deepEqual(planMedicationNotifications(input, now).entries, []);
  assert.deepEqual(planMedicationNotifications(state([alert({ medicationId: 'other-med' })]), now).entries, []);
});

test('disabled alerts, inactive medications, expired prescriptions and finalized treatments do not schedule', () => {
  assert.equal(planMedicationNotifications(state([alert({ enabled: false })]), now).entries.length, 0);
  const inactive = state(); inactive.medications[0].active = false;
  assert.equal(planMedicationNotifications(inactive, now).entries.length, 0);
  const expired = state(); expired.medications[0].endDate = '2026-11-08';
  assert.equal(planMedicationNotifications(expired, now).entries.length, 0);
  const finalized = state([alert({ treatmentId: 'treatment' })]);
  finalized.medicationCare!.treatments.push({ id: 'treatment', name: 'Tratamiento', medicationIds: ['med'], startDate: '2026-11-01', active: false });
  assert.equal(planMedicationNotifications(finalized, now).entries.length, 0);
});

test('finite prescriptions use one-off dates bounded by start/end, never indefinite recurring triggers', () => {
  const input = state(); input.medications[0].startDate = '2026-11-10'; input.medications[0].endDate = '2026-11-12';
  const plan = planMedicationNotifications(input, now);
  assert.equal(plan.entries.length, 3);
  assert.equal(plan.limited, false);
  const dates = plan.entries.map(entry => { assert.equal(entry.trigger.kind, 'date'); return new Date((entry.trigger as { date: number }).date); });
  assert.deepEqual(dates.map(date => date.getDate()), [10, 11, 12]);
  assert.equal(dates.every(date => date.getHours() === 11 && date.getMinutes() === 5), true);
});

test('display eligibility does not expose a saved ON flag for an expired or finalized linked treatment', () => {
  const input = state([alert({ treatmentId: 'treatment' })]);
  input.medicationCare!.treatments.push({ id: 'treatment', name: 'Tratamiento', medicationIds: ['med'], startDate: '2026-11-01', active: false });
  assert.equal(isMedicationAlertEligible(input, input.medicationCare!.alerts[0], now), false);
  input.medicationCare!.treatments[0].active = true;
  input.medicationCare!.treatments[0].endDate = '2026-11-08';
  assert.equal(isMedicationAlertEligible(input, input.medicationCare!.alerts[0], now), false);
  assert.equal(input.medicationCare!.alerts[0].enabled, true, 'Rendering eligibility never rewrites saved preferences');
});

test('a final treatment date further bounds the medication and skips elapsed times today', () => {
  const input = state([alert({ time: '09:00', treatmentId: 'treatment' })]);
  input.medications[0].endDate = '2026-11-20';
  input.medicationCare!.treatments.push({ id: 'treatment', name: 'Tratamiento', medicationIds: ['med'], startDate: '2026-11-01', endDate: '2026-11-10', active: true });
  const plan = planMedicationNotifications(input, now);
  assert.equal(plan.entries.length, 1);
  assert.equal(new Date((plan.entries[0].trigger as { date: number }).date).getDate(), 10);
});

test('capacity limits keep the earliest occurrences across medications and signal future horizon limits', () => {
  const input = state([alert({ id: 'later', time: '14:00' }), alert({ id: 'sooner', time: '12:00' })]);
  input.medications[0].endDate = '2027-02-01';
  const plan = planMedicationNotifications(input, now, 2);
  assert.equal(plan.entries.length, 2);
  assert.equal(plan.limited, true);
  assert.equal(new Date((plan.entries[0].trigger as { date: number }).date).getDate(), 9);
  assert.equal(new Date((plan.entries[0].trigger as { date: number }).date).getHours(), 12);
  assert.equal(new Date((plan.entries[1].trigger as { date: number }).date).getDate(), 9);
});

test('future prescriptions with no end date never ring before their start and report bounded scheduling', () => {
  const input = state(); input.medications[0].startDate = '2026-11-12';
  const plan = planMedicationNotifications(input, now);
  assert.equal(plan.limited, true);
  assert.equal(plan.entries.length > 0, true);
  assert.equal(plan.entries.every(entry => entry.trigger.kind === 'date' && entry.trigger.date >= new Date(2026, 10, 12).getTime()), true);
});

test('monthly reminders use real one-off dates within the horizon plus the next occurrence and require renewal', () => {
  const input = state([alert({ recurrence: { type: 'monthly', intervalMonths: 1, anchorDate: '2026-11-01' } })]);
  const plan = planMedicationNotifications(input, now);
  const dates = plan.entries.map(entry => { assert.equal(entry.trigger.kind, 'date'); return new Date((entry.trigger as { date: number }).date); });
  assert.deepEqual(dates.map(toISO), ['2026-12-01', '2027-01-01', '2027-02-01']);
  assert.equal(dates.every(date => date.getHours() === 11 && date.getMinutes() === 5), true);
  assert.equal(plan.limited, true);
});

test('six-month reminders retain the next anchored occurrence even when it lies beyond sixty days', () => {
  const input = state([manualAlert({ recurrence: { type: 'monthly', intervalMonths: 6, anchorDate: '2026-11-01' } })]);
  input.medications = [];
  const plan = planMedicationNotifications(input, now);
  assert.equal(plan.entries.length, 1);
  assert.deepEqual(plan.entries[0].trigger, { kind: 'date', date: new Date(2027, 4, 1, 9, 30).getTime() });
  assert.equal(plan.limited, true);
  assert.equal(JSON.stringify(plan).includes('Medicamento manual'), false);
});

test('monthly dates never precede their anchor and skip months without day thirty-one instead of moving it', () => {
  const input = state([manualAlert({ recurrence: { type: 'monthly', intervalMonths: 1, anchorDate: '2027-01-31' } })]);
  const plan = planMedicationNotifications(input, new Date(2026, 11, 1, 10));
  assert.deepEqual(plan.entries.map(entry => toISO(new Date((entry.trigger as { date: number }).date))), ['2027-01-31']);
  const next = planMedicationNotifications(input, new Date(2027, 1, 1, 10));
  assert.deepEqual(next.entries.map(entry => toISO(new Date((entry.trigger as { date: number }).date))), ['2027-03-31', '2027-05-31']);
  assert.equal(next.limited, true);
});

test('six-month leap-day anchors keep the month interval while skipping nonexistent February dates', () => {
  const input = state([manualAlert({ recurrence: { type: 'monthly', intervalMonths: 6, anchorDate: '2024-02-29' } })]);
  const plan = planMedicationNotifications(input, now);
  assert.deepEqual(plan.entries.map(entry => toISO(new Date((entry.trigger as { date: number }).date))), ['2027-08-29']);
  assert.equal(plan.limited, true);
});

test('monthly schedules respect the latest start and earliest end across the linked prescription and treatment', () => {
  const input = state([alert({ treatmentId: 'treatment', recurrence: { type: 'monthly', intervalMonths: 1, anchorDate: '2026-11-01' } })]);
  input.medications[0].endDate = '2027-03-01';
  input.medicationCare!.treatments.push({ id: 'treatment', name: 'Tratamiento', medicationIds: ['med'], startDate: '2026-11-15', endDate: '2027-01-01', active: true });
  const plan = planMedicationNotifications(input, now);
  assert.deepEqual(plan.entries.map(entry => toISO(new Date((entry.trigger as { date: number }).date))), ['2026-12-01', '2027-01-01']);
  assert.equal(plan.limited, false);
  input.medicationCare!.treatments[0].endDate = '2026-11-30';
  assert.deepEqual(planMedicationNotifications(input, now).entries, []);
});

test('a finite six-month prescription can schedule its sole far-future occurrence without promising further ones', () => {
  const input = state([alert({ recurrence: { type: 'monthly', intervalMonths: 6, anchorDate: '2027-05-09' } })]);
  input.medications[0].startDate = '2027-05-01'; input.medications[0].endDate = '2027-05-10';
  const plan = planMedicationNotifications(input, now);
  assert.deepEqual(plan.entries.map(entry => toISO(new Date((entry.trigger as { date: number }).date))), ['2027-05-09']);
  assert.equal(plan.limited, false);
  input.medications[0].endDate = '2027-05-08';
  assert.deepEqual(planMedicationNotifications(input, now).entries, []);
});

test('monthly occurrences today exclude elapsed times and never consume more than the global device quota', () => {
  const input = state([manualAlert({ recurrence: { type: 'monthly', intervalMonths: 1, anchorDate: '2026-11-09' } })]);
  const plan = planMedicationNotifications(input, now, 1);
  assert.deepEqual(plan.entries.map(entry => toISO(new Date((entry.trigger as { date: number }).date))), ['2026-12-09']);
  assert.equal(plan.limited, true);
  const many = state(Array.from({ length: 80 }, (_, index) => manualAlert({ id: `monthly-${index}`, recurrence: { type: 'monthly', intervalMonths: 6, anchorDate: '2027-05-01' } })));
  assert.equal(planMedicationNotifications(many, now).entries.length, 64);
});

test('reconciliation renews one-off six-month dates on resume and keeps only the active profile namespace', async () => {
  let current = now;
  const input = state([manualAlert({ recurrence: { type: 'monthly', intervalMonths: 6, anchorDate: '2026-11-10' } })]);
  const fake = adapter(['appointment-reminder']);
  const sync = createMedicationNotificationSync(async () => fake.value, () => current);
  const first = await sync(input);
  assert.match(first.notice!, /renovar/);
  const expiredId = fake.created[0].identifier;
  current = new Date(2027, 4, 10, 12);
  const refreshed = await sync(input);
  assert.equal(refreshed.scheduled, 1);
  assert.equal(fake.scheduled.has(expiredId), false);
  assert.equal(toISO(new Date((fake.created.at(-1)!.trigger as { date: number }).date)), '2027-11-10');
  input.profile = { ...input.profile, id: 'another-profile' };
  await sync(input);
  assert.equal([...fake.scheduled.keys()].filter(id => id.startsWith(MEDICATION_NOTIFICATION_PREFIX)).every(id => id.includes(':another-profile:')), true);
  assert.equal(fake.scheduled.has('appointment-reminder'), true);
});

test('reconcile preserves unrelated reminders, reuses matching schedules and cancels only its namespace', async () => {
  const fake = adapter(['appointment-reminder']);
  const sync = createMedicationNotificationSync(async () => fake.value, () => now);
  assert.equal((await sync(state())).scheduled, 1);
  assert.equal((await sync(state())).scheduled, 1);
  assert.equal(fake.created.length, 1);
  await sync(state([]));
  assert.deepEqual([...fake.scheduled.keys()], ['appointment-reminder']);
  assert.equal(fake.cancelled.every(id => id.startsWith(MEDICATION_NOTIFICATION_PREFIX)), true);
});

test('the event reference suffix upgrades legacy schedules while keeping ownership cancellation compatible', async () => {
  const input = state();
  const old = `${MEDICATION_NOTIFICATION_PREFIX}${encodeURIComponent(input.profile.id)}:alert:daily:all:11:5:tz${now.getTimezoneOffset()}`;
  const fake = adapter([old, 'appointment-reminder']);
  const result = await createMedicationNotificationSync(async () => fake.value, () => now)(input);
  assert.equal(result.scheduled, 1); assert.equal(fake.scheduled.has(old), false);
  assert.equal(fake.scheduled.has('appointment-reminder'), true);
  assert.match(fake.created[0].identifier, /:event1$/);
});

test('manual reminders use the same reconciliation, privacy and cancellation rules as linked reminders', async () => {
  const fake = adapter(['appointment-reminder']);
  const sync = createMedicationNotificationSync(async () => fake.value, () => now);
  const input = state([manualAlert()]); input.medications = [];
  assert.equal((await sync(input)).scheduled, 1);
  assert.equal(fake.created[0].identifier.startsWith(MEDICATION_NOTIFICATION_PREFIX), true);
  input.medicationCare!.alerts[0] = manualAlert({ medicationName: 'Nombre manual corregido', concentration: 'Otra concentración privada' });
  assert.equal((await sync(input)).scheduled, 1);
  assert.equal(fake.created.length, 1, 'A generic notification contains neither the edited name nor concentration');
  assert.equal(JSON.stringify(fake.created).includes('privada'), false);
  input.medicationCare!.alerts[0] = { ...input.medicationCare!.alerts[0], enabled: false };
  await sync(input);
  assert.deepEqual([...fake.scheduled.keys()], ['appointment-reminder']);
});

test('a manual reminder still requires notification permission and cancels existing own notices when revoked', async () => {
  const fake = adapter(['appointment-reminder']);
  const sync = createMedicationNotificationSync(async () => fake.value, () => now);
  const input = state([manualAlert()]); input.medications = [];
  await sync(input); fake.deny();
  const result = await sync(input);
  assert.equal(result.scheduled, 0);
  assert.match(result.error!, /desactivadas/);
  assert.deepEqual([...fake.scheduled.keys()], ['appointment-reminder']);
});

test('changing time or active profile replaces previous own schedules without touching other alarms', async () => {
  const fake = adapter(['appointment-reminder']);
  const sync = createMedicationNotificationSync(async () => fake.value, () => now);
  await sync(state());
  const oldId = fake.created[0].identifier;
  const next = state([alert({ time: '12:00' })]); next.profile = { ...next.profile, id: 'child' };
  await sync(next);
  assert.equal(fake.scheduled.has(oldId), false);
  assert.equal(fake.scheduled.has('appointment-reminder'), true);
  assert.equal(fake.scheduled.size, 2);
  assert.equal(fake.created[1].identifier.includes(':child:'), true);
});

test('permission revocation cancels previous own notices and returns an explicit inactive-delivery error', async () => {
  const fake = adapter(['appointment-reminder']);
  const sync = createMedicationNotificationSync(async () => fake.value, () => now);
  await sync(state()); fake.deny();
  const result = await sync(state());
  assert.equal(result.scheduled, 0);
  assert.match(result.error!, /desactivadas/);
  assert.deepEqual([...fake.scheduled.keys()], ['appointment-reminder']);
});

test('a profile/reset that supersedes an in-flight native schedule immediately cancels that result', async () => {
  const fake = adapter(['appointment-reminder']);
  let release!: () => void;
  let started!: () => void;
  const begun = new Promise<void>(resolve => { started = resolve; });
  const held = new Promise<void>(resolve => { release = resolve; });
  const original = fake.value.schedule;
  fake.value.schedule = async entry => { started(); await held; return original(entry); };
  const sync = createMedicationNotificationSync(async () => fake.value, () => now);
  const first = sync(state()); await begun;
  const reset = sync(state([])); release();
  await Promise.all([first, reset]);
  assert.deepEqual([...fake.scheduled.keys()], ['appointment-reminder']);
});

test('partial scheduling failure cancels newly-created own alarms and the queue remains usable', async () => {
  const fake = adapter();
  const original = fake.value.schedule;
  let count = 0;
  fake.value.schedule = async entry => { if (++count === 2) throw new Error('native failure'); return original(entry); };
  const sync = createMedicationNotificationSync(async () => fake.value, () => now);
  const result = await sync(state([alert({ days: [1, 2] })]));
  assert.equal(result.scheduled, 0);
  assert.match(result.error!, /No se pudieron/);
  assert.equal(fake.scheduled.size, 0);
  assert.equal((await sync(state())).scheduled, 1);
});

test('unsupported native modules, web and native enumeration failures resolve without crashing', async () => {
  assert.deepEqual(await createMedicationNotificationSync(async () => null)(state()), { scheduled: 0, unavailable: true });
  const fake = adapter(); fake.value.scheduled = async () => { throw new Error('missing native module'); };
  assert.match((await createMedicationNotificationSync(async () => fake.value)(state())).error!, /No se pudieron/);
});

test('other notification namespaces consume capacity but can never be cancelled to create room', async () => {
  const foreign = Array.from({ length: 64 }, (_, index) => `appointment-${index}`);
  const fake = adapter(foreign);
  const result = await createMedicationNotificationSync(async () => fake.value, () => now)(state());
  assert.equal(result.scheduled, 0);
  assert.match(result.error!, /límite/);
  assert.deepEqual([...fake.scheduled.keys()], foreign);
  assert.deepEqual(fake.cancelled, []);
});
