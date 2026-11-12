import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { createId } from '../domain/reducer';
import { money } from '../domain/wallet';
import type { CreatedTestRecharge, TestRechargeStatus, TestWalletSnapshot } from '../domain/walletPayments';
import { getPaymentTestApiUrl } from '../services/paymentsConfig';
import { createPaymentTestClient, parsePaymentTestAmount, type PaymentTestClient } from '../services/walletPayments';
import { ApplePayTestButton, useApplePayTest } from './StripeTestProvider';
import { colors, Icon } from './ui';

type Props = { onBusyChange?: (busy: boolean) => void; onBrowsePackages: () => void };
type Order = { id: string | null; amountCents: number; key: string; status: TestRechargeStatus; clientSecret: string | null };
type Step = 'amount' | 'review' | 'success';

const canConfirm = (status: TestRechargeStatus) => ['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(status);
const waiting = (status: TestRechargeStatus) => status === 'processing' || status === 'requires_capture';
const statusLabel = (status: TestRechargeStatus) => status === 'creating' ? 'Por preparar' : waiting(status) ? 'En proceso' : status === 'succeeded' ? 'Confirmada' : status === 'canceled' ? 'Cancelada' : 'Por completar';

export default function WalletApplePayTestPanel({ onBusyChange, onBrowsePackages }: Props) {
  const applePay = useApplePayTest();
  const [serverUrl, setServerUrl] = useState(() => getPaymentTestApiUrl());
  const [token, setToken] = useState('');
  const [client, setClient] = useState<PaymentTestClient | null>(null);
  const [wallet, setWallet] = useState<TestWalletSnapshot | null>(null);
  const [amount, setAmount] = useState('200');
  const [step, setStep] = useState<Step>('amount');
  const [order, setOrder] = useState<Order | null>(null);
  const orderRef = useRef<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const mounted = useRef(true);
  const request = useRef<AbortController | null>(null);
  const busyCallback = useRef(onBusyChange);
  useEffect(() => { busyCallback.current = onBusyChange; }, [onBusyChange]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current?.abort();
      busyRef.current = false;
      busyCallback.current?.(false);
    };
  }, []);

  const rememberOrder = useCallback((value: Order | null) => {
    orderRef.current = value;
    if (mounted.current) setOrder(value);
  }, []);

  const run = useCallback(async (action: (signal: AbortSignal) => Promise<void>, failure: string) => {
    if (!mounted.current || busyRef.current) return;
    busyRef.current = true;
    busyCallback.current?.(true);
    setBusy(true); setError(''); setNotice('');
    const controller = new AbortController();
    request.current = controller;
    try { await action(controller.signal); }
    catch {
      if (mounted.current && !controller.signal.aborted) setError(failure);
    } finally {
      if (request.current === controller) request.current = null;
      busyRef.current = false;
      busyCallback.current?.(false);
      if (mounted.current) setBusy(false);
    }
  }, []);

  const connect = useCallback(() => {
    if (busyRef.current) return;
    Keyboard.dismiss();
    void run(async signal => {
      const connected = createPaymentTestClient({ baseUrl: serverUrl, accessToken: token });
      const snapshot = await connected.getWallet(signal);
      if (!mounted.current || signal.aborted) return;
      setClient(connected); setWallet(snapshot); setToken('');
      setNotice('Conectado a tu cuenta de pruebas.');
    }, 'No se pudo conectar. Revisa la dirección y el token del servidor de pruebas.');
  }, [run, serverUrl, token]);

  const reconcile = useCallback(async (current: Order, signal: AbortSignal): Promise<TestRechargeStatus> => {
    if (!client || !current.id) throw new Error('La recarga de prueba aún no tiene un identificador.');
    const result = await client.getRecharge(current.id, current.amountCents, signal);
    if (!mounted.current || signal.aborted) return result.status;
    const updated = { ...current, status: result.status, clientSecret: canConfirm(result.status) ? current.clientSecret : null };
    rememberOrder(updated);
    if (result.status === 'succeeded') {
      if (!result.wallet) throw new Error('Falta la confirmación del saldo de prueba.');
      setWallet(result.wallet); setStep('success'); setError(''); setNotice('El servidor confirmó tu recarga de prueba.');
    } else if (result.status === 'canceled') {
      setWallet(previous => previous ? { ...previous, pendingRecharges: previous.pendingRecharges.filter(pending => pending.id !== current.id) } : previous);
      setNotice('Esta recarga fue cancelada. Puedes iniciar otra prueba.');
    } else {
      setNotice(waiting(result.status) ? 'Tu recarga sigue en proceso. Consulta su estado antes de iniciar otra.' : 'Esta recarga está pendiente. Puedes completarla con Apple Pay.');
    }
    return result.status;
  }, [client, rememberOrder]);

  const prepare = useCallback(async (current: Order, signal: AbortSignal) => {
    if (!client) return;
    // Retrying an uncertain POST always reuses this exact key and amount.
    const created: CreatedTestRecharge = await client.createRecharge(current.amountCents, current.key, signal);
    if (!mounted.current || signal.aborted) return;
    const updated = { ...current, id: created.id, status: created.status, clientSecret: created.clientSecret };
    rememberOrder(updated);
    if (created.status === 'succeeded' || created.status === 'canceled') await reconcile(updated, signal);
    else if (waiting(created.status)) setNotice('Tu recarga sigue en proceso. Consulta su estado antes de iniciar otra.');
    else if (!created.clientSecret) setNotice('La preparación sigue pendiente. Reintenta esta misma recarga.');
  }, [client, reconcile, rememberOrder]);

  const continueRecharge = useCallback(() => {
    if (!client || busyRef.current || orderRef.current || !applePay.supported) return;
    let cents: number;
    try { cents = parsePaymentTestAmount(amount); }
    catch { setError('Escribe un monto de $10 a $100,000 MXN, con hasta dos decimales.'); return; }
    Keyboard.dismiss();
    const current: Order = { id: null, amountCents: cents, key: createId('recharge'), status: 'creating', clientSecret: null };
    rememberOrder(current); setStep('review');
    void run(signal => prepare(current, signal), 'No se pudo preparar la recarga. Reintenta esta misma operación para consultar o recuperar su estado.');
  }, [amount, applePay.supported, client, prepare, rememberOrder, run]);

  const retryPreparation = useCallback(() => {
    const current = orderRef.current;
    if (!current || !client || busyRef.current || waiting(current.status) || current.status === 'succeeded' || current.status === 'canceled') return;
    void run(signal => prepare(current, signal), 'No se pudo preparar la recarga. Reintenta esta misma operación; no se ha iniciado una recarga distinta.');
  }, [client, prepare, run]);

  const refresh = useCallback(() => {
    const current = orderRef.current;
    if (!current || !current.id || busyRef.current) return;
    void run(async signal => { await reconcile(current, signal); }, 'No se pudo verificar el pago. Conserva esta recarga y consulta su estado nuevamente.');
  }, [reconcile, run]);

  const pay = useCallback(() => {
    const current = orderRef.current;
    if (!current || !current.id || !current.clientSecret || !canConfirm(current.status) || !applePay.supported || busyRef.current) return;
    void run(async signal => {
      let canceled = false;
      let failed = false;
      try {
        const result = await applePay.confirm(current.clientSecret!, current.amountCents);
        canceled = result.status === 'canceled';
      } catch { failed = true; }
      // Cancellation/errors can race a completed payment: always ask the server.
      const status = await reconcile(current, signal);
      if (!mounted.current || signal.aborted || status === 'succeeded') return;
      if (canceled && status !== 'canceled') setNotice('Cerraste Apple Pay. Consulta el estado de esta recarga antes de repetir la prueba.');
      if (failed) setError('Apple Pay no confirmó la prueba. Consulta el estado de esta recarga antes de reintentar.');
    }, 'No se pudo verificar el resultado. No inicies otra recarga; consulta el estado de esta operación.');
  }, [applePay, reconcile, run]);

  const resume = useCallback((pending: TestWalletSnapshot['pendingRecharges'][number]) => {
    if (busyRef.current || orderRef.current) return;
    rememberOrder({ id: pending.id, amountCents: pending.amountCents, key: pending.idempotencyKey, status: pending.status, clientSecret: null });
    setAmount((pending.amountCents / 100).toFixed(2)); setStep('review'); setError(''); setNotice('Retoma esta misma recarga para evitar duplicados.');
  }, [rememberOrder]);

  const startAnother = useCallback(() => {
    const current = orderRef.current;
    if (busyRef.current || !current || (current.status !== 'succeeded' && current.status !== 'canceled')) return;
    rememberOrder(null); setStep('amount'); setError(''); setNotice('');
  }, [rememberOrder]);

  const disconnect = useCallback(() => {
    if (busyRef.current) return;
    request.current?.abort(); request.current = null;
    setClient(null); setWallet(null); setToken(''); rememberOrder(null); setStep('amount'); setError(''); setNotice('');
  }, [rememberOrder]);

  const availabilityMessage = applePay.availability === 'ready' ? 'Apple Pay listo para una prueba sin cargos reales.' : applePay.availability === 'loading' ? 'Preparando Apple Pay…' : applePay.availability === 'unconfigured' ? 'Falta configurar Stripe de prueba y Apple Pay en la compilación para iPhone.' : 'Apple Pay requiere un iPhone con una compilación compatible y Wallet configurado.';

  return <ScrollView testID="apple-pay-test-panel" style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <View style={s.testBadge}><Icon name="lock" size={14} color={colors.tealDark} /><Text style={s.testBadgeText}>Stripe TEST · sin cargos reales</Text></View>
    <Text style={s.note}>{availabilityMessage}</Text>
    {!client && <View style={s.section}>
      <Text style={s.title}>Conecta tu cuenta de pruebas</Text>
      <Text style={s.label}>Servidor de pruebas</Text>
      <TextInput testID="apple-pay-test-server" accessibilityLabel="Dirección del servidor de pruebas" value={serverUrl} onChangeText={setServerUrl} editable={!busy} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://…" style={s.input} />
      <Text style={s.label}>Token de acceso</Text>
      <TextInput testID="apple-pay-test-token" accessibilityLabel="Token de acceso al servidor de pruebas" value={token} onChangeText={setToken} editable={!busy} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="off" textContentType="none" placeholder="Token de desarrollo" style={s.input} />
      <Text style={s.hint}>El token se usa solo durante esta sesión.</Text>
      <Action id="apple-pay-test-connect" title={busy ? 'Conectando…' : 'Conectar'} disabled={busy || !serverUrl.trim() || !token.trim()} onPress={connect} />
    </View>}

    {!!client && !!wallet && <>
      <View style={s.balance}><Text style={s.note}>Saldo de prueba para consultas</Text><Text testID="apple-pay-test-balance" style={s.balanceAmount}>{money(wallet.balanceCents / 100)}</Text><Text style={s.hint}>MXN</Text></View>
      {step === 'amount' && <View style={s.section}>
        {wallet.pendingRecharges.length > 0 ? <>
          <Text style={s.title}>Recargas por completar</Text>
          <Text style={s.hint}>Retoma una recarga antes de iniciar otra.</Text>
          {wallet.pendingRecharges.map(pending => <Pressable key={pending.id} testID={`apple-pay-test-resume-${pending.id}`} accessibilityRole="button" accessibilityLabel={`Retomar recarga de ${money(pending.amountCents / 100)}`} disabled={busy} onPress={() => resume(pending)} style={s.pendingRow}><View style={s.grow}><Text style={s.rowTitle}>{money(pending.amountCents / 100)}</Text><Text style={s.hint}>{statusLabel(pending.status)}</Text></View><Icon name="chevron" size={18} color={colors.muted} /></Pressable>)}
        </> : <>
          <Text style={s.title}>¿Cuánto deseas recargar?</Text>
          <View style={s.presets}>{[100, 200, 500].map(value => <Pressable key={value} testID={`apple-pay-test-preset-${value}`} accessibilityRole="button" accessibilityLabel={`Recargar ${value} pesos de prueba`} accessibilityState={{ selected: amount === String(value), disabled: busy }} disabled={busy} onPress={() => setAmount(String(value))} style={[s.preset, amount === String(value) && s.presetSelected]}><Text style={s.rowTitle}>${value}</Text></Pressable>)}</View>
          <View style={s.amountRow}><Text style={s.currency}>$</Text><TextInput testID="apple-pay-test-amount" accessibilityLabel="Monto de la recarga de prueba" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" maxLength={10} editable={!busy} style={s.amountInput} /><Text style={s.hint}>MXN</Text></View>
          <Text style={s.hint}>De $10 a $100,000 MXN.</Text>
          <Action id="apple-pay-test-continue" title="Continuar" disabled={busy || !applePay.supported} onPress={continueRecharge} />
        </>}
      </View>}

      {step === 'review' && !!order && <View testID="apple-pay-test-review" style={s.section}>
        <Text style={s.title}>Tu recarga de prueba</Text><Text testID="apple-pay-test-review-amount" style={s.reviewAmount}>{money(order.amountCents / 100)} <Text style={s.hint}>MXN</Text></Text>
        <Text testID="apple-pay-test-status" style={s.hint}>{busy ? 'Consultando…' : statusLabel(order.status)}</Text>
        {!!order.clientSecret && canConfirm(order.status) && applePay.supported && <ApplePayTestButton disabled={busy} onPress={pay} />}
        {!order.clientSecret && !waiting(order.status) && order.status !== 'canceled' && order.status !== 'succeeded' && <Action id="apple-pay-test-prepare" title={busy ? 'Preparando…' : 'Preparar Apple Pay'} disabled={busy} onPress={retryPreparation} />}
        {!!order.id && order.status !== 'succeeded' && <Action id="apple-pay-test-reconcile" title={busy ? 'Consultando…' : 'Consultar estado'} secondary disabled={busy} onPress={refresh} />}
        {order.status === 'canceled' && <Action id="apple-pay-test-new" title="Nueva prueba" disabled={busy} onPress={startAnother} />}
      </View>}

      {step === 'success' && !!order && <View testID="apple-pay-test-success" style={s.receipt}>
        <View style={s.receiptIcon}><Icon name="check" size={28} color={colors.tealDark} /></View><Text style={s.title}>Prueba confirmada</Text><Text style={s.reviewAmount}>{money(order.amountCents / 100)}</Text><Text style={s.hint}>Sin cargos reales. Tu saldo de demostración permanece separado.</Text><Action id="apple-pay-test-new" title="Nueva prueba" disabled={busy} onPress={startAnother} />
      </View>}
    </>}

    {!!notice && <Text testID="apple-pay-test-notice" accessibilityLiveRegion="polite" style={s.note}>{notice}</Text>}
    {!!error && <Text testID="apple-pay-test-error" accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}
    <View style={s.packages}><Text style={s.hint}>Este saldo es para consultas. Los paquetes digitales se revisan por separado.</Text><Pressable testID="apple-pay-test-packages" accessibilityRole="button" disabled={busy} onPress={() => { if (!busyRef.current) onBrowsePackages(); }} style={s.textButton}><Text style={s.link}>Ver paquetes</Text><Icon name="chevron" size={15} color={colors.tealDark} /></Pressable></View>
    {!!client && <Pressable testID="apple-pay-test-disconnect" accessibilityRole="button" disabled={busy} onPress={disconnect} style={s.disconnect}><Text style={[s.link, busy && s.dim]}>Desconectar</Text></Pressable>}
  </ScrollView>;
}

function Action({ id, title, disabled, onPress, secondary = false }: { id: string; title: string; disabled: boolean; onPress: () => void; secondary?: boolean }) {
  return <Pressable testID={id} accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.action, secondary && s.secondary, (pressed || disabled) && s.dim]}><Text style={[s.actionText, secondary && s.secondaryText]}>{title}</Text></Pressable>;
}

const s = StyleSheet.create({
  scroll: { flex: 1, minHeight: 0 }, content: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 24, gap: 16 },
  testBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#ECF7F5' }, testBadgeText: { color: colors.tealDark, fontSize: 11, lineHeight: 17 },
  section: { gap: 12 }, title: { color: colors.navy, fontSize: 17, lineHeight: 24, fontWeight: '600' }, label: { color: colors.navy, fontSize: 12, lineHeight: 19 }, note: { color: colors.muted, fontSize: 12, lineHeight: 19 }, hint: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  input: { minHeight: 46, paddingVertical: 12, paddingHorizontal: 13, borderRadius: 12, borderWidth: 1, borderColor: colors.line, color: colors.navy, fontSize: 13 },
  balance: { alignItems: 'center', paddingVertical: 9, gap: 3 }, balanceAmount: { color: colors.navy, fontSize: 36, lineHeight: 47, fontWeight: '600' },
  presets: { flexDirection: 'row', gap: 8 }, preset: { flex: 1, minWidth: 0, minHeight: 44, borderWidth: 1, borderColor: colors.line, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, presetSelected: { backgroundColor: '#EDF8F7', borderColor: '#ACDCD7' },
  amountRow: { flexDirection: 'row', alignItems: 'center', minHeight: 58, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.line, borderRadius: 12, gap: 8 }, currency: { color: colors.muted, fontSize: 24 }, amountInput: { flex: 1, minWidth: 0, paddingVertical: 12, color: colors.navy, fontSize: 25 },
  action: { minHeight: 48, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy }, actionText: { color: '#FFF', fontSize: 14, lineHeight: 21, fontWeight: '600' }, secondary: { backgroundColor: '#F2F6F8' }, secondaryText: { color: colors.navy },
  pendingRow: { flexDirection: 'row', alignItems: 'center', minHeight: 64, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line, gap: 10 }, grow: { flex: 1, minWidth: 0 }, rowTitle: { color: colors.navy, fontSize: 14, lineHeight: 21 },
  reviewAmount: { color: colors.navy, fontSize: 30, lineHeight: 40, fontWeight: '600' }, receipt: { gap: 12, alignItems: 'center', paddingVertical: 12 }, receiptIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#ECF7F5', alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.danger, fontSize: 12, lineHeight: 19 }, packages: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line, paddingTop: 16, gap: 5 }, textButton: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 42 }, link: { color: colors.tealDark, fontSize: 12, lineHeight: 19 }, disconnect: { alignItems: 'center', minHeight: 42, justifyContent: 'center' }, dim: { opacity: .45 },
});
