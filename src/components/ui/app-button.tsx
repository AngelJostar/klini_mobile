import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { colors, spacing } from '@/theme/tokens';

type Props = PressableProps & { label: string; loading?: boolean; variant?: 'primary' | 'outline' };
export function AppButton({ label, loading = false, variant = 'primary', disabled, ...props }: Props) {
  const isDisabled = disabled || loading;
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: Boolean(isDisabled), busy: loading }} disabled={isDisabled} style={({ pressed }) => [styles.button, variant === 'outline' && styles.outline, pressed && styles.pressed, isDisabled && styles.disabled]} {...props}>
    {loading ? <ActivityIndicator color={variant === 'primary' ? colors.white : colors.primary} /> : <Text style={[styles.label, variant === 'outline' && styles.outlineLabel]}>{label}</Text>}
  </Pressable>;
}
const styles = StyleSheet.create({
  button: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingHorizontal: spacing.md, backgroundColor: colors.primary },
  outline: { borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surface }, label: { color: colors.white, fontSize: 16, fontWeight: '700' }, outlineLabel: { color: colors.primary }, pressed: { opacity: 0.82 }, disabled: { opacity: 0.5 },
});
