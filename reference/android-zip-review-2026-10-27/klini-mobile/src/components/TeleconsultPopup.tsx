import React, { PropsWithChildren, ReactNode, useCallback, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, Icon } from './ui';
import { usePopupLayout } from './usePopupLayout';
import { usePopupAlreadyOpen } from './PopupTransition';

export default function TeleconsultPopup({
  title,
  onClose,
  onBack,
  children,
  footer,
  footerAlignment = 'center',
  variant = 'teleconsult',
  animateEntrance = false,
}: PropsWithChildren<{
  title: string;
  onClose: () => void;
  onBack?: () => void;
  footer?: ReactNode;
  footerAlignment?: 'center' | 'right';
  compact?: boolean;
  variant?: 'teleconsult' | 'insurance' | 'archive';
  animateEntrance?: boolean;
}>) {
  const sessionAlreadyOpen = usePopupAlreadyOpen();
  const alreadyOpen = sessionAlreadyOpen && !animateEntrance;
  const [progress] = useState(() => new Animated.Value(alreadyOpen ? 1 : 0));
  const [reduced, setReduced] = useState(false);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { panelHeight, anchorTop, onLayout } = usePopupLayout();
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (!active) return;
      setReduced(value);
      Animated.timing(progress, {
        toValue: 1,
        duration: value || alreadyOpen ? 0 : 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      active = false;
      subscription.remove();
      progress.stopAnimation();
    };
  }, [progress, alreadyOpen]);
  const close = useCallback(() => {
    Animated.timing(progress, {
      toValue: 0,
      duration: reduced ? 0 : 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (finished) onClose();
    });
  }, [onClose, progress, reduced]);
  const back = useCallback(() => {
    if (!onBack) { close(); return; }
    if (!animateEntrance) { onBack(); return; }
    Animated.timing(progress, {
      toValue: 0,
      duration: reduced ? 0 : 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (finished) onBack();
    });
  }, [onBack, animateEntrance, close, progress, reduced]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => subscription.remove();
  }, [back]);
  return (
    <View style={s.root} onLayout={onLayout}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: 'rgba(8,36,65,.36)', opacity: progress },
        ]}
      />
      <Pressable
        testID={`${variant}-backdrop`}
        style={StyleSheet.absoluteFill}
        onPress={close}
        accessibilityLabel={variant === 'archive' ? 'Cerrar archivo' : variant === 'insurance' ? 'Cerrar seguro médico' : 'Cerrar teleconsulta'}
      />
      <KeyboardAvoidingView
        style={[s.position, anchorTop !== null && { justifyContent: 'flex-start', paddingTop: anchorTop }]}
        pointerEvents="box-none"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View
          testID={`${variant}-popup`}
          accessibilityViewIsModal
          style={[
            s.panel,
            {
              height: panelHeight,
              paddingBottom: Math.max(insets.bottom, 12),
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [height, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={s.handle} />
          <View style={s.controls}>
            {
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Volver"
                testID={`${variant}-detail-back`}
                onPress={back}
                style={s.back}
              >
                <Icon name="back" size={24} />
              </Pressable>
            }
            <Text accessibilityRole="header" style={s.heading}>
              {title}
            </Text>
            <Pressable
              testID={`${variant}-close`}
              accessibilityRole="button"
              accessibilityLabel={variant === 'archive' ? 'Cerrar archivo' : variant === 'insurance' ? 'Cerrar seguro médico' : 'Cerrar teleconsulta'}
              onPress={close}
              style={s.close}
            >
              <Icon name="close" size={25} />
            </Pressable>
          </View>
          <ScrollView
            style={{ flex: 1 }}
            key={title}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.content}
          >
            {children}
          </ScrollView>
          {footer && <View style={[s.footer, footerAlignment === 'right' && { alignSelf: 'flex-end', minWidth: 0, marginRight: 24 }]}>{footer}</View>}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
const s = StyleSheet.create({
  heading: { flex: 1, alignSelf: 'center', fontSize: 16, fontWeight: '700', color: colors.navy },
  root: { flex: 1 },
  position: { flex: 1, justifyContent: 'flex-end' },
  panel: {
    flexShrink: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    width: '100%',
    overflow: 'hidden',
  },
  handle: {
    width: 42,
    height: 4,
    backgroundColor: '#A5B3C5',
    borderRadius: 4,
    alignSelf: 'center',
    marginTop: 10,
  },
  controls: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 3, alignItems: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', minHeight: 44, width: 28, gap: 2 },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EDF2F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: 24, paddingBottom: 14 },
  eyebrow: { color: '#527AA1', fontSize: 11, letterSpacing: 2, marginBottom: 6 },
  title: {
    color: colors.navy,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
    marginBottom: 18,
  },
  footer: { alignSelf: 'center', minWidth: 190, marginTop: 12, marginBottom: 8, maxWidth: '90%' },
  note: { textAlign: 'center', color: '#819BB6', fontSize: 11, marginTop: 22 },
});
