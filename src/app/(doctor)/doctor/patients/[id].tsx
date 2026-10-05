import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { DoctorListCard, DoctorPage, DoctorQueryState, doctorStyles, formatDoctorDate, goDoctor } from '@/features/doctor/doctor-ui';
import { useDoctorPatient } from '@/services/doctor/doctor-queries';

export default function DoctorPatientDetailScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const query = useDoctorPatient(id);
  const patient = query.data?.patient;
  return <DoctorPage title={patient?.full_name ?? 'Expediente'} subtitle="Resumen clínico autorizado." refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
    <DoctorQueryState pending={query.isPending} error={query.isError || !Number.isInteger(id)} empty={!query.isPending && !patient} retry={() => void query.refetch()}>
      {patient ? <>
        <AppCard><Field label="Número" value={patient.platform_number} /><Field label="Fecha de nacimiento" value={patient.birth_date} /><Field label="Sexo" value={patient.sex} /><Field label="Teléfono" value={patient.phone} /><Field label="Correo" value={patient.email} /></AppCard>
        <AppButton label="Registrar nota clínica" onPress={() => goDoctor(`/doctor/patients/${id}/note`)} /><AppButton label="Crear receta" variant="outline" onPress={() => goDoctor(`/doctor/prescriptions/new?patientId=${id}&patientName=${encodeURIComponent(patient.full_name)}`)} />
        <AppButton label="Solicitar nutrición NPT" variant="outline" onPress={() => goDoctor(`/doctor/mixtures/npt?patientId=${id}&patientName=${encodeURIComponent(patient.full_name)}`)} />
        <AppButton label="Solicitar mezcla oncológica" variant="outline" onPress={() => goDoctor(`/doctor/mixtures/oncology?patientId=${id}&patientName=${encodeURIComponent(patient.full_name)}`)} />
        <Text style={doctorStyles.sectionTitle}>Notas clínicas</Text>{patient.clinical_records.length ? patient.clinical_records.map((item) => <DoctorListCard key={item.id} title={item.title ?? item.type} caption={formatDoctorDate(item.recorded_at)} detail={item.summary} />) : <Text style={doctorStyles.value}>Sin notas registradas.</Text>}
        <Text style={doctorStyles.sectionTitle}>Recetas</Text>{patient.prescriptions.length ? patient.prescriptions.map((item) => <DoctorListCard key={item.id} title={item.code ?? `Receta ${item.id}`} caption={formatDoctorDate(item.issued_at)} detail={item.status} />) : <Text style={doctorStyles.value}>Sin recetas registradas.</Text>}
        <Text style={doctorStyles.sectionTitle}>Citas</Text>{patient.appointments.length ? patient.appointments.map((item) => <DoctorListCard key={item.id} title={formatDoctorDate(item.starts_at)} detail={item.status} onPress={() => goDoctor(`/doctor/appointments/${item.id}`)} />) : <Text style={doctorStyles.value}>Sin citas registradas.</Text>}
      </> : null}
    </DoctorQueryState>
  </DoctorPage>;
}
function Field({ label, value }: { label: string; value?: string | null }) { return <><Text style={doctorStyles.label}>{label}</Text><Text style={doctorStyles.value}>{value || 'Sin información'}</Text></>; }
