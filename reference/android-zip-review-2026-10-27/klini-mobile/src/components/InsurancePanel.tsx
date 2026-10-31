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

export default function InsurancePanel({
  title,
  onClose,
  onBack,
  children,
  footer,
}: PropsWithChildren<{
  title: string;
  onClose: () => void;
  onBack?: () => void;
  footer?: ReactNode;
  step?: number;
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
        testID="insurance-backdrop"
        style={StyleSheet.absoluteFill}
        onPress={close}
        accessibilityLabel="Cerrar seguro médico"
      />
      <KeyboardAvoidingView
        style={[s.position, anchorTop !== null && { justifyContent: 'flex-start', paddingTop: anchorTop }]}
        pointerEvents="box-none"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View
          testID="insurance-panel"
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
                accessibilityLabel="Volver"
                testID="insurance-detail-back"
                onPress={onBack}
                style={s.back}
              >
                <Icon name="back" size={24} />
              </Pressable>
            )}
            <View style={{ flex: 1 }} />
            <Pressable
              testID="insurance-close"
              accessibilityRole="button"
              accessibilityLabel="Cerrar seguro médico"
              onPress={close}
              style={s.close}
            >
              <Icon name="close" size={25} />
            </Pressable>
          </View>
          <ScrollView
            key={title}
            style={s.scroll}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.content}
          >
            <Text accessibilityRole="header" style={s.title}>
              {title}
            </Text>
            {children}
          </ScrollView>
          <View style={s.footer}>{footer}<Text style={s.note}>Datos de ejemplo</Text></View>
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
  back: {flexDirection:'row', alignItems:'center', minHeight:44, gap:2},
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EDF2F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1, minHeight: 0 },
  content: { paddingHorizontal: 24, paddingBottom: 14, justifyContent: 'flex-start' },
  title: {
    color: colors.navy,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.7,
    marginBottom: 10,
  },
  footer: { alignSelf: 'center', minWidth: 190, marginTop: 12, marginBottom: 8, maxWidth:'90%' },
  note: { textAlign: 'center', color: '#819BB6', fontSize: 9, marginTop: 18 },
});
