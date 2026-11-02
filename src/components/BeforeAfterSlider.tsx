import React, { useState, useRef } from 'react';
import { View, Text, Image, PanResponder, Animated } from 'react-native';

interface Props {
  beforeUri: string;
  afterUri: string;
}

export default function BeforeAfterSlider({ beforeUri, afterUri }: Props) {
  const [containerWidth, setContainerWidth] = useState(300);
  const [sliderX, setSliderX] = useState(150);
  const pct = containerWidth > 0 ? Math.max(0, Math.min(1, sliderX / containerWidth)) : 0.5;

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gs) => {
      setSliderX(prev => Math.max(0, Math.min(containerWidth, prev + gs.dx)));
    },
  })).current;

  return (
    <View
      style={{ width: '100%', borderRadius: 12, overflow: 'hidden', aspectRatio: 4 / 3 }}
      onLayout={e => { const w = e.nativeEvent.layout.width; setContainerWidth(w); setSliderX(w / 2); }}
    >
      {/* After image (full) */}
      <Image source={{ uri: afterUri }} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />
      {/* Before image (clipped) */}
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: sliderX, overflow: 'hidden' }}>
        <Image source={{ uri: beforeUri }} style={{ width: containerWidth, height: '100%' }} resizeMode="cover" />
      </View>
      {/* Divider line */}
      <View style={{ position: 'absolute', left: sliderX - 1, top: 0, bottom: 0, width: 2, backgroundColor: '#fff' }} />
      {/* Handle */}
      <View
        {...panResponder.panHandlers}
        style={{
          position: 'absolute', left: sliderX - 20, top: '50%',
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
          shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
          marginTop: -20,
        }}
      >
        <Text style={{ fontSize: 16, color: '#374151' }}>⇔</Text>
      </View>
      {/* Labels */}
      <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>AVANT</Text>
      </View>
      <View style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(34,197,94,0.85)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>APRÈS ✓</Text>
      </View>
    </View>
  );
}
