import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, SafeAreaView, FlatList, TouchableOpacity, RefreshControl,
  Animated, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useTheme } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import { radius, shadow } from '../theme';
import { useT } from '../i18n/useT';

interface NearbyReport {
  id: string;
  address: string;
  latitude?: number;
  longitude?: number;
  status: string;
  date?: string;
  imageUri?: string;
}

interface Mission {
  id: string;
  report: NearbyReport;
  distance: number; // metres
  reward: number;
  type: 'signal' | 'clean';
  accepted: boolean;
  completed: boolean;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceLabel(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

const MISSION_ICONS = ['🗑️', '♻️', '🧹', '📦', '🪣'];
const ZONE_EMOJIS  = ['🏙️', '🏘️', '🌳', '🏖️', '🏪'];

function MissionCard({ mission, onAccept, onComplete, index }: {
  mission: Mission;
  onAccept: () => void;
  onComplete: () => void;
  index: number;
}) {
  const { colors } = useTheme();
  const t = useT();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 400, delay: index * 80,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, []);

  const isUrgent = mission.distance < 300;
  const zone = mission.report.address?.split(',')[1]?.trim() ?? mission.report.address?.split(',')[0];

  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
    }}>
      <View style={{
        backgroundColor: colors.surface, borderRadius: radius.lg,
        marginBottom: 12, overflow: 'hidden',
        borderWidth: 1, borderColor: isUrgent ? '#FCA5A5' : colors.border,
        ...shadow.sm,
      }}>
        {/* Urgency strip */}
        {isUrgent && (
          <View style={{ backgroundColor: '#FEF2F2', paddingHorizontal: 14, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 12 }}>🚨</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626' }}>{t('mission_urgent')} — {t('mission_less_300')}</Text>
          </View>
        )}

        <View style={{ padding: 16 }}>
          {/* Header row */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{
              width: 50, height: 50, borderRadius: radius.md,
              backgroundColor: isUrgent ? '#FEE2E2' : colors.primaryGhost,
              justifyContent: 'center', alignItems: 'center',
            }}>
              <Text style={{ fontSize: 26 }}>{MISSION_ICONS[index % MISSION_ICONS.length]}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                  {ZONE_EMOJIS[index % ZONE_EMOJIS.length]} {zone ?? t('mission_unknown')}
                </Text>
                <View style={{
                  backgroundColor: isUrgent ? '#FEE2E2' : colors.primaryGhost,
                  borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3,
                }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: isUrgent ? '#DC2626' : colors.primary }}>
                    📍 {distanceLabel(mission.distance)}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: colors.textMuted }} numberOfLines={2}>
                {mission.report.address}
              </Text>
            </View>
          </View>

          {/* Mission description */}
          <View style={{
            backgroundColor: colors.background, borderRadius: radius.md,
            padding: 12, marginTop: 12, gap: 6,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="flag-outline" size={14} color={colors.primary} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{t('mission_obj')}</Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 19 }}>
              {mission.type === 'signal'
                ? `${t('mission_signal_desc')} ${mission.reward} ${t('mission_coins_suffix')}`
                : `${t('mission_clean_desc')} ${mission.reward} ${t('mission_coins_suffix')}`}
            </Text>
          </View>

          {/* Reward + action */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 10 }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ backgroundColor: '#FEF9C3', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 14 }}>🪙</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#B45309' }}>+{mission.reward}</Text>
              </View>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>{t('mission_reward')}</Text>
            </View>

            {!mission.accepted ? (
              <TouchableOpacity
                onPress={onAccept}
                style={{ backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 18, paddingVertical: 10 }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{t('mission_accept')}</Text>
              </TouchableOpacity>
            ) : !mission.completed ? (
              <TouchableOpacity
                onPress={onComplete}
                style={{ backgroundColor: '#16A34A', borderRadius: radius.md, paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Ionicons name="camera" size={15} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{t('mission_report_btn')}</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ backgroundColor: '#DCFCE7', borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="checkmark-circle" size={15} color="#16A34A" />
                <Text style={{ color: '#16A34A', fontWeight: '700', fontSize: 13 }}>{t('mission_done')}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

export default function NearbyMissionsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { addCoins } = useWallet();
  const t = useT();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userPos, setUserPos] = useState<{ lat: number; lon: number } | null>(null);
  const [acceptedMap, setAcceptedMap] = useState<Record<string, boolean>>({});
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({});

  // Try to get location
  useEffect(() => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserPos({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => setUserPos({ lat: 36.8065, lon: 10.1815 }), // Tunis fallback
        { timeout: 5000 }
      );
    } else {
      // Native — fallback to Tunis center (expo-location not imported to avoid bundle bloat)
      setUserPos({ lat: 36.8065, lon: 10.1815 });
    }
  }, []);

  // Load pending reports from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'reports'), snap => {
      const pending = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as NearbyReport))
        .filter(r => r.status === 'pending' && r.latitude && r.longitude);
      buildMissions(pending);
      setLoading(false);
    });
    return unsub;
  }, [userPos]);

  const buildMissions = (reports: NearbyReport[]) => {
    const pos = userPos ?? { lat: 36.8065, lon: 10.1815 };
    const withDist = reports
      .map((r, i) => ({
        id: r.id,
        report: r,
        distance: r.latitude && r.longitude
          ? haversine(pos.lat, pos.lon, r.latitude!, r.longitude!)
          : 200 + i * 150,
        reward: [40, 50, 60, 75, 30, 45][i % 6],
        type: (i % 3 === 0 ? 'clean' : 'signal') as 'signal' | 'clean',
        accepted: false,
        completed: false,
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 12);

    setMissions(withDist);
  };

  const accept = (id: string) => {
    setAcceptedMap(m => ({ ...m, [id]: true }));
  };

  const complete = async (mission: Mission) => {
    if (Platform.OS === 'web') {
      window.alert(`${t('mission_complete_title')} +${mission.reward} 🪙 ${t('mission_complete_msg')}`);
    } else {
      Alert.alert(t('mission_complete_title'), `+${mission.reward} 🪙 ${t('mission_complete_msg')}`);
    }
    await addCoins(mission.reward, `Mission terrain — ${mission.report.address?.split(',')[0]}`);
    setCompletedMap(m => ({ ...m, [mission.id]: true }));
    navigation.navigate('Camera');
  };

  const completedCount = Object.values(completedMap).filter(Boolean).length;
  const acceptedCount  = Object.values(acceptedMap).filter(Boolean).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <LinearGradient
        colors={[colors.primaryDark, colors.primary]}
        style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 20 }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ width: 36, height: 36, borderRadius: radius.sm, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 14 }}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5, marginBottom: 4 }}>{t('mission_eco_label')}</Text>
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 14 }}>🗺️ {t('mission_around')}</Text>

        {/* Stats chips */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            { label: t('mission_chip_available'), value: missions.length, bg: 'rgba(255,255,255,0.15)' },
            { label: t('mission_chip_accepted'),   value: acceptedCount,   bg: 'rgba(255,255,255,0.15)' },
            { label: t('mission_chip_completed'), value: completedCount,   bg: 'rgba(255,255,255,0.2)' },
          ].map(chip => (
            <View key={chip.label} style={{ flex: 1, backgroundColor: chip.bg, borderRadius: radius.md, padding: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>{chip.value}</Text>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{chip.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Tip banner */}
      <View style={{ backgroundColor: '#FFFBEB', borderBottomWidth: 1, borderBottomColor: '#FDE68A', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 14 }}>💡</Text>
        <Text style={{ fontSize: 12, color: '#92400E', flex: 1 }}>
          {t('mission_tip_text')}
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>{t('mission_searching')}</Text>
        </View>
      ) : (
        <FlatList
          data={missions}
          keyExtractor={m => m.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 900); }} colors={[colors.primary]} tintColor={colors.primary} />}
          ListHeaderComponent={
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8, marginBottom: 12, textTransform: 'uppercase' }}>
              {missions.length} mission{missions.length > 1 ? 's' : ''} disponible{missions.length > 1 ? 's' : ''}
            </Text>
          }
          renderItem={({ item, index }) => (
            <MissionCard
              mission={{ ...item, accepted: !!acceptedMap[item.id], completed: !!completedMap[item.id] }}
              index={index}
              onAccept={() => accept(item.id)}
              onComplete={() => complete({ ...item, accepted: true, completed: false })}
            />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 60, gap: 12, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 52 }}>🎉</Text>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{t('explore_empty')}</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 }}>
                {t('mission_empty_sub2')}
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, marginTop: 4 }}
                onPress={() => navigation.navigate('Camera')}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{t('mission_camera_btn')}</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
