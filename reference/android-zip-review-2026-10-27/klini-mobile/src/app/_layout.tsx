import React from 'react';
import { Stack } from 'expo-router';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useAppStore } from '../state/store';
import { colors } from '../components/ui';

export const unstable_settings = { anchor: 'index' };

function Navigation() {
  const { ready } = useAppStore();
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
        <Navigation />
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
