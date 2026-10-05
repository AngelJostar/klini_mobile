import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { AppField } from '@/components/ui/app-field';
import { useAuth } from '@/providers/auth-provider';
import { ApiError } from '@/services/api/client';
import { colors, spacing } from '@/theme/tokens';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!login.trim() || !password) {
      setError('Captura tu usuario o correo y contraseña.');
      return;
    }
    setLoading(true);
    setError(undefined);
    try { await signIn(login, password); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : 'No fue posible iniciar sesión.'); }
    finally { setLoading(false); }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.brandMark}><Text style={styles.brandInitial}>K</Text></View>
          <Text style={styles.title}>Klini Mobile</Text>
          <Text style={styles.subtitle}>Accede como paciente o médico con tu cuenta de Dr. Sam.</Text>
          <AppCard>
            <AppField label="Usuario o correo" value={login} onChangeText={setLogin} autoCapitalize="none" autoCorrect={false} returnKeyType="next" />
            <AppField label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry returnKeyType="go" onSubmitEditing={() => void submit()} />
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <AppButton label="Iniciar sesión" loading={loading} onPress={() => void submit()} />
            <Link href="/forgot-password" style={styles.link}>Olvidé mi contraseña</Link>
          </AppCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, safeArea: { flex: 1, backgroundColor: colors.background }, container: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  brandMark: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, marginBottom: spacing.lg },
  brandInitial: { color: colors.white, fontSize: 32, fontWeight: '800' }, title: { color: colors.text, fontSize: 32, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 16, lineHeight: 24, marginTop: spacing.sm, marginBottom: spacing.xxl }, error: { color: colors.danger, lineHeight: 20 },
  link: { color: colors.primary, fontWeight: '700', textAlign: 'center' },
});
