import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PopupTransitionProvider } from '@/features/body-parameters/components/PopupTransition';
import BodyParametersScreen from '@/features/body-parameters/screens/BodyParametersScreen';
import { AppProvider, useAppStore } from '@/features/body-parameters/state/store';

function ParametersContent() {
  const { ready } = useAppStore();
  if (!ready) return <View style={styles.loading}><ActivityIndicator color="#00AAA5" /><Text>Cargando parámetros locales</Text></View>;
  return <View style={styles.container}>
    <Text style={styles.notice}>Espacio local de demostración · separado del expediente de Laravel</Text>
    <PopupTransitionProvider>
      <BodyParametersScreen onClose={() => { if (router.canGoBack()) router.back(); else router.replace('/portal'); }} />
    </PopupTransitionProvider>
  </View>;
}

export default function ParametersRoute() {
  return <SafeAreaProvider><AppProvider><ParametersContent /></AppProvider></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#FFFFFF' },
  notice: { paddingTop: 8, paddingHorizontal: 16, paddingBottom: 8, fontSize: 11, color: '#526771', textAlign: 'center' },
});
