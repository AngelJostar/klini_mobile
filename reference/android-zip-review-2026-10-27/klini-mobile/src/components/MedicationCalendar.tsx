import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { parseDate, toISO, todayISO } from '../domain/dates';
import { colors, Icon } from './ui';

export interface MedicationCalendarProps {
  value: string;
  onChange: (date: string) => void;
  onClose: () => void;
}

const weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export default function MedicationCalendar({ value, onChange, onClose }: MedicationCalendarProps) {
  const today = todayISO();
  const [month, setMonth] = useState(() => {
    const valid = /^\d{4}-\d{2}-\d{2}$/.test(value) && toISO(parseDate(value)) === value;
    const initial = parseDate(valid && value <= today && value >= '1900-01-01' ? value : today);
    return new Date(initial.getFullYear(), initial.getMonth(), 1, 12);
  });
  const card = useRef<React.ComponentRef<typeof View>>(null);
  const closeButton = useRef<React.ComponentRef<typeof View>>(null);
  const todayDate = parseDate(today);
  const currentMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1, 12);
  const previousDisabled = month.getFullYear() === 1900 && month.getMonth() === 0;
  const nextDisabled = month >= currentMonth;
  const offset = (month.getDay() + 6) % 7;

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    if (Platform.OS !== 'web') {
      const frame = requestAnimationFrame(() => {
        if (closeButton.current) AccessibilityInfo.sendAccessibilityEvent(closeButton.current, 'focus');
      });
      return () => { subscription.remove(); cancelAnimationFrame(frame); };
    }

    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = card.current as unknown as HTMLElement | null;
    const frame = requestAnimationFrame(() => {
      node?.querySelector<HTMLElement>('[data-testid="medication-calendar-close"]')?.focus();
    });
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        onClose();
      } else if (event.key === 'Tab' && node) {
        const controls = Array.from(node.querySelectorAll<HTMLElement>('button, [tabindex="0"]'))
          .filter(element => element.getClientRects().length && element.getAttribute('aria-disabled') !== 'true' && !element.hasAttribute('disabled'));
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
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
  }, [onClose]);

  const select = (date: string) => {
    if (date > today || date < '1900-01-01') return;
    onChange(date);
    onClose();
  };

  return (
    <View style={s.overlay}>
      <Pressable
        testID="medication-calendar-backdrop"
        accessibilityRole="button"
        accessibilityLabel="Cerrar calendario sin cambiar la fecha"
        onPress={onClose}
        style={StyleSheet.absoluteFill}
      />
      <View
        ref={card}
        testID="medication-calendar"
        role="dialog"
        aria-modal
        accessibilityLabel="Seleccionar fecha de las tomas"
        accessibilityViewIsModal
        onAccessibilityEscape={onClose}
        style={s.card}
      >
        <View style={s.header}>
          <Text accessibilityRole="header" style={s.title}>Seleccionar fecha</Text>
          <Pressable
            ref={closeButton}
            testID="medication-calendar-close"
            accessibilityRole="button"
            accessibilityLabel="Cerrar calendario sin cambiar la fecha"
            onPress={onClose}
            style={({ pressed }) => [s.close, pressed && s.dimmed]}
          >
            <Icon name="close" size={20} color="#7D94A8" />
          </Pressable>
        </View>
        <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View style={s.monthHeader}>
            <Pressable
              testID="medication-calendar-previous"
              accessibilityRole="button"
              accessibilityLabel="Mes anterior"
              accessibilityState={{ disabled: previousDisabled }}
              disabled={previousDisabled}
              onPress={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1, 12))}
              style={({ pressed }) => [s.monthArrow, (pressed || previousDisabled) && s.dimmed]}
            >
              <Icon name="back" size={18} />
            </Pressable>
            <Text accessibilityLiveRegion="polite" style={s.monthLabel}>
              {month.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
            </Text>
            <Pressable
              testID="medication-calendar-next"
              accessibilityRole="button"
              accessibilityLabel="Mes siguiente"
              accessibilityState={{ disabled: nextDisabled }}
              disabled={nextDisabled}
              onPress={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1, 12))}
              style={({ pressed }) => [s.monthArrow, (pressed || nextDisabled) && s.dimmed]}
            >
              <Icon name="chevron" size={18} />
            </Pressable>
          </View>
          <View style={s.days}>
            {weekdays.map((label, index) => <Text key={`weekday-${index}`} style={s.weekday}>{label}</Text>)}
            {Array.from({ length: 42 }, (_, index) => {
              const date = new Date(month.getFullYear(), month.getMonth(), index - offset + 1, 12);
              const iso = toISO(date);
              const selected = iso === value;
              const disabled = iso > today || iso < '1900-01-01';
              const outsideMonth = date.getMonth() !== month.getMonth();
              return (
                <Pressable
                  key={iso}
                  testID={`medication-calendar-day-${iso}`}
                  accessibilityRole="button"
                  accessibilityLabel={date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  accessibilityState={{ selected, disabled }}
                  aria-selected={selected}
                  disabled={disabled}
                  onPress={() => select(iso)}
                  style={({ pressed }) => [s.day, pressed && !disabled && s.dimmed]}
                >
                  <View style={[s.dayCircle, iso === today && s.todayCircle, selected && s.selectedCircle]}>
                    <Text style={[s.dayText, (disabled || outsideMonth) && s.mutedDay, selected && s.selectedText]}>{date.getDate()}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            testID="medication-calendar-today"
            accessibilityRole="button"
            accessibilityLabel="Seleccionar hoy"
            onPress={() => select(today)}
            style={({ pressed }) => [s.todayButton, pressed && s.dimmed]}
          >
            <Text style={s.todayText}>Hoy</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 100, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: 'rgba(8,36,65,.3)' },
  card: { width: '100%', maxWidth: 340, maxHeight: '94%', flexShrink: 1, backgroundColor: 'white', borderRadius: 18, paddingHorizontal: 18, paddingVertical: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { flex: 1, color: colors.navy, fontSize: 17, lineHeight: 24, fontWeight: '600' },
  close: { minWidth: 36, minHeight: 40, justifyContent: 'center', alignItems: 'center' },
  scroll: { flexShrink: 1 },
  content: { paddingBottom: 2 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5, marginBottom: 4 },
  monthArrow: { width: 36, minHeight: 40, justifyContent: 'center', alignItems: 'center' },
  monthLabel: { flex: 1, textAlign: 'center', color: colors.navy, fontSize: 13, lineHeight: 20, textTransform: 'capitalize' },
  days: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.2857%', color: '#8198AE', fontSize: 11, lineHeight: 28, textAlign: 'center' },
  day: { width: '14.2857%', minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  dayText: { color: colors.navy, fontSize: 12, lineHeight: 18 },
  mutedDay: { color: '#A6B8C5' },
  todayCircle: { borderColor: colors.teal },
  selectedCircle: { backgroundColor: colors.teal, borderColor: colors.teal },
  selectedText: { color: 'white' },
  todayButton: { alignSelf: 'center', justifyContent: 'center', minHeight: 40, minWidth: 64, marginTop: 8 },
  todayText: { color: colors.tealDark, fontSize: 12, lineHeight: 18, fontWeight: '500' },
  dimmed: { opacity: 0.5 },
});
