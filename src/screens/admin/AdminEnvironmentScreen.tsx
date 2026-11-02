import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { collection, getCountFromServer } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAdmin } from '../../context/AdminContext';
import { useTheme } from '../../context/ThemeContext';
import { radius, shadow } from '../../theme';

export default function AdminEnvironmentScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { reports } = useAdmin();
  const [treesCount, setTreesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Count-up animated values
  const treesAnim  = useRef(0);
  const wasteAnim  = useRef(0);
  const co2Anim    = useRef(0);
  const [treesDisplay,  setTreesDisplay]  = useState(0);
  const [wasteDisplay,  setWasteDisplay]  = useState(0);
  const [co2Display,    setCo2Display]    = useState(0);

  const totalReports = reports.length;

  const wasteKg  = Math.round(totalReports * 2.3);
  const co2Kg    = Math.round(totalReports * 0.4);
  const recycPct = 72;

  // Current month stats
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear  = now.getFullYear();

  // Build month prefix strings for comparison (YYYY-MM)
  const currentMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const prevMonthPrefix = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const reportsThisMonth = reports.filter(r => {
    const d = new Date(r.date ?? '');
    return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  // Count reports by month prefix
  const currentMonthCount = reports.filter(r => {
    const d = r.date ?? '';
    return typeof d === 'string' ? d.startsWith(currentMonthPrefix) : false;
  }).length;

  const prevMonthCount = reports.filter(r => {
    const d = r.date ?? '';
    return typeof d === 'string' ? d.startsWith(prevMonthPrefix) : false;
  }).length;

  // Fallback: if dates don't match prefix format, use the filtered counts
  const currentCount = currentMonthCount > 0 || prevMonthCount > 0 ? currentMonthCount : reportsThisMonth;
  const prevCount = prevMonthCount;

  const reportsChange = prevCount > 0 ? Math.round((currentCount - prevCount) / prevCount * 100) : 0;

  // Mock trees this month (30% of total, min 1 if any trees)
  const treesThisMonth = treesCount > 0 ? Math.max(1, Math.round(treesCount * 0.3)) : 0;

  const wasteGoalPct   = Math.min(100, Math.round(reportsThisMonth / 500 * 100));
  const treesGoalPct   = Math.min(100, Math.round(treesThisMonth / 50 * 100));

  useEffect(() => {
    (async () => {
      try {
        const snap = await getCountFromServer(collection(db, 'trees'));
        setTreesCount(snap.data().count);
      } catch {
        setTreesCount(0);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Count-up effect on mount / when data ready
  useEffect(() => {
    if (loading) return;
    const targets = [
      { ref: treesAnim, target: treesCount,  set: setTreesDisplay },
      { ref: wasteAnim, target: wasteKg,     set: setWasteDisplay },
      { ref: co2Anim,   target: co2Kg,       set: setCo2Display  },
    ];
    const duration = 1200;
    const steps    = 40;
    const interval = duration / steps;

    const timers = targets.map(({ ref, target, set }) => {
      let step = 0;
      const inc = target / steps;
      const t = setInterval(() => {
        step++;
        const val = Math.round(Math.min(inc * step, target));
        ref.current = val;
        set(val);
        if (step >= steps) clearInterval(t);
      }, interval);
      return t;
    });

    return () => timers.forEach(clearInterval);
  }, [loading, treesCount, wasteKg, co2Kg]);

  const KPI_CARDS = [
    { icon: '🌳', label: 'Arbres virtuels',  value: treesDisplay.toLocaleString('fr-FR'), color: '#16A34A', bg: '#DCFCE7' },
    { icon: '♻️', label: 'Déchets signalés', value: `${wasteDisplay} kg`, color: '#2563EB', bg: '#EFF6FF' },
    { icon: '🌍', label: 'CO₂ évité',  value: `${co2Display} kg`,  color: '#7C3AED', bg: '#EDE9FE' },
    { icon: '📦', label: 'Recyclables',       value: `${recycPct}%`,               color: '#D97706', bg: '#FFFBEB' },
  ];

  const PROGRESS = [
    { label: 'Objectif déchets ce mois', current: reportsThisMonth, target: 500, pct: wasteGoalPct, color: '#2563EB' },
    { label: 'Objectif arbres ce mois',       current: treesThisMonth,   target: 50,  pct: treesGoalPct, color: '#16A34A' },
  ];

  // Impact badges
  const badges = [
    {
      icon: '🌱',
      label: 'Ville en croissance',
      unlocked: true,
      color: '#16A34A',
      bg: '#DCFCE7',
      border: '#BBF7D0',
    },
    {
      icon: '♻️',
      label: 'Recyclage actif',
      unlocked: recycPct >= 70,
      color: '#2563EB',
      bg: '#EFF6FF',
      border: '#BFDBFE',
    },
    {
      icon: '🌳',
      label: 'Forêt citoyenne',
      unlocked: treesCount > 0,
      color: '#15803D',
      bg: '#F0FDF4',
      border: '#86EFAC',
    },
    {
      icon: '🌍',
      label: 'Éco-responsable',
      unlocked: totalReports > 10,
      color: '#7C3AED',
      bg: '#EDE9FE',
      border: '#C4B5FD',
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Gradient Header */}
      <LinearGradient
        colors={['#14532D', '#16A34A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        <TouchableOpacity
          style={{ width: 36, height: 36, borderRadius: radius.xs, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 }}>ADMIN</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>Impact Environnemental</Text>
        </View>
        <Text style={{ fontSize: 22 }}>{'🌱'}</Text>
      </LinearGradient>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <ActivityIndicator color="#16A34A" size="large" />
          <Text style={{ fontSize: 13, color: colors.textMuted }}>Chargement des données...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

          {/* KPI Grid */}
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase' }}>
            Indicateurs clés
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
            {KPI_CARDS.map(card => (
              <View
                key={card.label}
                style={{
                  width: '47%', backgroundColor: colors.surface, borderRadius: radius.md,
                  padding: 14, borderWidth: 1, borderColor: colors.border, ...shadow.sm,
                }}
              >
                <Text style={{ fontSize: 26, marginBottom: 6 }}>{card.icon}</Text>
                <Text style={{ fontSize: 22, fontWeight: '800', color: card.color }}>{card.value}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 2 }}>{card.label}</Text>
              </View>
            ))}
          </View>

          {/* Progress Bars */}
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase' }}>
            Objectifs du mois
          </Text>
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.border, ...shadow.sm }}>
            {PROGRESS.map((p, i) => (
              <View key={p.label} style={{ marginBottom: i < PROGRESS.length - 1 ? 16 : 0 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{p.label}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: p.color }}>{p.pct}%</Text>
                </View>
                <View style={{ height: 8, backgroundColor: colors.border, borderRadius: radius.pill, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${p.pct}%`, backgroundColor: p.color, borderRadius: radius.pill }} />
                </View>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                  {p.current} / {p.target}
                </Text>
              </View>
            ))}
          </View>

          {/* Impact Story */}
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase' }}>
            Impact cumulé
          </Text>
          <View style={{ backgroundColor: '#F0FDF4', borderRadius: radius.md, padding: 16, borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 20, ...shadow.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              {[
                { value: treesDisplay.toLocaleString('fr-FR'), unit: 'arbres plantés', icon: '🌳' },
                { value: `${wasteDisplay}`, unit: 'kg de déchets', icon: '♻️' },
                { value: `${co2Display}`, unit: 'kg CO₂', icon: '🌍' },
              ].map(item => (
                <View key={item.unit} style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ fontSize: 22 }}>{item.icon}</Text>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: '#16A34A', marginTop: 4 }}>{item.value}</Text>
                  <Text style={{ fontSize: 10, color: '#15803D', fontWeight: '600', textAlign: 'center', marginTop: 2 }}>{item.unit}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Month comparison — real data */}
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase' }}>
            Comparaison mois précédent
          </Text>
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 20, ...shadow.sm }}>
            {[
              { label: 'Signalements', change: reportsChange, icon: '🚨' },
            ].map((item, i) => (
              <View
                key={item.label}
                style={{
                  flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12,
                }}
              >
                <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{item.label}</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                    {currentCount} ce mois · {prevCount} le mois dernier
                  </Text>
                </View>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  backgroundColor: item.change >= 0 ? '#DCFCE7' : '#FEE2E2',
                  borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 5,
                }}>
                  <Ionicons
                    name={item.change >= 0 ? 'trending-up' : 'trending-down'}
                    size={14}
                    color={item.change >= 0 ? '#16A34A' : '#DC2626'}
                  />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: item.change >= 0 ? '#16A34A' : '#DC2626' }}>
                    {item.change > 0 ? '+' : ''}{item.change}%
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Impact badges */}
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase' }}>
            Badges d'impact
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {badges.map(badge => (
              <View
                key={badge.label}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: 12, paddingVertical: 8,
                  borderRadius: radius.pill,
                  backgroundColor: badge.unlocked ? badge.bg : '#F3F4F6',
                  borderWidth: 1,
                  borderColor: badge.unlocked ? badge.border : '#E5E7EB',
                }}
              >
                <Text style={{ fontSize: 16, opacity: badge.unlocked ? 1 : 0.4 }}>{badge.icon}</Text>
                <Text style={{
                  fontSize: 12, fontWeight: '700',
                  color: badge.unlocked ? badge.color : '#9CA3AF',
                }}>
                  {badge.label}
                </Text>
                {!badge.unlocked && (
                  <Ionicons name="lock-closed" size={11} color="#9CA3AF" />
                )}
              </View>
            ))}
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}
