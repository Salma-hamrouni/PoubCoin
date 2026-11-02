import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Share, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdmin } from '../../context/AdminContext';
import { colors, radius, shadow } from '../../theme';

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function useCountUp(target: number, duration = 800) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      setVal(start);
      if (start >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return val;
}

export default function AdminStatsScreen({ navigation }: any) {
  const { reports, users } = useAdmin();

  const exportCSV = async () => {
    const header = 'ID,Utilisateur,Adresse,Date,Statut,Coins';
    const rows = reports.map(r =>
      `${r.id},"${(r.userName ?? '').replace(/"/g, '""')}","${(r.address ?? '').replace(/"/g, '""')}",${r.date},${r.status},${r.coins}`
    );
    const csv = [header, ...rows].join('\n');

    if (Platform.OS === 'web') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `poubcoin_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    try {
      await Share.share({ message: csv, title: 'Export signalements PoubCoin' });
    } catch {
      console.warn('Export error');
    }
  };

  const total     = reports.length;
  const pending   = reports.filter(r => r.status === 'pending').length;
  const validated = reports.filter(r => r.status === 'validated').length;
  const rejected  = reports.filter(r => r.status === 'rejected').length;
  const rate      = (validated + rejected) > 0 ? Math.round((validated / (validated + rejected)) * 100) : 0;

  // Average coins per validated report
  const validatedWithCoins = reports.filter(r => r.status === 'validated' && r.coins > 0);
  const avgCoins = validatedWithCoins.length > 0
    ? Math.round(validatedWithCoins.reduce((acc, r) => acc + r.coins, 0) / validatedWithCoins.length)
    : 0;

  // Reports per day of week
  const byDay = Array(7).fill(0);
  reports.forEach(r => {
    if (r.date) {
      const d = new Date(r.date).getDay();
      if (!isNaN(d)) byDay[d]++;
    }
  });
  const maxDay = Math.max(...byDay, 1);

  // Monthly trend — last 6 months
  const now = new Date();
  const monthlyData: { label: string; value: number; monthStr: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = MONTH_NAMES[d.getMonth()];
    const count = reports.filter(r => {
      const raw = (r as any).createdAt;
      const iso = raw?.toDate ? raw.toDate().toISOString() : (typeof raw === 'string' ? raw : r.date ?? '');
      return iso.slice(0, 7) === monthStr;
    }).length;
    monthlyData.push({ label, value: count, monthStr });
  }
  const maxMonthly = Math.max(...monthlyData.map(m => m.value), 1);

  // Top users
  const userCount: Record<string, { name: string; count: number }> = {};
  reports.forEach(r => {
    if (!userCount[r.userId]) userCount[r.userId] = { name: r.userName, count: 0 };
    userCount[r.userId].count++;
  });
  const topUsers = Object.values(userCount).sort((a, b) => b.count - a.count).slice(0, 5);

  // Top 3 cities from address (text after last comma)
  const cityCount: Record<string, number> = {};
  reports.forEach(r => {
    const city = r.address?.split(',').slice(-1)[0]?.trim() ?? 'Inconnue';
    cityCount[city] = (cityCount[city] || 0) + 1;
  });
  const topCities = Object.entries(cityCount).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const maxCity = Math.max(...topCities.map(([, c]) => c), 1);

  const avgPerDay = total > 0
    ? (total / 7).toFixed(1)
    : '0';

  const animTotal     = useCountUp(total);
  const animValidated = useCountUp(validated);
  const animPending   = useCountUp(pending);
  const animRate      = useCountUp(rate);

  // Animated widths for status bar chart
  const animV = useRef(new Animated.Value(0)).current;
  const animP = useRef(new Animated.Value(0)).current;
  const animR = useRef(new Animated.Value(0)).current;

  // Animated bar heights for last-7-days chart
  const last7 = (() => {
    const days: { label: string; validated: number; pending: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().slice(0, 10);
      const dayLabel = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][d.getDay()];
      const dayReports = reports.filter(r => {
        const raw = (r as any).createdAt;
        const iso = raw?.toDate ? raw.toDate().toISOString() : (typeof raw === 'string' ? raw : r.date ?? '');
        return iso.slice(0, 10) === dayStr;
      });
      days.push({ label: dayLabel, validated: dayReports.filter(r => r.status === 'validated').length, pending: dayReports.filter(r => r.status === 'pending').length });
    }
    return days;
  })();
  const maxDay7 = Math.max(...last7.map(d => d.validated + d.pending), 1);
  const barAnims = useRef(last7.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const totalR = total > 0 ? total : 1;
    Animated.parallel([
      Animated.timing(animV, { toValue: (validated / totalR) * 100, duration: 800, useNativeDriver: false }),
      Animated.timing(animP, { toValue: (pending / totalR) * 100,   duration: 800, useNativeDriver: false }),
      Animated.timing(animR, { toValue: (rejected / totalR) * 100,  duration: 800, useNativeDriver: false }),
      ...barAnims.map((anim, i) =>
        Animated.timing(anim, { toValue: ((last7[i].validated + last7[i].pending) / maxDay7) * 80, duration: 700 + i * 50, useNativeDriver: false })
      ),
    ]).start();
  }, [total, validated, pending, rejected]);

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerLabel}>ANALYSE</Text>
          <Text style={s.headerTitle}>Statistiques</Text>
        </View>
        <TouchableOpacity style={s.exportBtn} onPress={exportCSV}>
          <Ionicons name="download-outline" size={16} color={colors.primary} />
          <Text style={s.exportText}>CSV</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>

        {/* Animated KPI Cards */}
        <View style={s.kpiGrid}>
          {[
            { label: 'Total signalements', value: String(animTotal),     icon: 'documents-outline',        color: colors.primary  },
            { label: 'Taux de validation', value: `${animRate}%`,        icon: 'checkmark-circle-outline', color: '#15803D'       },
            { label: 'En attente',         value: String(animPending),   icon: 'time-outline',             color: '#B45309'       },
            { label: 'Coins moy./validé',  value: avgCoins > 0 ? `${avgCoins} 🪙` : '—', icon: 'cash-outline', color: '#7C3AED' },
          ].map(k => (
            <View key={k.label} style={s.kpiCard}>
              <View style={[s.kpiIcon, { backgroundColor: k.color + '15' }]}>
                <Ionicons name={k.icon as any} size={18} color={k.color} />
              </View>
              <Text style={[s.kpiValue, { color: k.color }]}>{k.value}</Text>
              <Text style={s.kpiLabel}>{k.label}</Text>
            </View>
          ))}
        </View>

        {/* Animated Horizontal Status Bar */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Répartition des statuts</Text>
          <View style={{ flexDirection: 'row', height: 20, borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
            <Animated.View style={{ width: animV.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }), backgroundColor: '#16A34A' }} />
            <Animated.View style={{ width: animP.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }), backgroundColor: '#D97706' }} />
            <Animated.View style={{ width: animR.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }), backgroundColor: '#DC2626' }} />
          </View>
          {[
            { label: 'Validés',    count: validated, color: '#16A34A', pct: total > 0 ? Math.round(validated/total*100) : 0 },
            { label: 'En attente', count: pending,   color: '#D97706', pct: total > 0 ? Math.round(pending/total*100) : 0 },
            { label: 'Rejetés',    count: rejected,  color: '#DC2626', pct: total > 0 ? Math.round(rejected/total*100) : 0 },
          ].map(st => (
            <View key={st.label} style={s.statusRow}>
              <View style={[s.statusDot, { backgroundColor: st.color }]} />
              <Text style={s.statusLabel}>{st.label}</Text>
              <View style={s.statusTrack}>
                <View style={[s.statusFill, { width: `${st.pct}%` as any, backgroundColor: st.color }]} />
              </View>
              <Text style={[s.statusCount, { color: st.color }]}>{st.count}</Text>
            </View>
          ))}
        </View>

        {/* Animated 7-day bar chart */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Signalements des 7 derniers jours</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 6 }}>
            {last7.map((day, i) => {
              const total7 = day.validated + day.pending;
              const vRatio = total7 > 0 ? day.validated / total7 : 0;
              return (
                <View key={i} style={{ flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <Text style={s.barVal}>{total7 > 0 ? total7 : ''}</Text>
                  <Animated.View style={{ width: '100%', height: barAnims[i], borderRadius: 3, overflow: 'hidden', justifyContent: 'flex-end' }}>
                    <View style={{ flex: 1 - vRatio, backgroundColor: '#D97706', opacity: 0.8 }} />
                    <View style={{ flex: vRatio, backgroundColor: '#16A34A' }} />
                  </Animated.View>
                  <Text style={s.barDay}>{day.label}</Text>
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 10, justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#16A34A' }} />
              <Text style={{ fontSize: 11, color: colors.textMuted }}>Validés</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#D97706' }} />
              <Text style={{ fontSize: 11, color: colors.textMuted }}>En attente</Text>
            </View>
          </View>
        </View>

        {/* Monthly trend — last 6 months */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Tendance mensuelle (6 mois)</Text>
          <View style={s.chart}>
            {monthlyData.map((m) => (
              <View key={m.monthStr} style={s.barCol}>
                <Text style={s.barVal}>{m.value > 0 ? m.value : ''}</Text>
                <View style={s.barTrack}>
                  <View style={[s.bar, { height: `${(m.value / maxMonthly) * 100}%` as any, backgroundColor: colors.primary }]} />
                </View>
                <Text style={s.barDay}>{m.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top 3 cities */}
        {topCities.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Top 3 zones les plus actives</Text>
            {topCities.map(([city, count], i) => (
              <View key={city} style={s.cityRow}>
                <View style={[s.cityRankBadge, i === 0 && s.cityRankGold]}>
                  <Text style={[s.cityRankText, i === 0 && { color: '#B45309' }]}>#{i + 1}</Text>
                </View>
                <View style={s.cityBody}>
                  <View style={s.cityTop}>
                    <Text style={s.cityName} numberOfLines={1}>{city}</Text>
                    <Text style={s.cityCount}>{count}</Text>
                  </View>
                  <View style={s.cityTrack}>
                    <View style={[s.cityFill, { width: `${(count / maxCity) * 100}%` as any }]} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Top users */}
        {topUsers.length > 0 && (
          <View style={s.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
              <Ionicons name="trophy" size={15} color="#B45309" />
              <Text style={s.cardTitle}>Top citoyens</Text>
            </View>
            {topUsers.map((u, i) => (
              <View key={i} style={[s.rankRow, i < topUsers.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <View style={[s.rankBadge, i === 0 && s.rankBadgeGold, i === 1 && { backgroundColor: '#F1F5F9' }, i === 2 && { backgroundColor: '#FEF3C7' }]}>
                  <Text style={{ fontSize: 16 }}>{['🥇', '🥈', '🥉'][i] ?? `#${i + 1}`}</Text>
                </View>
                <Text style={s.rankName}>{u.name}</Text>
                <View style={s.rankCountBadge}>
                  <Text style={s.rankCount}>{u.count}</Text>
                  <Text style={s.rankCountLabel}> signalements</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Avg coins info card */}
        {avgCoins > 0 && (
          <View style={[s.card, { borderLeftWidth: 4, borderLeftColor: '#7C3AED' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[s.kpiIcon, { backgroundColor: '#7C3AED15' }]}>
                <Ionicons name="cash-outline" size={20} color="#7C3AED" />
              </View>
              <View>
                <Text style={{ fontSize: 22, fontWeight: '700', color: '#7C3AED' }}>{avgCoins} 🪙</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  Coins moyens par signalement validé · {validated} validés au total
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border, ...shadow.sm,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: radius.xs,
    backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  headerLabel: { fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: {
    width: '47%', backgroundColor: colors.surface, borderRadius: radius.md,
    padding: 14, borderWidth: 1, borderColor: colors.border, ...shadow.xs,
  },
  kpiIcon: { width: 34, height: 34, borderRadius: radius.xs, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  kpiValue: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  kpiLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 2 },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: 16,
    borderWidth: 1, borderColor: colors.border, ...shadow.xs,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 14 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { width: 80, fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  statusTrack: { flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 3 },
  statusFill: { height: '100%', borderRadius: 3 },
  statusCount: { width: 28, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 6 },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barVal: { fontSize: 9, color: colors.textMuted, marginBottom: 2 },
  barTrack: { width: '100%', flex: 1, justifyContent: 'flex-end' },
  bar: { backgroundColor: colors.primary, borderRadius: 3, width: '100%', opacity: 0.8 },
  barDay: { fontSize: 10, color: colors.textMuted, marginTop: 4, fontWeight: '600' },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  rankBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  rankBadgeGold: { backgroundColor: '#FEF3C7', borderColor: '#B45309' },
  rankNum: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  rankName: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  rankCountBadge: { flexDirection: 'row', alignItems: 'baseline' },
  rankCount: { fontSize: 15, fontWeight: '700', color: colors.primary },
  rankCountLabel: { fontSize: 11, color: colors.textMuted },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  cityRankBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  cityRankGold: { backgroundColor: '#FEF3C7', borderColor: '#B45309' },
  cityRankText: { fontSize: 10, fontWeight: '700', color: colors.textMuted },
  cityBody: { flex: 1 },
  cityTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cityName: { fontSize: 13, fontWeight: '600', color: colors.text, flex: 1 },
  cityCount: { fontSize: 12, color: colors.textMuted },
  cityTrack: { height: 5, backgroundColor: colors.border, borderRadius: 3 },
  cityFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3, opacity: 0.7 },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.xs,
    borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primary + '10',
  },
  exportText: { fontSize: 12, fontWeight: '700', color: colors.primary },
});
