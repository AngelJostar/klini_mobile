import { PatientListCard, PatientPage, QueryState, formatDateTime } from '@/features/patient/patient-ui';
import { usePatientClinicalRecords } from '@/services/patient/patient-queries';

export default function ClinicalRecordsScreen() {
  const query = usePatientClinicalRecords();
  const items = query.data?.items ?? [];
  return <PatientPage title="Historial clínico" subtitle="Notas clínicas registradas por tus médicos." refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
    <QueryState pending={query.isPending} error={query.isError} empty={!query.isPending && items.length === 0} retry={() => void query.refetch()}>
      {items.map((item) => <PatientListCard key={item.id} title={item.title ?? item.type} caption={`${formatDateTime(item.recorded_at)} · ${item.doctor?.name ?? 'Dr. Sam'}`} detail={item.summary} />)}
    </QueryState>
  </PatientPage>;
}
