import React, { useRef } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, Icon } from './ui';
import { useDirectoryOptions, type DirectoryFilterMode, type DirectoryOptionField } from './DirectoryOptionsProvider';
import type { Doctor } from '../domain/types';
import { directoryInsurers } from '../domain/directoryInsurers';

const countries = ['🇲🇽 México', '🇺🇸 Estados Unidos', '🇨🇴 Colombia', '🇪🇸 España', '🇦🇷 Argentina'];
const normalizeInsurer = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
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

function DirectoryField({ field, label, value, placeholder, options, onSelect, optional, allLabel, emptyMessage, optionPrefix }: {
  field: DirectoryOptionField;
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  onSelect: (value: string) => void;
  optional?: boolean;
  allLabel?: string;
  emptyMessage?: string;
  optionPrefix?: string;
}) {
  const picker = useDirectoryOptions();
  const trigger = useRef<React.ComponentRef<typeof View>>(null);
  return <View style={s.field}>
    <Pressable
      ref={trigger}
      testID={`directory-${field}`}
      accessibilityRole="button"
      accessibilityState={{ expanded: picker.active === field }}
      aria-expanded={picker.active === field}
      onPress={() => picker.open({ kind: 'options', field, label, value, options, optionPrefix, allLabel, emptyMessage, onSelect, restoreNativeFocus: () => { if (trigger.current) AccessibilityInfo.sendAccessibilityEvent(trigger.current, 'focus'); } })}
      style={s.trigger}
    >
      <View style={s.flex}>
        <Text style={s.label}>{label}{optional && <Text style={s.optional}> · Opcional</Text>}</Text>
        <Text style={[s.value, !value && s.placeholder]}>{value || placeholder}</Text>
      </View>
      <Icon name="chevronRight" size={18} color={colors.muted} />
    </Pressable>
  </View>;
}

export default function DirectorySearch(p: Props) {
  const countryFlag = countries.find(country => country.endsWith(p.country))?.split(' ')[0];
  const cities = p.country === 'México' ? [...new Set(p.doctors.map(d => d.city))].sort() : [];
  const specialties = [...new Set(p.doctors.map(d => d.specialty))].sort();
  const catalogNames: string[] = directoryInsurers.map(insurer => insurer.name);
  const seenInsurers = new Set(catalogNames.map(normalizeInsurer));
  const otherInsurers = p.doctors.flatMap(d => d.insurers).filter(name => {
    const key = normalizeInsurer(name);
    if (seenInsurers.has(key)) return false;
    seenInsurers.add(key);
    return true;
  }).sort();
  const insurers = [...catalogNames, ...otherInsurers];
  return <View>
    <DirectoryField field="country" label="País" value={countries.find(c => c.endsWith(p.country)) ?? p.country} placeholder="Selecciona país" options={countries} onSelect={value => { p.setCountry(value.slice(5)); p.setCity(''); }} />
    <DirectoryField field="city" label="Ciudad" value={p.city} placeholder="Selecciona ciudad" options={cities} optionPrefix={countryFlag} onSelect={p.setCity} allLabel="Todas las ciudades" emptyMessage={p.country !== 'México' ? 'Aún no hay ciudades disponibles en este país.' : undefined} />
    <DirectoryField field="specialty" label="Especialidad" value={p.specialty} placeholder="Todas las especialidades" options={specialties} onSelect={p.setSpecialty} optional allLabel="Todas las especialidades" />
    <DirectoryField field="insurer" label="Aseguradora" value={p.insurer} placeholder="Selecciona aseguradora" options={insurers} onSelect={p.setInsurer} optional allLabel="Cualquier aseguradora" />
    <View style={s.field}>
      <Text style={s.label}>Nombre del médico<Text style={s.optional}> · Opcional</Text></Text>
      <View style={s.nameInput}>
        <Icon name="search" size={17} color={colors.muted} />
        <TextInput testID="booking-search" accessibilityLabel="Nombre del médico" placeholder="Escribe su nombre" placeholderTextColor="#94A5B7" value={p.query} onChangeText={p.setQuery} style={s.input} />
      </View>
    </View>
  </View>;
}

export function DirectoryMoreFilters({ mode, onlyFavorites, onApply }: { mode: DirectoryFilterMode; onlyFavorites: boolean; onApply: (mode: DirectoryFilterMode, favorites: boolean) => void }) {
  const picker = useDirectoryOptions();
  const trigger = useRef<React.ComponentRef<typeof View>>(null);
  const count = Number(mode !== 'Todas') + Number(onlyFavorites);
  return <Pressable ref={trigger} testID="directory-more-filters" accessibilityRole="button" accessibilityState={{ expanded: picker.active === 'filters' }} aria-expanded={picker.active === 'filters'} onPress={() => picker.open({ kind: 'filters', mode, onlyFavorites, onApply, restoreNativeFocus: () => { if (trigger.current) AccessibilityInfo.sendAccessibilityEvent(trigger.current, 'focus'); } })} style={s.moreFilters}>
    <Text style={s.moreText}>Más filtros{count ? ` · ${count}` : ''}</Text>
  </Pressable>;
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  field: { borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 9 },
  trigger: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 12, fontWeight: '600', color: colors.navy },
  optional: { fontWeight: '400', color: colors.tealDark, fontSize: 11 },
  value: { fontSize: 14, color: colors.navy, marginTop: 5 },
  placeholder: { color: '#94A5B7', fontSize: 12 },
  input: { flex: 1, minWidth: 0, minHeight: 40, color: colors.navy, fontSize: 12, paddingHorizontal: 8 },
  nameInput: { flexDirection: 'row', alignItems: 'center' },
  moreFilters: { minHeight: 44, alignSelf: 'stretch', justifyContent: 'center' },
  moreText: { color: colors.tealDark, fontSize: 14, fontWeight: '600' },
});
