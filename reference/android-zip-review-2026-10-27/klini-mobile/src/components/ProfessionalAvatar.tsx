import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from './ui';

/** Decorative profession marker. Identity review status is shown separately in the row. */
export default function ProfessionalAvatar({ initials, testID }: { initials: string; testID: string }) {
  return <View testID={testID} pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={s.root}>
    <View style={s.disc}><Text style={s.initials}>{initials}</Text></View>
    <View style={s.tubing} />
    <View style={[s.earpiece, s.leftEarpiece]} />
    <View style={[s.earpiece, s.rightEarpiece]} />
    <View style={s.diaphragm}><View style={s.diaphragmCenter} /></View>
  </View>;
}

const s = StyleSheet.create({
  root: { width: 44, height: 44, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  disc: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#E2F7F4', alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.tealDark, fontSize: 11, fontWeight: '600' },
  tubing: { position: 'absolute', width: 38, height: 38, left: 3, top: 3, borderRadius: 19, borderWidth: 1.3, borderColor: colors.teal, borderTopColor: 'transparent' },
  earpiece: { position: 'absolute', top: 6.5, width: 4.5, height: 4.5, borderRadius: 2.25, borderWidth: 1.2, borderColor: colors.teal, backgroundColor: 'white' },
  leftEarpiece: { left: 6.5 },
  rightEarpiece: { right: 6.5 },
  diaphragm: { position: 'absolute', right: 3, bottom: 3, width: 9, height: 9, borderRadius: 4.5, borderWidth: 1.3, borderColor: colors.teal, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  diaphragmCenter: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.teal },
});
