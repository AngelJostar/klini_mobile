import React, { useCallback, useState } from 'react';
import { Image, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ClinicalRecord } from '../domain/types';
import ArchivePopup from './ArchivePopup';
import BookingFooterButton from './BookingFooterButton';
import RecordFlowSteps from './RecordFlowSteps';
import RecordDescriptionPopup from './RecordDescriptionPopup';
import type { RecordEntryMode } from './RecordTypePopup';
import { colors, Icon, TextField } from './ui';

type Draft = Omit<ClinicalRecord, 'id'>;

export interface RecordReviewSheetProps {
  draft: Draft;
  mode: RecordEntryMode;
  categoryLabel: string;
  onChange: (draft: Draft) => void;
  onBack: () => void;
  onClose: () => void;
  onSave: (draft: Draft) => void;
  onOpenAttachment: (draft: Draft) => void | Promise<void>;
  onChooseCategory: () => void;
  descriptionLabel?: string;
  hasTranscription?: boolean;
  error?: string;
  busy?: boolean;
}

function visibleValue(value?: string) {
  return value?.trim() || 'Sin dato';
}
function visibleDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : visibleValue(value);
}
function MetadataRow({ label, value, testID }: { label: string; value?: string; testID: string }) {
  return <View style={s.metadataRow}>
    <Text style={s.metadataLabel}>{label}</Text>
    <Text testID={testID} style={[s.metadataValue, !value?.trim() && s.emptyValue]}>{visibleValue(value)}</Text>
  </View>;
}
function MetadataInputRow({ label, value, onChangeText, testID, editable, maxLength = 120 }: { label: string; value?: string; onChangeText: (value: string) => void; testID: string; editable: boolean; maxLength?: number }) {
  return <View style={s.inputRow}>
    <Text style={s.inputLabel}>{label}</Text>
    <TextInput testID={testID} accessibilityLabel={label} placeholder="Escribe aquí" placeholderTextColor="#A0B0BF" value={value ?? ''} onChangeText={onChangeText} editable={editable} maxLength={maxLength} returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} underlineColorAndroid="transparent" style={[s.inlineInput, !value && s.placeholderInput]} />
  </View>;
}

export default function RecordReviewSheet({ draft, mode, categoryLabel, onChange, onBack, onClose, onSave, onOpenAttachment, onChooseCategory, descriptionLabel, hasTranscription = false, error = '', busy = false }: RecordReviewSheetProps) {
  const [editing, setEditing] = useState(false);
  const [descriptionEditing, setDescriptionEditing] = useState(false);
  const closeDescription = useCallback(() => { Keyboard.dismiss(); setDescriptionEditing(false); }, []);
  const attachment = draft.attachment;
  const isImage = attachment?.mimeType.startsWith('image/') ?? false;
  const textLabel = descriptionLabel ?? (hasTranscription ? 'Transcripción' : mode === 'text' ? 'Texto original' : 'Descripción');
  const originalLabel = mode === 'photo' ? 'Foto original' : mode === 'scan' ? 'Escaneo original' : mode === 'text' ? 'Texto original' : 'Archivo original';
  const hasDescription = !!draft.description.trim();
  const update = (patch: Partial<Draft>) => onChange({ ...draft, ...patch });
  const leave = (action: () => void) => { Keyboard.dismiss(); action(); };

  return <View testID="record-review-sheet" style={s.screen}>
    <View style={s.screen} pointerEvents={descriptionEditing ? 'none' : 'auto'} accessibilityElementsHidden={descriptionEditing} importantForAccessibility={descriptionEditing ? 'no-hide-descendants' : 'auto'}>
    <ArchivePopup
      title="Revisar y guardar"
      contentKey="record-review"
      animateEntrance
      onBack={() => leave(onBack)}
      onClose={() => leave(onClose)}
    >
      <RecordFlowSteps activeStep={4} />

      <View testID="record-review-original" style={s.original}>
        {isImage && attachment ? <Image source={{ uri: attachment.uri }} resizeMode="cover" style={s.thumbnail} /> : <View style={s.fileIcon}><Icon name="document" size={25} color={colors.teal} /></View>}
        <View style={s.originalText}>
          <Text style={s.originalLabel}>{originalLabel}</Text>
          <Text numberOfLines={1} style={s.filename}>{attachment?.name ?? (draft.title.trim() || 'Registro de texto')}</Text>
        </View>
        <Pressable testID="record-review-edit" accessibilityRole="button" accessibilityLabel={editing ? 'Terminar edición de datos' : 'Editar título y datos del registro'} accessibilityState={{ expanded: editing }} aria-expanded={editing} disabled={busy} onPress={() => { Keyboard.dismiss(); setEditing(value => !value); }} style={s.editButton} hitSlop={4}>
          <Icon name={editing ? 'check' : 'edit'} size={14} color={colors.tealDark} />
        </Pressable>
        {attachment && <Pressable testID="record-review-view" accessibilityRole="button" accessibilityLabel={`Ver archivo original: ${attachment.name}`} disabled={busy} onPress={() => { Keyboard.dismiss(); void onOpenAttachment(draft); }} style={({ pressed }) => [s.viewButton, pressed && s.pressed]}>
          <Text style={s.viewText}>Ver</Text><Icon name="chevronRight" size={14} color={colors.tealDark} />
        </Pressable>}
      </View>

      <View style={s.description}>
        <View style={s.descriptionHeader}>
          <Text style={s.metadataLabel}>{textLabel}</Text>
          <Pressable testID="record-review-description-edit" accessibilityRole="button" accessibilityLabel={hasDescription ? `Editar ${textLabel.toLowerCase()}` : `Agregar ${textLabel.toLowerCase()}`} accessibilityState={{ expanded: descriptionEditing }} aria-expanded={descriptionEditing} disabled={busy} onPress={() => setDescriptionEditing(true)} style={s.descriptionAction} hitSlop={4}>
            <Icon name="edit" size={13} color={colors.teal} /><Text style={s.descriptionActionText}>{hasDescription ? 'Editar' : 'Agregar'}</Text>
          </Pressable>
        </View>
        {hasDescription && <Text testID="record-review-summary-text" style={s.descriptionText}>{draft.description.trim()}</Text>}
      </View>

      <Pressable testID="record-review-category" accessibilityRole="button" accessibilityLabel={`Guardar en ${categoryLabel}. Cambiar categoría`} disabled={busy} onPress={() => leave(onChooseCategory)} style={({ pressed }) => [s.category, pressed && s.pressed]}>
        <Text style={s.metadataLabel}>Guardar en</Text><Text style={s.categoryValue}>{categoryLabel}</Text><Icon name="chevronRight" size={15} color={colors.teal} />
      </Pressable>

      <View testID="record-review-metadata">
        <MetadataRow label="Fecha" value={visibleDate(draft.date)} testID="record-review-date-value" />
        <MetadataInputRow label="Médico o laboratorio" value={draft.doctorName} onChangeText={doctorName => update({ doctorName })} testID="record-review-doctor" editable={!busy} />
        <MetadataInputRow label="Especialidad" value={draft.specialty} onChangeText={specialty => update({ specialty })} testID="record-review-specialty" editable={!busy} />
        <MetadataInputRow label="Hospital o institución" value={draft.institution} onChangeText={institution => update({ institution })} testID="record-review-institution" editable={!busy} maxLength={160} />
      </View>

      {editing && <View testID="record-review-inputs" style={s.editFields}>
        <TextField testID="photo-review-title" label="Título del registro" value={draft.title} onChangeText={title => update({ title })} editable={!busy} maxLength={120} />
        <TextField testID="photo-review-date" label="Fecha del documento (AAAA-MM-DD)" value={draft.date} onChangeText={date => update({ date })} editable={!busy} keyboardType="numbers-and-punctuation" maxLength={10} />
        {(draft.type === 'Consulta' || !!draft.time) && <TextField testID="record-review-time" label="Hora (opcional, HH:MM)" value={draft.time ?? ''} onChangeText={time => update({ time })} editable={!busy} keyboardType="numbers-and-punctuation" maxLength={5} />}
        {(draft.type === 'Consulta' || !!draft.reason) && <TextField testID="record-review-reason" label="Motivo (opcional)" value={draft.reason ?? ''} onChangeText={reason => update({ reason })} editable={!busy} multiline maxLength={1000} />}
      </View>}
      <View style={s.footer}>
        {!!error && <Text testID="record-review-error" accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}
        <BookingFooterButton testID="save-record" title={busy ? 'Guardando registro…' : 'Guardar registro'} icon="check" disabled={busy} onPress={() => { Keyboard.dismiss(); onSave(draft); }} />
      </View>
    </ArchivePopup>
    </View>
    {descriptionEditing && <RecordDescriptionPopup label={textLabel} initialValue={draft.description} onClose={closeDescription} onSave={description => { update({ description }); closeDescription(); }} />}
  </View>;
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  original: { flexDirection: 'row', alignItems: 'center', minHeight: 49, gap: 8, paddingVertical: 4, marginBottom: 3 },
  thumbnail: { width: 34, height: 34, borderRadius: 4, backgroundColor: '#E5ECEF' },
  fileIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  originalText: { flex: 1, minWidth: 0, gap: 2 },
  originalLabel: { color: colors.navy, fontSize: 12, lineHeight: 16, fontWeight: '600' },
  filename: { color: '#8DA1B4', fontSize: 9, lineHeight: 13 },
  editButton: { width: 24, height: 36, alignItems: 'center', justifyContent: 'center' },
  viewButton: { minWidth: 40, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  viewText: { color: colors.teal, fontSize: 10, lineHeight: 15 },
  description: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8EFF3', paddingBottom: 3 },
  descriptionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32, gap: 12 },
  descriptionAction: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  descriptionActionText: { color: colors.teal, fontSize: 10, lineHeight: 15 },
  descriptionText: { color: colors.navy, fontSize: 11, lineHeight: 17, paddingBottom: 7 },
  category: { flexDirection: 'row', alignItems: 'center', minHeight: 34, gap: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8EFF3' },
  categoryValue: { flex: 1, minWidth: 0, color: colors.navy, fontSize: 11, lineHeight: 16, fontWeight: '600', textAlign: 'right' },
  metadataRow: { minHeight: 29, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 5 },
  metadataLabel: { flex: 1, color: '#8A9EB2', fontSize: 10, lineHeight: 15 },
  metadataValue: { flex: 1, minWidth: 0, color: colors.navy, fontSize: 11, lineHeight: 16, textAlign: 'right' },
  emptyValue: { color: '#9AAABD' },
  inputRow: { alignItems: 'stretch', paddingTop: 5 },
  inputLabel: { color: '#8A9EB2', fontSize: 10, lineHeight: 15 },
  inlineInput: { width: '100%', minWidth: 0, height: 30, borderBottomWidth: 1, borderBottomColor: '#E8EFF3', textAlign: 'left', paddingHorizontal: 0, paddingVertical: 4, color: colors.navy, fontSize: 11, lineHeight: 16 },
  placeholderInput: { fontSize: 9 },
  editFields: { marginTop: 12 },
  pressed: { opacity: .7 },
  footer: { alignItems: 'center', gap: 8, width: '100%', paddingTop: 16, paddingBottom: 6 },
  error: { color: colors.danger, fontSize: 11, lineHeight: 16, textAlign: 'center' },
});
