import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { hapticLight } from '../utils/haptics';

type Variant = 'solid' | 'outline' | 'ghost';
type Size    = 'xs' | 'sm' | 'md' | 'lg';

interface Props {
  label: string;
  /** Ionicons name shown before label */
  icon?: string;
  /** Emoji shown before label (overrides icon) */
  emoji?: string;
  /** Base color — default uses colors.primary */
  color?: string;
  variant?: Variant;
  size?: Size;
  /** Renders as TouchableOpacity */
  onPress?: () => void;
  active?: boolean;
  style?: object;
  /** Suppress haptic on press */
  noHaptic?: boolean;
}

const SIZE: Record<Size, { px: number; py: number; fontSize: number; iconSize: number; radius: number }> = {
  xs: { px:  7, py: 3, fontSize:  9, iconSize: 10, radius: 6  },
  sm: { px: 10, py: 5, fontSize: 11, iconSize: 12, radius: 8  },
  md: { px: 13, py: 7, fontSize: 13, iconSize: 14, radius: 10 },
  lg: { px: 16, py: 9, fontSize: 15, iconSize: 16, radius: 12 },
};

export default function Chip({
  label, icon, emoji, color,
  variant = 'ghost', size = 'sm',
  onPress, active = false,
  style, noHaptic = false,
}: Props) {
  const { colors } = useTheme();
  const c = color ?? colors.primary;
  const d = SIZE[size];

  const bg: Record<Variant, string> = {
    solid:   c,
    outline: 'transparent',
    ghost:   c + '18',
  };
  const border: Record<Variant, string> = {
    solid:   c,
    outline: c + '90',
    ghost:   c + '30',
  };
  const textColor: Record<Variant, string> = {
    solid:   '#fff',
    outline: c,
    ghost:   c,
  };

  // active overrides
  const bgFinal     = active ? c         : bg[variant];
  const borderFinal = active ? c         : border[variant];
  const textFinal   = active ? '#fff'    : textColor[variant];

  const chipStyle = [
    styles.chip,
    {
      backgroundColor: bgFinal,
      borderColor: borderFinal,
      borderRadius: d.radius,
      paddingHorizontal: d.px,
      paddingVertical: d.py,
    },
    style,
  ];

  const content = (
    <>
      {emoji ? (
        <Text style={{ fontSize: d.fontSize + 1 }}>{emoji}</Text>
      ) : icon ? (
        <Ionicons name={icon as any} size={d.iconSize} color={textFinal} />
      ) : null}
      <Text style={[styles.label, { fontSize: d.fontSize, color: textFinal }]}>{label}</Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={chipStyle}
        onPress={() => { if (!noHaptic) hapticLight(); onPress(); }}
        activeOpacity={0.75}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={chipStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: '700',
  },
});
