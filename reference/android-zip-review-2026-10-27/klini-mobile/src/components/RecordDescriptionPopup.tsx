import React, { useEffect, useState } from 'react';
import { BackHandler, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, Icon } from './ui';

export default function RecordDescriptionPopup({ label, initialValue, onClose, onSave }: { label: string; initialValue: string; onClose: () => void; onSave: (text: string) => void }) {
  const [text, setText] = useState(initialValue);
  useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopImmediatePropagation(); onClose();
    };
    if (Platform.OS === 'web') window.addEventListener('keydown', escape, true);
    return () => { back.remove(); if (Platform.OS === 'web') window.removeEventListener('keydown', escape, true); };
  }, [onClose]);

  return <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Cerrar descripción" onPress={onClose} />
    <View testID="record-review-description-popup" role="dialog" accessibilityLabel={label} accessibilityViewIsModal style={s.card}>
      <View style={s.header}>
        <Text accessibilityRole="header" style={s.title}>{label}</Text>
        <Pressable testID="record-review-description-close" accessibilityRole="button" accessibilityLabel="Cerrar descripción" onPress={onClose} style={s.close} hitSlop={6}><Icon name="close" size={18} color="#7D94AA" /></Pressable>
      </View>
      <TextInput testID="photo-review-text" accessibilityLabel={label} autoFocus value={text} onChangeText={setText} placeholder="Escribe aquí…" placeholderTextColor="#93A7B8" multiline maxLength={10000} textAlignVertical="top" underlineColorAndroid="transparent" style={s.input} />
      <Pressable testID="record-review-description-save" accessibilityRole="button" accessibilityLabel="Listo" onPress={() => { Keyboard.dismiss(); onSave(text.trim()); }} style={({ pressed }) => [s.save, pressed && s.pressed]}><Text style={s.saveText}>Listo</Text></Pressable>
    </View>
  </KeyboardAvoidingView>;
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20, backgroundColor: 'rgba(8,36,65,.28)' },
  card: { width: '100%', maxWidth: 310, maxHeight: '100%', flexShrink: 1, borderRadius: 20, padding: 18, backgroundColor: 'white', boxShadow: '0 12px 30px rgba(8,36,65,.15)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  title: { flex: 1, color: colors.navy, fontSize: 17, lineHeight: 23, fontWeight: '600' },
  close: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EDF2F6', alignItems: 'center', justifyContent: 'center' },
  input: { height: 132, flexShrink: 1, minHeight: 60, borderWidth: 1, borderColor: '#E3EEEE', borderRadius: 12, backgroundColor: '#F0F8F8', padding: 12, color: colors.navy, fontSize: 14, lineHeight: 20 },
  save: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', minWidth: 92, minHeight: 36, paddingHorizontal: 22, marginTop: 16, borderRadius: 20, backgroundColor: colors.teal },
  saveText: { color: 'white', fontSize: 12, fontWeight: '600' },
  pressed: { opacity: .7 },
});
