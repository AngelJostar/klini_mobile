import { useEffect, useRef, useState } from 'react';
import { BackHandler, Linking, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const url = process.env.EXPO_PUBLIC_PORTAL_URL || 'http://10.0.2.2:8000/social';
const origin = new URL(url).origin;
export default function SocialApp() {
  const web = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack) return false;
      web.current?.goBack(); return true;
    });
    return () => subscription.remove();
  }, [canGoBack]);
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#f5fbfa' }}>
    {failed ? <View style={{ padding: 24 }}><Text>No se pudo conectar con la comunidad.</Text><Pressable onPress={() => { setFailed(false); }}><Text>Reintentar</Text></Pressable></View> :
    <WebView ref={web} source={{ uri: url }} style={{ flex: 1 }} startInLoadingState
      onNavigationStateChange={state => setCanGoBack(state.canGoBack)}
      onError={() => setFailed(true)} onHttpError={event => { if (event.nativeEvent.statusCode >= 500) setFailed(true); }}
      onShouldStartLoadWithRequest={request => {
        if (request.url === 'about:blank' || new URL(request.url).origin === origin) return true;
        if (/^(https:|mailto:|tel:)/i.test(request.url)) void Linking.openURL(request.url).catch(() => {});
        return false;
      }} />}
  </SafeAreaView>;
}
