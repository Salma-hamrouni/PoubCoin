import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, SafeAreaView,
  Animated, Platform, RefreshControl, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, query, orderBy, where, limit, limitToLast } from 'firebase/firestore';
import { db } from '../firebase';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { shadow, radius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useT } from '../i18n/useT';
import { getStreak } from '../utils/streaks';
import { loadWidgets, WidgetKey, ALL_NAV_TILES } from './PersonalizeScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { REWARDS } from '../data/sponsors';
import { hapticLight, hapticSuccess } from '../utils/haptics';
import { useToast } from '../context/ToastContext';
import { Skeleton } from '../components/Skeleton';

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Fallback missions used only when Firestore returns nothing
const FALLBACK_MISSIONS = [
  { zone: 'Médina',    desc: 'Signaler 3 dépôts près des souks',       reward: 150, emoji: '🕌' },
  { zone: 'Lac 1',    desc: 'Photographier les déchets autour du lac', reward: 200, emoji: '💧' },
  { zone: 'La Marsa', desc: 'Protéger la côte des déchets',           reward: 220, emoji: '🏖️' },
];

const LEVELS_BASE = [
  { key: 'level_beginner' as const, min: 0,   icon: '🌱', color: '#795548' },
  { key: 'level_citizen'  as const, min: 3,   icon: '🌿', color: '#388E3C' },
  { key: 'level_eco'      as const, min: 10,  icon: '🌳', color: '#1976D2' },
  { key: 'level_champion' as const, min: 25,  icon: '🏆', color: '#F57F17' },
  { key: 'level_legend'   as const, min: 100, icon: '⭐', color: '#6A1B9A' },
];

function getGreetingKey() {
  const h = new Date().getHours();
  if (h < 5)  return { key: 'greet_night'     as const, emoji: '🌙' };
  if (h < 12) return { key: 'greet_morning'   as const, emoji: '☀️' };
  if (h < 18) return { key: 'greet_afternoon' as const, emoji: '🌤️' };
  return       { key: 'greet_evening'         as const, emoji: '🌙' };
}

// Animated card wrapper — on web start visible to avoid blank cards
function FadeSlideCard({ delay = 0, children, style }: { delay?: number; children: React.ReactNode; style?: any }) {
  const isWeb = Platform.OS === 'web';
  const anim = useRef(new Animated.Value(isWeb ? 1 : 0)).current;
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });

  useEffect(() => {
    if (isWeb) return;
    Animated.timing(anim, {
      toValue: 1, duration: 420, delay,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity: anim, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

export default function HomeScreen({ navigation }: any) {
  const { colors, language } = useTheme();
  const t = useT();
  const MONTHS = language === 'ar' ? MONTHS_AR : language === 'en' ? MONTHS_EN : MONTHS_FR;
  const s = getStyles(colors);
  const { balance, reports, newlyValidated, clearNewlyValidated, dailyBonus, clearDailyBonus } = useWallet();
  const { user } = useAuth();
  const { showToast } = useToast();

  // Days remaining until end of week (for mission countdown)
  const daysLeftInWeek = useMemo(() => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    return day === 0 ? 0 : 7 - day;
  }, []);

  const [ready, setReady] = useState(false);
  const [streak, setStreak] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [firestoreMission, setFirestoreMission] = useState<{ zone: string; desc: string; reward: number; emoji: string } | null>(null);
  const [widgets, setWidgets] = useState<Record<WidgetKey, boolean>>({ widget_mission: true, widget_streak: true, widget_stats: true, widget_monthly: true, widget_city: false });
  const [hiddenTiles, setHiddenTiles] = useState<Set<string>>(new Set());
  const [pinnedTiles, setPinnedTiles] = useState<string[]>([]);
  const [homeCols, setHomeCols] = useState<2 | 3 | 4>(3);

  useEffect(() => { getStreak().then(setStreak); }, []);
  useEffect(() => { const t = setTimeout(() => setReady(true), 600); return () => clearTimeout(t); }, []);

  // Reload widget prefs every time screen is focused
  useEffect(() => {
    const reload = () => {
      loadWidgets().then(setWidgets);
      AsyncStorage.getItem('@poubcoin_hidden_tiles').then(v => { if (v) setHiddenTiles(new Set(JSON.parse(v))); });
      AsyncStorage.getItem('@poubcoin_pinned_tiles').then(v => { if (v) setPinnedTiles(JSON.parse(v)); });
      AsyncStorage.getItem('@poubcoin_home_cols').then(v => { if (v) setHomeCols(parseInt(v) as 2 | 3 | 4); });
    };
    reload();
    const unsub = navigation.addListener?.('focus', reload);
    return unsub;
  }, [navigation]);

  // Load active challenge from Firestore as the weekly mission
  useEffect(() => {
    const q = query(collection(db, 'challenges'), where('active', '==', true), limit(1));
    return onSnapshot(q, snap => {
      if (!snap.empty) {
        const d = snap.docs[0].data();
        setFirestoreMission({
          zone:   d.zone ?? d.title ?? 'Tunis',
          desc:   d.description ?? d.desc ?? '',
          reward: d.reward ?? 100,
          emoji:  d.emoji ?? '♻️',
        });
      }
    }, () => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(100));
    return onSnapshot(q, snap => {
      const count = snap.docs.filter(d => !((d.data().readBy ?? []) as string[]).includes(user.id)).length;
      setUnreadCount(count);
    }, () => {});
  }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await getStreak().then(setStreak);
    setRefreshing(false);
  };

  const validated = reports.filter(r => r.status === 'validated').length;
  const pending   = reports.filter(r => r.status === 'pending').length;
  const LEVELS    = LEVELS_BASE.map(l => ({ ...l, name: t(l.key) }));
  const level     = [...LEVELS].reverse().find(l => validated >= l.min) ?? LEVELS[0];
  const nextLevel = LEVELS[LEVELS.indexOf(level) + 1];
  const progress  = nextLevel && nextLevel.min > level.min ? ((validated - level.min) / (nextLevel.min - level.min)) * 100 : 100;
  const greetKey  = getGreetingKey();
  const greeting  = { text: t(greetKey.key), emoji: greetKey.emoji };

  const weekNum = Math.floor(Date.now() / (7 * 24 * 3600 * 1000));
  const mission = firestoreMission ?? FALLBACK_MISSIONS[weekNum % FALLBACK_MISSIONS.length];

  // Navigate to Victory screen when a report is newly validated
  useEffect(() => {
    if (newlyValidated) {
      clearNewlyValidated();
      navigation.navigate('Victory', { report: newlyValidated });
    }
  }, [newlyValidated, clearNewlyValidated, navigation]);

  // Animated progress bar
  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: Math.min(progress, 100) / 100,
      duration: 900, delay: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // Animated coin counter
  const coinAnim = useRef(new Animated.Value(balance)).current;
  const prevBalance = useRef(balance);
  useEffect(() => {
    if (prevBalance.current !== balance) {
      Animated.timing(coinAnim, { toValue: balance, duration: 600, useNativeDriver: false }).start();
      prevBalance.current = balance;
    }
  }, [balance]);

  // Next reward the user can't yet afford
  const nextReward = REWARDS
    .filter(r => r.coins > balance)
    .sort((a, b) => a.coins - b.coins)[0] ?? null;
  const rewardProgress = nextReward ? Math.min(balance / nextReward.coins, 1) : 1;
  const rewardProgressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(rewardProgressAnim, { toValue: rewardProgress, duration: 900, delay: 500, useNativeDriver: false }).start();
  }, [rewardProgress]);

  return (
    <SafeAreaView style={s.root}>
      {/* Daily bonus popup */}
      <Modal visible={!!dailyBonus} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 24, padding: 28, alignItems: 'center', width: '100%', maxWidth: 320 }}>
            <Text style={{ fontSize: 56, marginBottom: 12 }}>{dailyBonus?.isStreak7 ? '🎉' : '☀️'}</Text>
            <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text, marginBottom: 6 }}>
              {dailyBonus?.isStreak7 ? 'Bonus semaine !' : 'Bonus quotidien'}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', marginBottom: 20 }}>
              {dailyBonus?.isStreak7
                ? '🔥 7 jours consécutifs ! Récompense double !'
                : `Jour ${dailyBonus?.day ?? 1} de ta série — reviens demain pour continuer !`}
            </Text>
            <View style={{ backgroundColor: colors.primary + '18', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 10, marginBottom: 20, borderWidth: 1, borderColor: colors.primary + '40' }}>
              <Text style={{ fontSize: 32, fontWeight: '900', color: colors.primary }}>+{dailyBonus?.coins} 🪙</Text>
            </View>
            {/* Day progress dots */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
              {[1,2,3,4,5,6,7].map(d => (
                <View key={d} style={{
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: d <= (dailyBonus?.day ?? 1) ? colors.primary : colors.border,
                  justifyContent: 'center', alignItems: 'center',
                }}>
                  <Text style={{ fontSize: 10, color: d <= (dailyBonus?.day ?? 1) ? '#fff' : colors.textMuted }}>
                    {d === 7 ? '🎁' : d.toString()}
                  </Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              onPress={clearDailyBonus}
              style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40 }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Super ! 🙌</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary, colors.primaryLight]} tintColor={colors.primary} progressBackgroundColor={colors.surface} title="Actualisation..." titleColor={colors.textMuted} />}
      >

        {/* ── Header premium ── */}
        <LinearGradient
          colors={[colors.primary, colors.primaryLight]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={s.header}
        >
          {/* Decorative circles */}
          <View style={s.headerCircle1} />
          <View style={s.headerCircle2} />

          <View style={s.headerTop}>
            <View style={s.headerLeft}>
              <Text style={s.greeting}>{greeting.emoji} {greeting.text},</Text>
              <Text style={s.name}>{user?.name?.split(' ')[0] ?? 'Citoyen'} 👋</Text>
              {user?.city ? (
                <View style={s.cityPill}>
                  <Ionicons name="location" size={11} color="rgba(255,255,255,0.8)" />
                  <Text style={s.cityText}>{user.city}</Text>
                </View>
              ) : null}
            </View>
            <View style={s.headerBtns}>
              <TouchableOpacity style={s.headerBtn} onPress={() => navigation.navigate('Notifications')}
                accessibilityLabel={`Notifications${unreadCount > 0 ? `, ${unreadCount} non lues` : ''}`} accessibilityRole="button">
                <Ionicons name="notifications-outline" size={20} color="#fff" />
                {unreadCount > 0 && (
                  <View style={[s.dot, { backgroundColor: '#EF4444', minWidth: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 }]}>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={s.headerBtn} onPress={() => navigation.navigate('History')}
                accessibilityLabel="Historique des signalements" accessibilityRole="button">
                <Ionicons name="time-outline" size={20} color="#fff" />
                {pending > 0 && <View style={s.dot} />}
              </TouchableOpacity>
              <TouchableOpacity style={s.headerBtn} onPress={() => navigation.navigate('Chatbot')}
                accessibilityLabel="Assistant PoubCoin" accessibilityRole="button">
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Level progress in header */}
          <View style={s.levelRow}>
            <View style={s.levelInfo}>
              <Text style={s.levelLabel}>{level.icon} {level.name}</Text>
              {nextLevel && (
                <Text style={s.levelNext}>→ {nextLevel.icon} {nextLevel.name} ({validated}/{nextLevel.min})</Text>
              )}
            </View>
            <View style={s.balancePill}>
              <Text style={s.balancePillNum}>{balance}</Text>
              <Text style={s.balancePillUnit}>🪙</Text>
            </View>
          </View>

          {nextLevel && (
            <View style={s.headerProgress}>
              <Animated.View style={[s.headerProgressFill, {
                width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) as any,
              }]} />
            </View>
          )}
        </LinearGradient>

        {/* ── Streak banner ── */}
        {streak > 0 && widgets.widget_streak && (
          <View style={s.streakBanner}>
            <Text style={s.streakFire}>🔥</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.streakText}>{streak} {t('home_streak_text')}</Text>
              <Text style={s.streakSub}>{t('home_streak_sub')}</Text>
              {/* Last 7 days dots */}
              <View style={{ flexDirection: 'row', gap: 5, marginTop: 6 }}>
                {Array.from({ length: 7 }).map((_, i) => {
                  const active = i < Math.min(streak, 7);
                  return (
                    <View key={i} style={{
                      width: 22, height: 22, borderRadius: 11,
                      backgroundColor: active ? '#F97316' : 'rgba(0,0,0,0.08)',
                      justifyContent: 'center', alignItems: 'center',
                    }}>
                      {active && <Text style={{ fontSize: 10 }}>🔥</Text>}
                    </View>
                  );
                })}
              </View>
            </View>
            {(() => {
              const day = new Date().getDay();
              if (day === 0 || day === 6) {
                return (
                  <View style={{ backgroundColor:'#FEF3C7', borderRadius:12, paddingHorizontal:10, paddingVertical:4, borderWidth:1, borderColor:'#FDE68A' }}>
                    <Text style={{ fontSize:11, fontWeight:'700', color:'#B45309' }}>{t('home_streak_weekend')}</Text>
                  </View>
                );
              }
              return null;
            })()}
          </View>
        )}

        {/* ── Stats row ── */}
        {!ready && (
          <View style={{ flexDirection: 'row', marginHorizontal: 16, marginTop: 14, gap: 10 }}>
            {[0,1,2].map(i => (
              <View key={i} style={[s.statBox, { borderTopColor: colors.border, flex: 1, gap: 8 }]}>
                <Skeleton width={32} height={32} borderRadius={10} />
                <Skeleton width="60%" height={18} />
                <Skeleton width="80%" height={11} />
              </View>
            ))}
          </View>
        )}
        {widgets.widget_stats && ready && <FadeSlideCard delay={80}>
          <View style={{ flexDirection: 'row', marginHorizontal: 16, marginTop: 14, gap: 10 }}>
            {[
              { label: t('home_stats_total'),     value: reports.length, icon: 'camera',           color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
              { label: t('home_stats_validated'), value: validated,      icon: 'checkmark-circle', color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
              { label: t('status_pending'),       value: pending,        icon: 'time',             color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
            ].map(st => (
              <View key={st.label} style={[s.statBox, { backgroundColor: st.bg, borderColor: st.border }]}>
                <View style={[s.statIconBox, { backgroundColor: st.color + '20' }]}>
                  <Ionicons name={st.icon as any} size={18} color={st.color} />
                </View>
                <Text style={[s.statNum, { color: st.color }]}>{st.value}</Text>
                <Text style={[s.statLabel, { color: st.color + 'AA' }]}>{st.label}</Text>
              </View>
            ))}
          </View>
        </FadeSlideCard>}

        {/* ── Prochaine récompense ── */}
        {!ready && (
          <View style={{ marginHorizontal: 16, marginTop: 14, backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Skeleton width={40} height={40} borderRadius={10} />
              <View style={{ gap: 6, flex: 1 }}>
                <Skeleton width="30%" height={11} />
                <Skeleton width="55%" height={14} />
              </View>
              <Skeleton width={80} height={28} borderRadius={10} />
            </View>
            <Skeleton width="100%" height={6} borderRadius={3} />
            <Skeleton width="40%" height={11} />
          </View>
        )}
        {nextReward && ready && (
          <FadeSlideCard delay={120}>
            <TouchableOpacity
              style={{ marginHorizontal: 16, marginTop: 14, backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: colors.border, ...shadow.xs }}
              onPress={() => navigation.navigate('Marketplace')}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 22 }}>{nextReward.emoji}</Text>
                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5 }}>{t('home_next_reward')}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }} numberOfLines={1}>{nextReward.title}</Text>
                  </View>
                </View>
                <View style={{ backgroundColor: colors.primaryGhost, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.primary + '30' }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>{balance}/{nextReward.coins} 🪙</Text>
                </View>
              </View>
              <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' }}>
                <Animated.View style={{
                  height: 6, borderRadius: 3, backgroundColor: colors.primary,
                  width: rewardProgressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) as any,
                }} />
              </View>
              <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 6 }}>
                {nextReward.coins - balance} {t('home_coins_missing')}
              </Text>
            </TouchableOpacity>
          </FadeSlideCard>
        )}

        {/* ── Monthly report card ── */}
        {widgets.widget_monthly && (
          <FadeSlideCard delay={140}>
            <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('MonthlyReport')}
              style={{ marginHorizontal: 16, marginTop: 12, borderRadius: 16, overflow: 'hidden', ...shadow.sm }}>
              <LinearGradient colors={['#F0FDF4', '#E8F5E9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14, borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 16 }}>
                <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 24 }}>📊</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 0.8, textTransform: 'uppercase' }}>{t('home_monthly_title')}</Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 1 }}>{t('home_monthly_sub')} {MONTHS[new Date().getMonth()]}</Text>
                </View>
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </FadeSlideCard>
        )}

        {/* ── CTA ── */}
        <FadeSlideCard delay={150}>
          <TouchableOpacity onPress={() => { hapticSuccess(); navigation.navigate('Camera'); }} activeOpacity={0.88}
            style={{ marginHorizontal: 16, marginTop: 12, marginBottom: 4, borderRadius: radius.md, overflow: 'hidden', ...shadow.card }}
            accessibilityLabel="Signaler un déchet, gagner 50 coins après validation" accessibilityRole="button">
            <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.cta}>
              <View style={s.ctaIconWrap}>
                <Ionicons name="camera" size={26} color={colors.primary} />
              </View>
              <View style={s.ctaText}>
                <Text style={[s.ctaTitle, { color: '#fff' }]}>{t('home_report_btn')}</Text>
                <Text style={[s.ctaSub, { color: 'rgba(255,255,255,0.75)' }]}>{t('home_cta_sub')}</Text>
              </View>
              <View style={[s.ctaArrow, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </FadeSlideCard>

        {/* Mission secrète */}
        {!ready && (
          <View style={[s.missionCard, { gap: 12 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Skeleton width="40%" height={16} />
              <Skeleton width={60} height={24} borderRadius={10} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Skeleton width={44} height={44} borderRadius={10} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton width="70%" height={14} />
                <Skeleton width="90%" height={12} />
              </View>
            </View>
            <Skeleton width="100%" height={44} borderRadius={12} />
          </View>
        )}
        {widgets.widget_mission && ready && <FadeSlideCard delay={300} style={s.missionCard}>
          {/* Header row */}
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
              <View style={s.missionBadge}><Text style={{ fontSize:10, fontWeight:'800', color:'#fff', letterSpacing:1 }}>MISSION</Text></View>
              <Text style={s.missionWeek}>{t('home_mission_week')}</Text>
            </View>
            {daysLeftInWeek > 0 && (
              <View style={{ backgroundColor: daysLeftInWeek <= 2 ? '#FEF3C7' : '#F0FFF4', borderRadius:10, paddingHorizontal:8, paddingVertical:3, borderWidth:1, borderColor: daysLeftInWeek <= 2 ? '#FDE68A' : '#BBF7D0' }}>
                <Text style={{ fontSize:11, fontWeight:'700', color: daysLeftInWeek <= 2 ? '#B45309' : '#15803D' }}>
                  ⏳ {daysLeftInWeek}j restants
                </Text>
              </View>
            )}
          </View>

          {/* Content */}
          <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
            <Text style={{ fontSize:42 }}>{mission.emoji}</Text>
            <View style={{ flex:1 }}>
              <Text style={s.missionZone}>📍 {mission.zone}</Text>
              <Text style={s.missionDesc}>{mission.desc}</Text>
              <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginTop:8 }}>
                <View style={{ backgroundColor:'#1B6B3A22', borderRadius:8, paddingHorizontal:8, paddingVertical:3 }}>
                  <Text style={s.missionReward}>+{mission.reward} 🪙 bonus</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Weekly progress dots */}
          <View style={{ flexDirection:'row', gap:5, marginTop:14, marginBottom:4 }}>
            {[0,1,2,3,4,5,6].map(i => {
              const today = new Date().getDay();
              const adjustedToday = today === 0 ? 6 : today - 1; // Mon=0
              const adjustedI    = i;
              return (
                <View key={i} style={{
                  flex:1, height:4, borderRadius:2,
                  backgroundColor: adjustedI < adjustedToday ? '#1B6B3A' : adjustedI === adjustedToday ? '#4ADE80' : '#E4E8E4',
                }} />
              );
            })}
          </View>
          <Text style={{ fontSize:10, color:'#94A99A', marginBottom:10 }}>Lun · Mar · Mer · Jeu · Ven · Sam · Dim</Text>

          <TouchableOpacity style={s.missionBtn} onPress={() => { hapticLight(); navigation.navigate('Camera'); }}>
            <Ionicons name="camera" size={16} color="#fff" />
            <Text style={s.missionBtnText}>{t('home_mission_btn')}</Text>
          </TouchableOpacity>
        </FadeSlideCard>}

        {/* ── Navigation grid ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={s.sectionTitle}>{t('home_section_shortcuts')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Personalize')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="options-outline" size={15} color={colors.primary} />
            <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>{t('home_customize')}</Text>
          </TouchableOpacity>
        </View>
        <View style={s.navGrid}>
          {(() => {
            const visible = ALL_NAV_TILES.filter(t => !hiddenTiles.has(t.screen));
            const pinned  = visible.filter(t => pinnedTiles.includes(t.screen));
            const rest    = visible.filter(t => !pinnedTiles.includes(t.screen));
            const colWidth = homeCols === 2 ? '48%' : homeCols === 4 ? '22%' : '30%';
            if (visible.length === 0) return (
              <View style={{ width: '100%', alignItems: 'center', paddingVertical: 28, gap: 10 }}>
                <Ionicons name="grid-outline" size={36} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: 14, fontWeight: '600' }}>Aucun raccourci affiché</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Personalize')} style={{ backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Personnaliser</Text>
                </TouchableOpacity>
              </View>
            );
            return [...pinned, ...rest].map((a, i) => (
              <FadeSlideCard key={a.screen} delay={200 + i * 50} style={{ width: colWidth, flexGrow: 1 }}>
                <TouchableOpacity
                  style={[s.navCard, pinnedTiles.includes(a.screen) && { borderWidth: 1.5, borderColor: colors.primary + '60', backgroundColor: colors.primaryGhost }]}
                  onPress={() => navigation.navigate(a.screen)}
                  activeOpacity={0.75}
                  accessibilityLabel={t(a.labelKey as any)}
                  accessibilityRole="button"
                >
                  {pinnedTiles.includes(a.screen) && (
                    <View style={{ position: 'absolute', top: 6, right: 6 }}>
                      <Ionicons name="star" size={10} color="#D97706" />
                    </View>
                  )}
                  <View style={[s.navIcon, { backgroundColor: a.bg }]}>
                    <Ionicons name={a.icon as any} size={21} color={a.color} />
                  </View>
                  <Text style={s.navLabel} numberOfLines={1}>{t(a.labelKey as any)}</Text>
                </TouchableOpacity>
              </FadeSlideCard>
            ));
          })()}
        </View>

        {/* ── Ramassage spécial ── */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('WastePickup')}
          style={{ marginHorizontal: 16, marginBottom: 8, borderRadius: 18, overflow: 'hidden', ...shadow.sm }}
        >
          <LinearGradient
            colors={['#134E2A', '#1B6B3A', '#2E8B57']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 }}
          >
            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
              <Text style={{ fontSize: 26 }}>🚛</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ backgroundColor: '#FFD74030', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFD740', letterSpacing: 1 }}>NOUVEAU</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: -0.2 }}>Ramassage d'encombrants</Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Planifie le ramassage de tes gros déchets</Text>
            </View>
            <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Recent reports ── */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>{t('home_section_recent')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('History')} style={s.seeAll}>
            <Text style={s.seeAllText}>{t('home_see_all')}</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {reports.length === 0 ? (
          <FadeSlideCard delay={350} style={s.empty}>
            <View style={s.emptyIconBox}>
              <Ionicons name="camera-outline" size={36} color={colors.primary} />
            </View>
            <Text style={s.emptyTitle}>{t('home_no_reports')}</Text>
            <Text style={s.emptySub}>{t('home_no_reports_sub')}</Text>
            <TouchableOpacity
              style={{ marginTop: 16, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, alignSelf: 'center' }}
              onPress={() => navigation.navigate('Camera')}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{t('home_report_now')}</Text>
            </TouchableOpacity>
          </FadeSlideCard>
        ) : (
          <View style={s.reportList}>
            {reports.slice(0, 5).map((r, i) => {
              const cfg = ({
                validated: { color: colors.success, bg: '#E8F5E9', icon: 'checkmark-circle', label: t('status_validated') },
                pending:   { color: colors.warning, bg: '#FFF3E0', icon: 'time',             label: t('status_pending')   },
                rejected:  { color: colors.error,   bg: '#FFEBEE', icon: 'close-circle',     label: t('status_rejected')  },
              } as Record<string, { color: string; bg: string; icon: string; label: string }>)[r.status]
                ?? { color: colors.textMuted, bg: '#F5F5F5', icon: 'help-circle', label: r.status };
              return (
                <FadeSlideCard key={r.id} delay={350 + i * 60}>
                  <View style={[s.reportRow, i < Math.min(reports.length, 5) - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
                    <View style={[s.reportDot, { backgroundColor: cfg.bg }]}>
                      <Ionicons name={cfg.icon as any} size={16} color={cfg.color} />
                    </View>
                    <View style={s.reportInfo}>
                      <Text style={s.reportAddr} numberOfLines={1} ellipsizeMode="tail">{r.address}</Text>
                      <Text style={s.reportDate}>{r.date}</Text>
                    </View>
                    {r.status === 'validated'
                      ? <View style={s.coinsBadge}><Text style={s.coinsText}>+{r.coins} 🪙</Text></View>
                      : <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
                          <Text style={[s.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                        </View>
                    }
                  </View>
                </FadeSlideCard>
              );
            })}
          </View>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any): any => ({
  root:   { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 40 },

  // Header
  header: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 26, overflow: 'hidden' },
  headerCircle1: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -100, right: -70,
  },
  headerCircle2: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -60, left: -40,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600', letterSpacing: 0.2 },
  name:     { fontSize: 30, fontWeight: '900', color: '#fff', marginTop: 2, letterSpacing: -0.8 },
  cityPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: radius.pill,
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  cityText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  headerBtns: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    position: 'relative',
  },
  dot: {
    position: 'absolute', top: 8, right: 8,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#FFD740', borderWidth: 1.5, borderColor: colors.primary,
  },

  levelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  levelInfo: { flex: 1 },
  levelLabel: { fontSize: 14, fontWeight: '800', color: '#fff' },
  levelNext:  { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  balancePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,215,64,0.22)',
    borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1.5, borderColor: 'rgba(255,215,64,0.4)',
  },
  balancePillNum:  { fontSize: 22, fontWeight: '900', color: '#FFE566' },
  balancePillUnit: { fontSize: 18 },
  headerProgress: {
    height: 7, backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 4, overflow: 'hidden',
  },
  headerProgressFill: { height: '100%', backgroundColor: '#FFD740', borderRadius: 4 },

  // Streak banner
  streakBanner: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 18, marginHorizontal: 16, marginTop: 12, marginBottom: 4, padding: 16, gap: 14,
    borderWidth: 1.5, borderColor: '#FDBA74',
    backgroundColor: '#FFF7ED', ...shadow.sm,
  },
  streakFire: { fontSize: 34 },
  streakText: { fontSize: 16, fontWeight: '900', color: '#B45309' },
  streakSub: { fontSize: 11, color: '#EA580C', fontWeight: '600', marginTop: 2 },

  // Stats
  statBox: {
    flex: 1, alignItems: 'center', paddingVertical: 20, paddingHorizontal: 8, gap: 7,
    borderRadius: 18, borderWidth: 1.5, ...shadow.sm,
  },
  statIconBox: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  statNum:    { fontSize: 30, fontWeight: '900', letterSpacing: -0.8 },
  statLabel:  { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },

  // CTA
  cta: {
    padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  ctaIconWrap: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18, shadowRadius: 8, elevation: 4,
  },
  ctaText:  { flex: 1 },
  ctaTitle: { fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  ctaSub:   { fontSize: 12, marginTop: 5, lineHeight: 17 },
  ctaArrow: {
    width: 42, height: 42, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },

  // Nav grid
  sectionTitle: {
    fontSize: 11, fontWeight: '800', color: colors.textMuted,
    marginHorizontal: 20, marginTop: 20, marginBottom: 10,
    textTransform: 'uppercase', letterSpacing: 1.4,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  seeAll:    { flexDirection: 'row', alignItems: 'center', gap: 2, marginRight: 20, marginBottom: 10 },
  seeAllText:{ fontSize: 13, color: colors.primary, fontWeight: '700' },

  navGrid: { marginHorizontal: 16, gap: 10, marginBottom: 4, flexDirection: 'row', flexWrap: 'wrap' },
  navCard: {
    backgroundColor: colors.surface, borderRadius: 18, paddingVertical: 18, paddingHorizontal: 10,
    alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: colors.border, ...shadow.sm,
  },
  navIcon: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  navLabel: { fontSize: 11, fontWeight: '800', color: colors.text, textAlign: 'center', letterSpacing: 0.1 },

  // Reports
  reportList: {
    marginHorizontal: 16, backgroundColor: colors.surface,
    borderRadius: 18, borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden', ...shadow.sm,
  },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 15 },
  reportDot: { width: 40, height: 40, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  reportInfo:  { flex: 1 },
  reportAddr:  { fontSize: 13, fontWeight: '700', color: colors.text, letterSpacing: -0.1 },
  reportDate:  { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  coinsBadge:  { backgroundColor: '#DCFCE7', borderRadius: 10, paddingHorizontal: 11, paddingVertical: 5, borderWidth: 1, borderColor: '#BBF7D0' },
  coinsText:   { fontSize: 12, fontWeight: '900', color: '#16A34A' },
  statusBadge: { borderRadius: 10, paddingHorizontal: 11, paddingVertical: 5 },
  statusText:  { fontSize: 11, fontWeight: '700' },

  // Monthly card
  monthlyCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: 16, paddingLeft: 20, marginHorizontal: 16, marginTop: 12,
    borderWidth: 1, borderColor: colors.border, ...shadow.sm,
    overflow: 'hidden',
    borderLeftWidth: 4, borderLeftColor: colors.primary,
  },
  monthlyCardLeft: { flex: 1, gap: 3 },
  monthlyCardTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  monthlyCardSub:   { fontSize: 12, color: colors.textMuted },

  // Mission secrète
  missionCard:    { backgroundColor: '#071810', marginHorizontal: 16, borderRadius: 22, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: '#1E4D30', ...shadow.md },
  missionBadge:   { backgroundColor: '#F59E0B', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  missionWeek:    { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  missionZone:    { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: -0.2 },
  missionDesc:    { fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 19, marginTop: 3 },
  missionReward:  { fontSize: 13, fontWeight: '900', color: '#FBBF24' },
  missionHint:    { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  missionBtn:     { backgroundColor: colors.primary, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 16, ...shadow.sm },
  missionBtnText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 0.2 },

  // Empty
  empty: {
    marginHorizontal: 16, backgroundColor: colors.surface,
    borderRadius: radius.md, padding: 36, alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  emptyIconBox: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primaryGhost, justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  emptySub:   { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});


