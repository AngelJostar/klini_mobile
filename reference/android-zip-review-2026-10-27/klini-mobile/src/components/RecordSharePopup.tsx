import React, { useState } from 'react';
import { Linking, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, Icon } from './ui';
import type { ClinicalRecord } from '../domain/types';
import { recordShareText } from '../domain/shareRecord';
import { openAttachment } from '../services/files';

export default function RecordSharePopup({ record, patientName, onClose }: { record: ClinicalRecord; patientName: string; onClose: () => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const message = recordShareText(record, patientName);
  async function send(destination: 'whatsapp' | 'social' | 'email' | 'attachment') {
    if (busy) return;
    setError(''); setBusy(true);
    try {
      if (destination === 'whatsapp') {
        await Linking.openURL(Platform.OS === 'web' ? `https://wa.me/?text=${encodeURIComponent(message)}` : `whatsapp://send?text=${encodeURIComponent(message)}`);
      } else if (destination === 'email') {
        await Linking.openURL(`mailto:?subject=${encodeURIComponent(record.title)}&body=${encodeURIComponent(message)}`);
      } else if (destination === 'attachment' && record.attachment) {
        await openAttachment(record.attachment);
      } else if (Platform.OS === 'web') {
        if (!navigator.share) throw new Error('Este navegador no ofrece el menú de compartir. Puedes usar WhatsApp o correo.');
        await navigator.share({ title: record.title, text: message });
      } else {
        await Share.share({ title: record.title, message }, { dialogTitle: 'Enviar nota', subject: record.title });
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      setError(destination === 'whatsapp' ? 'No se pudo abrir WhatsApp. Comprueba que esté instalado o elige otra opción.' : destination === 'email' ? 'No se pudo abrir el correo. Comprueba que tengas una aplicación de correo configurada.' : e instanceof Error ? e.message : 'No se pudo abrir la aplicación para compartir.');
    } finally { setBusy(false); }
  }
  return <Modal transparent animationType="fade" onRequestClose={onClose}>
    <View style={s.overlay}>
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar opciones de envío" style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={s.card} testID="record-share-popup" accessibilityViewIsModal>
        <View style={s.header}><Text style={s.title}>Enviar nota</Text><Pressable testID="record-share-close" accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} style={s.close}><Icon name="close" size={21} /></Pressable></View>
        <ScrollView>
          <Text style={s.record}>{record.title}</Text>
          <Text style={s.help}>Elige una aplicación y después el destinatario.</Text>
          <View style={s.options}>
            <Pressable testID="share-whatsapp" accessibilityRole="button" accessibilityLabel="Enviar por WhatsApp" disabled={busy} onPress={() => void send('whatsapp')} style={s.option}><Ionicons name="logo-whatsapp" size={32} color="#159D75" /><Text style={s.label}>WhatsApp</Text></Pressable>
            <Pressable testID="share-social" accessibilityRole="button" accessibilityLabel="Elegir red social en el menú de compartir" disabled={busy} onPress={() => void send('social')} style={s.option}><View style={s.social}><Ionicons name="logo-facebook" size={25} color="#4267A9" /><Ionicons name="logo-instagram" size={25} color="#A25C91" /></View><Text style={s.label}>Redes sociales</Text></Pressable>
            <Pressable testID="share-email" accessibilityRole="button" accessibilityLabel="Enviar por correo" disabled={busy} onPress={() => void send('email')} style={s.option}><Icon name="mail" size={32} color={colors.teal} /><Text style={s.label}>Correo</Text></Pressable>
          </View>
          <Text style={s.help}>Las redes disponibles dependen de las aplicaciones instaladas y de si admiten texto.</Text>
          <Text selectable style={s.preview} testID="share-preview">{message}</Text>
          {record.attachment && <Pressable accessibilityRole="button" disabled={busy} onPress={() => void send('attachment')} style={s.attachment}><Icon name="attachment" color={colors.teal} /><Text style={s.label}>Compartir archivo adjunto</Text></Pressable>}
          {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'rgba(8,25,39,.38)' },
  card: { width: '100%', maxWidth: 350, maxHeight: '80%', borderRadius: 22, backgroundColor: 'white', padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.navy },
  close: { width: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center' },
  record: { color: colors.navy, fontSize: 14, marginBottom: 6 },
  help: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  options: { flexDirection: 'row', marginVertical: 22 },
  option: { flex: 1, minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: 9 },
  social: { flexDirection: 'row', height: 32, alignItems: 'center', gap: 3 },
  label: { fontSize: 11, color: colors.navy, textAlign: 'center' },
  preview: { marginTop: 16, padding: 12, backgroundColor: '#F5FAFB', borderRadius: 12, color: '#59748B', fontSize: 11, lineHeight: 17 },
  attachment: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, marginTop: 12 },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18, marginTop: 12 },
});
