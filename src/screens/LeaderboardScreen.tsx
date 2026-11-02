import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, SafeAreaView,
  TouchableOpacity, Image, Animated, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { shadow, radius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useT } from '../i18n/useT';

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(30)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 280, delay: index * 45, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(translateX, { toValue: 0, duration: 280, delay: index * 45, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateX }] }}>
      {children}
    </Animated.View>
  );
}

type Period = 'week' | 'month' | 'all';

interface LBEntry { userId: string; name: string; city: string; avatar: string; reports: number; coins: number; }

export default function LeaderboardScreen({ navigation }: any) {
  const { colors } = useTheme();
  const t = useT();
  const styles = getStyles(colors);

  const PERIODS: { key: Period; label: string; icon: string }[] = [
    { key: 'week',  label: t('period_week'),  icon: 'today'    },
    { key: 'month', label: t('period_month'), icon: 'calendar' },
    { key: 'all',   label: t('period_total'), icon: 'trophy'   },
  ];

  const MEDALS = [
    { icon: 'trophy',  color: '#FFD700', bg: '#FFF8E1', label: t('lb_rank1') },
    { icon: 'medal',   color: '#9E9E9E', bg: '#F5F5F5', label: t('lb_rank2') },
    { icon: 'ribbon',  color: '#CD7F32', bg: '#FBE9E7', label: t('lb_rank3') },
  ];
  const { reports } = useWallet();
  const { user }    = useAuth();
  const [period, setPeriod] = useState<Period>('month');
  const [leaderboard, setLeaderboard] = useState<LBEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(true);

  useEffect(() => {
    // Build leaderboard from all reports
    const unsub = onSnapshot(collection(db, 'reports'), snap => {
      const byUser: Record<string, LBEntry> = {};
      const now = new Date();
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.status !== 'validated') return;
        const rawDate = data.date;
        const date = rawDate?.toDate ? rawDate.toDate() : new Date(rawDate ?? 0);
        if (period === 'week') {
          const diff = (now.getTime() - date.getTime()) / 86400000;
          if (diff > 7) return;
        } else if (period === 'month') {
          if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) return;
        }
        const uid = data.userId;
        if (!byUser[uid]) {
          byUser[uid] = { userId: uid, name: data.userName ?? 'Citoyen', city: data.address?.split(',').slice(-1)[0]?.trim() ?? '', avatar: '🌱', reports: 0, coins: 0 };
        }
        byUser[uid].reports++;
        byUser[uid].coins += (data.coins ?? 50);
      });
      const sorted = Object.values(byUser).sort((a, b) => b.reports - a.reports);
      setLeaderboard(sorted);
      setLbLoading(false);
    }, () => {
      setLbLoading(false);
    });
    return unsub;
  }, [period]);

  const myValidated = reports.filter(r => r.status === 'validated').length;
  const myRank      = leaderboard.findIndex(u => u.userId === user?.id) + 1 || leaderboard.length + 1;

  // Podium bar scale animations (heights: 1st=110, 2nd=80, 3rd=60)
  const podiumAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    if (leaderboard.length >= 3) {
      Animated.stagger(120, podiumAnims.map(a =>
        Animated.spring(a, { toValue: 1, tension: 50, friction: 7, useNativeDriver: Platform.OS !== 'web' })
      )).start();
    }
  }, [leaderboard.length >= 3]);

  const board = leaderboard;
  const top3 = board.slice(0, 3);
  const rest  = board.slice(3);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerCircle} />
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerIcon}>
          <Ionicons name="trophy" size={22} color={colors.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('nav_leaderboard')}</Text>
          <Text style={styles.headerSub}>{t('lb_subtitle')}</Text>
        </View>
        <View style={styles.headerBadge}>
          <Ionicons name="people" size={13} color="rgba(255,255,255,0.8)" />
          <Text style={styles.headerBadgeText}>{leaderboard.length} actifs</Text>
        </View>
        <TouchableOpacity
          style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
          onPress={() => navigation.navigate('CityLeaderboard')}
        >
          <Text style={{ fontSize: 20 }}>🗺️</Text>
        </TouchableOpacity>
      </View>

      {/* Period selector */}
      <View style={styles.periodRow}>
        {PERIODS.map(p => {
          const active = period === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              style={[styles.periodBtn, active && styles.periodBtnActive]}
              onPress={() => setPeriod(p.key)}
            >
              <Ionicons name={p.icon as any} size={14} color={active ? '#fff' : colors.textSecondary} />
              <Text style={[styles.periodText, active && styles.periodTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {lbLoading && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>Chargement du classement...</Text>
        </View>
      )}
      {!lbLoading && board.length === 0 && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 40 }}>
          <Text style={{ fontSize: 56 }}>🏆</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' }}>{t('lb_empty')}</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 }}>
            {t('lb_empty_sub')}
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, marginTop: 8 }}
            onPress={() => navigation.navigate('Camera')}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>{t('lb_report_btn')}</Text>
          </TouchableOpacity>
        </View>
      )}
      {board.length > 0 && <FlatList
        data={rest}
        keyExtractor={item => item.userId}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Simple top cards when 1-2 players */}
            {top3.length > 0 && top3.length < 3 && (
              <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
                {top3.map((p, i) => {
                  const medal = MEDALS[i];
                  const isMe = p.userId === user?.id;
                  return (
                    <TouchableOpacity
                      key={p.userId}
                      activeOpacity={0.85}
                      onPress={() => !isMe && navigation.navigate('PublicProfile', { userId: p.userId, userName: p.name, userCity: p.city })}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        backgroundColor: colors.surface, borderRadius: 14,
                        padding: 14, borderWidth: 2, borderColor: medal.color + '50',
                      }}
                    >
                      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: medal.bg, borderWidth: 2.5, borderColor: medal.color, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontSize: 26 }}>{p.avatar}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{p.name}</Text>
                        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{p.reports} signalements validés</Text>
                      </View>
                      <View style={{ backgroundColor: medal.bg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center' }}>
                        <Ionicons name={medal.icon as any} size={16} color={medal.color} />
                        <Text style={{ fontSize: 11, fontWeight: '900', color: medal.color, marginTop: 2 }}>{medal.label}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Podium — only when 3+ players */}
            {top3.length >= 3 && <View style={styles.podiumSection}>
              {/* 2nd */}
              <TouchableOpacity style={[styles.podiumCol, { marginTop: 30 }]} onPress={() => top3[1] && navigation.navigate('PublicProfile', { userId: top3[1].userId, userName: top3[1].name, userCity: top3[1].city })}>
                <View style={[styles.podiumAvatarBox, { borderColor: MEDALS[1].color, backgroundColor: MEDALS[1].bg }]}>
                  <Text style={styles.podiumAvatarEmoji}>{top3[1]?.avatar ?? '?'}</Text>
                </View>
                <View style={[styles.medalBox, { backgroundColor: MEDALS[1].bg }]}>
                  <Ionicons name={MEDALS[1].icon as any} size={14} color={MEDALS[1].color} />
                  <Text style={[styles.medalLabel, { color: MEDALS[1].color }]}>{MEDALS[1].label}</Text>
                </View>
                <Text style={styles.podiumName}>{top3[1]?.name?.split(' ')[0] ?? '—'}</Text>
                <View style={styles.podiumStats}>
                  <Ionicons name="location" size={11} color={colors.textMuted} />
                  <Text style={styles.podiumReports}>{top3[1]?.reports ?? 0}</Text>
                </View>
                <Animated.View style={[styles.podiumBase, { height: podiumAnims[1].interpolate({ inputRange: [0, 1], outputRange: [0, 80] }), backgroundColor: MEDALS[1].color + '30', borderTopColor: MEDALS[1].color, overflow: 'hidden' }]}>
                  <Text style={[styles.podiumRankNum, { color: MEDALS[1].color }]}>2</Text>
                </Animated.View>
              </TouchableOpacity>

              {/* 1st */}
              <TouchableOpacity style={styles.podiumCol} onPress={() => top3[0] && navigation.navigate('PublicProfile', { userId: top3[0].userId, userName: top3[0].name, userCity: top3[0].city })}>
                <View style={styles.crownRow}>
                  <Ionicons name="trophy" size={24} color={colors.gold} />
                </View>
                <View style={[styles.podiumAvatarBox, styles.podiumAvatarFirst, { borderColor: MEDALS[0].color, backgroundColor: MEDALS[0].bg }]}>
                  <Text style={[styles.podiumAvatarEmoji, { fontSize: 36 }]}>{top3[0]?.avatar ?? '🏆'}</Text>
                </View>
                <View style={[styles.medalBox, { backgroundColor: MEDALS[0].bg }]}>
                  <Ionicons name={MEDALS[0].icon as any} size={14} color={MEDALS[0].color} />
                  <Text style={[styles.medalLabel, { color: MEDALS[0].color }]}>{MEDALS[0].label}</Text>
                </View>
                <Text style={[styles.podiumName, { fontSize: 15, fontWeight: '800' }]}>{top3[0]?.name?.split(' ')[0] ?? '—'}</Text>
                <View style={styles.podiumStats}>
                  <Ionicons name="location" size={11} color={colors.textMuted} />
                  <Text style={styles.podiumReports}>{top3[0]?.reports ?? 0}</Text>
                </View>
                <Animated.View style={[styles.podiumBase, { height: podiumAnims[0].interpolate({ inputRange: [0, 1], outputRange: [0, 110] }), backgroundColor: MEDALS[0].color + '30', borderTopColor: MEDALS[0].color, overflow: 'hidden' }]}>
                  <Text style={[styles.podiumRankNum, { color: MEDALS[0].color, fontSize: 28 }]}>1</Text>
                </Animated.View>
              </TouchableOpacity>

              {/* 3rd */}
              <TouchableOpacity style={[styles.podiumCol, { marginTop: 50 }]} onPress={() => top3[2] && navigation.navigate('PublicProfile', { userId: top3[2].userId, userName: top3[2].name, userCity: top3[2].city })}>
                <View style={[styles.podiumAvatarBox, { borderColor: MEDALS[2].color, backgroundColor: MEDALS[2].bg }]}>
                  <Text style={styles.podiumAvatarEmoji}>{top3[2]?.avatar ?? '🥉'}</Text>
                </View>
                <View style={[styles.medalBox, { backgroundColor: MEDALS[2].bg }]}>
                  <Ionicons name={MEDALS[2].icon as any} size={14} color={MEDALS[2].color} />
                  <Text style={[styles.medalLabel, { color: MEDALS[2].color }]}>{MEDALS[2].label}</Text>
                </View>
                <Text style={styles.podiumName}>{top3[2]?.name?.split(' ')[0] ?? '—'}</Text>
                <View style={styles.podiumStats}>
                  <Ionicons name="location" size={11} color={colors.textMuted} />
                  <Text style={styles.podiumReports}>{top3[2]?.reports ?? 0}</Text>
                </View>
                <Animated.View style={[styles.podiumBase, { height: podiumAnims[2].interpolate({ inputRange: [0, 1], outputRange: [0, 60] }), backgroundColor: MEDALS[2].color + '30', borderTopColor: MEDALS[2].color, overflow: 'hidden' }]}>
                  <Text style={[styles.podiumRankNum, { color: MEDALS[2].color }]}>3</Text>
                </Animated.View>
              </TouchableOpacity>
            </View>}

            {/* My rank — hidden if user is already visible in top cards */}
            {myRank > top3.length && <View style={styles.myRankCard}>
              <View style={styles.myRankLeft}>
                <View style={styles.myRankIcon}>
                  {user?.photoURL
                    ? <Image source={{ uri: user.photoURL }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                    : <Text style={{ fontSize: 22 }}>{user?.avatar ?? '🌱'}</Text>
                  }
                </View>
                <View>
                  <Text style={styles.myRankName}>{user?.name?.split(' ')[0] ?? t('lb_you')}</Text>
                  <View style={styles.myRankMeta}>
                    <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.myRankSub}>{myValidated} {t('stats_validated_count').toLowerCase()}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.myRankRight}>
                <View style={styles.myRankBadge}>
                  <Ionicons name="podium" size={14} color={colors.gold} />
                  <Text style={styles.myRankNum}>#{myRank}</Text>
                </View>
              </View>
            </View>}

            {/* City comparison */}
            {leaderboard.length > 1 && (() => {
              const totalUsers = leaderboard.length;
              const myIdx = leaderboard.findIndex(u => u.userId === user?.id);
              const topPct = myIdx >= 0 ? Math.round((1 - myIdx / totalUsers) * 100) : null;
              if (topPct === null) return null;
              return (
                <View style={styles.percentileCard}>
                  <View style={styles.percentileLeft}>
                    <Text style={styles.percentileEmoji}>📊</Text>
                    <View>
                      <Text style={styles.percentileTitle}>{t('lb_my_position')}</Text>
                      <Text style={styles.percentileSub}>
                        {topPct <= 10 ? '🏅 Top élite !' : topPct <= 25 ? '🔥 Très actif' : topPct <= 50 ? '👍 Au-dessus de la moyenne' : 'Continue tes efforts !'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.percentileRight}>
                    <Text style={styles.percentileNum}>Top {topPct}%</Text>
                  </View>
                </View>
              );
            })()}

            {rest.length > 0 && <Text style={styles.restTitle}>
              <Ionicons name="list" size={14} color={colors.textSecondary} /> {t('lb_rest')}
            </Text>}
          </>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item, index }) => {
          const isMe = item.userId === user?.id;
          return (
            <AnimatedListItem index={index}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => !isMe && navigation.navigate('PublicProfile', { userId: item.userId, userName: item.name, userCity: item.city })}
                style={[
                  styles.listItem,
                  isMe && { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primaryGhost ?? '#E8F5E9' },
                ]}
              >
                {isMe && (
                  <View style={{ position: 'absolute', top: -1, right: 10, backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>MOI</Text>
                  </View>
                )}
                <View style={[styles.rankBox, isMe && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                  <Text style={[styles.rankNum, isMe && { color: '#fff' }]}>#{index + 4}</Text>
                </View>
                <View style={styles.listAvatar}>
                  <Text style={{ fontSize: 22 }}>{item.avatar}</Text>
                </View>
                <View style={styles.listInfo}>
                  <Text style={[styles.listName, isMe && { color: colors.primary }]}>{item.name}</Text>
                  <View style={styles.listMeta}>
                    <Ionicons name="location-outline" size={11} color={colors.textMuted} />
                    <Text style={styles.listCity}>{item.city}</Text>
                  </View>
                </View>
                <View style={styles.listRight}>
                  <View style={styles.listReportsBox}>
                    <Ionicons name="camera" size={11} color={colors.info} />
                    <Text style={styles.listReports}>{item.reports}</Text>
                  </View>
                  <View style={styles.listCoinsBox}>
                    <Ionicons name="wallet" size={11} color={colors.gold} />
                    <Text style={styles.listCoins}>{item.coins}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </AnimatedListItem>
          );
        }}
      />}
    </SafeAreaView>
  );
}

const getStyles = (colors: any): any => ({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary, paddingHorizontal: 20,
    paddingTop: 20, paddingBottom: 22,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    overflow: 'hidden',
  },
  headerCircle: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -40,
  },
  headerIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: -0.3 },
  headerSub: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,215,64,0.2)', borderRadius: radius.pill,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1.5, borderColor: 'rgba(255,215,64,0.35)',
  },
  headerBadgeText: { color: '#FFE566', fontSize: 12, fontWeight: '800' },

  periodRow: {
    flexDirection: 'row', backgroundColor: colors.surface,
    padding: 10, gap: 8, justifyContent: 'center',
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  periodBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 22, backgroundColor: colors.background,
    borderWidth: 1.5, borderColor: colors.border,
  },
  periodBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodText: { fontWeight: '700', color: colors.textSecondary, fontSize: 13 },
  periodTextActive: { color: '#fff' },

  podiumSection: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
    backgroundColor: colors.surface, paddingTop: 20, paddingHorizontal: 8, gap: 6,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  podiumCol: { flex: 1, alignItems: 'center' },
  crownRow: { marginBottom: 4 },
  podiumAvatarBox: {
    width: 60, height: 60, borderRadius: 30,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, marginBottom: 6,
  },
  podiumAvatarFirst: { width: 72, height: 72, borderRadius: 36 },
  podiumAvatarEmoji: { fontSize: 28 },
  medalBox: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4,
  },
  medalLabel: { fontSize: 11, fontWeight: '800' },
  podiumName: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 3 },
  podiumStats: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  podiumReports: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  podiumBase: {
    width: '100%', borderTopWidth: 2,
    justifyContent: 'center', alignItems: 'center', paddingVertical: 8,
  },
  podiumRankNum: { fontSize: 22, fontWeight: '900' },

  myRankCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.primary, margin: 16, borderRadius: radius.lg,
    padding: 18, ...shadow.lg,
  },
  myRankLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  myRankIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  myRankName: { color: '#fff', fontWeight: '800', fontSize: 16 },
  myRankMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  myRankSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  myRankRight: {},
  myRankBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  myRankNum: { color: '#fff', fontWeight: '900', fontSize: 18 },

  percentileCard: {
    backgroundColor: colors.surface, marginHorizontal: 16, marginBottom: 12,
    borderRadius: radius.lg, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: colors.border, ...shadow.xs,
  },
  percentileLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  percentileEmoji: { fontSize: 28 },
  percentileTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  percentileSub:   { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  percentileRight: {},
  percentileNum:   { fontSize: 28, fontWeight: '900', color: colors.primary },
  restTitle: {
    fontSize: 13, fontWeight: '700', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginHorizontal: 16, marginTop: 4, marginBottom: 8,
  },
  listItem: {
    backgroundColor: colors.surface, marginHorizontal: 16, marginBottom: 8,
    borderRadius: radius.lg, padding: 13,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    ...shadow.sm, borderWidth: 1, borderColor: colors.border,
  },
  rankBox: {
    width: 34, height: 34, borderRadius: 11,
    backgroundColor: colors.background,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  rankNum: { fontSize: 12, fontWeight: '800', color: colors.textSecondary },
  listAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.background,
    justifyContent: 'center', alignItems: 'center',
  },
  listInfo: { flex: 1 },
  listName: { fontSize: 14, fontWeight: '700', color: colors.text },
  listMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  listCity: { fontSize: 11, color: colors.textMuted },
  listRight: { alignItems: 'flex-end', gap: 4 },
  listReportsBox: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#E3F2FD', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3,
  },
  listReports: { fontSize: 12, color: colors.info, fontWeight: '700' },
  listCoinsBox: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF8E1', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3,
  },
  listCoins: { fontSize: 12, color: colors.gold, fontWeight: '700' },
});
