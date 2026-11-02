import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, useColorScheme } from 'react-native';
import { lightColors, darkColors } from '../theme';

export type FontScale = 0.88 | 1 | 1.15;
export type FontFamily = 'system' | 'rounded' | 'compact';
export type AppLanguage = 'fr' | 'ar' | 'en';
export type CardDensity = 'compact' | 'normal' | 'comfortable';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  colors: typeof lightColors;
  customPrimary: string | null;
  setCustomPrimary: (color: string | null) => void;
  fontScale: FontScale;
  setFontScale: (s: FontScale) => void;
  fontFamily: FontFamily;
  setFontFamily: (f: FontFamily) => void;
  language: AppLanguage;
  setLanguage: (l: AppLanguage) => void;
  fs: (size: number) => number;
  cardDensity: CardDensity;
  setCardDensity: (d: CardDensity) => void;
  hapticsEnabled: boolean;
  setHapticsEnabled: (v: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {},
  colors: lightColors,
  customPrimary: null,
  setCustomPrimary: () => {},
  fontScale: 1,
  setFontScale: () => {},
  fontFamily: 'system',
  setFontFamily: () => {},
  language: 'fr',
  setLanguage: () => {},
  fs: (s) => s,
  cardDensity: 'normal',
  setCardDensity: () => {},
  hapticsEnabled: true,
  setHapticsEnabled: () => {},
});

const STORAGE_KEY        = 'poubcoin_dark_mode';
const CUSTOM_PRIMARY_KEY = '@poubcoin_custom_primary';
const FONT_SCALE_KEY     = '@poubcoin_font_scale';
const FONT_FAMILY_KEY    = '@poubcoin_font_family';
const LANGUAGE_KEY       = '@poubcoin_language';
const CARD_DENSITY_KEY   = '@poubcoin_card_density';
const HAPTICS_KEY        = '@poubcoin_haptics';

// ── Color derivation helpers ──────────────────────────────────────────────────
function hexToRgb(hex: string) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) } : null;
}
function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(v => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
function lighten(hex: string, amt: number) {
  const c = hexToRgb(hex); if (!c) return hex;
  return rgbToHex(c.r + (255 - c.r) * amt, c.g + (255 - c.g) * amt, c.b + (255 - c.b) * amt);
}
function darken(hex: string, amt: number) {
  const c = hexToRgb(hex); if (!c) return hex;
  return rgbToHex(c.r * (1 - amt), c.g * (1 - amt), c.b * (1 - amt));
}
function ghost(hex: string, isDark: boolean) {
  const c = hexToRgb(hex); if (!c) return hex;
  // dark mode: very dark tint; light mode: very pale tint
  const mix = isDark ? 0.12 : 0.88;
  return isDark
    ? rgbToHex(c.r * mix, c.g * mix, c.b * mix)
    : rgbToHex(c.r + (255 - c.r) * mix, c.g + (255 - c.g) * mix, c.b + (255 - c.b) * mix);
}

function getInitialDark(): boolean {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  }
  return false;
}

// Map fontFamily → actual font name (web/native safe)
export function resolveFontFamily(family: FontFamily): string | undefined {
  if (Platform.OS === 'web') {
    if (family === 'rounded')  return '-apple-system, "Nunito", "Segoe UI", sans-serif';
    if (family === 'compact')  return '"SF Pro Display", "Inter", "Roboto Condensed", sans-serif';
    return undefined; // system default
  }
  // Native: use available system fonts
  if (family === 'rounded')  return 'System';
  if (family === 'compact')  return 'System';
  return undefined;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [isDark,       setIsDark]       = useState<boolean>(getInitialDark);
  const [loaded,       setLoaded]       = useState(Platform.OS === 'web');
  const [customPrimary, setCustomPrimaryState] = useState<string | null>(null);
  const [fontScale,    setFontScaleState]   = useState<FontScale>(1);
  const [fontFamily,   setFontFamilyState]  = useState<FontFamily>('system');
  const [language,     setLanguageState]    = useState<AppLanguage>('fr');
  const [cardDensity,  setCardDensityState] = useState<CardDensity>('normal');
  const [hapticsEnabled, setHapticsEnabledState] = useState<boolean>(true);

  useEffect(() => {
    const keys = [STORAGE_KEY, CUSTOM_PRIMARY_KEY, FONT_SCALE_KEY, FONT_FAMILY_KEY, LANGUAGE_KEY, CARD_DENSITY_KEY, HAPTICS_KEY];
    AsyncStorage.multiGet(keys).then(pairs => {
      const map = Object.fromEntries(pairs.map(([k, v]) => [k, v]));
      // Si l'utilisateur n'a jamais défini de préférence, suivre le thème système
      if (map[STORAGE_KEY] !== null) {
        setIsDark(map[STORAGE_KEY] === 'true');
      } else {
        setIsDark(systemScheme === 'dark');
      }
      if (map[CUSTOM_PRIMARY_KEY]) setCustomPrimaryState(map[CUSTOM_PRIMARY_KEY]);
      if (map[FONT_SCALE_KEY]) setFontScaleState(parseFloat(map[FONT_SCALE_KEY]!) as FontScale);
      if (map[FONT_FAMILY_KEY]) setFontFamilyState(map[FONT_FAMILY_KEY] as FontFamily);
      if (map[LANGUAGE_KEY]) setLanguageState(map[LANGUAGE_KEY] as AppLanguage);
      if (map[CARD_DENSITY_KEY]) setCardDensityState(map[CARD_DENSITY_KEY] as CardDensity);
      if (map[HAPTICS_KEY] === 'false') setHapticsEnabledState(false);
      setLoaded(true);
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark(d => {
      const next = !d;
      AsyncStorage.setItem(STORAGE_KEY, String(next));
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, String(next));
      }
      return next;
    });
  }, []);

  const setCustomPrimary = useCallback((color: string | null) => {
    setCustomPrimaryState(color);
    if (color === null) AsyncStorage.removeItem(CUSTOM_PRIMARY_KEY);
    else AsyncStorage.setItem(CUSTOM_PRIMARY_KEY, color);
  }, []);

  const setFontScale = useCallback((scale: FontScale) => {
    setFontScaleState(scale);
    AsyncStorage.setItem(FONT_SCALE_KEY, String(scale));
  }, []);

  const setFontFamily = useCallback((family: FontFamily) => {
    setFontFamilyState(family);
    AsyncStorage.setItem(FONT_FAMILY_KEY, family);
  }, []);

  const setLanguage = useCallback((lang: AppLanguage) => {
    setLanguageState(lang);
    AsyncStorage.setItem(LANGUAGE_KEY, lang);
  }, []);

  const setCardDensity = useCallback((d: CardDensity) => {
    setCardDensityState(d);
    AsyncStorage.setItem(CARD_DENSITY_KEY, d);
  }, []);

  const setHapticsEnabled = useCallback((v: boolean) => {
    setHapticsEnabledState(v);
    AsyncStorage.setItem(HAPTICS_KEY, String(v));
    // sync to haptics module
    import('../utils/haptics').then(m => m.updateHapticsEnabled?.(v));
  }, []);

  const baseColors = isDark ? darkColors : lightColors;
  const themeColors: typeof lightColors = customPrimary
    ? {
        ...baseColors,
        primary:      customPrimary,
        primaryLight: lighten(customPrimary, 0.2),
        primaryDark:  darken(customPrimary, 0.25),
        primaryGhost: ghost(customPrimary, isDark),
      }
    : baseColors;

  const fs = useCallback((size: number) => Math.round(size * fontScale), [fontScale]);

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{
      isDark, toggleTheme,
      colors: themeColors,
      customPrimary, setCustomPrimary,
      fontScale, setFontScale,
      fontFamily, setFontFamily,
      language, setLanguage,
      fs,
      cardDensity, setCardDensity,
      hapticsEnabled, setHapticsEnabled,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
