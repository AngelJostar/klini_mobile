import React, { useRef, useState } from 'react';
import { AccessibilityInfo, Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  getProfessionalFormDefaults,
  healthDegreeTypes,
  isProfessionalProfile,
  medicalSpecialties,
  profileKinds,
  type HealthDegreeType,
  type MedicalSpecialty,
  type ManagedPatientProfile,
  type ManagedProfile,
} from '../state/managedProfiles';
import { colors, Icon } from './ui';
import { useProfessionalPicker } from './ProfessionalPickerProvider';

export default function AccountProfileForm({ mode, profile, ownerName, busy, onBusyChange, onSave, submitLabel = 'Guardar perfil' }: {
  mode: 'family' | 'professional';
  profile?: ManagedProfile;
  ownerName?: string;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onSave: (profile: ManagedProfile) => Promise<void>;
  submitLabel?: string;
}) {
  const [name, setName] = useState(profile?.name ?? '');
  const [kind, setKind] = useState<ManagedPatientProfile['kind']>(
    profile && !isProfessionalProfile(profile) ? profile.kind : 'Niño',
  );
  const [initialProfessional] = useState(() => getProfessionalFormDefaults(
    profile && isProfessionalProfile(profile) ? profile : undefined,
  ));
  const [professionalType, setProfessionalType] = useState(initialProfessional.professionalType);
  const [doctorLicense, setDoctorLicense] = useState(initialProfessional.professionalType === 'doctor' ? initialProfessional.licenseNumber : '');
  const [licensedLicense, setLicensedLicense] = useState(initialProfessional.professionalType === 'licensed' ? initialProfessional.licenseNumber : '');
  const [specialty, setSpecialty] = useState<MedicalSpecialty | ''>(initialProfessional.specialty);
  const [degreeType, setDegreeType] = useState<HealthDegreeType | ''>(initialProfessional.degreeType);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const professional = mode === 'professional';
  const doctor = professionalType === 'doctor';

  async function save() {
    if (submitting.current) return;
    const trimmed = (professional ? ownerName ?? '' : name).trim();
    if (!trimmed || trimmed.length > 255) {
      setError('Escribe un nombre válido.');
      return;
    }
    if (professional) {
      const license = (doctor ? doctorLicense : licensedLicense).trim();
      if (!/^\d{1,20}$/.test(license)) {
        setError('Escribe una cédula de hasta 20 dígitos.');
        return;
      }
      if (doctor ? !specialty : !degreeType) {
        setError(doctor ? 'Selecciona una especialidad.' : 'Selecciona el tipo de licenciatura.');
        return;
      }
    }
    let draft: ManagedProfile;
    if (professional && doctor && specialty) {
      draft = { id: profile?.id ?? '', name: trimmed, kind: 'Profesional de la salud', professionalType: 'doctor', licenseNumber: doctorLicense.trim(), specialty };
    } else if (professional && !doctor && degreeType) {
      draft = { id: profile?.id ?? '', name: trimmed, kind: 'Profesional de la salud', professionalType: 'licensed', licenseNumber: licensedLicense.trim(), degreeType };
    } else {
      draft = { ...(profile && !isProfessionalProfile(profile) ? profile : {}), id: profile?.id ?? '', name: trimmed, kind };
    }
    submitting.current = true;
    onBusyChange(true);
    setError('');
    Keyboard.dismiss();
    try {
      await onSave(draft);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el perfil. Intenta de nuevo.');
    } finally {
      submitting.current = false;
      onBusyChange(false);
    }
  }

  return (
    <View testID={professional ? 'professional-profile-form' : 'managed-profile-form'} style={[s.form, professional && s.professionalForm]}>
      <Text accessibilityRole="header" style={s.title}>
        {professional
          ? profile?.id ? 'Editar profesional\nde la salud' : 'Agregar profesional\nde la salud'
          : profile?.id ? 'Editar perfil familiar' : 'Agregar perfil familiar'}
      </Text>
      {professional && <View style={s.professionalTypes}>
        {(['doctor', 'licensed'] as const).map(type => <Pressable
          key={type}
          testID={`professional-type-${type}`}
          accessibilityRole="tab"
          accessibilityLabel={type === 'doctor' ? 'Médico' : 'Licenciada/o'}
          accessibilityState={{ selected: professionalType === type, disabled: busy }}
          aria-selected={professionalType === type}
          disabled={busy}
          style={[s.typeButton, professionalType === type && s.activeType]}
          onPress={() => { Keyboard.dismiss(); setProfessionalType(type); setError(''); }}
        >
          <Text style={[s.typeLabel, professionalType === type && s.activeTypeLabel]}>{type === 'doctor' ? 'Médico' : 'Licenciada/o'}</Text>
        </Pressable>)}
      </View>}
      <View style={s.field}>
        <Text style={s.label}>Nombre</Text>
        <TextInput
          testID={professional ? 'professional-profile-name' : 'managed-profile-name'}
          accessibilityLabel="Nombre"
          style={s.input}
          value={professional ? ownerName ?? '' : name}
          onChangeText={value => { setName(value); setError(''); }}
          editable={!busy && !professional}
          aria-readonly={professional || undefined}
          maxLength={255}
          autoCapitalize="words"
          autoComplete="name"
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
          placeholder="Escribe el nombre"
          placeholderTextColor={colors.muted}
          underlineColorAndroid="transparent"
        />
      </View>
      {professional && <View style={s.field}>
        <Text style={s.label}>{doctor ? 'Cédula profesional' : 'Cédula profesional de la licenciatura'}</Text>
        <TextInput
          testID="professional-profile-license"
          accessibilityLabel={doctor ? 'Cédula profesional' : 'Cédula profesional de la licenciatura'}
          style={s.input}
          value={doctor ? doctorLicense : licensedLicense}
          onChangeText={value => { if (doctor) setDoctorLicense(value); else setLicensedLicense(value); setError(''); }}
          editable={!busy}
          keyboardType="number-pad"
          autoComplete="off"
          autoCorrect={false}
          maxLength={20}
          placeholder="Escribe la cédula"
          placeholderTextColor={colors.muted}
          underlineColorAndroid="transparent"
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />
      </View>}
      {professional ? doctor ? (
        <ProfessionalSelect
          key="doctor"
          field="specialty"
          label="Especialidad"
          value={specialty}
          options={medicalSpecialties}
          disabled={busy}
          onSelect={value => { setSpecialty(value); setError(''); }}
        />
      ) : (
        <ProfessionalSelect
          key="licensed"
          field="degreeType"
          label="Tipo de licenciatura"
          value={degreeType}
          options={healthDegreeTypes}
          disabled={busy}
          onSelect={value => { setDegreeType(value); setError(''); }}
        />
      ) : (
        <View style={s.field}>
          <Text style={s.label}>Tipo de perfil</Text>
          <View style={s.kinds}>
            {profileKinds.map(option => <Pressable
              key={option}
              testID={`managed-profile-kind-${option}`}
              accessibilityRole="radio"
              accessibilityLabel={option}
              accessibilityState={{ checked: kind === option, disabled: busy }}
              disabled={busy}
              onPress={() => { Keyboard.dismiss(); setKind(option); }}
              style={s.kindButton}
            >
              <View style={[s.kindIcon, kind === option && s.selectedKind]}>
                <Icon name={option === 'Mascota' ? 'paw-outline' : option === 'Niña' ? 'woman-outline' : 'person-outline'} size={29} color={kind === option ? colors.tealDark : colors.navy} />
                {kind === option && <View style={s.kindCheck}><Icon name="check" size={13} color={colors.tealDark} /></View>}
              </View>
              <Text style={s.kindLabel}>{option}</Text>
            </Pressable>)}
          </View>
        </View>
      )}
      {!!error && <Text testID="account-profile-error" accessibilityRole="alert" style={s.error}>{error}</Text>}
      <Pressable
        testID={professional ? 'professional-profile-save' : 'managed-profile-save'}
        accessibilityRole="button"
        accessibilityLabel={submitLabel}
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={() => void save()}
        style={({ pressed }) => [s.save, (pressed || busy) && s.dimmed]}
      >
        <Text style={s.saveText}>{busy ? 'Guardando…' : submitLabel}</Text>
      </Pressable>
    </View>
  );
}

function ProfessionalSelect<Value extends string>({ field, label, value, options, disabled, onSelect }: {
  field: 'specialty' | 'degreeType';
  label: string;
  value: Value | '';
  options: readonly Value[];
  disabled: boolean;
  onSelect: (value: Value) => void;
}) {
  const picker = useProfessionalPicker();
  const trigger = useRef<React.ComponentRef<typeof View>>(null);
  const open = picker?.field === field;
  return <View style={s.field}>
    <Text style={s.label}>{label}</Text>
    <Pressable
      testID={`professional-profile-${field}`}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value || 'Seleccionar'}`}
      ref={trigger}
      accessibilityState={{ expanded: open, disabled: disabled || !picker }}
      disabled={disabled || !picker}
      style={s.select}
      onPress={() => { Keyboard.dismiss(); picker?.open({ field, label, value, options, restoreNativeFocus: () => { if (Platform.OS !== 'web') requestAnimationFrame(() => { if (trigger.current) AccessibilityInfo.sendAccessibilityEvent(trigger.current, 'focus'); }); }, onSelect: selected => { const option = options.find(candidate => candidate === selected); if (option !== undefined) onSelect(option); } }); }}
    >
      <Text style={[s.value, !value && s.placeholder]}>{value || 'Seleccionar'}</Text>
      <Icon name={open ? 'chevronUp' : 'chevronDown'} size={17} color={colors.muted} />
    </Pressable>
  </View>;
}

const s = StyleSheet.create({
  form: { paddingTop: 12, paddingHorizontal: 4, gap: 22, paddingBottom: 16 },
  professionalForm: { gap: 14, paddingTop: 8, paddingBottom: 12 },
  title: { color: colors.navy, fontSize: 18, lineHeight: 24, fontWeight: '700', marginBottom: 2 },
  field: { gap: 8 },
  label: { color: colors.navy, fontSize: 13 },
  input: { minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: '#D8E3EB', paddingHorizontal: 12, paddingVertical: 10, color: colors.navy, fontSize: 13, backgroundColor: 'white' },
  select: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, borderWidth: 1, borderColor: '#D8E3EB', paddingHorizontal: 12, backgroundColor: 'white' },
  value: { color: colors.navy, fontSize: 13, flex: 1 },
  placeholder: { color: colors.muted },
  professionalTypes: { flexDirection: 'row', borderRadius: 12, backgroundColor: '#E7EEF4', padding: 2 },
  typeButton: { flex: 1, minHeight: 40, borderRadius: 10, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  activeType: { backgroundColor: 'white', borderColor: '#88CED5' },
  typeLabel: { color: colors.muted, fontSize: 12 },
  activeTypeLabel: { color: colors.tealDark, fontWeight: '600' },
  kinds: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  kindButton: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 3 },
  kindIcon: { width: 54, height: 54, borderRadius: 12, backgroundColor: '#F0F5F8', alignItems: 'center', justifyContent: 'center' },
  selectedKind: { backgroundColor: '#DDF3F1' },
  kindCheck: { position: 'absolute', right: 3, bottom: 3, backgroundColor: '#DDF3F1', borderRadius: 7 },
  kindLabel: { color: colors.navy, fontSize: 12 },
  save: { alignSelf: 'center', minHeight: 44, width: '100%', maxWidth: 214, borderRadius: 24, backgroundColor: colors.tealDark, alignItems: 'center', justifyContent: 'center', marginTop: 10, paddingHorizontal: 20 },
  saveText: { color: 'white', fontSize: 13, fontWeight: '600' },
  dimmed: { opacity: 0.6 },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18 },
});
