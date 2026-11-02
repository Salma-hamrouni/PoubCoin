import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator, Animated, Platform, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, onSnapshot, doc, runTransaction, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { shadow, radius } from '../theme';
import { hapticSuccess, hapticLight } from '../utils/haptics';

interface Auction {
  id: string;
  title: string;
  emoji: string;
  description: string;
  startPrice: number;
  currentBid: number;
  currentBidder: string | null;
  currentBidderName: string | null;
  endsAt: any;
  sponsor: string;
  totalBids: number;
}

function useCountdown(endsAt: any) {
  const [left, setLeft] = useState('');
  useEffect(() => {
    const end = endsAt?.toDate?.() ?? new Date(endsAt);
    const tick = () => {
      const diff = end.getTime() - Date.now();
      if (diff <= 0) { setLeft('Terminée'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLeft(`${h > 0 ? h + 'h ' : ''}${m.toString().padStart(2,'0')}m ${s.toString().padStart(2,'0')}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return left;
}

function AuctionCard({ auction, balance, userId, userName, colors, onBid }: {
  auction: Auction; balance: number; userId: string; userName: string;
  colors: any; onBid: (auction: Auction) => void;
}) {
  const countdown = useCountdown(auction.endsAt);
  const ended = countdown === 'Terminée';
  const isWinning = auction.currentBidder === userId;
  const minBid = auction.currentBid > 0 ? auction.currentBid + 5 : auction.startPrice;
  const canBid = !ended && balance >= minBid && !isWinning;

  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!ended) {
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1.03, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 1,    duration: 800, useNativeDriver: Platform.OS !== 'web' }),
      ]));
      loop.start();
      return () => loop.stop();
    }
  }, [ended]);

  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: isWinning ? colors.primary + '60' : colors.border, ...shadow.md }}>
      {/* Top gradient band */}
      <LinearGradient colors={['#0F3D22', '#1B6B3A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ fontSize: 36 }}>{auction.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '900', color: '#fff' }}>{auction.title}</Text>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>chez {auction.sponsor}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ backgroundColor: ended ? 'rgba(255,255,255,0.1)' : '#EF4444', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>{ended ? '🏁 Terminée' : '⏱ ' + countdown}</Text>
          </View>
          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{auction.totalBids} enchère{auction.totalBids !== 1 ? 's' : ''}</Text>
        </View>
      </LinearGradient>

      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 14, lineHeight: 18 }}>{auction.description}</Text>

        {/* Current bid */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background, borderRadius: 14, padding: 14, marginBottom: 12 }}>
          <View>
            <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>
              {auction.currentBid > 0 ? 'Meilleure enchère' : 'Prix de départ'}
            </Text>
            <Text style={{ fontSize: 26, fontWeight: '900', color: colors.primary }}>
              {auction.currentBid > 0 ? auction.currentBid : auction.startPrice} 🪙
            </Text>
          </View>
          {auction.currentBidderName && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 10, color: colors.textMuted }}>Par</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: isWinning ? colors.primary : colors.text }}>
                {isWinning ? '👑 Toi' : auction.currentBidderName}
              </Text>
            </View>
          )}
        </View>

        {isWinning && !ended && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primaryGhost, borderRadius: 12, padding: 10, marginBottom: 10 }}>
            <Ionicons name="trophy" size={16} color={colors.primary} />
            <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '700' }}>Tu mènes l'enchère !</Text>
          </View>
        )}
        {ended && auction.currentBidder === userId && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#DCFCE7', borderRadius: 12, padding: 10, marginBottom: 10 }}>
            <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
            <Text style={{ fontSize: 13, color: '#16A34A', fontWeight: '700' }}>Tu as remporté cette enchère ! 🎉</Text>
          </View>
        )}

        {!ended && (
          <Animated.View style={{ transform: [{ scale: canBid ? pulse : new Animated.Value(1) }] }}>
            <TouchableOpacity
              style={{ backgroundColor: canBid ? colors.primary : colors.border, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onPress={() => canBid && onBid(auction)}
              disabled={!canBid}
            >
              <Ionicons name="hammer-outline" size={18} color={canBid ? '#fff' : colors.textMuted} />
              <Text style={{ fontSize: 14, fontWeight: '800', color: canBid ? '#fff' : colors.textMuted }}>
                {isWinning ? 'En tête' : `Enchérir ${minBid} 🪙`}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

export default function AuctionScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { balance } = useWallet();
  const { user } = useAuth();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading]   = useState(true);
  const [bidding, setBidding]   = useState<string | null>(null);
  const [showNewBadge, setShowNewBadge] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('poubcoin_tutorial_seen').then(v => { if (!v) setShowNewBadge(true); });
    AsyncStorage.setItem('poubcoin_tutorial_seen', '1');
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'auctions'), orderBy('endsAt', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setAuctions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Auction)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const handleBid = useCallback(async (auction: Auction) => {
    if (!user || bidding) return;
    const minBid = auction.currentBid > 0 ? auction.currentBid + 5 : auction.startPrice;
    if (balance < minBid) {
      Alert.alert('Solde insuffisant', `Tu as besoin de ${minBid} 🪙 pour enchérir.`);
      return;
    }
    Alert.alert(
      'Confirmer l\'enchère',
      `Enchérir ${minBid} 🪙 pour "${auction.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Enchérir', style: 'default', onPress: async () => {
          setBidding(auction.id);
          try {
            await runTransaction(db, async tx => {
              const aRef = doc(db, 'auctions', auction.id);
              const wRef = doc(db, 'wallets', user.id);
              const [aSnap, wSnap] = await Promise.all([tx.get(aRef), tx.get(wRef)]);
              const cur = aSnap.data()?.currentBid ?? 0;
              const bal = wSnap.data()?.balance ?? 0;
              if (bal < minBid) throw new Error('Solde insuffisant');
              if (cur >= minBid) throw new Error('Enchère dépassée');
              // Refund previous bidder
              const prevBidder = aSnap.data()?.currentBidder;
              const prevBid    = aSnap.data()?.currentBid ?? 0;
              if (prevBidder && prevBidder !== user.id && prevBid > 0) {
                const prevWRef = doc(db, 'wallets', prevBidder);
                const prevSnap = await tx.get(prevWRef);
                tx.update(prevWRef, { balance: (prevSnap.data()?.balance ?? 0) + prevBid });
              }
              tx.update(wRef, { balance: bal - minBid });
              tx.update(aRef, { currentBid: minBid, currentBidder: user.id, currentBidderName: user.name, totalBids: (aSnap.data()?.totalBids ?? 0) + 1 });
            });
            hapticSuccess();
          } catch (e: any) {
            Alert.alert('Erreur', e.message ?? 'Réessaie.');
          } finally {
            setBidding(null);
          }
        }},
      ]
    );
  }, [user, balance, bidding]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient colors={['#1C1040', '#3B1FA0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 22 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}
            style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: 2 }}>ENCHÈRES</Text>
              {showNewBadge && (
                <View style={{ backgroundColor: '#EF4444', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: '#fff' }}>Nouveau 🆕</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff' }}>Récompenses limitées</Text>
          </View>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#fff' }}>{balance} 🪙</Text>
          </View>
        </View>
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 10, lineHeight: 18 }}>
          Enchéris avec tes coins sur des récompenses exclusives à durée limitée. Si tu perds, tes coins sont remboursés.
        </Text>
      </LinearGradient>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : auctions.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>🔨</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' }}>Aucune enchère en cours</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 8 }}>
            Les enchères exclusives apparaissent ici. Reviens bientôt !
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} showsVerticalScrollIndicator={false}>
          {auctions.map(a => (
            <AuctionCard key={a.id} auction={a} balance={balance} userId={user?.id ?? ''} userName={user?.name ?? ''} colors={colors} onBid={handleBid} />
          ))}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
