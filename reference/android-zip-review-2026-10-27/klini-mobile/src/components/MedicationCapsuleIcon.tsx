import React from 'react';
import { View } from 'react-native';
import { colors } from './ui';

/** A simple capsule, matching the medication references rather than a bandage. */
export default function MedicationCapsuleIcon({ size = 24, color = colors.teal }: { size?: number; color?: string }) {
  return <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * .96, height: size * .44, borderWidth: 1.6, borderColor: color, borderRadius: size, alignItems: 'center', transform: [{ rotate: '-45deg' }] }}>
      <View style={{ width: 1.6, flex: 1, backgroundColor: color }} />
    </View>
  </View>;
}
