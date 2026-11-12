import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ArchivePopup from './ArchivePopup';
import { colors, Icon } from './ui';

export default function RegistrationChoiceSheet({ onMedication, onDocument, onBack, onClose }: {
  onMedication: () => void;
  onDocument: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  return <ArchivePopup title="Agregar registro" onClose={onClose} onBack={onBack}>
    <View testID="registration-choice" style={s.content}>
      <Text accessibilityRole="header" style={s.question}>¿Qué deseas agregar?</Text>
      <View style={s.options}>
        <Pressable testID="registration-medication" accessibilityRole="button" onPress={onMedication} style={({ pressed }) => [s.option, pressed && s.pressed]}>
          <Icon name="pill" size={21} color="#87919D" />
          <Text style={s.label}>Medicamento</Text>
        </Pressable>
        <Pressable testID="registration-document" accessibilityRole="button" onPress={onDocument} style={({ pressed }) => [s.option, pressed && s.pressed]}>
          <Icon name="document" size={21} color="#87919D" />
          <Text style={s.label}>Documento</Text>
        </Pressable>
      </View>
    </View>
  </ArchivePopup>;
}

const s = StyleSheet.create({
  content: { paddingTop: 22 },
  question: { color: colors.navy, fontSize: 20, lineHeight: 27, fontWeight: '700' },
  options: { alignItems: 'center', gap: 20, marginTop: 30 },
  option: { width: '100%', maxWidth: 204, minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 28, borderWidth: 1, borderColor: '#E4E8ED', backgroundColor: '#F8F9FA', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  label: { color: '#384454', fontSize: 13, lineHeight: 19, fontWeight: '500', flexShrink: 1 },
  pressed: { backgroundColor: '#EEF1F4' },
});
