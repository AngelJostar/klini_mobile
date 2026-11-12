import React, { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import type { MedicationTreatment } from '../domain/medicationCare';
import type { Medication } from '../domain/types';
import MedicationCapsuleIcon from './MedicationCapsuleIcon';
import ArchivePopup from './ArchivePopup';
import MedicationEntryFields, { type MedicationEntryDraft } from './MedicationEntryFields';
import { colors, Icon } from './ui';

type TreatmentDraft = Omit<MedicationTreatment, 'id'>;

export interface MedicationTreatmentFormProps {
  medications: Medication[];
  draft: TreatmentDraft;
  onChange: (draft: TreatmentDraft) => void;
  onSave: () => void;
  onBack: () => void;
  onClose: () => void;
  medicationDraft: MedicationEntryDraft;
  onMedicationChange: (draft: MedicationEntryDraft) => void;
  editing?: boolean;
  busy?: boolean;
  error?: string;
}

export default function MedicationTreatmentForm({
  medications,
  draft,
  onChange,
  onSave,
  onBack,
  onClose,
  medicationDraft,
  onMedicationChange,
  editing = false,
  busy = false,
  error = '',
}: MedicationTreatmentFormProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const update = (patch: Partial<TreatmentDraft>) => onChange({ ...draft, ...patch });
  const toggleMedication = (id: string) => {
    const selected = draft.medicationIds.includes(id);
    update({
      medicationIds: selected
        ? draft.medicationIds.filter(medicationId => medicationId !== id)
        : [...draft.medicationIds, id],
    });
  };

  return (
    <ArchivePopup
      title={editing ? 'Editar tratamiento' : 'Nuevo tratamiento'}
      titleTestID="treatment-form-title"
      contentKey="medication-treatment"
      avoidKeyboard
      dismissible={!busy}
      onBack={onBack}
      onClose={onClose}
      footer={
        <View style={s.footer}>
          <Pressable
            testID="treatment-save"
            accessibilityRole="button"
            accessibilityLabel={editing ? 'Guardar cambios del tratamiento' : 'Guardar tratamiento'}
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
      <View testID="treatment-form" style={s.form}>
        <Text style={s.label}>Nombre del tratamiento</Text>
        <TextInput
          testID="treatment-name"
          accessibilityLabel="Nombre del tratamiento"
          placeholder="Escribe un nombre"
          placeholderTextColor="#8CA1B7"
          value={draft.name}
          onChangeText={name => update({ name })}
          editable={!busy}
          maxLength={120}
          autoComplete="off"
          returnKeyType="done"
          underlineColorAndroid="transparent"
          style={s.input}
        />

        {medications.length > 0 && <Text style={[s.label, s.medicationsLabel]}>Medicamentos</Text>}
        <View style={s.medications}>
          {medications.map(medication => {
            const checked = draft.medicationIds.includes(medication.id);
            return (
              <Pressable
                key={medication.id}
                testID={`treatment-medication-${medication.id}`}
                accessibilityRole="checkbox"
                accessibilityLabel={medication.name}
                accessibilityState={{ checked, disabled: busy }}
                aria-checked={checked}
                disabled={busy}
                onPress={() => { Keyboard.dismiss(); toggleMedication(medication.id); }}
                style={({ pressed }) => [s.medication, pressed && s.pressed]}
              >
                <MedicationCapsuleIcon size={21} color={colors.teal} />
                <View style={s.medicationText}>
                  <Text style={s.medicationName}>{medication.name}</Text>
                  {!!medication.dose && <Text style={s.medicationDose}>{medication.dose}</Text>}
                </View>
                <View style={[s.checkbox, checked && s.checked]}>
                  {checked && <Icon name="check" size={14} color="white" />}
                </View>
              </Pressable>
            );
          })}
        </View>
        <View testID="treatment-inline-medication" style={s.inlineMedication}>
          <MedicationEntryFields draft={medicationDraft} onChange={onMedicationChange} busy={busy} testIDPrefix="treatment-medication" />
        </View>

        <Pressable
          testID="treatment-more-options"
          accessibilityRole="button"
          accessibilityLabel={moreOpen ? 'Ocultar más opciones del tratamiento' : 'Más opciones del tratamiento'}
          accessibilityState={{ expanded: moreOpen, disabled: busy }}
          disabled={busy}
          onPress={() => { Keyboard.dismiss(); setMoreOpen(open => !open); }}
          style={({ pressed }) => [s.link, s.more, pressed && s.dimmed]}
        >
          <Text style={s.linkText}>{moreOpen ? 'Menos opciones' : 'Más opciones'}</Text>
          <Icon name={moreOpen ? 'chevronUp' : 'chevronDown'} size={14} color={colors.tealDark} />
        </Pressable>
        {moreOpen && (
          <View testID="treatment-additional-options" style={s.additional}>
            <View style={s.dates}>
              <View style={s.dateField}>
                <Text style={s.label}>Inicio</Text>
                <TextInput
                  testID="treatment-start-date"
                  accessibilityLabel="Fecha de inicio del tratamiento, formato AAAA-MM-DD"
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor="#8CA1B7"
                  value={draft.startDate}
                  onChangeText={startDate => update({ startDate })}
                  editable={!busy}
                  maxLength={10}
                  keyboardType="numbers-and-punctuation"
                  autoComplete="off"
                  underlineColorAndroid="transparent"
                  style={s.input}
                />
              </View>
              <View style={s.dateField}>
                <Text style={s.label}>Fin (opcional)</Text>
                <TextInput
                  testID="treatment-end-date"
                  accessibilityLabel="Fecha de fin opcional del tratamiento, formato AAAA-MM-DD"
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor="#8CA1B7"
                  value={draft.endDate || ''}
                  onChangeText={endDate => update({ endDate })}
                  editable={!busy}
                  maxLength={10}
                  keyboardType="numbers-and-punctuation"
                  autoComplete="off"
                  underlineColorAndroid="transparent"
                  style={s.input}
                />
              </View>
            </View>
            <View style={s.activeRow}>
              <Text style={s.activeLabel}>Tratamiento vigente</Text>
              <Switch
                testID="treatment-active"
                accessibilityLabel="Tratamiento vigente"
                disabled={busy}
                value={draft.active}
                onValueChange={active => update({ active })}
                trackColor={{ true: colors.teal, false: colors.line }}
              />
            </View>
          </View>
        )}
        {!!error && <Text testID="treatment-error" accessibilityRole="alert" style={s.error}>{error}</Text>}
      </View>
    </ArchivePopup>
  );
}

const s = StyleSheet.create({
  form: { paddingTop: 20 },
  label: { color: colors.navy, fontSize: 12, lineHeight: 17, fontWeight: '500', marginBottom: 6 },
  input: { minHeight: 44, borderWidth: 1, borderColor: '#DEE8EF', borderRadius: 11, paddingHorizontal: 12, paddingVertical: 10, color: colors.navy, fontSize: 12, lineHeight: 18 },
  medicationsLabel: { marginTop: 22 },
  medications: { marginTop: 2 },
  inlineMedication: { marginTop: 20 },
  medication: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  medicationText: { flex: 1, minWidth: 0, gap: 3 },
  medicationName: { color: colors.navy, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  medicationDose: { color: '#8198AE', fontSize: 11, lineHeight: 16 },
  checkbox: { width: 20, height: 20, borderWidth: 1, borderColor: '#B9CBD8', borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: colors.teal, borderColor: colors.teal },
  link: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 44 },
  more: { marginTop: 6 },
  linkText: { color: colors.tealDark, fontSize: 11, lineHeight: 17 },
  additional: { paddingTop: 4 },
  dates: { flexDirection: 'row', gap: 10 },
  dateField: { flex: 1, minWidth: 0 },
  activeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 18, minHeight: 44 },
  activeLabel: { flex: 1, color: colors.navy, fontSize: 12, lineHeight: 18 },
  footer: { alignItems: 'center', paddingBottom: 2 },
  save: { alignSelf: 'center', minWidth: 88, minHeight: 38, borderRadius: 22, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: 'white', fontSize: 12, lineHeight: 18, fontWeight: '500' },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18, marginTop: 8 },
  dimmed: { opacity: 0.6 },
  pressed: { backgroundColor: '#F5F8FA' },
});
