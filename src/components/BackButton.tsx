import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight } from '../utils/haptics';

interface Props {
  onPress: () => void;
  /** 'dark' = white icon on green header; 'light' = primary icon on surface/bg */
  variant?: 'dark' | 'light';
  size?: number;
}

export default function BackButton({ onPress, variant = 'dark', size = 20 }: Props) {
  const isDark = variant === 'dark';
  return (
    <TouchableOpacity
      onPress={() => { hapticLight(); onPress(); }}
      style={[styles.btn, isDark ? styles.dark : styles.light]}
      activeOpacity={0.75}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons
        name="arrow-back"
        size={size}
        color={isDark ? '#fff' : '#1B6B3A'}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 42, height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dark: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  light: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: 'rgba(27,107,58,0.18)',
  },
});
