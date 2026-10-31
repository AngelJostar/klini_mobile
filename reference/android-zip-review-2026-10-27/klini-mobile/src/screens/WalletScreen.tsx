import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, Icon } from '../components/ui';
import { initialWallet, money, walletTotals } from '../domain/wallet';
import { loadWalletTokens, TokenWallet } from '../services/wallet';
import { useAppStore } from '../state/store';
import { hasAiAccess } from '../domain/aiSubscription';
import AiSubscriptionPanel from '../components/AiSubscriptionPanel';
import BookingFooterButton from '../components/BookingFooterButton';

export default function WalletScreen({ onClose }: { onClose: () => void }) {
  const { state, rechargeWallet, storageError } = useAppStore();
  const wallet = state.wallet ?? initialWallet;
  const totals = walletTotals(wallet);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [progress] = useState(() => new Animated.Value(0));
  const reduceMotion = useRef(false);
  const closing = useRef(false);
  const [amount, setAmount] = useState('200');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [message, setMessage] = useState('');
  const [tokenWallet, setTokenWallet] = useState<TokenWallet | null>(null);
  const [tokenError, setTokenError] = useState('');
  const [tokenLoading, setTokenLoading] = useState(true);
  const [showTokens, setShowTokens] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [subscriptionBusy, setSubscriptionBusy] = useState(false);
  const subscriptionBusyRef = useRef(false);
  const aiActive = hasAiAccess(state.aiSubscription);
  const onSubscriptionBusy = useCallback((value: boolean) => { subscriptionBusyRef.current = value; setSubscriptionBusy(value); }, []);
  const leaveSubscription = useCallback(() => { if (!subscriptionBusyRef.current) setSubscriptionOpen(false); }, []);
  const request = useRef<AbortController | null>(null);
  const refreshTokens = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setTokenLoading(true);
    setTokenError('');
    try {
      const result = await loadWalletTokens(controller.signal);
      if (!controller.signal.aborted) setTokenWallet(result);
    } catch (error) {
      if (!controller.signal.aborted)
        setTokenError(
          error instanceof Error ? error.message : 'No se pudo consultar tu saldo de Tokens.',
        );
    } finally {
      if (!controller.signal.aborted) setTokenLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    request.current = controller;
    void loadWalletTokens(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setTokenWallet(result);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setTokenError(
            error instanceof Error ? error.message : 'No se pudo consultar tu saldo de Tokens.',
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setTokenLoading(false);
      });
    return () => request.current?.abort();
  }, []);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!active) return;
      reduceMotion.current = reduced;
      Animated.timing(progress, {
        toValue: 1,
        duration: reduced ? 0 : 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      reduceMotion.current = value;
    });
    return () => {
      active = false;
      subscription.remove();
      progress.stopAnimation();
    };
  }, [progress]);
  const close = useCallback(() => {
    if (closing.current || busyRef.current || subscriptionBusyRef.current) return;
    closing.current = true;
    Animated.timing(progress, {
      toValue: 0,
      duration: reduceMotion.current ? 0 : 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (finished) onClose();
    });
  }, [onClose, progress]);
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (subscriptionOpen) leaveSubscription();
      else close();
      return true;
    });
    return () => listener.remove();
  }, [close, leaveSubscription, subscriptionOpen]);
  const recharge = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setMessage('');
    try {
      await rechargeWallet(Number(amount.trim().replace(',', '.')));
      setAmount('200');
      setMessage('Recarga de demostración guardada.');
      void refreshTokens();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo guardar la recarga local.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  return (
    <View style={s.root}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: progress, backgroundColor: 'rgba(8,36,65,0.30)' },
        ]}
      />
      <Pressable
        style={StyleSheet.absoluteFill}
        accessibilityLabel="Cerrar billetera"
        onPress={close}
        testID="wallet-backdrop"
      />
      <KeyboardAvoidingView
        pointerEvents="box-none"
        style={s.position}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View
          testID="wallet-sheet"
          accessibilityViewIsModal
          style={[
            s.sheet,
            {
              maxHeight: height - insets.top - 26,
              paddingBottom: Math.max(insets.bottom, 12),
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [height, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={s.handle} />
          <View style={s.header}>
            {subscriptionOpen && <Pressable testID="wallet-ai-back" accessibilityRole="button" accessibilityLabel="Volver a mi billetera" accessibilityState={{ disabled: subscriptionBusy }} disabled={subscriptionBusy} onPress={leaveSubscription} style={s.back}><Icon name="back" size={23} /></Pressable>}
            <View style={s.headerTitle}>
              <Text style={s.eyebrow}>{subscriptionOpen ? 'TU ASISTENTE PERSONAL' : 'MI CUENTA'}</Text>
              <Text accessibilityRole="header" style={s.title}>{subscriptionOpen ? 'Klini IA' : 'Billetera y suscripción'}</Text>
            </View>
            <Pressable
              testID="wallet-close"
              accessibilityRole="button"
              accessibilityLabel="Cerrar billetera y suscripción"
              accessibilityState={{ disabled: subscriptionBusy }}
              disabled={subscriptionBusy}
              onPress={close}
              style={s.close}
            >
              <Icon name="close" size={23} />
            </Pressable>
          </View>
          {subscriptionOpen ? <AiSubscriptionPanel onBack={leaveSubscription} onClose={close} onBusyChange={onSubscriptionBusy} /> : <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
            <View testID="wallet-ai-card" style={s.aiCard}>
              <View style={s.row}>
                <View style={s.aiIcon}><Icon name="sparkles-outline" color={colors.tealDark} size={26} /></View>
                <View style={s.flex}><Text style={s.aiTitle}>Klini IA</Text><Text testID="wallet-ai-status" style={s.aiStatus}>{aiActive ? 'Activa · demostración' : 'Sin activar'}</Text></View>
              </View>
              <Text style={s.aiIntro}>Tu información de salud, más clara y a la mano.</Text>
              <View style={s.aiBenefits}>
                {['Resúmenes de tu expediente', 'Explicaciones en lenguaje sencillo', 'Consulta y organización de tu agenda'].map(benefit => <View key={benefit} style={s.aiBenefit}><Icon name="check" size={15} color={colors.tealDark} /><Text style={s.aiBenefitText}>{benefit}</Text></View>)}
              </View>
              <View style={s.aiPriceRow}><Text style={s.aiPrice}>$99 MXN<Text style={s.aiPeriod}> / mes</Text></Text><BookingFooterButton title={aiActive ? 'Gestionar' : 'Ver Klini IA'} testID="wallet-ai-open" onPress={() => setSubscriptionOpen(true)} /></View>
              <Text style={s.aiDemo}>Activación de demostración · sin cargos</Text>
            </View>
            <View style={s.tokens}>
              <View style={s.row}>
                <View style={s.icon}>
                  <Icon name="wallet" color={colors.tealDark} size={23} />
                </View>
                <View style={s.flex}>
                  <Text style={s.label}>Tokens de tu cuenta</Text>
                  {tokenWallet && (
                    <Text style={s.tokenBalance}>
                      {tokenWallet.balance} {tokenWallet.balance === 1 ? 'Token' : 'Tokens'}
                    </Text>
                  )}
                  <Text style={s.caption}>Gana 1 Token por cada evento que creas.</Text>
                </View>
              </View>
              {tokenLoading ? (
                <Text accessibilityLiveRegion="polite" style={s.caption}>
                  Consultando Tokens…
                </Text>
              ) : tokenError ? (
                <View>
                  <Text style={s.caption}>{tokenError}</Text>
                  <Pressable accessibilityRole="button" onPress={refreshTokens} style={s.retry}>
                    <Text style={s.link}>Reintentar</Text>
                  </Pressable>
                </View>
              ) : tokenWallet?.movements.length ? (
                <View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: showTokens }}
                    onPress={() => setShowTokens(!showTokens)}
                    style={s.retry}
                  >
                    <Text style={s.link}>Movimientos de Tokens {showTokens ? '−' : '+'}</Text>
                  </Pressable>
                  {showTokens &&
                    tokenWallet.movements.map((entry) => (
                      <View key={entry.id} style={s.movement}>
                        <View style={s.flex}>
                          <Text style={s.label}>{entry.concept}</Text>
                          <Text style={s.caption}>
                            {new Date(
                              /Z$|[+-]\d\d:\d\d$/.test(entry.created_at)
                                ? entry.created_at
                                : `${entry.created_at.replace(' ', 'T')}Z`,
                            ).toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' })}
                          </Text>
                        </View>
                        <Text style={s.link}>+{entry.amount} Token</Text>
                      </View>
                    ))}
                </View>
              ) : (
                <Text style={s.caption}>Tus recompensas aparecerán aquí al crear un evento.</Text>
              )}
            </View>
            <View style={s.hero}>
              <View style={s.row}>
                <Text style={[s.label, s.heroLabel]}>Saldo disponible</Text>
                <Image source={require('../../assets/menu-wallet.png')} style={s.walletArt} />
              </View>
              <Text testID="wallet-balance" style={s.balance}>
                {money(wallet.balance)}
              </Text>
            </View>
            <View style={s.card}>
              <Text style={s.eyebrow}>BILLETERA</Text>
              <Text style={s.sectionTitle}>Recargar saldo</Text>
              <View style={s.inputRow}>
                <Text style={s.currency}>$</Text>
                <TextInput
                  testID="wallet-amount"
                  accessibilityLabel="Monto a recargar"
                  style={s.input}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  maxLength={8}
                  editable={!busy}
                />
              </View>
              <Pressable
                testID="wallet-recharge"
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={recharge}
                style={[s.button, busy && { opacity: 0.6 }]}
              >
                <Icon name="card" color="white" size={20} />
                <Text style={s.buttonText}>{busy ? 'Guardando…' : 'Recargar'}</Text>
              </Pressable>
              {!!message && (
                <Text testID="wallet-message" accessibilityLiveRegion="polite" style={s.caption}>
                  {message}
                </Text>
              )}
              {!!storageError && <Text style={s.error}>{storageError}</Text>}
              <View style={s.help}>
                <Icon name="info" size={19} color={colors.tealDark} />
                <View style={s.flex}>
                  <Text style={s.label}>¿Cómo funciona?</Text>
                  <Text style={s.caption}>
                    Ingresa de $10 a $100,000, con hasta dos decimales. La recarga se guarda en este
                    dispositivo; no se solicita un método de pago.
                  </Text>
                </View>
              </View>
            </View>
            <View style={s.card}>
              <Text style={s.sectionTitle}>Movimientos recientes</Text>
              {!wallet.movements.length && (
                <Text style={s.caption}>
                  Aún no hay movimientos. Tu primera recarga aparecerá aquí.
                </Text>
              )}
              {wallet.movements.map((item) => (
                <View key={item.id} style={s.movement}>
                  <View style={s.flex}>
                    <Text style={s.label}>{item.concept}</Text>
                    <Text style={s.caption}>
                      {item.date} · {item.id}
                    </Text>
                    <Text style={s.status}>{item.amount >= 0 ? 'Completado' : 'Débito'}</Text>
                  </View>
                  <Text style={s.amount}>
                    {item.amount >= 0 ? '+' : '−'}
                    {money(Math.abs(item.amount))}
                  </Text>
                </View>
              ))}
              <View style={s.summary}>
                {[
                  ['Total recargas', money(totals.credits)],
                  ['Total consumos', money(totals.debits)],
                  ['Movimientos', String(totals.count)],
                ].map(([label, value]) => (
                  <View key={label} style={s.row}>
                    <Text style={s.caption}>{label}</Text>
                    <Text style={s.label}>{value}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  position: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    width: '100%',
    alignSelf: 'center',
    maxWidth: 560,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    alignSelf: 'center',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 17,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  eyebrow: { fontSize: 10, letterSpacing: 1.8, color: colors.tealDark, fontWeight: '700' },
  headerTitle: { flex: 1, minWidth: 0 },
  title: { fontSize: 26, lineHeight: 31, fontWeight: '700', color: colors.navy, marginTop: 5 },
  back: { minHeight: 44, width: 32, alignItems: 'flex-start', justifyContent: 'center' },
  close: { padding: 10, borderRadius: 16, backgroundColor: colors.background },
  content: { padding: 20, gap: 16 },
  aiCard: { borderRadius: 20, borderWidth: 1, borderColor: '#CEEBE5', backgroundColor: '#F0FAF7', padding: 18, gap: 13 },
  aiIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#DCF2EC', alignItems: 'center', justifyContent: 'center' },
  aiTitle: { color: colors.navy, fontSize: 21, fontWeight: '700', lineHeight: 27 },
  aiStatus: { color: colors.tealDark, fontSize: 11, lineHeight: 17, marginTop: 3 },
  aiIntro: { color: '#5F7C8E', fontSize: 13, lineHeight: 20 },
  aiBenefits: { gap: 7 },
  aiBenefit: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  aiBenefitText: { color: colors.navy, fontSize: 12, lineHeight: 18, flex: 1 },
  aiPriceRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 3 },
  aiPrice: { color: colors.navy, fontSize: 19, fontWeight: '700', lineHeight: 26 },
  aiPeriod: { color: '#738D9E', fontSize: 12, fontWeight: '400' },
  aiDemo: { color: '#729589', fontSize: 10, lineHeight: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  flex: { flex: 1 },
  tokens: { borderRadius: 20, backgroundColor: '#F0FAF9', padding: 18, gap: 10 },
  icon: { padding: 12, borderRadius: 16, backgroundColor: colors.mint },
  label: { color: colors.navy, fontSize: 13, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 19, color: colors.muted },
  tokenBalance: { fontSize: 23, color: colors.navy, fontWeight: '700', marginVertical: 4 },
  retry: { paddingVertical: 10, alignSelf: 'flex-start' },
  link: { color: colors.tealDark, fontWeight: '600', fontSize: 13 },
  hero: { backgroundColor: colors.navy, borderRadius: 22, padding: 22 },
  heroLabel: { color: '#CFEAE9' },
  walletArt: { width: 46, height: 46 },
  balance: { fontSize: 39, fontWeight: '700', letterSpacing: -1, color: 'white', marginBottom: 12 },
  card: { borderWidth: 1, borderColor: colors.line, padding: 18, borderRadius: 20, gap: 14 },
  sectionTitle: { color: colors.navy, fontSize: 19, fontWeight: '700' },
  inputRow: {
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    minHeight: 54,
  },
  currency: { paddingHorizontal: 16, color: colors.muted, fontSize: 21 },
  input: { flex: 1, minWidth: 0, padding: 12, color: colors.navy, fontSize: 22, fontWeight: '600' },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.tealDark,
    borderRadius: 14,
    minHeight: 50,
  },
  buttonText: { color: 'white', fontSize: 15, fontWeight: '700' },
  help: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  error: { color: colors.danger, fontSize: 12 },
  movement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  status: { color: colors.tealDark, fontSize: 10, marginTop: 5 },
  amount: { color: colors.tealDark, fontSize: 15, fontWeight: '700', maxWidth: '40%' },
  summary: { backgroundColor: colors.background, borderRadius: 14, padding: 14, gap: 12 },
});
