import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { money } from '../domain/wallet';
import { colors, Icon } from './ui';

export type RechargeStep = 'amount' | 'review' | 'success';
export type RechargeMethod = 'apple-pay' | 'card';
type Props = {
  step: RechargeStep;
  amount: string;
  method: RechargeMethod;
  reviewedAmount: number;
  balance: number;
  disabled: boolean;
  busy: boolean;
  error?: string;
  onAmountChange: (value: string) => void;
  onMethodChange: (method: RechargeMethod) => void;
  onContinue: () => void;
  onConfirm: () => void;
  onReturn: () => void;
};

export default function WalletRechargePanel({ step, amount, method, reviewedAmount, balance, disabled, busy, error, onAmountChange, onMethodChange, onContinue, onConfirm, onReturn }: Props) {
  const methodName = method === 'apple-pay' ? 'Apple Pay' : 'Tarjeta';
  return <View style={s.root}>
    <ScrollView key={step} style={s.scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, step === 'success' && s.successContent]}>
      {step === 'amount' && <View testID="wallet-recharge-form" style={s.form}>
        <Text style={s.label}>Método de pago</Text>
        <Pressable testID="wallet-payment-apple-pay" accessibilityRole="radio" aria-checked={method === 'apple-pay'} accessibilityLabel="Apple Pay, demostración" accessibilityState={{ checked: method === 'apple-pay', disabled }} disabled={disabled} onPress={() => onMethodChange('apple-pay')} style={({ pressed }) => [s.applePay, (pressed || disabled) && s.dim]}>
          <Icon name="logo-apple" size={24} color="white" /><Text style={s.applePayText}>Apple Pay</Text><View style={s.grow} />{method === 'apple-pay' && <Icon name="check" size={20} color="white" />}
        </Pressable>
        <Pressable testID="wallet-payment-card" accessibilityRole="radio" aria-checked={method === 'card'} accessibilityLabel="Tarjeta, demostración" accessibilityState={{ checked: method === 'card', disabled }} disabled={disabled} onPress={() => onMethodChange('card')} style={({ pressed }) => [s.card, method === 'card' && s.cardSelected, (pressed || disabled) && s.dim]}>
          <Icon name="card" size={21} /><Text style={s.cardText}>Tarjeta</Text><View style={s.grow} />{method === 'card' && <Icon name="check" size={19} color={colors.tealDark} />}
        </Pressable>
        <Text style={[s.label, s.amountLabel]}>¿Cuánto deseas recargar?</Text>
        <View style={s.presets}>{[100, 200, 500].map(value => <Pressable key={value} testID={`wallet-recharge-preset-${value}`} accessibilityRole="button" accessibilityLabel={`Recargar ${value} pesos`} accessibilityState={{ selected: Number(amount.replace(',', '.')) === value, disabled }} disabled={disabled} onPress={() => onAmountChange(String(value))} style={({ pressed }) => [s.preset, Number(amount.replace(',', '.')) === value && s.presetSelected, (pressed || disabled) && s.dim]}><Text style={s.presetText}>${value}</Text></Pressable>)}</View>
        <View style={s.inputRow}><Text style={s.currency}>$</Text><TextInput testID="wallet-amount" accessibilityLabel="Monto a recargar" value={amount} onChangeText={onAmountChange} keyboardType="decimal-pad" maxLength={10} editable={!disabled} returnKeyType="done" onSubmitEditing={onContinue} style={s.input} /><Text style={s.suffix}>MXN</Text></View>
        <Text style={s.hint}>De $10 a $100,000 MXN.</Text>
      </View>}
      {step === 'review' && <View testID="wallet-recharge-review" style={s.review}>
        <View style={[s.methodBadge, method === 'apple-pay' && s.methodBadgeApple]}><Icon name={method === 'apple-pay' ? 'logo-apple' : 'card'} size={24} color={method === 'apple-pay' ? 'white' : colors.navy} /><Text style={[s.methodText, method === 'apple-pay' && s.white]}>{methodName}</Text></View>
        <Text style={s.reviewLabel}>Vas a agregar a tu saldo</Text>
        <Text testID="wallet-recharge-review-amount" style={s.amount}>{money(reviewedAmount)}</Text><Text style={s.hint}>MXN</Text>
        <View style={s.summary}><Text style={s.summaryLabel}>Tu saldo quedará en</Text><Text testID="wallet-recharge-review-balance" style={s.summaryValue}>{money(Math.round((balance + reviewedAmount) * 100) / 100)}</Text></View>
      </View>}
      {step === 'success' && <View testID="wallet-recharge-success" accessibilityLiveRegion="polite" style={s.success}>
        <View style={s.successIcon}><Icon name="check" size={30} color={colors.tealDark} /></View>
        <Text style={s.successTitle}>Recarga guardada</Text><Text style={s.successAmount}>{money(reviewedAmount)}</Text>
        <Text style={s.hint}>Saldo disponible</Text><Text testID="wallet-recharge-success-balance" style={s.summaryValue}>{money(balance)}</Text>
      </View>}
      {!!error && <Text testID="wallet-message" accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}
    </ScrollView>
    <View style={s.footer}>
      <Pressable testID={step === 'amount' ? 'wallet-recharge-continue' : step === 'review' ? 'wallet-recharge' : 'wallet-recharge-return'} accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={step === 'amount' ? onContinue : step === 'review' ? onConfirm : onReturn} style={({ pressed }) => [s.primary, (pressed || disabled) && s.dim]}><Text style={s.primaryText}>{busy ? 'Guardando…' : step === 'amount' ? 'Continuar' : step === 'review' ? 'Confirmar recarga' : 'Volver a mi billetera'}</Text></Pressable>
      <Text style={s.demo}>Demostración · sin cargos reales</Text>
    </View>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, minHeight: 0 }, scroll: { flex: 1, minHeight: 0 }, content: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 18 },
  form: { gap: 10 }, label: { color: colors.navy, fontSize: 14, lineHeight: 21, fontWeight: '500' }, grow: { flex: 1 },
  applePay: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, borderRadius: 14, backgroundColor: '#000', paddingHorizontal: 17 }, applePayText: { color: 'white', fontSize: 19, lineHeight: 26, fontWeight: '600' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: '#E3E9EE', backgroundColor: '#FAFBFC', paddingHorizontal: 17 }, cardSelected: { borderColor: '#A9DCD7', backgroundColor: '#F0F9F8' }, cardText: { color: colors.navy, fontSize: 14, lineHeight: 21 },
  amountLabel: { marginTop: 16 }, presets: { flexDirection: 'row', gap: 8 }, preset: { flex: 1, minWidth: 0, minHeight: 44, borderWidth: 1, borderColor: '#E0E7ED', borderRadius: 12, justifyContent: 'center', alignItems: 'center' }, presetSelected: { borderColor: '#A9DCD7', backgroundColor: '#EDF8F7' }, presetText: { color: colors.navy, fontSize: 14, fontWeight: '500' },
  inputRow: { flexDirection: 'row', alignItems: 'center', minHeight: 60, borderWidth: 1, borderColor: '#DCE6EC', borderRadius: 14 }, currency: { color: '#8295A6', fontSize: 24, paddingLeft: 15 }, input: { flex: 1, minWidth: 0, paddingHorizontal: 10, paddingVertical: 14, color: colors.navy, fontSize: 25, fontWeight: '500' }, suffix: { color: '#8295A6', fontSize: 12, paddingRight: 15 },
  hint: { color: '#7A90A3', fontSize: 12, lineHeight: 19 }, review: { alignItems: 'center', paddingTop: 5 }, methodBadge: { minHeight: 52, width: '100%', borderRadius: 14, backgroundColor: '#F0F4F7', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, methodBadgeApple: { backgroundColor: '#000' }, methodText: { color: colors.navy, fontSize: 18, lineHeight: 25, fontWeight: '600' }, white: { color: 'white' },
  reviewLabel: { color: '#7A90A3', fontSize: 13, lineHeight: 20, marginTop: 34 }, amount: { color: colors.navy, fontSize: 38, lineHeight: 49, fontWeight: '600', marginTop: 8, textAlign: 'center' }, summary: { width: '100%', backgroundColor: '#F5F8FA', borderRadius: 14, padding: 16, marginTop: 28, gap: 6 }, summaryLabel: { color: '#7A90A3', fontSize: 12, lineHeight: 19 }, summaryValue: { color: colors.navy, fontSize: 21, lineHeight: 29, fontWeight: '600' },
  successContent: { flexGrow: 1, justifyContent: 'center' }, success: { alignItems: 'center', gap: 8 }, successIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF7F5', marginBottom: 8 }, successTitle: { color: colors.navy, fontSize: 21, lineHeight: 29, fontWeight: '600' }, successAmount: { color: colors.tealDark, fontSize: 29, lineHeight: 38, fontWeight: '600', marginBottom: 14 },
  error: { color: colors.danger, fontSize: 12, lineHeight: 19, paddingTop: 18 }, footer: { paddingHorizontal: 24, paddingTop: 12, gap: 10 }, primary: { minHeight: 48, borderRadius: 24, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 18 }, primaryText: { color: 'white', fontSize: 14, lineHeight: 21, fontWeight: '600' }, demo: { color: '#8295A6', fontSize: 10, lineHeight: 17, textAlign: 'center', marginBottom: 3 }, dim: { opacity: .5 },
});
