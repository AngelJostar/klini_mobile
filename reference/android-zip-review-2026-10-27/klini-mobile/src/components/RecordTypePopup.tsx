import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, Icon } from './ui';
import Sheet from './ArchivePopup';
import RecordFlowSteps from './RecordFlowSteps';

export type RecordEntryMode = 'photo' | 'scan' | 'text' | 'file';
const options: { mode: RecordEntryMode; label: string; icon: string }[] = [
  { mode: 'photo', label: 'Foto', icon: 'camera' },
  { mode: 'scan', label: 'Escaneo', icon: 'scan-outline' },
  { mode: 'text', label: 'Texto', icon: 'edit' },
  { mode: 'file', label: 'Archivo', icon: 'attachment' },
];

export default function RecordEntrySheet({ onClose, onBack, onSelect, busy = false, error = '' }: {
  onClose: () => void;
  onBack?: () => void;
  onSelect: (mode: RecordEntryMode) => void;
  busy?: boolean;
  error?: string;
}) {
  return <View testID="record-entry-screen" style={s.screen}>
    <Sheet title="Agregar registro" onClose={onClose} onBack={onBack ?? onClose}>
      <RecordFlowSteps activeStep={1} />
      <Text style={s.prompt}>Selecciona el tipo de registro</Text>
      <View style={s.options}>
        {options.map(option => <Pressable key={option.mode} testID={`record-type-${option.mode}`} accessibilityRole="button" accessibilityLabel={option.label.replace('\n', ' ')} accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => onSelect(option.mode)} style={({ pressed }) => [s.option, { opacity: busy ? .5 : pressed ? .65 : 1 }]}>
          <LinearGradient colors={['#F0FCFC', '#DEF5F5']} style={s.icon}><Icon name={option.icon} size={30} color={colors.teal} /></LinearGradient>
          <Text style={s.label}>{option.label}</Text>
        </Pressable>)}
      </View>
      {busy && <Text testID="record-entry-busy" accessibilityLiveRegion="polite" style={s.status}>Abriendo archivo…</Text>}
      {!!error && <Text testID="record-entry-error" accessibilityRole="alert" style={[s.status, s.error]}>{error}</Text>}
    </Sheet>
  </View>;
}
const s = StyleSheet.create({
  screen: { flex: 1 },
  prompt: { marginTop: 28, color: colors.navy, fontSize: 14, lineHeight: 20, fontWeight: '600', textAlign: 'center' },
  options: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 26 },
  option: { flex: 1, minWidth: 0, minHeight: 96, alignItems: 'center', gap: 9 },
  icon: { width: 52, height: 52, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  label: { color: colors.navy, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  status: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 16 },
  error: { color: colors.danger },
});
