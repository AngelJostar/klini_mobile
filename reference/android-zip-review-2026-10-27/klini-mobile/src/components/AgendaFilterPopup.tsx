import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { parseDate } from '../domain/dates';
import BookingFooterButton from './BookingFooterButton';
import { colors, Icon } from './ui';

export type AgendaFilter = 'all' | 'upcoming' | 'history' | 'cancelled';
type Props = {
  date: string | null;
  status: AgendaFilter;
  today: string;
  onClose: () => void;
  onApply: (date: string | null, status: AgendaFilter) => void;
};

const statuses: { value: AgendaFilter; label: string; icon: string }[] = [
  { value: 'all', label: 'Todas', icon: 'list-outline' },
  { value: 'upcoming', label: 'Próximas', icon: 'calendar' },
  { value: 'history', label: 'Historial', icon: 'clock' },
  { value: 'cancelled', label: 'Canceladas', icon: 'close-circle-outline' },
];

export default function AgendaFilterPopup({ date, status, today, onClose, onApply }: Props) {
  const [draftDate, setDraftDate] = useState(date);
  const [draftStatus, setDraftStatus] = useState(status);
  const card = useRef<React.ComponentRef<typeof View>>(null);
  const insets = useSafeAreaInsets();
  const exactDate = draftDate !== null && draftDate !== today;

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    if (Platform.OS !== 'web') return () => subscription.remove();
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = card.current as unknown as HTMLElement | null;
    const focusFrame = requestAnimationFrame(() => node?.querySelector<HTMLElement>('[data-testid="agenda-filter-close"]')?.focus());
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        onClose();
      } else if (event.key === 'Tab' && node) {
        const controls = Array.from(node.querySelectorAll<HTMLElement>('button, [tabindex="0"]')).filter(element => element.getClientRects().length && element.getAttribute('aria-disabled') !== 'true');
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener('keydown', keydown, true);
    return () => {
      subscription.remove();
      cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', keydown, true);
      if (previous?.isConnected) previous.focus();
    };
  }, [onClose]);

  return <View style={[s.overlay, { paddingTop: Math.max(24, insets.top + 16), paddingBottom: Math.max(24, insets.bottom + 16) }]}>
    <Pressable testID="agenda-filter-backdrop" accessibilityRole="button" accessibilityLabel="Cerrar filtros sin aplicar" onPress={onClose} style={StyleSheet.absoluteFill} />
    <View ref={card} testID="agenda-filter-popup" role="dialog" aria-modal accessibilityLabel="Filtros de agenda" accessibilityViewIsModal style={s.card}>
      <View style={s.header}>
        <Text accessibilityRole="header" style={s.title}>Filtros</Text>
        <Pressable testID="agenda-filter-close" accessibilityRole="button" accessibilityLabel="Cerrar filtros sin aplicar" onPress={onClose} style={s.closeTarget}>
          <View style={s.closeCircle}><Icon name="close" size={19} /></View>
        </Pressable>
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={s.sectionTitle}>Fecha</Text>
        <View role="radiogroup" accessibilityLabel="Fecha de las citas" style={s.dateOptions}>
          <View pointerEvents="none" style={s.dateTrack} />
          <Pressable testID="agenda-date-all" accessibilityRole="radio" aria-checked={draftDate === null} accessibilityState={{ checked: draftDate === null }} onPress={() => setDraftDate(null)} style={s.dateButton}>
            <View style={[s.datePill, draftDate === null && s.dateSelected]}><Text style={[s.dateText, draftDate === null && s.dateSelectedText]}>Todas las fechas</Text></View>
          </Pressable>
          <Pressable testID="agenda-date-today" accessibilityRole="radio" aria-checked={draftDate === today} accessibilityState={{ checked: draftDate === today }} onPress={() => setDraftDate(today)} style={s.dateButton}>
            <View style={[s.datePill, draftDate === today && s.dateSelected]}><Text style={[s.dateText, draftDate === today && s.dateSelectedText]}>Hoy</Text></View>
          </Pressable>
        </View>
        {exactDate && <Text testID="agenda-filter-exact-date" style={s.exactDate}>Fecha seleccionada: {parseDate(draftDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>}
        <Text style={[s.sectionTitle, s.statusHeading]}>Estado</Text>
        <View role="radiogroup" accessibilityLabel="Estado de las citas" style={s.statusOptions}>
          {statuses.map(item => <Pressable key={item.value} testID={`agenda-filter-${item.value}`} accessibilityRole="radio" accessibilityLabel={item.label} aria-checked={draftStatus === item.value} accessibilityState={{ checked: draftStatus === item.value }} onPress={() => setDraftStatus(item.value)} style={s.statusButton}>
            <View style={[s.statusIcon, draftStatus === item.value && s.statusSelected]}><Icon name={item.icon} size={22} color={draftStatus === item.value ? colors.tealDark : colors.teal} /></View>
            <Text style={[s.statusText, draftStatus === item.value && s.selectedText]}>{item.label}</Text>
          </Pressable>)}
        </View>
      </ScrollView>
      <View style={s.footer}><BookingFooterButton testID="agenda-filter-apply" title="Aplicar" onPress={() => onApply(draftDate, draftStatus)} /></View>
    </View>
  </View>;
}

const s = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(8,36,65,.3)' },
  card: { width: '100%', maxWidth: 280, maxHeight: '85%', backgroundColor: 'white', borderRadius: 20, padding: 16, boxShadow: '0 12px 30px rgba(8,36,65,.15)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  title: { flex: 1, color: colors.navy, fontSize: 20, lineHeight: 25, fontWeight: '600' },
  closeTarget: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-end' },
  closeCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EDF5F6' },
  scroll: { flexShrink: 1, minHeight: 0 },
  content: { paddingBottom: 3 },
  sectionTitle: { color: colors.navy, fontSize: 12, fontWeight: '600', lineHeight: 18, marginBottom: 8 },
  // Draw a slim segmented control while retaining full-height touch targets.
  dateOptions: { flexDirection: 'row', alignItems: 'center', minHeight: 44, marginVertical: -8, paddingHorizontal: 2, gap: 2 },
  dateTrack: { position: 'absolute', left: 0, right: 0, top: 8, bottom: 8, borderRadius: 14, backgroundColor: '#EDF3F8' },
  dateButton: { flex: 1, minHeight: 44, justifyContent: 'center' },
  datePill: { minHeight: 24, paddingHorizontal: 7, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dateSelected: { backgroundColor: 'white' },
  dateSelectedText: { color: colors.navy, fontWeight: '500' },
  dateText: { color: '#7D93A8', fontSize: 11, textAlign: 'center', lineHeight: 16 },
  selectedText: { color: colors.tealDark, fontWeight: '600' },
  exactDate: { color: '#7D93A8', fontSize: 10, lineHeight: 15, marginTop: 8 },
  statusHeading: { marginTop: 21 },
  statusOptions: { flexDirection: 'row', gap: 6 },
  statusButton: { flex: 1, minWidth: 0, minHeight: 70, alignItems: 'center', paddingVertical: 3, gap: 6 },
  statusIcon: { width: 40, height: 40, backgroundColor: '#F2F9F9', borderRadius: 12, borderColor: '#E1EEEE', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  statusSelected: { borderColor: '#95DEDA', backgroundColor: '#DDF5F2' },
  statusText: { color: '#71899F', fontSize: 9, lineHeight: 14, textAlign: 'center' },
  footer: { paddingTop: 19, paddingBottom: 1 },
});
