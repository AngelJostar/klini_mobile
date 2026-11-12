import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Attachment } from '../domain/types';
import { isProfessionalProfile, sameProfessionalIdentity, type ManagedProfessionalProfile } from '../domain/managedProfiles';
import { createProfessionalVerification } from '../domain/professionalVerification';
import { discardProfessionalIdentityVideo } from '../services/professionalIdentityFiles';
import AccountProfileForm from './AccountProfileForm';
import ProfessionalIdentityRecorder from './ProfessionalIdentityRecorder';
import { colors, Icon } from './ui';

type Props = {
  profile?: ManagedProfessionalProfile;
  ownerName: string;
  busy: boolean;
  onBusyChange: (value: boolean) => void;
  onSave: (profile: ManagedProfessionalProfile) => Promise<ManagedProfessionalProfile>;
  onReturn: () => void;
};
type PendingVideo = { video: Attachment; duration: number; retained: boolean };

export default function ProfessionalProfileFlow({ profile, ownerName, busy, onBusyChange, onSave, onReturn }: Props) {
  const [stage, setStage] = useState<'data' | 'identity' | 'review'>(profile?.verification && profile.name === ownerName ? 'review' : 'data');
  const [draft, setDraft] = useState(profile);
  const [saved, setSaved] = useState(profile);
  const [challenge, setChallenge] = useState(() => String(Math.floor(1000 + Math.random() * 9000)));
  const [consentedAt, setConsentedAt] = useState<string>();
  const [capture, setCapture] = useState(false);
  const [video, setVideo] = useState<Omit<PendingVideo, 'retained'>>();
  const [detail, setDetail] = useState<'license' | 'video'>();
  const [error, setError] = useState('');
  const pendingVideo = useRef<PendingVideo | undefined>(undefined);
  const saving = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      const pending = pendingVideo.current;
      if (pending && !pending.retained && !saving.current) void discardProfessionalIdentityVideo(pending.video).catch(() => undefined);
    };
  }, []);
  const releaseVideo = () => {
    const pending = pendingVideo.current;
    pendingVideo.current = undefined;
    setVideo(undefined);
    if (pending && !pending.retained) void discardProfessionalIdentityVideo(pending.video).catch(() => undefined);
  };
  const statement = `Soy ${draft?.name ?? ''} y mi código es ${challenge}.`;
  const startIdentity = () => {
    releaseVideo(); setConsentedAt(undefined); setError(''); setDetail(undefined);
    setChallenge(String(Math.floor(1000 + Math.random() * 9000)));
    setStage('identity');
  };
  async function save() {
    if (saving.current || busy || !draft || !video || !consentedAt) return;
    if (draft.name.trim() !== ownerName.trim()) { setError('Actualiza los datos con el nombre de tu cuenta y graba un nuevo video.'); return; }
    saving.current = true; onBusyChange(true); setError(''); Keyboard.dismiss();
    try {
      const verification = createProfessionalVerification({ video: video.video, durationSeconds: video.duration, consentedAt, challenge });
      const result = await onSave({ ...draft, verification });
      if (pendingVideo.current?.video.uri === video.video.uri) pendingVideo.current.retained = true;
      if (saved?.verification?.video.uri && saved.verification.video.uri !== result.verification?.video.uri) void discardProfessionalIdentityVideo(saved.verification.video).catch(() => undefined);
      if (alive.current) { setSaved(result); setDraft(result); setDetail(undefined); setStage('review'); }
    } catch (cause) {
      if (alive.current) setError(cause instanceof Error ? cause.message : 'No se pudo guardar el perfil. Intenta de nuevo.');
    } finally {
      saving.current = false;
      if (alive.current) onBusyChange(false);
      else if (!pendingVideo.current?.retained) void discardProfessionalIdentityVideo(video.video).catch(() => undefined);
    }
  }
  if (stage === 'data' || (draft && draft.name.trim() !== ownerName.trim())) return <AccountProfileForm mode="professional" profile={draft} ownerName={ownerName} busy={busy} onBusyChange={onBusyChange} submitLabel={draft?.id ? 'Continuar' : 'Crear perfil'} onSave={async value => {
    if (!isProfessionalProfile(value)) throw new Error('Revisa los datos profesionales.');
    setDraft(value);
    if (saved?.verification && sameProfessionalIdentity(saved, value)) { setDraft({ ...value, verification: saved.verification }); setStage('review'); }
    else startIdentity();
  }} />;

  if (stage === 'review' && saved?.verification) return <View testID="professional-review-step" style={s.flow}>
    <Text accessibilityRole="header" style={s.title}>Perfil en revisión</Text>
    <Pressable testID="professional-review-license" accessibilityRole="button" accessibilityState={{ expanded: detail === 'license' }} onPress={() => setDetail(value => value === 'license' ? undefined : 'license')} style={s.reviewRow}>
      <View style={s.reviewIcon}><Icon name="document" color={colors.tealDark} size={21} /></View><View style={s.grow}><Text style={s.rowTitle}>Cédula profesional</Text><Text style={s.muted}>Pendiente de revisión</Text></View><Icon name="chevronRight" size={16} color={colors.muted} />
    </Pressable>
    {detail === 'license' && <View style={s.detail}><Text style={s.rowTitle}>{saved.name}</Text><Text style={s.muted}>Cédula: {saved.licenseNumber}</Text><Text style={s.muted}>{saved.professionalType === 'doctor' ? saved.specialty : saved.professionalType === 'licensed' ? saved.degreeType : saved.profession}</Text></View>}
    <Pressable testID="professional-review-video" accessibilityRole="button" accessibilityState={{ expanded: detail === 'video' }} onPress={() => setDetail(value => value === 'video' ? undefined : 'video')} style={s.reviewRow}>
      <View style={s.reviewIcon}><Icon name="video" color={colors.tealDark} size={21} /></View><View style={s.grow}><Text style={s.rowTitle}>Video de identidad</Text><Text style={s.muted}>Recibido en este dispositivo</Text></View><Icon name="chevronRight" size={16} color={colors.muted} />
    </Pressable>
    {detail === 'video' && <View style={s.detail}>
      {Platform.OS === 'web' ? React.createElement('video', { src: saved.verification.video.uri, controls: true, playsInline: true, style: { width: '100%', maxHeight: 160 }, 'aria-label': 'Video de identidad guardado' }) : <Text style={s.muted}>Video con audio · {Math.round(saved.verification.durationSeconds)} s</Text>}
      <Pressable testID="professional-review-record-again" accessibilityRole="button" onPress={startIdentity} style={s.link}><Text style={s.linkText}>Volver a grabar</Text></Pressable>
    </View>}
    <Text testID="professional-review-local-note" style={s.note}>Demostración local. La cédula y el video no se han enviado a un servicio de revisión.</Text>
    <Pressable testID="professional-review-return" accessibilityRole="button" onPress={onReturn} style={s.outline}><Text style={s.linkText}>Volver a Tu cuenta</Text></Pressable>
    <Pressable testID="professional-review-edit" accessibilityRole="button" onPress={() => { setError(''); setStage('data'); }} style={s.link}><Text style={s.linkText}>Editar datos</Text></Pressable>
  </View>;

  return <View testID="professional-identity-step" style={s.flow}>
    <Text accessibilityRole="header" style={s.title}>Confirma tu identidad</Text>
    {capture ? <ProfessionalIdentityRecorder statement={statement} onClose={() => { setCapture(false); onBusyChange(false); }} onBusyChange={value => { if (alive.current && !saving.current) onBusyChange(value); }} onRecorded={(attachment, duration) => {
      if (!alive.current) { void discardProfessionalIdentityVideo(attachment).catch(() => undefined); return; }
      releaseVideo();
      const pending = { video: attachment, duration, retained: false };
      pendingVideo.current = pending; setVideo({ video: attachment, duration }); setCapture(false); onBusyChange(false); setError('');
    }} /> : <>
      <View style={s.preview}>
        {video && Platform.OS === 'web' ? React.createElement('video', { src: video.video.uri, controls: true, playsInline: true, style: { width: '100%', height: '100%', objectFit: 'contain' }, 'aria-label': 'Revisar video de identidad' }) : <><Icon name={video ? 'checkCircle' : 'video'} size={44} color={colors.teal} /><Text style={s.muted}>{video ? `Video listo · ${Math.round(video.duration)} s` : 'Video de identidad'}</Text></>}
      </View>
      <Text style={s.caption}>Di en voz alta</Text>
      <Text testID="professional-identity-phrase" style={s.phrase}>“{statement}”</Text>
      <Pressable testID="professional-identity-consent" accessibilityRole="checkbox" accessibilityState={{ checked: !!consentedAt, disabled: busy }} aria-checked={!!consentedAt} disabled={busy} onPress={() => { if (consentedAt) { setConsentedAt(undefined); releaseVideo(); } else setConsentedAt(new Date().toISOString()); setError(''); }} style={s.consent}>
        <View style={[s.checkbox, !!consentedAt && s.checked]}>{consentedAt && <Icon name="check" color="white" size={13} />}</View><Text style={s.consentText}>Acepto guardar este video de identidad en este dispositivo.</Text>
      </Pressable>
      <Pressable testID="professional-identity-record" accessibilityRole="button" disabled={busy || !consentedAt} accessibilityState={{ disabled: busy || !consentedAt }} onPress={() => { setCapture(true); setError(''); }} style={[s.primary, (busy || !consentedAt) && s.disabled]}><Text style={s.primaryText}>{video ? 'Repetir video' : 'Grabar video'}</Text></Pressable>
      {video && <Pressable testID="professional-identity-save" accessibilityRole="button" disabled={busy || !consentedAt} onPress={() => void save()} style={[s.primary, busy && s.disabled]}><Text style={s.primaryText}>{busy ? 'Guardando…' : 'Guardar perfil'}</Text></Pressable>}
    </>}
    {!!error && <Text testID="professional-identity-error" accessibilityRole="alert" style={s.error}>{error}</Text>}
  </View>;
}

const s = StyleSheet.create({
  flow: { paddingTop: 8, paddingHorizontal: 4, paddingBottom: 14, gap: 14 },
  title: { color: colors.navy, fontSize: 18, lineHeight: 24, fontWeight: '700' },
  grow: { flex: 1, minWidth: 0 },
  preview: { width: '100%', aspectRatio: 1.2, maxHeight: 210, borderRadius: 12, backgroundColor: '#EDF6F6', alignItems: 'center', justifyContent: 'center', gap: 10, overflow: 'hidden' },
  caption: { textAlign: 'center', color: colors.navy, fontSize: 12 },
  phrase: { padding: 10, borderRadius: 12, backgroundColor: '#EDF8F9', color: colors.navy, fontSize: 12, lineHeight: 19, textAlign: 'center' },
  consent: { flexDirection: 'row', minHeight: 44, alignItems: 'center', gap: 9 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: '#B4C8D6', alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: colors.teal, borderColor: colors.teal },
  consentText: { flex: 1, fontSize: 11, lineHeight: 17, color: '#6F8AA5' },
  primary: { alignSelf: 'center', minHeight: 40, maxWidth: 214, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 22, backgroundColor: colors.tealDark, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: 'white', fontSize: 12, fontWeight: '600' },
  disabled: { opacity: .45 },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E8EFF3', padding: 12, minHeight: 66 },
  reviewIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E2F5F6', alignItems: 'center', justifyContent: 'center' },
  rowTitle: { color: colors.navy, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  muted: { color: '#7892AD', fontSize: 11, lineHeight: 17 },
  detail: { padding: 10, gap: 5, borderRadius: 10, backgroundColor: '#F4F9FA' },
  note: { fontSize: 11, lineHeight: 17, color: '#7892AD' },
  outline: { minHeight: 40, borderWidth: 1, borderColor: '#9AD5DD', borderRadius: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  link: { minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  linkText: { color: colors.tealDark, fontSize: 12, lineHeight: 18 },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18 },
});
