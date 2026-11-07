import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import BookingFooterButton from '../components/BookingFooterButton';
import InsuranceAcceptanceRecorder from '../components/InsuranceAcceptanceRecorder';
import InsurancePanel from '../components/InsurancePanel';
import { colors, Icon } from '../components/ui';
import {
  ACCEPTANCE_STATEMENT,
  buildEnrollmentDescription,
  getDemoMonthlyPrice,
  INSURANCE_OCCUPATIONS,
  INSURANCE_PLANS,
} from '../domain/insuranceEnrollment';
import type { EnrollmentDetails, InsurancePlanId } from '../domain/insuranceEnrollment';
import { money, todayISO } from '../domain/dates';
import type { Attachment } from '../domain/types';
import { useAppStore } from '../state/store';

type Page = 'plans' | 'quote' | 'review' | 'video' | 'success';
type Popup = { kind: 'occupation' | 'quote' | 'contract' } | { kind: 'plan'; planId: InsurancePlanId };

export default function InsuranceEnrollmentScreen({ onClose, onBack }: { onClose: () => void; onBack: () => void }) {
  const { state, addRecordPersisted, storageError } = useAppStore();
  const [page, setPage] = useState<Page>('plans');
  const [planId, setPlanId] = useState<InsurancePlanId>('integral');
  const [details, setDetails] = useState<EnrollmentDetails>({ age: '', sex: '', smoker: '', occupation: '' });
  const [popup, setPopup] = useState<Popup | null>(null);
  const [recording, setRecording] = useState(false);
  const [acceptance, setAcceptance] = useState<Attachment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [folio, setFolio] = useState('');
  const submitted = useRef(false);
  const submitting = useRef(false);
  const active = useRef(true);
  const plan = INSURANCE_PLANS.find(item => item.id === planId)!;
  const monthly = getDemoMonthlyPrice(planId, details);
  const occupation = INSURANCE_OCCUPATIONS.find(item => item.id === details.occupation);
  const blocked = !!popup || recording;

  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    if (!popup) return;
    const close = () => { setPopup(null); return true; };
    const subscription = BackHandler.addEventListener('hardwareBackPress', close);
    if (Platform.OS === 'web') {
      const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); setPopup(null); } };
      window.addEventListener('keydown', escape);
      return () => { subscription.remove(); window.removeEventListener('keydown', escape); };
    }
    return () => subscription.remove();
  }, [popup]);

  function back() {
    if (busy) return;
    if (popup) { setPopup(null); return; }
    if (page === 'plans' || page === 'success') { onBack(); return; }
    setError('');
    setPage(page === 'video' ? 'review' : page === 'review' ? 'quote' : 'plans');
  }
  function choosePlan(id: InsurancePlanId) {
    if (id !== planId) { setAcceptance(null); setPlanId(id); }
    setError('');
    setPage('quote');
  }
  function changeDetails(patch: Partial<EnrollmentDetails>) {
    setDetails(current => ({ ...current, ...patch }));
    setAcceptance(null);
    setError('');
  }
  async function submit() {
    if (submitting.current || submitted.current || !acceptance || monthly === null) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      const id = await addRecordPersisted({
        type: 'Nota',
        title: `Solicitud de seguro · Plan ${plan.name}`,
        date: todayISO(),
        doctorName: 'Klini · demostración',
        description: buildEnrollmentDescription(planId, details, state.profile.name, monthly),
        attachment: acceptance,
      });
      submitted.current = true;
      if (active.current) { setFolio(id); setPage('success'); }
    } catch (cause) {
      if (active.current) setError(cause instanceof Error ? cause.message : 'No se pudo registrar la solicitud. Inténtalo de nuevo.');
    } finally {
      submitting.current = false;
      if (active.current) setBusy(false);
    }
  }

  const title = page === 'plans' ? 'Elige un plan' : page === 'review' ? 'Revisa tu solicitud' : page === 'video' ? 'Firma con video' : page === 'success' ? 'Solicitud registrada' : 'Tu seguro';
  const footer = page === 'plans'
    ? undefined
    : page === 'quote'
      ? <BookingFooterButton title="Contratar" testID="insurance-quote-contract" disabled={monthly === null} onPress={() => setPage('review')} />
      : page === 'review'
        ? <BookingFooterButton title="Aceptar y firmar" testID="insurance-review-sign" disabled={monthly === null} onPress={() => setPage('video')} />
        : page === 'video'
          ? <View style={s.footerActions}>
            <BookingFooterButton title={acceptance ? 'Repetir grabación' : 'Grabar aceptación'} icon={acceptance ? 'refresh' : 'camera'} testID={acceptance ? 'insurance-record-again' : 'insurance-record-acceptance'} disabled={busy} onPress={() => setRecording(true)} />
            <BookingFooterButton title={busy ? 'Guardando solicitud…' : 'Enviar solicitud'} testID="insurance-submit-application" disabled={!acceptance || monthly === null || busy} onPress={() => void submit()} />
            <Text style={s.footerHint}>{acceptance ? 'Se guardará en tu archivo de demostración.' : 'Graba tu aceptación para continuar.'}</Text>
          </View>
          : <BookingFooterButton title="Volver a Mi seguro" testID="insurance-enrollment-return" onPress={onBack} />;

  return <View style={s.root}>
    <View style={s.root} pointerEvents={blocked ? 'none' : 'auto'} accessibilityElementsHidden={blocked} importantForAccessibility={blocked ? 'no-hide-descendants' : 'auto'}>
      <InsurancePanel title={title} inlineTitle={page === 'quote'} onClose={onClose} onBack={back} footer={footer}>
        {!!storageError && <Text accessibilityRole="alert" style={s.error}>{storageError}</Text>}
        {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}

        {page === 'plans' && <>
          <Text style={s.subtitle}>Encuentra una opción para ti.</Text>
          {INSURANCE_PLANS.map(item => <Pressable key={item.id} testID={`insurance-plan-${item.id}`} accessibilityRole="button" accessibilityLabel={`Ver detalle del plan ${item.name}. Desde ${money(item.baseMonthly)}`} onPress={() => setPopup({ kind: 'plan', planId: item.id })} style={({ pressed }) => [s.planRow, s.planSelection, pressed && s.planPressed]}>
              <Icon name={item.icon} size={27} color={colors.teal} />
              <View style={s.flex}><Text style={s.rowTitle}>{item.name}</Text><Text style={s.small}>{item.subtitle}</Text></View>
              <View style={s.planPrice}><Text style={s.fromPrice}>Desde {money(item.baseMonthly)}</Text></View>
            <View testID={`insurance-plan-detail-${item.id}`} style={s.planDetail}>
              <View style={s.detailLink}><Text style={s.linkSmall}>Ver detalle</Text><Icon name="chevronRight" size={13} color={colors.tealDark} /></View>
            </View>
          </Pressable>)}
          <Text style={s.demoNote}>Planes y precios de ejemplo para esta demostración.</Text>
        </>}

        {page === 'quote' && <>
          <Text style={s.quotePlan}>Plan {plan.name}</Text>
          <Text style={s.quoteIntro}>Completa tus datos para ver tu precio.</Text>
          <View style={[s.quoteRow, s.quoteFirstRow]}>
            <Text style={s.quoteLabel}>Edad</Text>
            <TextInput testID="insurance-quote-age" accessibilityLabel="Edad en años" placeholder="Años" placeholderTextColor="#8DA1B5" value={details.age} onChangeText={age => changeDetails({ age: age.replace(/\D/g, '').slice(0, 2) })} keyboardType="number-pad" maxLength={2} style={s.quoteAge} />
          </View>
          <View style={s.quoteRow}>
            <Text style={s.quoteLabel}>Sexo</Text>
            <View style={s.quoteChoices} accessibilityRole="radiogroup" accessibilityLabel="Sexo">{(['Mujer', 'Hombre'] as const).map((value, index) => <Pressable key={value} testID={`insurance-sex-${index === 0 ? 'female' : 'male'}`} accessibilityRole="radio" accessibilityState={{ checked: details.sex === value }} aria-checked={details.sex === value} hitSlop={4} onPress={() => changeDetails({ sex: value })} style={[s.quoteChoice, index === 1 && s.quoteSecondChoice, details.sex === value && s.quoteChoiceSelected]}><Text style={[s.quoteChoiceText, details.sex === value && s.quoteChoiceTextSelected]}>{value}</Text></Pressable>)}</View>
          </View>
          <View style={s.quoteRow}>
            <Text style={s.quoteLabel}>¿Fumas?</Text>
            <View style={s.quoteChoices} accessibilityRole="radiogroup" accessibilityLabel="¿Fumas?">{(['Sí', 'No'] as const).map((value, index) => <Pressable key={value} testID={`insurance-smoker-${index === 0 ? 'yes' : 'no'}`} accessibilityRole="radio" accessibilityState={{ checked: details.smoker === value }} aria-checked={details.smoker === value} hitSlop={4} onPress={() => changeDetails({ smoker: value })} style={[s.quoteChoice, index === 1 && s.quoteSecondChoice, details.smoker === value && s.quoteChoiceSelected]}><Text style={[s.quoteChoiceText, details.smoker === value && s.quoteChoiceTextSelected]}>{value}</Text></Pressable>)}</View>
          </View>
          <View style={s.quoteRow}>
            <Text style={s.quoteLabel}>Ocupación</Text>
            <Pressable testID="insurance-occupation" accessibilityRole="button" accessibilityLabel={`Ocupación: ${occupation?.label ?? 'Seleccionar'}`} onPress={() => setPopup({ kind: 'occupation' })} hitSlop={4} style={s.quoteSelect}>
              <Text numberOfLines={1} style={[s.quoteSelectText, !occupation && s.placeholder]}>{occupation?.label ?? 'Seleccionar'}</Text><Icon name="chevronDown" size={15} color="#8DA1B5" />
            </Pressable>
          </View>
          <View style={s.quoteRow} testID="insurance-quote-price">
            <Text style={s.quoteLabel}>Tu precio</Text>
            <View style={s.quotePriceValue}>
              {monthly === null && <Icon name="lock" size={17} color="#9AAFC0" />}
              <Text style={[s.quotePrice, monthly === null && s.quotePricePending]}>{monthly === null ? '— / mes' : `${money(monthly)} / mes`}</Text>
            </View>
          </View>
        </>}

        {page === 'review' && <>
          <Text style={s.subtitle}>Comprueba los datos antes de firmar.</Text>
          <View style={s.summaryRow}><Icon name="file" size={22} color={colors.tealDark} /><View style={s.flex}><Text style={s.small}>Plan</Text><Text style={s.rowTitle}>{plan.name}</Text></View><BookingFooterButton title="Cambiar" testID="insurance-review-change-plan" onPress={() => { setAcceptance(null); setPage('plans'); }} /></View>
          <View style={s.summaryRow}><Icon name="person" size={22} color={colors.tealDark} /><View style={s.flex}><Text style={s.small}>Asegurada</Text><Text style={s.rowTitle}>{state.profile.name}</Text></View><BookingFooterButton title="Editar" testID="insurance-review-edit" onPress={() => { setAcceptance(null); setPage('quote'); }} /></View>
          <View style={s.summaryRow}><Icon name="card" size={22} color={colors.tealDark} /><View style={s.flex}><Text style={s.small}>Pago mensual de ejemplo</Text><Text style={s.rowTitle}>{monthly === null ? 'Completa tus datos' : money(monthly)}</Text></View></View>
          <View style={s.summaryRow}><Icon name="calendar" size={22} color={colors.tealDark} /><View style={s.flex}><Text style={s.small}>Vigencia</Text><Text style={s.rowTitle}>Al confirmar la emisión</Text><Text style={s.tiny}>Esta demostración no emite una póliza.</Text></View></View>
          <Pressable testID="insurance-review-quote" accessibilityRole="button" onPress={() => setPopup({ kind: 'quote' })} style={s.documentRow}><Icon name="document" size={21} color={colors.tealDark} /><Text style={s.documentLink}>Ver cotización</Text><Icon name="chevronRight" size={18} color={colors.tealDark} /></Pressable>
          <Pressable testID="insurance-review-contract" accessibilityRole="button" onPress={() => setPopup({ kind: 'contract' })} style={s.documentRow}><Icon name="file" size={21} color={colors.tealDark} /><Text style={s.documentLink}>Ver contrato</Text><Icon name="chevronRight" size={18} color={colors.tealDark} /></Pressable>
          <Text style={s.demoNote}>Solicitud local de demostración. No genera cobertura ni cobros.</Text>
        </>}

        {page === 'video' && <>
          <View style={[s.videoPreview, acceptance && s.videoRecorded]} testID="insurance-acceptance-preview">
            <View style={s.videoCorner}><Icon name={acceptance ? 'checkCircle' : 'camera'} size={21} color={acceptance ? colors.tealDark : '#8FA3B7'} /></View>
            <Icon name={acceptance ? 'videocam-outline' : 'person-outline'} size={76} color={acceptance ? colors.tealDark : '#9DAFC0'} />
            {acceptance && <Text style={s.recordedLabel}>Grabación lista</Text>}
          </View>
          <Text style={s.videoInstruction}>{acceptance ? 'Tu aceptación quedó grabada.' : 'Lee esta frase al grabar:'}</Text>
          <Text style={s.acceptanceStatement}>“{ACCEPTANCE_STATEMENT}”</Text>
          <Pressable accessibilityRole="button" testID="insurance-video-contract" onPress={() => setPopup({ kind: 'contract' })} style={s.viewContract}><Text style={s.link}>Ver contrato</Text><Icon name="chevronRight" size={15} color={colors.tealDark} /></Pressable>
          <Text style={s.demoNote}>Este video se conserva con tu solicitud de demostración; no se envía a una aseguradora.</Text>
        </>}

        {page === 'success' && <View testID="insurance-enrollment-success" style={s.success}>
          <View style={s.successIcon}><Icon name="check" size={32} color={colors.tealDark} /></View>
          <Text accessibilityRole="header" style={s.successTitle}>Solicitud de demostración registrada</Text>
          <Text style={s.successText}>Guardamos la información del plan {plan.name} y tu video de aceptación en Mi historial, dentro de Tu archivo.</Text>
          <Text selectable style={s.folio}>Folio local: {folio}</Text>
          <Text style={s.demoNote}>No se emitió una póliza, no se realizó ningún cobro y no se envió información a una aseguradora.</Text>
        </View>}
      </InsurancePanel>
    </View>

    {popup && <View style={s.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => setPopup(null)} accessibilityLabel="Cerrar ventana" />
      <View testID="insurance-enrollment-popup" accessibilityViewIsModal style={s.popup}>
        <View style={s.popupHeading}><Text style={s.popupTitle}>{popup.kind === 'occupation' ? 'Ocupación' : popup.kind === 'plan' ? `Plan ${INSURANCE_PLANS.find(item => item.id === popup.planId)!.name}` : popup.kind === 'quote' ? 'Cotización de ejemplo' : 'Contrato de demostración'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Cerrar ventana" testID="insurance-enrollment-popup-close" onPress={() => setPopup(null)} style={s.popupClose}><Icon name="close" size={20} color={colors.navy} /></Pressable></View>
        <ScrollView keyboardShouldPersistTaps="handled" style={s.popupScroll} contentContainerStyle={s.popupContent}>
          {popup.kind === 'occupation' ? INSURANCE_OCCUPATIONS.map(item => <Pressable key={item.id} testID={`insurance-occupation-${item.id}`} accessibilityRole="radio" accessibilityState={{ checked: item.id === details.occupation }} aria-checked={item.id === details.occupation} onPress={() => { changeDetails({ occupation: item.id }); setPopup(null); }} style={s.occupationRow}><Text style={s.occupationText}>{item.label}</Text>{item.id === details.occupation && <Icon name="check" size={18} color={colors.tealDark} />}</Pressable>) : popup.kind === 'plan' ? <>
            <Text style={s.popupParagraph}>{INSURANCE_PLANS.find(item => item.id === popup.planId)!.description}</Text>
            {INSURANCE_PLANS.find(item => item.id === popup.planId)!.benefits.map(benefit => <View key={benefit} style={s.benefit}><Icon name="check" size={16} color={colors.tealDark} /><Text style={s.benefitText}>{benefit}</Text></View>)}
            <Text style={s.demoNote}>Coberturas ilustrativas. No corresponden a una oferta de una aseguradora.</Text>
          </> : popup.kind === 'quote' ? <>
            <Text style={s.rowTitle}>Plan {plan.name}</Text><Text style={s.popupParagraph}>{state.profile.name}</Text>
            <Text style={s.popupParagraph}>{details.age} años · {details.sex} · {details.smoker === 'Sí' ? 'Fuma' : 'No fuma'}{occupation ? `\n${occupation.label}` : ''}</Text>
            <Text style={s.price}>{monthly === null ? 'Completa tus datos' : `${money(monthly)} / mes`}</Text>
            <Text style={s.demoNote}>Precio calculado únicamente para esta demostración. No es una cotización comercial ni genera un cargo.</Text>
          </> : <>
            <Text style={s.rowTitle}>Plan {plan.name} · {state.profile.name}</Text>
            <Text style={s.popupParagraph}>Este documento permite practicar el proceso de solicitud de un seguro en Klini. Los planes, precios y condiciones son ficticios.</Text>
            <Text style={s.popupParagraph}>La grabación y los datos se guardarán únicamente en el archivo local de esta demostración. No se envían a una aseguradora, no constituyen una contratación, no activan cobertura y no autorizan cobros.</Text>
            <Text style={s.popupParagraph}>Frase de práctica: “{ACCEPTANCE_STATEMENT}”.</Text>
            <Text style={s.demoNote}>Un seguro real requiere revisión, condiciones y emisión de una aseguradora.</Text>
          </>}
        </ScrollView>
        <BookingFooterButton title={popup.kind === 'plan' ? 'Elegir este plan' : 'Listo'} testID={popup.kind === 'plan' ? 'insurance-plan-choose' : undefined} onPress={() => { if (popup.kind === 'plan') choosePlan(popup.planId); setPopup(null); }} />
      </View>
    </View>}
    {recording && <InsuranceAcceptanceRecorder onClose={() => setRecording(false)} onRecorded={attachment => { setAcceptance(attachment); setRecording(false); setError(''); }} />}
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  subtitle: { color: '#8095AB', fontSize: 13, lineHeight: 19, marginBottom: 14 },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  planRow: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  planSelection: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 96, paddingVertical: 18 },
  planPressed: { backgroundColor: '#F2FAF9', opacity: .8 },
  planPrice: { maxWidth: '35%', paddingBottom: 24 },
  rowTitle: { color: colors.navy, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  small: { color: '#8094A9', fontSize: 11, lineHeight: 16 },
  tiny: { color: '#8B9DB0', fontSize: 10, lineHeight: 15 },
  planDetail: { position: 'absolute', right: 0, bottom: 9, minHeight: 34, paddingLeft: 8, justifyContent: 'center', alignItems: 'flex-end' },
  fromPrice: { color: colors.navy, fontSize: 10, fontWeight: '600', textAlign: 'right' },
  detailLink: { flexDirection: 'row', alignItems: 'center' },
  linkSmall: { color: colors.tealDark, fontSize: 10 },
  demoNote: { color: '#8A9BAE', fontSize: 10, lineHeight: 16, marginTop: 16 },
  quotePlan: { color: '#8B9DB0', fontSize: 11, lineHeight: 16, marginLeft: 20, marginTop: 2 },
  quoteIntro: { color: '#8B9DB0', fontSize: 11, lineHeight: 17, marginTop: 5, marginBottom: 13 },
  quoteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 54, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  quoteFirstRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  quoteLabel: { flex: 1, minWidth: 0, color: colors.navy, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  quoteAge: { width: 90, minHeight: 32, borderRadius: 8, backgroundColor: '#F3F7FA', borderWidth: 1, borderColor: '#E7EFF4', paddingHorizontal: 10, paddingVertical: 6, color: colors.navy, fontSize: 12 },
  quoteChoices: { width: 166, flexDirection: 'row', minHeight: 32, borderRadius: 8, borderWidth: 1, borderColor: '#E7EFF4', backgroundColor: '#F3F7FA', overflow: 'hidden' },
  quoteChoice: { flex: 1, minHeight: 32, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  quoteSecondChoice: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: '#E3EBF1' },
  quoteChoiceSelected: { backgroundColor: '#DDF5F2' },
  quoteChoiceText: { color: '#8C9EB1', fontSize: 12, lineHeight: 17 },
  quoteChoiceTextSelected: { color: colors.tealDark, fontWeight: '600' },
  quoteSelect: { maxWidth: 166, minWidth: 98, minHeight: 32, borderRadius: 8, borderWidth: 1, borderColor: '#E7EFF4', backgroundColor: '#F3F7FA', paddingHorizontal: 9, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 7 },
  quoteSelectText: { flexShrink: 1, minWidth: 0, color: colors.navy, fontSize: 12, lineHeight: 18 },
  quotePriceValue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 7, maxWidth: '70%' },
  quotePrice: { color: colors.navy, fontSize: 13, lineHeight: 19, fontWeight: '600', textAlign: 'right', flexShrink: 1 },
  quotePricePending: { color: '#9AAFC0', fontWeight: '500' },
  placeholder: { color: '#8DA1B5' },
  price: { color: colors.navy, fontSize: 18, lineHeight: 25, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 16, borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth },
  documentRow: { flexDirection: 'row', alignItems: 'center', gap: 15, minHeight: 49, borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth },
  documentLink: { color: colors.tealDark, fontSize: 12, flex: 1 },
  videoPreview: { alignSelf: 'center', width: '85%', maxWidth: 300, aspectRatio: 1.65, borderRadius: 12, backgroundColor: '#EDF2F7', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  videoRecorded: { backgroundColor: '#E5F6F2' },
  videoCorner: { position: 'absolute', top: 12, right: 12 },
  recordedLabel: { color: colors.tealDark, fontSize: 12, marginTop: 4, fontWeight: '600' },
  videoInstruction: { color: '#8B9DB0', fontSize: 12, textAlign: 'center', marginTop: 17 },
  acceptanceStatement: { color: colors.navy, fontSize: 16, fontWeight: '600', lineHeight: 22, textAlign: 'center', marginTop: 7 },
  viewContract: { minHeight: 44, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, marginTop: 6 },
  link: { color: colors.tealDark, fontSize: 12 },
  footerActions: { gap: 13, alignItems: 'center' },
  footerHint: { color: '#8B9DB0', fontSize: 10, lineHeight: 15, textAlign: 'center' },
  success: { paddingTop: 20, alignItems: 'center' },
  successIcon: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#DDF5F2', justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
  successTitle: { color: colors.navy, fontSize: 20, fontWeight: '600', textAlign: 'center', lineHeight: 26 },
  successText: { color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 21, marginTop: 12 },
  folio: { color: colors.tealDark, fontSize: 11, lineHeight: 18, marginTop: 16 },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(8,36,65,.34)', justifyContent: 'center', alignItems: 'center', padding: 28 },
  popup: { width: '100%', maxWidth: 340, maxHeight: '85%', borderRadius: 20, backgroundColor: 'white', padding: 17, gap: 12 },
  popupHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  popupTitle: { flex: 1, fontSize: 18, lineHeight: 23, color: colors.navy, fontWeight: '600' },
  popupClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EDF5F6', justifyContent: 'center', alignItems: 'center' },
  popupScroll: { flexShrink: 1, minHeight: 0 },
  popupContent: { paddingBottom: 5 },
  occupationRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth },
  occupationText: { color: colors.navy, fontSize: 13, flex: 1 },
  popupParagraph: { color: colors.navy, fontSize: 13, lineHeight: 21, marginVertical: 9 },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 9 },
  benefitText: { color: colors.navy, fontSize: 12, lineHeight: 19, flex: 1 },
});
