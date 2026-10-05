import { useLocalSearchParams } from 'expo-router';
import { Alert, Text } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { DoctorPage, DoctorQueryState, doctorStyles, formatDoctorDate, goDoctor } from '@/features/doctor/doctor-ui';
import { useDoctorAppointment, useUpdateDoctorAppointment } from '@/services/doctor/doctor-queries';

export default function DoctorAppointmentDetailScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const query = useDoctorAppointment(id);
  const mutation = useUpdateDoctorAppointment(id);
  const item = query.data?.appointment;
  const change = async (status: string) => { try { await mutation.mutateAsync(status); await query.refetch(); } catch { Alert.alert('No fue posible actualizar la cita'); } };
  return <DoctorPage title="Detalle de cita">
    <DoctorQueryState pending={query.isPending} error={query.isError || !Number.isInteger(id)} empty={!query.isPending && !item} retry={() => void query.refetch()}>
      {item ? <><AppCard><Field label="Paciente" value={item.patient?.full_name} /><Field label="Fecha" value={formatDoctorDate(item.starts_at)} /><Field label="Estado" value={item.status} /><Field label="Especialidad" value={item.specialty} /><Field label="Unidad" value={item.medical_unit?.name ?? item.location} /><Field label="Motivo" value={item.reason} /></AppCard>
        {item.patient ? <AppButton label="Abrir expediente" variant="outline" onPress={() => goDoctor(`/doctor/patients/${item.patient?.id}`)} /> : null}
        {item.status === 'scheduled' ? <AppButton label="Iniciar consulta" loading={mutation.isPending} onPress={() => void change('in_progress')} /> : null}
        {item.status === 'in_progress' ? <AppButton label="Completar consulta" loading={mutation.isPending} onPress={() => void change('completed')} /> : null}
        {!['completed', 'cancelled'].includes(item.status) ? <AppButton label="Cancelar cita" variant="outline" loading={mutation.isPending} onPress={() => void change('cancelled')} /> : null}
      </> : null}
    </DoctorQueryState>
  </DoctorPage>;
}
function Field({ label, value }: { label: string; value?: string | null }) { return <><Text style={doctorStyles.label}>{label}</Text><Text style={doctorStyles.value}>{value || 'Sin información'}</Text></>; }
