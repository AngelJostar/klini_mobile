import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from './ui';

export default function MedicationFolderIcon({ size, color }: { size: number; color: string }) {
  return <View testID="home-medication-folder-icon" accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
    <Icon name="folder" size={size} color={color} />
    <View style={[s.capsule, { left: size * .36, top: size * .47, width: size * .45, height: size * .21, borderRadius: size * .11, borderColor: color }]}>
      <View style={{ width: 1.5, height: '100%', backgroundColor: color }} />
    </View>
  </View>;
}

const s = StyleSheet.create({
  capsule: { position: 'absolute', borderWidth: 1.5, alignItems: 'center', transform: [{ rotate: '-45deg' }] },
});
