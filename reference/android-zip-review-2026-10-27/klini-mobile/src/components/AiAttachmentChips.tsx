import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AiAttachment } from '../domain/kliniAiAttachments';
import { colors, Icon } from './ui';

export default function AiAttachmentChips({ attachments, disabled = false, onRemove }: {
  attachments: AiAttachment[];
  disabled?: boolean;
  onRemove: (id: string) => void;
}) {
  return <ScrollView testID="ai-attachment-chips" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    {attachments.map(attachment => <View key={attachment.id} testID="ai-attachment-chip" style={s.chip}>
      <Icon name={attachment.mimeType.startsWith('image/') ? 'image-outline' : 'document'} size={15} color={colors.tealDark} />
      <Text numberOfLines={1} style={s.name}>{attachment.name}</Text>
      <Pressable testID={`ai-attachment-remove-${attachment.id}`} accessibilityRole="button" accessibilityLabel={`Quitar ${attachment.name}`} accessibilityState={{ disabled }} disabled={disabled} hitSlop={4} onPress={() => onRemove(attachment.id)} style={[s.remove, disabled && s.disabled]}><Icon name="close" size={15} color={colors.muted} /></Pressable>
    </View>)}
  </ScrollView>;
}

const s = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingBottom: 6, gap: 7, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: 220, minHeight: 34, paddingLeft: 9, borderRadius: 12, backgroundColor: '#EFF8F8', borderWidth: 1, borderColor: '#DDEDEC' },
  name: { flexShrink: 1, maxWidth: 160, color: colors.navy, fontSize: 10 },
  remove: { width: 32, height: 34, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: .4 },
});
