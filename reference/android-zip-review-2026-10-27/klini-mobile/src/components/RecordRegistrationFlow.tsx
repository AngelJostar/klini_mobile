import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Attachment, ClinicalRecord } from '../domain/types';
import type { Transcription } from '../domain/transcription';
import { todayISO } from '../domain/dates';
import { openAttachment, pickAttachment } from '../services/files';
import RecordEntrySheet, { type RecordEntryMode } from './RecordTypePopup';
import RecordPhotoPopup from './RecordPhotoPopup';
import RecordTextPopup from './RecordTextPopup';
import RecordCategoryPopup, { recordCategoryLabel, type RecordCategoryValue } from './RecordCategoryPopup';
import RecordFlowSteps, { type RecordFlowStep } from './RecordFlowSteps';
import RecordReviewSheet from './RecordReviewSheet';
import { colors, Icon, notify } from './ui';

type Draft = Omit<ClinicalRecord, 'id'>;
const emptyDraft = (): Draft => ({ type: 'Nota', title: '', date: todayISO(), doctorName: '', description: '' });
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return year >= 1900 && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export default function RecordRegistrationFlow({ onClose, onBack, onSave, storageError = '' }: {
  onClose: () => void;
  onBack: () => void;
  onSave: (draft: Draft) => void | Promise<void>;
  storageError?: string;
}) {
  const [step, setStep] = useState<RecordFlowStep>(1);
  const [mode, setMode] = useState<RecordEntryMode | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [category, setCategory] = useState<RecordCategoryValue | null>(null);
  const [hasTranscription, setHasTranscription] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const alive = useRef(true);
  const request = useRef(0);
  const saving = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const close = () => { if (saving.current) return; request.current++; Keyboard.dismiss(); onClose(); };
  const previousType = () => { request.current++; setBusy(false); setError(''); Keyboard.dismiss(); setStep(1); };

  useEffect(() => {
    if (step !== 2 || mode !== 'file') return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => { request.current++; setBusy(false); setError(''); setStep(1); return true; });
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopImmediatePropagation(); request.current++; setBusy(false); setError(''); setStep(1);
    };
    if (Platform.OS === 'web') window.addEventListener('keydown', escape, true);
    return () => { back.remove(); if (Platform.OS === 'web') window.removeEventListener('keydown', escape, true); };
  }, [step, mode]);

  async function captureFile() {
    const ticket = ++request.current;
    setBusy(true); setError('');
    try {
      const attachment = await pickAttachment('file');
      if (!alive.current || ticket !== request.current || !attachment) return;
      setDraft({ ...emptyDraft(), attachment, title: attachment.name.replace(/\.[^.]+$/, '').slice(0, 120) || 'Archivo adjunto' });
      setCategory(null); setHasTranscription(false);
    } catch (cause) {
      if (alive.current && ticket === request.current) setError(cause instanceof Error ? cause.message : 'No se pudo adjuntar el archivo. Intenta de nuevo.');
    } finally { if (alive.current && ticket === request.current) setBusy(false); }
  }
  function chooseMode(next: RecordEntryMode) {
    request.current++; setError(''); setBusy(false);
    if (next !== mode) { setDraft(emptyDraft()); setCategory(null); setHasTranscription(false); }
    setMode(next); setStep(2);
    if (next === 'file' && (next !== mode || !draft.attachment)) void captureFile();
  }
  function captured(attachment: Attachment, transcription?: Transcription) {
    const sameOriginal = attachment.uri === draft.attachment?.uri;
    if (!sameOriginal) setCategory(null);
    setHasTranscription(current => !!transcription || (sameOriginal && current));
    setDraft(current => ({
      ...(sameOriginal ? current : emptyDraft()),
      attachment,
      title: sameOriginal ? current.title : mode === 'scan' ? 'Documento escaneado' : 'Foto adjunta',
      ...(transcription ? { description: transcription.text, doctorName: transcription.doctorName || '', institution: transcription.institution || '' } : {}),
    }));
    Keyboard.dismiss(); setStep(3);
  }
  function continueCategory() {
    if (category === null) return;
    setDraft(current => ({ ...current, type: category === 'Todos' ? 'Nota' : category }));
    setError(''); Keyboard.dismiss(); setStep(4);
  }
  async function save(value: Draft) {
    if (saving.current) return;
    if (!value.title.trim()) { setError('Escribe un título para el registro en Editar datos.'); return; }
    if (!validDate(value.date) || value.date > todayISO()) { setError('Usa una fecha real con formato AAAA-MM-DD, igual o anterior a hoy.'); return; }
    if (value.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)) { setError('Usa una hora válida con formato HH:MM.'); return; }
    if (category === null || !mode) { setStep(3); return; }
    if (mode !== 'text' && !value.attachment) { setError('Agrega el archivo original antes de guardar.'); return; }
    saving.current = true; setBusy(true); setError('');
    try {
      await onSave({ ...value, type: category === 'Todos' ? 'Nota' : category, title: value.title.trim(), doctorName: value.doctorName.trim(), description: value.description.trim() });
    } catch (cause) {
      if (alive.current) setError(cause instanceof Error ? cause.message : 'No se pudo guardar el registro. Intenta de nuevo.');
    } finally { saving.current = false; if (alive.current) setBusy(false); }
  }
  async function viewOriginal(value: Draft) {
    if (!value.attachment) return;
    try { await openAttachment(value.attachment); }
    catch (cause) { notify('No se pudo abrir el archivo', cause instanceof Error ? cause.message : 'Intenta de nuevo.'); }
  }

  if (step === 1) return <RecordEntrySheet onClose={close} onBack={() => { request.current++; onBack(); }} onSelect={chooseMode} error={error || storageError} />;
  if (step === 2 && (mode === 'photo' || mode === 'scan')) return <View style={s.screen}><RecordPhotoPopup title={mode === 'scan' ? 'Escaneo' : 'Foto'} showSteps initialAttachment={draft.attachment} onBack={previousType} onClose={close} enableTranscription={mode === 'scan'} onCapture={captured} /></View>;
  if (step === 2 && mode === 'text') return <View style={s.screen}><RecordTextPopup showSteps initialValue={draft.description} actionLabel="Continuar" onBack={previousType} onClose={close} onDraftChange={description => setDraft(current => ({ ...current, description }))} onSave={text => {
    setDraft(current => ({ ...current, title: current.title || text.split('\n')[0].slice(0, 120), description: text }));
    Keyboard.dismiss(); setStep(3);
  }} /></View>;
  if (step === 2) return <View style={s.overlay}>
    <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Cancelar registro" onPress={close} />
    <View testID="record-file-action" role="dialog" accessibilityLabel="Adjuntar archivo" accessibilityViewIsModal style={s.card}>
      <View style={s.header}><Pressable testID="record-file-back" accessibilityRole="button" accessibilityLabel="Volver al tipo de registro" onPress={previousType} style={s.headerButton}><Icon name="back" size={21} /></Pressable><Text style={s.title}>Archivo</Text><Pressable testID="record-file-close" accessibilityRole="button" accessibilityLabel="Cancelar registro" onPress={close} style={s.headerButton}><Icon name="close" size={20} /></Pressable></View>
      <RecordFlowSteps activeStep={2} />
      <View style={s.file}><Icon name="document" size={36} color={colors.teal} /><Text testID="record-file-name" style={s.filename}>{draft.attachment?.name ?? 'Selecciona un archivo'}</Text><Text style={s.note}>PDF, imagen o texto · Hasta 2 MB</Text></View>
      {!!(error || storageError) && <Text testID="record-entry-error" accessibilityRole="alert" style={s.error}>{error || storageError}</Text>}
      <View style={s.fileActions}>
        <Pressable testID="record-file-select" accessibilityRole="button" accessibilityLabel={draft.attachment ? 'Cambiar archivo' : 'Seleccionar archivo'} disabled={busy} onPress={() => void captureFile()} style={[s.secondary, busy && s.disabled]}><Text style={s.secondaryText}>{busy ? 'Abriendo selector…' : draft.attachment ? 'Cambiar archivo' : 'Seleccionar archivo'}</Text></Pressable>
        <Pressable testID="record-file-continue" accessibilityRole="button" accessibilityLabel="Continuar a seleccionar categoría" disabled={busy || !draft.attachment} hitSlop={{ top: 6, bottom: 6 }} onPress={() => { setError(''); setStep(3); }} style={[s.continue, (busy || !draft.attachment) && s.disabled]}><Text style={s.continueText}>Continuar</Text><Icon name="chevronRight" size={15} color={colors.tealDark} /></Pressable>
      </View>
    </View>
  </View>;
  if (step === 3) return <View style={s.screen}><RecordCategoryPopup value={category} onSelect={setCategory} onContinue={continueCategory} onBack={() => { setError(''); setStep(2); }} onClose={close} /></View>;
  return <RecordReviewSheet draft={draft} mode={mode!} categoryLabel={recordCategoryLabel(category)} onChange={setDraft} onBack={() => { setError(''); setStep(3); }} onClose={close} onSave={value => void save(value)} onOpenAttachment={viewOriginal} onChooseCategory={() => { setError(''); setStep(3); }} hasTranscription={hasTranscription} busy={busy} error={error || storageError} />;
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(8,36,65,.28)' },
  card: { width: '100%', maxWidth: 330, padding: 16, borderRadius: 20, backgroundColor: 'white', boxShadow: '0 12px 30px rgba(8,36,65,.15)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerButton: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: colors.navy, fontSize: 17, fontWeight: '600' },
  file: { minHeight: 132, padding: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#F0F8F8' },
  filename: { fontSize: 13, lineHeight: 19, color: colors.navy, textAlign: 'center' },
  note: { color: colors.muted, fontSize: 10, lineHeight: 16, textAlign: 'center' },
  fileActions: { minHeight: 44, marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  secondary: { minHeight: 44, flexShrink: 1, paddingHorizontal: 6, justifyContent: 'center' },
  secondaryText: { color: colors.tealDark, fontSize: 11, fontWeight: '500' },
  continue: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#DDF5F2' },
  continueText: { color: colors.tealDark, fontSize: 11, fontWeight: '600' },
  disabled: { opacity: .4 },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18, marginTop: 10 },
});
