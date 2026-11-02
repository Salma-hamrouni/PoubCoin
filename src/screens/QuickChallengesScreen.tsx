import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  Animated, Platform, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { radius, shadow } from '../theme';
import { useT } from '../i18n/useT';

interface QuickChallenge {
  id: string;
  period: 'today' | 'week' | 'month';
  emoji: string;
  title: string;
  description: string;
  reward: number;
  badge?: string;
  target: number;
  unit: string;
  color: string;
  bg: string;
  borderColor: string;
}

const CHALLENGES: QuickChallenge[] = [
  // Aujourd'hui
  { id: 'today_plastic', period: 'today', emoji: '🥤', title: 'Plastique ennemi', description: 'Signaler 2 déchets plastiques', reward: 30, target: 2, unit: 'signalements', color: '#2563EB', bg: '#EFF6FF', borderColor: '#BFDBFE' },
  { id: 'today_photo',   period: 'today', emoji: '📸', title: 'Photographe citoyen', description: 'Poster 1 signalement avec photo', reward: 20, target: 1, unit: 'signalement', color: '#7C3AED', bg: '#F5F3FF', borderColor: '#DDD6FE' },
  { id: 'today_zone',    period: 'today', emoji: '📍', title: 'Explorateur local', description: 'Signaler dans 2 zones différentes', reward: 40, target: 2, unit: 'zones', color: '#059669', bg: '#ECFDF5', borderColor: '#A7F3D0' },
  // Cette semaine
  { id: 'week_5',     period: 'week', emoji: '🏆', title: 'Éco-Héros', description: '5 signalements cette semaine', reward: 100, badge: 'Eco Hero 🦸', target: 5, unit: 'signalements', color: '#D97706', bg: '#FFFBEB', borderColor: '#FDE68A' },
  { id: 'week_zone',  period: 'week', emoji: '🗺️', title: 'Cartographe', description: 'Signaler dans 3 zones différentes', reward: 75, badge: 'Cartographe 🗺️', target: 3, unit: 'zones', color: '#0891B2', bg: '#ECFEFF', borderColor: '#A5F3FC' },
  { id: 'week_after', period: 'week', emoji: '🌿', title: 'Avant/Après', description: 'Compléter 2 photos après nettoyage', reward: 80, badge: 'Acteur du changement', target: 2, unit: 'photos après', color: '#16A34A', bg: '#F0FDF4', borderColor: '#BBF7D0' },
  // Ce mois
  { id: 'month_20',    period: 'month', emoji: '⭐', title: 'Citoyen du mois', description: '20 signalements ce mois', reward: 500, badge: 'Légende 🌟', target: 20, unit: 'signalements', color: '#9333EA', bg: '#FAF5FF', borderColor: '#E9D5FF' },
  { id: 'month_10k',   period: 'month', emoji: '🌍', title: 'Impact planète', description: 'Cumuler 10 signalements validés', reward: 300, badge: 'Défenseur 🌱', target: 10, unit: 'validés', color: '#065F46', bg: '#F0FDF4', borderColor: '#6EE7B7' },
];

// PERIOD_LABELS moved inside component to use t()

const PERIOD_ICONS: Record<string, string> = {
  today: 'sunny-outline',
  week:  'calendar-outline',
  month: 'ribbon-outline',
};

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: Math.min(pct, 100), duration: 700, useNativeDriver: false }).start();
  }, [pct]);
  return (
    <View style={{ height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden', marginTop: 8 }}>
      <Animated.View style={{
        height: '100%', borderRadius: 3, backgroundColor: color,
        width: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
      }} />
    </View>
  );
}

export default function QuickChallengesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const t = useT();
  const { reports, addCoins } = useWallet();
  const { user } = useAuth();
  const PERIOD_LABELS: Record<string, string> = {
    today: t('challenge_period_today'),
    week:  t('challenge_period_week'),
    month: t('challenge_period_month'),
  };
  const [claimed, setClaimed] = useState<Record<string, boolean>>({});
  const [claiming, setClaiming] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@quick_challenges_claimed').then(v => {
      if (v) setClaimed(JSON.parse(v));
    });
  }, []);

  const saveClaimed = (next: Record<string, boolean>) => {
    setClaimed(next);
    AsyncStorage.setItem('@quick_challenges_claimed', JSON.stringify(next));
  };

  // Compute progress for each challenge
  const todayStr  = new Date().toISOString().slice(0, 10);
  const weekStart = (() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().slice(0, 10);
  })();
  const monthStr = new Date().toISOString().slice(0, 7);

  const getDate = (r: any) => ((r as any).createdAt?.toDate?.()?.toISOString() ?? (r as any).createdAt ?? r.date ?? '').slice(0, 10);

  const progress = (c: QuickChallenge): number => {
    let relevant = reports;
    if (c.period === 'today') relevant = reports.filter(r => getDate(r) === todayStr);
    else if (c.period === 'week')  relevant = reports.filter(r => getDate(r) >= weekStart);
    else if (c.period === 'month') relevant = reports.filter(r => getDate(r).slice(0, 7) === monthStr);

    if (c.id.includes('plastic'))  return relevant.length; // simplified
    if (c.id.includes('photo'))    return relevant.filter(r => r.imageUri).length;
    if (c.id.includes('zone'))     return new Set(relevant.map(r => r.address?.split(',')[1]?.trim() ?? '')).size;
    if (c.id.includes('after'))    return relevant.filter(r => (r as any).afterImageUri).length;
    if (c.id.includes('validated') || c.id.includes('10k')) return relevant.filter(r => r.status === 'validated').length;
    return relevant.length;
  };

  const claimReward = async (c: QuickChallenge) => {
    if (claiming || claimed[c.id]) return;
    setClaiming(c.id);
    await addCoins(c.reward, `Défi — ${c.title}`);
    saveClaimed({ ...claimed, [c.id]: true });
    setClaiming(null);
    if (Platform.OS === 'web') {
      window.alert(`${t('challenge_complete_title')} +${c.reward} 🪙${c.badge ? `\n${t('challenge_badge_unlocked')} ${c.badge}` : ''}`);
    } else {
      Alert.alert(t('challenge_complete_title'), `+${c.reward} 🪙${c.badge ? `\n${t('challenge_badge_unlocked')} ${c.badge}` : ''}`);
    }
  };

  const periods = ['today', 'week', 'month'] as const;

  const totalEarnable = CHALLENGES.filter(c => !claimed[c.id]).reduce((s, c) => s + c.reward, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <LinearGradient colors={[colors.primaryDark, colors.primary]} style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 20 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ width: 36, height: 36, borderRadius: radius.sm, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 14 }}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5, marginBottom: 4 }}>GAMIFICATION</Text>
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 14 }}>{t('challenge_header')}</Text>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            { label: t('challenge_chip_active'),   value: CHALLENGES.length },
            { label: t('challenge_chip_done'),     value: Object.keys(claimed).length },
            { label: t('challenge_chip_earn'), value: totalEarnable },
          ].map(chip => (
            <View key={chip.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.md, padding: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>{chip.value}</Text>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 2, textAlign: 'center' }}>{chip.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 24 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); }} colors={[colors.primary]} tintColor={colors.primary} />}>
        {periods.map(period => {
          const periodChallenges = CHALLENGES.filter(c => c.period === period);
          return (
            <View key={period}>
              {/* Period header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <View style={{ width: 28, height: 28, borderRadius: radius.sm, backgroundColor: colors.primaryGhost, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name={PERIOD_ICONS[period] as any} size={16} color={colors.primary} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>{PERIOD_LABELS[period]}</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              </View>

              {periodChallenges.map((c, i) => {
                const prog = progress(c);
                const pct = Math.min((prog / c.target) * 100, 100);
                const done = pct >= 100;
                const alreadyClaimed = claimed[c.id];

                return (
                  <View key={c.id} style={{
                    backgroundColor: alreadyClaimed ? '#F9FAFB' : c.bg,
                    borderRadius: radius.lg, padding: 16, marginBottom: 10,
                    borderWidth: 1.5, borderColor: alreadyClaimed ? colors.border : c.borderColor,
                    opacity: alreadyClaimed ? 0.7 : 1,
                    ...shadow.sm,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                      {/* Icon */}
                      <View style={{
                        width: 46, height: 46, borderRadius: radius.md,
                        backgroundColor: alreadyClaimed ? '#E5E7EB' : colors.surface,
                        justifyContent: 'center', alignItems: 'center',
                        borderWidth: 1, borderColor: alreadyClaimed ? '#D1D5DB' : c.borderColor,
                      }}>
                        <Text style={{ fontSize: 24 }}>{alreadyClaimed ? '✅' : c.emoji}</Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: alreadyClaimed ? colors.textMuted : colors.text }}>{c.title}</Text>
                          <View style={{ backgroundColor: '#FEF9C3', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 }}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#B45309' }}>+{c.reward} 🪙</Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>{c.description}</Text>

                        {c.badge && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                            <Ionicons name="ribbon-outline" size={11} color={c.color} />
                            <Text style={{ fontSize: 11, color: c.color, fontWeight: '600' }}>Badge : {c.badge}</Text>
                          </View>
                        )}

                        {/* Progress */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                          <Text style={{ fontSize: 11, color: colors.textMuted }}>{Math.min(prog, c.target)}/{c.target} {c.unit}</Text>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: done ? '#16A34A' : c.color }}>{Math.round(pct)}%</Text>
                        </View>
                        <ProgressBar pct={pct} color={done ? '#16A34A' : c.color} />
                      </View>
                    </View>

                    {/* Claim button */}
                    {!alreadyClaimed && done && (
                      <TouchableOpacity
                        onPress={() => claimReward(c)}
                        disabled={claiming === c.id}
                        style={{ backgroundColor: '#16A34A', borderRadius: radius.md, paddingVertical: 11, alignItems: 'center', marginTop: 14, flexDirection: 'row', justifyContent: 'center', gap: 8, opacity: claiming === c.id ? 0.6 : 1 }}
                      >
                        <Ionicons name={claiming === c.id ? 'hourglass-outline' : 'gift-outline'} size={16} color="#fff" />
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{claiming === c.id ? t('challenge_claiming') : `${t('challenge_claim_btn')} +${c.reward} 🪙`}</Text>
                      </TouchableOpacity>
                    )}
                    {alreadyClaimed && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
                        <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                        <Text style={{ fontSize: 12, color: '#16A34A', fontWeight: '600' }}>{t('challenge_claimed')}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
