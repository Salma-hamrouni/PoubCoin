import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import { Animated, Text, View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
  icon?: string;
}

interface ToastContextType {
  showToast: (opts: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

const CONFIG: Record<ToastType, { bg: string; accent: string; color: string; icon: string }> = {
  success: { bg: '#F0FDF4', accent: '#1B6B3A', color: '#14532D', icon: 'checkmark-circle' },
  error:   { bg: '#FEF2F2', accent: '#DC2626', color: '#7F1D1D', icon: 'close-circle'     },
  info:    { bg: '#EFF6FF', accent: '#2563EB', color: '#1E3A8A', icon: 'information-circle'},
  warning: { bg: '#FFFBEB', accent: '#D97706', color: '#78350F', icon: 'warning'           },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast]   = useState<ToastOptions & { id: number } | null>(null);
  const slideAnim  = useRef(new Animated.Value(-80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const iconScaleAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((opts: ToastOptions) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    // Reset anims
    slideAnim.setValue(-80);
    opacityAnim.setValue(0);
    iconScaleAnim.setValue(0);
    progressAnim.setValue(1);

    setToast({ ...opts, id: Date.now() });
    const dur = opts.duration ?? 2800;

    // Slide + fade in
    Animated.parallel([
      Animated.spring(slideAnim,    { toValue: 0,   useNativeDriver: Platform.OS !== 'web', tension: 90, friction: 11 }),
      Animated.timing(opacityAnim,  { toValue: 1,   duration: 200, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(iconScaleAnim,{ toValue: 1,   useNativeDriver: Platform.OS !== 'web', tension: 120, friction: 8, delay: 120 }),
    ]).start();

    // Progress bar drains over duration
    Animated.timing(progressAnim, { toValue: 0, duration: dur, useNativeDriver: false }).start();

    timerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(slideAnim,   { toValue: -80, duration: 260, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacityAnim, { toValue: 0,   duration: 220, useNativeDriver: Platform.OS !== 'web' }),
      ]).start(() => setToast(null));
    }, dur);
  }, [slideAnim, opacityAnim, iconScaleAnim, progressAnim]);

  const cfg  = toast ? CONFIG[toast.type ?? 'success'] : CONFIG.success;
  const icon = toast?.icon ?? cfg.icon;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            s.toast,
            { backgroundColor: cfg.bg },
            {
              opacity: opacityAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
          pointerEvents="none"
        >
          {/* Left accent bar */}
          <View style={[s.accentBar, { backgroundColor: cfg.accent }]} />

          {/* Icon with spring scale */}
          <Animated.View style={{ transform: [{ scale: iconScaleAnim }] }}>
            <View style={[s.iconBg, { backgroundColor: cfg.accent + '18' }]}>
              <Ionicons name={icon as any} size={20} color={cfg.accent} />
            </View>
          </Animated.View>

          {/* Message */}
          <Text style={[s.msg, { color: cfg.color }]} numberOfLines={2}>{toast.message}</Text>

          {/* Progress bar */}
          <Animated.View
            style={[
              s.progress,
              { backgroundColor: cfg.accent },
              { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
            ]}
          />
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const s = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 106 : 94,
    left: 16,
    right: 16,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    paddingLeft: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 9999,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  accentBar: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  iconBg: {
    width: 36, height: 36, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  msg: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  progress: {
    position: 'absolute',
    bottom: 0, left: 0,
    height: 3,
    borderBottomLeftRadius: 16,
    opacity: 0.5,
  },
});
