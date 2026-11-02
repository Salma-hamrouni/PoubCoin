import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, SafeAreaView, Alert,
  TouchableOpacity, Dimensions, ActivityIndicator, RefreshControl, Animated, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, query, where, doc, updateDoc, increment, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStreak } from '../utils/streaks';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { shadow, radius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useT } from '../i18n/useT';

const { width } = Dimensions.get('window');

interface Challenge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  target: number;
  reward: number;
  active: boolean;
  deadline?: string;
}

interface NeighborhoodChallenge {
  id: string;
  city: string;
  title: string;
  description: string;
  emoji: string;
  target: number;
  current: number;
  deadline: string;
  reward: number;
  active: boolean;
  participants: string[];
}

const BADGES = [
  { icon: '🌱', label: 'Premier pas',    desc: '1er signalement',         unlocked: (v: number, t: number) => t >= 1,  hidden: false },
  { icon: '📷', label: 'Photographe',    desc: '5 signalements',          unlocked: (v: number, t: number) => t >= 5,  hidden: false },
  { icon: '🌿', label: 'Éco-Actif',      desc: '10 signalements validés', unlocked: (v: number, t: number) => v >= 10, hidden: false },
  { icon: '🔥', label: 'En feu',         desc: '3 validés cette semaine', unlocked: (v: number, t: number) => v >= 3,  hidden: false },
  { icon: '🏅', label: 'Régulier',       desc: '20 signalements',         unlocked: (v: number, t: number) => t >= 20, hidden: true  },
  { icon: '🏆', label: 'Champion',       desc: '25 signalements validés', unlocked: (v: number, t: number) => v >= 25, hidden: true  },
  { icon: '💚', label: 'Ambassadeur',    desc: '50 signalements',         unlocked: (v: number, t: number) => t >= 50, hidden: true  },
  { icon: '🦸', label: 'Premier héros',  desc: 'Premier signalement',     unlocked: (v: number, t: number) => t >= 1,  hidden: true  },
  { icon: '👑', label: 'Roi du quartier',desc: 'Top 1 du mois',           unlocked: (v: number, t: number) => v >= 15, hidden: true  },
  { icon: '⚡', label: 'Série de feu',   desc: '30 jours de suite',       unlocked: (v: number, t: number) => t >= 30, hidden: true  },
];

function CommunityProgressBar({ current, target, colors }: { current: number; target: number; colors: any }) {
  const anim = useRef(new Animated.Value(0)).current;
  const pct  = Math.min(current / target, 1);
  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 900, delay: 200, useNativeDriver: false }).start();
  }, [pct]);

  const MILESTONES = [0.25, 0.5, 0.75];

  return (
    <View style={{ marginTop: 12 }}>
      {/* Labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted }}>
          {current} / {target} signalements
        </Text>
        <Text style={{ fontSize: 13, fontWeight: '900', color: pct >= 1 ? colors.success : '#7B1FA2' }}>
          {Math.round(pct * 100)}%
        </Text>
      </View>

      {/* Bar with milestones */}
      <View style={{ height: 14, backgroundColor: colors.border, borderRadius: 7, overflow: 'visible', position: 'relative' }}>
        {/* Fill */}
        <Animated.View style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 7,
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          backgroundColor: pct >= 1 ? colors.success : '#7B1FA2',
          opacity: 0.85,
        }} />

        {/* Milestone dots */}
        {MILESTONES.map(m => {
          const reached = pct >= m;
          return (
            <View key={m} style={{
              position: 'absolute', top: -2, bottom: -2,
              left: `${m * 100}%` as any,
              width: 3, backgroundColor: reached ? '#fff' : colors.border,
              borderRadius: 2, zIndex: 2,
            }} />
          );
        })}
      </View>

      {/* Milestone labels */}
      <View style={{ flexDirection: 'row', marginTop: 4 }}>
        {MILESTONES.map(m => (
          <View key={m} style={{ position: 'absolute', left: `${m * 100 - 6}%` as any }}>
            <Text style={{ fontSize: 9, color: pct >= m ? '#7B1FA2' : colors.textMuted, fontWeight: '700' }}>
              {Math.round(m * target)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function ChallengesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const t = useT();
  const s = getStyles(colors);
  const { reports } = useWallet();
  const { user }    = useAuth();
  const [streak, setStreak] = useState(0);
  const [tab, setTab] = useState<'challenges' | 'badges' | 'quartier'>('challenges');
  const [refreshing, setRefreshing] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [neighborhoodChallenges, setNeighborhoodChallenges] = useState<NeighborhoodChallenge[]>([]);
  const [ncLoading, setNcLoading] = useState(true);
  const [claimed, setClaimed] = useState<Set<string>>(new Set());

  useEffect(() => { getStreak().then(setStreak); }, []);

  useEffect(() => {
    AsyncStorage.getItem('poubcoin_claimed').then(v => {
      if (v) setClaimed(new Set(JSON.parse(v)));
    });
  }, []);

  const claimReward = async (challengeId: string, coins: number) => {
    if (claimed.has(challengeId) || !user) return;
    try {
      const walletRef = doc(db, 'wallets', user.id);
      await updateDoc(walletRef, { balance: increment(coins) });
      await addDoc(collection(db, 'transactions', user.id, 'items'), {
        type: 'earned',
        amount: coins,
        label: `Défi complété — ${challengeId}`,
        date: new Date().toISOString(),
      });
      const newClaimed = new Set(claimed).add(challengeId);
      setClaimed(newClaimed);
      await AsyncStorage.setItem('poubcoin_claimed', JSON.stringify([...newClaimed]));
    } catch {
      Alert.alert('Erreur', 'Impossible de réclamer la récompense. Réessayez.');
    }
  };

  const validated = reports.filter(r => r.status === 'validated').length;
  const total     = reports.length;

  useEffect(() => {
    const q = query(collection(db, 'challenges'), where('active', '==', true));
    const unsub = onSnapshot(q, snap => {
      setChallenges(snap.docs.map(d => ({ id: d.id, ...d.data() } as Challenge)));
    }, () => {
      setChallenges([]);
    });
    return unsub;
  }, []);

  // Seed a default neighborhood challenge if none exists for the user's city
  const seedNeighborhoodChallenge = async (city: string) => {
    const { getDocs } = await import('firebase/firestore');
    const q = query(collection(db, 'neighborhoodChallenges'), where('city', '==', city));
    const snap = await getDocs(q);
    if (snap.empty) {
      const { addDoc } = await import('firebase/firestore');
      await addDoc(collection(db, 'neighborhoodChallenges'), {
        city,
        title: `Défi ${city}`,
        description: `La communauté de ${city} s'unit pour signaler 50 déchets ce mois !`,
        emoji: '🏘️',
        target: 50,
        current: 0,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        reward: 75,
        active: true,
        participants: [],
      });
    }
  };

  useEffect(() => {
    if (!user?.city) return;
    seedNeighborhoodChallenge(user.city);
    const q = query(
      collection(db, 'neighborhoodChallenges'),
      where('city', '==', user.city),
      where('active', '==', true)
    );
    const unsub = onSnapshot(q, snap => {
      setNeighborhoodChallenges(snap.docs.map(d => ({ id: d.id, ...d.data() } as NeighborhoodChallenge)));
      setNcLoading(false);
    }, () => {
      setNcLoading(false);
    });
    return unsub;
  }, [user?.city]);

  const daysLeft = (deadline?: string) => {
    if (!deadline) return null;
    const d = new Date(deadline);
    const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
    return diff > 0 ? diff : 0;
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{t('challenges_title')}</Text>
          <Text style={s.headerSub}>{t('challenges_subtitle')}</Text>
        </View>
        <View style={s.streakBadge}>
          <Text style={s.streakFire}>🔥</Text>
          <Text style={s.streakNum}>{streak}</Text>
        </View>
      </View>

      {/* Streak card */}
      <View style={s.streakCard}>
        <View style={s.streakCardLeft}>
          <Text style={s.streakCardEmoji}>🔥</Text>
          <View>
            <Text style={s.streakCardTitle}>{streak} 🔥</Text>
            <Text style={s.streakCardSub}>{t('challenges_streak_sub')}</Text>
          </View>
        </View>
        <View style={s.streakDays}>
          {['L','M','M','J','V','S','D'].map((d, i) => {
            const done = i < streak;
            const today = i === streak;
            return (
              <View key={i} style={[s.streakDay, done && s.streakDayDone, today && s.streakDayToday]}>
                <Text style={[s.streakDayLetter, done && { color: '#fff' }, today && { color: colors.primary }]}>{d}</Text>
                {done && <Text style={s.streakDayCheck}>✓</Text>}
              </View>
            );
          })}
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {[
          { key: 'challenges', label: t('challenges_tab_challenges') },
          { key: 'badges',     label: t('challenges_tab_badges') },
          { key: 'quartier',   label: t('challenges_tab_neighborhood') },
        ].map(item => (
          <TouchableOpacity
            key={item.key}
            style={[s.tabBtn, tab === item.key && s.tabActive]}
            onPress={() => setTab(item.key as any)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === item.key }}
          >
            <Text style={[s.tabText, tab === item.key && s.tabTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); getStreak().then(setStreak).finally(() => setRefreshing(false)); }} colors={[colors.primary, colors.primaryLight]} tintColor={colors.primary} progressBackgroundColor={colors.surface} title="Actualisation..." titleColor={colors.textMuted} />}>

        {tab === 'challenges' && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{t('challenges_active')}</Text>
              <View style={s.sectionChip}>
                <Text style={s.sectionChipText}>{challenges.length}</Text>
              </View>
            </View>

            {challenges.length === 0 && (
              <View style={s.empty}>
                <Text style={{ fontSize: 40, marginBottom: 10 }}>🏆</Text>
                <Text style={s.emptyTitle}>{t('challenges_empty')}</Text>
                <Text style={s.emptyText}>{t('challenges_empty_sub')}</Text>
              </View>
            )}

            {challenges.map(c => {
              const done   = validated >= c.target;
              const pct    = Math.min((validated / c.target) * 100, 100);
              const left   = daysLeft(c.deadline);
              return (
                <View key={c.id} style={[s.missionCard, done && s.missionDone]}>
                  <View style={s.missionTop}>
                    <View style={[s.missionEmoji, done ? { backgroundColor: '#E8F5E9' } : { backgroundColor: '#FFF3E0' }]}>
                      <Text style={{ fontSize: 26 }}>{c.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.missionTitle}>{c.title}</Text>
                      <Text style={s.missionDesc}>{c.description}</Text>
                      {left !== null && (
                        <Text style={[s.deadline, left === 0 && { color: colors.error }]}>
                          {left === 0 ? t('challenges_expires_today') : `${left}j`}
                        </Text>
                      )}
                    </View>
                    <View style={[s.rewardChip, done ? { backgroundColor: '#E8F5E9' } : { backgroundColor: '#FFF8E1' }]}>
                      <Text style={[s.rewardText, done ? { color: colors.success } : { color: colors.gold }]}>+{c.reward}🪙</Text>
                    </View>
                  </View>
                  <View style={{ marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                      <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>
                        {Math.min(validated, c.target)} / {c.target} signalements validés
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: done ? colors.success : colors.primary }}>
                        {Math.round(pct)}%
                      </Text>
                    </View>
                    <View style={s.progressRow}>
                      <View style={s.progressBg}>
                        <View style={[s.progressFill, { width: `${pct}%` as any, backgroundColor: done ? colors.success : colors.primary }]} />
                      </View>
                    </View>
                  </View>
                  {done && !claimed.has(c.id) ? (
                    <TouchableOpacity
                      style={{ backgroundColor: '#FFD700', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'flex-start', marginTop: 8 }}
                      onPress={() => claimReward(c.id, c.reward)}
                    >
                      <Text style={{ color: '#7B5E00', fontWeight: '800', fontSize: 13 }}>🎁 {t('challenge_claim_reward')} +{c.reward} 🪙</Text>
                    </TouchableOpacity>
                  ) : done ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                      <Text style={{ color: colors.success, fontWeight: '700', fontSize: 13 }}>{t('challenges_claimed')}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </>
        )}

        {tab === 'badges' && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{t('challenges_badges_title')}</Text>
              <View style={s.sectionChip}>
                <Text style={s.sectionChipText}>
                  {BADGES.filter(b => b.unlocked(validated, total)).length}/{BADGES.length} {t('challenge_unlocked_count')}
                </Text>
              </View>
            </View>
            <View style={s.badgesGrid}>
              {BADGES.map(b => {
                const isUnlocked = b.unlocked(validated, total);
                const isHiddenLocked = b.hidden && !isUnlocked;
                return (
                  <View style={[s.collCard, isUnlocked ? s.collCardUnlocked : s.collCardLocked]} key={b.icon}>
                    {!isUnlocked && !isHiddenLocked && (
                      <View style={s.collLock}>
                        <Ionicons name="lock-closed" size={10} color="#9CA3AF" />
                      </View>
                    )}
                    {isHiddenLocked && (
                      <View style={{ position: 'absolute', top: 6, right: 6, backgroundColor: '#EAB308', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 }}>
                        <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800' }}>{t('challenges_secret')}</Text>
                      </View>
                    )}
                    <Text style={[s.collEmoji, !isUnlocked && { opacity: 0.35 }]}>
                      {isHiddenLocked ? '❓' : b.icon}
                    </Text>
                    <Text style={[s.collLabel, !isUnlocked && { color: colors.textMuted }]}>
                      {isHiddenLocked ? '???' : b.label}
                    </Text>
                    <Text style={[s.collDesc, !isUnlocked && { color: colors.border }]} numberOfLines={2}>
                      {isHiddenLocked ? t('challenges_secret_desc') : b.desc}
                    </Text>
                    {isUnlocked && (
                      <View style={s.collOwnedBadge}>
                        <Text style={s.collOwnedText}>✓</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {tab === 'quartier' && (
          <>
            {/* City header card */}
            <View style={s.cityHeaderCard}>
              <View style={s.cityHeaderLeft}>
                <Text style={{ fontSize: 32 }}>🏘️</Text>
                <View>
                  <Text style={s.cityHeaderTitle}>{user?.city ?? 'Votre ville'}</Text>
                  <Text style={s.cityHeaderSub}>
                    {neighborhoodChallenges.reduce((sum, nc) => sum + nc.participants.length, 0)} participant{neighborhoodChallenges.reduce((sum, nc) => sum + nc.participants.length, 0) !== 1 ? 's' : ''} au total
                  </Text>
                </View>
              </View>
              <View style={s.cityChip}>
                <Ionicons name="people" size={14} color={colors.primary} />
                <Text style={s.cityChipText}>{t('challenges_community')}</Text>
              </View>
            </View>

            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{t('challenges_neighborhood_title')}</Text>
              <View style={s.sectionChip}>
                <Text style={s.sectionChipText}>{neighborhoodChallenges.length} actif{neighborhoodChallenges.length !== 1 ? 's' : ''}</Text>
              </View>
            </View>

            {ncLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            ) : neighborhoodChallenges.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 32 }}>
                <Text style={{ fontSize: 48, marginBottom: 16 }}>🏘️</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 8 }}>
                  {t('challenge_none_for')} {user?.city || t('challenge_your_area')}
                </Text>
                <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 }}>
                  {t('challenges_neighborhood_empty')}
                </Text>
              </View>
            ) : null}

            {!ncLoading && neighborhoodChallenges.map(nc => {
              const pct = Math.min((nc.current / nc.target) * 100, 100);
              const left = daysLeft(nc.deadline);
              const hasContributed = user?.id ? nc.participants.includes(user.id) : false;
              const done = nc.current >= nc.target;

              return (
                <View key={nc.id} style={[s.missionCard, done && s.missionDone]}>
                  {done && (
                    <View style={s.doneOverlay}>
                      <Text style={s.doneStamp}>✓ {t('challenges_goal_achieved')}</Text>
                    </View>
                  )}

                  <View style={s.missionTop}>
                    <View style={[s.missionEmoji, { backgroundColor: done ? '#E8F5E9' : '#F3E5F5' }]}>
                      <Text style={{ fontSize: 26 }}>{nc.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.missionTitle}>{nc.title}</Text>
                      <Text style={s.missionDesc}>{nc.description}</Text>
                      {left !== null && (
                        <Text style={[s.deadline, left === 0 && { color: colors.error }]}>
                          {left === 0 ? t('challenges_expires_today') : `${left}j`}
                        </Text>
                      )}
                    </View>
                    <View style={[s.rewardChip, { backgroundColor: '#FFF8E1' }]}>
                      <Text style={[s.rewardText, { color: colors.gold }]}>+{nc.reward}🪙</Text>
                    </View>
                  </View>

                  {/* Community progress bar animée avec jalons */}
                  <CommunityProgressBar current={nc.current} target={nc.target} colors={colors} />

                  {/* Stats row */}
                  <View style={[s.ncStatsRow, { marginTop: 14, flexWrap: 'wrap' }]}>
                    <View style={s.ncStat}>
                      <Ionicons name="people-outline" size={13} color={colors.textMuted} />
                      <Text style={s.ncStatText}>{nc.participants.length} participant{nc.participants.length !== 1 ? 's' : ''}</Text>
                    </View>
                    <View style={s.ncStat}>
                      <Ionicons name="time-outline" size={13} color={left === 0 ? colors.error : colors.textMuted} />
                      <Text style={[s.ncStatText, left === 0 && { color: colors.error, fontWeight: '700' }]}>
                        {left === 0 ? 'Expire aujourd\'hui !' : `${left}j restants`}
                      </Text>
                    </View>
                    {hasContributed && (
                      <View style={[s.ncStat, { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }]}>
                        <Ionicons name="checkmark-circle" size={13} color={colors.success} />
                        <Text style={[s.ncStatText, { color: colors.success, fontWeight: '700' }]}>
                          Tu contribues · {validated} signalement{validated !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    )}
                    {!hasContributed && (
                      <TouchableOpacity
                        onPress={() => navigation.navigate('Camera')}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F3E5F5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}
                      >
                        <Ionicons name="camera-outline" size={13} color="#7B1FA2" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#7B1FA2' }}>Rejoindre le défi</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any): any => ({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: -0.3 },
  headerSub:   { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,215,64,0.2)', borderRadius: radius.pill,
    paddingHorizontal: 13, paddingVertical: 8,
    borderWidth: 1.5, borderColor: 'rgba(255,215,64,0.35)',
  },
  streakFire: { fontSize: 18 },
  streakNum:  { color: '#FFE566', fontWeight: '900', fontSize: 18 },

  streakCard: {
    backgroundColor: colors.surface, marginHorizontal: 16, marginTop: 14,
    borderRadius: radius.lg, padding: 18, gap: 14,
    ...shadow.card, borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 4, borderLeftColor: colors.primary,
  },
  streakCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  streakCardEmoji: { fontSize: 30 },
  streakCardTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  streakCardSub:   { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  streakDays: { flexDirection: 'row', gap: 6 },
  streakDay: {
    flex: 1, aspectRatio: 1, borderRadius: 8,
    backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.borderLight,
  },
  streakDayDone:  { backgroundColor: colors.primary, borderColor: colors.primary },
  streakDayToday: { borderColor: colors.primary, borderWidth: 2 },
  streakDayLetter: { fontSize: 10, fontWeight: '700', color: colors.textMuted },
  streakDayCheck:  { fontSize: 9, color: '#fff' },

  tabs: {
    flexDirection: 'row', backgroundColor: colors.surface,
    marginHorizontal: 16, marginTop: 14,
    borderRadius: radius.md, padding: 5,
    ...shadow.xs, borderWidth: 1, borderColor: colors.borderLight,
  },
  tabBtn:       { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.sm },
  tabActive:    { backgroundColor: colors.primary },
  tabText:      { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  tabTextActive:{ color: '#fff' },

  list: { padding: 16, gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sectionTitle:  { fontSize: 16, fontWeight: '800', color: colors.text },
  sectionChip:   { backgroundColor: colors.background, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.border },
  sectionChipText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
  emptyText:  { fontSize: 13, color: colors.textMuted, marginTop: 4 },

  missionCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, gap: 12,
    ...shadow.card, borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden',
  },
  missionDone: { borderColor: '#C8E6C9' },
  doneOverlay: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: colors.success, borderRadius: radius.pill,
    paddingHorizontal: 10, paddingVertical: 4, zIndex: 1,
  },
  doneStamp: { color: '#fff', fontSize: 10, fontWeight: '800' },
  missionTop:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  missionEmoji: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  missionTitle: { fontSize: 15, fontWeight: '900', color: colors.text, marginBottom: 3 },
  missionDesc:  { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  deadline:     { fontSize: 11, color: colors.warning, marginTop: 3, fontWeight: '700' },
  rewardChip:   { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  rewardText:   { fontSize: 13, fontWeight: '900' },

  progressRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressBg:   { flex: 1, height: 10, backgroundColor: colors.background, borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  progressFill: { height: 10, borderRadius: 6 },
  progressLabel:{ fontSize: 12, fontWeight: '800', color: colors.textSecondary, minWidth: 36, textAlign: 'right' },

  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  collCard:         { width: (width - 52) / 3, borderRadius: radius.lg, padding: 12, alignItems: 'center', borderWidth: 1.5, marginBottom: 8, position: 'relative' },
  collCardUnlocked: { backgroundColor: colors.primaryGhost, borderColor: colors.primary },
  collCardLocked:   { backgroundColor: colors.surface, borderColor: colors.border },
  collEmoji:        { fontSize: 32, marginBottom: 6 },
  collLabel:        { fontSize: 11, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 2 },
  collDesc:         { fontSize: 9, color: colors.textMuted, textAlign: 'center', lineHeight: 13 },
  collLock:         { position: 'absolute', top: 6, right: 6 },
  collOwnedBadge:   { position: 'absolute', top: 6, left: 6, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  collOwnedText:    { color: '#fff', fontSize: 9, fontWeight: '800' },

  // Neighborhood tab
  cityHeaderCard: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
    ...shadow.card, borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 4, borderLeftColor: '#7B1FA2',
  },
  cityHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cityHeaderTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
  cityHeaderSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  cityChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primaryGhost, borderRadius: radius.pill,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  cityChipText: { fontSize: 11, color: colors.primary, fontWeight: '700' },

  ncStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  ncStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ncStatText: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
});
