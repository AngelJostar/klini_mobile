import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Button,
  Card,
  Chip,
  colors,
  confirmAction,
  Empty,
  Icon,
  notify,
  Row,
  SectionTitle,
  styles,
  TextField,
} from '../components/ui';
import { dateLabel, parseDate, todayISO } from '../domain/dates';
import type { ClinicalRecord, Medication } from '../domain/types';
import { openAttachment, pickAttachment } from '../services/files';
import { useAppStore } from '../state/store';
import Sheet from '../components/ArchivePopup';
import RecordTextPopup from '../components/RecordTextPopup';
import RecordPhotoReviewPopup from '../components/RecordPhotoReviewPopup';
import RecordPhotoPopup from '../components/RecordPhotoPopup';
import RecordSharePopup from '../components/RecordSharePopup';
import HistoryFiltersPopup from '../components/HistoryFiltersPopup';
import RecordTypePopup, { type RecordEntryMode } from '../components/RecordTypePopup';
import { emptyHistoryFilters, matchesHistoryFilters } from '../domain/historyFilters';

type RecordDraft = Omit<ClinicalRecord, 'id'>;
type MedicationDraft = Omit<Medication, 'id'>;
type Page = 'history' | 'list' | 'record' | 'recordCategory' | 'recordForm' | 'medicationForm';
const recordTypes: ClinicalRecord['type'][] = ['Consulta', 'Estudio', 'Receta', 'Vacuna', 'Nota', 'Procedimiento', 'Hospitalización', 'Alergia', 'Antecedente'];
const historyCategories: { label: string; type: ClinicalRecord['type'] | 'Todos'; icon: string }[] = [
  { label: 'Mi historial', type: 'Todos', icon: 'folder' },
  { label: 'Consultas', type: 'Consulta', icon: 'stethoscope' },
  { label: 'Recetas y\nmedicamentos', type: 'Estudio', icon: 'diagnostics' },
  { label: 'Análisis\nclínicos', type: 'Procedimiento', icon: 'plus' },
  { label: 'Procedimientos y\nhospitalizaciones', type: 'Hospitalización', icon: 'hospital' },
  { label: 'Vacunas', type: 'Vacuna', icon: 'vaccine' },
  { label: 'Alergias y\nAntecedentes', type: 'Alergia', icon: 'alert' },
  { label: 'Instituciones y\nHospitales', type: 'Antecedente', icon: 'heart' },
];
const recordIcons: Record<ClinicalRecord['type'], string> = {
  Consulta: 'doctor',
  Estudio: 'activity',
  Receta: 'document',
  Vacuna: 'shield',
  Nota: 'file',
  Procedimiento: 'plus',
  Hospitalización: 'hospital',
  Alergia: 'alert',
  Antecedente: 'heart',
};
const newRecord = (): RecordDraft => ({
  type: 'Consulta',
  title: '',
  date: todayISO(),
  doctorName: '',
  description: '',
});
const newMedication = (): MedicationDraft => ({
  name: '',
  dose: '',
  frequency: '',
  startDate: todayISO(),
  endDate: '',
  active: true,
});
function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const d = new Date(year, month - 1, day, 12);
  return (
    year >= 1900 && d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day
  );
}
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Intenta de nuevo.';
}

export default function ArchiveScreen({
  onClose,
  initialType,
  initialCreate = false,
  initialHistory = false,
  initialListTitle,

  initialTab = 'records',
}: {
  onClose: () => void;
  initialType?: ClinicalRecord['type'];
  initialCreate?: boolean;
  initialHistory?: boolean;
  initialListTitle?: string;
  initialTab?: 'records' | 'medications';
}) {
  const {
    state,
    storageError,
    addRecord,
    updateRecord,
    deleteRecord,
    addMedication,
    updateMedication,
    deleteMedication,
  } = useAppStore();
  const [tab, setTab] = useState<'records' | 'medications'>(initialTab);
  const [page, setPage] = useState<Page>(initialCreate ? 'recordCategory' : initialHistory && !initialListTitle ? 'history' : 'list');
  const [recordTypeOpen, setRecordTypeOpen] = useState(false);
  const categoryHintOpacity = useRef(new Animated.Value(0)).current;
  const categoryHintAnimation = useRef<Animated.CompositeAnimation | null>(null);
  useEffect(() => () => {
    categoryHintAnimation.current?.stop();
    categoryHintOpacity.setValue(0);
  }, [page, categoryHintOpacity]);
  function showCategoryHint() {
    categoryHintAnimation.current?.stop();
    AccessibilityInfo.announceForAccessibility('Selecciona una categoría para guardar el registro.');
    categoryHintAnimation.current = Animated.sequence([
      Animated.timing(categoryHintOpacity, { toValue: 1, duration: 900, useNativeDriver: true, isInteraction: false }),
      Animated.delay(2000),
      Animated.timing(categoryHintOpacity, { toValue: 0, duration: 900, useNativeDriver: true, isInteraction: false }),
    ]);
    categoryHintAnimation.current.start();
  }
  const [historyList, setHistoryList] = useState(!!initialListTitle);
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [historyFilters, setHistoryFilters] = useState(emptyHistoryFilters);
  const filtersActive = Object.values(historyFilters).some(Boolean);
  const [type, setType] = useState<ClinicalRecord['type'] | 'Todos'>(initialType ?? 'Todos');
  const [medicationFilter, setMedicationFilter] = useState<'Todos' | 'Vigentes' | 'Anteriores'>(
    'Vigentes',
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recordDraft, setRecordDraft] = useState<RecordDraft>(newRecord);
  const [medicationDraft, setMedicationDraft] = useState<MedicationDraft>(newMedication);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sharingRecord, setSharingRecord] = useState<ClinicalRecord | null>(null);
  const selectedRecord = state.records.find((record) => record.id === selectedId);
  const records = useMemo(() => {
    const text = query.trim().toLocaleLowerCase('es');
    return state.records
      .filter(
        (record) =>
          (type === 'Todos' || record.type === type) &&
          matchesHistoryFilters(record, historyFilters) &&
          (!text ||
            `${record.title} ${record.doctorName} ${record.description} ${record.date}`
              .toLocaleLowerCase('es')
              .includes(text)),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.records, query, type, historyFilters]);
  const medications = useMemo(
    () =>
      state.medications
        .filter(
          (item) =>
            medicationFilter === 'Todos' ||
            (medicationFilter === 'Vigentes' ? item.active : !item.active),
        )
        .sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [state.medications, medicationFilter],
  );
  const back = () => {
    setError('');
    setPage((initialHistory || initialCreate) && !historyList ? 'history' : 'list');
  };
  function startRecord(record?: ClinicalRecord) {
    if (!record) {
      setEditingId(null);
      setRecordDraft(newRecord());
      setError('');
      setPage('recordCategory');
      return;
    }
    setEditingId(record?.id ?? null);
    setRecordDraft(
      record
        ? {
            type: record.type,
            title: record.title,
            date: record.date,
            doctorName: record.doctorName,
            time: record.time,
            specialty: record.specialty,
            institution: record.institution,
            reason: record.reason,
            description: record.description,
            attachment: record.attachment,
          }
        : { ...newRecord(), type: type === 'Todos' ? 'Consulta' : type },
    );
    setError('');
    setPage('recordForm');
  }
  function startMedication(item?: Medication) {
    setEditingId(item?.id ?? null);
    setMedicationDraft(
      item
        ? {
            name: item.name,
            dose: item.dose,
            frequency: item.frequency,
            startDate: item.startDate,
            endDate: item.endDate || '',
            active: item.active,
          }
        : newMedication(),
    );
    setError('');
    setPage('medicationForm');
  }
  function chooseCategory(category: ClinicalRecord['type'] | 'Todos') {
    setRecordDraft(draft => ({ ...draft, type: category === 'Todos' ? 'Nota' : category }));
    setRecordTypeOpen(true);
  }
  const [textOpen, setTextOpen] = useState(false);
  const [photoMode, setPhotoMode] = useState<'photo' | 'scan'>('photo');
  const [photoReviewOpen, setPhotoReviewOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  function chooseRecordMode(mode: RecordEntryMode) {
    setRecordTypeOpen(false);
    if (mode === 'text') { setTextOpen(true); return; }
    if (mode === 'photo' || mode === 'scan') { setPhotoMode(mode); setPhotoOpen(true); return; }
    setPage('recordForm');
    void attach(mode);
  }
  async function attach(mode: 'file' | 'photo' = 'file') {
    setBusy(true);
    setError('');
    try {
      const attachment = await pickAttachment(mode);
      if (attachment) setRecordDraft((draft) => ({ ...draft, attachment }));
    } catch (e) {
      setError(`No se pudo adjuntar el archivo. ${errorMessage(e)}`);
    } finally {
      setBusy(false);
    }
  }
  async function openFile(record: Pick<ClinicalRecord, 'attachment'>) {
    if (!record.attachment) return;
    try {
      await openAttachment(record.attachment);
    } catch (e) {
      notify('No se pudo abrir el archivo', errorMessage(e));
    }
  }
  function saveRecord() {
    if (!recordDraft.title.trim()) return setError('Escribe un título para el registro.');
    if (recordDraft.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(recordDraft.time)) return setError('Usa una hora válida con formato HH:MM.');
    if (!isDate(recordDraft.date) || recordDraft.date > todayISO())
      return setError('Usa una fecha real con formato AAAA-MM-DD, igual o anterior a hoy.');
    const data = {
      ...recordDraft,
      title: recordDraft.title.trim(),
      doctorName: recordDraft.doctorName.trim(),
      description: recordDraft.description.trim(),
    };
    try {
      if (editingId) updateRecord(editingId, data);
      else addRecord(data);
      setError('');
      setPage((initialHistory || initialCreate) && !historyList ? 'history' : 'list');
      setTab('records');
    } catch (e) {
      setError(`No se pudo guardar el registro. ${errorMessage(e)}`);
    }
  }
  function removeRecord(record: ClinicalRecord) {
    confirmAction(
      'Eliminar registro',
      `Se eliminará “${record.title}” de este dispositivo. Esta acción no se puede deshacer.`,
      () => {
        try {
          deleteRecord(record.id);
          setSelectedId(null);
          setPage('list');
        } catch (e) {
          notify('No se pudo eliminar', errorMessage(e));
        }
      },
    );
  }
  function saveMedication() {
    if (!medicationDraft.name.trim()) return setError('Escribe el nombre del medicamento.');
    if (!medicationDraft.dose.trim())
      return setError('Escribe la dosis tal como aparece en tu receta.');
    if (!medicationDraft.frequency.trim())
      return setError('Escribe la frecuencia indicada en tu receta.');
    if (!isDate(medicationDraft.startDate))
      return setError('Usa una fecha de inicio real con formato AAAA-MM-DD.');
    if (
      medicationDraft.endDate &&
      (!isDate(medicationDraft.endDate) || medicationDraft.endDate < medicationDraft.startDate)
    )
      return setError('La fecha de fin debe ser real e igual o posterior al inicio.');
    const data = {
      ...medicationDraft,
      name: medicationDraft.name.trim(),
      dose: medicationDraft.dose.trim(),
      frequency: medicationDraft.frequency.trim(),
      endDate: medicationDraft.endDate || undefined,
    };
    try {
      if (editingId) updateMedication(editingId, data);
      else addMedication(data);
      setError('');
      setPage('list');
      setTab('medications');
      setMedicationFilter(data.active ? 'Vigentes' : 'Anteriores');
    } catch (e) {
      setError(`No se pudo guardar el medicamento. ${errorMessage(e)}`);
    }
  }
  function removeMedication(item: Medication) {
    confirmAction(
      'Eliminar medicamento',
      `Se eliminará el registro de “${item.name}”. Esto no modifica ninguna receta médica.`,
      () => {
        try {
          deleteMedication(item.id);
        } catch (e) {
          notify('No se pudo eliminar', errorMessage(e));
        }
      },
    );
  }
  const errorView = error ? (
    <Text accessibilityRole="alert" style={styles.error}>
      {error}
    </Text>
  ) : null;
  const filterButton = <Pressable testID="history-filter-button" accessibilityRole="button" accessibilityLabel={filtersActive ? 'Filtros del historial, filtros activos' : 'Filtros del historial'} accessibilityState={{ expanded: filtersOpen }} onPress={() => setFiltersOpen(open => !open)} hitSlop={5} style={local.filterButton}>
    <View style={[local.filterCircle, filtersActive && { backgroundColor: colors.teal }]}><Icon name="filters" size={17} color={filtersActive ? 'white' : colors.teal} /></View>
  </Pressable>;
  const clearFiltersButton = <View style={{ height: 22, alignItems: 'flex-end', justifyContent: 'center' }}>
    {filtersActive && <Pressable testID="history-clear-filters" accessibilityRole="button" accessibilityLabel="Borrar Filtros" onPress={() => setHistoryFilters(emptyHistoryFilters)} hitSlop={4} style={{ paddingVertical: 3, paddingHorizontal: 4 }}>
    <Text style={{ fontSize: 11, color: colors.teal }}>Borrar Filtros</Text>
    </Pressable>}
  </View>;
  const filterPanel = filtersOpen && <HistoryFiltersPopup
    value={historyFilters}
    specialties={[...new Set(state.records.map(record => record.specialty).filter((value): value is string => !!value))].sort()}
    institutions={[...new Set(state.records.map(record => record.institution).filter((value): value is string => !!value))].sort()}
    onClose={() => setFiltersOpen(false)}
    onApply={value => {
      setHistoryFilters(value);
      setFiltersOpen(false);
      if (page === 'history') {
        setType('Todos');
        setHistoryList(true);
        setPage('list');
      }
    }}
  />;
  if (page === 'history') return (
    <Sheet title="Historial" onClose={onClose} footerAlignment="right" footer={
      <Pressable testID="add-archive-item" accessibilityRole="button" accessibilityLabel="Agregar registro al historial" onPress={() => startRecord()} style={({ pressed }) => [local.historyAdd, { opacity: pressed ? .7 : 1 }]}>
        <LinearGradient colors={['#15C9CC', '#00ADB2', '#009DA5']} style={local.historyAddCircle}><Icon name="plus" size={32} color="white" /></LinearGradient>
      </Pressable>
    }>
      <View style={{ height: 12 }} />
      {storageError && <Text accessibilityRole="alert" style={styles.error}>{storageError}</Text>}
      <View style={local.historySearch}>
        <Icon name="search" size={18} color={colors.tealDark} />
        <TextInput testID="archive-search" accessibilityLabel="Buscar en mi historial" placeholder="Buscar en mi historial" placeholderTextColor="#617B90" value={query} onChangeText={setQuery} style={local.historySearchInput} />
        {filterButton}
      </View>
      {clearFiltersButton}
      {filterPanel}
      <View style={local.historyGrid} testID="history-categories">
        {historyCategories.map(category => <Pressable key={category.type} testID={`history-category-${category.type}`} accessibilityRole="button" accessibilityLabel={category.label.replace('\n', ' ')} onPress={() => { setType(category.type); setHistoryList(true); setPage('list'); }} style={({ pressed }) => [local.historyCategory, { opacity: pressed ? .65 : 1 }]}>
          <LinearGradient colors={['#F7FDFD', '#E0F3F2']} style={local.historyIcon}>
            <Icon name={category.icon} size={30} color={colors.teal} />
          </LinearGradient>
          <Text style={local.historyLabel}>{category.label}</Text>
        </Pressable>)}
      </View>
      {!!query.trim() && <View testID="history-search-results">
        <Text style={styles.small}>{records.length} resultados</Text>
        {records.map(record => <Row key={record.id} title={record.title} subtitle={`${record.type} · ${dateLabel(record.date)}`} icon={recordIcons[record.type]} onPress={() => { setSelectedId(record.id); setPage('record'); }} />)}
        {records.length === 0 && <Text style={[styles.small, { marginTop: 12 }]}>No hay registros que coincidan con tu búsqueda.</Text>}
      </View>}
    </Sheet>
  );
  if (page === 'recordCategory') return (
    <View style={{ flex: 1 }}>
    <View style={{ flex: 1 }} pointerEvents={recordTypeOpen || photoOpen || textOpen || photoReviewOpen ? 'none' : 'auto'} accessibilityElementsHidden={recordTypeOpen || photoOpen || textOpen || photoReviewOpen} importantForAccessibility={recordTypeOpen || photoOpen || textOpen || photoReviewOpen ? 'no-hide-descendants' : 'auto'}>
    <Sheet title="Registro" animateEntrance onClose={onClose} onBack={initialCreate ? onClose : back} footerAlignment="right" footer={
      <Pressable testID="record-category-continue" accessibilityRole="button" accessibilityLabel="Selecciona una categoría para agregar un registro" onPress={showCategoryHint} style={local.historyAdd}>
        <LinearGradient colors={['#15C9CC', '#00ADB2', '#009DA5']} style={local.historyAddCircle}><Icon name="plus" size={32} color="white" /></LinearGradient>
      </Pressable>
    }>
      <View style={{ height: 12 }} />
      <View style={{ height: 60, alignItems: 'center', justifyContent: 'center' }}><View style={{ justifyContent: 'center' }}><Text style={{ color: colors.navy, fontSize: 14, fontWeight: '600' }}>Selecciona la categoría</Text><Animated.View testID="record-category-hint" pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', right: -28, opacity: categoryHintOpacity }}><Icon name="information-circle-outline" size={21} color={colors.teal} /></Animated.View></View></View>
      <View style={local.historyGrid} testID="record-categories">
        {historyCategories.map(category => <Pressable key={category.type} testID={`record-category-${category.type}`} accessibilityRole="button" accessibilityLabel={category.label.replace('\n', ' ')} onPress={() => chooseCategory(category.type)} style={({ pressed }) => [local.historyCategory, { opacity: pressed ? .65 : 1 }]}>
          <LinearGradient colors={['#F7FDFD', '#E0F3F2']} style={local.historyIcon}><Icon name={category.icon} size={30} color={colors.teal} /></LinearGradient>
          <Text style={local.historyLabel}>{category.label}</Text>
        </Pressable>)}
      </View>
    </Sheet>
    </View>
    {textOpen && <RecordTextPopup onClose={() => setTextOpen(false)} onSave={text => {
      addRecord({ ...recordDraft, title: text.split('\n')[0].slice(0, 120), description: text });
      setTextOpen(false);
      setType(initialListTitle ? initialType ?? 'Todos' : 'Todos');
      setHistoryFilters(emptyHistoryFilters);
      setQuery('');
      setHistoryList(true);
      setPage('list');
    }} />}
    {photoReviewOpen && <RecordPhotoReviewPopup value={recordDraft} onChange={setRecordDraft} onClose={() => setPhotoReviewOpen(false)} onSave={draft => {
      addRecord(draft);
      setPhotoReviewOpen(false);
      setType(initialListTitle ? initialType ?? 'Todos' : 'Todos');
      setHistoryFilters(emptyHistoryFilters);
      setQuery('');
      setHistoryList(true);
      setPage('list');
    }} />}
    {photoOpen && <RecordPhotoPopup title={photoMode === 'scan' ? 'Escaneo' : 'Foto'} onClose={() => setPhotoOpen(false)} enableTranscription={photoMode === 'scan'} onCapture={(attachment, transcription) => { setRecordDraft(draft => ({ ...draft, attachment, ...(transcription ? { description: transcription.text, doctorName: transcription.doctorName || draft.doctorName, institution: transcription.institution || draft.institution } : {}) })); setPhotoOpen(false); setPhotoReviewOpen(true); }} />}
    {recordTypeOpen && <RecordTypePopup onClose={() => setRecordTypeOpen(false)} onSelect={chooseRecordMode} />}
    </View>
  );
  if (page === 'recordForm')
    return (
      <Sheet
        title={editingId ? 'Editar registro' : 'Agregar registro'}
        onClose={onClose}
        onBack={editingId ? back : () => setPage('recordCategory')}
        footer={
          <Button
            title="Guardar registro"
            onPress={saveRecord}
            disabled={busy}
            testID="save-record"
            icon="check"
          />
        }
      >
        <Text style={styles.body}>
          Registra información de tu historial y conserva su archivo original.
        </Text>
        {editingId && <><SectionTitle>Tipo de registro</SectionTitle>
        <View style={styles.wrap}>
          {recordTypes.map((item) => (
            <Chip
              key={item}
              label={item}
              selected={recordDraft.type === item}
              onPress={() => setRecordDraft((draft) => ({ ...draft, type: item }))}
            />
          ))}
        </View></>}
        <TextField
          label="Título *"
          value={recordDraft.title}
          onChangeText={(title) => setRecordDraft((draft) => ({ ...draft, title }))}
          placeholder="Ej. Consulta de medicina general"
          maxLength={120}
          testID="record-title"
        />
        <TextField
          label="Fecha * (AAAA-MM-DD)"
          value={recordDraft.date}
          onChangeText={(date) => setRecordDraft((draft) => ({ ...draft, date }))}
          placeholder="2026-10-20"
          maxLength={10}
          keyboardType="numbers-and-punctuation"
          testID="record-date"
        />
        <TextField
          label="Profesional o laboratorio"
          value={recordDraft.doctorName}
          onChangeText={(doctorName) => setRecordDraft((draft) => ({ ...draft, doctorName }))}
          placeholder="Opcional"
          maxLength={120}
        />
        {recordDraft.type === 'Consulta' && <>
          <TextField label="Hora (opcional, HH:MM)" value={recordDraft.time ?? ''} onChangeText={time => setRecordDraft(draft => ({ ...draft, time }))} placeholder="10:30" maxLength={5} testID="record-time" />
          <TextField label="Especialidad (opcional)" value={recordDraft.specialty ?? ''} onChangeText={specialty => setRecordDraft(draft => ({ ...draft, specialty }))} maxLength={120} testID="record-specialty" />
          <TextField label="Motivo (opcional)" value={recordDraft.reason ?? ''} onChangeText={reason => setRecordDraft(draft => ({ ...draft, reason }))} maxLength={1000} multiline testID="record-reason" />
        </>}
        <TextField label="Institución u hospital (opcional)" value={recordDraft.institution ?? ''} onChangeText={institution => setRecordDraft(draft => ({ ...draft, institution }))} maxLength={160} testID="record-institution" />
        <TextField
          label={recordDraft.type === 'Consulta' ? 'Resumen' : 'Detalles'}
          value={recordDraft.description}
          onChangeText={(description) => setRecordDraft((draft) => ({ ...draft, description }))}
          placeholder="Notas del registro, fuente o información útil"
          multiline
          maxLength={6000}
        />
        <SectionTitle>Archivo adjunto</SectionTitle>
        <Text style={[styles.small, { marginBottom: 8 }]}>
          PDF, imagen o texto · Hasta 2 MB. También puedes guardar sin un archivo.
        </Text>
        {recordDraft.attachment ? (
          <Card>
            <Row
              title={recordDraft.attachment.name}
              subtitle="Abrir o descargar archivo"
              icon="attachment"
              onPress={() => openFile(recordDraft)}
            />
            <Button
              title="Quitar archivo"
              secondary
              onPress={() => setRecordDraft((draft) => ({ ...draft, attachment: undefined }))}
            />
          </Card>
        ) : null}
        <Button
          title={
            busy
              ? 'Abriendo selector…'
              : recordDraft.attachment
                ? 'Cambiar archivo'
                : 'Adjuntar archivo'
          }
          onPress={() => void attach()}
          secondary
          disabled={busy}
          icon="attachment"
          testID="attach-record-file"
        />
        {errorView}
      </Sheet>
    );

  if (page === 'medicationForm')
    return (
      <Sheet
        title={editingId ? 'Editar medicamento' : 'Agregar medicamento'}
        onClose={onClose}
        onBack={back}
        footer={
          <Button
            title="Guardar medicamento"
            onPress={saveMedication}
            testID="save-medication"
            icon="check"
          />
        }
      >
        <Text style={styles.body}>
          Copia los datos de tu receta. El registro no indica cambios de tratamiento.
        </Text>
        <View style={{ height: 14 }} />
        <TextField
          label="Medicamento *"
          value={medicationDraft.name}
          onChangeText={(name) => setMedicationDraft((draft) => ({ ...draft, name }))}
          maxLength={120}
          testID="medication-name"
        />
        <TextField
          label="Dosis registrada *"
          value={medicationDraft.dose}
          onChangeText={(dose) => setMedicationDraft((draft) => ({ ...draft, dose }))}
          placeholder="Tal como aparece en la receta"
          maxLength={120}
          testID="medication-dose"
        />
        <TextField
          label="Frecuencia registrada *"
          value={medicationDraft.frequency}
          onChangeText={(frequency) => setMedicationDraft((draft) => ({ ...draft, frequency }))}
          placeholder="Tal como aparece en la receta"
          maxLength={180}
          testID="medication-frequency"
        />
        <TextField
          label="Inicio * (AAAA-MM-DD)"
          value={medicationDraft.startDate}
          onChangeText={(startDate) => setMedicationDraft((draft) => ({ ...draft, startDate }))}
          maxLength={10}
          keyboardType="numbers-and-punctuation"
        />
        <TextField
          label="Fin (opcional, AAAA-MM-DD)"
          value={medicationDraft.endDate || ''}
          onChangeText={(endDate) => setMedicationDraft((draft) => ({ ...draft, endDate }))}
          maxLength={10}
          keyboardType="numbers-and-punctuation"
        />
        <Card>
          <View style={local.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Tratamiento vigente</Text>
              <Text style={styles.small}>Estado del registro en tu archivo.</Text>
            </View>
            <Switch
              accessibilityLabel="Tratamiento vigente"
              value={medicationDraft.active}
              onValueChange={(active) => setMedicationDraft((draft) => ({ ...draft, active }))}
              trackColor={{ true: colors.teal, false: colors.line }}
            />
          </View>
        </Card>
        {errorView}
      </Sheet>
    );

  if ((initialHistory || initialCreate) && page === 'record' && selectedRecord) return <>
    <Sheet title={historyCategories.find(category => category.type === selectedRecord.type)?.label.replace('\n', ' ') ?? selectedRecord.type} onClose={onClose} onBack={back}>
      <View style={local.detailTitleRow}>
        <Text style={local.detailTitle}>{selectedRecord.title}</Text>
        <Pressable testID="detail-send" accessibilityRole="button" accessibilityLabel={`Enviar ${selectedRecord.title}`} onPress={() => setSharingRecord(selectedRecord)} style={local.historySend}><Icon name="send" size={21} color="#285474" /></Pressable>
      </View>
      <Text style={local.detailMeta}>{state.profile.name}</Text>
      <Text style={local.detailMeta}>{parseDate(selectedRecord.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}{selectedRecord.time ? ` · ${selectedRecord.time}` : ''}</Text>
      <View style={local.detailDoctor}>
        <Text style={local.detailBody}>{selectedRecord.doctorName || 'Profesional no registrado'}</Text>
        {!!selectedRecord.specialty && <Text style={local.detailMeta}>{selectedRecord.specialty}</Text>}
      </View>
      {selectedRecord.type === 'Consulta' && <View style={local.detailSection}>
        <Text style={local.detailMeta}>Motivo</Text>
        <Text style={local.detailBody}>{selectedRecord.reason || 'No especificado'}</Text>
      </View>}
      <View style={local.detailSection}>
        <Text style={local.detailMeta}>Resumen</Text>
        <Text selectable style={local.detailBody}>{selectedRecord.description || 'Sin resumen registrado'}</Text>
      </View>
      {selectedRecord.attachment ? <Pressable testID="consultation-attachment" accessibilityRole="button" accessibilityLabel={`Abrir ${selectedRecord.attachment.name}`} onPress={() => void openFile(selectedRecord)} style={local.detailAttachment}>
        <View style={local.attachmentIcon}><Icon name="document" size={24} color={colors.teal} /></View>
        <View style={{ flex: 1 }}><Text style={local.attachmentTitle}>{selectedRecord.attachment.name}</Text><Text style={local.detailMeta}>{selectedRecord.attachment.mimeType === 'application/pdf' ? 'PDF' : selectedRecord.attachment.mimeType.startsWith('image/') ? 'Imagen' : 'Archivo adjunto'}</Text></View>
        <Icon name="chevronRight" size={18} color="#285474" />
      </Pressable> : <Text style={[local.detailMeta, { marginTop: 18 }]}>Sin archivo adjunto</Text>}
      <Pressable testID="edit-record" accessibilityRole="button" accessibilityLabel="Editar registro" onPress={() => startRecord(selectedRecord)} style={local.detailEdit}><Icon name="edit" size={16} color={colors.teal} /><Text style={{ color: colors.tealDark, fontSize: 12 }}>Editar registro</Text></Pressable>
    </Sheet>
    {sharingRecord && <RecordSharePopup record={sharingRecord} patientName={state.profile.name} onClose={() => setSharingRecord(null)} />}
  </>;

  if (page === 'record' && selectedRecord)
    return (
      <Sheet
        title={selectedRecord.type}
        onClose={onClose}
        onBack={back}
        footer={
          <Button
            title="Editar registro"
            onPress={() => startRecord(selectedRecord)}
            icon="edit"
            testID="edit-record"
          />
        }
      >
        <Text style={styles.title}>{selectedRecord.title}</Text>
        <Text style={[styles.body, { marginTop: 7 }]}>
          {dateLabel(selectedRecord.date)} · {selectedRecord.date}
        </Text>
        <SectionTitle>Profesional o laboratorio</SectionTitle>
        <Text style={styles.rowTitle}>
          {selectedRecord.doctorName || 'Sin información registrada'}
        </Text>
        <SectionTitle>Detalles del registro</SectionTitle>
        <Card>
          <Text selectable style={styles.body}>
            {selectedRecord.description || 'No hay detalles adicionales.'}
          </Text>
        </Card>
        <SectionTitle>Archivo original</SectionTitle>
        {selectedRecord.attachment ? (
          <Card>
            <Row
              title={selectedRecord.attachment.name}
              subtitle="Abrir o descargar archivo adjunto"
              icon="attachment"
              onPress={() => openFile(selectedRecord)}
            />
          </Card>
        ) : (
          <Empty
            title="Sin archivo adjunto"
            description="Puedes adjuntarlo al editar este registro."
          />
        )}
        <Button
          title="Eliminar registro"
          danger
          onPress={() => removeRecord(selectedRecord)}
          icon="trash"
        />
      </Sheet>
    );

  if ((initialHistory || initialCreate) && page === 'list') {
    const categoryTitle = initialListTitle ?? historyCategories.find(category => category.type === type)?.label.replace('\n', ' ') ?? 'Historial';
    return <>
      <Sheet title={categoryTitle} onClose={onClose} onBack={initialListTitle ? onClose : () => { setHistoryList(false); setType('Todos'); setQuery(''); setPage('history'); }} footerAlignment="right" footer={
        <Pressable testID="add-archive-item" accessibilityRole="button" accessibilityLabel="Agregar registro" onPress={() => startRecord()} style={({ pressed }) => [local.historyAdd, { opacity: pressed ? .7 : 1 }]}><LinearGradient colors={['#15C9CC', '#00ADB2', '#009DA5']} style={local.historyAddCircle}><Icon name="plus" size={32} color="white" /></LinearGradient></Pressable>
      }>
        <View style={{ height: 12 }} />
        <View style={local.historySearch}>
          <Icon name="search" size={18} color={colors.tealDark} />
          <TextInput testID="archive-search" accessibilityLabel={`Buscar en ${categoryTitle.toLocaleLowerCase('es')}`} placeholder={type === 'Todos' && !initialListTitle ? 'Buscar en mi historial' : `Buscar ${categoryTitle.toLocaleLowerCase('es')}`} placeholderTextColor="#617B90" value={query} onChangeText={setQuery} style={local.historySearchInput} />
          {filterButton}
        </View>
        {clearFiltersButton}
        {filterPanel}
        {storageError && <Text accessibilityRole="alert" style={styles.error}>{storageError}</Text>}
        <View testID="history-records">
          {records.map(record => <View key={record.id} style={local.historyRecord} testID={`history-row-${record.id}`}>
            <Pressable testID={`history-open-${record.id}`} accessibilityRole="button" accessibilityLabel={`Ver ${record.title}`} onPress={() => { setSelectedId(record.id); setPage('record'); }} style={local.historyRecordText}>
              <Text style={local.historyDate}>{parseDate(record.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
              <Text style={local.historyRecordTitle}>{record.title}</Text>
              <Text style={local.historyProfessional}>{record.doctorName || 'Añadido por ti'}</Text>
            </Pressable>
            <Pressable testID={`history-send-${record.id}`} accessibilityRole="button" accessibilityLabel={`Enviar ${record.title}`} onPress={() => setSharingRecord(record)} style={local.historySend}><Icon name="send" size={20} color="#285474" /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Abrir detalle de ${record.title}`} onPress={() => { setSelectedId(record.id); setPage('record'); }} style={local.historyDetail}><Icon name="chevronRight" size={17} color="#285474" /></Pressable>
          </View>)}
          {records.length === 0 && <Text style={local.historyEmpty}>{query.trim() ? 'No hay registros que coincidan con tu búsqueda.' : 'Aún no tienes registros en esta categoría.'}</Text>}
        </View>
      </Sheet>
      {sharingRecord && <RecordSharePopup record={sharingRecord} patientName={state.profile.name} onClose={() => setSharingRecord(null)} />}
    </>;
  }

  return (
    <Sheet
      title={tab === 'medications' ? 'Medicamentos' : type === 'Receta' ? 'Recetas' : type === 'Consulta' ? 'Historial' : 'Registros'}
      onClose={onClose}
      onBack={initialHistory ? () => { setHistoryList(false); setType('Todos'); setPage('history'); } : undefined}
      footer={
        <Button
          title={tab === 'records' ? 'Agregar registro' : 'Agregar medicamento'}
          onPress={() => (tab === 'records' ? startRecord() : startMedication())}
          icon="plus"
          testID="add-archive-item"
        />
      }
    >
      <Text style={styles.title}>Tu historia, organizada.</Text>
      <Text style={[styles.body, { marginTop: 6, marginBottom: 14 }]}>
        {state.profile.name} · Información local de demostración
      </Text>
      {storageError && (
        <Text accessibilityRole="alert" style={styles.error}>
          {storageError}
        </Text>
      )}
      {!initialHistory && <View style={styles.wrap}>
        <Chip label="Historial" selected={tab === 'records'} onPress={() => setTab('records')} />
        <Chip
          label="Medicamentos"
          selected={tab === 'medications'}
          onPress={() => setTab('medications')}
        />
      </View>}
      {tab === 'records' ? (
        <>
          <TextField
            placeholder="Buscar por título, profesional o detalle"
            value={query}
            onChangeText={setQuery}
            testID="archive-search"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            <Chip label="Todos" selected={type === 'Todos'} onPress={() => setType('Todos')} />
            {recordTypes.map((item) => (
              <Chip
                key={item}
                label={item}
                selected={type === item}
                onPress={() => setType(item)}
              />
            ))}
          </ScrollView>
          <Text style={styles.small}>
            {records.length} {records.length === 1 ? 'registro' : 'registros'} · Más recientes
            primero
          </Text>
          {records.length === 0 ? (
            <Empty
              title={state.records.length ? 'Sin coincidencias' : 'Tu historial empieza aquí'}
              description={
                state.records.length
                  ? 'Prueba con otra búsqueda o tipo de registro.'
                  : 'Agrega una consulta, estudio, receta, vacuna o nota.'
              }
              action={state.records.length ? 'Limpiar búsqueda' : 'Agregar registro'}
              onAction={() =>
                state.records.length ? (setQuery(''), setType('Todos')) : startRecord()
              }
            />
          ) : (
            records.map((record) => (
              <Card key={record.id} style={{ marginTop: 10 }}>
                <Text style={styles.badge}>
                  {record.type} · {record.date}
                </Text>
                <Row
                  title={record.title}
                  subtitle={`${record.doctorName || 'Añadido por ti'}${record.attachment ? ' · Archivo adjunto' : ''}`}
                  icon={recordIcons[record.type]}
                  onPress={() => {
                    setSelectedId(record.id);
                    setPage('record');
                  }}
                />
              </Card>
            ))
          )}
        </>
      ) : (
        <>
          <View style={[styles.wrap, { marginTop: 6 }]}>
            {(['Vigentes', 'Anteriores', 'Todos'] as const).map((item) => (
              <Chip
                key={item}
                label={item}
                selected={medicationFilter === item}
                onPress={() => setMedicationFilter(item)}
              />
            ))}
          </View>
          <Text style={[styles.small, { marginBottom: 10 }]}>
            Información copiada de tus recetas; no modifica un tratamiento.
          </Text>
          {medications.length === 0 ? (
            <Empty
              title="Sin medicamentos en esta vista"
              description="Agrega un registro o cambia el filtro."
              action="Agregar medicamento"
              onAction={() => startMedication()}
            />
          ) : (
            medications.map((item) => (
              <Card key={item.id}>
                <Row
                  title={item.name}
                  subtitle={item.active ? 'Vigente' : 'Anterior'}
                  icon="pill"
                  onPress={() => startMedication(item)}
                />
                <Text style={styles.body}>Dosis: {item.dose}</Text>
                <Text style={styles.body}>Frecuencia: {item.frequency}</Text>
                <Text style={[styles.small, { marginTop: 5 }]}>
                  Desde {item.startDate}
                  {item.endDate ? ` · Hasta ${item.endDate}` : ''}
                </Text>
                <View style={[local.switchRow, { marginTop: 12 }]}>
                  <Text style={[styles.rowTitle, { flex: 1 }]}>Marcar como vigente</Text>
                  <Switch
                    accessibilityLabel={`Tratamiento vigente: ${item.name}`}
                    value={item.active}
                    onValueChange={(active) => {
                      try {
                        updateMedication(item.id, { active });
                      } catch (e) {
                        notify('No se pudo actualizar', errorMessage(e));
                      }
                    }}
                    trackColor={{ true: colors.teal, false: colors.line }}
                  />
                </View>
                <View style={local.actions}>
                  <View style={{ flex: 1 }}>
                    <Button
                      title="Editar"
                      secondary
                      icon="edit"
                      onPress={() => startMedication(item)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      title="Eliminar"
                      secondary
                      icon="trash"
                      onPress={() => removeMedication(item)}
                    />
                  </View>
                </View>
              </Card>
            ))
          )}
        </>
      )}
    </Sheet>
  );
}

const local = StyleSheet.create({
  filterButton: { width: 34, height: 37, alignItems: 'center', justifyContent: 'center', marginRight: 0 },
  filterCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E0F6F3', alignItems: 'center', justifyContent: 'center' },
  filterPanel: { marginTop: 10, padding: 14, borderRadius: 15, backgroundColor: '#F6FAFB', borderWidth: 1, borderColor: '#E2EDF1' },
  filterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, gap: 8 },
  filterTitle: { color: colors.navy, fontSize: 14, fontWeight: '600' },
  filterReset: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 },
  filterDone: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 },
  detailTitleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  detailTitle: { flex: 1, color: '#174F80', fontSize: 25, fontWeight: '600', letterSpacing: -.5 },
  detailMeta: { color: '#8A9FB7', fontSize: 13, lineHeight: 20 },
  detailDoctor: { marginTop: 25, paddingBottom: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E1EBEF' },
  detailBody: { color: '#28466B', fontSize: 14, lineHeight: 22 },
  detailSection: { marginTop: 18, marginBottom: 8 },
  detailAttachment: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#E1EBEF', paddingVertical: 14, marginTop: 14 },
  attachmentIcon: { width: 42, height: 44, borderRadius: 10, backgroundColor: '#EAF8F7', alignItems: 'center', justifyContent: 'center' },
  attachmentTitle: { fontSize: 12, lineHeight: 18, color: '#28466B' },
  detailEdit: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', minHeight: 44, marginTop: 18 },
  historyRecord: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E3ECF0', paddingVertical: 8 },
  historyRecordText: { flex: 1, minWidth: 0, paddingVertical: 8 },
  historyDate: { color: '#8AA0B4', fontSize: 11, lineHeight: 16 },
  historyRecordTitle: { color: colors.navy, fontSize: 15, lineHeight: 21, fontWeight: '500' },
  historyProfessional: { color: '#8AA0B4', fontSize: 11, lineHeight: 17, marginTop: 2 },
  historySend: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  historyDetail: { width: 28, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  historyEmpty: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 24, textAlign: 'center' },
  historyTitle: { color: colors.navy, fontSize: 25, fontWeight: '700', letterSpacing: -.6, marginTop: 8 },
  historySubtitle: { color: '#8198AF', fontSize: 11, lineHeight: 17, marginTop: 5, marginBottom: 18 },
  historySearch: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 12, paddingRight: 4, height: 38, backgroundColor: '#F1F7F7', borderColor: 'transparent', borderWidth: 1, borderRadius: 22 },
  historySearchInput: { flex: 1, minWidth: 0, fontSize: 12, color: colors.navy, paddingVertical: 0 },
  historyGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8, marginTop: 8, rowGap: 20 },
  historyCategory: { width: '25%', alignItems: 'center', gap: 9 },
  historyIcon: { width: 58, height: 58, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(205,229,232,.55)', boxShadow: '0 4px 8px rgba(8,36,65,.07)' },
  historyLabel: { color: '#365B7B', fontSize: 9, lineHeight: 13, textAlign: 'center', minHeight: 26, paddingHorizontal: 1 },
  historyAdd: { width: 44, height: 44 },
  historyAddCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: '#55D4D6', boxShadow: '0 3px 5px rgba(8,36,65,.24)', alignItems: 'center', justifyContent: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 6 },
});
