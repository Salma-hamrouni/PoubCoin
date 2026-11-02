import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, SafeAreaView,
  TouchableOpacity, Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAdmin, AdminReport } from '../../context/AdminContext';
import { colors, radius, shadow } from '../../theme';

type StatusFilter = 'all' | 'pending' | 'validated' | 'rejected';
type TimeFilter   = 'today' | 'week' | 'month' | 'year' | 'all';

const STATUS = {
  pending:   { label: 'En attente', color: '#B45309', bg: '#FEF3C7', icon: 'time-outline'             },
  validated: { label: 'Validé',     color: '#15803D', bg: '#DCFCE7', icon: 'checkmark-circle-outline' },
  rejected:  { label: 'Rejeté',     color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle-outline'     },
} as const;

const TIME_FILTERS: { key: TimeFilter; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'week',  label: 'Cette semaine' },
  { key: 'month', label: 'Ce mois' },
  { key: 'year',  label: 'Cette année' },
  { key: 'all',   label: 'Tout' },
];

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all',       label: 'Tous'       },
  { key: 'pending',   label: 'En attente' },
  { key: 'validated', label: 'Validés'    },
  { key: 'rejected',  label: 'Rejetés'    },
];

function getTimeCutoff(tf: TimeFilter): number {
  const now = Date.now();
  if (tf === 'today') return new Date().setHours(0, 0, 0, 0);
  if (tf === 'week')  return now - 7  * 24 * 3600 * 1000;
  if (tf === 'month') return now - 30 * 24 * 3600 * 1000;
  if (tf === 'year')  return now - 365 * 24 * 3600 * 1000;
  return 0;
}

function extractZone(address: string): string {
  if (!address) return 'Zone inconnue';
  const parts = address.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[parts.length - 2];
  return parts[0] || 'Zone inconnue';
}

function getRiskColor(count: number, max: number): string {
  const ratio = max > 0 ? count / max : 0;
  if (ratio >= 0.8) return '#DC2626';
  if (ratio >= 0.6) return '#EA580C';
  if (ratio >= 0.4) return '#CA8A04';
  if (ratio >= 0.2) return '#16A34A';
  return '#6B7280';
}

function getRiskLabel(count: number, max: number): string {
  const ratio = max > 0 ? count / max : 0;
  if (ratio >= 0.8) return 'Critique';
  if (ratio >= 0.6) return 'Élevé';
  if (ratio >= 0.4) return 'Modéré';
  if (ratio >= 0.2) return 'Faible';
  return 'Minimal';
}

interface ZoneStats {
  zone: string;
  reports: AdminReport[];
  total: number;
  pending: number;
  validated: number;
  rejected: number;
  uniqueUsers: number;
  coinsDistributed: number;
  avgProcessDays: number | null;
}

export default function AdminMapScreen({ navigation }: any) {
  const { reports } = useAdmin();
  const [timeFilter,   setTimeFilter]   = useState<TimeFilter>('month');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedZone, setSelectedZone] = useState<ZoneStats | null>(null);
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);
  const [processing, setProcessing] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // ── Filter by time ───────────────────────────────────────────────────────────
  const cutoff = getTimeCutoff(timeFilter);
  const timeFiltered = useMemo(() => reports.filter(r => {
    if (timeFilter === 'all') return true;
    const ts = new Date(r.date).getTime();
    return ts >= cutoff;
  }), [reports, timeFilter, cutoff]);

  // ── Filter by status ─────────────────────────────────────────────────────────
  const filtered = useMemo(() =>
    statusFilter === 'all' ? timeFiltered : timeFiltered.filter(r => r.status === statusFilter),
  [timeFiltered, statusFilter]);

  // ── Group by zone ─────────────────────────────────────────────────────────────
  const zones: ZoneStats[] = useMemo(() => {
    const map: Record<string, AdminReport[]> = {};
    filtered.forEach(r => {
      const z = extractZone(r.address || '');
      if (!map[z]) map[z] = [];
      map[z].push(r);
    });
    return Object.entries(map).map(([zone, zr]) => {
      const validated = zr.filter(r => r.status === 'validated');
      // Avg processing time: diff between date and today (approximation)
      const processTimes = validated.map(r => {
        const d = new Date(r.date);
        return (Date.now() - d.getTime()) / (1000 * 3600 * 24);
      });
      const avgProcessDays = processTimes.length > 0
        ? Math.round(processTimes.reduce((a, b) => a + b, 0) / processTimes.length)
        : null;
      return {
        zone,
        reports: zr,
        total: zr.length,
        pending: zr.filter(r => r.status === 'pending').length,
        validated: validated.length,
        rejected: zr.filter(r => r.status === 'rejected').length,
        uniqueUsers: new Set(zr.map(r => r.userId ?? r.userName)).size,
        coinsDistributed: validated.reduce((s: number, r: any) => s + (r.coins ?? 50), 0),
        avgProcessDays,
      };
    }).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const maxCount = zones[0]?.total ?? 1;

  // ── Global stats ─────────────────────────────────────────────────────────────
  const globalStats = useMemo(() => ({
    total:     timeFiltered.length,
    pending:   timeFiltered.filter(r => r.status === 'pending').length,
    validated: timeFiltered.filter(r => r.status === 'validated').length,
    zones:     new Set(timeFiltered.map(r => extractZone(r.address || ''))).size,
    coins:     timeFiltered.filter(r => r.status === 'validated').reduce((s, r) => s + ((r as any).coins ?? 50), 0),
  }), [timeFiltered]);

  const handleAction = async (reportId: string, status: 'validated' | 'rejected') => {
    setProcessing(true);
    try {
      await updateDoc(doc(db, 'reports', reportId), { status });
      setSelectedReport(null);
    } catch {
      setMapError('Impossible de mettre à jour le signalement.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <SafeAreaView style={s.root}>
      {mapError && (
        <View style={s.errorBanner}>
          <Text style={s.errorBannerText}>{mapError}</Text>
          <TouchableOpacity onPress={() => setMapError(null)}>
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerLabel}>DASHBOARD GÉOSPATIAL</Text>
          <Text style={s.headerTitle}>Analyse par zone</Text>
        </View>
        <View style={s.headerCount}>
          <Text style={s.headerCountText}>{zones.length} zones</Text>
        </View>
      </View>

      {/* Global KPIs */}
      <View style={s.kpiRow}>
        {[
          { val: globalStats.total,     label: 'Signaux',   color: colors.primary },
          { val: globalStats.pending,   label: 'En attente',color: '#B45309' },
          { val: globalStats.validated, label: 'Validés',   color: '#15803D' },
          { val: globalStats.zones,     label: 'Zones',     color: '#7C3AED' },
          { val: globalStats.coins,     label: '🪙 Coins',  color: '#CA8A04' },
        ].map((k, i) => (
          <View key={i} style={s.kpi}>
            <Text style={[s.kpiVal, { color: k.color }]}>{k.val}</Text>
            <Text style={s.kpiLabel}>{k.label}</Text>
          </View>
        ))}
      </View>

      {/* Time filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterContent}>
        {TIME_FILTERS.map(f => (
          <TouchableOpacity key={f.key} style={[s.chip, timeFilter === f.key && s.chipActive]} onPress={() => setTimeFilter(f.key)}>
            <Text style={[s.chipText, timeFilter === f.key && s.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
        <View style={s.filterSep} />
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity key={f.key} style={[s.chip, statusFilter === f.key && s.chipActive2]} onPress={() => setStatusFilter(f.key)}>
            <Text style={[s.chipText, statusFilter === f.key && s.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Heatmap legend */}
      <View style={s.legendRow}>
        <Text style={s.legendTitle}>Intensité :</Text>
        {[
          { label: 'Minimal', color: '#6B7280' },
          { label: 'Faible',  color: '#16A34A' },
          { label: 'Modéré',  color: '#CA8A04' },
          { label: 'Élevé',   color: '#EA580C' },
          { label: 'Critique',color: '#DC2626' },
        ].map(item => (
          <View key={item.label} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: item.color }]} />
            <Text style={s.legendLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Zones list */}
      <FlatList
        data={zones}
        keyExtractor={z => z.zone}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="map-outline" size={52} color={colors.border} />
            <Text style={s.emptyTitle}>Aucun signalement</Text>
            <Text style={s.emptyText}>sur cette période</Text>
          </View>
        }
        renderItem={({ item: z }) => {
          const riskColor = getRiskColor(z.total, maxCount);
          const riskLabel = getRiskLabel(z.total, maxCount);
          const barWidth  = maxCount > 0 ? (z.total / maxCount) * 100 : 0;
          return (
            <TouchableOpacity style={s.zoneCard} onPress={() => setSelectedZone(z)} activeOpacity={0.8}>
              {/* Color accent bar */}
              <View style={[s.accentBar, { backgroundColor: riskColor }]} />

              <View style={s.zoneBody}>
                {/* Top row */}
                <View style={s.zoneTop}>
                  <View style={[s.zonePin, { backgroundColor: riskColor + '18' }]}>
                    <Ionicons name="location" size={16} color={riskColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.zoneName} numberOfLines={1}>{z.zone}</Text>
                    <Text style={s.zoneSubtitle}>{z.uniqueUsers} citoyen{z.uniqueUsers !== 1 ? 's' : ''} actif{z.uniqueUsers !== 1 ? 's' : ''}</Text>
                  </View>
                  <View>
                    <View style={[s.riskBadge, { backgroundColor: riskColor + '18' }]}>
                      <Text style={[s.riskText, { color: riskColor }]}>{riskLabel}</Text>
                    </View>
                    <Text style={[s.totalCount, { color: riskColor }]}>{z.total} signaux</Text>
                  </View>
                </View>

                {/* Heatmap bar */}
                <View style={s.heatBar}>
                  <View style={[s.heatFill, { width: `${barWidth}%` as any, backgroundColor: riskColor }]} />
                </View>

                {/* Bottom stats */}
                <View style={s.zoneMini}>
                  <View style={s.miniStat}>
                    <View style={[s.miniDot, { backgroundColor: '#B45309' }]} />
                    <Text style={s.miniVal}>{z.pending}</Text>
                    <Text style={s.miniLabel}>attente</Text>
                  </View>
                  <View style={s.miniStat}>
                    <View style={[s.miniDot, { backgroundColor: '#15803D' }]} />
                    <Text style={s.miniVal}>{z.validated}</Text>
                    <Text style={s.miniLabel}>validés</Text>
                  </View>
                  <View style={s.miniStat}>
                    <View style={[s.miniDot, { backgroundColor: '#DC2626' }]} />
                    <Text style={s.miniVal}>{z.rejected}</Text>
                    <Text style={s.miniLabel}>rejetés</Text>
                  </View>
                  <View style={s.miniStat}>
                    <Text style={[s.miniVal, { color: '#CA8A04' }]}>+{z.coinsDistributed}</Text>
                    <Text style={s.miniLabel}>🪙 coins</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 'auto' as any }} />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* ── Zone detail bottom sheet ─────────────────────────────────────── */}
      <Modal visible={!!selectedZone} transparent animationType="slide" onRequestClose={() => setSelectedZone(null)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setSelectedZone(null)}>
          <View style={s.bottomSheet}>
            <View style={s.sheetHandle} />
            {selectedZone && (() => {
              const riskColor = getRiskColor(selectedZone.total, maxCount);
              return (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Zone title */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <View style={[s.zonePin, { backgroundColor: riskColor + '18' }]}>
                      <Ionicons name="location" size={18} color={riskColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{selectedZone.zone}</Text>
                      <View style={[s.riskBadge, { backgroundColor: riskColor + '18', alignSelf: 'flex-start', marginTop: 3 }]}>
                        <Text style={[s.riskText, { color: riskColor }]}>{getRiskLabel(selectedZone.total, maxCount)}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Stats grid */}
                  <View style={s.detailGrid}>
                    {[
                      { icon: '📊', label: 'Signalements', value: selectedZone.total, color: colors.primary },
                      { icon: '👥', label: 'Citoyens actifs', value: selectedZone.uniqueUsers, color: '#7C3AED' },
                      { icon: '⏱️', label: 'Temps moyen', value: selectedZone.avgProcessDays !== null ? `${selectedZone.avgProcessDays}j` : 'N/A', color: '#0284C7' },
                      { icon: '🪙', label: 'Coins distribués', value: selectedZone.coinsDistributed, color: '#CA8A04' },
                      { icon: '✅', label: 'Validés', value: selectedZone.validated, color: '#15803D' },
                      { icon: '🕐', label: 'En attente', value: selectedZone.pending, color: '#B45309' },
                    ].map(item => (
                      <View key={item.label} style={s.detailCell}>
                        <Text style={{ fontSize: 22 }}>{item.icon}</Text>
                        <Text style={[s.detailVal, { color: item.color }]}>{item.value}</Text>
                        <Text style={s.detailLabel}>{item.label}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Progress bars */}
                  <View style={{ marginTop: 4, marginBottom: 16, gap: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 4 }}>Répartition des statuts</Text>
                    {[
                      { label: 'Validés',     val: selectedZone.validated, color: '#15803D' },
                      { label: 'En attente',  val: selectedZone.pending,   color: '#B45309' },
                      { label: 'Rejetés',     val: selectedZone.rejected,  color: '#DC2626' },
                    ].map(item => (
                      <View key={item.label} style={{ gap: 3 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 11, color: colors.textMuted }}>{item.label}</Text>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: item.color }}>{selectedZone.total > 0 ? Math.round(item.val / selectedZone.total * 100) : 0}%</Text>
                        </View>
                        <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' }}>
                          <View style={{ height: '100%', width: selectedZone.total > 0 ? `${(item.val / selectedZone.total) * 100}%` as any : '0%', backgroundColor: item.color, borderRadius: 3 }} />
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Recent reports */}
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 }}>Derniers signalements</Text>
                  {selectedZone.reports.slice(0, 4).map(r => {
                    const cfg = STATUS[r.status];
                    return (
                      <TouchableOpacity
                        key={r.id}
                        style={s.reportRow}
                        onPress={() => { setSelectedZone(null); setTimeout(() => setSelectedReport(r), 300); }}
                      >
                        <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{r.userName}</Text>
                          <Text style={{ fontSize: 11, color: colors.textMuted }} numberOfLines={1}>{r.address?.split(',')[0]}</Text>
                        </View>
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>{r.date}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              );
            })()}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Report action bottom sheet ───────────────────────────────────── */}
      <Modal visible={!!selectedReport} transparent animationType="slide" onRequestClose={() => setSelectedReport(null)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setSelectedReport(null)}>
          <View style={s.bottomSheet}>
            <View style={s.sheetHandle} />
            {selectedReport && (() => {
              const cfg = STATUS[selectedReport.status];
              return (
                <>
                  <View style={s.sheetTop}>
                    <View style={[s.sheetStatusBadge, { backgroundColor: cfg.bg }]}>
                      <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
                      <Text style={[s.sheetStatusText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    <Text style={s.sheetUser}>{selectedReport.userName}</Text>
                    <View style={s.sheetAddrRow}>
                      <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                      <Text style={s.sheetAddr}>{selectedReport.address}</Text>
                    </View>
                    <Text style={s.sheetDate}>{selectedReport.date}</Text>
                  </View>
                  {selectedReport.status === 'pending' && (
                    <View style={s.sheetActions}>
                      <TouchableOpacity style={s.sheetRejectBtn} disabled={processing} onPress={() => handleAction(selectedReport.id, 'rejected')}>
                        <Ionicons name="close" size={16} color="#DC2626" />
                        <Text style={s.sheetRejectText}>Rejeter</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.sheetValidateBtn} disabled={processing} onPress={() => handleAction(selectedReport.id, 'validated')}>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                        <Text style={s.sheetValidateText}>Valider</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              );
            })()}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  errorBanner: {
    backgroundColor: '#DC2626', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12,
  },
  errorBannerText: { color: '#fff', fontSize: 14, flex: 1, marginRight: 8 },

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
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  headerCount: { backgroundColor: colors.primaryGhost, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  headerCountText: { fontSize: 13, fontWeight: '700', color: colors.primary },

  kpiRow: {
    flexDirection: 'row', backgroundColor: colors.surface,
    paddingVertical: 10, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  kpi: { flex: 1, alignItems: 'center' },
  kpiVal: { fontSize: 18, fontWeight: '800' },
  kpiLabel: { fontSize: 9, color: colors.textMuted, fontWeight: '600', marginTop: 1 },

  filterScroll: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 6, flexDirection: 'row', alignItems: 'center' },
  filterSep: { width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 16, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
  },
  chipActive:  { backgroundColor: colors.primary, borderColor: colors.primary },
  chipActive2: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  chipText: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  legendRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8,
  },
  legendTitle: { fontSize: 10, fontWeight: '700', color: colors.textMuted },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 9, color: colors.textMuted },

  zoneCard: {
    backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border, ...shadow.xs, flexDirection: 'row',
  },
  accentBar: { width: 4 },
  zoneBody: { flex: 1, padding: 12 },
  zoneTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  zonePin: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  zoneName: { fontSize: 14, fontWeight: '700', color: colors.text },
  zoneSubtitle: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  riskBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  riskText: { fontSize: 10, fontWeight: '800' },
  totalCount: { fontSize: 11, fontWeight: '700', textAlign: 'right', marginTop: 2 },

  heatBar: { height: 5, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
  heatFill: { height: '100%', borderRadius: 3 },

  zoneMini: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  miniStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  miniDot: { width: 6, height: 6, borderRadius: 3 },
  miniVal: { fontSize: 12, fontWeight: '700', color: colors.text },
  miniLabel: { fontSize: 10, color: colors.textMuted },

  empty: { alignItems: 'center', paddingTop: 64, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
  emptyText: { fontSize: 13, color: colors.textMuted },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  bottomSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '80%',
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20 },

  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  detailCell: {
    width: '30%', flex: 1, minWidth: '28%',
    backgroundColor: colors.background, borderRadius: radius.sm, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  detailVal: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  detailLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600', textAlign: 'center', marginTop: 2 },

  reportRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  sheetTop: { gap: 6, marginBottom: 20 },
  sheetStatusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
  },
  sheetStatusText: { fontSize: 12, fontWeight: '600' },
  sheetUser: { fontSize: 17, fontWeight: '700', color: colors.text },
  sheetAddrRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sheetAddr: { fontSize: 13, color: colors.textMuted, flex: 1 },
  sheetDate: { fontSize: 12, color: colors.textMuted },
  sheetActions: { flexDirection: 'row', gap: 10 },
  sheetRejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    borderWidth: 1.5, borderColor: '#DC2626', borderRadius: radius.sm,
    paddingVertical: 12, backgroundColor: '#FEE2E2',
  },
  sheetRejectText: { color: '#DC2626', fontWeight: '700' },
  sheetValidateBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 12,
  },
  sheetValidateText: { color: '#fff', fontWeight: '700' },
});
