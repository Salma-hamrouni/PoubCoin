import React, { useState, useEffect } from 'react';
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useTheme } from '../../context/ThemeContext';
import { radius, shadow } from '../../theme';

interface FraudAlert {
  userId: string;
  userName: string;
  type: 'burst' | 'gps_repeat' | 'high_reject';
  severity: 'high' | 'medium';
  detail: string;
  count: number;
}

export default function AdminFraudScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const [reportsSnap, usersSnap] = await Promise.all([
        getDocs(query(collection(db, 'reports'), orderBy('createdAt', 'desc'))),
        getDocs(collection(db, 'users')),
      ]);

      const userNames: Record<string, string> = {};
      usersSnap.docs.forEach(d => { userNames[d.id] = (d.data() as any).name ?? d.id; });

      const reports = reportsSnap.docs.map(d => {
        const data = d.data() as any;
        return {
          id: d.id,
          userId: data.userId ?? data.reportedBy ?? '',
          lat: data.latitude ?? 0,
          lng: data.longitude ?? 0,
          ts: data.createdAt?.toMillis?.() ?? 0,
          status: data.status ?? 'pending',
        };
      });

      const byUser: Record<string, typeof reports> = {};
      reports.forEach(r => {
        if (!r.userId) return;
        if (!byUser[r.userId]) byUser[r.userId] = [];
        byUser[r.userId].push(r);
      });

      const newAlerts: FraudAlert[] = [];

      Object.entries(byUser).forEach(([userId, userReports]) => {
        const name = userNames[userId] ?? userId.slice(0, 8);

        // Rule 1: Burst (>3 reports within 10 minutes)
        const sorted = [...userReports].sort((a, b) => a.ts - b.ts);
        for (let i = 0; i < sorted.length - 3; i++) {
          const window = sorted.slice(i, i + 4);
          if (window[3].ts - window[0].ts < 10 * 60 * 1000) {
            newAlerts.push({
              userId, userName: name, type: 'burst', severity: 'high',
              detail: `${window.length} signalements en moins de 10 minutes`,
              count: userReports.length,
            });
            break;
          }
        }

        // Rule 2: GPS repeat (same location > 2 times)
        const locMap: Record<string, number> = {};
        userReports.forEach(r => {
          const key = `${(r.lat * 1000).toFixed(0)}_${(r.lng * 1000).toFixed(0)}`;
          locMap[key] = (locMap[key] ?? 0) + 1;
        });
        const maxRepeat = Math.max(...Object.values(locMap));
        if (maxRepeat >= 3) {
          newAlerts.push({
            userId, userName: name, type: 'gps_repeat', severity: 'high',
            detail: `Même localisation signalée ${maxRepeat} fois`,
            count: userReports.length,
          });
        }

        // Rule 3: High reject rate
        const total = userReports.length;
        const rejected = userReports.filter(r => r.status === 'rejected').length;
        if (total >= 5 && rejected / total > 0.5) {
          newAlerts.push({
            userId, userName: name, type: 'high_reject', severity: 'medium',
            detail: `${rejected}/${total} signalements rejetés (${Math.round(rejected/total*100)}%)`,
            count: total,
          });
        }
      });

      // Deduplicate by userId + type
      const seen = new Set<string>();
      const deduped = newAlerts.filter(a => {
        const key = `${a.userId}_${a.type}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setAlerts(deduped.sort((a, b) => (a.severity === 'high' ? -1 : 1)));
      setLastRun(new Date());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { runAnalysis(); }, []);

  const ALERT_CONFIG = {
    burst:       { icon: '⚡', label: 'Rafale temporelle', color: '#DC2626', bg: '#FEF2F2' },
    gps_repeat:  { icon: '📍', label: 'GPS répété',        color: '#EA580C', bg: '#FFF7ED' },
    high_reject: { icon: '🚩', label: 'Taux rejet élevé',  color: '#CA8A04', bg: '#FEFCE8' },
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border, ...shadow.sm }}>
        <TouchableOpacity style={{ width: 36, height: 36, borderRadius: radius.xs, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border }} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626', letterSpacing: 1 }}>SÉCURITÉ</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Détection fraude</Text>
        </View>
        <TouchableOpacity style={{ backgroundColor: '#FEF2F2', borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#DC262640' }} onPress={runAnalysis} disabled={loading}>
          <Ionicons name="refresh" size={14} color="#DC2626" />
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>Analyser</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <ActivityIndicator color="#DC2626" size="large" />
          <Text style={{ fontSize: 13, color: colors.textMuted }}>Analyse en cours...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

          {/* Summary */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Alertes totales', value: alerts.length, color: '#DC2626' },
              { label: 'Sévérité haute',  value: alerts.filter(a=>a.severity==='high').length, color: '#EA580C' },
              { label: 'Sévérité moy.',   value: alerts.filter(a=>a.severity==='medium').length, color: '#CA8A04' },
            ].map(item => (
              <View key={item.label} style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: item.color }}>{item.value}</Text>
                <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '600', textAlign: 'center' }}>{item.label}</Text>
              </View>
            ))}
          </View>

          {lastRun && (
            <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 12 }}>
              Dernière analyse : {lastRun.toLocaleTimeString('fr-FR')}
            </Text>
          )}

          {alerts.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 50, gap: 12 }}>
              <Text style={{ fontSize: 52 }}>✅</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Aucune fraude détectée</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>Tous les signalements semblent légitimes.</Text>
            </View>
          )}

          {alerts.map((alert, i) => {
            const cfg = ALERT_CONFIG[alert.type];
            return (
              <View key={`${alert.userId}_${alert.type}`} style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: cfg.color + '40', ...shadow.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: cfg.bg, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 20 }}>{cfg.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{alert.userName}</Text>
                      <View style={{ backgroundColor: cfg.bg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: cfg.color }}>{alert.severity.toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: cfg.color }}>{cfg.label}</Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{alert.detail}</Text>
                  </View>
                </View>
                <View style={{ marginTop: 10, backgroundColor: cfg.bg, borderRadius: radius.xs, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="information-circle-outline" size={14} color={cfg.color} />
                  <Text style={{ fontSize: 11, color: cfg.color, flex: 1 }}>
                    {alert.type === 'burst'       ? 'Possible bot ou spam. Vérifiez les photos des signalements.' :
                     alert.type === 'gps_repeat'  ? 'Même lieu signalé plusieurs fois. Peut indiquer de la manipulation.' :
                     'Qualité de signalement faible. Considérez un avertissement.'}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
