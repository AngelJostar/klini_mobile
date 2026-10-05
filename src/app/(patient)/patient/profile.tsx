import { useEffect, useState } from 'react';
import { Alert, Text } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { AppField } from '@/components/ui/app-field';
import { PatientPage, QueryState, formatDate, patientStyles } from '@/features/patient/patient-ui';
import { ApiError } from '@/services/api/client';
import { usePatientProfile, useUpdatePatientProfile } from '@/services/patient/patient-queries';

export default function ProfileScreen() {
  const query = usePatientProfile();
  const mutation = useUpdatePatientProfile();
  const patient = query.data?.patient;
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => { if (patient) { setPhone(patient.phone ?? ''); setEmail(patient.email ?? ''); } }, [patient]);

  const save = async () => {
    try {
      await mutation.mutateAsync({ phone: phone.trim() || null, email: email.trim() || null });
      Alert.alert('Perfil actualizado', 'Tus datos de contacto se guardaron correctamente.');
    } catch (error) {
      Alert.alert('No pudimos guardar', error instanceof ApiError ? error.message : 'Intenta nuevamente.');
    }
  };

  return <PatientPage title="Mi perfil" subtitle="Los datos clínicos protegidos son de solo lectura." refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
    <QueryState pending={query.isPending} error={query.isError} empty={!query.isPending && !patient} retry={() => void query.refetch()}>
      {patient ? <>
        <AppCard><Field label="Nombre" value={patient.full_name} /><Field label="Número de paciente" value={patient.platform_number} /><Field label="CURP" value={patient.curp} /><Field label="Fecha de nacimiento" value={formatDate(patient.birth_date)} /><Field label="Sexo" value={patient.sex} /></AppCard>
        <AppCard><Text style={patientStyles.sectionTitle}>Datos de contacto</Text><AppField label="Teléfono" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" /><AppField label="Correo electrónico" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" /><AppButton label="Guardar cambios" loading={mutation.isPending} onPress={() => void save()} /></AppCard>
      </> : null}
    </QueryState>
  </PatientPage>;
}

function Field({ label, value }: { label: string; value?: string | null }) { return <><Text style={patientStyles.label}>{label}</Text><Text style={patientStyles.value}>{value || 'Sin información'}</Text></>; }
