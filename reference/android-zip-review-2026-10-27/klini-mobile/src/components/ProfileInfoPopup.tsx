import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, Icon } from './ui';
import { parseDate, todayISO } from '../domain/dates';

type Info = { name: string; kind: string; birthDate?: string; sex?: string; email?: string; phone?: string };

export default function ProfileInfoPopup({ profile, onClose }: { profile: Info; onClose: () => void }) {
  const birth = profile.birthDate ? parseDate(profile.birthDate) : null;
  const validBirth = birth && !Number.isNaN(birth.getTime()) && profile.birthDate! <= todayISO();
  const today = parseDate(todayISO());
  const age = validBirth ? today.getFullYear() - birth.getFullYear() -
    (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate()) ? 1 : 0) : null;
  const initials = profile.name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  const rows = [
    ['Fecha de nacimiento', validBirth ? birth.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sin dato'],
    ['Edad', age === null ? 'Sin dato' : `${age} años`],
    ['Sexo', profile.sex || 'Sin dato'],
    ['Correo', profile.email || 'Sin dato'],
    ['Teléfono', profile.phone || 'Sin dato'],
  ];
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Cerrar información del perfil" onPress={onClose} />
        <View style={s.card} testID="profile-info-popup" accessibilityViewIsModal>
          <View style={s.header}>
            <Text accessibilityRole="header" style={s.title}>Información del perfil</Text>
            <Pressable testID="profile-info-close" accessibilityRole="button" accessibilityLabel="Cerrar información" onPress={onClose} style={s.close}><Icon name="close" size={20} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={s.content}>
            <View style={s.person}>
              <View style={s.avatar}><Text style={s.initials}>{initials}</Text></View>
              <View style={{ flex: 1 }}><Text style={s.name}>{profile.name}</Text><Text style={s.kind}>{profile.kind}</Text></View>
            </View>
            {rows.map(([label, value]) => <View style={s.row} key={label}><Text style={s.label}>{label}</Text><Text selectable style={s.value}>{value}</Text></View>)}
            <Text style={s.note}>Datos de ejemplo</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'rgba(8,25,39,.48)' },
  card: { width: '100%', maxWidth: 340, maxHeight: '85%', borderRadius: 20, backgroundColor: 'white', paddingHorizontal: 20, paddingBottom: 20, boxShadow: '0 16px 36px rgba(8,25,39,.2)' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 8 },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.navy },
  close: { width: 36, height: 44, alignItems: 'flex-end', justifyContent: 'center' },
  content: { paddingTop: 4 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 18 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#DFF6F3', alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 14, color: colors.tealDark, fontWeight: '600' },
  name: { color: colors.navy, fontSize: 13, fontWeight: '700' },
  kind: { color: colors.muted, fontSize: 11, marginTop: 3 },
  row: { flexDirection: 'row', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DFE8EF', paddingVertical: 11 },
  label: { flex: 1.1, color: colors.muted, fontSize: 11 },
  value: { flex: 1, color: colors.navy, fontSize: 11 },
  note: { fontSize: 9, color: colors.muted, marginTop: 12 },
});
