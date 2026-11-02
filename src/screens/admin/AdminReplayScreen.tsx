import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAdmin } from '../../context/AdminContext';
import { useTheme } from '../../context/ThemeContext';
import { radius, shadow } from '../../theme';

// ── helpers ─────────────────────────────────────────────────────────────────

function getLastNMonths(n: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  const names = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
                  'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  return `${names[parseInt(m, 10) - 1]} ${y}`;
}

function monthShort(ym: string): string {
  const [, m] = ym.split('-');
  const names = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
                  'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  return names[parseInt(m, 10) - 1];
}

interface MonthStat {
  ym: string;
  total: number;
  validated: number;
}

type HealthTier = 'abandoned' | 'improving' | 'clean' | 'eco';

function getHealth(total: number): HealthTier {
  if (total <= 10) return 'abandoned';
  if (total <= 30) return 'improving';
  if (total <= 60) return 'clean';
  return 'eco';
}

const HEALTH_CONFIG: Record<HealthTier, { emoji: string; label: string; color: string; bg: string }> = {
  abandoned: { emoji: '🏚️', label: 'Ville abandonnée',  color: '#DC2626', bg: '#FEF2F2' },
  improving: { emoji: '🏘️', label: 'En amélioration',   color: '#EA580C', bg: '#FFF7ED' },
  clean:     { emoji: '🌆', label: 'Ville propre',       color: '#CA8A04', bg: '#FEFCE8' },
  eco:       { emoji: '🏙️', label: 'Éco-Métropole',      color: '#16A34A', bg: '#F0FDF4' },
};

const HEALTH_RANK: Record<HealthTier, number> = {
  abandoned: 0,
  improving: 1,
  clean: 2,
  eco: 3,
};

// ── component ────────────────────────────────────────────────────────────────

export default function AdminReplayScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { reports } = useAdmin();

  const months = getLastNMonths(6);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animated value for the emoji scale spring
  const emojiScale = useRef(new Animated.Value(1)).current;
  // Animated value for the bar width (0–1)
  const barAnim = useRef(new Animated.Value(0)).current;
  // Animated value for auto-play progress bar (0–1)
  const playProgress = useRef(new Animated.Value(0)).current;
  const playProgressAnim = useRef<Animated.CompositeAnimation | null>(null);

  // ── compute monthly stats ────────────────────────────────────────────────
  const stats: MonthStat[] = months.map(ym => {
    const filtered = reports.filter(r => {
      const raw: any = (r as any).createdAt;
      const dateStr: string =
        raw?.toDate ? raw.toDate().toISOString() : (typeof raw === 'string' ? raw : r.date ?? '');
      return dateStr.startsWith(ym);
    });
    return {
      ym,
      total: filtered.length,
      validated: filtered.filter(r => r.status === 'validated').length,
    };
  });

  const maxTotal = Math.max(1, ...stats.map(s => s.total));

  // ── key moments (computed from all months) ───────────────────────────────
  const bestMonthIdx  = stats.reduce((best, s, i) => s.total > stats[best].total ? i : best, 0);
  const worstMonthIdx = stats.reduce((worst, s, i) => s.total < stats[worst].total ? i : worst, 0);
  const totalPeriod   = stats.reduce((sum, s) => sum + s.total, 0);

  // ── animations on index change ───────────────────────────────────────────
  const animateIn = useCallback((idx: number) => {
    barAnim.setValue(0);
    emojiScale.setValue(0.5);
    const fraction = stats[idx].total / maxTotal;
    Animated.parallel([
      Animated.spring(emojiScale, { toValue: 1, useNativeDriver: true, damping: 10, stiffness: 180 }),
      Animated.timing(barAnim, { toValue: fraction, duration: 600, useNativeDriver: false }),
    ]).start();
  }, [stats, maxTotal, barAnim, emojiScale]);

  useEffect(() => { animateIn(currentIdx); }, [currentIdx]);

  // ── auto-play progress bar ───────────────────────────────────────────────
  const startProgressAnim = useCallback(() => {
    playProgress.setValue(0);
    if (playProgressAnim.current) playProgressAnim.current.stop();
    playProgressAnim.current = Animated.timing(playProgress, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: false,
    });
    playProgressAnim.current.start();
  }, [playProgress]);

  // ── auto-play ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (playing) {
      startProgressAnim();
      intervalRef.current = setInterval(() => {
        startProgressAnim();
        setCurrentIdx(prev => {
          const next = (prev + 1) % months.length;
          return next;
        });
      }, 1500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (playProgressAnim.current) playProgressAnim.current.stop();
      playProgress.setValue(0);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, months.length]);

  const current = stats[currentIdx];
  const prev    = currentIdx > 0 ? stats[currentIdx - 1] : null;
  const first   = stats[0];
  const health  = getHealth(current.total);
  const hcfg    = HEALTH_CONFIG[health];

  const firstHealth = getHealth(first.total);
  const firstHcfg   = HEALTH_CONFIG[firstHealth];

  const trendPct = prev && prev.total > 0
    ? Math.round(((current.total - prev.total) / prev.total) * 100)
    : null;

  const vsFirst = first.total > 0
    ? Math.round(((current.total - first.total) / first.total) * 100)
    : null;

  // Trend arrow between first and current health
  const healthRankCurrent = HEALTH_RANK[health];
  const healthRankFirst   = HEALTH_RANK[firstHealth];
  const trendArrow = currentIdx === 0 ? '→' : healthRankCurrent > healthRankFirst ? '↗' : healthRankCurrent < healthRankFirst ? '↘' : '→';
  const trendArrowColor = trendArrow === '↗' ? '#16A34A' : trendArrow === '↘' ? '#DC2626' : '#D97706';

  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const progressWidth = playProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header with gradient */}
      <LinearGradient
        colors={['#1E3A5F', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <TouchableOpacity
          style={{
            width: 36, height: 36, borderRadius: radius.xs,
            backgroundColor: 'rgba(255,255,255,0.15)',
            justifyContent: 'center', alignItems: 'center',
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
          }}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.75)', letterSpacing: 1 }}>
            ÉVOLUTION
          </Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>
            Replay de la Ville
          </Text>
        </View>
        {playing && (
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: radius.pill,
            paddingHorizontal: 10, paddingVertical: 5,
            flexDirection: 'row', alignItems: 'center', gap: 4,
          }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>
              ▶ En lecture...
            </Text>
          </View>
        )}
      </LinearGradient>

      {/* Auto-play progress bar */}
      {playing && (
        <View style={{ height: 3, backgroundColor: colors.border, overflow: 'hidden' }}>
          <Animated.View style={{
            height: '100%',
            width: progressWidth,
            backgroundColor: '#2563EB',
          }} />
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Month navigator */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 16,
          ...shadow.xs,
        }}>
          <TouchableOpacity
            onPress={() => setCurrentIdx(i => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
            style={{
              width: 36, height: 36, borderRadius: radius.xs,
              backgroundColor: currentIdx === 0 ? colors.borderLight : colors.adminLight,
              justifyContent: 'center', alignItems: 'center',
            }}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={currentIdx === 0 ? colors.textMuted : colors.adminPrimary}
            />
          </TouchableOpacity>

          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>
              {monthLabel(current.ym)}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>
              {currentIdx + 1} / {months.length}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setCurrentIdx(i => Math.min(months.length - 1, i + 1))}
            disabled={currentIdx === months.length - 1}
            style={{
              width: 36, height: 36, borderRadius: radius.xs,
              backgroundColor: currentIdx === months.length - 1 ? colors.borderLight : colors.adminLight,
              justifyContent: 'center', alignItems: 'center',
            }}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={currentIdx === months.length - 1 ? colors.textMuted : colors.adminPrimary}
            />
          </TouchableOpacity>
        </View>

        {/* Big animated city emoji + before/after comparison */}
        <View style={{
          backgroundColor: hcfg.bg,
          borderRadius: radius.lg,
          padding: 24,
          alignItems: 'center',
          marginBottom: 16,
          borderWidth: 1,
          borderColor: hcfg.color + '30',
          ...shadow.sm,
        }}>
          {/* Before/after comparison */}
          {currentIdx > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 28 }}>{firstHcfg.emoji}</Text>
                <Text style={{ fontSize: 9, color: firstHcfg.color, fontWeight: '700' }}>Début</Text>
              </View>
              <Text style={{ fontSize: 22, fontWeight: '800', color: trendArrowColor }}>{trendArrow}</Text>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 28 }}>{hcfg.emoji}</Text>
                <Text style={{ fontSize: 9, color: hcfg.color, fontWeight: '700' }}>Actuel</Text>
              </View>
            </View>
          )}

          <Animated.Text style={{ fontSize: 80, transform: [{ scale: emojiScale }] }}>
            {hcfg.emoji}
          </Animated.Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: hcfg.color, marginTop: 8 }}>
            {hcfg.label}
          </Text>

          {/* Volume bar */}
          <View style={{
            width: '100%', height: 10,
            backgroundColor: colors.border,
            borderRadius: radius.pill,
            marginTop: 16, overflow: 'hidden',
          }}>
            <Animated.View style={{
              height: '100%',
              width: barWidth,
              backgroundColor: hcfg.color,
              borderRadius: radius.pill,
            }} />
          </View>
          <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 6, alignSelf: 'flex-end' }}>
            {current.total} signalements
          </Text>
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Total',    value: current.total,     color: colors.adminPrimary },
            { label: 'Validés',  value: current.validated, color: '#16A34A' },
            { label: 'Taux',
              value: current.total > 0 ? `${Math.round(current.validated / current.total * 100)}%` : '—',
              color: colors.gold },
          ].map(item => (
            <View key={item.label} style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: 12,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.border,
              ...shadow.xs,
            }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: item.color }}>
                {item.value}
              </Text>
              <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '600', textAlign: 'center' }}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Month timeline mini bars */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: 14,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: colors.border,
          ...shadow.xs,
        }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 12 }}>
            Historique 6 mois
          </Text>
          {stats.map((s, idx) => {
            const tier = getHealth(s.total);
            const tcfg = HEALTH_CONFIG[tier];
            const pct  = maxTotal > 0 ? (s.total / maxTotal) * 100 : 0;
            const isActive = idx === currentIdx;
            return (
              <TouchableOpacity
                key={s.ym}
                onPress={() => setCurrentIdx(idx)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 8,
                  gap: 8,
                }}
              >
                <Text style={{
                  fontSize: 10,
                  fontWeight: isActive ? '800' : '500',
                  color: isActive ? colors.adminPrimary : colors.textMuted,
                  width: 38,
                }}>
                  {monthLabel(s.ym).slice(0, 3)}
                </Text>
                <View style={{
                  flex: 1, height: 8,
                  backgroundColor: colors.borderLight,
                  borderRadius: radius.pill,
                  overflow: 'hidden',
                }}>
                  <View style={{
                    width: `${pct}%`,
                    height: '100%',
                    backgroundColor: isActive ? tcfg.color : tcfg.color + '80',
                    borderRadius: radius.pill,
                  }} />
                </View>
                <Text style={{
                  fontSize: 10,
                  color: isActive ? colors.text : colors.textMuted,
                  fontWeight: isActive ? '700' : '400',
                  width: 24,
                  textAlign: 'right',
                }}>
                  {s.total}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Visual bar chart */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: 14,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: colors.border,
          ...shadow.xs,
        }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 14 }}>
            Vue graphique
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 80 }}>
            {stats.map((s, idx) => {
              const isActive = idx === currentIdx;
              const barH = maxTotal > 0 ? Math.max(4, Math.round((s.total / maxTotal) * 72)) : 4;
              return (
                <TouchableOpacity
                  key={s.ym}
                  onPress={() => setCurrentIdx(idx)}
                  style={{ alignItems: 'center', flex: 1, gap: 4 }}
                >
                  <Text style={{
                    fontSize: 9, fontWeight: '700',
                    color: isActive ? colors.adminPrimary : colors.textMuted,
                    marginBottom: 2,
                  }}>
                    {s.total}
                  </Text>
                  <View style={{
                    width: isActive ? 20 : 14,
                    height: barH,
                    backgroundColor: isActive ? (colors.adminPrimary ?? '#1E3A5F') : '#CBD5E1',
                    borderRadius: 3,
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                  }} />
                  <Text style={{
                    fontSize: 8,
                    fontWeight: isActive ? '800' : '400',
                    color: isActive ? colors.adminPrimary : colors.textMuted,
                  }}>
                    {monthShort(s.ym)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Moments clés */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: 14,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 10,
          ...shadow.xs,
        }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>
            Moments clés
          </Text>
          {[
            {
              icon: '📈',
              text: `Meilleur mois : ${monthLabel(stats[bestMonthIdx].ym)} (${stats[bestMonthIdx].total} signalements)`,
              color: '#16A34A',
            },
            {
              icon: '📉',
              text: `Mois le plus faible : ${monthLabel(stats[worstMonthIdx].ym)} (${stats[worstMonthIdx].total} signalements)`,
              color: '#DC2626',
            },
            {
              icon: '📊',
              text: `Total période : ${totalPeriod} signalements`,
              color: colors.adminPrimary,
            },
          ].map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 16 }}>{item.icon}</Text>
              <Text style={{ fontSize: 13, color: item.color, fontWeight: '600', flex: 1 }}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Trend comparisons */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: 14,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 10,
          ...shadow.xs,
        }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>
            Comparaisons
          </Text>

          {/* vs previous month */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: colors.text }}>vs mois précédent</Text>
            {trendPct !== null ? (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                backgroundColor: trendPct >= 0 ? '#F0FDF4' : '#FEF2F2',
                borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4,
              }}>
                <Ionicons
                  name={trendPct >= 0 ? 'trending-up' : 'trending-down'}
                  size={14}
                  color={trendPct >= 0 ? '#16A34A' : '#DC2626'}
                />
                <Text style={{
                  fontSize: 13, fontWeight: '700',
                  color: trendPct >= 0 ? '#16A34A' : '#DC2626',
                }}>
                  {trendPct >= 0 ? '+' : ''}{trendPct}%
                </Text>
              </View>
            ) : (
              <Text style={{ fontSize: 12, color: colors.textMuted }}>Pas de données</Text>
            )}
          </View>

          {/* vs start of year */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: colors.text }}>Ce mois vs début d'année</Text>
            {vsFirst !== null && currentIdx > 0 ? (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                backgroundColor: vsFirst >= 0 ? '#F0FDF4' : '#FEF2F2',
                borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4,
              }}>
                <Ionicons
                  name={vsFirst >= 0 ? 'trending-up' : 'trending-down'}
                  size={14}
                  color={vsFirst >= 0 ? '#16A34A' : '#DC2626'}
                />
                <Text style={{
                  fontSize: 13, fontWeight: '700',
                  color: vsFirst >= 0 ? '#16A34A' : '#DC2626',
                }}>
                  {vsFirst >= 0 ? '+' : ''}{vsFirst}%
                </Text>
              </View>
            ) : (
              <Text style={{ fontSize: 12, color: colors.textMuted }}>Mois de référence</Text>
            )}
          </View>
        </View>

        {/* Auto-play control */}
        <TouchableOpacity
          onPress={() => setPlaying(p => !p)}
          style={{
            backgroundColor: playing ? '#FEF2F2' : colors.adminLight,
            borderRadius: radius.md,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderWidth: 1,
            borderColor: playing ? '#DC262640' : colors.adminPrimary + '30',
            ...shadow.xs,
          }}
        >
          <Ionicons
            name={playing ? 'pause-circle' : 'play-circle'}
            size={22}
            color={playing ? '#DC2626' : colors.adminPrimary}
          />
          <Text style={{
            fontSize: 14, fontWeight: '700',
            color: playing ? '#DC2626' : colors.adminPrimary,
          }}>
            {playing ? 'Pause' : 'Lecture automatique'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
