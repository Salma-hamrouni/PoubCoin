import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, SafeAreaView, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Animated, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import EmptyState from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { Ionicons } from '@expo/vector-icons';
import BackButton from '../components/BackButton';
import {
  collection, query, where, limit, startAfter,
  getDocs, doc, updateDoc, increment, QueryDocumentSnapshot, DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n/useT';

const REACTIONS = [
  { key: 'heart', emoji: '❤️' },
  { key: 'fire',  emoji: '🔥' },
  { key: 'wow',   emoji: '😮' },
  { key: 'clap',  emoji: '👏' },
] as const;
type ReactionKey = typeof REACTIONS[number]['key'];

interface FeedReport {
  id: string;
  imageUri?: string;
  address: string;
  validatedAt?: any;
  createdAt?: any;
  coins: number;
  userId: string;
  likes?: number;
  reactions?: Record<ReactionKey, number>;
  latitude?: number;
  longitude?: number;
}

function AnimatedFeedCard({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 300, delay: index * 70, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(translateY, { toValue: 0, tension: 60, friction: 8, delay: index * 70, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

function relativeTime(ts: any, tFn: (k: any) => string): string {
  let date: Date;
  if (!ts) return '';
  if (ts?.toDate) date = ts.toDate();
  else if (typeof ts === 'string') date = new Date(ts);
  else date = new Date(ts);

  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return tFn('time_just_now');
  if (diff < 3600) return `${tFn('time_ago')} ${Math.floor(diff / 60)} ${tFn('time_min')}`;
  if (diff < 86400) return `${tFn('time_ago')} ${Math.floor(diff / 3600)} ${tFn('time_hour_short')}`;
  return `${tFn('time_ago')} ${Math.floor(diff / 86400)} ${tFn('time_day_short')}`;
}

function anonymousName(userId: string): string {
  return userId.slice(0, 3).toLowerCase() + '***';
}

export default function FeedScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { user } = useAuth();
  const t = useT();

  const PAGE_SIZE = 10;
  const [reports, setReports] = useState<FeedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [myReactions, setMyReactions] = useState<Record<string, ReactionKey>>({});
  const prevMyReactions = useRef<Record<string, ReactionKey>>({});
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const fetchPage = useCallback(async (reset = false) => {
    try {
      setFetchError(false);
      // Sans orderBy pour éviter l'index composite Firestore — tri côté client
      const q = reset || !lastDocRef.current
        ? query(collection(db, 'reports'), where('status', '==', 'validated'), limit(PAGE_SIZE * 3))
        : query(collection(db, 'reports'), where('status', '==', 'validated'), startAfter(lastDocRef.current), limit(PAGE_SIZE * 3));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => {
        const raw = d.data();
        if (raw.createdAt?.toDate) raw.createdAt = raw.createdAt.toDate().toISOString();
        if (raw.date?.toDate) raw.date = raw.date.toDate().toISOString();
        return { id: d.id, ...raw } as FeedReport;
      }).sort((a, b) => {
        const ta = new Date(a.validatedAt ?? a.createdAt ?? 0).getTime();
        const tb = new Date(b.validatedAt ?? b.createdAt ?? 0).getTime();
        return tb - ta;
      });
      lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
      setHasMore(snap.docs.length >= PAGE_SIZE);
      setReports(prev => reset ? data : [...prev, ...data]);
    } catch {
      setFetchError(true);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchPage(true).finally(() => setLoading(false));
  }, []);

  const toggleNearby = async () => {
    if (!nearbyOnly && !userLocation) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    }
    setNearbyOnly(v => !v);
  };

  const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const displayedReports = nearbyOnly && userLocation
    ? [...reports]
        .filter(r => r.latitude != null && r.longitude != null)
        .map(r => ({ ...r, _dist: haversineKm(userLocation.latitude, userLocation.longitude, r.latitude!, r.longitude!) }))
        .filter(r => r._dist <= 10)
        .sort((a, b) => a._dist - b._dist)
    : reports;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    lastDocRef.current = null;
    await fetchPage(true);
    setRefreshing(false);
  }, [fetchPage]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchPage(false);
    setLoadingMore(false);
  };

  const likeAnims = useRef<Record<string, Animated.Value>>({});
  const getLikeAnim = (id: string) => {
    if (!likeAnims.current[id]) likeAnims.current[id] = new Animated.Value(1);
    return likeAnims.current[id];
  };

  const handleReaction = async (report: FeedReport, key: ReactionKey) => {
    const prev = myReactions[report.id];
    if (prev === key) return;
    prevMyReactions.current = { ...myReactions };
    setMyReactions(r => ({ ...r, [report.id]: key }));
    try {
      const update: Record<string, any> = {};
      if (prev) update[`reactions.${prev}`] = increment(-1);
      update[`reactions.${key}`] = increment(1);
      await updateDoc(doc(db, 'reports', report.id), update);
    } catch {
      setMyReactions(prevMyReactions.current);
    }
  };

  const handleLike = async (report: FeedReport) => {
    if (likedIds.has(report.id)) return;
    // Pulse animation
    const anim = getLikeAnim(report.id);
    Animated.sequence([
      Animated.spring(anim, { toValue: 1.4, tension: 200, friction: 4, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(anim, { toValue: 1,   tension: 200, friction: 4, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
    setLikedIds(prev => new Set(prev).add(report.id));
    try {
      await updateDoc(doc(db, 'reports', report.id), { likes: increment(1) });
    } catch {
      setLikedIds(prev => {
        const next = new Set(prev);
        next.delete(report.id);
        return next;
      });
    }
  };

  const renderItem = ({ item, index }: { item: FeedReport; index: number }) => {
    const liked = likedIds.has(item.id);
    const shortAddress = item.address ? item.address.split(',')[0] : 'Position inconnue';
    const time = relativeTime(item.validatedAt ?? item.createdAt, t);
    const anonName = anonymousName(item.userId);
    const likesCount = (item.likes ?? 0) + (liked ? 1 : 0);

    return (
      <AnimatedFeedCard index={index}>
      <View style={styles.card}>
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={styles.cardImage} contentFit="cover" transition={200} />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Ionicons name="image-outline" size={36} color={colors.textMuted} />
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 6 }}>Photo non disponible</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <View style={styles.cardTopLeft}>
              <Text style={styles.cardAddress} numberOfLines={1} ellipsizeMode="tail">{shortAddress}</Text>
              <Text style={styles.cardTime}>{time}</Text>
            </View>
            <View style={styles.coinsBadge}>
              <Text style={styles.coinsText}>+{item.coins} 🪙</Text>
            </View>
          </View>
          {/* Reactions bar — optimistic: adjust counts locally before Firestore confirms */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            {REACTIONS.map(r => {
              const serverCount = item.reactions?.[r.key] ?? 0;
              const myPrev = prevMyReactions.current[item.id];
              const myNow  = myReactions[item.id];
              // +1 if newly chosen, -1 if previously chosen and switched away
              const delta = (myNow === r.key ? 1 : 0) - (myPrev === r.key ? 1 : 0);
              const count = Math.max(0, serverCount + delta);
              const active = myNow === r.key;
              return (
                <TouchableOpacity key={r.key}
                  onPress={() => handleReaction(item, r.key)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: active ? colors.primaryGhost : colors.background, borderWidth: 1, borderColor: active ? colors.primary + '50' : colors.border }}>
                  <Text style={{ fontSize: 14 }}>{r.emoji}</Text>
                  {count > 0 && <Text style={{ fontSize: 11, fontWeight: '700', color: active ? colors.primary : colors.textMuted }}>{count}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.cardBottom}>
            <View style={styles.citizenChip}>
              <Ionicons name="person-outline" size={12} color={colors.textMuted} />
              <Text style={styles.citizenText}>{anonName}</Text>
            </View>
            <TouchableOpacity
              style={[styles.likeBtn, liked && styles.likeBtnActive]}
              onPress={() => handleLike(item)}
            >
              <Animated.View style={{ transform: [{ scale: getLikeAnim(item.id) }] }}>
                <Ionicons name={liked ? 'thumbs-up' : 'thumbs-up-outline'} size={16} color={liked ? colors.primary : colors.textMuted} />
              </Animated.View>
              <Text style={[styles.likeCount, liked && { color: colors.primary }]}>{likesCount}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      </AnimatedFeedCard>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} variant="light" />
        <View style={styles.headerCenter}>
          <Text style={styles.title}>{t('feed_title')}</Text>
          <Text style={styles.subtitle}>{t('feed_subtitle')}</Text>
        </View>
        <TouchableOpacity
          onPress={toggleNearby}
          style={{
            width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
            backgroundColor: nearbyOnly ? colors.primary : colors.background,
            borderWidth: 1, borderColor: nearbyOnly ? colors.primary : colors.border,
          }}
        >
          <Ionicons name="location" size={18} color={nearbyOnly ? '#fff' : colors.textMuted} />
        </TouchableOpacity>
      </View>

      {nearbyOnly && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.primary + '14', borderBottomWidth: 1, borderBottomColor: colors.primary + '30' }}>
          <Ionicons name="location" size={14} color={colors.primary} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary, flex: 1 }}>Signalements dans un rayon de 10 km</Text>
          <TouchableOpacity onPress={() => setNearbyOnly(false)}>
            <Ionicons name="close-circle" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}
      {fetchError && !loading && (
        <View style={{ margin: 16, padding: 16, backgroundColor: '#FEF2F2', borderRadius: 12, borderWidth: 1, borderColor: '#FECACA', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="wifi-outline" size={20} color="#DC2626" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#DC2626', fontWeight: '700', fontSize: 14 }}>Impossible de charger le feed</Text>
            <Text style={{ color: '#DC2626', fontSize: 12, marginTop: 2, opacity: 0.8 }}>Vérifiez votre connexion et réessayez.</Text>
          </View>
          <TouchableOpacity onPress={() => { setLoading(true); fetchPage(true).finally(() => setLoading(false)); }}>
            <Ionicons name="refresh" size={20} color="#DC2626" />
          </TouchableOpacity>
        </View>
      )}
      {loading ? (
        <View style={{ padding: 16, gap: 16 }}>
          {[0,1,2,3].map(i => (
            <View key={i} style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
              <Skeleton width="100%" height={180} borderRadius={0} />
              <View style={{ padding: 14, gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Skeleton width="55%" height={14} />
                  <Skeleton width="20%" height={14} borderRadius={10} />
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[0,1,2,3].map(j => <Skeleton key={j} width={48} height={30} borderRadius={20} />)}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Skeleton width="30%" height={28} borderRadius={10} />
                  <Skeleton width="22%" height={28} borderRadius={10} />
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={displayedReports}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 16 }}>
                {[0, 1].map(i => (
                  <View key={i} style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                    <Skeleton width="100%" height={160} borderRadius={0} />
                    <View style={{ padding: 14, gap: 10 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Skeleton width="52%" height={13} />
                        <Skeleton width="18%" height={13} borderRadius={10} />
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {[0,1,2,3].map(j => <Skeleton key={j} width={44} height={28} borderRadius={20} />)}
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Skeleton width="28%" height={26} borderRadius={10} />
                        <Skeleton width="20%" height={26} borderRadius={10} />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : hasMore && reports.length > 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: 0.45 }}>
                  <View style={{ height: 1, width: 40, backgroundColor: colors.border }} />
                  <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>Défiler pour charger plus</Text>
                  <View style={{ height: 1, width: 40, backgroundColor: colors.border }} />
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            nearbyOnly ? (
              <EmptyState
                icon="location-outline"
                emoji="📍"
                title="Aucun signalement à proximité"
                subtitle="Aucun déchet signalé dans un rayon de 10 km autour de vous."
                actionLabel="Signaler un déchet"
                onAction={() => navigation.navigate('Camera')}
              />
            ) : (
              <EmptyState
                icon="earth-outline"
                emoji="🌍"
                title={t('feed_empty')}
                subtitle={t('feed_empty_sub')}
                actionLabel="Signaler un déchet"
                onAction={() => navigation.navigate('Camera')}
              />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors: any): any => ({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  headerCenter: { flex: 1, alignItems: 'center', marginHorizontal: 8 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 11, color: colors.textMuted, marginTop: 1 },

  list: { padding: 16, gap: 12, paddingBottom: 40 },

  card: {
    backgroundColor: colors.surface, borderRadius: 20,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  cardImage: { width: '100%', height: 200 },
  cardImagePlaceholder: {
    width: '100%', height: 130,
    backgroundColor: colors.background,
    justifyContent: 'center', alignItems: 'center',
  },
  cardImageEmoji: { fontSize: 52 },
  cardBody: { padding: 16, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardTopLeft: { flex: 1, gap: 3 },
  cardAddress: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardTime: { fontSize: 12, color: colors.textMuted },
  coinsBadge: {
    backgroundColor: '#E8F5E9', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  coinsText: { fontSize: 13, fontWeight: '800', color: '#388E3C' },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  citizenChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.background, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: colors.border,
  },
  citizenText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  likeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
  },
  likeBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryGhost },
  likeCount: { fontSize: 13, fontWeight: '700', color: colors.textMuted },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  emptySub: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
});
