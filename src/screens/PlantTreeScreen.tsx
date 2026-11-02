import React, { useState, useEffect } from 'react';
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Share, Modal, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BackButton from '../components/BackButton';
import { collection, addDoc, query, where, onSnapshot, orderBy,
  getCountFromServer, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { useTheme } from '../context/ThemeContext';
import { radius, shadow } from '../theme';
import { useT } from '../i18n/useT';

const TREE_COST = 500;
const TREE_TYPES = ['🌳','🌲','🌴','🌵','🎋','🎄'];
const LOCATIONS = ['Ariana','Tunis','La Marsa','Carthage','Sidi Bou Said','Manouba','Ben Arous'];

interface TreeCertificate {
  id: string;
  treeNumber: number;
  treeEmoji: string;
  location: string;
  plantedAt: any;
  userId: string;
  userName: string;
}

export default function PlantTreeScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { balance, spendCoins } = useWallet();
  const t = useT();
  const [trees, setTrees]           = useState<TreeCertificate[]>([]);
  const [loading, setLoading]       = useState(true);
  const [planting, setPlanting]     = useState(false);
  const [totalTrees, setTotalTrees] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [justPlanted, setJustPlanted] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState(user?.city ?? LOCATIONS[0]);

  useEffect(() => {
    if (!user) return;
    // orderBy alone without composite index — sort client-side instead
    const q = query(collection(db, 'trees'), where('userId', '==', user.id));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as TreeCertificate))
        .sort((a, b) => {
          const ta = a.plantedAt?.toMillis?.() ?? 0;
          const tb = b.plantedAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
      setTrees(data);
      setLoading(false);
    }, () => setLoading(false));

    getCountFromServer(collection(db, 'trees'))
      .then(snap => setTotalTrees(snap.data().count))
      .catch(() => {});

    return unsub;
  }, [user?.id]);

  const handlePlant = () => {
    if (!user) return;
    if (balance < TREE_COST) {
      if (Platform.OS === 'web') {
        window.alert(`Coins insuffisants. Il vous faut ${TREE_COST} PoubCoins. Vous en avez ${balance}.`);
      } else {
        Alert.alert('Coins insuffisants', `Il vous faut ${TREE_COST} PoubCoins. Vous en avez ${balance}.`);
      }
      return;
    }
    setShowConfirm(true);
  };

  const confirmPlant = async () => {
    if (!user) return;
    setShowConfirm(false);
    setPlanting(true);
    try {
      const ok = await spendCoins(TREE_COST, 'Arbre planté');
      if (!ok) {
        if (Platform.OS === 'web') window.alert('Coins insuffisants.');
        else Alert.alert('Erreur', 'Coins insuffisants.');
        setPlanting(false);
        return;
      }
      const treeNumber = totalTrees + 1;
      await addDoc(collection(db, 'trees'), {
        treeNumber,
        treeEmoji: TREE_TYPES[Math.floor(Math.random() * TREE_TYPES.length)],
        location: selectedLocation,
        userId: user.id,
        userName: user.name,
        plantedAt: serverTimestamp(),
      });
      setTotalTrees(n => n + 1);
      setJustPlanted(treeNumber);
    } catch {
      if (Platform.OS === 'web') window.alert("Impossible de planter l'arbre. Réessayez.");
      else Alert.alert('Erreur', "Impossible de planter l'arbre.");
    }
    setPlanting(false);
  };

  const handleShare = (tree: TreeCertificate) => {
    const date = tree.plantedAt?.toDate?.()?.toLocaleDateString('fr-FR') ?? 'récemment';
    Share.share({
      message: `${tree.treeEmoji} J'ai planté l'arbre #${tree.treeNumber} à ${tree.location} le ${date} via PoubCoin ! 🌍♻️`,
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border, ...shadow.sm }}>
        <BackButton onPress={() => navigation.goBack()} variant="light" />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#16A34A', letterSpacing: 1 }}>{t('tree_label')}</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{t('tree_forest')}</Text>
        </View>
        <View style={{ backgroundColor: '#F0FDF4', borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#16A34A30' }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#16A34A' }}>🌳 {totalTrees} total</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Success banner */}
        {justPlanted !== null && (
          <View style={{ backgroundColor: '#DCFCE7', borderRadius: radius.md, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#16A34A40' }}>
            <Text style={{ fontSize: 32 }}>🎉</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#15803D' }}>Arbre #{justPlanted} planté !</Text>
              <Text style={{ fontSize: 12, color: '#16A34A' }}>{t('tree_cert_available')}</Text>
            </View>
            <TouchableOpacity onPress={() => setJustPlanted(null)}>
              <Ionicons name="close" size={18} color="#16A34A" />
            </TouchableOpacity>
          </View>
        )}

        {/* Plant CTA */}
        <LinearGradient colors={[colors.primaryDark, colors.primary]} style={{ borderRadius: 20, padding: 20, marginBottom: 20, alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 52 }}>🌱</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff', textAlign: 'center' }}>{t('tree_plant_title')}</Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>
            {t('tree_plant_sub')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFD740' }}>{t('tree_cost')} {TREE_COST} 🪙</Text>
            </View>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: balance >= TREE_COST ? '#fff' : '#FCA5A5' }}>
                {t('tree_balance')} {balance} 🪙
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={{ backgroundColor: balance >= TREE_COST ? '#fff' : 'rgba(255,255,255,0.4)', borderRadius: radius.md, paddingHorizontal: 28, paddingVertical: 12, marginTop: 4 }}
            onPress={handlePlant}
            disabled={planting}
          >
            {planting
              ? <ActivityIndicator color="#16A34A" />
              : <Text style={{ fontSize: 15, fontWeight: '800', color: balance >= TREE_COST ? '#16A34A' : 'rgba(255,255,255,0.7)' }}>
                  {balance >= TREE_COST ? t('tree_btn') : `${TREE_COST - balance} ${t('tree_btn_need')}`}
                </Text>
            }
          </TouchableOpacity>
        </LinearGradient>

        {/* My forest */}
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
          Ma forêt ({trees.length} arbre{trees.length !== 1 ? 's' : ''})
        </Text>

        {loading && <ActivityIndicator color={colors.primary} />}

        {!loading && trees.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 40, gap: 10 }}>
            <Text style={{ fontSize: 48 }}>🌱</Text>
            <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>
              {t('tree_empty')}
            </Text>
          </View>
        )}

        {trees.map(tree => (
          <View key={tree.id} style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#16A34A30', ...shadow.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#16A34A40' }}>
                <Text style={{ fontSize: 30 }}>{tree.treeEmoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Arbre #{tree.treeNumber}</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>📍 {tree.location}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                  🗓️ {tree.plantedAt?.toDate?.()?.toLocaleDateString('fr-FR') ?? '—'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleShare(tree)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="share-social-outline" size={18} color="#16A34A" />
              </TouchableOpacity>
            </View>
            <View style={{ marginTop: 12, backgroundColor: '#F0FDF4', borderRadius: radius.sm, padding: 10, borderWidth: 1, borderColor: '#16A34A20' }}>
              <Text style={{ fontSize: 11, color: '#16A34A', fontWeight: '700', textAlign: 'center' }}>
                🏅 CERTIFICAT NUMÉRIQUE · POUBCOIN · #{String(tree.treeNumber).padStart(6, '0')}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ── Confirmation Modal (web-compatible) ── */}
      <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 24, width: '100%', maxWidth: 360, gap: 16 }}>
            <Text style={{ fontSize: 40, textAlign: 'center' }}>🌳</Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' }}>
              {t('tree_confirm_title')}
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
              Cette action va dépenser{' '}
              <Text style={{ fontWeight: '800', color: '#CA8A04' }}>{TREE_COST} PoubCoins</Text>
              {' '}et générer un certificat numérique unique pour votre forêt.
            </Text>
            {/* City selector */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>📍 Lieu de plantation</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {LOCATIONS.map(loc => (
                  <TouchableOpacity
                    key={loc}
                    onPress={() => setSelectedLocation(loc)}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                      backgroundColor: selectedLocation === loc ? '#16A34A' : colors.primaryGhost,
                      borderWidth: 1, borderColor: selectedLocation === loc ? '#16A34A' : colors.border }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: selectedLocation === loc ? '#fff' : colors.text }}>{loc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' }}
                onPress={() => setShowConfirm(false)}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textMuted }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 2, backgroundColor: '#16A34A', borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', opacity: planting ? 0.6 : 1 }}
                onPress={confirmPlant}
                disabled={planting}
              >
                {planting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>🌳 Confirmer</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
