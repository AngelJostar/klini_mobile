import React, { useEffect, useState } from 'react';
import { BackHandler, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { bodyParameterDefinition, type BodyParameterDraft } from '../domain/bodyParameters';
import { parseDate, todayISO, toISO } from '../domain/dates';
import { colors, Icon } from './ui';

function dateLabel(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || 'Seleccionar';
  const date = parseDate(value);
  return toISO(date) === value ? date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '') : value;
}

export default function BodyParameterEntryPopup({ draft, onChange, onClose, onSave, error }: { draft: BodyParameterDraft; onChange: (value: BodyParameterDraft) => void; onClose: () => void; onSave: () => void; error: string }) {
  const definition = bodyParameterDefinition(draft.kind);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [month, setMonth] = useState(() => parseDate(draft.date));
  const update = (patch: Partial<BodyParameterDraft>) => onChange({ ...draft, ...patch });
  useEffect(() => {
    const back = () => { if (calendarOpen) setCalendarOpen(false); else onClose(); return true; };
    const subscription = BackHandler.addEventListener('hardwareBackPress', back);
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopImmediatePropagation(); back();
    };
    if (Platform.OS === 'web') window.addEventListener('keydown', escape, true);
    return () => { subscription.remove(); if (Platform.OS === 'web') window.removeEventListener('keydown', escape, true); };
  }, [calendarOpen, onClose]);

  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const offset = (first.getDay() + 6) % 7;
  return <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <Pressable testID="body-entry-backdrop" style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Cancelar registro corporal" onPress={onClose} />
    <View testID="body-entry-popup" role="dialog" accessibilityLabel="Agregar registro" accessibilityViewIsModal style={s.card}>
      <View style={s.header}>
        {calendarOpen && <Pressable testID="body-entry-date-back" accessibilityRole="button" accessibilityLabel="Volver al registro" onPress={() => { Keyboard.dismiss(); setCalendarOpen(false); }} style={s.back}><Icon name="back" size={19} /></Pressable>}
        <Text accessibilityRole="header" style={s.title}>{calendarOpen ? 'Fecha' : 'Agregar registro'}</Text>
        <Pressable testID="body-entry-close" accessibilityRole="button" accessibilityLabel="Cancelar registro corporal" onPress={onClose} style={s.close} hitSlop={6}><Icon name="close" size={18} color="#7D94AA" /></Pressable>
      </View>
      <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
        {calendarOpen ? <>
          <TextInput testID="body-entry-date-input" accessibilityLabel="Fecha del registro en formato AAAA-MM-DD" value={draft.date} onChangeText={date => update({ date })} placeholder="AAAA-MM-DD" maxLength={10} keyboardType="numbers-and-punctuation" underlineColorAndroid="transparent" style={[s.dateInput, s.webInput]} />
          <View style={s.monthHeader}>
            <Pressable testID="body-entry-calendar-previous" accessibilityRole="button" accessibilityLabel="Mes anterior" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1, 12))} style={s.monthArrow}><Icon name="back" size={18} /></Pressable>
            <Text style={s.monthLabel}>{month.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</Text>
            <Pressable testID="body-entry-calendar-next" accessibilityRole="button" accessibilityLabel="Mes siguiente" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1, 12))} style={s.monthArrow}><Icon name="chevron" size={18} /></Pressable>
          </View>
          <View style={s.days}>
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((label, index) => <Text key={index} style={s.weekday}>{label}</Text>)}
            {Array.from({ length: 42 }, (_, index) => {
              const date = new Date(month.getFullYear(), month.getMonth(), index - offset + 1, 12);
              const value = toISO(date), selected = value === draft.date, disabled = value > todayISO() || date.getFullYear() < 1900;
              return <Pressable key={value} testID={`body-entry-calendar-day-${value}`} accessibilityRole="button" accessibilityLabel={dateLabel(value)} accessibilityState={{ selected, disabled }} disabled={disabled} style={s.day} onPress={() => { Keyboard.dismiss(); update({ date: value }); setCalendarOpen(false); }}><View style={[s.dayCircle, selected && s.daySelected]}><Text style={[s.dayText, (disabled || date.getMonth() !== month.getMonth()) && s.dayMuted, selected && s.selectedText]}>{date.getDate()}</Text></View></Pressable>;
            })}
          </View>
          <Pressable testID="body-entry-date-done" accessibilityRole="button" accessibilityLabel="Confirmar fecha" onPress={() => { Keyboard.dismiss(); setCalendarOpen(false); }} style={s.save}><Text style={s.saveText}>Listo</Text></Pressable>
        </> : <>
          <View style={s.parameter}><Icon name={draft.kind === 'heart-rate' ? 'fitness-outline' : definition.icon} size={23} color={colors.teal} /><Text testID="body-entry-parameter" style={s.parameterName}>{definition.label}</Text></View>
          <Text style={s.label}>Valor</Text>
          <View style={s.valueBox}>
            <TextInput testID="body-form-value" accessibilityLabel={draft.kind === 'blood-pressure' ? 'Presión sistólica' : `Valor de ${definition.label.toLowerCase()}`} autoFocus value={draft.value} onChangeText={value => update({ value })} placeholder="—" placeholderTextColor="#8DA5B8" keyboardType="decimal-pad" maxLength={7} underlineColorAndroid="transparent" style={[s.valueInput, s.webInput]} />
            {draft.kind === 'blood-pressure' && <><Text style={s.divider}>/</Text><TextInput testID="body-form-secondary" accessibilityLabel="Presión diastólica" value={draft.secondary} onChangeText={secondary => update({ secondary })} placeholder="—" placeholderTextColor="#8DA5B8" keyboardType="number-pad" maxLength={3} underlineColorAndroid="transparent" style={[s.valueInput, s.webInput]} /></>}
            <Text style={s.unit}>{definition.unit}</Text>
          </View>
          <View style={s.pair}>
            <View style={s.pairField}><Text style={s.label}>Fecha</Text><Pressable testID="body-form-date" accessibilityRole="button" accessibilityLabel={`Fecha del registro: ${dateLabel(draft.date)}`} onPress={() => { Keyboard.dismiss(); const current = /^\d{4}-\d{2}-\d{2}$/.test(draft.date) ? parseDate(draft.date) : new Date(); setMonth(current); setCalendarOpen(true); }} style={s.smallField}><Icon name="calendar" size={17} color="#7894AC" /><Text numberOfLines={1} style={s.dateValue}>{dateLabel(draft.date)}</Text></Pressable></View>
            <View style={s.pairField}><Text style={s.label}>Hora</Text><View style={s.smallField}><Icon name="clock" size={17} color="#7894AC" /><TextInput testID="body-form-time" accessibilityLabel="Hora del registro" value={draft.time} onChangeText={time => update({ time })} placeholder="HH:mm" maxLength={5} keyboardType="numbers-and-punctuation" underlineColorAndroid="transparent" style={[s.timeInput, s.webInput]} /></View></View>
          </View>
          <Text style={s.label}>Nota (opcional)</Text>
          <TextInput testID="body-form-note" accessibilityLabel="Nota del registro corporal" value={draft.note ?? ''} onChangeText={note => update({ note })} placeholder="Escribe una nota…" placeholderTextColor="#8DA5B8" multiline maxLength={500} textAlignVertical="top" underlineColorAndroid="transparent" style={[s.note, s.webInput]} />
          {!!error && <Text testID="body-entry-error" accessibilityRole="alert" style={s.error}>{error}</Text>}
          <Pressable testID="body-form-save" accessibilityRole="button" accessibilityLabel="Guardar registro corporal" onPress={() => { Keyboard.dismiss(); onSave(); }} style={s.save}><Icon name="checkCircle" size={17} color={colors.teal} /><Text style={s.saveText}>Guardar</Text></Pressable>
        </>}
      </ScrollView>
    </View>
  </KeyboardAvoidingView>;
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, paddingHorizontal: 24, paddingVertical: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(8,36,65,.28)' },
  card: { width: '100%', maxWidth: 326, maxHeight: '100%', flexShrink: 1, borderRadius: 15, padding: 18, backgroundColor: 'white', boxShadow: '0 12px 30px rgba(8,36,65,.15)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 9 }, title: { flex: 1, color: colors.navy, fontSize: 19, lineHeight: 25, fontWeight: '700' }, close: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EDF5F7', alignItems: 'center', justifyContent: 'center' }, back: { width: 24, height: 32, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexShrink: 1 }, content: { paddingBottom: 1 }, parameter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }, parameterName: { flex: 1, color: colors.navy, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  label: { color: '#7F99AF', fontSize: 10, lineHeight: 15, marginBottom: 4 }, valueBox: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, backgroundColor: '#EDF7FA', paddingHorizontal: 12, minHeight: 38, marginBottom: 12 }, valueInput: { flex: 1, minWidth: 0, color: colors.navy, fontSize: 14, height: 38, paddingVertical: 0 }, divider: { color: '#8DA5B8', fontSize: 15 }, unit: { color: '#7F99AF', fontSize: 11 },
  pair: { flexDirection: 'row', gap: 12, marginBottom: 14 }, pairField: { flex: 1, minWidth: 0 }, smallField: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#EDF7FA' }, dateValue: { flex: 1, minWidth: 0, color: colors.navy, fontSize: 11, lineHeight: 16 }, timeInput: { flex: 1, minWidth: 0, color: colors.navy, fontSize: 12, height: 36, paddingVertical: 0 },
  note: { color: colors.navy, fontSize: 12, lineHeight: 18, minHeight: 32, maxHeight: 90, borderBottomWidth: 1, borderBottomColor: '#DFE9EF', paddingHorizontal: 6, paddingVertical: 5 }, save: { minHeight: 32, paddingHorizontal: 18, borderRadius: 20, backgroundColor: '#DFF7F7', alignSelf: 'center', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 16 }, saveText: { color: colors.tealDark, fontSize: 12 }, error: { color: colors.danger, fontSize: 11, lineHeight: 16, marginTop: 8 },
  dateInput: { color: colors.navy, borderRadius: 8, borderWidth: 1, borderColor: '#DCE8EE', paddingHorizontal: 10, height: 36, fontSize: 12 }, monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 7 }, monthArrow: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }, monthLabel: { color: colors.navy, fontSize: 12, textTransform: 'capitalize' }, days: { flexDirection: 'row', flexWrap: 'wrap' }, weekday: { width: '14.2857%', textAlign: 'center', lineHeight: 28, color: '#8AA0B1', fontSize: 11 }, day: { width: '14.2857%', height: 32, alignItems: 'center', justifyContent: 'center' }, dayCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, daySelected: { backgroundColor: colors.teal }, dayText: { fontSize: 12, color: colors.navy }, dayMuted: { color: '#A6B8C5' }, selectedText: { color: 'white' },
  webInput: Platform.OS === 'web' ? { outlineStyle: 'solid', outlineWidth: 0 } : {},
});
