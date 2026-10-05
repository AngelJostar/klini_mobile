import { PushSettingsCard } from '@/components/push-settings-card';
import { PatientListCard, PatientPage, QueryState, formatDateTime } from '@/features/patient/patient-ui';
import { usePatientDashboard } from '@/services/patient/patient-queries';

export default function NotificationsScreen() {
  const query = usePatientDashboard();
  const items = query.data?.notices ?? [];
  return <PatientPage title="Notificaciones" subtitle="Avisos importantes de tu atención." refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
    <PushSettingsCard />
    <QueryState pending={query.isPending} error={query.isError} empty={!query.isPending && items.length === 0} retry={() => void query.refetch()}>
      {items.map((item) => <PatientListCard key={item.id} title={item.title} caption={formatDateTime(item.occurred_at)} detail={item.message} />)}
    </QueryState>
  </PatientPage>;
}
