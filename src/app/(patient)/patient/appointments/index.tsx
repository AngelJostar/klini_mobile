import { PatientListCard, PatientPage, QueryState, formatDateTime, go } from '@/features/patient/patient-ui';
import { usePatientAppointments } from '@/services/patient/patient-queries';

export default function AppointmentsScreen() {
  const query = usePatientAppointments();
  const items = query.data?.items ?? [];
  return <PatientPage title="Mis citas" subtitle="Agenda de consultas médicas." refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
    <QueryState pending={query.isPending} error={query.isError} empty={!query.isPending && items.length === 0} retry={() => void query.refetch()}>
      {items.map((item) => <PatientListCard key={item.id} title={item.specialty ?? 'Consulta médica'} caption={formatDateTime(item.starts_at)} detail={`${item.doctor?.name ?? 'Médico por asignar'} · ${item.status}`} onPress={() => go(`/patient/appointments/${item.id}`)} />)}
    </QueryState>
  </PatientPage>;
}
