import assert from "node:assert/strict";
import test from "node:test";
import type { AppState, Appointment } from "../src/domain/types";
import { createDemoState } from "../src/domain/seed";
import {
  appReducer,
  appointmentTimestamp,
  createPersistenceQueue,
  hydrateState,
  isISODate,
  isPatient,
  parseStoredState,
  validateAppState,
} from "../src/domain/reducer";

const now = new Date(2030, 0, 15, 8, 0).getTime();
const seed = () => createDemoState(new Date(now));
const empty = (): AppState => ({ ...seed(), appointments: [], messages: [] });
const appointment = (patch: Partial<Appointment> = {}): Appointment => ({
  id: "test-appointment",
  doctorId: "doctor-elena",
  date: "2030-01-20",
  time: "10:00",
  mode: "Presencial",
  patientName: "Sofía Martínez",
  reason: "Consulta de ejemplo",
  visitType: "Primera vez",
  paymentMethod: "Particular",
  status: "scheduled",
  createdAt: new Date(now).toISOString(),
  ...patch,
});
const book = (state: AppState, value: Appointment) =>
  appReducer(state, { type: "ADD_APPOINTMENT", appointment: value }, now);

test("demo state has six independent fictional profiles and future in-person/teleconsult appointments", () => {
  const state = seed();
  assert.equal(state.doctors.length, 6);
  assert.ok(validateAppState(state));
  assert.ok(
    state.appointments.some(
      (x) =>
        x.mode === "Teleconsulta" &&
        x.status === "scheduled" &&
        appointmentTimestamp(x) > now,
    ),
  );
  assert.ok(
    state.appointments.some(
      (x) =>
        x.mode === "Presencial" &&
        x.status === "scheduled" &&
        appointmentTimestamp(x) > now,
    ),
  );
  const second = seed();
  state.doctors[0].modalities.length = 0;
  assert.ok(second.doctors[0].modalities.length > 0);
});

test("calendar parsing rejects rollover dates, malformed time and past scheduled booking", () => {
  assert.equal(isISODate("2030-02-29"), false);
  assert.equal(isISODate("2032-02-29"), true);
  assert.equal(isISODate("2030-04-31"), false);
  const state = empty();
  for (const patch of [
    { date: "2030-02-30" },
    { time: "24:00" },
    { time: "9:00" },
    { date: "2030-01-15", time: "08:00" },
    { date: "2030-01-14" },
  ]) {
    assert.throws(() => book(state, appointment(patch)));
  }
  assert.equal(state.appointments.length, 0);
});

test("bookings validate professional, offered modality, and chosen insurance policy", () => {
  const state = empty();
  assert.throws(
    () => book(state, appointment({ doctorId: "missing" })),
    /profesional/,
  );
  assert.throws(
    () =>
      book(
        state,
        appointment({ doctorId: "doctor-daniel", mode: "Teleconsulta" }),
      ),
    /modalidad/,
  );
  assert.throws(
    () => book(state, appointment({ paymentMethod: "Seguro" })),
    /póliza/,
  );
  assert.throws(
    () =>
      book(
        state,
        appointment({ paymentMethod: "Seguro", insuranceId: "missing" }),
      ),
    /póliza/,
  );
  assert.equal(
    book(
      state,
      appointment({ paymentMethod: "Seguro", insuranceId: "policy-demo" }),
    ).appointments.length,
    1,
  );
});

test("insured bookings require the policy to cover the appointment date and doctor insurer list", () => {
  const state = empty();
  const insured = appointment({
    paymentMethod: "Seguro",
    insuranceId: "policy-demo",
  });
  const expired = {
    ...state,
    policies: [{ ...state.policies[0], endDate: "2030-01-19" }],
  };
  const notStarted = {
    ...state,
    policies: [{ ...state.policies[0], startDate: "2030-01-21" }],
  };
  assert.throws(() => book(expired, insured), /vigente/);
  assert.throws(() => book(notStarted, insured), /vigente/);
  assert.throws(
    () => book(state, { ...insured, doctorId: "doctor-daniel" }),
    /aseguradora/,
  );
  const inclusive = {
    ...state,
    policies: [
      { ...state.policies[0], startDate: "2030-01-20", endDate: "2030-01-20" },
    ],
  };
  assert.equal(book(inclusive, insured).appointments.length, 1);
});

test("reschedule/payment changes revalidate insurance but a notes-only edit preserves an older booking", () => {
  let state = book(
    empty(),
    appointment({ paymentMethod: "Seguro", insuranceId: "policy-demo" }),
  );
  const later = new Date(2030, 0, 21, 8).getTime();
  state = appReducer(
    state,
    {
      type: "UPDATE_POLICY",
      id: "policy-demo",
      patch: { endDate: "2030-01-19" },
    },
    later,
  );
  const edited = appReducer(
    state,
    {
      type: "UPDATE_APPOINTMENT",
      id: "test-appointment",
      patch: { notes: "Nota administrativa" },
    },
    later,
  );
  assert.equal(edited.appointments[0].notes, "Nota administrativa");
  assert.throws(
    () =>
      appReducer(
        state,
        {
          type: "UPDATE_APPOINTMENT",
          id: "test-appointment",
          patch: { date: "2030-01-22", time: "11:00" },
        },
        later,
      ),
    /vigente/,
  );
  assert.throws(
    () =>
      appReducer(
        state,
        {
          type: "UPDATE_APPOINTMENT",
          id: "test-appointment",
          patch: { insuranceId: "policy-demo" },
        },
        later,
      ),
    /vigente/,
  );
});

test("policy edits cannot invalidate a linked future insured appointment and failures are transactional", () => {
  const state = book(
    empty(),
    appointment({ paymentMethod: "Seguro", insuranceId: "policy-demo" }),
  );
  const original = JSON.stringify(state);
  assert.throws(
    () =>
      appReducer(
        state,
        {
          type: "UPDATE_POLICY",
          id: "policy-demo",
          patch: { endDate: "2030-01-19" },
        },
        now,
      ),
    /vigente/,
  );
  assert.throws(
    () =>
      appReducer(
        state,
        {
          type: "UPDATE_POLICY",
          id: "policy-demo",
          patch: { startDate: "2030-01-21" },
        },
        now,
      ),
    /vigente/,
  );
  assert.throws(
    () =>
      appReducer(
        state,
        {
          type: "UPDATE_POLICY",
          id: "policy-demo",
          patch: { insurer: "Otra aseguradora" },
        },
        now,
      ),
    /aseguradora/,
  );
  assert.equal(JSON.stringify(state), original);
  const updated = appReducer(
    state,
    {
      type: "UPDATE_POLICY",
      id: "policy-demo",
      patch: { notes: "Información administrativa" },
    },
    now,
  );
  assert.equal(updated.policies[0].notes, "Información administrativa");
  assert.equal(updated.appointments[0].insuranceId, "policy-demo");
});

test("doctor slot collision is blocked even for another patient and cancelled slots reopen", () => {
  const first = book(empty(), appointment());
  const candidate = appointment({ id: "second", patientName: "Otra Persona" });
  assert.throws(() => book(first, candidate), /ocupado/);
  const cancelled = appReducer(
    first,
    {
      type: "UPDATE_APPOINTMENT",
      id: "test-appointment",
      patch: { status: "cancelled" },
    },
    now,
  );
  const next = book(cancelled, candidate);
  assert.equal(next.appointments.length, 2);
  assert.equal(next.appointments[0].status, "cancelled");
});

test("patient conflicts cover overlapping half-hour intervals across different professionals", () => {
  const first = book(empty(), appointment());
  assert.throws(
    () =>
      book(
        first,
        appointment({
          id: "overlap",
          doctorId: "doctor-ana",
          patientName: "  sofia   MARTINEZ ",
          time: "10:15",
        }),
      ),
    /paciente.*cruza/,
  );
  assert.throws(
    () =>
      book(
        first,
        appointment({
          id: "before-overlap",
          doctorId: "doctor-ana",
          time: "09:45",
        }),
      ),
    /paciente.*cruza/,
  );
  assert.equal(
    book(
      first,
      appointment({ id: "adjacent", doctorId: "doctor-ana", time: "10:30" }),
    ).appointments.length,
    2,
  );
  assert.equal(
    book(
      first,
      appointment({
        id: "other-patient",
        doctorId: "doctor-ana",
        patientName: "Otro paciente",
        time: "10:15",
      }),
    ).appointments.length,
    2,
  );
});

test("stable patient identity survives a profile rename and legacy appointments acquire the identity", () => {
  let state = book(empty(), appointment({ patientId: "patient-sofia" }));
  state = book(state, appointment({ id: "legacy", date: "2030-01-21" }));
  const renamed = appReducer(
    state,
    { type: "UPDATE_PROFILE", patch: { name: "Sofía López" } },
    now,
  );
  assert.ok(
    renamed.appointments.every(
      (x) => x.patientName === "Sofía López" && x.patientId === "patient-sofia",
    ),
  );
  assert.throws(
    () =>
      book(
        renamed,
        appointment({
          id: "renamed-overlap",
          doctorId: "doctor-ana",
          patientName: "Nombre anterior",
          patientId: "patient-sofia",
          time: "10:15",
        }),
      ),
    /paciente.*cruza/,
  );
  assert.equal(
    book(
      renamed,
      appointment({
        id: "different-person",
        doctorId: "doctor-ana",
        patientName: "Sofía López",
        patientId: "different-patient",
        time: "10:15",
      }),
    ).appointments.length,
    3,
  );
  assert.equal(state.appointments[0].patientName, "Sofía Martínez");
});

test("overlap calculation also protects a patient across midnight", () => {
  const first = book(
    empty(),
    appointment({ date: "2030-01-20", time: "23:45" }),
  );
  assert.throws(
    () =>
      book(
        first,
        appointment({
          id: "next-day",
          doctorId: "doctor-ana",
          date: "2030-01-21",
          time: "00:00",
        }),
      ),
    /paciente.*cruza/,
  );
});

test("rescheduling is transactional, excludes the appointment itself, and preserves history", () => {
  let state = book(empty(), appointment());
  state = book(state, appointment({ id: "second", time: "11:00" }));
  const original = JSON.stringify(state);
  assert.throws(
    () =>
      appReducer(
        state,
        {
          type: "UPDATE_APPOINTMENT",
          id: "test-appointment",
          patch: { time: "11:00" },
        },
        now,
      ),
    /ocupado/,
  );
  assert.equal(JSON.stringify(state), original);
  const same = appReducer(
    state,
    {
      type: "UPDATE_APPOINTMENT",
      id: "test-appointment",
      patch: { time: "10:00" },
    },
    now,
  );
  assert.equal(same.appointments[0].id, "test-appointment");
  const next = appReducer(
    state,
    {
      type: "UPDATE_APPOINTMENT",
      id: "test-appointment",
      patch: { date: "2030-01-21", time: "11:00" },
    },
    now,
  );
  assert.equal(next.appointments[0].date, "2030-01-21");
  assert.equal(next.appointments[0].createdAt, state.appointments[0].createdAt);
  assert.equal(state.appointments[0].date, "2030-01-20");
});

test("expired scheduled appointments can be cancelled without allowing a new past reservation", () => {
  const state = {
    ...empty(),
    appointments: [appointment({ date: "2030-01-14" })],
  };
  const next = appReducer(
    state,
    {
      type: "UPDATE_APPOINTMENT",
      id: "test-appointment",
      patch: { status: "cancelled" },
    },
    now,
  );
  assert.equal(next.appointments[0].status, "cancelled");
  assert.throws(
    () =>
      appReducer(
        next,
        {
          type: "UPDATE_APPOINTMENT",
          id: "test-appointment",
          patch: { status: "scheduled" },
        },
        now,
      ),
    /futuras/,
  );
});

test("hydration rejects malformed JSON, unsupported versions and invalid nested data", () => {
  const fallback = seed();
  for (const raw of [
    "{bad json",
    "null",
    JSON.stringify({ schemaVersion: 2 }),
    JSON.stringify({ ...seed(), favorites: ["missing-doctor"] }),
    JSON.stringify({
      ...seed(),
      appointments: [appointment({ doctorId: "missing" })],
    }),
    JSON.stringify({
      ...seed(),
      settings: {
        reminders: true,
        biometricLock: false,
        meetingBaseUrl: "javascript:alert(1)",
      },
    }),
  ]) {
    const result = hydrateState(raw, fallback);
    assert.equal(result.state, fallback);
    assert.ok(result.error);
    assert.throws(() => parseStoredState(raw));
  }
  assert.equal(hydrateState(null, fallback).error, null);
  assert.deepEqual(parseStoredState(JSON.stringify(fallback)), fallback);
});

test("hydration rejects duplicate IDs, missing message references and invalid patient data", () => {
  const state = seed();
  assert.equal(
    validateAppState({
      ...state,
      records: [state.records[0], state.records[0]],
    }),
    false,
  );
  assert.equal(
    validateAppState({
      ...state,
      messages: [{ ...state.messages[0], appointmentId: "missing" }],
    }),
    false,
  );
  assert.equal(
    validateAppState({
      ...state,
      profile: { ...state.profile, email: "invalid-email" },
    }),
    false,
  );
  assert.equal(
    validateAppState({
      ...state,
      profile: { ...state.profile, birthDate: "2099-01-01" },
    }),
    false,
  );
  assert.equal(
    validateAppState({
      ...state,
      appointments: [{ ...state.appointments[0], patientId: 123 }],
    }),
    false,
  );
});

test("a date of birth today is valid before noon while tomorrow remains invalid", () => {
  const profile = seed().profile;
  assert.equal(
    isPatient(
      { ...profile, birthDate: "2030-01-15" },
      new Date(2030, 0, 15, 0, 1).getTime(),
    ),
    true,
  );
  assert.equal(
    isPatient(
      { ...profile, birthDate: "2030-01-16" },
      new Date(2030, 0, 15, 8, 0).getTime(),
    ),
    false,
  );
  assert.equal(
    appReducer(
      seed(),
      { type: "UPDATE_PROFILE", patch: { birthDate: "2030-01-15" } },
      now,
    ).profile.birthDate,
    "2030-01-15",
  );
  assert.throws(() =>
    appReducer(
      seed(),
      { type: "UPDATE_PROFILE", patch: { birthDate: "2030-01-16" } },
      now,
    ),
  );
});

test("invalid profile/settings updates cannot mutate an otherwise valid state", () => {
  const state = seed();
  assert.throws(() =>
    appReducer(
      state,
      { type: "UPDATE_PROFILE", patch: { email: "not-an-email" } },
      now,
    ),
  );
  assert.throws(() =>
    appReducer(
      state,
      { type: "UPDATE_PROFILE", patch: { birthDate: "2030-02-30" } },
      now,
    ),
  );
  assert.throws(() =>
    appReducer(
      state,
      {
        type: "UPDATE_SETTINGS",
        patch: { meetingBaseUrl: "http://example.com/room" },
      },
      now,
    ),
  );
  assert.equal(state.profile.email, "sofia@example.com");
  assert.equal(
    appReducer(
      state,
      {
        type: "UPDATE_SETTINGS",
        patch: { meetingBaseUrl: "https://meet.example.com/room" },
      },
      now,
    ).settings.meetingBaseUrl,
    "https://meet.example.com/room",
  );
  assert.equal(
    appReducer(
      state,
      { type: "UPDATE_PROFILE", patch: { email: "", phone: "" } },
      now,
    ).profile.email,
    "",
  );
});

test("policy removal protects linked claims and scheduled appointments", () => {
  const state = empty();
  assert.throws(
    () => appReducer(state, { type: "DELETE_POLICY", id: "policy-demo" }, now),
    /solicitudes/,
  );
  const withoutClaim = appReducer(
    state,
    { type: "DELETE_CLAIM", id: "claim-demo" },
    now,
  );
  const booked = book(
    withoutClaim,
    appointment({ paymentMethod: "Seguro", insuranceId: "policy-demo" }),
  );
  assert.throws(
    () => appReducer(booked, { type: "DELETE_POLICY", id: "policy-demo" }, now),
    /vinculada/,
  );
  const cancelled = appReducer(
    booked,
    {
      type: "UPDATE_APPOINTMENT",
      id: "test-appointment",
      patch: { status: "cancelled" },
    },
    now,
  );
  const removed = appReducer(
    cancelled,
    { type: "DELETE_POLICY", id: "policy-demo" },
    now,
  );
  assert.equal(removed.policies.length, 0);
  assert.equal(removed.appointments[0].paymentMethod, "Seguro");
  assert.equal(removed.appointments[0].insuranceId, undefined);
  assert.ok(validateAppState(removed));
});

test("serialized storage writes recover from a failure without letting stale data finish last", async () => {
  let release!: () => void;
  const firstHeld = new Promise<void>((resolve) => {
    release = resolve;
  });
  const calls: string[] = [];
  const queue = createPersistenceQueue({
    async setItem(_key, value) {
      calls.push(value);
      if (value === "first") {
        await firstHeld;
        throw new Error("disk unavailable");
      }
    },
  });
  const first = queue.write("first");
  const failure = assert.rejects(first, /disk unavailable/);
  const second = queue.write("second");
  await Promise.resolve();
  assert.deepEqual(calls, ["first"]);
  release();
  await failure;
  await second;
  await queue.flush();
  assert.deepEqual(calls, ["first", "second"]);
});

test("awaited demo reset waits behind pending writes and becomes the durable final snapshot", async () => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const writes: string[] = [];
  let durable = "";
  const queue = createPersistenceQueue({
    async setItem(_key, value) {
      if (writes.length === 0) {
        writes.push(value);
        await held;
      } else writes.push(value);
      durable = value;
    },
  });
  const changed = appReducer(
    seed(),
    { type: "UPDATE_PROFILE", patch: { name: "Otro nombre" } },
    now,
  );
  const oldWrite = queue.write(JSON.stringify(changed));
  const resetSnapshot = createDemoState(new Date(now));
  const reset = queue.write(JSON.stringify(resetSnapshot));
  let resetResolved = false;
  void reset.then(() => {
    resetResolved = true;
  });
  await Promise.resolve();
  assert.equal(resetResolved, false);
  release();
  await Promise.all([oldWrite, reset]);
  assert.equal(parseStoredState(durable).profile.name, "Sofía Martínez");
  assert.equal(writes.length, 2);
});
