import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, Icon } from './ui';
import { getSubscriptionOverview } from '../domain/subscriptionPlan';
import { useAppStore } from '../state/store';

export default function WalletSubscriptionDisplay({ onManage, onBrowsePackages, disabled = false }: { onManage: () => void; onBrowsePackages: () => void; disabled?: boolean }) {
  const { state } = useAppStore();
  const { currentPlan, nextPlan: upgrade } = getSubscriptionOverview(state);
  return <View testID="wallet-ai-card" style={s.section}>
    <View style={s.row}><Text style={[s.heading, s.flex]}>Suscripción actual</Text><Pressable testID="wallet-packages-open" accessibilityRole="button" disabled={disabled} accessibilityState={{ disabled }} onPress={onBrowsePackages} style={({ pressed }) => [s.action, (pressed || disabled) && s.dim]}><Text style={s.actionText}>Ver paquetes</Text></Pressable></View>
    <View style={s.row}>
      <View style={s.icon}><Icon name="sparkles-outline" size={23} color={colors.tealDark} /></View>
      <View style={s.flex}>
        <Text testID="wallet-subscription-current" style={s.name}>{currentPlan.name}</Text>
        <Text style={s.price}>${currentPlan.monthlyPrice} MXN / mes</Text>
        <Text testID="wallet-ai-status" style={s.status}>{currentPlan.id === 'free' ? 'Plan gratuito' : 'Activa · demostración'}</Text>
      </View>
      <Pressable testID="wallet-ai-open" accessibilityRole="button" accessibilityLabel="Gestionar mi suscripción" disabled={disabled} accessibilityState={{ disabled }} onPress={onManage} style={({ pressed }) => [s.action, (pressed || disabled) && s.dim]}><Text style={s.actionText}>Gestionar</Text></Pressable>
    </View>
    {upgrade && <Pressable testID="wallet-upgrade-card" accessibilityRole="button" accessibilityLabel={'Ver Upgrade: propuesta de ' + upgrade.name} disabled={disabled} accessibilityState={{ disabled }} onPress={onBrowsePackages} style={({ pressed }) => [s.upgrade, (pressed || disabled) && s.dim]}>
      <View style={s.upgradeHeader}>
        <Text style={[s.upgradeLabel, s.flex]}>Mejora propuesta</Text>
        <View testID="wallet-upgrade-open" accessible={false} style={s.upgradeAction}><Text style={s.upgradeActionText}>Ver Upgrade</Text></View>
      </View>
      <View><Text testID="wallet-upgrade-name" style={s.name}>{upgrade.name}</Text><Text style={s.price}>${upgrade.monthlyPrice} MXN / mes · {upgrade.storageLabel}</Text></View>
      <Text style={s.hint}>{upgrade.benefits.slice(0, 2).join('. ')}.</Text>
      <Text style={s.hint}>Tu plan actual se conserva al consultar la propuesta.</Text>
    </Pressable>}
  </View>;
}

const s = StyleSheet.create({
  section: { gap: 8 },
  heading: { color: colors.navy, fontSize: 14, fontWeight: '600', lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1, minWidth: 0 },
  icon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F0F7F7', alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.navy, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  price: { color: '#627C90', fontSize: 11, lineHeight: 16 },
  status: { color: '#8297A9', fontSize: 10, lineHeight: 15, marginTop: 1 },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 3 },
  actionText: { color: colors.tealDark, fontSize: 12, lineHeight: 18, fontWeight: '500' },
  upgrade: { borderRadius: 11, borderWidth: 1, borderColor: '#00DEE0', backgroundColor: '#F5FCFC', paddingHorizontal: 12, paddingVertical: 10, gap: 4, boxShadow: '0 0 12px rgba(0, 210, 215, 0.22)' },
  upgradeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  upgradeAction: { minHeight: 28, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 15, backgroundColor: '#006D7C', alignItems: 'center', justifyContent: 'center' },
  upgradeActionText: { color: '#FFFFFF', fontSize: 10, lineHeight: 16, fontWeight: '600' },
  upgradeLabel: { color: '#7A8C9C', fontSize: 11, lineHeight: 17 },
  hint: { color: '#8794A0', fontSize: 10, lineHeight: 16 },
  dim: { opacity: .5 },
});
