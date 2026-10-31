import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { hasAiAccess } from '../domain/aiSubscription';
import { useAppStore } from '../state/store';
import BookingFooterButton from './BookingFooterButton';
import { colors, Icon } from './ui';

type Step = 'overview' | 'review' | 'success' | 'manage' | 'cancel' | 'cancelled';
type Props = { onBack: () => void; onClose: () => void; onBusyChange?: (busy: boolean) => void };
const benefits = [
  { icon: 'folder', title: 'Entiende tu expediente', text: 'Consulta resúmenes de tus registros y encuentra la información que buscas.' },
  { icon: 'chat', title: 'Explicaciones claras', text: 'Pregunta por términos y documentos médicos en lenguaje sencillo.' },
  { icon: 'calendar', title: 'Organiza tu atención', text: 'Consulta tus próximas citas y prepara preguntas para tu médico.' },
];

export default function AiSubscriptionPanel({ onBack, onClose, onBusyChange }: Props) {
  const { state, setAiSubscription, storageError } = useAppStore();
  const active = hasAiAccess(state.aiSubscription);
  const [step, setStep] = useState<Step>(() => active ? 'manage' : 'overview');
  const [consent, setConsent] = useState(false);
  const [reviewProfile, setReviewProfile] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'apple-pay' | 'card'>('card');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const busyRef = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; onBusyChange?.(false); };
  }, [onBusyChange]);
  const back = useCallback(() => { if (!busyRef.current) onBack(); }, [onBack]);
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    if (Platform.OS !== 'web') return () => listener.remove();
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); back(); }
    };
    window.addEventListener('keydown', escape, true);
    return () => { listener.remove(); window.removeEventListener('keydown', escape, true); };
  }, [back]);

  function review() {
    setReviewProfile(state.profile.id);
    setConsent(false);
    setError('');
    setStep('review');
  }
  async function updateSubscription(enabled: boolean) {
    if (busyRef.current) return;
    if (enabled && (!consent || reviewProfile !== state.profile.id)) {
      setConsent(false);
      setError('Revisa el perfil y autoriza el uso de su información antes de continuar.');
      return;
    }
    busyRef.current = true;
    setBusy(true);
    onBusyChange?.(true);
    setError('');
    try {
      await setAiSubscription(enabled);
      if (mounted.current) setStep(enabled ? 'success' : 'cancelled');
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'No se pudo guardar el cambio. Inténtalo nuevamente.');
    } finally {
      busyRef.current = false;
      if (mounted.current) { setBusy(false); onBusyChange?.(false); }
    }
  }

  const footer = step === 'overview'
    ? <BookingFooterButton title="Continuar" testID="ai-subscription-continue" onPress={review} />
    : step === 'review'
      ? <BookingFooterButton title={busy ? 'Activando…' : 'Activar demostración'} testID="ai-subscription-activate" disabled={!consent || busy || reviewProfile !== state.profile.id} onPress={() => void updateSubscription(true)} />
      : step === 'cancel'
        ? <View style={s.cancelActions}>
          <BookingFooterButton title="Conservar activación" testID="ai-subscription-keep" disabled={busy} onPress={() => { setError(''); setStep('manage'); }} />
          <BookingFooterButton title={busy ? 'Desactivando…' : 'Confirmar cancelación'} testID="ai-subscription-confirm-cancel" disabled={busy} onPress={() => void updateSubscription(false)} />
        </View>
        : step === 'cancelled'
          ? <BookingFooterButton title="Volver a mi billetera" testID="ai-subscription-return" onPress={onBack} />
          : <BookingFooterButton title="Preguntar a Klini" icon="sparkles-outline" testID="ai-subscription-ask" onPress={onClose} />;

  return <View testID="ai-subscription-panel" style={s.root}>
    <ScrollView key={step} keyboardShouldPersistTaps="handled" style={s.scroll} contentContainerStyle={s.content}>
      {!!error && <Text testID="ai-subscription-error" accessibilityRole="alert" style={s.error}>{error}</Text>}
      {!!storageError && storageError !== error && <Text accessibilityRole="alert" style={s.error}>{storageError}</Text>}
      {(step === 'overview' || step === 'manage') && <>
        <View style={s.intro}>
          <View style={s.sparkle}><Icon name="sparkles-outline" size={30} color={colors.tealDark} /></View>
          <Text testID="ai-subscription-status" style={[s.badge, !active && s.badgeInactive]}>{active ? 'Activa · demostración' : 'Tu asistente personal'}</Text>
          <Text accessibilityRole="header" style={s.heading}>Tu información, más clara<Text style={s.dot}>.</Text></Text>
          <Text style={s.body}>Klini IA te ayuda a entender y organizar la información de salud del perfil que estás consultando.</Text>
        </View>
        <View style={s.benefits}>{benefits.map(item => <View key={item.title} style={s.benefit}>
          <View style={s.benefitIcon}><Icon name={item.icon} size={21} color={colors.tealDark} /></View>
          <View style={s.flex}><Text style={s.benefitTitle}>{item.title}</Text><Text style={s.caption}>{item.text}</Text></View>
        </View>)}</View>
        <View style={s.priceCard}><Text style={s.caption}>Suscripción mensual</Text><Text testID="ai-subscription-price" style={s.price}>$99 MXN<Text style={s.month}> / mes</Text></Text><Text style={s.demo}>Activación de demostración · sin cargos</Text></View>
        {step === 'manage' && <>
          <Text style={s.caption}>Tu acceso de demostración está activo. Vuelve al inicio para abrir Klini IA desde el buscador.</Text>
          <Pressable testID="ai-subscription-cancel" accessibilityRole="button" onPress={() => { setError(''); setStep('cancel'); }} style={s.cancelLink}><Text style={s.cancelText}>Cancelar activación</Text></Pressable>
        </>}
      </>}

      {step === 'review' && <>
        <Text accessibilityRole="header" style={s.heading}>Antes de comenzar<Text style={s.dot}>.</Text></Text>
        <Text style={s.body}>Elige si deseas usar la información de este perfil para personalizar las respuestas de Klini IA.</Text>
        <View style={s.profileCard}>
          <Text style={s.caption}>Perfil consultado</Text><Text testID="ai-subscription-profile" style={s.profileName}>{state.profile.name}</Text>
          <View style={s.contextRow}><Icon name="folder" size={18} color={colors.tealDark} /><Text style={s.contextText}>Texto de {state.records.length} registros</Text></View>
          <View style={s.contextRow}><Icon name="calendar" size={18} color={colors.tealDark} /><Text style={s.contextText}>Agenda · {state.appointments.length} citas</Text></View>
          <View style={s.contextRow}><Icon name="medicine" size={18} color={colors.tealDark} /><Text style={s.contextText}>{state.medications.length} medicamentos registrados</Text></View>
        </View>
        <View style={s.checkout}>
          <View style={s.checkoutRow}><Text style={s.benefitTitle}>Klini IA · mensual</Text><Text testID="ai-subscription-total" style={s.checkoutPrice}>$99 MXN / mes</Text></View>
          <Text style={s.caption}>Método de pago</Text>
          {Platform.OS === 'web' ? <View role="radiogroup" accessibilityLabel="Método de pago para Klini IA" style={s.paymentOptions}>
            {([{ value: 'apple-pay', label: 'Apple Pay', icon: 'logo-apple' }, { value: 'card', label: 'Tarjeta digital', icon: 'card' }] as const).map(method => <Pressable key={method.value} testID={`ai-subscription-pay-${method.value}`} accessibilityRole="radio" aria-checked={paymentMethod === method.value} accessibilityState={{ checked: paymentMethod === method.value, disabled: busy }} disabled={busy} onPress={() => { setPaymentMethod(method.value); setConsent(false); }} style={[s.payment, paymentMethod === method.value && s.paymentSelected]}><Icon name={method.icon} size={19} color={colors.navy} /><Text style={s.paymentText}>{method.label}</Text><View style={[s.paymentRadio, paymentMethod === method.value && s.paymentRadioSelected]}>{paymentMethod === method.value && <Icon name="check" size={12} color="white" />}</View></Pressable>)}
          </View> : <View testID="ai-subscription-native-payment" style={s.nativePayment}><Icon name={Platform.OS === 'ios' ? 'logo-apple' : 'logo-google-playstore'} size={20} color={colors.navy} /><Text style={s.paymentText}>{Platform.OS === 'ios' ? 'App Store' : 'Google Play'}</Text></View>}
          {Platform.OS === 'web' && paymentMethod === 'apple-pay' && <Text style={s.paymentHint}>Apple Pay requiere un dispositivo y navegador compatibles.</Text>}
          <Text style={s.paymentHint}>Selección de demostración. No se abrirá un pago ni se realizará ningún cargo.</Text>
        </View>
        <Pressable testID="ai-subscription-consent" accessibilityRole="checkbox" aria-checked={consent} accessibilityState={{ checked: consent, disabled: busy }} disabled={busy} onPress={() => setConsent(value => !value)} style={s.consent}>
          <View style={[s.checkbox, consent && s.checkboxChecked]}>{consent && <Icon name="check" size={15} color="white" />}</View>
          <Text style={s.consentText}>Autorizo a Klini IA a usar el texto de los registros, la agenda y los medicamentos de este perfil para responder mis preguntas.</Text>
        </Pressable>
        <Text style={s.caption}>No incluye fotos, archivos adjuntos ni datos de identificación que no sean necesarios para la consulta.</Text>
        <View style={s.notice}><Icon name="info" size={18} color={colors.tealDark} /><Text style={s.noticeText}>Klini IA ofrece orientación informativa. Revisa las respuestas y las decisiones sobre tu salud con tu médico.</Text></View>
        <Text style={s.demo}>Activación de demostración · sin cargos</Text>
      </>}

      {step === 'success' && <View testID="ai-subscription-success" style={s.result}>
        <View style={s.resultIcon}><Icon name="check" size={34} color={colors.tealDark} /></View>
        <Text accessibilityRole="header" style={s.resultTitle}>Klini IA está lista</Text>
        <Text style={s.body}>Tu acceso de demostración quedó activado. Vuelve al inicio y toca el icono de Klini IA en el buscador para hacer tu primera pregunta.</Text>
        <Text style={s.demo}>Activación de demostración · sin cargos</Text>
      </View>}

      {step === 'cancel' && <>
        <Text accessibilityRole="header" style={s.heading}>¿Cancelar Klini IA?</Text>
        <Text style={s.body}>Se desactivará el acceso a nuevas preguntas y dejará de usarse la información del perfil para responder consultas.</Text>
        <View style={s.notice}><Icon name="folder" size={19} color={colors.tealDark} /><Text style={s.noticeText}>Tus registros, citas, medicamentos y saldo permanecen en tu cuenta.</Text></View>
        <Text style={s.demo}>Esta activación de demostración no tiene cargos.</Text>
      </>}

      {step === 'cancelled' && <View testID="ai-subscription-cancelled" style={s.result}>
        <View style={s.resultIcon}><Icon name="check" size={34} color={colors.tealDark} /></View>
        <Text accessibilityRole="header" style={s.resultTitle}>Klini IA desactivada</Text>
        <Text style={s.body}>La cancelación quedó guardada. Puedes revisar la opción de activarla nuevamente desde tu billetera.</Text>
      </View>}
    </ScrollView>
    <View style={s.footer}>{footer}</View>
  </View>;
}

const s = StyleSheet.create({
  root: { flexShrink: 1, minHeight: 0 },
  scroll: { flexShrink: 1, minHeight: 0 },
  content: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 12, gap: 16 },
  flex: { flex: 1, minWidth: 0 },
  intro: { gap: 12 },
  sparkle: { width: 58, height: 58, borderRadius: 18, backgroundColor: '#DDF5F2', alignItems: 'center', justifyContent: 'center' },
  badge: { alignSelf: 'flex-start', color: colors.tealDark, fontSize: 10, lineHeight: 16, backgroundColor: '#DDF5F2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 13 },
  badgeInactive: { backgroundColor: '#F1F6F8', color: '#69839B' },
  heading: { color: colors.navy, fontSize: 26, fontWeight: '700', lineHeight: 31, letterSpacing: -.6 },
  dot: { color: colors.teal },
  body: { color: '#5E7890', fontSize: 13, lineHeight: 21 },
  benefits: { gap: 17, marginVertical: 3 },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  benefitIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#EEF8F7', alignItems: 'center', justifyContent: 'center' },
  benefitTitle: { color: colors.navy, fontSize: 13, fontWeight: '600', lineHeight: 19, marginBottom: 3 },
  caption: { color: '#7B91A5', fontSize: 12, lineHeight: 19 },
  priceCard: { padding: 16, borderRadius: 15, backgroundColor: '#F1F9F7', gap: 5 },
  price: { color: colors.navy, fontSize: 24, fontWeight: '700', lineHeight: 30 },
  month: { color: '#6B879B', fontSize: 13, fontWeight: '500' },
  demo: { color: colors.tealDark, fontSize: 11, lineHeight: 17 },
  profileCard: { backgroundColor: '#F2F8F9', borderRadius: 15, padding: 16, gap: 8 },
  profileName: { color: colors.navy, fontSize: 16, lineHeight: 23, fontWeight: '600', marginBottom: 5 },
  checkout: { padding: 15, borderColor: '#DFEAEF', borderWidth: 1, borderRadius: 15, gap: 11 },
  checkoutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  checkoutPrice: { color: colors.navy, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  paymentOptions: { gap: 8 },
  payment: { minHeight: 45, borderWidth: 1, borderColor: '#DFEAEF', borderRadius: 11, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 11, paddingVertical: 8 },
  paymentSelected: { borderColor: '#91D6CE', backgroundColor: '#EFF9F6' },
  paymentText: { color: colors.navy, fontSize: 12, lineHeight: 18, flex: 1 },
  paymentRadio: { width: 17, height: 17, borderWidth: 1, borderColor: '#A4BAC8', borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  paymentRadioSelected: { backgroundColor: colors.tealDark, borderColor: colors.tealDark },
  nativePayment: { minHeight: 44, borderRadius: 11, backgroundColor: '#F1F7F8', flexDirection: 'row', alignItems: 'center', gap: 9, padding: 11 },
  paymentHint: { color: '#849BAE', fontSize: 10, lineHeight: 16 },
  contextRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contextText: { color: colors.navy, fontSize: 12, lineHeight: 19, flex: 1 },
  consent: { minHeight: 44, flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingVertical: 7 },
  checkbox: { width: 21, height: 21, marginTop: 2, borderRadius: 6, borderWidth: 1, borderColor: '#9DB6C6', justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: colors.tealDark, borderColor: colors.tealDark },
  consentText: { color: colors.navy, fontSize: 12, lineHeight: 20, flex: 1 },
  notice: { padding: 13, borderRadius: 13, backgroundColor: '#E7F7F4', flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  noticeText: { color: '#50837F', fontSize: 11, lineHeight: 18, flex: 1 },
  cancelLink: { minHeight: 44, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15 },
  cancelText: { color: '#98616D', fontSize: 12, lineHeight: 18 },
  cancelActions: { gap: 13, alignItems: 'center' },
  result: { alignItems: 'center', paddingVertical: 24, gap: 17 },
  resultIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#DDF5F2', alignItems: 'center', justifyContent: 'center' },
  resultTitle: { color: colors.navy, fontSize: 25, fontWeight: '700', textAlign: 'center', lineHeight: 31 },
  footer: { paddingHorizontal: 22, paddingTop: 13, paddingBottom: 12 },
  error: { color: colors.danger, fontSize: 12, lineHeight: 19 },
});
