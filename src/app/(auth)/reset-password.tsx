import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { AppField } from '@/components/ui/app-field';
import { ApiError } from '@/services/api/client';
import { resetPassword } from '@/services/auth/auth-api';
import { colors, spacing } from '@/theme/tokens';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string; token?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [token, setToken] = useState(params.token ?? '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim() || !token.trim() || !password) return setError('Completa todos los campos.');
    if (password !== confirmation) return setError('Las contraseñas no coinciden.');
    setLoading(true); setError(undefined);
    try { setMessage((await resetPassword(email, token, password)).message); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : 'No fue posible cambiar la contraseña.'); }
    finally { setLoading(false); }
  }

  return <SafeAreaView style={styles.safeArea}><View style={styles.container}>
    <Text style={styles.title}>Nueva contraseña</Text>
    <AppCard>
      <AppField label="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <AppField label="Token de recuperación" value={token} onChangeText={setToken} autoCapitalize="none" />
      <AppField label="Nueva contraseña" value={password} onChangeText={setPassword} secureTextEntry />
      <AppField label="Confirmar contraseña" value={confirmation} onChangeText={setConfirmation} secureTextEntry />
      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <AppButton label="Actualizar contraseña" loading={loading} onPress={() => void submit()} />
      <Link href="/sign-in" style={styles.link}>Ir al inicio de sesión</Link>
    </AppCard>
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, container: { flex: 1, justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' }, success: { color: colors.primaryDark, lineHeight: 20 }, error: { color: colors.danger, lineHeight: 20 }, link: { color: colors.primary, fontWeight: '700', textAlign: 'center' },
});
