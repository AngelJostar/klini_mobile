import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { subscriptionPackages, type SubscriptionPackage } from '../domain/subscriptionPackages';
import { createSubscriptionUpgradeQuote, getSubscriptionOverview, type SubscriptionUpgradeQuote } from '../domain/subscriptionPlan';
import { parseDate } from '../domain/dates';
import { money } from '../domain/wallet';
import { useAppStore } from '../state/store';
import { colors, Icon } from './ui';

type Step = 'overview' | 'plan' | 'payment' | 'confirm' | 'success';
type Method = 'visa' | 'mastercard' | 'apple-pay';
type Props = { onBack: () => void; onClose: () => void; onBusyChange?: (busy: boolean) => void; onManageAi?: () => void; demoUpgradeEnabled?: boolean };
const methods: Record<Method, string> = { visa: 'Visa •••• 4242', mastercard: 'Mastercard •••• 5555', 'apple-pay': 'Apple Pay' };
const dateText = (date: string) => parseDate(date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
const pesos = (cents: number) => money(cents / 100);
const plansByMonthlyPrice = [...subscriptionPackages].sort((left, right) => left.monthlyPrice - right.monthlyPrice);

function PlanCard({ plan, current = false, next = false, compact = false, preview = false }: { plan: SubscriptionPackage; current?: boolean; next?: boolean; compact?: boolean; preview?: boolean }) {
  return <View testID={`subscription-package-${plan.id}`} style={[s.card, current && s.currentCard, next && s.nextCard]}>
    {(current || next) && <View style={s.cardTop}>
      {next && <Icon name="sparkles-outline" size={23} color="#009AA5" />}
      <View style={[s.badge, current && s.currentBadge]}>{current && <Icon name="check" size={13} color="#009AA5" />}<Text style={[s.badgeText, current && s.currentBadgeText]}>{current ? preview ? 'Plan de ejemplo' : 'Tu plan actual' : preview ? 'SIGUIENTE NIVEL' : 'TU SIGUIENTE PLAN'}</Text></View>
    </View>}
    <Text testID={`subscription-package-${plan.id}-name`} accessibilityRole="header" style={s.planName}>{plan.name}</Text>
    <Text testID={`subscription-package-${plan.id}-price`} style={s.price}>${plan.monthlyPrice}<Text style={s.period}> MXN / mes</Text></Text>
    <Text testID={`subscription-package-${plan.id}-storage`} style={s.storage}>{plan.storageLabel} de almacenamiento</Text>
    {!compact && <>
      <View style={s.benefits}>{plan.benefits.map(benefit => <View key={benefit} style={s.benefit}><Icon name="check" size={16} color="#009FA8" /><Text style={s.benefitText}>{benefit}</Text></View>)}</View>
      {!!plan.includes && <Text style={s.includes}>{plan.includes}{plan.id === 'integrated-ai' ? ', más IA.' : '.'}</Text>}
      {!!plan.note && <Text style={s.note}>{plan.note}</Text>}
    </>}
  </View>;
}

function Stepper({ step }: { step: Step }) {
  const active = step === 'plan' ? 0 : step === 'payment' ? 1 : 2;
  return <View accessibilityLabel={`Paso ${active + 1} de 3`} style={s.stepper}>
    {['Plan', 'Pago', 'Confirmar'].map((label, index) => <React.Fragment key={label}>
      {index > 0 && <View style={[s.stepLine, index <= active && s.stepLineDone]} />}
      <View style={s.stepItem}><View style={[s.stepCircle, index <= active && s.stepCircleActive]}>{index < active ? <Icon name="check" size={11} color="white" /> : <Text style={[s.stepNumber, index === active && s.white]}>{index + 1}</Text>}</View><Text style={[s.stepLabel, index === active && s.stepLabelActive]}>{label}</Text></View>
    </React.Fragment>)}
  </View>;
}

export default function SubscriptionPackagesPanel({ onBack, onClose, onBusyChange, onManageAi, demoUpgradeEnabled = false }: Props) {
  const { state, ownerProfile, upgradeSubscription } = useAppStore();
  const overview = getSubscriptionOverview(state);
  const [step, setStep] = useState<Step>('overview');
  const [quote, setQuote] = useState<SubscriptionUpgradeQuote | null>(null);
  const [method, setMethod] = useState<Method>('visa');
  const [otherCardsOpen, setOtherCardsOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const busyRef = useRef(false);
  const mounted = useRef(true);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const termsLink = useRef<React.ComponentRef<typeof View>>(null);
  const target = quote ? subscriptionPackages.find(plan => plan.id === quote.toPlanId)! : overview.nextPlan;
  const previous = quote ? subscriptionPackages.find(plan => plan.id === quote.fromPlanId)! : overview.currentPlan;
  const back = useCallback(() => {
    if (busyRef.current) return;
    setError('');
    if (termsOpen) { setTermsOpen(false); termsLink.current?.focus(); }
    else if (otherCardsOpen) setOtherCardsOpen(false);
    else if (step === 'confirm') { setConsent(false); setStep('payment'); }
    else if (step === 'payment') { setConsent(false); setStep('plan'); }
    else if (step === 'plan') { setQuote(null); setConsent(false); setStep('overview'); }
    else onBack();
  }, [onBack, otherCardsOpen, step, termsOpen]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; onBusyChange?.(false); };
  }, [onBusyChange]);
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [step, termsOpen]);
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    if (Platform.OS !== 'web') return () => listener.remove();
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); back(); } };
    window.addEventListener('keydown', escape, true);
    return () => { listener.remove(); window.removeEventListener('keydown', escape, true); };
  }, [back]);
  function startUpgrade() {
    if (busyRef.current || !demoUpgradeEnabled || !overview.nextPlan) return;
    setError(''); setConsent(false); setOtherCardsOpen(false);
    try { setQuote(createSubscriptionUpgradeQuote(state, overview.nextPlan.id)); setStep('plan'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo preparar tu mejora.'); }
  }
  async function confirmUpgrade() {
    if (busyRef.current || !demoUpgradeEnabled || !consent || !quote || step !== 'confirm') return;
    busyRef.current = true; setBusy(true); onBusyChange?.(true); setError('');
    try {
      await upgradeSubscription(quote);
      if (mounted.current) setStep('success');
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'No se pudo guardar tu upgrade. Inténtalo de nuevo.');
    } finally {
      busyRef.current = false;
      if (mounted.current) { setBusy(false); onBusyChange?.(false); }
    }
  }
  function chooseMethod(value: Method) {
    if (busyRef.current) return;
    setMethod(value); setConsent(false); setOtherCardsOpen(false); setError('');
  }
  const close = () => { if (!busyRef.current) onClose(); };
  const title = step === 'overview' ? demoUpgradeEnabled ? 'Tu suscripción' : 'Planes de Klini' : step === 'plan' ? 'Tu upgrade' : step === 'payment' ? 'Método de pago' : step === 'confirm' ? 'Confirmar upgrade' : 'Tu nuevo plan';
  const example = quote ? `${quote.remainingDays} de ${quote.totalDays} días` : '';
  const disclaimer = demoUpgradeEnabled ? 'Demostración · Sin cargos reales' : 'Vista previa · Compra de planes próximamente';
  const payRow = (value: Method, detail?: string) => <Pressable key={value} testID={`subscription-payment-${value}`} accessibilityRole="radio" accessibilityState={{ checked: method === value, disabled: busy }} aria-checked={method === value} disabled={busy} onPress={() => chooseMethod(value)} style={({ pressed }) => [s.method, method === value && s.methodSelected, pressed && s.dim]}>
    <Icon name={value === 'apple-pay' ? 'logo-apple' : 'card'} color={colors.navy} size={24} /><View style={s.grow}><Text style={s.methodName}>{methods[value]}</Text>{detail && <Text style={s.caption}>{detail}</Text>}</View><View style={[s.radio, method === value && s.radioSelected]}>{method === value && <View style={s.radioDot} />}</View>
  </Pressable>;
  return <View testID="subscription-packages" style={s.root}>
    <View style={s.main} pointerEvents={termsOpen ? 'none' : 'auto'} accessibilityElementsHidden={termsOpen} importantForAccessibility={termsOpen ? 'no-hide-descendants' : 'auto'}>
      <View style={s.header}>
        <Pressable testID="subscription-upgrade-back" accessibilityRole="button" accessibilityLabel="Volver" disabled={busy} onPress={back} style={s.headerButton}><Icon name="back" color="#627C90" size={23} /></Pressable>
        <Text accessibilityRole="header" style={s.title}>{title}</Text>
        <Pressable testID="subscription-upgrade-close" accessibilityRole="button" accessibilityLabel="Cerrar suscripción" disabled={busy} onPress={close} style={s.headerButton}><Icon name="close" color="#627C90" size={23} /></Pressable>
      </View>
      <ScrollView ref={scroll} style={s.scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
        {step !== 'overview' && step !== 'success' && <Stepper step={step} />}
        {step === 'overview' && <>
          <Text style={s.intro}>Más espacio. Más posibilidades.</Text>
          <View style={s.accountScope}><Icon name="people" size={14} color="#7993A6" /><Text style={s.caption}>{demoUpgradeEnabled ? 'Un plan para toda tu cuenta' : 'Comparación de planes de ejemplo'}</Text></View>
          <View testID="subscription-plan-list" style={s.planList}>
            {plansByMonthlyPrice.map(plan => {
              const current = plan.id === overview.currentPlan.id;
              const next = plan.id === overview.nextPlan?.id;
              return <View key={plan.id} testID={current ? 'subscription-current-plan' : next ? 'subscription-next-plan' : undefined}>
                <PlanCard plan={plan} current={current} next={next} compact={!next} preview={!demoUpgradeEnabled} />
              </View>;
            })}
          </View>
          {!overview.nextPlan && <View style={s.topPlan}><Icon name="checkCircle" size={26} color={colors.tealDark} /><Text style={s.sectionTitle}>{demoUpgradeEnabled ? 'Ya tienes el plan más completo.' : 'IA MAX: nuestro nivel más completo.'}</Text></View>}
          <Text style={s.note}>Capacidad y beneficios propuestos para esta demostración.</Text>
          {!!onManageAi && <Pressable testID="subscription-manage-ai" accessibilityRole="button" onPress={onManageAi} style={s.linkButton}><Text style={s.link}>Gestionar acceso de Klini IA</Text><Icon name="chevronRight" size={14} color={colors.tealDark} /></Pressable>}
        </>}
        {step === 'plan' && quote && target && <>
          <Text accessibilityRole="header" style={s.heading}>Más Klini para ti.</Text>
          <PlanCard plan={target} next />
          <Text style={s.replaces}>Tu {previous.name} de ${previous.monthlyPrice} se reemplaza al confirmar la demostración.</Text>
          <View style={s.billingRow}><Icon name="calendar" size={21} color="#7993A6" /><View style={s.grow}><Text style={s.billingTitle}>Pago hoy</Text><Text style={s.caption}>Ajuste proporcional de tu periodo</Text></View><Text testID="subscription-prorated-amount" style={s.billingAmount}>{pesos(quote.amountCents)} MXN</Text></View>
          <View style={s.billingRow}><Icon name="calendar" size={21} color="#7993A6" /><View style={s.grow}><Text testID="subscription-renewal-date" style={s.billingTitle}>Desde el {dateText(quote.periodEnd)}</Text><Text style={s.caption}>Conservas tu fecha de renovación</Text></View><Text style={s.billingAmount}>${target.monthlyPrice}<Text style={s.caption}> / mes</Text></Text></View>
          <Text style={s.note}>{quote.periodSource === 'example' ? 'Ejemplo: quedan ' : 'Quedan '}{example} del periodo.</Text>
        </>}
        {step === 'payment' && quote && target && <>
          <Text accessibilityRole="header" style={s.heading}>¿Cómo quieres pagar?</Text>
          <Text style={s.paymentHint}>Se usará también para tu cobro mensual.</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel="Método de pago de ejemplo" style={s.methods}>
            {payRow(method === 'mastercard' ? 'mastercard' : 'visa', 'Tarjeta de ejemplo')}
            <Pressable testID="subscription-other-card" accessibilityRole="button" accessibilityState={{ expanded: otherCardsOpen }} onPress={() => setOtherCardsOpen(value => !value)} style={s.otherMethod}><Icon name="plus" size={21} color="#00AEB5" /><Text style={[s.methodName, s.grow]}>Usar otra tarjeta</Text><Icon name="chevronRight" size={17} color="#7993A6" /></Pressable>
            {otherCardsOpen && <View testID="subscription-card-choices" style={s.cardChoices}><Text style={s.caption}>Elige una tarjeta de demostración</Text>{payRow(method === 'mastercard' ? 'visa' : 'mastercard', 'Datos de ejemplo · sin captura de tarjeta')}</View>}
            {payRow('apple-pay', 'Demostración')}
          </View>
          <View style={s.paymentSummary}>
            <Text style={s.planName}>{target.name}</Text><Text style={s.price}>${target.monthlyPrice}<Text style={s.period}> MXN / mes</Text></Text>
            <View style={s.summaryDivider} /><Text style={s.caption}>Pago de hoy</Text><Text testID="subscription-payment-amount" style={s.price}>{pesos(quote.amountCents)}<Text style={s.period}> MXN</Text></Text>
            <Text style={s.caption}>Desde el {dateText(quote.periodEnd)}: ${target.monthlyPrice} al mes</Text>
          </View><Text style={s.centerNote}>El ajuste de hoy corresponde a {example}.</Text>
        </>}
        {step === 'confirm' && quote && target && <>
          <Text accessibilityRole="header" style={s.heading}>Todo listo para mejorar.</Text>
          <PlanCard plan={target} next compact />
          <View style={s.reviewRows}>
            {[['Plan anterior', `${previous.name} · $${previous.monthlyPrice} / mes`], ['Pago de hoy', `${pesos(quote.amountCents)} MXN`], ['Renovación', `${dateText(quote.periodEnd)} · $${target.monthlyPrice}`], ['Método', methods[method]]].map(([label, value]) => <View key={label} style={s.reviewRow}><Text style={[s.caption, s.grow]}>{label}</Text><Text testID={label === 'Método' ? 'subscription-review-method' : undefined} style={s.reviewValue}>{value}</Text></View>)}
          </View>
          <Text style={s.note}>Ajuste proporcional: {example}.</Text>
          <Pressable testID="subscription-upgrade-consent" accessibilityRole="checkbox" accessibilityState={{ checked: consent, disabled: busy }} aria-checked={consent} disabled={busy} onPress={() => setConsent(value => !value)} style={s.consent}>
            <View style={[s.checkbox, consent && s.checkboxChecked]}>{consent && <Icon name="check" color="white" size={14} />}</View><Text style={s.consentText}>Acepto simular el ajuste de {pesos(quote.amountCents)} hoy y la renovación de ${target.monthlyPrice} MXN al mes desde el {dateText(quote.periodEnd)}, sin cargos reales.</Text>
          </Pressable>
          <Pressable ref={termsLink} testID="subscription-upgrade-terms" accessibilityRole="button" disabled={busy} onPress={() => setTermsOpen(true)} style={s.termsLink}><Text style={s.termsText}>Términos de la suscripción</Text></Pressable>
          <Text style={[s.note, s.consentNote]}>El plan se actualiza en toda la cuenta al completar la demostración.</Text>
        </>}
        {step === 'success' && target && quote && <View testID="subscription-upgrade-success" style={s.success}>
          <View style={s.successIcon}><Icon name="check" size={32} color={colors.tealDark} /></View>
          <Text accessibilityRole="header" style={s.heading}>Tu upgrade está listo.</Text>
          <Text style={s.successCopy}>{target.name} es ahora el plan de toda tu cuenta en esta demostración.</Text>
          <View style={s.successPlan}><PlanCard plan={target} current compact /></View>
          <Text style={s.caption}>Cuenta de {ownerProfile.name}</Text><Text style={s.centerNote}>No se realizó ningún cargo ni se descontó saldo de tu billetera.</Text>
          <Pressable testID="subscription-upgrade-wallet" accessibilityRole="button" onPress={onBack} style={s.linkButton}><Text style={s.link}>Volver a mi billetera</Text></Pressable>
        </View>}
        {!!error && <View style={s.errorBox}><Text testID="subscription-upgrade-error" accessibilityRole="alert" style={s.error}>{error}</Text>{step !== 'overview' && <Pressable testID="subscription-upgrade-requote" accessibilityRole="button" disabled={busy} onPress={startUpgrade} style={s.linkButton}><Text style={s.link}>Volver a revisar el plan</Text></Pressable>}</View>}
      </ScrollView>
      <View style={s.footer}>
        {step === 'overview' && overview.nextPlan && <Pressable testID="subscription-upgrade-start" accessibilityRole="button" accessibilityState={{ disabled: !demoUpgradeEnabled }} disabled={!demoUpgradeEnabled} onPress={startUpgrade} style={({ pressed }) => [s.primary, (!demoUpgradeEnabled || pressed) && s.dim]}><Text style={s.primaryText}>Mejorar mi plan</Text></Pressable>}
        {step === 'plan' && <Pressable testID="subscription-upgrade-continue" accessibilityRole="button" onPress={() => setStep('payment')} style={({ pressed }) => [s.primary, pressed && s.dim]}><Text style={s.primaryText}>Continuar</Text></Pressable>}
        {step === 'payment' && <Pressable testID="subscription-payment-review" accessibilityRole="button" onPress={() => { setConsent(false); setOtherCardsOpen(false); setStep('confirm'); }} style={({ pressed }) => [s.primary, pressed && s.dim]}><Text style={s.primaryText}>Revisar</Text></Pressable>}
        {step === 'confirm' && quote && <Pressable testID="subscription-upgrade-confirm" accessibilityRole="button" accessibilityState={{ disabled: !consent || busy }} disabled={!consent || busy} onPress={() => void confirmUpgrade()} style={({ pressed }) => [s.primary, (!consent || busy || pressed) && s.dim]}><Text style={s.primaryText}>{busy ? 'Guardando…' : `Aceptar y simular ${pesos(quote.amountCents)}`}</Text></Pressable>}
        {step === 'success' && <Pressable testID="subscription-upgrade-return" accessibilityRole="button" onPress={() => { setQuote(null); setConsent(false); setError(''); setStep('overview'); }} style={({ pressed }) => [s.primary, pressed && s.dim]}><Text style={s.primaryText}>Ver mi suscripción</Text></Pressable>}
        <Text style={s.footerNote}>{step === 'confirm' && !consent ? 'Acepta la demostración para continuar.\n' : ''}{disclaimer}</Text>
      </View>
    </View>
    {termsOpen && <View testID="subscription-terms-panel" accessibilityViewIsModal style={s.termsPanel}>
      <View style={s.header}><Text accessibilityRole="header" style={s.title}>Términos de la demostración</Text><Pressable testID="subscription-terms-close" accessibilityRole="button" accessibilityLabel="Cerrar términos" onPress={back} style={s.headerButton}><Icon name="close" size={22} /></Pressable></View>
      <ScrollView contentContainerStyle={s.termsContent}><Text style={s.sectionTitle}>Tu upgrade, sin cargos reales</Text><Text style={s.termsBody}>Los importes, las fechas y los métodos de pago de esta pantalla son de demostración. No se cobra a una tarjeta ni a Apple Pay y no se utiliza el saldo de la billetera.</Text><Text style={s.termsBody}>El cambio se confirma únicamente al aceptar la demostración y se aplica al plan de toda la cuenta. Puedes volver o cerrar antes de confirmar para conservar tu plan.</Text><Text style={s.termsBody}>El ajuste proporcional muestra la diferencia de precio por los días restantes del periodo. Las capacidades y los beneficios de los paquetes siguen siendo una propuesta; no se inicia una renovación ni un cobro automático.</Text></ScrollView>
    </View>}
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, minHeight: 0 }, main: { flex: 1, minHeight: 0 }, header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 52 }, headerButton: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, title: { flex: 1, minWidth: 0, textAlign: 'center', color: colors.navy, fontSize: 18, lineHeight: 25, fontWeight: '600' },
  scroll: { flex: 1, minHeight: 0 }, content: { paddingHorizontal: 24, paddingBottom: 18, gap: 14 }, intro: { color: '#7892A6', fontSize: 12, lineHeight: 18, textAlign: 'center' }, accountScope: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: -6, marginBottom: 1 }, grow: { flex: 1, minWidth: 0 },
  planList: { gap: 14 }, card: { borderWidth: 1, borderColor: '#E1EAF0', borderRadius: 12, padding: 17, backgroundColor: '#FCFEFE', gap: 5 }, currentCard: { borderColor: '#C9DCEB' }, nextCard: { borderColor: '#00DEE0', backgroundColor: '#F7FDFD', boxShadow: '0 4px 18px rgba(0,210,215,.13)' }, cardTop: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 3 }, badge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#E0F6F6', borderRadius: 15, paddingHorizontal: 9, paddingVertical: 3 }, badgeText: { color: '#04868F', fontSize: 9, lineHeight: 14, fontWeight: '600', letterSpacing: .8 }, currentBadge: { backgroundColor: '#F5F9FC', paddingHorizontal: 4 }, currentBadgeText: { color: colors.navy, fontSize: 10, letterSpacing: 0 },
  planName: { color: colors.navy, fontSize: 19, lineHeight: 26, fontWeight: '600' }, price: { color: colors.navy, fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -.7 }, period: { fontSize: 11, lineHeight: 18, letterSpacing: 0, fontWeight: '400' }, storage: { color: '#6A88A0', fontSize: 12, lineHeight: 19 }, benefits: { gap: 7, marginTop: 9 }, benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, benefitText: { flex: 1, minWidth: 0, color: '#55758A', fontSize: 12, lineHeight: 18 }, includes: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DCEAEC', paddingTop: 10, marginTop: 5, fontSize: 11, lineHeight: 17, color: '#87A1B4' }, note: { color: '#829AAD', fontSize: 10, lineHeight: 16 }, centerNote: { color: '#829AAD', fontSize: 10, lineHeight: 16, textAlign: 'center' }, caption: { color: '#829AAD', fontSize: 11, lineHeight: 17 }, sectionTitle: { color: colors.navy, fontSize: 17, fontWeight: '600', lineHeight: 24 }, heading: { color: colors.navy, fontSize: 23, lineHeight: 31, fontWeight: '700', marginTop: 1 },
  stepper: { flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: 25, marginTop: 3, marginBottom: 3 }, stepItem: { width: 48, alignItems: 'center', gap: 5 }, stepCircle: { width: 21, height: 21, borderRadius: 11, borderWidth: 1, borderColor: '#CDDAE5', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' }, stepCircleActive: { backgroundColor: '#00A9B0', borderColor: '#00A9B0' }, stepNumber: { color: '#8BA0B1', fontSize: 10 }, white: { color: 'white' }, stepLabel: { color: '#8BA0B1', fontSize: 10, lineHeight: 15 }, stepLabelActive: { color: '#00959F', fontWeight: '600' }, stepLine: { flex: 1, height: 1, backgroundColor: '#DAE4EC', marginTop: 10 }, stepLineDone: { backgroundColor: '#73D7DB' },
  replaces: { color: '#849CAF', fontSize: 10, lineHeight: 16, marginTop: -7 }, billingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E4EBF0' }, billingTitle: { color: colors.navy, fontSize: 12, lineHeight: 18, fontWeight: '500' }, billingAmount: { maxWidth: '43%', flexShrink: 1, textAlign: 'right', color: colors.navy, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  paymentHint: { color: '#6C88A0', fontSize: 12, lineHeight: 19, marginTop: -10 }, methods: { gap: 10 }, method: { minHeight: 55, borderWidth: 1, borderColor: '#DFE8EE', borderRadius: 8, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 13 }, methodSelected: { borderColor: '#20D5DA', backgroundColor: '#F4FCFC' }, methodName: { color: colors.navy, fontSize: 13, lineHeight: 19, fontWeight: '600' }, radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: '#D2DFE8', alignItems: 'center', justifyContent: 'center' }, radioSelected: { borderColor: '#00A8B0' }, radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#00A8B0' }, otherMethod: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, borderWidth: 1, borderColor: '#E1E9EF', borderRadius: 8, paddingHorizontal: 13 }, cardChoices: { gap: 8, padding: 10, backgroundColor: '#F7FAFC', borderRadius: 10 }, paymentSummary: { backgroundColor: '#F0FBFA', borderWidth: 1, borderColor: '#9DE7E8', padding: 16, borderRadius: 10, gap: 4, marginTop: 8 }, summaryDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#D6EAEB', marginVertical: 6 },
  reviewRows: { gap: 0 }, reviewRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E3ECF1', paddingVertical: 7 }, reviewValue: { color: colors.navy, fontSize: 11, lineHeight: 17, flex: 1.2 }, consent: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 4, minHeight: 44 }, checkbox: { width: 19, height: 19, borderRadius: 4, borderWidth: 1, borderColor: '#91A7B9', alignItems: 'center', justifyContent: 'center', marginTop: 2 }, checkboxChecked: { backgroundColor: '#00A8AE', borderColor: '#00A8AE' }, consentText: { flex: 1, color: colors.navy, fontSize: 11, lineHeight: 18 }, consentNote: { marginLeft: 31, marginTop: -12 }, termsLink: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingLeft: 31, marginVertical: -10 }, termsText: { color: '#008C97', textDecorationLine: 'underline', fontSize: 11, lineHeight: 18 },
  footer: { paddingHorizontal: 24, paddingTop: 9, paddingBottom: 2, gap: 7, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EEF2F5' }, primary: { alignSelf: 'center', minHeight: 44, minWidth: 134, maxWidth: '100%', borderRadius: 25, paddingHorizontal: 23, paddingVertical: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#008F9B' }, primaryText: { color: 'white', fontSize: 12, lineHeight: 19, fontWeight: '600', textAlign: 'center' }, footerNote: { color: '#8AA0B1', fontSize: 9, lineHeight: 15, textAlign: 'center' }, linkButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 }, link: { color: colors.tealDark, fontSize: 12, lineHeight: 19 }, dim: { opacity: .4 }, topPlan: { gap: 10, alignItems: 'center', paddingVertical: 20 },
  success: { gap: 12, alignItems: 'center', paddingVertical: 16 }, successIcon: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5F7F3' }, successCopy: { textAlign: 'center', color: '#627F93', fontSize: 13, lineHeight: 21 }, successPlan: { alignSelf: 'stretch' }, errorBox: { gap: 4 }, error: { color: colors.danger, fontSize: 12, lineHeight: 19 }, termsPanel: { ...StyleSheet.absoluteFill, backgroundColor: 'white', zIndex: 10 }, termsContent: { padding: 24, gap: 18 }, termsBody: { color: '#627F93', fontSize: 13, lineHeight: 22 },
});
