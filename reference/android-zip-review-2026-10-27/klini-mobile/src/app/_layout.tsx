import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { ActivityIndicator, AppState as NativeAppState, Image, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useAppStore } from '../state/store';
import { colors } from '../components/ui';
import { syncMedicationAlerts } from '../services/medicationNotifications';
import MedicationReminderProvider from '../components/MedicationReminderProvider';
import StripeTestProvider from '../components/StripeTestProvider';
import WalletPaymentProvider from '../components/WalletPaymentProvider';
import WalletAccountSessionProvider from '../state/walletAccountSession';

export const unstable_settings = { anchor: 'index' };

function Navigation() {
  const { ready, state } = useAppStore();
  useEffect(() => {
    if (!ready) return;
    // Reconcile edits, profile changes and resets, including an empty alert list.
    // Permission prompts belong exclusively to explicit Save/Activate actions.
    void syncMedicationAlerts(state);
    const subscription = NativeAppState.addEventListener('change', status => {
      if (status === 'active') void syncMedicationAlerts(state);
    });
    return () => subscription.remove();
  }, [ready, state]);
  if (!ready)
    return (
      <View style={s.loading}>
        <Image source={require('../../assets/klini-logo.png')} accessibilityLabel="Klini" resizeMode="contain" style={s.logo} />
        <ActivityIndicator color={colors.teal} />
      </View>
    );
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="medication-reminder" options={{ presentation: 'transparentModal', animation: 'fade', gestureEnabled: false, contentStyle: { backgroundColor: 'transparent' } }} />
      <Stack.Screen
        name="[section]"
        options={{
          presentation: 'transparentModal',
          animation: 'fade',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <WalletAccountSessionProvider><WalletPaymentProvider><StripeTestProvider><MedicationReminderProvider><Navigation /></MedicationReminderProvider></StripeTestProvider></WalletPaymentProvider></WalletAccountSessionProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    backgroundColor: 'white',
  },
  logo: { width: 120, height: 52 },
});
