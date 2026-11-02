import React, { useState, useEffect } from 'react';
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc,
  serverTimestamp, query, orderBy, Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { colors, radius, shadow } from '../../theme';

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
  active: boolean;
}

const EMOJI_OPTIONS = ['🎁', '🌿', '♻️', '🏆', '🎟️', '🛒', '🌱', '🎨', '🍃', '💡', '🧴', '🛍️'];

const DURATION_OPTIONS = [
  { label: '1 heure',   hours: 1  },
  { label: '6 heures',  hours: 6  },
  { label: '24 heures', hours: 24 },
  { label: '3 jours',   hours: 72 },
  { label: '7 jours',   hours: 168 },
];

function timeLeft(endsAt: any): string {
  const end = endsAt?.toDate?.() ?? new Date(endsAt);
  const diff = end.getTime() - Date.now();
  if (diff <= 0) return 'Terminée';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}j ${h % 24}h`;
  return `${h}h ${m}m`;
}

export default function AdminAuctionsScreen({ navigation }: any) {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Auction | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🎁');
  const [description, setDescription] = useState('');
  const [startPrice, setStartPrice] = useState('50');
  const [sponsor, setSponsor] = useState('');
  const [durationHours, setDurationHours] = useState(24);
  const [active, setActive] = useState(true);

  const loadAuctions = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'auctions'), orderBy('endsAt', 'desc')));
      setAuctions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Auction)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAuctions(); }, []);

  const resetForm = () => {
    setTitle(''); setEmoji('🎁'); setDescription('');
    setStartPrice('50'); setSponsor(''); setDurationHours(24); setActive(true);
  };

  const createAuction = async () => {
    if (!title.trim() || !sponsor.trim()) {
      Alert.alert('Erreur', 'Titre et sponsor sont obligatoires.');
      return;
    }
    const price = parseInt(startPrice, 10);
    if (isNaN(price) || price < 1) {
      Alert.alert('Erreur', 'Prix de départ invalide.');
      return;
    }
    setSaving(true);
    try {
      const endsAt = new Date(Date.now() + durationHours * 3600 * 1000);
      await addDoc(collection(db, 'auctions'), {
        title: title.trim(),
        emoji,
        description: description.trim() || '',
        startPrice: price,
        currentBid: 0,
        currentBidder: null,
        currentBidderName: null,
        endsAt: Timestamp.fromDate(endsAt),
        sponsor: sponsor.trim(),
        totalBids: 0,
        active,
        createdAt: serverTimestamp(),
      });
      resetForm();
      setShowForm(false);
      await loadAuctions();
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Impossible de créer l\'enchère.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (auction: Auction) => {
    try {
      await updateDoc(doc(db, 'auctions', auction.id), { active: !auction.active });
      setAuctions(prev => prev.map(a => a.id === auction.id ? { ...a, active: !a.active } : a));
    } catch {}
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, 'auctions', deleteTarget.id));
      setDeleteTarget(null);
      await loadAuctions();
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Suppression impossible.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ backgroundColor: '#1B1464', paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: 2 }}>GESTION</Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#fff' }}>🔨 Enchères</Text>
        </View>
        <TouchableOpacity
          onPress={() => { resetForm(); setShowForm(true); }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 }}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Créer</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {auctions.length === 0 && (
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
              <Text style={{ fontSize: 48 }}>🔨</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Aucune enchère</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>Cliquez sur "Créer" pour lancer votre première enchère.</Text>
            </View>
          )}
          {auctions.map(a => {
            const ended = timeLeft(a.endsAt) === 'Terminée';
            return (
              <View key={a.id} style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border, ...shadow.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <Text style={{ fontSize: 32 }}>{a.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{a.title}</Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>chez {a.sponsor}</Text>
                    {a.description ? <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }} numberOfLines={2}>{a.description}</Text> : null}
                  </View>
                  <Switch value={a.active} onValueChange={() => toggleActive(a)} trackColor={{ true: colors.primary }} />
                </View>

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <View style={{ backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D4ED8' }}>Départ : {a.startPrice} 🪙</Text>
                  </View>
                  <View style={{ backgroundColor: a.currentBid > 0 ? '#DCFCE7' : colors.background, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: a.currentBid > 0 ? '#15803D' : colors.textMuted }}>
                      Meilleure offre : {a.currentBid > 0 ? `${a.currentBid} 🪙` : 'Aucune'}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: ended ? '#FEE2E2' : '#FEF3C7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: ended ? '#DC2626' : '#B45309' }}>
                      ⏱ {timeLeft(a.endsAt)}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>{a.totalBids} enchères</Text>
                  </View>
                </View>

                {a.currentBidderName && (
                  <Text style={{ fontSize: 12, color: colors.primary, marginTop: 8, fontWeight: '600' }}>
                    🏆 Meilleur enchérisseur : {a.currentBidderName}
                  </Text>
                )}

                <TouchableOpacity
                  onPress={() => setDeleteTarget(a)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, alignSelf: 'flex-end' }}
                >
                  <Ionicons name="trash-outline" size={14} color={colors.error} />
                  <Text style={{ fontSize: 12, color: colors.error, fontWeight: '600' }}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Create Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' }}>
            <View style={{ width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 10 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ flex: 1, fontSize: 17, fontWeight: '800', color: colors.text }}>🔨 Nouvelle enchère</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} showsVerticalScrollIndicator={false}>
              {/* Emoji picker */}
              <View>
                <Text style={label}>EMOJI</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {EMOJI_OPTIONS.map(e => (
                    <TouchableOpacity key={e} onPress={() => setEmoji(e)}
                      style={{ width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: emoji === e ? colors.primaryGhost : colors.background, borderWidth: 2, borderColor: emoji === e ? colors.primary : colors.border }}>
                      <Text style={{ fontSize: 22 }}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View>
                <Text style={label}>TITRE *</Text>
                <TextInput style={input(colors)} placeholder="Ex: Bon d'achat Carrefour 50 DT" placeholderTextColor={colors.textMuted} value={title} onChangeText={setTitle} />
              </View>

              <View>
                <Text style={label}>SPONSOR *</Text>
                <TextInput style={input(colors)} placeholder="Ex: Carrefour Tunis" placeholderTextColor={colors.textMuted} value={sponsor} onChangeText={setSponsor} />
              </View>

              <View>
                <Text style={label}>DESCRIPTION</Text>
                <TextInput style={[input(colors), { minHeight: 70, textAlignVertical: 'top' }]} placeholder="Décrivez la récompense…" placeholderTextColor={colors.textMuted} value={description} onChangeText={setDescription} multiline />
              </View>

              <View>
                <Text style={label}>PRIX DE DÉPART (🪙)</Text>
                <TextInput style={input(colors)} placeholder="50" placeholderTextColor={colors.textMuted} value={startPrice} onChangeText={setStartPrice} keyboardType="numeric" />
              </View>

              <View>
                <Text style={label}>DURÉE</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {DURATION_OPTIONS.map(d => (
                    <TouchableOpacity key={d.hours} onPress={() => setDurationHours(d.hours)}
                      style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: durationHours === d.hours ? colors.primary : colors.border, backgroundColor: durationHours === d.hours ? colors.primaryGhost : colors.background }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: durationHours === d.hours ? colors.primary : colors.text }}>{d.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Visible immédiatement</Text>
                <Switch value={active} onValueChange={setActive} trackColor={{ true: colors.primary }} />
              </View>

              <TouchableOpacity
                onPress={createAuction}
                disabled={saving}
                style={{ backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 8 }}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Lancer l'enchère</Text>
                </>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete confirm */}
      <Modal visible={!!deleteTarget} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 24, width: '100%', gap: 16 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, textAlign: 'center' }}>Supprimer cette enchère ?</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>{deleteTarget?.title}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setDeleteTarget(null)} style={{ flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
                <Text style={{ fontWeight: '700', color: colors.textSecondary }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDelete} style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.error, alignItems: 'center' }}>
                <Text style={{ fontWeight: '700', color: '#fff' }}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const label: any = { fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 };
const input = (colors: any): any => ({
  backgroundColor: colors.background, borderRadius: 12, padding: 14,
  fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border,
});
