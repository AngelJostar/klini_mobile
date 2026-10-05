import { Text, View } from 'react-native';

import { PushSettingsCard } from '@/components/push-settings-card';
import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { DoctorListCard, DoctorPage, DoctorQueryState, doctorStyles, goDoctor } from '@/features/doctor/doctor-ui';
import { useAuth } from '@/providers/auth-provider';
import { useDoctorDashboard } from '@/services/doctor/doctor-queries';

export default function DoctorHomeScreen() {
  const { user, signOut } = useAuth();
  const query = useDoctorDashboard();
  const summary = query.data?.summary;
  return <DoctorPage title={`Hola, ${user?.name ?? 'doctor'}`} subtitle="Resumen de tu actividad clínica." refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
    <DoctorQueryState pending={query.isPending} error={query.isError} empty={!summary} retry={() => void query.refetch()}>
      {summary ? <>
        <View style={doctorStyles.row}>
          <Metric label="Citas de hoy" value={summary.appointments_today} /><Metric label="Próximas citas" value={summary.upcoming_appointments} /><Metric label="Pacientes" value={summary.authorized_patients} /><Metric label="Recetas pendientes" value={summary.pending_prescriptions} />
        </View>
        <AppCard><Text style={doctorStyles.label}>Solicitudes activas</Text><Text style={doctorStyles.metricValue}>{summary.active_requests}</Text></AppCard>
        <Text style={doctorStyles.sectionTitle}>Herramientas</Text>
        <DoctorListCard title="Agenda" detail="Consulta y actualiza tus citas" onPress={() => goDoctor('/doctor/appointments')} />
        <DoctorListCard title="Pacientes autorizados" detail="Busca y consulta expedientes" onPress={() => goDoctor('/doctor/patients')} />
        <DoctorListCard title="Recetas" detail="Consulta y genera prescripciones" onPress={() => goDoctor('/doctor/prescriptions')} />
        <DoctorListCard title="Solicitudes" detail="Da seguimiento a estudios y servicios" onPress={() => goDoctor('/doctor/requests')} />
        <DoctorListCard title="Solicitar mezclas" detail="Flujos NPT y oncológico" onPress={() => goDoctor('/doctor/mixtures')} />
      </> : null}
    </DoctorQueryState>
    <PushSettingsCard />
    <AppButton label="Cambiar contraseña" variant="outline" onPress={() => goDoctor('/doctor/change-password')} />
    <AppButton label="Cerrar sesión" variant="outline" onPress={() => void signOut()} />
  </DoctorPage>;
}
function Metric({ label, value }: { label: string; value: number }) { return <AppCard style={doctorStyles.metric}><Text style={doctorStyles.label}>{label}</Text><Text style={doctorStyles.metricValue}>{value}</Text></AppCard>; }
