import React, { useEffect, useRef } from 'react';
import { Animated, View, Platform, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

interface Props {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}

export function Skeleton({ width, height, borderRadius = 8, style }: Props) {
  const { colors, isDark } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 2,
        duration: 1200,
        useNativeDriver: Platform.OS !== 'web',
      })
    ).start();
  }, []);

  const baseColor    = isDark ? '#2A2A2A' : '#E8ECE8';
  const shimmerColor = isDark ? '#3A3A3A' : '#F4F7F4';

  return (
    <View style={[{ width, height, borderRadius, backgroundColor: baseColor, overflow: 'hidden' }, style]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [{
              translateX: shimmerAnim.interpolate({
                inputRange: [-1, 2],
                outputRange: [-300, 300],
              }),
            }],
          },
        ]}
      >
        <LinearGradient
          colors={[baseColor, shimmerColor, shimmerColor, baseColor] as any}
          locations={[0, 0.3, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, width: 300 }}
        />
      </Animated.View>
    </View>
  );
}

export function SkeletonCard({ style }: { style?: object }) {
  const { colors } = useTheme();
  return (
    <View style={[{ padding: 16, gap: 12, backgroundColor: colors.surface, borderRadius: 16 }, style]}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Skeleton width={48} height={48} borderRadius={24} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width="68%" height={14} borderRadius={7} />
          <Skeleton width="42%" height={11} borderRadius={6} />
        </View>
      </View>
      <Skeleton width="100%" height={12} borderRadius={6} />
      <Skeleton width="78%" height={12} borderRadius={6} />
      <Skeleton width="55%" height={12} borderRadius={6} />
    </View>
  );
}

export function SkeletonAvatar({ size = 48 }: { size?: number }) {
  return <Skeleton width={size} height={size} borderRadius={size / 2} />;
}

export function SkeletonText({ lines = 2, lastWidth = '60%' }: { lines?: number; lastWidth?: string }) {
  return (
    <View style={{ gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? lastWidth : '100%'}
          height={13}
          borderRadius={7}
        />
      ))}
    </View>
  );
}
