import React, { useState, useEffect } from 'react';
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useTheme } from '../context/ThemeContext';
import { radius, shadow } from '../theme';

interface ZoneRisk {
  zone: string;
  count: number;
  recentCount: number;
  weekdayPeak: string;
  riskScore: number;
  trend: 'up' | 'stable' | 'down';
  level: 'critical' | 'high' | 'medium' | 'low';
}

const WEEKDAYS = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

function extractZone(address: string): string {
  if (!address) return 'Inconnu';
  const parts = address.split(',').map(s => s.trim());
  return parts[parts.length > 1 ? parts.length - 2 : 0] || parts[0] || 'Inconnu';
}

function getRiskLevel(score: number): ZoneRisk['level'] {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

const LEVEL_CONFIG = {
  critical: { color: '#DC2626', bg: '#FEF2F2', label: 'Critique', icon: '🔴' },
  high:     { color: '#EA580C', bg: '#FFF7ED', label: 'Élevé',    icon: '🟠' },
  medium:   { color: '#CA8A04', bg: '#FEFCE8', label: 'Modéré',   icon: '🟡' },
  low:      { color: '#16A34A', bg: '#F0FDF4', label: 'Faible',   icon: '🟢' },
};

export default function RiskPredictionScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [zones, setZones] = useState<ZoneRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ZoneRisk | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'reports'));
        const reports = snap.docs.map(d => ({ ...d.data(), id: d.id } as any));

        const now = Date.now();
        const thirtyDaysAgo = now - 30 * 24 * 3600 * 1000;
        const sevenDaysAgo  = now - 7  * 24 * 3600 * 1000;

        // Group by zone
        const zoneMap: Record<string, { all: any[]; recent: any[]; weekdays: number[] }> = {};
        for (const r of reports) {
          const zone = extractZone(r.address || '');
          if (!zoneMap[zone]) zoneMap[zone] = { all: [], recent: [], weekdays: [0,0,0,0,0,0,0] };
          const ts = r.createdAt?.toMillis?.() ?? new Date(r.date || 0).getTime();
          if (ts >= thirtyDaysAgo) {
            zoneMap[zone].all.push(r);
            const day = new Date(ts).getDay();
            zoneMap[zone].weekdays[day]++;
          }
          if (ts >= sevenDaysAgo) zoneMap[zone].recent.push(r);
        }

        const result: ZoneRisk[] = Object.entries(zoneMap)
          .filter(([, v]) => v.all.length >= 1)
          .map(([zone, v]) => {
            const count = v.all.length;
            const recentCount = v.recent.length;
            const peakDay = v.weekdays.indexOf(Math.max(...v.weekdays));
            const weekdayPeak = WEEKDAYS[peakDay];

            // Score: frequency (50%) + recency (30%) + repetition (20%)
            const freqScore    = Math.min(count / 15, 1) * 50;
            const recencyScore = Math.min(recentCount / 5, 1) * 30;
            const repScore     = count > 3 ? 20 : (count / 3) * 20;
            const riskScore    = Math.round(freqScore + recencyScore + repScore);

            // Trend: compare last 7 days vs prev 7 days
            const prevWeek = v.all.filter(r => {
              const ts = r.createdAt?.toMillis?.() ?? 0;
              return ts >= sevenDaysAgo - 7*24*3600*1000 && ts < sevenDaysAgo;
            }).length;
            const trend: ZoneRisk['trend'] =
              recentCount > prevWeek + 1 ? 'up' :
              recentCount < prevWeek - 1 ? 'down' : 'stable';

            return { zone, count, recentCount, weekdayPeak, riskScore, trend, level: getRiskLevel(riskScore) };
          })
          .sort((a, b) => b.riskScore - a.riskScore);

        setZones(result);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const trendIcon = (t: ZoneRisk['trend']) => t === 'up' ? '↑' : t === 'down' ? '↓' : '→';
  const trendColor = (t: ZoneRisk['trend']) => t === 'up' ? '#DC2626' : t === 'down' ? '#16A34A' : '#CA8A04';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border, ...shadow.sm }}>
        <TouchableOpacity style={{ width: 36, height: 36, borderRadius: radius.xs, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border }} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 1 }}>ANALYSE IA</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Prédiction des zones</Text>
        </View>
        <Text style={{ fontSize: 22 }}>🔮</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ fontSize: 13, color: colors.textMuted }}>Analyse des données...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

          {/* Summary banner */}
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', gap: 12 }}>
            {(['critical','high','medium','low'] as const).map(lvl => {
              const cfg = LEVEL_CONFIG[lvl];
              const cnt = zones.filter(z => z.level === lvl).length;
              return (
                <View key={lvl} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
                  <Text style={{ fontSize: 18 }}>{cfg.icon}</Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: cfg.color }}>{cnt}</Text>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' }}>{cfg.label}</Text>
                </View>
              );
            })}
          </View>

          {zones.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Text style={{ fontSize: 48 }}>✅</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 12 }}>Aucune zone à risque</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 6 }}>Pas assez de données pour l'analyse. Continuez à signaler !</Text>
            </View>
          )}

          {zones.map((z, i) => {
            const cfg = LEVEL_CONFIG[z.level];
            const isSelected = selected?.zone === z.zone;
            return (
              <TouchableOpacity key={z.zone} onPress={() => setSelected(isSelected ? null : z)}
                style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: isSelected ? cfg.color : colors.border, ...shadow.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: cfg.bg, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 16 }}>{cfg.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }} numberOfLines={1}>{z.zone}</Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>{z.count} signalement{z.count !== 1 ? 's' : ''} ce mois</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={{ backgroundColor: cfg.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: cfg.color }}>{z.riskScore}%</Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: trendColor(z.trend) }}>{trendIcon(z.trend)}</Text>
                  </View>
                </View>

                {/* Score bar */}
                <View style={{ height: 4, backgroundColor: colors.border, borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${z.riskScore}%` as any, backgroundColor: cfg.color, borderRadius: 2 }} />
                </View>

                {/* Detail panel */}
                {isSelected && (
                  <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>📋 Détails de l'analyse</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {[
                        { label: 'Niveau', value: cfg.label, color: cfg.color },
                        { label: 'Score risque', value: `${z.riskScore}/100`, color: cfg.color },
                        { label: '7 derniers jours', value: `${z.recentCount} signaux`, color: colors.primary },
                        { label: 'Pic hebdo', value: z.weekdayPeak, color: '#7C3AED' },
                        { label: 'Tendance', value: z.trend === 'up' ? '📈 En hausse' : z.trend === 'down' ? '📉 En baisse' : '➡️ Stable', color: trendColor(z.trend) },
                      ].map(item => (
                        <View key={item.label} style={{ backgroundColor: colors.background, borderRadius: radius.xs, padding: 8, minWidth: '45%', flex: 1, borderWidth: 1, borderColor: colors.border }}>
                          <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 2, fontWeight: '600' }}>{item.label}</Text>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: item.color }}>{item.value}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={{ backgroundColor: cfg.bg, borderRadius: radius.sm, padding: 10, marginTop: 4 }}>
                      <Text style={{ fontSize: 12, color: cfg.color, fontWeight: '600', lineHeight: 17 }}>
                        💡 {z.level === 'critical'
                          ? `Zone très active. Intervention urgente recommandée ${z.weekdayPeak}.`
                          : z.level === 'high'
                          ? `Surveillance accrue recommandée. Pic d'activité le ${z.weekdayPeak}.`
                          : z.level === 'medium'
                          ? `Zone à surveiller. Sensibilisation recommandée.`
                          : `Zone sous contrôle. Continuer les signalements.`}
                      </Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 8 }}>
            Analyse basée sur les 30 derniers jours · {zones.length} zones analysées
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
