import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppButton } from './app-button';

import { colors, spacing } from '@/theme/tokens';
type Props = { title?: string; message?: string; loading?: boolean; retry?: () => void };
export function ContentState({ title, message, loading = false, retry }: Props) {
  return <View style={styles.container}>{loading ? <ActivityIndicator color={colors.primary} size="large" /> : null}{title ? <Text style={styles.title}>{title}</Text> : null}{message ? <Text style={styles.message}>{message}</Text> : null}{retry ? <AppButton label="Intentar de nuevo" variant="outline" onPress={retry} /> : null}</View>;
}
const styles = StyleSheet.create({ container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl }, title: { color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center' }, message: { color: colors.textMuted, lineHeight: 22, textAlign: 'center' } });
