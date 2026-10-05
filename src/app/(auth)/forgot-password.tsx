import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { AppField } from '@/components/ui/app-field';
import { ApiError } from '@/services/api/client';
import { forgotPassword } from '@/services/auth/auth-api';
import { colors, spacing } from '@/theme/tokens';

export default function ForgotPasswordScreen() {
  const [login, setLogin] = useState('');
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!login.trim()) return setError('Captura tu usuario o correo.');
    setLoading(true); setError(undefined);
    try { setMessage((await forgotPassword(login)).message); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : 'No fue posible enviar la solicitud.'); }
    finally { setLoading(false); }
  }

  return <SafeAreaView style={styles.safeArea}><View style={styles.container}>
    <Text style={styles.title}>Recuperar contraseña</Text>
    <Text style={styles.body}>Te enviaremos instrucciones si la cuenta está disponible.</Text>
    <AppCard>
      <AppField label="Usuario o correo" value={login} onChangeText={setLogin} autoCapitalize="none" />
      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <AppButton label="Enviar instrucciones" loading={loading} onPress={() => void submit()} />
      <Link href="/sign-in" style={styles.link}>Volver al inicio de sesión</Link>
    </AppCard>
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, container: { flex: 1, justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' }, body: { color: colors.textMuted, lineHeight: 22, marginBottom: spacing.md },
  success: { color: colors.primaryDark, lineHeight: 20 }, error: { color: colors.danger, lineHeight: 20 }, link: { color: colors.primary, fontWeight: '700', textAlign: 'center' },
});
