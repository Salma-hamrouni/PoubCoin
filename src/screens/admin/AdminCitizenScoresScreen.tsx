import React, { useState, useMemo } from 'react';
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  TextInput, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdmin, AdminUser, AdminReport } from '../../context/AdminContext';
import { useTheme } from '../../context/ThemeContext';
import { radius, shadow } from '../../theme';

// Levels mirror ProfileScreen levels
const LEVELS = [
  { min: 0,  label: 'Débutant',     emoji: '🌱', color: '#94A99A' },
  { min: 5,  label: 'Citoyen',      emoji: '🏙️', color: '#2563EB' },
  { min: 15, label: 'Éco-Actif',    emoji: '♻️',  color: '#16A34A' },
  { min: 30, label: 'Champion',     emoji: '🏆',  color: '#D97706' },
  { min: 50, label: 'Légende Verte',emoji: '🌿',  color: '#7C3AED' },
];

function getLevel(validatedCount: number) {
  let level = LEVELS[0];
  for (const l of LEVELS) {
    if (validatedCount >= l.min) level = l;
  }
  return level;
}

function reputationStars(rep: number): string {
  if (rep >= 90) return '⭐⭐⭐';
  if (rep >= 70) return '⭐⭐';
  return '⭐';
}

function reputationColor(rep: number): string {
  if (rep >= 70) return '#16A34A';
  if (rep >= 40) return '#D97706';
  return '#DC2626';
}

interface CitizenStat {
  user: AdminUser;
  validatedReports: number;
  totalReports: number;
  rejectedReports: number;
  score: number;
  reputation: number;
  level: typeof LEVELS[0];
  stars: string;
  reportsByStatus: { pending: number; validated: number; rejected: number };
}

// ── Podium ───────────────────────────────────────────────────────────────────

const PODIUM_COLORS = [
  { border: '#F59E0B', bg: '#FFFBEB', label: '#B45309' }, // gold
  { border: '#9CA3AF', bg: '#F9FAFB', label: '#6B7280' }, // silver
  { border: '#CD7C3A', bg: '#FFF7ED', label: '#92400E' }, // bronze
];

interface PodiumProps {
  top3: CitizenStat[];
  colors: any;
  onPress: (s: CitizenStat) => void;
}

function PodiumSection({ top3, colors, onPress }: PodiumProps) {
  if (top3.length < 1) return null;
  // Reorder: 2nd, 1st, 3rd for visual podium layout
  const order = [top3[1], top3[0], top3[2]].filter(Boolean);
  const heights = top3[1] ? [70, 90, 56] : [90, 56, 56];
  const ranks   = top3[1] ? [2, 1, 3]    : [1, 2, 3];

  return (
    <View style={{
      backgroundColor: colors.surface,
      marginHorizontal: 16, marginBottom: 12,
      borderRadius: radius.lg, padding: 16,
      borderWidth: 1, borderColor: colors.border,
      ...shadow.sm,
    }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' }}>
        🏆 Podium
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 10 }}>
        {order.map((s, i) => {
          const rank = ranks[i];
          const pc   = PODIUM_COLORS[rank - 1];
          const isFirst = rank === 1;
          return (
            <TouchableOpacity
              key={s.user.id}
              onPress={() => onPress(s)}
              style={{
                flex: 1,
                backgroundColor: pc.bg,
                borderRadius: radius.md,
                borderWidth: 2,
                borderColor: pc.border,
                alignItems: 'center',
                paddingVertical: 12,
                paddingHorizontal: 6,
                minHeight: heights[i],
                justifyContent: 'flex-end',
                ...shadow.xs,
              }}
            >
              <Text style={{ fontSize: isFirst ? 30 : 24 }}>{s.level.emoji}</Text>
              <Text style={{ fontSize: 10, fontWeight: '800', color: pc.label, marginTop: 4 }} numberOfLines={1}>
                {(s.user.name ?? '—').slice(0, 10)}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '800', color: pc.label }}>{s.score}</Text>
              {/* Reputation bar */}
              <View style={{ width: '80%', height: 3, backgroundColor: colors.border, borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${s.reputation}%`, backgroundColor: reputationColor(s.reputation), borderRadius: 2 }} />
              </View>
              <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>#{rank}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Stats chips ──────────────────────────────────────────────────────────────

interface StatsBarProps {
  totalActive: number;
  avgScore: number;
  avgRep: number;
  bestName: string;
  colors: any;
}

function StatsBar({ totalActive, avgScore, avgRep, bestName, colors }: StatsBarProps) {
  const chips = [
    { icon: '👥', label: 'Citoyens actifs', value: totalActive.toString(),       color: '#16A34A' },
    { icon: '⭐', label: 'Score moyen',      value: avgScore.toString(),          color: '#2563EB' },
    { icon: '📊', label: 'Rép. moyenne',     value: `${avgRep}%`,                color: '#D97706' },
    { icon: '🥇', label: 'Meilleur citoyen', value: bestName.split(' ')[0] || '—', color: '#7C3AED' },
  ];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row' }}
    >
      {chips.map(c => (
        <View key={c.label} style={{
          backgroundColor: colors.surface,
          borderRadius: radius.pill,
          paddingHorizontal: 14, paddingVertical: 8,
          flexDirection: 'row', alignItems: 'center', gap: 6,
          borderWidth: 1, borderColor: colors.border,
          ...shadow.xs,
        }}>
          <Text style={{ fontSize: 13 }}>{c.icon}</Text>
          <View>
            <Text style={{ fontSize: 13, fontWeight: '800', color: c.color }}>{c.value}</Text>
            <Text style={{ fontSize: 9, color: colors.textMuted, fontWeight: '600' }}>{c.label}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ── Detail modal ─────────────────────────────────────────────────────────────

interface DetailModalProps {
  stat: CitizenStat | null;
  onClose: () => void;
  colors: any;
}

function DetailModal({ stat, onClose, colors }: DetailModalProps) {
  if (!stat) return null;
  const adminPrimary = colors.adminPrimary ?? '#1E3A5F';
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{
          backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
          padding: 20, maxHeight: '85%',
        }}>
          {/* Handle */}
          <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: stat.level.color + '20', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 26 }}>{stat.level.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{stat.user.name}</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted }}>{stat.user.email}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}
            >
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Score + reputation */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Score',      value: stat.score.toString(),         color: '#7C3AED' },
                { label: 'Réputation', value: `${stat.reputation}%`,        color: reputationColor(stat.reputation) },
                { label: 'Niveau',     value: stat.level.label,             color: stat.level.color },
              ].map(item => (
                <View key={item.label} style={{
                  flex: 1, backgroundColor: colors.background, borderRadius: radius.md,
                  padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border,
                }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: item.color }}>{item.value}</Text>
                  <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '600', marginTop: 2 }}>{item.label}</Text>
                </View>
              ))}
            </View>

            {/* Reports breakdown */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>
              Signalements
            </Text>
            <View style={{ backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 16 }}>
              {[
                { label: 'En attente',  value: stat.reportsByStatus.pending,   color: '#D97706' },
                { label: 'Validés',     value: stat.reportsByStatus.validated, color: '#16A34A' },
                { label: 'Rejetés',     value: stat.reportsByStatus.rejected,  color: '#DC2626' },
                { label: 'Total',       value: stat.totalReports,              color: colors.text },
              ].map((item, i) => (
                <View
                  key={item.label}
                  style={{
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    paddingHorizontal: 14, paddingVertical: 11,
                    borderBottomWidth: i < 3 ? 1 : 0, borderBottomColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: 13, color: colors.text }}>{item.label}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: item.color }}>{item.value}</Text>
                </View>
              ))}
            </View>

            {/* User meta */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>
              Informations
            </Text>
            <View style={{ backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 16 }}>
              {[
                { label: 'Ville',         value: stat.user.city || '—' },
                { label: 'Inscription',   value: stat.user.joinedAt ? new Date(stat.user.joinedAt).toLocaleDateString('fr-FR') : '—' },
                { label: 'Statut',        value: stat.user.blocked ? '🚫 Bloqué' : '✅ Actif' },
              ].map((item, i) => (
                <View
                  key={item.label}
                  style={{
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    paddingHorizontal: 14, paddingVertical: 11,
                    borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: 13, color: colors.textMuted }}>{item.label}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{item.value}</Text>
                </View>
              ))}
            </View>

            {/* Quick action buttons */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase' }}>
              Actions rapides
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
              <TouchableOpacity
                onPress={() => {}}
                style={{
                  flex: 1, backgroundColor: adminPrimary + '12',
                  borderRadius: radius.md, paddingVertical: 12,
                  alignItems: 'center', borderWidth: 1, borderColor: adminPrimary + '30',
                  flexDirection: 'row', justifyContent: 'center', gap: 6,
                }}
              >
                <Ionicons name="flag-outline" size={16} color={adminPrimary} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: adminPrimary }}>Voir signalements</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => {}}
              style={{
                backgroundColor: adminPrimary,
                borderRadius: radius.md, paddingVertical: 12,
                alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
                marginBottom: 8,
              }}
            >
              <Ionicons name="notifications-outline" size={16} color="#fff" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Envoyer notification</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AdminCitizenScoresScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { users, reports } = useAdmin();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CitizenStat | null>(null);

  const stats = useMemo<CitizenStat[]>(() => {
    if (users.length === 0) return [];

    // Aggregate reports per user
    const userReports: Record<string, AdminReport[]> = {};
    reports.forEach(r => {
      if (!r.userId) return;
      if (!userReports[r.userId]) userReports[r.userId] = [];
      userReports[r.userId].push(r);
    });

    const rawStats = users.filter(u => u.role !== 'municipality_admin').map(u => {
      const uReports = userReports[u.id] ?? [];
      const validated  = uReports.filter(r => r.status === 'validated').length;
      const rejected   = uReports.filter(r => r.status === 'rejected').length;
      const pending    = uReports.filter(r => r.status === 'pending').length;
      const score = validated * 50 + (!u.blocked ? 100 : 0);
      return { user: u, validatedReports: validated, totalReports: uReports.length, rejectedReports: rejected, score, reputation: 0, reportsByStatus: { pending, validated, rejected } };
    });

    // Compute relative reputation
    const maxValidated = Math.max(1, ...rawStats.map(s => s.validatedReports));
    return rawStats
      .map(s => ({
        ...s,
        reputation: Math.min(99, Math.round(s.validatedReports / maxValidated * 99)),
        level: getLevel(s.validatedReports),
        stars: reputationStars(Math.min(99, Math.round(s.validatedReports / maxValidated * 99))),
      }))
      .sort((a, b) => b.score - a.score);
  }, [users, reports]);

  const filtered = useMemo(() => {
    if (!search.trim()) return stats;
    const q = search.toLowerCase();
    return stats.filter(s =>
      s.user.name?.toLowerCase().includes(q) ||
      s.user.email?.toLowerCase().includes(q)
    );
  }, [stats, search]);

  const totalActive = stats.filter(s => !s.user.blocked).length;
  const avgScore    = stats.length > 0 ? Math.round(stats.reduce((acc, s) => acc + s.score, 0) / stats.length) : 0;
  const avgRep      = stats.length > 0 ? Math.round(stats.reduce((acc, s) => acc + s.reputation, 0) / stats.length) : 0;
  const best        = stats[0];

  const MEDALS = ['🥇', '🥈', '🥉'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 14,
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderBottomWidth: 1, borderBottomColor: colors.border, ...shadow.sm,
      }}>
        <TouchableOpacity
          style={{ width: 36, height: 36, borderRadius: radius.xs, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border }}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.adminPrimary ?? '#1E3A5F', letterSpacing: 1 }}>ADMIN</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Score Citoyens</Text>
        </View>
        <Text style={{ fontSize: 22 }}>{'🏅'}</Text>
      </View>

      {/* Stats chips horizontal scroll */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }}>
        <StatsBar
          totalActive={totalActive}
          avgScore={avgScore}
          avgRep={avgRep}
          bestName={best?.user.name ?? '—'}
          colors={colors}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.user.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Podium top 3 */}
            {stats.length >= 1 && !search.trim() && (
              <View style={{ paddingTop: 12 }}>
                <PodiumSection top3={stats.slice(0, 3)} colors={colors} onPress={setSelected} />
              </View>
            )}

            {/* Search bar */}
            <View style={{
              backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 10,
              borderBottomWidth: 1, borderBottomColor: colors.border,
            }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                backgroundColor: colors.background, borderRadius: radius.sm,
                paddingHorizontal: 12, paddingVertical: 8,
                borderWidth: 1, borderColor: colors.border,
              }}>
                <Ionicons name="search" size={16} color={colors.textMuted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Rechercher un citoyen..."
                  placeholderTextColor={colors.textMuted}
                  style={{ flex: 1, fontSize: 14, color: colors.text }}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Column headers */}
            <View style={{
              flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8,
              backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
            }}>
              {['Rang', 'Citoyen', 'Score', 'Rép.'].map((col, i) => (
                <Text
                  key={col}
                  style={{
                    fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5,
                    flex: i === 1 ? 2 : 1, textAlign: i === 0 ? 'left' : 'center',
                  }}
                >
                  {col}
                </Text>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 60, gap: 12 }}>
            <Text style={{ fontSize: 52 }}>{'🔍'}</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Aucun résultat</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted }}>Essayez un autre terme de recherche.</Text>
          </View>
        }
        renderItem={({ item: s, index }) => {
          const rank  = stats.indexOf(s); // rank in full sorted list
          const medal = rank < 3 ? MEDALS[rank] : null;
          const rep   = s.reputation;
          return (
            <TouchableOpacity
              onPress={() => setSelected(s)}
              style={{
                flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
                borderBottomWidth: 1, borderBottomColor: colors.border,
                backgroundColor: index % 2 === 0 ? colors.surface : (colors.surfaceAlt ?? '#FAFAFA'),
              }}
            >
              {/* Rang */}
              <View style={{ flex: 1 }}>
                {medal ? (
                  <Text style={{ fontSize: 18 }}>{medal}</Text>
                ) : (
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted }}>#{rank + 1}</Text>
                )}
              </View>

              {/* Citoyen */}
              <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 16 }}>{s.level.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                    {s.user.name ?? '—'}
                  </Text>
                  <Text style={{ fontSize: 9, color: colors.textMuted, fontWeight: '500' }} numberOfLines={1}>
                    {s.user.city || s.user.email?.split('@')[0] || '—'}
                  </Text>
                </View>
              </View>

              {/* Score */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#7C3AED' }}>
                  {s.score}
                </Text>
                <Text style={{ fontSize: 8, color: s.level.color, fontWeight: '700' }} numberOfLines={1}>
                  {s.level.label.split(' ')[0].toUpperCase()}
                </Text>
              </View>

              {/* Réputation bar */}
              <View style={{ flex: 1, alignItems: 'center', gap: 3 }}>
                <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${rep}%`, backgroundColor: reputationColor(rep), borderRadius: 2 }} />
                </View>
                <Text style={{ fontSize: 8, color: reputationColor(rep), fontWeight: '700' }}>{rep}%</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <DetailModal stat={selected} onClose={() => setSelected(null)} colors={colors} />
    </SafeAreaView>
  );
}
