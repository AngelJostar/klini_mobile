import { useState } from 'react';

import { AppButton } from '@/components/ui/app-button';
import { AppField } from '@/components/ui/app-field';
import { DoctorListCard, DoctorPage, DoctorQueryState, formatDoctorDate, goDoctor } from '@/features/doctor/doctor-ui';
import { useDoctorAppointments } from '@/services/doctor/doctor-queries';

export default function DoctorAppointmentsScreen() {
  const [input, setInput] = useState('');
  const [date, setDate] = useState<string>();
  const query = useDoctorAppointments(date);
  const items = query.data?.items ?? [];
  return <DoctorPage title="Agenda médica" subtitle="Filtra por fecha con formato AAAA-MM-DD." refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
    <AppField label="Fecha" value={input} onChangeText={setInput} placeholder="2026-10-03" autoCapitalize="none" />
    <AppButton label="Aplicar fecha" onPress={() => setDate(input.trim() || undefined)} /><AppButton label="Mostrar todas" variant="outline" onPress={() => { setInput(''); setDate(undefined); }} />
    <DoctorQueryState pending={query.isPending} error={query.isError} empty={!query.isPending && items.length === 0} retry={() => void query.refetch()}>
      {items.map((item) => <DoctorListCard key={item.id} title={item.patient?.full_name ?? 'Paciente'} caption={formatDoctorDate(item.starts_at)} detail={`${item.specialty ?? 'Consulta'} · ${item.status}`} onPress={() => goDoctor(`/doctor/appointments/${item.id}`)} />)}
    </DoctorQueryState>
  </DoctorPage>;
}
