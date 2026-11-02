import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity,
  Dimensions, Animated, SafeAreaView, Platform, PanResponder, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const CITIES = [
  // Tunis
  { name: 'Tunis',            emoji: '🏙️' },
  { name: 'Le Bardo',         emoji: '🏛️' },
  { name: 'La Goulette',      emoji: '⚓' },
  { name: 'Le Kram',          emoji: '🌊' },
  { name: 'Carthage',         emoji: '🏺' },
  { name: 'Sidi Bou Saïd',   emoji: '🔵' },
  // Ariana
  { name: 'Ariana',           emoji: '🌿' },
  { name: 'Raoued',           emoji: '🌾' },
  { name: 'La Soukra',        emoji: '🌳' },
  { name: 'Mnihla',           emoji: '🏘️' },
  // Ben Arous
  { name: 'Ben Arous',        emoji: '🏗️' },
  { name: 'Radès',            emoji: '⚽' },
  { name: 'Hammam Lif',       emoji: '♨️' },
  { name: 'Hammam Chott',     emoji: '🌡️' },
  { name: 'Ezzahra',          emoji: '🌸' },
  { name: 'Mégrine',          emoji: '🏭' },
  { name: 'Mornag',           emoji: '🍊' },
  // Manouba
  { name: 'Manouba',          emoji: '🏡' },
  { name: 'Douar Hicher',     emoji: '🌆' },
  { name: 'Oued Ellil',       emoji: '💧' },
  // Nabeul
  { name: 'Nabeul',           emoji: '🏺' },
  { name: 'Hammamet',         emoji: '🏖️' },
  { name: 'Kelibia',          emoji: '🏰' },
  { name: 'Korba',            emoji: '🐟' },
  { name: 'Menzel Temime',    emoji: '🌴' },
  // Sousse
  { name: 'Sousse',           emoji: '🐚' },
  { name: 'Akouda',           emoji: '🌅' },
  { name: 'Kalaa Kebira',     emoji: '🛖' },
  { name: 'Msaken',           emoji: '🏺' },
  // Monastir
  { name: 'Monastir',         emoji: '🕌' },
  { name: 'Jemmal',           emoji: '🧵' },
  { name: 'Ksar Hellal',      emoji: '👔' },
  // Mahdia
  { name: 'Mahdia',           emoji: '🎣' },
  { name: 'Chebba',           emoji: '⛵' },
  // Sfax
  { name: 'Sfax',             emoji: '🐟' },
  { name: 'Sakiet Ezzit',     emoji: '🏭' },
  { name: 'Sakiet Eddaier',   emoji: '🏗️' },
  // Kairouan
  { name: 'Kairouan',         emoji: '🕌' },
  { name: 'Hajeb El Ayoun',   emoji: '🌾' },
  // Bizerte
  { name: 'Bizerte',          emoji: '⚓' },
  { name: 'Menzel Bourguiba', emoji: '🏙️' },
  { name: 'Ras Jebel',        emoji: '🌊' },
  // Autres gouvernorats
  { name: 'Béja',             emoji: '🌾' },
  { name: 'Jendouba',         emoji: '🏞️' },
  { name: 'Le Kef',           emoji: '🏔️' },
  { name: 'Siliana',          emoji: '🌿' },
  { name: 'Kasserine',        emoji: '🏔️' },
  { name: 'Sidi Bouzid',      emoji: '☀️' },
  { name: 'Gabès',            emoji: '🌴' },
  { name: 'Médenine',         emoji: '🏜️' },
  { name: 'Tataouine',        emoji: '🌵' },
  { name: 'Tozeur',           emoji: '🌴' },
  { name: 'Kébili',           emoji: '🐪' },
  { name: 'Gafsa',            emoji: '⛏️' },
];

const SLIDES = [
  {
    emoji: '🌍',
    title: 'Bienvenue sur PoubCoin',
    subtitle: 'La première app qui récompense les citoyens qui gardent leur ville propre',
    highlights: ['♻️ Écologie', '🏆 Récompenses', '🤝 Communauté'],
    gradient: ['#065F46', '#10B981'],
  },
  {
    emoji: '📸',
    title: 'Signalez un déchet',
    subtitle: 'Prenez une photo d\'un déchet abandonné. Notre IA confirme l\'emplacement automatiquement',
    highlights: ['📍 GPS auto', '🤖 IA intégrée', '⚡ 10 secondes'],
    gradient: ['#1E40AF', '#3B82F6'],
  },
  {
    emoji: '✅',
    title: 'La mairie valide',
    subtitle: 'La municipalité traite votre signalement en 24-48h et nettoie la zone',
    highlights: ['⏱️ 24-48h', '🏛️ Officiel', '📩 Notification'],
    gradient: ['#92400E', '#F59E0B'],
  },
  {
    emoji: '🪙',
    title: 'Gagnez des PoubCoins',
    subtitle: 'Chaque signalement validé vous rapporte 50 PoubCoins échangeables chez nos partenaires',
    highlights: ['+50 🪙 / signalement', '🎁 Partenaires', '💳 Échangeables'],
    gradient: ['#6D28D9', '#8B5CF6'],
  },
  {
    emoji: '🌱',
    title: 'Impactez votre ville',
    subtitle: 'Rejoignez des milliers de citoyens qui transforment leur environnement',
    highlights: ['👥 Communauté active', '🗺️ Toute la Tunisie', '🌿 Impact réel'],
    gradient: ['#064E3B', '#059669'],
  },
  {
    emoji: '📍',
    title: 'Votre ville',
    subtitle: 'Sélectionnez votre ville pour rejoindre votre communauté locale et voir les signalements près de chez vous',
    highlights: [],
    gradient: ['#1E3A5F', '#2563EB'],
  },
];

function FloatingCoin({ delay }: { delay: number }) {
  const y = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      y.setValue(0);
      opacity.setValue(0);
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(y, { toValue: -60, duration: 1200, useNativeDriver: Platform.OS !== 'web' }),
        ]),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      ]).start(() => animate());
    };
    animate();
  }, []);

  return (
    <Animated.Text style={{ position: 'absolute', fontSize: 20, opacity, transform: [{ translateY: y }] }}>
      🪙
    </Animated.Text>
  );
}

export default function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const { colors } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const emojiScale = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const animateTo = (nextIndex: number) => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(emojiScale, { toValue: 0.5, duration: 150, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    ]).start(() => {
      setCurrentIndex(nextIndex);
      emojiScale.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(emojiScale, { toValue: 1, tension: 60, friction: 6, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
    });
    Animated.timing(progressAnim, {
      toValue: (nextIndex + 1) / SLIDES.length,
      duration: 400,
      useNativeDriver: false,
    }).start();
  };

  useEffect(() => {
    Animated.spring(emojiScale, { toValue: 1, tension: 60, friction: 6, useNativeDriver: Platform.OS !== 'web' }).start();
    Animated.timing(progressAnim, { toValue: 1 / SLIDES.length, duration: 600, useNativeDriver: false }).start();
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 15,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -40 && currentIndex < SLIDES.length - 1) animateTo(currentIndex + 1);
        else if (g.dx > 40 && currentIndex > 0) animateTo(currentIndex - 1);
      },
    })
  ).current;

  const isCitySlide = currentIndex === SLIDES.length - 1;

  const goNext = async () => {
    if (currentIndex < SLIDES.length - 1) {
      animateTo(currentIndex + 1);
    } else {
      if (selectedCity) {
        await AsyncStorage.setItem('poubcoin_user_city', selectedCity);
      }
      await AsyncStorage.setItem('onboarded', 'true');
      onDone();
    }
  };

  const skip = async () => {
    await AsyncStorage.setItem('onboarded', 'true');
    onDone();
  };

  const slide = SLIDES[currentIndex];
  const isLast = currentIndex === SLIDES.length - 1;
  const isCoinSlide = currentIndex === 3;

  return (
    <View style={{ flex: 1 }} {...(Platform.OS !== 'web' ? panResponder.panHandlers : {})}>
      <LinearGradient colors={slide.gradient as [string, string]} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>

          {/* Top bar: step counter + skip */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16 }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700' }}>
              {currentIndex + 1}/{SLIDES.length}
            </Text>
            {!isLast && (
              <TouchableOpacity onPress={skip} style={{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20 }}>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '700' }}>Passer</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Progress bar */}
          <View style={{ marginHorizontal: 24, marginTop: 12, height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3 }}>
            <Animated.View style={{
              height: 5, borderRadius: 3, backgroundColor: '#fff',
              width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) as any,
            }} />
          </View>

          {/* Slide content */}
          <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, opacity: fadeAnim }}>

            {/* Emoji with floating coins on coin slide */}
            <View style={{ alignItems: 'center', justifyContent: 'center', height: 140, marginBottom: 8 }}>
              {isCoinSlide && (
                <>
                  <View style={{ position: 'absolute', left: -20, top: 20 }}><FloatingCoin delay={0} /></View>
                  <View style={{ position: 'absolute', right: -20, top: 40 }}><FloatingCoin delay={400} /></View>
                  <View style={{ position: 'absolute', left: 10, top: 60 }}><FloatingCoin delay={800} /></View>
                </>
              )}
              <Animated.Text style={{ fontSize: 90, transform: [{ scale: emojiScale }] }}>
                {slide.emoji}
              </Animated.Text>
            </View>

            <Text style={{ fontSize: 28, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 14, letterSpacing: -0.6 }}>
              {slide.title}
            </Text>
            <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.78)', textAlign: 'center', lineHeight: 24, marginBottom: 28 }}>
              {slide.subtitle}
            </Text>

            {/* City selection grid or highlights */}
            {isCitySlide ? (
              <View style={{ width: '100%', maxHeight: 260 }}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingBottom: 8 }}>
                  {CITIES.map((c) => {
                    const active = selectedCity === c.name;
                    return (
                      <TouchableOpacity
                        key={c.name}
                        onPress={() => setSelectedCity(c.name)}
                        style={{
                          flexDirection: 'row', alignItems: 'center', gap: 6,
                          paddingHorizontal: 14, paddingVertical: 9,
                          borderRadius: 24,
                          backgroundColor: active ? '#fff' : 'rgba(255,255,255,0.15)',
                          borderWidth: 1.5,
                          borderColor: active ? '#fff' : 'rgba(255,255,255,0.3)',
                        }}
                      >
                        <Text style={{ fontSize: 16 }}>{c.emoji}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: active ? '#2563EB' : '#fff' }}>{c.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                {selectedCity && (
                  <Text style={{ color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 10, fontSize: 13, fontWeight: '600' }}>
                    ✓ {selectedCity} sélectionnée
                  </Text>
                )}
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {slide.highlights.map((h, i) => (
                  <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)' }}>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>{h}</Text>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>

          {/* Footer */}
          <View style={{ paddingHorizontal: 24, paddingBottom: 40, gap: 20 }}>
            {/* Dots */}
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
              {SLIDES.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => animateTo(i)}>
                  <View style={{
                    width: i === currentIndex ? 24 : 7,
                    height: 7, borderRadius: 4,
                    backgroundColor: i === currentIndex ? '#fff' : 'rgba(255,255,255,0.35)',
                  }} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {currentIndex > 0 && (
                <TouchableOpacity
                  onPress={() => animateTo(currentIndex - 1)}
                  style={{ width: 56, height: 58, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)' }}
                >
                  <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={goNext}
                activeOpacity={0.85}
                style={{ flex: 1, height: 58, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 }}
              >
                <Text style={{ color: slide.gradient[1], fontSize: 16, fontWeight: '900' }}>
                  {isLast ? (selectedCity ? `Commencer à ${selectedCity} 🚀` : 'Commencer 🚀') : 'Suivant →'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
