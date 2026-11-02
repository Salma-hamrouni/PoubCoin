import { Platform } from 'react-native';

let Haptics: any = null;
if (Platform.OS !== 'web') {
  try { Haptics = require('expo-haptics'); } catch {}
}

let _enabled = true;
export function updateHapticsEnabled(v: boolean) { _enabled = v; }

export function hapticLight()   { if (_enabled) Haptics?.impactAsync?.(Haptics?.ImpactFeedbackStyle?.Light); }
export function hapticMedium()  { if (_enabled) Haptics?.impactAsync?.(Haptics?.ImpactFeedbackStyle?.Medium); }
export function hapticHeavy()   { if (_enabled) Haptics?.impactAsync?.(Haptics?.ImpactFeedbackStyle?.Heavy); }
export function hapticSuccess() { if (_enabled) Haptics?.notificationAsync?.(Haptics?.NotificationFeedbackType?.Success); }
export function hapticError()   { if (_enabled) Haptics?.notificationAsync?.(Haptics?.NotificationFeedbackType?.Error); }
export function hapticWarning() { if (_enabled) Haptics?.notificationAsync?.(Haptics?.NotificationFeedbackType?.Warning); }
