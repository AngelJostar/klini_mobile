import { onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/theme/tokens';

const NetworkContext = createContext({ isOnline: true });

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setOnline] = useState(true);
  useEffect(() => {
    void Network.getNetworkStateAsync().then(update);
    const subscription = Network.addNetworkStateListener(update);
    return () => subscription.remove();
    function update(state: Network.NetworkState) {
      const next = state.isConnected !== false && state.isInternetReachable !== false;
      setOnline(next);
      onlineManager.setOnline(next);
    }
  }, []);
  const value = useMemo(() => ({ isOnline }), [isOnline]);
  return <NetworkContext.Provider value={value}>{!isOnline ? <View accessibilityRole="alert" style={styles.banner}><Text style={styles.text}>Sin conexión. Conservaremos esta pantalla y reintentaremos al volver la red.</Text></View> : null}{children}</NetworkContext.Provider>;
}

export const useNetworkStatus = () => useContext(NetworkContext);

const styles = StyleSheet.create({ banner: { backgroundColor: '#FFF3CD', paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, text: { color: '#664D03', fontWeight: '700', textAlign: 'center' } });
