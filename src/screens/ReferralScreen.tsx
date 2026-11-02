import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Share, Clipboard, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { hapticMedium, hapticSuccess } from '../utils/haptics';
import { useT } from '../i18n/useT';

const REWARD_COINS = 50;

export default function ReferralScreen({ navigation }: any) {
  const { user, redeemReferralCode } = useAuth();
  const { colors } = useTheme();
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [invited, setInvited] = useState<string[]>([]);
  const [referredBy, setReferredBy] = useState<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  // Enter invite code state
  const [inputCode, setInputCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const referralCode = user ? `POUB-${user.id.slice(0, 6).toUpperCase()}` : '…';

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    getDoc(doc(db, 'users', user.id)).then(snap => {
      if (snap.exists()) {
        setInvited(snap.data()?.referredUsers ?? []);
        setReferredBy(snap.data()?.referredBy ?? null);
      }
      setLoading(false);
    });
  }, [user?.id]);

  const handleRedeem = async () => {
    if (!user || !inputCode.trim()) return;
    setRedeeming(true);
    hapticMedium();
    const ok = await redeemReferralCode(inputCode.trim(), user.id, user.name);
    setRedeeming(false);
    if (ok) {
      hapticSuccess();
      setReferredBy('used');
      Alert.alert('🎉 Code validé !', 'Vous et votre parrain avez chacun reçu +50 🪙 PoubCoins !');
    } else {
      Alert.alert('Code invalide', 'Ce code est introuvable, déjà utilisé, ou c\'est le vôtre.');
    }
  };

  const copyCode = () => {
    Clipboard.setString(referralCode);
    hapticMedium();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareInvite = async () => {
    try {
      await Share.share({
        message: `🌍 Rejoins-moi sur PoubCoin et aide à garder nos villes propres !\n\nUtilise mon code d'invitation : ${referralCode}\n\nToi et moi gagnons chacun ${REWARD_COINS} 🪙 PoubCoins dès ton premier signalement !`,
        title: 'Invite tes amis sur PoubCoin',
      });
    } catch {}
  };

  const coinsEarned = invited.length * REWARD_COINS;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.header}>
        <View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.07)', top: -50, right: -20 }} />
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('ref_title')}</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: colors.primary }]}>
          <Text style={styles.heroEmoji}>🤝</Text>
          <Text style={styles.heroTitle}>{t('ref_hero_title')}</Text>
          <Text style={styles.heroSub}>
            Vous et votre ami gagnez chacun {REWARD_COINS} 🪙 dès son premier signalement validé
          </Text>
        </View>

        {/* Code */}
        <View style={[styles.codeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.codeLabel, { color: colors.textMuted }]}>{t('ref_code_label')}</Text>
          <Text style={[styles.code, { color: colors.primary }]}>{referralCode}</Text>
          <TouchableOpacity
            onPress={copyCode}
            style={[styles.copyBtn, { backgroundColor: copied ? '#DCFCE7' : colors.background, borderColor: colors.border }]}
          >
            <Ionicons name={copied ? 'checkmark-circle' : 'copy-outline'} size={18} color={copied ? '#22C55E' : colors.textMuted} />
            <Text style={{ color: copied ? '#22C55E' : colors.textMuted, fontWeight: '600', fontSize: 13 }}>
              {copied ? t('ref_copied') : t('ref_copy')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Share button */}
        <TouchableOpacity onPress={shareInvite} style={[styles.shareBtn, { backgroundColor: colors.primary }]}>
          <Ionicons name="share-social" size={20} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{t('ref_share')}</Text>
        </TouchableOpacity>

        {/* Stats */}
        <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.text }]}>{loading ? '…' : invited.length}</Text>
            <Text style={[styles.statLab, { color: colors.textMuted }]}>{t('ref_invited')}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.primary }]}>{loading ? '…' : `+${coinsEarned}`} 🪙</Text>
            <Text style={[styles.statLab, { color: colors.textMuted }]}>{t('ref_coins_earned')}</Text>
          </View>
        </View>

        {/* Enter invite code (only if not already used) */}
        {referredBy === null && (
          <View style={[styles.redeemCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
            <Text style={[styles.redeemTitle, { color: colors.text }]}>🎁 Tu as un code d'invitation ?</Text>
            <Text style={[styles.redeemSub, { color: colors.textMuted }]}>Saisis le code de la personne qui t'a invité pour recevoir +50 🪙 chacun</Text>
            <View style={[styles.redeemRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="gift-outline" size={18} color={colors.textMuted} style={{ marginLeft: 12 }} />
              <TextInput
                value={inputCode}
                onChangeText={t => setInputCode(t.toUpperCase())}
                placeholder="POUB-XXXXXX"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                style={[styles.redeemInput, { color: colors.text }]}
              />
            </View>
            <TouchableOpacity
              onPress={handleRedeem}
              disabled={redeeming || !inputCode.trim()}
              style={[styles.redeemBtn, { backgroundColor: inputCode.trim() ? colors.primary : colors.border }]}
            >
              {redeeming
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Valider le code</Text>}
            </TouchableOpacity>
          </View>
        )}
        {referredBy && referredBy !== undefined && (
          <View style={[styles.redeemCard, { backgroundColor: '#F0FDF4', borderColor: '#22C55E' }]}>
            <Text style={{ color: '#15803D', fontWeight: '800', fontSize: 14, textAlign: 'center' }}>✅ Code d'invitation déjà utilisé</Text>
            <Text style={{ color: '#16A34A', fontSize: 12, textAlign: 'center', marginTop: 4 }}>Tu as déjà bénéficié du bonus de parrainage</Text>
          </View>
        )}

        {/* How it works */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('ref_how')}</Text>
        {[
          { n: '1', text: 'Copiez votre code et partagez-le à un ami' },
          { n: '2', text: 'Votre ami télécharge PoubCoin et saisit votre code' },
          { n: '3', text: `Dès son premier signalement validé, vous gagnez chacun ${REWARD_COINS} 🪙` },
        ].map(s => (
          <View key={s.n} style={[styles.stepRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>{s.n}</Text>
            </View>
            <Text style={[styles.stepText, { color: colors.text }]}>{s.text}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 20, backgroundColor: '#1B6B3A', overflow: 'hidden' },
  backBtn:      { width: 42, height: 42, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  title:        { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.3 },
  hero:         { borderRadius: 24, padding: 28, alignItems: 'center', marginBottom: 18 },
  heroEmoji:    { fontSize: 56, marginBottom: 10 },
  heroTitle:    { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 8, letterSpacing: -0.3 },
  heroSub:      { fontSize: 14, color: 'rgba(255,255,255,0.82)', textAlign: 'center', lineHeight: 22 },
  codeCard:     { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: 'center', marginBottom: 14 },
  codeLabel:    { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10 },
  code:         { fontSize: 32, fontWeight: '900', letterSpacing: 5, marginBottom: 16 },
  copyBtn:      { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5 },
  shareBtn:     { borderRadius: 16, paddingVertical: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 },
  statsCard:    { borderRadius: 20, borderWidth: 1, flexDirection: 'row', marginBottom: 24 },
  statItem:     { flex: 1, alignItems: 'center', padding: 20 },
  statVal:      { fontSize: 26, fontWeight: '900', marginBottom: 4, letterSpacing: -0.5 },
  statLab:      { fontSize: 12, fontWeight: '600' },
  divider:      { width: 1 },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginBottom: 14, letterSpacing: -0.2 },
  stepRow:      { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 8 },
  stepNum:      { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  stepText:     { flex: 1, fontSize: 14, lineHeight: 21 },

  redeemCard:   { borderRadius: 18, borderWidth: 1.5, padding: 18, marginBottom: 20, gap: 10 },
  redeemTitle:  { fontSize: 15, fontWeight: '800' },
  redeemSub:    { fontSize: 12, lineHeight: 18 },
  redeemRow:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, height: 50 },
  redeemInput:  { flex: 1, paddingHorizontal: 12, fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  redeemBtn:    { borderRadius: 14, height: 48, justifyContent: 'center', alignItems: 'center' },
});
