import { DoctorListCard, DoctorPage, DoctorQueryState, formatDoctorDate, goDoctor } from '@/features/doctor/doctor-ui';
import { useDoctorRequests } from '@/services/doctor/doctor-queries';

export default function DoctorRequestsScreen() {
  const query = useDoctorRequests(); const items = query.data?.items ?? [];
  return <DoctorPage title="Seguimiento de solicitudes" subtitle="Los estados se sincronizan con Dr. Sam al actualizar." refreshing={query.isRefetching} onRefresh={() => void query.refetch()}><DoctorQueryState pending={query.isPending} error={query.isError} empty={!query.isPending && items.length === 0} retry={() => void query.refetch()}>{items.map((item) => <DoctorListCard key={item.id} title={item.service ?? item.type} caption={`${item.external_id ?? 'Sin folio'} · ${item.status}`} detail={`${item.patient?.full_name ?? 'Paciente'} · ${formatDoctorDate(item.requested_at)}${item.priority ? ` · ${item.priority}` : ''}`} onPress={['npt', 'chemo'].includes(item.type) ? () => goDoctor(`/doctor/mixtures/${item.id}`) : undefined} />)}</DoctorQueryState></DoctorPage>;
}
