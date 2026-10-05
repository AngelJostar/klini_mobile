import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, spacing } from '@/theme/tokens';

type Props = TextInputProps & { label: string; error?: string };
export function AppField({ label, error, ...props }: Props) {
  return <View style={styles.container}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} accessibilityState={{ disabled: !props.editable }} accessibilityHint={error} placeholderTextColor={colors.textMuted} style={[styles.input, error && styles.inputError]} {...props} />{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}</View>;
}
const styles = StyleSheet.create({
  container: { gap: spacing.xs }, label: { color: colors.text, fontSize: 14, fontWeight: '700' }, input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: spacing.md, color: colors.text, backgroundColor: colors.surface }, inputError: { borderColor: colors.danger }, error: { color: colors.danger, fontSize: 13 },
});
