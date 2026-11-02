import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, SafeAreaView, ScrollView, FlatList,
  TouchableOpacity, ActivityIndicator, Animated, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Avatar from '../components/Avatar';
import Chip from '../components/Chip';
import { collection, query, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { shadow, radius } from '../theme';

const CITIES: { name: string; emoji: string }[] = [
  { name: 'Toutes',    emoji: '🌍' },
  { name: 'Tunis',     emoji: '🏙️' },
  { name: 'Sfax',      emoji: '🏭' },
  { name: 'Sousse',    emoji: '🏖️' },
  { name: 'Bizerte',   emoji: '⚓' },
  { name: 'Ariana',    emoji: '🌿' },
  { name: 'Ben Arous', emoji: '🌆' },
  { name: 'La Marsa',  emoji: '🌊' },
  { name: 'Nabeul',    emoji: '🏺' },
  { name: 'Monastir',  emoji: '🕌' },
];

type Player = {
  id: string; name: string; avatar: string; photoURL?: string;
  city: string; reports: number; coins: number; rank: number;
};

const MEDALS = [
  { color: '#FFD700', bg: '#FFF8E1', rank: '1er' },
  { color: '#9E9E9E', bg: '#F5F5F5', rank: '2e'  },
  { color: '#CD7F32', bg: '#FBE9E7', rank: '3e'  },
];

function AnimatedRow({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(24)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 260, delay: index * 40, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(translateX, { toValue: 0, duration: 260, delay: index * 40, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateX }] }}>{children}</Animated.View>;
}

function PodiumCard({
  player, medalIdx, height, navigation, colors,
}: {
  player: Player; medalIdx: number; height: number;
  navigation: any; colors: any;
}) {
  const anim  = useRef(new Animated.Value(0)).current;
  const medal = MEDALS[medalIdx];
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, tension: 50, friction: 7, delay: medalIdx * 120, useNativeDriver: Platform.OS !== 'web' }).start();
  }, []);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => navigation.navigate('PublicProfile', { userId: player.id, userName: player.name, userCity: player.city })}
      style={{ flex: 1, alignItems: 'center' }}
    >
      {medalIdx === 0 && <Ionicons name="trophy" size={22} color="#FFD700" style={{ marginBottom: 4 }} />}

      {/* Avatar */}
      <Avatar
        uri={player.photoURL}
        emoji={!player.photoURL ? player.avatar : undefined}
        name={player.name}
        size={medalIdx === 0 ? 68 : 54}
        ring={medal.color}
        ringWidth={3}
        style={{ marginBottom: 6, ...shadow.sm }}
      />

      {/* Badge rank */}
      <Chip label={medal.rank} size="xs" color={medal.color} variant="solid" style={{ marginBottom: 4, alignSelf: 'center' }} />

      <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text, textAlign: 'center', maxWidth: 80 }} numberOfLines={1}>
        {player.name.split(' ')[0]}
      </Text>
      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{player.reports} 📋</Text>

      {/* Bar */}
      <Animated.View style={{
        width: '80%', height: anim.interpolate({ inputRange: [0, 1], outputRange: [0, height] }),
        backgroundColor: medal.color + '30', borderTopWidth: 2.5, borderTopColor: medal.color,
        borderTopLeftRadius: 6, borderTopRightRadius: 6,
        marginTop: 8, justifyContent: 'center', alignItems: 'center',
        overflow: 'hidden',
      }}>
        <Text style={{ fontSize: 20, fontWeight: '900', color: medal.color }}>{medalIdx + 1}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function CityLeaderboardScreen({ navigation }: any) {
  const { user }    = useAuth();
  const { colors }  = useTheme();
  const [selectedCity, setSelectedCity] = useState('Toutes');
  const [players, setPlayers]   = useState<Player[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getDocs(query(collection(db, 'users'), limit(200))),
      getDocs(query(collection(db, 'reports'), where('status', '==', 'validated'))),
    ]).then(([usersSnap, reportsSnap]) => {
      // Count validated reports and coins per userId
      const reportCounts: Record<string, number> = {};
      const coinCounts:   Record<string, number> = {};
      reportsSnap.docs.forEach(d => {
        const uid = d.data().userId;
        if (!uid) return;
        reportCounts[uid] = (reportCounts[uid] ?? 0) + 1;
        coinCounts[uid]   = (coinCounts[uid]   ?? 0) + (d.data().coins ?? 50);
      });

      let all = usersSnap.docs
        .filter(d => d.data().role !== 'municipality_admin')
        .map(d => ({
          id:       d.id,
          name:     d.data().name     ?? 'Citoyen',
          avatar:   d.data().avatar   ?? '🌱',
          photoURL: d.data().photoURL ?? undefined,
          city:     d.data().city     ?? 'Tunis',
          reports:  reportCounts[d.id] ?? 0,
          coins:    coinCounts[d.id]   ?? 0,
          rank:     0,
        }));

      all.sort((a, b) => b.reports - a.reports);
      if (selectedCity !== 'Toutes') {
        all = all.filter(p => p.city?.trim().toLowerCase() === selectedCity.trim().toLowerCase());
      }
      all.forEach((p, i) => { p.rank = i + 1; });
      setPlayers(all);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selectedCity]);

  const top3  = players.slice(0, 3);
  const rest  = players.slice(3);
  const myIdx = players.findIndex(p => p.id === user?.id);
  const me    = myIdx >= 0 ? players[myIdx] : null;

  const cityInfo = CITIES.find(c => c.name === selectedCity) ?? CITIES[0];
  const totalReports = players.reduce((s, p) => s + p.reports, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Header gradient ── */}
      <LinearGradient
        colors={[colors.primaryDark ?? '#0D4A27', colors.primary]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: 2 }}>CLASSEMENT</Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff' }}>
              {cityInfo.emoji} {selectedCity === 'Toutes' ? 'Toutes les villes' : selectedCity}
            </Text>
          </View>
          {me && (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '700' }}>MON RANG</Text>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff' }}>#{myIdx + 1}</Text>
            </View>
          )}
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          {[
            { icon: 'people', label: `${players.length} citoyens` },
            { icon: 'camera', label: `${totalReports} signalements` },
          ].map(s => (
            <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Ionicons name={s.icon as any} size={13} color="rgba(255,255,255,0.8)" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* ── City chips ── */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 10, gap: 8 }}
        style={{ backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, flexGrow: 0 }}
      >
        {CITIES.map(c => {
          const active = selectedCity === c.name;
          return (
            <TouchableOpacity
              key={c.name}
              onPress={() => setSelectedCity(c.name)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 5,
                paddingHorizontal: 14, paddingVertical: 7,
                borderRadius: 20, borderWidth: 1.5,
                backgroundColor: active ? colors.primary : colors.background,
                borderColor: active ? colors.primary : colors.border,
              }}
            >
              <Text style={{ fontSize: 13 }}>{c.emoji}</Text>
              <Text style={{ fontSize: 12, fontWeight: '800', color: active ? '#fff' : colors.text }}>{c.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : players.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 }}>
          <Text style={{ fontSize: 56 }}>🌆</Text>
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, textAlign: 'center' }}>Aucun citoyen ici</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 }}>
            Sois le premier à signaler un déchet à {selectedCity} !
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Camera')}
            style={{ backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 }}
          >
            <Text style={{ color: '#fff', fontWeight: '800' }}>📸 Signaler maintenant</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rest}
          keyExtractor={p => p.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListHeaderComponent={
            <>
              {/* ── Podium ── */}
              {top3.length >= 1 && (
                <View style={{
                  backgroundColor: colors.surface,
                  borderBottomWidth: 1, borderBottomColor: colors.border,
                  paddingTop: 20, paddingHorizontal: 16, paddingBottom: 0,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8 }}>
                    {/* 2nd */}
                    {top3[1] && (
                      <View style={{ flex: 1, marginTop: 24 }}>
                        <PodiumCard player={top3[1]} medalIdx={1} height={72} navigation={navigation} colors={colors} />
                      </View>
                    )}
                    {/* 1st */}
                    <View style={{ flex: 1 }}>
                      <PodiumCard player={top3[0]} medalIdx={0} height={100} navigation={navigation} colors={colors} />
                    </View>
                    {/* 3rd */}
                    {top3[2] && (
                      <View style={{ flex: 1, marginTop: 44 }}>
                        <PodiumCard player={top3[2]} medalIdx={2} height={52} navigation={navigation} colors={colors} />
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* ── Ma position ── */}
              {me && myIdx >= 3 && (
                <View style={{
                  margin: 16, marginBottom: 4, borderRadius: radius.md, overflow: 'hidden', ...shadow.md,
                }}>
                  <LinearGradient colors={[colors.primary, colors.primaryDark ?? '#0D4A27']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }}>
                    <Avatar uri={me.photoURL} emoji={!me.photoURL ? me.avatar : undefined} name={me.name} size={44} ring="rgba(255,255,255,0.45)" ringWidth={2} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{me.name}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>📍 {me.city} · {me.reports} signalements</Text>
                    </View>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 }}>
                      <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18 }}>#{myIdx + 1}</Text>
                    </View>
                  </LinearGradient>
                </View>
              )}

              {rest.length > 0 && (
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginHorizontal: 16, marginTop: 16, marginBottom: 8 }}>
                  Suite du classement
                </Text>
              )}
            </>
          }
          renderItem={({ item: p, index }) => {
            const isMe = p.id === user?.id;
            return (
              <AnimatedRow index={index}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => !isMe && navigation.navigate('PublicProfile', { userId: p.id, userName: p.name, userCity: p.city })}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    marginHorizontal: 16, marginBottom: 8,
                    padding: 12, borderRadius: radius.md,
                    backgroundColor: isMe ? colors.primaryGhost : colors.surface,
                    borderWidth: 1.5,
                    borderColor: isMe ? colors.primary : colors.border,
                    ...shadow.xs,
                  }}
                >
                  {/* Rank */}
                  <View style={{
                    width: 34, height: 34, borderRadius: 10,
                    backgroundColor: isMe ? colors.primary : colors.background,
                    justifyContent: 'center', alignItems: 'center',
                    borderWidth: 1, borderColor: isMe ? colors.primary : colors.border,
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: '900', color: isMe ? '#fff' : colors.textMuted }}>
                      #{p.rank}
                    </Text>
                  </View>

                  {/* Avatar */}
                  <Avatar uri={p.photoURL} emoji={!p.photoURL ? p.avatar : undefined} name={p.name} size={40} ring={isMe ? colors.primary : undefined} ringWidth={2} />

                  {/* Info */}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: isMe ? colors.primary : colors.text }} numberOfLines={1}>
                        {p.name}
                      </Text>
                      {isMe && (
                        <View style={{ backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
                          <Text style={{ fontSize: 9, fontWeight: '900', color: '#fff' }}>MOI</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Ionicons name="location-outline" size={11} color={colors.textMuted} />
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>{p.city}</Text>
                    </View>
                  </View>

                  {/* Stats */}
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Ionicons name="camera" size={11} color={colors.info} />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: colors.info }}>{p.reports}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFBEB', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 11 }}>🪙</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.gold ?? '#F59E0B' }}>{p.coins}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </AnimatedRow>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
