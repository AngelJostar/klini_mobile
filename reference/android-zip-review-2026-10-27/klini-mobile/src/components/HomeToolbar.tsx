import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Easing,
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, Icon } from './ui';
import { menuItems, searchHome, type MenuItem } from '../domain/navigation';
import { useAppStore } from '../state/store';
import { hasAiAccess } from '../domain/aiSubscription';
import type { AiAction } from '../domain/kliniAi';
import AiConversation from './AiConversation';
import AiSparkles from './AiSparkles';

export const TOOLBAR_HEIGHT = 68;

export default function HomeToolbar({
  onOverlayChange,
}: {
  onOverlayChange: (open: boolean) => void;
}) {
  const { state } = useAppStore();
  const [panel, setPanel] = useState<'menu' | 'search' | 'ai' | null>(null);
  const [query, setQuery] = useState('');
  const [question, setQuestion] = useState('');
  const [interactionsOpen, setInteractionsOpen] = useState(false);
  const [progress] = useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = useState(false);
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const results = searchHome(query, state.doctors);
  const aiEnabled = hasAiAccess(state.aiSubscription);
  const conversationOpen = panel === 'ai' && aiEnabled;
  const initials = state.profile.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('');
  const drawerWidth = Math.min(326, width - 48);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduceMotion(value);
    });
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      listener.remove();
      progress.stopAnimation();
    };
  }, [progress]);
  const showPanel = (next: 'menu' | 'search' | 'ai') => {
    progress.stopAnimation();
    progress.setValue(0);
    setPanel(next);
    Animated.timing(progress, {
      toValue: 1,
      duration: reduceMotion ? 0 : next === 'menu' ? 280 : 140,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };
  const dismissPanel = useCallback(
    (onClosed?: () => void) => {
      input.current?.blur();
      Keyboard.dismiss();
      if (!panel) {
        onClosed?.();
        return;
      }
      Animated.timing(progress, {
        toValue: 0,
        duration: reduceMotion ? 0 : 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }).start(({ finished }) => {
        if (!finished) return;
        setPanel(null);
        setInteractionsOpen(false);
        onClosed?.();
      });
    },
    [panel, progress, reduceMotion],
  );
  const close = useCallback(() => dismissPanel(), [dismissPanel]);
  useEffect(() => {
    onOverlayChange(panel !== null);
  }, [panel, onOverlayChange]);
  useEffect(() => {
    if (!panel) return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && panel === 'ai') { event.preventDefault(); close(); }
    };
    if (Platform.OS === 'web') window.addEventListener('keydown', escape);
    return () => { back.remove(); if (Platform.OS === 'web') window.removeEventListener('keydown', escape); };
  }, [panel, close]);
  const openItem = (item: MenuItem) => {
    dismissPanel(() => {
      setQuery('');
      router.push({ pathname: '/[section]', params: item.destination });
    });
  };
  const ask = (text: string) => {
    if (!aiEnabled || !text.trim()) return;
    input.current?.blur();
    Keyboard.dismiss();
    setQuestion(text.trim());
    setQuery(text.trim());
    showPanel('ai');
    setInteractionsOpen(false);
  };
  const openAiAction = (action: AiAction) => dismissPanel(() => router.push({ pathname: '/[section]', params: { section: action.section, ...(action.appointmentId ? { appointmentId: action.appointmentId } : {}) } }));
  const closeConversation = () => { setQuery(''); dismissPanel(); };
  const row = (item: MenuItem, compact = false) => (
    <Pressable
      key={item.id}
      testID={`nav-${item.id}`}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      onPress={() => openItem(item)}
      style={({ pressed }) => [s.row, compact && s.subRow, pressed && s.pressed]}
    >
      <View style={s.rowIcon}>
        <Icon name={item.icon} size={20} color={colors.tealDark} />
      </View>
      <View style={s.copy}>
        <Text style={s.rowTitle}>{item.title}</Text>
        {item.subtitle && <Text style={s.subtitle}>{item.subtitle}</Text>}
      </View>
      <Icon name="chevronRight" size={17} color={colors.tealDark} />
    </Pressable>
  );
  const item = (id: string) => menuItems.find((entry) => entry.id === id)!;
  return (
    <View pointerEvents="box-none" style={s.layer}>
      {panel && !conversationOpen && (
        <Animated.View style={[s.backdrop, { opacity: progress }]}>
          <Pressable
            testID="dismiss-header-panel"
            accessibilityRole="button"
            accessibilityLabel="Cerrar panel"
            onPress={close}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
      <View style={s.bar}>
        <Pressable
          testID="header-menu"
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={panel === 'menu' ? 'Cerrar menú' : 'Abrir menú'}
          accessibilityState={{ expanded: panel === 'menu' }}
          onPress={() => {
            input.current?.blur();
            Keyboard.dismiss();
            if (panel === 'menu') close();
            else {
              setInteractionsOpen(false);
              showPanel('menu');
            }
          }}
          style={({ pressed }) => [
            s.menuButton,
            panel === 'menu' && s.menuActive,
            pressed && s.pressed,
          ]}
        >
          <Icon
            name={panel === 'menu' ? 'close' : 'more'}
            size={23}
            color={panel === 'menu' ? 'white' : colors.navy}
          />
        </Pressable>
        <View style={[s.search, panel === 'search' && s.searchActive]}>
          <Icon name="search" size={18} color={colors.tealDark} />
          <TextInput
            ref={input}
            testID="home-search"
            accessibilityLabel={aiEnabled ? 'Pregunta a Klini' : 'Buscar en Klini'}
            placeholder={aiEnabled ? 'Pregunta a Klini…' : 'Buscar en Klini'}
            placeholderTextColor="#617B90"
            value={query}
            maxLength={1500}
            onChangeText={setQuery}
            onFocus={() => {
              showPanel('search');
              setInteractionsOpen(false);
            }}
            onKeyPress={(event) => {
              if (event.nativeEvent.key === 'Escape') close();
            }}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            style={s.input}
            onSubmitEditing={() => {
              if (aiEnabled) ask(query);
              else if (query.trim() && results[0]) openItem(results[0]);
            }}
          />
          {!!query && !aiEnabled && (
            <Pressable
              testID="clear-search"
              accessibilityRole="button"
              accessibilityLabel="Borrar búsqueda"
              hitSlop={4}
              onPress={() => {
                setQuery('');
                input.current?.focus();
              }}
              style={s.clear}
            >
              <Icon name="close" size={17} color={colors.muted} />
            </Pressable>
          )}
          {aiEnabled && <Pressable testID="home-ai-submit" accessibilityRole="button" accessibilityLabel={query.trim() ? 'Preguntar a Klini IA' : 'Ideas para preguntar a Klini IA'} onPress={() => query.trim() ? ask(query) : showPanel('search')} style={s.aiBadge}><Text style={s.aiBadgeText}>IA</Text><AiSparkles small /></Pressable>}
        </View>
        <Pressable
          testID="header-profile"
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel="Abrir mi perfil"
          onPress={() => openItem(item('profile'))}
          style={({ pressed }) => [s.avatar, pressed && s.pressed]}
        >
          <Text style={s.initials}>{initials}</Text>
        </Pressable>
      </View>
      {conversationOpen && <View style={s.conversationSurface}><AiConversation key={`${state.profile.id}-${question}`} initialQuestion={question} onClose={closeConversation} onAction={openAiAction} onManage={() => openItem(item('wallet'))} /></View>}
      {panel && panel !== 'ai' && (
        <Animated.View
          testID="header-panel"
          accessibilityViewIsModal
          style={[
            s.panel,
            {
              maxHeight: panel === 'search'
                ? Math.max(120, height / 2 - insets.top - TOOLBAR_HEIGHT)
                : Math.max(160, height - insets.top - insets.bottom - TOOLBAR_HEIGHT - 20),
              width: panel === 'menu' ? drawerWidth : undefined,
              left: panel === 'menu' ? 0 : 24,
              borderTopLeftRadius: panel === 'menu' ? 0 : 23,
              borderBottomLeftRadius: panel === 'menu' ? 0 : 23,
              right: panel === 'search' ? 24 : undefined,
              opacity: panel === 'search' ? progress : 1,
              transform:
                panel === 'menu'
                  ? [
                      {
                        translateX: progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-drawerWidth - 20, 0],
                        }),
                      },
                    ]
                  : [],
            },
          ]}
        >
          <ScrollView
            style={panel === 'search' ? s.searchScroll : undefined}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.panelContent}
          >
            <View style={s.panelHeader}>
              <Text accessibilityRole="header" style={s.panelTitle}>
                {panel === 'menu'
                  ? 'Tu espacio'
                  : aiEnabled ? 'Pregunta a Klini IA' : query.trim()
                    ? 'Resultados'
                    : '¿Qué necesitas hoy?'}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar panel"
                onPress={close}
                style={s.closeButton}
              >
                <Icon name="close" size={20} color={colors.muted} />
              </Pressable>
            </View>
            {panel === 'menu' ? (
              <>
                <Pressable
                  testID="nav-wallet"
                  accessibilityRole="button"
                  accessibilityLabel="Billetera y suscripción"
                  onPress={() => openItem(item('wallet'))}
                  style={({ pressed }) => [s.wallet, pressed && s.pressed]}
                >
                  <Image
                    source={require('../../assets/menu-wallet.png')}
                    style={s.walletArt}
                    accessible={false}
                  />
                  <View style={s.copy}>
                    <Text style={s.featureTitle}>Billetera y{'\n'}suscripción</Text>
                    <Text style={s.subtitle}>Pagos, saldo y tu plan</Text>
                  </View>
                  <Icon name="chevronRight" size={18} color={colors.tealDark} />
                </Pressable>
                <Pressable
                  testID="menu-interactions"
                  accessibilityRole="button"
                  accessibilityLabel="Interacciones"
                  accessibilityState={{ expanded: interactionsOpen }}
                  onPress={() => setInteractionsOpen((value) => !value)}
                  style={({ pressed }) => [s.interactions, pressed && s.pressed]}
                >
                  <View style={s.rowIcon}>
                    <Icon name="people" size={22} color={colors.tealDark} />
                  </View>
                  <View style={s.copy}>
                    <Text style={s.featureTitle}>Interacciones</Text>
                    <Text style={s.subtitle}>Solicitudes, mensajes y alertas</Text>
                  </View>
                  <Icon
                    name={interactionsOpen ? 'chevronUp' : 'chevronDown'}
                    size={18}
                    color={colors.tealDark}
                  />
                </Pressable>
                {interactionsOpen && (
                  <View style={s.submenu}>
                    {['requests', 'messages', 'alerts'].map((id) => row(item(id), true))}
                  </View>
                )}
                <Text style={s.sectionLabel}>SOPORTE MÉDICO</Text>
                {['studies', 'prescriptions', 'directory', 'devices'].map((id) =>
                  row(item(id)),
                )}
              </>
            ) : (
              <>
                {aiEnabled && <View style={s.aiSuggestions}>
                  {(query.trim() ? [query.trim()] : ['¿Cuándo es mi próxima cita?', 'Resume mi expediente', '¿Qué medicamentos tengo registrados?']).map(text => <Pressable key={text} testID={query.trim() ? 'ai-ask-question' : undefined} accessibilityRole="button" onPress={() => ask(text)} style={s.suggestion}><Icon name="chat" size={17} color={colors.tealDark} /><Text style={s.suggestionText}>{text}</Text><Icon name="chevronRight" size={16} color={colors.tealDark} /></Pressable>)}
                  <View style={s.divider} />
                  <Text style={s.sectionLabel}>ACCESOS EN KLINI</Text>
                </View>}
                {!aiEnabled && <Pressable testID="ai-discover" accessibilityRole="button" onPress={() => openItem(item('wallet'))} style={s.aiDiscover}><AiSparkles /><View style={s.copy}><Text style={s.rowTitle}>Conoce Klini IA</Text><Text style={s.subtitle}>Tu expediente en palabras claras · $99 MXN/mes</Text></View><Icon name="chevronRight" size={17} color={colors.tealDark} /></Pressable>}
                {!query.trim() && (
                  <Text style={s.hint}>Médicos, especialidades y tus servicios.</Text>
                )}
                {results.map((result) => row(result))}
                {!results.length && (
                  <View style={s.empty}>
                    <Icon name="search" size={30} color={colors.tealDark} />
                    <Text style={s.featureTitle}>No encontramos resultados</Text>
                    <Text style={s.hint}>
                      Prueba con un nombre, una especialidad o una sección, como “Agenda”.
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill, zIndex: 20 },
  bar: {
    height: TOOLBAR_HEIGHT,
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  menuButton: {
    height: 36,
    width: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F7F7',
  },
  menuActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  search: {
    height: 38,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 12,
    paddingRight: 4,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 22,
    backgroundColor: '#F1F7F7',
  },
  searchActive: { borderColor: colors.teal },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 36, paddingHorizontal: 3 },
  aiBadgeText: { color: colors.teal, fontSize: 10, fontWeight: '600' },
  conversationSurface: { position: 'absolute', top: TOOLBAR_HEIGHT, bottom: 88, left: 0, right: 0, backgroundColor: 'white' },
  aiSuggestions: { paddingTop: 5 },
  suggestion: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 8, gap: 9, borderRadius: 12, backgroundColor: '#F1FAFA', marginBottom: 6 },
  suggestionText: { flex: 1, color: colors.navy, fontSize: 12, lineHeight: 18 },
  aiDiscover: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, backgroundColor: '#F1FAFA', padding: 10, marginBottom: 10 },
  input: { flex: 1, minWidth: 0, height: 36, color: colors.navy, fontSize: 12, paddingVertical: 0 },
  clear: { minHeight: 36, width: 30, alignItems: 'center', justifyContent: 'center' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DDF4EF',
  },
  initials: { color: colors.tealDark, fontSize: 11, fontWeight: '600' },
  backdrop: {
    position: 'absolute',
    top: TOOLBAR_HEIGHT,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(8,36,65,0.14)',
  },
  panel: {
    position: 'absolute',
    top: TOOLBAR_HEIGHT,
    left: 24,
    backgroundColor: 'white',
    borderRadius: 23,
    borderWidth: 1,
    borderColor: '#E1EBEE',
    boxShadow: '0 16px 40px rgba(8,36,65,0.16)',
    overflow: 'hidden',
  },
  panelContent: { padding: 12, paddingTop: 5 },
  searchScroll: { minHeight: 0, flexShrink: 1 },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 7,
    minHeight: 44,
  },
  panelTitle: { fontSize: 15, color: colors.navy, fontWeight: '700', flex: 1 },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  wallet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#CBE7E5',
    backgroundColor: '#FFF',
    padding: 10,
    marginBottom: 8,
  },
  walletArt: { height: 54, width: 54, borderRadius: 13 },
  interactions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 17,
    backgroundColor: '#F1FAF9',
    padding: 12,
    marginBottom: 6,
  },
  copy: { flex: 1 },
  featureTitle: { color: colors.navy, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  subtitle: { fontSize: 11, lineHeight: 15, color: '#617B90', marginTop: 3 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 49,
    borderRadius: 13,
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginVertical: 2,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDF9F7',
  },
  rowTitle: { fontSize: 13, lineHeight: 18, color: colors.navy, fontWeight: '500' },
  submenu: { marginLeft: 20, borderLeftWidth: 1, borderLeftColor: '#D9EEEC', paddingLeft: 5 },
  subRow: { minHeight: 46 },
  sectionLabel: {
    marginTop: 15,
    marginBottom: 7,
    paddingLeft: 8,
    color: '#617B90',
    letterSpacing: 1.6,
    fontSize: 10,
    fontWeight: '600',
  },
  divider: { height: 1, backgroundColor: '#E7EFF1', marginVertical: 6 },
  pressed: { opacity: 0.6 },
  hint: { color: '#617B90', fontSize: 12, lineHeight: 18, marginHorizontal: 7, marginBottom: 9 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 22, paddingHorizontal: 8 },
});
