import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';

import { AppCard } from '@/components/ui/app-card';
import { ContentState } from '@/components/ui/content-state';
import { colors, spacing } from '@/theme/tokens';

export function PatientPage({ title, subtitle, refreshing = false, onRefresh, children }: { title: string; subtitle?: string; refreshing?: boolean; onRefresh?: () => void; children: React.ReactNode }) {
  return <ScrollView contentContainerStyle={styles.container} refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}>
    <Text style={styles.eyebrow}>KLINI MOBILE</Text><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}{children}
  </ScrollView>;
}

export function PatientListCard({ title, caption, detail, onPress }: { title: string; caption?: string | null; detail?: string | null; onPress?: () => void }) {
  const content = <AppCard><Text style={styles.cardTitle}>{title}</Text>{caption ? <Text style={styles.cardCaption}>{caption}</Text> : null}{detail ? <Text style={styles.cardDetail}>{detail}</Text> : null}{onPress ? <Text style={styles.open}>Ver detalle →</Text> : null}</AppCard>;
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress}>{content}</Pressable> : content;
}

export function QueryState({ pending, error, empty, retry, children }: { pending: boolean; error: boolean; empty: boolean; retry: () => void; children: React.ReactNode }) {
  if (pending) return <ContentState loading title="Cargando información" />;
  if (error) return <ContentState title="No pudimos cargar la información" message="Revisa tu conexión e intenta nuevamente." retry={retry} />;
  if (empty) return <ContentState title="Sin información" message="Aún no hay registros para mostrar." />;
  return children;
}

export const formatDateTime = (value: string | null) => value ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Sin fecha';
export const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(new Date(`${value}T12:00:00`)) : 'Sin fecha';
export const go = (path: string) => router.push(path as never);

export const patientStyles = StyleSheet.create({
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metric: { width: '47%', minHeight: 105, justifyContent: 'space-between' },
  metricLabel: { color: colors.textMuted, fontWeight: '600' },
  metricValue: { color: colors.text, fontSize: 28, fontWeight: '800' },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  value: { color: colors.text, fontSize: 16, lineHeight: 23 },
});

const styles = StyleSheet.create({
  container: { flexGrow: 1, gap: spacing.md, padding: spacing.lg, backgroundColor: colors.background },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800' }, title: { color: colors.text, fontSize: 28, fontWeight: '800' }, subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '800' }, cardCaption: { color: colors.primaryDark, fontWeight: '700' }, cardDetail: { color: colors.textMuted, lineHeight: 21 }, open: { color: colors.primary, fontWeight: '800' },
});
