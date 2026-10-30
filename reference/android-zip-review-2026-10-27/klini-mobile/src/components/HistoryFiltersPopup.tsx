import React, { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, Icon } from './ui';
import { emptyHistoryFilters, filterDateToISO, type HistoryFilters } from '../domain/historyFilters';
import { parseDate, todayISO } from '../domain/dates';
import { specialtyOptions, specialtySearchKey } from '../domain/medicalSpecialties';

const displayDate = (iso: string) => iso ? iso.split('-').reverse().join('/') : '';
export default function HistoryFiltersPopup({ value, specialties, institutions, onApply, onClose }: {
  value: HistoryFilters; specialties: string[]; institutions: string[];
  onApply: (filters: HistoryFilters) => void; onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const [from, setFrom] = useState(displayDate(value.from));
  const [to, setTo] = useState(displayDate(value.to));
  const [open, setOpen] = useState<'from' | 'to' | 'specialty' | 'institution' | null>(null);
  const [month, setMonth] = useState(() => parseDate(todayISO()));
  const [error, setError] = useState('');
  const [specialtyQuery, setSpecialtyQuery] = useState('');
  const availableSpecialties = specialtyOptions(specialties).filter(option => specialtySearchKey(option).includes(specialtySearchKey(specialtyQuery)));
  function apply() {
    const start = filterDateToISO(from), end = filterDateToISO(to);
    if (start === null || end === null) return setError('Escribe fechas válidas con formato dd/mm/aaaa.');
    if (start && end && start > end) return setError('La fecha Desde debe ser anterior o igual a Hasta.');
    onApply({ ...draft, from: start, to: end });
  }
  function calendar(field: 'from' | 'to') {
    Keyboard.dismiss();
    const current = filterDateToISO(field === 'from' ? from : to);
    setMonth(parseDate(current || todayISO()));
    setOpen(open === field ? null : field);
  }
  function selectField(field: 'specialty' | 'institution', label: string, placeholder: string) {
    return <View style={s.section}>
      <Text style={s.label}>{label}</Text>
      <Pressable testID={`filter-${field}`} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded: open === field }} onPress={() => { Keyboard.dismiss(); setSpecialtyQuery(''); setOpen(field); }} style={s.select}>
        <Text style={s.value}>{draft[field] || placeholder}</Text><Icon name={open === field ? 'chevronUp' : 'chevronDown'} size={16} color={colors.teal} />
      </Pressable>

    </View>;
  }
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const offset = (first.getDay() + 6) % 7;
  return <Modal transparent animationType="fade" onRequestClose={() => open ? setOpen(null) : onClose()}>
    <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar filtros sin aplicar" onPress={onClose} style={StyleSheet.absoluteFill} />
      <View pointerEvents={open ? 'none' : 'auto'} accessibilityElementsHidden={!!open} importantForAccessibility={open ? 'no-hide-descendants' : 'auto'} style={[s.card, s.filterCard]} accessibilityViewIsModal testID="history-filter-panel">
        <View style={s.header}><View style={{ flex: 1 }}><Text style={s.title}>Filtros</Text></View><Pressable testID="history-filter-close" accessibilityRole="button" accessibilityLabel="Cerrar filtros" onPress={onClose} style={s.close}><Icon name="close" size={18} /></Pressable></View>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={s.label}>Fecha</Text>
          <View style={s.dates}>
            {(['from', 'to'] as const).map(field => <View key={field} style={{ flex: 1, minWidth: 0 }}><Text style={s.dateLabel}>{field === 'from' ? 'Desde' : 'Hasta'}</Text><View style={s.dateInput}>
              <TextInput testID={`filter-${field}`} accessibilityLabel={field === 'from' ? 'Fecha desde' : 'Fecha hasta'} value={field === 'from' ? from : to} onChangeText={field === 'from' ? setFrom : setTo} placeholder="dd/mm/aaaa" placeholderTextColor="#8BA0B1" maxLength={10} keyboardType="numbers-and-punctuation" style={s.input} />
              <Pressable testID={`calendar-${field}`} accessibilityRole="button" accessibilityLabel={`Elegir fecha ${field === 'from' ? 'desde' : 'hasta'}`} onPress={() => calendar(field)} style={s.calendarButton}><Icon name="calendar" size={16} color={colors.teal} /></Pressable>
            </View></View>)}
          </View>
          {selectField('specialty', 'Especialidad', 'Todas las especialidades')}
          {selectField('institution', 'Institución u hospital', 'Cualquiera')}
          {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
        </ScrollView>
        <View style={s.footer}><Pressable testID="history-filter-reset" accessibilityRole="button" accessibilityLabel="Limpiar filtros" onPress={() => { setDraft(emptyHistoryFilters); setFrom(''); setTo(''); setOpen(null); setError(''); }} style={s.clear}><Text style={{ color: colors.teal, fontSize: 13 }}>Limpiar</Text></Pressable><Pressable testID="history-filter-done" accessibilityRole="button" accessibilityLabel="Aplicar filtros" onPress={apply} style={s.apply}><Text style={{ color: colors.navy, fontSize: 12 }}>Aplicar</Text></Pressable></View>
      </View>
      {!!open && <View style={[StyleSheet.absoluteFill, s.selectorOverlay]}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Cerrar selección" onPress={() => setOpen(null)} />
        <View style={[s.card, open === 'specialty' && s.specialtyCard]} accessibilityViewIsModal testID="history-filter-selector">
          <View style={s.header}><Text style={[s.label, { flex: 1 }]}>{open === 'from' ? 'Fecha desde' : open === 'to' ? 'Fecha hasta' : open === 'specialty' ? 'Especialidad' : 'Institución u hospital'}</Text><Pressable testID="history-filter-selector-close" accessibilityRole="button" accessibilityLabel="Cerrar selección" onPress={() => setOpen(null)} style={s.close}><Icon name="close" size={18} /></Pressable></View>
          {open === 'specialty' && <TextInput testID="specialty-catalog-search" accessibilityLabel="Buscar especialidad o subespecialidad" placeholder="Buscar especialidad o subespecialidad" placeholderTextColor="#68839B" value={specialtyQuery} onChangeText={setSpecialtyQuery} style={[s.select, { fontSize: 12, color: colors.navy, marginTop: 0, marginBottom: 8 }]} />}
          <ScrollView testID="filter-options-scroll" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator persistentScrollbar nestedScrollEnabled style={open === 'specialty' ? s.specialtyList : undefined}>
          {(open === 'from' || open === 'to') && <View style={s.calendar}>
            <View style={s.monthRow}><Pressable accessibilityRole="button" accessibilityLabel="Mes anterior" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1, 12))} style={s.monthArrow}><Icon name="back" size={18} /></Pressable><Text style={s.label}>{month.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</Text><Pressable accessibilityRole="button" accessibilityLabel="Mes siguiente" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1, 12))} style={s.monthArrow}><Icon name="chevronRight" size={18} /></Pressable></View>
            <View style={s.days}>{['L','M','X','J','V','S','D'].map(day => <Text key={day} style={s.weekday}>{day}</Text>)}{Array.from({ length: 42 }, (_, index) => {
              const date = new Date(month.getFullYear(), month.getMonth(), index - offset + 1, 12);
              const text = `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}`;
              const selected = text === (open === 'from' ? from : to);
              return <Pressable key={index} accessibilityRole="button" accessibilityLabel={text} accessibilityState={{ selected }} onPress={() => { if (open === 'from') setFrom(text); else setTo(text); setOpen(null); }} style={s.day}><View style={[s.dayCircle, selected && { backgroundColor: colors.teal }]}><Text style={{ fontSize: 11, color: selected ? 'white' : date.getMonth() === month.getMonth() ? colors.navy : '#A4B4C1' }}>{date.getDate()}</Text></View></Pressable>;
            })}</View>
          </View>}
      {(open === 'specialty' || open === 'institution') && <View style={s.options}>
        {['', ...(open === 'specialty' ? availableSpecialties : institutions)].map(option => <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: draft[open! as 'specialty' | 'institution'] === option }} onPress={() => { Keyboard.dismiss(); setDraft(current => ({ ...current, [open!]: option })); setOpen(null); }} style={s.option}><Text style={s.value}>{option || (open === 'specialty' ? 'Todas las especialidades' : 'Cualquiera')}</Text>{draft[open! as 'specialty' | 'institution'] === option && <Icon name="check" size={16} color={colors.teal} />}</Pressable>)}
        {open === 'specialty' && !availableSpecialties.length && <Text style={s.empty}>No se encontraron especialidades.</Text>}
        {open === 'institution' && !institutions.length && <Text style={s.empty}>Aún no hay instituciones registradas.</Text>}
      </View>}
          </ScrollView>
        </View>
      </View>}
    </KeyboardAvoidingView>
  </Modal>;
}
const s = StyleSheet.create({
  specialtyCard: { height: 440 },
  specialtyList: { flex: 1, minHeight: 0 },
  selectorOverlay: { justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: 'rgba(8,25,39,.24)' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 12, backgroundColor: 'rgba(8,25,39,.38)' },
  card: { width: '100%', maxWidth: 310, maxHeight: '88%', borderRadius: 18, padding: 18, backgroundColor: 'white', boxShadow: '0 12px 30px rgba(8,36,65,.14)' },
  filterCard: { maxWidth: 360, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24 },
  title: { color: colors.navy, fontSize: 22, fontWeight: '600' },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#E9F5F8', alignItems: 'center', justifyContent: 'center' },
  label: { color: colors.navy, fontSize: 13, fontWeight: '500', lineHeight: 19 },
  dates: { flexDirection: 'row', gap: 10, marginTop: 3 },
  dateLabel: { color: '#738BA2', fontSize: 11, marginBottom: 5 },
  dateInput: { flexDirection: 'row', alignItems: 'center', height: 37, backgroundColor: '#F3FBFC', borderRadius: 9, paddingLeft: 12 },
  input: { flex: 1, minWidth: 0, color: colors.navy, fontSize: 12, paddingVertical: 0 },
  calendarButton: { width: 30, height: 35, alignItems: 'center', justifyContent: 'center' },
  section: { marginTop: 24 },
  select: { flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 38, paddingHorizontal: 12, borderRadius: 9, backgroundColor: '#F3FBFC', marginTop: 7 },
  value: { color: '#68839B', fontSize: 12, flex: 1, lineHeight: 18 },
  options: { padding: 8, borderColor: '#DEEFF3', borderWidth: 1, borderRadius: 9, marginTop: 5 },
  option: { minHeight: 42, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 3 },
  empty: { color: '#849AB0', fontSize: 11, lineHeight: 16, padding: 4 },
  calendar: { marginTop: 10, padding: 4, borderWidth: 1, borderColor: '#DEEFF3', borderRadius: 12 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthArrow: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  days: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.2857%', textAlign: 'center', color: '#849AB0', fontSize: 10, lineHeight: 24 },
  day: { width: '14.2857%', height: 32, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 28 },
  clear: { minHeight: 40, justifyContent: 'center', paddingRight: 12 },
  apply: { minHeight: 36, borderRadius: 20, backgroundColor: '#DDF3F5', paddingHorizontal: 23, justifyContent: 'center' },
  error: { color: colors.danger, fontSize: 11, lineHeight: 17, marginTop: 10 },
});
