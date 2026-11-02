import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, FlatList,
  TouchableOpacity, TextInput, Platform, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, doc, updateDoc, addDoc, writeBatch, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase';
import { colors, radius, shadow } from '../../theme';

type ZoneStatus = 'open' | 'in_progress' | 'done';

interface Team {
  id: string;
  name: string;
  neighborhood: string;
  memberCount: number;
  score: number;
}

interface Zone {
  id: string;
  name: string;
  address: string;
  district: string;
  status: ZoneStatus;
}

const ZONE_STATUS_CYCLE: ZoneStatus[] = ['open', 'in_progress', 'done'];
const ZONE_STATUS_LABELS: Record<ZoneStatus, { label: string; color: string; bg: string }> = {
  open:        { label: 'Ouvert',      color: '#15803D', bg: '#DCFCE7' },
  in_progress: { label: 'En cours',    color: '#B45309', bg: '#FEF3C7' },
  done:        { label: 'Terminé',     color: '#6B7280', bg: '#F3F4F6' },
};

export default function AdminTeamsScreen({ navigation }: any) {
  const [tab, setTab] = useState<'teams' | 'zones'>('teams');
  const [teams, setTeams] = useState<Team[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [showAddZone, setShowAddZone] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneAddress, setNewZoneAddress] = useState('');
  const [newZoneDistrict, setNewZoneDistrict] = useState('');
  const [bonusInputId, setBonusInputId] = useState<string | null>(null);
  const [bonusAmount, setBonusAmount] = useState('');
  const [endSeasonConfirm, setEndSeasonConfirm] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [zoneError, setZoneError] = useState<string | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  useEffect(() => {
    const teamsQ = query(collection(db, 'teams'), orderBy('score', 'desc'));
    const unsubTeams = onSnapshot(teamsQ, snap => {
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() } as Team)));
    });
    const unsubZones = onSnapshot(collection(db, 'zones'), snap => {
      setZones(snap.docs.map(d => ({ id: d.id, ...d.data() } as Zone)));
    });
    return () => { unsubTeams(); unsubZones(); };
  }, []);

  const handleBonus = (teamId: string) => {
    setBonusInputId(teamId);
    setBonusAmount('');
  };

  const applyWebBonus = async (teamId: string) => {
    const n = parseInt(bonusAmount, 10);
    if (!isNaN(n) && n > 0) {
      const team = teams.find(t => t.id === teamId);
      await updateDoc(doc(db, 'teams', teamId), { score: (team?.score ?? 0) + n });
    }
    setBonusInputId(null);
    setBonusAmount('');
  };

  const handleEndSeason = () => setEndSeasonConfirm(true);

  const doEndSeason = async () => {
    setEndSeasonConfirm(false);
    try {
      const snap = await getDocs(collection(db, 'teams'));
      const sorted = snap.docs
        .map(d => ({ id: d.id, score: d.data().score ?? 0 }))
        .sort((a, b) => b.score - a.score);
      const bonuses = [200, 100, 50];
      for (let i = 0; i < sorted.length; i++) {
        const bonus = bonuses[i] ?? 0;
        await updateDoc(doc(db, 'teams', sorted[i].id), { score: bonus });
      }
      showFeedback('success', 'Saison terminée ! Les scores ont été réinitialisés avec les bonus de classement.');
    } catch {
      showFeedback('error', 'Impossible de terminer la saison.');
    }
  };

  const toggleZoneStatus = async (zone: Zone) => {
    const idx = ZONE_STATUS_CYCLE.indexOf(zone.status);
    const nextStatus = ZONE_STATUS_CYCLE[(idx + 1) % ZONE_STATUS_CYCLE.length];
    await updateDoc(doc(db, 'zones', zone.id), { status: nextStatus });
  };

  const handleAddZone = async () => {
    if (!newZoneName.trim()) { setZoneError('Le nom de la zone est requis.'); return; }
    setZoneError(null);
    await addDoc(collection(db, 'zones'), {
      name: newZoneName.trim(),
      address: newZoneAddress.trim(),
      district: newZoneDistrict.trim(),
      status: 'open' as ZoneStatus,
    });
    setNewZoneName(''); setNewZoneAddress(''); setNewZoneDistrict('');
    setShowAddZone(false);
  };

  return (
    <SafeAreaView style={s.root}>
      {feedback && (
        <View style={[s.feedbackBanner, feedback.type === 'success' ? s.feedbackSuccess : s.feedbackError]}>
          <Text style={s.feedbackText}>{feedback.message}</Text>
          <TouchableOpacity onPress={() => setFeedback(null)}>
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={endSeasonConfirm} transparent animationType="fade">
        <View style={s.overlayBg}>
          <View style={s.confirmBox}>
            <Text style={s.confirmTitle}>🏆 Fin de saison</Text>
            <Text style={s.confirmBody}>Réinitialiser tous les scores ? Les bonus de classement seront attribués.</Text>
            <View style={s.confirmActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setEndSeasonConfirm(false)}>
                <Text style={s.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={doEndSeason}>
                <Text style={s.confirmBtnText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.headerLabel}>ADMINISTRATION</Text>
          <Text style={s.headerTitle}>🏆 Équipes & Ligues</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {(['teams', 'zones'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'teams' ? 'Équipes' : 'Zones de vote'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'teams' ? (
        <ScrollView contentContainerStyle={s.content}>
          <TouchableOpacity style={s.endSeasonBtn} onPress={handleEndSeason}>
            <Ionicons name="trophy-outline" size={18} color="#fff" />
            <Text style={s.endSeasonText}>🏆 Fin de saison</Text>
          </TouchableOpacity>

          {teams.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="people-outline" size={48} color={colors.border} />
              <Text style={s.emptyText}>Aucune équipe</Text>
            </View>
          ) : (
            teams.map((team, i) => (
              <View key={team.id} style={s.teamCard}>
                <View style={s.teamRankBadge}>
                  <Text style={s.teamRank}>#{i + 1}</Text>
                </View>
                <View style={s.teamBody}>
                  <Text style={s.teamName}>{team.name}</Text>
                  <Text style={s.teamMeta}>{team.neighborhood} · {team.memberCount ?? 0} membres</Text>
                </View>
                <Text style={s.teamScore}>{team.score ?? 0} 🪙</Text>
                <TouchableOpacity style={s.bonusBtn} onPress={() => handleBonus(team.id)}>
                  <Text style={s.bonusBtnText}>🎁</Text>
                </TouchableOpacity>
                {bonusInputId === team.id && (
                  <View style={s.inlineBonusRow}>
                    <TextInput
                      style={s.bonusInput}
                      placeholder="Coins"
                      keyboardType="numeric"
                      value={bonusAmount}
                      onChangeText={setBonusAmount}
                      placeholderTextColor={colors.textMuted}
                    />
                    <TouchableOpacity style={s.bonusApplyBtn} onPress={() => applyWebBonus(team.id)}>
                      <Text style={s.bonusApplyText}>OK</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={s.content}>
          <TouchableOpacity style={s.addZoneBtn} onPress={() => setShowAddZone(!showAddZone)}>
            <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
            <Text style={s.addZoneText}>➕ Ajouter une zone</Text>
          </TouchableOpacity>

          {showAddZone && (
            <View style={s.addZoneForm}>
              <TextInput
                style={s.input}
                placeholder="Nom de la zone"
                placeholderTextColor={colors.textMuted}
                value={newZoneName}
                onChangeText={setNewZoneName}
              />
              <TextInput
                style={s.input}
                placeholder="Adresse"
                placeholderTextColor={colors.textMuted}
                value={newZoneAddress}
                onChangeText={setNewZoneAddress}
              />
              <TextInput
                style={s.input}
                placeholder="Quartier / District"
                placeholderTextColor={colors.textMuted}
                value={newZoneDistrict}
                onChangeText={setNewZoneDistrict}
              />
              {zoneError && <Text style={s.zoneError}>{zoneError}</Text>}
              <TouchableOpacity style={s.addZoneSubmitBtn} onPress={handleAddZone}>
                <Text style={s.addZoneSubmitText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          )}

          {zones.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="map-outline" size={48} color={colors.border} />
              <Text style={s.emptyText}>Aucune zone</Text>
            </View>
          ) : (
            zones.map(zone => {
              const cfg = ZONE_STATUS_LABELS[zone.status ?? 'open'];
              return (
                <View key={zone.id} style={s.zoneCard}>
                  <View style={s.zoneBody}>
                    <Text style={s.zoneName}>{zone.name}</Text>
                    <Text style={s.zoneMeta}>{zone.address}{zone.district ? ` · ${zone.district}` : ''}</Text>
                  </View>
                  <TouchableOpacity
                    style={[s.statusBtn, { backgroundColor: cfg.bg }]}
                    onPress={() => toggleZoneStatus(zone)}
                  >
                    <Text style={[s.statusBtnText, { color: cfg.color }]}>{cfg.label}</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  feedbackBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  feedbackSuccess: { backgroundColor: '#15803D' },
  feedbackError: { backgroundColor: '#DC2626' },
  feedbackText: { color: '#fff', fontSize: 14, flex: 1, marginRight: 8 },
  zoneError: { color: '#DC2626', fontSize: 13, marginBottom: 8 },
  overlayBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmBox: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 24, width: '100%', maxWidth: 340 },
  confirmTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 8 },
  confirmBody: { fontSize: 15, color: colors.textSecondary, marginBottom: 20 },
  confirmActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  cancelBtnText: { color: colors.text, fontWeight: '600' },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, backgroundColor: '#DC2626', alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: '700' },
  header: {
    backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border, ...shadow.sm,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: radius.xs,
    backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  headerText: { flex: 1 },
  headerLabel: { fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  tabRow: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  tabTextActive: { color: colors.primary, fontWeight: '700' },
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  endSeasonBtn: {
    backgroundColor: '#B45309', borderRadius: radius.sm,
    paddingVertical: 12, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  endSeasonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  teamCard: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: colors.border, ...shadow.xs, flexWrap: 'wrap',
  },
  teamRankBadge: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.primaryGhost, justifyContent: 'center', alignItems: 'center',
  },
  teamRank: { fontSize: 13, fontWeight: '700', color: colors.primary },
  teamBody: { flex: 1 },
  teamName: { fontSize: 15, fontWeight: '600', color: colors.text },
  teamMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  teamScore: { fontSize: 14, fontWeight: '700', color: colors.primary },
  bonusBtn: {
    width: 34, height: 34, borderRadius: radius.xs,
    backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center',
  },
  bonusBtnText: { fontSize: 18 },
  inlineBonusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '100%', marginTop: 8 },
  bonusInput: {
    flex: 1, backgroundColor: colors.background, borderRadius: radius.xs,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 6,
    fontSize: 14, color: colors.text,
  },
  bonusApplyBtn: {
    backgroundColor: colors.primary, borderRadius: radius.xs,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  bonusApplyText: { color: '#fff', fontWeight: '700' },
  addZoneBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primaryGhost, borderRadius: radius.sm, borderWidth: 1,
    borderColor: colors.border, paddingVertical: 12, paddingHorizontal: 16,
  },
  addZoneText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  addZoneForm: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: 16,
    borderWidth: 1, borderColor: colors.border, gap: 10,
  },
  input: {
    backgroundColor: colors.background, borderRadius: radius.xs, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: colors.text,
  },
  addZoneSubmitBtn: {
    backgroundColor: colors.primary, borderRadius: radius.xs,
    paddingVertical: 12, alignItems: 'center',
  },
  addZoneSubmitText: { color: '#fff', fontWeight: '700' },
  zoneCard: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: colors.border, ...shadow.xs,
  },
  zoneBody: { flex: 1 },
  zoneName: { fontSize: 15, fontWeight: '600', color: colors.text },
  zoneMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  statusBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  statusBtnText: { fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyText: { fontSize: 14, color: colors.textMuted },
});
