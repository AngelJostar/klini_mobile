import { apiRequest } from '@/services/api/client';

export type DoctorDashboardSummary = { appointments_today: number; upcoming_appointments: number; authorized_patients: number; pending_prescriptions: number; active_requests: number };
export type DoctorPatientSummary = { id: number; platform_number: string | null; full_name: string; status: string };
export type DoctorAppointment = { id: number; status: string; specialty: string | null; modality: string | null; location: string | null; starts_at: string | null; ends_at: string | null; reason: string | null; patient: DoctorPatientSummary | null; medical_unit: { id: number; name: string; address: string | null } | null };
export type DoctorPatient = DoctorPatientSummary & { birth_date: string | null; sex: string | null; phone: string | null; email: string | null; appointments: { id: number; status: string; starts_at: string | null }[]; clinical_records: { id: number; type: string; title: string | null; summary: string | null; recorded_at: string | null }[]; prescriptions: { id: number; code: string | null; status: string; issued_at: string | null }[] };
export type DoctorPrescription = { id: number; code: string | null; status: string; issued_at: string | null; notes: string | null; patient: DoctorPatientSummary | null; items: { id: number; medication_name: string; dose: string | null; frequency: string | null; duration: string | null; instructions: string | null }[] };
export type DoctorRequest = { id: number; external_id: string | null; type: string; status: string; requested_at: string | null; required_at: string | null; service: string | null; priority: string | null; patient: DoctorPatientSummary | null };
type ItemList<T> = { items: T[] };

export const getDoctorDashboard = () => apiRequest<{ summary: DoctorDashboardSummary }>('doctor/dashboard');
export const getDoctorAppointments = (date?: string) => apiRequest<ItemList<DoctorAppointment>>(`doctor/appointments?per_page=50${date ? `&date=${encodeURIComponent(date)}` : ''}`);
export const getDoctorAppointment = (id: number) => apiRequest<{ appointment: DoctorAppointment }>(`doctor/appointments/${id}`);
export const updateDoctorAppointment = (id: number, status: string) => apiRequest<{ appointment: { id: number; status: string } }>(`doctor/appointments/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
export const getDoctorPatients = (search = '') => apiRequest<ItemList<DoctorPatientSummary>>(`doctor/patients?per_page=50${search ? `&search=${encodeURIComponent(search)}` : ''}`);
export const getDoctorPatient = (id: number) => apiRequest<{ patient: DoctorPatient }>(`doctor/patients/${id}`);
export const createClinicalRecord = (patientId: number, input: { record_type: string; title: string; summary: string; recorded_at: string }) => apiRequest<{ clinical_record: { id: number } }>(`doctor/patients/${patientId}/clinical-records`, { method: 'POST', body: JSON.stringify(input) });
export const getDoctorPrescriptions = () => apiRequest<ItemList<DoctorPrescription>>('doctor/prescriptions?per_page=50');
export const createDoctorPrescription = (input: { patient_id: number; issued_at: string; diagnosis: string; notes: string | null; items: { medication_name: string; dose: string | null; frequency: string | null; duration: string | null; quantity: number; instructions: string | null }[] }) => apiRequest<{ prescription: DoctorPrescription }>('doctor/prescriptions', { method: 'POST', body: JSON.stringify(input) });
export const getDoctorRequests = () => apiRequest<ItemList<DoctorRequest>>('doctor/requests?per_page=50');
