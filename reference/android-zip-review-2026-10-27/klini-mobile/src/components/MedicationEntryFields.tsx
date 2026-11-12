import React, { useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Medication } from '../domain/types';
import { colors, Icon } from './ui';

const frequencies = [
  { id: 'daily', label: 'Una vez al día' },
  { id: '12-hours', label: 'Cada 12 horas' },
  { id: '8-hours', label: 'Cada 8 horas' },
  { id: '6-hours', label: 'Cada 6 horas' },
  { id: 'as-prescribed', label: 'Según indicación médica' },
] as const;

export type MedicationEntryDraft = Pick<Medication, 'name' | 'dose' | 'frequency'>;
export default function MedicationEntryFields({ draft, onChange, busy = false, testIDPrefix = 'medication' }: {
  draft: MedicationEntryDraft;
  onChange: (draft: MedicationEntryDraft) => void;
  busy?: boolean;
  testIDPrefix?: string;
}) {
  const doseInput = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [frequencyOpen, setFrequencyOpen] = useState(false);
  const [customFrequency, setCustomFrequency] = useState(() => !!draft.frequency && !frequencies.some(option => option.label === draft.frequency));
  const update = (patch: Partial<MedicationEntryDraft>) => onChange({ ...draft, ...patch });
  return <View>
        <Text style={s.label}>Medicamento</Text>
        <View style={s.inputRow}>
          <Icon name="search" size={17} color={colors.teal} />
          <TextInput
            testID={`${testIDPrefix}-name`}
            accessibilityLabel="Medicamento, nombre y concentración"
            placeholder="Nombre y concentración"
            placeholderTextColor="#8CA1B7"
            value={draft.name}
            onChangeText={name => update({ name })}
            maxLength={120}
            editable={!busy}
            autoCorrect={false}
            autoComplete="off"
            returnKeyType="next"
            onSubmitEditing={() => doseInput.current?.focus()}
            underlineColorAndroid="transparent"
            style={s.input}
          />
        </View>

        <Text style={s.label}>Dosis</Text>
        <View style={s.inputRow}>
          <TextInput
            ref={doseInput}
            testID={`${testIDPrefix}-dose`}
            accessibilityLabel="Dosis, cantidad y unidad según tu receta"
            placeholder="Cantidad y unidad"
            placeholderTextColor="#8CA1B7"
            value={draft.dose}
            onChangeText={dose => update({ dose })}
            maxLength={120}
            editable={!busy}
            autoCorrect={false}
            autoComplete="off"
            returnKeyType="done"
            underlineColorAndroid="transparent"
            style={s.input}
          />
        </View>

        <Text style={s.label}>Frecuencia</Text>
        <Pressable
          testID={`${testIDPrefix}-frequency`}
          accessibilityRole="button"
          accessibilityLabel={`Frecuencia según tu receta: ${draft.frequency || 'Seleccionar'}`}
          accessibilityState={{ expanded: frequencyOpen, disabled: busy }}
          disabled={busy}
          onPress={() => { Keyboard.dismiss(); setFrequencyOpen(open => !open); }}
          style={({ pressed }) => [s.selector, pressed && s.dimmed]}
        >
          <Text style={[s.frequencyValue, !draft.frequency && s.placeholder]}>
            {customFrequency ? 'Otra' : draft.frequency || 'Seleccionar'}
          </Text>
          <Icon name={frequencyOpen ? 'chevronUp' : 'chevronDown'} size={16} color="#8CA1B7" />
        </Pressable>
        {frequencyOpen && (
          <View testID={`${testIDPrefix}-frequency-options`} style={s.options}>
            {frequencies.map(option => {
              const selected = !customFrequency && draft.frequency === option.label;
              return (
                <Pressable
                  key={option.id}
                  testID={`${testIDPrefix}-frequency-choice-${option.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected, disabled: busy }}
                  disabled={busy}
                  onPress={() => { update({ frequency: option.label }); setCustomFrequency(false); setFrequencyOpen(false); }}
                  style={({ pressed }) => [s.option, (pressed || selected) && s.optionSelected]}
                >
                  <Text style={s.optionText}>{option.label}</Text>
                  {selected && <Icon name="check" size={16} color={colors.teal} />}
                </Pressable>
              );
            })}
            <Pressable
              testID={`${testIDPrefix}-frequency-choice-other`}
              accessibilityRole="button"
              accessibilityLabel="Otra frecuencia según tu receta"
              accessibilityState={{ selected: customFrequency, disabled: busy }}
              disabled={busy}
              onPress={() => { if (!customFrequency) update({ frequency: '' }); setCustomFrequency(true); setFrequencyOpen(false); }}
              style={({ pressed }) => [s.option, (pressed || customFrequency) && s.optionSelected]}
            >
              <Text style={s.optionText}>Otra</Text>
              {customFrequency && <Icon name="check" size={16} color={colors.teal} />}
            </Pressable>
          </View>
        )}
        {customFrequency && (
          <View style={[s.inputRow, s.customInput]}>
            <TextInput
              testID={`${testIDPrefix}-frequency-custom`}
              accessibilityLabel="Escribe la frecuencia de tu receta"
              placeholder="Frecuencia según tu receta"
              placeholderTextColor="#8CA1B7"
              value={draft.frequency}
              onChangeText={frequency => update({ frequency })}
              maxLength={180}
              editable={!busy}
              autoCorrect={false}
              autoComplete="off"
              underlineColorAndroid="transparent"
              style={s.input}
            />
          </View>
        )}

  </View>;
}

const s = StyleSheet.create({
  label: { color: colors.navy, fontSize: 12, lineHeight: 17, fontWeight: '500', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#DEE8EF', borderRadius: 11, paddingHorizontal: 12, minHeight: 42, marginBottom: 18 },
  input: { flex: 1, minWidth: 0, minHeight: 40, paddingVertical: 9, paddingHorizontal: 0, color: colors.navy, fontSize: 12, lineHeight: 18 },
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderWidth: 1, borderColor: '#DEE8EF', borderRadius: 11, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44 },
  frequencyValue: { flex: 1, color: colors.navy, fontSize: 12, lineHeight: 18 },
  placeholder: { color: '#8CA1B7' },
  options: { marginTop: 6, borderWidth: 1, borderColor: '#DEE8EF', borderRadius: 11, overflow: 'hidden' },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 12, paddingVertical: 11, minHeight: 44 },
  optionSelected: { backgroundColor: '#EDF8F8' },
  optionText: { flex: 1, color: colors.navy, fontSize: 12, lineHeight: 18 },
  customInput: { marginTop: 8, marginBottom: 0 },
  dimmed: { opacity: 0.6 },
});
