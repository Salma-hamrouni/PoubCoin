import React, { useRef } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, View } from 'react-native';
import { hapticLight } from '../utils/haptics';

interface Props {
  onDismiss: () => void;
  children: React.ReactNode;
  style?: object;
  /** Pixels of downward drag before snap-to-close (default 90) */
  threshold?: number;
}

/**
 * Wraps a bottom-sheet inner View with swipe-down-to-dismiss.
 * Drop-in replacement for the sheet's root <View>:
 *
 *   <SwipeDismiss onDismiss={() => setSelected(null)} style={s.sheet}>
 *     <View style={s.sheetHandle} />
 *     ...content...
 *   </SwipeDismiss>
 */
export default function SwipeDismiss({ onDismiss, children, style, threshold = 90 }: Props) {
  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > threshold || g.vy > 0.6) {
          hapticLight();
          Animated.timing(translateY, {
            toValue: 600,
            duration: 220,
            useNativeDriver: Platform.OS !== 'web',
          }).start(onDismiss);
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            tension: 120,
            friction: 12,
            useNativeDriver: Platform.OS !== 'web',
          }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={[style, { transform: [{ translateY }] }]}
      {...panResponder.panHandlers}
    >
      {children}
    </Animated.View>
  );
}
