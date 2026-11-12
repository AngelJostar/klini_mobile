import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, Icon } from '../components/ui';
import { medicationReminderSessionKey, useMedicationReminder } from '../components/MedicationReminderProvider';
import { useAppStore } from '../state/store';
import { dateLabel, todayISO } from '../domain/dates';

export default function MedicationReminderScreen() {
  const { event } = useMedicationReminder();
  return <ReminderContent key={event ? medicationReminderSessionKey(event) : 'empty'} />;
}

function ReminderContent() {
  const { event, dismiss, setResponding } = useMedicationReminder();
  const { state, acknowledgeMedicationReminder } = useAppStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const working = useRef(false);
  const alive = useRef(true);
  const key = event ? medicationReminderSessionKey(event) : undefined;
  const alert = state.medicationCare?.alerts.find(item => item.id === event?.alertId);
  const medication = state.medications.find(item => item.id === alert?.medicationId);
  const name = medication?.name ?? alert?.medicationName;
  const dose = medication?.dose ?? alert?.concentration;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  // Back, browser history and swipe dismissal leave no taken/skipped record.
  useEffect(() => () => { if (key) dismiss(key); }, [key, dismiss]);
  useEffect(() => {
    if (event && alert && name) return;
    if (router.canGoBack()) router.back(); else router.replace('/');
  }, [event, alert, name]);
  const close = () => { if (!working.current && key) dismiss(key); };
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { if (!working.current && key) dismiss(key); return true; });
    return () => subscription.remove();
  }, [dismiss, key]);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape' && !working.current && key) dismiss(key); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [dismiss, key]);
  const respond = async (status: 'taken' | 'skipped') => {
    if (!event || !key || working.current) return;
    working.current = true; setResponding(key, true); setBusy(true); setError('');
    try {
      await acknowledgeMedicationReminder(event.alertId, event.date, event.time, status, event.occurrenceKey);
      dismiss(key);
    } catch (cause) {
      if (alive.current) setError(cause instanceof Error ? cause.message : 'No se pudo guardar. Intenta de nuevo.');
    } finally { setResponding(key, false); working.current = false; if (alive.current) setBusy(false); }
  };
  if (!event || !alert || !name) return <View style={s.root} />;
  return <View style={s.root}>
    <BlurView intensity={Platform.OS === 'ios' ? 28 : 0} tint="light" style={StyleSheet.absoluteFill} />
    <Pressable testID="medication-reminder-backdrop" accessibilityLabel="Cerrar recordatorio sin registrar toma" disabled={busy} onPress={close} style={StyleSheet.absoluteFill} />
    <SafeAreaView style={s.safe} pointerEvents="box-none">
      <View style={s.center} pointerEvents="box-none">
        <View testID="medication-reminder-popup" accessibilityViewIsModal aria-modal accessibilityRole="alert" style={s.card}>
          <ScrollView contentContainerStyle={s.cardContent} keyboardShouldPersistTaps="handled">
          <Pressable testID="medication-reminder-close" accessibilityRole="button" accessibilityLabel="Cerrar recordatorio sin registrar toma" disabled={busy} onPress={close} style={s.close}><Icon name="close" size={18} color="#8CA1B7" /></Pressable>
          <Icon name="notifications" size={29} color={colors.teal} />
          <Text testID="medication-reminder-time" style={s.time}>{event.time}</Text>
          {event.date !== todayISO() && <Text style={s.time}>{dateLabel(event.date)}</Text>}
          <Text style={s.heading}>Hora de tu medicamento</Text>
          <Text testID="medication-reminder-name" style={s.name}>{name}</Text>
          <Text testID="medication-reminder-dose" style={s.dose}>{dose || 'Consulta la dosis en tu receta'}</Text>
          <View style={s.actions}>
            <Pressable testID="medication-reminder-skip" accessibilityRole="button" disabled={busy} onPress={() => void respond('skipped')} style={({ pressed }) => [s.button, s.skip, (pressed || busy) && s.dim]}><Text style={s.skipText}>Descartar</Text></Pressable>
            <Pressable testID="medication-reminder-take" accessibilityRole="button" disabled={busy} onPress={() => void respond('taken')} style={({ pressed }) => [s.button, s.take, (pressed || busy) && s.dim]}><Text style={s.takeText}>{busy ? 'Guardando…' : 'Tomar'}</Text></Pressable>
          </View>
          {alert.id === 'demo-alert-atorvastatin-2000' && <Text style={s.example}>Ejemplo de registro</Text>}
          {!!error && <Text testID="medication-reminder-error" accessibilityRole="alert" style={s.error}>{error}</Text>}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  </View>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(68,97,119,0.30)' }, safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 310, maxHeight: '100%', backgroundColor: 'white', borderRadius: 22, overflow: 'hidden', boxShadow: '0px 12px 38px rgba(8,36,65,0.15)' }, cardContent: { padding: 24, alignItems: 'center' },
  close: { position: 'absolute', right: 4, top: 4, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  time: { color: '#8198B0', fontSize: 13, marginTop: 8 }, heading: { color: colors.navy, fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 9 },
  name: { color: colors.navy, fontSize: 22, lineHeight: 28, fontWeight: '700', textAlign: 'center', marginTop: 10 }, dose: { color: '#8198B0', fontSize: 16, lineHeight: 23, textAlign: 'center', marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 23, width: '100%' }, button: { flex: 1, borderRadius: 24, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  skip: { backgroundColor: '#DDF4F2' }, take: { backgroundColor: colors.teal }, skipText: { color: colors.tealDark, fontSize: 13, fontWeight: '600' }, takeText: { color: 'white', fontSize: 13, fontWeight: '600' },
  dim: { opacity: 0.55 }, example: { fontSize: 10, color: '#94A7BA', marginTop: 10 }, error: { color: colors.danger, fontSize: 12, lineHeight: 18, marginTop: 14, textAlign: 'center' },
});
