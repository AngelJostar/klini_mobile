import { useState } from 'react';

import { AppButton } from '@/components/ui/app-button';
import { AppField } from '@/components/ui/app-field';
import { DoctorListCard, DoctorPage, DoctorQueryState, goDoctor } from '@/features/doctor/doctor-ui';
import { useDoctorPatients } from '@/services/doctor/doctor-queries';

export default function DoctorPatientsScreen() {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const query = useDoctorPatients(search);
  const items = query.data?.items ?? [];
  return <DoctorPage title="Pacientes autorizados" subtitle="Solo se muestran pacientes con una relación clínica vigente." refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
    <AppField label="Buscar paciente" value={input} onChangeText={setInput} placeholder="Nombre o número de paciente" /><AppButton label="Buscar" onPress={() => setSearch(input.trim())} />
    <DoctorQueryState pending={query.isPending} error={query.isError} empty={!query.isPending && items.length === 0} retry={() => void query.refetch()}>
      {items.map((item) => <DoctorListCard key={item.id} title={item.full_name} caption={item.platform_number ?? 'Sin número'} detail={item.status} onPress={() => goDoctor(`/doctor/patients/${item.id}`)} />)}
    </DoctorQueryState>
  </DoctorPage>;
}
