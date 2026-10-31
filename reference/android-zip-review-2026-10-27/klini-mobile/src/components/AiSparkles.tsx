import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function AiSparkles({ small = false }: { small?: boolean }) {
  return <View accessible={false} style={[s.mark, small && s.small]}>
    <Text style={[s.blue, small && s.smallBlue]}>✦</Text>
    <Text style={[s.gold, small && s.smallGold]}>✦</Text>
  </View>;
}

const s = StyleSheet.create({
  mark: { width: 24, height: 24, flexDirection: 'row', alignItems: 'center' },
  blue: { color: '#268AFF', fontSize: 23, lineHeight: 25 },
  gold: { color: '#F2C445', fontSize: 13, marginTop: -9, marginLeft: -3 },
  small: { width: 20, height: 20 },
  smallBlue: { fontSize: 19, lineHeight: 22 },
  smallGold: { fontSize: 11 },
});
