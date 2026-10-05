import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { AppCard } from '@/components/ui/app-card';
import { PatientPage, QueryState, formatDateTime, patientStyles } from '@/features/patient/patient-ui';
import { usePatientAppointment } from '@/services/patient/patient-queries';

export default function AppointmentDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const query = usePatientAppointment(id);
  const item = query.data?.appointment;
  return <PatientPage title="Detalle de cita">
    <QueryState pending={query.isPending} error={query.isError || !Number.isInteger(id)} empty={!query.isPending && !item} retry={() => void query.refetch()}>
      {item ? <AppCard>
        <Field label="Fecha" value={formatDateTime(item.starts_at)} /><Field label="Estatus" value={item.status} /><Field label="Especialidad" value={item.specialty} /><Field label="Médico" value={item.doctor?.name} /><Field label="Modalidad" value={item.modality} /><Field label="Ubicación" value={item.medical_unit?.name ?? item.location} /><Field label="Dirección" value={item.medical_unit?.address} /><Field label="Motivo" value={item.reason} />
      </AppCard> : null}
    </QueryState>
  </PatientPage>;
}

function Field({ label, value }: { label: string; value?: string | null }) { return <><Text style={patientStyles.label}>{label}</Text><Text style={patientStyles.value}>{value || 'Sin información'}</Text></>; }
