import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import AdminOnboardingModal, { shouldShowOnboarding } from './AdminOnboardingModal';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Animated, Platform, ActivityIndicator,
  TextInput, Modal, Share, Alert, PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Svg, Circle } from 'react-native-svg';
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAdmin } from '../../context/AdminContext';
import { useAdminPrefs } from '../../context/AdminPrefsContext';
import { radius } from '../../theme';
import BarChart from '../../components/admin/BarChart';
import { STATUS_COLORS } from '../../utils/statusColors';

// ── Palette factory (theme-aware + dynamic accent) ────────────────────────────
function makeD(accent: string, dark: boolean) {
  return {
    bg:         dark ? '#111714' : '#F5F6F5',
    surface:    dark ? '#1A2620' : '#FFFFFF',
    surfaceAlt: dark ? '#1E2D24' : '#EEF7F1',
    card:       dark ? '#1A2620' : '#FFFFFF',
    border:     dark ? '#2A3D30' : '#E4E8E4',
    accent,
    accentDim:  accent + '22',
    accentSoft: accent + '12',
    text:       dark ? '#F0F9F4' : '#111714',
    textSub:    dark ? '#8AAF94' : '#4B5E52',
    textMuted:  dark ? '#5A7A62' : '#94A99A',
    green:      '#15803D',
    greenDim:   '#15803D18',
    amber:      '#F59E0B',
    amberDim:   '#F59E0B12',
    red:        '#EF4444',
    redDim:     '#EF444415',
    blue:       '#38BDF8',
    blueDim:    '#38BDF812',
    purple:     '#A78BFA',
    purpleDim:  '#A78BFA12',
  };
}

const FR_MONTHS  = ['jan.','fév.','mar.','avr.','mai','juin','juil.','août','sep.','oct.','nov.','déc.'];
const FR_DAYS    = ['Dim.','Lun.','Mar.','Mer.','Jeu.','Ven.','Sam.'];
const DAYS_SHORT = ['L','M','M','J','V','S','D'];

function formatDate(d: Date) {
  return `${FR_DAYS[d.getDay()]} ${d.getDate()} ${FR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CircularProgress({ pct, accent, border }: { pct: number; accent: string; border: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const size = 80; const sw = 7;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (clamped / 100) * circ;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0, transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size/2} cy={size/2} r={r} fill="none" stroke={border} strokeWidth={sw} />
        <Circle cx={size/2} cy={size/2} r={r} fill="none" stroke={accent} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </Svg>
      <Text style={{ fontSize: 17, fontWeight: '800', color: accent }}>{clamped.toFixed(0)}%</Text>
    </View>
  );
}

function TrendChip({ value }: { value: number }) {
  if (value === 0) return null;
  const up = value > 0;
  const color = up ? '#15803D' : '#EF4444';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2,
      backgroundColor: up ? '#22C55E18' : '#EF444418',
      borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 }}>
      <Ionicons name={up ? 'trending-up' : 'trending-down'} size={10} color={color} />
      <Text style={{ fontSize: 10, fontWeight: '700', color }}>{up ? '+' : ''}{value}</Text>
    </View>
  );
}

function StatCard({ label, value, icon, color, bg, trend, anim, cardBg, cardBorder, labelColor }:
  { label: string; value: number; icon: string; color: string; bg: string; trend: number; anim: any; cardBg?: string; cardBorder?: string; labelColor?: string }) {
  return (
    <Animated.View style={[s.statCard, { backgroundColor: cardBg, borderColor: cardBorder, overflow: 'hidden', opacity: anim.opacity, transform: [{ translateY: anim.translateY }] }]}>
      {/* Colored left accent bar */}
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: color, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }} />
      <View style={[s.statCardTop, { paddingLeft: 4 }]}>
        <View style={[s.statIconBox, { backgroundColor: bg }]}>
          <Ionicons name={icon as any} size={16} color={color} />
        </View>
        <TrendChip value={trend} />
      </View>
      <Text style={[s.statValue, { color, paddingLeft: 4 }]}>{value}</Text>
      <Text style={[s.statLabel, { paddingLeft: 4 }, labelColor ? { color: labelColor } : {}]}>{label}</Text>
    </Animated.View>
  );
}

function SectionTitle({ title, action, onAction, accent, text }: { title: string; action?: string; onAction?: () => void; accent?: string; text?: string }) {
  return (
    <View style={s.sectionRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={[s.sectionBar, { backgroundColor: accent ?? '#1B6B3A' }]} />
        <Text style={[s.sectionTitle, text ? { color: text } : {}]}>{title}</Text>
      </View>
      {action && (
        <TouchableOpacity
          style={[s.seeAllBtn, { borderColor: (accent ?? '#1B6B3A') + '30', backgroundColor: (accent ?? '#1B6B3A') + '10' }]}
          onPress={onAction}
        >
          <Text style={[s.seeAll, accent ? { color: accent } : {}]}>{action}</Text>
          <Ionicons name="arrow-forward" size={11} color={accent ?? '#1B6B3A'} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Swipeable pending row ─────────────────────────────────────────────────────

function SwipePendingRow({ report: r, idx, total, D, validating, onValidate, onReject }: {
  report: any; idx: number; total: number;
  D: ReturnType<typeof makeD>; validating: string | null;
  onValidate: () => void; onReject: () => void;
}) {
  const tx = useRef(new Animated.Value(0)).current;
  const THRESHOLD = 80;

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dy) < 30,
    onPanResponderMove: (_, g) => tx.setValue(g.dx),
    onPanResponderRelease: (_, g) => {
      if (g.dx > THRESHOLD) {
        Animated.timing(tx, { toValue: 300, duration: 200, useNativeDriver: true }).start(() => {
          tx.setValue(0);
          onValidate();
        });
      } else if (g.dx < -THRESHOLD) {
        Animated.timing(tx, { toValue: -300, duration: 200, useNativeDriver: true }).start(() => {
          tx.setValue(0);
          onReject();
        });
      } else {
        Animated.spring(tx, { toValue: 0, useNativeDriver: true }).start();
      }
    },
  })).current;

  const bgColor = tx.interpolate({
    inputRange: [-THRESHOLD, 0, THRESHOLD],
    outputRange: [D.red + '30', 'transparent', D.green + '30'],
    extrapolate: 'clamp',
  });
  const dateStr = r.createdAt
    ? new Date(r.createdAt?.toDate?.() ?? r.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : r.date;

  return (
    <Animated.View style={{ backgroundColor: bgColor, borderRadius: 10, overflow: 'hidden',
      ...(idx < total - 1 ? { borderBottomWidth: 1, borderBottomColor: D.border } : {}) }}
    >
      <Animated.View style={[s.pendingRow, { transform: [{ translateX: tx }] }]} {...panResponder.panHandlers}>
        {/* Swipe hint icons */}
        <View style={{ position: 'absolute', left: 10, opacity: 0.3 }}>
          <Ionicons name="close-circle" size={18} color={D.red} />
        </View>
        <View style={{ position: 'absolute', right: 10, opacity: 0.3 }}>
          <Ionicons name="checkmark-circle" size={18} color={D.green} />
        </View>

        <View style={{ flex: 1, paddingHorizontal: 24 }}>
          <Text style={[s.actAddr, { color: D.text }]} numberOfLines={1}>{r.address || 'Adresse inconnue'}</Text>
          <Text style={[s.actDate, { color: D.textMuted }]}>{r.userName} · {dateStr}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity
            style={[s.inlineBtn, { backgroundColor: D.greenDim, borderColor: D.green + '40' }]}
            onPress={onValidate} disabled={validating !== null}
          >
            {validating === r.id + '_ok'
              ? <ActivityIndicator size={12} color={D.green} />
              : <Ionicons name="checkmark" size={14} color={D.green} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.inlineBtn, { backgroundColor: D.redDim, borderColor: D.red + '40' }]}
            onPress={onReject} disabled={validating !== null}
          >
            {validating === r.id + '_no'
              ? <ActivityIndicator size={12} color={D.red} />
              : <Ionicons name="close" size={14} color={D.red} />}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminDashboardScreen({ navigation, route }: any) {
  const filterCity: string | undefined = route?.params?.filterCity;
  const filterCityColor: string | undefined = route?.params?.filterCityColor;

  const {
    reports: allReports, validateReport, rejectReport, isLoading,
    users: allUsers, blockUser, unblockUser,
    coinsPerValidation, updateCoinsPerValidation,
    sendPushToAll, logoutAdmin,
  } = useAdmin();

  // Filter data by city when coming from Multi-Municipalités
  const reports = filterCity
    ? allReports.filter(r =>
        r.address?.toLowerCase().includes(filterCity.toLowerCase())
      )
    : allReports;
  const users = filterCity
    ? allUsers.filter(u =>
        u.city?.toLowerCase().includes(filterCity.toLowerCase()) ||
        u.city?.toLowerCase() === filterCity.toLowerCase()
      )
    : allUsers;
  const {
    municipalityName, municipalityEmoji, adminDisplayName,
    dashboardWidgets, accentColor, adminTheme,
    monthlyReportTarget, slaTargetHours,
    alertThresholdPending, alertThresholdInactivityPct,
    adminAvatarColor,
  } = useAdminPrefs();

  const D = makeD(accentColor, adminTheme === 'dark');

  // ── State ──
  const [leaderboard, setLeaderboard] = useState<{ name: string; coins: number; userId: string }[]>([]);
  const [totalCoinsInCirculation, setTotalCoinsInCirculation] = useState(0);
  const [avgProcessingHours, setAvgProcessingHours] = useState(0);
  const [validating, setValidating] = useState<string | null>(null);

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => { shouldShowOnboarding().then(setShowOnboarding); }, []);

  // Recherche globale
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const searchResults = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return { reports: [], users: [] };
    return {
      reports: allReports.filter(r =>
        r.address?.toLowerCase().includes(q) ||
        r.userName?.toLowerCase().includes(q) ||
        r.status?.toLowerCase().includes(q)
      ).slice(0, 8),
      users: allUsers.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.city?.toLowerCase().includes(q)
      ).slice(0, 5),
    };
  }, [searchQ, allReports, allUsers]);

  // Conversion rate modal
  const [showRateModal, setShowRateModal] = useState(false);
  const [rateInput, setRateInput] = useState(String(coinsPerValidation));

  // Push notification modal
  const [showPushModal, setShowPushModal] = useState(false);
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [pushTarget, setPushTarget] = useState<'all' | 'inactive' | 'top'>('all');
  const [pushSending, setPushSending] = useState(false);

  const isWeb = Platform.OS === 'web';
  const anims = useRef(Array.from({ length: 4 }, () => ({
    opacity: new Animated.Value(isWeb ? 1 : 0),
    translateY: new Animated.Value(isWeb ? 0 : 24),
  }))).current;

  useEffect(() => {
    const native = Platform.OS !== 'web';
    const id = setTimeout(() => Animated.stagger(80, anims.map((a, i) =>
      Animated.parallel([
        Animated.timing(a.opacity,    { toValue: 1, duration: 380, delay: i * 60, useNativeDriver: native }),
        Animated.timing(a.translateY, { toValue: 0, duration: 380, delay: i * 60, useNativeDriver: native }),
      ])
    )).start(), 0);
    return () => clearTimeout(id);
  }, []);

  // Load leaderboard + wallet totals — only when this tab is focused
  useFocusEffect(useCallback(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'wallets'), orderBy('balance', 'desc'), limit(10000)));
        if (cancelled) return;
        const entries: { userId: string; balance: number }[] = [];
        let total = 0;
        snap.forEach(d => {
          const bal = d.data().balance ?? 0;
          total += bal;
          entries.push({ userId: d.id, balance: bal });
        });
        setTotalCoinsInCirculation(total);
        entries.sort((a, b) => b.balance - a.balance);
        const top10 = entries.slice(0, 10);
        const { getDoc: gd, doc: docFn } = await import('firebase/firestore');
        const resolved = await Promise.all(top10.map(async e => {
          try {
            const uSnap = await gd(docFn(db, 'users', e.userId));
            const name = uSnap.data()?.name ?? 'Citoyen';
            return { userId: e.userId, name, coins: e.balance };
          } catch {
            return { userId: e.userId, name: 'Citoyen', coins: e.balance };
          }
        }));
        if (!cancelled) setLeaderboard(resolved);
      } catch {}
    };
    load();
    return () => { cancelled = true; };
  }, []));

  // Compute avg processing time
  useEffect(() => {
    const toMs = (ts: any): number => {
      if (!ts) return 0;
      if (ts?.toDate) return ts.toDate().getTime();
      return new Date(ts).getTime();
    };
    const w = reports.filter(r => r.status === 'validated' && (r as any).validatedAt && (r as any).createdAt);
    if (w.length > 0) {
      setAvgProcessingHours(w.reduce((a, r) => a + (toMs((r as any).validatedAt) - toMs((r as any).createdAt)) / 3600000, 0) / w.length);
    } else {
      const wd = reports.filter(r => r.status === 'validated' && r.date);
      if (!wd.length) { setAvgProcessingHours(-1); return; }
      setAvgProcessingHours(Math.min(wd.reduce((a, r) => a + (Date.now() - new Date(r.date).getTime()) / 3600000, 0) / wd.length, 72));
    }
  }, [reports]);

  const toIso = (r: any): string => {
    const ts = r.createdAt ?? r.date;
    if (!ts) return '';
    if (typeof ts === 'string') return ts;
    if (typeof ts.toDate === 'function') return ts.toDate().toISOString();
    if (ts.seconds != null) return new Date(ts.seconds * 1000).toISOString();
    return '';
  };

  // ── Computed values ────────────────────────────────────────────────────────
  const pending   = reports.filter(r => r.status === 'pending').length;
  const validated = reports.filter(r => r.status === 'validated').length;
  const rejected  = reports.filter(r => r.status === 'rejected').length;
  const total     = reports.length;
  const rate      = (validated + rejected) > 0 ? Math.round((validated / (validated + rejected)) * 100) : 0;
  const validationRate = total > 0 ? (validated / total) * 100 : 0;

  const todayStr     = new Date().toISOString().slice(0, 10);
  const todayReports = reports.filter(r => toIso(r).slice(0, 10) === todayStr);
  const todayNew     = todayReports.length;
  const todayValid   = todayReports.filter(r => r.status === 'validated').length;
  const todayPending = todayReports.filter(r => r.status === 'pending').length;

  const now            = new Date();
  const thisMonthStr   = now.toISOString().slice(0, 7);
  const lastMonthStr   = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
  const thisMonthCount = reports.filter(r => toIso(r).slice(0, 7) === thisMonthStr).length;
  const lastMonthCount = reports.filter(r => toIso(r).slice(0, 7) === lastMonthStr).length;

  // Users stats
  const totalUsers        = users.length;
  const blockedUsers      = users.filter(u => u.blocked).length;
  const newUsersThisMonth = users.filter(u => (u.joinedAt ?? '').slice(0, 7) === thisMonthStr).length;
  const cutoff7d = new Date(); cutoff7d.setDate(cutoff7d.getDate() - 7);
  const cutoff7dStr = cutoff7d.toISOString();
  const activeUserIds7d = new Set(
    reports
      .filter(r => { const raw = (r as any).createdAt; const ds = raw?.toDate ? raw.toDate().toISOString() : (typeof raw === 'string' ? raw : r.date ?? ''); return ds >= cutoff7dStr; })
      .map(r => r.userId)
  );
  const inactiveUsers = users.filter(u => !activeUserIds7d.has(u.id)).length;

  // Coins economy
  const coinsDistributed   = reports.filter(r => r.status === 'validated').reduce((a, r) => a + (r.coins ?? 0), 0);
  const coinsThisMonth     = reports.filter(r => r.status === 'validated' && toIso(r).slice(0, 7) === thisMonthStr).reduce((a, r) => a + (r.coins ?? 0), 0);
  const avgCoinsPerUser    = totalUsers > 0 ? Math.round(totalCoinsInCirculation / totalUsers) : 0;

  // Anomalies (uses configurable thresholds)
  const anomalies: { type: string; msg: string; color: string; icon: string }[] = [];
  if (pending > alertThresholdPending) anomalies.push({ type: 'warn', msg: `${pending} signalements en attente — backlog élevé (seuil : ${alertThresholdPending})`, color: D.amber, icon: 'warning-outline' });
  if (blockedUsers > 0) anomalies.push({ type: 'info', msg: `${blockedUsers} compte${blockedUsers > 1 ? 's' : ''} suspendu${blockedUsers > 1 ? 's' : ''}`, color: D.red, icon: 'ban-outline' });
  if (totalUsers > 0 && (inactiveUsers / totalUsers) * 100 > alertThresholdInactivityPct) anomalies.push({ type: 'warn', msg: `${inactiveUsers} utilisateurs inactifs depuis 7j (${Math.round((inactiveUsers/totalUsers)*100)}% > seuil ${alertThresholdInactivityPct}%)`, color: D.amber, icon: 'person-remove-outline' });
  const suspiciousUsers = Object.entries(
    reports.filter(r => toIso(r) >= cutoff7dStr).reduce((acc: Record<string, number>, r) => { acc[r.userId] = (acc[r.userId] ?? 0) + 1; return acc; }, {})
  ).filter(([, cnt]) => cnt > 10);
  if (suspiciousUsers.length > 0) anomalies.push({ type: 'alert', msg: `${suspiciousUsers.length} utilisateur${suspiciousUsers.length > 1 ? 's' : ''} avec >10 signalements en 7j`, color: D.red, icon: 'alert-circle-outline' });

  // Recent pending (for inline validation)
  const pendingReports = reports.filter(r => r.status === 'pending').slice(0, 3);

  // Recent reports
  const recentReports = [...reports].sort((a, b) => toIso(b).localeCompare(toIso(a))).slice(0, 4);

  // Hot zones
  const hotZones = (() => {
    const counts: Record<string, number> = {};
    reports.forEach(r => { const z = (r.address ?? '').split(',')[0].trim(); if (z) counts[z] = (counts[z] ?? 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const max = sorted[0]?.[1] ?? 1;
    return sorted.map(([name, count]) => ({ name, count, pct: Math.round((count / max) * 100) }));
  })();

  // Last 7 days chart
  const last7 = (() => {
    const result: { label: string; value: number }[] = [];
    const d0 = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(d0); d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      result.push({ label: DAYS_SHORT[(d.getDay() + 6) % 7], value: reports.filter(r => {
        const raw = (r as any).createdAt;
        const rd = raw ? (raw?.toDate ? raw.toDate().toISOString() : String(raw)).slice(0, 10) : r.date?.slice(0, 10);
        return rd === ds;
      }).length });
    }
    return result;
  })();

  // User growth (last 6 months)
  const userGrowth = (() => {
    const result: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toISOString().slice(0, 7);
      result.push({ label: FR_MONTHS[d.getMonth()], value: users.filter(u => (u.joinedAt ?? '').slice(0, 7) === monthStr).length });
    }
    return result;
  })();

  const STATS = [
    { label: 'Total',      value: total,     icon: 'documents-outline',         color: D.accent, bg: D.accentSoft, trend: thisMonthCount - lastMonthCount },
    { label: 'En attente', value: pending,   icon: STATUS_COLORS.pending.icon,   color: D.amber,  bg: D.amberDim,  trend: 0 },
    { label: 'Validés',    value: validated, icon: STATUS_COLORS.validated.icon, color: D.green,  bg: D.greenDim,  trend: 0 },
    { label: 'Rejetés',    value: rejected,  icon: STATUS_COLORS.rejected.icon,  color: D.red,    bg: D.redDim,    trend: 0 },
  ];

  const QUICK = [
    { icon: 'list-outline',          label: 'Signalements', sub: `${pending} en attente`, color: D.accent,  onPress: () => navigation.navigate('Reports') },
    { icon: 'notifications-outline', label: 'Notifier',     sub: 'Push citoyen',           color: D.blue,    onPress: () => setShowPushModal(true) },
    { icon: 'bar-chart-outline',     label: 'Stats',        sub: 'Analyses',               color: D.green,   onPress: () => navigation.navigate('More', { screen: 'AdminStats' }) },
    { icon: 'trophy-outline',        label: 'Défis',        sub: 'Challenges actifs',      color: '#EC4899', onPress: () => navigation.navigate('More', { screen: 'AdminChallenges' }) },
    { icon: 'settings-outline',      label: 'Taux',         sub: `${coinsPerValidation} 🪙/sig.`, color: D.textSub, onPress: () => { setRateInput(String(coinsPerValidation)); setShowRateModal(true); } },
    { icon: 'download-outline',      label: 'Exporter',     sub: 'CSV rapports',            color: '#0EA5E9', onPress: handleExportCSV },
  ];

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handleValidate(id: string) {
    setValidating(id + '_ok');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try { await validateReport(id); } finally { setValidating(null); }
  }

  async function handleReject(id: string) {
    setValidating(id + '_no');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    try { await rejectReport(id); } finally { setValidating(null); }
  }

  function handleExportCSV() {
    const header = 'ID,Utilisateur,Adresse,Date,Statut,Coins';
    const rows = reports.map(r =>
      `"${r.id}","${(r.userName ?? '').replace(/"/g, '')}","${(r.address ?? '').replace(/"/g, '')}","${toIso(r).slice(0, 10)}","${r.status}","${r.coins ?? 0}"`
    );
    const csv = [header, ...rows].join('\n');
    Share.share({ message: csv, title: 'Export rapports PoubCoin' }).catch(() => {});
  }

  async function handleSendPush() {
    if (!pushTitle.trim() || !pushBody.trim()) return;
    setPushSending(true);
    try {
      await sendPushToAll(pushTitle.trim(), pushBody.trim(), pushTarget);
      Alert.alert('✅ Envoyé', `Notification envoyée (${pushTarget === 'all' ? 'tous' : pushTarget === 'inactive' ? 'inactifs' : 'top utilisateurs'}).`);
      setShowPushModal(false);
      setPushTitle('');
      setPushBody('');
    } catch {
      Alert.alert('Erreur', 'Impossible d\'envoyer la notification.');
    } finally {
      setPushSending(false);
    }
  }

  async function handleSaveRate() {
    const n = parseInt(rateInput, 10);
    if (isNaN(n) || n < 1) return;
    await updateCoinsPerValidation(n);
    setShowRateModal(false);
  }

  // ── Skeleton loader ────────────────────────────────────────────────────────
  const skelAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isLoading) return;
    Animated.loop(Animated.sequence([
      Animated.timing(skelAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(skelAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
    ])).start();
  }, [isLoading]);
  const skelOpacity = skelAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });
  const SkelBlock = ({ w, h, r = 8, mt = 0 }: { w: number | string; h: number; r?: number; mt?: number }) => (
    <Animated.View style={{ width: w as any, height: h, borderRadius: r, backgroundColor: D.border, opacity: skelOpacity, marginTop: mt }} />
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: D.bg }]}>
        {/* Skeleton header */}
        <LinearGradient colors={[D.accent + '55', D.accent + '33']} style={[s.header, { gap: 14 }]}>
          <SkelBlock w={120} h={10} r={5} />
          <SkelBlock w={180} h={22} r={6} mt={6} />
          <SkelBlock w={140} h={12} r={5} mt={4} />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            {[0,1,2,3].map(i => <SkelBlock key={i} w={70} h={44} r={12} />)}
          </View>
        </LinearGradient>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} scrollEnabled={false}>
          {/* Skeleton stat cards */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {[0,1,2,3].map(i => (
              <View key={i} style={{ width: '47%', backgroundColor: D.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: D.border, gap: 8 }}>
                <SkelBlock w={28} h={28} r={8} />
                <SkelBlock w={50} h={20} r={5} mt={4} />
                <SkelBlock w={80} h={10} r={5} mt={2} />
              </View>
            ))}
          </View>
          {/* Skeleton card */}
          {[130, 90, 110].map((h, i) => (
            <View key={i} style={{ backgroundColor: D.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: D.border, gap: 10 }}>
              <SkelBlock w={140} h={12} r={5} />
              <SkelBlock w="100%" h={h} r={10} mt={4} />
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[s.root, { backgroundColor: D.bg }]}>

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <LinearGradient
        colors={filterCity ? ['#0D1F14', filterCityColor ?? accentColor] : [accentColor + 'DD', accentColor]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={{ position: 'absolute', top: -30, right: 60, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.04)' }} />
        <View style={{ position: 'absolute', bottom: -20, right: -20, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.03)' }} />

        {/* Top row: back (if filtered) + identity + logout */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {filterCity && (
            <TouchableOpacity
              style={{ marginRight: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }}
              onPress={() => navigation.navigate('More', { screen: 'AdminMunicipalities' })}
            >
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </TouchableOpacity>
          )}

          <View style={{ flex: 1 }}>
            <View style={s.headerBadge}>
              <View style={[s.headerDot, { backgroundColor: filterCity ? (filterCityColor ?? '#4ADE80') : '#4ADE80' }]} />
              <Text style={[s.headerBadgeText, { color: 'rgba(255,255,255,0.5)' }]}>
                {filterCity ? 'MUNICIPALITÉ' : 'PANNEAU ADMIN'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 5 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 22 }}>{filterCity ? '🏙️' : municipalityEmoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.headerTitle, { color: '#fff' }]}>{filterCity ?? municipalityName}</Text>
                <Text style={[s.headerSub, { color: 'rgba(255,255,255,0.5)' }]}>
                  {filterCity ? `${users.length} citoyens · ${reports.length} signalements` : `${formatDate(new Date())}  ·  ${adminDisplayName}`}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={s.logoutBtn} onPress={() => setSearchOpen(true)}>
            <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          {!filterCity && (
            <TouchableOpacity style={s.logoutBtn} onPress={logoutAdmin}>
              <Ionicons name="log-out-outline" size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          )}
        </View>

        {/* Metrics pills */}
        <View style={s.hPills}>
          {[
            { v: total,      l: 'Total'     },
            { v: validated,  l: 'Validés'   },
            { v: pending,    l: 'Attente'   },
            { v: totalUsers, l: 'Citoyens'  },
          ].map((p, i) => (
            <View key={i} style={s.hPill}>
              <Text style={s.hPillVal}>{p.v}</Text>
              <Text style={s.hPillLbl}>{p.l}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── HERO : AUJOURD'HUI ──────────────────────────────────── */}
        <View style={[s.heroCard, { backgroundColor: D.surface, borderColor: D.border }]}>
          {/* Top label row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ADE80' }} />
              <Text style={{ fontSize: 11, fontWeight: '800', color: D.textMuted, letterSpacing: 1.2, textTransform: 'uppercase' }}>Aujourd'hui</Text>
            </View>
            <Text style={{ fontSize: 11, color: D.textMuted, fontWeight: '500' }}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          </View>

          {/* 3 KPIs */}
          <View style={s.todayRow}>
            {[
              { icon: 'document-text-outline', value: todayNew,     label: 'Nouveaux',   color: D.accent  },
              { icon: 'checkmark-circle',       value: todayValid,   label: 'Validés',    color: D.green   },
              { icon: 'time-outline',           value: todayPending, label: 'En attente', color: D.amber   },
            ].map((item, idx) => (
              <View key={item.label} style={[s.todayCell, idx < 2 && { borderRightWidth: 1, borderRightColor: D.border }]}>
                <View style={{ width: 32, height: 3, backgroundColor: item.color, borderRadius: 2, marginBottom: 10 }} />
                <Text style={[s.todayValue, { color: item.color }]}>{item.value}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 }}>
                  <Ionicons name={item.icon as any} size={11} color={item.color + 'AA'} />
                  <Text style={[s.todayLabel, { color: D.textMuted }]}>{item.label}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Monthly progress */}
          <View style={[s.progressBox, { backgroundColor: D.bg, borderColor: D.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="flag-outline" size={13} color={D.accent} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: D.text }}>Objectif mensuel</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                <Text style={{ fontSize: 15, fontWeight: '900', color: D.accent }}>{thisMonthCount}</Text>
                <Text style={{ fontSize: 11, color: D.textMuted }}>/ {monthlyReportTarget}</Text>
                <View style={{ marginLeft: 4, backgroundColor: D.accentSoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: D.accent }}>{Math.min(100, Math.round((thisMonthCount / Math.max(1, monthlyReportTarget)) * 100))}%</Text>
                </View>
              </View>
            </View>
            <View style={{ height: 10, backgroundColor: D.border, borderRadius: 5, overflow: 'hidden' }}>
              <LinearGradient
                colors={thisMonthCount >= monthlyReportTarget ? ['#16A34A', '#4ADE80'] : [D.accent, D.accent + 'BB']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ height: '100%', borderRadius: 5, width: `${Math.min(100, Math.round((thisMonthCount / Math.max(1, monthlyReportTarget)) * 100))}%` as any }}
              />
            </View>
            <Text style={{ fontSize: 11, color: thisMonthCount >= monthlyReportTarget ? D.green : D.textMuted, marginTop: 8, fontWeight: '500' }}>
              {thisMonthCount >= monthlyReportTarget
                ? '✅ Objectif atteint ce mois !'
                : `${monthlyReportTarget - thisMonthCount} restants · SLA cible : ${slaTargetHours}h`}
            </Text>
          </View>
        </View>

        {/* ── ANOMALIES ───────────────────────────────────────────── */}
        {anomalies.length > 0 && (
          <View style={{ marginHorizontal: 16, marginTop: 10, gap: 6 }}>
            {anomalies.map((a, i) => (
              <View key={i} style={[s.alertBanner, { borderLeftColor: a.color, borderColor: a.color + '25', backgroundColor: a.color + '0A' }]}>
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: a.color + '18', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name={a.icon as any} size={15} color={a.color} />
                </View>
                <Text style={[s.alertText, { color: a.color }]}>{a.msg}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── PENDING ALERT ───────────────────────────────────────── */}
        {pending > 0 && anomalies.every(a => !a.msg.includes('en attente')) && (
          <TouchableOpacity style={[s.alertBanner, { marginHorizontal: 16, marginTop: 10 }]} onPress={() => navigation.navigate('Reports')}>
            <View style={s.alertDot} />
            <Text style={s.alertText}>{pending} signalement{pending > 1 ? 's' : ''} en attente</Text>
            <Ionicons name="arrow-forward" size={15} color={D.amber} />
          </TouchableOpacity>
        )}

        {/* ── STAT CARDS ──────────────────────────────────────────── */}
        {dashboardWidgets.stats && (
          <View style={s.statsGrid}>
            {STATS.map((st, i) => <StatCard key={st.label} {...st} anim={anims[i]} cardBg={D.surface} cardBorder={D.border} labelColor={D.textMuted} />)}
          </View>
        )}

        {/* ── VALIDATION INLINE ───────────────────────────────────── */}
        {pendingReports.length > 0 && (
          <View style={[s.card, { backgroundColor: D.surface, borderColor: D.border }]}>
            <SectionTitle accent={D.accent} text={D.text} title="En attente de validation" action="Voir tout" onAction={() => navigation.navigate('Reports')} />
            <Text style={{ fontSize: 10, color: D.textMuted, marginBottom: 8, fontStyle: 'italic' }}>← Glisser pour rejeter · Valider →</Text>
            {pendingReports.map((r, idx) => (
              <SwipePendingRow
                key={r.id}
                report={r}
                idx={idx}
                total={pendingReports.length}
                D={D}
                validating={validating}
                onValidate={() => handleValidate(r.id)}
                onReject={() => handleReject(r.id)}
              />
            ))}
          </View>
        )}

        {/* ── VALIDATION RATE ─────────────────────────────────────── */}
        {dashboardWidgets.stats && (
          <View style={[s.card, { backgroundColor: D.surface, borderColor: D.border }]}>
            <View style={s.cardRow}>
              <Text style={[s.cardTitle, { color: D.text }]}>Taux de validation</Text>
              <View style={[s.pill, { backgroundColor: D.accentDim }]}>
                <Text style={[s.pillText, { color: D.accent }]}>{rate}%</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 12 }}>
              <CircularProgress pct={rate} accent={D.accent} border={D.border} />
              <View style={{ flex: 1, gap: 10 }}>
                {[
                  { label: 'Validés',  v: validated, color: D.green   },
                  { label: 'Rejetés', v: rejected,  color: D.red     },
                  { label: 'Total',    v: total,     color: D.accent  },
                ].map(item => (
                  <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: item.color }} />
                    <Text style={[s.rateLabel, { width: 54, color: D.textMuted }]}>{item.label}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: item.color, width: 24, textAlign: 'right' }}>{item.v}</Text>
                    <View style={[s.rateTrack, { backgroundColor: D.border }]}>
                      <View style={[s.rateFill, { width: total > 0 ? `${Math.round((item.v / total) * 100)}%` as any : '0%', backgroundColor: item.color }]} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ── ACTIVITÉ 7 JOURS ────────────────────────────────────── */}
        {dashboardWidgets.chart && (
          <View style={[s.card, { backgroundColor: D.surface, borderColor: D.border }]}>
            <SectionTitle accent={D.accent} text={D.text} title="Signalements — 7 jours" />
            <BarChart data={last7} color={D.accent} height={110} />
            <View style={[s.metricsRow, { borderTopColor: D.border }]}>
              {[
                { value: `${validationRate.toFixed(0)}%`,  label: 'Taux global'   },
                { value: avgProcessingHours > 0 ? (avgProcessingHours >= 24 ? `${(avgProcessingHours/24).toFixed(1)}j` : `${avgProcessingHours.toFixed(0)}h`) : 'N/A', label: 'Temps moyen' },
                { value: String(thisMonthCount),           label: 'Ce mois'       },
              ].map((m, i, arr) => (
                <React.Fragment key={m.label}>
                  <View style={s.metricItem}>
                    <Text style={[s.metricValue, { color: D.accent }]}>{m.value}</Text>
                    <Text style={[s.metricLabel, { color: D.textMuted }]}>{m.label}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={[s.metricDiv, { backgroundColor: D.border }]} />}
                </React.Fragment>
              ))}
            </View>
          </View>
        )}

        {/* ── CROISSANCE UTILISATEURS ─────────────────────────────── */}
        <View style={[s.card, { backgroundColor: D.surface, borderColor: D.border }]}>
          <SectionTitle accent={D.accent} text={D.text} title="Croissance utilisateurs" action="Gérer" onAction={() => navigation.navigate('Users')} />
          <BarChart data={userGrowth} color={D.purple} height={90} />
          <View style={[s.metricsRow, { borderTopColor: D.border }]}>
            {[
              { value: String(totalUsers),        label: 'Total',         color: D.accent  },
              { value: `+${newUsersThisMonth}`,   label: 'Ce mois',       color: D.green   },
              { value: String(blockedUsers),       label: 'Suspendus',     color: D.red     },
            ].map((m, i, arr) => (
              <React.Fragment key={m.label}>
                <View style={s.metricItem}>
                  <Text style={[s.metricValue, { color: m.color }]}>{m.value}</Text>
                  <Text style={[s.metricLabel, { color: D.textMuted }]}>{m.label}</Text>
                </View>
                {i < arr.length - 1 && <View style={[s.metricDiv, { backgroundColor: D.border }]} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* ── ÉCONOMIE POUBCOIN ───────────────────────────────────── */}
        <View style={[s.card, { backgroundColor: D.surface, borderColor: D.border }]}>
          <View style={s.cardRow}>
            <Text style={[s.cardTitle, { color: D.text }]}>Économie PoubCoin 🪙</Text>
            <TouchableOpacity
              style={[s.pill, { backgroundColor: D.accentSoft, borderWidth: 1, borderColor: D.accent + '30' }]}
              onPress={() => { setRateInput(String(coinsPerValidation)); setShowRateModal(true); }}
            >
              <Text style={[s.pillText, { color: D.accent }]}>{coinsPerValidation} 🪙 / sig.</Text>
            </TouchableOpacity>
          </View>
          <View style={[s.metricsRow, { marginTop: 14 }]}>
            {[
              { value: String(totalCoinsInCirculation), label: 'En circulation', color: D.accent  },
              { value: String(coinsDistributed),        label: 'Distribués',     color: D.green   },
              { value: String(coinsThisMonth),          label: 'Ce mois',        color: D.blue    },
            ].map((m, i, arr) => (
              <React.Fragment key={m.label}>
                <View style={s.metricItem}>
                  <Text style={[s.metricValue, { color: m.color }]}>{m.value}</Text>
                  <Text style={[s.metricLabel, { color: D.textMuted }]}>{m.label}</Text>
                </View>
                {i < arr.length - 1 && <View style={[s.metricDiv, { backgroundColor: D.border }]} />}
              </React.Fragment>
            ))}
          </View>
          <View style={[s.ecoBar, { marginTop: 14 }]}>
            <View style={{ flex: coinsThisMonth || 1, backgroundColor: D.blue + 'CC', borderRadius: 4, height: '100%' }} />
            <View style={{ flex: Math.max(0, coinsDistributed - coinsThisMonth) || 1, backgroundColor: D.green + '99', borderRadius: 4, height: '100%' }} />
            <View style={{ flex: Math.max(0, totalCoinsInCirculation - coinsDistributed) || 1, backgroundColor: D.accent + '33', borderRadius: 4, height: '100%' }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 8 }}>
            {[{ c: D.blue, l: 'Ce mois' }, { c: D.green, l: 'Distribués' }, { c: D.accent, l: 'Circulation' }].map(item => (
              <View key={item.l} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: item.c }} />
                <Text style={{ fontSize: 10, color: D.textMuted }}>{item.l}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── QUICK ACTIONS ───────────────────────────────────────── */}
        {dashboardWidgets.quickActions && (
          <View style={[s.card, { backgroundColor: D.surface, borderColor: D.border }]}>
            <Text style={[s.cardTitle, { color: D.text }]}>Actions rapides</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
              {QUICK.map(a => (
                <TouchableOpacity key={a.label} style={[s.quickCard, { borderColor: a.color + '30', width: '47%' }]} onPress={a.onPress} activeOpacity={0.75}>
                  <View style={[s.quickIcon, { backgroundColor: a.color + '18' }]}>
                    <Ionicons name={a.icon as any} size={21} color={a.color} />
                  </View>
                  <Text style={[s.quickLabel, { color: a.color }]}>{a.label}</Text>
                  <Text style={[s.quickSub, { color: D.textMuted }]}>{a.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── TOP 10 LEADERBOARD ──────────────────────────────────── */}
        {leaderboard.length > 0 && (
          <View style={[s.card, { backgroundColor: D.surface, borderColor: D.border }]}>
            <SectionTitle accent={D.accent} text={D.text} title="🏆 Classement citoyens" />
            {leaderboard.map((entry, i) => (
              <TouchableOpacity
                key={entry.userId}
                activeOpacity={0.7}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  navigation.navigate('Users', { highlightUserId: entry.userId });
                }}
                style={[s.lbRow, i < leaderboard.length - 1 && { borderBottomWidth: 1, borderBottomColor: D.border }]}
              >
                <View style={[s.lbRank, {
                  backgroundColor: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : D.accentSoft,
                }]}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: i < 3 ? '#fff' : D.accent }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                  </Text>
                </View>
                <Text style={[s.lbName, { flex: 1, color: D.text }]} numberOfLines={1}>{entry.name}</Text>
                <View style={[s.lbCoins, { backgroundColor: D.accentSoft }]}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: D.accent }}>{entry.coins} 🪙</Text>
                </View>
                <Ionicons name="chevron-forward" size={12} color={D.textMuted} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── ACTIVITÉ RÉCENTE ─────────────────────────────────────── */}
        {dashboardWidgets.recentActivity && recentReports.length > 0 && (
          <View style={[s.card, { backgroundColor: D.surface, borderColor: D.border }]}>
            <SectionTitle accent={D.accent} text={D.text} title="Activité récente" action="Voir tout" onAction={() => navigation.navigate('Reports')} />
            {recentReports.map((r, idx) => {
              const iso = toIso(r);
              const dateStr = iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : r.date;
              const sc = STATUS_COLORS[r.status as keyof typeof STATUS_COLORS];
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[s.actRow, idx < recentReports.length - 1 && { borderBottomWidth: 1, borderBottomColor: D.border }]}
                  onPress={() => navigation.navigate('Reports')} activeOpacity={0.7}
                >
                  <View style={[s.actBar, { backgroundColor: sc?.text ?? D.border }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.actAddr, { color: D.text }]} numberOfLines={1}>{r.address || 'Adresse inconnue'}</Text>
                    <Text style={[s.actDate, { color: D.textMuted }]}>{dateStr}</Text>
                  </View>
                  <View style={[s.statusChip, { backgroundColor: sc?.bg ?? D.border }]}>
                    <Text style={[s.statusText, { color: sc?.text ?? D.textMuted }]}>{sc?.label ?? r.status}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── HOT ZONES ───────────────────────────────────────────── */}
        {dashboardWidgets.hotZones && (
          <View style={[s.card, { backgroundColor: D.surface, borderColor: D.border }]}>
            <SectionTitle accent={D.accent} text={D.text} title="Zones les plus signalées" action="Carte" onAction={() => navigation.navigate('More', { screen: 'AdminMap' })} />
            {hotZones.length === 0 && (
              <Text style={{ fontSize: 13, color: D.textMuted, textAlign: 'center', paddingVertical: 12 }}>Aucune donnée</Text>
            )}
            {hotZones.map((z, i) => (
              <View key={z.name} style={s.zoneRow}>
                <View style={[s.zoneRank, { backgroundColor: i === 0 ? D.accent : D.accentSoft }]}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: i === 0 ? '#fff' : D.accent }}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                    <Text style={[s.zoneName, { color: D.text }]} numberOfLines={1}>{z.name}</Text>
                    <Text style={[s.zoneCount, { color: D.accent }]}>{z.count}</Text>
                  </View>
                  <View style={[s.zoneTrack, { backgroundColor: D.border }]}>
                    <View style={[s.zoneFill, { width: `${z.pct}%` as any, backgroundColor: D.accent }]} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── RETENTION ───────────────────────────────────────────── */}
        <View style={[s.card, { backgroundColor: D.surface, borderColor: D.border }]}>
          <Text style={[s.cardTitle, { color: D.text }]}>Rétention & engagement</Text>
          <View style={{ gap: 12, marginTop: 14 }}>
            {[
              { label: 'Utilisateurs actifs (7j)', value: activeUserIds7d.size, total: totalUsers, color: D.green },
              { label: 'Utilisateurs inactifs',     value: inactiveUsers,       total: totalUsers, color: D.amber },
              { label: 'Comptes suspendus',          value: blockedUsers,        total: totalUsers, color: D.red   },
            ].map(item => (
              <View key={item.label}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                  <Text style={{ fontSize: 12, color: D.textSub, fontWeight: '500' }}>{item.label}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: item.color }}>
                    {item.value} <Text style={{ fontSize: 11, color: D.textMuted, fontWeight: '400' }}>/ {item.total}</Text>
                  </Text>
                </View>
                <View style={[s.rateTrack, { backgroundColor: D.border }]}>
                  <View style={[s.rateFill, {
                    width: item.total > 0 ? `${Math.round((item.value / item.total) * 100)}%` as any : '0%',
                    backgroundColor: item.color,
                  }]} />
                </View>
              </View>
            ))}
          </View>
          {inactiveUsers > 0 && (
            <TouchableOpacity
              style={[s.notifPreset, { marginTop: 14, borderColor: D.amber + '40', backgroundColor: D.amberDim }]}
              onPress={() => {
                setPushTitle('Tu nous manques ! 🌿');
                setPushBody('Revenez signaler des déchets et gagnez des PoubCoins. La ville a besoin de vous !');
                setPushTarget('inactive');
                setShowPushModal(true);
              }}
            >
              <Ionicons name="notifications-outline" size={14} color={D.amber} />
              <Text style={{ fontSize: 12, color: D.amber, fontWeight: '600' }}>Relancer les {inactiveUsers} inactifs</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>

      {/* ── MODAL : TAUX DE CONVERSION ──────────────────────────── */}
      <Modal visible={showRateModal} transparent animationType="fade" onRequestClose={() => setShowRateModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modal, { backgroundColor: D.surface }]}>
            <Text style={[s.modalTitle, { color: D.text }]}>Taux de conversion</Text>
            <Text style={[s.modalSub, { color: D.textMuted }]}>PoubCoins accordés par signalement validé</Text>
            <View style={s.rateRow}>
              <TouchableOpacity style={[s.rateBtn, { backgroundColor: D.accentSoft, borderColor: D.accent + '30' }]} onPress={() => setRateInput(v => String(Math.max(1, parseInt(v || '0', 10) - 5)))}>
                <Ionicons name="remove" size={18} color={D.accent} />
              </TouchableOpacity>
              <TextInput
                style={[s.rateInput, { color: D.accent, borderBottomColor: D.accent }]}
                value={rateInput}
                onChangeText={setRateInput}
                keyboardType="number-pad"
                maxLength={4}
              />
              <TouchableOpacity style={[s.rateBtn, { backgroundColor: D.accentSoft, borderColor: D.accent + '30' }]} onPress={() => setRateInput(v => String(parseInt(v || '0', 10) + 5))}>
                <Ionicons name="add" size={18} color={D.accent} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 11, color: D.textMuted, textAlign: 'center', marginBottom: 18 }}>
              Actuel : {coinsPerValidation} 🪙  ·  Nouveau : {rateInput} 🪙
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: D.border }]} onPress={() => setShowRateModal(false)}>
                <Text style={{ fontWeight: '600', color: D.textSub }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: D.accent, flex: 1 }]} onPress={handleSaveRate}>
                <Text style={{ fontWeight: '700', color: '#fff' }}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL : NOTIFICATIONS PUSH ──────────────────────────── */}
      <Modal visible={showPushModal} transparent animationType="slide" onRequestClose={() => setShowPushModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modal, { maxHeight: '85%', backgroundColor: D.surface }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={[s.modalTitle, { color: D.text }]}>📣 Notification push</Text>
              <Text style={[s.modalSub, { color: D.textMuted }]}>Envoyer un message aux citoyens</Text>

              {/* Target */}
              <Text style={[s.inputLabel, { color: D.textMuted }]}>Destinataires</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                {([['all', 'Tous', D.accent], ['inactive', 'Inactifs', D.amber], ['top', 'Top 20%', D.green]] as const).map(([val, lbl, clr]) => (
                  <TouchableOpacity
                    key={val}
                    style={[s.targetChip, { borderColor: clr + '50', backgroundColor: pushTarget === val ? clr + '18' : 'transparent' }]}
                    onPress={() => setPushTarget(val)}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: pushTarget === val ? clr : D.textMuted }}>{lbl}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Presets */}
              <Text style={[s.inputLabel, { color: D.textMuted }]}>Modèles rapides
              </Text>
              {[
                { title: '🌿 Rejoignez-nous !', body: 'Aidez à garder votre ville propre. Signalez et gagnez des PoubCoins !' },
                { title: '🏆 Nouveau défi !', body: 'Un nouveau défi est disponible. Relevez le pour gagner des bonus !' },
                { title: '🎁 Offre spéciale', body: 'De nouvelles récompenses sont disponibles dans la boutique !' },
              ].map((p, i) => (
                <TouchableOpacity key={i} style={[s.notifPreset, { borderColor: D.border, backgroundColor: D.bg }]} onPress={() => { setPushTitle(p.title); setPushBody(p.body); }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: D.textSub }}>{p.title}</Text>
                  <Text style={{ fontSize: 11, color: D.textMuted }} numberOfLines={1}>{p.body}</Text>
                </TouchableOpacity>
              ))}

              {/* Inputs */}
              <Text style={[s.inputLabel, { color: D.textMuted, marginTop: 14 }]}>Titre</Text>
              <TextInput style={[s.textInput, { backgroundColor: D.bg, borderColor: D.border, color: D.text }]} value={pushTitle} onChangeText={setPushTitle} placeholder="Titre de la notification" placeholderTextColor={D.textMuted} />
              <Text style={[s.inputLabel, { color: D.textMuted }]}>Message</Text>
              <TextInput style={[s.textInput, { minHeight: 80, textAlignVertical: 'top' }]} value={pushBody} onChangeText={setPushBody} placeholder="Contenu du message…" placeholderTextColor={D.textMuted} multiline />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity style={[s.modalBtn, { backgroundColor: D.border }]} onPress={() => setShowPushModal(false)}>
                  <Text style={{ fontWeight: '600', color: D.textSub }}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.modalBtn, { backgroundColor: D.accent, flex: 1, opacity: (!pushTitle.trim() || !pushBody.trim() || pushSending) ? 0.5 : 1 }]}
                  onPress={handleSendPush}
                  disabled={!pushTitle.trim() || !pushBody.trim() || pushSending}
                >
                  {pushSending
                    ? <ActivityIndicator size={14} color="#fff" />
                    : <Text style={{ fontWeight: '700', color: '#fff' }}>Envoyer</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Onboarding premier lancement ────────────────────────── */}
      <AdminOnboardingModal visible={showOnboarding} onClose={() => setShowOnboarding(false)} />

      {/* ── Recherche globale ────────────────────────────────────── */}
      <Modal visible={searchOpen} transparent animationType="fade" onRequestClose={() => { setSearchOpen(false); setSearchQ(''); }}>
        <View style={s.modalOverlay}>
          <View style={[s.modal, { backgroundColor: D.surface, padding: 0, overflow: 'hidden', maxHeight: '85%' }]}>
            {/* Barre de recherche */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: D.border }}>
              <Ionicons name="search" size={18} color={D.textMuted} />
              <TextInput
                style={{ flex: 1, fontSize: 15, color: D.text, fontWeight: '600' }}
                placeholder="Signalements, utilisateurs…"
                placeholderTextColor={D.textMuted}
                value={searchQ}
                onChangeText={setSearchQ}
                autoFocus
              />
              <TouchableOpacity onPress={() => { setSearchOpen(false); setSearchQ(''); }}>
                <Ionicons name="close" size={20} color={D.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }}>
              {searchQ.trim() === '' ? (
                <View style={{ padding: 32, alignItems: 'center', gap: 8 }}>
                  <Ionicons name="search-outline" size={40} color={D.border} />
                  <Text style={{ color: D.textMuted, fontSize: 13 }}>Tapez pour chercher</Text>
                </View>
              ) : (searchResults.reports.length === 0 && searchResults.users.length === 0) ? (
                <View style={{ padding: 32, alignItems: 'center', gap: 8 }}>
                  <Ionicons name="alert-circle-outline" size={36} color={D.border} />
                  <Text style={{ color: D.textMuted, fontSize: 13 }}>Aucun résultat pour « {searchQ} »</Text>
                </View>
              ) : (
                <View style={{ padding: 8 }}>
                  {searchResults.reports.length > 0 && (
                    <View>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: D.textMuted, letterSpacing: 1.2, paddingHorizontal: 8, paddingVertical: 6 }}>SIGNALEMENTS</Text>
                      {searchResults.reports.map((r: any) => (
                        <TouchableOpacity key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10 }}
                          onPress={() => { setSearchOpen(false); setSearchQ(''); navigation.navigate('AdminReports' as never); }}>
                          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: D.greenDim, alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="document-text-outline" size={17} color={D.green} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: D.text }} numberOfLines={1}>{r.address || 'Adresse inconnue'}</Text>
                            <Text style={{ fontSize: 11, color: D.textMuted }}>{r.userName} · {r.status}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {searchResults.users.length > 0 && (
                    <View>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: D.textMuted, letterSpacing: 1.2, paddingHorizontal: 8, paddingVertical: 6, marginTop: 4 }}>UTILISATEURS</Text>
                      {searchResults.users.map((u: any) => (
                        <TouchableOpacity key={u.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10 }}
                          onPress={() => { setSearchOpen(false); setSearchQ(''); navigation.navigate('AdminUsers' as never); }}>
                          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: D.purpleDim, alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="person-outline" size={17} color={D.purple} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: D.text }} numberOfLines={1}>{u.name || u.email || 'Utilisateur'}</Text>
                            <Text style={{ fontSize: 11, color: D.textMuted }}>{u.email} · {u.city || '—'}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ── Styles (no dynamic color refs — all D.xxx applied inline in JSX) ──────────

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 20, overflow: 'hidden' },
  hPills: { flexDirection: 'row', gap: 8, marginTop: 14 },
  hPill:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.22)', borderRadius: 10, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  hPillVal: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: -0.5 } as const,
  hPillLbl: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 } as const,
  headerBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  headerDot: { width: 7, height: 7, borderRadius: 4 },
  headerBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.8 },
  headerTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  headerSub: { fontSize: 11.5, marginTop: 1 },
  logoutBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },

  heroCard: { marginHorizontal: 16, marginTop: 14, marginBottom: 4, borderRadius: radius.lg, padding: 18, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 12 },
  todayRow: { flexDirection: 'row', marginBottom: 16 },
  todayCell: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  todayValue: { fontSize: 30, fontWeight: '900', letterSpacing: -1 },
  todayLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  progressBox: { borderRadius: 12, padding: 14, borderWidth: 1, marginTop: 0 },

  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.sm, padding: 13, borderWidth: 1, borderLeftWidth: 3 },
  alertDot: { width: 7, height: 7, borderRadius: 4 },
  alertText: { flex: 1, fontWeight: '600', fontSize: 13 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, paddingTop: 12, gap: 10 },
  statCard: { width: '47%', borderRadius: radius.md, padding: 14, paddingLeft: 18, borderWidth: 1, gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  statCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  statIconBox: { width: 32, height: 32, borderRadius: radius.xs, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  statLabel: { fontSize: 11, fontWeight: '600' },

  card: { marginHorizontal: 16, marginBottom: 12, borderRadius: radius.md, padding: 18, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  seeAll: { fontSize: 11, fontWeight: '700' },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  pill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { fontSize: 13, fontWeight: '700' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionBar: { width: 3, height: 16, borderRadius: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },

  rateLabel: { fontSize: 12 },
  rateTrack: { flex: 1, height: 5, borderRadius: 3 },
  rateFill: { height: '100%', borderRadius: 3 },

  metricsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
  metricItem: { flex: 1, alignItems: 'center', gap: 3 },
  metricValue: { fontSize: 20, fontWeight: '800' },
  metricLabel: { fontSize: 11 },
  metricDiv: { width: 1, height: 32 },

  ecoBar: { flexDirection: 'row', gap: 3, height: 8, borderRadius: 4, overflow: 'hidden' },

  quickCard: { alignItems: 'center', padding: 12, borderRadius: radius.md, borderWidth: 1, gap: 5 },
  quickIcon: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  quickLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  quickSub: { fontSize: 10, textAlign: 'center' },

  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  inlineBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },

  actRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  actBorder: { borderBottomWidth: 1 },
  actBar: { width: 3, height: 38, borderRadius: 2 },
  actAddr: { fontSize: 13, fontWeight: '600' },
  actDate: { fontSize: 11, marginTop: 2 },
  statusChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },

  lbRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  lbRank: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  lbName: { fontSize: 13, fontWeight: '600' },
  lbCoins: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },

  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  zoneRank: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  zoneName: { fontSize: 13, fontWeight: '600', flex: 1, marginRight: 8 },
  zoneCount: { fontSize: 13, fontWeight: '700' },
  zoneTrack: { height: 4, borderRadius: 2 },
  zoneFill: { height: '100%', borderRadius: 2, opacity: 0.85 },

  notifPreset: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modal: { borderRadius: radius.lg, padding: 24, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  modalSub: { fontSize: 13, textAlign: 'center', marginBottom: 20 },
  modalBtn: { flex: 1, height: 44, borderRadius: radius.sm, justifyContent: 'center', alignItems: 'center' },

  rateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 8 },
  rateBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  rateInput: { fontSize: 32, fontWeight: '800', textAlign: 'center', width: 80, borderBottomWidth: 2, paddingBottom: 4 },

  inputLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  textInput: { borderWidth: 1, borderRadius: radius.sm, padding: 12, fontSize: 14, marginBottom: 10 },
  targetChip: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
});
