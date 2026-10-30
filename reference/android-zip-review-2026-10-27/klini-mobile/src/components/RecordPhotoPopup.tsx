import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { Asset } from 'expo-asset';
import { colors, Icon } from './ui';
import { savePhotoAttachment } from '../services/files';
import { transcribePhoto } from '../services/transcription';
import type { Transcription } from '../domain/transcription';
import type { Attachment } from '../domain/types';

export default function RecordPhotoPopup({ title = 'Foto', enableTranscription = false, onClose, onCapture }: { title?: string; enableTranscription?: boolean; onClose: () => void; onCapture: (attachment: Attachment, transcription?: Transcription) => void }) {
  const camera = useRef<CameraView>(null);
  const alive = useRef(true);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const request = useRef<AbortController | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [demo, setDemo] = useState(false);
  async function loadDemo() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const asset = await Asset.fromModule(require('../../assets/demo-prescription.jpg')).downloadAsync();
      if (alive.current) { setPhoto(asset.localUri ?? asset.uri); setDemo(true); }
    } catch { if (alive.current) setError('No se pudo cargar la receta de ejemplo. Intenta nuevamente.'); }
    finally { if (alive.current) setBusy(false); }
  }
  useEffect(() => { alive.current = true; return () => { alive.current = false; request.current?.abort(); }; }, []);
  useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    return () => back.remove();
  }, [onClose]);
  async function capture() {
    if (!ready || busy || !camera.current) return;
    setBusy(true); setError('');
    try {
      const picture = await camera.current.takePictureAsync({ quality: .45 });
      if (alive.current && picture?.uri) { setPhoto(picture.uri); setDemo(false); }
    } catch { if (alive.current) setError('No se pudo tomar la foto. Intenta de nuevo.'); }
    finally { if (alive.current) { setBusy(false); setTranscribing(false); } }
  }
  async function confirmPhoto(withTranscription = false) {
    if (!photo || busy) return;
    setBusy(true); setError(''); setTranscribing(withTranscription);
    try {
      request.current = new AbortController();
      const transcription = withTranscription ? await transcribePhoto(photo, request.current.signal) : undefined;
      if (!alive.current) return;
      const attachment = await savePhotoAttachment(photo);
      if (alive.current) onCapture(attachment, transcription);
    } catch (e) { if (alive.current) setError(e instanceof Error ? e.message : 'No se pudo guardar la foto.'); }
    finally { if (alive.current) { setBusy(false); setTranscribing(false); } }
  }
  return <View style={s.overlay}>
    <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Cerrar foto" onPress={onClose} />
    <View style={s.card} testID="record-photo-popup" role="dialog" accessibilityLabel={title} accessibilityViewIsModal>
      <View style={s.header}><Text style={s.title}>{title}</Text><Pressable testID="record-photo-close" accessibilityRole="button" accessibilityLabel="Cerrar foto" onPress={onClose} style={s.close}><Icon name="close" size={18} /></Pressable></View>
      <View style={s.preview}>
        {permission?.granted ? <CameraView ref={camera} style={StyleSheet.absoluteFill} facing={facing} onCameraReady={() => setReady(true)} onMountError={() => { setReady(false); setError('No se pudo abrir la cámara. Comprueba que esté disponible.'); }} /> : <View style={s.permission}>
          <Icon name="camera" size={36} color={colors.teal} />
          <Text style={s.message}>Permite el acceso a la cámara para fotografiar tu documento.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Permitir cámara" onPress={() => { void (permission?.canAskAgain === false && Platform.OS !== 'web' ? Linking.openSettings() : requestPermission()).catch(() => setError('No se pudo acceder a la cámara. Revisa los permisos.')); }} style={s.action}><Text style={s.actionText}>{permission?.canAskAgain === false && Platform.OS !== 'web' ? 'Abrir ajustes' : 'Permitir cámara'}</Text></Pressable>
        </View>}
        {photo && <Image testID="record-photo-preview" source={{ uri: photo }} style={[StyleSheet.absoluteFill, { backgroundColor: '#F1F7F7' }]} resizeMode="contain" />}
      </View>
      {enableTranscription && <Pressable testID="record-scan-demo" accessibilityRole="button" accessibilityLabel="Usar receta de ejemplo" disabled={busy} onPress={() => void loadDemo()} style={[s.action, { marginTop: 8, alignItems: 'center' }]}><Text style={s.actionText}>{demo && photo ? 'Receta ficticia · Demo' : 'Usar receta de ejemplo'}</Text></Pressable>}
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      <View style={s.controls}>
        {photo ? <><Pressable accessibilityRole="button" accessibilityLabel="Repetir foto" disabled={busy} onPress={() => { setPhoto(null); setError(''); }} style={({ pressed }) => [s.photoAction, s.repeatAction, { opacity: busy ? .5 : pressed ? .75 : 1 }]}><Icon name="refresh-outline" size={15} color="#39738A" /><Text style={s.repeatText}>Repetir</Text></Pressable><Pressable testID="record-photo-use" accessibilityRole="button" accessibilityLabel="Usar foto" disabled={busy} onPress={() => void confirmPhoto()} style={({ pressed }) => [s.photoAction, s.useAction, { opacity: busy ? .5 : pressed ? .75 : 1 }]}><Icon name="check" size={16} color="white" /><Text style={s.useText}>{busy && !transcribing ? 'Guardando…' : 'Usar foto'}</Text></Pressable>{enableTranscription && <Pressable testID="record-photo-transcribe" accessibilityRole="button" accessibilityLabel="Transcribir" disabled={busy} onPress={() => void confirmPhoto(true)} style={[s.photoAction, s.useAction, busy && { opacity: .5 }]}><Text style={s.useText}>{transcribing ? 'Leyendo…' : 'Transcribir'}</Text></Pressable>}</> : <>
          <Pressable testID="record-photo-capture" accessibilityRole="button" accessibilityLabel="Tomar foto" disabled={!ready || busy} onPress={() => void capture()} style={[s.shutter, (!ready || busy) && { opacity: .4 }]} />
          <Pressable testID="record-photo-flip" accessibilityRole="button" accessibilityLabel="Cambiar cámara" disabled={!ready || busy} onPress={() => { setFacing(current => current === 'back' ? 'front' : 'back'); }} style={s.flip}><Icon name="camera-reverse-outline" size={26} color={colors.teal} /></Pressable>
        </>}
      </View>
    </View>
  </View>;
}
const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: 'rgba(8,36,65,.28)' },
  card: { width: '100%', maxWidth: 310, padding: 12, borderRadius: 18, backgroundColor: '#FFFFFF', boxShadow: '0 12px 30px rgba(8,36,65,.15)' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  title: { flex: 1, fontSize: 17, fontWeight: '600', color: colors.navy },
  close: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EDF4F7', alignItems: 'center', justifyContent: 'center' },
  preview: { width: '100%', aspectRatio: 1.12, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F1F7F7' },
  controls: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  photoAction: { minHeight: 34, paddingHorizontal: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  repeatAction: { backgroundColor: '#DDF3F5' },
  useAction: { backgroundColor: colors.teal },
  repeatText: { color: '#39738A', fontSize: 11, fontWeight: '600' },
  useText: { color: 'white', fontSize: 11, fontWeight: '600' },
  shutter: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: colors.teal, backgroundColor: 'white' },
  flip: { position: 'absolute', right: 16, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 14, gap: 10 },
  message: { color: colors.navy, fontSize: 12, textAlign: 'center', lineHeight: 17 },
  action: { padding: 10, borderRadius: 20, backgroundColor: '#DDF3F5' },
  actionText: { color: colors.navy, fontSize: 12 },
  error: { color: colors.danger, fontSize: 12, marginTop: 8 },
});
