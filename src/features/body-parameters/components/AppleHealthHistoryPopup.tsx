import React, { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { HEALTH_CATEGORIES, type HealthCategory } from '../domain/appleHealth';
import { toISO, addDays } from '../domain/dates';
import { observeAppleHealth, queryAppleHealthHistory } from '../services/appleHealth';
import { watchHealthDay } from '../services/appleHealthDayWatcher';
import { healthHistoryRange, type HealthHistoryReading, type HealthHistoryPage } from '../services/appleHealthHistoryReader';
import { createHistorySession, type HistoryView } from '../services/appleHealthHistorySession';

import AppleHealthReadAccessHelp from './AppleHealthReadAccessHelp';
import ArchivePopup from './ArchivePopup';
import { colors, Icon, TextField } from './ui';

const empty: HistoryView = { readings: [], hasMore: false, page: 0, busy: true, error: false, limited: false };
export default function AppleHealthHistoryPopup({ categoryId, onClose, onSavedHistory, readPage = queryAppleHealthHistory }: {
  categoryId: HealthCategory; onClose: () => void; onSavedHistory?: () => void;
  readPage?: (id: HealthCategory, from: string, to: string, excluded: readonly string[], snapshot: Date) => Promise<HealthHistoryPage>;
}) {
  const dailySteps = categoryId === 'HKQuantityTypeIdentifierStepCount';
  const [rolling, setRolling] = useState(true);
  const category = HEALTH_CATEGORIES.find(item => item.id === categoryId)!;
  const [period, setPeriod] = useState(() => ({ from: addDays(toISO(new Date()), -6), to: toISO(new Date()) }));
  const [from, setFrom] = useState(period.from), [to, setTo] = useState(period.to);
  const [filtersOpen, setFiltersOpen] = useState(false), [validation, setValidation] = useState('');
  const [view, setView] = useState<HistoryView>(empty);
  const [selected, setSelected] = useState<HealthHistoryReading | null>(null);
  const session = useRef<ReturnType<typeof createHistorySession> | null>(null);
  useEffect(() => {
    let cleanup = () => {};
    function resume() {
      cleanup(); setSelected(null);
      const today = toISO(new Date());
      if (dailySteps && rolling && period.to !== today) { const next = {from:addDays(today,-6),to:today}; setView(empty); setFrom(next.from); setTo(next.to); setPeriod(next); return; }
      let stopped = false;
      const controller = createHistorySession((excluded, snapshot) => readPage(categoryId, period.from, period.to, excluded, snapshot), setView);
      session.current = controller;
      controller.refresh();
      let removeObserver = () => {};
      const refresh = () => controller.autoRefresh();
      void observeAppleHealth([categoryId], refresh).then(remove => { if (stopped) remove(); else removeObserver = remove; }).catch(() => {});
      const timer = setInterval(refresh, 60_000);
      const stopDay = dailySteps ? watchHealthDay(resume) : () => {};
      cleanup = () => { if (stopped) return; stopped = true; controller.stop(); clearInterval(timer); stopDay(); removeObserver(); session.current = null; };
    }
    if (AppState.currentState === 'active') resume();
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') resume();
      else { cleanup(); cleanup = () => {}; setView(empty); setSelected(null); }
    });
    return () => { cleanup(); listener.remove(); };
  }, [categoryId, dailySteps, period, readPage, rolling]);
  const displayValue = (reading: HealthHistoryReading) => reading.value === undefined ? 'Sin lectura' : reading.value.toLocaleString('es-MX', { maximumFractionDigits: dailySteps ? 0 : 1 });
  const latest = view.readings[0];
  const groups = new Map<string, HealthHistoryReading[]>();
  for (const reading of view.readings) {
    const month = new Date(reading.start!).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    groups.set(month, [...(groups.get(month) ?? []), reading]);
  }
  function applyPeriod() {
    try { healthHistoryRange(from, to); setValidation(''); setRolling(false); setSelected(null); setView(empty); setPeriod({ from, to }); setFiltersOpen(false); }
    catch (error) { setValidation((error as Error).message); }
  }
  return <View style={s.root} testID="apple-health-history-screen"><ArchivePopup title={category.label.replace(' (último intervalo)', '')} titleTestID="apple-health-history-title" contentKey={selected?.uuid ?? `history-${view.page}`} onClose={onClose} onBack={() => selected ? setSelected(null) : onClose()} footer={<Text style={s.hint}>Apple Salud · solo lectura · datos locales temporales</Text>}>
    {selected ? <View testID="apple-health-history-detail">
      <Text style={s.large}>{displayValue(selected)}{selected.value !== undefined && <Text style={s.largeUnit}> {category.displayUnit}</Text>}</Text>
      {dailySteps && <Text style={s.date}>Total del día {selected.day ?? new Date(selected.start!).toLocaleDateString('es-MX')}{selected.day === toISO(new Date()) ? ' · parcial de hoy' : ''}</Text>}
      <Text style={s.date}>Inicio: {new Date(selected.start!).toLocaleString('es-MX')}</Text>
      <Text style={s.date}>Fin: {new Date(selected.end!).toLocaleString('es-MX')}</Text>
      <View style={s.source}><Icon name={/watch/i.test(selected.source || '') ? 'watch-outline' : 'heart-outline'} size={14} color="#86A0B0" /><Text style={s.text}>Fuente: {selected.source || 'Apple Salud'}</Text></View>
      {!!selected.timeZone && <Text style={s.text}>Zona horaria: {selected.timeZone}</Text>}
      {!!selected.sources?.length && <Text style={s.text}>Fuentes disponibles: {selected.sources.join(', ')}. La cifra es el total consolidado de Salud, no la suma por fuente.</Text>}
      {dailySteps && selected.value === undefined && <Text style={s.notice}>Sin total disponible o sin permiso de lectura; no significa cero pasos.</Text>}
      {selected.value === undefined && <AppleHealthReadAccessHelp categoryId={categoryId} />}
      {!!selected.stage && <Text style={s.text}>Etapa: {selected.stage}</Text>}
      <Text style={s.notice}>{dailySteps ? 'Total diario calculado por Apple Salud con sus estadísticas acumuladas y consolidación de fuentes. Hoy incluye los datos disponibles hasta la consulta. Los días se calculan en la zona horaria actual del iPhone.' : 'Muestra registrada en Apple Salud. Actividad y sueño corresponden a cada intervalo, no a un total diario o nocturno. Distintas fuentes pueden registrar intervalos superpuestos; no se suman.'}</Text>
    </View> : <View testID="apple-health-history-list">
      <View style={s.tools}><Text style={s.hint}>{dailySteps ? 'Historial diario de pasos' : 'Historial de Apple Salud'}</Text><Pressable testID="apple-health-history-filter" accessibilityRole="button" accessibilityLabel="Filtrar fechas de Apple Salud" onPress={() => setFiltersOpen(open => !open)} style={s.iconButton}><Icon name="filter" size={23} color={colors.tealDark} /></Pressable></View>
      {filtersOpen && <View style={s.filters}>
        <TextField testID="apple-health-history-from" label="Desde · AAAA-MM-DD" value={from} onChangeText={setFrom} autoCapitalize="none" />
        <TextField testID="apple-health-history-to" label="Hasta · AAAA-MM-DD" value={to} onChangeText={setTo} autoCapitalize="none" />
        {!!validation && <Text accessibilityLiveRegion="polite" style={s.error}>{validation}</Text>}
        <Pressable testID="apple-health-history-apply" accessibilityRole="button" onPress={applyPeriod} style={s.button}><Text style={s.link}>Aplicar período</Text></Pressable>
      </View>}
      <Text style={s.hint}>{period.from} — {period.to} · hasta 31 días por consulta</Text>
      {!!latest && <View style={s.hero}><Text style={s.large}>{displayValue(latest)}{latest.value !== undefined && <Text style={s.largeUnit}> {category.displayUnit}</Text>}</Text><Text style={s.date}>{dailySteps ? (latest.day === toISO(new Date()) ? 'Total de hoy · parcial' : 'Total diario') : view.page ? 'Primer registro de esta página' : 'Último registro del período'} · {dailySteps ? new Date(latest.start!).toLocaleDateString('es-MX') : new Date(latest.start!).toLocaleString('es-MX')}</Text><Text style={s.text}>{latest.source || 'Apple Salud'}{latest.stage ? ` · ${latest.stage}` : ''}</Text></View>}
      {view.busy && <Text accessibilityLiveRegion="polite" style={s.notice}>Consultando historial…</Text>}
      {view.error && <Text accessibilityLiveRegion="polite" style={s.error}>No se pudo consultar el historial. Revisa Salud y vuelve a intentar; no se muestran valores de ejemplo.</Text>}
      {!view.busy && !view.error && !view.readings.length && <View style={s.empty}><Icon name="activity" size={28} color={colors.teal} /><Text style={s.emptyTitle}>Sin lecturas disponibles</Text><Text style={s.notice}>No hay muestras accesibles en este período o no hay permiso de lectura. Apple no distingue ambos casos. Revisa Salud o cambia las fechas.</Text></View>}
      {!view.busy && !view.error && (!view.readings.length || view.readings.some(reading => reading.value === undefined)) && <AppleHealthReadAccessHelp categoryId={categoryId} />}
      {Array.from(groups, ([month, readings]) => <View key={month}><Text style={s.month}>{month}</Text>{readings.map(reading => <Pressable key={reading.uuid} testID={`apple-health-history-row-${reading.uuid}`} accessibilityRole="button" onPress={() => setSelected(reading)} style={s.row}>
        <View style={s.main}><Text style={s.date}>{dailySteps ? new Date(reading.start!).toLocaleDateString('es-MX', {weekday:'short',day:'numeric',month:'short',year:'numeric'}) : new Date(reading.start!).toLocaleString('es-MX')}</Text><Text style={s.sourceText}>{reading.source || 'Apple Salud'}{reading.stage ? ` · ${reading.stage}` : ''}</Text></View>
        <Text style={s.value}>{displayValue(reading)}{reading.value !== undefined && <Text style={s.unit}> {category.displayUnit}</Text>}</Text><Icon name="chevron" size={17} color="#6D89A0" />
      </Pressable>)}</View>)}
      {!dailySteps && <View style={s.pager}>
        <Pressable testID="apple-health-history-previous" accessibilityRole="button" disabled={view.busy || !view.page} onPress={() => session.current?.previous()} style={[s.button, (!view.page || view.busy) && s.disabled]}><Text style={s.link}>Anterior</Text></Pressable>
        <Text style={s.hint}>Página {view.page + 1}</Text>
        <Pressable testID="apple-health-history-next" accessibilityRole="button" disabled={view.busy || !view.hasMore || view.limited} onPress={() => session.current?.next()} style={[s.button, (view.busy || !view.hasMore || view.limited) && s.disabled]}><Text style={s.link}>Siguiente</Text></Pressable>
      </View>}
      {view.limited && <Text style={s.notice}>Se alcanzó el límite de 1,000 muestras por consulta. Acota las fechas para consultar otras lecturas.</Text>}
      <Pressable testID="apple-health-history-refresh" accessibilityRole="button" disabled={view.busy} onPress={() => session.current?.refresh()} style={s.button}><Text style={s.link}>Actualizar historial</Text></Pressable>
      <Text style={s.notice}>{dailySteps ? 'Un total consolidado por día, hasta 31 días por consulta. Hoy es parcial y se actualiza automáticamente. Sin lectura no significa cero. Zona horaria actual del iPhone.' : '50 muestras por página. La consulta automática actualiza la primera página; al navegar, el historial permanece estable hasta actualizar.'} Depende de la sincronización de Salud, sin garantía de tiempo real.</Text>
      {categoryId === 'HKQuantityTypeIdentifierHeartRate' && onSavedHistory && <Pressable testID="apple-health-saved-history" accessibilityRole="button" onPress={onSavedHistory} style={s.button}><Text style={s.link}>Ver registros guardados de Klini</Text></Pressable>}
    </View>}
  </ArchivePopup></View>;
}
const s = StyleSheet.create({
  root: { flex: 1 }, tools: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  hero: { marginTop: 20, marginBottom: 26 }, large: { color: colors.navy, fontSize: 42, lineHeight: 50, fontWeight: '700', flexShrink: 1 }, largeUnit: { color: '#748DA8', fontSize: 20, fontWeight: '400' },
  date: { color: '#748DA8', fontSize: 12, lineHeight: 18, marginTop: 4 }, text: { color: '#86A0B0', fontSize: 12, lineHeight: 18, flexShrink: 1 }, source: { flexDirection: 'row', alignItems: 'center', gap: 5, marginVertical: 8 },
  hint: { color: '#748DA8', fontSize: 11, lineHeight: 17 }, notice: { color: '#748DA8', fontSize: 12, lineHeight: 18, marginVertical: 12 }, error: { color: colors.danger, fontSize: 12, lineHeight: 18, marginVertical: 12 },
  month: { color: '#879EB3', fontSize: 12, lineHeight: 18, marginTop: 8, marginBottom: 6, textTransform: 'capitalize' }, row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 15, minHeight: 65, borderBottomWidth: 1, borderBottomColor: '#E9F0F3' },
  main: { flex: 1, minWidth: 0 }, sourceText: { color: '#8AA0B2', fontSize: 10, lineHeight: 15, marginTop: 4 }, value: { color: colors.navy, fontSize: 16, fontWeight: '600', flexShrink: 1, maxWidth: '42%', textAlign: 'right' }, unit: { color: '#748DA8', fontSize: 10, fontWeight: '400' },
  filters: { gap: 10, paddingVertical: 12 }, button: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 }, link: { color: colors.tealDark, fontSize: 12 }, pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }, disabled: { opacity: .4 },
  empty: { paddingVertical: 24, alignItems: 'center' }, emptyTitle: { color: colors.navy, fontSize: 16, fontWeight: '600', marginTop: 10 },
});
