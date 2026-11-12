import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  BackHandler,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
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
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, Icon } from './ui';
import { menuItems, professionalMenuItems, searchHome, type MenuItem } from '../domain/navigation';
import { useAppStore } from '../state/store';
import { hasAiAccess } from '../domain/aiSubscription';
import type { AiAction } from '../domain/kliniAi';
import { AI_ATTACHMENT_MAX_COUNT, parseAiAttachments, type AiAttachment } from '../domain/kliniAiAttachments';
import { pickAiAttachment, prepareAiPhotoAttachment } from '../services/aiAttachments';
import AiConversation, { AI_ATTACHMENT_QUESTION, type AiConversationHandle } from './AiConversation';
import AiAttachmentMenu, { type AiAttachmentChoice } from './AiAttachmentMenu';
import AiAttachmentChips from './AiAttachmentChips';
import AiSparkles from './AiSparkles';
import RecordPhotoPopup from './RecordPhotoPopup';
import ProfessionalAvatar from './ProfessionalAvatar';
import { professionalProfileLabel } from '../domain/managedProfiles';

export const TOOLBAR_HEIGHT = 68;
const KEYBOARD_FADE_DURATION_MS = 1200;

export default function HomeToolbar({
  onOverlayChange,
  onAttachmentHeightChange,
  onRegister,
}: {
  onOverlayChange: (open: boolean) => void;
  onAttachmentHeightChange?: (height: number) => void;
  onRegister?: () => void;
}) {
  const { state, professionalProfile } = useAppStore();
  const [panel, setPanel] = useState<'menu' | 'search' | 'ai' | null>(null);
  const [query, setQuery] = useState('');
  const [questionFocused, setQuestionFocused] = useState(false);
  const [keyboardBackingVisible, setKeyboardBackingVisible] = useState(false);
  const [keyboardFade] = useState(() => new Animated.Value(0));
  const keyboardBackingRequested = useRef(false);
  const [question, setQuestion] = useState('');
  const [conversationId, setConversationId] = useState(0);
  const [attachments, setAttachments] = useState<AiAttachment[]>([]);
  const selectedAttachments = useRef<AiAttachment[]>([]);
  const selectionGeneration = useRef(0);
  const alive = useRef(true);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [pickerBusy, setPickerBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [attachmentError, setAttachmentError] = useState('');
  const [attachmentAreaHeight, setAttachmentAreaHeight] = useState(0);
  const [layerHeight, setLayerHeight] = useState(0);
  const [interactionsOpen, setInteractionsOpen] = useState(false);
  const [progress] = useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = useState(false);
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const conversation = useRef<AiConversationHandle>(null);
  const keyboardRefocusFrame = useRef<number | null>(null);
  const reopenKeyboardAfterTap = useRef(false);
  const ignoreKeyboardHide = useRef(false);
  const inputSelection = useRef({ start: 0, end: 0 });
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [conversationTop] = useState(() => Math.max(TOOLBAR_HEIGHT, (height - insets.top - insets.bottom) * .18));
  const results = searchHome(query, state.doctors);
  const aiEnabled = hasAiAccess(state.aiSubscription);
  const conversationOpen = panel === 'ai' && aiEnabled;
  const hasAttachmentArea = attachments.length > 0 || pickerBusy || !!attachmentError;
  const attachmentHeight = hasAttachmentArea ? attachmentAreaHeight : 0;
  const panelBottom = TOOLBAR_HEIGHT + attachmentHeight + 8;
  const overlayHeight = layerHeight || height - insets.top - insets.bottom;
  const availablePopupHeight = Math.max(0, overlayHeight - panelBottom - TOOLBAR_HEIGHT - 8);
  const attachmentLocked = pickerBusy || aiBusy;
  const initials = state.profile.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('');
  const drawerWidth = Math.min(326, width - 48);
  const cancelKeyboardRefocus = useCallback(() => {
    if (keyboardRefocusFrame.current !== null) cancelAnimationFrame(keyboardRefocusFrame.current);
    keyboardRefocusFrame.current = null;
    reopenKeyboardAfterTap.current = false;
    ignoreKeyboardHide.current = false;
  }, []);
  const showKeyboardBacking = useCallback(() => {
    keyboardBackingRequested.current = true;
    setKeyboardBackingVisible(true);
    keyboardFade.stopAnimation();
    Animated.timing(keyboardFade, {
      toValue: 1,
      duration: reduceMotion ? 0 : KEYBOARD_FADE_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [keyboardFade, reduceMotion]);
  const hideKeyboardBacking = useCallback(() => {
    keyboardBackingRequested.current = false;
    keyboardFade.stopAnimation();
    Animated.timing(keyboardFade, {
      toValue: 0,
      duration: reduceMotion ? 0 : KEYBOARD_FADE_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (finished && !keyboardBackingRequested.current && alive.current) setKeyboardBackingVisible(false);
    });
  }, [keyboardFade, reduceMotion]);
  const focusQuestionKeyboard = () => {
    const target = input.current;
    if (!target || attachmentLocked) return;
    if (Platform.OS !== 'android' || !target.isFocused() || Keyboard.isVisible()) {
      target.focus();
      return;
    }
    // Android can retain focus after Back while .focus() alone no longer opens the IME.
    cancelKeyboardRefocus();
    const selection = { ...inputSelection.current };
    ignoreKeyboardHide.current = true;
    target.blur();
    keyboardRefocusFrame.current = requestAnimationFrame(() => {
      keyboardRefocusFrame.current = null;
      if (!alive.current || input.current !== target) return;
      target.focus();
      target.setSelection(selection.start, selection.end);
    });
  };
  useEffect(() => {
    const shown = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => {
      ignoreKeyboardHide.current = false;
      if (input.current?.isFocused()) showKeyboardBacking();
    });
    const hidden = Keyboard.addListener('keyboardDidHide', () => {
      if (Platform.OS === 'android' && (ignoreKeyboardHide.current || keyboardRefocusFrame.current !== null)) return;
      hideKeyboardBacking();
      // Release stale Android focus so the next ordinary tap takes the native focus path.
      if (Platform.OS === 'android' && input.current?.isFocused()) input.current.blur();
    });
    return () => { shown.remove(); hidden.remove(); cancelKeyboardRefocus(); };
  }, [cancelKeyboardRefocus, hideKeyboardBacking, showKeyboardBacking]);
  useEffect(() => {
    onAttachmentHeightChange?.(attachmentHeight);
    return () => onAttachmentHeightChange?.(0);
  }, [attachmentHeight, onAttachmentHeightChange]);
  const clearAttachments = useCallback(() => {
    selectionGeneration.current += 1;
    selectedAttachments.current = [];
    setAttachments([]); setAttachmentError(''); setPickerBusy(false); setAttachmentAreaHeight(0);
    setAttachmentMenuOpen(false); setCameraOpen(false);
  }, []);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; selectionGeneration.current += 1; selectedAttachments.current = []; cancelKeyboardRefocus(); keyboardFade.stopAnimation(); };
  }, [cancelKeyboardRefocus, keyboardFade]);
  // App keys this toolbar by profile ID; unmount drops every ephemeral attachment.
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
    setAttachmentMenuOpen(false);
    if (panel === 'ai' && next !== 'ai') clearAttachments();
    progress.stopAnimation();
    progress.setValue(0);
    setPanel(next);
    Animated.timing(progress, {
      toValue: 1,
      duration: reduceMotion ? 0 : next === 'ai' ? 320 : next === 'menu' ? 280 : 140,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };
  const dismissPanel = useCallback(
    (onClosed?: () => void) => {
      cancelKeyboardRefocus();
      input.current?.blur();
      Keyboard.dismiss();
      setAttachmentMenuOpen(false);
      if (panel === 'ai') clearAttachments();
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
    [panel, progress, reduceMotion, clearAttachments, cancelKeyboardRefocus],
  );
  const close = useCallback(() => {
    if (cameraOpen) setCameraOpen(false);
    else if (attachmentMenuOpen) setAttachmentMenuOpen(false);
    else dismissPanel();
  }, [cameraOpen, attachmentMenuOpen, dismissPanel]);
  useEffect(() => {
    onOverlayChange(panel !== null || attachmentMenuOpen || cameraOpen);
  }, [panel, attachmentMenuOpen, cameraOpen, onOverlayChange]);
  useEffect(() => {
    if (!panel && !attachmentMenuOpen && !cameraOpen && !questionFocused) return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
    };
    if (Platform.OS === 'web') window.addEventListener('keydown', escape);
    return () => { back.remove(); if (Platform.OS === 'web') window.removeEventListener('keydown', escape); };
  }, [panel, attachmentMenuOpen, cameraOpen, questionFocused, close]);
  const openItem = (item: MenuItem) => {
    dismissPanel(() => {
      setQuery('');
      router.push({ pathname: '/[section]', params: item.destination });
    });
  };
  const ask = (text: string) => {
    const prompt = text.trim() || (attachments.length ? AI_ATTACHMENT_QUESTION : '');
    if (!aiEnabled || !prompt || attachmentLocked) return;
    if (conversationOpen) {
      if (conversation.current?.send(prompt, attachments)) setQuery('');
      return;
    }
    cancelKeyboardRefocus();
    input.current?.blur();
    Keyboard.dismiss();
    setQuestion(prompt);
    setQuery('');
    setConversationId(current => current + 1);
    setAiBusy(true);
    showPanel('ai');
    setInteractionsOpen(false);
  };
  const openAiAction = (action: AiAction) => dismissPanel(() => router.push({ pathname: '/[section]', params: { section: action.section, ...(action.appointmentId ? { appointmentId: action.appointmentId } : {}) } }));
  const closeConversation = () => { setQuery(''); dismissPanel(); };
  const register = () => dismissPanel(() => {
    clearAttachments();
    if (onRegister) onRegister();
    else router.push({ pathname: '/[section]', params: { section: 'register' } });
  });
  const addAttachment = (attachment: AiAttachment) => {
    const next = parseAiAttachments([...selectedAttachments.current, attachment]);
    selectedAttachments.current = next;
    setAttachments(next);
    setAttachmentError('');
  };
  const chooseAttachment = async (choice: AiAttachmentChoice) => {
    setAttachmentMenuOpen(false);
    if (attachmentLocked) return;
    if (selectedAttachments.current.length >= AI_ATTACHMENT_MAX_COUNT) { setAttachmentError('Puedes adjuntar hasta 3 archivos por consulta.'); return; }
    setAttachmentError('');
    if (choice === 'camera') { setCameraOpen(true); return; }
    const generation = selectionGeneration.current;
    setPickerBusy(true);
    try {
      const attachment = await pickAiAttachment(choice);
      if (alive.current && generation === selectionGeneration.current && attachment) addAttachment(attachment);
    } catch (cause) {
      if (alive.current && generation === selectionGeneration.current) setAttachmentError(cause instanceof Error ? cause.message : 'No pudimos adjuntar el archivo. Inténtalo de nuevo.');
    } finally { if (alive.current && generation === selectionGeneration.current) setPickerBusy(false); }
  };
  const captureAttachment = async (uri: string) => {
    setCameraOpen(false); setPickerBusy(true); setAttachmentError('');
    const generation = selectionGeneration.current;
    try {
      const attachment = await prepareAiPhotoAttachment(uri);
      if (alive.current && generation === selectionGeneration.current) addAttachment(attachment);
    } catch (cause) {
      if (alive.current && generation === selectionGeneration.current) setAttachmentError(cause instanceof Error ? cause.message : 'No pudimos adjuntar la foto. Inténtalo de nuevo.');
    } finally { if (alive.current && generation === selectionGeneration.current) setPickerBusy(false); }
  };
  const openAttachments = () => {
    if (attachmentLocked) return;
    cancelKeyboardRefocus();
    input.current?.blur(); Keyboard.dismiss();
    if (!aiEnabled) { openItem(item('wallet')); return; }
    if (panel !== 'ai') { setPanel(null); setInteractionsOpen(false); }
    setAttachmentMenuOpen(current => !current);
  };
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
    <KeyboardAvoidingView pointerEvents="box-none" style={s.layer} enabled={Platform.OS !== 'web'} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={insets.top}>
    <View pointerEvents="box-none" style={s.overlayContent} onLayout={event => setLayerHeight(event.nativeEvent.layout.height)}>
      <Pressable
        testID="header-profile"
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={professionalProfile ? `Perfil activo: ${state.profile.name}, ${professionalProfileLabel(professionalProfile)}. Abrir mi perfil` : `Perfil activo: ${state.profile.name}. Abrir mi perfil`}
        onPress={() => openItem(item('profile'))}
        style={({ pressed }) => [s.avatar, professionalProfile && s.professionalAvatar, pressed && s.pressed]}
      >
        {professionalProfile ? <ProfessionalAvatar initials={initials} testID="header-professional-avatar" /> : <Text style={s.initials}>{initials}</Text>}
      </Pressable>
      {panel && (
        <Animated.View style={[s.backdrop, { bottom: conversationOpen ? 0 : TOOLBAR_HEIGHT + attachmentHeight, opacity: progress }]}>
          <Pressable
            testID="dismiss-header-panel"
            accessibilityRole="button"
            accessibilityLabel="Cerrar panel"
            onPress={close}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
      <Animated.View
        testID={conversationOpen ? 'klini-ai-sheet' : undefined}
        pointerEvents="box-none"
        accessibilityViewIsModal={conversationOpen}
        style={conversationOpen ? [s.aiSheet, {
          top: Math.min(conversationTop, Math.max(0, overlayHeight - 220)),
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }],
        }] : s.toolbarLayer}
      >
      {keyboardBackingVisible && !conversationOpen && <View
        testID="home-keyboard-backing"
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[s.keyboardBacking, { height: TOOLBAR_HEIGHT + attachmentHeight }]}
      >
        <Animated.View pointerEvents="none" style={[s.keyboardFade, { opacity: keyboardFade }]}>
        <LinearGradient
          testID="home-keyboard-fade"
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.92)', '#FFFFFF']}
          locations={[0, 0.65, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        </Animated.View>
      </View>}
      <View testID="home-bottom-toolbar" style={s.bar}>
        <Pressable
          testID="header-menu"
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={panel === 'menu' ? 'Cerrar menú' : 'Abrir menú'}
          accessibilityState={{ expanded: panel === 'menu' }}
          onPress={() => {
            cancelKeyboardRefocus();
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
        <View style={[s.search, questionFocused && s.searchActive]}>
          <Pressable testID="home-attachment-add" accessibilityRole="button" accessibilityLabel="Adjuntar a Klini IA" accessibilityState={{ expanded: attachmentMenuOpen, disabled: attachmentLocked }} disabled={attachmentLocked} hitSlop={4} onPress={openAttachments} style={[s.attachmentAdd, attachmentLocked && s.attachmentDisabled]}><Icon name="plus" size={23} color={colors.tealDark} /></Pressable>
          <TextInput
            ref={input}
            testID="home-search"
            accessibilityLabel={conversationOpen ? 'Mensaje para Klini IA' : aiEnabled ? 'Pregunta a Klini' : 'Buscar en Klini'}
            placeholder={conversationOpen ? 'Escribe un mensaje…' : aiEnabled ? 'Pregunta a Klini…' : 'Buscar en Klini'}
            placeholderTextColor="#617B90"
            value={query}
            editable={!pickerBusy}
            maxLength={1500}
            onChangeText={setQuery}
            onSelectionChange={event => { inputSelection.current = event.nativeEvent.selection; }}
            onPressIn={() => {
              // The first tap remains entirely native; only a previously focused field retries.
              reopenKeyboardAfterTap.current = Platform.OS === 'android' && questionFocused && !!input.current?.isFocused() && !Keyboard.isVisible();
            }}
            onPressOut={() => {
              if (!reopenKeyboardAfterTap.current) return;
              reopenKeyboardAfterTap.current = false;
              focusQuestionKeyboard();
            }}
            onFocus={() => {
              setQuestionFocused(true);
              showKeyboardBacking();
              if (!aiEnabled) { showPanel('search'); return; }
              if (panel === 'ai') { setAttachmentMenuOpen(false); return; }
              progress.stopAnimation();
              setPanel(null);
              setAttachmentMenuOpen(false);
              setInteractionsOpen(false);
            }}
            onBlur={() => {
              setQuestionFocused(false);
              if (!Keyboard.isVisible()) hideKeyboardBacking();
            }}
            onKeyPress={(event) => {
              if (event.nativeEvent.key === 'Escape') close();
            }}
            autoCorrect
            spellCheck
            autoCapitalize="sentences"
            showSoftInputOnFocus
            inputMode="text"
            returnKeyType={aiEnabled ? 'send' : 'search'}
            enterKeyHint={aiEnabled ? 'send' : 'search'}
            submitBehavior="blurAndSubmit"
            style={[s.input, Platform.OS === 'web' && { outlineWidth: 0 }]}
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
          {aiEnabled && <Pressable testID="home-ai-submit" accessibilityRole="button" accessibilityLabel={conversationOpen ? 'Enviar mensaje' : query.trim() || attachments.length ? 'Preguntar a Klini IA' : 'Escribir una pregunta a Klini IA'} accessibilityState={{ disabled: attachmentLocked }} disabled={attachmentLocked} onPress={() => query.trim() || attachments.length ? ask(query) : focusQuestionKeyboard()} style={[s.aiBadge, attachmentLocked && s.attachmentDisabled]}>{conversationOpen ? <Icon name="arrow-up" size={21} color={colors.tealDark} /> : <><Text style={s.aiBadgeText}>IA</Text><AiSparkles small /></>}</Pressable>}
        </View>
        <Pressable
          testID="quick-register"
          accessibilityRole="button"
          accessibilityLabel="Registrar información de salud"
          onPress={register}
          style={({ pressed }) => [s.registerTarget, pressed && s.pressed]}
        >
          <LinearGradient colors={['#15C9CC', '#00ADB2', '#009DA5']} style={s.register}><Icon name="plus" size={32} color="white" /></LinearGradient>
        </Pressable>
      </View>
      {hasAttachmentArea && <View testID="ai-attachment-area" onLayout={event => setAttachmentAreaHeight(event.nativeEvent.layout.height)} style={s.attachmentArea}>
        {attachments.length > 0 && <AiAttachmentChips attachments={attachments} disabled={attachmentLocked} onRemove={id => { const next = selectedAttachments.current.filter(attachment => attachment.id !== id); selectedAttachments.current = next; setAttachments(next); setAttachmentError(''); }} />}
        {pickerBusy && <View accessibilityLiveRegion="polite" style={s.attachmentStatus}><ActivityIndicator size="small" color={colors.teal} /><Text style={s.attachmentStatusText}>Preparando adjunto…</Text></View>}
        {!!attachmentError && <View style={s.attachmentStatus}><Text testID="ai-attachment-error" accessibilityRole="alert" style={s.attachmentError}>{attachmentError}</Text><Pressable testID="ai-attachment-error-close" accessibilityRole="button" accessibilityLabel="Cerrar aviso de adjunto" onPress={() => setAttachmentError('')} style={s.attachmentErrorClose}><Icon name="close" size={15} color={colors.muted} /></Pressable></View>}
      </View>}
      {conversationOpen && <View style={[s.conversationSurface, { bottom: TOOLBAR_HEIGHT + attachmentHeight }]}><AiConversation ref={conversation} key={`${state.profile.id}-${conversationId}`} initialQuestion={question} attachments={attachments} onClose={closeConversation} onAction={openAiAction} onManage={() => openItem(item('wallet'))} onBusyChange={setAiBusy} /></View>}
      </Animated.View>
      {panel && panel !== 'ai' && (
        <Animated.View
          testID="header-panel"
          accessibilityViewIsModal
          style={[
            s.panel,
            {
              bottom: panelBottom,
              maxHeight: panel === 'search'
                ? Math.min(availablePopupHeight, overlayHeight / 2)
                : availablePopupHeight,
              width: panel === 'menu' ? drawerWidth : undefined,
              left: 24,
              right: panel === 'search' ? 24 : undefined,
              opacity: progress,
              transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
            },
          ]}
        >
          <ScrollView
            style={s.searchScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.panelContent}
          >
            <View style={s.panelHeader}>
              <Text accessibilityRole="header" style={s.panelTitle}>
                {panel === 'menu'
                  ? 'Tu espacio'
                  : query.trim()
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
                {['studies', 'devices', 'pharmacy', 'adherence-programs'].map((id) =>
                  row(item(id)),
                )}
                {!!professionalProfile && <>
                  <Text style={s.sectionLabel}>SERVICIOS PROFESIONALES</Text>
                  {professionalMenuItems.map(service => row(service))}
                </>}
              </>
            ) : (
              <>
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
      {attachmentMenuOpen && <AiAttachmentMenu bottom={panelBottom} onChoose={choice => void chooseAttachment(choice)} onClose={() => setAttachmentMenuOpen(false)} />}
      {cameraOpen && <View style={s.cameraOverlay}><RecordPhotoPopup title="Foto para Klini IA" savePhoto={async uri => ({ uri, name: 'Foto.jpg', mimeType: 'image/jpeg' })} onClose={() => setCameraOpen(false)} onCapture={attachment => void captureAttachment(attachment.uri)} /></View>}
    </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill, zIndex: 20 },
  overlayContent: { flex: 1 },
  toolbarLayer: { ...StyleSheet.absoluteFill, transform: [{ translateY: 0 }] },
  keyboardBacking: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'white' },
  keyboardFade: { position: 'absolute', left: 0, right: 0, top: -24, height: 25 },
  aiSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: TOOLBAR_HEIGHT,
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
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
    gap: 4,
    paddingLeft: 5,
    paddingRight: 4,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 22,
    backgroundColor: '#F1F7F7',
  },
  searchActive: { borderColor: colors.teal },
  attachmentAdd: { width: 28, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  attachmentDisabled: { opacity: .4 },
  attachmentArea: { position: 'absolute', bottom: TOOLBAR_HEIGHT, left: 0, right: 0, backgroundColor: 'white', paddingTop: 0, paddingBottom: 2 },
  attachmentStatus: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 24, minHeight: 32, paddingBottom: 6 },
  attachmentStatusText: { color: colors.muted, fontSize: 10, flex: 1 },
  attachmentError: { flex: 1, color: colors.danger, fontSize: 10, lineHeight: 15 },
  attachmentErrorClose: { width: 30, minHeight: 30, alignItems: 'center', justifyContent: 'center' },
  cameraOverlay: { ...StyleSheet.absoluteFill, zIndex: 50 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 36, paddingHorizontal: 3 },
  aiBadgeText: { color: colors.teal, fontSize: 10, fontWeight: '600' },
  conversationSurface: { position: 'absolute', top: 0, left: 0, right: 0 },
  aiDiscover: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, backgroundColor: '#F1FAFA', padding: 10, marginBottom: 10 },
  input: { flex: 1, minWidth: 0, height: 36, color: colors.navy, fontSize: 12, paddingVertical: 0 },
  clear: { minHeight: 36, width: 30, alignItems: 'center', justifyContent: 'center' },
  avatar: {
    position: 'absolute',
    top: 6,
    right: 24,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DDF4EF',
  },
  initials: { color: colors.tealDark, fontSize: 11, fontWeight: '600' },
  professionalAvatar: { top: 2, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'transparent' },
  registerTarget: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  register: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: '#55D4D6', boxShadow: '0 3px 5px rgba(8,36,65,.24)', alignItems: 'center', justifyContent: 'center' },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(8,36,65,0.14)',
  },
  panel: {
    position: 'absolute',
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
  pressed: { opacity: 0.6 },
  hint: { color: '#617B90', fontSize: 12, lineHeight: 18, marginHorizontal: 7, marginBottom: 9 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 22, paddingHorizontal: 8 },
});
