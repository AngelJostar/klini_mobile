import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { env } from '@/config/env';
import { portalCalendarBridge, sharePortalCalendar } from '@/services/patient/portal-calendar';

// Adapted from paciente-movil-2026-10-07/adaptadores/react-native/PatientWebView.tsx.
// The original Laravel portal owns navigation, forms, CSRF and its cookie session.
export function PatientWebPortal() {
  const webView = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [failed, setFailed] = useState(false);
  const origin = new URL(env.apiUrl).origin;
  const secure = origin.startsWith('https://');
  const allowed = secure || env.appEnvironment === 'local';

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack) return false;
      webView.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, [canGoBack]);

  function handleNavigation(url: string) {
    try {
      const target = new URL(url);
      if (allowed && target.origin === origin) return true;
      if (['https:', 'mailto:', 'tel:'].includes(target.protocol)) {
        void Linking.openURL(url).catch(() => setFailed(true));
      }
    } catch { return false; }
    return false;
  }

  return <SafeAreaView style={styles.container}>
    {allowed && <WebView
      ref={webView}
      source={{ uri: `${origin}/patient` }}
      style={styles.container}
      javaScriptEnabled
      domStorageEnabled
      sharedCookiesEnabled
      thirdPartyCookiesEnabled={false}
      allowFileAccess={false}
      mixedContentMode="never"
      originWhitelist={[origin, 'https://*', 'mailto:*', 'tel:*']}
      startInLoadingState
      injectedJavaScript={portalCalendarBridge}
      onMessage={({ nativeEvent }) => {
        if (new URL(nativeEvent.url).origin !== origin) return;
        void sharePortalCalendar(nativeEvent.data).catch(() => Alert.alert('No fue posible abrir el calendario', 'Intenta de nuevo.'));
      }}
      renderLoading={() => <View style={styles.loading}><ActivityIndicator color="#008f83" accessibilityLabel="Cargando Klini" /></View>}
      onLoadStart={() => setFailed(false)}
      onError={() => setFailed(true)}
      onHttpError={({ nativeEvent }) => { if (nativeEvent.statusCode >= 500) setFailed(true); }}
      onNavigationStateChange={state => setCanGoBack(state.canGoBack)}
      onShouldStartLoadWithRequest={request => handleNavigation(request.url)}
      onOpenWindow={({ nativeEvent }) => {
        if (handleNavigation(nativeEvent.targetUrl)) {
          webView.current?.injectJavaScript(`window.location.href=${JSON.stringify(nativeEvent.targetUrl)};true;`);
        }
      }}
    />}
    {(!allowed || failed) && <View style={styles.error}>
      <Text style={styles.title}>No fue posible abrir Klini</Text>
      <Text style={styles.message}>{allowed ? 'Comprueba tu conexión con Dr. Sam e intenta de nuevo.' : 'Configura un servidor HTTPS para este ambiente.'}</Text>
      {allowed && <Pressable accessibilityRole="button" style={styles.button} onPress={() => { setFailed(false); webView.current?.reload(); }}><Text style={styles.buttonText}>Reintentar</Text></Pressable>}
    </View>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5fbfa' },
  loading: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5fbfa' },
  error: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', padding: 28, backgroundColor: '#f5fbfa', gap: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#20364d' },
  message: { fontSize: 16, color: '#526771' },
  button: { backgroundColor: '#008f83', borderRadius: 14, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
