import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, Icon } from './ui';

/** Shared layout for saved parameters and ephemeral Apple Health readings. */
export default function BodyParameterListRow({ label, icon, value, unit, source, sourceIcon, metadata, onPress, expanded, testID, accessibilityLabel }: {
  label: string; icon: string; value: string; unit?: string; source: string;
  sourceIcon: string; metadata?: string; onPress: () => void; expanded?: boolean;
  testID: string; accessibilityLabel?: string;
}) {
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={accessibilityLabel}
    accessibilityState={expanded === undefined ? undefined : { expanded }} onPress={onPress} style={({ pressed }) => [s.row, pressed && s.pressed]}>
    <View testID={`${testID}-icon`} style={s.icon}><Icon name={icon} size={25} color={colors.teal} /></View>
    <View style={s.main}>
      <Text style={s.name}>{label}</Text>
      <View style={s.sourceLine}><Icon name={sourceIcon} size={10} color="#87A1AD" /><Text testID={`${testID}-source`} style={s.source}>{source}</Text></View>
      {!!metadata && <Text testID={`${testID}-date`} style={s.metadata}>{metadata}</Text>}
    </View>
    <View testID={`${testID}-value`} style={s.valueColumn}><Text style={s.value}>{value}{!!unit && <Text style={s.unit}> {unit}</Text>}</Text></View>
    <Icon name={expanded ? 'chevronUp' : 'chevron'} size={17} color="#6D89A0" />
  </Pressable>;
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', minHeight: 54, alignItems: 'center', gap: 9, borderBottomWidth: 1, borderBottomColor: '#EDF4F8', paddingVertical: 9 },
  icon: { width: 29, alignItems: 'center', flexShrink: 0 },
  main: { flex: 1, minWidth: 0 }, name: { color: colors.navy, fontSize: 13, fontWeight: '700' },
  sourceLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 3, marginTop: 4 },
  source: { color: '#8AA0B2', fontSize: 9, flexShrink: 1, lineHeight: 13 },
  metadata: { color: '#8AA0B2', fontSize: 9, lineHeight: 13, marginTop: 2 },
  valueColumn: { maxWidth: '40%', flexShrink: 1, alignItems: 'flex-end' },
  value: { fontSize: 14, color: '#8192A8', textAlign: 'right' }, unit: { fontSize: 10, color: '#8192A8' },
  pressed: { opacity: .65 },
});
