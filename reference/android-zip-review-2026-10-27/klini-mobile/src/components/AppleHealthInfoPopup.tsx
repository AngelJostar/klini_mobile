import React, { useEffect } from 'react';
import Constants from 'expo-constants';
import { BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { appleHealthUnavailable } from '../services/appleHealth';
import { expoGoHealthMessage } from '../services/appleHealthErrors';
import { colors, Icon } from './ui';

export default function AppleHealthInfoPopup({ onClose }: { onClose: () => void }) {
  const { height } = useWindowDimensions();
  const isExpoGo = Constants.executionEnvironment === 'storeClient';
  const availability = Platform.OS !== 'ios' ? appleHealthUnavailable : isExpoGo ? expoGoHealthMessage
    : 'Pasos muestra el total del día local consolidado por Salud; hoy es parcial. Actividad y sueño muestran el último intervalo registrado, no totales diarios ni de una noche. La fuente puede ser el reloj, el iPhone u otra app. Cambia o revoca permisos en Salud → perfil → Apps → Klini.';

  useEffect(() => {
    const back = Platform.OS === 'android' ? BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; }) : undefined;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopImmediatePropagation(); onClose();
    };
    if (Platform.OS === 'web') window.addEventListener('keydown', escape, true);
    return () => { back?.remove(); if (Platform.OS === 'web') window.removeEventListener('keydown', escape, true); };
  }, [onClose]);

  return <View testID="apple-health-info-overlay" style={s.overlay}>
    <Pressable testID="apple-health-info-backdrop" accessibilityRole="button" accessibilityLabel="Cerrar información de Apple Salud" onPress={onClose} style={StyleSheet.absoluteFill} />
    <View testID="apple-health-info-popup" role="dialog" accessibilityLabel="Información de Apple Salud" accessibilityViewIsModal style={s.card}>
      <View style={s.header}>
        <View style={s.badge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Icon name="heartFilled" size={25} color="#F36B88" /></View>
        <Text accessibilityRole="header" style={s.title}>Apple Salud</Text>
        <Pressable testID="apple-health-info-close" accessibilityRole="button" accessibilityLabel="Cerrar información de Apple Salud" onPress={onClose} style={s.close}><Icon name="close" size={20} color="#7D94A8" /></Pressable>
      </View>
      <ScrollView style={[s.scroll, { maxHeight: Math.min(320, Math.max(96, height - 196)) }]} contentContainerStyle={s.content} showsVerticalScrollIndicator>
        <View style={s.information}>
          <View style={s.infoIcon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Icon name="info" size={19} color={colors.teal} /></View>
          <View style={s.paragraphs}>
            <Text style={s.text}>Consulta voluntaria del iPhone. Elige categorías; Apple te permitirá autorizar cada una. Solo lectura, sin envío al servidor ni a Klini IA. Solo se conserva la selección. Las mediciones permanecen temporalmente en esta pantalla. Se actualizan automáticamente al abrir Parámetros, al volver a Klini y mientras esté activa: dependen de la sincronización de Salud, sin garantía de tiempo real ni lectura en segundo plano.</Text>
            <Text style={s.text}>{availability}</Text>
            <Text testID="apple-health-installed-build" style={s.text}>{Platform.OS === 'ios' && !isExpoGo ? `Compilación instalada: ${Constants.platform?.ios?.buildNumber ?? 'no disponible'}` : 'La versión nativa se identifica en la app instalada en iPhone.'}</Text>
            <Text style={s.text}>La selección de categorías no confirma que Apple haya concedido permiso. Si no hay lectura, comprueba los datos y permisos de esa categoría en Salud del iPhone. Actividad del reloj no requiere una conexión separada, y no demuestra que existan registros de sueño.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  </View>;
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 110, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: 'rgba(8,36,65,.32)' },
  card: { width: '100%', maxWidth: 350, maxHeight: '100%', flexShrink: 1, backgroundColor: colors.white, borderRadius: 16, padding: 16, boxShadow: '0 8px 28px rgba(8,36,65,.14)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  badge: { width: 38, height: 38, borderRadius: 11, borderWidth: 1, borderColor: '#EEF2F5', backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, minWidth: 0, color: colors.navy, fontSize: 18, lineHeight: 24, fontWeight: '700' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexShrink: 1 }, content: { paddingBottom: 1 },
  information: { flexDirection: 'row', gap: 10, borderRadius: 12, padding: 14, backgroundColor: '#EDF8F8' },
  infoIcon: { paddingTop: 1 }, paragraphs: { flex: 1, minWidth: 0, gap: 12 },
  text: { color: colors.navy, fontSize: 13, lineHeight: 19 },
});
