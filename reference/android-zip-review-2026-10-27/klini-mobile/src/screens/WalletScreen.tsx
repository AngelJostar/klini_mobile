import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, BackHandler, Easing, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AiSubscriptionPanel from '../components/AiSubscriptionPanel';
import WalletSubscriptionDisplay from '../components/WalletSubscriptionDisplay';
import SubscriptionPackagesPanel from '../components/SubscriptionPackagesPanel';
import WalletRechargePanel, { type RechargeMethod, type RechargeStep } from '../components/WalletRechargePanel';
import WalletApplePayTestPanel from '../components/WalletApplePayTestPanel';
import { colors, Icon } from '../components/ui';
import { initialWallet, money, walletTotals, type WalletMovement } from '../domain/wallet';
import { loadWalletTokens, type TokenWallet } from '../services/wallet';
import { useAppStore } from '../state/store';
import WalletAccountScreen from './WalletAccountScreen';
import { accountWalletSelected } from '../services/accountWallet';

type Page = 'overview' | 'recharge' | 'movements' | 'tokens' | 'subscription' | 'packages' | 'apple-pay-test';

function Movement({ item }: { item: WalletMovement }) {
  return <View testID={'wallet-movement-' + item.id} style={s.movement}>
    <View style={s.movementIcon}><Icon name={item.amount >= 0 ? 'plus' : 'remove'} size={17} color={item.amount >= 0 ? colors.tealDark : '#8295A6'} /></View>
    <View style={s.flex}><Text style={s.movementName}>{item.concept}</Text><Text style={s.caption}>{item.date}</Text></View>
    <Text style={[s.movementAmount, item.amount < 0 && s.debit]}>{item.amount >= 0 ? '+' : '−'}{money(Math.abs(item.amount))}</Text>
  </View>;
}

export default function WalletScreen({ onClose }: { onClose: () => void }) {
  return accountWalletSelected() ? <WalletAccountScreen onClose={onClose} /> : <DemoWalletScreen onClose={onClose} />;
}

function DemoWalletScreen({ onClose }: { onClose: () => void }) {
  const { state, rechargeWallet, storageError } = useAppStore();
  const wallet = state.wallet ?? initialWallet;
  const totals = walletTotals(wallet);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const maxSheetHeight = Math.max(0, height - insets.top - 26);
  const [progress] = useState(() => new Animated.Value(0));
  const reduceMotion = useRef(false);
  const closing = useRef(false);
  const [isClosing, setIsClosing] = useState(false);
  const mounted = useRef(true);
  const [page, setPage] = useState<Page>('overview');
  const [amount, setAmount] = useState('200');
  const overviewHeight = useRef(0);
  const [rechargeHeight, setRechargeHeight] = useState(0);
  const [rechargeStep, setRechargeStep] = useState<RechargeStep>('amount');
  const [paymentMethod, setPaymentMethod] = useState<RechargeMethod>('apple-pay');
  const [rechargeReview, setRechargeReview] = useState<{ amount: number; balance: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const lastRechargeAt = useRef(Number.NEGATIVE_INFINITY);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [tokenWallet, setTokenWallet] = useState<TokenWallet | null>(null);
  const [tokenError, setTokenError] = useState('');
  const [tokenLoading, setTokenLoading] = useState(true);
  const [subscriptionBusy, setSubscriptionBusy] = useState(false);
  const subscriptionBusyRef = useRef(false);
  const request = useRef<AbortController | null>(null);
  const requestTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSubscriptionBusy = useCallback((value: boolean) => { subscriptionBusyRef.current = value; setSubscriptionBusy(value); }, []);
  const leaveSubscription = useCallback(() => { if (!closing.current && !busyRef.current && !subscriptionBusyRef.current) setPage('overview'); }, []);

  const refreshTokens = useCallback(async () => {
    if (closing.current) return;
    request.current?.abort();
    if (requestTimeout.current) clearTimeout(requestTimeout.current);
    const controller = new AbortController();
    request.current = controller;
    requestTimeout.current = setTimeout(() => {
      controller.abort();
      if (!mounted.current || request.current !== controller) return;
      requestTimeout.current = null;
      setTokenWallet(null); setTokenLoading(false);
      setTokenError('La consulta de Tokens tardó demasiado. Inténtalo nuevamente.');
    }, 10000);
    try {
      const result = await loadWalletTokens(controller.signal);
      if (mounted.current && request.current === controller && !controller.signal.aborted) { setTokenWallet(result); setTokenError(''); }
    } catch (error) {
      if (mounted.current && request.current === controller && !controller.signal.aborted) {
        setTokenWallet(null);
        setTokenError(error instanceof Error ? error.message : 'No se pudo consultar tu saldo de Tokens.');
      }
    } finally {
      if (request.current === controller) {
        if (requestTimeout.current) clearTimeout(requestTimeout.current);
        requestTimeout.current = null;
        if (mounted.current && !controller.signal.aborted) setTokenLoading(false);
      }
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void refreshTokens();
    return () => {
      mounted.current = false;
      request.current?.abort();
      if (requestTimeout.current) clearTimeout(requestTimeout.current);
    };
  }, [refreshTokens]);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (!active || closing.current) return;
      reduceMotion.current = reduced;
      Animated.timing(progress, { toValue: 1, duration: reduced ? 0 : 320, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { reduceMotion.current = value; });
    return () => { active = false; subscription.remove(); progress.stopAnimation(); };
  }, [progress]);
  const close = useCallback(() => {
    if (closing.current || busyRef.current || subscriptionBusyRef.current) return;
    Keyboard.dismiss(); closing.current = true; setIsClosing(true);
    Animated.timing(progress, { toValue: 0, duration: reduceMotion.current ? 0 : 220, easing: Easing.in(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start(({ finished }) => {
      if (!mounted.current) return;
      if (finished && !busyRef.current && !subscriptionBusyRef.current) onClose();
      else { closing.current = false; setIsClosing(false); progress.setValue(1); }
    });
  }, [onClose, progress]);
  const back = useCallback(() => {
    if (closing.current || busyRef.current || subscriptionBusyRef.current || page === 'packages') return;
    Keyboard.dismiss();
    if (page === 'overview') close();
    else if (page === 'recharge' && rechargeStep === 'review') { setRechargeStep('amount'); setMessage(''); setFailed(false); }
    else { setPage('overview'); if (page === 'recharge') { setMessage(''); setFailed(false); } }
  }, [close, page, rechargeStep]);
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { if (page === 'packages') return false; back(); return true; });
    if (Platform.OS !== 'web') return () => listener.remove();
    const escape = (event: KeyboardEvent) => {
      // Subscription panels own their nested back and confirmation flows.
      if (event.key === 'Escape' && page !== 'subscription' && page !== 'packages') { event.preventDefault(); event.stopImmediatePropagation(); back(); }
    };
    window.addEventListener('keydown', escape, true);
    return () => { listener.remove(); window.removeEventListener('keydown', escape, true); };
  }, [back, page]);

  const continueRecharge = () => {
    if (closing.current || busyRef.current || subscriptionBusyRef.current || rechargeStep !== 'amount') return;
    Keyboard.dismiss();
    const draft = amount.trim();
    const value = Number(draft.replace(',', '.'));
    let invalid = '';
    if (!/^\d+(?:[.,]\d+)?$/.test(draft)) invalid = 'Escribe el monto en pesos, sin símbolos.';
    else if (!Number.isFinite(value) || value < 10 || value > 100000) invalid = 'Ingresa un importe entre $10 y $100,000.';
    else if (/[.,]\d{3,}$/.test(draft)) invalid = 'Usa como máximo dos decimales.';
    if (invalid) { setFailed(true); setMessage(invalid); return; }
    setMessage(''); setFailed(false);
    setRechargeReview({ amount: Math.round(value * 100) / 100, balance: wallet.balance });
    setRechargeStep('review');
  };
  const recharge = async () => {
    if (closing.current || busyRef.current || subscriptionBusyRef.current || rechargeStep !== 'review' || !rechargeReview || Date.now() - lastRechargeAt.current < 450) return;
    busyRef.current = true; setBusy(true); setMessage(''); setFailed(false);
    Keyboard.dismiss();
    try {
      await rechargeWallet(rechargeReview.amount);
      lastRechargeAt.current = Date.now();
      if (mounted.current) { setAmount('200'); setRechargeStep('success'); }
    } catch (error) {
      if (mounted.current) { setFailed(true); setMessage(error instanceof Error ? error.message : 'No se pudo guardar la recarga local.'); }
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const openPage = (next: Page) => {
    if (closing.current || busyRef.current || subscriptionBusyRef.current) return;
    Keyboard.dismiss();
    if (next === 'recharge') { setMessage(''); setFailed(false); setRechargeStep('amount'); setRechargeReview(null); }
    if (next === 'recharge' || next === 'apple-pay-test' || next === 'packages') setRechargeHeight(overviewHeight.current || maxSheetHeight);
    setPage(next);
  };
  const openSubscription = () => openPage('subscription');
  const controlsDisabled = busy || subscriptionBusy || isClosing;
  const tokenStatus = tokenLoading ? 'Consultando…' : tokenError ? 'Sin conectar' : tokenWallet ? String(tokenWallet.balance) + (tokenWallet.balance === 1 ? ' Token' : ' Tokens') : 'Sin conectar';
  const title = page === 'recharge' ? 'Recargar saldo' : page === 'movements' ? 'Movimientos' : page === 'tokens' ? 'Tokens' : page === 'subscription' ? 'Klini IA' : page === 'packages' ? 'Paquetes' : page === 'apple-pay-test' ? 'Apple Pay · pruebas' : 'Billetera';
  const messageView = !!message && <Text testID="wallet-message" accessibilityLiveRegion="polite" accessibilityRole={failed ? 'alert' : undefined} style={[s.message, failed && s.error]}>{message}</Text>;
  const retry = <Pressable testID="wallet-tokens-retry" accessibilityRole="button" accessibilityLabel="Reintentar consulta de Tokens" disabled={tokenLoading || controlsDisabled} accessibilityState={{ disabled: tokenLoading || controlsDisabled }} onPress={() => { if (closing.current || busyRef.current || subscriptionBusyRef.current) return; setTokenLoading(true); setTokenError(''); void refreshTokens(); }} style={s.textButton}><Text style={s.link}>Reintentar</Text></Pressable>;

  return <View style={s.root}>
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress, backgroundColor: 'rgba(8,36,65,.30)' }]} />
    <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Cerrar billetera" onPress={close} testID="wallet-backdrop" disabled={controlsDisabled} />
    <KeyboardAvoidingView pointerEvents="box-none" style={s.position} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Animated.View testID="wallet-sheet" pointerEvents={isClosing ? 'none' : 'auto'} accessibilityViewIsModal onLayout={event => { if (page === 'overview' && event.nativeEvent.layout.height > 0) overviewHeight.current = event.nativeEvent.layout.height; }} style={[s.sheet, { maxHeight: maxSheetHeight, height: page === 'packages' ? Math.min(rechargeHeight || maxSheetHeight, maxSheetHeight) : page === 'recharge' || page === 'apple-pay-test' ? Math.min(rechargeHeight, maxSheetHeight) : undefined, paddingBottom: Math.max(insets.bottom, 12), transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }] }]}>
        <View style={s.handle} />
        {page !== 'packages' && <View style={s.header}>
          {page !== 'overview' && <Pressable testID={page === 'subscription' ? 'wallet-ai-back' : 'wallet-backsubpages'} accessibilityRole="button" accessibilityLabel={page === 'recharge' && rechargeStep === 'review' ? 'Editar monto' : 'Volver a mi billetera'} accessibilityState={{ disabled: controlsDisabled }} disabled={controlsDisabled} onPress={back} style={s.back}><Icon name="back" size={22} /></Pressable>}
          <Text accessibilityRole="header" style={s.title}>{title}</Text>
          <Pressable testID="wallet-close" accessibilityRole="button" accessibilityLabel="Cerrar billetera" accessibilityState={{ disabled: controlsDisabled }} disabled={controlsDisabled} onPress={close} style={s.close}><Icon name="close" size={22} /></Pressable>
        </View>}
        {page === 'packages' ? <SubscriptionPackagesPanel key={state.profile.id} onBack={leaveSubscription} onClose={close} onBusyChange={onSubscriptionBusy} onManageAi={openSubscription} demoUpgradeEnabled /> : page === 'subscription' ? <AiSubscriptionPanel key={state.profile.id} onBack={leaveSubscription} onClose={close} onBusyChange={onSubscriptionBusy} /> : page === 'apple-pay-test' ? <WalletApplePayTestPanel onBusyChange={onSubscriptionBusy} onBrowsePackages={() => openPage('packages')} /> : page === 'recharge' ? <WalletRechargePanel step={rechargeStep} amount={amount} method={paymentMethod} reviewedAmount={rechargeReview?.amount ?? 0} balance={rechargeStep === 'review' && rechargeReview ? rechargeReview.balance : wallet.balance} disabled={controlsDisabled} busy={busy} error={failed ? message : storageError || undefined} onAmountChange={value => { if (closing.current || busyRef.current) return; setAmount(value); setMessage(''); setFailed(false); }} onMethodChange={method => { if (!closing.current && !busyRef.current && rechargeStep === 'amount') setPaymentMethod(method); }} onContinue={continueRecharge} onConfirm={() => void recharge()} onReturn={back} /> : <ScrollView key={page} style={s.scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
          {page === 'overview' && <>
            <View style={s.balanceSection}>
              <Text style={s.caption}>Saldo disponible</Text>
              <View style={s.balanceRow}><Text testID="wallet-balance" style={s.balance}>{money(wallet.balance)}</Text><Text style={s.currencyLabel}>MXN</Text></View>
              <Pressable testID="wallet-recharge-open" accessibilityRole="button" disabled={controlsDisabled} accessibilityState={{ disabled: controlsDisabled }} onPress={() => openPage('recharge')} style={({ pressed }) => [s.rechargeOpen, pressed && s.dim]}><Icon name="plus" color={colors.tealDark} size={18} /><Text style={s.rechargeOpenText}>Recargar</Text></Pressable>
            </View>
            {messageView}
            <View style={s.section}><WalletSubscriptionDisplay onManage={() => openPage('packages')} onBrowsePackages={() => openPage('packages')} disabled={controlsDisabled} /></View>
            <View style={[s.section, s.tokensRow]}>
              <Pressable testID="wallet-tokens-open" accessibilityRole="button" accessibilityLabel="Ver Tokens de tu cuenta" disabled={controlsDisabled} accessibilityState={{ disabled: controlsDisabled }} onPress={() => openPage('tokens')} style={s.tokensMain}><View style={s.tokenIcon}><Icon name="wallet" color={colors.tealDark} size={21} /></View><View style={s.flex}><Text style={s.rowTitle}>Tokens</Text><Text testID="wallet-tokens-status" accessibilityLiveRegion="polite" style={s.caption}>{tokenStatus}</Text></View></Pressable>
              {tokenError ? retry : <Pressable accessibilityRole="button" accessibilityLabel="Ver movimientos de Tokens" disabled={controlsDisabled} accessibilityState={{ disabled: controlsDisabled }} onPress={() => openPage('tokens')} style={s.textButton}><Icon name="chevronRight" size={17} color="#8BA0B1" /></Pressable>}
            </View>
            <View style={s.section}>
              <View style={s.sectionHeader}><Text style={s.sectionTitle}>Movimientos</Text><Pressable testID="wallet-movements-open" accessibilityRole="button" disabled={controlsDisabled} accessibilityState={{ disabled: controlsDisabled }} onPress={() => openPage('movements')} style={s.textButton}><Text style={s.link}>Ver todos</Text></Pressable></View>
              {wallet.movements.length ? wallet.movements.slice(0, 2).map(item => <Movement key={item.id} item={item} />) : <Text style={s.empty}>Aún no tienes movimientos.</Text>}
            </View>
            <Pressable testID="wallet-apple-pay-test-open" accessibilityRole="button" disabled={controlsDisabled} accessibilityState={{ disabled: controlsDisabled }} onPress={() => openPage('apple-pay-test')} style={s.testEntry}><Text style={s.link}>Probar Apple Pay con Stripe</Text></Pressable>
          </>}
          {page === 'movements' && <>
            {!wallet.movements.length && <Text style={s.empty}>Aún no tienes movimientos. Tu primera recarga aparecerá aquí.</Text>}
            {wallet.movements.map(item => <Movement key={item.id} item={item} />)}
            <View style={s.summary}>{[['Total recargas', money(totals.credits)], ['Total consumos', money(totals.debits)], ['Movimientos', String(totals.count)]].map(([label, value]) => <View key={label} style={s.summaryRow}><Text style={s.caption}>{label}</Text><Text style={s.rowTitle}>{value}</Text></View>)}</View>
          </>}
          {page === 'tokens' && <>
            <View style={s.tokenSummary}><Text testID="wallet-tokens-detail-status" style={s.formHeading}>{tokenStatus}</Text>{tokenError ? <><Text style={s.caption}>{tokenError}</Text>{retry}</> : <Text style={s.caption}>Tokens de tu cuenta conectada.</Text>}</View>
            {tokenWallet?.movements.map((entry, index) => <View key={String(entry.id) + '-' + index} style={s.movement}><View style={s.flex}><Text style={s.movementName}>{entry.concept}</Text><Text style={s.caption}>{new Date(/Z$|[+-]\d\d:\d\d$/.test(entry.created_at) ? entry.created_at : entry.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' })}</Text></View><Text style={s.movementAmount}>{entry.amount >= 0 ? '+' : '−'}{Math.abs(entry.amount)} {Math.abs(entry.amount) === 1 ? 'Token' : 'Tokens'}</Text></View>)}
            {!tokenLoading && !tokenError && !tokenWallet?.movements.length && <Text style={s.empty}>Aún no hay movimientos de Tokens.</Text>}
          </>}
          <Text style={s.demo}>Demostración · sin cargos reales</Text>
        </ScrollView>}
      </Animated.View>
    </KeyboardAvoidingView>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1 }, position: { flex: 1, justifyContent: 'flex-end' },
  sheet: { width: '100%', maxWidth: 560, alignSelf: 'center', backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', flexShrink: 1 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#B5C1CD', alignSelf: 'center', marginTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, paddingTop: 6, paddingBottom: 10 },
  title: { flex: 1, color: colors.navy, fontSize: 19, lineHeight: 27, fontWeight: '600' },
  back: { width: 28, minHeight: 44, justifyContent: 'center' },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F4F7', alignItems: 'center', justifyContent: 'center' },
  scroll: { flexShrink: 1, minHeight: 0 }, content: { paddingHorizontal: 24, paddingBottom: 12 }, flex: { flex: 1, minWidth: 0 },
  balanceSection: { alignItems: 'center', paddingTop: 8, paddingBottom: 16, gap: 3 },
  balanceRow: { alignItems: 'center', justifyContent: 'center', gap: 0, marginTop: 2 },
  balance: { color: colors.navy, fontSize: 40, lineHeight: 50, letterSpacing: -1.2, fontWeight: '600' }, currencyLabel: { color: '#8295A6', fontSize: 11, lineHeight: 16 },
  rechargeOpen: { minHeight: 40, paddingVertical: 9, paddingHorizontal: 17, borderRadius: 20, backgroundColor: '#EAF7F5', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 },
  rechargeOpenText: { color: colors.tealDark, fontSize: 12, lineHeight: 18, fontWeight: '500' },
  section: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E9EE', paddingVertical: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: -7 }, sectionTitle: { color: colors.navy, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  tokensRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }, tokensMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  tokenIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F7F7' }, rowTitle: { color: colors.navy, fontSize: 13, lineHeight: 20, fontWeight: '500' },
  caption: { color: '#8295A6', fontSize: 11, lineHeight: 18 }, textButton: { minHeight: 44, minWidth: 30, justifyContent: 'center', alignItems: 'center' }, link: { color: colors.tealDark, fontSize: 11, lineHeight: 18, fontWeight: '500' },
  movement: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E6EDF1' }, movementName: { color: colors.navy, fontSize: 12, lineHeight: 19, fontWeight: '500' },
  movementIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F0F7F7', alignItems: 'center', justifyContent: 'center' },
  movementAmount: { color: colors.tealDark, fontSize: 12, lineHeight: 19, maxWidth: '45%', fontWeight: '500' }, debit: { color: colors.navy }, empty: { color: '#8295A6', fontSize: 12, lineHeight: 20, paddingVertical: 12 },
  formHeading: { color: colors.navy, fontSize: 19, lineHeight: 27, fontWeight: '600' },
  message: { color: colors.tealDark, fontSize: 12, lineHeight: 19, paddingVertical: 4 }, error: { color: colors.danger, fontSize: 12, lineHeight: 19 },
  summary: { borderRadius: 14, backgroundColor: '#F7F9FA', padding: 14, gap: 10, marginTop: 20 }, summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, tokenSummary: { paddingTop: 15, paddingBottom: 15, gap: 8 },
  testEntry: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  demo: { color: '#9AA9B6', fontSize: 10, lineHeight: 17, textAlign: 'center', marginTop: 12, marginBottom: 3 }, dim: { opacity: .5 },
});
