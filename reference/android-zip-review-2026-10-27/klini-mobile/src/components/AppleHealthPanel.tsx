import React from 'react';
import Constants from 'expo-constants';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { colors, Icon } from './ui';

export default function AppleHealthPanel({ onShowInfo, optionsOpen, onOptionsChange, enabled, onDisable }: {
  enabled?: boolean;
  onDisable?: () => void;
  onShowInfo: () => void;
  optionsOpen: boolean;
  onOptionsChange: (open: boolean) => void;
}) {
  const canUseHealth = Platform.OS === 'ios' && Constants.executionEnvironment !== 'storeClient';
  return <View style={s.panel} testID="apple-health-panel">
    <View style={s.connectionRow}>
      <View style={s.connectionLabel}>
        <Pressable onPress={() => onOptionsChange(true)} accessibilityRole="button"><Text style={s.connectionText}>{enabled ? 'Apple Salud · administrar' : 'Conectar con Apple Health'}</Text></Pressable>
        <Pressable testID="apple-health-info" accessibilityRole="button" accessibilityLabel="Información de Apple Salud" accessibilityHint="Abre información sobre la conexión y disponibilidad" onPress={onShowInfo} style={s.infoButton} hitSlop={6}><Icon name="info" size={16} color={colors.teal} /></Pressable>
      </View>
      <Switch testID="apple-health-toggle" accessibilityLabel="Mostrar opciones de conexión con Apple Health" accessibilityHint={canUseHealth ? 'Abre una ventana para elegir categorías y conectar.' : 'Consulta el botón de información para conocer la disponibilidad.'} disabled={!canUseHealth} value={enabled ?? optionsOpen} onValueChange={value => { if (!value && enabled) onDisable?.(); else onOptionsChange(true); }} thumbColor={colors.white} trackColor={{ false: '#DBE2EA', true: colors.teal }} ios_backgroundColor="#DBE2EA" />
    </View>
  </View>;
}
const s = StyleSheet.create({
  panel: { borderTopWidth: 0, borderBottomWidth: 0 },
  connectionRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  connectionLabel: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' },
  connectionText: { flexShrink: 1, fontSize: 12, lineHeight: 18, fontWeight: '700', color: colors.navy },
  infoButton: { width: 32, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
