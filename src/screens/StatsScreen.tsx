import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, Dimensions, Animated, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, where, query } from 'firebase/firestore';
import { db } from '../firebase';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { shadow, radius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useT } from '../i18n/useT';

const { width } = Dimensions.get('window');
const DAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export default function StatsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const t = useT();
  const s = getStyles(colors);
  const { reports, balance } = useWallet();
  const { user } = useAuth();
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week');

  const IMPACT_ITEMS = [
    { icon: '📸',  label: t('stats_waste'),           key: 'total',     unit: '',     color: colors.primary,  bg: colors.primaryGhost },
    { icon: '✅',  label: t('stats_validated_count'),  key: 'validated', unit: '',     color: colors.success,  bg: colors.successLight },
    { icon: '🪙',  label: t('stats_coins_earned'),     key: 'coins',     unit: ' 🪙',  color: colors.gold,     bg: colors.goldLight    },
    { icon: '🌍',  label: t('stats_area'),             key: 'area',      unit: ' km²', color: colors.info,     bg: colors.infoLight    },
  ];

  const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32', colors.info ?? '#3B82F6', colors.purple ?? '#8B5CF6'];
  const [cityRanking, setCityRanking] = useState<{ city: string; reports: number; color: string; rank: number }[]>([]);

  useEffect(() => {
    getDocs(query(collection(db, 'reports'), where('status', '==', 'validated'))).then(snap => {
      const counts: Record<string, number> = {};
      snap.docs.forEach(d => {
        const city = (d.data().city ?? d.data().address?.split(',').slice(-1)[0]?.trim() ?? '').trim();
        if (!city) return;
        counts[city] = (counts[city] ?? 0) + 1;
      });
      const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([city, count], i) => ({ city, reports: count, color: RANK_COLORS[i], rank: i + 1 }));
      setCityRanking(sorted);
    }).catch(() => {});
  }, []);

  const CITY_RANKING = cityRanking;

  const validated  = reports.filter(r => r.status === 'validated').length;
  const totalCoins = reports.filter(r => r.status === 'validated').reduce((s, r) => s + (r.coins ?? 50), 0);
  const areaKm2    = (validated * 0.05).toFixed(2);

  // Build real weekly data from user reports (last 7 days, Sun→Sat)
  const WEEKLY = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const now = new Date();
    reports.forEach(r => {
      if (!r.date) return;
      const d = new Date(r.date);
      const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
      if (diffDays < 0 || diffDays > 6) return;
      const dayOfWeek = d.getDay(); // 0=Sun
      counts[dayOfWeek]++;
    });
    return DAY_LABELS.map((day, i) => ({ day, count: counts[i] }));
  }, [reports]);

  // Animated bars
  const barAnims = useRef(WEEKLY.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    barAnims.forEach(a => a.setValue(0));
    Animated.stagger(60, barAnims.map(a =>
      Animated.spring(a, { toValue: 1, tension: 60, friction: 8, useNativeDriver: Platform.OS !== 'web' })
    )).start();
  }, [WEEKLY.length]);

  const maxCount = Math.max(...WEEKLY.map(d => d.count), 1);
  const maxCityReports = CITY_RANKING[0]?.reports ?? 1;

  const statsData: Record<string, any> = {
    total: reports.length,
    validated,
    coins: totalCoins,
    area: areaKm2,
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerCircle1} />
        <View style={s.headerCircle2} />
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{t('nav_stats')}</Text>
          <Text style={s.headerSub}>{t('stats_subtitle')}</Text>
        </View>
        <View style={s.headerBadge}>
          <Text style={s.headerBadgeText}>🌱 Niveau {Math.floor(validated / 5) + 1}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Impact hero card */}
        <View style={s.heroCard}>
          <View style={s.heroGlow} />
          <Text style={s.heroLabel}>{t('stats_hero_label')}</Text>
          <View style={s.heroMain}>
            <Text style={s.heroNumber}>~{areaKm2}</Text>
            <Text style={s.heroUnit}>{t('stats_km2')}</Text>
          </View>
          <Text style={s.heroSub}>🌍 {validated} {t('stats_validated_count').toLowerCase()}</Text>

          {/* Mini stats row */}
          <View style={s.heroStats}>
            {[
              { label: t('stats_reports'), value: reports.length, icon: 'camera' },
              { label: t('history_validated'), value: validated, icon: 'checkmark-circle' },
              { label: t('stats_pending'), value: reports.filter(r => r.status === 'pending').length, icon: 'time' },
            ].map(stat => (
              <View key={stat.label} style={s.heroStat}>
                <Text style={s.heroStatNum}>{stat.value}</Text>
                <Text style={s.heroStatLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Impact grid */}
        <Text style={s.sectionTitle}>{t('stats_overview')}</Text>
        <View style={s.impactGrid}>
          {IMPACT_ITEMS.map(item => (
            <View key={item.key} style={[s.impactCard, { borderTopColor: item.color, borderTopWidth: 3 }]}>
              <View style={[s.impactIconBox, { backgroundColor: item.bg }]}>
                <Text style={{ fontSize: 22 }}>{item.icon}</Text>
              </View>
              <Text style={[s.impactNum, { color: item.color }]}>
                {statsData[item.key]}{item.unit}
              </Text>
              <Text style={s.impactLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Link to Impact */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Impact')}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 14, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 22 }}>🌿</Text>
            <View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#15803D' }}>Voir mon impact écologique</Text>
              <Text style={{ fontSize: 11, color: '#16A34A' }}>CO₂ évité, eau économisée, équivalences nature</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#16A34A" />
        </TouchableOpacity>

        {/* Activity chart */}
        <View style={s.chartCard}>
          <View style={s.chartHeader}>
            <Text style={s.chartTitle}>{t('stats_activity')}</Text>
            <View style={s.periodTabs}>
              {(['week', 'month', 'all'] as const).map(p => (
                <TouchableOpacity
                  key={p}
                  style={[s.periodTab, period === p && s.periodTabActive]}
                  onPress={() => setPeriod(p)}
                >
                  <Text style={[s.periodTabText, period === p && s.periodTabTextActive]}>
                    {p === 'week' ? t('period_week') : p === 'month' ? t('period_month') : t('period_total')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Bar chart */}
          <View style={s.bars}>
            {WEEKLY.map((d, i) => {
              const targetH = maxCount === 0 ? 0 : (d.count / maxCount) * 90;
              const todayDow = new Date().getDay();
              const isToday = i === todayDow;
              const barColor = isToday ? colors.primary : (d.count > 0 ? colors.primaryLight ?? '#4ADE80' : colors.borderLight ?? '#E4E8E4');
              return (
                <View key={i} style={s.barCol}>
                  <Text style={s.barVal}>{d.count > 0 ? d.count : ''}</Text>
                  <View style={s.barBg}>
                    <Animated.View style={[
                      s.barFill,
                      {
                        height: barAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0, targetH] }),
                        backgroundColor: barColor,
                        transform: [{ scaleX: barAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
                      },
                    ]} />
                  </View>
                  <Text style={[s.barDay, isToday && { color: colors.primary, fontWeight: '800' }]}>{d.day}</Text>
                </View>
              );
            })}
          </View>

          <View style={s.chartFooter}>
            <View style={s.chartLegendItem}>
              <View style={[s.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={s.chartLegendText}>{t('stats_today')}</Text>
            </View>
            <View style={s.chartLegendItem}>
              <View style={[s.legendDot, { backgroundColor: colors.primaryLight }]} />
              <Text style={s.chartLegendText}>{t('stats_active_day')}</Text>
            </View>
          </View>
        </View>

        {/* City ranking */}
        <Text style={s.sectionTitle}>{t('stats_city_ranking')}</Text>
        <View style={s.cityCard}>
          {CITY_RANKING.length === 0 && (
            <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 12 }}>
              Chargement des données…
            </Text>
          )}
          {CITY_RANKING.map((c, i) => (
            <View key={c.city} style={[s.cityRow, i < CITY_RANKING.length - 1 && s.cityRowBorder]}>
              <View style={[s.cityRankBadge, { backgroundColor: c.color + '20' }]}>
                <Text style={[s.cityRankNum, { color: c.color }]}>#{c.rank}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.cityLabelRow}>
                  <Text style={s.cityName}>{c.city}</Text>
                  <Text style={s.cityCount}>{c.reports.toLocaleString()}</Text>
                </View>
                <View style={s.cityBarBg}>
                  <View style={[
                    s.cityBarFill,
                    { width: `${(c.reports / maxCityReports) * 100}%` as any, backgroundColor: c.color },
                  ]} />
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Activity calendar */}
        <Text style={s.sectionTitle}>{t('stats_calendar')}</Text>
        <View style={s.calendarCard}>
          <ActivityCalendar reports={reports} />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ActivityCalendar({ reports }: { reports: { date: string }[] }) {
  const { colors } = useTheme();
  const t = useT();
  // Build a map of date → count for last 12 weeks (84 days)
  const today = new Date();
  const cells: { date: string; count: number }[] = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const count = reports.filter(r => r.date === key).length;
    cells.push({ date: key, count });
  }

  const getColor = (count: number) => {
    if (count === 0) return colors.borderLight;
    if (count === 1) return colors.primaryGhost;
    if (count <= 3) return colors.primaryLight + '80';
    return colors.primary;
  };

  // 12 weeks × 7 days = 84 cells
  const weeks: typeof cells[] = [];
  for (let w = 0; w < 12; w++) {
    weeks.push(cells.slice(w * 7, w * 7 + 7));
  }
  const totalActive = cells.filter(c => c.count > 0).length;

  return (
    <View>
      <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 10 }}>
        {totalActive} {t('stats_calendar').toLowerCase()}
      </Text>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {weeks.map((week, wi) => (
          <View key={wi} style={{ gap: 3 }}>
            {week.map((cell, di) => (
              <View
                key={di}
                style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: getColor(cell.count) }}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
        <Text style={{ fontSize: 10, color: colors.textMuted }}>{t('stats_less')}</Text>
        {[0, 1, 2, 4].map(c => (
          <View key={c} style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: getColor(c) }} />
        ))}
        <Text style={{ fontSize: 10, color: colors.textMuted }}>{t('stats_more')}</Text>
      </View>
    </View>
  );
}

const BAR_HEIGHT = 100;

const getStyles = (colors: any): any => ({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, gap: 16 },

  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  headerCircle1: { display: 'none' as any },
  headerCircle2: { display: 'none' as any },
  backBtn: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: -0.3 },
  headerSub:   { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },
  headerBadge: {
    backgroundColor: 'rgba(255,215,64,0.2)', borderRadius: radius.pill,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1.5, borderColor: 'rgba(255,215,64,0.35)',
  },
  headerBadgeText: { color: '#FFE566', fontWeight: '800', fontSize: 12 },

  heroCard: {
    backgroundColor: colors.primary, borderRadius: radius.xl, padding: 24,
    overflow: 'hidden', ...shadow.lg,
  },
  heroGlow: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -80, right: -50,
  },
  heroLabel:  { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  heroMain:   { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 6 },
  heroNumber: { fontSize: 52, fontWeight: '900', color: '#fff', lineHeight: 56 },
  heroUnit:   { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.75)', marginBottom: 8 },
  heroSub:    { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginBottom: 18 },
  heroStats:  { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', paddingTop: 14, gap: 0 },
  heroStat:   { flex: 1, alignItems: 'center' },
  heroStatNum:   { color: '#fff', fontSize: 22, fontWeight: '900' },
  heroStatLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 4 },

  impactGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  impactCard: {
    width: (width - 32 - 10) / 2,
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, gap: 8,
    ...shadow.card, borderWidth: 1, borderColor: colors.borderLight,
  },
  impactIconBox: { width: 48, height: 48, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  impactNum:     { fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
  impactLabel:   { fontSize: 11, color: colors.textMuted, fontWeight: '700' },

  chartCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: 20,
    ...shadow.card, borderWidth: 1, borderColor: colors.borderLight,
  },
  chartHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  chartTitle:   { fontSize: 15, fontWeight: '800', color: colors.text },
  periodTabs:   { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 8, padding: 3, gap: 2 },
  periodTab:    { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  periodTabActive: { backgroundColor: colors.primary },
  periodTabText:   { fontSize: 11, color: colors.textSecondary, fontWeight: '700' },
  periodTabTextActive: { color: '#fff' },

  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: BAR_HEIGHT + 32 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barVal: { fontSize: 11, fontWeight: '700', color: colors.textMuted, height: 16 },
  barBg:  { flex: 1, width: '100%', backgroundColor: colors.background, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill:{ width: '100%', borderRadius: 6 },
  barDay: { fontSize: 11, fontWeight: '600', color: colors.textMuted },

  chartFooter: { flexDirection: 'row', gap: 16, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderLight },
  chartLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  chartLegendText: { fontSize: 11, color: colors.textMuted },

  cityCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18,
    ...shadow.card, borderWidth: 1, borderColor: colors.borderLight, gap: 14,
  },
  cityRow: { gap: 10 },
  cityRowBorder: { paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  cityLabelRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cityRankBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4 },
  cityRankNum:   { fontSize: 12, fontWeight: '900' },
  cityName:  { fontSize: 14, fontWeight: '700', color: colors.text },
  cityCount: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  cityBarBg: { height: 8, backgroundColor: colors.background, borderRadius: 4, overflow: 'hidden' },
  cityBarFill: { height: 8, borderRadius: 4 },

  calendarCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18,
    borderWidth: 1, borderColor: colors.border, ...shadow.xs,
  },
});
