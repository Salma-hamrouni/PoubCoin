import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, SafeAreaView,
  Modal, Dimensions, ActivityIndicator, Clipboard,
  RefreshControl, TextInput, Animated, Platform, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { REWARDS, Reward } from '../data/sponsors';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { shadow, radius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useT } from '../i18n/useT';
import { hapticSuccess, hapticMedium, hapticLight } from '../utils/haptics';
import { useToast } from '../context/ToastContext';
import EmptyState from '../components/EmptyState';
import SwipeDismiss from '../components/SwipeDismiss';
import { Skeleton } from '../components/Skeleton';
import BottomSheet from '../components/BottomSheet';

const { width } = Dimensions.get('window');
const CARD_W = (width - 16 * 2 - 12) / 2;

const AVATAR_FRAMES = [
  { id: 'frame_eco',     label: 'Éco',        emoji: '🌿', color: '#16A34A', coins: 60,  desc: 'L\'esprit vert' },
  { id: 'frame_silver',  label: 'Argent',     emoji: '🥈', color: '#9E9E9E', coins: 80,  desc: 'Élégance sobre' },
  { id: 'frame_gold',    label: 'Doré',       emoji: '✨', color: '#F59E0B', coins: 150, desc: 'Pour les champions' },
  { id: 'frame_neon',    label: 'Néon',       emoji: '⚡', color: '#8B5CF6', coins: 200, desc: 'Brillant & rare' },
  { id: 'frame_rainbow', label: 'Arc-en-ciel',emoji: '🌈', color: '#EC4899', coins: 350, desc: 'Ultra rare' },
];

const AVATAR_TITLES = [
  { id: 'title_guardian', label: '🛡️ Gardien',    coins: 100, desc: 'Protecteur de l\'environnement' },
  { id: 'title_hero',     label: '🦸 Héros Vert',  coins: 200, desc: 'Champion de la propreté' },
  { id: 'title_legend',   label: '👑 Légende',      coins: 500, desc: 'Le plus haut titre' },
];

const MYSTERY_REWARDS = [
  { title: 'Café offert',                    emoji: '☕', value: 25  },
  { title: 'Bon 5 DT Monoprix',             emoji: '🛒', value: 50  },
  { title: 'Ticket Métro',                   emoji: '🚇', value: 30  },
  { title: 'Pizza individuelle',             emoji: '🍕', value: 100 },
  { title: 'Entrée cinéma',                  emoji: '🎬', value: 70  },
  { title: 'Bon 10 DT Géant',               emoji: '🏪', value: 80  },
  { title: 'Abonnement 1 mois salle sport',  emoji: '💪', value: 120 },
];

/* ─── Staggered entrance ─────────────────────────────────────── */
function FadeIn({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 320, delay, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(translateY, { toValue: 0, tension: 80, friction: 10, delay, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

/* ─── Animated progress fill ─────────────────────────────────── */
function ProgressFill({ pct, color }: { pct: number; color: string }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: pct, duration: 700, delay: 300, useNativeDriver: false }).start();
  }, [pct]);
  return (
    <Animated.View style={{
      height: '100%',
      width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
      borderRadius: 4, backgroundColor: color,
    }} />
  );
}

/* ─── Reward card ─────────────────────────────────────────────── */
function RewardCard({ reward, balance, cfg, colors, onPress }: {
  reward: Reward; balance: number;
  cfg: { icon: string; color: string; bg: string };
  colors: any; onPress: () => void;
}) {
  const canAfford = balance >= reward.coins;
  const pct = Math.min(balance / reward.coins, 1);
  const rcs = getCardStyles(colors);

  return (
    <TouchableOpacity style={[rcs.card, canAfford && rcs.cardAffordable]} onPress={onPress} activeOpacity={0.88}>
      <View style={[rcs.emojiZone, { backgroundColor: cfg.bg }]}>
        <Text style={{ fontSize: 34 }}>{reward.emoji}</Text>
        {canAfford && <View style={rcs.availDot} />}
        {reward.stock <= 5 && (
          <View style={rcs.hotChip}><Text style={{ fontSize: 10 }}>🔥</Text></View>
        )}
      </View>
      <View style={rcs.info}>
        <Text style={rcs.sponsor} numberOfLines={1}>{reward.sponsor}</Text>
        <Text style={rcs.name} numberOfLines={2}>{reward.title}</Text>
      </View>
      <View style={rcs.footer}>
        <View style={[rcs.priceBadge, canAfford && rcs.priceBadgeGreen]}>
          <Text style={[rcs.priceText, canAfford && { color: colors.primary }]}>{reward.coins} 🪙</Text>
        </View>
        {canAfford
          ? <View style={rcs.redeemBtn}><Ionicons name="arrow-forward" size={13} color="#fff" /></View>
          : <View style={rcs.lockBtn}><Ionicons name="lock-closed" size={12} color={colors.textMuted} /></View>
        }
      </View>
      {!canAfford && (
        <View style={rcs.progressWrap}>
          <View style={rcs.progressTrack}>
            <ProgressFill pct={pct} color={pct > 0.75 ? colors.gold : colors.border} />
          </View>
          <Text style={rcs.progressLabel}>{Math.round(pct * 100)}%</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

/* ─── Main screen ─────────────────────────────────────────────── */
export default function MarketplaceScreen({ navigation }: any) {
  const { colors } = useTheme();
  const t = useT();
  const s = getStyles(colors);

  const CATEGORIES = [
    { key: 'all',       label: 'Tout',        icon: 'apps-outline'        },
    { key: 'food',      label: 'Alimentation', icon: 'restaurant-outline'  },
    { key: 'transport', label: 'Transport',    icon: 'train-outline'       },
    { key: 'shopping',  label: 'Shopping',     icon: 'bag-handle-outline'  },
    { key: 'culture',   label: 'Culture',      icon: 'film-outline'        },
  ];

  const CAT_CFG: Record<string, { icon: string; color: string; bg: string }> = {
    food:      { icon: 'restaurant-outline', color: '#E53935', bg: '#FFEBEE' },
    transport: { icon: 'train-outline',      color: colors.info,   bg: colors.infoLight  },
    shopping:  { icon: 'bag-handle-outline', color: colors.purple, bg: colors.purpleLight},
    culture:   { icon: 'film-outline',       color: colors.gold,   bg: colors.goldLight  },
  };

  const { balance, spendCoins } = useWallet();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [ownedFrames,  setOwnedFrames]  = useState<string[]>([]);
  const [ownedTitles,  setOwnedTitles]  = useState<string[]>([]);
  const [activeFrame,  setActiveFrame]  = useState<string | null>(null);
  const [activeTitle,  setActiveTitle]  = useState<string | null>(null);
  const [showNewBadge, setShowNewBadge] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('poubcoin_tutorial_seen').then(v => {
      if (!v) setShowNewBadge(true);
    });
  }, []);

  useEffect(() => {
    if (showNewBadge) AsyncStorage.setItem('poubcoin_tutorial_seen', '1');
  }, [showNewBadge]);

  useEffect(() => {
    if (!user?.id) return;
    getDoc(doc(db, 'users', user.id)).then(snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      setOwnedFrames(d.ownedFrames  ?? []);
      setOwnedTitles(d.ownedTitles  ?? []);
      setActiveFrame(d.activeFrame  ?? null);
      setActiveTitle(d.activeTitle  ?? null);
    }).catch(() => {});
  }, [user?.id]);

  const buyFrame = async (frame: typeof AVATAR_FRAMES[0]) => {
    if (ownedFrames.includes(frame.id)) {
      await updateDoc(doc(db, 'users', user!.id), { activeFrame: frame.id });
      setActiveFrame(frame.id);
      hapticSuccess();
      return;
    }
    const ok = await spendCoins(frame.coins, `Cadre ${frame.label}`);
    if (!ok) return;
    await updateDoc(doc(db, 'users', user!.id), {
      ownedFrames: arrayUnion(frame.id), activeFrame: frame.id,
    });
    setOwnedFrames(p => [...p, frame.id]);
    setActiveFrame(frame.id);
    hapticSuccess();
  };

  const buyTitle = async (title: typeof AVATAR_TITLES[0]) => {
    if (ownedTitles.includes(title.id)) {
      await updateDoc(doc(db, 'users', user!.id), { activeTitle: title.id });
      setActiveTitle(title.id);
      hapticSuccess();
      return;
    }
    const ok = await spendCoins(title.coins, title.label);
    if (!ok) return;
    await updateDoc(doc(db, 'users', user!.id), {
      ownedTitles: arrayUnion(title.id), activeTitle: title.id,
    });
    setOwnedTitles(p => [...p, title.id]);
    setActiveTitle(title.id);
    hapticSuccess();
  };
  const [chestOpen, setChestOpen]       = useState(false);
  const [chestReward, setChestReward]   = useState<typeof MYSTERY_REWARDS[0] | null>(null);
  const [chestLoading, setChestLoading] = useState(false);
  const [cat, setCat]         = useState('all');
  const [selected, setSelected] = useState<Reward | null>(null);
  const [voucher, setVoucher]   = useState<{ reward: Reward; code: string } | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [redeemedVouchers, setRedeemedVouchers] = useState<{ code: string; item: string; date: string }[]>([]);
  const [redeeming, setRedeeming]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [inlineError, setInlineError] = useState('');
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [sortAffordable, setSortAffordable] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const [loadingMoreGrid, setLoadingMoreGrid] = useState(false);
  const searchBorder = useRef(new Animated.Value(0)).current;

  /* scroll-driven header compression */
  const scrollY = useRef(new Animated.Value(0)).current;
  const balanceCardOpacity = scrollY.interpolate({ inputRange: [0, 70], outputRange: [1, 0], extrapolate: 'clamp' });
  const balanceCardHeight  = scrollY.interpolate({ inputRange: [0, 70], outputRange: [1, 0], extrapolate: 'clamp' });

  /* chest pulse */
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.05, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(pulse, { toValue: 1,    duration: 800, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('poubcoin_vouchers').then(v => {
      if (v) setRedeemedVouchers(JSON.parse(v));
    });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const v = await AsyncStorage.getItem('poubcoin_vouchers');
    if (v) setRedeemedVouchers(JSON.parse(v));
    setRefreshing(false);
  }, []);

  const openChest = async () => {
    if (balance < 80) {
      setInlineError(`Il te faut 80 🪙 pour ouvrir le coffre (solde : ${balance})`);
      return;
    }
    setChestLoading(true);
    try {
      const ok = await spendCoins(80, 'Coffre Mystère');
      if (ok) {
        await new Promise(r => setTimeout(r, 1100));
        hapticSuccess();
        setChestReward(MYSTERY_REWARDS[Math.floor(Math.random() * MYSTERY_REWARDS.length)]);
        setChestOpen(true);
      } else {
        setInlineError('Solde insuffisant ou erreur lors de l\'ouverture du coffre.');
      }
    } catch {
      setInlineError('Impossible d\'ouvrir le coffre. Réessayez.');
    } finally {
      setChestLoading(false);
    }
  };

  const filtered = useMemo(() => {
    setVisibleCount(10);
    let list = cat === 'all' ? REWARDS : REWARDS.filter(r => r.category === cat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => r.title.toLowerCase().includes(q) || r.sponsor.toLowerCase().includes(q));
    }
    if (sortAffordable) {
      return [...list].sort((a, b) => {
        const aA = balance >= a.coins ? 0 : 1;
        const bA = balance >= b.coins ? 0 : 1;
        return aA - bA || a.coins - b.coins;
      });
    }
    return list;
  }, [cat, search, balance, sortAffordable]);

  const visibleFiltered = filtered.slice(0, visibleCount);
  const hasMoreGrid = visibleCount < filtered.length;

  const loadMoreGrid = useCallback(async () => {
    if (loadingMoreGrid || !hasMoreGrid) return;
    setLoadingMoreGrid(true);
    await new Promise(r => setTimeout(r, 500));
    setVisibleCount(v => v + 8);
    setLoadingMoreGrid(false);
  }, [loadingMoreGrid, hasMoreGrid]);

  const rows = useMemo(() => {
    const out: (Reward | null)[][] = [];
    for (let i = 0; i < visibleFiltered.length; i += 2)
      out.push([visibleFiltered[i], visibleFiltered[i + 1] ?? null]);
    return out;
  }, [visibleFiltered]);

  const handleRedeem = (reward: Reward) => {
    if (balance < reward.coins) {
      setInlineError(`Il te manque ${reward.coins - balance} 🪙 pour "${reward.title}"`);
      hapticLight();
      return;
    }
    setInlineError('');
    setSelected(reward);
  };

  const confirmRedeem = async () => {
    if (!selected || redeeming) return;
    setRedeeming(true);
    const ok = await spendCoins(selected.coins, selected.title);
    if (ok) {
      hapticSuccess();
      const code = `POUB-${(Date.now() % 1000000).toString(36).toUpperCase()}${Math.floor(Math.random() * 1000).toString(36).toUpperCase()}`.slice(0, 11);
      const r = selected;
      setSelected(null);
      setVoucher({ reward: r, code });
      const updated = [{ code, item: r.title, date: new Date().toLocaleDateString('fr-FR') }, ...redeemedVouchers];
      setRedeemedVouchers(updated);
      AsyncStorage.setItem('poubcoin_vouchers', JSON.stringify(updated));
    } else {
      showToast({ message: 'Solde insuffisant ou erreur. Réessayez.', type: 'error' });
    }
    setRedeeming(false);
  };

  const affordableCount = useMemo(() => REWARDS.filter(r => balance >= r.coins).length, [balance]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.primaryDark }}>
      <StatusBar barStyle="light-content" />

      {/* ── Gradient header ── */}
      <LinearGradient
        colors={[colors.primaryDark, colors.primary]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <SafeAreaView>
          {/* Top row */}
          <View style={s.topRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.screenLabel}>MARKETPLACE</Text>
              <Text style={s.screenTitle}>Récompenses</Text>
            </View>
            <View style={s.balancePill}>
              <View style={s.balanceDot} />
              <Text style={s.balancePillText}>{balance}</Text>
              <Text style={s.balancePillCoin}>🪙</Text>
            </View>
          </View>

          {/* Balance card */}
          <Animated.View style={[s.balanceCard, { opacity: balanceCardOpacity, transform: [{ scaleY: balanceCardHeight }] }]}>
            <LinearGradient
              colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.07)']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.balanceCardInner}
            >
              <View style={s.balanceCardLeft}>
                <Text style={s.balanceCardLabel}>Solde actuel</Text>
                <View style={s.balanceRow}>
                  <Text style={s.balanceBig}>{balance}</Text>
                  <Text style={s.balanceUnit}>coins</Text>
                </View>
                {affordableCount > 0 && (
                  <View style={s.availableBadge}>
                    <View style={s.availableDot2} />
                    <Text style={s.availableText}>{affordableCount} disponible{affordableCount > 1 ? 's' : ''}</Text>
                  </View>
                )}
              </View>
              <View style={s.tierCol}>
                {[
                  { label: 'Café',    min: 25 },
                  { label: 'Ticket',  min: 30 },
                  { label: 'Bon 5DT', min: 50 },
                  { label: 'Box 80',  min: 80 },
                ].map(item => {
                  const ok = balance >= item.min;
                  return (
                    <View key={item.label} style={[s.tierRow, !ok && { opacity: 0.35 }]}>
                      <View style={[s.tierDot, ok && { backgroundColor: '#4ADE80' }]} />
                      <Text style={[s.tierLabel, ok && { color: '#4ADE80' }]}>{item.label}</Text>
                    </View>
                  );
                })}
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Categories */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catRow}>
            {CATEGORIES.map(c => {
              const active = cat === c.key;
              return (
                <TouchableOpacity
                  key={c.key}
                  style={[s.catPill, active && s.catPillActive]}
                  onPress={() => { setCat(c.key); hapticLight(); }}
                >
                  <Ionicons name={c.icon as any} size={14} color={active ? '#fff' : 'rgba(255,255,255,0.55)'} />
                  <Text style={[s.catPillText, active && { color: '#fff', opacity: 1 }]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* ── White/light body ── */}
      <View style={s.body}>
        {/* Search bar */}
        <View style={s.searchRow}>
          <Animated.View style={[
            s.searchBar,
            { borderColor: searchBorder.interpolate({ inputRange: [0, 1], outputRange: [colors.border, colors.primary] }) },
          ]}>
            <Ionicons name="search-outline" size={17} color={searchFocused ? colors.primary : colors.textMuted} />
            <TextInput
              style={s.searchInput}
              placeholder="Rechercher une récompense..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              onFocus={() => {
                setSearchFocused(true);
                Animated.timing(searchBorder, { toValue: 1, duration: 200, useNativeDriver: false }).start();
              }}
              onBlur={() => {
                setSearchFocused(false);
                Animated.timing(searchBorder, { toValue: 0, duration: 200, useNativeDriver: false }).start();
              }}
            />
            {search.length > 0 ? (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={17} color={colors.textMuted} />
              </TouchableOpacity>
            ) : Platform.OS === 'web' ? (
              <View style={s.searchKbd}>
                <Text style={s.searchKbdText}>⌘K</Text>
              </View>
            ) : null}
          </Animated.View>

          <TouchableOpacity
            style={[s.filterBtn, sortAffordable && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => { setSortAffordable(v => !v); hapticLight(); }}
          >
            <Ionicons name="options-outline" size={18} color={sortAffordable ? '#fff' : colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {sortAffordable && (
          <FadeIn>
            <View style={s.sortHint}>
              <Ionicons name="flash" size={12} color={colors.primary} />
              <Text style={s.sortHintText}>Récompenses accessibles en premier</Text>
              <TouchableOpacity onPress={() => setSortAffordable(false)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Ionicons name="close" size={13} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </FadeIn>
        )}

        {/* Error */}
        {!!inlineError && (
          <FadeIn>
            <View style={s.errorBox}>
              <Ionicons name="information-circle-outline" size={15} color={colors.error} />
              <Text style={s.errorText}>{inlineError}</Text>
              <TouchableOpacity onPress={() => setInlineError('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Ionicons name="close" size={14} color={colors.error} />
              </TouchableOpacity>
            </View>
          </FadeIn>
        )}

        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary, colors.primaryLight]} tintColor={colors.primary} progressBackgroundColor={colors.surface} title="Actualisation..." titleColor={colors.textMuted} />}
          scrollEventThrottle={16}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        >
          {/* ── Coffre Mystère ── */}
          <FadeIn delay={0}>
            <LinearGradient
              colors={[colors.primaryDark, colors.primary, colors.primaryLight]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.chestCard}
            >
              <View style={[s.ring, { width: 160, height: 160, top: -50, right: -20 }]} />
              <View style={[s.ring, { width: 90,  height: 90,  top: 10, right: 70  }]} />

              <View style={s.chestLeft}>
                <View style={s.chestIconBg}>
                  <Text style={{ fontSize: 28 }}>🎁</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.chestLabel}>COFFRE MYSTÈRE</Text>
                  <Text style={s.chestTitle}>Surprise garantie</Text>
                  <Text style={s.chestSub}>Valeur jusqu'à 120 🪙</Text>
                </View>
              </View>

              <Animated.View style={{ transform: [{ scale: pulse }] }}>
                <TouchableOpacity
                  style={[s.chestBtn, (chestLoading || balance < 80) && { opacity: 0.7 }]}
                  onPress={openChest}
                  disabled={chestLoading}
                >
                  {chestLoading
                    ? <ActivityIndicator color={colors.primary} size="small" />
                    : <Text style={s.chestBtnText}>{balance < 80 ? `${balance}/80 🪙` : 'Ouvrir · 80 🪙'}</Text>
                  }
                </TouchableOpacity>
              </Animated.View>
            </LinearGradient>
          </FadeIn>

          {/* ── Commerces partenaires ── */}
          <FadeIn delay={50}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('BusinessPortal')}
              style={{
                marginBottom: 16,
                borderRadius: 16,
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                colors={['#1B6B3A', '#2E8B57']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}
              >
                <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 26 }}>🏪</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1, marginBottom: 2 }}>RÉSEAU ÉCO-RESPONSABLE</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>Commerces partenaires</Text>
                  <Text style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>Réductions exclusives avec tes PoubCoins</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
              </LinearGradient>
            </TouchableOpacity>
          </FadeIn>

          {/* Section heading */}
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>
              {cat === 'all' ? 'Toutes les récompenses' : CATEGORIES.find(c => c.key === cat)?.label}
            </Text>
            <Text style={s.sectionCount}>{filtered.length}</Text>
          </View>

          {/* 2-col grid */}
          {filtered.length === 0 ? (
            <EmptyState
              icon="gift-outline"
              emoji="🔍"
              title="Aucun résultat"
              subtitle="Essaie un autre terme ou filtre."
              actionLabel="Réinitialiser"
              onAction={() => { setSearch(''); setCat('all'); }}
            />
          ) : (
            rows.map((pair, ri) => (
              <FadeIn key={ri} delay={ri * 55}>
                <View style={s.gridRow}>
                  {pair.map((reward, ci) =>
                    reward ? (
                      <RewardCard
                        key={reward.id}
                        reward={reward}
                        balance={balance}
                        colors={colors}
                        cfg={CAT_CFG[reward.category] ?? { icon: 'gift-outline', color: colors.primary, bg: colors.primaryGhost }}
                        onPress={() => handleRedeem(reward)}
                      />
                    ) : (
                      <View key="empty" style={{ width: CARD_W }} />
                    )
                  )}
                </View>
              </FadeIn>
            ))
          )}

          {/* Grid load-more footer */}
          {loadingMoreGrid ? (
            <View style={{ gap: 12, marginTop: 4 }}>
              {[[0,1],[2,3]].map((pair, ri) => (
                <View key={ri} style={s.gridRow}>
                  {pair.map(j => (
                    <View key={j} style={{ width: CARD_W, borderRadius: 16, overflow: 'hidden', gap: 10, backgroundColor: colors.surface, padding: 14, borderWidth: 1, borderColor: colors.border }}>
                      <Skeleton width="100%" height={80} borderRadius={12} />
                      <Skeleton width="70%" height={13} />
                      <Skeleton width="50%" height={11} />
                      <Skeleton width="40%" height={28} borderRadius={10} />
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ) : hasMoreGrid ? (
            <TouchableOpacity
              onPress={loadMoreGrid}
              activeOpacity={0.82}
              style={{ marginTop: 8, borderRadius: 14, padding: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
            >
              <Ionicons name="chevron-down" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>
                Voir {Math.min(8, filtered.length - visibleCount)} récompenses de plus
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* ── Personnalisation ── */}
          <FadeIn delay={100}>
            <View style={[s.sectionRow, { marginTop: 28 }]}>
              <Text style={s.sectionTitle}>🎨 Personnalisation</Text>
            </View>

            {/* Cadres d'avatar */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted }}>CADRES D'AVATAR</Text>
              {showNewBadge && (
                <View style={{ backgroundColor: '#EF4444', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>Nouveau 🆕</Text>
                </View>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 8 }}>
              {AVATAR_FRAMES.map(frame => {
                const owned  = ownedFrames.includes(frame.id);
                const active = activeFrame === frame.id;
                const canBuy = balance >= frame.coins || owned;
                return (
                  <TouchableOpacity
                    key={frame.id}
                    onPress={() => user && buyFrame(frame)}
                    activeOpacity={0.85}
                    style={{
                      width: 100, alignItems: 'center', padding: 12, borderRadius: 16,
                      backgroundColor: active ? frame.color + '18' : colors.surface,
                      borderWidth: 2, borderColor: active ? frame.color : owned ? frame.color + '60' : colors.border,
                    }}
                  >
                    <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 3, borderColor: frame.color, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, marginBottom: 8 }}>
                      <Text style={{ fontSize: 24 }}>{frame.emoji}</Text>
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text, textAlign: 'center' }}>{frame.label}</Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted, textAlign: 'center', marginTop: 2 }} numberOfLines={1}>{frame.desc}</Text>
                    <View style={{ marginTop: 8, backgroundColor: active ? frame.color : owned ? '#E8F5E9' : canBuy ? frame.color + '20' : colors.background, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: active ? frame.color : owned ? colors.success : colors.border }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: active ? '#fff' : owned ? colors.success : canBuy ? frame.color : colors.textMuted }}>
                        {active ? '✓ Actif' : owned ? 'Équiper' : `${frame.coins} 🪙`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Titres */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 10, marginTop: 18 }}>TITRES</Text>
            <View style={{ gap: 8 }}>
              {AVATAR_TITLES.map(title => {
                const owned  = ownedTitles.includes(title.id);
                const active = activeTitle === title.id;
                const canBuy = balance >= title.coins || owned;
                return (
                  <TouchableOpacity
                    key={title.id}
                    onPress={() => user && buyTitle(title)}
                    activeOpacity={0.85}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 14,
                      padding: 14, borderRadius: 14,
                      backgroundColor: active ? colors.primaryGhost : colors.surface,
                      borderWidth: 1.5, borderColor: active ? colors.primary : owned ? colors.primary + '50' : colors.border,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{title.label}</Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{title.desc}</Text>
                    </View>
                    <View style={{ backgroundColor: active ? colors.primary : owned ? '#E8F5E9' : canBuy ? colors.primaryGhost : colors.background, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: active ? colors.primary : owned ? colors.success : colors.border }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: active ? '#fff' : owned ? colors.success : canBuy ? colors.primary : colors.textMuted }}>
                        {active ? '✓ Actif' : owned ? 'Équiper' : `${title.coins} 🪙`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </FadeIn>

          {/* My Vouchers */}
          {redeemedVouchers.length > 0 && (
            <>
              <View style={[s.sectionRow, { marginTop: 24 }]}>
                <Text style={s.sectionTitle}>Mes bons</Text>
                <View style={s.countChip}>
                  <Text style={s.countChipText}>{redeemedVouchers.length}</Text>
                </View>
              </View>
              {redeemedVouchers.map((v, i) => (
                <FadeIn key={i} delay={i * 40}>
                  <TouchableOpacity style={s.voucherCard} onPress={() => { Clipboard.setString(v.code); hapticMedium(); }} activeOpacity={0.85}>
                    <View style={s.voucherLeft}>
                      <Text style={s.voucherItem}>{v.item}</Text>
                      <Text style={s.voucherDate}>{v.date}</Text>
                    </View>
                    <View style={s.voucherCodeWrap}>
                      <Text style={s.voucherCode}>{v.code}</Text>
                      <Ionicons name="copy-outline" size={11} color={colors.primary} style={{ marginTop: 2 }} />
                    </View>
                  </TouchableOpacity>
                </FadeIn>
              ))}
            </>
          )}

          <View style={{ height: 48 }} />
        </Animated.ScrollView>
      </View>

      {/* ── Confirm BottomSheet ── */}
      <BottomSheet visible={!!selected} onClose={() => setSelected(null)}>
            {selected && (() => {
              const cfg = CAT_CFG[selected.category] ?? { icon: 'gift-outline', color: colors.primary, bg: colors.primaryGhost };
              return (
                <>
                  <View style={[s.sheetEmojiWrap, { backgroundColor: cfg.bg }]}>
                    <Text style={{ fontSize: 44 }}>{selected.emoji}</Text>
                  </View>
                  <Text style={s.sheetTitle}>{selected.title}</Text>
                  <Text style={s.sheetSponsor}>chez {selected.sponsor}</Text>

                  <View style={s.sheetBalRow}>
                    <View style={s.sheetBalItem}>
                      <Text style={s.sheetBalLabel}>Solde actuel</Text>
                      <Text style={s.sheetBalVal}>{balance} 🪙</Text>
                    </View>
                    <View style={s.sheetArrow}>
                      <Ionicons name="arrow-forward" size={18} color={colors.border} />
                    </View>
                    <View style={s.sheetBalItem}>
                      <Text style={s.sheetBalLabel}>Après échange</Text>
                      <Text style={[s.sheetBalVal, { color: colors.primary }]}>{balance - selected.coins} 🪙</Text>
                    </View>
                  </View>

                  <View style={s.sheetCostRow}>
                    <Text style={s.sheetCostLabel}>Coût de l'échange</Text>
                    <View style={s.sheetCostBadge}>
                      <Text style={s.sheetCostText}>-{selected.coins} 🪙</Text>
                    </View>
                  </View>

                  <View style={s.sheetBtns}>
                    <TouchableOpacity style={s.sheetCancel} onPress={() => setSelected(null)}>
                      <Text style={s.sheetCancelText}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.sheetConfirm, redeeming && { opacity: 0.6 }]} onPress={confirmRedeem} disabled={redeeming}>
                      <LinearGradient colors={[colors.primary, colors.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.sheetConfirmGrad}>
                        {redeeming
                          ? <ActivityIndicator color="#fff" size="small" />
                          : <>
                              <Ionicons name="checkmark-circle" size={18} color="#fff" />
                              <Text style={s.sheetConfirmText}>Confirmer l'échange</Text>
                            </>
                        }
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
      </BottomSheet>

      {/* ── Voucher Modal ── */}
      <Modal visible={!!voucher} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={[s.sheet, { alignItems: 'center', paddingBottom: 32 }]}>
            <View style={s.sheetHandle} />
            {voucher && (
              <>
                <Text style={{ fontSize: 56, marginBottom: 10 }}>🎉</Text>
                <Text style={s.sheetTitle}>Bon généré !</Text>
                <Text style={[s.sheetSponsor, { marginBottom: 24 }]}>À présenter chez {voucher.reward.sponsor}</Text>

                <View style={s.voucherTicket}>
                  <View style={s.ticketTop}>
                    <Text style={{ fontSize: 36 }}>{voucher.reward.emoji}</Text>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={s.ticketRewardName}>{voucher.reward.title}</Text>
                      <Text style={s.ticketSponsor}>{voucher.reward.sponsor}</Text>
                    </View>
                  </View>
                  <View style={s.ticketDivider}>
                    <View style={s.ticketNockLeft} />
                    <View style={s.ticketDash} />
                    <View style={s.ticketNockRight} />
                  </View>
                  <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                    <View style={s.qrMini}>
                      {Array.from({ length: 25 }, (_, i) => (
                        <View key={i} style={[s.qrDot, {
                          backgroundColor: Math.abs(Math.sin(i * 137 + voucher.code.charCodeAt(i % voucher.code.length))) > 0.45
                            ? colors.primary : 'transparent'
                        }]} />
                      ))}
                    </View>
                    <Text style={s.ticketCode}>{voucher.code}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[s.copyBtn, codeCopied && s.copyBtnDone]}
                  onPress={() => { Clipboard.setString(voucher.code); hapticMedium(); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); }}
                >
                  <Ionicons name={codeCopied ? 'checkmark-circle' : 'copy-outline'} size={16} color={codeCopied ? colors.success : colors.primary} />
                  <Text style={[s.copyBtnText, codeCopied && { color: colors.success }]}>
                    {codeCopied ? 'Copié !' : 'Copier le code'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={[s.sheetConfirm, { alignSelf: 'stretch', marginTop: 12 }]} onPress={() => setVoucher(null)}>
                  <LinearGradient colors={[colors.primary, colors.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.sheetConfirmGrad}>
                    <Text style={s.sheetConfirmText}>Fermer</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Chest reward Modal ── */}
      <Modal visible={chestOpen} transparent animationType="fade">
        <View style={[s.overlay, { justifyContent: 'center', alignItems: 'center', padding: 28 }]}>
          <View style={s.chestResultCard}>
            <LinearGradient
              colors={[colors.primaryDark, colors.primary]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.chestResultGrad}
            >
              <Text style={{ fontSize: 64, marginBottom: 8 }}>🎉</Text>
              <Text style={s.chestResultSub}>Félicitations !</Text>
              {chestReward && (
                <>
                  <Text style={{ fontSize: 52, marginVertical: 10 }}>{chestReward.emoji}</Text>
                  <Text style={s.chestResultTitle}>{chestReward.title}</Text>
                  <View style={s.chestResultChip}>
                    <Text style={s.chestResultChipText}>~{chestReward.value} coins</Text>
                  </View>
                </>
              )}
              <TouchableOpacity style={s.chestResultBtn} onPress={() => { setChestOpen(false); setChestReward(null); }}>
                <Text style={s.chestResultBtnText}>Super, merci !</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ─── Card styles (theme-aware) ─────────────────────────────── */
function getCardStyles(colors: any) {
  return {
    card: {
      width: CARD_W,
      backgroundColor: colors.surface,
      borderRadius: 20,
      overflow: 'hidden' as const,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadow.sm,
    },
    cardAffordable: {
      borderColor: colors.primary + '60',
      borderWidth: 1.5,
      ...shadow.md,
    },
    emojiZone: {
      height: 96, alignItems: 'center' as const, justifyContent: 'center' as const,
      position: 'relative' as const,
    },
    availDot: {
      position: 'absolute' as const, top: 8, right: 8,
      width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E',
    },
    hotChip: {
      position: 'absolute' as const, top: 6, left: 6,
      backgroundColor: colors.surface, borderRadius: 8,
      paddingHorizontal: 5, paddingVertical: 2, ...shadow.xs,
    },
    info:    { padding: 12, paddingTop: 10, paddingBottom: 6 },
    sponsor: { fontSize: 10, fontWeight: '700' as const, color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 3 },
    name:    { fontSize: 13, fontWeight: '800' as const, color: colors.text, lineHeight: 18 },
    footer:  { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingHorizontal: 12, paddingBottom: 12 },
    priceBadge:      { backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    priceBadgeGreen: { backgroundColor: colors.primaryGhost },
    priceText:  { fontSize: 12, fontWeight: '800' as const, color: colors.textMuted },
    redeemBtn:  { width: 28, height: 28, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center' as const, justifyContent: 'center' as const },
    lockBtn:    { width: 28, height: 28, borderRadius: 9, backgroundColor: colors.background, alignItems: 'center' as const, justifyContent: 'center' as const },
    progressWrap:  { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, paddingHorizontal: 12, paddingBottom: 10 },
    progressTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' as const },
    progressLabel: { fontSize: 9, fontWeight: '700' as const, color: colors.textMuted, minWidth: 26 },
  };
}

/* ─── Screen styles (theme-aware) ───────────────────────────── */
function getStyles(colors: any) {
  return {
    topRow:       { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14 },
    screenLabel:  { fontSize: 10, fontWeight: '800' as const, color: 'rgba(255,255,255,0.45)', letterSpacing: 2, marginBottom: 2 },
    screenTitle:  { fontSize: 28, fontWeight: '900' as const, color: '#fff', letterSpacing: -0.8 },

    balancePill:     { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, backgroundColor: 'rgba(255,215,64,0.18)', borderRadius: 24, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1.5, borderColor: 'rgba(255,215,64,0.35)' },
    balanceDot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80' },
    balancePillText: { color: '#FFE566', fontWeight: '900' as const, fontSize: 18 },
    balancePillCoin: { fontSize: 16 },

    balanceCard:      { marginHorizontal: 16, marginBottom: 16, borderRadius: 18, overflow: 'hidden' as const },
    balanceCardInner: { padding: 18, flexDirection: 'row' as const, alignItems: 'center' as const, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    balanceCardLeft:  { flex: 1 },
    balanceCardLabel: { fontSize: 11, fontWeight: '700' as const, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase' as const, letterSpacing: 0.8 },
    balanceRow:       { flexDirection: 'row' as const, alignItems: 'flex-end' as const, gap: 5, marginTop: 4 },
    balanceBig:       { fontSize: 42, fontWeight: '900' as const, color: '#fff', letterSpacing: -1 },
    balanceUnit:      { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '600' as const, marginBottom: 6 },
    availableBadge:   { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5, marginTop: 6 },
    availableDot2:    { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80' },
    availableText:    { fontSize: 11, color: '#4ADE80', fontWeight: '700' as const },
    tierCol:   { gap: 7, alignItems: 'flex-end' as const },
    tierRow:   { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
    tierDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
    tierLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '600' as const },

    catRow:      { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 32, gap: 8 },
    catPill:     { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(255,255,255,0.1)' },
    catPillActive:{ backgroundColor: 'rgba(255,255,255,0.28)', borderColor: 'rgba(255,255,255,0.5)' },
    catPillText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '800' as const },

    body:        { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -20, overflow: 'hidden' as const, paddingTop: 20 },
    listContent: { paddingHorizontal: 16, paddingTop: 20, gap: 12 },

    searchRow:  { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, marginHorizontal: 16, marginBottom: 8 },
    searchBar:  { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, backgroundColor: colors.surface, borderRadius: 18, height: 52, paddingHorizontal: 16, borderWidth: 1.5, ...shadow.sm },
    searchInput:{ flex: 1, fontSize: 15, color: colors.text },
    searchKbd:  { backgroundColor: colors.background, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: colors.border },
    searchKbdText: { fontSize: 10, color: colors.textMuted, fontWeight: '700' as const, letterSpacing: 0.3 },
    filterBtn:  { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' as const, justifyContent: 'center' as const, ...shadow.sm },
    sortHint:   { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, backgroundColor: colors.primaryGhost, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 16, marginBottom: 4, borderWidth: 1, borderColor: colors.primary + '30' },
    sortHintText: { flex: 1, fontSize: 12, color: colors.primary, fontWeight: '600' as const },

    errorBox:  { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, backgroundColor: colors.errorLight, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.error + '40', marginBottom: 4 },
    errorText: { flex: 1, fontSize: 12, color: colors.error, fontWeight: '600' as const },

    chestCard:   { borderRadius: 20, padding: 18, overflow: 'hidden' as const, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14 },
    ring:        { position: 'absolute' as const, borderWidth: 1, borderRadius: 999, borderColor: 'rgba(255,255,255,0.08)' },
    chestLeft:   { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14 },
    chestIconBg: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center' as const, justifyContent: 'center' as const },
    chestLabel:  { fontSize: 9, fontWeight: '900' as const, color: 'rgba(255,255,255,0.5)', letterSpacing: 1.5, marginBottom: 2 },
    chestTitle:  { fontSize: 15, fontWeight: '900' as const, color: '#fff' },
    chestSub:    { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
    chestBtn:    { backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
    chestBtnText:{ fontSize: 12, fontWeight: '900' as const, color: colors.primary },

    sectionRow:    { flexDirection: 'row' as const, alignItems: 'center' as const, marginTop: 4 },
    sectionTitle:  { flex: 1, fontSize: 16, fontWeight: '800' as const, color: colors.text },
    sectionCount:  { fontSize: 13, fontWeight: '700' as const, color: colors.textMuted },
    countChip:     { backgroundColor: colors.primaryGhost, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
    countChipText: { fontSize: 11, fontWeight: '800' as const, color: colors.primary },

    gridRow: { flexDirection: 'row' as const, gap: 12 },

    voucherCard:    { backgroundColor: colors.surface, borderRadius: 14, padding: 14, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, borderWidth: 1, borderColor: colors.border, ...shadow.xs },
    voucherLeft:    { flex: 1 },
    voucherItem:    { fontSize: 13, fontWeight: '700' as const, color: colors.text },
    voucherDate:    { fontSize: 11, color: colors.textMuted, marginTop: 2 },
    voucherCodeWrap:{ alignItems: 'center' as const, gap: 3, backgroundColor: colors.primaryGhost, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: colors.primary + '40' },
    voucherCode:    { fontSize: 12, fontWeight: '900' as const, color: colors.primary, letterSpacing: 1.2 },

    overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' as const },
    sheet:      { backgroundColor: colors.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingTop: 14 },
    sheetHandle:{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center' as const, marginBottom: 24 },
    sheetEmojiWrap:{ width: 80, height: 80, borderRadius: 24, alignSelf: 'center' as const, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 14 },
    sheetTitle:   { fontSize: 20, fontWeight: '900' as const, color: colors.text, textAlign: 'center' as const },
    sheetSponsor: { fontSize: 13, color: colors.textMuted, textAlign: 'center' as const, marginTop: 4, marginBottom: 6 },
    sheetBalRow:  { flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: colors.background, borderRadius: 16, padding: 16, marginTop: 16, marginBottom: 12 },
    sheetBalItem: { flex: 1, alignItems: 'center' as const, gap: 5 },
    sheetBalLabel:{ fontSize: 11, color: colors.textMuted, fontWeight: '600' as const },
    sheetBalVal:  { fontSize: 20, fontWeight: '900' as const, color: colors.text },
    sheetArrow:   { paddingHorizontal: 10 },
    sheetCostRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, backgroundColor: colors.goldLight, borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: colors.gold + '50' },
    sheetCostLabel: { fontSize: 14, color: colors.text, fontWeight: '600' as const },
    sheetCostBadge: { backgroundColor: colors.gold, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5 },
    sheetCostText:  { color: '#fff', fontWeight: '800' as const, fontSize: 14 },
    sheetBtns:      { flexDirection: 'row' as const, gap: 10 },
    sheetCancel:    { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: 16, padding: 15, alignItems: 'center' as const },
    sheetCancelText:{ color: colors.textSecondary, fontWeight: '700' as const, fontSize: 14 },
    sheetConfirm:   { flex: 2, borderRadius: 16, overflow: 'hidden' as const },
    sheetConfirmGrad:{ flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8, padding: 15 },
    sheetConfirmText:{ color: '#fff', fontWeight: '800' as const, fontSize: 15 },

    voucherTicket:  { alignSelf: 'stretch' as const, backgroundColor: colors.background, borderRadius: 20, overflow: 'hidden' as const, borderWidth: 1, borderColor: colors.border, marginVertical: 16 },
    ticketTop:      { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 18 },
    ticketRewardName:{ fontSize: 16, fontWeight: '800' as const, color: colors.text },
    ticketSponsor:  { fontSize: 12, color: colors.textMuted, marginTop: 3 },
    ticketDivider:  { height: 24, position: 'relative' as const, alignItems: 'center' as const, justifyContent: 'center' as const },
    ticketNockLeft: { position: 'absolute' as const, left: -12, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface },
    ticketNockRight:{ position: 'absolute' as const, right: -12, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface },
    ticketDash:     { flex: 1, height: 1, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' as const },
    qrMini:         { flexDirection: 'row' as const, flexWrap: 'wrap' as const, width: 90, gap: 3, marginBottom: 12 },
    qrDot:          { width: 9, height: 9, borderRadius: 2 },
    ticketCode:     { fontSize: 20, fontWeight: '900' as const, color: colors.primary, letterSpacing: 3 },

    copyBtn:     { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, borderWidth: 1.5, borderColor: colors.primary, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, alignSelf: 'stretch' as const, justifyContent: 'center' as const },
    copyBtnDone: { borderColor: colors.success, backgroundColor: colors.successLight },
    copyBtnText: { fontSize: 14, fontWeight: '700' as const, color: colors.primary },

    chestResultCard: { borderRadius: 28, overflow: 'hidden' as const, alignSelf: 'stretch' as const },
    chestResultGrad: { padding: 36, alignItems: 'center' as const },
    chestResultSub:  { fontSize: 14, fontWeight: '700' as const, color: 'rgba(255,255,255,0.6)', letterSpacing: 1, marginBottom: 6 },
    chestResultTitle:{ fontSize: 20, fontWeight: '800' as const, color: '#fff', textAlign: 'center' as const, marginBottom: 10 },
    chestResultChip: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 28 },
    chestResultChipText:{ color: '#4ADE80', fontWeight: '800' as const, fontSize: 13 },
    chestResultBtn:  { backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 },
    chestResultBtnText:{ color: colors.primary, fontWeight: '900' as const, fontSize: 16 },
  };
}
