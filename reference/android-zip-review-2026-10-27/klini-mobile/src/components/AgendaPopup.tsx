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

export default function AgendaPopup({
  title,
  onClose,
  onBack,
  children,
  footer,
  scrollViewRef,
  onContentSizeChange,
}: PropsWithChildren<{
  title: string;
  onClose: () => void;
  onBack?: () => void;
  footer?: ReactNode;
  scrollViewRef?: React.RefObject<React.ComponentRef<typeof ScrollView> | null>;
  onContentSizeChange?: (width: number, height: number) => void;
}>) {
  const alreadyOpen = usePopupAlreadyOpen();
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
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (onBack) onBack();
      else close();
      return true;
    });
    return () => subscription.remove();
  }, [onBack, close]);
  return (
    <View style={s.root} onLayout={onLayout}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: 'rgba(8,36,65,.36)', opacity: progress },
        ]}
      />
      <Pressable
        testID="agenda-backdrop"
        style={StyleSheet.absoluteFill}
        onPress={close}
        accessibilityLabel="Cerrar agenda"
      />
      <KeyboardAvoidingView
        style={[s.position, anchorTop !== null && { justifyContent: 'flex-start', paddingTop: anchorTop }]}
        pointerEvents="box-none"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View
          testID="agenda-popup"
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
            {onBack && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Volver a agenda"
                testID="agenda-detail-back"
                onPress={onBack}
                style={s.close}
              >
                <Icon name="back" size={24} />
              </Pressable>
            )}
            <View style={{ flex: 1 }} />
            <Pressable
              testID="agenda-close"
              accessibilityRole="button"
              accessibilityLabel="Cerrar agenda"
              onPress={close}
              style={s.close}
            >
              <Icon name="close" size={25} />
            </Pressable>
          </View>
          <ScrollView
            ref={scrollViewRef}
            onContentSizeChange={onContentSizeChange}
            testID="agenda-scroll"
            style={{ flex: 1, minHeight: 0 }}
            key={title}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.content}
          >
            <Text style={s.eyebrow}>ATENCIÓN / AGENDA</Text>
            <Text accessibilityRole="header" style={[s.title, !!onBack && { fontSize: 29 }]}>
              {title}
              <Text style={{ color: colors.teal }}>.</Text>
            </Text>
            {children}
            <Text style={s.note}>Datos de ejemplo</Text>
          </ScrollView>
          {footer && <View style={s.footer}>{footer}</View>}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
const s = StyleSheet.create({
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
  controls: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 3 },
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
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1.4,
    marginBottom: 18,
  },
  footer: { alignSelf: 'center', minWidth: 190, maxWidth: '90%', flexShrink: 0, marginTop: 12, marginBottom: 8 },
  note: { textAlign: 'center', color: '#819BB6', fontSize: 11, marginTop: 22 },
});
