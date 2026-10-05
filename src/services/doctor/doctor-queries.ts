import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from './doctor-api';

export const doctorQueryKeys = {
  all: ['doctor'] as const,
  dashboard: () => [...doctorQueryKeys.all, 'dashboard'] as const,
  appointments: (date?: string) => [...doctorQueryKeys.all, 'appointments', date ?? 'all'] as const,
  appointment: (id: number) => [...doctorQueryKeys.all, 'appointment', id] as const,
  patients: (search = '') => [...doctorQueryKeys.all, 'patients', search] as const,
  patient: (id: number) => [...doctorQueryKeys.all, 'patient', id] as const,
  prescriptions: () => [...doctorQueryKeys.all, 'prescriptions'] as const,
  requests: () => [...doctorQueryKeys.all, 'requests'] as const,
};

export const useDoctorDashboard = () => useQuery({ queryKey: doctorQueryKeys.dashboard(), queryFn: api.getDoctorDashboard });
export const useDoctorAppointments = (date?: string) => useQuery({ queryKey: doctorQueryKeys.appointments(date), queryFn: () => api.getDoctorAppointments(date) });
export const useDoctorAppointment = (id: number) => useQuery({ queryKey: doctorQueryKeys.appointment(id), queryFn: () => api.getDoctorAppointment(id), enabled: id > 0 });
export const useDoctorPatients = (search = '') => useQuery({ queryKey: doctorQueryKeys.patients(search), queryFn: () => api.getDoctorPatients(search) });
export const useDoctorPatient = (id: number) => useQuery({ queryKey: doctorQueryKeys.patient(id), queryFn: () => api.getDoctorPatient(id), enabled: id > 0 });
export const useDoctorPrescriptions = () => useQuery({ queryKey: doctorQueryKeys.prescriptions(), queryFn: api.getDoctorPrescriptions });
export const useDoctorRequests = () => useQuery({ queryKey: doctorQueryKeys.requests(), queryFn: api.getDoctorRequests });

export function useUpdateDoctorAppointment(id: number) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (status: string) => api.updateDoctorAppointment(id, status), onSuccess: () => { void client.invalidateQueries({ queryKey: doctorQueryKeys.all }); } });
}
export function useCreateClinicalRecord(patientId: number) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: { record_type: string; title: string; summary: string; recorded_at: string }) => api.createClinicalRecord(patientId, input), onSuccess: () => void client.invalidateQueries({ queryKey: doctorQueryKeys.patient(patientId) }) });
}
export function useCreateDoctorPrescription() {
  const client = useQueryClient();
  return useMutation({ mutationFn: api.createDoctorPrescription, onSuccess: () => { void client.invalidateQueries({ queryKey: doctorQueryKeys.all }); } });
}
