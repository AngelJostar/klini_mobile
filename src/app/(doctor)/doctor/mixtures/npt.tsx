import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { AppField } from '@/components/ui/app-field';
import { DoctorPage, DoctorQueryState, doctorStyles } from '@/features/doctor/doctor-ui';
import { appendAttachment, appendValue, catalogLabel, groupNptCatalog, nptCatalogKey, requestKey } from '@/features/doctor/mixture-form';
import { apiErrorMessage } from '@/services/api/client';
import { useDoctorPatient } from '@/services/doctor/doctor-queries';
import { useCreateMixtureRequest, useMixtureCatalog, usePrevalidateMixture } from '@/services/doctor/mixture-queries';
import { colors, spacing } from '@/theme/tokens';

type ChoiceProps = { label: string; options: string[]; value: string; onChange: (value: string) => void; disabled?: boolean };

function ChoiceField({ label, options, value, onChange, disabled = false }: ChoiceProps) {
  return <View style={styles.choiceField}><Text style={styles.fieldLabel}>{label}</Text><View style={styles.choiceRow}>{options.map((option) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: value === option, disabled }} disabled={disabled} key={option} onPress={() => onChange(option)} style={[styles.choice, value === option && styles.choiceSelected, disabled && styles.choiceDisabled]}><Text style={[styles.choiceText, value === option && styles.choiceTextSelected]}>{option}</Text></Pressable>)}</View></View>;
}

export default function NptRequestScreen() {
  const params = useLocalSearchParams<{ patientId: string; patientName?: string }>();
  const patientId = Number(params.patientId);
  const patient = useDoctorPatient(patientId);
  const catalog = useMixtureCatalog('npt');
  const prevalidate = usePrevalidateMixture();
  const create = useCreateMixtureRequest();
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [service, setService] = useState('Nutrición parenteral');
  const [bed, setBed] = useState('');
  const [floor, setFloor] = useState('');
  const [registration, setRegistration] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [weight, setWeight] = useState('');
  const [sex, setSex] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [route, setRoute] = useState('Central');
  const [hours, setHours] = useState('24');
  const [infusionRate, setInfusionRate] = useState('');
  const [overfill, setOverfill] = useState('');
  const [volume, setVolume] = useState('');
  const [nptType, setNptType] = useState('Individualizada');
  const [deliveryAt, setDeliveryAt] = useState('');
  const [notes, setNotes] = useState('');
  const [attachment, setAttachment] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [key] = useState(requestKey);
  const patientDefaultsApplied = useRef(false);
  const catalogItems = useMemo(() => catalog.data?.catalog.items ?? [], [catalog.data?.catalog.items]);
  const groups = useMemo(() => groupNptCatalog(catalogItems), [catalogItems]);
  const integrationItems = useMemo(() => catalogItems.flatMap((item) => {
    const quantity = Number(quantities[nptCatalogKey(item)] ?? 0);
    return Number.isFinite(quantity) && quantity > 0 ? [{ product_code: item.product_code, presentation_code: item.presentation_code, quantity, unit: 'ml' as const }] : [];
  }), [catalogItems, quantities]);
  const totalComponentVolume = integrationItems.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    if (!patient.data?.patient || patientDefaultsApplied.current) return;

    patientDefaultsApplied.current = true;
    const data = patient.data.patient;
    setRegistration(data.platform_number ?? '');
    setBirthDate(data.birth_date ?? '');
    if (data.sex === 'female') setSex('Femenino');
    else if (data.sex === 'male') setSex('Masculino');
    else if (data.sex === 'other') setSex('Otro');
    else if (data.sex === 'Femenino' || data.sex === 'Masculino' || data.sex === 'Otro') setSex(data.sex);
  }, [patient.data?.patient]);

  const setQuantity = (itemKey: string, value: string) => {
    const normalized = value.replace(',', '.');
    if (normalized === '' || /^\d*(\.\d{0,4})?$/.test(normalized)) setQuantities((current) => ({ ...current, [itemKey]: normalized }));
  };
  const pick = async () => { const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png'], copyToCacheDirectory: true }); if (!result.canceled) setAttachment(result.assets[0]); };
  const submit = async () => {
    if (!patientId || !weight || !birthDate || !deliveryAt || !volume) return Alert.alert('Completa los campos obligatorios.');
    if ((hours && infusionRate) || (!hours && !infusionRate)) return Alert.alert('Infusión', 'Captura el tiempo o la velocidad de infusión, pero no ambos.');
    if (!integrationItems.length) return Alert.alert('Componentes', 'Captura una cantidad mayor a cero en al menos un componente.');
    try {
      const checked = await prevalidate.mutateAsync({ catalog_type: 'npt', catalog_version: catalog.data?.catalog.catalog_version, items: integrationItems });
      if (!checked.prevalidation.valid) return Alert.alert('Prevalidación rechazada', checked.prevalidation.errors?.map((error) => error.message).filter(Boolean).join('\n'));
      const form = new FormData();
      appendValue(form, 'request_type', 'npt'); appendValue(form, 'patient_id', patientId); appendValue(form, 'service', service); appendValue(form, 'diagnosis', diagnosis); appendValue(form, 'notes', notes); appendValue(form, 'priority', 'routine'); appendValue(form, 'required_at', deliveryAt);
      appendValue(form, 'npt[clinical_service]', service); appendValue(form, 'npt[bed]', bed); appendValue(form, 'npt[floor]', floor); appendValue(form, 'npt[registration]', registration); appendValue(form, 'npt[weight]', weight); appendValue(form, 'npt[sex]', sex); appendValue(form, 'npt[birth_date]', birthDate); appendValue(form, 'npt[route]', route); appendValue(form, 'npt[infusion_hours]', hours); appendValue(form, 'npt[infusion_rate]', infusionRate); appendValue(form, 'npt[overfill]', overfill); appendValue(form, 'npt[total_volume]', volume); appendValue(form, 'npt[npt_type]', nptType); appendValue(form, 'npt[delivery_at]', deliveryAt); appendValue(form, 'npt[destination_hospital]', catalog.data?.medical_unit.name); appendValue(form, 'npt[doctor_name]', catalog.data?.doctor.name); appendValue(form, 'npt[professional_license]', catalog.data?.doctor.professional_license); appendValue(form, 'integration_catalog_version', catalog.data?.catalog.catalog_version);
      integrationItems.forEach((item, index) => { appendValue(form, `integration_items[${index}][catalog_item]`, `${item.product_code}|${item.presentation_code}`); appendValue(form, `integration_items[${index}][quantity]`, item.quantity); appendValue(form, `integration_items[${index}][unit]`, item.unit); });
      appendAttachment(form, attachment);
      const result = await create.mutateAsync({ body: form, key }); Alert.alert('Solicitud creada', `Folio ${result.request.external_id ?? result.request.id}`); router.replace(`/doctor/mixtures/${result.request.id}` as never);
    } catch (error) { Alert.alert('No fue posible enviar', apiErrorMessage(error, 'Revisa los datos.')); }
  };

  return <DoctorPage title="Solicitud NPT" subtitle={`Paciente: ${params.patientName ?? patientId}`}><DoctorQueryState pending={catalog.isPending} error={catalog.isError} empty={!catalog.isPending && !catalogItems.length} retry={() => void catalog.refetch()}>{catalog.data ? <>
    <Text style={doctorStyles.sectionTitle}>1. Datos del paciente y servicio</Text><AppCard><AppField label="Servicio *" value={service} onChangeText={setService} /><AppField label="Cama" value={bed} onChangeText={setBed} /><AppField label="Piso" value={floor} onChangeText={setFloor} /><AppField label="Registro" value={registration} onChangeText={setRegistration} /><AppField label="Diagnóstico" value={diagnosis} onChangeText={setDiagnosis} multiline /><AppField label="Peso (kg) *" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" /><ChoiceField label="Sexo" options={['Femenino', 'Masculino', 'Otro']} value={sex} onChange={setSex} disabled={Boolean(patient.data?.patient?.sex)} /><AppField label="Fecha de nacimiento (AAAA-MM-DD) *" value={birthDate} onChangeText={setBirthDate} editable={!patient.data?.patient?.birth_date} /></AppCard>
    <Text style={doctorStyles.sectionTitle}>2. Administración de la mezcla</Text><AppCard><ChoiceField label="Vía de administración *" options={['Central', 'Periferica']} value={route} onChange={setRoute} /><AppField label="Tiempo de infusión (h)" value={hours} onChangeText={setHours} keyboardType="decimal-pad" /><AppField label="Velocidad de infusión (ml/h)" value={infusionRate} onChangeText={setInfusionRate} keyboardType="decimal-pad" /><AppField label="Sobrellenado (ml)" value={overfill} onChangeText={setOverfill} keyboardType="decimal-pad" /><AppField label="Volumen total (ml) *" value={volume} onChangeText={setVolume} keyboardType="decimal-pad" /><ChoiceField label="Tipo de NPT *" options={['Individualizada', 'Pediatrica']} value={nptType} onChange={setNptType} /></AppCard>
    <Text style={doctorStyles.sectionTitle}>3. Componentes de la nutrición parenteral</Text><Text style={styles.help}>Todos los componentes del catálogo habilitado para esta unidad se muestran y permanecen disponibles.</Text>
    {groups.map((group) => <AppCard key={group.key} style={styles.groupCard}><Text style={styles.groupTitle}>{group.label}</Text>{group.items.map((item) => { const itemKey = nptCatalogKey(item); return <View key={itemKey} style={styles.component}><Text style={styles.componentName}>{catalogLabel(item)}</Text><Text style={styles.componentPresentation}>{item.commercial_name || item.presentation || item.presentation_code}</Text><View style={styles.quantityRow}><View style={styles.quantityField}><AppField label="Cantidad" value={quantities[itemKey] ?? ''} onChangeText={(value) => setQuantity(itemKey, value)} keyboardType="decimal-pad" placeholder="0.00" selectTextOnFocus /></View><Text style={styles.unit}>ml</Text></View></View>; })}</AppCard>)}
    <AppCard style={styles.summaryCard}><Text style={styles.summaryTitle}>Resumen de componentes</Text><Text style={styles.summaryValue}>{integrationItems.length} con cantidad · {totalComponentVolume.toFixed(2)} ml capturados</Text></AppCard>
    <Text style={doctorStyles.sectionTitle}>4. Entrega y responsable médico</Text><AppCard><AppField label="Fecha y hora de entrega (AAAA-MM-DD HH:mm) *" value={deliveryAt} onChangeText={setDeliveryAt} /><AppField label="Nombre del médico" value={catalog.data.doctor.name} editable={false} /><AppField label="Cédula profesional" value={catalog.data.doctor.professional_license ?? ''} editable={false} /><AppField label="Indicaciones y observaciones" value={notes} onChangeText={setNotes} multiline /></AppCard>
    <Text style={doctorStyles.sectionTitle}>5. Confirmación</Text><AppButton label={attachment ? attachment.name : 'Adjuntar autorización (opcional)'} variant="outline" onPress={() => void pick()} /><AppButton label="Prevalidar y enviar solicitud" loading={prevalidate.isPending || create.isPending} onPress={() => void submit()} />
  </> : null}</DoctorQueryState></DoctorPage>;
}

const styles = StyleSheet.create({
  help: { color: colors.textMuted, fontSize: 14, lineHeight: 21 }, choiceField: { gap: spacing.sm }, fieldLabel: { color: colors.text, fontSize: 14, fontWeight: '700' }, choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, choice: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface }, choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primary }, choiceDisabled: { opacity: 0.65 }, choiceText: { color: colors.text, fontWeight: '700' }, choiceTextSelected: { color: colors.surface }, groupCard: { padding: spacing.md }, groupTitle: { color: colors.text, fontSize: 20, fontWeight: '800' }, component: { gap: spacing.xs, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }, componentName: { color: colors.text, fontSize: 15, fontWeight: '800', lineHeight: 21 }, componentPresentation: { color: colors.textMuted, fontSize: 13, lineHeight: 19 }, quantityRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }, quantityField: { flex: 1 }, unit: { color: colors.text, fontSize: 15, fontWeight: '800', paddingBottom: 15 }, summaryCard: { backgroundColor: colors.background }, summaryTitle: { color: colors.primaryDark, fontWeight: '800' }, summaryValue: { color: colors.text, fontSize: 16, fontWeight: '700' },
});
