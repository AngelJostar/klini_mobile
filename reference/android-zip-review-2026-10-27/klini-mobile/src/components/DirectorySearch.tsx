import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, Icon } from './ui';
import type { Doctor } from '../domain/types';

const countries = ['🇲🇽 México', '🇺🇸 Estados Unidos', '🇨🇴 Colombia', '🇪🇸 España', '🇦🇷 Argentina'];
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
type Props = {
  doctors: Doctor[];
  country: string;
  setCountry: (value: string) => void;
  city: string;
  setCity: (value: string) => void;
  specialty: string;
  setSpecialty: (value: string) => void;
  insurer: string;
  setInsurer: (value: string) => void;
  query: string;
  setQuery: (value: string) => void;
};
export default function DirectorySearch(p: Props) {
  const [open, setOpen] = useState<string | null>('country');
  const [search, setSearch] = useState('');
  const cities = p.country === 'México' ? [...new Set(p.doctors.map((d) => d.city))].sort() : [];
  const specialties = [...new Set(p.doctors.map((d) => d.specialty))].sort();
  const insurers = [...new Set(p.doctors.flatMap((d) => d.insurers))].sort();
  const toggle = (key: string) => {
    setSearch('');
    setOpen(open === key ? null : key);
  };
  function field(
    key: string,
    label: string,
    value: string,
    placeholder: string,
    options: string[],
    choose: (value: string) => void,
    optional = false,
  ) {
    return (
      <View style={s.field}>
        <Pressable
          testID={`directory-${key}`}
          accessibilityRole="button"
          accessibilityState={{ expanded: open === key }}
          onPress={() => toggle(key)}
          style={s.trigger}
        >
          <View style={s.flex}>
            <Text style={s.label}>
              {label}
              {optional && <Text style={s.optional}> · Opcional</Text>}
            </Text>
            <Text style={[s.value, !value && s.placeholder]}>{value || placeholder}</Text>
          </View>
          <Icon name={open === key ? 'chevronUp' : 'chevronRight'} size={18} color={colors.muted} />
        </Pressable>
        {open === key && (
          <View style={s.dropdown}>
            <View style={s.search}>
              <Icon name="search" size={16} color={colors.muted} />
              <TextInput
                testID={`directory-${key}-search`}
                accessibilityLabel={`Buscar ${label.toLowerCase()}`}
                value={search}
                onChangeText={setSearch}
                placeholder={`Buscar ${label.toLowerCase()}`}
                placeholderTextColor={colors.muted}
                style={s.input}
              />
            </View>
            <ScrollView
              style={{ maxHeight: 180 }}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {key !== 'country' && (
                <Pressable
                  onPress={() => {
                    choose('');
                    setOpen(null);
                  }}
                  style={s.option}
                >
                  <Text style={s.optionText}>
                    {key === 'city'
                      ? 'Todas las ciudades'
                      : key === 'specialty'
                        ? 'Todas las especialidades'
                        : 'Cualquier aseguradora'}
                  </Text>
                </Pressable>
              )}
              {options
                .filter((option) => normalize(option).includes(normalize(search)))
                .map((option) => (
                  <Pressable
                    key={option}
                    testID={`directory-option-${option}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: value === option }}
                    onPress={() => {
                      choose(option);
                      setOpen(null);
                      setSearch('');
                    }}
                    style={[s.option, value === option && s.chosen]}
                  >
                    <Text style={s.optionText}>{option}</Text>
                    {value === option && <Icon name="check" color={colors.teal} size={18} />}
                  </Pressable>
                ))}
              {!options.filter((option) => normalize(option).includes(normalize(search)))
                .length && (
                <Text style={s.empty}>
                  {key === 'city' && p.country !== 'México'
                    ? 'Aún no hay ciudades disponibles en este país.'
                    : 'Sin resultados'}
                </Text>
              )}
            </ScrollView>
          </View>
        )}
      </View>
    );
  }
  return (
    <View>
      {field(
        'country',
        'País',
        countries.find((c) => c.endsWith(p.country)) ?? p.country,
        'Selecciona país',
        countries,
        (value) => {
          p.setCountry(value.slice(5));
          p.setCity('');
        },
      )}
      {field('city', 'Ciudad', p.city, 'Selecciona ciudad', cities, p.setCity)}
      {field(
        'specialty',
        'Especialidad',
        p.specialty,
        'Todas las especialidades',
        specialties,
        p.setSpecialty,
        true,
      )}
      {field(
        'insurer',
        'Aseguradora',
        p.insurer,
        'Selecciona aseguradora',
        insurers,
        p.setInsurer,
        true,
      )}
      <View style={s.field}>
        <Text style={s.label}>
          Nombre del médico<Text style={s.optional}> · Opcional</Text>
        </Text>
        <View style={s.nameInput}>
          <Icon name="search" size={17} color={colors.muted} />
          <TextInput
            testID="booking-search"
            accessibilityLabel="Nombre del médico"
            placeholder="Escribe su nombre"
            placeholderTextColor="#94A5B7"
            value={p.query}
            onChangeText={p.setQuery}
            style={s.input}
          />
        </View>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  flex: { flex: 1 },
  subtitle: { color: colors.muted, fontSize: 14, marginBottom: 14 },
  field: { borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 9 },
  trigger: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 12, fontWeight: '600', color: colors.navy },
  optional: { fontWeight: '400', color: colors.tealDark, fontSize: 11 },
  value: { fontSize: 14, color: colors.navy, marginTop: 5 },
  placeholder: { color: '#94A5B7', fontSize: 12 },
  dropdown: {
    borderRadius: 18,
    padding: 6,
    borderWidth: 1,
    borderColor: '#EDF1F5',
    backgroundColor: 'white',
    marginTop: 5,
    boxShadow: '0px 4px 16px rgba(8,36,65,.08)',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F7FA',
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    color: colors.navy,
    fontSize: 12,
    paddingHorizontal: 8,
  },
  option: {
    minHeight: 40,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
  },
  chosen: { backgroundColor: '#EAF7F8' },
  optionText: { color: colors.navy, fontSize: 12 },
  empty: { color: colors.muted, padding: 12, fontSize: 12 },
  nameInput: { flexDirection: 'row', alignItems: 'center' },
});
