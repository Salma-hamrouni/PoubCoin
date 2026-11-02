import React, { useRef } from 'react';
import { Animated, TouchableOpacity, StyleProp, ViewStyle, Platform } from 'react-native';

interface Props {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  scale?: number;
  activeOpacity?: number;
  disabled?: boolean;
  children: React.ReactNode;
}

export default function PressableScale({
  onPress,
  style,
  scale = 0.96,
  activeOpacity = 1,
  disabled = false,
  children,
}: Props) {
  const anim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(anim, { toValue: scale, useNativeDriver: Platform.OS !== 'web', speed: 50, bounciness: 4 }).start();
  };
  const onPressOut = () => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: Platform.OS !== 'web', speed: 50, bounciness: 4 }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={activeOpacity}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale: anim }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}
