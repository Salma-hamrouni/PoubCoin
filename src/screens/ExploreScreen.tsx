import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator, Animated, Easing, Platform, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useTheme } from '../context/ThemeContext';
import { radius, shadow } from '../theme';
import { useT } from '../i18n/useT';

interface Report { id: string; latitude: number; longitude: number; address: string; status: string; }

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function getCompassDir(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1*Math.PI/180)*Math.sin(lat2*Math.PI/180) - Math.sin(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.cos(dLon);
  const bearing = (Math.atan2(y, x) * 180/Math.PI + 360) % 360;
  const dirs = ['N','NE','E','SE','S','SO','O','NO'];
  return dirs[Math.round(bearing / 45) % 8];
}

const RADIUS_OPTIONS = [200, 500, 1000, 2000];

export default function ExploreScreen({ navigation }: any) {
  const { colors } = useTheme();
  const t = useT();
  const [userLoc, setUserLoc] = useState<{latitude:number;longitude:number}|null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [radius2, setRadius2] = useState(500);
  const [loading, setLoading] = useState(true);
  const [locError, setLocError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const radarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.timing(radarAnim, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
    ])).start();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'reports'), limit(200)), snap => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as Report)));
    });
    return unsub;
  }, []);

  const fetchLocation = async () => {
    setLoading(true);
    setLocError(false);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { setLocError(true); setLoading(false); return; }
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Platform.OS === 'web' ? Location.Accuracy.Lowest : Location.Accuracy.Balanced });
      setUserLoc({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch { setLocError(true); }
    setLoading(false);
  };

  useEffect(() => { fetchLocation(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLocation();
    setRefreshing(false);
  };

  const nearby = userLoc
    ? reports
        .map(r => ({ ...r, dist: haversine(userLoc.latitude, userLoc.longitude, r.latitude, r.longitude) }))
        .filter(r => r.dist <= radius2)
        .sort((a, b) => a.dist - b.dist)
    : [];

  const getStatusColor = (s: string) => s === 'validated' ? '#16A34A' : s === 'rejected' ? '#DC2626' : '#CA8A04';
  const getStatusLabel = (s: string) => s === 'validated' ? `${t('map_validated')} ✓` : s === 'rejected' ? t('map_rejected') : t('map_pending');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ backgroundColor: colors.primary, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 14, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -30 }} />
        <TouchableOpacity style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5 }}>{t('explore_label')}</Text>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.3, marginTop: 1 }}>{t('explore_title')}</Text>
        </View>
        <Text style={{ fontSize: 26 }}>🗺️</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary, colors.primaryLight]} tintColor={colors.primary} progressBackgroundColor={colors.surface} title="Actualisation..." titleColor={colors.textMuted} />}>

        {/* Radar */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <View style={{ width: 220, height: 220, justifyContent: 'center', alignItems: 'center' }}>
            {/* Radar rings */}
            {[1, 0.66, 0.33].map((scale, i) => (
              <View key={i} style={{ position: 'absolute', width: 220*scale, height: 220*scale, borderRadius: 110*scale, borderWidth: 1, borderColor: colors.primary + '35' }} />
            ))}
            {/* Radar sweep */}
            <Animated.View style={{
              position: 'absolute', width: 220, height: 220, borderRadius: 110,
              backgroundColor: colors.primary + '0A',
              transform: [{ rotate: radarAnim.interpolate({ inputRange: [0,1], outputRange: ['0deg','360deg'] }) }],
            }}>
              <View style={{ position: 'absolute', top: 0, left: '50%', width: 110, height: 110, backgroundColor: colors.primary + '18', borderTopRightRadius: 110 }} />
            </Animated.View>
            {/* Center dot */}
            <Animated.View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, transform: [{ scale: pulseAnim }], borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)' }} />
            {/* Nearby blips */}
            {nearby.slice(0, 8).map((r, i) => {
              const angle = (i / Math.max(nearby.length, 1)) * 2 * Math.PI;
              const pct = Math.min(r.dist / radius2, 1);
              const bx = 95 * pct * Math.cos(angle);
              const by = 95 * pct * Math.sin(angle);
              return (
                <View key={r.id} style={{ position: 'absolute', left: 110 + bx - 6, top: 110 + by - 6, width: 12, height: 12, borderRadius: 6, backgroundColor: getStatusColor(r.status), borderWidth: 2, borderColor: '#fff' }} />
              );
            })}
          </View>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
          ) : locError ? (
            <Text style={{ color: '#DC2626', fontSize: 13, marginTop: 8, fontWeight: '600' }}>{t('explore_loc_error')}</Text>
          ) : (
            <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 8 }}>{nearby.length} {t('explore_count')} {radius2 >= 1000 ? `${radius2/1000} km` : `${radius2} m`}</Text>
          )}
        </View>

        {/* Radius selector */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 22 }}>
          {RADIUS_OPTIONS.map(r => (
            <TouchableOpacity key={r} onPress={() => setRadius2(r)}
              style={{ flex: 1, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center', backgroundColor: radius2 === r ? colors.primary : colors.surface, borderWidth: 1.5, borderColor: radius2 === r ? colors.primary : colors.border }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: radius2 === r ? '#fff' : colors.textMuted }}>
                {r >= 1000 ? `${r/1000}km` : `${r}m`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Nearby reports list */}
        {!loading && !locError && nearby.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
            <Text style={{ fontSize: 48 }}>🎉</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{t('explore_empty')}</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>{t('explore_empty_sub')}</Text>
          </View>
        )}
        {nearby.map((r, i) => (
          <View key={r.id} style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: colors.border, ...shadow.sm }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: getStatusColor(r.status) + '15', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: getStatusColor(r.status) }}>
              <Text style={{ fontSize: 20 }}>🗑️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }} numberOfLines={1}>{r.address || t('explore_unknown')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>
                  {r.dist < 1000 ? `${Math.round(r.dist)} m` : `${(r.dist/1000).toFixed(1)} km`}
                </Text>
                {userLoc && <Text style={{ fontSize: 11, color: colors.textMuted }}>· {getCompassDir(userLoc.latitude, userLoc.longitude, r.latitude, r.longitude)}</Text>}
                <View style={{ backgroundColor: getStatusColor(r.status) + '22', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: getStatusColor(r.status) }}>{getStatusLabel(r.status)}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={{ backgroundColor: colors.primaryGhost, borderRadius: radius.sm, padding: 10, borderWidth: 1, borderColor: colors.border }} onPress={() => navigation.navigate('Camera')}>
              <Ionicons name="camera-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
