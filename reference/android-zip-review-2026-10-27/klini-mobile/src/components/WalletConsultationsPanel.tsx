import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AccountConsultation, AccountConsultationPayment, AccountConsultationQuote, AccountWallet } from '../domain/accountWallet';
import { newWalletRequestId } from '../domain/accountWallet';
import { money } from '../domain/wallet';
import { AccountWalletError, type AccountWalletClient } from '../services/accountWallet';
import { useWalletAccountSession } from '../state/walletAccountSession';
import { colors, Icon } from './ui';

const pesos = (cents: number) => money(cents / 100);
const when = (date: string) => new Date(date).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Server appointments and confirmed ledger only. Never consumes a local/demo appointment. */
export default function WalletConsultationsPanel({ client, token, wallet, onWalletChange, onBusyChange, onUnauthorized }: {
  client: AccountWalletClient;
  token: string;
  wallet: AccountWallet;
  onWalletChange: (wallet: AccountWallet) => void;
  onBusyChange: (busy: boolean) => void;
  onUnauthorized: () => void;
}) {
  const { consultationAttempt, rememberConsultationAttempt } = useWalletAccountSession();
  const [appointments, setAppointments] = useState<AccountConsultation[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [selection, setSelection] = useState<{ appointment: AccountConsultation; quote: AccountConsultationQuote } | null>(() => consultationAttempt ? { appointment: consultationAttempt.appointment, quote: consultationAttempt.quote } : null);
  const [payment, setPayment] = useState<AccountConsultationPayment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(!!consultationAttempt);
  const [clock, setClock] = useState(Date.now);
  const alive = useRef(true);
  const busyRef = useRef(false);
  const attempt = useRef<{ quoteId: string; requestId: string } | null>(consultationAttempt ? { quoteId: consultationAttempt.quote.id, requestId: consultationAttempt.requestId } : null);
  const loadVersion = useRef(0);
  const busyCallback = useRef(onBusyChange);
  const unauthorizedCallback = useRef(onUnauthorized);
  useEffect(() => { busyCallback.current = onBusyChange; }, [onBusyChange]);
  useEffect(() => { unauthorizedCallback.current = onUnauthorized; }, [onUnauthorized]);
  const report = useCallback((failure: unknown) => {
    if (!alive.current) return;
    if (failure instanceof AccountWalletError && failure.status === 401) { unauthorizedCallback.current(); return; }
    setError(failure instanceof Error ? failure.message : 'No se pudo confirmar el pago.');
  }, []);
  const load = useCallback(async (signal?: AbortSignal) => {
    const version = ++loadVersion.current;
    const value = await client.consultations(token, signal);
    if (alive.current && !signal?.aborted && version === loadVersion.current) { setAppointments(value.appointments); setHasMore(value.hasMore); }
    return value;
  }, [client, token]);
  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    const pending = load(controller.signal), version = loadVersion.current;
    void pending.catch(failure => { if (!controller.signal.aborted && version === loadVersion.current) report(failure); });
    return () => { alive.current = false; controller.abort(); busyCallback.current(false); };
  }, [load, report]);
  useEffect(() => {
    if (!selection || payment) return;
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [selection, payment]);
  const expired = !!selection && Date.parse(selection.quote.expiresAt) <= clock;
  async function run(action: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); busyCallback.current(true); setError('');
    try { await action(); }
    catch (failure) { report(failure); }
    finally { busyRef.current = false; if (alive.current) { setBusy(false); busyCallback.current(false); } }
  }
  async function review(appointment: AccountConsultation) {
    const quote = await client.quoteConsultation(token, appointment.id);
    if (!alive.current) return;
    if (quote.status !== 'valid') {
      const [latest, balance] = await Promise.all([load(), client.wallet(token)]);
      if (!alive.current) return;
      onWalletChange(balance);
      const current = latest.appointments.find(item => item.id === appointment.id);
      if (current?.payment && current.quote) { setSelection({ appointment: current, quote: current.quote }); setPayment(current.payment); return; }
      throw new AccountWalletError('consultation_changed', 'La consulta cambió. Actualiza tus consultas antes de continuar.');
    }
    setSelection({ appointment, quote }); setPayment(null); setUncertain(false); attempt.current = null; rememberConsultationAttempt(token, null);
  }
  async function pay() {
    if (!selection || (!attempt.current && (wallet.blocked || !wallet.servicePaymentsEnabled))) return;
    const draft = attempt.current ?? { quoteId: selection.quote.id, requestId: newWalletRequestId() };
    if (draft.quoteId !== selection.quote.id) throw new AccountWalletError('consultation_changed', 'Revisa la consulta antes de continuar.');
    attempt.current = draft; setUncertain(true);
    rememberConsultationAttempt(token, { appointment: selection.appointment, quote: selection.quote, requestId: draft.requestId });
    try {
      const value = await client.payConsultation(token, selection.quote, draft.requestId);
      if (alive.current) { onWalletChange(value.wallet); setPayment(value.payment); setUncertain(false); attempt.current = null; rememberConsultationAttempt(token, null); }
    } catch (failure) {
      // A conflict may mean another device already paid. SQL is the source of truth.
      if (failure instanceof AccountWalletError && failure.status === 409) {
        const [latest, balance] = await Promise.all([load(), client.wallet(token)]);
        if (!alive.current) return;
        onWalletChange(balance);
        const current = latest.appointments.find(item => item.id === selection.appointment.id);
        if (current?.payment && current.quote) { setSelection({ appointment: current, quote: current.quote }); setPayment(current.payment); setUncertain(false); attempt.current = null; rememberConsultationAttempt(token, null); return; }
        setUncertain(false); attempt.current = null; rememberConsultationAttempt(token, null); setSelection(null);
      }
      throw failure;
    }
  }
  function showList() { if (busyRef.current || uncertain) return; setSelection(null); setPayment(null); setError(''); attempt.current = null; rememberConsultationAttempt(token, null); void run(async () => { await load(); }); }
  const insufficient = !!selection && wallet.availableBalanceCents < selection.quote.amountCents;
  return <View testID="wallet-consultations" style={s.panel}>
    {!wallet.servicePaymentsEnabled && <Text style={s.body}>Los pagos de consultas todavía no están disponibles.</Text>}
    {wallet.blocked && <Text accessibilityRole="alert" style={s.error}>Tu billetera está en revisión. Contacta al equipo de Klini.</Text>}
    {selection ? <View style={s.details}>
      {payment ? <>
        <View style={s.mark}><Icon name={payment.status === 'paid' ? 'check' : 'back'} color={colors.tealDark} size={27} /></View>
        <Text testID="wallet-consultation-status" accessibilityRole="header" style={s.heading}>{payment.status === 'paid' ? 'Consulta pagada' : 'Pago devuelto'}</Text>
        <Text style={s.amount}>{pesos(payment.amountCents)}</Text>
        <Text style={s.body}>{selection.appointment.doctor.name}</Text>
        <Text style={s.body}>{payment.status === 'paid' ? 'El pago quedó registrado en tu cita.' : 'La devolución quedó registrada en tu billetera.'}</Text>
        <PickerAction title="Ver mis consultas" disabled={busy} onPress={showList} />
      </> : <>
        <Text accessibilityRole="header" style={s.heading}>Tu consulta presencial</Text>
        <Text style={s.doctor}>{selection.appointment.doctor.name}</Text>
        <Text style={s.body}>{when(selection.appointment.startsAt)}</Text>
        <Text testID="wallet-consultation-price" style={s.amount}>{pesos(selection.quote.amountCents)}</Text>
        <Text style={s.body}>Tarifa del médico · MXN</Text>
        <Text style={s.body}>Saldo disponible: {pesos(wallet.availableBalanceCents)}</Text>
        {uncertain ? <Text accessibilityLiveRegion="polite" style={s.body}>Estamos verificando el pago. Continúa con la misma solicitud.</Text> : expired ? <Text style={s.body}>El importe venció. Actualiza antes de pagar.</Text> : <Text style={s.caption}>Importe válido hasta {new Date(selection.quote.expiresAt).toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit' })}.</Text>}
        {insufficient && !uncertain && <Text style={s.body}>Necesitas recargar saldo para pagar esta consulta.</Text>}
        {expired && !uncertain ? <PickerAction title="Actualizar importe" disabled={busy || !wallet.servicePaymentsEnabled || wallet.blocked} onPress={() => void run(() => review(selection.appointment))} /> : <PickerAction testID="wallet-consultation-pay" title={busy ? 'Verificando…' : uncertain ? 'Verificar pago' : `Pagar ${pesos(selection.quote.amountCents)} con saldo`} disabled={busy || (!uncertain && (!wallet.servicePaymentsEnabled || wallet.blocked || expired || insufficient))} onPress={() => void run(pay)} />}
        {!uncertain && <PickerAction title="Volver a mis consultas" secondary disabled={busy} onPress={showList} />}
      </>}
    </View> : <>
      <Text style={s.body}>Paga con tu saldo las citas presenciales confirmadas.</Text>
      {appointments === null ? !error && <ActivityIndicator color={colors.tealDark} /> : appointments.length === 0 ? <Text style={s.body}>No tienes consultas disponibles para pagar.</Text> : appointments.map(appointment => <View key={appointment.id} testID={`wallet-consultation-${appointment.id}`} style={s.consultation}>
        <Text style={s.doctor}>{appointment.doctor.name}</Text>
        <Text style={s.body}>{when(appointment.startsAt)}</Text>
        {appointment.payment ? <Text style={s.paid}>{appointment.payment.status === 'paid' ? 'Pagada' : 'Pago devuelto'}</Text> : appointment.tariff ? <><Text style={s.price}>{pesos(appointment.tariff.amountCents)} MXN</Text><PickerAction testID={`wallet-consultation-review-${appointment.id}`} title="Revisar pago" disabled={busy || !wallet.servicePaymentsEnabled || wallet.blocked} onPress={() => void run(() => review(appointment))} /></> : <Text style={s.caption}>El médico aún no publica su tarifa.</Text>}
      </View>)}
      {hasMore && <Text style={s.caption}>Se muestran las próximas consultas disponibles.</Text>}
      <PickerAction testID="wallet-consultations-refresh" title="Actualizar consultas" secondary disabled={busy} onPress={() => void run(async () => { await load(); })} />
    </>}
    {!!error && <Text testID="wallet-consultation-error" accessibilityRole="alert" style={s.error}>{error}</Text>}
  </View>;
}

function PickerAction({ title, onPress, disabled, secondary = false, testID }: { title: string; onPress: () => void; disabled: boolean; secondary?: boolean; testID?: string }) {
  return <Pressable testID={testID} accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[s.action, secondary && s.secondary, disabled && s.dim]}><Text style={[s.actionText, secondary && s.secondaryText]}>{title}</Text></Pressable>;
}
const s = StyleSheet.create({
  panel: { gap: 16, paddingTop: 8, paddingBottom: 12 }, details: { gap: 14 }, heading: { fontSize: 21, lineHeight: 29, fontWeight: '600', color: colors.navy }, body: { color: colors.muted, fontSize: 13, lineHeight: 21 }, caption: { color: colors.muted, fontSize: 11, lineHeight: 18 }, doctor: { color: colors.navy, fontWeight: '600', fontSize: 15, lineHeight: 23 }, amount: { color: colors.navy, fontSize: 38, lineHeight: 50, fontWeight: '600' }, price: { color: colors.tealDark, fontSize: 17, fontWeight: '600', lineHeight: 26 }, consultation: { gap: 7, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line }, paid: { color: colors.tealDark, fontSize: 13, lineHeight: 21 }, action: { minHeight: 48, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 12, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' }, actionText: { color: 'white', fontSize: 14, lineHeight: 21, fontWeight: '600' }, secondary: { backgroundColor: '#F0F6F7' }, secondaryText: { color: colors.navy }, dim: { opacity: .45 }, mark: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#EAF7F5', justifyContent: 'center', alignItems: 'center' }, error: { color: colors.danger, fontSize: 12, lineHeight: 20 },
});
