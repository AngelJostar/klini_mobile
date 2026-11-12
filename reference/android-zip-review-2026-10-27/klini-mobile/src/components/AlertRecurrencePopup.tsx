import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { todayISO } from '../domain/dates';
import { isMedicationAlertRecurrence, type MedicationRecurrenceSchedule } from '../domain/medicationRecurrence';
import { Icon } from './ui';

export interface AlertRecurrencePopupProps {
  value: MedicationRecurrenceSchedule;
  onSelect: (schedule: MedicationRecurrenceSchedule) => void;
  onClose: () => void;
}

const allDays = [0, 1, 2, 3, 4, 5, 6];
const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
type Mode = 'choices' | 'months' | 'weekdays';

/** Selection stays local until a quick option or Listo is explicitly chosen. */
export default function AlertRecurrencePopup({ value, onSelect, onClose }: AlertRecurrencePopupProps) {
  const [draft, setDraft] = useState<MedicationRecurrenceSchedule>(() => ({ days: [...value.days], ...(value.recurrence ? { recurrence: { ...value.recurrence } } : {}) }));
  const [mode, setMode] = useState<Mode>('choices');
  const [error, setError] = useState('');
  const card = useRef<React.ComponentRef<typeof View>>(null);
  const closeButton = useRef<React.ComponentRef<typeof View>>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const selected = useRef(false);

  const close = () => { Keyboard.dismiss(); onCloseRef.current(); };
  useEffect(() => {
    const dismiss = () => { Keyboard.dismiss(); onCloseRef.current(); };
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { dismiss(); return true; });
    if (Platform.OS !== 'web') {
      const frame = requestAnimationFrame(() => {
        if (closeButton.current) AccessibilityInfo.sendAccessibilityEvent(closeButton.current, 'focus');
      });
      return () => { subscription.remove(); cancelAnimationFrame(frame); };
    }

    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = card.current as unknown as HTMLElement | null;
    const frame = requestAnimationFrame(() => node?.querySelector<HTMLElement>('[data-testid="alert-recurrence-close"]')?.focus());
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        dismiss();
      } else if (event.key === 'Tab' && node) {
        const controls = Array.from(node.querySelectorAll<HTMLElement>('button, input, textarea, select, [tabindex="0"]'))
          .filter(element => element.getClientRects().length && element.getAttribute('aria-disabled') !== 'true' && !element.hasAttribute('disabled'));
        const first = controls[0], last = controls[controls.length - 1];
        if (!node.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first)?.focus(); }
        else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener('keydown', keydown, true);
    return () => {
      subscription.remove();
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', keydown, true);
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  const commit = (schedule: MedicationRecurrenceSchedule) => {
    if (selected.current) return;
    selected.current = true;
    Keyboard.dismiss();
    onSelect(schedule);
  };
  const chooseMonths = (intervalMonths: 1 | 6) => {
    setDraft(current => ({ days: [...allDays], recurrence: { type: 'monthly', intervalMonths, anchorDate: current.recurrence?.anchorDate ?? (intervalMonths === 1 ? `${todayISO().slice(0, 7)}-01` : todayISO()) } }));
    setMode('months');
    setError('');
  };
  const chooseWeekdays = () => {
    setDraft(current => ({ days: [...current.days] }));
    setMode(current => current === 'weekdays' ? 'choices' : 'weekdays');
    setError('');
  };
  const done = () => {
    if (mode === 'months') {
      if (!isMedicationAlertRecurrence(draft.recurrence)) { setError('Escribe una fecha válida con formato AAAA-MM-DD.'); return; }
      commit({ days: [...allDays], recurrence: { ...draft.recurrence } });
    } else if (mode === 'weekdays') {
      if (!draft.days.length) { setError('Selecciona al menos un día.'); return; }
      commit({ days: [...draft.days].sort((a, b) => a - b) });
    }
  };
  const chooseOption = (id: string) => {
    if (id === 'alert-repeat-every-day') commit({ days: [...allDays] });
    else if (id === 'alert-recurrence-monday') commit({ days: [1] });
    else if (id === 'alert-recurrence-sunday') commit({ days: [0] });
    else chooseMonths(id === 'alert-recurrence-monthly' ? 1 : 6);
  };
  const options = [
    { id: 'alert-repeat-every-day', label: 'Todos los días', checked: !draft.recurrence && draft.days.length === 7 },
    { id: 'alert-recurrence-monday', label: 'Todos los lunes', checked: !draft.recurrence && draft.days.length === 1 && draft.days[0] === 1 },
    { id: 'alert-recurrence-sunday', label: 'Todos los domingos', checked: !draft.recurrence && draft.days.length === 1 && draft.days[0] === 0 },
    { id: 'alert-recurrence-monthly', label: 'Cada mes', checked: draft.recurrence?.intervalMonths === 1 },
    { id: 'alert-recurrence-six-months', label: 'Cada 6 meses', checked: draft.recurrence?.intervalMonths === 6 },
  ];
  const doneDisabled = mode === 'weekdays' && !draft.days.length;

  return <View testID="alert-repeat-options" style={s.overlay}>
    <Pressable testID="alert-recurrence-backdrop" accessibilityRole="button" accessibilityLabel="Cerrar recurrencia sin cambiarla" onPress={close} style={StyleSheet.absoluteFill} />
    <View ref={card} testID="alert-recurrence-popup" role="dialog" aria-modal accessibilityLabel="Seleccionar recurrencia" accessibilityViewIsModal onAccessibilityEscape={close} style={s.card}>
      <View style={s.header}>
        <Text testID="alert-recurrence-title" accessibilityRole="header" style={s.title}>Recurrencia</Text>
        <Pressable ref={closeButton} testID="alert-recurrence-close" accessibilityRole="button" accessibilityLabel="Cerrar recurrencia sin cambiarla" onPress={close} style={({ pressed }) => [s.close, pressed && s.dimmed]}>
          <View style={s.closeCircle}><Icon name="close" size={18} color="#737377" /></View>
        </Pressable>
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {options.map(option => <Pressable key={option.id} testID={option.id} accessibilityRole="button" aria-pressed={option.checked} accessibilityState={{ selected: option.checked }} onPress={() => chooseOption(option.id)} style={({ pressed }) => [s.row, pressed && s.pressed]}>
          <Text style={s.rowLabel}>{option.label}</Text>
          {option.checked && <Icon name="check" size={20} color="#737377" />}
        </Pressable>)}
        <Pressable testID="alert-recurrence-weekdays" accessibilityRole="button" accessibilityState={{ expanded: mode === 'weekdays' }} aria-expanded={mode === 'weekdays'} onPress={chooseWeekdays} style={({ pressed }) => [s.row, pressed && s.pressed]}>
          <Text style={s.otherLabel}>Otros días…</Text><Icon name={mode === 'weekdays' ? 'chevronUp' : 'chevronDown'} size={17} color="#8E8E93" />
        </Pressable>
        {mode === 'months' && draft.recurrence && <View style={s.detail}>
          <Text style={s.label}>Fecha de referencia</Text>
          <TextInput testID="alert-recurrence-anchor-date" accessibilityLabel="Fecha de referencia de la recurrencia, AAAA-MM-DD" aria-invalid={!!error} value={draft.recurrence.anchorDate} onChangeText={anchorDate => { setDraft(current => ({ ...current, recurrence: current.recurrence ? { ...current.recurrence, anchorDate } : undefined })); setError(''); }} placeholder="AAAA-MM-DD" placeholderTextColor="#8E8E93" maxLength={10} keyboardType="numbers-and-punctuation" autoCorrect={false} autoComplete="off" onSubmitEditing={done} returnKeyType="done" style={s.input} />
        </View>}
        {mode === 'weekdays' && <View style={s.weekdays}>
          {dayNames.map((name, day) => <Pressable key={day} testID={`alert-repeat-day-${day}`} accessibilityRole="checkbox" aria-checked={draft.days.includes(day)} accessibilityState={{ checked: draft.days.includes(day) }} onPress={() => { setDraft(current => ({ days: current.days.includes(day) ? current.days.filter(item => item !== day) : [...current.days, day].sort((a, b) => a - b) })); setError(''); }} style={({ pressed }) => [s.row, pressed && s.pressed]}>
            <Text style={s.rowLabel}>{name}</Text><View style={[s.checkbox, draft.days.includes(day) && s.checked]}>{draft.days.includes(day) && <Icon name="check" size={15} color="white" />}</View>
          </Pressable>)}
        </View>}
        {!!error && <Text testID="alert-recurrence-error" accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}
        {mode !== 'choices' && <Pressable testID="alert-repeat-done" accessibilityRole="button" accessibilityState={{ disabled: doneDisabled }} disabled={doneDisabled} onPress={done} style={({ pressed }) => [s.done, (pressed || doneDisabled) && s.dimmed]}><Text style={s.doneLabel}>Listo</Text></Pressable>}
      </ScrollView>
    </View>
  </View>;
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 100, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: 'rgba(0,0,0,.25)' },
  card: { width: '100%', maxWidth: 340, maxHeight: '94%', flexShrink: 1, backgroundColor: '#FFFFFF', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  title: { flex: 1, color: '#1C1C1E', fontSize: 18, lineHeight: 26, fontWeight: '600' },
  close: { width: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center' },
  closeCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F2F2F7', alignItems: 'center', justifyContent: 'center' },
  scroll: { flexShrink: 1, minHeight: 0 },
  content: { paddingBottom: 2 },
  row: { minHeight: 49, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E5EA' },
  rowLabel: { flex: 1, color: '#303033', fontSize: 14, lineHeight: 21 },
  otherLabel: { flex: 1, color: '#737377', fontSize: 14, lineHeight: 21 },
  detail: { gap: 8, paddingTop: 18 },
  label: { color: '#737377', fontSize: 12, lineHeight: 18 },
  input: { minHeight: 46, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F2F2F7', color: '#303033', fontSize: 14, lineHeight: 21 },
  weekdays: { marginTop: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: '#C7C7CC', alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: '#737377', borderColor: '#737377' },
  error: { color: '#B43B42', fontSize: 12, lineHeight: 18, marginTop: 12 },
  done: { minHeight: 44, backgroundColor: '#F2F2F7', borderRadius: 14, paddingHorizontal: 22, paddingVertical: 11, alignItems: 'center', justifyContent: 'center', marginTop: 18, marginBottom: 2 },
  doneLabel: { color: '#303033', fontSize: 14, lineHeight: 21, fontWeight: '600' },
  pressed: { backgroundColor: '#F8F8FA' },
  dimmed: { opacity: 0.45 },
});
