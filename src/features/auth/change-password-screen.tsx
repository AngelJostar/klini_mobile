import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { AppField } from '@/components/ui/app-field';
import { ApiError } from '@/services/api/client';
import { changePassword } from '@/services/auth/auth-api';
import { colors, spacing } from '@/theme/tokens';

export function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!currentPassword || !password) return setError('Completa todos los campos.');
    if (password !== confirmation) return setError('Las contraseñas no coinciden.');
    setLoading(true); setError(undefined); setMessage(undefined);
    try {
      setMessage((await changePassword(currentPassword, password)).message);
      setCurrentPassword(''); setPassword(''); setConfirmation('');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No fue posible cambiar la contraseña.');
    } finally { setLoading(false); }
  }

  return <SafeAreaView style={styles.safeArea}><View style={styles.container}>
    <Text style={styles.title}>Cambiar contraseña</Text>
    <AppCard>
      <AppField label="Contraseña actual" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
      <AppField label="Nueva contraseña" value={password} onChangeText={setPassword} secureTextEntry />
      <AppField label="Confirmar contraseña" value={confirmation} onChangeText={setConfirmation} secureTextEntry />
      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <AppButton label="Guardar contraseña" loading={loading} onPress={() => void submit()} />
    </AppCard>
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, container: { flex: 1, gap: spacing.lg, padding: spacing.xl },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' }, success: { color: colors.primaryDark, lineHeight: 20 }, error: { color: colors.danger, lineHeight: 20 },
});
