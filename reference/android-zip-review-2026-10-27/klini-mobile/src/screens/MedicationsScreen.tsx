import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import MedicationCapsuleIcon from '../components/MedicationCapsuleIcon';
import ArchivePopup from '../components/ArchivePopup';
import MedicationRegistrationForm from '../components/MedicationRegistrationForm';
import MedicationTreatmentForm from '../components/MedicationTreatmentForm';
import type { MedicationEntryDraft } from '../components/MedicationEntryFields';
import MedicationCalendar from '../components/MedicationCalendar';
import { colors, confirmAction, Icon } from '../components/ui';
import { dateLabel, todayISO } from '../domain/dates';
import { emptyMedicationCare, SOFIA_MEDICATION_REMINDER_DEMO, type MedicationAlert, type MedicationTake, type MedicationTreatment } from '../domain/medicationCare';
import type { Medication } from '../domain/types';
import { useAppStore } from '../state/store';
import { requestMedicationNotificationPermission, syncMedicationAlerts } from '../services/medicationNotifications';
import { isMedicationAlertEligible } from '../services/medicationNotificationPlan';

type Tab = 'takes' | 'treatments';
type Page = 'main' | 'take' | 'treatment' | 'treatment-detail' | 'medication';
type TakeDraft = Omit<MedicationTake, 'id'>;
type TreatmentDraft = Omit<MedicationTreatment, 'id'>;
const currentTime = () => { const now = new Date(); return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`; };
const newTreatment = (): TreatmentDraft => ({ name: '', medicationIds: [], startDate: todayISO(), active: true });
const newMedication = (): Omit<Medication, 'id'> => ({ name: '', dose: '', frequency: '', startDate: todayISO(), active: true });

type MedicationsScreenProps = { onClose: () => void; initialTab?: Tab; lastSavedAt?: number };
export default function MedicationsScreen(props: MedicationsScreenProps) {
  const { state } = useAppStore();
  return <MedicationContent key={state.profile.id} {...props} />;
}

function MedicationContent({ onClose, initialTab = 'takes', lastSavedAt = 0 }: MedicationsScreenProps) {
  const { state, storageError, saveMedicationTreatment, saveMedicationTreatmentWithMedication, saveMedicationTake, deleteMedicationTake, addMedicationPersisted, updateMedicationPersisted, deleteMedicationPersisted, setMedicationTreatmentAlertsEnabled, saveMedicationAlert } = useAppStore();
  const care = state.medicationCare ?? emptyMedicationCare();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [page, setPage] = useState<Page>('main');
  const [day, setDay] = useState(todayISO);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [takeDraft, setTakeDraft] = useState<TakeDraft>({ medicationId: '', date: todayISO(), time: currentTime(), dose: '', status: 'taken' });
  const [takeId, setTakeId] = useState<string>();
  const [treatmentDraft, setTreatmentDraft] = useState<TreatmentDraft>(newTreatment);
  const [treatmentMedication, setTreatmentMedication] = useState<MedicationEntryDraft>({ name: '', dose: '', frequency: '' });
  const [treatmentId, setTreatmentId] = useState<string>();
  const [medicationDraft, setMedicationDraft] = useState(newMedication);
  const [medicationId, setMedicationId] = useState<string>();
  const [medicationReturn, setMedicationReturn] = useState<'main' | 'treatment'>('main');
  const [medicationPicker, setMedicationPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [linkingAlertId, setLinkingAlertId] = useState<string>();
  const [detailOptionsOpen, setDetailOptionsOpen] = useState(false);
  const working = useRef(false);
  const alive = useRef(true);
  const lastSaved = useRef(lastSavedAt);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const back = () => { if (!working.current) { Keyboard.dismiss(); setError(''); setMedicationPicker(false); setDetailOptionsOpen(false); setPage('main'); } };
  const close = () => { if (!working.current) { Keyboard.dismiss(); onClose(); } };
  const run = useCallback(async (operation: () => Promise<unknown>, completed: () => void) => {
    if (working.current) return;
    working.current = true; setBusy(true); setError('');
    try { await operation(); if (alive.current) { lastSaved.current = Date.now(); completed(); } }
    catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : 'No se pudo guardar. Intenta de nuevo.'); }
    finally { working.current = false; if (alive.current) setBusy(false); }
  }, []);
  const recentSave = () => Date.now() - lastSaved.current < 450;
  const startTake = (take?: MedicationTake) => {
    if (!take && recentSave()) return;
    setError(''); setTakeId(take?.id); setMedicationPicker(false);
    const medicine = state.medications[0];
    setTakeDraft(take ? { ...take } : { medicationId: medicine?.id ?? '', dose: medicine?.dose ?? '', date: day, time: currentTime(), status: 'taken' });
    setPage('take');
  };
  const startTreatment = (treatment?: MedicationTreatment) => {
    if (!treatment && recentSave()) return;
    setTreatmentMedication({ name: '', dose: '', frequency: '' });
    setError(''); setTreatmentId(treatment?.id); setTreatmentDraft(treatment ? { ...treatment, medicationIds: [...treatment.medicationIds] } : newTreatment()); setPage('treatment');
  };
  const startMedication = (medication?: Medication, from: 'main' | 'treatment' = 'main') => {
    setError(''); setMedicationReturn(from); setMedicationId(medication?.id); setMedicationDraft(medication ? { ...medication } : newMedication()); setPage('medication');
  };
  const selectedTreatment = care.treatments.find(item => item.id === treatmentId);
  const treatmentActive = (item: MedicationTreatment) => item.active && (!item.endDate || item.endDate >= todayISO());
  const treatmentStatus = (item: MedicationTreatment) => !treatmentActive(item) ? 'Finalizado' : item.startDate > todayISO() ? 'Programado' : 'Vigente';
  const treatmentAlerts = (item: MedicationTreatment) => care.alerts.filter(alert => alert.treatmentId === item.id || (!alert.treatmentId && !!alert.medicationId && item.medicationIds.includes(alert.medicationId)));
  const alertActive = (item: MedicationTreatment) => treatmentActive(item) && treatmentAlerts(item).some(alert => alert.enabled && isMedicationAlertEligible(state, alert));
  const alertRoute = (id: string, activate = false, medicationId?: string) => { Keyboard.dismiss(); router.push({ pathname: '/[section]', params: { section: 'alerts', treatmentId: id, ...(medicationId && { medicationId }), ...(activate && { activateAlert: 'true' }) } }); };
  const toggleAlerts = (item: MedicationTreatment, enabled: boolean) => {
    if (working.current) return;
    if (!treatmentAlerts(item).length) { if (enabled) alertRoute(item.id, true); return; }
    setNotice('');
    void run(async () => {
      const permitted = enabled ? await requestMedicationNotificationPermission() : true;
      if (!alive.current) return;
      await setMedicationTreatmentAlertsEnabled(item.id, enabled);
      if (alive.current && enabled && !permitted) setNotice('Alertas activas dentro de Klini. Para recibir avisos con la app cerrada, permite las notificaciones en un dispositivo compatible.');
    }, () => undefined);
  };
  const linkAlert = (alert: MedicationAlert, medication: Medication, treatment: MedicationTreatment) => {
    setNotice('');
    void run(async () => {
      const permitted = await requestMedicationNotificationPermission();
      if (!alive.current) return;
      await saveMedicationAlert({ ...alert, medicationId: medication.id, medicationName: medication.name, treatmentId: treatment.id, enabled: true }, alert.id);
      if (alive.current && !permitted) setNotice('Alerta vinculada y activa dentro de Klini. Para recibir avisos con la app cerrada, permite las notificaciones en un dispositivo compatible.');
    }, () => setLinkingAlertId(undefined));
  };
  const errorView = (error || storageError) && <Text accessibilityRole="alert" testID="medications-error" style={s.error}>{error || storageError}</Text>;

  if (page === 'medication') return <MedicationRegistrationForm draft={medicationDraft} onChange={setMedicationDraft} editing={!!medicationId} busy={busy} error={error || storageError || undefined} onClose={close} onDelete={medicationId ? () => confirmAction('Eliminar medicamento', 'También se eliminarán sus tomas y alertas asociadas.', () => void run(() => deleteMedicationPersisted(medicationId), () => setPage('main'))) : undefined} onBack={() => { if (!working.current) { setError(''); setPage(medicationReturn); } }} onSave={() => {
    if (!medicationDraft.name.trim() || !medicationDraft.dose.trim() || !medicationDraft.frequency.trim()) { setError('Completa el medicamento, la dosis y la frecuencia de tu receta.'); return; }
    const input = { ...medicationDraft, name: medicationDraft.name.trim(), dose: medicationDraft.dose.trim(), frequency: medicationDraft.frequency.trim(), endDate: medicationDraft.endDate || undefined };
    void run(async () => {
      const id = medicationId ? (await updateMedicationPersisted(medicationId, input), medicationId) : await addMedicationPersisted(input);
      if (alive.current && medicationReturn === 'treatment' && !medicationId) setTreatmentDraft(current => ({ ...current, medicationIds: [...current.medicationIds, id] }));
    }, () => { setTab('treatments'); setPage(medicationReturn); });
  }} />;

  if (page === 'treatment') return <MedicationTreatmentForm medications={state.medications} draft={treatmentDraft} onChange={setTreatmentDraft} medicationDraft={treatmentMedication} onMedicationChange={setTreatmentMedication} onSave={() => {
    const input = { ...treatmentDraft, name: treatmentDraft.name.trim(), endDate: treatmentDraft.endDate || undefined };
    const medication = { ...newMedication(), name: treatmentMedication.name.trim(), dose: treatmentMedication.dose.trim(), frequency: treatmentMedication.frequency.trim(), startDate: input.startDate, endDate: input.endDate, active: input.active };
    const addingMedication = !!(medication.name || medication.dose || medication.frequency);
    if (addingMedication && (!medication.name || !medication.dose || !medication.frequency)) { setError('Completa el medicamento, la dosis y la frecuencia de tu receta.'); return; }
    void run(() => addingMedication ? saveMedicationTreatmentWithMedication(input, medication, treatmentId) : saveMedicationTreatment(input, treatmentId), () => { setTab('treatments'); setPage('main'); });
  }} onBack={back} onClose={close} busy={busy} error={error || storageError || undefined} editing={!!treatmentId} />;

  if (page === 'treatment-detail' && selectedTreatment) {
    const demonstration = selectedTreatment.id === SOFIA_MEDICATION_REMINDER_DEMO.treatmentId;
    const treatmentName = demonstration ? selectedTreatment.name.replace(/ · Demostración$/, '') : selectedTreatment.name;
    const medications = state.medications.filter(medication => selectedTreatment.medicationIds.includes(medication.id));
    const status = treatmentStatus(selectedTreatment);
    return <ArchivePopup dismissible={!busy} title={demonstration ? 'Demostración' : 'Tratamiento'} titleTestID="treatment-detail-title" onClose={close} onBack={back}>
    <View testID="treatment-detail" style={s.detail}>
      <View style={s.detailSummary}>
        <Text testID="treatment-detail-name" style={s.detailTreatmentName}>{treatmentName}</Text>
        <View style={s.detailStatus}><Text testID="treatment-detail-status" style={s.detailStatusText}>{status}</Text><View style={[s.statusDot, status !== 'Vigente' && s.statusDotMuted]} /></View>
      </View>
      <View style={s.detailMedications}>{medications.map((medication, index) => <Pressable key={medication.id} accessibilityRole="button" accessibilityLabel={`Editar ${medication.name}`} accessibilityState={{ disabled: busy }} disabled={busy} testID={`treatment-detail-medication-${medication.id}`} style={[s.detailMedication, index < medications.length - 1 && s.detailMedicationDivider]} onPress={() => startMedication(medication)}>
        <View style={s.grow}><Text style={s.detailMedicationName}>{medication.name}</Text><Text style={s.detailMedicationDose}>{medication.dose} · {medication.frequency}</Text></View><Icon name="chevronRight" color="#94A7BA" size={21} />
      </Pressable>)}</View>
      <View testID="treatment-detail-controls" style={s.detailControls}>
        <Pressable testID="treatment-manage-alerts" accessibilityRole="button" accessibilityLabel="Configurar horarios del tratamiento" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => alertRoute(selectedTreatment.id, true)} style={[s.detailControlRow, s.detailControlDivider]}><Icon name="clock" color={colors.navy} size={23} /><Text style={s.detailControlLabel}>Horarios</Text><Icon name="chevronRight" color="#94A7BA" size={20} /></Pressable>
        <View style={s.detailControlRow}><Icon name="notifications" color={colors.navy} size={23} /><Text style={s.detailControlLabel}>Alertas</Text><Switch testID="treatment-alerts-toggle" accessibilityLabel="Activar alertas del tratamiento" disabled={busy || !treatmentActive(selectedTreatment)} value={alertActive(selectedTreatment)} onValueChange={enabled => toggleAlerts(selectedTreatment, enabled)} trackColor={{ false: '#D3DAE1', true: colors.teal }} thumbColor="white" /></View>
      </View>
      <Pressable testID="treatment-detail-more-options" accessibilityRole="button" accessibilityLabel="Más opciones del tratamiento" accessibilityState={{ expanded: detailOptionsOpen, disabled: busy }} disabled={busy} style={s.detailMore} onPress={() => { if (!working.current) setDetailOptionsOpen(open => !open); }}><Icon name="ellipsis-horizontal" size={23} color={colors.tealDark} /><Text style={s.detailMoreLabel}>Más opciones</Text></Pressable>
      {detailOptionsOpen && <View testID="treatment-detail-options">
      {alertActive(selectedTreatment) && <Pressable testID="treatment-notification-permission" accessibilityRole="button" disabled={busy} style={s.link} onPress={() => void run(async () => {
        const permitted = await requestMedicationNotificationPermission();
        if (!alive.current) return;
        const result = await syncMedicationAlerts(state);
        if (alive.current) setNotice(permitted && !result.unavailable && !result.error ? 'Avisos del sistema habilitados.' : 'Alertas activas dentro de Klini. Los avisos con la app cerrada requieren permiso en un dispositivo compatible.');
      }, () => undefined)}><Text style={s.linkText}>Permitir avisos del sistema</Text></Pressable>}
      {care.alerts.some(item => !item.medicationId) && <View testID="treatment-unlinked-alerts">
        <Text style={s.section}>Vincular una alerta guardada</Text>
        {care.alerts.filter(item => !item.medicationId).map(alert => <View key={alert.id}>
          <Pressable testID={`treatment-link-alert-${alert.id}`} disabled={busy || !treatmentActive(selectedTreatment)} style={s.row} onPress={() => setLinkingAlertId(linkingAlertId === alert.id ? undefined : alert.id)}><Icon name="notifications" size={20} color={colors.teal} /><View style={s.grow}><Text style={s.rowTitle}>{alert.medicationName}</Text><Text style={s.small}>{alert.time} · {alert.concentration || 'Sin concentración registrada'}</Text></View><Icon name="chevronDown" size={17} color="#94A7BA" /></Pressable>
          {linkingAlertId === alert.id && <View style={s.options}><Text style={s.small}>Selecciona el medicamento para vincular y activar la alerta.</Text>{state.medications.filter(item => selectedTreatment.medicationIds.includes(item.id)).map(item => <Pressable key={item.id} testID={`treatment-link-alert-${alert.id}-to-${item.id}`} disabled={busy || !item.active || !!(item.endDate && item.endDate < todayISO())} style={s.choice} onPress={() => linkAlert(alert, item, selectedTreatment)}><Text style={s.value}>{item.name} · {item.dose}</Text></Pressable>)}</View>}
        </View>)}
      </View>}
      <Pressable testID="treatment-edit" accessibilityRole="button" disabled={busy} onPress={() => startTreatment(selectedTreatment)} style={s.link}><Text style={s.linkText}>Editar tratamiento</Text></Pressable>
      <Pressable testID="treatment-toggle-active" accessibilityRole="button" disabled={busy} onPress={() => { if (!treatmentActive(selectedTreatment)) { startTreatment(selectedTreatment); setTreatmentDraft(current => ({ ...current, active: true })); } else void run(() => saveMedicationTreatment({ ...selectedTreatment, active: false }, selectedTreatment.id), () => setPage('main')); }} style={s.link}><Text style={s.linkText}>{treatmentActive(selectedTreatment) ? 'Finalizar tratamiento' : 'Revisar fechas y reactivar'}</Text></Pressable>
      </View>}
      {errorView}
      {!!notice && <Text style={s.small}>{notice}</Text>}
    </View>
  </ArchivePopup>;
  }

  if (page === 'take') {
    const selectedMedication = state.medications.find(item => item.id === takeDraft.medicationId);
    const treatments = care.treatments.filter(item => item.medicationIds.includes(takeDraft.medicationId));
    return <ArchivePopup dismissible={!busy} title={takeId ? 'Revisar toma' : 'Registrar toma'} onBack={back} onClose={close} avoidKeyboard footer={<Action testID="medication-take-save" title={busy ? 'Guardando…' : 'Guardar toma'} disabled={busy} onPress={() => void run(() => saveMedicationTake({ ...takeDraft, dose: takeDraft.dose.trim() }, takeId), () => { setDay(takeDraft.date); setTab('takes'); setPage('main'); })} />}>
      <View testID="medication-take-form" style={s.form}>
        <Text style={s.label}>Medicamento</Text>
        <Pressable testID="medication-take-select" disabled={busy} style={s.fieldRow} onPress={() => { Keyboard.dismiss(); setMedicationPicker(open => !open); }} accessibilityRole="button" accessibilityState={{ expanded: medicationPicker }}><Text style={s.value}>{selectedMedication?.name ?? 'Seleccionar'}</Text><Icon name="chevronDown" size={17} color="#8BA0B4" /></Pressable>
        {medicationPicker && <View testID="medication-take-options" style={s.options}>{state.medications.map(medication => <Pressable key={medication.id} testID={`medication-take-option-${medication.id}`} disabled={busy} style={s.choice} onPress={() => { setTakeDraft(current => ({ ...current, medicationId: medication.id, dose: medication.dose, treatmentId: current.treatmentId && care.treatments.some(item => item.id === current.treatmentId && item.medicationIds.includes(medication.id)) ? current.treatmentId : undefined })); setMedicationPicker(false); }}><Text style={s.value}>{medication.name}</Text></Pressable>)}</View>}
        {!state.medications.length && <Pressable testID="take-add-medication" style={s.link} onPress={() => startMedication()}><Text style={s.linkText}>Agregar medicamento</Text></Pressable>}
        <Text style={s.label}>Dosis registrada</Text><TextInput testID="medication-take-dose" accessibilityLabel="Dosis registrada según tu receta" value={takeDraft.dose} onChangeText={dose => setTakeDraft(current => ({ ...current, dose }))} placeholder="Cantidad y unidad" placeholderTextColor="#9AABBD" maxLength={120} style={s.input} editable={!busy} />
        <View style={s.twoColumns}><View style={s.grow}><Text style={s.label}>Fecha</Text><TextInput testID="medication-take-date" accessibilityLabel="Fecha de la toma, AAAA-MM-DD" value={takeDraft.date} onChangeText={date => setTakeDraft(current => ({ ...current, date }))} maxLength={10} style={s.input} editable={!busy} /></View><View style={s.grow}><Text style={s.label}>Hora</Text><TextInput testID="medication-take-time" accessibilityLabel="Hora de la toma, HH:MM" value={takeDraft.time} onChangeText={time => setTakeDraft(current => ({ ...current, time }))} maxLength={5} style={s.input} editable={!busy} /></View></View>
        {treatments.length > 0 && <><Text style={s.label}>Tratamiento</Text><View style={s.wrap}>{[{ id: undefined, name: 'Sin tratamiento' }, ...treatments].map(treatment => <Pressable key={treatment.id ?? 'none'} testID={`medication-take-treatment-${treatment.id ?? 'none'}`} disabled={busy} onPress={() => setTakeDraft(current => ({ ...current, treatmentId: treatment.id }))} style={[s.statusChoice, takeDraft.treatmentId === treatment.id && s.statusSelected]}><Text style={s.small}>{treatment.name}</Text></Pressable>)}</View></>}
        <Text style={s.label}>Estado</Text><View style={s.twoColumns}>{(['taken', 'skipped'] as const).map(status => <Pressable key={status} testID={`medication-take-status-${status}`} accessibilityRole="radio" accessibilityState={{ checked: takeDraft.status === status, disabled: busy }} aria-checked={takeDraft.status === status} disabled={busy} onPress={() => setTakeDraft(current => ({ ...current, status }))} style={[s.statusChoice, takeDraft.status === status && s.statusSelected]}><Text style={s.value}>{status === 'taken' ? 'Tomada' : 'Descartada'}</Text></Pressable>)}</View>
        {takeId && <Pressable testID="medication-take-delete" style={s.link} disabled={busy} onPress={() => confirmAction('Eliminar toma', 'Se eliminará este registro de toma.', () => void run(() => deleteMedicationTake(takeId), () => setPage('main')))}><Text style={[s.linkText, { color: colors.danger }]}>Eliminar registro</Text></Pressable>}
        {errorView}
      </View>
    </ArchivePopup>;
  }

  const takes = care.takes.filter(take => take.date === day).sort((a, b) => b.time.localeCompare(a.time));
  return <ArchivePopup title="Medicamentos" titleAlign="center" onClose={close} onBack={close} overlay={calendarOpen ? <MedicationCalendar value={day} onChange={value => { setDay(value); setCalendarOpen(false); }} onClose={() => setCalendarOpen(false)} /> : undefined} footer={<Action testID={tab === 'takes' ? 'medication-register-take' : 'medication-new-treatment'} title={tab === 'takes' ? 'Registrar toma' : 'Nuevo tratamiento'} icon="plus" solid={tab === 'treatments'} onPress={() => tab === 'takes' ? startTake() : startTreatment()} />}>
    <View testID="medications-screen">
      <View style={s.tabs} accessibilityRole="tablist">{([['takes', 'Toma'], ['treatments', 'Tratamiento']] as const).map(([value, label]) => <Pressable key={value} testID={`medication-tab-${value}`} accessibilityRole="tab" accessibilityState={{ selected: tab === value }} aria-selected={tab === value} onPress={() => { setError(''); setTab(value); }} style={[s.tab, tab === value && s.tabSelected]}><Text style={[s.tabText, tab === value && s.tabTextSelected]}>{label}</Text></Pressable>)}</View>
      {tab === 'takes' ? <View testID="medication-takes-list">
        <View style={s.dayRow}><Text style={s.dayTitle}>{day === todayISO() ? 'Hoy' : dateLabel(day)}</Text><Pressable testID="medication-calendar-open" accessibilityRole="button" accessibilityLabel="Seleccionar fecha de las tomas" style={s.calendar} onPress={() => setCalendarOpen(true)}><Icon name="calendar" size={23} color={colors.teal} /></Pressable></View>
        <Text style={s.section}>Registradas</Text>
        {takes.map(take => {
          const medication = state.medications.find(item => item.id === take.medicationId);
          const treatment = care.treatments.find(item => item.id === take.treatmentId);
          return <Pressable key={take.id} testID={`medication-take-${take.id}`} accessibilityRole="button" onPress={() => startTake(take)} style={s.takeRow}>
            <Text style={s.time}>{take.time}</Text><MedicationCapsuleIcon size={24} color={colors.teal} /><View style={s.grow}><Text style={s.rowTitle}>{medication?.name}</Text><Text style={s.small}>{take.dose}{treatment ? ` · ${treatment.name}` : ''}</Text></View><View style={s.takeStatus}>{take.status === 'taken' && <Icon name="checkCircle" size={14} color={colors.teal} />}<Text style={[s.small, take.status === 'taken' && { color: colors.tealDark }]}>{take.status === 'taken' ? 'Tomada' : 'Descartada'}</Text></View><Icon name="chevronRight" size={17} color="#A0B0C2" />
          </Pressable>;
        })}
        {!takes.length && <Text testID="medication-takes-empty" style={s.empty}>Aún no hay tomas registradas para esta fecha.</Text>}
      </View> : <View testID="medication-treatments-list">
        <Text style={[s.section, { marginTop: 16 }]}>Tus tratamientos</Text>
        {[...care.treatments].sort((a, b) => Number(treatmentActive(b)) - Number(treatmentActive(a))).map(treatment => <Pressable key={treatment.id} testID={`medication-treatment-${treatment.id}`} accessibilityRole="button" onPress={() => { setTreatmentId(treatment.id); setError(''); setDetailOptionsOpen(false); setLinkingAlertId(undefined); setPage('treatment-detail'); }} style={s.row}>
          <View style={s.medicationIcon}><MedicationCapsuleIcon size={25} color={treatmentActive(treatment) ? colors.teal : '#91A9BA'} /></View><View style={s.grow}><Text style={[s.rowTitle, !treatmentActive(treatment) && s.muted]}>{treatment.name}</Text><Text style={s.small}>{treatmentActive(treatment) ? `${treatment.medicationIds.length} ${treatment.medicationIds.length === 1 ? 'medicamento' : 'medicamentos'} · ${treatmentStatus(treatment)}` : 'Finalizado'}</Text>{treatmentActive(treatment) && <View style={s.alertLine}><Icon name="notifications" size={12} color={alertActive(treatment) ? colors.teal : '#A6B6C5'} /><Text style={[s.alertLabel, alertActive(treatment) && { color: colors.tealDark }]}>{alertActive(treatment) ? 'Alertas activas' : 'Alertas desactivadas'}</Text></View>}</View><Icon name="chevronRight" size={20} color="#A0B0C2" />
        </Pressable>)}
      </View>}
      {errorView}
    </View>
  </ArchivePopup>;
}

function Action({ title, testID, onPress, disabled, icon, solid }: { title: string; testID: string; onPress: () => void; disabled?: boolean; icon?: string; solid?: boolean }) {
  return <Pressable testID={testID} accessibilityRole="button" accessibilityState={{ disabled }} onPress={onPress} disabled={disabled} style={[s.action, solid && { backgroundColor: colors.teal }, disabled && { opacity: .5 }]}>{icon && <Icon name={icon} size={17} color={solid ? 'white' : colors.teal} />}<Text style={[s.actionText, solid && { color: 'white' }]}>{title}</Text></Pressable>;
}

const s = StyleSheet.create({
  tabs: { flexDirection: 'row', alignSelf: 'center', backgroundColor: '#EDF3F8', borderRadius: 22, marginTop: 10, marginBottom: 10, padding: 2, width: 190, maxWidth: '100%' },
  tab: { flex: 1, minHeight: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 20 }, tabSelected: { backgroundColor: 'white', borderWidth: 1, borderColor: '#D9EFEE' }, tabText: { color: '#8B9EB6', fontSize: 10, lineHeight: 15 }, tabTextSelected: { color: colors.tealDark, fontWeight: '600' },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }, dayTitle: { color: colors.navy, fontSize: 20, lineHeight: 28, fontWeight: '700', textTransform: 'capitalize' }, calendar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  section: { color: '#8298B2', fontSize: 12, fontWeight: '600', lineHeight: 18, marginBottom: 4 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 75, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#EDF2F6' }, takeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 66, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EDF2F6' }, time: { fontSize: 12, color: '#8A9EB5', width: 36 },
  grow: { flex: 1, minWidth: 0 }, rowTitle: { color: colors.navy, fontSize: 13, lineHeight: 18, fontWeight: '600' }, small: { color: '#8C9EB5', fontSize: 10, lineHeight: 16 }, takeStatus: { flexDirection: 'row', alignItems: 'center', gap: 3, maxWidth: '29%' }, medicationIcon: { width: 42, height: 42, borderRadius: 10, backgroundColor: '#E4F6F5', alignItems: 'center', justifyContent: 'center' }, alertLine: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }, alertLabel: { fontSize: 9, lineHeight: 15, color: '#8C9EB5' }, muted: { color: '#91A3B8' }, empty: { color: '#8C9EB5', fontSize: 12, lineHeight: 20, paddingVertical: 28 },
  action: { alignSelf: 'center', minHeight: 42, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#E1F6F3' }, actionText: { color: colors.tealDark, fontSize: 11, lineHeight: 16, fontWeight: '600' },
  detail: { paddingTop: 17 },
  detailSummary: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#E7EFF2' },
  detailTreatmentName: { flex: 1, minWidth: 0, color: colors.navy, fontSize: 13, lineHeight: 20, fontWeight: '500' },
  detailStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 }, detailStatusText: { color: colors.navy, fontSize: 12, lineHeight: 18 }, statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.tealDark }, statusDotMuted: { backgroundColor: '#A1AFBB' },
  detailMedications: { paddingTop: 5, paddingBottom: 18 }, detailMedication: { minHeight: 87, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }, detailMedicationDivider: { borderBottomWidth: 1, borderBottomColor: '#EDF2F6' },
  detailMedicationName: { color: colors.navy, fontSize: 28, lineHeight: 35, fontWeight: '700', letterSpacing: -.5 }, detailMedicationDose: { color: '#718397', fontSize: 15, lineHeight: 23, marginTop: 3 },
  detailControls: { borderRadius: 13, backgroundColor: '#F0F7F7', paddingHorizontal: 15 }, detailControlRow: { minHeight: 57, flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 9 }, detailControlLabel: { flex: 1, minWidth: 0, color: colors.navy, fontSize: 14, lineHeight: 21 }, detailControlDivider: { borderBottomWidth: 1, borderBottomColor: '#E1EEEE' },
  detailMore: { alignSelf: 'center', minWidth: 100, minHeight: 72, paddingTop: 22, paddingBottom: 12, alignItems: 'center', justifyContent: 'center', gap: 1 }, detailMoreLabel: { color: colors.tealDark, fontSize: 11, lineHeight: 18 },
  form: { paddingTop: 22 }, label: { color: '#8399AF', fontSize: 11, lineHeight: 17, marginTop: 16, marginBottom: 5 }, fieldRow: { flexDirection: 'row', gap: 10, alignItems: 'center', minHeight: 44, borderBottomWidth: 1, borderColor: '#E7EEF2' }, value: { flex: 1, color: colors.navy, fontSize: 13, lineHeight: 19 }, input: { borderWidth: 1, borderColor: '#E1E9EF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, fontSize: 13, color: colors.navy }, twoColumns: { flexDirection: 'row', gap: 12 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, options: { borderWidth: 1, borderColor: '#E1E9EF', borderRadius: 10, marginTop: 6 }, choice: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#EDF2F6' }, statusChoice: { flex: 1, minWidth: 100, minHeight: 44, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E5ECF0', alignItems: 'center', justifyContent: 'center' }, statusSelected: { borderColor: '#A5DEDA', backgroundColor: '#E9F8F6' }, link: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingVertical: 10, marginTop: 10 }, linkText: { color: colors.tealDark, fontSize: 12, lineHeight: 18 }, error: { color: colors.danger, fontSize: 12, lineHeight: 19, marginTop: 16 },
});
