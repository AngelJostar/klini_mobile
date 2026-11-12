import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, BackHandler, Easing, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, Icon } from '../components/ui';
import SubscriptionPackagesPanel from '../components/SubscriptionPackagesPanel';
import WalletConsultationsPanel from '../components/WalletConsultationsPanel';
import { newWalletRequestId, parseAccountRechargeAmount, type AccountRecharge, type AccountRechargeResult, type AccountWallet } from '../domain/accountWallet';
import { money } from '../domain/wallet';
import { AccountWalletError, createAccountWalletClient, getAccountWalletConnection, type AccountWalletClient, type AccountWalletConnection } from '../services/accountWallet';
import { useWalletNativePayments, WalletNativeApplePayButton } from '../services/walletNativePayments';
import { useWalletAccountSession } from '../state/walletAccountSession';

type Page = 'overview' | 'login' | 'recharge' | 'movements' | 'packages' | 'consultations';
const payable = (entry: AccountRecharge) => ['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(entry.status);
const statusName = (entry: AccountRecharge) => entry.status === 'succeeded' ? 'Recarga confirmada' : entry.status === 'canceled' ? 'Recarga cancelada' : payable(entry) ? 'Por completar' : 'Confirmando tu recarga';
const pesos = (cents: number) => money(cents / 100);

function Action({ title, onPress, disabled = false, secondary = false, testID }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean; testID?: string }) {
  return <Pressable testID={testID} accessibilityRole="button" disabled={disabled} accessibilityState={{ disabled }} onPress={onPress} style={({ pressed }) => [secondary ? s.secondary : s.primary, (pressed || disabled) && s.dim]}><Text style={secondary ? s.secondaryText : s.primaryText}>{title}</Text></Pressable>;
}

/** Authenticated account wallet; the local store and the separate developer TEST ledger are never credited. */
export default function WalletAccountScreen({ onClose, connection }: { onClose: () => void; connection?: AccountWalletConnection }) {
  const [{ client, configurationError }] = useState<{ client: AccountWalletClient | null; configurationError: string }>(() => {
    try { return { client: createAccountWalletClient(connection ?? getAccountWalletConnection()), configurationError: '' }; }
    catch (error) { return { client: null, configurationError: error instanceof Error ? error.message : 'La conexión de pagos todavía no está configurada.' }; }
  });
  const { session, signIn, signOut, consultationAttempt } = useWalletAccountSession();
  const native = useWalletNativePayments();
  const [page, setPage] = useState<Page>('overview');
  const [resource, setResource] = useState<{ token: string; wallet: AccountWallet } | null>(null);
  const resourceVersion = useRef(0);
  const [loadError, setLoadError] = useState<{ token: string; message: string } | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [subscriptionBusy, setSubscriptionBusy] = useState(false);
  const subscriptionBusyRef = useRef(false);
  const onSubscriptionBusy = useCallback((value: boolean) => { subscriptionBusyRef.current = value; setSubscriptionBusy(value); }, []);
  const mounted = useRef(true);
  const closing = useRef(false);
  const [isClosing, setIsClosing] = useState(false);
  const [progress] = useState(() => new Animated.Value(0));
  const reducedMotion = useRef(false);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [amount, setAmount] = useState('200');
  const [result, setResult] = useState<AccountRechargeResult | null>(null);
  const attempt = useRef<{ amountCents: number; requestId: string } | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [revision, setRevision] = useState(0);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const maxHeight = Math.max(0, height - insets.top - 26);
  const [overviewHeight, setOverviewHeight] = useState(0);
  const wallet = session && resource?.token === session.token ? resource.wallet : null;
  const currentLoadError = session && loadError?.token === session.token ? loadError.message : '';
  const disabled = busy || subscriptionBusy || isClosing;

  useEffect(() => {
    mounted.current = true;
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (!active) return;
      reducedMotion.current = reduced;
      Animated.timing(progress, { toValue: 1, duration: reduced ? 0 : 320, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
    });
    return () => { active = false; mounted.current = false; progress.stopAnimation(); };
  }, [progress]);

  useEffect(() => {
    if (!session || !client) return;
    let active = true;
    const version = ++resourceVersion.current;
    const controller = new AbortController();
    void client.wallet(session.token, controller.signal).then(value => {
      if (!active || version !== resourceVersion.current) return;
      setResource({ token: session.token, wallet: value }); setLoadError(null);
    }).catch(failure => {
      if (!active || version !== resourceVersion.current) return;
      if (failure instanceof AccountWalletError && failure.status === 401) { signOut(); setResource(null); setResult(null); attempt.current = null; setPage('login'); }
      else setLoadError({ token: session.token, message: failure instanceof Error ? failure.message : 'No se pudo consultar tu saldo.' });
    });
    return () => { active = false; controller.abort(); };
  }, [session, client, revision, signOut]);

  const close = useCallback(() => {
    if (closing.current || busyRef.current || subscriptionBusyRef.current) return;
    Keyboard.dismiss(); closing.current = true; setIsClosing(true);
    Animated.timing(progress, { toValue: 0, duration: reducedMotion.current ? 0 : 220, easing: Easing.in(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start(({ finished }) => {
      if (!mounted.current) return;
      if (finished && !busyRef.current && !subscriptionBusyRef.current) onClose(); else { closing.current = false; setIsClosing(false); progress.setValue(1); }
    });
  }, [onClose, progress]);
  const leavePackages = useCallback(() => {
    if (closing.current || busyRef.current || subscriptionBusyRef.current) return;
    Keyboard.dismiss(); setError(''); setMessage(''); setPage('overview');
  }, []);
  const back = useCallback(() => {
    if (closing.current || busyRef.current || subscriptionBusyRef.current || page === 'packages') return;
    Keyboard.dismiss(); setPassword(''); setError(''); setMessage('');
    if (page === 'overview') close(); else { setPage('overview'); if (page === 'recharge') setRevision(v => v + 1); }
  }, [page, close]);
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { if (page === 'packages') return false; back(); return true; });
    if (Platform.OS !== 'web') return () => listener.remove();
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && page !== 'packages') { event.preventDefault(); event.stopImmediatePropagation(); back(); } };
    window.addEventListener('keydown', escape, true);
    return () => { listener.remove(); window.removeEventListener('keydown', escape, true); };
  }, [back, page]);

  async function run(action: () => Promise<unknown>) {
    if (busyRef.current || closing.current) return;
    busyRef.current = true; setBusy(true); setError(''); setMessage(''); Keyboard.dismiss();
    try { await action(); }
    catch (failure) {
      if (!mounted.current) return;
      if (failure instanceof AccountWalletError && failure.status === 401) {
        signOut(); setResource(null); setResult(null); attempt.current = null; setUncertain(false); setPage('login');
      }
      setError(failure instanceof Error ? failure.message : 'No se pudo completar la operación.');
    } finally { busyRef.current = false; if (mounted.current) setBusy(false); }
  }
  function accept(value: AccountRechargeResult) {
    if (!mounted.current || !session) return;
    setResult(value); setUncertain(false);
    if (value.wallet) { resourceVersion.current++; setResource({ token: session.token, wallet: value.wallet }); }
    if (value.recharge.status === 'succeeded' || value.recharge.status === 'canceled') attempt.current = null;
  }
  async function prepare() {
    if (!client || !session || !wallet?.paymentConfiguration || wallet.blocked) return;
    const draft = attempt.current ?? { amountCents: parseAccountRechargeAmount(amount), requestId: newWalletRequestId() };
    attempt.current = draft; setUncertain(true);
    try { accept(await client.create(session.token, draft.amountCents, draft.requestId)); }
    catch (failure) {
      if (failure instanceof AccountWalletError && failure.status === 409) {
        const latest = await client.wallet(session.token);
        if (mounted.current) { resourceVersion.current++; setResource({ token: session.token, wallet: latest }); }
        const pending = latest.pendingRecharges[0];
        if (pending && mounted.current) {
          setResult({ recharge: pending, paymentIntentId: null, clientSecret: null, wallet: null });
          setUncertain(false); attempt.current = null; return;
        }
      }
      throw failure;
    }
  }
  async function update(action: 'refresh' | 'cancel' | 'resume', entry = result?.recharge) {
    if (!client || !session || !entry) return;
    const value = await client.update(session.token, entry, action);
    accept(value); return value;
  }
  async function pay(method: 'apple' | 'card') {
    if (!client || !session || !result?.clientSecret || !wallet?.paymentConfiguration || wallet.blocked || !payable(result.recharge)) return;
    const request = { clientSecret: result.clientSecret, amountCents: result.recharge.amountCents };
    // Native success alone never changes the displayed balance. The server verifies Stripe.
    let response: { status: 'completed' | 'canceled' };
    try { response = await (method === 'apple' ? native.payApplePay(wallet.paymentConfiguration, request) : native.payCard(wallet.paymentConfiguration, request)); }
    catch (failure) {
      try { const verified = await update('refresh'); if (verified?.recharge.status === 'succeeded') return; } catch { /* Keep the same order visible after an ambiguous result. */ }
      throw failure;
    }
    await update(response.status === 'canceled' ? 'cancel' : 'refresh');
  }
  const openRecharge = () => {
    if (disabled || !wallet) return;
    setError(''); setMessage('');
    const pending = wallet.pendingRecharges[0];
    if (pending) setResult({ recharge: pending, paymentIntentId: null, clientSecret: null, wallet: null });
    else if (!uncertain && (!result || result.recharge.status === 'succeeded' || result.recharge.status === 'canceled')) { setResult(null); attempt.current = null; }
    setPage('recharge');
  };
  const title = page === 'recharge' ? 'Recargar saldo' : page === 'consultations' ? 'Mis consultas' : page === 'movements' ? 'Movimientos' : page === 'login' ? 'Tu cuenta' : page === 'packages' ? 'Paquetes' : 'Billetera';
  const status = result?.recharge.status;
  const terminal = status === 'succeeded' || status === 'canceled';
  const configuration = wallet?.paymentConfiguration;
  const canPay = !!configuration && !!result?.clientSecret && !!result && payable(result.recharge) && !wallet?.blocked;
  const refresh = () => void run(async () => {
    if (!client || !session) return;
    const version = ++resourceVersion.current;
    const value = await client.wallet(session.token); if (mounted.current && version === resourceVersion.current) { setResource({ token: session.token, wallet: value }); setLoadError(null); }
  });
  const consultationUnauthorized = () => {
    if (!mounted.current) return;
    resourceVersion.current++; signOut(); setResource(null); setResult(null); attempt.current = null; setUncertain(false); setPage('login'); setError('Tu sesión expiró. Inicia sesión nuevamente.');
  };

  return <View style={s.root}>
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress, backgroundColor: 'rgba(8,36,65,.30)' }]} />
    <Pressable testID="wallet-backdrop" accessibilityLabel="Cerrar billetera" onPress={close} disabled={disabled} style={StyleSheet.absoluteFill} />
    <KeyboardAvoidingView pointerEvents="box-none" style={s.position} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Animated.View testID="wallet-sheet" accessibilityViewIsModal pointerEvents={isClosing ? 'none' : 'auto'} onLayout={event => { if (page === 'overview' && event.nativeEvent.layout.height > 0 && overviewHeight !== event.nativeEvent.layout.height) setOverviewHeight(event.nativeEvent.layout.height); }} style={[s.sheet, { minHeight: Math.min(420, maxHeight), maxHeight, height: page === 'packages' ? Math.min(overviewHeight || maxHeight, maxHeight) : page === 'recharge' && overviewHeight ? Math.min(overviewHeight, maxHeight) : undefined, paddingBottom: Math.max(insets.bottom, 12), transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }] }]}>
        <View style={s.handle} />
        {page === 'packages' ? <SubscriptionPackagesPanel onBack={leavePackages} onClose={close} onBusyChange={onSubscriptionBusy} demoUpgradeEnabled={false} /> : <>
        <View style={s.header}>
          {page !== 'overview' && <Pressable testID="wallet-backsubpages" accessibilityRole="button" accessibilityLabel="Volver a mi billetera" disabled={disabled} onPress={back} style={s.back}><Icon name="back" size={22} /></Pressable>}
          <Text accessibilityRole="header" style={s.title}>{title}</Text><Pressable testID="wallet-close" accessibilityRole="button" accessibilityLabel="Cerrar billetera" disabled={disabled} onPress={close} style={s.close}><Icon name="close" size={22} /></Pressable>
        </View>
        <ScrollView key={page + (terminal ? ':' + status : '')} style={s.scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
          {wallet?.mode === 'test' && <Text testID="wallet-account-test-badge" style={s.testBadge}>Entorno de prueba · sin cargos reales</Text>}
          {!!configurationError && <Text accessibilityRole="alert" style={s.error}>{configurationError}</Text>}
          {page === 'overview' && <>
            {!session ? <View style={s.signIn}><View style={s.roundIcon}><Icon name="lock" size={26} color={colors.tealDark} /></View><Text style={s.heading}>Tu saldo, contigo</Text><Text style={s.body}>Entra con tu cuenta para consultar tu saldo y recargar.</Text><Action testID="wallet-account-login-open" title="Iniciar sesión" disabled={disabled || !client} onPress={() => { setError(''); setPage('login'); }} /></View> : <>
              <View style={s.balanceSection}><Text style={s.caption}>Saldo disponible</Text>{wallet ? <><Text testID="wallet-balance" style={s.balance}>{pesos(wallet.availableBalanceCents)}</Text><Text style={s.caption}>MXN</Text></> : currentLoadError ? <Text style={s.body}>Saldo sin consultar</Text> : <ActivityIndicator style={s.loader} color={colors.tealDark} />}
                <Text style={s.accountName}>{session.name}</Text>
                <Pressable testID="wallet-recharge-open" accessibilityRole="button" disabled={disabled || !configuration || wallet?.blocked} accessibilityState={{ disabled: disabled || !configuration || wallet?.blocked }} onPress={openRecharge} style={[s.rechargeOpen, (!configuration || wallet?.blocked) && s.dim]}><Icon name="plus" size={18} color={colors.tealDark} /><Text style={s.link}>Recargar</Text></Pressable>
                <Text style={s.caption}>Para consultas y servicios presenciales</Text>
              </View>
              {wallet?.blocked && <Text accessibilityRole="alert" style={s.error}>Tu billetera está en revisión. Contacta al equipo de Klini.</Text>}
              {wallet && !configuration && <Text style={s.body}>Las recargas todavía no están disponibles.</Text>}
              {!!currentLoadError && <Text accessibilityRole="alert" style={s.error}>{currentLoadError}</Text>}
              <Pressable testID="wallet-account-refresh" accessibilityRole="button" disabled={disabled} onPress={refresh} style={s.textButton}><Text style={s.link}>Actualizar saldo</Text></Pressable>
              {wallet && <Pressable testID="wallet-consultations-open" accessibilityRole="button" disabled={disabled} onPress={() => { setError(''); setMessage(''); setPage('consultations'); }} style={s.row}><View style={s.movementIcon}><Icon name="calendar" size={19} color={colors.tealDark} /></View><View style={s.flex}><Text style={s.rowTitle}>Mis consultas</Text><Text style={s.caption}>{consultationAttempt ? 'Pago por verificar' : 'Pagar con mi saldo'}</Text></View><Icon name="chevron" size={17} /></Pressable>}
              {!!wallet?.pendingRecharges.length && <View style={s.section}><Text style={s.sectionTitle}>Recarga pendiente</Text>{wallet.pendingRecharges.map(entry => <Pressable key={entry.id} testID="wallet-account-pending" accessibilityRole="button" disabled={disabled} onPress={() => { setResult({ recharge: entry, paymentIntentId: null, clientSecret: null, wallet: null }); setError(''); setPage('recharge'); }} style={s.row}><Icon name="clock" color={colors.tealDark} /><View style={s.flex}><Text style={s.rowTitle}>{pesos(entry.amountCents)}</Text><Text style={s.caption}>{statusName(entry)}</Text></View><Icon name="chevron" size={17} /></Pressable>)}</View>}
              <View style={s.section}><View style={s.sectionHeader}><Text style={s.sectionTitle}>Movimientos</Text><Pressable accessibilityRole="button" testID="wallet-movements-open" disabled={disabled} onPress={() => setPage('movements')} style={s.textButton}><Text style={s.link}>Ver todos</Text></Pressable></View>{!wallet?.movements.length ? <Text style={s.empty}>Aún no tienes movimientos.</Text> : wallet.movements.slice(0, 2).map(entry => <WalletEntry key={entry.id} entry={entry} />)}</View>
              <Pressable testID="wallet-account-logout" accessibilityRole="button" disabled={disabled} onPress={() => void run(async () => { await native.reset(); signOut(client ?? undefined); setResource(null); setResult(null); attempt.current = null; setUncertain(false); })} style={s.textButton}><Text style={s.link}>Cerrar sesión</Text></Pressable>
            </>}
            <View style={s.section}><View style={s.sectionHeader}><Text style={s.sectionTitle}>Suscripción</Text><Pressable accessibilityRole="button" disabled={disabled} onPress={() => setPage('packages')} style={s.textButton}><Text style={s.link}>Ver paquetes</Text></Pressable></View><Text style={s.caption}>Conoce los planes de Klini.</Text></View>
          </>}
          {page === 'login' && <View style={s.form}><Text style={s.heading}>Bienvenido a Klini</Text><Text style={s.body}>Usa tu cuenta de paciente.</Text><Text style={s.label}>Correo o usuario</Text><TextInput testID="wallet-account-login" accessibilityLabel="Correo o usuario" value={login} onChangeText={setLogin} editable={!disabled} autoCapitalize="none" autoComplete="username" style={s.input} /><Text style={s.label}>Contraseña</Text><TextInput testID="wallet-account-password" accessibilityLabel="Contraseña" value={password} onChangeText={setPassword} editable={!disabled} secureTextEntry autoComplete="password" style={s.input} /><Action testID="wallet-account-login-submit" title={busy ? 'Entrando…' : 'Continuar'} disabled={disabled || !client || !login.trim() || !password} onPress={() => void run(async () => { if (!client) return; try { const value = await client.login(login, password); if (!mounted.current) { void client.logout(value.token).catch(() => undefined); return; } signIn(value); setPage('overview'); setRevision(v => v + 1); } finally { if (mounted.current) setPassword(''); } })} /></View>}
          {page === 'recharge' && <>
            {!result && <View style={s.form}>
              <Text style={s.heading}>¿Cuánto deseas recargar?</Text><Text style={s.caption}>Saldo para consultas y servicios presenciales.</Text>
              <View style={s.presets}>{[100, 200, 500].map(value => <Pressable key={value} testID={'wallet-account-preset-' + value} accessibilityRole="button" accessibilityState={{ selected: amount === String(value), disabled: disabled || uncertain }} disabled={disabled || uncertain} onPress={() => { setAmount(String(value)); setError(''); }} style={[s.preset, amount === String(value) && s.presetSelected]}><Text style={s.rowTitle}>${value}</Text></Pressable>)}</View>
              <View style={s.amountRow}><Text style={s.currency}>$</Text><TextInput testID="wallet-account-amount" accessibilityLabel="Monto a recargar" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" maxLength={9} editable={!disabled && !uncertain} style={s.amountInput} /><Text style={s.caption}>MXN</Text></View><Text style={s.caption}>De $50 a $10,000 MXN.</Text>
              {uncertain && <Text style={s.body}>Estamos verificando tu recarga. Continúa con la misma solicitud.</Text>}
              <Action testID="wallet-account-prepare" title={busy ? 'Preparando…' : uncertain ? 'Verificar recarga' : 'Continuar'} disabled={disabled || !configuration || wallet?.blocked} onPress={() => void run(prepare)} />
            </View>}
            {!!result && <View style={s.form}>
              <View style={s.paymentAmount}>{terminal && <View style={s.roundIcon}><Icon name={status === 'succeeded' ? 'check' : 'close'} size={28} color={colors.tealDark} /></View>}<Text testID="wallet-account-status" style={s.heading}>{statusName(result.recharge)}</Text><Text testID="wallet-account-review-amount" style={s.balance}>{pesos(result.recharge.amountCents)}</Text><Text style={s.caption}>MXN</Text></View>
              {status === 'succeeded' ? <><Text style={s.body}>Tu saldo está disponible.</Text><Action testID="wallet-account-done" title="Volver a mi billetera" onPress={back} disabled={disabled} /></> : status === 'canceled' ? <><Text style={s.body}>Esta recarga no se agregó a tu saldo.</Text><Action testID="wallet-account-done" title="Volver a mi billetera" onPress={back} disabled={disabled} /></> : <>
                {canPay && configuration && <>
                  {native.canUseApplePay(configuration) && <WalletNativeApplePayButton configuration={configuration} disabled={disabled} onPress={() => void run(() => pay('apple'))} />}
                  {native.canUseCard(configuration) && <Action testID="wallet-account-pay-card" secondary title="Pagar con tarjeta" disabled={disabled} onPress={() => void run(() => pay('card'))} />}
                  {!native.canUseCard(configuration) && !native.canUseApplePay(configuration) && <Text style={s.body}>Abre la versión actual de Klini en tu teléfono para continuar con el pago.</Text>}
                </>}
                {!result.clientSecret && (payable(result.recharge) || result.recharge.status === 'creating') && <Action testID="wallet-account-resume" title="Continuar con el pago" disabled={disabled || !configuration} onPress={() => void run(() => update('resume'))} />}
                <Action testID="wallet-account-check" title={busy ? 'Consultando…' : 'Consultar estado'} secondary disabled={disabled} onPress={() => void run(() => update('refresh'))} />
                <Pressable testID="wallet-account-cancel" accessibilityRole="button" disabled={disabled} onPress={() => void run(() => update('cancel'))} style={s.textButton}><Text style={s.link}>Cancelar recarga</Text></Pressable>
              </>}
            </View>}
          </>}
          {page === 'movements' && <>{!wallet?.movements.length && <Text style={s.empty}>Aún no tienes movimientos.</Text>}{wallet?.movements.map(entry => <WalletEntry key={entry.id} entry={entry} />)}{wallet?.hasMoreMovements && <Text style={s.caption}>Se muestran los 100 movimientos más recientes.</Text>}</>}
          {page === 'consultations' && client && session && wallet && <WalletConsultationsPanel key={session.token} client={client} token={session.token} wallet={wallet} onWalletChange={value => { resourceVersion.current++; setResource({ token: session.token, wallet: value }); }} onBusyChange={value => { busyRef.current = value; setBusy(value); }} onUnauthorized={consultationUnauthorized} />}
          {!!message && <Text accessibilityLiveRegion="polite" style={s.body}>{message}</Text>}
          {!!error && <Text testID="wallet-account-error" accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}
        </ScrollView>
        </>}
      </Animated.View>
    </KeyboardAvoidingView>
  </View>;
}

function WalletEntry({ entry }: { entry: AccountWallet['movements'][number] }) {
  const title = { recharge: 'Recarga', refund: 'Reembolso', service_payment: 'Consulta presencial', service_reversal: 'Devolución de consulta' }[entry.type];
  return <View testID="wallet-account-movement" style={s.row}><View style={s.movementIcon}><Icon name={entry.amountCents > 0 ? 'plus' : 'remove'} color={colors.tealDark} size={18} /></View><View style={s.flex}><Text style={s.rowTitle}>{title}</Text><Text style={s.caption}>{new Date(entry.createdAt).toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'short' })}</Text></View><Text style={s.movementAmount}>{entry.amountCents > 0 ? '+' : '−'}{pesos(Math.abs(entry.amountCents))}</Text></View>;
}

const s = StyleSheet.create({
  root: { flex: 1 }, position: { flex: 1, justifyContent: 'flex-end' }, sheet: { width: '100%', maxWidth: 560, minHeight: 420, alignSelf: 'center', backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', flexShrink: 1 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#B5C1CD', alignSelf: 'center', marginTop: 10 }, header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, paddingTop: 6, paddingBottom: 10 }, title: { flex: 1, color: colors.navy, fontSize: 19, lineHeight: 27, fontWeight: '600' }, back: { width: 28, minHeight: 44, justifyContent: 'center' }, close: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F4F7', alignItems: 'center', justifyContent: 'center' },
  scroll: { flexShrink: 1, minHeight: 0 }, content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 18 }, balanceSection: { alignItems: 'center', gap: 3, paddingTop: 8, paddingBottom: 18 }, balance: { color: colors.navy, fontSize: 40, lineHeight: 52, fontWeight: '600', letterSpacing: -1 }, caption: { color: '#8295A6', fontSize: 11, lineHeight: 18 }, accountName: { color: colors.navy, fontSize: 12, lineHeight: 20, marginTop: 6 }, loader: { marginVertical: 18 },
  rechargeOpen: { minHeight: 40, paddingVertical: 9, paddingHorizontal: 17, borderRadius: 20, backgroundColor: '#EAF7F5', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9, marginBottom: 5 }, link: { color: colors.tealDark, fontSize: 12, lineHeight: 19, fontWeight: '500' }, textButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center' }, section: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E9EE', paddingVertical: 12 }, sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, sectionTitle: { color: colors.navy, fontSize: 14, lineHeight: 21, fontWeight: '600' }, empty: { color: '#8295A6', fontSize: 12, lineHeight: 20, paddingVertical: 12 },
  signIn: { paddingTop: 12, paddingBottom: 24, gap: 14 }, heading: { color: colors.navy, fontSize: 21, lineHeight: 29, fontWeight: '600' }, body: { color: colors.muted, fontSize: 13, lineHeight: 21 }, roundIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#EAF7F5', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }, form: { gap: 14, paddingTop: 8, paddingBottom: 16 }, label: { color: colors.navy, fontSize: 12, lineHeight: 19 }, input: { borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 12, color: colors.navy, fontSize: 16, minHeight: 48 },
  presets: { flexDirection: 'row', gap: 8, marginTop: 10 }, preset: { flex: 1, minHeight: 44, borderRadius: 13, borderWidth: 1, borderColor: colors.line, justifyContent: 'center', alignItems: 'center' }, presetSelected: { borderColor: '#A9DCD7', backgroundColor: '#EDF8F7' }, amountRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line, gap: 8 }, currency: { color: '#8295A6', fontSize: 28 }, amountInput: { flex: 1, minWidth: 0, fontSize: 32, fontWeight: '500', color: colors.navy, paddingVertical: 16 }, paymentAmount: { alignItems: 'center', paddingVertical: 18, gap: 5 },
  primary: { minHeight: 48, borderRadius: 24, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 18 }, primaryText: { color: 'white', fontSize: 14, lineHeight: 21, fontWeight: '600' }, secondary: { minHeight: 48, borderRadius: 14, backgroundColor: '#F2F7F8', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12 }, secondaryText: { color: colors.navy, fontSize: 14, lineHeight: 21, fontWeight: '500' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 65, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E6EDF1' }, flex: { flex: 1, minWidth: 0 }, rowTitle: { color: colors.navy, fontSize: 13, lineHeight: 20, fontWeight: '500' }, movementIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EAF7F5', alignItems: 'center', justifyContent: 'center' }, movementAmount: { color: colors.tealDark, fontSize: 13, fontWeight: '500' }, testBadge: { backgroundColor: '#EAF7F5', color: colors.tealDark, padding: 9, borderRadius: 10, fontSize: 11, lineHeight: 17, marginBottom: 12 }, error: { color: colors.danger, fontSize: 12, lineHeight: 20, paddingVertical: 10 }, dim: { opacity: .45 },
});
