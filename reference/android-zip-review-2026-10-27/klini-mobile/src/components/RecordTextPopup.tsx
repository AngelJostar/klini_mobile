import React, { useEffect, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, Icon } from './ui';
import RecordFlowSteps from './RecordFlowSteps';

export default function RecordTextPopup({ onClose, onBack, onSave, onDraftChange, initialValue = '', actionLabel = 'Guardar', showSteps = false }: { onClose: () => void; onBack?: () => void; onSave: (text: string) => void; onDraftChange?: (text: string) => void; initialValue?: string; actionLabel?: string; showSteps?: boolean }) {
  const [text, setText] = useState(initialValue);
  const [error, setError] = useState('');
  useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => { (onBack ?? onClose)(); return true; });
    return () => back.remove();
  }, [onClose, onBack]);
  function save() {
    if (!text.trim()) { setError(actionLabel === 'Continuar' ? 'Escribe tu registro antes de continuar.' : 'Escribe tu registro antes de guardar.'); return; }
    try { onSave(text.trim()); }
    catch { setError(actionLabel === 'Continuar' ? 'No se pudo continuar con el registro. Intenta de nuevo.' : 'No se pudo guardar el registro. Intenta de nuevo.'); }
  }
  return <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Cerrar texto" onPress={onClose} />
    <View style={s.card} testID="record-text-popup" role="dialog" accessibilityLabel="Texto" accessibilityViewIsModal>
      <View style={s.header}>{onBack && <Pressable testID="record-text-back" accessibilityRole="button" accessibilityLabel="Volver al tipo de registro" onPress={onBack} style={s.close}><Icon name="back" size={19} /></Pressable>}<Text style={s.title}>Texto</Text><Pressable testID="record-text-close" accessibilityRole="button" accessibilityLabel="Cerrar texto" onPress={onClose} style={s.close}><Icon name="close" size={18} color="#7D94AA" /></Pressable></View>
      {showSteps && <RecordFlowSteps activeStep={2} />}
      <TextInput testID="record-text-input" accessibilityLabel="Escribe tu registro" placeholder="Escribe tu registro…" placeholderTextColor="#8BA0B1" value={text} onChangeText={value => { setText(value); onDraftChange?.(value); setError(''); }} multiline maxLength={10000} textAlignVertical="top" style={s.input} />
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      <View style={s.footer}><Pressable testID="record-text-save" accessibilityRole="button" accessibilityLabel={actionLabel === 'Continuar' ? 'Continuar a selección de categoría' : 'Guardar texto'} onPress={save} style={s.save}><Text style={s.saveText}>{actionLabel}</Text></Pressable></View>
    </View>
  </KeyboardAvoidingView>;
}
const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center', padding: 28, backgroundColor: 'rgba(8,36,65,.28)' },
  card: { width: '100%', maxWidth: 310, maxHeight: '90%', borderRadius: 20, padding: 14, backgroundColor: 'white', boxShadow: '0 12px 30px rgba(8,36,65,.15)' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  title: { flex: 1, fontSize: 17, fontWeight: '600', color: colors.navy },
  close: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EDF2F6', alignItems: 'center', justifyContent: 'center' },
  input: { height: 150, flexShrink: 1, borderRadius: 14, backgroundColor: '#F0F6F6', padding: 12, color: colors.navy, fontSize: 13, lineHeight: 19 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 },
  save: { backgroundColor: colors.teal, borderRadius: 22, minHeight: 36, justifyContent: 'center', paddingHorizontal: 20 },
  saveText: { color: 'white', fontSize: 12 },
  error: { color: colors.danger, fontSize: 12, marginTop: 8 },
});
