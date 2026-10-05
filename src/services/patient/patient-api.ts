import { apiRequest } from '@/services/api/client';

export type PatientProfile = {
  id: number;
  platform_number: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  birth_date: string | null;
  sex: string | null;
  curp: string | null;
  phone: string | null;
  email: string | null;
  status: string;
};

export type PatientAppointment = {
  id: number;
  status: string;
  specialty: string | null;
  modality: string | null;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  reason: string | null;
  doctor: { id: number; name: string; specialty: string | null } | null;
  medical_unit: { id: number; name: string; address: string | null } | null;
};

export type PatientNotice = {
  id: string;
  type: 'appointment' | 'prescription' | 'document';
  title: string;
  message: string;
  occurred_at: string | null;
};

export type PatientClinicalRecord = {
  id: number;
  type: string;
  title: string | null;
  summary: string | null;
  recorded_at: string | null;
  doctor: { id: number; name: string; specialty: string | null } | null;
};

export type PatientPrescription = {
  id: number;
  code: string | null;
  status: string;
  issued_at: string | null;
  notes: string | null;
  doctor: { id: number; name: string; specialty: string | null } | null;
  items: { id: number; medication_name: string; dose: string | null; frequency: string | null; duration: string | null; instructions: string | null }[];
};

export type PatientDocument = {
  id: number;
  name: string;
  type: string;
  mime_type: string | null;
  size: number | null;
  status: string;
  loaded_at: string | null;
  expires_at: string | null;
  download_url: string;
};

export type PatientDashboard = {
  summary: { upcoming_appointments: number; active_prescriptions: number; clinical_records: number; documents: number };
  next_appointment: PatientAppointment | null;
  notices: PatientNotice[];
};

type ItemList<T> = { items: T[] };

export const getPatientDashboard = () => apiRequest<PatientDashboard>('patient/dashboard');
export const getPatientProfile = () => apiRequest<{ patient: PatientProfile }>('patient/profile');
export const updatePatientProfile = (profile: Pick<PatientProfile, 'phone' | 'email'>) => apiRequest<{ patient: PatientProfile }>('patient/profile', { method: 'PATCH', body: JSON.stringify(profile) });
export const getPatientAppointments = () => apiRequest<ItemList<PatientAppointment>>('patient/appointments?per_page=50');
export const getPatientAppointment = (id: number) => apiRequest<{ appointment: PatientAppointment }>(`patient/appointments/${id}`);
export const getPatientClinicalRecords = () => apiRequest<ItemList<PatientClinicalRecord>>('patient/clinical-records?per_page=50');
export const getPatientPrescriptions = () => apiRequest<ItemList<PatientPrescription>>('patient/prescriptions?per_page=50');
export const getPatientDocuments = () => apiRequest<ItemList<PatientDocument>>('patient/documents?per_page=50');
