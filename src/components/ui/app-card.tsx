import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, spacing } from '@/theme/tokens';
export function AppCard({ style, ...props }: ViewProps) { return <View style={[styles.card, style]} {...props} />; }
const styles = StyleSheet.create({ card: { gap: spacing.md, padding: spacing.lg, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface } });
