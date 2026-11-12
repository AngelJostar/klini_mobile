import React, { useCallback, useMemo, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';

import AppleHealthHistoryPopup from '../components/AppleHealthHistoryPopup';
import AppleHealthInfoPopup from '../components/AppleHealthInfoPopup';
import AppleHealthLiveReadings from '../components/AppleHealthLiveReadings';
import AppleHealthOptionsPopup from '../components/AppleHealthOptionsPopup';
import AppleHealthPanel from '../components/AppleHealthPanel';
import ArchivePopup from '../components/ArchivePopup';
import BodyParameterEntryPopup from '../components/BodyParameterEntryPopup';
import BodyParameterFiltersPopup from '../components/BodyParameterFiltersPopup';
import BodyParameterListRow from '../components/BodyParameterListRow';
import { colors, Icon, TextField } from '../components/ui';
import { emptyAppleHealthPreferences, orderedHealthCategories } from '../domain/appleHealth';
import { BODY_PARAMETERS, bodyParameterDefinition, bodyParameterDraftFromReading, bodyParameterFromDraft, bodyParameterHistory, bodyParameterRecord, emptyBodyParameterFilters, filterBodyParameterReadings, formatBodyParameterValue, listBodyParameters, newBodyParameterDraft, validateBodyParameter, type BodyParameterKind, type BodyParameterReading, type BodyParameterSource, type BodyParameterFilters } from '../domain/bodyParameters';
import { monthLabel, parseDate } from '../domain/dates';
import { HEALTH_CATEGORIES, type HealthCategory } from '../services/appleHealthReader';
import { exportText } from '../services/files';
import { useAppStore } from '../state/store';

type Page = 'list' | 'history' | 'detail' | 'form';
const sourceIcon = (source: BodyParameterSource) => source === 'Manual' ? 'pencil-outline' : source === 'Apple Watch' ? 'watch-outline' : source === 'Abbott' ? 'hardware-chip-outline' : source === 'Báscula inteligente' ? 'scale-outline' : 'pulse-outline';
const shortDate = (date: string) => parseDate(date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace(/\./g, '');

export default function BodyParametersScreen({ onClose }: { onClose: () => void }) {
  const { state } = useAppStore();
  return <BodyParametersContent key={state.profile.id} onClose={onClose} />;
}

function BodyParametersContent({ onClose }: { onClose: () => void }) {
  const { state, addRecord, updateRecord, storageError, ownerProfile, updateSettings } = useAppStore();
  const [page, setPage] = useState<Page>('list');
  const [tab, setTab] = useState<'all' | 'favorites'>('all');
  const [selectedKind, setSelectedKind] = useState<BodyParameterKind>('weight');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState(newBodyParameterDraft);
  const [editing, setEditing] = useState<BodyParameterReading | null>(null);
  const [formReturn, setFormReturn] = useState<'list' | 'history' | 'detail'>('list');
  const [filters, setFilters] = useState<BodyParameterFilters>({ ...emptyBodyParameterFilters });
  const [listFilters, setListFilters] = useState<BodyParameterFilters>({ ...emptyBodyParameterFilters });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [healthHistory, setHealthHistory] = useState<HealthCategory | null>(null);
  const [healthInfoOpen, setHealthInfoOpen] = useState(false);
  const [healthOptionsOpen, setHealthOptionsOpen] = useState(false);
  const healthOwner = ownerProfile.id === state.profile.id;
  const healthPreferences = state.settings.appleHealth?.ownerId === state.profile.id ? state.settings.appleHealth : emptyAppleHealthPreferences(state.profile.id);
  const [healthCategories, setHealthCategories] = useState<HealthCategory[]>(() => healthPreferences.selected.length ? [...healthPreferences.selected] : HEALTH_CATEGORIES.map(item => item.id));
  const [entryOpen, setEntryOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const readings = useMemo(() => listBodyParameters(state.profile.id, state.records), [state.profile.id, state.records]);
  const favoriteCount = new Set(readings.filter(reading => reading.favorite).map(reading => reading.kind)).size;
  const filteredReadings = useMemo(() => listBodyParameters(state.profile.id, state.records, undefined, listFilters), [state.profile.id, state.records, listFilters]);
  const history = useMemo(() => bodyParameterHistory(state.profile.id, state.records, selectedKind), [state.profile.id, state.records, selectedKind]);
  const filteredHistory = useMemo(() => filterBodyParameterReadings(history, filters), [history, filters]);
  const healthActive = healthOwner && healthPreferences.enabled;
  const healthReplacesHeartRate = healthActive && healthPreferences.selected.includes('HKQuantityTypeIdentifierHeartRate');
  const visible = filteredReadings.filter(reading => (!healthReplacesHeartRate || reading.kind !== 'heart-rate') && (tab === 'all' || readings.find(item => item.kind === reading.kind)?.favorite));
  const latest = history[0];
  const favoriteReading = readings.find(reading => reading.kind === selectedKind);
  const selected = history.find(reading => reading.id === selectedId);
  const definition = bodyParameterDefinition(draft.kind);
  const parameter = bodyParameterDefinition(selectedKind);
  const filtersActive = Object.keys(emptyBodyParameterFilters).some(key => filters[key as keyof BodyParameterFilters] !== emptyBodyParameterFilters[key as keyof BodyParameterFilters]);
  const listFiltersActive = Object.keys(emptyBodyParameterFilters).some(key => listFilters[key as keyof BodyParameterFilters] !== emptyBodyParameterFilters[key as keyof BodyParameterFilters]);
  const groups = new Map<string, BodyParameterReading[]>();
  for (const reading of filteredHistory) {
    const month = reading.date.slice(0, 7);
    groups.set(month, [...(groups.get(month) ?? []), reading]);
  }

  const closeEntry = useCallback(() => { Keyboard.dismiss(); setEntryOpen(false); setError(''); }, []);
  const closeHealthInfo = useCallback(() => setHealthInfoOpen(false), []);
  const closeHealthOptions = useCallback(() => setHealthOptionsOpen(false), []);
  const back = useCallback(() => {
    if (healthOptionsOpen) { closeHealthOptions(); return; }
    if (healthInfoOpen) { closeHealthInfo(); return; }
    if (entryOpen) { closeEntry(); return; }
    if (filtersOpen) { setFiltersOpen(false); return; }
    setError(''); setMessage('');
    if (page === 'form') setPage(formReturn);
    else setPage(page === 'detail' ? 'history' : 'list');
  }, [healthOptionsOpen, closeHealthOptions, healthInfoOpen, closeHealthInfo, entryOpen, closeEntry, filtersOpen, page, formReturn]);
  function openHistory(kind: BodyParameterKind) {
    setSelectedKind(kind); setSelectedId(null); setFilters({ ...emptyBodyParameterFilters });
    setPage('history'); setError(''); setMessage('');
  }
  function startRecord() {
    setDraft({ ...newBodyParameterDraft(), kind: selectedKind });
    setEditing(null); setFormReturn('history'); setError(''); setMessage(''); setEntryOpen(true);
  }
  function editRecord() {
    if (!selected) return;
    setDraft(bodyParameterDraftFromReading(selected)); setEditing({ ...selected });
    setFormReturn('detail'); setError(''); setMessage(''); setPage('form');
  }
  function saveRecord() {
    try {
      const currentFavorite = readings.find(reading => reading.kind === draft.kind)?.favorite ?? false;
      const captured = bodyParameterFromDraft(draft, editing?.favorite ?? currentFavorite);
      const input = editing ? validateBodyParameter({ ...captured, source: editing.source, origin: editing.origin, ...(editing.demoKey && { demoKey: editing.demoKey }) }) : captured;
      const record = bodyParameterRecord(input);
      const recordId = editing?.recordId;
      const id = recordId ? (updateRecord(recordId, record), recordId) : addRecord(record);
      setSelectedKind(input.kind); setError(''); setMessage(editing ? 'Registro actualizado.' : 'Registro agregado.');
      if (editing) { setSelectedId(editing.id); setPage('detail'); }
      else { setSelectedId(id); setEntryOpen(false); setPage(formReturn === 'history' ? 'history' : 'list'); setTab('all'); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo guardar el registro.'); }
  }
  function toggleFavorite() {
    if (!favoriteReading) return;
    try {
      const record = bodyParameterRecord({ ...favoriteReading, favorite: !favoriteReading.favorite });
      if (favoriteReading.recordId) updateRecord(favoriteReading.recordId, { description: record.description });
      else addRecord(record);
      setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo cambiar el favorito.'); }
  }
  async function shareReading() {
    if (!selected || sharing) return;
    setSharing(true); setError('');
    try {
      await exportText(`klini-${selected.kind}-${selected.date}.txt`, [
        `Klini · ${bodyParameterDefinition(selected.kind).label}`,
        `${formatBodyParameterValue(selected)} ${selected.unit}`,
        `Fecha: ${selected.date} · ${selected.time}`,
        `Fuente: ${selected.source}`,
        `Nota: ${selected.note || 'Sin nota'}`,
        selected.origin === 'demo' ? 'Dato de ejemplo. La fuente es ilustrativa; no hay un dispositivo conectado.' : 'Registro personal guardado localmente.',
      ].join('\n'));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo compartir el registro.'); }
    finally { setSharing(false); }
  }

  const currentReading = page === 'detail' ? selected : page === 'history' ? latest : null;
  const footnote = page === 'form'
    ? editing?.origin === 'demo' ? 'Edición de ejemplo · no es una medición real' : 'Captura manual · guardado local'
    : currentReading ? currentReading.origin === 'demo' ? 'Datos de ejemplo' : 'Registro personal'
      : readings.some(reading => reading.origin === 'demo') ? (healthActive ? 'Salud: lectura del iPhone · otros registros: ejemplo' : 'Datos de ejemplo') : 'Registros personales';
  const footer = <View style={s.footer}>
    {page === 'history' && <Pressable testID="body-history-add-record" accessibilityRole="button" accessibilityLabel="Agregar registro corporal" onPress={startRecord} style={s.addButton}>
      <Icon name="plus" size={17} color={colors.tealDark} /><Text style={s.addText}>Agregar registro</Text>
    </Pressable>}
    {page === 'detail' && selected && <Pressable testID="body-detail-edit" accessibilityRole="button" accessibilityLabel="Editar registro" onPress={editRecord} style={s.addButton}><Icon name="pencil-outline" size={15} color={colors.tealDark} /><Text style={s.addText}>Editar registro</Text></Pressable>}
    {page === 'form' && <Pressable testID="body-form-save" accessibilityRole="button" accessibilityLabel="Guardar registro corporal" onPress={saveRecord} style={s.addButton}><Icon name="check" size={17} color={colors.tealDark} /><Text style={s.addText}>Guardar registro</Text></Pressable>}
    <Text style={s.footnote}>{footnote}</Text>
  </View>;
  const title = page === 'form' ? editing ? 'Editar registro' : 'Agregar registro'
    : page === 'detail' ? `Registro de ${parameter.label.toLocaleLowerCase('es')}`
      : page === 'history' ? parameter.label : 'Parámetros corporales';
  const titleTestID = page === 'list' ? 'body-list-title' : page === 'history' ? 'body-history-title' : page === 'detail' ? 'body-detail-title' : undefined;
  const filterButton = <Pressable testID={page === 'list' ? 'body-list-filters' : 'body-history-filters'} accessibilityRole="button" accessibilityLabel={page === 'list' ? 'Filtrar parámetros corporales' : 'Filtrar registros'} accessibilityState={{ expanded: filtersOpen }} onPress={() => setFiltersOpen(true)} style={s.iconButton}><Icon name="filters" size={24} color={colors.tealDark} /></Pressable>;
  const clearFiltersButton = (page === 'list' ? listFiltersActive : filtersActive) && <Pressable testID={page === 'list' ? 'body-list-clear-filters' : 'body-history-clear-filters'} accessibilityRole="button" accessibilityLabel="Borrar filtros" onPress={() => page === 'list' ? setListFilters({ ...emptyBodyParameterFilters }) : setFilters({ ...emptyBodyParameterFilters })} style={s.clearButton}><Text numberOfLines={1} style={s.clearText}>Borrar filtros</Text></Pressable>;
  const overlay = healthInfoOpen
    ? <AppleHealthInfoPopup onClose={closeHealthInfo} />
    : filtersOpen && <BodyParameterFiltersPopup kind={page === 'list' ? undefined : selectedKind} value={page === 'list' ? listFilters : filters} onApply={next => { if (page === 'list') setListFilters(next); else setFilters(next); setFiltersOpen(false); setMessage(''); }} onClose={() => setFiltersOpen(false)} />;

  if (healthHistory && healthActive) return <AppleHealthHistoryPopup key={healthHistory} categoryId={healthHistory} onClose={() => setHealthHistory(null)} onSavedHistory={() => { setHealthHistory(null); openHistory('heart-rate'); }} />;
  return <View style={s.screen}>
    <View style={s.screen} pointerEvents={entryOpen || healthOptionsOpen ? 'none' : 'auto'} accessibilityElementsHidden={entryOpen || healthOptionsOpen} importantForAccessibility={entryOpen || healthOptionsOpen ? 'no-hide-descendants' : 'auto'}>
    <ArchivePopup title={title} titleTestID={titleTestID} contentKey={`${page}-${selectedId ?? selectedKind}`} onClose={onClose} onBack={page === 'list' && !healthInfoOpen && !healthOptionsOpen && !filtersOpen ? undefined : back} footer={footer} overlay={overlay}>
    <View testID="body-parameters-screen">
      {page === 'history' && <View style={s.headingRow}>
        {page === 'history' && favoriteReading && <Pressable testID="body-detail-favorite" accessibilityRole="button" accessibilityLabel={favoriteReading.favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'} accessibilityState={{ selected: favoriteReading.favorite }} onPress={toggleFavorite} style={s.iconButton}><Icon name={favoriteReading.favorite ? 'heartFilled' : 'heart'} size={21} color={colors.teal} /></Pressable>}
        <View style={s.filterSlot} />
      </View>}
      {page === 'history' && <View style={s.filterControls}>
          {filterButton}
          <View style={s.clearSlot}>{clearFiltersButton}</View>
      </View>}
      {!entryOpen && !!(error || storageError) && <Text accessibilityRole="alert" style={s.error}>{error || storageError}</Text>}
      {!!message && <Text accessibilityLiveRegion="polite" style={s.message}>{message}</Text>}

      {page === 'list' && <>
        <View testID="body-list-toolbar" style={s.listToolbar}>
          <View style={s.listToolbarSpacer} />
          <View style={s.tabSlot}>
          <View style={s.tabs} accessibilityRole="tablist">
          {(['all', 'favorites'] as const).map(value => <Pressable key={value} testID={`body-tab-${value}`} accessibilityRole="tab" accessibilityLabel={value === 'all' ? 'Todos' : `Favoritos (${favoriteCount})`} accessibilityState={{ selected: tab === value }} onPress={() => { setTab(value); setMessage(''); }} style={[s.tab, value === 'favorites' && s.favoritesTab, tab === value && s.activeTab]}>
            {value === 'favorites' && <Icon name="heartFilled" size={12} color={colors.teal} />}
            <Text style={[s.tabText, tab === value && s.activeTabText]}>{value === 'all' ? 'Todos' : `Favoritos (${favoriteCount})`}</Text>
          </Pressable>)}
          </View>
          </View>
          <View style={s.listFilterTools}>
            {filterButton}
            {listFiltersActive && <View style={s.listClearSlot}>{clearFiltersButton}</View>}
          </View>
        </View>
        <AppleHealthPanel onShowInfo={() => setHealthInfoOpen(true)} optionsOpen={healthOptionsOpen} enabled={healthOwner && healthPreferences.enabled} onDisable={() => updateSettings({ appleHealth: { ...healthPreferences, enabled: false } })} onOptionsChange={open => { if (open) setHealthCategories(healthPreferences.selected.length ? [...healthPreferences.selected] : HEALTH_CATEGORIES.map(item => item.id)); setHealthOptionsOpen(open); }} />
        {healthOwner && healthPreferences.enabled && <AppleHealthLiveReadings selected={healthPreferences.selected} onOpenHistory={setHealthHistory} />}
        {visible.map(reading => <BodyParameterListRow key={reading.kind} testID={`body-row-${reading.kind}`} label={bodyParameterDefinition(reading.kind).label} icon={bodyParameterDefinition(reading.kind).icon} value={formatBodyParameterValue(reading)} unit={reading.unit} source={`${reading.source}${reading.origin === 'demo' ? ' · ejemplo' : ''}`} sourceIcon={sourceIcon(reading.source)} accessibilityLabel={`${bodyParameterDefinition(reading.kind).label}, ${formatBodyParameterValue(reading)} ${reading.unit}, ${reading.source}${reading.origin === 'demo' ? ', dato de ejemplo' : ''}`} onPress={() => openHistory(reading.kind)} />)}
        {!visible.length && !healthActive && <View style={s.empty}><Icon name={listFiltersActive ? 'filter' : tab === 'favorites' ? 'heart' : 'activity'} size={28} color={colors.teal} /><Text style={s.emptyTitle}>{listFiltersActive ? 'No hay registros' : tab === 'favorites' ? 'Aún no hay favoritos' : 'Aún no hay registros'}</Text><Text style={s.hint}>{listFiltersActive ? 'Prueba con otros filtros o bórralos para ver los parámetros.' : tab === 'favorites' ? 'Abre un parámetro y márcalo como favorito.' : 'Agrega una medición corporal para comenzar.'}</Text></View>}
      </>}

      {page === 'history' && <View testID="body-parameter-history">
        <View style={s.historyHero}>
          <View style={s.heroMain}>{latest ? <>
            <View style={s.historyValueRow}><Text testID="body-history-latest-value" style={s.largeValue}>{formatBodyParameterValue(latest)}<Text style={s.largeUnit}> {latest.unit}</Text></Text></View>
            <Text style={s.latestDate}>Último registro · {shortDate(latest.date)} · {latest.time}</Text>
            <View style={s.latestSource}><Icon name={sourceIcon(latest.source)} size={13} color="#86A0B0" /><Text style={s.latestSourceText}>{latest.source}</Text></View>
          </> : <Text style={s.hint}>Aún no hay mediciones de este parámetro.</Text>}</View>
        </View>
        {Array.from(groups, ([month, items]) => <View key={month}>
          <Text testID={`body-history-month-${month}`} style={s.monthTitle}>{monthLabel(`${month}-01`)}</Text>
          {items.map(reading => <Pressable key={reading.id} testID={`body-history-row-${reading.id}`} accessibilityRole="button" accessibilityLabel={`${parameter.label}, ${shortDate(reading.date)}, ${reading.time}, ${formatBodyParameterValue(reading)} ${reading.unit}, ${reading.source}`} onPress={() => { setSelectedId(reading.id); setError(''); setMessage(''); setPage('detail'); }} style={({ pressed }) => [s.historyRow, pressed && s.pressed]}>
            <View style={s.historyRowMain}><Text style={s.historyDate}>{shortDate(reading.date)} · {reading.time}</Text><View style={s.rowSourceLine}><Icon name={sourceIcon(reading.source)} size={11} color="#87A1AD" /><Text style={s.historySource}>{reading.source}</Text></View></View>
            <Text style={s.historyValue}>{formatBodyParameterValue(reading)}<Text style={s.historyUnit}> {reading.unit}</Text></Text><Icon name="chevronRight" size={17} color="#6D89A0" />
          </Pressable>)}
        </View>)}
        {!filteredHistory.length && <View style={s.empty}><Icon name="filter" size={28} color={colors.teal} /><Text style={s.emptyTitle}>No hay registros</Text><Text style={s.hint}>{filtersActive ? 'Prueba con otros filtros o bórralos para ver el historial.' : 'Agrega una medición para comenzar.'}</Text></View>}
      </View>}

      {page === 'detail' && selected && <View testID="body-parameter-detail">
        <View style={s.detailHero}><View style={s.heroMain}><Text testID="body-detail-value" style={s.largeValue}>{formatBodyParameterValue(selected)}<Text style={s.largeUnit}> {selected.unit}</Text></Text><Text style={s.latestDate}>{shortDate(selected.date)} · {selected.time}</Text></View><Pressable testID="body-detail-share" accessibilityRole="button" accessibilityLabel="Compartir registro" accessibilityState={{ disabled: sharing }} disabled={sharing} onPress={() => void shareReading()} style={[s.iconButton, sharing && { opacity: .4 }]}><Icon name="paper-plane-outline" size={23} color={colors.tealDark} /></Pressable></View>
        <View style={s.detailSource}><Icon name={sourceIcon(selected.source)} size={14} color="#86A0B0" /><Text testID="body-detail-source" style={s.latestSourceText}>{selected.source}</Text></View>
        <View style={s.noteCard}><Text style={s.detailLabel}>Nota</Text><Text testID="body-detail-note" style={s.noteText}>{selected.note || 'Sin nota'}</Text></View>
        <Text style={s.detailHint}>{selected.origin === 'demo' ? 'Dato de ejemplo. La fuente es ilustrativa; no hay un dispositivo conectado.' : 'Medición capturada manualmente y guardada en tu archivo.'}</Text>
      </View>}

      {page === 'form' && <View testID="body-parameter-form">
        <Text style={s.hint}>{editing ? 'Actualiza los datos de este registro.' : 'Ingresa tu medición.'}</Text>
        {!editing && formReturn === 'list' ? <View style={s.kinds}>{BODY_PARAMETERS.map(item => <Pressable key={item.kind} testID={`body-form-kind-${item.kind}`} accessibilityRole="button" accessibilityState={{ selected: draft.kind === item.kind }} onPress={() => { setDraft(current => ({ ...current, kind: item.kind, value: '', secondary: '' })); setError(''); }} style={[s.kind, draft.kind === item.kind && s.selectedKind]}><Icon name={item.icon} size={20} color={colors.teal} /><Text style={s.kindText}>{item.label}</Text></Pressable>)}</View> : <Text style={s.formParameter}>{definition.label}</Text>}
        <Text style={s.formUnit}>Unidad: {definition.unit}</Text>
        <TextField testID="body-form-value" label={draft.kind === 'blood-pressure' ? 'Sistólica' : 'Valor'} placeholder={draft.kind === 'blood-pressure' ? '118' : 'Escribe el valor'} value={draft.value} onChangeText={value => setDraft(current => ({ ...current, value }))} keyboardType="decimal-pad" autoCapitalize="none" />
        {draft.kind === 'blood-pressure' && <TextField testID="body-form-secondary" label="Diastólica" placeholder="76" value={draft.secondary} onChangeText={secondary => setDraft(current => ({ ...current, secondary }))} keyboardType="number-pad" />}
        <TextField testID="body-form-date" label="Fecha · AAAA-MM-DD" value={draft.date} onChangeText={date => setDraft(current => ({ ...current, date }))} autoCapitalize="none" />
        <TextField testID="body-form-time" label="Hora · HH:mm" value={draft.time} onChangeText={time => setDraft(current => ({ ...current, time }))} keyboardType="numbers-and-punctuation" autoCapitalize="none" />
        <TextField testID="body-form-note" label="Nota (opcional)" placeholder="Por ejemplo: En ayunas" value={draft.note || ''} onChangeText={note => setDraft(current => ({ ...current, note }))} multiline maxLength={500} />
        <Text style={s.hint}>{editing?.origin === 'demo' ? `Fuente de ejemplo: ${editing.source}. La edición conserva su identificación como demostración.` : 'Fuente: Manual. Los dispositivos de ejemplo no están conectados.'}</Text>
      </View>}
    </View>
    </ArchivePopup>
    </View>
    {healthOptionsOpen && <AppleHealthOptionsPopup selected={healthCategories} requested={healthPreferences.requested} permitted={healthOwner} onSave={categories => { updateSettings({ appleHealth: { ownerId: state.profile.id, enabled: true, selected: orderedHealthCategories(categories), requested: orderedHealthCategories([...healthPreferences.requested, ...categories]) } }); setHealthOptionsOpen(false); }} onSelectedChange={setHealthCategories} onClose={closeHealthOptions} />}
    {entryOpen && <BodyParameterEntryPopup draft={draft} onChange={setDraft} onClose={closeEntry} onSave={saveRecord} error={error || storageError || ''} />}
  </View>;
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  headingRow: { position: 'absolute', top: 0, right: 0, zIndex: 1, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-end', gap: 8 },
  listToolbar: { flexDirection: 'row', alignItems: 'flex-start' },
  listToolbarSpacer: { width: 44 }, tabSlot: { flex: 1, minWidth: 0, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, listFilterTools: { width: 44 }, listClearSlot: { width: 64, marginLeft: -10 },
  tabs: { width: 190, maxWidth: '100%', alignSelf: 'center', height: 30, backgroundColor: '#E9EFF6', borderRadius: 17, padding: 3, flexDirection: 'row' },
  tab: { flex: 1, minWidth: 0, borderRadius: 14, flexDirection: 'row', gap: 4, justifyContent: 'center', alignItems: 'center' }, favoritesTab: { flex: 1.4 }, activeTab: { backgroundColor: 'white', boxShadow: '0 1px 3px rgba(8,36,65,.08)' }, tabText: { color: '#8A9DB4', fontSize: 10, lineHeight: 15 }, activeTabText: { color: colors.teal, fontWeight: '600' },
  row: { flexDirection: 'row', minHeight: 54, alignItems: 'center', gap: 9, borderBottomWidth: 1, borderBottomColor: '#EDF4F8', paddingVertical: 9 }, rowIcon: { width: 29, alignItems: 'center' }, rowMain: { flex: 1, minWidth: 0 }, rowName: { color: colors.navy, fontSize: 13, fontWeight: '700' }, rowSource: { color: '#8AA0B2', fontSize: 9 }, rowSourceLine: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }, rowValue: { maxWidth: '44%', flexShrink: 1, alignItems: 'flex-end' }, value: { fontSize: 14, color: '#8192A8' }, unit: { fontSize: 10, color: '#8192A8' },
  footer: { alignItems: 'center', gap: 15 }, addButton: { minHeight: 40, borderRadius: 24, paddingHorizontal: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#EAF7FA' }, addText: { fontSize: 12, color: colors.tealDark }, footnote: { fontSize: 9, color: '#8CA0B8' },
  error: { color: colors.danger, fontSize: 12, lineHeight: 17, marginBottom: 12 }, message: { fontSize: 12, color: colors.tealDark, marginBottom: 8 }, pressed: { opacity: .65 }, empty: { paddingVertical: 32, alignItems: 'center', gap: 12 }, emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.navy }, hint: { color: '#748DA8', fontSize: 12, lineHeight: 18 },
  historyHero: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 26 }, historyValueRow: { paddingRight: 104 }, heroMain: { flex: 1, minWidth: 0 }, largeValue: { color: colors.navy, fontSize: 42, lineHeight: 50, fontWeight: '700', letterSpacing: -.7 }, largeUnit: { color: '#748DA8', fontSize: 20, fontWeight: '400', letterSpacing: 0 }, latestDate: { color: '#748DA8', fontSize: 12, lineHeight: 18, marginTop: 7 }, latestSource: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 }, latestSourceText: { color: '#86A0B0', fontSize: 11, flexShrink: 1 },
  iconButton: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, filterSlot: { width: 44, minHeight: 44 }, filterControls: { position: 'absolute', top: 0, right: 0, zIndex: 2, width: 44, alignItems: 'center' }, clearSlot: { width: 64, minHeight: 24, alignSelf: 'center', justifyContent: 'center' }, clearButton: { minHeight: 24, alignItems: 'center', justifyContent: 'center' }, clearText: { color: colors.tealDark, fontSize: 9 },
  monthTitle: { color: '#879EB3', fontSize: 12, lineHeight: 18, marginTop: 8, marginBottom: 6, textTransform: 'capitalize' }, historyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 15, minHeight: 65, borderBottomWidth: 1, borderBottomColor: '#E9F0F3' }, historyRowMain: { flex: 1, minWidth: 0 }, historyDate: { color: colors.navy, fontSize: 12, lineHeight: 18 }, historySource: { color: '#8AA0B2', fontSize: 10, flexShrink: 1 }, historyValue: { color: colors.navy, fontSize: 16, fontWeight: '600', flexShrink: 1 }, historyUnit: { color: '#748DA8', fontSize: 10, fontWeight: '400' },
  detailHero: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 }, detailSource: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 }, detailLabel: { color: '#748DA8', fontSize: 12, lineHeight: 18 }, noteCard: { paddingTop: 22, paddingBottom: 12 }, noteText: { color: colors.navy, fontSize: 14, lineHeight: 21, marginTop: 5 }, detailHint: { color: '#8AA0B2', fontSize: 11, lineHeight: 17, marginTop: 14 },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, marginBottom: 20 }, kind: { width: '48%', minHeight: 52, borderWidth: 1, borderColor: '#DFEBEE', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 7 }, selectedKind: { backgroundColor: '#E6F8F5', borderColor: colors.teal }, kindText: { flex: 1, color: colors.navy, fontSize: 11 }, formUnit: { fontSize: 12, color: colors.tealDark, marginBottom: 13 }, formParameter: { color: colors.navy, fontSize: 16, fontWeight: '600', marginTop: 18, marginBottom: 10 },
});
