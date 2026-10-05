import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { AppField } from '@/components/ui/app-field';
import { DoctorPage, DoctorQueryState, doctorStyles } from '@/features/doctor/doctor-ui';
import { appendAttachment, appendValue, catalogLabel, nptCatalogKey, requestKey } from '@/features/doctor/mixture-form';
import { apiErrorMessage } from '@/services/api/client';
import { useDoctorPatient } from '@/services/doctor/doctor-queries';
import type { CatalogItem } from '@/services/doctor/mixture-api';
import { useCreateMixtureRequest, useMixtureCatalog, usePrevalidateMixture } from '@/services/doctor/mixture-queries';
import { colors, spacing } from '@/theme/tokens';

type MedicationDraft = { id: string; catalogKey: string; dose: string; diluentId?: number; routeId?: number };
type MixtureDraft = { id: string; medications: MedicationDraft[]; volume: string; minutes: string; deliveryDates: string[]; setInfusion: boolean; infusorId?: number };
type ChoiceProps = { label: string; options: string[]; value: string; onChange: (value: string) => void; disabled?: boolean };
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const medicationDraft = (): MedicationDraft => ({ id: uid(), catalogKey: '', dose: '' });
const mixtureDraft = (): MixtureDraft => ({ id: uid(), medications: [medicationDraft()], volume: '', minutes: '60', deliveryDates: [''], setInfusion: false });

function ChoiceField({ label, options, value, onChange, disabled = false }: ChoiceProps) {
  return <View style={styles.choiceField}><Text style={styles.fieldLabel}>{label}</Text><View style={styles.choiceRow}>{options.map((option) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: value === option, disabled }} disabled={disabled} key={option} onPress={() => onChange(option)} style={[styles.choice, value === option && styles.choiceSelected, disabled && styles.choiceDisabled]}><Text style={[styles.choiceText, value === option && styles.choiceTextSelected]}>{option}</Text></Pressable>)}</View></View>;
}

function OptionPills({ label, options, value, onChange }: { label: string; options: { id: number; name?: string }[]; value?: number; onChange: (id: number) => void }) {
  return <View style={styles.choiceField}><Text style={styles.fieldLabel}>{label}</Text>{options.length ? <View style={styles.choiceRow}>{options.map((option) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: value === option.id }} key={option.id} onPress={() => onChange(option.id)} style={[styles.choice, value === option.id && styles.choiceSelected]}><Text style={[styles.choiceText, value === option.id && styles.choiceTextSelected]}>{option.name ?? option.id}</Text></Pressable>)}</View> : <Text style={styles.errorText}>No hay opciones compatibles.</Text>}</View>;
}

export default function OncologyRequestScreen() {
  const params = useLocalSearchParams<{ patientId: string; patientName?: string }>();
  const patientId = Number(params.patientId);
  const patient = useDoctorPatient(patientId);
  const catalog = useMixtureCatalog('oncology');
  const prevalidate = usePrevalidateMixture();
  const create = useCreateMixtureRequest();
  const [requestDate, setRequestDate] = useState(new Date().toISOString().slice(0, 10));
  const [service, setService] = useState('Quimioterapia');
  const [floor, setFloor] = useState('');
  const [bed, setBed] = useState('');
  const [registration, setRegistration] = useState('');
  const [sex, setSex] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [allergies, setAllergies] = useState('');
  const [notes, setNotes] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [mixtures, setMixtures] = useState<MixtureDraft[]>([mixtureDraft()]);
  const [selector, setSelector] = useState<{ mixtureId: string; medicationId: string } | null>(null);
  const [search, setSearch] = useState('');
  const [attachment, setAttachment] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [key] = useState(requestKey);
  const patientDefaultsApplied = useRef(false);
  const items = useMemo(() => catalog.data?.catalog.items ?? [], [catalog.data?.catalog.items]);
  const itemMap = useMemo(() => new Map(items.map((item) => [nptCatalogKey(item), item])), [items]);
  const filteredItems = useMemo(() => { const term = search.trim().toLowerCase(); return term ? items.filter((item) => `${catalogLabel(item)} ${item.presentation_code}`.toLowerCase().includes(term)) : items; }, [items, search]);
  const age = birthDate ? Math.max(0, Math.floor((Date.now() - new Date(`${birthDate}T00:00:00`).getTime()) / 31557600000)) : null;
  const bodySurface = Number(weight) > 0 && Number(height) > 0 ? Math.sqrt((Number(weight) * Number(height)) / 3600) : null;

  useEffect(() => {
    if (!patient.data?.patient || patientDefaultsApplied.current) return;

    patientDefaultsApplied.current = true;
    const data = patient.data.patient;
    setRegistration(data.platform_number ?? '');
    setBirthDate(data.birth_date ?? '');
    if (data.sex === 'female') setSex('Femenino');
    else if (data.sex === 'male') setSex('Masculino');
    else if (data.sex === 'Femenino' || data.sex === 'Masculino') setSex(data.sex);
  }, [patient.data?.patient]);

  const updateMixture = (id: string, change: (mixture: MixtureDraft) => MixtureDraft) => setMixtures((current) => current.map((mixture) => mixture.id === id ? change(mixture) : mixture));
  const updateMedication = (mixtureId: string, medicationId: string, change: (medication: MedicationDraft) => MedicationDraft) => updateMixture(mixtureId, (mixture) => ({ ...mixture, medications: mixture.medications.map((medication) => medication.id === medicationId ? change(medication) : medication) }));
  const chooseMedication = (item: CatalogItem) => {
    if (!selector) return;
    updateMedication(selector.mixtureId, selector.medicationId, (medication) => ({ ...medication, catalogKey: nptCatalogKey(item), diluentId: item.diluents?.[0]?.id, routeId: item.administration_routes?.[0]?.id }));
    setSelector(null); setSearch('');
  };
  const pick = async () => { const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png'], copyToCacheDirectory: true }); if (!result.canceled) setAttachment(result.assets[0]); };

  const submit = async () => {
    if (!patientId || !requestDate || !service || !floor || !bed || !registration || !sex || !weight || !height || !birthDate || !diagnosis) return Alert.alert('Completa todos los datos obligatorios del paciente.');
    const prepared = mixtures.map((mixture) => ({ mixture, medications: mixture.medications.map((medication) => ({ medication, item: itemMap.get(medication.catalogKey) })) }));
    const invalid = prepared.some(({ mixture, medications }) => !mixture.volume || !mixture.minutes || !mixture.deliveryDates.length || mixture.deliveryDates.some((date) => !date) || !medications.length || medications.some(({ medication, item }) => !item || !medication.dose || !medication.diluentId || !medication.routeId));
    if (invalid) return Alert.alert('Mezclas incompletas', 'Completa medicamento, dosis, diluyente, vía, volumen, infusión y al menos una fecha en cada mezcla.');
    const integrationItems = prepared.flatMap(({ medications }) => medications.map(({ medication, item }) => ({ product_code: item!.product_code, presentation_code: item!.presentation_code, quantity: Number(medication.dose), unit: 'mg' as const })));
    try {
      const checked = await prevalidate.mutateAsync({ catalog_type: 'oncology', catalog_version: catalog.data?.catalog.catalog_version, items: integrationItems });
      if (!checked.prevalidation.valid) return Alert.alert('Prevalidación rechazada', checked.prevalidation.errors?.map((error) => error.message).filter(Boolean).join('\n'));
      const form = new FormData();
      appendValue(form, 'request_type', 'chemo'); appendValue(form, 'patient_id', patientId); appendValue(form, 'service', service); appendValue(form, 'diagnosis', diagnosis); appendValue(form, 'notes', notes); appendValue(form, 'priority', 'routine');
      appendValue(form, 'oncology[request_date]', requestDate); appendValue(form, 'oncology[facility]', catalog.data?.medical_unit.name); appendValue(form, 'oncology[floor]', floor); appendValue(form, 'oncology[bed]', bed); appendValue(form, 'oncology[patient_identifier]', registration); appendValue(form, 'oncology[sex]', sex); appendValue(form, 'oncology[age]', age); appendValue(form, 'oncology[weight]', weight); appendValue(form, 'oncology[height]', height); appendValue(form, 'oncology[birth_date]', birthDate); appendValue(form, 'oncology[body_surface]', bodySurface?.toFixed(2)); appendValue(form, 'oncology[allergies]', allergies); appendValue(form, 'oncology[delivery_method]', deliveryMethod); appendValue(form, 'oncology[doctor_name]', catalog.data?.doctor.name); appendValue(form, 'oncology[professional_license]', catalog.data?.doctor.professional_license); appendValue(form, 'oncology[mixture_count]', mixtures.length); appendValue(form, 'integration_catalog_version', catalog.data?.catalog.catalog_version);
      prepared.forEach(({ mixture, medications }, mixtureIndex) => {
        medications.forEach(({ medication, item }, medicationIndex) => { appendValue(form, `oncology[mixtures][${mixtureIndex}][medications][${medicationIndex}][catalog_item]`, nptCatalogKey(item!)); appendValue(form, `oncology[mixtures][${mixtureIndex}][medications][${medicationIndex}][medication]`, catalogLabel(item!)); appendValue(form, `oncology[mixtures][${mixtureIndex}][medications][${medicationIndex}][dose]`, medication.dose); appendValue(form, `oncology[mixtures][${mixtureIndex}][medications][${medicationIndex}][diluent_id]`, medication.diluentId); appendValue(form, `oncology[mixtures][${mixtureIndex}][medications][${medicationIndex}][route_id]`, medication.routeId); });
        appendValue(form, `oncology[mixtures][${mixtureIndex}][dilution_volume]`, mixture.volume); appendValue(form, `oncology[mixtures][${mixtureIndex}][infusion_minutes]`, mixture.minutes); appendValue(form, `oncology[mixtures][${mixtureIndex}][set_infusion]`, mixture.setInfusion); appendValue(form, `oncology[mixtures][${mixtureIndex}][infusor_id]`, mixture.infusorId); mixture.deliveryDates.forEach((date, dateIndex) => appendValue(form, `oncology[mixtures][${mixtureIndex}][delivery_dates][${dateIndex}]`, date));
      });
      appendAttachment(form, attachment);
      const result = await create.mutateAsync({ body: form, key }); Alert.alert('Solicitud creada', `Folio ${result.request.external_id ?? result.request.id}`); router.replace(`/doctor/mixtures/${result.request.id}` as never);
    } catch (error) { Alert.alert('No fue posible enviar', apiErrorMessage(error, 'Revisa los datos.')); }
  };

  return <DoctorPage title="Solicitud oncológica" subtitle={`Paciente: ${params.patientName ?? patientId}`}><DoctorQueryState pending={catalog.isPending} error={catalog.isError} empty={!catalog.isPending && !items.length} retry={() => void catalog.refetch()}>{catalog.data ? <>
    <Text style={doctorStyles.sectionTitle}>1. Información general</Text><AppCard><AppField label="Fecha de programación *" value={requestDate} onChangeText={setRequestDate} /><AppField label="Hospital / Centro" value={catalog.data.medical_unit.name ?? ''} editable={false} /><AppField label="Servicio *" value={service} onChangeText={setService} /><AppField label="Piso *" value={floor} onChangeText={setFloor} /><AppField label="Cama *" value={bed} onChangeText={setBed} /><AppField label="Registro del paciente *" value={registration} onChangeText={setRegistration} /></AppCard>
    <Text style={doctorStyles.sectionTitle}>2. Datos del paciente</Text><AppCard><Text style={styles.help}>{patient.data?.patient?.birth_date || patient.data?.patient?.sex ? 'Los datos disponibles del expediente se cargaron y no pueden modificarse aquí.' : 'El expediente no contiene sexo ni fecha de nacimiento; complétalos para esta solicitud.'}</Text><ChoiceField label="Sexo *" options={['Femenino', 'Masculino']} value={sex} onChange={setSex} disabled={Boolean(patient.data?.patient?.sex)} /><AppField label="Fecha de nacimiento (AAAA-MM-DD) *" value={birthDate} onChangeText={setBirthDate} editable={!patient.data?.patient?.birth_date} /><AppField label="Edad" value={age === null ? '' : String(age)} editable={false} /><AppField label="Peso (kg) *" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" /><AppField label="Talla (cm) *" value={height} onChangeText={setHeight} keyboardType="decimal-pad" /><AppField label="Superficie corporal (m²)" value={bodySurface ? bodySurface.toFixed(2) : ''} editable={false} /><AppField label="Diagnóstico *" value={diagnosis} onChangeText={setDiagnosis} multiline /></AppCard>
    <Text style={doctorStyles.sectionTitle}>3. Tabla de medicamentos</Text><Text style={styles.help}>{mixtures.length} {mixtures.length === 1 ? 'mezcla solicitada' : 'mezclas solicitadas'}. Cada mezcla genera un ID y una remisión independiente.</Text>
    {mixtures.map((mixture, mixtureIndex) => <AppCard key={mixture.id} style={styles.mixtureCard}><View style={styles.headerRow}><Text style={styles.mixtureTitle}>Mezcla #{mixtureIndex + 1}</Text>{mixtures.length > 1 ? <AppButton label="Eliminar mezcla" variant="outline" onPress={() => setMixtures((current) => current.filter((entry) => entry.id !== mixture.id))} /> : null}</View>
      {mixture.medications.map((medication, medicationIndex) => { const item = itemMap.get(medication.catalogKey); return <View key={medication.id} style={styles.medication}><Text style={styles.medicationTitle}>Medicamento #{medicationIndex + 1}</Text><AppButton label={item ? catalogLabel(item) : 'Seleccionar medicamento *'} variant="outline" onPress={() => setSelector({ mixtureId: mixture.id, medicationId: medication.id })} />{item ? <Text style={styles.presentation}>{item.presentation_code}</Text> : null}<AppField label="Dosis (mg) *" value={medication.dose} onChangeText={(dose) => updateMedication(mixture.id, medication.id, (current) => ({ ...current, dose }))} keyboardType="decimal-pad" />{item ? <><OptionPills label="Diluyente *" options={item.diluents ?? []} value={medication.diluentId} onChange={(diluentId) => updateMedication(mixture.id, medication.id, (current) => ({ ...current, diluentId }))} /><OptionPills label="Vía de administración *" options={item.administration_routes ?? []} value={medication.routeId} onChange={(routeId) => updateMedication(mixture.id, medication.id, (current) => ({ ...current, routeId }))} /></> : null}{mixture.medications.length > 1 ? <AppButton label="Eliminar medicamento" variant="outline" onPress={() => updateMixture(mixture.id, (current) => ({ ...current, medications: current.medications.filter((entry) => entry.id !== medication.id) }))} /> : null}</View>; })}
      <AppButton label="+ Agregar medicamento" variant="outline" onPress={() => updateMixture(mixture.id, (current) => ({ ...current, medications: [...current.medications, medicationDraft()] }))} /><AppField label="Volumen total de dilución (ml) *" value={mixture.volume} onChangeText={(volume) => updateMixture(mixture.id, (current) => ({ ...current, volume }))} keyboardType="decimal-pad" /><AppField label="Tiempo de infusión (min) *" value={mixture.minutes} onChangeText={(minutes) => updateMixture(mixture.id, (current) => ({ ...current, minutes }))} keyboardType="number-pad" />
      <Text style={styles.medicationTitle}>Fechas de entrega *</Text>{mixture.deliveryDates.map((date, dateIndex) => <View key={`${mixture.id}-date-${dateIndex}`} style={styles.dateRow}><View style={styles.dateField}><AppField label={`Fecha ${dateIndex + 1} (AAAA-MM-DD HH:mm)`} value={date} onChangeText={(value) => updateMixture(mixture.id, (current) => ({ ...current, deliveryDates: current.deliveryDates.map((entry, index) => index === dateIndex ? value : entry) }))} /></View>{mixture.deliveryDates.length > 1 ? <AppButton label="Quitar" variant="outline" onPress={() => updateMixture(mixture.id, (current) => ({ ...current, deliveryDates: current.deliveryDates.filter((_, index) => index !== dateIndex) }))} /> : null}</View>)}<AppButton label="+ Agregar fecha" variant="outline" onPress={() => updateMixture(mixture.id, (current) => ({ ...current, deliveryDates: [...current.deliveryDates, ''] }))} />
      <ChoiceField label="Set de infusión" options={['No', 'Sí']} value={mixture.setInfusion ? 'Sí' : 'No'} onChange={(value) => updateMixture(mixture.id, (current) => ({ ...current, setInfusion: value === 'Sí', infusorId: value === 'Sí' ? undefined : current.infusorId }))} />{mixture.medications.some((medication) => itemMap.get(medication.catalogKey)?.requires_infusor) && !mixture.setInfusion ? <OptionPills label="Infusor" options={(catalog.data.catalog.infusors ?? []).map((infusor) => ({ id: infusor.id, name: infusor.name ?? [infusor.generic_name, infusor.commercial_name].filter(Boolean).join(' - ') }))} value={mixture.infusorId} onChange={(infusorId) => updateMixture(mixture.id, (current) => ({ ...current, infusorId }))} /> : null}
    </AppCard>)}
    <AppButton label="+ Agregar mezcla" onPress={() => setMixtures((current) => [...current, mixtureDraft()])} />
    <Text style={doctorStyles.sectionTitle}>4. Información adicional</Text><AppCard><AppField label="Observaciones sobre vías de administración" value={notes} onChangeText={setNotes} multiline /><AppField label="Alergias" value={allergies} onChangeText={setAllergies} /><AppField label="Manera de entrega" value={deliveryMethod} onChangeText={setDeliveryMethod} /><AppField label="Nombre del médico" value={catalog.data.doctor.name} editable={false} /><AppField label="Cédula profesional" value={catalog.data.doctor.professional_license ?? ''} editable={false} /></AppCard>
    <Text style={doctorStyles.sectionTitle}>5. Confirmación</Text><AppButton label={attachment ? attachment.name : 'Adjuntar firma y cédula (opcional)'} variant="outline" onPress={() => void pick()} /><AppButton label="Prevalidar y guardar solicitud" loading={prevalidate.isPending || create.isPending} onPress={() => void submit()} />
    <Modal visible={Boolean(selector)} animationType="slide" onRequestClose={() => setSelector(null)}><View style={styles.modal}><View style={styles.headerRow}><Text style={styles.modalTitle}>Seleccionar medicamento</Text><AppButton label="Cerrar" variant="outline" onPress={() => setSelector(null)} /></View><AppField label="Buscar" value={search} onChangeText={setSearch} placeholder="Nombre o presentación" /><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalList}>{filteredItems.map((item) => <Pressable key={nptCatalogKey(item)} onPress={() => chooseMedication(item)}><AppCard><Text style={styles.medicationTitle}>{catalogLabel(item)}</Text><Text style={styles.presentation}>{item.presentation_code}</Text></AppCard></Pressable>)}</ScrollView></View></Modal>
  </> : null}</DoctorQueryState></DoctorPage>;
}

const styles = StyleSheet.create({
  help: { color: colors.textMuted, fontSize: 14, lineHeight: 21 }, choiceField: { gap: spacing.sm }, fieldLabel: { color: colors.text, fontSize: 14, fontWeight: '700' }, choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, choice: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface }, choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primary }, choiceDisabled: { opacity: 0.65 }, choiceText: { color: colors.text, fontWeight: '700' }, choiceTextSelected: { color: colors.white }, errorText: { color: colors.danger, fontSize: 13 }, mixtureCard: { padding: spacing.md }, headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }, mixtureTitle: { flex: 1, color: colors.text, fontSize: 20, fontWeight: '800' }, medication: { gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }, medicationTitle: { color: colors.text, fontSize: 16, fontWeight: '800' }, presentation: { color: colors.textMuted, fontSize: 13 }, dateRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }, dateField: { flex: 1 }, modal: { flex: 1, gap: spacing.md, padding: spacing.lg, backgroundColor: colors.background }, modalTitle: { flex: 1, color: colors.text, fontSize: 24, fontWeight: '800' }, modalList: { gap: spacing.sm, paddingBottom: spacing.xl },
});
