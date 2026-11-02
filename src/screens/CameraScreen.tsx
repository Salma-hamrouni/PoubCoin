import React, { useState, useRef, useEffect } from 'react';
import { CommonActions } from '@react-navigation/native';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, Image, SafeAreaView, ActivityIndicator, Platform, Animated, TextInput,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../context/WalletContext';
import { recordReportToday } from '../utils/streaks';
import { colors as staticColors, shadow, radius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useT } from '../i18n/useT';
import { detectWaste as detectWasteAI } from '../utils/wasteDetection';
import { hapticLight, hapticSuccess } from '../utils/haptics';

function FloatingCoin({ startX, delay }: { startX: number; delay: number }) {
  const y = useRef(new Animated.Value(0)).current;
  const x = useRef(new Animated.Value(startX)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(scale, { toValue: 1, tension: 80, friction: 5, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(y, { toValue: -120, duration: 1400, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(x, { toValue: startX + (Math.random() > 0.5 ? 30 : -30), duration: 1400, useNativeDriver: Platform.OS !== 'web' }),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);

  return (
    <Animated.Text style={{ position: 'absolute', fontSize: 28, opacity, transform: [{ translateY: y }, { translateX: x }, { scale }] }}>
      🪙
    </Animated.Text>
  );
}

function SuccessScreen({ onHome, colors, t, radius, municipalityName }: any) {
  const checkScale = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const bodyOpacity = useRef(new Animated.Value(0)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const [showCoins, setShowCoins] = useState(false);

  useEffect(() => {
    Animated.sequence([
      Animated.spring(checkScale, { toValue: 1, tension: 60, friction: 5, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(titleOpacity, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(bodyOpacity, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(btnOpacity, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
    setTimeout(() => setShowCoins(true), 400);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      {/* Floating coins */}
      {showCoins && (
        <View style={{ position: 'absolute', bottom: '40%', width: '100%', alignItems: 'center' }}>
          <FloatingCoin startX={-40} delay={0} />
          <FloatingCoin startX={0} delay={200} />
          <FloatingCoin startX={40} delay={100} />
          <FloatingCoin startX={-70} delay={350} />
          <FloatingCoin startX={70} delay={450} />
        </View>
      )}

      {/* Check circle */}
      <Animated.View style={{ transform: [{ scale: checkScale }], width: 110, height: 110, borderRadius: 55, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 28, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12 }}>
        <Ionicons name="checkmark" size={60} color="#fff" />
      </Animated.View>

      <Animated.Text style={{ fontSize: 26, fontWeight: '900', color: '#fff', textAlign: 'center', opacity: titleOpacity, marginBottom: 14 }}>
        {t('camera_submitted')}
      </Animated.Text>

      <Animated.View style={{ opacity: bodyOpacity, alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 22 }}>
          {t('camera_sending')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', marginTop: 4 }}>
          <Text style={{ fontSize: 28 }}>🪙</Text>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#F59E0B' }}>+50 PoubCoins</Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{t('camera_coins_after_verify')}</Text>
          </View>
        </View>
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 8, textAlign: 'center' }}>
          {t('camera_will_receive')}
        </Text>

        {/* Municipality badge */}
        {municipalityName && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
            <Text style={{ fontSize: 18 }}>🏛️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 }}>Transmis à</Text>
              <Text style={{ fontSize: 14, color: '#fff', fontWeight: '800' }}>Municipalité de {municipalityName}</Text>
            </View>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ADE80' }} />
          </View>
        )}
      </Animated.View>

      <Animated.View style={{ opacity: btnOpacity, width: '100%', marginTop: 36 }}>
        <TouchableOpacity
          style={{ backgroundColor: colors.primary, paddingVertical: 16, borderRadius: radius.md, alignItems: 'center' }}
          onPress={onHome}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{t('camera_back_home')}</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

export default function CameraScreen({ navigation, route }: any) {
  const mode: 'report' | 'after' = route?.params?.mode ?? 'report';
  const afterReportId: string | undefined = route?.params?.reportId;
  const prefilled: { wasteType?: string; description?: string; address?: string; urgency?: string } | undefined = route?.params?.prefilled;
  const { colors } = useTheme();
  const t = useT();
  const s = getStyles(colors);

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [detectedWaste, setDetectedWaste] = useState<{emoji: string; label: string; confidence: number} | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [locationBlocked, setLocationBlocked] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationData, setLocationData] = useState<{ latitude: number; longitude: number; address: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [sentToMunicipality, setSentToMunicipality] = useState<string | null>(null);
  const [manualAddress, setManualAddress] = useState(prefilled?.address ?? '');
  const cameraRef = useRef<CameraView>(null);
  const { addReport, addAfterPhoto } = useWallet();

  // Pre-populate from VoiceReportScreen prefilled params
  useEffect(() => {
    if (prefilled?.wasteType) {
      const match = [
        { emoji: '🗑️', label: 'Déchets ménagers' }, { emoji: '♻️', label: 'Recyclables' },
        { emoji: '🏗️', label: 'Gravats / chantier' }, { emoji: '🛢️', label: 'Déchets dangereux' },
        { emoji: '🌿', label: 'Déchets verts' }, { emoji: '📱', label: 'Déchets électroniques' },
      ].find(w => w.label === prefilled.wasteType);
      setDetectedWaste({ emoji: match?.emoji ?? '🗑️', label: prefilled.wasteType, confidence: 90 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!permission) return <View style={s.container} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={s.permContainer}>
        <View style={s.permCircle1} />
        <View style={s.permCircle2} />
        <View style={s.permIconCard}>
          <View style={s.permIconInner}>
            <Ionicons name="camera" size={52} color={colors.primary} />
          </View>
        </View>
        <Text style={s.permTitle}>{t('camera_perm_title')}</Text>
        <Text style={s.permSub}>{t('camera_perm_sub')}</Text>

        <View style={s.permFeatures}>
          {[
            { icon: 'lock-closed', text: t('camera_perm_feat1'), color: colors.success },
            { icon: 'location',    text: t('camera_perm_feat2'), color: colors.info    },
            { icon: 'wallet',      text: t('camera_perm_feat3'), color: colors.gold    },
          ].map(f => (
            <View key={f.text} style={s.permFeatureRow}>
              <View style={[s.permFeatureIcon, { backgroundColor: f.color + '15' }]}>
                <Ionicons name={f.icon as any} size={14} color={f.color} />
              </View>
              <Text style={s.permFeatureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={s.permBtn} onPress={requestPermission} activeOpacity={0.85}>
          <Ionicons name="camera" size={20} color="#fff" />
          <Text style={s.permBtnText}>{t('camera_perm_btn')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.permBack} onPress={() => navigation.goBack()}>
          <Text style={s.permBackText}>{t('btn_back')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const WASTE_TYPES = [
    { emoji: '🍶', label: 'Plastique',     confidence: 94 },
    { emoji: '🥫', label: 'Métal',         confidence: 87 },
    { emoji: '🍾', label: 'Verre',         confidence: 91 },
    { emoji: '📦', label: 'Carton',        confidence: 89 },
    { emoji: '🗑️', label: 'Ordures mixtes', confidence: 82 },
    { emoji: '🪑', label: 'Encombrant',    confidence: 78 },
    { emoji: '🔋', label: 'Électronique',  confidence: 85 },
  ];

  const detectWaste = async (uri?: string) => {
    setAiLoading(true);
    setDetectedWaste(null);
    try {
      if (uri) {
        const result = await detectWasteAI(uri);
        setDetectedWaste({ emoji: result.icon, label: result.type, confidence: result.fromAI ? 91 : 75 });
      } else {
        const pick = WASTE_TYPES[Math.floor(Math.random() * WASTE_TYPES.length)];
        setDetectedWaste(pick);
      }
    } catch {
      const pick = WASTE_TYPES[Math.floor(Math.random() * WASTE_TYPES.length)];
      setDetectedWaste(pick);
    }
    setAiLoading(false);
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;
    setLoading(true);
    try {
      const pic = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (pic) {
        hapticLight();
        setPhoto(pic.uri);
        // Start fetching location immediately after photo
        fetchLocation();
        detectWaste(pic.uri);
      }
    } finally {
      setLoading(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    // On web: use Nominatim (OpenStreetMap) — no API key needed
    if (Platform.OS === 'web') {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`,
          { headers: { 'Accept-Language': 'fr' } }
        );
        const data = await res.json();
        const a = data.address ?? {};
        const parts = [
          a.road ?? a.pedestrian ?? a.footway,
          a.suburb ?? a.neighbourhood ?? a.quarter,
          a.city ?? a.town ?? a.village ?? a.county,
        ].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : data.display_name?.split(',').slice(0, 2).join(',') ?? 'Position détectée';
      } catch {
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }
    }
    // Native: use expo-location reverse geocoding
    try {
      const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (geo.length > 0) {
        const g = geo[0];
        return [g.street, g.city, g.region].filter(Boolean).join(', ');
      }
    } catch {}
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  const fetchLocation = async () => {
    setLocationLoading(true);
    setLocationData(null);
    setLocationBlocked(false);
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 15000)
    );
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationBlocked(true);
        return;
      }
      const loc = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        timeout,
      ]);
      const { latitude, longitude } = loc.coords;
      const address = await reverseGeocode(latitude, longitude);
      setLocationData({ latitude, longitude, address });
    } catch {
      setLocationBlocked(true);
    } finally {
      setLocationLoading(false);
    }
  };


  const sendReport = async () => {
    if (!photo) return;
    setLoading(true);
    try {
      if (mode === 'after' && afterReportId) {
        await addAfterPhoto(afterReportId, photo);
        setPhoto(null);
        navigation.goBack();
        return;
      }

      if (!locationData && !manualAddress.trim()) {
        Alert.alert(t('camera_loc_required_title'), t('camera_loc_required_body'), [{ text: 'OK' }]);
        setLoading(false);
        return;
      }
      const lat  = locationData?.latitude  ?? 0;
      const lng  = locationData?.longitude ?? 0;
      const addr = locationData?.address ?? manualAddress.trim();

      try {
        const result = await addReport({ imageUri: photo, latitude: lat, longitude: lng, address: addr });
        setSentToMunicipality(result.municipalityName);
      } catch (e: any) {
        if (e?.message === 'offline') {
          hapticSuccess();
          setSubmitted(true);
          return;
        }
        Alert.alert('Erreur', 'Une erreur est survenue lors de l\'envoi. Vérifiez votre connexion et réessayez.', [{ text: 'OK' }]);
        setLoading(false);
        return;
      }
      recordReportToday().catch(() => {});
      hapticSuccess();
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  // Full-screen success state
  if (submitted) {
    return <SuccessScreen onHome={() => navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Main' }] }))} colors={colors} t={t} radius={radius} municipalityName={sentToMunicipality} />;
  }

  if (photo) {
    return (
      <View style={s.container}>
        <Image source={{ uri: photo }} style={s.preview} resizeMode="cover" />

        {/* Dark gradient overlay */}
        <View style={s.previewOverlay}>
          {/* Top hint */}
          <SafeAreaView>
            <View style={s.previewTopHint}>
              <Ionicons name="information-circle" size={16} color="#fff" />
              <Text style={s.previewHintText}>{t('camera_preview_hint')}</Text>
            </View>
          </SafeAreaView>

          {/* Bottom actions */}
          <View style={s.previewBottom}>
            <View style={s.previewBottomInner}>
              {/* Location row */}
              <View style={s.previewInfoChip}>
                {locationLoading ? (
                  <>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={s.previewInfoChipText}>{t('camera_detecting')}</Text>
                  </>
                ) : locationData ? (
                  <>
                    <Ionicons name="location" size={14} color="#4CAF50" />
                    <Text style={[s.previewInfoChipText, { flex: 1 }]} numberOfLines={1}>{locationData.address}</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="location-outline" size={14} color="#FF9800" />
                    <Text style={s.previewInfoChipText}>{t('camera_loc_unavailable')}</Text>
                    <TouchableOpacity onPress={fetchLocation} style={{ marginLeft: 6, padding: 8 }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '700' }}>{t('camera_retry')}</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              <View style={s.previewInfoRow}>
                <View style={s.previewInfoChip}>
                  <Ionicons name="camera-outline" size={14} color={colors.primary} />
                  <Text style={s.previewInfoChipText}>{t('camera_ready')}</Text>
                </View>
                <View style={s.previewCoinChip}>
                  <Text style={s.previewCoinText}>+50 🪙</Text>
                </View>
              </View>

              {/* AI detection chip */}
              {aiLoading ? (
                <View style={{ flexDirection:'row', alignItems:'center', gap:8, backgroundColor:'rgba(0,0,0,0.6)', borderRadius:20, paddingHorizontal:14, paddingVertical:8, marginBottom:12, alignSelf:'center' }}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={{ color:'#fff', fontSize:13, fontWeight:'600' }}>Analyse IA en cours...</Text>
                </View>
              ) : detectedWaste ? (
                <View style={{ flexDirection:'row', alignItems:'center', gap:8, backgroundColor:'rgba(0,0,0,0.65)', borderRadius:20, paddingHorizontal:14, paddingVertical:8, marginBottom:12, alignSelf:'center', borderWidth:1, borderColor:'rgba(255,255,255,0.2)' }}>
                  <Text style={{ fontSize:18 }}>{detectedWaste.emoji}</Text>
                  <Text style={{ color:'#fff', fontSize:13, fontWeight:'700' }}>{detectedWaste.label}</Text>
                  <View style={{ backgroundColor:'#22C55E', borderRadius:10, paddingHorizontal:6, paddingVertical:2 }}>
                    <Text style={{ color:'#fff', fontSize:10, fontWeight:'700' }}>{detectedWaste.confidence}%</Text>
                  </View>
                </View>
              ) : null}


              <View style={s.previewBtns}>
                <TouchableOpacity style={s.retakeBtn} onPress={() => setPhoto(null)}>
                  <Ionicons name="refresh" size={20} color="#fff" />
                  <Text style={s.retakeBtnText}>Reprendre</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.sendBtn, (mode !== 'after' && locationLoading) && { backgroundColor: '#9DB8A8', opacity: 0.8 }]} onPress={sendReport} disabled={loading || (mode !== 'after' && locationLoading)} activeOpacity={0.85}
                  accessibilityLabel="Envoyer le signalement" accessibilityRole="button">
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <>
                        <Ionicons name="send" size={20} color="#fff" />
                        <Text style={s.sendBtnText}>Envoyer</Text>
                      </>
                  }
                </TouchableOpacity>
              </View>
              {locationBlocked && (
                <View style={{ marginTop: 6, gap: 4 }}>
                  <Text style={{ color: '#FF9800', textAlign: 'center', fontSize: 12, fontWeight: '600' }}>
                    {t('camera_loc_disabled')}
                  </Text>
                  <TextInput
                    value={manualAddress}
                    onChangeText={setManualAddress}
                    placeholder={t('camera_loc_manual_placeholder')}
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, color: '#fff', fontSize: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
                  />
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <CameraView style={s.camera} facing={facing} ref={cameraRef} />

      {/* Corner frame guides — outside CameraView to avoid children warning */}
      <View style={s.guideOverlay} pointerEvents="none">
        <View style={s.guideFrame}>
          {['tl', 'tr', 'bl', 'br'].map(corner => (
            <View key={corner} style={[s.corner, s[corner as keyof typeof s] as any]} />
          ))}
        </View>
        <Text style={s.guideLabel}>{t('camera_center_hint')}</Text>
      </View>

      {/* Top bar */}
      <SafeAreaView style={s.topBar}>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={s.topCenter}>
          <Text style={s.topTitle}>{mode === 'after' ? t('camera_after_photo') : t('camera_report_title')}</Text>
        </View>

        <View style={s.coinBadge}>
          <Text style={s.coinBadgeText}>{mode === 'after' ? '+25 🪙' : '+50 🪙'}</Text>
        </View>
      </SafeAreaView>

      {/* Bottom controls */}
      <View style={s.bottomBar}>
        <TouchableOpacity
          style={s.sideBtn}
          onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
        >
          <Ionicons name="camera-reverse" size={22} color="#fff" />
          <Text style={s.sideBtnText}>Retourner</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.shutter} onPress={takePicture} disabled={loading} activeOpacity={0.8}
          accessibilityLabel="Prendre une photo" accessibilityRole="button">
          <View style={s.shutterRing}>
            {loading
              ? <ActivityIndicator color={colors.primary} size="large" />
              : <View style={s.shutterDot} />
            }
          </View>
        </TouchableOpacity>

        <View style={s.sideBtn} />
      </View>
    </View>
  );
}

const CORNER_SIZE = 22;
const CORNER_THICK = 3;
const FRAME = 220;

const getStyles = (colors: typeof staticColors): any => ({
  container: { flex: 1, backgroundColor: '#000' },
  camera:    { flex: 1 },

  // Permission screen
  permContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 28, backgroundColor: colors.primaryGhost,
    overflow: 'hidden',
  },
  permCircle1: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(46,125,50,0.08)', top: -70, right: -70,
  },
  permCircle2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(46,125,50,0.05)', bottom: 80, left: -60,
  },
  permIconCard: {
    width: 120, height: 120, borderRadius: 32, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center', marginBottom: 24, ...shadow.md,
  },
  permIconInner: {
    width: 96, height: 96, borderRadius: 24, backgroundColor: colors.primaryGhost,
    justifyContent: 'center', alignItems: 'center',
  },
  permTitle: { fontSize: 22, fontWeight: '900', color: colors.primaryDark, textAlign: 'center', marginBottom: 8 },
  permSub:   { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  permFeatures: { width: '100%', gap: 12, marginBottom: 32 },
  permFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.sm, padding: 14, ...shadow.xs },
  permFeatureIcon: { width: 32, height: 32, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  permFeatureText: { flex: 1, fontSize: 13, color: colors.text, fontWeight: '600' },
  permBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    width: '100%', backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 16, justifyContent: 'center', marginBottom: 12, ...shadow.lg,
  },
  permBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  permBack:     { paddingVertical: 10 },
  permBackText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },

  // Camera view
  guideOverlay: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center' },
  guideFrame: {
    width: FRAME, height: FRAME,
    position: 'relative', justifyContent: 'center', alignItems: 'center',
  },
  guideLabel: {
    color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600',
    marginTop: FRAME / 2 + 16, textAlign: 'center',
  },
  corner: {
    position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE,
  },
  tl: { top: 0, left: 0, borderTopWidth: CORNER_THICK, borderLeftWidth: CORNER_THICK, borderColor: '#fff', borderTopLeftRadius: 6 },
  tr: { top: 0, right: 0, borderTopWidth: CORNER_THICK, borderRightWidth: CORNER_THICK, borderColor: '#fff', borderTopRightRadius: 6 },
  bl: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICK, borderLeftWidth: CORNER_THICK, borderColor: '#fff', borderBottomLeftRadius: 6 },
  br: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICK, borderRightWidth: CORNER_THICK, borderColor: '#fff', borderBottomRightRadius: 6 },

  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  iconBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center',
  },
  topCenter: { flex: 1, alignItems: 'center' },
  topTitle: { color: '#fff', fontWeight: '800', fontSize: 16 },
  coinBadge: {
    backgroundColor: colors.primary, borderRadius: radius.pill,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  coinBadgeText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 32, paddingBottom: 52, paddingTop: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sideBtn: { width: 64, alignItems: 'center', gap: 5 },
  sideBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' },
  shutter: { alignItems: 'center', justifyContent: 'center' },
  shutterRing: {
    width: 84, height: 84, borderRadius: 42,
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center', alignItems: 'center',
  },
  shutterDot: {
    width: 66, height: 66, borderRadius: 33, backgroundColor: '#fff',
  },

  // Preview
  preview: { flex: 1 },
  previewOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  previewTopHint: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: radius.pill,
    paddingHorizontal: 16, paddingVertical: 10, margin: 16,
    alignSelf: 'center',
  },
  previewHintText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  previewBottom: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 20, paddingBottom: 48, paddingTop: 22,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
  },
  previewBottomInner: { gap: 16 },
  previewInfoRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewInfoChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.pill,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  previewInfoChipText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  previewCoinChip: {
    backgroundColor: colors.gold, borderRadius: radius.pill,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  previewCoinText: { color: '#fff', fontWeight: '900', fontSize: 14 },

  previewBtns: { flexDirection: 'row', gap: 12 },
  retakeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.lg, paddingVertical: 17, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
  },
  retakeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sendBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 17,
    ...shadow.lg,
  },
  sendBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
