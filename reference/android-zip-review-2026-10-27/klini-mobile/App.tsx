import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from './src/state/store';
import { colors, Icon } from './src/components/ui';
import HomeToolbar, { TOOLBAR_HEIGHT } from './src/components/HomeToolbar';
import { dateLabel, localDateTime } from './src/domain/dates';

export default function KliniApp() {
  const { state, ready, storageError, profileKind } = useAppStore();
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const pager = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [page, setPage] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); });
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; listener.remove(); };
  }, []);
  const setRoute = (destination: { name: string }) =>
    router.push({ pathname: '/[section]', params: { section: destination.name } });
  const { width, height } = useWindowDimensions();
  const compact = height < 740;
  const contentWidth = Math.min(width, 540);
  const iconSize = Math.min(68, (contentWidth - 80) / 4);
  const changePage = (index: number) => {
    pager.current?.scrollTo({ x: index * contentWidth, animated: !reduceMotion });
    setPage(index);
  };
  const archive = (params: Record<string, string> = {}) => router.push({ pathname: '/[section]', params: { section: 'archive', ...params } });
  const book = () => setRoute({ name: 'directory' });
  const next = state.appointments
    .filter((a) => a.status === 'scheduled' && localDateTime(a.date, a.time).getTime() >= now)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
  const doctor = state.doctors.find((d) => d.id === next?.doctorId);
  if (!ready)
    return (
      <View style={s.loading}>
        <Image source={require('./assets/klini-logo.png')} accessibilityLabel="Klini" resizeMode="contain" style={s.logo} />
        <ActivityIndicator color={colors.teal} />
        <Text style={s.caption}>Preparando tu espacio</Text>
      </View>
    );
  const modules = [
    {
      label: 'Agenda',
      name: 'calendar',
      gradient: ['#FFFFFF', '#F1F8FA'],
      action: () => setRoute({ name: 'agenda' }),
    },
    {
      label: 'Directorio\nmédico',
      name: 'doctor',
      gradient: ['#193F62', '#082441'],
      action: book,
    },
    {
      label: 'Teleconsulta',
      name: 'video',
      gradient: ['#12C4C8', '#00989E'],
      action: () => setRoute({ name: 'teleconsult' }),
    },
    {
      label: 'Seguro\nmédico',
      name: 'shield',
      gradient: ['#EAFFFC', '#CFF1EE'],
      action: () => setRoute({ name: 'insurance' }),
    },
  ];
  return (
    <View style={s.app}>
      <StatusBar style="dark" />
      <LinearGradient colors={['#FFFFFF', '#FFFFFF', '#F8FCFD']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={[s.phone, { maxWidth: 540 }]}>
          <View style={s.homeLayout} accessibilityElementsHidden={overlayOpen} importantForAccessibility={overlayOpen ? 'no-hide-descendants' : 'auto'}>
            <View style={s.fixedHeader} testID="home-fixed-logo">
              <Image source={require('./assets/klini-logo.png')} accessibilityLabel="Klini" resizeMode="contain" style={s.logo} />
            </View>
            {storageError && <Text style={s.storageError}>{storageError}</Text>}
            <ScrollView
              ref={pager}
              testID="home-pager"
              horizontal
              pagingEnabled
              directionalLockEnabled
              decelerationRate="fast"
              bounces={false}
              showsHorizontalScrollIndicator={false}
              scrollEnabled={!overlayOpen}
              style={s.pager}
              onLayout={() => pager.current?.scrollTo({ x: page * contentWidth, animated: false })}
              onScroll={({ nativeEvent }) => setPage(Math.max(0, Math.min(1, Math.round(nativeEvent.contentOffset.x / contentWidth))))}
              scrollEventThrottle={16}
            >
              {[0, 1].map(index => (
                <ScrollView key={index} style={{ width: contentWidth }} contentContainerStyle={s.pageContent} showsVerticalScrollIndicator={false} nestedScrollEnabled accessibilityElementsHidden={page !== index} importantForAccessibility={page !== index ? 'no-hide-descendants' : 'auto'} testID={index === 0 ? 'home-today-page' : 'home-archive-page'}>
                  <Text testID={page === index ? 'home-profile-name' : undefined} style={s.patient}>{state.profile.name}</Text>
                  {profileKind !== 'Perfil principal' && <Text style={{ color: colors.tealDark, fontSize: 11, marginTop: 4 }}>{profileKind === 'Niño' || profileKind === 'Niña' ? 'Perfil infantil' : profileKind}</Text>}
                  <Text accessibilityRole="header" style={[s.hero, { marginTop: compact ? 12 : 20, fontSize: Math.min(compact ? 62 : 86, (contentWidth - 50) * .225), lineHeight: Math.min(compact ? 65 : 90, (contentWidth - 50) * .235) }]}>
                    Tu{`\n`}{index === 0 ? 'atención' : 'archivo'}<Text style={{ color: colors.teal }}>.</Text>
                  </Text>
                  <View style={[s.modules, { marginTop: compact ? 24 : 36 }]}>
                    {index === 0 ? modules.map((m, i) => (
                      <Pressable key={m.label} accessibilityRole="button" accessibilityLabel={m.label.replace('\n', ' ')} testID={['menu-agenda', 'menu-directory', 'menu-teleconsult', 'menu-insurance'][i]} onPress={m.action} style={({ pressed }) => [s.module, { opacity: pressed ? .65 : 1 }]}>
                        <Image source={[require('./assets/home-icon-0.png'), require('./assets/home-icon-1.png'), require('./assets/home-icon-2.png'), require('./assets/home-icon-3.png')][i]} style={{ width: iconSize + 10, height: iconSize + 16 }} resizeMode="contain" accessible={false} />
                        <Text style={[s.moduleLabel, contentWidth < 360 && { fontSize: 10, lineHeight: 15 }]}>{m.label}</Text>
                      </Pressable>
                    )) : [
                      { label: 'Historial', icon: 'folder', colors: ['#FFFFFF', '#E4F5F5'] as const, ink: colors.teal, action: () => archive({ archiveTab: 'history' }) },
                      { label: 'Recetas y\nmedicamentos', icon: 'document', colors: ['#193F62', '#082441'] as const, ink: 'white', action: () => archive({ recordType: 'Receta', archiveTitle: 'Recetas y medicamentos' }) },
                      { label: 'Análisis\nclínicos', icon: 'pill', colors: ['#12C4C8', '#00989E'] as const, ink: 'white', action: () => archive({ recordType: 'Estudio', archiveTitle: 'Análisis clínicos' }) },
                      { label: 'Registros', icon: 'book', colors: ['#EAFFFC', '#CFF1EE'] as const, ink: colors.navy, action: () => archive({ archiveTitle: 'Registros' }) },
                    ].map((m, i) => <Pressable key={m.label} testID={['menu-history', 'menu-prescriptions', 'menu-medications', 'menu-records'][i]} accessibilityRole="button" accessibilityLabel={m.label} onPress={m.action} style={({ pressed }) => [s.module, { opacity: pressed ? .65 : 1 }]}>
                      <View style={{ height: iconSize + 16, justifyContent: 'center' }}><LinearGradient colors={m.colors} style={[s.appIcon, { width: iconSize, height: iconSize, borderRadius: 14 }]}><Icon name={m.icon} size={iconSize * .58} color={m.ink} /></LinearGradient></View>
                      <Text style={[s.moduleLabel, { fontSize: contentWidth < 360 ? 9 : 11 }]}>{m.label}</Text>
                    </Pressable>)}
                  </View>
                  <View style={[s.pageHintRow, index === 1 && { alignItems: 'flex-start' }]}>
                    <View style={s.pageHintColumn}>
                      <Pressable
                        testID={index === 0 ? 'home-next-page' : 'home-previous-page'}
                        accessibilityRole="button"
                        accessibilityLabel={index === 0 ? 'Ir a Archivo' : 'Volver a Tu atención'}
                        accessibilityHint={index === 0 ? 'También puedes deslizar hacia la izquierda para ver tu archivo' : 'También puedes deslizar hacia la derecha para volver a tu atención'}
                        onPress={() => changePage(index === 0 ? 1 : 0)}
                        style={s.pageHintTarget}
                      >
                        {({ pressed }) => <View style={[s.pageHintCircle, pressed && { backgroundColor: 'rgba(222,242,245,.8)' }]}>
                          <Icon name={index === 0 ? 'chevronRight' : 'chevronLeft'} size={22} color={colors.navy} />
                        </View>}
                      </Pressable>
                    </View>
                  </View>
                </ScrollView>
              ))}
            </ScrollView>
            <View style={s.fixedBottom} testID="home-fixed-bottom">
              <Pressable testID="home-context" accessibilityRole="button" accessibilityLabel={page === 0 ? 'Ver próxima cita en agenda' : 'Ver registros del archivo'} onPress={() => page === 0 ? setRoute({ name: 'agenda' }) : archive()} style={s.nextAppointment}>
                <Text style={s.eyebrow}>{page === 0 ? 'PRÓXIMA CITA' : 'TU INFORMACIÓN'}</Text>
                <Text style={s.nextDate}>{page === 0 ? (next ? `${dateLabel(next.date)} · ${next.time} h` : 'Tu tiempo, a tu ritmo') : 'Todo en un solo lugar'}</Text>
                <Text numberOfLines={2} style={s.nextDoctor}>{page === 0 ? (next ? `${doctor?.name || 'Tu especialista'} · ${next.mode}` : 'Encuentra un especialista y reserva tu cita.') : 'Selecciona una categoría para consultar tus documentos y registros.'}</Text>
              </Pressable>
              <View style={[s.homeBottom, compact && { height: 65 }]}>
                <View style={s.dock}>
                  {['Hoy', 'Archivo'].map((title, index) => <Pressable key={title} testID={index === 0 ? 'home-tab-today' : 'home-tab-archive'} accessibilityRole="tab" accessibilityState={{ selected: page === index }} accessibilityLabel={title} onPress={() => changePage(index)} style={s.dockTab}>
                    <Text style={[s.dockText, { fontWeight: page === index ? '700' : '400' }]}>{title}</Text>
                    <View style={[s.activeDot, { opacity: page === index ? 1 : 0 }]} />
                  </Pressable>)}
                </View>
                <Pressable onPress={() => setRoute({ name: 'register' })} accessibilityRole="button" accessibilityLabel="Registrar información de salud" testID="quick-register" style={({ pressed }) => [s.fabGroup, pressed && { opacity: .75 }]}>
                  <LinearGradient colors={['#15C9CC', '#00ADB2', '#009DA5']} style={s.fab}><Icon name="plus" size={32} color="white" /></LinearGradient>
                </Pressable>
              </View>
            </View>
          </View>
          <HomeToolbar onOverlayChange={setOverlayOpen} />
        </View>
      </SafeAreaView>
    </View>
  );
}
const s = StyleSheet.create({
  homeLayout: { flex: 1, marginTop: TOOLBAR_HEIGHT },
  fixedHeader: { paddingHorizontal: 25, paddingTop: 10 },
  pager: { flex: 1 },
  pageContent: { paddingHorizontal: 25, paddingBottom: 12 },
  fixedBottom: { paddingHorizontal: 25, paddingBottom: 18 },
  app: { flex: 1, backgroundColor: 'white' },
  safe: { flex: 1 },
  phone: { flex: 1, width: '100%', alignSelf: 'center' },
  homeContent: {
    paddingHorizontal: 25,
    paddingTop: 10,
    paddingBottom: 18,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    width: 100,
    height: 44,
  },
  profileButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: { fontSize: 15, letterSpacing: 1, color: '#315A7B' },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.6,
    color: '#3D6587',
    fontWeight: '500',
  },
  hero: {
    color: colors.navy,
    fontWeight: '800',
    letterSpacing: -3.8,
    marginTop: 15,
  },
  patient: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: colors.navy,
    marginTop: 15,
  },
  modules: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginHorizontal: -4,
  },
  module: { width: '25%', alignItems: 'center', gap: 10 },
  pageHintRow: { marginHorizontal: -4, marginTop: 22, alignItems: 'flex-end' },
  pageHintColumn: { width: '25%', alignItems: 'center' },
  pageHintTarget: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pageHintCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(172,213,226,.6)',
    backgroundColor: 'rgba(240,249,251,.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(8,36,65,.08)',
    boxShadow: '0 6px 12px rgba(8,36,65,0.10)',
  },
  moduleLabel: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
    textAlign: 'center',
    color: colors.navy,
    letterSpacing: -0.3,
  },
  spacer: { flex: 1, minHeight: 48 },
  nextAppointment: {
    paddingBottom: 10,
    height: 116,
  },
  nextDate: {
    fontSize: 21,
    fontWeight: '700',
    color: colors.navy,
    letterSpacing: -0.5,
    marginTop: 9,
  },
  nextDoctor: { fontSize: 13, color: '#41698B', marginTop: 7, lineHeight: 20 },
  homeBottom: {
    height: 88,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 8,
    paddingBottom: 3,
  },
  dock: {
    flexDirection: 'row',
    backgroundColor: colors.navy,
    borderRadius: 30,
    height: 49,
    width: 180,
    maxWidth: '62%',
    alignItems: 'center',
    marginLeft: 'auto',
    marginRight: 'auto',
    boxShadow: '0 4px 12px rgba(8,36,65,.09)',
  },
  dockTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 49,
    paddingTop: 5,
  },
  dockText: { color: 'white', fontSize: 13 },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.teal,
    marginTop: 5,
  },
  fabGroup: {
    position: 'absolute',
    right: 0,
    bottom: 3 + (49 - 44) / 2,
    alignItems: 'center',
    gap: 5,
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#55D4D6',
    boxShadow: '0 3px 5px rgba(8,36,65,.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRoot: { flex: 1 },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(26,52,72,.31)' },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 30,
    backgroundColor: 'white',
  },
  caption: { fontSize: 13, color: colors.muted, textAlign: 'center' },
  storageError: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.danger,
    backgroundColor: '#FFF2F3',
    padding: 10,
    borderRadius: 12,
    marginTop: 10,
  },
});
