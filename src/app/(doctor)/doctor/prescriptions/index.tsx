import { Text } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { DoctorPage, DoctorQueryState, doctorStyles, formatDoctorDate, goDoctor } from '@/features/doctor/doctor-ui';
import { useDoctorPrescriptions } from '@/services/doctor/doctor-queries';

export default function DoctorPrescriptionsScreen() {
  const query = useDoctorPrescriptions(); const items = query.data?.items ?? [];
  return <DoctorPage title="Recetas médicas" subtitle="Prescripciones emitidas desde tu cuenta." refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
    <AppButton label="Nueva receta" onPress={() => goDoctor('/doctor/patients')} />
    <DoctorQueryState pending={query.isPending} error={query.isError} empty={!query.isPending && items.length === 0} retry={() => void query.refetch()}>
      {items.map((item) => <AppCard key={item.id}><Text style={doctorStyles.sectionTitle}>{item.code ?? `Receta ${item.id}`}</Text><Text style={doctorStyles.label}>{item.patient?.full_name ?? 'Paciente'} · {formatDoctorDate(item.issued_at)} · {item.status}</Text>{item.items.map((medicine) => <Text key={medicine.id} style={doctorStyles.value}>• {medicine.medication_name} {medicine.dose ?? ''} {medicine.frequency ?? ''}</Text>)}</AppCard>)}
    </DoctorQueryState>
  </DoctorPage>;
}
