import React, { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
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
  dismissible = true,
  selectionComplete = false,
  onSelectionClose,
}: {
  onClose: () => void;
  children: (close: () => void, closing: boolean) => ReactNode;
  dismissible?: boolean;
  selectionComplete?: boolean;
  onSelectionClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [progress] = useState(() => new Animated.Value(0));
  const [reduced, setReduced] = useState(false);
  const [closing, setClosing] = useState(false);
  const closingNow = useRef(false);
  const canClose = useRef(dismissible);
  const mounted = useRef(true);
  const finishReducedExit = useRef(false);
  const panelWidth = Math.min(326, width - 48);
  const top = insets.top + TOOLBAR_HEIGHT;
  useEffect(() => {
    let active = true;
    mounted.current = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (!active) return;
      setReduced(value);
      if (closingNow.current) return;
      Animated.timing(progress, {
        toValue: 1,
        duration: value ? 0 : 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      setReduced(value);
      if (value && closingNow.current) {
        finishReducedExit.current = true;
        progress.stopAnimation();
      }
    });
    return () => {
      active = false;
      mounted.current = false;
      subscription.remove();
      progress.stopAnimation();
    };
  }, [progress]);
  useEffect(() => {
    canClose.current = dismissible;
    if (!dismissible && closingNow.current) {
      progress.stopAnimation(() => {
        closingNow.current = false;
        progress.setValue(1);
        setClosing(false);
      });
    }
  }, [dismissible, progress]);
  const close = useCallback((selected = false) => {
    if (!dismissible || closingNow.current) return;
    closingNow.current = true;
    finishReducedExit.current = false;
    setClosing(true);
    Keyboard.dismiss();
    Animated.timing(progress, {
      toValue: 0,
      duration: reduced ? 0 : selected ? 1000 : 200,
      easing: selected ? Easing.inOut(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (!mounted.current) return;
      // A saved selection must not leave an interrupted, permanently locked drawer.
      if ((finished || selected || finishReducedExit.current) && canClose.current) {
        if (!finished) progress.setValue(0);
        if (selected) onSelectionClose();
        else onClose();
      }
      else {
        closingNow.current = false;
        progress.setValue(1);
        setClosing(false);
      }
    });
  }, [progress, reduced, onClose, onSelectionClose, dismissible]);
  useEffect(() => {
    // Wait for the saved selection and its busy=false render before starting the exit.
    if (selectionComplete && dismissible) close(true);
  }, [selectionComplete, dismissible, close]);
  return (
    <View style={s.root}>
      <Animated.View
        testID="profile-drawer-backdrop"
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { top, backgroundColor: 'rgba(26,52,72,.16)', opacity: progress },
        ]}
      />
      <Pressable
        testID="profile-dismiss"
        accessibilityLabel="Cerrar perfil"
        onPress={() => close()}
        disabled={!dismissible || closing}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        pointerEvents="box-none"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[s.position, { paddingTop: top, paddingBottom: insets.bottom + 20 }]}
      >
        <Animated.View
          testID="profile-drawer"
          pointerEvents={closing ? 'none' : 'auto'}
          accessibilityViewIsModal
          style={[
            s.panel,
            {
              width: panelWidth,
              height: Math.max(0, height - top - insets.bottom - 20),
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
          {/* The render prop passes close to event handlers; it never invokes it during render. */}
          {/* eslint-disable-next-line react-hooks/refs */}
          {children(() => close(), closing)}
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

