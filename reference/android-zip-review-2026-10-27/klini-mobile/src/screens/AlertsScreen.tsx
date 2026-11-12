import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import ArchivePopup from '../components/ArchivePopup';
import AlertRecurrencePopup from '../components/AlertRecurrencePopup';
import { colors, confirmAction, Icon } from '../components/ui';
import { emptyMedicationCare, type MedicationAlert } from '../domain/medicationCare';
import { isMedicationAlertRecurrence, medicationAlertRecurrenceLabel } from '../domain/medicationRecurrence';
import { todayISO } from '../domain/dates';
import { useAppStore } from '../state/store';
import { requestMedicationNotificationPermission, syncMedicationAlerts } from '../services/medicationNotifications';
import { isMedicationAlertEligible } from '../services/medicationNotificationPlan';

const allDays = [0, 1, 2, 3, 4, 5, 6];
type Draft = Omit<MedicationAlert, 'id'>;
export interface AlertsScreenProps { onClose: () => void; initialTreatmentId?: string; initialMedicationId?: string; activateOnSave?: boolean }

export default function AlertsScreen(props: AlertsScreenProps) {
  const { state } = useAppStore();
  return <AlertsContent key={state.profile.id} {...props} />;
}
function AlertsContent({ onClose, initialTreatmentId, initialMedicationId, activateOnSave = false }: AlertsScreenProps) {
  const { state, saveMedicationAlert, deleteMedicationAlert, storageError } = useAppStore();
  const care = state.medicationCare ?? emptyMedicationCare();
  const initialTreatment = care.treatments.find(item => item.id === initialTreatmentId);
  const initialMedication = state.medications.find(item => item.id === initialMedicationId && initialTreatment?.medicationIds.includes(item.id))
    ?? state.medications.find(item => item.id === initialTreatment?.medicationIds[0]);
  const [page, setPage] = useState<'list' | 'form'>(initialTreatment ? 'form' : 'list');
  const [recurrenceOpen, setRecurrenceOpen] = useState(false);
  const [tab, setTab] = useState<'active' | 'paused'>('active');
  const [editing, setEditing] = useState<string | undefined>();
  const [draft, setDraft] = useState<Draft>({ medicationId: initialMedication?.id, medicationName: initialMedication?.name ?? '', concentration: '', ...(initialTreatment ? { treatmentId: initialTreatment.id } : {}), time: '09:00', days: [...allDays], enabled: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const current = useRef(state);
  useEffect(() => { current.current = state; }, [state]);
  const alive = useRef(true);
  const pending = useRef(false);
  const concentrationInput = useRef<React.ComponentRef<typeof TextInput>>(null);
  const lastSavedAt = useRef(0);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const medication = state.medications.find(item => item.id === draft.medicationId);
  const title = page === 'form' ? editing ? 'Editar alerta' : 'Crear alerta' : 'Alertas';
  const openForm = useCallback((alert?: MedicationAlert) => {
    if (pending.current || (!alert && Date.now() - lastSavedAt.current < 450)) return;
    setError(''); setEditing(alert?.id);
    setDraft(alert ? { medicationId: alert.medicationId, medicationName: alert.medicationName ?? state.medications.find(item => item.id === alert.medicationId)?.name ?? '', concentration: alert.concentration ?? '', ...(alert.treatmentId ? { treatmentId: alert.treatmentId } : {}), time: alert.time, days: [...alert.days], ...(alert.recurrence ? { recurrence: { ...alert.recurrence } } : {}), enabled: alert.enabled }
      : { medicationName: '', concentration: '', time: '09:00', days: [...allDays], enabled: false });
    setPage('form');
  }, [state.medications]);
  const reconcile = async (alert: MedicationAlert) => {
    const latest = current.current;
    const latestCare = latest.medicationCare ?? emptyMedicationCare();
    return syncMedicationAlerts({ ...latest, medicationCare: { ...latestCare, alerts: [...latestCare.alerts.filter(item => item.id !== alert.id), alert] } });
  };
  const persistAlert = async (input: Draft, id?: string, requestedEnabled?: boolean) => {
    if (pending.current) return;
    pending.current = true;
    Keyboard.dismiss(); setBusy(true); setError('');
    try {
      const existing = id ? current.current.medicationCare?.alerts.find(item => item.id === id) : undefined;
      if (id && !existing) throw new Error('La alerta ya no está disponible.');
      if (requestedEnabled !== undefined) {
        if (!existing) throw new Error('La alerta ya no está disponible.');
        input = existing;
      }
      const selected = current.current.medications.find(item => item.id === input.medicationId);
      const name = (input.medicationName ?? selected?.name ?? '').trim();
      if (!name) throw new Error('Escribe el nombre del medicamento.');
      if (input.medicationId && !selected) throw new Error('El medicamento vinculado ya no está disponible.');
      if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input.time)) throw new Error('Escribe la hora en formato HH:mm, por ejemplo 09:00.');
      if (!input.days.length) throw new Error('Selecciona al menos un día.');
      if (input.recurrence && !isMedicationAlertRecurrence(input.recurrence)) throw new Error('Escribe una fecha de referencia válida con formato AAAA-MM-DD.');
      const activatingFromTreatment = !id && activateOnSave && !!initialTreatmentId && !!selected && input.treatmentId === initialTreatmentId;
      const enabled = requestedEnabled ?? (existing ? existing.enabled && (!existing.medicationId || existing.medicationId === input.medicationId) : activatingFromTreatment);
      const activating = enabled && !existing?.enabled;
      if (enabled && selected && (!selected.active || (selected.endDate && selected.endDate < todayISO()))) throw new Error('El medicamento ya no está vigente. Actualízalo antes de activar la alerta.');
      if (enabled && input.treatmentId) {
        const treatment = current.current.medicationCare?.treatments.find(item => item.id === input.treatmentId);
        if (!treatment?.active || !selected || !treatment.medicationIds.includes(selected.id) || (treatment.endDate && treatment.endDate < todayISO())) throw new Error('El tratamiento ya no está vigente. Actualízalo antes de activar la alerta.');
      }
      if (activating) await requestMedicationNotificationPermission();
      if (!alive.current) return;
      const candidate = requestedEnabled !== undefined ? { ...input, enabled } : { ...input, medicationName: name, concentration: input.concentration?.trim() || undefined, enabled };
      const savedId = await saveMedicationAlert(candidate, id);
      if (!alive.current) return;
      await reconcile({ ...candidate, id: savedId });
      if (!alive.current) return;
      lastSavedAt.current = Date.now();
      setTab(enabled ? 'active' : 'paused'); setPage('list'); setEditing(undefined);
    } catch (caught) { if (alive.current) setError(caught instanceof Error ? caught.message : 'No se pudo guardar la alerta. Intenta de nuevo.'); }
    finally { pending.current = false; if (alive.current) setBusy(false); }
  };
  const remove = () => {
    if (!editing || pending.current) return;
    const id = editing;
    confirmAction('Eliminar alerta', 'Se eliminará este recordatorio del perfil.', () => {
      if (pending.current || !alive.current) return;
      pending.current = true;
      setBusy(true); setError('');
      void deleteMedicationAlert(id).then(async () => {
        if (!alive.current) return;
        const latest = current.current; const latestCare = latest.medicationCare ?? emptyMedicationCare();
        await syncMedicationAlerts({ ...latest, medicationCare: { ...latestCare, alerts: latestCare.alerts.filter(item => item.id !== id) } });
        if (alive.current) { lastSavedAt.current = Date.now(); setPage('list'); setEditing(undefined); }
      }).catch(caught => { if (alive.current) setError(caught instanceof Error ? caught.message : 'No se pudo eliminar la alerta.'); }).finally(() => { pending.current = false; if (alive.current) setBusy(false); });
    });
  };
  const renderAlert = (alert: MedicationAlert) => {
    const item = state.medications.find(entry => entry.id === alert.medicationId);
    const name = alert.medicationName ?? item?.name ?? 'Medicamento';
    const active = alert.enabled;
    return <View key={alert.id} style={s.alertRow} testID={`medication-alert-${alert.id}`}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Editar alerta de ${name}, ${alert.time}, ${medicationAlertRecurrenceLabel(alert)}`} disabled={busy} onPress={() => openForm(alert)} style={s.alertInfo}>
        <Icon name="notifications" size={21} color={active ? colors.teal : '#8CA1B7'} /><View style={s.flex}><Text numberOfLines={2} style={s.alertName}>{name}</Text>{!!alert.concentration && <Text style={s.alertRepeat}>{alert.concentration}</Text>}<Text style={s.recurrenceLabel}>Recurrencia</Text><Text testID={`medication-alert-recurrence-${alert.id}`} style={s.alertRepeat}>{medicationAlertRecurrenceLabel(alert)}</Text>{active && !isMedicationAlertEligible(state, alert) && <Text style={s.alertRepeat}>Sin avisos por la vigencia del medicamento o tratamiento.</Text>}</View><Text style={s.alertTime}>{alert.time}</Text>
      </Pressable>
      <Switch testID={`medication-alert-toggle-${alert.id}`} accessibilityLabel={`${alert.enabled ? 'Desactivar' : 'Activar'} alerta de ${name}`} accessibilityHint="El cambio también se refleja en Tratamientos." disabled={busy} value={alert.enabled} onValueChange={enabled => void persistAlert({ ...alert, days: [...alert.days] }, alert.id, enabled)} trackColor={{ false: '#DBE2E9', true: colors.teal }} thumbColor="white" />
    </View>;
  };
  const createButton = <Pressable testID="create-medication-alert" accessibilityRole="button" onPress={() => openForm()} disabled={busy} style={({ pressed }) => [s.create, pressed && s.dim]}><Icon name="plus" size={17} color={colors.teal} /><Text style={s.createText}>Crear alerta</Text></Pressable>;
  const saveButton = <Pressable testID="save-medication-alert" accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy, busy }} onPress={() => void persistAlert(draft, editing)} style={({ pressed }) => [s.save, (pressed || busy) && s.dim]}><Text style={s.saveText}>{busy ? 'Guardando…' : 'Guardar alerta'}</Text></Pressable>;
  const list = care.alerts.filter(item => tab === 'active' ? item.enabled : !item.enabled);
  const closeRecurrence = useCallback(() => setRecurrenceOpen(false), []);
  const back = () => { if (busy) return; setError(''); if (recurrenceOpen) closeRecurrence(); else if (page === 'form') setPage('list'); else onClose(); };

  return <ArchivePopup dismissible={!busy} title={title} titleAlign={page === 'list' ? 'center' : 'left'} titleTestID="medication-alert-title" onClose={busy ? () => undefined : onClose} onBack={back} avoidKeyboard contentKey={`alerts-${page}`} onOverlayDismiss={recurrenceOpen ? closeRecurrence : undefined} overlay={recurrenceOpen ? <AlertRecurrencePopup value={draft} onClose={closeRecurrence} onSelect={schedule => { setDraft(value => ({ ...value, days: [...schedule.days], recurrence: schedule.recurrence ? { ...schedule.recurrence } : undefined })); closeRecurrence(); }} /> : undefined} footer={
    page === 'list' ? <View style={s.footer}>{createButton}</View> : page === 'form' ? <View style={s.footer}>{saveButton}</View> : undefined
  }>
    {page === 'list' && <View testID="alerts-folder">
      <View style={s.tabs}>{(['active', 'paused'] as const).map(value => <Pressable key={value} testID={`medication-alert-tab-${value}`} accessibilityRole="tab" aria-selected={tab === value} accessibilityState={{ selected: tab === value }} onPress={() => setTab(value)} style={[s.tab, tab === value && s.tabSelected]}><Text style={[s.tabText, tab === value && s.tabTextSelected]}>{value === 'active' ? 'Activas' : 'Pausadas'}</Text></Pressable>)}</View>
      {care.alerts.length === 0 ? <View style={s.empty}><View style={s.emptyIcon}><Icon name="notifications" size={29} color="#8CA1B7" /></View><Text style={s.emptyText}>Aún no tienes alertas.</Text></View>
        : list.length ? list.map(renderAlert) : <View style={s.empty}><View style={s.emptyIcon}><Icon name="notifications" size={29} color="#8CA1B7" /></View><Text style={s.emptyText}>{tab === 'active' ? 'No tienes alertas activas.' : 'No tienes alertas pausadas.'}</Text></View>}
    </View>}
    {page === 'form' && <View testID="medication-alert-form" style={s.form}>
      <View style={s.textRow}>
        <Text style={s.label}>Medicamento</Text>
        <TextInput testID="alert-medication-name" accessibilityLabel="Medicamento" value={draft.medicationName ?? medication?.name ?? ''} placeholder="Escribe el medicamento" placeholderTextColor="#8CA1B7" onChangeText={medicationName => setDraft(value => {
          const linked = state.medications.find(item => item.id === value.medicationId);
          const sameName = (name: string) => medicationName.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase();
          const keepLink = !!linked && sameName(linked.name);
          const matches = initialTreatment ? state.medications.filter(item => initialTreatment.medicationIds.includes(item.id) && sameName(item.name)) : [];
          const matched = keepLink ? linked : matches.length === 1 ? matches[0] : undefined;
          return { ...value, medicationName, medicationId: matched?.id, treatmentId: matched ? keepLink ? value.treatmentId : initialTreatment?.id : undefined };
        })} maxLength={120} editable={!busy} autoCorrect spellCheck autoCapitalize="words" autoComplete="off" returnKeyType="next" onSubmitEditing={() => concentrationInput.current?.focus()} underlineColorAndroid="transparent" style={s.freeInput} />
      </View>
      <View style={s.textRow}>
        <Text style={s.label}>Concentración</Text>
        <TextInput ref={concentrationInput} testID="alert-medication-concentration" accessibilityLabel="Concentración del medicamento" value={draft.concentration ?? ''} placeholder="Según el envase o receta" placeholderTextColor="#8CA1B7" onChangeText={concentration => setDraft(value => ({ ...value, concentration }))} maxLength={80} editable={!busy} autoCorrect={false} autoComplete="off" returnKeyType="done" underlineColorAndroid="transparent" style={s.freeInput} />
      </View>
        {draft.treatmentId && <View style={s.fieldRow}><View style={s.flex}><Text style={s.label}>Tratamiento</Text><Text style={s.fieldValue}>{care.treatments.find(item => item.id === draft.treatmentId)?.name ?? 'Sin tratamiento'}</Text></View></View>}
        <View style={s.timeRow}><Text style={s.label}>Hora</Text><TextInput testID="alert-time" accessibilityLabel="Hora del recordatorio, formato HH:mm" value={draft.time} placeholder="09:00" placeholderTextColor="#8CA1B7" onChangeText={time => setDraft(value => ({ ...value, time }))} maxLength={5} editable={!busy} keyboardType="numbers-and-punctuation" autoCorrect={false} autoComplete="off" underlineColorAndroid="transparent" style={s.timeInput} /></View>
        <Pressable testID="alert-repeat-picker" accessibilityRole="button" onPress={() => { Keyboard.dismiss(); setError(''); setRecurrenceOpen(true); }} disabled={busy} style={s.fieldRow}><View style={s.flex}><Text style={s.label}>Recurrencia</Text><Text testID="alert-recurrence-value" style={s.fieldValue}>{draft.days.length ? medicationAlertRecurrenceLabel(draft) : 'Seleccionar días'}</Text></View><Icon name="chevronRight" size={18} color={colors.navy} /></Pressable>
        {editing && <Pressable testID="delete-medication-alert" accessibilityRole="button" onPress={remove} disabled={busy} style={s.delete}><Text style={s.deleteText}>Eliminar alerta</Text></Pressable>}
    </View>}
    {!!(error || storageError) && <Text testID="medication-alert-error" accessibilityRole="alert" style={s.error}>{error || storageError}</Text>}
  </ArchivePopup>;
}

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 }, muted: { color: '#8CA1B7' }, dim: { opacity: 0.5 },
  recurrenceLabel: { color: '#8198B0', fontSize: 10, marginTop: 5 },
  empty: { alignItems: 'center', paddingTop: 64, gap: 14 }, emptyIcon: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#F2F7F8', alignItems: 'center', justifyContent: 'center' }, emptyText: { color: '#8193A5', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  create: { alignSelf: 'center', minHeight: 36, borderRadius: 20, backgroundColor: '#E0F6F4', paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }, createText: { color: colors.tealDark, fontSize: 12, lineHeight: 18, fontWeight: '500' }, footer: { alignItems: 'center', justifyContent: 'center', minHeight: 42 },
  tabs: { alignSelf: 'center', flexDirection: 'row', borderRadius: 20, backgroundColor: '#EAF0F7', marginTop: 14, marginBottom: 22, padding: 3, minWidth: 204 }, tab: { flex: 1, alignItems: 'center', minHeight: 30, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 18 }, tabSelected: { backgroundColor: 'white', borderWidth: 1, borderColor: '#DDECEF' }, tabText: { fontSize: 11, color: '#8CA1B7' }, tabTextSelected: { color: colors.tealDark, fontWeight: '600' },
  alertRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#EDF2F6', minHeight: 66, gap: 8, paddingVertical: 9 }, alertInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }, alertName: { color: colors.navy, fontWeight: '600', fontSize: 13, lineHeight: 18 }, alertRepeat: { color: '#8198B0', fontSize: 11, lineHeight: 17, marginTop: 2 }, alertTime: { color: colors.navy, fontSize: 12, fontWeight: '600' },
  textRow: { borderBottomWidth: 1, borderColor: '#E7EEF3', paddingTop: 13, paddingBottom: 7 }, freeInput: { minHeight: 40, color: colors.navy, fontSize: 13, lineHeight: 20, paddingHorizontal: 0, paddingVertical: 8 },
  form: { paddingTop: 22 }, fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderColor: '#E7EEF3', paddingVertical: 13, minHeight: 68 }, label: { color: '#8198B0', fontSize: 11, lineHeight: 17, marginBottom: 3 }, fieldValue: { color: colors.navy, fontSize: 13, lineHeight: 20, fontWeight: '500' }, timeRow: { borderBottomWidth: 1, borderColor: '#E7EEF3', paddingTop: 13, paddingBottom: 8 }, timeInput: { minHeight: 34, color: colors.navy, fontSize: 14, lineHeight: 20, padding: 0, paddingBottom: 5 },
  save: { backgroundColor: colors.navy, paddingHorizontal: 22, paddingVertical: 10, minHeight: 38, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, saveText: { color: 'white', fontWeight: '600', fontSize: 12, lineHeight: 18 }, delete: { alignSelf: 'center', marginTop: 12, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }, deleteText: { fontSize: 11, color: colors.danger },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18, marginTop: 16 },
});
