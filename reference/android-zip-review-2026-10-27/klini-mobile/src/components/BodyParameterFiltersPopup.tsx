import React, { useEffect, useState } from 'react';
import { BackHandler, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, Icon } from './ui';
import { bodyParameterDefinition, emptyBodyParameterFilters, validateBodyParameterFilters, type BodyParameterFilters, type BodyParameterKind, type BodyParameterSource } from '../domain/bodyParameters';
import { parseDate, todayISO } from '../domain/dates';
import { filterDateToISO } from '../domain/historyFilters';

const displayDate = (iso: string) => iso ? iso.split('-').reverse().join('/') : '';
const sources: { value: BodyParameterSource | 'all'; label: string; id: string }[] = [
  { value: 'all', label: 'Todas', id: 'all' },
  { value: 'Manual', label: 'Manual', id: 'manual' },
  { value: 'Báscula inteligente', label: 'Báscula inteligente', id: 'smart-scale' },
  { value: 'Apple Watch', label: 'Apple Watch', id: 'apple-watch' },
  { value: 'Abbott', label: 'Abbott', id: 'abbott' },
  { value: 'Oxímetro', label: 'Oxímetro', id: 'oximeter' },
];

export default function BodyParameterFiltersPopup({ kind, value, onApply, onClose }: {
  kind?: BodyParameterKind;
  value: BodyParameterFilters;
  onApply: (next: BodyParameterFilters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(() => ({ ...value }));
  const [from, setFrom] = useState(() => displayDate(value.from));
  const [to, setTo] = useState(() => displayDate(value.to));
  const [open, setOpen] = useState<'from' | 'to' | 'source' | null>(null);
  const [month, setMonth] = useState(() => parseDate(value.from || todayISO()));
  const [error, setError] = useState('');
  const definition = kind ? bodyParameterDefinition(kind) : null;

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (open) setOpen(null); else onClose();
      return true;
    });
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (open) setOpen(null); else onClose();
    };
    if (Platform.OS === 'web') window.addEventListener('keydown', escape, true);
    return () => { subscription.remove(); if (Platform.OS === 'web') window.removeEventListener('keydown', escape, true); };
  }, [onClose, open]);

  function apply() {
    const start = filterDateToISO(from), end = filterDateToISO(to);
    if (start === null || end === null) { setError('Usa fechas válidas con formato dd/mm/aaaa.'); return; }
    try {
      const next = validateBodyParameterFilters({ ...draft, from: start, to: end }, kind);
      Keyboard.dismiss(); onApply(next);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Revisa los filtros.'); }
  }
  function showCalendar(field: 'from' | 'to') {
    Keyboard.dismiss();
    const current = filterDateToISO(field === 'from' ? from : to);
    setMonth(parseDate(current || todayISO())); setOpen(field);
  }
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const offset = (first.getDay() + 6) % 7;
  return <KeyboardAvoidingView testID="body-filters-overlay" style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Pressable testID="body-filters-backdrop" accessibilityRole="button" accessibilityLabel="Cerrar filtros sin aplicar" style={StyleSheet.absoluteFill} onPress={onClose} />
    <View testID="body-filters-popup" role="dialog" accessibilityLabel="Filtros de parámetros corporales" accessibilityViewIsModal style={s.card}>
      <View style={s.header}>
        {open && <Pressable testID="body-filter-picker-back" accessibilityRole="button" accessibilityLabel="Volver a filtros" onPress={() => setOpen(null)} style={s.back}><Icon name="back" size={18} color={colors.teal} /></Pressable>}
        <Text accessibilityRole="header" style={s.title}>{open === 'from' ? 'Fecha desde' : open === 'to' ? 'Fecha hasta' : open === 'source' ? 'Fuente' : 'Filtros'}</Text>
        <Pressable testID="body-filters-close" accessibilityRole="button" accessibilityLabel="Cerrar filtros" onPress={onClose} style={s.close}><Icon name="close" size={19} color="#7D94A8" /></Pressable>
      </View>
      <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content} showsVerticalScrollIndicator>
        {!open && <>
          <View style={s.pair}>
            {(['from', 'to'] as const).map(field => <View key={field} style={s.dateBox}>
              <Text style={s.dateLabel}>{field === 'from' ? 'Desde' : 'Hasta'}</Text>
              <View style={s.dateRow}>
                <TextInput testID={`body-filter-${field}`} accessibilityLabel={field === 'from' ? 'Fecha desde' : 'Fecha hasta'} placeholder="dd/mm/aaaa" placeholderTextColor="#8FA6B7" value={field === 'from' ? from : to} onChangeText={field === 'from' ? setFrom : setTo} maxLength={10} keyboardType="numbers-and-punctuation" underlineColorAndroid="transparent" style={[s.input, s.dateInput, Platform.OS === 'web' && { outlineWidth: 0 }]} />
                <Pressable testID={`body-filter-calendar-${field}`} accessibilityRole="button" accessibilityLabel={`Elegir fecha ${field === 'from' ? 'desde' : 'hasta'}`} style={s.calendarTarget} onPress={() => showCalendar(field)}><Icon name="calendar" size={17} color={colors.teal} /></Pressable>
              </View>
            </View>)}
          </View>
          <Pressable testID="body-filter-source" accessibilityRole="button" accessibilityLabel="Seleccionar fuente" onPress={() => { Keyboard.dismiss(); setOpen('source'); }} style={s.select}><Text style={s.sourceLabel}>Fuente</Text><Text numberOfLines={1} style={s.sourceValue}>{sources.find(item => item.value === draft.source)?.label || 'Todas'}</Text><Icon name="chevronDown" size={17} color={colors.teal} /></Pressable>
          {definition && <><Text style={[s.label, s.section]}>{kind === 'blood-pressure' ? 'Presión sistólica' : definition.label} ({definition.unit})</Text>
          <View style={s.pair}>
            {(['min', 'max'] as const).map(field => <TextInput key={field} testID={`body-filter-${field}`} accessibilityLabel={field === 'min' ? 'Valor mínimo' : 'Valor máximo'} placeholder={field === 'min' ? 'Mínimo' : 'Máximo'} placeholderTextColor="#93A9BA" value={draft[field]} onChangeText={text => setDraft(current => ({ ...current, [field]: text }))} keyboardType="decimal-pad" maxLength={12} style={[s.input, s.rangeInput, Platform.OS === 'web' && { outlineWidth: 0 }]} />)}
          </View></>}
          {!!error && <Text testID="body-filters-error" accessibilityRole="alert" style={s.error}>{error}</Text>}
          <View style={s.actions}>
            <Pressable testID="body-filters-clear" accessibilityRole="button" accessibilityLabel="Borrar filtros" onPress={() => { Keyboard.dismiss(); onApply({ ...emptyBodyParameterFilters }); }} style={s.clear}><Text style={s.clearText}>borrar filtros</Text></Pressable>
            <Pressable testID="body-filters-apply" accessibilityRole="button" accessibilityLabel="Aplicar filtros" onPress={apply} style={s.apply} hitSlop={6}><Text style={s.applyText}>Aplicar</Text></Pressable>
          </View>
        </>}
        {open === 'source' && sources.map(item => <Pressable key={item.id} testID={`body-filter-source-${item.id}`} accessibilityRole="button" accessibilityState={{ selected: draft.source === item.value }} onPress={() => { setDraft(current => ({ ...current, source: item.value })); setOpen(null); }} style={s.sourceOption}><Text style={s.selectText}>{item.label}</Text>{draft.source === item.value && <Icon name="check" size={17} color={colors.teal} />}</Pressable>)}
        {(open === 'from' || open === 'to') && <View testID="body-filter-calendar">
          <View style={s.monthHeader}>
            <Pressable testID="body-calendar-previous" accessibilityRole="button" accessibilityLabel="Mes anterior" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1, 12))} style={s.monthArrow}><Icon name="back" size={18} /></Pressable>
            <Text style={s.monthLabel}>{month.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</Text>
            <Pressable testID="body-calendar-next" accessibilityRole="button" accessibilityLabel="Mes siguiente" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1, 12))} style={s.monthArrow}><Icon name="chevron" size={18} /></Pressable>
          </View>
          <View style={s.days}>
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((label, index) => <Text key={index} style={s.weekday}>{label}</Text>)}
            {Array.from({ length: 42 }, (_, index) => {
              const date = new Date(month.getFullYear(), month.getMonth(), index - offset + 1, 12);
              const formatted = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
              const selected = formatted === (open === 'from' ? from : to);
              return <Pressable key={index} accessibilityRole="button" accessibilityLabel={formatted} accessibilityState={{ selected }} style={s.day} onPress={() => { if (open === 'from') setFrom(formatted); else setTo(formatted); setError(''); setOpen(null); }}><View style={[s.dayCircle, selected && s.daySelected]}><Text style={{ fontSize: 12, color: selected ? 'white' : date.getMonth() === month.getMonth() ? colors.navy : '#A6B8C5' }}>{date.getDate()}</Text></View></Pressable>;
            })}
          </View>
        </View>}
      </ScrollView>
    </View>
  </KeyboardAvoidingView>;
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 100, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: 'rgba(8,36,65,.35)' },
  card: { width: '100%', maxWidth: 350, maxHeight: '94%', flexShrink: 1, backgroundColor: 'white', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 12, boxShadow: '0 8px 28px rgba(8,36,65,.12)' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 }, title: { flex: 1, fontSize: 18, lineHeight: 24, fontWeight: '600', color: colors.navy },
  close: { width: 38, height: 40, alignItems: 'center', justifyContent: 'center' }, back: { width: 30, height: 40, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexShrink: 1 }, content: { paddingBottom: 2 }, label: { color: colors.navy, fontSize: 12, marginBottom: 6 }, section: { marginTop: 20 }, pair: { flexDirection: 'row', gap: 8 },
  dateBox: { flex: 1, minWidth: 0 }, dateLabel: { color: '#667E92', fontSize: 12, lineHeight: 17, marginBottom: 4 }, dateRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#D8E2EC', borderRadius: 8 },
  input: { color: colors.navy, fontSize: 12, minWidth: 0, paddingVertical: 0 }, dateInput: { flex: 1, height: 36, paddingLeft: 10 }, calendarTarget: { width: 32, height: 36, alignItems: 'center', justifyContent: 'center' },
  select: { minHeight: 40, flexDirection: 'row', alignItems: 'center', marginTop: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E1E9EF', gap: 10 }, sourceLabel: { color: '#5C758A', fontSize: 12 }, sourceValue: { flex: 1, minWidth: 0, textAlign: 'right', fontSize: 12, color: '#667E92' }, selectText: { flex: 1, fontSize: 12, color: '#65879C' },
  rangeInput: { flex: 1, minHeight: 38, paddingHorizontal: 10, backgroundColor: 'white', borderColor: '#D8E2EC', borderWidth: 1, borderRadius: 8 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }, apply: { minWidth: 76, minHeight: 32, paddingHorizontal: 18, borderRadius: 20, backgroundColor: '#DFF5F7', alignItems: 'center', justifyContent: 'center' }, applyText: { color: colors.tealDark, fontSize: 12, fontWeight: '500' },
  clear: { minHeight: 40, justifyContent: 'center', paddingRight: 12 }, clearText: { color: colors.tealDark, fontSize: 11 }, error: { color: colors.danger, fontSize: 12, lineHeight: 17, marginTop: 12 },
  sourceOption: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: 8, borderBottomColor: '#E9F3F5', borderBottomWidth: 1 },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, monthArrow: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' }, monthLabel: { color: colors.navy, fontSize: 13, textTransform: 'capitalize' },
  days: { flexDirection: 'row', flexWrap: 'wrap' }, weekday: { width: '14.2857%', lineHeight: 28, textAlign: 'center', color: '#8AA0B1', fontSize: 11 }, day: { width: '14.2857%', height: 36, alignItems: 'center', justifyContent: 'center' }, dayCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, daySelected: { backgroundColor: colors.teal },
});
