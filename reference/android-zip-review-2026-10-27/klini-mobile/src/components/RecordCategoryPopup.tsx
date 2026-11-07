import React, { useEffect } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { ClinicalRecord } from '../domain/types';
import RecordFlowSteps from './RecordFlowSteps';
import { colors, Icon } from './ui';

export type RecordCategoryValue = ClinicalRecord['type'] | 'Todos';

// Keep the existing Archivo category keys: stored records and routes use these values.
export const RECORD_CATEGORIES: { label: string; type: RecordCategoryValue; icon: string }[] = [
  { label: 'Mi historial', type: 'Todos', icon: 'folder' },
  { label: 'Consultas', type: 'Consulta', icon: 'stethoscope' },
  { label: 'Recetas y\nmedicamentos', type: 'Estudio', icon: 'diagnostics' },
  { label: 'Análisis\nclínicos', type: 'Procedimiento', icon: 'plus' },
  { label: 'Procedimientos y\nhospitalizaciones', type: 'Hospitalización', icon: 'hospital' },
  { label: 'Vacunas', type: 'Vacuna', icon: 'vaccine' },
  { label: 'Alergias y\nAntecedentes', type: 'Alergia', icon: 'alert' },
  { label: 'Instituciones y\nHospitales', type: 'Antecedente', icon: 'heart' },
];

export function recordCategoryLabel(value: RecordCategoryValue | null | undefined): string {
  return RECORD_CATEGORIES.find(category => category.type === value)?.label.replace(/\n/g, ' ') ?? value ?? 'Sin categoría';
}

export default function RecordCategoryPopup({ value, onSelect, onContinue, onBack, onClose }: {
  value: RecordCategoryValue | null;
  onSelect: (category: RecordCategoryValue) => void;
  onContinue: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopImmediatePropagation(); onBack();
    };
    if (Platform.OS === 'web') window.addEventListener('keydown', escape, true);
    return () => {
      back.remove();
      if (Platform.OS === 'web') window.removeEventListener('keydown', escape, true);
    };
  }, [onBack]);

  return <View style={s.overlay}>
    <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cancelar registro" />
    <View testID="record-category-popup" style={s.card} role="dialog" accessibilityLabel="Categoría del registro" accessibilityViewIsModal>
      <View style={s.header}>
        <Pressable testID="record-category-back" accessibilityRole="button" accessibilityLabel="Volver a la captura" onPress={onBack} style={s.back}><Icon name="back" size={22} color={colors.navy} /></Pressable>
        <Text accessibilityRole="header" style={s.title}>Categoría</Text>
        <Pressable testID="record-category-close" accessibilityRole="button" accessibilityLabel="Cancelar registro" onPress={onClose} style={s.close}><Icon name="close" size={19} color="#7D94AA" /></Pressable>
      </View>
      <RecordFlowSteps activeStep={3} />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
        <Text style={s.prompt}>Selecciona la categoría</Text>
        <View testID="record-categories" style={s.grid}>
          {RECORD_CATEGORIES.map(category => {
            const selected = value === category.type;
            return <Pressable
              key={category.type}
              testID={`record-category-${category.type}`}
              accessibilityRole="button"
              accessibilityLabel={recordCategoryLabel(category.type)}
              accessibilityState={{ selected }}
              aria-selected={selected}
              onPress={() => onSelect(category.type)}
              style={({ pressed }) => [s.category, pressed && s.pressed]}
            >
              <LinearGradient colors={['#F7FDFD', '#E0F3F2']} style={[s.icon, selected && s.selectedIcon]}><Icon name={category.icon} size={27} color={colors.teal} /></LinearGradient>
              <Text style={[s.label, selected && s.selectedLabel]}>{category.label}</Text>
            </Pressable>;
          })}
        </View>
      </ScrollView>
      <View style={s.footer}>
        <Pressable
          testID="record-category-continue"
          accessibilityRole="button"
          accessibilityLabel="Continuar a revisar el registro"
          accessibilityState={{ disabled: value === null }}
          disabled={value === null}
          onPress={onContinue}
          style={({ pressed }) => [s.continue, value === null && s.disabled, pressed && s.pressed]}
        ><Text style={s.continueLabel}>Continuar</Text><Icon name="chevronRight" size={16} color="white" /></Pressable>
      </View>
    </View>
  </View>;
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 24, backgroundColor: 'rgba(8,36,65,.28)' },
  card: { width: '100%', maxWidth: 350, maxHeight: '94%', flexShrink: 1, padding: 14, borderRadius: 22, backgroundColor: 'white', boxShadow: '0 12px 30px rgba(8,36,65,.15)' },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 36, gap: 5 },
  title: { flex: 1, color: colors.navy, fontSize: 17, fontWeight: '600' },
  back: { width: 32, height: 36, justifyContent: 'center', alignItems: 'center' },
  close: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EDF2F6', justifyContent: 'center', alignItems: 'center' },
  scroll: { flexShrink: 1 },
  content: { paddingBottom: 4 },
  prompt: { color: colors.navy, fontSize: 13, lineHeight: 19, fontWeight: '500', textAlign: 'center', marginBottom: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 },
  category: { width: '25%', minHeight: 111, alignItems: 'center', gap: 8, paddingHorizontal: 1 },
  icon: { width: 47, height: 47, borderRadius: 13, borderWidth: 1, borderColor: '#DCEDEE', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 7px rgba(8,36,65,.06)' },
  selectedIcon: { borderWidth: 2, borderColor: colors.teal },
  label: { color: '#365B7B', fontSize: 9, lineHeight: 13, textAlign: 'center', minHeight: 39 },
  selectedLabel: { color: colors.tealDark, fontWeight: '700' },
  footer: { alignItems: 'center', paddingTop: 12, paddingBottom: 2 },
  continue: { minHeight: 38, borderRadius: 22, backgroundColor: colors.teal, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 20 },
  continueLabel: { color: 'white', fontSize: 12, fontWeight: '600' },
  disabled: { backgroundColor: '#A5D5D5' },
  pressed: { opacity: .65 },
});
