import Constants from 'expo-constants';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { appleHealthUnavailable, requestAppleHealthAccess } from '../services/appleHealth';
import { AppleHealthSetupError } from '../services/appleHealthErrors';
import { HEALTH_CATEGORIES, type HealthCategory } from '../services/appleHealthReader';

import { colors, Icon } from './ui';

export default function AppleHealthOptionsPopup({ selected, onSelectedChange, onClose, requested = [], onSave, permitted = true }: {
  requested?: readonly HealthCategory[];
  onSave?: (categories: HealthCategory[]) => void;
  permitted?: boolean;
  selected: readonly HealthCategory[];
  onSelectedChange: (categories: HealthCategory[]) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const canUseHealth = permitted && Platform.OS === 'ios' && Constants.executionEnvironment !== 'storeClient';
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const generation = useRef(0);
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'background') { generation.current++; }
    });
    return () => { mounted.current = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    const back = Platform.OS === 'android' ? BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; }) : undefined;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopImmediatePropagation(); onClose();
    };
    if (Platform.OS === 'web') window.addEventListener('keydown', escape, true);
    return () => { back?.remove(); if (Platform.OS === 'web') window.removeEventListener('keydown', escape, true); };
  }, [onClose]);

  async function connect() {
    if (!canUseHealth || pending.current || !selected.length) return;
    pending.current = true;
    const current = ++generation.current;
    setBusy(true); setMessage('');
    try {
      await requestAppleHealthAccess(selected.filter(id => !requested.includes(id)));
      if (!mounted.current || current !== generation.current) return;
      onSave?.([...selected]);
      
    } catch (error) {
      if (mounted.current && current === generation.current) setMessage(error instanceof AppleHealthSetupError ? error.message : Platform.OS === 'ios' ? 'No se pudo consultar Apple Salud. Revisa los permisos en Salud y comprueba que instalaste una compilación con HealthKit.' : appleHealthUnavailable);
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return <View testID="apple-health-options-overlay" style={[s.overlay, { paddingTop: Math.max(16, insets.top), paddingBottom: Math.max(16, insets.bottom), paddingLeft: Math.max(16, insets.left), paddingRight: Math.max(16, insets.right) }]}>
    <Pressable testID="apple-health-options-backdrop" accessibilityRole="button" accessibilityLabel="Cerrar selección de Apple Salud" onPress={() => { if (!busy) onClose(); }} style={StyleSheet.absoluteFill} />
    <View testID="apple-health-options-popup" role="dialog" accessibilityLabel="Parámetros de Apple Salud" accessibilityViewIsModal style={s.card}>
      <View style={s.header}>
        <View style={s.badge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Icon name="heartFilled" size={24} color="#F36B88" /></View>
        <Text accessibilityRole="header" style={s.title}>Apple Salud</Text>
        <Pressable testID="apple-health-options-close" accessibilityRole="button" accessibilityLabel="Cerrar selección de Apple Salud" onPress={() => { if (!busy) onClose(); }} style={s.close}><Icon name="close" size={20} color="#7D94A8" /></Pressable>
      </View>
      <ScrollView testID="apple-health-options" style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled">
        <Text style={s.intro}>Elige los parámetros que aparecerán primero en Parámetros corporales. Se conserva tu selección y se actualizan al abrir esta pantalla, al volver a Klini y mientras esté activa. No son lecturas en tiempo real. Apple solicitará las categorías nuevas. Los permisos de lectura de cada categoría se controlan en Salud del iPhone; seleccionar aquí no confirma que estén autorizados.</Text>
        {HEALTH_CATEGORIES.map(category => <View style={s.choice} key={category.id}>
          <Text style={s.choiceText}>{category.label}</Text>
          <Switch testID={`apple-health-category-${category.id}`} accessibilityLabel={`Consultar ${category.label}`} disabled={busy} value={selected.includes(category.id)} onValueChange={enabled => { setMessage(''); onSelectedChange(enabled ? [...selected, category.id] : selected.filter(id => id !== category.id)); }} thumbColor={colors.white} trackColor={{ false: '#DBE2EA', true: colors.teal }} ios_backgroundColor="#DBE2EA" />
        </View>)}
        {!permitted && <Text style={s.text}>Apple Salud solo puede vincularse al perfil titular de este iPhone.</Text>}
        <Text style={s.privacy}>Solo lectura. Las mediciones se muestran en Parámetros, sin enviarlas al servidor ni a Klini IA.</Text>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || !selected.length || !canUseHealth }} disabled={busy || !selected.length || !canUseHealth} onPress={connect} style={[s.button, (busy || !selected.length || !canUseHealth) && s.disabled]} testID="apple-health-connect"><Text style={s.buttonText}>{busy ? 'Consultando…' : 'Guardar selección y activar'}</Text></Pressable>
        {!!message && <Text accessibilityLiveRegion="polite" style={s.text}>{message}</Text>}

      </ScrollView>
    </View>
  </View>;
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 110, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: 'rgba(8,36,65,.32)' },
  card: { width: '100%', maxWidth: 350, maxHeight: '100%', flexShrink: 1, backgroundColor: colors.white, borderRadius: 16, padding: 16, boxShadow: '0 8px 28px rgba(8,36,65,.14)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  badge: { width: 38, height: 38, borderRadius: 11, borderWidth: 1, borderColor: '#EEF2F5', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, minWidth: 0, color: colors.navy, fontSize: 18, lineHeight: 24, fontWeight: '700' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexShrink: 1 }, content: { gap: 12, paddingBottom: 2 },
  intro: { fontSize: 13, lineHeight: 19, color: colors.muted },
  choice: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 8 },
  choiceText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.navy },
  privacy: { fontSize: 12, lineHeight: 18, color: colors.muted },
  text: { fontSize: 13, lineHeight: 19, color: colors.navy },
  button: { minHeight: 48, justifyContent: 'center', padding: 12, borderRadius: 12, backgroundColor: colors.tealDark },
  buttonText: { textAlign: 'center', fontWeight: '700', color: colors.white, fontSize: 13 },
  disabled: { opacity: .5 },
  reading: { gap: 4, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
  readingTitle: { fontSize: 14, fontWeight: '700', color: colors.navy },
  link: { color: colors.tealDark, paddingVertical: 12, fontWeight: '600' },
});
