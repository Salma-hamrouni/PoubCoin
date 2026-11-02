import React, { useState, useEffect } from 'react';
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection, addDoc, getDocs, doc, updateDoc,
  arrayUnion, arrayRemove, query, orderBy, getDoc, setDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n/useT';

const NEIGHBORHOODS = [
  'Tunis', 'Sfax', 'Sousse', 'Monastir', 'Bizerte',
  'Nabeul', 'Ariana', 'Ben Arous', 'Manouba', 'Zaghouan',
];

interface Team {
  id: string;
  name: string;
  neighborhood: string;
  createdBy: string;
  memberIds: string[];
  score: number;
  createdAt: any;
}

export default function TeamScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { user } = useAuth();
  const t = useT();

  const [teams, setTeams] = useState<Team[]>([]);
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(NEIGHBORHOODS[0]);
  const [showCreate, setShowCreate] = useState(false);
  const [showNeighPicker, setShowNeighPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});

  const loadTeams = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get user's teamId
      const userSnap = await getDoc(doc(db, 'users', user.id));
      const teamId: string | undefined = userSnap.data()?.teamId;

      const q = query(collection(db, 'teams'), orderBy('score', 'desc'));
      const snap = await getDocs(q);
      const allTeams = snap.docs.map(d => ({ id: d.id, ...d.data() } as Team));
      setTeams(allTeams);

      if (teamId) {
        const found = allTeams.find(t => t.id === teamId) ?? null;
        setMyTeam(found);
      } else {
        setMyTeam(null);
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTeams(); }, [user?.id]);

  useEffect(() => {
    if (!myTeam) return;
    const uids = myTeam.memberIds.filter(uid => uid !== user?.id);
    if (uids.length === 0) return;
    Promise.all(uids.map(uid => getDoc(doc(db, 'users', uid)))).then(snaps => {
      const names: Record<string, string> = {};
      snaps.forEach(s => {
        if (s.exists()) names[s.id] = s.data().name ?? s.data().displayName ?? 'Membre';
      });
      setMemberNames(names);
    });
  }, [myTeam?.id]);

  const createTeam = async () => {
    if (!user || !teamName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom pour l\'équipe.');
      return;
    }
    setSaving(true);
    try {
      const newTeam = {
        name: teamName.trim(),
        neighborhood: selectedNeighborhood,
        createdBy: user.id,
        memberIds: [user.id],
        score: 0,
        createdAt: new Date().toISOString(),
      };
      const ref = await addDoc(collection(db, 'teams'), newTeam);
      await updateDoc(doc(db, 'users', user.id), { teamId: ref.id });
      setTeamName('');
      setShowCreate(false);
      await loadTeams();
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de créer l\'équipe.');
    } finally {
      setSaving(false);
    }
  };

  const joinTeam = async (team: Team) => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'teams', team.id), { memberIds: arrayUnion(user.id) });
      await updateDoc(doc(db, 'users', user.id), { teamId: team.id });
      await loadTeams();
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de rejoindre l\'équipe.');
    } finally {
      setSaving(false);
    }
  };

  const leaveTeam = async () => {
    if (!user || !myTeam) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'teams', myTeam.id), { memberIds: arrayRemove(user.id) });
      await updateDoc(doc(db, 'users', user.id), { teamId: null });
      setMyTeam(null);
      setLeaveConfirm(false);
      await loadTeams();
    } catch {
      Alert.alert('Erreur', 'Impossible de quitter l\'équipe.');
    } finally {
      setSaving(false);
    }
  };

  const teamRank = myTeam ? teams.findIndex(t => t.id === myTeam.id) + 1 : 0;

  if (loading || loadError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('team_title')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          {loading
            ? <ActivityIndicator color={colors.primary} size="large" />
            : <>
                <Ionicons name="wifi-outline" size={40} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: 15, fontWeight: '600' }}>Impossible de charger les équipes</Text>
                <TouchableOpacity onPress={() => { setLoadError(false); loadTeams(); }} style={{ marginTop: 14, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Réessayer</Text>
                </TouchableOpacity>
              </>
          }
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('team_title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {myTeam ? (
          <>
            {/* Team header */}
            <View style={styles.teamCard}>
              <Text style={styles.teamEmoji}>👥</Text>
              <Text style={styles.teamName}>{myTeam.name}</Text>
              <View style={styles.teamMeta}>
                <View style={styles.metaChip}>
                  <Ionicons name="location-outline" size={13} color={colors.primary} />
                  <Text style={styles.metaChipText}>{myTeam.neighborhood}</Text>
                </View>
                <View style={styles.metaChip}>
                  <Ionicons name="people-outline" size={13} color={colors.info} />
                  <Text style={styles.metaChipText}>{myTeam.memberIds.length} membres</Text>
                </View>
                <View style={styles.metaChip}>
                  <Ionicons name="trophy-outline" size={13} color={colors.gold} />
                  <Text style={styles.metaChipText}>#{teamRank}</Text>
                </View>
              </View>
              <View style={styles.teamScoreRow}>
                <Text style={styles.teamScoreLabel}>{t('team_score')}</Text>
                <Text style={styles.teamScore}>{myTeam.score} 🪙</Text>
              </View>
            </View>

            {/* Objectif mensuel */}
            {(() => {
              const goal = Math.max(20, myTeam.memberIds.length * 5);
              const progress = Math.min(myTeam.score, goal);
              const pct = Math.round((progress / goal) * 100);
              return (
                <View style={styles.goalCard}>
                  <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <Text style={styles.goalTitle}>🎯 {t('team_goal')}</Text>
                    <Text style={styles.goalCount}>{progress}/{goal} 🪙</Text>
                  </View>
                  <View style={styles.goalTrack}>
                    <View style={[styles.goalFill, { width: `${pct}%` as any }]} />
                  </View>
                  <Text style={styles.goalCaption}>{pct >= 100 ? '🎉 Objectif atteint ! Bonus distribué.' : `Plus que ${goal - progress} 🪙 pour déclencher le bonus d'équipe`}</Text>
                </View>
              );
            })()}

            {/* Members */}
            <Text style={styles.sectionTitle}>{t('team_members_section')}</Text>
            <View style={styles.membersCard}>
              {myTeam.memberIds.slice(0, 5).map((uid, i) => (
                <View key={uid} style={[styles.memberRow, i < Math.min(myTeam.memberIds.length, 5) - 1 && styles.memberDivider]}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.memberName}>
                    {uid === user?.id ? (user.name?.split(' ')[0] ?? t('team_you')) : (memberNames[uid] ?? '…')}
                  </Text>
                  {uid === myTeam.createdBy && (
                    <View style={styles.leaderBadge}>
                      <Text style={styles.leaderBadgeText}>{t('team_leader')}</Text>
                    </View>
                  )}
                </View>
              ))}
              {myTeam.memberIds.length > 5 && (
                <View style={styles.memberRow}>
                  <Text style={styles.moreMembers}>+{myTeam.memberIds.length - 5} autres membres</Text>
                </View>
              )}
            </View>

            {/* Chat button */}
            <TouchableOpacity
              style={styles.chatBtn}
              onPress={() => navigation.navigate('TeamChat', { teamId: myTeam.id, teamName: myTeam.name })}
            >
              <Ionicons name="chatbubbles-outline" size={20} color="#fff" />
              <Text style={styles.chatBtnText}>Chat d'équipe</Text>
            </TouchableOpacity>

            {/* Leave button */}
            {leaveConfirm ? (
              <View style={styles.leaveConfirmBox}>
                <Text style={styles.leaveConfirmText}>Voulez-vous vraiment quitter l'équipe ?</Text>
                <View style={styles.leaveConfirmBtns}>
                  <TouchableOpacity style={styles.leaveCancelBtn} onPress={() => setLeaveConfirm(false)} disabled={saving}>
                    <Text style={styles.leaveCancelText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.leaveOkBtn} onPress={leaveTeam} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.leaveOkText}>Quitter</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.leaveBtn} onPress={() => setLeaveConfirm(true)} disabled={saving}>
                <Ionicons name="exit-outline" size={18} color={colors.error} />
                <Text style={styles.leaveBtnText}>{t('team_leave')}</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            {/* No team */}
            <View style={styles.noTeamCard}>
              <Text style={styles.noTeamEmoji}>👥</Text>
              <Text style={styles.noTeamTitle}>Vous n'avez pas d'équipe</Text>
              <Text style={styles.noTeamSub}>Créez ou rejoignez une équipe de quartier pour collaborer et grimper dans le classement !</Text>
            </View>

            {/* Create team */}
            <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(!showCreate)}>
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.createBtnText}>{t('team_create_title')}</Text>
            </TouchableOpacity>

            {showCreate && (
              <View style={styles.createForm}>
                <Text style={styles.formLabel}>Nom de l'équipe</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ex: Les Champions de Tunis"
                  placeholderTextColor={colors.textMuted}
                  value={teamName}
                  onChangeText={setTeamName}
                />
                <Text style={styles.formLabel}>Quartier</Text>
                <TouchableOpacity style={styles.formPicker} onPress={() => setShowNeighPicker(!showNeighPicker)}>
                  <Text style={styles.formPickerText}>{selectedNeighborhood}</Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                </TouchableOpacity>
                {showNeighPicker && (
                  <View style={styles.pickerDropdown}>
                    {NEIGHBORHOODS.map(n => (
                      <TouchableOpacity
                        key={n}
                        style={styles.pickerOption}
                        onPress={() => { setSelectedNeighborhood(n); setShowNeighPicker(false); }}
                      >
                        <Text style={[styles.pickerOptionText, n === selectedNeighborhood && { color: colors.primary, fontWeight: '700' }]}>{n}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <TouchableOpacity style={styles.saveBtn} onPress={createTeam} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                    <Text style={styles.saveBtnText}>{t('team_create_title')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Join team */}
            <Text style={styles.sectionTitle}>{t('team_join')}</Text>
            {teams.length === 0 ? (
              <View style={styles.emptyTeams}>
                <Text style={styles.emptyTeamsText}>Aucune équipe disponible. Soyez le premier !</Text>
              </View>
            ) : (
              <View style={styles.teamsList}>
                {teams.map((team, i) => (
                  <View key={team.id} style={[styles.teamListRow, i < teams.length - 1 && styles.teamListDivider]}>
                    <View style={styles.teamListInfo}>
                      <Text style={styles.teamListName}>{team.name}</Text>
                      <Text style={styles.teamListMeta}>{team.neighborhood} · {team.memberIds.length} membres · {team.score} 🪙</Text>
                    </View>
                    <TouchableOpacity style={styles.joinBtn} onPress={() => joinTeam(team)} disabled={saving}>
                      <Text style={styles.joinBtnText}>{t('team_join')}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any): any => ({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },

  teamCard: {
    margin: 16, backgroundColor: colors.surface, borderRadius: 18,
    padding: 22, alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  teamEmoji: { fontSize: 48, marginBottom: 8 },
  teamName: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 12 },
  teamMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.background, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.border,
  },
  metaChipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  teamScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  teamScoreLabel: { fontSize: 14, color: colors.textMuted },
  teamScore: { fontSize: 20, fontWeight: '900', color: colors.gold },

  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginHorizontal: 16, marginTop: 16, marginBottom: 8,
  },

  membersCard: {
    marginHorizontal: 16, backgroundColor: colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  memberDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  memberAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primaryGhost, justifyContent: 'center', alignItems: 'center',
  },
  memberAvatarText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  memberName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  leaderBadge: { backgroundColor: colors.gold + '20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  leaderBadgeText: { fontSize: 11, fontWeight: '700', color: colors.gold },
  moreMembers: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },

  leaveConfirmBox: {
    margin: 16, marginTop: 20, padding: 16, borderRadius: 14,
    backgroundColor: '#FFEBEE', borderWidth: 1.5, borderColor: '#EF9A9A',
    gap: 12,
  },
  leaveConfirmText: { fontSize: 14, fontWeight: '600', color: colors.error, textAlign: 'center' },
  leaveConfirmBtns: { flexDirection: 'row', gap: 10 },
  leaveCancelBtn: {
    flex: 1, padding: 12, borderRadius: 10, alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  leaveCancelText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
  leaveOkBtn: {
    flex: 1, padding: 12, borderRadius: 10, alignItems: 'center',
    backgroundColor: colors.error,
  },
  leaveOkText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  chatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center',
    marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 14,
    backgroundColor: colors.info ?? '#3B82F6',
  },
  chatBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  leaveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center',
    margin: 16, marginTop: 20, padding: 16, borderRadius: 14,
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.error + '40',
  },
  leaveBtnText: { color: colors.error, fontWeight: '700', fontSize: 15 },

  noTeamCard: {
    margin: 16, backgroundColor: colors.surface, borderRadius: 18,
    padding: 28, alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  noTeamEmoji: { fontSize: 52, marginBottom: 12 },
  noTeamTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 8 },
  noTeamSub: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center',
    marginHorizontal: 16, marginBottom: 8, padding: 16, borderRadius: 14,
    backgroundColor: colors.primary,
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  createForm: {
    marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 8, gap: 8,
  },
  formLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  formInput: {
    backgroundColor: colors.background, borderRadius: 10, padding: 14,
    fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border,
  },
  formPicker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.background, borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  formPickerText: { fontSize: 15, color: colors.text },
  pickerDropdown: {
    backgroundColor: colors.surface, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  pickerOption: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickerOptionText: { fontSize: 14, color: colors.text },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: 10,
    padding: 14, alignItems: 'center', marginTop: 4,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  teamsList: {
    marginHorizontal: 16, backgroundColor: colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  teamListRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  teamListDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  teamListInfo: { flex: 1 },
  teamListName: { fontSize: 14, fontWeight: '700', color: colors.text },
  teamListMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  joinBtn: {
    backgroundColor: colors.primaryGhost, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.primary + '40',
  },
  joinBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary },

  emptyTeams: { marginHorizontal: 16, padding: 24, alignItems: 'center' },
  emptyTeamsText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },

  goalCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  goalTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  goalCount: { fontSize: 13, fontWeight: '700', color: colors.primary },
  goalTrack: { height: 10, backgroundColor: colors.background, borderRadius: 5, overflow: 'hidden', marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  goalFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 5 },
  goalCaption: { fontSize: 12, color: colors.textMuted },
});
