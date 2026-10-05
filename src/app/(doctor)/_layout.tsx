import { Stack } from 'expo-router';

export default function DoctorLayout() {
  return <Stack screenOptions={{ headerBackTitle: 'Atrás' }}>
    <Stack.Screen name="doctor/index" options={{ title: 'Médico', headerShown: false }} />
    <Stack.Screen name="doctor/appointments/index" options={{ title: 'Agenda' }} />
    <Stack.Screen name="doctor/appointments/[id]" options={{ title: 'Detalle de cita' }} />
    <Stack.Screen name="doctor/patients/index" options={{ title: 'Pacientes' }} />
    <Stack.Screen name="doctor/patients/[id]" options={{ title: 'Expediente' }} />
    <Stack.Screen name="doctor/patients/[id]/note" options={{ title: 'Nota clínica' }} />
    <Stack.Screen name="doctor/prescriptions/index" options={{ title: 'Recetas' }} />
    <Stack.Screen name="doctor/prescriptions/new" options={{ title: 'Nueva receta' }} />
    <Stack.Screen name="doctor/requests" options={{ title: 'Solicitudes' }} />
    <Stack.Screen name="doctor/mixtures/index" options={{ title: 'Solicitudes clínicas' }} />
    <Stack.Screen name="doctor/mixtures/npt" options={{ title: 'Nutrición NPT' }} />
    <Stack.Screen name="doctor/mixtures/oncology" options={{ title: 'Mezcla oncológica' }} />
    <Stack.Screen name="doctor/mixtures/[id]" options={{ title: 'Seguimiento' }} />
    <Stack.Screen name="doctor/change-password" options={{ title: 'Cambiar contraseña' }} />
  </Stack>;
}
