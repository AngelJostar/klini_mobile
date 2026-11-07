import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { HealthCategory } from '../domain/appleHealth';
import { colors } from './ui';

export default function AppleHealthReadAccessHelp({ categoryId }: { categoryId: HealthCategory }) {
  const steps = categoryId === 'HKQuantityTypeIdentifierStepCount';
  const sleep = categoryId === 'HKCategoryTypeIdentifierSleepAnalysis';
  return <View testID="apple-health-read-access-help" style={s.help}>
    <Text style={s.title}>Comprobar en el iPhone</Text>
    <Text style={s.text}>{steps ? '1. En Salud → Explorar → Actividad → Pasos, comprueba que haya datos de hoy. Verlos solo en el reloj no confirma que se hayan sincronizado.' : sleep ? '1. En Salud → Explorar → Sueño, comprueba que existan registros. Tener actividad o pasos no implica haber registrado sueño. Klini muestra el último segmento accesible, no un total nocturno.' : '1. Comprueba que existan registros de esta categoría en Salud del iPhone.'}</Text>
    <Text style={s.text}>2. En Salud → tu perfil → Apps (o Apps y servicios) → Klini, revisa el permiso de lectura de {steps ? 'Pasos' : sleep ? 'Sueño' : 'esta categoría'}. Seleccionarla en Klini no sustituye la autorización de Apple.</Text>
    <Text style={s.text}>3. Regresa a Klini para volver a consultar. Apple no permite distinguir permiso denegado de ausencia de datos; no se muestra cero ni una cifra de ejemplo como sustituto.</Text>
  </View>;
}
const s = StyleSheet.create({
  help: { gap: 8, marginVertical: 12, padding: 12, backgroundColor: '#F5F8FA', borderRadius: 12 },
  title: { color: colors.navy, fontSize: 13, fontWeight: '700' }, text: { color: colors.muted, fontSize: 12, lineHeight: 18 },
});
