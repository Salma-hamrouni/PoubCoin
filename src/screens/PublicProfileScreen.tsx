import React, { useState, useEffect, useRef } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useTheme } from '../context/ThemeContext';
import { shadow } from '../theme';
import { getLevel, getLevelProgress, getNextLevel, xpFromReports } from '../utils/xp';

export default function PublicProfileScreen({ navigation, route }: any) {
  const { userId, userName, userCity } = route.params ?? {};
  const { colors } = useTheme();

  const [loading, setLoading]   = useState(true);
  const [stats, setStats]       = useState({ validated: 0, pending: 0, total: 0, coins: 0 });

  const barAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    (async () => {
      try {
        const q = query(collection(db, 'reports'), where('userId', '==', userId));
        const snap = await getDocs(q);
        const docs = snap.docs.map(d => d.data());
        const validated = docs.filter(d => d.status === 'validated').length;
        const pending   = docs.filter(d => d.status === 'pending').length;
        setStats({ validated, pending, total: docs.length, coins: validated * 10 });
      } catch {}
      setLoading(false);
    })();
  }, [userId]);

  useEffect(() => {
    if (!loading) {
      const xp = xpFromReports(stats.validated, stats.pending);
      const prog = getLevelProgress(xp);
      Animated.parallel([
        Animated.timing(barAnim,  { toValue: prog, duration: 900, delay: 200, useNativeDriver: false }),
        Animated.timing(fadeAnim, { toValue: 1,    duration: 400, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
    }
  }, [loading]);

  const xp    = xpFromReports(stats.validated, stats.pending);
  const level = getLevel(xp);
  const next  = getNextLevel(xp);

  if (loading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient colors={[level.color + 'CC', level.color + '44']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 30 }}>
        <TouchableOpacity onPress={() => navigation.goBack()}
          style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: level.color, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#fff', marginBottom: 12, ...shadow.md }}>
            <Text style={{ fontSize: 36 }}>{level.emoji}</Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff' }}>{userName ?? 'Citoyen'}</Text>
          {userCity ? <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 3 }}>📍 {userCity}</Text> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 }}>
            <Text style={{ fontSize: 14 }}>{level.emoji}</Text>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>{level.title} · Niveau {level.level}</Text>
          </View>
        </View>

        {/* XP bar */}
        <View style={{ marginTop: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '700' }}>{xp} XP</Text>
            {next && <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Prochain: {next.title} ({next.minXP} XP)</Text>}
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
            <Animated.View style={{ height: '100%', width: barAnim.interpolate({ inputRange: [0,1], outputRange: ['0%','100%'] }), borderRadius: 4, backgroundColor: '#fff' }} />
          </View>
        </View>
      </LinearGradient>

      <Animated.ScrollView style={{ opacity: fadeAnim }} contentContainerStyle={{ padding: 16, gap: 14 }} showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            { label: 'Signalements', value: stats.total,     emoji: '📍', color: colors.primary },
            { label: 'Validés',      value: stats.validated, emoji: '✅', color: '#16A34A' },
            { label: 'En attente',   value: stats.pending,   emoji: '⏳', color: colors.gold },
          ].map((s, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border, ...shadow.xs }}>
              <Text style={{ fontSize: 22 }}>{s.emoji}</Text>
              <Text style={{ fontSize: 22, fontWeight: '900', color: s.color, marginTop: 4 }}>{s.value}</Text>
              <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '700', marginTop: 2 }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Level progression */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border, ...shadow.sm }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 14 }}>🏅 Progression</Text>
          {[1,2,3,4,5,6,7].map(lvl => {
            const l = require('../utils/xp').LEVELS[lvl - 1];
            const reached = level.level >= lvl;
            const current = level.level === lvl;
            return (
              <View key={lvl} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: lvl < 7 ? 12 : 0 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: reached ? l.color : colors.border, alignItems: 'center', justifyContent: 'center', borderWidth: current ? 3 : 0, borderColor: '#fff' }}>
                  <Text style={{ fontSize: 16 }}>{l.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: reached ? colors.text : colors.textMuted }}>{l.title}</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>{l.minXP} XP</Text>
                </View>
                {reached && <Ionicons name="checkmark-circle" size={18} color={l.color} />}
              </View>
            );
          })}
        </View>

        <View style={{ height: 20 }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
