import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import BackButton from '../components/BackButton';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { useTheme } from '../context/ThemeContext';
import { hapticSuccess } from '../utils/haptics';
import { useT } from '../i18n/useT';

const FREEZE_COST = 30;
const MAX_FREEZES = 3;

export default function StreakFreezeScreen({ navigation }: any) {
  const { user } = useAuth();
  const { balance: coins, addCoins } = useWallet();
  const { colors } = useTheme();
  const t = useT();
  const [streak, setStreak] = useState(0);
  const [freezes, setFreezes] = useState(0);
  const [buying, setBuying] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    getDoc(doc(db, 'users', user.id)).then(snap => {
      if (snap.exists()) {
        setStreak(snap.data()?.streak ?? 0);
        setFreezes(snap.data()?.streakFreezes ?? 0);
      }
      setLoading(false);
    });
  }, [user?.id]);

  const buyFreeze = async () => {
    if (!user) return;
    if (coins < FREEZE_COST) {
      Alert.alert('Coins insuffisants', `Il vous faut ${FREEZE_COST} 🪙 pour acheter un freeze. Vous en avez ${coins}.`);
      return;
    }
    if (freezes >= MAX_FREEZES) {
      Alert.alert('Maximum atteint', `Vous ne pouvez stocker que ${MAX_FREEZES} streak freezes à la fois.`);
      return;
    }
    setBuying(true);
    try {
      await addCoins(-FREEZE_COST);
      await updateDoc(doc(db, 'users', user.id), { streakFreezes: increment(1) });
      setFreezes(f => f + 1);
      hapticSuccess();
      Alert.alert('✅ Streak Freeze acheté !', `Votre série est maintenant protégée pour ${freezes + 1} jour(s) manqué(s).`);
    } catch {
      Alert.alert('Erreur', 'Achat impossible. Réessayez.');
    }
    setBuying(false);
  };

  const activeDays = Array.from({ length: 7 }, (_, i) => i < streak % 7);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <BackButton onPress={() => navigation.goBack()} variant="light" />
        <Text style={[styles.title, { color: colors.text }]}>{t('freeze_title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {/* Streak display */}
          <View style={[styles.streakCard, { backgroundColor: streak > 0 ? '#FFF7ED' : colors.surface, borderColor: streak > 0 ? '#F97316' : colors.border }]}>
            <Text style={{ fontSize: 56 }}>🔥</Text>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 48, fontWeight: '900', color: streak > 0 ? '#F97316' : colors.textMuted }}>{streak}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 14, fontWeight: '600' }}>{t('freeze_days')}</Text>
            </View>
          </View>

          {/* Weekly dots */}
          <View style={[styles.weekCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.weekLabel, { color: colors.text }]}>{t('freeze_week')}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 12 }}>
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                <View key={i} style={{ alignItems: 'center', gap: 6 }}>
                  <View style={[styles.dot, { backgroundColor: activeDays[i] ? '#F97316' : colors.border }]}>
                    {activeDays[i] && <Ionicons name="flame" size={12} color="#fff" />}
                  </View>
                  <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '700' }}>{day}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Freeze stock */}
          <View style={[styles.freezeCard, { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' }]}>
            <Text style={{ fontSize: 36 }}>🧊</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#1D4ED8' }}>{freezes} / {MAX_FREEZES} Freezes</Text>
              <Text style={{ color: '#1E40AF', fontSize: 13, marginTop: 4, lineHeight: 20 }}>
                {t('freeze_protect')}
              </Text>
            </View>
          </View>

          {/* Freeze dots */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
            {Array.from({ length: MAX_FREEZES }, (_, i) => (
              <View key={i} style={[styles.freezeDot, { backgroundColor: i < freezes ? '#3B82F6' : colors.border }]}>
                <Text style={{ fontSize: 18 }}>{i < freezes ? '🧊' : '⬜'}</Text>
              </View>
            ))}
          </View>

          {/* Buy button */}
          <TouchableOpacity
            onPress={buyFreeze}
            disabled={buying || freezes >= MAX_FREEZES || coins < FREEZE_COST}
            style={[styles.buyBtn, {
              backgroundColor: freezes >= MAX_FREEZES ? colors.border : colors.primary,
              opacity: (buying || coins < FREEZE_COST) ? 0.6 : 1,
            }]}
          >
            {buying
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Text style={{ fontSize: 20 }}>🧊</Text>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                    {freezes >= MAX_FREEZES ? t('freeze_max') : `${t('freeze_buy')} — ${FREEZE_COST} 🪙`}
                  </Text>
                </>
            }
          </TouchableOpacity>

          <Text style={[styles.hint, { color: colors.textMuted }]}>
            {t('freeze_balance')} : {coins} 🪙
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn:    { width: 40, height: 40, justifyContent: 'center' },
  title:      { fontSize: 18, fontWeight: '800' },
  streakCard: { borderRadius: 20, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, marginBottom: 16 },
  weekCard:   { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  weekLabel:  { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  dot:        { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  freezeCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  freezeDot:  { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  buyBtn:     { borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 },
  hint:       { textAlign: 'center', fontSize: 13 },
});
