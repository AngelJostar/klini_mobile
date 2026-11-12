import React, { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import type { Medication } from '../domain/types';
import ArchivePopup from './ArchivePopup';
import MedicationEntryFields from './MedicationEntryFields';
import { colors, Icon } from './ui';

export interface MedicationRegistrationFormProps {
  draft: Omit<Medication, 'id'>;
  onChange: (draft: Omit<Medication, 'id'>) => void;
  onSave: () => void;
  onBack: () => void;
  onClose: () => void;
  onDelete?: () => void;
  editing?: boolean;
  error?: string;
  busy?: boolean;
}

export default function MedicationRegistrationForm({
  draft,
  onChange,
  onSave,
  onBack,
  onClose,
  onDelete,
  editing = false,
  error = '',
  busy = false,
}: MedicationRegistrationFormProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const update = (patch: Partial<Omit<Medication, 'id'>>) => onChange({ ...draft, ...patch });

  return (
    <ArchivePopup
      title={editing ? 'Editar medicamento' : 'Agregar medicamento'}
      titleTestID="medication-form-title"
      contentKey="medication-registration"
      avoidKeyboard
      dismissible={!busy}
      onBack={onBack}
      onClose={onClose}
      footer={
        <View style={s.footer}>
          <Text style={s.note}>Según tu receta</Text>
          <Pressable
            testID="save-medication"
            accessibilityRole="button"
            accessibilityLabel={editing ? 'Guardar cambios del medicamento' : 'Guardar medicamento'}
            accessibilityState={{ disabled: busy, busy }}
            disabled={busy}
            onPress={() => { Keyboard.dismiss(); onSave(); }}
            style={({ pressed }) => [s.save, (pressed || busy) && s.dimmed]}
          >
            <Text style={s.saveText}>{busy ? 'Guardando…' : 'Guardar'}</Text>
          </Pressable>
        </View>
      }
    >
      <View testID="medication-registration-form" style={s.form}>
        <MedicationEntryFields draft={draft} onChange={fields => onChange({ ...draft, ...fields })} busy={busy} />

        <Pressable
          testID="medication-more-options"
          accessibilityRole="button"
          accessibilityLabel={moreOpen ? 'Ocultar más opciones del medicamento' : 'Más opciones del medicamento'}
          accessibilityState={{ expanded: moreOpen, disabled: busy }}
          disabled={busy}
          onPress={() => { Keyboard.dismiss(); setMoreOpen(open => !open); }}
          style={({ pressed }) => [s.more, pressed && s.dimmed]}
        >
          <Text style={s.moreText}>{moreOpen ? 'Menos opciones' : 'Más opciones'}</Text>
          <Icon name={moreOpen ? 'chevronUp' : 'chevronDown'} size={14} color={colors.teal} />
        </Pressable>
        {moreOpen && (
          <View testID="medication-additional-options" style={s.additional}>
            <View style={s.dates}>
              <View style={s.dateField}>
                <Text style={s.label}>Inicio</Text>
                <View style={s.inputRow}>
                  <TextInput
                    testID="medication-start-date"
                    accessibilityLabel="Fecha de inicio, formato AAAA-MM-DD"
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor="#8CA1B7"
                    value={draft.startDate}
                    onChangeText={startDate => update({ startDate })}
                    maxLength={10}
                    editable={!busy}
                    keyboardType="numbers-and-punctuation"
                    autoComplete="off"
                    underlineColorAndroid="transparent"
                    style={s.input}
                  />
                </View>
              </View>
              <View style={s.dateField}>
                <Text style={s.label}>Fin (opcional)</Text>
                <View style={s.inputRow}>
                  <TextInput
                    testID="medication-end-date"
                    accessibilityLabel="Fecha de fin opcional, formato AAAA-MM-DD"
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor="#8CA1B7"
                    value={draft.endDate || ''}
                    onChangeText={endDate => update({ endDate })}
                    maxLength={10}
                    editable={!busy}
                    keyboardType="numbers-and-punctuation"
                    autoComplete="off"
                    underlineColorAndroid="transparent"
                    style={s.input}
                  />
                </View>
              </View>
            </View>
            <View style={s.activeRow}>
              <Text style={s.activeLabel}>Tratamiento vigente</Text>
              <Switch
                testID="medication-active"
                accessibilityLabel="Tratamiento vigente"
                value={draft.active}
                disabled={busy}
                onValueChange={active => update({ active })}
                trackColor={{ true: colors.teal, false: colors.line }}
              />
            </View>
          </View>
        )}
        {!!error && <Text testID="medication-error" accessibilityRole="alert" style={s.error}>{error}</Text>}
        {editing && onDelete && <Pressable testID="medication-delete" accessibilityRole="button" disabled={busy} onPress={onDelete} style={s.more}><Text style={s.error}>Eliminar medicamento</Text></Pressable>}
      </View>
    </ArchivePopup>
  );
}

const s = StyleSheet.create({
  form: { paddingTop: 20 },
  label: { color: colors.navy, fontSize: 12, lineHeight: 17, fontWeight: '500', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#DEE8EF', borderRadius: 11, paddingHorizontal: 12, minHeight: 42, marginBottom: 18 },
  input: { flex: 1, minWidth: 0, minHeight: 40, paddingVertical: 9, paddingHorizontal: 0, color: colors.navy, fontSize: 12, lineHeight: 18 },
  more: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, marginTop: 5 },
  moreText: { color: colors.tealDark, fontSize: 11, lineHeight: 17 },
  additional: { paddingTop: 4 },
  dates: { flexDirection: 'row', gap: 10 },
  dateField: { flex: 1, minWidth: 0 },
  activeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  activeLabel: { flex: 1, color: colors.navy, fontSize: 12, lineHeight: 18 },
  footer: { alignItems: 'center', gap: 10, paddingBottom: 2 },
  note: { color: '#8CA1B7', fontSize: 10, lineHeight: 15 },
  save: { alignSelf: 'center', minWidth: 88, minHeight: 38, borderRadius: 22, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: 'white', fontSize: 12, lineHeight: 18, fontWeight: '500' },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18, marginTop: 6 },
  dimmed: { opacity: 0.6 },
});
