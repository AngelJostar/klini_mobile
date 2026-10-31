import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { ACCEPTANCE_STATEMENT } from '../domain/insuranceEnrollment';
import type { Attachment } from '../domain/types';
import { saveInsuranceAcceptanceVideo } from '../services/insuranceEnrollmentFiles';
import { colors, Icon } from './ui';

type Clip = { uri: string; mimeType: string; duration: number };
type Props = { onClose: () => void; onRecorded: (attachment: Attachment) => void };
const MIN_SECONDS = 2;
const MAX_SECONDS = 20;

/** Records actual camera and microphone media; acceptance still requires an explicit use action. */
export default function InsuranceAcceptanceRecorder({ onClose, onRecorded }: Props) {
  const camera = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission, getCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission, getMicrophonePermission] = useMicrophonePermissions();
  const [webGranted, setWebGranted] = useState(false);
  const [ready, setReady] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [clip, setClip] = useState<Clip | null>(null);
  const [error, setError] = useState('');
  const alive = useRef(true);
  const operation = useRef(false);
  const recordingNow = useRef(false);
  const duration = useRef(0);
  const startedAt = useRef(0);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const limit = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const interrupted = useRef(false);
  const objectUrl = useRef<string | null>(null);
  const webVideo = useRef<HTMLVideoElement | null>(null);
  const granted = Platform.OS === 'web' ? webGranted : !!cameraPermission?.granted && !!microphonePermission?.granted;

  function clearTimers() {
    if (ticker.current) clearInterval(ticker.current);
    if (limit.current) clearTimeout(limit.current);
    ticker.current = null; limit.current = null;
  }
  function stopTracks() {
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    if (webVideo.current) webVideo.current.srcObject = null;
  }
  function releaseUrl() {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
  }
  const dispose = useCallback(() => {
    alive.current = false;
    clearTimers();
    if (recorder.current) {
      recorder.current.onstop = null; recorder.current.ondataavailable = null; recorder.current.onerror = null;
      if (recorder.current.state !== 'inactive') recorder.current.stop();
      recorder.current = null;
    }
    if (recordingNow.current && Platform.OS !== 'web') camera.current?.stopRecording();
    recordingNow.current = false;
    stopTracks(); releaseUrl();
  }, []);
  const close = useCallback(() => { dispose(); onClose(); }, [dispose, onClose]);

  useEffect(() => {
    alive.current = true;
    return dispose;
  }, [dispose]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { close(); return true; });
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); close(); } };
    if (Platform.OS === 'web') window.addEventListener('keydown', keydown, true);
    return () => {
      subscription.remove();
      if (Platform.OS === 'web') window.removeEventListener('keydown', keydown, true);
    };
  }, [close]);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active' && alive.current) {
        void Promise.all([getCameraPermission(), getMicrophonePermission()]).catch(() => {});
      }
    });
    return () => subscription.remove();
  }, [getCameraPermission, getMicrophonePermission]);

  async function enableCamera() {
    if (operation.current || !alive.current) return;
    operation.current = true; setRequesting(true); setError('');
    try {
      if (Platform.OS === 'web') {
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
          throw new Error('Este navegador no permite grabar video. Abre Klini en un navegador compatible con HTTPS o en la aplicación móvil.');
        }
        const media = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 20, max: 24 } },
          audio: true,
        });
        if (!alive.current) { media.getTracks().forEach(track => track.stop()); return; }
        if (!media.getAudioTracks().length || !media.getVideoTracks().length) {
          media.getTracks().forEach(track => track.stop());
          throw new Error('Necesitamos cámara y micrófono para grabar tu aceptación.');
        }
        stopTracks(); stream.current = media; interrupted.current = false; setWebGranted(true); setReady(true);
        media.getTracks().forEach(track => track.addEventListener('ended', () => {
          if (!alive.current || stream.current !== media) return;
          interrupted.current = true;
          if (recordingNow.current) stop();
          else {
            stopTracks(); setReady(false); setWebGranted(false);
            setError('Se interrumpió la cámara o el micrófono. Permite el acceso nuevamente para repetir la grabación.');
          }
        }, { once: true }));
        if (webVideo.current) { webVideo.current.srcObject = media; void webVideo.current.play().catch(() => {}); }
      } else {
        if (cameraPermission?.canAskAgain === false || microphonePermission?.canAskAgain === false) {
          await Linking.openSettings();
          return;
        }
        const cam = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
        if (!alive.current) return;
        const mic = microphonePermission?.granted ? microphonePermission : await requestMicrophonePermission();
        if (alive.current && (!cam.granted || !mic.granted)) setError('Permite el acceso a cámara y micrófono para grabar. Puedes intentarlo nuevamente o abrir los ajustes.');
      }
    } catch (cause) {
      if (alive.current) setError(cause instanceof Error && !['NotAllowedError', 'NotFoundError', 'NotReadableError'].includes(cause.name)
        ? cause.message : 'No se pudo acceder a la cámara o al micrófono. Revisa los permisos y que no estén en uso por otra aplicación.');
    } finally {
      operation.current = false;
      if (alive.current) setRequesting(false);
    }
  }

  function stop() {
    if (!recordingNow.current) return;
    recordingNow.current = false; clearTimers();
    if (alive.current) { setRecording(false); setProcessing(true); }
    if (Platform.OS === 'web') {
      if (recorder.current?.state === 'recording') recorder.current.stop();
    } else camera.current?.stopRecording();
  }

  async function start() {
    if (!ready || !granted || operation.current || recordingNow.current || !alive.current) return;
    operation.current = true; setError(''); setSeconds(0); duration.current = 0;
    startedAt.current = Date.now(); recordingNow.current = true; setRecording(true);
    try {
      if (Platform.OS === 'web') {
        const media = stream.current;
        if (!media?.getTracks().every(track => track.readyState === 'live')) {
          stopTracks(); setWebGranted(false); setReady(false);
          throw new Error('La cámara dejó de estar disponible. Permite el acceso nuevamente.');
        }
        const mimeType = ['video/webm;codecs=vp8,opus', 'video/mp4', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type));
        const capture = new MediaRecorder(media, { ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: 300_000, audioBitsPerSecond: 64_000 });
        recorder.current = capture;
        const chunks: BlobPart[] = [];
        capture.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
        capture.onerror = () => {
          capture.onstop = null; clearTimers(); stopTracks(); recordingNow.current = false; operation.current = false;
          if (alive.current) { setRecording(false); setProcessing(false); setReady(false); setWebGranted(false); setError('No se pudo completar la grabación. Intenta nuevamente.'); }
        };
        capture.onstop = () => {
          const elapsed = (Date.now() - startedAt.current) / 1000;
          clearTimers(); stopTracks(); operation.current = false; recordingNow.current = false;
          if (!alive.current) return;
          setRecording(false); setProcessing(false); setReady(false); setWebGranted(false);
          if (interrupted.current) { setError('Se interrumpió la cámara o el micrófono. Permite el acceso nuevamente para repetir la grabación.'); return; }
          const video = new Blob(chunks, { type: capture.mimeType || mimeType || 'video/webm' });
          if (elapsed < MIN_SECONDS || !video.size) { setError('La grabación debe durar al menos 2 segundos. Intenta nuevamente.'); return; }
          if (video.size > 2 * 1024 * 1024) { setError('El video es demasiado grande. Repite la grabación con una frase más corta.'); return; }
          releaseUrl(); objectUrl.current = URL.createObjectURL(video);
          setClip({ uri: objectUrl.current, mimeType: video.type, duration: Math.min(elapsed, MAX_SECONDS) });
        };
        capture.start(250);
        ticker.current = setInterval(() => {
          duration.current = (Date.now() - startedAt.current) / 1000;
          if (alive.current) setSeconds(Math.min(duration.current, MAX_SECONDS));
        }, 100);
        limit.current = setTimeout(stop, MAX_SECONDS * 1000);
      } else {
        const result = await camera.current?.recordAsync({ maxDuration: MAX_SECONDS, maxFileSize: 15 * 1024 * 1024, progressUpdateInterval: .1, ...(Platform.OS === 'ios' ? { codec: 'avc1' as const } : {}) });
        clearTimers(); recordingNow.current = false; operation.current = false;
        if (!alive.current) return;
        setRecording(false); setProcessing(false);
        if (!result?.uri || duration.current < MIN_SECONDS) { setError('La grabación debe durar al menos 2 segundos. Intenta nuevamente.'); return; }
        setClip({ uri: result.uri, mimeType: /\.mov(?:\?.*)?$/i.test(result.uri) ? 'video/quicktime' : 'video/mp4', duration: Math.min(duration.current, MAX_SECONDS) });
      }
    } catch (cause) {
      clearTimers(); recordingNow.current = false; operation.current = false;
      if (alive.current) { setRecording(false); setProcessing(false); setError(cause instanceof Error && cause.message.startsWith('La cámara dejó') ? cause.message : 'No se pudo iniciar la grabación. Revisa la cámara y el micrófono e intenta nuevamente.'); }
    }
  }

  async function persistVideo() {
    if (!clip || operation.current || !alive.current) return;
    operation.current = true; setSaving(true); setError('');
    try {
      const attachment = await saveInsuranceAcceptanceVideo(clip.uri, clip.mimeType);
      if (alive.current) { dispose(); onRecorded(attachment); }
    } catch (cause) {
      if (alive.current) setError(cause instanceof Error ? cause.message : 'No se pudo guardar el video. Intenta nuevamente.');
    } finally {
      operation.current = false;
      if (alive.current) setSaving(false);
    }
  }

  function retake() {
    if (operation.current) return;
    releaseUrl(); setClip(null); setError(''); setReady(false); setSeconds(0);
    if (Platform.OS === 'web') void enableCamera();
  }

  return <View style={s.overlay}>
    <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel="Cerrar grabación" />
    <View style={s.card} testID="insurance-acceptance-recorder" role="dialog" accessibilityLabel="Grabar aceptación" accessibilityViewIsModal>
      <View style={s.header}><Text style={s.title}>Grabar aceptación</Text><Pressable testID="insurance-recorder-close" accessibilityRole="button" accessibilityLabel="Cerrar grabación" onPress={close} style={s.close}><Icon name="close" size={18} /></Pressable></View>
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator>
        <View style={s.preview}>
          {clip ? Platform.OS === 'web' ? React.createElement('video', { src: clip.uri, controls: true, playsInline: true, style: { width: '100%', height: '100%', objectFit: 'contain' }, 'aria-label': 'Revisar video grabado' }) : <View style={s.placeholder}><Icon name="check" size={36} color={colors.teal} /><Text style={s.message}>Grabación lista · {Math.round(clip.duration)} s</Text><Text style={s.caption}>Video con audio</Text></View>
            : granted ? Platform.OS === 'web' ? React.createElement('video', { ref: (element: HTMLVideoElement | null) => { webVideo.current = element; if (element && stream.current) { element.srcObject = stream.current; void element.play().catch(() => {}); } }, autoPlay: true, muted: true, playsInline: true, style: { width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }, 'aria-label': 'Cámara frontal' })
              : <CameraView ref={camera} facing="front" mode="video" mute={false} videoQuality={Platform.OS === 'android' ? '480p' : '4:3'} videoBitrate={800_000} style={StyleSheet.absoluteFill} onCameraReady={() => { if (alive.current) setReady(true); }} onMountError={() => { if (alive.current) { setReady(false); setError('No se pudo abrir la cámara. Comprueba que esté disponible.'); } }} onRecordingProgress={progress => { duration.current = progress.duration; if (alive.current) setSeconds(progress.duration); }} />
              : <View style={s.placeholder}><Icon name="video" size={34} color={colors.teal} /><Text style={s.message}>Permite cámara y micrófono para grabar tu aceptación.</Text></View>}
          {recording && <View style={s.recording}><View style={s.dot} /><Text style={s.recordingText}>{Math.floor(seconds)} / 20 s</Text></View>}
        </View>
        <Text style={s.caption}>Graba esta frase mirando a la cámara:</Text>
        <Text style={s.statement}>“{ACCEPTANCE_STATEMENT}”</Text>
        <Text style={s.caption}>Video de 2 a 20 segundos. Se conservará con tu solicitud local de demostración.</Text>
        {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
        <View style={s.actions}>
          {clip ? <><Pressable testID="insurance-recorder-retake" accessibilityRole="button" onPress={retake} disabled={saving} style={[s.button, saving && s.disabled]}><Icon name="refresh-outline" size={15} color={colors.tealDark} /><Text style={s.buttonText}>Repetir</Text></Pressable><Pressable testID="insurance-recorder-use" accessibilityRole="button" onPress={() => void persistVideo()} disabled={saving} style={[s.button, saving && s.disabled]}><Icon name="check" size={15} color={colors.tealDark} /><Text style={s.buttonText}>{saving ? 'Guardando…' : 'Usar video'}</Text></Pressable></>
            : recording ? <Pressable testID="insurance-recorder-stop" accessibilityRole="button" accessibilityLabel="Detener grabación" disabled={seconds < MIN_SECONDS} onPress={stop} style={[s.button, seconds < MIN_SECONDS && s.disabled]}><Icon name="stop" size={15} color={colors.tealDark} /><Text style={s.buttonText}>Detener grabación</Text></Pressable>
              : !granted ? <Pressable testID="insurance-recorder-permission" accessibilityRole="button" disabled={requesting} onPress={() => void enableCamera()} style={[s.button, requesting && s.disabled]}><Text style={s.buttonText}>{requesting ? 'Solicitando permisos…' : Platform.OS !== 'web' && (cameraPermission?.canAskAgain === false || microphonePermission?.canAskAgain === false) ? 'Abrir ajustes' : 'Permitir cámara y micrófono'}</Text></Pressable>
                : <Pressable testID="insurance-recorder-start" accessibilityRole="button" disabled={!ready || processing} onPress={() => void start()} style={[s.button, (!ready || processing) && s.disabled]}><Icon name="camera" size={16} color={colors.tealDark} /><Text style={s.buttonText}>{processing ? 'Preparando video…' : 'Iniciar grabación'}</Text></Pressable>}
        </View>
      </ScrollView>
    </View>
  </View>;
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(8,36,65,.3)' },
  card: { width: '100%', maxWidth: 330, maxHeight: '90%', padding: 14, borderRadius: 20, backgroundColor: 'white', boxShadow: '0 12px 30px rgba(8,36,65,.15)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  title: { flex: 1, fontSize: 17, fontWeight: '600', color: colors.navy },
  close: { height: 30, width: 30, borderRadius: 15, backgroundColor: '#EDF4F7', alignItems: 'center', justifyContent: 'center' },
  body: { gap: 10 },
  preview: { width: '100%', aspectRatio: 1.35, borderRadius: 12, overflow: 'hidden', backgroundColor: '#EDF3F6' },
  placeholder: { flex: 1, padding: 18, gap: 10, alignItems: 'center', justifyContent: 'center' },
  message: { color: colors.navy, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  caption: { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  statement: { fontSize: 14, fontWeight: '600', color: colors.navy, textAlign: 'center', lineHeight: 20 },
  actions: { minHeight: 42, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 9, marginVertical: 2 },
  button: { minHeight: 34, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#DDF5F2' },
  buttonText: { color: colors.tealDark, fontSize: 11, fontWeight: '500' },
  disabled: { opacity: .45 },
  error: { fontSize: 12, lineHeight: 17, color: colors.danger },
  recording: { position: 'absolute', left: 10, top: 10, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12, flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: 'rgba(8,36,65,.8)' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#F56C7B' },
  recordingText: { color: 'white', fontSize: 11 },
});
