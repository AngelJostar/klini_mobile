import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import type { Attachment } from '../domain/types';
import { discardProfessionalIdentityCapture, discardProfessionalIdentityVideo, saveProfessionalIdentityVideo } from '../services/professionalIdentityFiles';
import {
  PROFESSIONAL_IDENTITY_MAX_SECONDS as MAX_SECONDS,
  PROFESSIONAL_IDENTITY_MIN_SECONDS as MIN_SECONDS,
  PROFESSIONAL_IDENTITY_NATIVE_MAX_BYTES,
  PROFESSIONAL_IDENTITY_WEB_MAX_BYTES,
} from '../services/professionalIdentityVideoPolicy';
import { colors, Icon } from './ui';

type Clip = { uri: string; mimeType: string; duration: number };
export interface ProfessionalIdentityRecorderProps {
  statement: string;
  onClose: () => void;
  onRecorded: (video: Attachment, durationSeconds: number) => void;
  onBusyChange?: (busy: boolean) => void;
}

/** Local camera capture, not face recognition or professional-credential verification. */
export default function ProfessionalIdentityRecorder({ statement, onClose, onRecorded, onBusyChange }: ProfessionalIdentityRecorderProps) {
  const camera = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission, getCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission, getMicrophonePermission] = useMicrophonePermissions();
  const [webGranted, setWebGranted] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background');
  const [cameraFailed, setCameraFailed] = useState(false);
  const [cameraVersion, setCameraVersion] = useState(0);
  const [ready, setReady] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [clip, setClip] = useState<Clip | null>(null);
  const [error, setError] = useState('');
  const alive = useRef(true);
  const epoch = useRef(0);
  const operation = useRef(false);
  const busy = useRef(false);
  const recordingNow = useRef(false);
  const nativeToken = useRef(0);
  const nativeDuration = useRef(0);
  const cameraVersionRef = useRef(0);
  const startedAt = useRef(0);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const limit = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const objectUrl = useRef<string | null>(null);
  const webVideo = useRef<HTMLVideoElement | null>(null);
  const clipRef = useRef<Clip | null>(null);
  const callbacks = useRef({ onClose, onRecorded, onBusyChange });
  useEffect(() => { callbacks.current = { onClose, onRecorded, onBusyChange }; }, [onClose, onRecorded, onBusyChange]);
  const granted = foreground && (Platform.OS === 'web' ? webGranted : !!cameraPermission?.granted && !!microphonePermission?.granted && !cameraFailed);

  function publishBusy(next: boolean) {
    if (busy.current === next) return;
    busy.current = next;
    callbacks.current.onBusyChange?.(next);
  }
  function isCurrent(token: number) { return alive.current && token === epoch.current; }
  function invalidateCamera() {
    cameraVersionRef.current += 1;
    if (alive.current) setCameraVersion(cameraVersionRef.current);
  }
  function clearTimers() {
    if (ticker.current) clearInterval(ticker.current);
    if (limit.current) clearTimeout(limit.current);
    ticker.current = null; limit.current = null;
  }
  function stopTracks() {
    const media = stream.current;
    stream.current = null;
    media?.getTracks().forEach(track => track.stop());
    if (webVideo.current) webVideo.current.srcObject = null;
  }
  function releaseUrl() {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
  }
  function detachWebRecorder() {
    const capture = recorder.current;
    recorder.current = null;
    if (!capture) return;
    capture.onstop = null; capture.ondataavailable = null; capture.onerror = null;
    try { if (capture.state !== 'inactive') capture.stop(); } catch { /* Already stopped. */ }
  }
  const dispose = useCallback(() => {
    alive.current = false; epoch.current += 1;
    clearTimers(); detachWebRecorder();
    if (recordingNow.current && Platform.OS !== 'web') {
      try { camera.current?.stopRecording(); } catch { /* Native view may already be gone. */ }
    }
    recordingNow.current = false; operation.current = false;
    stopTracks(); releaseUrl();
    const abandoned = clipRef.current;
    clipRef.current = null;
    if (abandoned) void discardProfessionalIdentityCapture(abandoned.uri).catch(() => undefined);
    // Publish once before handing control back; a late finalizer cannot clear a new form's busy state.
    publishBusy(false);
  }, []);
  const close = useCallback(() => { dispose(); callbacks.current.onClose(); }, [dispose]);

  useEffect(() => { alive.current = true; return dispose; }, [dispose]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { close(); return true; });
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopImmediatePropagation(); event.preventDefault(); close(); }
    };
    if (Platform.OS === 'web') window.addEventListener('keydown', keydown, true);
    return () => { subscription.remove(); if (Platform.OS === 'web') window.removeEventListener('keydown', keydown, true); };
  }, [close]);

  const interrupt = useCallback((message: string, background: boolean) => {
    if (!alive.current) return;
    const hadCapture = operation.current || recordingNow.current || !!stream.current;
    epoch.current += 1; clearTimers(); detachWebRecorder(); invalidateCamera();
    if (recordingNow.current && Platform.OS !== 'web') {
      try { camera.current?.stopRecording(); } catch { /* The interrupted native operation will reject. */ }
    }
    recordingNow.current = false; operation.current = false;
    stopTracks(); publishBusy(false);
    setRecording(false); setProcessing(false); setSaving(false); setRequesting(false); setReady(false); setWebGranted(false);
    if (background) setForeground(false);
    else if (Platform.OS !== 'web') setCameraFailed(true);
    if (hadCapture || !background) setError(message);
  }, []);
  useEffect(() => {
    const resume = () => {
      if (!alive.current) return;
      setForeground(true);
      if (Platform.OS !== 'web') void Promise.all([getCameraPermission(), getMicrophonePermission()]).catch(() => undefined);
    };
    const background = () => interrupt('Se interrumpió la grabación al salir de Klini. Repite el video.', true);
    const subscription = AppState.addEventListener('change', status => { if (status === 'background') background(); else if (status === 'active') resume(); });
    const visibility = () => document.visibilityState === 'hidden' ? background() : resume();
    if (Platform.OS === 'web') document.addEventListener('visibilitychange', visibility);
    return () => { subscription.remove(); if (Platform.OS === 'web') document.removeEventListener('visibilitychange', visibility); };
  }, [getCameraPermission, getMicrophonePermission, interrupt]);

  async function enableCamera() {
    if (operation.current || !alive.current) return;
    const token = ++epoch.current;
    operation.current = true; publishBusy(true); setRequesting(true); setError(''); setCameraFailed(false); invalidateCamera();
    try {
      if (Platform.OS === 'web') {
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('Este navegador no permite grabar video. Abre Klini con HTTPS o en la aplicación móvil.');
        const media = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 20, max: 24 } }, audio: true,
        });
        if (!isCurrent(token)) { media.getTracks().forEach(track => track.stop()); return; }
        if (!media.getAudioTracks().length || !media.getVideoTracks().length) {
          media.getTracks().forEach(track => track.stop()); throw new Error('Necesitamos cámara y micrófono para grabar tu identificación.');
        }
        stopTracks(); stream.current = media; setWebGranted(true); setReady(true);
        media.getTracks().forEach(track => track.addEventListener('ended', () => {
          if (alive.current && stream.current === media) interrupt('Se interrumpió la cámara o el micrófono. Permite el acceso y repite el video.', false);
        }, { once: true }));
        if (webVideo.current) { webVideo.current.srcObject = media; void webVideo.current.play().catch(() => undefined); }
      } else {
        if (cameraPermission?.canAskAgain === false || microphonePermission?.canAskAgain === false) { await Linking.openSettings(); return; }
        const cam = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
        if (!isCurrent(token)) return;
        const mic = microphonePermission?.granted ? microphonePermission : await requestMicrophonePermission();
        if (isCurrent(token) && (!cam.granted || !mic.granted)) setError('Permite cámara y micrófono para grabar. Puedes intentarlo nuevamente o abrir los ajustes.');
      }
    } catch (cause) {
      if (isCurrent(token)) setError(cause instanceof Error && !['NotAllowedError', 'NotFoundError', 'NotReadableError'].includes(cause.name) ? cause.message : 'No se pudo acceder a la cámara o al micrófono. Revisa los permisos y que no estén en uso.');
    } finally {
      if (isCurrent(token)) { operation.current = false; publishBusy(false); setRequesting(false); }
    }
  }

  function stop() {
    if (!recordingNow.current || !alive.current) return;
    recordingNow.current = false; clearTimers(); setRecording(false); setProcessing(true);
    try {
      if (Platform.OS === 'web') { if (recorder.current?.state === 'recording') recorder.current.stop(); }
      else camera.current?.stopRecording();
    } catch { interrupt('No se pudo detener la grabación. Repite el video.', false); }
  }
  function beginClock(token: number) {
    ticker.current = setInterval(() => { if (isCurrent(token)) setSeconds(Math.min((Date.now() - startedAt.current) / 1000, MAX_SECONDS)); }, 100);
    limit.current = setTimeout(stop, MAX_SECONDS * 1000);
  }
  async function start() {
    if (!ready || !granted || operation.current || !alive.current) return;
    const token = ++epoch.current;
    operation.current = true; publishBusy(true); recordingNow.current = true; nativeToken.current = token; nativeDuration.current = 0;
    startedAt.current = Date.now(); setRecording(true); setSeconds(0); setError('');
    try {
      if (Platform.OS === 'web') {
        const media = stream.current;
        if (!media?.getTracks().length || !media.getTracks().every(track => track.readyState === 'live')) throw new Error('La cámara dejó de estar disponible. Permite el acceso nuevamente.');
        const mimeType = ['video/webm;codecs=vp8,opus', 'video/mp4', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type));
        const capture = new MediaRecorder(media, { ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: 300_000, audioBitsPerSecond: 64_000 });
        const chunks: BlobPart[] = [];
        recorder.current = capture;
        capture.ondataavailable = event => { if (isCurrent(token) && event.data.size) chunks.push(event.data); };
        capture.onerror = () => { if (isCurrent(token)) interrupt('No se pudo completar la grabación. Repite el video.', false); };
        capture.onstop = () => {
          if (!isCurrent(token)) return;
          const elapsed = (Date.now() - startedAt.current) / 1000;
          clearTimers(); stopTracks(); recorder.current = null; operation.current = false; recordingNow.current = false; publishBusy(false);
          setRecording(false); setProcessing(false); setReady(false); setWebGranted(false);
          const video = new Blob(chunks, { type: capture.mimeType || mimeType || 'video/webm' });
          if (elapsed < MIN_SECONDS || !video.size) { setError('La grabación debe durar al menos 2 segundos. Repite el video.'); return; }
          if (elapsed > MAX_SECONDS + 1) { setError('La grabación superó 20 segundos. Repite el video.'); return; }
          if (video.size > PROFESSIONAL_IDENTITY_WEB_MAX_BYTES) { setError('El video supera 2 MB. Repite la grabación con un mensaje corto.'); return; }
          releaseUrl(); objectUrl.current = URL.createObjectURL(video);
          const next = { uri: objectUrl.current, mimeType: video.type, duration: Math.min(elapsed, MAX_SECONDS) };
          clipRef.current = next; setClip(next);
        };
        capture.start(250); beginClock(token);
        return;
      }
      beginClock(token);
      const result = await camera.current?.recordAsync({ maxDuration: MAX_SECONDS, maxFileSize: PROFESSIONAL_IDENTITY_NATIVE_MAX_BYTES, progressUpdateInterval: .1, ...(Platform.OS === 'ios' ? { codec: 'avc1' as const } : {}) });
      if (!isCurrent(token)) { if (result?.uri) void discardProfessionalIdentityCapture(result.uri).catch(() => undefined); return; }
      clearTimers(); recordingNow.current = false; operation.current = false; publishBusy(false); setRecording(false); setProcessing(false); setReady(false);
      const duration = nativeDuration.current || (Date.now() - startedAt.current) / 1000;
      if (!result?.uri || duration < MIN_SECONDS) {
        if (result?.uri) void discardProfessionalIdentityCapture(result.uri).catch(() => undefined);
        setCameraFailed(true); setError('La grabación debe durar al menos 2 segundos. Repite el video.'); return;
      }
      const next = { uri: result.uri, mimeType: /\.mov$/i.test(result.uri) ? 'video/quicktime' : 'video/mp4', duration: Math.min(duration, MAX_SECONDS) };
      clipRef.current = next; setClip(next);
    } catch (cause) {
      if (isCurrent(token)) {
        clearTimers(); recordingNow.current = false; operation.current = false; publishBusy(false);
        stopTracks(); setWebGranted(false); setRecording(false); setProcessing(false); setReady(false); setCameraFailed(Platform.OS !== 'web');
        setError(cause instanceof Error && cause.message.startsWith('La cámara dejó') ? cause.message : 'No se pudo iniciar la grabación. Revisa la cámara y el micrófono.');
      }
    }
  }

  async function persistReviewedVideo() {
    const reviewed = clipRef.current;
    if (!reviewed || operation.current || !alive.current) return;
    const token = ++epoch.current;
    let saved: Attachment | undefined;
    operation.current = true; publishBusy(true); setSaving(true); setError('');
    try {
      saved = await saveProfessionalIdentityVideo(reviewed.uri, reviewed.mimeType);
      if (!isCurrent(token)) { await discardProfessionalIdentityVideo(saved); return; }
      publishBusy(false);
      callbacks.current.onRecorded(saved, reviewed.duration);
      saved = undefined; // The parent owns this attachment only after the synchronous callback succeeds.
      dispose();
    } catch (cause) {
      if (saved) await discardProfessionalIdentityVideo(saved).catch(() => undefined);
      if (isCurrent(token)) setError(cause instanceof Error ? cause.message : 'No se pudo conservar el video. Intenta de nuevo.');
    } finally {
      if (isCurrent(token)) { operation.current = false; publishBusy(false); setSaving(false); }
    }
  }
  function retake() {
    if (operation.current || !alive.current) return;
    epoch.current += 1;
    const previous = clipRef.current;
    clipRef.current = null;
    if (previous) void discardProfessionalIdentityCapture(previous.uri).catch(() => undefined);
    releaseUrl(); setClip(null); setSeconds(0); setError(''); setReady(false); setCameraFailed(false);
    invalidateCamera();
    if (Platform.OS === 'web') void enableCamera();
  }

  return <View testID="professional-recorder" style={s.root}>
    <View style={s.header}><Text style={s.heading}>{clip ? 'Revisa tu grabación' : 'Mira a la cámara'}</Text><Pressable testID="professional-recorder-close" accessibilityRole="button" accessibilityLabel="Cerrar grabación" onPress={close} style={s.close}><Icon name="close" size={19} /></Pressable></View>
    <View testID="professional-recorder-preview" style={s.preview}>
      {clip ? Platform.OS === 'web' ? React.createElement('video', { src: clip.uri, controls: true, playsInline: true, style: { width: '100%', height: '100%', objectFit: 'contain' }, 'aria-label': 'Revisar video de identificación' })
        : <View style={s.placeholder}><Icon name="check" size={35} color={colors.teal} /><Text style={s.message}>Grabación lista · {Math.round(clip.duration)} s</Text><Text style={s.caption}>Video con audio</Text></View>
        : granted ? <>
          {Platform.OS === 'web' ? React.createElement('video', { ref: (element: HTMLVideoElement | null) => { webVideo.current = element; if (element && stream.current) { element.srcObject = stream.current; void element.play().catch(() => undefined); } }, autoPlay: true, muted: true, playsInline: true, style: { width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }, 'aria-label': 'Cámara frontal para identificación' })
            : <CameraView key={cameraVersion} ref={camera} facing="front" mode="video" mute={false} videoQuality={Platform.OS === 'android' ? '480p' : '4:3'} videoBitrate={600_000} style={StyleSheet.absoluteFill} onCameraReady={() => { if (alive.current && foreground && cameraVersion === cameraVersionRef.current) setReady(true); }} onMountError={() => { if (cameraVersion === cameraVersionRef.current) interrupt('No se pudo abrir la cámara. Comprueba los permisos e intenta nuevamente.', false); }} onRecordingProgress={progress => { if (alive.current && cameraVersion === cameraVersionRef.current && nativeToken.current === epoch.current && operation.current) { nativeDuration.current = progress.duration; setSeconds(Math.min(progress.duration, MAX_SECONDS)); } }} />}
          <View testID="professional-recorder-face-frame" pointerEvents="none" accessible={false} style={s.faceFrame} />
        </> : <View style={s.placeholder}><Icon name="video" size={33} color={colors.teal} /><Text style={s.message}>Permite cámara y micrófono para grabar tu identificación.</Text></View>}
      {recording && <View style={s.recording}><View style={s.dot} /><Text testID="professional-recorder-timer" style={s.recordingText}>{Math.floor(seconds)} / 20 s</Text></View>}
    </View>
    <Text style={s.caption}>Di esta frase mirando a la cámara:</Text>
    <Text testID="professional-recorder-statement" style={s.statement}>“{statement}”</Text>
    <Text style={s.caption}>Video de 2 a 20 segundos. Se guarda únicamente en este dispositivo.</Text>
    {!!error && <Text testID="professional-recorder-error" accessibilityRole="alert" style={s.error}>{error}</Text>}
    <View style={s.actions}>
      {clip ? <><Pressable testID="professional-recorder-retake" accessibilityRole="button" disabled={saving} onPress={retake} style={[s.button, saving && s.disabled]}><Icon name="refresh-outline" size={15} color={colors.tealDark} /><Text style={s.buttonText}>Repetir</Text></Pressable><Pressable testID="professional-recorder-use" accessibilityRole="button" disabled={saving} onPress={() => void persistReviewedVideo()} style={[s.button, saving && s.disabled]}><Icon name="check" size={15} color={colors.tealDark} /><Text style={s.buttonText}>{saving ? 'Guardando…' : 'Usar video'}</Text></Pressable></>
        : recording ? <Pressable testID="professional-recorder-stop" accessibilityRole="button" accessibilityLabel="Detener grabación" disabled={seconds < MIN_SECONDS} onPress={stop} style={[s.button, seconds < MIN_SECONDS && s.disabled]}><Icon name="stop" size={15} color={colors.tealDark} /><Text style={s.buttonText}>Detener</Text></Pressable>
          : !granted ? <Pressable testID="professional-recorder-permission" accessibilityRole="button" disabled={requesting || !foreground} onPress={() => void enableCamera()} style={[s.button, (requesting || !foreground) && s.disabled]}><Text style={s.buttonText}>{requesting ? 'Solicitando permisos…' : Platform.OS !== 'web' && (cameraPermission?.canAskAgain === false || microphonePermission?.canAskAgain === false) ? 'Abrir ajustes' : cameraFailed ? 'Reintentar cámara' : 'Permitir cámara y micrófono'}</Text></Pressable>
            : <Pressable testID="professional-recorder-start" accessibilityRole="button" disabled={!ready || processing} onPress={() => void start()} style={[s.button, (!ready || processing) && s.disabled]}><Icon name="camera" size={16} color={colors.tealDark} /><Text style={s.buttonText}>{processing ? 'Preparando video…' : 'Iniciar grabación'}</Text></Pressable>}
    </View>
  </View>;
}

const s = StyleSheet.create({
  root: { width: '100%', gap: 10, paddingTop: 8 }, header: { flexDirection: 'row', alignItems: 'center', gap: 10 }, heading: { flex: 1, color: colors.navy, fontSize: 14, fontWeight: '600' }, close: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EDF3F6', alignItems: 'center', justifyContent: 'center' },
  preview: { width: '100%', aspectRatio: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: '#EDF3F6', alignItems: 'center', justifyContent: 'center' }, faceFrame: { position: 'absolute', top: '9%', left: '18%', width: '64%', height: '82%', borderRadius: 999, borderWidth: 2, borderColor: 'rgba(255,255,255,.85)' },
  placeholder: { flex: 1, padding: 20, gap: 10, alignItems: 'center', justifyContent: 'center' }, message: { color: colors.navy, fontSize: 12, lineHeight: 18, textAlign: 'center' }, caption: { color: colors.muted, fontSize: 10, lineHeight: 16, textAlign: 'center' }, statement: { color: colors.navy, fontSize: 13, fontWeight: '600', lineHeight: 19, textAlign: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingBottom: 6 }, button: { minHeight: 38, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#DDF5F2' }, buttonText: { color: colors.tealDark, fontSize: 11, fontWeight: '500' }, disabled: { opacity: .45 },
  error: { color: colors.danger, fontSize: 11, lineHeight: 17 }, recording: { position: 'absolute', left: 9, top: 9, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(8,36,65,.8)' }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#F56C7B' }, recordingText: { color: 'white', fontSize: 11 },
});
