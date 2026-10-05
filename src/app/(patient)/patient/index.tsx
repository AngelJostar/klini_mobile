import { Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { PatientListCard, PatientPage, QueryState, formatDateTime, go, patientStyles } from '@/features/patient/patient-ui';
import { useAuth } from '@/providers/auth-provider';
import { usePatientDashboard } from '@/services/patient/patient-queries';

export default function PatientHomeScreen() {
  const { user, signOut } = useAuth();
  const query = usePatientDashboard();
  const dashboard = query.data;

  return <PatientPage title={`Hola, ${user?.name ?? 'paciente'}`} subtitle="Consulta y administra tu información de salud." refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
    <QueryState pending={query.isPending} error={query.isError} empty={!dashboard} retry={() => void query.refetch()}>
      {dashboard ? <>
        <AppCard><Text style={patientStyles.sectionTitle}>Resumen</Text><View style={patientStyles.row}>
          <AppCard style={patientStyles.metric}><Text style={patientStyles.metricLabel}>Próximas citas</Text><Text style={patientStyles.metricValue}>{dashboard.summary.upcoming_appointments}</Text></AppCard>
          <AppCard style={patientStyles.metric}><Text style={patientStyles.metricLabel}>Recetas activas</Text><Text style={patientStyles.metricValue}>{dashboard.summary.active_prescriptions}</Text></AppCard>
          <AppCard style={patientStyles.metric}><Text style={patientStyles.metricLabel}>Historial clínico</Text><Text style={patientStyles.metricValue}>{dashboard.summary.clinical_records}</Text></AppCard>
          <AppCard style={patientStyles.metric}><Text style={patientStyles.metricLabel}>Documentos</Text><Text style={patientStyles.metricValue}>{dashboard.summary.documents}</Text></AppCard>
        </View></AppCard>
        {dashboard.next_appointment ? <><Text style={patientStyles.sectionTitle}>Tu próxima cita</Text><PatientListCard title={dashboard.next_appointment.specialty ?? 'Consulta médica'} caption={formatDateTime(dashboard.next_appointment.starts_at)} detail={dashboard.next_appointment.doctor?.name} onPress={() => go(`/patient/appointments/${dashboard.next_appointment?.id}`)} /></> : null}
        <Text style={patientStyles.sectionTitle}>Mis servicios</Text>
        <PatientListCard title="Mi perfil" detail="Datos personales y de contacto" onPress={() => go('/patient/profile')} />
        <PatientListCard title="Citas" detail="Agenda y detalles de tus consultas" onPress={() => go('/patient/appointments')} />
        <PatientListCard title="Historial clínico" detail="Notas y antecedentes clínicos" onPress={() => go('/patient/clinical-records')} />
        <PatientListCard title="Recetas y medicamentos" detail="Indicaciones de tus tratamientos" onPress={() => go('/patient/prescriptions')} />
        <PatientListCard title="Estudios y documentos" detail="Resultados y archivos clínicos" onPress={() => go('/patient/documents')} />
        <PatientListCard title="Notificaciones" detail={`${dashboard.notices.length} aviso(s) disponible(s)`} onPress={() => go('/patient/notifications')} />
      </> : null}
    </QueryState>
    <AppButton label="Cambiar contraseña" variant="outline" onPress={() => go('/patient/change-password')} />
    <AppButton label="Cerrar sesión" variant="outline" onPress={() => void signOut()} />
  </PatientPage>;
}
