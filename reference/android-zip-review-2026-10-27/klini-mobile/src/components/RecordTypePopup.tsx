import React, { useEffect } from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, Icon } from './ui';

export type RecordEntryMode = 'photo' | 'scan' | 'text' | 'file';
const options: { mode: RecordEntryMode; label: string; icon: string }[] = [
  { mode: 'photo', label: 'Foto', icon: 'camera' },
  { mode: 'scan', label: 'Escaneo', icon: 'scan-outline' },
  { mode: 'text', label: 'Texto', icon: 'edit' },
  { mode: 'file', label: 'Archivo\nadjunto', icon: 'attachment' },
];

export default function RecordTypePopup({ onClose, onSelect }: {
  onClose: () => void;
  onSelect: (mode: RecordEntryMode) => void;
}) {
  useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    };
    if (Platform.OS === 'web') document.addEventListener('keydown', escape);
    return () => {
      back.remove();
      if (Platform.OS === 'web') document.removeEventListener('keydown', escape);
    };
  }, [onClose]);

  return <View style={s.overlay}>
    <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar opciones de registro" />
    <View testID="record-type-popup" role="dialog" accessibilityLabel="Agregar registro" accessibilityViewIsModal style={s.card}>
      <View style={s.header}>
        <Text accessibilityRole="header" style={s.title}>Agregar registro</Text>
        <Pressable testID="record-type-close" accessibilityRole="button" accessibilityLabel="Cerrar opciones de registro" onPress={onClose} style={s.close}>
          <Icon name="close" size={18} color="#7D94AA" />
        </Pressable>
      </View>
      <View style={s.options}>
        {options.map(option => <Pressable key={option.mode} testID={`record-type-${option.mode}`} accessibilityRole="button" accessibilityLabel={option.label.replace('\n', ' ')} onPress={() => onSelect(option.mode)} style={({ pressed }) => [s.option, { opacity: pressed ? .65 : 1 }]}>
          <LinearGradient colors={['#F0FCFC', '#DEF5F5']} style={s.icon}><Icon name={option.icon} size={30} color={colors.teal} /></LinearGradient>
          <Text style={s.label}>{option.label}</Text>
        </Pressable>)}
      </View>
    </View>
  </View>;
}
const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: 'rgba(8,36,65,.28)' },
  card: { width: '100%', maxWidth: 310, borderRadius: 20, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 18, backgroundColor: '#FAFDFE', boxShadow: '0 12px 30px rgba(8,36,65,.15)' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  title: { flex: 1, color: colors.navy, fontSize: 17, fontWeight: '700' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: '#EDF2F6' },
  options: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  option: { flex: 1, alignItems: 'center', gap: 8 },
  icon: { width: 52, height: 52, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  label: { color: colors.navy, fontSize: 11, lineHeight: 14, textAlign: 'center' },
});
