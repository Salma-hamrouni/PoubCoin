import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useWallet } from '../context/WalletContext';
import { useTheme } from '../context/ThemeContext';
import { shadow, radius } from '../theme';

const KG_PER_REPORT   = 0.8;
const CO2_PER_KG      = 0.5;
const TREE_CO2_PER_DAY = 0.02;
const WATER_PER_KG    = 3.5;
const PLASTIC_SHARE   = 0.35;

function AnimBar({ value, color, delay = 0 }: { value: number; color: string; delay?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: value, duration: 900, delay, useNativeDriver: false }).start();
  }, [value]);
  return (
    <View style={{ height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden', marginTop: 8 }}>
      <Animated.View style={{ height: '100%', width: anim.interpolate({ inputRange: [0,1], outputRange: ['0%','100%'] }), borderRadius: 5, backgroundColor: color }} />
    </View>
  );
}

function StatCard({ emoji, value, unit, label, color, bg, delay }: any) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, tension: 60, friction: 10, delay, useNativeDriver: Platform.OS !== 'web' }).start();
  }, []);
  return (
    <Animated.View style={{ opacity: anim, transform: [{ scale: anim }], flex: 1 }}>
      <View style={{ backgroundColor: bg, borderRadius: 22, padding: 20, alignItems: 'center', borderWidth: 1.5, borderColor: color + '35', ...shadow.sm }}>
        <Text style={{ fontSize: 36, marginBottom: 8 }}>{emoji}</Text>
        <Text style={{ fontSize: 26, fontWeight: '900', color, letterSpacing: -0.5 }}>{value}</Text>
        <Text style={{ fontSize: 11, fontWeight: '800', color, opacity: 0.72 }}>{unit}</Text>
        <Text style={{ fontSize: 11, color: '#64748B', marginTop: 5, textAlign: 'center', lineHeight: 17 }}>{label}</Text>
      </View>
    </Animated.View>
  );
}

export default function ImpactScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { reports } = useWallet();

  const validated = useMemo(() => reports.filter(r => r.status === 'validated').length, [reports]);
  const pending   = useMemo(() => reports.filter(r => r.status === 'pending').length, [reports]);
  const total     = reports.length;

  const kgWaste   = +(validated * KG_PER_REPORT).toFixed(1);
  const co2Saved  = +(kgWaste * CO2_PER_KG).toFixed(2);
  const treeDays  = +(co2Saved / TREE_CO2_PER_DAY).toFixed(0);
  const waterSaved = +(kgWaste * WATER_PER_KG).toFixed(1);
  const plasticKg  = +(kgWaste * PLASTIC_SHARE).toFixed(1);
  const validatedPct = total > 0 ? validated / total : 0;

  const milestones = [
    { label: '1er signalement', done: total >= 1,   emoji: '🌱' },
    { label: '5 signalements',  done: total >= 5,   emoji: '🌿' },
    { label: '1 kg évité',      done: kgWaste >= 1, emoji: '♻️' },
    { label: '10 validés',      done: validated >= 10, emoji: '⭐' },
    { label: '5 kg évités',     done: kgWaste >= 5, emoji: '🌍' },
    { label: '25 validés',      done: validated >= 25, emoji: '🏆' },
    { label: '10 kg évités',    done: kgWaste >= 10, emoji: '💚' },
    { label: '50 validés',      done: validated >= 50, emoji: '👑' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <LinearGradient colors={['#0F3D22', '#1B6B3A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}
            style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.55)', letterSpacing: 2 }}>MON IMPACT</Text>
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#fff', marginTop: 2, letterSpacing: -0.3 }}>Bilan environnemental</Text>
          </View>
          <Text style={{ fontSize: 34 }}>🌍</Text>
        </View>

        {/* Main CO2 hero */}
        <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: 18, marginTop: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 1, textTransform: 'uppercase' }}>CO₂ évité estimé</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 6 }}>
            <Text style={{ fontSize: 48, fontWeight: '900', color: '#4ADE80', letterSpacing: -1 }}>{co2Saved}</Text>
            <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', fontWeight: '700', marginBottom: 8 }}>kg CO₂</Text>
          </View>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
            Basé sur {validated} signalement{validated > 1 ? 's' : ''} validé{validated > 1 ? 's' : ''} · {kgWaste} kg de déchets
          </Text>
          <AnimBar value={validatedPct} color="#4ADE80" delay={300} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{pending} en attente</Text>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{validated}/{total} validés</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* Stats grid */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <StatCard emoji="🌳" value={treeDays} unit="jours d'arbre" label="Équivalent absorption d'un arbre" color="#1B6B3A" bg="#F0FDF4" delay={0} />
          <StatCard emoji="💧" value={waterSaved} unit="litres" label="Eau économisée (production)" color="#0891B2" bg="#ECFEFF" delay={100} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <StatCard emoji="🧴" value={plasticKg} unit="kg plastique" label="Plastique intercepté" color="#8B5CF6" bg="#F5F3FF" delay={200} />
          <StatCard emoji="🗑️" value={kgWaste} unit="kg déchets" label="Déchets signalés" color="#F59E0B" bg="#FFFBEB" delay={300} />
        </View>

        {/* Equivalences */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border, ...shadow.sm }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 16 }}>🔄 Équivalences concrètes</Text>
          {[
            { emoji: '🚗', label: `${(co2Saved / 0.12).toFixed(0)} km en voiture évités`, pct: Math.min(co2Saved / 5, 1) },
            { emoji: '✈️', label: `${(co2Saved / 90).toFixed(3)} vol Paris-Tunis`, pct: Math.min(co2Saved / 90, 1) },
            { emoji: '💡', label: `${(co2Saved / 0.005).toFixed(0)} h d'ampoule LED`, pct: Math.min(co2Saved / 2, 1) },
            { emoji: '📱', label: `${(co2Saved / 0.008).toFixed(0)} charges de smartphone`, pct: Math.min(co2Saved / 1, 1) },
          ].map((item, i) => (
            <View key={i} style={{ marginBottom: i < 3 ? 12 : 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 20, width: 30 }}>{item.emoji}</Text>
                <Text style={{ flex: 1, fontSize: 13, color: colors.text, fontWeight: '600' }}>{item.label}</Text>
              </View>
              <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden', marginTop: 6, marginLeft: 40 }}>
                <View style={{ height: '100%', width: `${item.pct * 100}%`, borderRadius: 3, backgroundColor: colors.primary }} />
              </View>
            </View>
          ))}
        </View>

        {/* Milestones */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border, ...shadow.sm }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 16 }}>🏅 Jalons écologiques</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {milestones.map((m, i) => (
              <View key={i} style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: m.done ? colors.primaryGhost : colors.background,
                borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
                borderWidth: 1, borderColor: m.done ? colors.primary + '40' : colors.border,
                opacity: m.done ? 1 : 0.45,
              }}>
                <Text style={{ fontSize: 16 }}>{m.emoji}</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: m.done ? colors.primary : colors.textMuted }}>
                  {m.label}
                </Text>
                {m.done && <Ionicons name="checkmark-circle" size={14} color={colors.primary} />}
              </View>
            ))}
          </View>
        </View>

        {/* Monthly trend placeholder */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border, ...shadow.sm }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 4 }}>📅 Ce mois-ci</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 14 }}>
            {reports.filter(r => r.date?.startsWith(new Date().toISOString().slice(0, 7))).length} signalement{reports.filter(r => r.date?.startsWith(new Date().toISOString().slice(0, 7))).length > 1 ? 's' : ''} ce mois
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 60 }}>
            {Array.from({ length: 7 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (6 - i));
              const key = d.toISOString().split('T')[0];
              const count = reports.filter(r => r.date === key).length;
              const maxH = 50;
              const h = count > 0 ? Math.max((count / 5) * maxH, 8) : 4;
              return (
                <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <View style={{ width: '70%', height: h, borderRadius: 4, backgroundColor: count > 0 ? colors.primary : colors.border }} />
                  <Text style={{ fontSize: 9, color: colors.textMuted, fontWeight: '600' }}>
                    {['D','L','M','M','J','V','S'][d.getDay()]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
