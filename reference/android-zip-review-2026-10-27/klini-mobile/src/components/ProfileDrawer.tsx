import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOOLBAR_HEIGHT } from './HomeToolbar';

export default function ProfileDrawer({
  onClose,
  children,
}: {
  onClose: () => void;
  children: (close: () => void) => ReactNode;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [progress] = useState(() => new Animated.Value(0));
  const [reduced, setReduced] = useState(false);
  const panelWidth = Math.min(326, width - 48);
  const top = insets.top + TOOLBAR_HEIGHT;
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (!active) return;
      setReduced(value);
      Animated.timing(progress, {
        toValue: 1,
        duration: value ? 0 : 280,
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
  }, [progress]);
  const close = useCallback(() => {
    Keyboard.dismiss();
    Animated.timing(progress, {
      toValue: 0,
      duration: reduced ? 0 : 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (finished) onClose();
    });
  }, [progress, reduced, onClose]);
  return (
    <View style={s.root}>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { top, backgroundColor: 'rgba(26,52,72,.16)', opacity: progress },
        ]}
      />
      <Pressable
        testID="profile-dismiss"
        accessibilityLabel="Cerrar perfil"
        onPress={close}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        pointerEvents="box-none"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[s.position, { paddingTop: top, paddingBottom: insets.bottom + 20 }]}
      >
        <Animated.View
          testID="profile-drawer"
          accessibilityViewIsModal
          style={[
            s.panel,
            {
              width: panelWidth,
              height: Math.min(442, height - top - insets.bottom - 20),
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [panelWidth + 20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {children(close)}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1 },
  position: { flex: 1, alignItems: 'flex-end' },
  panel: {
    flexShrink: 1,
    backgroundColor: 'white',
    borderRadius: 14,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E7EFF2',
    boxShadow: '0 18px 40px rgba(8,36,65,.15)',
  },
});

