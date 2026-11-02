import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ADMIN_ACCENT_COLORS = [
  { hex: '#1B6B3A', name: 'PoubCoin' },
  { hex: '#2563EB', name: 'Bleu' },
  { hex: '#7C3AED', name: 'Violet' },
  { hex: '#0891B2', name: 'Cyan' },
  { hex: '#0F172A', name: 'Marine' },
  { hex: '#DC2626', name: 'Rouge' },
  { hex: '#B45309', name: 'Ambre' },
  { hex: '#374151', name: 'Ardoise' },
  { hex: '#be185d', name: 'Rose' },
  { hex: '#0d9488', name: 'Teal' },
];

export const MUNICIPALITY_EMOJIS = [
  '🏛️','🌿','🏙️','♻️','🌍','🏢','⚡','💧',
  '🌱','🏔️','🌊','🌇','🏡','🌳','🏗️','🌐',
];

export const DEFAULT_WASTE_CATEGORIES = [
  { key: 'plastic',    label: 'Plastique',     emoji: '🧴' },
  { key: 'glass',      label: 'Verre',         emoji: '🍾' },
  { key: 'paper',      label: 'Papier',        emoji: '📄' },
  { key: 'organic',    label: 'Organique',     emoji: '🍂' },
  { key: 'metal',      label: 'Métal',         emoji: '🥫' },
  { key: 'electronic', label: 'Électronique',  emoji: '💻' },
  { key: 'hazardous',  label: 'Dangereux',     emoji: '☣️' },
  { key: 'bulk',       label: 'Encombrants',   emoji: '🛋️' },
];

export type ReportFilter   = 'pending' | 'validated' | 'rejected' | 'all';
export type LayoutDensity  = 'comfortable' | 'compact';
export type AdminTheme     = 'light' | 'dark';

export interface WasteCategory {
  key: string;
  label: string;
  emoji: string;
}

export interface DashboardWidgets {
  stats: boolean;
  hotZones: boolean;
  chart: boolean;
  recentActivity: boolean;
  quickActions: boolean;
  leaderboard: boolean;
  economy: boolean;
  retention: boolean;
  userGrowth: boolean;
  pendingInline: boolean;
}

interface AdminPrefs {
  // Identity
  accentColor: string;
  municipalityName: string;
  municipalityEmoji: string;
  adminDisplayName: string;
  adminAvatarColor: string;
  // Appearance
  adminTheme: AdminTheme;
  // Dashboard sections
  dashboardWidgets: DashboardWidgets;
  defaultReportFilter: ReportFilter;
  layoutDensity: LayoutDensity;
  showMoreStats: boolean;
  // Objectives & SLA
  monthlyReportTarget: number;
  slaTargetHours: number;
  // Alert thresholds
  alertThresholdPending: number;
  alertThresholdInactivityPct: number;
  // Gamification
  streakMaxMultiplier: number;
  // Content
  wasteCategories: WasteCategory[];
  welcomeMessage: string;
  proThreshold: number;
  // Setters
  setAccentColor: (color: string) => void;
  setMunicipalityName: (name: string) => void;
  setMunicipalityEmoji: (emoji: string) => void;
  setAdminDisplayName: (name: string) => void;
  setAdminAvatarColor: (color: string) => void;
  setAdminTheme: (t: AdminTheme) => void;
  setDashboardWidgets: (w: DashboardWidgets) => void;
  setDefaultReportFilter: (f: ReportFilter) => void;
  setLayoutDensity: (d: LayoutDensity) => void;
  setShowMoreStats: (v: boolean) => void;
  setMonthlyReportTarget: (n: number) => void;
  setSlaTargetHours: (n: number) => void;
  setAlertThresholdPending: (n: number) => void;
  setAlertThresholdInactivityPct: (n: number) => void;
  setStreakMaxMultiplier: (n: number) => void;
  setWasteCategories: (cats: WasteCategory[]) => void;
  setWelcomeMessage: (msg: string) => void;
  setProThreshold: (n: number) => void;
}

const K = {
  COLOR:            'admin_accent_color',
  MUN:              'admin_municipality_name',
  EMOJI:            'admin_municipality_emoji',
  DNAME:            'admin_display_name',
  AVATAR_COLOR:     'admin_avatar_color',
  THEME:            'admin_theme',
  WIDGETS:          'admin_dashboard_widgets',
  FILTER:           'admin_default_report_filter',
  DENSITY:          'admin_layout_density',
  MORE_STATS:       'admin_show_more_stats',
  MONTHLY_TARGET:   'admin_monthly_target',
  SLA:              'admin_sla_hours',
  ALERT_PENDING:    'admin_alert_pending',
  ALERT_INACT:      'admin_alert_inactivity',
  STREAK_MAX:       'admin_streak_max',
  WASTE_CATS:       'admin_waste_categories',
  WELCOME_MSG:      'admin_welcome_msg',
  PRO_THRESHOLD:    'admin_pro_threshold',
};

const DEFAULT_WIDGETS: DashboardWidgets = {
  stats: true, hotZones: true, chart: true, recentActivity: true,
  quickActions: true, leaderboard: true, economy: true,
  retention: true, userGrowth: true, pendingInline: true,
};

const AdminPrefsContext = createContext<AdminPrefs>({
  accentColor: '#1B6B3A', municipalityName: 'PoubCoin',
  municipalityEmoji: '🌿', adminDisplayName: 'Administrateur',
  adminAvatarColor: '#1B6B3A', adminTheme: 'light',
  dashboardWidgets: DEFAULT_WIDGETS, defaultReportFilter: 'pending',
  layoutDensity: 'comfortable', showMoreStats: true,
  monthlyReportTarget: 100, slaTargetHours: 24,
  alertThresholdPending: 10, alertThresholdInactivityPct: 60,
  streakMaxMultiplier: 3,
  wasteCategories: DEFAULT_WASTE_CATEGORIES,
  welcomeMessage: 'Bienvenue sur PoubCoin ! Signalez les déchets et gagnez des coins.',
  proThreshold: 20,
  setAccentColor: () => {}, setMunicipalityName: () => {}, setMunicipalityEmoji: () => {},
  setAdminDisplayName: () => {}, setAdminAvatarColor: () => {}, setAdminTheme: () => {},
  setDashboardWidgets: () => {}, setDefaultReportFilter: () => {}, setLayoutDensity: () => {},
  setShowMoreStats: () => {}, setMonthlyReportTarget: () => {}, setSlaTargetHours: () => {},
  setAlertThresholdPending: () => {}, setAlertThresholdInactivityPct: () => {},
  setStreakMaxMultiplier: () => {}, setWasteCategories: () => {},
  setWelcomeMessage: () => {}, setProThreshold: () => {},
});

function makeSetter<T>(
  setState: React.Dispatch<React.SetStateAction<T>>,
  key: string,
  serialize?: (v: T) => string,
) {
  return (v: T) => {
    setState(v);
    AsyncStorage.setItem(key, serialize ? serialize(v) : String(v)).catch(() => {});
  };
}

export function AdminPrefsProvider({ children }: { children: React.ReactNode }) {
  const [accentColor,                 setAccentColorState]                = useState('#1B6B3A');
  const [municipalityName,            setMunicipalityNameState]           = useState('PoubCoin');
  const [municipalityEmoji,           setMunicipalityEmojiState]          = useState('🌿');
  const [adminDisplayName,            setAdminDisplayNameState]           = useState('Administrateur');
  const [adminAvatarColor,            setAdminAvatarColorState]           = useState('#1B6B3A');
  const [adminTheme,                  setAdminThemeState]                 = useState<AdminTheme>('light');
  const [dashboardWidgets,            setDashboardWidgetsState]           = useState<DashboardWidgets>(DEFAULT_WIDGETS);
  const [defaultReportFilter,         setDefaultReportFilterState]        = useState<ReportFilter>('pending');
  const [layoutDensity,               setLayoutDensityState]              = useState<LayoutDensity>('comfortable');
  const [showMoreStats,               setShowMoreStatsState]              = useState(true);
  const [monthlyReportTarget,         setMonthlyReportTargetState]        = useState(100);
  const [slaTargetHours,              setSlaTargetHoursState]             = useState(24);
  const [alertThresholdPending,       setAlertThresholdPendingState]      = useState(10);
  const [alertThresholdInactivityPct, setAlertThresholdInactivityState]   = useState(60);
  const [streakMaxMultiplier,         setStreakMaxMultiplierState]        = useState(3);
  const [wasteCategories,             setWasteCategoriesState]            = useState<WasteCategory[]>(DEFAULT_WASTE_CATEGORIES);
  const [welcomeMessage,              setWelcomeMessageState]             = useState('Bienvenue sur PoubCoin ! Signalez les déchets et gagnez des coins.');
  const [proThreshold,                setProThresholdState]               = useState(20);

  useEffect(() => {
    AsyncStorage.multiGet(Object.values(K)).then(pairs => {
      const m = Object.fromEntries(pairs.map(([k, v]) => [k, v]));
      if (m[K.COLOR])          setAccentColorState(m[K.COLOR]!);
      if (m[K.MUN])            setMunicipalityNameState(m[K.MUN]!);
      if (m[K.EMOJI])          setMunicipalityEmojiState(m[K.EMOJI]!);
      if (m[K.DNAME])          setAdminDisplayNameState(m[K.DNAME]!);
      if (m[K.AVATAR_COLOR])   setAdminAvatarColorState(m[K.AVATAR_COLOR]!);
      if (m[K.THEME])          setAdminThemeState(m[K.THEME] as AdminTheme);
      if (m[K.WIDGETS])        { try { setDashboardWidgetsState({ ...DEFAULT_WIDGETS, ...JSON.parse(m[K.WIDGETS]!) }); } catch {} }
      if (m[K.FILTER])         setDefaultReportFilterState(m[K.FILTER] as ReportFilter);
      if (m[K.DENSITY])        setLayoutDensityState(m[K.DENSITY] as LayoutDensity);
      if (m[K.MORE_STATS])     setShowMoreStatsState(m[K.MORE_STATS] === 'true');
      if (m[K.MONTHLY_TARGET]) setMonthlyReportTargetState(parseInt(m[K.MONTHLY_TARGET]!) || 100);
      if (m[K.SLA])            setSlaTargetHoursState(parseInt(m[K.SLA]!) || 24);
      if (m[K.ALERT_PENDING])  setAlertThresholdPendingState(parseInt(m[K.ALERT_PENDING]!) || 10);
      if (m[K.ALERT_INACT])    setAlertThresholdInactivityState(parseInt(m[K.ALERT_INACT]!) || 60);
      if (m[K.STREAK_MAX])     setStreakMaxMultiplierState(parseInt(m[K.STREAK_MAX]!) || 3);
      if (m[K.WASTE_CATS])     { try { setWasteCategoriesState(JSON.parse(m[K.WASTE_CATS]!)); } catch {} }
      if (m[K.WELCOME_MSG])    setWelcomeMessageState(m[K.WELCOME_MSG]!);
      if (m[K.PRO_THRESHOLD])  setProThresholdState(parseInt(m[K.PRO_THRESHOLD]!) || 20);
    }).catch(() => {});
  }, []);

  const setAccentColor                 = makeSetter(setAccentColorState,                K.COLOR);
  const setMunicipalityName            = makeSetter(setMunicipalityNameState,           K.MUN);
  const setMunicipalityEmoji           = makeSetter(setMunicipalityEmojiState,          K.EMOJI);
  const setAdminDisplayName            = makeSetter(setAdminDisplayNameState,           K.DNAME);
  const setAdminAvatarColor            = makeSetter(setAdminAvatarColorState,           K.AVATAR_COLOR);
  const setAdminTheme                  = makeSetter(setAdminThemeState,                 K.THEME);
  const setDefaultReportFilter         = makeSetter(setDefaultReportFilterState,        K.FILTER);
  const setLayoutDensity               = makeSetter(setLayoutDensityState,              K.DENSITY);
  const setShowMoreStats               = makeSetter(setShowMoreStatsState,              K.MORE_STATS, v => String(v));
  const setMonthlyReportTarget         = makeSetter(setMonthlyReportTargetState,        K.MONTHLY_TARGET, v => String(v));
  const setSlaTargetHours              = makeSetter(setSlaTargetHoursState,             K.SLA, v => String(v));
  const setAlertThresholdPending       = makeSetter(setAlertThresholdPendingState,      K.ALERT_PENDING, v => String(v));
  const setAlertThresholdInactivityPct = makeSetter(setAlertThresholdInactivityState,   K.ALERT_INACT, v => String(v));
  const setStreakMaxMultiplier         = makeSetter(setStreakMaxMultiplierState,        K.STREAK_MAX, v => String(v));
  const setWasteCategories             = makeSetter(setWasteCategoriesState,            K.WASTE_CATS, v => JSON.stringify(v));
  const setWelcomeMessage              = makeSetter(setWelcomeMessageState,             K.WELCOME_MSG);
  const setProThreshold                = makeSetter(setProThresholdState,              K.PRO_THRESHOLD, v => String(v));

  const setDashboardWidgets = (w: DashboardWidgets) => {
    setDashboardWidgetsState(w);
    AsyncStorage.setItem(K.WIDGETS, JSON.stringify(w)).catch(() => {});
  };

  return (
    <AdminPrefsContext.Provider value={{
      accentColor, municipalityName, municipalityEmoji, adminDisplayName,
      adminAvatarColor, adminTheme,
      dashboardWidgets, defaultReportFilter, layoutDensity, showMoreStats,
      monthlyReportTarget, slaTargetHours,
      alertThresholdPending, alertThresholdInactivityPct,
      streakMaxMultiplier, wasteCategories, welcomeMessage, proThreshold,
      setAccentColor, setMunicipalityName, setMunicipalityEmoji, setAdminDisplayName,
      setAdminAvatarColor, setAdminTheme,
      setDashboardWidgets, setDefaultReportFilter, setLayoutDensity, setShowMoreStats,
      setMonthlyReportTarget, setSlaTargetHours,
      setAlertThresholdPending, setAlertThresholdInactivityPct,
      setStreakMaxMultiplier, setWasteCategories, setWelcomeMessage, setProThreshold,
    }}>
      {children}
    </AdminPrefsContext.Provider>
  );
}

export function useAdminPrefs() {
  return useContext(AdminPrefsContext);
}
