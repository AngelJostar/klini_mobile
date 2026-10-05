import { Stack } from 'expo-router';

export default function PatientLayout() {
  return <Stack screenOptions={{ headerBackTitle: 'Atrás' }}>
    <Stack.Screen name="patient/index" options={{ title: 'Paciente', headerShown: false }} />
    <Stack.Screen name="patient/profile" options={{ title: 'Mi perfil' }} />
    <Stack.Screen name="patient/appointments/index" options={{ title: 'Mis citas' }} />
    <Stack.Screen name="patient/appointments/[id]" options={{ title: 'Detalle de cita' }} />
    <Stack.Screen name="patient/clinical-records" options={{ title: 'Historial clínico' }} />
    <Stack.Screen name="patient/prescriptions" options={{ title: 'Recetas' }} />
    <Stack.Screen name="patient/documents" options={{ title: 'Documentos' }} />
    <Stack.Screen name="patient/notifications" options={{ title: 'Notificaciones' }} />
    <Stack.Screen name="patient/change-password" options={{ title: 'Cambiar contraseña' }} />
  </Stack>;
}
