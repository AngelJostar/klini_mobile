import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, Icon } from './ui';

export default function BookingFooterButton({ title, onPress, disabled = false, icon, testID }: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: string;
  testID?: string;
}) {
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={title}
    accessibilityState={{ disabled }}
    disabled={disabled}
    testID={testID}
    hitSlop={5}
    onPress={onPress}
    style={({ pressed }) => [s.button, { opacity: disabled ? .38 : pressed ? .75 : 1 }]}
  >
    {icon && <Icon name={icon} size={15} color={colors.tealDark} />}
    <Text style={s.label}>{title}</Text>
  </Pressable>;
}

const s = StyleSheet.create({
  button: { alignSelf: 'center', maxWidth: '100%', minHeight: 34, borderRadius: 20, backgroundColor: '#DDF5F2', paddingHorizontal: 18, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  label: { color: colors.tealDark, fontSize: 11, fontWeight: '500', textAlign: 'center', flexShrink: 1 },
});
