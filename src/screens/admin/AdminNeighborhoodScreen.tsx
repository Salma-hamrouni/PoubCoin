import React, { useMemo } from 'react';
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdmin } from '../../context/AdminContext';
import { useTheme } from '../../context/ThemeContext';
import { radius, shadow } from '../../theme';

interface ZoneStat {
  name: string;
  score: number;
  medal: string;
  medalLabel: string;
  totalCount: number;
  validatedCount: number;
  activeCitizens: number;
  trend: number;
  avgTime: string;
  recyclables: number;
  scoreColor: string;
}

function extractZone(address: string): string {
  if (!address) return 'Inconnu';
  const parts = address.split(',').map(s => s.trim()).filter(Boolean);
  // Prefer the last 2-3 parts (city area), skip the first (street number/name)
  if (parts.length >= 3) return parts[parts.length - 2]; // e.g. "La Marsa" from "12 Rue X, La Marsa, Tunisie"
  if (parts.length === 2) return parts[1]; // e.g. "Ariana" from "Rue X, Ariana"
  // Fallback: find a known city name
  const cities = ['Tunis', 'Ariana', 'La Marsa', 'Sfax', 'Sousse', 'Carthage', 'Manouba', 'Ben Arous', 'Bizerte', 'Nabeul', 'Monastir', 'El Menzah', 'El Mourouj', 'Menzah', 'Mourouj', 'Ennasr', 'Mutuelleville', 'Belvédère', 'Montplaisir', 'Lac'];
  for (const city of cities) {
    if (address.includes(city)) return city;
  }
  return parts[0].slice(0, 20) || 'Inconnu';
}

function scoreColor(score: number): string {
  if (score >= 90) return '#16A34A';
  if (score >= 75) return '#2563EB';
  if (score >= 60) return '#CA8A04';
  return '#DC2626';
}

function getMedal(score: number): { medal: string; label: string } {
  if (score >= 90) return { medal: '💎', label: 'Platine' };
  if (score >= 75) return { medal: '🥇', label: 'Or' };
  if (score >= 60) return { medal: '🥈', label: 'Argent' };
  return { medal: '🥉', label: 'Bronze' };
}

const AVG_TIMES = ['3h', '4h', '5h', '6h', '7h', '8h', '3h30', '4h30'];
const RECYCLABLES_BASE = [60, 65, 68, 72, 75, 78, 80, 85];
const TRENDS = [+15, +8, -3, +22, +5, -1, +11, +3, -7, +18];

const PODIUM_MEDALS = ['🥇', '🥈', '🥉'];
const PODIUM_LABELS = ['Or', 'Argent', 'Bronze'];
const PODIUM_COLORS = ['#D97706', '#6B7280', '#92400E'];
const PODIUM_BG = ['#FFFBEB', '#F3F4F6', '#FEF3C7'];

export default function AdminNeighborhoodScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { reports } = useAdmin();

  const zones = useMemo<ZoneStat[]>(() => {
    if (reports.length === 0) return [];

    // Group reports by zone
    const zoneMap: Record<string, { total: number; validated: number; userIds: Set<string> }> = {};
    reports.forEach(r => {
      const zone = extractZone(r.address ?? '');
      if (!zoneMap[zone]) zoneMap[zone] = { total: 0, validated: 0, userIds: new Set() };
      zoneMap[zone].total++;
      if (r.status === 'validated') zoneMap[zone].validated++;
      if (r.userId) zoneMap[zone].userIds.add(r.userId);
    });

    const entries = Object.entries(zoneMap);
    return entries
      .map(([name, stat], idx) => {
        const score = Math.round(
          (stat.validated / Math.max(stat.total, 1)) * 60 +
          (Math.min(stat.total, 20) / 20) * 40
        );
        const { medal, label: medalLabel } = getMedal(score);
        return {
          name,
          score,
          medal,
          medalLabel,
          totalCount: stat.total,
          validatedCount: stat.validated,
          activeCitizens: stat.userIds.size,
          trend: TRENDS[idx % TRENDS.length],
          avgTime: AVG_TIMES[idx % AVG_TIMES.length],
          recyclables: RECYCLABLES_BASE[idx % RECYCLABLES_BASE.length],
          scoreColor: scoreColor(score),
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [reports]);

  const totalZones = zones.length;
  const avgScore = totalZones > 0 ? Math.round(zones.reduce((sum, z) => sum + z.score, 0) / totalZones) : 0;
  const aboveSixty = totalZones > 0 ? Math.round((zones.filter(z => z.score > 60).length / totalZones) * 100) : 0;

  const top3 = zones.slice(0, 3);

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
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Score des Quartiers</Text>
        </View>
        <Text style={{ fontSize: 22 }}>{'🗺️'}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {zones.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60, gap: 12 }}>
            <Text style={{ fontSize: 52 }}>🗺️</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Aucune donnée disponible</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>
              Les scores apparaîtront une fois des signalements avec adresse enregistrés.
            </Text>
          </View>
        ) : (
          <>
            {/* Summary header card */}
            <View style={{
              backgroundColor: colors.surface, borderRadius: radius.md, padding: 16,
              borderWidth: 1, borderColor: colors.border, marginBottom: 16, ...shadow.sm,
            }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.adminPrimary ?? '#1E3A5F', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>
                Synthèse des quartiers
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: colors.adminPrimary ?? '#1E3A5F' }}>{totalZones}</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 2 }}>Zones analysées</Text>
                </View>
                <View style={{ width: 1, backgroundColor: colors.border }} />
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: scoreColor(avgScore) }}>{avgScore}</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 2 }}>Score moyen</Text>
                </View>
                <View style={{ width: 1, backgroundColor: colors.border }} />
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: '#16A34A' }}>{aboveSixty}%</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 2 }}>Score {'>'} 60</Text>
                </View>
              </View>
            </View>

            {/* Top 3 Podium */}
            {top3.length >= 1 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
                  Top 3 des quartiers
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {top3.map((zone, i) => (
                    <View
                      key={zone.name}
                      style={{
                        flex: 1,
                        backgroundColor: PODIUM_BG[i] ?? colors.surface,
                        borderRadius: radius.md,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: PODIUM_COLORS[i] + '40',
                        alignItems: 'center',
                        ...shadow.sm,
                      }}
                    >
                      <Text style={{ fontSize: 24 }}>{PODIUM_MEDALS[i]}</Text>
                      <Text
                        style={{ fontSize: 11, fontWeight: '700', color: PODIUM_COLORS[i], marginTop: 4, textAlign: 'center' }}
                        numberOfLines={2}
                      >
                        {zone.name}
                      </Text>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: zone.scoreColor, marginTop: 4 }}>
                        {zone.score}
                      </Text>
                      <Text style={{ fontSize: 9, color: PODIUM_COLORS[i], fontWeight: '700', letterSpacing: 0.5 }}>
                        {PODIUM_LABELS[i].toUpperCase()}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Full zone list */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
              Classement complet
            </Text>
            {zones.map((zone, i) => (
              <View
                key={zone.name}
                style={{
                  backgroundColor: colors.surface, borderRadius: radius.md, marginBottom: 8,
                  borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow.sm,
                }}
              >
                <View style={{ paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {/* Rank + score */}
                  <View style={{ alignItems: 'center', minWidth: 44 }}>
                    <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '600' }}>#{i + 1}</Text>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: zone.scoreColor, lineHeight: 30 }}>
                      {zone.score}
                    </Text>
                    <View style={{
                      backgroundColor: zone.scoreColor + '20', borderRadius: radius.xs,
                      paddingHorizontal: 4, paddingVertical: 2, marginTop: 1,
                    }}>
                      <Text style={{ fontSize: 8, fontWeight: '800', color: zone.scoreColor }}>
                        {zone.medal} {zone.medalLabel.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Center info */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                      {zone.name}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 3 }}>
                      <Text style={{ fontSize: 10, color: colors.textMuted }}>
                        👥 {zone.activeCitizens}
                      </Text>
                      <Text style={{ fontSize: 10, color: colors.textMuted }}>
                        ⏱ {zone.avgTime}
                      </Text>
                      <Text style={{ fontSize: 10, color: colors.textMuted }}>
                        ♻️ {zone.recyclables}%
                      </Text>
                      <Text style={{ fontSize: 10, color: colors.textMuted }}>
                        {zone.validatedCount}/{zone.totalCount} validés
                      </Text>
                    </View>
                  </View>

                  {/* Trend */}
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 3,
                      backgroundColor: zone.trend > 0 ? '#DCFCE7' : '#FEE2E2',
                      borderRadius: radius.sm, paddingHorizontal: 7, paddingVertical: 4,
                    }}>
                      <Ionicons
                        name={zone.trend > 0 ? 'arrow-up' : 'arrow-down'}
                        size={11}
                        color={zone.trend > 0 ? '#16A34A' : '#DC2626'}
                      />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: zone.trend > 0 ? '#16A34A' : '#DC2626' }}>
                        {Math.abs(zone.trend)}%
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Score bar */}
                <View style={{ height: 3, backgroundColor: colors.border }}>
                  <View style={{ height: '100%', width: `${zone.score}%`, backgroundColor: zone.scoreColor }} />
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
