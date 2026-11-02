import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../context/ThemeContext';

interface Props {
  /** Remote image URL */
  uri?: string | null;
  /** Emoji fallback (shown when no uri) */
  emoji?: string;
  /** Name used to generate initials fallback */
  name?: string | null;
  size?: number;
  /** Colored ring border — pass a hex color or use colors.primary */
  ring?: string;
  ringWidth?: number;
  /**
   * Badge shown at bottom-right corner.
   * Pass a string/number for a count badge, or 'online' for a green dot.
   */
  badge?: string | number | 'online';
  style?: object;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function Avatar({
  uri, emoji, name,
  size = 48, ring, ringWidth = 2,
  badge, style,
}: Props) {
  const { colors } = useTheme();
  const radius = size / 2;
  const inner  = ring ? size - ringWidth * 2 : size;
  const innerR = inner / 2;

  const fontSize = inner * 0.38;
  const label = name ? initials(name) : '?';

  const avatarContent = (
    <View style={[
      styles.inner,
      { width: inner, height: inner, borderRadius: innerR, backgroundColor: colors.primaryGhost },
    ]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: inner, height: inner, borderRadius: innerR }}
          contentFit="cover"
          transition={150}
        />
      ) : emoji ? (
        <Text style={{ fontSize: inner * 0.48 }}>{emoji}</Text>
      ) : (
        <Text style={[styles.initials, { fontSize, color: colors.primary }]}>{label}</Text>
      )}
    </View>
  );

  // Badge config
  const badgeSize = Math.round(size * 0.3);
  const badgeOffset = ring ? -ringWidth : -2;
  let badgeEl: React.ReactNode = null;
  if (badge === 'online') {
    badgeEl = (
      <View style={[
        styles.badge,
        { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2,
          backgroundColor: '#22C55E',
          bottom: badgeOffset, right: badgeOffset,
          borderWidth: 2, borderColor: colors.surface,
        },
      ]} />
    );
  } else if (badge !== undefined) {
    const countStr = typeof badge === 'number' && badge > 99 ? '99+' : String(badge);
    const bW = Math.max(badgeSize, countStr.length * 7 + 6);
    badgeEl = (
      <View style={[
        styles.badge,
        { minWidth: bW, height: badgeSize, borderRadius: badgeSize / 2,
          backgroundColor: colors.primary, paddingHorizontal: 3,
          bottom: badgeOffset, right: badgeOffset,
          borderWidth: 2, borderColor: colors.surface,
        },
      ]}>
        <Text style={{ fontSize: 9, fontWeight: '800', color: '#fff' }}>{countStr}</Text>
      </View>
    );
  }

  if (ring) {
    return (
      <View style={[{ width: size, height: size, borderRadius: radius, backgroundColor: ring, justifyContent: 'center', alignItems: 'center' }, style]}>
        {avatarContent}
        {badgeEl}
      </View>
    );
  }

  return (
    <View style={[{ width: size, height: size, borderRadius: radius, position: 'relative' }, style]}>
      {avatarContent}
      {badgeEl}
    </View>
  );
}

const styles = StyleSheet.create({
  inner: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badge: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
