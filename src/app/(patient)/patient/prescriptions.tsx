import { Text } from 'react-native';

import { AppCard } from '@/components/ui/app-card';
import { PatientPage, QueryState, formatDateTime, patientStyles } from '@/features/patient/patient-ui';
import { usePatientPrescriptions } from '@/services/patient/patient-queries';

export default function PrescriptionsScreen() {
  const query = usePatientPrescriptions();
  const items = query.data?.items ?? [];
  return <PatientPage title="Recetas y medicamentos" subtitle="Consulta dosis, frecuencia e indicaciones." refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
    <QueryState pending={query.isPending} error={query.isError} empty={!query.isPending && items.length === 0} retry={() => void query.refetch()}>
      {items.map((item) => <AppCard key={item.id}>
        <Text style={patientStyles.sectionTitle}>{item.code ?? `Receta ${item.id}`}</Text><Text style={patientStyles.label}>{formatDateTime(item.issued_at)} · {item.status}</Text>
        {item.items.map((medicine) => <AppCard key={medicine.id}><Text style={patientStyles.value}>{medicine.medication_name}</Text><Text style={patientStyles.label}>{[medicine.dose, medicine.frequency, medicine.duration].filter(Boolean).join(' · ') || 'Sin pauta registrada'}</Text>{medicine.instructions ? <Text style={patientStyles.value}>{medicine.instructions}</Text> : null}</AppCard>)}
        {item.notes ? <Text style={patientStyles.value}>{item.notes}</Text> : null}
      </AppCard>)}
    </QueryState>
  </PatientPage>;
}
