import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from './ui';

export type RecordFlowStep = 1 | 2 | 3 | 4;

const steps: { number: RecordFlowStep; label: string }[] = [
  { number: 1, label: 'Tipo' },
  { number: 2, label: 'Acción' },
  { number: 3, label: 'Categoría' },
  { number: 4, label: 'Revisar' },
];

/** Progress only: a step becomes available through the flow's Continue action. */
export default function RecordFlowSteps({ activeStep }: { activeStep: RecordFlowStep }) {
  return <View testID="record-flow-steps" style={s.row}>
    {steps.map(step => <View
      key={step.number}
      testID={`record-flow-step-${step.number}`}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Paso ${step.number} de 4: ${step.label}`}
      accessibilityState={{ selected: activeStep === step.number }}
      aria-current={activeStep === step.number ? 'step' : undefined}
      style={[s.step, activeStep === step.number && s.activeStep]}
    >
      <Text numberOfLines={1} style={[s.label, activeStep === step.number && s.activeLabel]}>{step.number} {step.label}</Text>
    </View>)}
  </View>;
}

const s = StyleSheet.create({
  row: { width: '100%', flexDirection: 'row', marginTop: 10, marginBottom: 14 },
  step: { flex: 1, minWidth: 0, minHeight: 32, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 2, paddingBottom: 7, borderBottomWidth: 2, borderBottomColor: '#E7EFF2' },
  activeStep: { borderBottomColor: colors.teal },
  label: { color: '#7E94A7', fontSize: 10, lineHeight: 16 },
  activeLabel: { color: colors.tealDark, fontWeight: '700' },
});
