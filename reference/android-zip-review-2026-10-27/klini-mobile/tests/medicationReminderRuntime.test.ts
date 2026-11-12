import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createDemoState } from '../src/domain/seed';
import type { MedicationAlert } from '../src/domain/medicationCare';
import { switchProfile } from '../src/domain/family';
import type { AppState } from '../src/domain/types';
import { planMedicationNotifications } from '../src/services/medicationNotificationPlan';
import {
  getDueMedicationReminders, isMedicationReminderEventCurrent, isOwnMedicationReminderNotification,
  medicationReminderPresentation, medicationNotificationReferenceData, parseMedicationReminderEvent, subscribeMedicationReminderEventsWith,
  type MedicationReminderEvent, type MedicationReminderEventsAdapter,
} from '../src/services/medicationReminderRuntime';

const due = new Date(2026, 10, 9, 20, 0);
const before = new Date(2026, 10, 9, 19, 59);
const alert = (patch: Partial<MedicationAlert> = {}): MedicationAlert => ({ id: 'alert', medicationId: 'med', time: '20:00', days: [0, 1, 2, 3, 4, 5, 6], enabled: true, ...patch });
function state(alerts = [alert()]): AppState {
  return { ...createDemoState(), medications: [{ id: 'med', name: 'Nombre clínico privado', dose: 'Dosis privada', frequency: 'Según receta', startDate: '2026-11-01', active: true }], medicationCare: { treatments: [], takes: [], alerts } };
}
function notification(input = state(), delivered = due, plannedAt = before) {
  const entry = planMedicationNotifications(input, plannedAt).entries[0];
  return { date: delivered.getTime(), request: { identifier: entry.identifier, content: { data: medicationNotificationReferenceData(entry), title: 'Título no confiable', body: 'Texto no confiable' } } };
}
const flush = () => new Promise<void>(resolve => setImmediate(resolve));
function nativeEvents(last: unknown | Promise<unknown> = null) {
  let received: (value: unknown) => void = () => undefined;
  let responded: (value: unknown) => void = () => undefined;
  const counts = { removed: 0, cleared: 0, registered: 0, lastRead: 0 };
  const value: MedicationReminderEventsAdapter = {
    defaultActionIdentifier: 'DEFAULT',
    onReceived: callback => { received = callback; counts.registered++; return { remove: () => { counts.removed++; } }; },
    onResponse: callback => { responded = callback; counts.registered++; return { remove: () => { counts.removed++; } }; },
    lastResponse: () => { counts.lastRead++; return last; },
    clearLastResponse: () => { counts.cleared++; },
  };
  return { value, counts, received: (item: unknown) => received(item), response: (item: unknown) => responded(item) };
}

test('opaque notification references carry identity and schedule only, with a versioned upgrade identifier', () => {
  const input = state([alert({ id: 'alert:con separadores' })]); input.profile.id = 'perfil:á';
  const entry = planMedicationNotifications(input, before).entries[0];
  const data = medicationNotificationReferenceData(entry);
  assert.equal(data.profileId, input.profile.id); assert.equal(data.alertId, input.medicationCare!.alerts[0].id);
  assert.equal(data.time, '20:00'); assert.equal(data.triggerKind, 'daily');
  assert.match(entry.identifier, /:event1$/);
  assert.equal(JSON.stringify(data).includes('privad'), false);
  assert.throws(() => medicationNotificationReferenceData({ ...entry, trigger: { kind: 'daily', hour: 19, minute: 0 } }));
});

test('daily, weekly and finite-date notifications resolve to the same local occurrence as the app clock', () => {
  const finite = state(); finite.medications[0].endDate = '2026-11-10';
  for (const input of [state(), state([alert({ days: [1] })]), finite]) {
    const raw = notification(input);
    const event = parseMedicationReminderEvent(raw, 'notification', due)!;
    assert.equal(event.date, '2026-11-09'); assert.equal(event.time, '20:00');
    assert.equal(event.occurrenceKey, getDueMedicationReminders(input, due)[0].occurrenceKey);
    assert.equal(event.source, 'notification');
    assert.equal('title' in event, false); assert.equal('body' in event, false);
  }
  assert.equal(parseMedicationReminderEvent(notification(finite), 'response', due)?.date, '2026-11-09');
});

test('foreign namespaces, malformed identifiers and tampered reference metadata never create medication events', () => {
  const original = notification();
  const tampered = (patch: Record<string, unknown>) => ({ ...original, request: { ...original.request, content: { data: { ...original.request.content.data, ...patch } } } });
  for (const raw of [
    { ...original, request: { ...original.request, identifier: 'appointment-id' } },
    { ...original, request: { ...original.request, identifier: original.request.identifier.replace(':event1', '') } },
    { ...original, request: { ...original.request, identifier: original.request.identifier.replace('alert:', '%ZZ:') } },
    tampered({ profileId: 'another-profile' }), tampered({ alertId: 'other-alert' }), tampered({ time: '21:00' }),
    tampered({ triggerKind: 'weekly' }), tampered({ version: 2 }), tampered({ kind: 'other-kind' }),
  ]) assert.equal(parseMedicationReminderEvent(raw, 'notification', due), null);
  assert.equal(isOwnMedicationReminderNotification(original), true);
  assert.equal(isOwnMedicationReminderNotification(tampered({ kind: 'other-kind' })), false);
});

test('the foreground policy replaces only owned banners, retains sound and preserves SDK defaults for unrelated notifications', () => {
  const own = notification();
  assert.deepEqual(medicationReminderPresentation(own), { shouldShowBanner: false, shouldShowList: false, shouldPlaySound: true, shouldSetBadge: false });
  assert.deepEqual(medicationReminderPresentation({ ...own, request: { ...own.request, identifier: 'appointment-reminder' } }), { shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true });
});

test('future deliveries and responses older than 24 hours are rejected, and prior-day delayed daily occurrences remain exact', () => {
  const raw = notification();
  assert.equal(parseMedicationReminderEvent({ ...raw, date: due.getTime() + 1 }, 'response', due), null);
  assert.equal(parseMedicationReminderEvent(raw, 'response', new Date(due.getTime() + 25 * 60 * 60 * 1000)), null);
  const delayed = new Date(2026, 10, 10, 0, 5);
  assert.equal(parseMedicationReminderEvent(notification(state(), delayed), 'response', delayed)?.date, '2026-11-09');
  assert.equal(parseMedicationReminderEvent(raw, 'response', new Date('invalid')), null);
});

test('one-off date and weekly metadata must match their identifier and real due date', () => {
  const finite = state(); finite.medications[0].endDate = '2026-11-10';
  const raw = notification(finite);
  assert.equal(parseMedicationReminderEvent({ ...raw, request: { ...raw.request, content: { data: { ...raw.request.content.data, scheduledAt: due.getTime() + 60_000 } } } }, 'notification', due), null);
  const weekly = notification(state([alert({ days: [1] })]));
  assert.equal(parseMedicationReminderEvent({ ...weekly, request: { ...weekly.request, content: { data: { ...weekly.request.content.data, weekday: 3 } } } }, 'notification', due), null);
});

test('clock fallback generates only the current local minute without OS permissions, and respects seen keys', () => {
  const input = state();
  assert.deepEqual(getDueMedicationReminders(input, before), []);
  const events = getDueMedicationReminders(input, new Date(2026, 10, 9, 20, 0, 59));
  assert.equal(events.length, 1); assert.equal(events[0].source, 'clock');
  assert.deepEqual(getDueMedicationReminders(input, due, new Set([events[0].occurrenceKey])), []);
  assert.deepEqual(getDueMedicationReminders(input, new Date(2026, 10, 9, 20, 1)), []);
  assert.deepEqual(getDueMedicationReminders(input, new Date('invalid')), []);
});

test('clock and queued events respect profile, enabled state, weekday, start/end and current references', () => {
  const input = state(); const event = getDueMedicationReminders(input, due)[0];
  const variants = [
    switchProfile(input, { id: 'different-profile', name: 'Perfil infantil', kind: 'Niño' }),
    state([alert({ enabled: false })]), state([alert({ days: [2] })]), state([alert({ time: '21:00' })]), state([alert({ medicationId: 'missing' })]),
  ];
  const futureMedication = state(); futureMedication.medications[0].startDate = '2026-11-10'; variants.push(futureMedication);
  const expired = state(); expired.medications[0].endDate = '2026-11-08'; variants.push(expired);
  const futureTreatment = state([alert({ treatmentId: 'treatment' })]);
  futureTreatment.medicationCare!.treatments.push({ id: 'treatment', name: 'Tratamiento', medicationIds: ['med'], startDate: '2026-11-10', active: true }); variants.push(futureTreatment);
  const finalized = state([alert({ treatmentId: 'treatment' })]);
  finalized.medicationCare!.treatments.push({ id: 'treatment', name: 'Tratamiento', medicationIds: ['med'], startDate: '2026-11-01', active: false }); variants.push(finalized);
  for (const changed of variants) {
    assert.equal(isMedicationReminderEventCurrent(changed, event, due), false);
    assert.deepEqual(getDueMedicationReminders(changed, due), []);
  }
});

test('a popup can be confirmed several minutes later but not in the future or after acknowledgment', () => {
  const input = state(); const event = getDueMedicationReminders(input, due)[0];
  assert.equal(isMedicationReminderEventCurrent(input, event, new Date(2026, 10, 9, 20, 12)), true);
  assert.equal(isMedicationReminderEventCurrent(input, event, before), false);
  assert.equal(isMedicationReminderEventCurrent(input, { ...event, occurrenceKey: 'tampered' }, due), false);
  input.medicationCare!.reminderActions = [{ id: 'ack', alertId: event.alertId, date: event.date, time: event.time, status: 'skipped', recordedAt: due.toISOString(), nameSnapshot: 'Nombre registrado' }];
  assert.equal(isMedicationReminderEventCurrent(input, event, due), false);
  assert.deepEqual(getDueMedicationReminders(input, due), []);
});

test('standalone reminders work without inventing a medication record or reading other profile scopes', () => {
  const manual = alert({ medicationId: undefined, medicationName: 'Nombre manual', concentration: 'Concentración manual' });
  const input = state([manual]); input.medications = [];
  assert.equal(getDueMedicationReminders(input, due).length, 1);
  input.medicationCare!.alerts = [];
  assert.deepEqual(getDueMedicationReminders(input, due), []);
});

test('monthly and six-month clock reminders match the real anchored date rather than every legacy day', () => {
  const monthly = state([alert({ recurrence: { type: 'monthly', intervalMonths: 1, anchorDate: '2026-11-01' } })]);
  assert.equal(getDueMedicationReminders(monthly, new Date(2026, 11, 1, 20)).length, 1);
  assert.deepEqual(getDueMedicationReminders(monthly, new Date(2026, 11, 2, 20)), []);
  assert.deepEqual(getDueMedicationReminders(monthly, due), []);
  const halfYear = state([alert({ recurrence: { type: 'monthly', intervalMonths: 6, anchorDate: '2026-11-09' } })]);
  assert.equal(getDueMedicationReminders(halfYear, new Date(2027, 4, 9, 20)).length, 1);
  assert.deepEqual(getDueMedicationReminders(halfYear, new Date(2026, 11, 9, 20)), []);
  assert.deepEqual(getDueMedicationReminders(halfYear, new Date(2026, 4, 9, 20)), []);
});

test('monthly day thirty-one and six-month leap anchors never offer a normalized substitute date', () => {
  const monthly = state([alert({ recurrence: { type: 'monthly', intervalMonths: 1, anchorDate: '2027-01-31' } })]);
  assert.deepEqual(getDueMedicationReminders(monthly, new Date(2027, 1, 28, 20)), []);
  assert.deepEqual(getDueMedicationReminders(monthly, new Date(2027, 2, 3, 20)), []);
  assert.equal(getDueMedicationReminders(monthly, new Date(2027, 2, 31, 20)).length, 1);
  const leap = state([alert({ recurrence: { type: 'monthly', intervalMonths: 6, anchorDate: '2024-02-29' } })]);
  assert.deepEqual(getDueMedicationReminders(leap, new Date(2027, 1, 28, 20)), []);
  assert.equal(getDueMedicationReminders(leap, new Date(2027, 7, 29, 20)).length, 1);
});

test('monthly one-off native metadata and the clock share a key, and recurrence edits invalidate old delivery', () => {
  const at = new Date(2026, 11, 9, 20);
  const plannedAt = new Date(2026, 11, 9, 19, 59);
  const input = state([alert({ recurrence: { type: 'monthly', intervalMonths: 1, anchorDate: '2026-11-09' } })]);
  const raw = notification(input, at, plannedAt);
  assert.equal(raw.request.content.data.triggerKind, 'date');
  const event = parseMedicationReminderEvent(raw, 'notification', at)!;
  assert.equal(event.occurrenceKey, getDueMedicationReminders(input, at)[0].occurrenceKey);
  assert.equal(isMedicationReminderEventCurrent(input, event, new Date(2026, 11, 9, 20, 15)), true);
  input.medicationCare!.alerts[0].recurrence!.intervalMonths = 6;
  assert.equal(isMedicationReminderEventCurrent(input, event, at), false);
  assert.deepEqual(getDueMedicationReminders(input, at), []);
  input.medicationCare!.alerts[0].recurrence!.intervalMonths = 1;
  input.profile = { ...input.profile, id: 'different-profile' };
  assert.equal(isMedicationReminderEventCurrent(input, event, at), false);
});

test('cold-start six-month responses remain actionable only within the original profile, dates and acknowledgment state', async () => {
  const at = new Date(2027, 4, 9, 20);
  const input = state([alert({ recurrence: { type: 'monthly', intervalMonths: 6, anchorDate: '2026-11-09' } })]);
  const raw = notification(input, at, new Date(2026, 10, 10, 10));
  const adapter = nativeEvents({ actionIdentifier: 'DEFAULT', notification: raw });
  const events: MedicationReminderEvent[] = [];
  const unsubscribe = subscribeMedicationReminderEventsWith(async () => adapter.value, event => events.push(event), () => new Date(2027, 4, 9, 20, 8));
  await flush();
  assert.equal(events.length, 1); assert.equal(events[0].date, '2027-05-09');
  assert.equal(events[0].source, 'response');
  assert.equal(isMedicationReminderEventCurrent(input, events[0], new Date(2027, 4, 9, 20, 8)), true);
  input.medicationCare!.reminderActions = [{ id: 'action', alertId: events[0].alertId, date: events[0].date, time: events[0].time, status: 'taken', recordedAt: at.toISOString(), nameSnapshot: 'Nombre local' }];
  assert.equal(isMedicationReminderEventCurrent(input, events[0], at), false);
  assert.deepEqual(getDueMedicationReminders(input, at), []);
  delete input.medicationCare!.reminderActions;
  input.medications[0].endDate = '2027-05-08';
  assert.equal(isMedicationReminderEventCurrent(input, events[0], at), false);
  unsubscribe();
});

test('six-month delivery cannot bypass treatment start/end dates or enable a missing legacy medication reference', () => {
  const at = new Date(2027, 4, 9, 20);
  const input = state([alert({ treatmentId: 'treatment', recurrence: { type: 'monthly', intervalMonths: 6, anchorDate: '2026-11-09' } })]);
  input.medicationCare!.treatments.push({ id: 'treatment', name: 'Tratamiento', medicationIds: ['med'], startDate: '2027-05-10', active: true });
  assert.deepEqual(getDueMedicationReminders(input, at), []);
  input.medicationCare!.treatments[0].startDate = '2027-05-01';
  assert.equal(getDueMedicationReminders(input, at).length, 1);
  input.medicationCare!.treatments[0].endDate = '2027-05-08';
  assert.deepEqual(getDueMedicationReminders(input, at), []);
  const manual = state([alert({ medicationId: undefined, medicationName: 'Manual', recurrence: { type: 'monthly', intervalMonths: 6, anchorDate: '2026-11-09' } })]);
  manual.medications = [];
  assert.equal(getDueMedicationReminders(manual, at).length, 1);
  manual.medicationCare!.alerts[0].medicationId = 'missing';
  assert.deepEqual(getDueMedicationReminders(manual, at), []);
});

test('native subscriptions deduplicate received/response/cold delivery and clear only an owned valid response', async () => {
  const raw = notification(); const response = { actionIdentifier: 'DEFAULT', notification: raw };
  const adapter = nativeEvents(response); const events: MedicationReminderEvent[] = [];
  const unsubscribe = subscribeMedicationReminderEventsWith(async () => adapter.value, event => events.push(event), () => due);
  await flush();
  adapter.received(raw); adapter.response(response);
  adapter.response({ actionIdentifier: 'CUSTOM', notification: raw });
  adapter.response({ actionIdentifier: 'DEFAULT', notification: { ...raw, request: { ...raw.request, identifier: 'appointment' } } });
  assert.equal(events.length, 1); assert.equal(events[0].source, 'response');
  assert.equal(adapter.counts.cleared, 2);
  unsubscribe(); adapter.received(raw);
  assert.equal(adapter.counts.removed, 2); assert.equal(events.length, 1);
});

test('an unsubscribe before lazy loading prevents handlers and cold reads from being registered', async () => {
  const adapter = nativeEvents(); let release!: (value: MedicationReminderEventsAdapter) => void;
  const pending = new Promise<MedicationReminderEventsAdapter>(resolve => { release = resolve; });
  const unsubscribe = subscribeMedicationReminderEventsWith(() => pending, () => assert.fail('Late delivery'), () => due);
  unsubscribe(); release(adapter.value); await flush();
  assert.equal(adapter.counts.registered, 0); assert.equal(adapter.counts.lastRead, 0);
});

test('late cold-start results after cleanup and unsupported native modules cannot publish an event', async () => {
  let release!: (value: unknown) => void;
  const pending = new Promise<unknown>(resolve => { release = resolve; });
  const adapter = nativeEvents(pending); let calls = 0;
  const unsubscribe = subscribeMedicationReminderEventsWith(async () => adapter.value, () => { calls++; }, () => due);
  await flush(); unsubscribe(); release({ actionIdentifier: 'DEFAULT', notification: notification() }); await flush();
  assert.equal(calls, 0); assert.equal(adapter.counts.removed, 2); assert.equal(adapter.counts.cleared, 0);
  const noop = subscribeMedicationReminderEventsWith(async () => null, () => assert.fail('Unsupported delivery')); noop();
  const failed = subscribeMedicationReminderEventsWith(() => { throw new Error('Unavailable native module'); }, () => assert.fail('Unsupported delivery')); await flush(); failed();
});

test('a failed cold read does not break live delivery, and a consumer error does not poison later retries', async () => {
  const adapter = nativeEvents(); adapter.value.lastResponse = () => { throw new Error('cold read unavailable'); };
  let calls = 0;
  const unsubscribe = subscribeMedicationReminderEventsWith(async () => adapter.value, () => { if (++calls === 1) throw new Error('consumer'); }, () => due);
  await flush(); adapter.received(notification()); adapter.received(notification());
  assert.equal(calls, 2); assert.equal(adapter.counts.removed, 0); unsubscribe();
});

test('DST repeated wall-clock minutes share a key while nonexistent spring times do not become a dose event', () => {
  const code = `
    import {getDueMedicationReminders,isMedicationReminderEventCurrent} from './src/services/medicationReminderRuntime.ts';
    import {createDemoState} from './src/domain/seed.ts';
    import {medicationReminderOccurrenceKey} from './src/domain/medicationCare.ts';
    const s=createDemoState();s.medications=[];s.medicationCare={treatments:[],takes:[],alerts:[{id:'dst',medicationName:'Manual',time:'01:30',days:[0,1,2,3,4,5,6],enabled:true}]};
    const first=getDueMedicationReminders(s,new Date('2026-11-01T01:30:00-04:00'));
    const second=getDueMedicationReminders(s,new Date('2026-11-01T01:30:00-05:00'));
    const duplicate=getDueMedicationReminders(s,new Date('2026-11-01T01:30:00-05:00'),new Set([first[0].occurrenceKey]));
    s.medicationCare.alerts[0].time='02:30';
    const spring=getDueMedicationReminders(s,new Date('2026-03-08T03:30:00-04:00'));
    const forged={profileId:s.profile.id,alertId:'dst',date:'2026-03-08',time:'02:30',occurrenceKey:medicationReminderOccurrenceKey('dst','2026-03-08','02:30'),source:'clock'};
    process.stdout.write(JSON.stringify({same:first[0].occurrenceKey===second[0].occurrenceKey,duplicate:duplicate.length,spring:spring.length,forged:isMedicationReminderEventCurrent(s,forged,new Date('2026-03-08T03:30:00-04:00'))}));
  `;
  const result = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', code], { env: { ...process.env, TZ: 'America/New_York' }, encoding: 'utf8', windowsHide: true }));
  assert.deepEqual(result, { same: true, duplicate: 0, spring: 0, forged: false });
});

test('monthly one-off dates and cold responses use the device local calendar in timezones on either side of UTC', () => {
  const code = `
    import {getDueMedicationReminders,medicationNotificationReferenceData,parseMedicationReminderEvent} from './src/services/medicationReminderRuntime.ts';
    import {planMedicationNotifications} from './src/services/medicationNotificationPlan.ts';
    import {createDemoState} from './src/domain/seed.ts';
    import {toISO} from './src/domain/dates.ts';
    const s=createDemoState();s.medications=[];s.medicationCare={treatments:[],takes:[],alerts:[{id:'monthly',medicationName:'Manual',time:'00:05',days:[0,1,2,3,4,5,6],enabled:true,recurrence:{type:'monthly',intervalMonths:1,anchorDate:'2026-11-01'}}]};
    const entry=planMedicationNotifications(s,new Date(2026,10,30,23,59)).entries[0];
    const at=new Date(2026,11,1,0,5),cold=new Date(2026,11,1,0,6);
    const raw={date:at.getTime(),request:{identifier:entry.identifier,content:{data:medicationNotificationReferenceData(entry)}}};
    const event=parseMedicationReminderEvent(raw,'response',cold),clock=getDueMedicationReminders(s,at);
    process.stdout.write(JSON.stringify({date:toISO(new Date(entry.trigger.date)),clock:clock[0].date,cold:event.date,same:event.occurrenceKey===clock[0].occurrenceKey}));
  `;
  for (const timezone of ['America/Los_Angeles', 'Pacific/Auckland']) {
    const result = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', code], { env: { ...process.env, TZ: timezone }, encoding: 'utf8', windowsHide: true }));
    assert.deepEqual(result, { date: '2026-12-01', clock: '2026-12-01', cold: '2026-12-01', same: true });
  }
});

test('monthly DST-gap dates are skipped by the native plan instead of ringing at a shifted clock hour', () => {
  const code = `
    import {planMedicationNotifications} from './src/services/medicationNotificationPlan.ts';
    import {getDueMedicationReminders} from './src/services/medicationReminderRuntime.ts';
    import {createDemoState} from './src/domain/seed.ts';
    import {toISO} from './src/domain/dates.ts';
    const s=createDemoState();s.medications=[];s.medicationCare={treatments:[],takes:[],alerts:[{id:'monthly',medicationName:'Manual',time:'02:30',days:[0,1,2,3,4,5,6],enabled:true,recurrence:{type:'monthly',intervalMonths:1,anchorDate:'2026-03-08'}}]};
    const plan=planMedicationNotifications(s,new Date(2026,2,7,12));
    process.stdout.write(JSON.stringify({dates:plan.entries.map(entry=>toISO(new Date(entry.trigger.date))),shifted:getDueMedicationReminders(s,new Date('2026-03-08T03:30:00-04:00')).length}));
  `;
  const result = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', code], { env: { ...process.env, TZ: 'America/New_York' }, encoding: 'utf8', windowsHide: true }));
  assert.deepEqual(result, { dates: ['2026-04-08', '2026-05-08'], shifted: 0 });
});
