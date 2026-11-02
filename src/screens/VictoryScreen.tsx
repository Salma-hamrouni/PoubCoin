import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  Image, Share, Animated, Dimensions, Platform,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { shadow, radius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { hapticSuccess } from '../utils/haptics';
import { useT } from '../i18n/useT';

const { width, height } = Dimensions.get('window');

// ── Confetti ────────────────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#FFD700','#FF6B6B','#4ADE80','#60A5FA','#A78BFA','#FB7185','#FCD34D','#34D399'];
const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  x: (Math.random() * (width - 20)) + 10,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  delay: Math.floor(Math.random() * 600),
  size: 7 + Math.random() * 8,
  isRect: Math.random() > 0.5,
}));

function Confetti() {
  const anims = useRef(PARTICLES.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    if (Platform.OS === 'web') return;
    Animated.stagger(40, anims.map((a, i) =>
      Animated.timing(a, { toValue: 1, duration: 1800 + PARTICLES[i].delay, useNativeDriver: true, delay: PARTICLES[i].delay })
    )).start();
  }, []);
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
      {PARTICLES.map((p, i) => (
        <Animated.View key={p.id} style={{
          position: 'absolute',
          left: p.x,
          width: p.size,
          height: p.isRect ? p.size * 1.6 : p.size,
          borderRadius: p.isRect ? 2 : p.size / 2,
          backgroundColor: p.color,
          transform: [
            { translateY: anims[i].interpolate({ inputRange: [0, 1], outputRange: [-30, height + 30] }) },
            { rotate: anims[i].interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${180 + Math.random() * 360}deg`] }) },
          ],
          opacity: anims[i].interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] }),
        }} />
      ))}
    </View>
  );
}

export default function VictoryScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const t = useT();
  const s = getStyles();
  const { report } = route.params ?? {};

  const goHome = () => navigation.dispatch(
    CommonActions.reset({ index: 0, routes: [{ name: 'Main' }] })
  );

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const coinAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    hapticSuccess();
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 6, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(coinAnim, { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);

  const wasteKg = (2.5).toFixed(1);
  const co2Kg   = (0.8).toFixed(1);

  if (!report) { goHome(); return null; }

  const shareStory = async () => {
    try {
      await Share.share({
        message: `🌍 ${t('victory_share_msg')} ${report.address?.split(',')[0]} ${t('victory_share_suffix')}\n\n✅ ${t('victory_validated')} • +${report.coins} 🪙\n♻️ ${wasteKg}kg ${t('victory_waste')}\n🌿 ${co2Kg}kg ${t('victory_co2')}\n\n💚`,
        title: 'Mon impact PoubCoin 🌍',
      });
    } catch {}
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)' }}>
      <Confetti />
      <Animated.View style={{ flex: 1, opacity: fadeAnim, alignItems: 'center', justifyContent: 'center', padding: 24 }}>

        {/* Victory Card */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }], width: '100%', maxWidth: 380 }}>
          <LinearGradient
            colors={[colors.primaryDark, colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.card}
          >
            {/* Decorative circles */}
            <View style={s.circle1} />
            <View style={s.circle2} />

            {/* Header */}
            <View style={s.cardHeader}>
              <Text style={s.appName}>♻️ PoubCoin</Text>
              <View style={s.validatedBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#4CAF82" />
                <Text style={s.validatedText}>{t('victory_validated')}</Text>
              </View>
            </View>

            {/* Photo */}
            {report.imageUri ? (
              <Image source={{ uri: report.imageUri }} style={s.photo} resizeMode="cover" />
            ) : (
              <View style={[s.photo, { backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ fontSize: 48 }}>🗑️</Text>
              </View>
            )}

            {/* Address */}
            <Text style={s.address} numberOfLines={2}>{report.address}</Text>
            <Text style={s.date}>{report.date}</Text>

            {/* Stats row */}
            <View style={s.statsRow}>
              {[
                { icon: '🪙', value: `+${report.coins}`, label: 'PoubCoins' },
                { icon: '♻️', value: `${wasteKg}kg`, label: t('victory_waste') },
                { icon: '🌿', value: `${co2Kg}kg`, label: t('victory_co2') },
              ].map(st => (
                <View key={st.label} style={s.statItem}>
                  <Text style={s.statEmoji}>{st.icon}</Text>
                  <Text style={s.statValue}>{st.value}</Text>
                  <Text style={s.statLabel}>{st.label}</Text>
                </View>
              ))}
            </View>

            {/* Footer */}
            <Text style={s.cardFooter}>poubcoin.tn • Ensemble pour une ville propre 💚</Text>
          </LinearGradient>
        </Animated.View>

        {/* Coins celebration */}
        <Animated.View style={{ opacity: coinAnim, marginTop: 24, alignItems: 'center' }}>
          <Text style={{ fontSize: 48, marginBottom: 8 }}>🎉</Text>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900' }}>+{report.coins} PoubCoins !</Text>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 4 }}>{t('victory_wallet')}</Text>
        </Animated.View>

        {/* Buttons */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 28, width: '100%', maxWidth: 380 }}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
            onPress={goHome}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>{t('btn_close')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 2, backgroundColor: '#fff', borderRadius: 14, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onPress={shareStory}
          >
            <Ionicons name="share-social" size={18} color="#1B6B3A" />
            <Text style={{ color: '#1B6B3A', fontWeight: '800', fontSize: 15 }}>{t('ref_share')}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const getStyles = () => StyleSheet.create({
  card: { borderRadius: 28, padding: 24, overflow: 'hidden' },
  circle1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.05)', top: -60, right: -60 },
  circle2: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.04)', bottom: 40, left: -40 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  appName: { color: '#fff', fontSize: 16, fontWeight: '800' },
  validatedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(76,175,130,0.2)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  validatedText: { color: '#4CAF82', fontSize: 12, fontWeight: '700' },
  photo: { width: '100%', height: 180, borderRadius: 16, marginBottom: 16 },
  address: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  date: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 20 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, marginBottom: 16 },
  statItem: { alignItems: 'center', gap: 4 },
  statEmoji: { fontSize: 20 },
  statValue: { color: '#fff', fontSize: 16, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '600' },
  cardFooter: { color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center' },
});

