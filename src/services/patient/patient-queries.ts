import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from './patient-api';

export const patientQueryKeys = {
  all: ['patient'] as const,
  dashboard: () => [...patientQueryKeys.all, 'dashboard'] as const,
  profile: () => [...patientQueryKeys.all, 'profile'] as const,
  appointments: () => [...patientQueryKeys.all, 'appointments'] as const,
  appointment: (id: number) => [...patientQueryKeys.appointments(), id] as const,
  clinicalRecords: () => [...patientQueryKeys.all, 'clinical-records'] as const,
  prescriptions: () => [...patientQueryKeys.all, 'prescriptions'] as const,
  documents: () => [...patientQueryKeys.all, 'documents'] as const,
};

export const usePatientDashboard = () => useQuery({ queryKey: patientQueryKeys.dashboard(), queryFn: api.getPatientDashboard });
export const usePatientProfile = () => useQuery({ queryKey: patientQueryKeys.profile(), queryFn: api.getPatientProfile });
export const usePatientAppointments = () => useQuery({ queryKey: patientQueryKeys.appointments(), queryFn: api.getPatientAppointments });
export const usePatientAppointment = (id: number) => useQuery({ queryKey: patientQueryKeys.appointment(id), queryFn: () => api.getPatientAppointment(id), enabled: Number.isInteger(id) && id > 0 });
export const usePatientClinicalRecords = () => useQuery({ queryKey: patientQueryKeys.clinicalRecords(), queryFn: api.getPatientClinicalRecords });
export const usePatientPrescriptions = () => useQuery({ queryKey: patientQueryKeys.prescriptions(), queryFn: api.getPatientPrescriptions });
export const usePatientDocuments = () => useQuery({ queryKey: patientQueryKeys.documents(), queryFn: api.getPatientDocuments });

export function useUpdatePatientProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updatePatientProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(patientQueryKeys.profile(), data);
      void queryClient.invalidateQueries({ queryKey: patientQueryKeys.dashboard() });
    },
  });
}
