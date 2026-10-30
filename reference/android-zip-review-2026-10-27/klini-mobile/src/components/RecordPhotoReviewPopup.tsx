import React, { useEffect, useState } from 'react';
import { BackHandler, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import type { ClinicalRecord } from '../domain/types';
import { todayISO } from '../domain/dates';
import { filterDateToISO } from '../domain/historyFilters';
import { colors, Icon } from './ui';

type Draft = Omit<ClinicalRecord, 'id'>;
export default function RecordPhotoReviewPopup({ value, onChange, onClose, onSave }: {
  value: Draft; onChange: (draft: Draft) => void; onClose: () => void; onSave: (draft: Draft) => void;
}) {
  const [details, setDetails] = useState(false);
  const [preview, setPreview] = useState(false);
  const [date, setDate] = useState(value.date.split('-').reverse().join('/'));
  const [error, setError] = useState('');
  const [anchorTop, setAnchorTop] = useState<number | null>(null);
  const { height } = useWindowDimensions();
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { if (preview) setPreview(false); else onClose(); return true; });
    return () => subscription.remove();
  }, [preview, onClose]);
  function save() {
    const iso = filterDateToISO(date);
    if (!iso || iso > todayISO()) { setDetails(true); setError('Escribe una fecha válida, igual o anterior a hoy.'); return; }
    try { onSave({ ...value, date: iso, title: value.title.trim() || 'Foto adjunta', description: value.description.trim() }); }
    catch { setError('No se pudo guardar el registro. Intenta de nuevo.'); }
  }
  return <KeyboardAvoidingView style={[s.overlay, anchorTop !== null && { justifyContent: 'flex-start', paddingTop: anchorTop }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar revisión" />
    <View onLayout={event => { const top = event.nativeEvent.layout.y; setAnchorTop(current => current ?? top); }} style={[s.card, anchorTop !== null && { maxHeight: Math.max(160, height - anchorTop - 28) }]} testID="record-photo-review" accessibilityViewIsModal role="dialog" accessibilityLabel="Revisar registro">
      <View style={s.header}><Text style={s.title}>Revisar registro</Text><Pressable testID="photo-review-close" accessibilityRole="button" accessibilityLabel="Cerrar revisión" onPress={onClose} style={s.close}><Icon name="close" size={18} color="#8296AA" /></Pressable></View>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable testID="photo-review-view" accessibilityRole="button" accessibilityLabel="Ver foto adjunta" onPress={() => setPreview(true)} style={s.attachment}>
          <Image source={{ uri: value.attachment?.uri }} style={s.thumbnail} resizeMode="cover" />
          <Text style={s.attachmentLabel}>Foto adjunta</Text><Text style={s.viewText}>Ver</Text><Icon name="chevronRight" size={15} color={colors.teal} />
        </Pressable>
        <View style={s.textHeader}><TextInput testID="photo-review-title" accessibilityLabel="Título de la foto" placeholder="Título de la foto" placeholderTextColor="#8BA0B1" value={value.title} onChangeText={title => onChange({ ...value, title })} maxLength={120} style={[s.input, { flex: 1, marginBottom: 0 }]} /><Text style={s.badge}>Por revisar</Text></View>
        <TextInput testID="photo-review-text" accessibilityLabel="Descripción de la foto" placeholder="Agrega una descripción de la foto" placeholderTextColor="#8BA0B1" multiline maxLength={10000} value={value.description} onChangeText={description => onChange({ ...value, description })} style={s.textArea} textAlignVertical="top" />
        <Pressable testID="photo-review-details" accessibilityRole="button" accessibilityState={{ expanded: details }} onPress={() => setDetails(!details)} style={s.details}><Text style={s.detailsLabel}>Datos del documento</Text><Icon name={details ? 'chevronUp' : 'chevronDown'} size={16} color="#8296AA" /></Pressable>
        {details && <View style={s.fields}>
          <Text style={s.label}>Fecha</Text><TextInput testID="photo-review-date" accessibilityLabel="Fecha del documento" value={date} onChangeText={setDate} placeholder="dd/mm/aaaa" maxLength={10} style={s.input} />
          <Text style={s.label}>Médico o laboratorio</Text><TextInput accessibilityLabel="Médico o laboratorio" value={value.doctorName} onChangeText={doctorName => onChange({ ...value, doctorName })} maxLength={120} style={s.input} />
          <Text style={s.label}>Institución u hospital</Text><TextInput accessibilityLabel="Institución u hospital" value={value.institution ?? ''} onChangeText={institution => onChange({ ...value, institution })} maxLength={160} style={s.input} />
        </View>}
        {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      </ScrollView>
      <View style={s.footer}><Pressable testID="photo-review-save" accessibilityRole="button" accessibilityLabel="Guardar registro" onPress={save} style={s.save}><Text style={s.saveText}>Guardar</Text></Pressable></View>
    </View>
    {preview && <View style={s.overlay} accessibilityViewIsModal><View style={[s.card, { height: '75%' }]} testID="photo-review-full-image"><View style={s.header}><Text style={s.title}>Foto adjunta</Text><Pressable testID="photo-preview-close" accessibilityRole="button" accessibilityLabel="Volver a revisar registro" onPress={() => setPreview(false)} style={s.close}><Icon name="close" size={18} /></Pressable></View><Image source={{ uri: value.attachment?.uri }} resizeMode="contain" style={{ flex: 1, width: '100%' }} /></View></View>}
  </KeyboardAvoidingView>;
}
const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: 'rgba(8,36,65,.28)' },
  card: { width: '100%', maxWidth: 330, maxHeight: '88%', padding: 14, borderRadius: 20, backgroundColor: 'white', boxShadow: '0 12px 30px rgba(8,36,65,.15)' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  title: { flex: 1, fontSize: 17, fontWeight: '600', color: colors.navy },
  close: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EDF2F6', alignItems: 'center', justifyContent: 'center' },
  attachment: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EFF8F8', padding: 9, borderRadius: 12 },
  thumbnail: { width: 54, height: 54, borderRadius: 6 },
  attachmentLabel: { flex: 1, color: colors.navy, fontSize: 12, fontWeight: '500' },
  viewText: { color: colors.teal, fontSize: 12 },
  textHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, marginBottom: 8 },
  label: { fontSize: 12, color: colors.navy, fontWeight: '500' },
  badge: { fontSize: 9, color: '#8296AA', backgroundColor: '#EDF2F6', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  textArea: { height: 96, borderRadius: 12, backgroundColor: '#EFF8F8', color: colors.navy, padding: 10, fontSize: 12, lineHeight: 18 },
  details: { marginTop: 12, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#E3ECF0', flexDirection: 'row', alignItems: 'center' },
  detailsLabel: { flex: 1, fontSize: 12, color: '#738BA2' },
  fields: { paddingTop: 8, gap: 4 },
  input: { height: 32, paddingHorizontal: 9, paddingVertical: 5, marginBottom: 4, borderRadius: 8, backgroundColor: '#EFF8F8', fontSize: 12, color: colors.navy },
  footer: { marginTop: 14, alignItems: 'flex-end' },
  save: { minHeight: 34, paddingHorizontal: 18, borderRadius: 20, backgroundColor: colors.teal, justifyContent: 'center' },
  saveText: { color: 'white', fontSize: 12 },
  error: { fontSize: 12, color: colors.danger, marginTop: 8 },
});
