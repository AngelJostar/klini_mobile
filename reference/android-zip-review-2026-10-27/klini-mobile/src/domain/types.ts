export type Mode = "Presencial" | "Teleconsulta";
export type AppointmentStatus = "scheduled" | "completed" | "cancelled";
export interface Patient {
  id: string;
  name: string;
  birthDate: string;
  sex: string;
  bloodType: string;
  email: string;
  phone: string;
  allergies: string;
  emergencyName: string;
  emergencyPhone: string;
}
export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  city: string;
  address: string;
  price: number;
  rating: number;
  reviewCount: number;
  experience: number;
  bio: string;
  insurers: string[];
  modalities: Mode[];
  initials: string;
  avatarColor: string;
}
export interface Appointment {
  id: string;
  doctorId: string;
  date: string;
  time: string;
  mode: Mode;
  patientName: string;
  patientId?: string;
  reason: string;
  visitType: "Primera vez" | "Seguimiento";
  paymentMethod: "Particular" | "Seguro";
  insuranceId?: string;
  status: AppointmentStatus;
  createdAt: string;
  notes?: string;
  meetingUrl?: string;
  reminderId?: string;
}
export interface Policy {
  id: string;
  insurer: string;
  number: string;
  holder: string;
  startDate: string;
  endDate: string;
  coverage: string;
  phone: string;
  notes: string;
}
export interface Claim {
  id: string;
  policyId: string;
  date: string;
  amount: number;
  concept: string;
  status: "draft" | "submitted" | "review" | "resolved";
  folio: string;
  notes?: string;
}
export interface Attachment {
  uri: string;
  name: string;
  mimeType: string;
}
export interface ClinicalRecord {
  id: string;
  type: "Consulta" | "Estudio" | "Receta" | "Vacuna" | "Nota" | "Procedimiento" | "Hospitalización" | "Alergia" | "Antecedente";
  title: string;
  date: string;
  doctorName: string;
  time?: string;
  specialty?: string;
  institution?: string;
  reason?: string;
  description: string;
  attachment?: Attachment;
}
export interface Medication {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  active: boolean;
}
export interface Message {
  id: string;
  appointmentId: string;
  author: "patient" | "doctor" | "system";
  text: string;
  createdAt: string;
}
export interface Settings {
  reminders: boolean;
  biometricLock: boolean;
  meetingBaseUrl: string;
}
export interface AppState {
  family?: { ownerId: string; profiles: Record<string, ProfileScope> };
  wallet?: import('./wallet').Wallet;
  schemaVersion: 1;
  profile: Patient;
  doctors: Doctor[];
  appointments: Appointment[];
  policies: Policy[];
  claims: Claim[];
  records: ClinicalRecord[];
  medications: Medication[];
  messages: Message[];
  favorites: string[];
  settings: Settings;
}
export type ProfileScope = Pick<AppState, 'profile' | 'appointments' | 'policies' | 'claims' | 'records' | 'medications' | 'messages' | 'favorites'> & { kind: string };
export type NewAppointment = Omit<Appointment, "id" | "createdAt">;
export interface StoreContext {
  ownerProfile: Patient;
  profileKind: string;
  selectProfile: (profile?: import('../state/managedProfiles').ManagedProfile) => Promise<void>;
  editFamilyProfile: (id: string, patch: Partial<Patient> & { kind?: string }) => Promise<void>;
  rechargeWallet: (amount: number) => Promise<void>;
  state: AppState;
  ready: boolean;
  storageError: string | null;
  updateProfile: (p: Partial<Patient>) => void;
  addAppointment: (a: NewAppointment) => string;
  updateAppointment: (id: string, p: Partial<Appointment>) => void;
  addPolicy: (p: Omit<Policy, "id">) => string;
  updatePolicy: (id: string, p: Partial<Policy>) => void;
  deletePolicy: (id: string) => void;
  addClaim: (c: Omit<Claim, "id" | "folio">) => string;
  updateClaim: (id: string, p: Partial<Claim>) => void;
  deleteClaim: (id: string) => void;
  addRecord: (r: Omit<ClinicalRecord, "id">) => string;
  updateRecord: (id: string, p: Partial<ClinicalRecord>) => void;
  deleteRecord: (id: string) => void;
  addMedication: (m: Omit<Medication, "id">) => string;
  updateMedication: (id: string, p: Partial<Medication>) => void;
  deleteMedication: (id: string) => void;
  addMessage: (m: Omit<Message, "id" | "createdAt">) => void;
  toggleFavorite: (id: string) => void;
  updateSettings: (s: Partial<Settings>) => void;
  resetDemo: () => Promise<void>;
}
