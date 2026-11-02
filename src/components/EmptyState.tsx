import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface Props {
  icon: string;
  emoji?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon, emoji, title, subtitle, actionLabel, onAction }: Props) {
  const { colors } = useTheme();
  const scaleAnim  = useRef(new Animated.Value(0.72)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const floatAnim  = useRef(new Animated.Value(0)).current;
  const dot1Anim   = useRef(new Animated.Value(0)).current;
  const dot2Anim   = useRef(new Animated.Value(0)).current;
  const dot3Anim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 55, friction: 7, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 380, useNativeDriver: Platform.OS !== 'web' }),
    ]).start(() => {
      // Float loop after entrance
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, { toValue: -10, duration: 1600, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(floatAnim, { toValue:   0, duration: 1600, useNativeDriver: Platform.OS !== 'web' }),
        ])
      ).start();
    });

    // Staggered dot pulse
    const pulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(anim, { toValue: 0.3, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
        ])
      ).start();

    pulse(dot1Anim, 0);
    pulse(dot2Anim, 200);
    pulse(dot3Anim, 400);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      {/* Decorative rings */}
      <View style={[styles.ring3, { borderColor: colors.primary + '08' }]} />
      <View style={[styles.ring2, { borderColor: colors.primary + '12' }]} />
      <View style={[styles.ring1, { borderColor: colors.primary + '20' }]} />

      {/* Floating icon */}
      <Animated.View style={[
        styles.iconWrap,
        { backgroundColor: colors.primaryGhost, borderColor: colors.primary + '28' },
        { transform: [{ translateY: floatAnim }] },
      ]}>
        {emoji ? (
          <Text style={styles.emoji}>{emoji}</Text>
        ) : (
          <Ionicons name={icon as any} size={46} color={colors.primary} />
        )}
      </Animated.View>

      {/* Animated dots */}
      <View style={styles.dotsRow}>
        {[dot1Anim, dot2Anim, dot3Anim].map((a, i) => (
          <Animated.View key={i} style={[styles.dot, { backgroundColor: colors.primary, opacity: a }]} />
        ))}
      </View>

      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>}

      {actionLabel && onAction && (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={onAction}
          activeOpacity={0.82}
        >
          <Text style={styles.btnText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const RING_BASE = 108;
const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 52, paddingHorizontal: 32, gap: 10 },

  ring1: { position: 'absolute', top: 36, width: RING_BASE + 24, height: RING_BASE + 24, borderRadius: (RING_BASE + 24) / 2, borderWidth: 1.5 },
  ring2: { position: 'absolute', top: 18, width: RING_BASE + 56, height: RING_BASE + 56, borderRadius: (RING_BASE + 56) / 2, borderWidth: 1 },
  ring3: { position: 'absolute', top:  2, width: RING_BASE + 90, height: RING_BASE + 90, borderRadius: (RING_BASE + 90) / 2, borderWidth: 1 },

  iconWrap: {
    width: RING_BASE, height: RING_BASE, borderRadius: RING_BASE / 2,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, marginBottom: 4,
    shadowColor: '#1B6B3A', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15, shadowRadius: 14, elevation: 6,
  },
  emoji: { fontSize: 50 },

  dotsRow: { flexDirection: 'row', gap: 6, marginTop: 2, marginBottom: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },

  title: { fontSize: 20, fontWeight: '900', textAlign: 'center', letterSpacing: -0.3 },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22, maxWidth: 260 },
  btn: {
    marginTop: 8, borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14,
    shadowColor: '#1B6B3A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
