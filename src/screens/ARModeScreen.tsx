import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, SafeAreaView, TouchableOpacity,
  Dimensions, Platform, Animated, Easing, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { radius } from '../theme';
import { useT } from '../i18n/useT';

const { width, height } = Dimensions.get('window');

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) - Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function getCompassDir(b: number): string {
  return ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(b / 45) % 8];
}

interface Report { id: string; latitude: number; longitude: number; address: string; status: string; }

const getStatusColor = (s: string) => s === 'validated' ? '#16A34A' : s === 'rejected' ? '#DC2626' : '#CA8A04';

export default function ARModeScreen({ navigation }: any) {
  const { colors } = useTheme();
  const t = useT();
  const getStatusLabel = (s: string) => s === 'validated' ? `${t('map_validated')} ✓` : s === 'rejected' ? t('map_rejected') : t('map_pending');
  const [permission, requestPermission] = useCameraPermissions();
  const [userLoc, setUserLoc]     = useState<{ latitude: number; longitude: number } | null>(null);
  const [locLoading, setLocLoading] = useState(true);
  const [locError, setLocError]   = useState(false);
  const [reports, setReports]     = useState<Report[]>([]);
  const [heading, setHeading]     = useState(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const radarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.3, duration: 700, useNativeDriver: false }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: false }),
    ])).start();
    Animated.loop(Animated.timing(radarAnim, { toValue: 1, duration: 2500, easing: Easing.linear, useNativeDriver: false })).start();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'reports'), snap => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as Report)));
    }, () => {});
    return unsub;
  }, []);

  useEffect(() => {
    let headingSub: any = null;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { setLocError(true); setLocLoading(false); return; }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Platform.OS === 'web' ? Location.Accuracy.Lowest : Location.Accuracy.Balanced,
        });
        setUserLoc({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        if (Platform.OS !== 'web') {
          headingSub = await Location.watchHeadingAsync(h => setHeading(h.trueHeading ?? h.magHeading ?? 0));
        }
      } catch { setLocError(true); }
      setLocLoading(false);
    })();
    return () => { if (headingSub) headingSub.remove(); };
  }, []);

  const nearby = userLoc
    ? reports
        .filter(r => r.latitude && r.longitude)
        .map(r => ({
          ...r,
          dist: haversine(userLoc.latitude, userLoc.longitude, r.latitude, r.longitude),
          bearing: getBearing(userLoc.latitude, userLoc.longitude, r.latitude, r.longitude),
        }))
        .filter(r => r.dist <= 1000)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 8)
    : [];

  const getMarkerX = (bearing: number) => {
    let diff = bearing - heading;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return width / 2 + (diff / 90) * (width / 2);
  };

  if (locLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', gap: 14 }}>
        <ActivityIndicator color="#00FF88" size="large" />
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Localisation en cours...</Text>
      </SafeAreaView>
    );
  }

  if (locError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24 }}>
        <Text style={{ fontSize: 48 }}>📍</Text>
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Localisation non disponible</Text>
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center' }}>Autorisez la localisation pour utiliser le mode AR.</Text>
        <TouchableOpacity style={{ backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 24, paddingVertical: 12 }} onPress={() => navigation.goBack()}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── WEB : caméra non dispo → interface AR simulée ─────────────────────────
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <TouchableOpacity style={{ width: 36, height: 36, borderRadius: radius.xs, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border }} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 1 }}>MODE AR</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{t('ar_title')}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primaryGhost, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, transform: [{ scale: pulseAnim }] }} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>{nearby.length} cibles</Text>
          </View>
        </View>

        {/* Info banner */}
        <View style={{ backgroundColor: colors.primaryGhost, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <Text style={{ fontSize: 12, color: colors.primary, flex: 1 }}>{t('ar_web_hint')}</Text>
        </View>

        {/* Radar */}
        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
          {(() => {
            const SIZE = Math.min(width - 48, 260);
            return (
              <View style={{ width: SIZE, height: SIZE, justifyContent: 'center', alignItems: 'center' }}>
                {[1, 0.66, 0.33].map((s, i) => (
                  <View key={i} style={{ position: 'absolute', width: SIZE * s, height: SIZE * s, borderRadius: (SIZE * s) / 2, borderWidth: 1, borderColor: colors.primary + '25' }} />
                ))}
                <Animated.View style={{
                  position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, overflow: 'hidden',
                  transform: [{ rotate: radarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
                }}>
                  <View style={{ position: 'absolute', top: 0, left: '50%', width: SIZE / 2, height: SIZE / 2, backgroundColor: colors.primary + '12', borderTopRightRadius: SIZE / 2 }} />
                </Animated.View>
                <View style={{ position: 'absolute', width: 1, height: SIZE * 0.75, backgroundColor: colors.primary + '15' }} />
                <View style={{ position: 'absolute', width: SIZE * 0.75, height: 1, backgroundColor: colors.primary + '15' }} />
                <Animated.View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: colors.primary, transform: [{ scale: pulseAnim }], zIndex: 10 }} />
                {nearby.map((r: any, i: number) => {
                  const angle = (r.bearing * Math.PI) / 180;
                  const pct = Math.min(r.dist / 1000, 1);
                  const bx = (SIZE / 2 - 8) * pct * Math.sin(angle);
                  const by = -(SIZE / 2 - 8) * pct * Math.cos(angle);
                  return (
                    <View key={r.id} style={{ position: 'absolute', left: SIZE / 2 + bx - 6, top: SIZE / 2 + by - 6, width: 12, height: 12, borderRadius: 6, backgroundColor: getStatusColor(r.status), borderWidth: 2, borderColor: colors.surface, zIndex: 5 }} />
                  );
                })}
                {[
                  { l: 'N', top: 4, left: SIZE / 2 - 6 },
                  { l: 'S', top: SIZE - 18, left: SIZE / 2 - 4 },
                  { l: 'E', top: SIZE / 2 - 7, left: SIZE - 13 },
                  { l: 'O', top: SIZE / 2 - 7, left: 4 },
                ].map(c => (
                  <Text key={c.l} style={{ position: 'absolute', top: c.top, left: c.left, color: colors.primary, fontSize: 10, fontWeight: '800' }}>{c.l}</Text>
                ))}
              </View>
            );
          })()}
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 10 }}>
            {nearby.length} signalement{nearby.length !== 1 ? 's' : ''} dans 1 km
          </Text>
        </View>

        {/* List */}
        {nearby.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 12, gap: 8 }}>
            <Text style={{ fontSize: 36 }}>🎉</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Zone propre !</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted }}>{t('ar_empty')}</Text>
          </View>
        ) : (
          nearby.map((r: any) => (
            <View key={r.id} style={{ marginHorizontal: 16, marginBottom: 8, backgroundColor: colors.surface, borderRadius: radius.md, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: getStatusColor(r.status) + '15', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: getStatusColor(r.status) }}>
                <Text style={{ fontSize: 16 }}>🗑️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }} numberOfLines={1}>{r.address || 'Adresse inconnue'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>{r.dist < 1000 ? `${Math.round(r.dist)} m` : `${(r.dist / 1000).toFixed(1)} km`}</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>· {getCompassDir(r.bearing)}</Text>
                  <View style={{ backgroundColor: getStatusColor(r.status) + '20', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: getStatusColor(r.status) }}>{getStatusLabel(r.status)}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))
        )}
      </SafeAreaView>
    );
  }

  // ── NATIVE : vraie caméra + overlay AR ───────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ flex: 1 }}>
        {!permission?.granted ? (
          <View style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
            <Text style={{ fontSize: 48 }}>📷</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{t('ar_cam_required')}</Text>
            <TouchableOpacity style={{ backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 24, paddingVertical: 12 }} onPress={requestPermission}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>{t('ar_cam_allow')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <CameraView style={{ flex: 1 }} facing="back" />
        )}

        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
            <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
              <Text style={{ color: '#00FF88', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>◉ MODE AR ACTIF</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>{nearby.length} signalement{nearby.length !== 1 ? 's' : ''} dans 1 km</Text>
            </View>
            <Animated.View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#00FF88', transform: [{ scale: pulseAnim }] }} />
          </View>

          {nearby.map((r: any) => {
            const mx = getMarkerX(r.bearing);
            if (mx < -60 || mx > width + 60) return null;
            const clr = getStatusColor(r.status);
            return (
              <View key={r.id} style={{ position: 'absolute', left: mx - 55, top: height * 0.2 + (r.dist / 1000) * (height * 0.3), alignItems: 'center' }}>
                <View style={{ backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1.5, borderColor: clr, minWidth: 110, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{t('ar_waste')}</Text>
                  <Text style={{ color: clr, fontSize: 11, fontWeight: '600' }}>
                    {r.dist < 1000 ? `${Math.round(r.dist)} m` : `${(r.dist / 1000).toFixed(1)} km`} · {getCompassDir(r.bearing)}
                  </Text>
                </View>
                <View style={{ width: 2, height: 18, backgroundColor: clr + '80' }} />
                <Animated.View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: clr, transform: [{ scale: pulseAnim }] }} />
              </View>
            );
          })}

          <View style={{ position: 'absolute', bottom: 32, left: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
            <Text style={{ color: '#00FF88', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8 }}>SIGNALEMENTS PROCHES</Text>
            {nearby.slice(0, 3).map((r: any) => (
              <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: getStatusColor(r.status) }} />
                <Text style={{ flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: 12 }} numberOfLines={1}>{r.address || 'Adresse inconnue'}</Text>
                <Text style={{ color: getStatusColor(r.status), fontSize: 12, fontWeight: '700' }}>
                  {r.dist < 1000 ? `${Math.round(r.dist)}m` : `${(r.dist / 1000).toFixed(1)}km`}
                </Text>
              </View>
            ))}
            {nearby.length === 0 && <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Aucun signalement dans 1 km</Text>}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
