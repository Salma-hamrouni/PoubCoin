import React, { useState, useEffect } from 'react';
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  Switch, Platform, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, FontScale, FontFamily, AppLanguage, CardDensity } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n/useT';
import { radius, shadow } from '../theme';

// ── Widget config (mirrored in HomeScreen) ─────────────────────────────────
export const WIDGET_KEYS = [
  'widget_mission',
  'widget_streak',
  'widget_stats',
  'widget_monthly',
  'widget_city',
] as const;

export type WidgetKey = typeof WIDGET_KEYS[number];

export const WIDGET_LABELS: Record<WidgetKey, { label: string; emoji: string; desc: string }> = {
  widget_mission:  { label: 'Mission secrète',    emoji: '🗺️', desc: 'Carte avec la mission hebdomadaire' },
  widget_streak:   { label: 'Série de jours',      emoji: '🔥', desc: 'Votre streak de signalements' },
  widget_stats:    { label: 'Mes statistiques',    emoji: '📊', desc: 'Total, validés, coins' },
  widget_monthly:  { label: 'Rapport mensuel',     emoji: '📅', desc: 'Accès rapide au rapport du mois' },
  widget_city:     { label: 'Score de ma ville',   emoji: '🏙️', desc: 'Indicateur de propreté de votre quartier' },
};

export const WIDGETS_STORAGE_KEY = '@poubcoin_widgets';

export async function loadWidgets(): Promise<Record<WidgetKey, boolean>> {
  try {
    const v = await AsyncStorage.getItem(WIDGETS_STORAGE_KEY);
    if (v) return JSON.parse(v);
  } catch {}
  return { widget_mission: true, widget_streak: true, widget_stats: true, widget_monthly: true, widget_city: false };
}

// ── Nav tiles order ─────────────────────────────────────────────────────────
export const NAV_TILES_KEY = '@poubcoin_nav_order';

export type NavTile = {
  icon: string; labelKey: string; screen: string; color: string; bg: string;
};

export const ALL_NAV_TILES: NavTile[] = [
  { icon: 'flash',           labelKey: 'nav_challenges',      screen: 'Challenges',             color: '#F57F17', bg: '#FFF3E0' },
  { icon: 'bar-chart',       labelKey: 'nav_stats',           screen: 'Stats',                  color: '#1976D2', bg: '#EFF6FF' },
  { icon: 'trophy',          labelKey: 'nav_leaderboard',     screen: 'Leaderboard',            color: '#6A1B9A', bg: '#F3E5F5' },
  { icon: 'map',             labelKey: 'nav_map',             screen: 'Map',                    color: '#1B6B3A', bg: '#EEF7F1' },
  { icon: 'sparkles',        labelKey: 'nav_ai',              screen: 'WasteAI',                color: '#7C3AED', bg: '#F3E8FF' },
  { icon: 'people',          labelKey: 'nav_team',            screen: 'Team',                   color: '#00897B', bg: '#E0F2F1' },
  { icon: 'earth',           labelKey: 'nav_feed',            screen: 'Feed',                   color: '#1565C0', bg: '#E3F2FD' },
  { icon: 'thumbs-up',       labelKey: 'nav_vote',            screen: 'Vote',                   color: '#6A1B9A', bg: '#F3E5F5' },
  { icon: 'calendar',        labelKey: 'nav_events',          screen: 'Events',                 color: '#0284C7', bg: '#E0F2FE' },
  { icon: 'compass',         labelKey: 'nav_explore',         screen: 'Explore',                color: '#7C3AED', bg: '#F3E8FF' },
  { icon: 'leaf',            labelKey: 'nav_plant',           screen: 'PlantTree',              color: '#16A34A', bg: '#F0FDF4' },
  { icon: 'map-outline',     labelKey: 'nav_nearby',          screen: 'NearbyMissions',         color: '#134E2A', bg: '#ECFDF5' },
  { icon: 'images-outline',  labelKey: 'nav_stories',         screen: 'CitizenStories',         color: '#0F172A', bg: '#F8FAFC' },
  { icon: 'medal-outline',   labelKey: 'nav_achievements',    screen: 'AchievementLeaderboard', color: '#D97706', bg: '#FEF3C7' },
  { icon: 'person-add',      labelKey: 'nav_referral',        screen: 'Referral',               color: '#F57F17', bg: '#FFF3E0' },
  { icon: 'snow',            labelKey: 'nav_streak_freeze',   screen: 'StreakFreeze',           color: '#3B82F6', bg: '#EFF6FF' },
  { icon: 'chatbubbles',    labelKey: 'nav_community',       screen: 'Community',              color: '#0891B2', bg: '#ECFEFF' },
  { icon: 'leaf-outline',   labelKey: 'nav_impact',          screen: 'Impact',                 color: '#16A34A', bg: '#F0FDF4' },
  { icon: 'hammer-outline', labelKey: 'nav_auction',         screen: 'Auction',                color: '#7C3AED', bg: '#F5F3FF' },
  { icon: 'mic',           labelKey: 'nav_voice_report',    screen: 'VoiceReport',            color: '#DC2626', bg: '#FEF2F2' },
  { icon: 'people-circle', labelKey: 'nav_friends',         screen: 'Friends',                color: '#0891B2', bg: '#ECFEFF' },
  { icon: 'game-controller', labelKey: 'nav_game',          screen: 'WasteSortingGame',       color: '#7C3AED', bg: '#F5F3FF' },
];

// ── Components ───────────────────────────────────────────────────────────────

function SectionHeader({ title, emoji }: { title: string; emoji: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 8 }}>
      <Text style={{ fontSize: 16 }}>{emoji}</Text>
      <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, letterSpacing: 0.3 }}>{title}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
    </View>
  );
}

function SettingRow({ label, sublabel, right }: { label: string; sublabel?: string; right: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{
      backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16,
      flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8,
      borderWidth: 1, borderColor: colors.border, ...shadow.sm,
    }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{label}</Text>
        {sublabel ? <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{sublabel}</Text> : null}
      </View>
      {right}
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

const BANNER_COLORS = [
  '#1B6B3A', '#2563EB', '#7C3AED', '#DC2626',
  '#D97706', '#0891B2', '#DB2777', '#0F172A',
  '#064E3B', '#1E3A5F', '#4A1D96', '#7F1D1D',
];

const AVATAR_CATEGORIES: Record<string, string[]> = {
  '🌿 Nature':  ['🌱','🌿','🌳','🍃','🌻','🌺','🍀','🌵','🌊','🏔️','🌈','🌙','🌸','🌾','🍁','🌴','🌷','🌞'],
  '♻️ Écologie': ['♻️','🌍','🦺','🧹','💚','🐢','🦋','🐝','🦜','💧','☀️','🌬️','🌱','🐠','🐋','🦅','🐘','🦁'],
  '🏆 Trophées': ['⭐','🔥','💎','🏆','🏅','🎯','🚀','👑','🎖️','🌟','⚡','🎉','💪','🦸','🎗️','🥇','🛡️','🔑'],
  '😊 Visages':  ['😊','🤗','😎','🥳','🤩','😇','🧐','🤓','😴','🥰','😤','🤔','🙃','😋','🤭','😏','🥸','😜'],
};

export default function PersonalizeScreen({ navigation }: any) {
  const { colors, isDark, toggleTheme, customPrimary, setCustomPrimary, fontScale, setFontScale, fontFamily, setFontFamily, language, setLanguage, fs, cardDensity, setCardDensity, hapticsEnabled, setHapticsEnabled } = useTheme();
  const t = useT();
  const { user, updateProfile } = useAuth();

  const [widgets, setWidgets] = useState<Record<WidgetKey, boolean>>({
    widget_mission: true, widget_streak: true, widget_stats: true, widget_monthly: true, widget_city: false,
  });

  const [hiddenTiles, setHiddenTiles] = useState<Set<string>>(new Set());
  const [pinnedTiles, setPinnedTiles] = useState<string[]>([]);
  const [homeCols, setHomeCols] = useState<2 | 3 | 4>(3);
  const [bannerColor, setBannerColorState] = useState(user?.bannerColor ?? '#1B6B3A');

  // New personalization state
  const [hexInput, setHexInput] = useState('');
  const [avatarCategory, setAvatarCategory] = useState(Object.keys(AVATAR_CATEGORIES)[0]);
  const [profilePublic, setProfilePublic] = useState(true);
  const [showCoins, setShowCoins] = useState(true);
  const [showStreak, setShowStreak] = useState(true);

  useEffect(() => {
    loadWidgets().then(setWidgets);
    AsyncStorage.multiGet([
      '@poubcoin_hidden_tiles',
      '@poubcoin_pinned_tiles',
      '@poubcoin_home_cols',
      '@poubcoin_profile_public',
      '@poubcoin_show_coins',
      '@poubcoin_show_streak',
    ]).then(pairs => {
      const map = Object.fromEntries(pairs.map(([k, v]) => [k, v]));
      if (map['@poubcoin_hidden_tiles']) setHiddenTiles(new Set(JSON.parse(map['@poubcoin_hidden_tiles']!)));
      if (map['@poubcoin_pinned_tiles']) setPinnedTiles(JSON.parse(map['@poubcoin_pinned_tiles']!));
      if (map['@poubcoin_home_cols']) setHomeCols(parseInt(map['@poubcoin_home_cols']!) as 2 | 3 | 4);
      if (map['@poubcoin_profile_public'] === 'false') setProfilePublic(false);
      if (map['@poubcoin_show_coins'] === 'false') setShowCoins(false);
      if (map['@poubcoin_show_streak'] === 'false') setShowStreak(false);
    });
  }, []);

  const saveWidgets = (next: Record<WidgetKey, boolean>) => {
    setWidgets(next);
    AsyncStorage.setItem(WIDGETS_STORAGE_KEY, JSON.stringify(next));
  };

  const toggleWidget = (key: WidgetKey) => {
    saveWidgets({ ...widgets, [key]: !widgets[key] });
  };

  const toggleTileVisible = (screen: string) => {
    const next = new Set(hiddenTiles);
    if (next.has(screen)) next.delete(screen);
    else next.add(screen);
    setHiddenTiles(next);
    AsyncStorage.setItem('@poubcoin_hidden_tiles', JSON.stringify(Array.from(next)));
  };

  const toggleTilePinned = (screen: string) => {
    const next = pinnedTiles.includes(screen)
      ? pinnedTiles.filter(s => s !== screen)
      : [screen, ...pinnedTiles];
    setPinnedTiles(next);
    AsyncStorage.setItem('@poubcoin_pinned_tiles', JSON.stringify(next));
  };

  const applyHexColor = () => {
    const hex = hexInput.trim().replace(/^#/, '');
    if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
      setCustomPrimary(`#${hex}`);
      setHexInput('');
    } else {
      Alert.alert('Couleur invalide', 'Entrez un code hex valide (ex: 2563EB)');
    }
  };

  const togglePrivacy = (key: string, val: boolean, setter: (v: boolean) => void) => {
    setter(val);
    AsyncStorage.setItem(key, String(val));
  };

  const FONT_SIZES: { label: string; value: FontScale; preview: string }[] = [
    { label: 'Petit',  value: 0.88, preview: 'Aa' },
    { label: 'Normal', value: 1,    preview: 'Aa' },
    { label: 'Grand',  value: 1.15, preview: 'Aa' },
  ];

  const FONT_FAMILIES: { label: string; value: FontFamily; desc: string }[] = [
    { label: 'Système',   value: 'system',  desc: 'Police par défaut de votre appareil' },
    { label: 'Arrondie',  value: 'rounded', desc: 'Style plus doux et moderne' },
    { label: 'Compacte',  value: 'compact', desc: 'Plus d\'informations à l\'écran' },
  ];

  const PALETTE = [
    { color: '#1B6B3A', label: 'Vert (défaut)' },
    { color: '#2563EB', label: 'Bleu' },
    { color: '#7C3AED', label: 'Violet' },
    { color: '#DC2626', label: 'Rouge' },
    { color: '#D97706', label: 'Orange' },
    { color: '#0891B2', label: 'Cyan' },
    { color: '#DB2777', label: 'Rose' },
    { color: '#64748B', label: 'Gris' },
    { color: '#0F172A', label: 'Noir' },
    { color: '#B45309', label: 'Ambre' },
  ];

  const previewScale = fontScale;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        backgroundColor: colors.primary, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20,
        flexDirection: 'row', alignItems: 'center', gap: 14,
        overflow: 'hidden',
      }}>
        <View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.07)', top: -50, right: -20 }} />
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5 }}>{t('personalize_title').toUpperCase()}</Text>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.3, marginTop: 1 }}>{t('personalize_subtitle')}</Text>
        </View>
        <Text style={{ fontSize: 26 }}>🎨</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 4 }}>

        {/* ── Thème ── */}
        <SectionHeader title={t('personalize_theme')} emoji="🌗" />

        {/* Mode sombre */}
        <SettingRow
          label="Mode sombre"
          sublabel={isDark ? 'Interface sombre activée' : 'Interface claire activée'}
          right={
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor="#fff"
            />
          }
        />

        {/* Couleur principale */}
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 8, ...shadow.xs }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Couleur principale</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 14 }}>Appliquée sur les boutons, icônes et accents</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {PALETTE.map(p => {
              const isSelected = (customPrimary ?? '#1B6B3A') === p.color;
              return (
                <TouchableOpacity key={p.color} onPress={() => setCustomPrimary(p.color === '#1B6B3A' ? null : p.color)} style={{ alignItems: 'center', gap: 5 }}>
                  <View style={{
                    width: 50, height: 50, borderRadius: 25,
                    borderWidth: isSelected ? 3 : 0,
                    borderColor: isSelected ? colors.text : 'transparent',
                    justifyContent: 'center', alignItems: 'center',
                    padding: isSelected ? 3 : 0,
                  }}>
                    <View style={{
                      flex: 1, width: '100%', borderRadius: 25, backgroundColor: p.color,
                      justifyContent: 'center', alignItems: 'center',
                    }}>
                      {isSelected && <Ionicons name="checkmark" size={22} color="#fff" />}
                    </View>
                  </View>
                  <Text style={{ fontSize: 9, color: isSelected ? colors.text : colors.textMuted, fontWeight: isSelected ? '800' : '400', textAlign: 'center', maxWidth: 50 }} numberOfLines={1}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {/* Hex color input */}
          <View style={{ marginTop: 16, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.background }}>
              <Text style={{ paddingHorizontal: 12, fontSize: 14, color: colors.textMuted, fontWeight: '700' }}>#</Text>
              <TextInput
                value={hexInput}
                onChangeText={v => setHexInput(v.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6))}
                placeholder="2563EB"
                placeholderTextColor={colors.textMuted}
                style={{ flex: 1, paddingVertical: 10, fontSize: 14, color: colors.text, fontFamily: 'monospace' }}
                maxLength={6}
                autoCapitalize="characters"
              />
              {hexInput.length === 6 && (
                <View style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: `#${hexInput}`, margin: 6 }} />
              )}
            </View>
            <TouchableOpacity
              onPress={applyHexColor}
              style={{ paddingHorizontal: 16, paddingVertical: 11, backgroundColor: colors.primary, borderRadius: radius.md }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Appliquer</Text>
            </TouchableOpacity>
          </View>
          {customPrimary && (
            <TouchableOpacity
              onPress={() => setCustomPrimary(null)}
              style={{ marginTop: 10, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm }}
            >
              <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>Réinitialiser la couleur</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Typographie ── */}
        <SectionHeader title={t('personalize_typo')} emoji="✍️" />

        {/* Taille du texte */}
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 8, ...shadow.xs }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 12 }}>Taille du texte</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {FONT_SIZES.map(opt => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setFontScale(opt.value)}
                style={{
                  flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: radius.md,
                  borderWidth: 2,
                  borderColor: fontScale === opt.value ? colors.primary : colors.border,
                  backgroundColor: fontScale === opt.value ? colors.primaryGhost : colors.background,
                }}
              >
                <Text style={{ fontSize: opt.value === 0.88 ? 18 : opt.value === 1 ? 24 : 30, color: fontScale === opt.value ? colors.primary : colors.textMuted, fontWeight: '700' }}>
                  {opt.preview}
                </Text>
                <Text style={{ fontSize: 11, color: fontScale === opt.value ? colors.primary : colors.textMuted, marginTop: 4, fontWeight: '600' }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Live preview */}
          <View style={{ marginTop: 14, padding: 12, backgroundColor: colors.background, borderRadius: radius.md }}>
            <Text style={{ fontSize: fs(11), color: colors.textMuted, fontWeight: '600', letterSpacing: 0.5 }}>APERÇU EN DIRECT</Text>
            <Text style={{ fontSize: fs(18), fontWeight: '700', color: colors.text, marginTop: 4 }}>Bienvenue sur PoubCoin</Text>
            <Text style={{ fontSize: fs(13), color: colors.textSecondary, marginTop: 3, lineHeight: fs(20) }}>
              Signalez un déchet et gagnez 50 coins récompenses.
            </Text>
          </View>
        </View>

        {/* Police */}
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 8, ...shadow.xs }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 12 }}>Style de police</Text>
          {FONT_FAMILIES.map(opt => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setFontFamily(opt.value)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                padding: 12, borderRadius: radius.md, marginBottom: 8,
                borderWidth: 1.5,
                borderColor: fontFamily === opt.value ? colors.primary : colors.border,
                backgroundColor: fontFamily === opt.value ? colors.primaryGhost : colors.background,
              }}
            >
              <View style={{
                width: 40, height: 40, borderRadius: radius.sm,
                backgroundColor: fontFamily === opt.value ? colors.primary : colors.border,
                justifyContent: 'center', alignItems: 'center',
              }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>A</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: fontFamily === opt.value ? colors.primary : colors.text }}>{opt.label}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>{opt.desc}</Text>
              </View>
              {fontFamily === opt.value && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Langue ── */}
        <SectionHeader title={t('personalize_lang')} emoji="🌐" />
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 8, ...shadow.xs }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 12 }}>{t('personalize_lang_title')}</Text>
          {([
            { value: 'fr' as AppLanguage, label: 'Français', flag: '🇫🇷', desc: 'Interface en français' },
            { value: 'ar' as AppLanguage, label: 'العربية',  flag: '🇹🇳', desc: 'الواجهة بالعربية' },
            { value: 'en' as AppLanguage, label: 'English',  flag: '🇬🇧', desc: 'Interface in English' },
          ] as { value: AppLanguage; label: string; flag: string; desc: string }[]).map(opt => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setLanguage(opt.value)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                padding: 12, borderRadius: radius.md, marginBottom: 8,
                borderWidth: 1.5,
                borderColor: language === opt.value ? colors.primary : colors.border,
                backgroundColor: language === opt.value ? colors.primaryGhost : colors.background,
              }}
            >
              <Text style={{ fontSize: 28 }}>{opt.flag}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: language === opt.value ? colors.primary : colors.text }}>{opt.label}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>{opt.desc}</Text>
              </View>
              {language === opt.value && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Avatar & Bannière ── */}
        <SectionHeader title={t('personalize_avatar')} emoji="🖼️" />

        {/* Bannière */}
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 8, ...shadow.xs }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Couleur de bannière de profil</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 14 }}>Visible sur votre carte de profil</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {BANNER_COLORS.map(c => {
              const sel = bannerColor === c;
              return (
                <TouchableOpacity key={c} onPress={() => {
                  setBannerColorState(c);
                  updateProfile({ bannerColor: c } as any);
                }}>
                  <View style={{
                    width: 40, height: 40, borderRadius: radius.sm, backgroundColor: c,
                    borderWidth: sel ? 3 : 1.5,
                    borderColor: sel ? colors.text : 'transparent',
                    justifyContent: 'center', alignItems: 'center',
                  }}>
                    {sel && <Ionicons name="checkmark" size={18} color="#fff" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          {/* Preview */}
          <View style={{ marginTop: 14, height: 60, borderRadius: radius.md, backgroundColor: bannerColor, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontSize: 13 }}>Aperçu bannière</Text>
          </View>
        </View>

        {/* Avatar with categories */}
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 8, ...shadow.xs }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 10 }}>Avatar</Text>
          {/* Category tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {Object.keys(AVATAR_CATEGORIES).map(cat => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setAvatarCategory(cat)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill,
                    backgroundColor: avatarCategory === cat ? colors.primary : colors.background,
                    borderWidth: 1, borderColor: avatarCategory === cat ? colors.primary : colors.border,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: avatarCategory === cat ? '#fff' : colors.textMuted }}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          {/* Avatar grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {(AVATAR_CATEGORIES[avatarCategory] ?? []).map(a => {
              const sel = (user?.avatar ?? '🌱') === a;
              return (
                <TouchableOpacity
                  key={a}
                  onPress={() => updateProfile({ avatar: a })}
                  style={{
                    width: 48, height: 48, borderRadius: 24,
                    backgroundColor: sel ? colors.primaryGhost : colors.background,
                    justifyContent: 'center', alignItems: 'center',
                    borderWidth: sel ? 2.5 : 1,
                    borderColor: sel ? colors.primary : colors.border,
                  }}
                >
                  <Text style={{ fontSize: 26 }}>{a}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Confidentialité ── */}
        <SectionHeader title="Confidentialité" emoji="🔒" />
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 8, overflow: 'hidden', ...shadow.xs }}>
          {[
            { label: 'Profil public', sublabel: 'Votre profil est visible par tous les citoyens', value: profilePublic, key: '@poubcoin_profile_public', setter: setProfilePublic },
            { label: 'Afficher mes coins', sublabel: 'Votre solde PoubCoins visible sur votre profil', value: showCoins, key: '@poubcoin_show_coins', setter: setShowCoins },
            { label: 'Afficher ma série', sublabel: 'Votre streak de jours consécutifs visible', value: showStreak, key: '@poubcoin_show_streak', setter: setShowStreak },
          ].map((item, i, arr) => (
            <View key={item.key} style={{
              flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12,
              borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: colors.border,
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{item.label}</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{item.sublabel}</Text>
              </View>
              <Switch
                value={item.value}
                onValueChange={v => togglePrivacy(item.key, v, item.setter)}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>

        {/* ── Densité des cartes ── */}
        <SectionHeader title="Densité des cartes" emoji="📋" />
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 8, ...shadow.xs }}>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 14 }}>Ajustez l'espacement des éléments dans les listes</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {([
              { value: 'compact' as CardDensity, label: 'Compact', icon: '▪️▪️▪️', desc: 'Plus de contenu' },
              { value: 'normal'  as CardDensity, label: 'Normal',  icon: '◾◾',    desc: 'Équilibré' },
              { value: 'comfortable' as CardDensity, label: 'Confort', icon: '◼️', desc: 'Plus d\'air' },
            ]).map(opt => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setCardDensity(opt.value)}
                style={{
                  flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: radius.md, gap: 6,
                  borderWidth: 2,
                  borderColor: cardDensity === opt.value ? colors.primary : colors.border,
                  backgroundColor: cardDensity === opt.value ? colors.primaryGhost : colors.background,
                }}
              >
                <Text style={{ fontSize: 16 }}>{opt.icon}</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: cardDensity === opt.value ? colors.primary : colors.text }}>{opt.label}</Text>
                <Text style={{ fontSize: 10, color: colors.textMuted, textAlign: 'center' }}>{opt.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Density preview */}
          <View style={{ marginTop: 14, gap: cardDensity === 'compact' ? 4 : cardDensity === 'comfortable' ? 12 : 8 }}>
            {['Signalement · La Marsa', 'Signalement · El Menzah'].map((label, i) => (
              <View key={i} style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                padding: cardDensity === 'compact' ? 8 : cardDensity === 'comfortable' ? 16 : 12,
                backgroundColor: colors.background, borderRadius: radius.md,
                borderWidth: 1, borderColor: colors.border,
              }}>
                <View style={{ width: cardDensity === 'compact' ? 28 : cardDensity === 'comfortable' ? 44 : 36, height: cardDensity === 'compact' ? 28 : cardDensity === 'comfortable' ? 44 : 36, borderRadius: 8, backgroundColor: colors.primaryGhost, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: cardDensity === 'compact' ? 14 : cardDensity === 'comfortable' ? 20 : 17 }}>🗑️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: cardDensity === 'compact' ? 11 : cardDensity === 'comfortable' ? 14 : 13, fontWeight: '600', color: colors.text }}>{label}</Text>
                  <Text style={{ fontSize: 10, color: colors.textMuted }}>En attente · 50 🪙</Text>
                </View>
                <View style={{ backgroundColor: '#FEF9C3', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 10, color: '#B45309', fontWeight: '700' }}>⏳</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Retours tactiles ── */}
        <SectionHeader title="Retours tactiles" emoji="📳" />
        <SettingRow
          label="Vibrations & haptics"
          sublabel={hapticsEnabled ? 'Retour tactile activé sur les actions' : 'Aucune vibration'}
          right={
            <Switch
              value={hapticsEnabled}
              onValueChange={setHapticsEnabled}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor="#fff"
            />
          }
        />

        {/* ── Disposition de l'accueil ── */}
        <SectionHeader title={t('personalize_layout')} emoji="📐" />
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 8, ...shadow.xs }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Colonnes des raccourcis</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 14 }}>Nombre de raccourcis par ligne sur l'accueil</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {([2, 3, 4] as (2 | 3 | 4)[]).map(n => (
              <TouchableOpacity
                key={n}
                onPress={() => { setHomeCols(n); AsyncStorage.setItem('@poubcoin_home_cols', String(n)); }}
                style={{
                  flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: radius.md,
                  borderWidth: 2,
                  borderColor: homeCols === n ? colors.primary : colors.border,
                  backgroundColor: homeCols === n ? colors.primaryGhost : colors.background,
                  gap: 6,
                }}
              >
                <View style={{ flexDirection: 'row', gap: 3 }}>
                  {Array.from({ length: n }).map((_, i) => (
                    <View key={i} style={{ width: homeCols === n ? 14 : 10, height: 14, borderRadius: 3, backgroundColor: homeCols === n ? colors.primary : colors.border }} />
                  ))}
                </View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: homeCols === n ? colors.primary : colors.textMuted }}>{n} col.</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Widgets accueil ── */}
        <SectionHeader title={t('personalize_widgets')} emoji="📱" />
        <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 10 }}>
          Choisissez quels blocs afficher sur votre écran d'accueil.
        </Text>

        {(Object.keys(WIDGET_LABELS) as WidgetKey[]).map(key => {
          const info = WIDGET_LABELS[key];
          return (
            <View key={key} style={{
              backgroundColor: colors.surface, borderRadius: radius.md, padding: 14,
              flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8,
              borderWidth: 1, borderColor: widgets[key] ? colors.primary + '40' : colors.border,
              ...shadow.xs,
            }}>
              <View style={{ width: 40, height: 40, borderRadius: radius.sm, backgroundColor: widgets[key] ? colors.primaryGhost : colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 20 }}>{info.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{info.label}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>{info.desc}</Text>
              </View>
              <Switch
                value={widgets[key]}
                onValueChange={() => toggleWidget(key)}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor="#fff"
              />
            </View>
          );
        })}

        {/* ── Raccourcis de navigation ── */}
        <SectionHeader title={t('personalize_shortcuts')} emoji="⚡" />
        <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 10 }}>
          Épinglez vos raccourcis favoris en haut · Masquez ceux dont vous n'avez pas besoin.
        </Text>

        {ALL_NAV_TILES.map(tile => {
          const isHidden = hiddenTiles.has(tile.screen);
          const isPinned = pinnedTiles.includes(tile.screen);
          return (
            <View key={tile.screen} style={{
              backgroundColor: isHidden ? colors.background : colors.surface,
              borderRadius: radius.md, padding: 12,
              flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8,
              borderWidth: 1, borderColor: isPinned ? colors.primary + '60' : colors.border,
              opacity: isHidden ? 0.5 : 1,
              ...shadow.xs,
            }}>
              {/* Icon */}
              <View style={{ width: 36, height: 36, borderRadius: radius.sm, backgroundColor: isHidden ? colors.border : tile.bg, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name={tile.icon as any} size={18} color={isHidden ? colors.textMuted : tile.color} />
              </View>

              <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: isHidden ? colors.textMuted : colors.text }}>{t(tile.labelKey as any)}</Text>

              {/* Pin */}
              <TouchableOpacity
                onPress={() => toggleTilePinned(tile.screen)}
                style={{ padding: 6 }}
                disabled={isHidden}
              >
                <Ionicons
                  name={isPinned ? 'star' : 'star-outline'}
                  size={18}
                  color={isPinned ? '#D97706' : colors.textMuted}
                />
              </TouchableOpacity>

              {/* Show/Hide */}
              <TouchableOpacity onPress={() => toggleTileVisible(tile.screen)} style={{ padding: 6 }}>
                <Ionicons
                  name={isHidden ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={isHidden ? '#DC2626' : colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Reset button */}
        <TouchableOpacity
          onPress={() => {
            setHiddenTiles(new Set());
            setPinnedTiles([]);
            AsyncStorage.multiRemove(['@poubcoin_hidden_tiles', '@poubcoin_pinned_tiles']);
          }}
          style={{ marginTop: 8, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md }}
        >
          <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '600' }}>Réinitialiser la navigation</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
