import React, {useEffect, useRef, useState} from 'react';
import {BackHandler, Linking, Platform} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {WebView} from 'react-native-webview';

type Props = {server: string}; // https://plataforma.example

export default function PatientWebView({server}: Props) {
  const webView = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const origin = new URL(server).origin;
  if (!origin.startsWith('https://')) throw new Error('Configure un servidor HTTPS.');

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack) return false;
      webView.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, [canGoBack]);

  const handleNavigation = (url: string) => {
    try {
      const target = new URL(url);
      if (target.origin === origin) return true;
      if (['https:', 'mailto:', 'tel:'].includes(target.protocol)) {
        void Linking.openURL(url).catch(() => {});
      }
    } catch {}
    return false;
  };

  return <SafeAreaView style={{flex: 1, backgroundColor: '#f5fbfa'}}>
    <WebView
      ref={webView}
      source={{uri: `${origin}/patient`}}
      style={{flex: 1}}
      javaScriptEnabled
      domStorageEnabled
      sharedCookiesEnabled
      thirdPartyCookiesEnabled={false}
      allowFileAccess={false}
      mixedContentMode="never"
      originWhitelist={['https://*', 'mailto:*', 'tel:*']}
      startInLoadingState
      onNavigationStateChange={state => setCanGoBack(state.canGoBack)}
      onShouldStartLoadWithRequest={request => handleNavigation(request.url)}
      onOpenWindow={event => {handleNavigation(event.nativeEvent.targetUrl);}}
    />
  </SafeAreaView>;
}

// Instalar: npm install react-native-webview react-native-safe-area-context
// El host debe incluir SafeAreaProvider y configurar permisos/descargas de archivos.
// La autenticación se realiza dentro de la sesión web; no inyectar tokens en HTML.
