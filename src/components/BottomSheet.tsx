import React, { useRef, useEffect, useCallback } from 'react';
import {
  Animated, Dimensions, Modal, PanResponder,
  Platform, StyleSheet, TouchableWithoutFeedback, View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { hapticLight } from '../utils/haptics';

const { height: SCREEN_H } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /**
   * Height of the sheet as a fraction of screen height (0–1), or 'auto'.
   * Default 'auto' — sheet wraps its content.
   */
  snapHeight?: number | 'auto';
  /** Extra padding-bottom inside the sheet (e.g. for safe-area on iPhone) */
  bottomPadding?: number;
}

export default function BottomSheet({
  visible, onClose, children,
  snapHeight = 'auto', bottomPadding = 24,
}: Props) {
  const { colors } = useTheme();

  const sheetH = snapHeight === 'auto' ? undefined : SCREEN_H * snapHeight;

  const translateY  = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropOp  = useRef(new Animated.Value(0)).current;

  // ── Open / close animations ──────────────────────────────────────
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 72, friction: 13,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(backdropOp, {
          toValue: 1, duration: 260,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  }, [visible]);

  const closeSheet = useCallback(() => {
    hapticLight();
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_H, duration: 260,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(backdropOp, {
        toValue: 0, duration: 220,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(onClose);
  }, [onClose]);

  // ── Swipe-to-dismiss ─────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100 || g.vy > 0.55) {
          closeSheet();
        } else {
          Animated.spring(translateY, {
            toValue: 0, tension: 120, friction: 12,
            useNativeDriver: Platform.OS !== 'web',
          }).start();
        }
      },
    })
  ).current;

  // Reset position when re-opened
  useEffect(() => {
    if (!visible) translateY.setValue(SCREEN_H);
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={closeSheet}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={closeSheet}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOp }]} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surface,
            height: sheetH,
            paddingBottom: bottomPadding,
            transform: [{ translateY }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Drag handle */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 14,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
});
