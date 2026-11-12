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
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAppStore } from './src/state/store';
import { colors, Icon } from './src/components/ui';
import HomeToolbar, { TOOLBAR_HEIGHT } from './src/components/HomeToolbar';
import MedicationFolderIcon from './src/components/MedicationFolderIcon';
import { dateLabel, localDateTime } from './src/domain/dates';

export default function KliniApp() {
  const { state, ready, storageError } = useAppStore();
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [attachmentHeight, setAttachmentHeight] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const pager = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const today = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const { home, profileSelection } = useLocalSearchParams<{ home?: string; profileSelection?: string }>();
  const handledSelection = useRef<string | undefined>(undefined);
  const [page, setPage] = useState(0);
  useEffect(() => {
    if (!ready || home !== 'today' || !profileSelection || handledSelection.current === profileSelection) return;
    handledSelection.current = profileSelection;
    pager.current?.scrollTo({ x: 0, animated: false });
    today.current?.scrollTo({ y: 0, animated: false });
    setPage(0);
  }, [ready, home, profileSelection]);
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
  const topLogoWidth = Math.min(78, Math.max(0, (contentWidth - 180) / 2 - 24 - 4));
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
      surface: '#F1F8F9',
      action: () => setRoute({ name: 'agenda' }),
    },
    {
      label: 'Directorio\nmédico',
      name: 'doctor',
      surface: colors.navy,
      action: book,
    },
    {
      label: 'Teleconsulta',
      name: 'video',
      surface: '#00A9AE',
      action: () => setRoute({ name: 'teleconsult' }),
    },
    {
      label: 'Seguro\nmédico',
      name: 'shield',
      surface: '#D9F2F0',
      action: () => setRoute({ name: 'insurance' }),
    },
  ];
  return (
    <View style={s.app}>
      <StatusBar style="dark" />
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={[s.phone, { maxWidth: 540 }]}>
          <View style={[s.homeLayout, { paddingBottom: TOOLBAR_HEIGHT + attachmentHeight }]} accessibilityElementsHidden={overlayOpen} importantForAccessibility={overlayOpen ? 'no-hide-descendants' : 'auto'}>
            <View style={s.topNavigation} testID="home-top-navigation">
              <Image testID="home-top-logo" source={require('./assets/klini-logo.png')} accessibilityLabel="Klini" resizeMode="contain" style={[s.logo, s.topLogo, { width: topLogoWidth }]} />
              <View style={s.dock}>
                {['Hoy', 'Archivo'].map((title, index) => <Pressable key={title} testID={index === 0 ? 'home-tab-today' : 'home-tab-archive'} accessibilityRole="tab" accessibilityState={{ selected: page === index }} aria-selected={page === index} accessibilityLabel={title} onPress={() => changePage(index)} style={s.dockTab}>
                  <Text style={[s.dockText, { fontWeight: page === index ? '700' : '400' }]}>{title}</Text>
                  <View style={[s.activeDot, { opacity: page === index ? 1 : 0 }]} />
                </Pressable>)}
              </View>
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
                <ScrollView key={index} ref={index === 0 ? today : undefined} style={{ width: contentWidth }} contentContainerStyle={s.pageContent} showsVerticalScrollIndicator={false} nestedScrollEnabled accessibilityElementsHidden={page !== index} importantForAccessibility={page !== index ? 'no-hide-descendants' : 'auto'} testID={index === 0 ? 'home-today-page' : 'home-archive-page'}>
                  <Text accessibilityRole="header" style={[s.hero, { marginTop: compact ? 12 : 20, fontSize: Math.min(compact ? 62 : 86, (contentWidth - 50) * .225), lineHeight: Math.min(compact ? 65 : 90, (contentWidth - 50) * .235) }]}>
                    Tu{`\n`}{index === 0 ? 'atención' : 'archivo'}<Text style={{ color: colors.teal }}>.</Text>
                  </Text>
                  <View style={[s.modules, { marginTop: compact ? 24 : 36 }]}>
                    {index === 0 ? modules.map((m, i) => (
                      <Pressable key={m.label} accessibilityRole="button" accessibilityLabel={m.label.replace('\n', ' ')} testID={['menu-agenda', 'menu-directory', 'menu-teleconsult', 'menu-insurance'][i]} onPress={m.action} style={({ pressed }) => [s.module, { opacity: pressed ? .65 : 1 }]}>
                        <View style={{ height: iconSize + 16, justifyContent: 'center' }} accessible={false} importantForAccessibility="no-hide-descendants">
                          <View testID={`home-${m.name}-icon`} style={[s.attentionIcon, { width: iconSize, height: iconSize, backgroundColor: m.surface }]}>
                            {i === 0 ? <View style={s.iconLayers}>
                              <Icon name="calendar-clear-outline" size={iconSize * .61} color={colors.teal} />
                              <Text style={[s.calendarDay, { top: iconSize * .235, fontSize: iconSize * .25, lineHeight: iconSize * .3 }]}>28</Text>
                            </View> : i === 1 ? <FontAwesome name="stethoscope" size={iconSize * .53} color="white" />
                              : i === 2 ? <Icon name="video" size={iconSize * .61} color="white" />
                                : <View style={s.iconLayers}>
                                  <Icon name="shield-outline" size={iconSize * .69} color={colors.navy} />
                                  <View style={s.shieldCheck}><Icon name="check" size={iconSize * .32} color={colors.teal} /></View>
                                </View>}
                          </View>
                        </View>
                        <Text style={[s.moduleLabel, { fontSize: contentWidth < 360 ? 9 : 11 }]}>{m.label}</Text>
                      </Pressable>
                    )) : [
                      { label: 'Historial', icon: 'folder', colors: ['#FFFFFF', '#E4F5F5'] as const, ink: colors.teal, action: () => archive({ archiveTab: 'history' }) },
                      { label: 'Medicamentos', icon: 'folder', colors: ['#193F62', '#082441'] as const, ink: 'white', action: () => archive({ archiveTab: 'medications' }) },
                      { label: 'Alertas', icon: 'notifications', colors: ['#12C4C8', '#00989E'] as const, ink: 'white', action: () => setRoute({ name: 'alerts' }) },
                      { label: 'Parámetros\ncorporales', icon: 'watch-outline', colors: ['#EAFFFC', '#CFF1EE'] as const, ink: colors.navy, action: () => setRoute({ name: 'body-parameters' }) },
                    ].map((m, i) => <Pressable key={m.label} testID={['menu-history', 'menu-medications', 'menu-alerts', 'menu-records'][i]} accessibilityRole="button" accessibilityLabel={m.label.replace('\n', ' ')} onPress={m.action} style={({ pressed }) => [s.module, { opacity: pressed ? .65 : 1 }]}>
                      <View style={{ height: iconSize + 16, justifyContent: 'center' }}>{i === 3 ? <Image source={require('./assets/home-body-parameters.png')} style={{ width: iconSize + 6, height: iconSize + 6 }} resizeMode="contain" accessible={false} /> : <LinearGradient colors={m.colors} style={[s.appIcon, { width: iconSize, height: iconSize, borderRadius: 14 }]}>{i === 1 ? <MedicationFolderIcon size={iconSize * .62} color={m.ink} /> : <Icon name={m.icon} size={iconSize * .58} color={m.ink} />}</LinearGradient>}</View>
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
            {page === 0 && <View style={s.fixedBottom} testID="home-fixed-bottom">
              <Pressable testID="home-context" accessibilityRole="button" accessibilityLabel="Ver próxima cita en agenda" onPress={() => setRoute({ name: 'agenda' })} style={s.nextAppointment}>
                <Text style={s.eyebrow}>PRÓXIMA CITA</Text>
                <Text style={s.nextDate}>{next ? `${dateLabel(next.date)} · ${next.time} h` : 'Tu tiempo, a tu ritmo'}</Text>
                <Text numberOfLines={2} style={s.nextDoctor}>{next ? `${doctor?.name || 'Tu especialista'} · ${next.mode}` : 'Encuentra un especialista y reserva tu cita.'}</Text>
              </Pressable>
            </View>}
          </View>
          <HomeToolbar key={state.profile.id} onOverlayChange={setOverlayOpen} onAttachmentHeightChange={setAttachmentHeight} onRegister={() => setRoute({ name: 'register' })} />
        </View>
      </SafeAreaView>
    </View>
  );
}
const s = StyleSheet.create({
  homeLayout: { flex: 1, paddingBottom: TOOLBAR_HEIGHT },
  topNavigation: { height: TOOLBAR_HEIGHT, paddingTop: 6, alignItems: 'center' },
  topLogo: { position: 'absolute', left: 24, top: 10 },
  pager: { flex: 1 },
  pageContent: { paddingHorizontal: 25, paddingBottom: 12 },
  fixedBottom: { paddingHorizontal: 25, paddingBottom: 8 },
  app: { flex: 1, backgroundColor: 'white' },
  safe: { flex: 1 },
  phone: { flex: 1, width: '100%', alignSelf: 'center' },
  logo: {
    width: 78,
    height: 36,
  },
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
  attentionIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(8,36,65,.04)',
  },
  iconLayers: { alignItems: 'center', justifyContent: 'center' },
  calendarDay: {
    position: 'absolute',
    color: colors.teal,
    fontWeight: '600',
    textAlign: 'center',
  },
  shieldCheck: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  moduleLabel: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
    textAlign: 'center',
    color: colors.navy,
    letterSpacing: -0.3,
  },
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
  dock: {
    flexDirection: 'row',
    backgroundColor: colors.navy,
    borderRadius: 30,
    height: 44,
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
    height: 44,
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
