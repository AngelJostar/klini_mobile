import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Chip, colors, Icon, TextField } from './ui';
import { parseDate, todayISO, toISO } from '../domain/dates';
import { profileKinds } from '../state/managedProfiles';

export type EditableProfile = { id: string; name: string; kind: string; birthDate?: string; sex?: string; email?: string; phone?: string };
export default function ProfileEditPopup({ profile, onClose, onSave }: { profile: EditableProfile; onClose: () => void; onSave: (profile: EditableProfile) => Promise<void> }) {
  const [draft, setDraft] = useState(profile);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const field = (key: keyof EditableProfile, value: string) => setDraft(current => ({ ...current, [key]: value }));
  async function save() {
    if (busy) return;
    const next = { ...draft, name: draft.name.trim(), birthDate: draft.birthDate?.trim() ?? '', sex: draft.sex?.trim() ?? '', email: draft.email?.trim() ?? '', phone: draft.phone?.trim() ?? '' };
    if (!next.name || next.name.length > 255) { setError('Escribe un nombre válido.'); return; }
    if (next.birthDate && (!/^\d{4}-\d{2}-\d{2}$/.test(next.birthDate) || toISO(parseDate(next.birthDate)) !== next.birthDate || next.birthDate > todayISO())) { setError('Revisa la fecha de nacimiento (AAAA-MM-DD).'); return; }
    if (next.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email)) { setError('Revisa el correo electrónico.'); return; }
    if (next.phone && (next.phone.replace(/\D/g, '').length < 10 || next.phone.replace(/\D/g, '').length > 15)) { setError('El teléfono debe tener de 10 a 15 dígitos.'); return; }
    setBusy(true); setError('');
    try { await onSave(next); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar el perfil.'); }
    finally { setBusy(false); }
  }
  return <Modal transparent animationType="fade" onRequestClose={() => { if (!busy) onClose(); }}>
    <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => { if (!busy) onClose(); }} accessibilityLabel="Cerrar edición" />
      <View style={s.card} testID="profile-edit-popup" accessibilityViewIsModal>
        <View style={s.header}><Text style={s.title}>Editar información del perfil</Text><Pressable testID="profile-edit-close" accessibilityRole="button" accessibilityLabel="Cerrar edición" disabled={busy} style={s.close} onPress={onClose}><Icon name="close" size={20} /></Pressable></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.fields}>
          <TextField label="Nombre" testID="profile-edit-name" value={draft.name} onChangeText={value => field('name', value)} maxLength={255} />
          {profile.kind !== 'Perfil principal' && <View style={s.kinds}>{profileKinds.map(kind => <Chip key={kind} label={kind} selected={draft.kind === kind} onPress={() => field('kind', kind)} />)}</View>}
          <TextField label="Fecha de nacimiento" testID="profile-edit-birthDate" placeholder="AAAA-MM-DD" value={draft.birthDate ?? ''} onChangeText={value => field('birthDate', value)} />
          <TextField label="Sexo" testID="profile-edit-sex" value={draft.sex ?? ''} onChangeText={value => field('sex', value)} />
          <TextField label="Correo" testID="profile-edit-email" keyboardType="email-address" autoCapitalize="none" value={draft.email ?? ''} onChangeText={value => field('email', value)} />
          <TextField label="Teléfono" testID="profile-edit-phone" keyboardType="phone-pad" value={draft.phone ?? ''} onChangeText={value => field('phone', value)} />
          {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
        </ScrollView>
        <View style={s.footer}><Button title={busy ? 'Guardando…' : 'Guardar'} testID="profile-edit-save" disabled={busy} onPress={() => void save()} /></View>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'rgba(8,25,39,.48)' },
  card: { width: '100%', maxWidth: 360, maxHeight: '90%', backgroundColor: 'white', borderRadius: 20, paddingHorizontal: 20, paddingBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 10 },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.navy },
  close: { width: 36, height: 44, alignItems: 'flex-end', justifyContent: 'center' },
  fields: { gap: 12, paddingBottom: 14 },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  footer: { paddingTop: 10 },
  error: { color: colors.danger, fontSize: 12 },
});
