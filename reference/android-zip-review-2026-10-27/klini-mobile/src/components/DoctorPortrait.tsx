import React from 'react';
import { Image, ImageSourcePropType } from 'react-native';
import { Avatar } from './ui';
import type { Doctor } from '../domain/types';
const photos: Record<string, ImageSourcePropType> = {
  'doctor-elena': require('../../assets/doctor-elena.png'),
  'doctor-ana': require('../../assets/doctor-ana.png'),
  'doctor-daniel': require('../../assets/doctor-daniel.png'),
  'doctor-lucia': require('../../assets/doctor-lucia.png'),
  'doctor-mateo': require('../../assets/doctor-mateo.png'),
};
export default function DoctorPortrait({ doctor, size = 48 }: { doctor: Doctor; size?: number }) {
  return photos[doctor.id] ? (
    <Image
      source={photos[doctor.id]}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    />
  ) : (
    <Avatar doctor={doctor} size={size} />
  );
}
