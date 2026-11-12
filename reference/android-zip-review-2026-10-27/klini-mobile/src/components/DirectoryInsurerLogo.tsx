import React from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { directoryInsurers, type DirectoryInsurerId } from '../domain/directoryInsurers';
import { colors, Icon } from './ui';

const logos: Record<DirectoryInsurerId, ImageSourcePropType> = {
  allianz: require('../../assets/insurers/allianz.png'),
  axa: require('../../assets/insurers/axa.png'),
  bupa: require('../../assets/insurers/bupa.png'),
  gnp: require('../../assets/insurers/gnp.png'),
  mapfre: require('../../assets/insurers/mapfre.png'),
  metlife: require('../../assets/insurers/metlife.png'),
  'plan-seguro': require('../../assets/insurers/plan-seguro.png'),
  atlas: require('../../assets/insurers/atlas.png'),
  banorte: require('../../assets/insurers/banorte.png'),
  inbursa: require('../../assets/insurers/inbursa.png'),
  monterrey: require('../../assets/insurers/monterrey.png'),
  zurich: require('../../assets/insurers/zurich.png'),
};

export default function DirectoryInsurerLogo({ name }: { name: string }) {
  const insurer = directoryInsurers.find(item => item.name === name);
  return <View accessible={false} style={[s.tile, insurer?.id === 'banorte' && s.darkTile]}>
    {insurer ? <Image testID={`directory-insurer-logo-${insurer.id}`} accessible={false} source={logos[insurer.id]} resizeMode="contain" style={s.logo} /> : <Icon name="shield" size={23} color={colors.muted} />}
  </View>;
}

const s = StyleSheet.create({
  tile: { width: 64, height: 40, flexShrink: 0, borderRadius: 10, borderWidth: 1, borderColor: '#E4EBF0', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', padding: 4 },
  logo: { width: '100%', height: '100%' },
  darkTile: { backgroundColor: colors.navy, borderColor: colors.navy },
});
