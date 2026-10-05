import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Text } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { AppField } from '@/components/ui/app-field';
import { DoctorPage, doctorStyles } from '@/features/doctor/doctor-ui';
import { ApiError } from '@/services/api/client';
import { useCreateDoctorPrescription } from '@/services/doctor/doctor-queries';

export default function NewPrescriptionScreen() {
  const params = useLocalSearchParams<{ patientId: string; patientName?: string }>(); const patientId = Number(params.patientId);
  const mutation = useCreateDoctorPrescription();
  const [diagnosis, setDiagnosis] = useState(''); const [medicine, setMedicine] = useState(''); const [dose, setDose] = useState(''); const [frequency, setFrequency] = useState(''); const [duration, setDuration] = useState(''); const [quantity, setQuantity] = useState('1'); const [instructions, setInstructions] = useState(''); const [notes, setNotes] = useState('');
  const submit = async () => { const amount = Number(quantity); if (!patientId || !diagnosis.trim() || !medicine.trim() || !Number.isInteger(amount) || amount < 1) return Alert.alert('Completa diagnóstico, medicamento y cantidad.'); try { await mutation.mutateAsync({ patient_id: patientId, issued_at: new Date().toISOString(), diagnosis: diagnosis.trim(), notes: notes.trim() || null, items: [{ medication_name: medicine.trim(), dose: dose.trim() || null, frequency: frequency.trim() || null, duration: duration.trim() || null, quantity: amount, instructions: instructions.trim() || null }] }); Alert.alert('Receta creada'); router.back(); } catch (error) { Alert.alert('No fue posible crear la receta', error instanceof ApiError ? error.message : 'Intenta nuevamente.'); } };
  return <DoctorPage title="Nueva receta" subtitle="Captura una prescripción para el paciente autorizado."><AppCard><Text style={doctorStyles.label}>Paciente</Text><Text style={doctorStyles.value}>{params.patientName ?? `Paciente ${patientId}`}</Text></AppCard><AppField label="Diagnóstico" value={diagnosis} onChangeText={setDiagnosis} multiline /><AppField label="Medicamento" value={medicine} onChangeText={setMedicine} /><AppField label="Dosis" value={dose} onChangeText={setDose} /><AppField label="Frecuencia" value={frequency} onChangeText={setFrequency} /><AppField label="Duración" value={duration} onChangeText={setDuration} /><AppField label="Cantidad" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" /><AppField label="Indicaciones" value={instructions} onChangeText={setInstructions} multiline /><AppField label="Notas" value={notes} onChangeText={setNotes} multiline /><AppButton label="Crear receta" loading={mutation.isPending} onPress={() => void submit()} /></DoctorPage>;
}
