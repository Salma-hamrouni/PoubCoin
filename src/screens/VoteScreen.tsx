import React, { useState, useEffect } from 'react';
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection, getDocs, addDoc, doc, updateDoc, increment as fsIncrement,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase';
import { useTheme } from '../context/ThemeContext';
import { useT } from '../i18n/useT';

const VOTES_KEY = 'poubcoin_votes';

const SAMPLE_ZONES = [
  // Tunis
  { name: 'Rue de Carthage',        address: 'Rue de Carthage, Tunis',                 district: 'Tunis',             votes: 0, status: 'open' },
  { name: 'Avenue Bourguiba',       address: 'Av. Habib Bourguiba, Médina',            district: 'Médina',            votes: 0, status: 'open' },
  { name: 'Marché Bab El Khadra',   address: 'Bab El Khadra, Tunis',                   district: 'Tunis',             votes: 0, status: 'open' },
  { name: 'Le Bardo Centre',        address: 'Centre Le Bardo, Le Bardo',              district: 'Le Bardo',          votes: 0, status: 'open' },
  { name: 'La Goulette Port',       address: 'Zone portuaire, La Goulette',            district: 'La Goulette',       votes: 0, status: 'open' },
  { name: 'Le Kram Plage',          address: 'Plage Le Kram, Le Kram',                 district: 'Le Kram',           votes: 0, status: 'open' },
  { name: 'Carthage Site',          address: 'Site archéologique, Carthage',           district: 'Carthage',          votes: 0, status: 'open' },
  { name: 'Sidi Bou Saïd Médina',   address: 'Médina Sidi Bou Saïd',                   district: 'Sidi Bou Saïd',     votes: 0, status: 'open' },
  // Ariana
  { name: 'Cité El Intilaka',       address: 'Cité El Intilaka, Ariana',               district: 'Ariana',            votes: 0, status: 'in_progress' },
  { name: 'Raoued Centre',          address: 'Centre Raoued, Raoued',                  district: 'Raoued',            votes: 0, status: 'open' },
  { name: 'La Soukra Marché',       address: 'Marché La Soukra',                       district: 'La Soukra',         votes: 0, status: 'open' },
  { name: 'Mnihla Place',           address: 'Place centrale Mnihla',                  district: 'Mnihla',            votes: 0, status: 'open' },
  // Ben Arous
  { name: 'Ben Arous Centre',       address: 'Centre-ville Ben Arous',                 district: 'Ben Arous',         votes: 0, status: 'open' },
  { name: 'Radès Plage',            address: 'Plage Radès',                            district: 'Radès',             votes: 0, status: 'open' },
  { name: 'Hammam Lif Corniche',    address: 'Corniche Hammam Lif',                    district: 'Hammam Lif',        votes: 0, status: 'open' },
  { name: 'Mégrine Marché',         address: 'Marché hebdomadaire Mégrine',            district: 'Mégrine',           votes: 0, status: 'open' },
  // Manouba
  { name: 'Manouba Place',          address: 'Place principale Manouba',               district: 'Manouba',           votes: 0, status: 'open' },
  { name: 'Douar Hicher Route',     address: 'Route principale Douar Hicher',          district: 'Douar Hicher',      votes: 0, status: 'open' },
  { name: 'Oued Ellil Centre',      address: 'Centre Oued Ellil',                      district: 'Oued Ellil',        votes: 0, status: 'open' },
  // Nabeul
  { name: 'Nabeul Marché',          address: 'Marché poterie Nabeul',                  district: 'Nabeul',            votes: 0, status: 'open' },
  { name: 'Hammamet Médina',        address: 'Médina Hammamet',                        district: 'Hammamet',          votes: 0, status: 'open' },
  { name: 'Kelibia Port',           address: 'Port de pêche Kelibia',                  district: 'Kelibia',           votes: 0, status: 'open' },
  // Sousse
  { name: 'Corniche Sousse',        address: 'Boulevard de la Corniche, Sousse',       district: 'Sousse',            votes: 0, status: 'open' },
  { name: 'Médina Sousse',          address: 'Médina de Sousse',                       district: 'Sousse',            votes: 0, status: 'open' },
  { name: 'Akouda Centre',          address: 'Centre Akouda',                          district: 'Akouda',            votes: 0, status: 'open' },
  { name: 'Msaken Place',           address: 'Place centrale Msaken',                  district: 'Msaken',            votes: 0, status: 'open' },
  // Monastir
  { name: 'Monastir Front de Mer',  address: 'Front de mer Monastir',                  district: 'Monastir',          votes: 0, status: 'open' },
  { name: 'Jemmal Centre',          address: 'Centre-ville Jemmal',                    district: 'Jemmal',            votes: 0, status: 'open' },
  { name: 'Ksar Hellal Marché',     address: 'Marché Ksar Hellal',                     district: 'Ksar Hellal',       votes: 0, status: 'open' },
  // Mahdia
  { name: 'Mahdia Médina',          address: 'Médina Mahdia',                          district: 'Mahdia',            votes: 0, status: 'open' },
  { name: 'Chebba Port',            address: 'Port Chebba',                            district: 'Chebba',            votes: 0, status: 'open' },
  // Sfax
  { name: 'Marché Central Sfax',    address: 'Marché Central, Sfax',                   district: 'Sfax',              votes: 0, status: 'open' },
  { name: 'Médina Sfax',            address: 'Médina de Sfax',                         district: 'Sfax',              votes: 0, status: 'open' },
  { name: 'Sakiet Ezzit Zone',      address: 'Zone industrielle Sakiet Ezzit',         district: 'Sakiet Ezzit',      votes: 0, status: 'open' },
  // Kairouan
  { name: 'Kairouan Médina',        address: 'Médina de Kairouan',                     district: 'Kairouan',          votes: 0, status: 'open' },
  // Bizerte
  { name: 'Bizerte Port',           address: 'Port de Bizerte',                        district: 'Bizerte',           votes: 0, status: 'open' },
  { name: 'Menzel Bourguiba',       address: 'Centre Menzel Bourguiba',                district: 'Menzel Bourguiba',  votes: 0, status: 'open' },
  // Autres
  { name: 'Béja Centre',            address: 'Centre-ville Béja',                      district: 'Béja',              votes: 0, status: 'open' },
  { name: 'Jendouba Place',         address: 'Place principale Jendouba',              district: 'Jendouba',          votes: 0, status: 'open' },
  { name: 'Gafsa Centre',           address: 'Centre-ville Gafsa',                     district: 'Gafsa',             votes: 0, status: 'open' },
  { name: 'Gabès Médina',           address: 'Médina de Gabès',                        district: 'Gabès',             votes: 0, status: 'open' },
  { name: 'Médenine Centre',        address: 'Centre Médenine',                        district: 'Médenine',          votes: 0, status: 'open' },
  { name: 'Tataouine',              address: 'Centre-ville Tataouine',                 district: 'Tataouine',         votes: 0, status: 'open' },
  { name: 'Tozeur Palmeraie',       address: 'Palmeraie Tozeur',                       district: 'Tozeur',            votes: 0, status: 'open' },
  { name: 'Kasserine Centre',       address: 'Centre Kasserine',                       district: 'Kasserine',         votes: 0, status: 'open' },
  { name: 'Sidi Bouzid Place',      address: 'Place principale Sidi Bouzid',           district: 'Sidi Bouzid',       votes: 0, status: 'open' },
];

interface Zone {
  id: string;
  name: string;
  address: string;
  district: string;
  votes: number;
  status: 'open' | 'in_progress' | 'done';
}

const STATUS_CONFIG_KEYS = {
  open:        { labelKey: 'vote_status_open' as const,     emoji: '🟢', color: '#4CAF50' },
  in_progress: { labelKey: 'vote_status_progress' as const, emoji: '🟡', color: '#FFC107' },
  done:        { labelKey: 'vote_status_done' as const,     emoji: '✅', color: '#2196F3' },
};

export default function VoteScreen({ navigation }: any) {
  const { colors } = useTheme();
  const t = useT();
  const styles = getStyles(colors);

  const STATUS_CONFIG = {
    open:        { label: t('vote_status_open'),     emoji: '🟢', color: '#4CAF50' },
    in_progress: { label: t('vote_status_progress'), emoji: '🟡', color: '#FFC107' },
    done:        { label: t('vote_status_done'),      emoji: '✅', color: '#2196F3' },
  };

  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [votedIds, setVotedIds] = useState<string[]>([]);
  const [voting, setVoting] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'zones'));
      const existing = snap.docs.map(d => ({ id: d.id, ...d.data() } as Zone));
      const existingNames = new Set(existing.map(z => z.name));

      // Add any zones not yet in Firestore
      const toSeed = SAMPLE_ZONES.filter(z => !existingNames.has(z.name));
      const seeded: Zone[] = [];
      for (const zone of toSeed) {
        const ref = await addDoc(collection(db, 'zones'), zone);
        seeded.push({ id: ref.id, ...(zone as any) });
      }

      setZones([...existing, ...seeded].sort((a, b) => b.votes - a.votes));

      const stored = await AsyncStorage.getItem(VOTES_KEY);
      if (stored) setVotedIds(JSON.parse(stored));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleVote = async (zone: Zone) => {
    if (votedIds.includes(zone.id)) return;
    setVoting(zone.id);
    try {
      await updateDoc(doc(db, 'zones', zone.id), { votes: fsIncrement(1) });
      const newIds = [...votedIds, zone.id];
      setVotedIds(newIds);
      await AsyncStorage.setItem(VOTES_KEY, JSON.stringify(newIds));
      setZones(prev => prev.map(z => z.id === zone.id ? { ...z, votes: z.votes + 1 } : z));
    } catch {
      // silent
    } finally {
      setVoting(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>{t('vote_title')}</Text>
          <Text style={styles.subtitle}>{t('vote_subtitle')}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {zones.map(zone => {
            const voted = votedIds.includes(zone.id);
            const pct = Math.min((zone.votes / 50) * 100, 100);
            const cfg = STATUS_CONFIG[zone.status] ?? STATUS_CONFIG.open;

            return (
              <View key={zone.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.zoneName}>{zone.name}</Text>
                    <View style={styles.districtChip}>
                      <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                      <Text style={styles.districtText}>{zone.district}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
                    <Text style={styles.statusEmoji}>{cfg.emoji}</Text>
                    <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>

                <View style={styles.progressRow}>
                  <Text style={styles.votesCount}>{zone.votes} votes</Text>
                  <Text style={styles.voteGoal}>/ 50</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: colors.primary }]} />
                </View>

                <TouchableOpacity
                  style={[styles.voteBtn, voted && styles.voteBtnVoted]}
                  onPress={() => handleVote(zone)}
                  disabled={voted || voting === zone.id}
                >
                  {voting === zone.id ? (
                    <ActivityIndicator color={voted ? colors.textMuted : '#fff'} size="small" />
                  ) : (
                    <>
                      <Text style={styles.voteBtnIcon}>{voted ? '✅' : '👍'}</Text>
                      <Text style={[styles.voteBtnText, voted && styles.voteBtnTextVoted]}>
                        {voted ? t('vote_already_voted') : t('vote_btn')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors: any): any => ({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, gap: 12, paddingBottom: 40 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 11, color: colors.textMuted, marginTop: 1 },

  card: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardInfo: { flex: 1, gap: 6 },
  zoneName: { fontSize: 16, fontWeight: '700', color: colors.text },
  districtChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', backgroundColor: colors.background, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: colors.border,
  },
  districtText: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
  },
  statusEmoji: { fontSize: 12 },
  statusLabel: { fontSize: 11, fontWeight: '700' },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  votesCount: { fontSize: 13, fontWeight: '800', color: colors.text },
  voteGoal: { fontSize: 12, color: colors.textMuted },
  progressTrack: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  voteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12,
  },
  voteBtnVoted: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  voteBtnIcon: { fontSize: 16 },
  voteBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  voteBtnTextVoted: { color: colors.textMuted },
});
