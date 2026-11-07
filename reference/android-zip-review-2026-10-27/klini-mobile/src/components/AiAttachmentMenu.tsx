import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, Icon } from './ui';

export type AiAttachmentChoice = 'camera' | 'photos' | 'files';

export default function AiAttachmentMenu({ bottom, onChoose, onClose }: {
  bottom: number;
  onChoose: (choice: AiAttachmentChoice) => void;
  onClose: () => void;
}) {
  return <View style={s.overlay}>
    <Pressable testID="ai-attachment-dismiss" accessibilityRole="button" accessibilityLabel="Cerrar opciones de adjuntos" onPress={onClose} style={StyleSheet.absoluteFill} />
    <View testID="ai-attachment-menu" accessibilityViewIsModal accessibilityLabel="Adjuntar a Klini IA" style={[s.card, { bottom }]}>
      {([
        ['camera', 'Cámara', 'camera'],
        ['photos', 'Fotos', 'image-outline'],
        ['files', 'Archivos', 'document'],
      ] as const).map(([choice, label, icon], index) => <Pressable key={choice} testID={`ai-attachment-${choice}`} accessibilityRole="button" accessibilityLabel={`Adjuntar desde ${label}`} onPress={() => onChoose(choice)} style={({ pressed }) => [s.row, index > 0 && s.divider, pressed && s.pressed]}>
        <View style={s.icon}><Icon name={icon} size={17} color={colors.tealDark} /></View><Text style={s.label}>{label}</Text>
      </Pressable>)}
    </View>
  </View>;
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 40, backgroundColor: 'rgba(8,36,65,.14)' },
  card: { position: 'absolute', left: 72, width: 164, paddingHorizontal: 12, borderRadius: 16, backgroundColor: 'white', borderWidth: 1, borderColor: '#E2EBEF', boxShadow: '0 6px 24px rgba(8,36,65,.14)' },
  row: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 2 },
  icon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EDF9F7' },
  divider: { borderTopWidth: 1, borderTopColor: '#EDF2F5' },
  label: { fontSize: 13, color: colors.navy },
  pressed: { opacity: .6 },
});
