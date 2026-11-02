import React, { useState, useRef } from 'react';
import {
  View, Text, SafeAreaView, TouchableOpacity, Animated,
  Platform, ScrollView, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import { radius, shadow } from '../theme';

const WASTE_ITEMS = [
  { id: 1,  emoji: '🍾', label: 'Bouteille verre',    bin: 'recycle', hint: 'Le verre se recycle !' },
  { id: 2,  emoji: '🍌', label: 'Peau de banane',     bin: 'organic', hint: 'Compost organique' },
  { id: 3,  emoji: '📰', label: 'Journal',             bin: 'recycle', hint: 'Papier recyclable' },
  { id: 4,  emoji: '🥩', label: 'Reste de viande',    bin: 'organic', hint: 'Déchet alimentaire' },
  { id: 5,  emoji: '🛍️', label: 'Sac plastique',      bin: 'recycle', hint: 'Plastique recyclable' },
  { id: 6,  emoji: '🥫', label: 'Canette aluminium',  bin: 'recycle', hint: 'Métal recyclable' },
  { id: 7,  emoji: '🍕', label: 'Reste de pizza',     bin: 'organic', hint: 'Déchet alimentaire' },
  { id: 8,  emoji: '💡', label: 'Ampoule usagée',     bin: 'general', hint: 'Déchetterie spéciale' },
  { id: 9,  emoji: '📦', label: 'Carton',              bin: 'recycle', hint: 'Papier recyclable' },
  { id: 10, emoji: '🧴', label: 'Flacon plastique',   bin: 'recycle', hint: 'Plastique recyclable' },
  { id: 11, emoji: '☕', label: 'Marc de café',        bin: 'organic', hint: 'Compost organique' },
  { id: 12, emoji: '🔋', label: 'Pile usagée',        bin: 'general', hint: 'Déchet dangereux' },
];

const BINS = [
  { id: 'recycle', emoji: '♻️', name: 'Recyclable', color: '#0284C7', bg: '#E0F2FE', border: '#0284C7' },
  { id: 'organic', emoji: '🌿', name: 'Organique',  color: '#92400E', bg: '#FEF3C7', border: '#92400E' },
  { id: 'general', emoji: '🗑️', name: 'Général',   color: '#6B7280', bg: '#F3F4F6', border: '#6B7280' },
];

type GameState = 'intro' | 'playing' | 'feedback' | 'result';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function WasteSortingGameScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { addCoins } = useWallet();
  const { height: screenHeight } = useWindowDimensions();
  const [gameState, setGameState] = useState<GameState>('intro');
  const [items, setItems] = useState<typeof WASTE_ITEMS>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [lastAnswer, setLastAnswer] = useState<{ correct: boolean; chosen: string } | null>(null);
  const [rewarded, setRewarded] = useState(false);

  // Animations
  const cardScale  = useRef(new Animated.Value(1)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTransY = useRef(new Animated.Value(0)).current;
  const feedbackScale = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const currentItem = items[currentIdx];

  const startGame = () => {
    const picked = shuffle(WASTE_ITEMS).slice(0, 8);
    setItems(picked);
    setCurrentIdx(0);
    setScore(0);
    setLastAnswer(null);
    setRewarded(false);
    // Animate in
    cardOpacity.setValue(0);
    cardTransY.setValue(30);
    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 1, duration: 350, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(cardTransY, { toValue: 0, duration: 350, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
    setGameState('playing');
  };

  const handleBinPress = (binId: string) => {
    if (gameState !== 'playing' || !currentItem) return;
    const correct = binId === currentItem.bin;
    setLastAnswer({ correct, chosen: binId });
    if (correct) setScore(s => s + 1);
    setGameState('feedback');

    // Animate feedback
    feedbackScale.setValue(0);
    Animated.spring(feedbackScale, { toValue: 1, friction: 4, useNativeDriver: Platform.OS !== 'web' }).start();

    if (!correct) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
    }
  };

  const handleNext = () => {
    const nextIdx = currentIdx + 1;
    if (nextIdx >= items.length) {
      setGameState('result');
      return;
    }
    // Slide out + slide in
    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(cardTransY, { toValue: -20, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
    ]).start(() => {
      setCurrentIdx(nextIdx);
      setLastAnswer(null);
      setGameState('playing');
      cardTransY.setValue(30);
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(cardTransY, { toValue: 0, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
    });
  };

  const handleClaimReward = async () => {
    const pct = items.length > 0 ? score / items.length : 0;
    if (!rewarded && pct >= 0.6) {
      await addCoins(30, 'Mini-jeu de tri');
      setRewarded(true);
    }
  };

  const pct = items.length > 0 ? Math.round((score / items.length) * 100) : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <LinearGradient colors={['#0D1F14', '#1B4332']} style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 20 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.7)" />
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Retour</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: 2 }}>MINI-JEU</Text>
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#fff', marginTop: 4 }}>Trier les déchets ♻️</Text>
          </View>
          {(gameState === 'playing' || gameState === 'feedback') && items.length > 0 && (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff' }}>{currentIdx + 1}<Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>/{items.length}</Text></Text>
              <Text style={{ fontSize: 11, color: '#4ADE80', fontWeight: '800' }}>✓ {score} pts</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ maxWidth: 560, width: '100%', alignSelf: 'center' }}>

        {/* ── INTRO ── */}
        {gameState === 'intro' && (
          <View style={{ minHeight: screenHeight * 0.75, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 22 }}>
            <View style={{ width: 130, height: 130, borderRadius: 65, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: colors.primary + '30' }}>
              <Text style={{ fontSize: 70 }}>♻️</Text>
            </View>
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 26, fontWeight: '900', color: colors.text, textAlign: 'center', letterSpacing: -0.5 }}>Mini-jeu de tri</Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }}>
                Pour chaque déchet, appuie sur le bon bac !{'\n'}
                Score ≥ 60% = <Text style={{ fontWeight: '800', color: '#CA8A04' }}>+30 🪙 PoubCoins</Text>
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              {BINS.map(b => (
                <View key={b.id} style={{ flex: 1, alignItems: 'center', backgroundColor: b.bg, borderRadius: radius.lg, padding: 18, borderWidth: 2, borderColor: b.color + '50' }}>
                  <Text style={{ fontSize: 32 }}>{b.emoji}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: b.color, marginTop: 6, textAlign: 'center' }}>{b.name}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={{ backgroundColor: colors.primary, borderRadius: radius.lg, paddingHorizontal: 48, paddingVertical: 16, ...shadow.md }}
              onPress={startGame}
            >
              <Text style={{ fontSize: 17, fontWeight: '900', color: '#fff' }}>🎮 Jouer !</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── PLAYING / FEEDBACK ── */}
        {(gameState === 'playing' || gameState === 'feedback') && currentItem && (
          <View style={{ padding: 20, paddingTop: 24, gap: 0 }}>

            {/* Progress bar */}
            <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, marginBottom: 24, flexDirection: 'row' }}>
              <View style={{ flex: currentIdx, backgroundColor: colors.primary, borderRadius: 3 }} />
              <View style={{ flex: items.length - currentIdx }} />
            </View>

            {/* Waste card */}
            <Animated.View style={{
              transform: [{ translateY: cardTransY }, { translateX: shakeAnim }],
              opacity: cardOpacity,
              backgroundColor: colors.surface,
              borderRadius: 28, padding: 32, alignItems: 'center',
              borderWidth: 2.5,
              borderColor: gameState === 'feedback'
                ? (lastAnswer?.correct ? '#16A34A' : '#DC2626')
                : colors.border,
              marginBottom: 22, ...shadow.lg,
            }}>
              <Text style={{ fontSize: 80 }}>{currentItem.emoji}</Text>
              <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text, marginTop: 12, letterSpacing: -0.3 }}>{currentItem.label}</Text>

              {gameState === 'feedback' && (
                <Animated.View style={{ marginTop: 12, alignItems: 'center', transform: [{ scale: feedbackScale }] }}>
                  <Text style={{ fontSize: 28 }}>{lastAnswer?.correct ? '✅' : '❌'}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: lastAnswer?.correct ? '#16A34A' : '#DC2626', marginTop: 4 }}>
                    {lastAnswer?.correct ? 'Correct !' : `Non — c'est ${BINS.find(b => b.id === currentItem.bin)?.name}`}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{currentItem.hint}</Text>
                </Animated.View>
              )}
            </Animated.View>

            {/* Bin buttons — playing */}
            {gameState === 'playing' && (
              <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', fontWeight: '600', marginBottom: 4 }}>
                  Dans quel bac va ce déchet ?
                </Text>
                {BINS.map(b => (
                  <TouchableOpacity
                    key={b.id}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 16,
                      backgroundColor: b.bg, borderRadius: radius.lg,
                      paddingHorizontal: 22, paddingVertical: 16,
                      borderWidth: 2, borderColor: b.color + '55', ...shadow.sm,
                    }}
                    onPress={() => handleBinPress(b.id)}
                    disabled={gameState !== 'playing'}
                    activeOpacity={0.75}
                  >
                    <Text style={{ fontSize: 30 }}>{b.emoji}</Text>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: b.color, flex: 1 }}>{b.name}</Text>
                    <Ionicons name="chevron-forward" size={20} color={b.color + '80'} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Bins highlight + Next — feedback */}
            {gameState === 'feedback' && (
              <View style={{ gap: 10 }}>
                {BINS.map(b => {
                  const isCorrect = b.id === currentItem.bin;
                  const isChosen  = b.id === lastAnswer?.chosen;
                  return (
                    <View
                      key={b.id}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 14,
                        backgroundColor: isCorrect ? '#DCFCE7' : isChosen ? '#FEE2E2' : colors.surface,
                        borderRadius: radius.md, paddingHorizontal: 20, paddingVertical: 12,
                        borderWidth: 2,
                        borderColor: isCorrect ? '#16A34A' : isChosen ? '#DC2626' : colors.border,
                        opacity: (!isCorrect && !isChosen) ? 0.4 : 1,
                      }}
                    >
                      <Text style={{ fontSize: 22 }}>{b.emoji}</Text>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: isCorrect ? '#16A34A' : isChosen ? '#DC2626' : colors.textMuted, flex: 1 }}>
                        {b.name}
                      </Text>
                      {isCorrect && <Text style={{ fontSize: 18 }}>✓</Text>}
                      {isChosen && !isCorrect && <Text style={{ fontSize: 18 }}>✗</Text>}
                    </View>
                  );
                })}
                <TouchableOpacity
                  style={{ backgroundColor: colors.primary, borderRadius: radius.md, padding: 14, alignItems: 'center', marginTop: 4, ...shadow.sm }}
                  onPress={handleNext}
                >
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>
                    {currentIdx + 1 >= items.length ? 'Voir les résultats →' : 'Suivant →'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── RESULT ── */}
        {gameState === 'result' && (
          <View style={{ minHeight: screenHeight * 0.75, padding: 24, alignItems: 'center', gap: 18, justifyContent: 'center' }}>
            <View style={{ width: 140, height: 140, borderRadius: 70, backgroundColor: pct >= 60 ? '#F0FDF4' : '#FEF2F2', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: pct >= 60 ? '#16A34A40' : '#DC262640' }}>
              <Text style={{ fontSize: 80 }}>{pct >= 80 ? '🏆' : pct >= 60 ? '🌟' : '😅'}</Text>
            </View>
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 52, fontWeight: '900', color: pct >= 60 ? '#16A34A' : '#DC2626', letterSpacing: -1 }}>{pct}%</Text>
              <Text style={{ fontSize: 16, color: colors.textSecondary, fontWeight: '600' }}>
                {score} bonne{score !== 1 ? 's' : ''} réponse{score !== 1 ? 's' : ''} sur {items.length}
              </Text>
            </View>

            <View style={{ width: '100%', height: 12, backgroundColor: colors.border, borderRadius: 6, flexDirection: 'row' }}>
              <View style={{ flex: pct, backgroundColor: pct >= 60 ? '#16A34A' : '#DC2626', borderRadius: 6 }} />
              <View style={{ flex: 100 - pct }} />
            </View>

            {pct >= 60 && !rewarded && (
              <View style={{ backgroundColor: '#FEF9C3', borderRadius: radius.lg, padding: 20, alignItems: 'center', borderWidth: 2, borderColor: '#CA8A04', width: '100%' }}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: '#92400E' }}>🎉 +30 PoubCoins débloqués !</Text>
                <TouchableOpacity
                  style={{ backgroundColor: '#CA8A04', borderRadius: radius.md, paddingHorizontal: 28, paddingVertical: 12, marginTop: 12 }}
                  onPress={handleClaimReward}
                >
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Réclamer les coins</Text>
                </TouchableOpacity>
              </View>
            )}

            {rewarded && (
              <View style={{ backgroundColor: '#DCFCE7', borderRadius: radius.md, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#16A34A', width: '100%' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#16A34A' }}>✅ +30 coins ajoutés à votre portefeuille !</Text>
              </View>
            )}

            {pct < 60 && (
              <View style={{ backgroundColor: '#FFF7ED', borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: '#FED7AA', width: '100%', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 22 }}>💪</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#C2410C' }}>Il te manque {60 - pct}% pour gagner !</Text>
                <Text style={{ fontSize: 12, color: '#9A3412', textAlign: 'center' }}>Score 60% ou plus pour débloquer +30 🪙. Tu peux y arriver !</Text>
              </View>
            )}

            <TouchableOpacity
              style={{ backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 48, paddingVertical: 16, marginTop: 4, ...shadow.sm, width: '100%', alignItems: 'center' }}
              onPress={startGame}
            >
              <Text style={{ fontSize: 17, fontWeight: '900', color: '#fff' }}>🔄 Rejouer</Text>
            </TouchableOpacity>
          </View>
        )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
