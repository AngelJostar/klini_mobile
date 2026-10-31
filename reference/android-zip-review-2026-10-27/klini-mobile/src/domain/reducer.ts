import type {
  AppState,
  Appointment,
  Claim,
  ClinicalRecord,
  Doctor,
  Medication,
  Message,
  Patient,
  Policy,
  Settings,
} from "./types";
import { createDemoState } from "./seed";
import { initialWallet, isWallet, rechargeWallet } from './wallet';
import { isAiSubscription, setProfileAiSubscription, type AiSubscription } from './aiSubscription';
import { provisionSofiaDemoAi } from './demoAccount';

export const STORAGE_KEY = "@klini/app-state:v1";
export const APPOINTMENT_DURATION_MINUTES = 30;
const appointmentStatuses = ["scheduled", "completed", "cancelled"] as const;
const claimStatuses = ["draft", "submitted", "review", "resolved"] as const;
const recordTypes = [
  "Consulta",
  "Estudio",
  "Receta",
  "Vacuna",
  "Nota",
  "Procedimiento",
  "Hospitalización",
  "Alergia",
  "Antecedente",
] as const;
const modes = ["Presencial", "Teleconsulta"] as const;
const visits = ["Primera vez", "Seguimiento"] as const;
const payments = ["Particular", "Seguro"] as const;
const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string";
const nonempty = (v: unknown): v is string => text(v) && v.trim().length > 0;
const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
const optionalText = (v: unknown) => v === undefined || text(v);
const inList = <T extends string>(v: unknown, values: readonly T[]): v is T =>
  text(v) && values.includes(v as T);
const allStrings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every(text);
const uniqueIds = (v: { id: string }[]) =>
  new Set(v.map((x) => x.id)).size === v.length;

export function isISODate(value: unknown): value is string {
  if (!text(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1900 || year > 2200) return false;
  const date = new Date(year, month - 1, day, 12);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export const isClockTime = (v: unknown): v is string =>
  text(v) && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const validTimestamp = (v: unknown) => text(v) && !Number.isNaN(Date.parse(v));
export function isSafeMeetingUrl(v: unknown): v is string {
  if (!text(v)) return false;
  if (!v) return true;
  try {
    const url = new URL(v);
    return (
      url.protocol === "https:" &&
      !!url.hostname &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
const validEmail = (v: unknown) =>
  text(v) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const optionalEmail = (v: unknown) => text(v) && (!v.trim() || validEmail(v));
const validPhone = (v: unknown) =>
  text(v) &&
  /^[+\d\s().-]+$/.test(v) &&
  v.replace(/\D/g, "").length >= 7 &&
  v.replace(/\D/g, "").length <= 15;
const optionalPhone = (v: unknown) => text(v) && (!v.trim() || validPhone(v));

export function isPatient(v: unknown, now: number = Date.now()): v is Patient {
  const date = new Date(now);
  const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return (
    isObject(v) &&
    nonempty(v.id) &&
    nonempty(v.name) &&
    (v.birthDate === '' || isISODate(v.birthDate)) &&
    v.birthDate <= today &&
    text(v.sex) &&
    text(v.bloodType) &&
    optionalEmail(v.email) &&
    optionalPhone(v.phone) &&
    text(v.allergies) &&
    text(v.emergencyName) &&
    optionalPhone(v.emergencyPhone)
  );
}
function isDoctor(v: unknown): v is Doctor {
  return (
    isObject(v) &&
    [
      "id",
      "name",
      "specialty",
      "city",
      "address",
      "bio",
      "initials",
      "avatarColor",
    ].every((k) => nonempty(v[k])) &&
    finite(v.price) &&
    v.price >= 0 &&
    finite(v.rating) &&
    v.rating >= 0 &&
    v.rating <= 5 &&
    finite(v.reviewCount) &&
    Number.isInteger(v.reviewCount) &&
    v.reviewCount >= 0 &&
    finite(v.experience) &&
    v.experience >= 0 &&
    allStrings(v.insurers) &&
    Array.isArray(v.modalities) &&
    v.modalities.length > 0 &&
    v.modalities.every((x) => inList(x, modes))
  );
}
export function isAppointment(v: unknown): v is Appointment {
  return (
    isObject(v) &&
    nonempty(v.id) &&
    nonempty(v.doctorId) &&
    isISODate(v.date) &&
    isClockTime(v.time) &&
    inList(v.mode, modes) &&
    (v.patientId === undefined || nonempty(v.patientId)) &&
    nonempty(v.patientName) &&
    text(v.reason) &&
    inList(v.visitType, visits) &&
    inList(v.paymentMethod, payments) &&
    optionalText(v.insuranceId) &&
    inList(v.status, appointmentStatuses) &&
    validTimestamp(v.createdAt) &&
    optionalText(v.notes) &&
    (v.meetingUrl === undefined || isSafeMeetingUrl(v.meetingUrl)) &&
    optionalText(v.reminderId)
  );
}
function isPolicy(v: unknown): v is Policy {
  return (
    isObject(v) &&
    ["id", "insurer", "number", "holder"].every((k) => nonempty(v[k])) &&
    isISODate(v.startDate) &&
    isISODate(v.endDate) &&
    v.startDate <= v.endDate &&
    text(v.coverage) &&
    optionalPhone(v.phone) &&
    text(v.notes)
  );
}
function isClaim(v: unknown): v is Claim {
  return (
    isObject(v) &&
    nonempty(v.id) &&
    nonempty(v.policyId) &&
    isISODate(v.date) &&
    finite(v.amount) &&
    v.amount >= 0 &&
    nonempty(v.concept) &&
    inList(v.status, claimStatuses) &&
    nonempty(v.folio) &&
    optionalText(v.notes)
  );
}
function isClinicalRecord(v: unknown): v is ClinicalRecord {
  return (
    isObject(v) &&
    nonempty(v.id) &&
    inList(v.type, recordTypes) &&
    nonempty(v.title) &&
    isISODate(v.date) &&
    text(v.doctorName) &&
    (v.time === undefined || v.time === '' || (text(v.time) && /^([01]\d|2[0-3]):[0-5]\d$/.test(v.time))) &&
    optionalText(v.specialty) &&
    optionalText(v.institution) &&
    optionalText(v.reason) &&
    text(v.description) &&
    (v.attachment === undefined ||
      (isObject(v.attachment) &&
        nonempty(v.attachment.uri) &&
        nonempty(v.attachment.name) &&
        nonempty(v.attachment.mimeType)))
  );
}
function isMedication(v: unknown): v is Medication {
  return (
    isObject(v) &&
    nonempty(v.id) &&
    nonempty(v.name) &&
    text(v.dose) &&
    text(v.frequency) &&
    isISODate(v.startDate) &&
    (v.endDate === undefined ||
      (isISODate(v.endDate) && v.endDate >= v.startDate)) &&
    typeof v.active === "boolean"
  );
}
function isMessage(v: unknown): v is Message {
  return (
    isObject(v) &&
    nonempty(v.id) &&
    nonempty(v.appointmentId) &&
    inList(v.author, ["patient", "doctor", "system"]) &&
    nonempty(v.text) &&
    validTimestamp(v.createdAt)
  );
}
function isSettings(v: unknown): v is Settings {
  return (
    isObject(v) &&
    typeof v.reminders === "boolean" &&
    typeof v.biometricLock === "boolean" &&
    isSafeMeetingUrl(v.meetingBaseUrl)
  );
}
const guardedArray = <T extends { id: string }>(
  v: unknown,
  guard: (x: unknown) => x is T,
): v is T[] => Array.isArray(v) && v.every(guard) && uniqueIds(v);

/** Strict validation of all persisted nested data, including important references. */
export function validateAppState(
  v: unknown,
  now: number = Date.now(),
): v is AppState {
  if (
    !isObject(v) ||
    v.schemaVersion !== 1 ||
    !isPatient(v.profile, now) ||
    !guardedArray(v.doctors, isDoctor) ||
    !guardedArray(v.appointments, isAppointment) ||
    !guardedArray(v.policies, isPolicy) ||
    !guardedArray(v.claims, isClaim) ||
    !guardedArray(v.records, isClinicalRecord) ||
    !guardedArray(v.medications, isMedication) ||
    !guardedArray(v.messages, isMessage) ||
    !allStrings(v.favorites) ||
    !isSettings(v.settings) ||
    (v.wallet !== undefined && !isWallet(v.wallet)) ||
    (v.aiSubscription !== undefined && !isAiSubscription(v.aiSubscription))
  )
    return false;
  const doctors = new Set(v.doctors.map((x) => x.id));
  if (v.family !== undefined) {
    if (!isObject(v.family) || !nonempty(v.family.ownerId) || !isObject(v.family.profiles)) return false;
    if (!v.family.profiles[v.family.ownerId] || !v.family.profiles[v.profile.id]) return false;
    for (const [id, scope] of Object.entries(v.family.profiles)) {
      if (!isObject(scope) || !isObject(scope.profile) || scope.profile.id !== id || !text(scope.kind) ||
        !validateAppState({ ...v, ...scope, family: undefined }, now)) return false;
    }
  }
  const appointments = new Set(v.appointments.map((x) => x.id));
  const policies = new Set(v.policies.map((x) => x.id));
  return (
    v.appointments.every(
      (x) =>
        doctors.has(x.doctorId) &&
        (x.insuranceId === undefined || policies.has(x.insuranceId)),
    ) &&
    v.claims.every((x) => policies.has(x.policyId)) &&
    v.messages.every((x) => appointments.has(x.appointmentId)) &&
    v.favorites.every((x) => doctors.has(x)) &&
    new Set(v.favorites).size === v.favorites.length
  );
}

export function parseStoredState(raw: string): AppState {
  const value: unknown = JSON.parse(raw);
  if (!validateAppState(value))
    throw new Error("Los datos guardados no tienen un formato compatible.");
  return value;
}
export function hydrateState(
  raw: string | null,
  fallback: AppState = createDemoState(),
): { state: AppState; error: string | null } {
  if (raw === null) return { state: fallback, error: null };
  try {
    const state = parseStoredState(raw);
    return { state: provisionSofiaDemoAi({ ...state, wallet: state.wallet ?? { ...initialWallet, movements: [] } }), error: null };
  } catch {
    return {
      state: fallback,
      error:
        "No se pudieron recuperar los datos locales. Se muestra una demostración; el archivo anterior no se ha sobrescrito.",
    };
  }
}

let idSequence = 0;
export function createId(prefix: string): string {
  idSequence += 1;
  return `${prefix}_${Date.now().toString(36)}_${idSequence.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
export function appointmentTimestamp(
  appointment: Pick<Appointment, "date" | "time">,
): number {
  if (!isISODate(appointment.date) || !isClockTime(appointment.time))
    throw new Error("Elige una fecha y un horario válidos.");
  const [year, month, day] = appointment.date.split("-").map(Number);
  const [hours, minutes] = appointment.time.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0).getTime();
}
const patientKey = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, " ");
export function assertAppointmentCanBeSaved(
  state: AppState,
  candidate: Appointment,
  options: {
    ignoreId?: string;
    requireFuture?: boolean;
    validateInsurance?: boolean;
    now?: number;
  } = {},
): void {
  if (!isAppointment(candidate))
    throw new Error(
      "Revisa los datos de la cita: fecha, horario, paciente y modalidad.",
    );
  const doctor = state.doctors.find((x) => x.id === candidate.doctorId);
  if (!doctor) throw new Error("No se encontró el profesional seleccionado.");
  if (!doctor.modalities.includes(candidate.mode))
    throw new Error("El profesional no ofrece esa modalidad.");
  if (candidate.status !== "scheduled") return;
  if (
    candidate.paymentMethod === "Seguro" &&
    options.validateInsurance !== false
  ) {
    const policy = state.policies.find((x) => x.id === candidate.insuranceId);
    if (!policy)
      throw new Error(
        "Selecciona una póliza registrada o elige pago particular.",
      );
    if (policy.startDate > candidate.date || policy.endDate < candidate.date)
      throw new Error(
        "La póliza no está vigente en la fecha de la cita. Elige otra póliza o pago particular.",
      );
    if (
      !doctor.insurers.some(
        (insurer) => patientKey(insurer) === patientKey(policy.insurer),
      )
    )
      throw new Error(
        "Este profesional no tiene registrada esa aseguradora. Elige pago particular o consulta otro profesional.",
      );
  }
  const start = appointmentTimestamp(candidate);
  if (options.requireFuture !== false && start <= (options.now ?? Date.now()))
    throw new Error(
      "La cita debe estar programada para una fecha y hora futuras.",
    );
  const duration = APPOINTMENT_DURATION_MINUTES * 60_000;
  const familyAppointments = Object.entries(state.family?.profiles ?? {})
    .filter(([id]) => id !== state.profile.id).flatMap(([, scope]) => scope.appointments);
  for (const appointment of [...state.appointments, ...familyAppointments]) {
    if (
      appointment.id === options.ignoreId ||
      appointment.status !== "scheduled"
    )
      continue;
    const otherStart = appointmentTimestamp(appointment);
    if (start >= otherStart + duration || start + duration <= otherStart)
      continue;
    if (appointment.doctorId === candidate.doctorId)
      throw new Error(
        "Ese horario ya está ocupado para este profesional. Elige otro.",
      );
    const samePatient =
      appointment.patientId && candidate.patientId
        ? appointment.patientId === candidate.patientId
        : patientKey(appointment.patientName) ===
          patientKey(candidate.patientName);
    if (samePatient)
      throw new Error(
        "El paciente ya tiene una cita que se cruza con ese horario.",
      );
  }
}

export type AppAction =
  | { type: 'SET_AI_SUBSCRIPTION'; profileId: string; subscription: AiSubscription }
  | { type: "UPDATE_PROFILE"; patch: Partial<Patient> }
  | { type: "ADD_APPOINTMENT"; appointment: Appointment }
  | { type: "UPDATE_APPOINTMENT"; id: string; patch: Partial<Appointment> }
  | { type: "ADD_POLICY"; policy: Policy }
  | { type: "UPDATE_POLICY"; id: string; patch: Partial<Policy> }
  | { type: "DELETE_POLICY"; id: string }
  | { type: "ADD_CLAIM"; claim: Claim }
  | { type: "UPDATE_CLAIM"; id: string; patch: Partial<Claim> }
  | { type: "DELETE_CLAIM"; id: string }
  | { type: "ADD_RECORD"; record: ClinicalRecord }
  | { type: "UPDATE_RECORD"; id: string; patch: Partial<ClinicalRecord> }
  | { type: "DELETE_RECORD"; id: string }
  | { type: "ADD_MEDICATION"; medication: Medication }
  | { type: "UPDATE_MEDICATION"; id: string; patch: Partial<Medication> }
  | { type: "DELETE_MEDICATION"; id: string }
  | { type: "ADD_MESSAGE"; message: Message }
  | { type: "TOGGLE_FAVORITE"; id: string }
  | { type: "UPDATE_SETTINGS"; patch: Partial<Settings> }
  | { type: "RECHARGE_WALLET"; amount: number; id: string; date: string }
  | { type: "RESET"; state: AppState };

function addUnique<T extends { id: string }>(items: T[], value: T): T[] {
  if (items.some((x) => x.id === value.id))
    throw new Error("El registro ya existe.");
  return [...items, value];
}
function updateItem<T extends { id: string }>(
  items: T[],
  id: string,
  patch: Partial<T>,
): T[] {
  if (!items.some((x) => x.id === id))
    throw new Error("No se encontró el registro.");
  if (patch.id !== undefined && patch.id !== id)
    throw new Error("No se puede cambiar el identificador del registro.");
  return items.map((x) => (x.id === id ? { ...x, ...patch, id } : x));
}
function deleteItem<T extends { id: string }>(items: T[], id: string): T[] {
  if (!items.some((x) => x.id === id))
    throw new Error("No se encontró el registro.");
  return items.filter((x) => x.id !== id);
}

/** Pure, transactional changes: validation completes before the original state is touched. */
export function appReducer(
  state: AppState,
  action: AppAction,
  now: number = Date.now(),
): AppState {
  let next: AppState;
  switch (action.type) {
    case 'SET_AI_SUBSCRIPTION':
      if (!isAiSubscription(action.subscription)) throw new Error('La activación de Klini IA no tiene un formato compatible.');
      next = setProfileAiSubscription(state, action.profileId, action.subscription);
      break;
    case 'RECHARGE_WALLET':
      next = { ...state, wallet: rechargeWallet(state.wallet ?? initialWallet, action.amount, action.id, action.date) };
      break;
    case "UPDATE_PROFILE": {
      if (action.patch.id !== undefined && action.patch.id !== state.profile.id)
        throw new Error("No se puede cambiar el identificador del paciente.");
      const profile = { ...state.profile, ...action.patch };
      const appointments =
        profile.name !== state.profile.name
          ? state.appointments.map((appointment) => {
              const owned =
                appointment.patientId === state.profile.id ||
                (!appointment.patientId &&
                  patientKey(appointment.patientName) ===
                    patientKey(state.profile.name));
              return owned
                ? {
                    ...appointment,
                    patientId: profile.id,
                    patientName: profile.name,
                  }
                : appointment;
            })
          : state.appointments;
      next = { ...state, profile, appointments };
      break;
    }
    case "ADD_APPOINTMENT":
      assertAppointmentCanBeSaved(state, action.appointment, { now });
      next = {
        ...state,
        appointments: addUnique(state.appointments, action.appointment),
      };
      break;
    case "UPDATE_APPOINTMENT": {
      const original = state.appointments.find((x) => x.id === action.id);
      if (!original) throw new Error("No se encontró la cita.");
      if (
        action.patch.createdAt !== undefined &&
        action.patch.createdAt !== original.createdAt
      )
        throw new Error(
          "La fecha de creación de la cita no puede modificarse.",
        );
      const appointments = updateItem(
        state.appointments,
        action.id,
        action.patch,
      );
      const candidate = appointments.find((x) => x.id === action.id)!;
      const bookingChanged =
        ["date", "time", "doctorId", "mode", "patientName", "patientId"].some(
          (key) => key in action.patch,
        ) ||
        (candidate.status === "scheduled" && original.status !== "scheduled");
      const paymentChanged =
        "paymentMethod" in action.patch || "insuranceId" in action.patch;
      assertAppointmentCanBeSaved(state, candidate, {
        ignoreId: action.id,
        requireFuture: bookingChanged,
        validateInsurance: bookingChanged || paymentChanged,
        now,
      });
      next = { ...state, appointments };
      break;
    }
    case "ADD_POLICY":
      next = { ...state, policies: addUnique(state.policies, action.policy) };
      break;
    case "UPDATE_POLICY": {
      next = {
        ...state,
        policies: updateItem(state.policies, action.id, action.patch),
      };
      if (!isPolicy(next.policies.find((policy) => policy.id === action.id)))
        throw new Error(
          "Revisa la aseguradora, los datos y la vigencia de la póliza.",
        );
      // A policy edit must not silently invalidate a future appointment already saved.
      for (const appointment of next.appointments) {
        if (
          appointment.insuranceId === action.id &&
          appointment.paymentMethod === "Seguro" &&
          appointment.status === "scheduled" &&
          appointmentTimestamp(appointment) > now
        ) {
          assertAppointmentCanBeSaved(next, appointment, {
            ignoreId: appointment.id,
            requireFuture: false,
            validateInsurance: true,
            now,
          });
        }
      }
      break;
    }
    case "DELETE_POLICY":
      if (state.claims.some((x) => x.policyId === action.id))
        throw new Error(
          "Elimina primero las solicitudes locales asociadas a esta póliza.",
        );
      if (
        state.appointments.some(
          (x) => x.insuranceId === action.id && x.status === "scheduled",
        )
      )
        throw new Error(
          "La póliza está vinculada a una cita. Cambia primero la forma de pago de esa cita.",
        );
      next = {
        ...state,
        policies: deleteItem(state.policies, action.id),
        appointments: state.appointments.map((x) =>
          x.insuranceId === action.id ? { ...x, insuranceId: undefined } : x,
        ),
      };
      break;
    case "ADD_CLAIM":
      next = { ...state, claims: addUnique(state.claims, action.claim) };
      break;
    case "UPDATE_CLAIM":
      next = {
        ...state,
        claims: updateItem(state.claims, action.id, action.patch),
      };
      break;
    case "DELETE_CLAIM":
      next = { ...state, claims: deleteItem(state.claims, action.id) };
      break;
    case "ADD_RECORD":
      next = { ...state, records: addUnique(state.records, action.record) };
      break;
    case "UPDATE_RECORD":
      next = {
        ...state,
        records: updateItem(state.records, action.id, action.patch),
      };
      break;
    case "DELETE_RECORD":
      next = { ...state, records: deleteItem(state.records, action.id) };
      break;
    case "ADD_MEDICATION":
      next = {
        ...state,
        medications: addUnique(state.medications, action.medication),
      };
      break;
    case "UPDATE_MEDICATION":
      next = {
        ...state,
        medications: updateItem(state.medications, action.id, action.patch),
      };
      break;
    case "DELETE_MEDICATION":
      next = {
        ...state,
        medications: deleteItem(state.medications, action.id),
      };
      break;
    case "ADD_MESSAGE":
      next = { ...state, messages: addUnique(state.messages, action.message) };
      break;
    case "TOGGLE_FAVORITE":
      if (!state.doctors.some((x) => x.id === action.id))
        throw new Error("No se encontró el profesional.");
      next = {
        ...state,
        favorites: state.favorites.includes(action.id)
          ? state.favorites.filter((x) => x !== action.id)
          : [...state.favorites, action.id],
      };
      break;
    case "UPDATE_SETTINGS":
      next = { ...state, settings: { ...state.settings, ...action.patch } };
      break;
    case "RESET":
      next = action.state;
      break;
    default:
      return state;
  }
  if (!validateAppState(next, now))
    throw new Error(
      "No se pudo guardar. Revisa los datos, fechas, correo y teléfono del registro.",
    );
  return next;
}

export interface StorageWriter {
  setItem: (key: string, value: string) => Promise<void>;
}
/** FIFO writes keep rapid actions/reset from allowing a stale snapshot to win. */
export function createPersistenceQueue(
  storage: StorageWriter,
  key: string = STORAGE_KEY,
) {
  let tail: Promise<void> = Promise.resolve();
  return {
    write(value: string): Promise<void> {
      const operation = tail.then(() => storage.setItem(key, value));
      tail = operation.catch(() => undefined);
      return operation;
    },
    flush(): Promise<void> {
      return tail;
    },
  };
}
