import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppField } from '@/components/ui/app-field';
import { DoctorPage } from '@/features/doctor/doctor-ui';
import { ApiError } from '@/services/api/client';
import { useCreateClinicalRecord } from '@/services/doctor/doctor-queries';

export default function CreateClinicalNoteScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const mutation = useCreateClinicalRecord(id);
  const [title, setTitle] = useState(''); const [summary, setSummary] = useState('');
  const submit = async () => { if (!title.trim() || !summary.trim()) return Alert.alert('Completa el título y la nota.'); try { await mutation.mutateAsync({ record_type: 'clinical_note', title: title.trim(), summary: summary.trim(), recorded_at: new Date().toISOString() }); Alert.alert('Nota registrada'); router.back(); } catch (error) { Alert.alert('No fue posible guardar', error instanceof ApiError ? error.message : 'Intenta nuevamente.'); } };
  return <DoctorPage title="Nueva nota clínica" subtitle="El registro quedará asociado a tu usuario y al expediente autorizado."><AppField label="Título" value={title} onChangeText={setTitle} maxLength={180} /><AppField label="Nota clínica" value={summary} onChangeText={setSummary} multiline numberOfLines={7} maxLength={5000} /><AppButton label="Guardar nota" loading={mutation.isPending} onPress={() => void submit()} /></DoctorPage>;
}
