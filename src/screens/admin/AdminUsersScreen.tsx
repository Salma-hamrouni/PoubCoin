import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, SafeAreaView,
  TouchableOpacity, TextInput, Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAdmin, AdminUser } from '../../context/AdminContext';
import { useAdminPrefs } from '../../context/AdminPrefsContext';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, shadow } from '../../theme';

export default function AdminUsersScreen() {
  const { users, reports, blockUser, unblockUser, deleteUser, giveCoins } = useAdmin();
  const { accentColor } = useAdminPrefs();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [givingCoins, setGivingCoins] = useState(false);
  const [coinsAmount, setCoinsAmount] = useState('');
  const [coinsLabel, setCoinsLabel] = useState('');

  const citizens = users.filter(u => {
    const role = (u.role ?? '').toLowerCase();
    return role !== 'municipality_admin' && role !== 'admin' && u.id !== currentUser?.id;
  });

  const filtered = citizens.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalUsers   = citizens.length;
  const activeUsers  = citizens.filter(u => !u.blocked).length;
  const blockedUsers = citizens.filter(u => u.blocked).length;

  const getReportCount = (userId: string) =>
    reports.filter(r => r.userId === userId).length;
  const getValidatedCount = (userId: string) =>
    reports.filter(r => r.userId === userId && r.status === 'validated').length;

  const handleDeleteAction = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    setActionError('');
    try {
      await deleteUser(selectedUser.id);
      setConfirmingDelete(false);
      setSelectedUser(null);
    } catch (e: any) {
      setActionError('Erreur : ' + (e?.message ?? 'Impossible de supprimer ce compte'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlockAction = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    setActionError('');
    setActionSuccess('');
    try {
      if (selectedUser.blocked) {
        await unblockUser(selectedUser.id);
        setSelectedUser(prev => prev ? { ...prev, blocked: false } : null);
        setActionSuccess('Compte débloqué avec succès.');
      } else {
        await blockUser(selectedUser.id);
        setSelectedUser(prev => prev ? { ...prev, blocked: true } : null);
        setActionSuccess('Compte bloqué avec succès.');
      }
      setConfirming(false);
    } catch (e: any) {
      setActionError('Erreur : ' + (e?.message ?? 'Impossible de modifier ce compte'));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.root}>
      <LinearGradient colors={[accentColor + 'DD', accentColor]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <View>
            <Text style={{ fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: 2 }}>GESTION</Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff', marginTop: 2 }}>Utilisateurs</Text>
          </View>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#4ADE80' }}>{citizens.length}</Text>
            <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: '600', textAlign: 'center' }}>citoyens</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { label: 'Total', value: totalUsers, color: '#4ADE80' },
            { label: 'Actifs', value: activeUsers, color: '#6EE7B7' },
            { label: 'Bloqués', value: blockedUsers, color: '#FCA5A5' },
          ].map(st => (
            <View key={st.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: st.color }}>{st.value}</Text>
              <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginTop: 1 }}>{st.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Search */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, margin: 14, borderRadius: 14, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: colors.border, ...shadow.xs }}>
        <Ionicons name="search-outline" size={16} color={colors.textMuted} />
        <TextInput
          style={{ flex: 1, fontSize: 14, color: colors.text }}
          placeholder="Rechercher par nom ou email..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={u => u.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListHeaderComponent={
          <Text style={s.listLabel}>
            {filtered.length} citoyen{filtered.length !== 1 ? 's' : ''}
            {search ? ` pour "${search}"` : ''}
          </Text>
        }
        renderItem={({ item }) => {
          const count = getReportCount(item.id);
          return (
            <TouchableOpacity
              onPress={() => setSelectedUser(item)}
              activeOpacity={0.75}
              style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: item.blocked ? '#FCA5A5' : colors.border, overflow: 'hidden', opacity: item.blocked ? 0.85 : 1, ...shadow.xs }}
            >
              {item.blocked && <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: '#DC2626' }} />}
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, paddingLeft: item.blocked ? 18 : 14, gap: 12 }}>
                <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: item.blocked ? '#FEE2E2' : colors.primaryGhost, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: item.blocked ? '#FCA5A5' : colors.border }}>
                  <Text style={{ fontSize: 22 }}>{item.avatar || item.name?.charAt(0).toUpperCase() || '👤'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{item.name}</Text>
                    {item.blocked && (
                      <View style={{ backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#DC2626' }}>Bloqué</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>{item.email}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {item.city ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.background, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: colors.border }}>
                        <Ionicons name="location-outline" size={10} color={colors.textMuted} />
                        <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: '600' }}>{item.city}</Text>
                      </View>
                    ) : null}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primaryGhost, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
                      <Ionicons name="documents-outline" size={10} color={colors.primary} />
                      <Text style={{ fontSize: 10, color: colors.primary, fontWeight: '700' }}>{count} signalement{count !== 1 ? 's' : ''}</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={{ width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: item.blocked ? colors.primaryGhost : '#FEE2E2' }}
                  onPress={(e) => { e.stopPropagation?.(); setSelectedUser(item); setConfirming(true); setActionError(''); setActionSuccess(''); }}
                >
                  <Ionicons name={item.blocked ? 'lock-open-outline' : 'ban-outline'} size={16} color={item.blocked ? colors.primary : '#DC2626'} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="people-outline" size={52} color={colors.border} />
            <Text style={s.emptyTitle}>Aucun utilisateur</Text>
            <Text style={s.emptyText}>
              {search ? 'Aucun résultat pour cette recherche' : 'Les citoyens inscrits apparaîtront ici'}
            </Text>
          </View>
        }
      />

      {/* User detail modal */}
      <Modal visible={!!selectedUser} transparent animationType="slide">
        <View style={s.overlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }} keyboardShouldPersistTaps="handled">
            {selectedUser && (() => {
              const totalRpts   = getReportCount(selectedUser.id);
              const validRpts   = getValidatedCount(selectedUser.id);
              return (
                <View style={s.modal}>
                  <View style={s.modalHandle} />

                  {/* Avatar + name */}
                  <View style={s.modalAvatarRow}>
                    <View style={[s.modalAvatar, selectedUser.blocked && { borderColor: '#DC2626', borderWidth: 2 }]}>
                      <Text style={s.modalAvatarText}>{selectedUser.avatar || selectedUser.name?.charAt(0).toUpperCase() || '👤'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={s.modalName}>{selectedUser.name}</Text>
                        {selectedUser.blocked && (
                          <View style={s.blockedBadge}><Text style={s.blockedText}>Bloqué</Text></View>
                        )}
                      </View>
                      <Text style={s.modalEmail}>{selectedUser.email}</Text>
                      {selectedUser.city ? <Text style={s.modalCity}>📍 {selectedUser.city}</Text> : null}
                      {selectedUser.joinedAt ? <Text style={s.modalJoined}>Inscrit le {selectedUser.joinedAt}</Text> : null}
                    </View>
                  </View>

                  {/* Stats */}
                  <View style={s.modalStats}>
                    <View style={s.modalStatItem}>
                      <Text style={[s.modalStatVal, { color: colors.primary }]}>{totalRpts}</Text>
                      <Text style={s.modalStatLabel}>Signalements</Text>
                    </View>
                    <View style={s.modalStatDivider} />
                    <View style={s.modalStatItem}>
                      <Text style={[s.modalStatVal, { color: '#15803D' }]}>{validRpts}</Text>
                      <Text style={s.modalStatLabel}>Validés</Text>
                    </View>
                    <View style={s.modalStatDivider} />
                    <View style={s.modalStatItem}>
                      <Text style={[s.modalStatVal, { color: '#B45309' }]}>{totalRpts - validRpts}</Text>
                      <Text style={s.modalStatLabel}>Autres</Text>
                    </View>
                  </View>

                  {/* Block / Unblock */}
                  {actionError ? (
                    <Text style={s.errorText}>{actionError}</Text>
                  ) : null}
                  {actionSuccess ? (
                    <Text style={s.successText}>{actionSuccess}</Text>
                  ) : null}

                  {confirming ? (
                    <View style={s.confirmBox}>
                      <Text style={s.confirmText}>
                        {selectedUser.blocked
                          ? `Débloquer le compte de ${selectedUser.name} ?`
                          : `Bloquer le compte de ${selectedUser.name} ? L'utilisateur sera déconnecté.`}
                      </Text>
                      <View style={s.confirmBtns}>
                        <TouchableOpacity style={s.confirmCancel} onPress={() => setConfirming(false)}>
                          <Text style={s.confirmCancelText}>Annuler</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.confirmOk, selectedUser.blocked ? s.confirmOkGreen : s.confirmOkRed]}
                          onPress={handleBlockAction}
                          disabled={actionLoading}
                        >
                          <Text style={s.confirmOkText}>
                            {actionLoading ? '...' : selectedUser.blocked ? 'Débloquer' : 'Bloquer'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : confirmingDelete ? (
                    <View style={s.confirmBoxDanger}>
                      <Text style={s.confirmTextDanger}>
                        ⚠️ Supprimer définitivement le compte de {selectedUser.name} ?{'\n'}Cette action est irréversible.
                      </Text>
                      <View style={s.confirmBtns}>
                        <TouchableOpacity style={s.confirmCancel} onPress={() => setConfirmingDelete(false)}>
                          <Text style={s.confirmCancelText}>Annuler</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.confirmOk, s.confirmOkRed]}
                          onPress={handleDeleteAction}
                          disabled={actionLoading}
                        >
                          <Text style={s.confirmOkText}>{actionLoading ? '...' : 'Supprimer'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : givingCoins ? (
                    <View style={s.confirmBox}>
                      <Text style={s.confirmText}>Attribuer des PoubCoins à {selectedUser.name}</Text>
                      <TextInput
                        style={s.coinsInput}
                        placeholder="Montant (ex: 50)"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        value={coinsAmount}
                        onChangeText={setCoinsAmount}
                      />
                      <TextInput
                        style={s.coinsInput}
                        placeholder="Motif (ex: Bonus participation)"
                        placeholderTextColor={colors.textMuted}
                        value={coinsLabel}
                        onChangeText={setCoinsLabel}
                      />
                      <View style={s.confirmBtns}>
                        <TouchableOpacity style={s.confirmCancel} onPress={() => { setGivingCoins(false); setCoinsAmount(''); setCoinsLabel(''); }}>
                          <Text style={s.confirmCancelText}>Annuler</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.confirmOk, s.confirmOkGreen]}
                          disabled={actionLoading || !coinsAmount}
                          onPress={async () => {
                            const n = parseInt(coinsAmount, 10);
                            if (!n || n <= 0) return;
                            setActionLoading(true);
                            setActionError('');
                            try {
                              await giveCoins(selectedUser.id, n, coinsLabel || 'Bonus admin');
                              setActionSuccess(`${n} 🪙 attribués avec succès.`);
                              setGivingCoins(false);
                              setCoinsAmount('');
                              setCoinsLabel('');
                            } catch (e: any) {
                              setActionError('Erreur : ' + (e?.message ?? 'Impossible d\'attribuer'));
                            } finally {
                              setActionLoading(false);
                            }
                          }}
                        >
                          <Text style={s.confirmOkText}>{actionLoading ? '...' : 'Attribuer'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={s.giveCoinsBtn}
                        onPress={() => { setGivingCoins(true); setActionError(''); setActionSuccess(''); }}
                      >
                        <Ionicons name="cash-outline" size={18} color="#15803D" />
                        <Text style={[s.modalBlockText, { color: '#15803D' }]}>Attribuer des PoubCoins</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.modalBlockBtn, selectedUser.blocked ? s.modalUnblockBtn : s.modalBlockBtnRed]}
                        onPress={() => { setConfirming(true); setActionError(''); }}
                      >
                        <Ionicons
                          name={selectedUser.blocked ? 'lock-open-outline' : 'ban-outline'}
                          size={18}
                          color={selectedUser.blocked ? colors.primary : '#DC2626'}
                        />
                        <Text style={[s.modalBlockText, { color: selectedUser.blocked ? colors.primary : '#DC2626' }]}>
                          {selectedUser.blocked ? 'Débloquer ce compte' : 'Bloquer ce compte'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.deleteBtn}
                        onPress={() => { setConfirmingDelete(true); setActionError(''); }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#7C3AED" />
                        <Text style={s.deleteBtnText}>Supprimer ce compte</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  <TouchableOpacity style={s.closeBtn} onPress={() => { setSelectedUser(null); setConfirming(false); setConfirmingDelete(false); setGivingCoins(false); setCoinsAmount(''); setCoinsLabel(''); setActionError(''); setActionSuccess(''); }}>
                    <Text style={s.closeBtnText}>Fermer</Text>
                  </TouchableOpacity>
                </View>
              );
            })()}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.surface, paddingHorizontal: 20, paddingVertical: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: colors.border, ...shadow.sm,
  },
  headerLabel: { fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  headerBadge: {
    backgroundColor: colors.primaryGhost, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  headerBadgeText: { fontSize: 15, fontWeight: '700', color: colors.primary },

  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: colors.surface, paddingVertical: 12, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  statChip: { alignItems: 'center' },
  statChipVal: { fontSize: 22, fontWeight: '700' },
  statChipLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: colors.border },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, margin: 16, borderRadius: radius.sm,
    paddingHorizontal: 14, height: 44,
    borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  listLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '500', marginBottom: 4 },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border, ...shadow.xs,
    overflow: 'hidden',
  },
  cardBlocked: { opacity: 0.75 },
  blockedBorder: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
    backgroundColor: '#DC2626', borderTopLeftRadius: radius.md, borderBottomLeftRadius: radius.md,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: colors.primaryGhost, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  avatarText: { fontSize: 22 },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  userName: { fontSize: 15, fontWeight: '600', color: colors.text },
  blockedBadge: {
    backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  blockedText: { fontSize: 10, fontWeight: '700', color: '#DC2626' },
  email: { fontSize: 12, color: colors.textMuted, marginBottom: 6 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, color: colors.textMuted },
  actionBtn: {
    width: 36, height: 36, borderRadius: radius.xs,
    justifyContent: 'center', alignItems: 'center',
  },
  blockBtn: { backgroundColor: '#FEE2E2' },
  unblockBtn: { backgroundColor: colors.primaryGhost },

  empty: { alignItems: 'center', paddingTop: 64, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20,
  },
  modalAvatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  modalAvatar: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.primaryGhost, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  modalAvatarText: { fontSize: 28 },
  modalName: { fontSize: 17, fontWeight: '700', color: colors.text },
  modalEmail: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  modalCity: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  modalJoined: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  modalStats: {
    flexDirection: 'row', backgroundColor: colors.background,
    borderRadius: radius.sm, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  modalStatItem: { flex: 1, alignItems: 'center' },
  modalStatVal: { fontSize: 22, fontWeight: '700' },
  modalStatLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  modalStatDivider: { width: 1, height: 36, backgroundColor: colors.border, alignSelf: 'center' },

  modalBlockBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: radius.sm, padding: 14, marginBottom: 10,
    borderWidth: 1.5,
  },
  modalBlockBtnRed: { borderColor: '#DC2626', backgroundColor: '#FEE2E2' },
  modalUnblockBtn:  { borderColor: colors.primary, backgroundColor: colors.primaryGhost },
  modalBlockText: { fontSize: 14, fontWeight: '700' },

  giveCoinsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: radius.sm, padding: 14, marginBottom: 10,
    borderWidth: 1.5, borderColor: '#15803D', backgroundColor: '#DCFCE7',
  },
  coinsInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.xs,
    padding: 10, fontSize: 14, color: colors.text, backgroundColor: colors.surface,
    marginBottom: 8,
  },
  closeBtn: {
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, padding: 14, alignItems: 'center',
  },
  closeBtnText: { color: colors.textSecondary, fontWeight: '600' },

  errorText: { color: '#DC2626', fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: 10 },
  successText: { color: '#15803D', fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: 10, backgroundColor: '#DCFCE7', borderRadius: 8, padding: 8 },

  confirmBox: {
    backgroundColor: '#FFF3CD', borderRadius: radius.sm, padding: 14,
    borderWidth: 1, borderColor: '#FFCC02', marginBottom: 10,
  },
  confirmText: { fontSize: 13, color: '#856404', fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  confirmBoxDanger: {
    backgroundColor: '#FDF2F8', borderRadius: radius.sm, padding: 14,
    borderWidth: 1, borderColor: '#C084FC', marginBottom: 10,
  },
  confirmTextDanger: { fontSize: 13, color: '#7C3AED', fontWeight: '600', marginBottom: 12, textAlign: 'center', lineHeight: 20 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: radius.sm, padding: 14, marginBottom: 10,
    borderWidth: 1.5, borderColor: '#C084FC', backgroundColor: '#FDF2F8',
  },
  deleteBtnText: { fontSize: 14, fontWeight: '700', color: '#7C3AED' },
  confirmBtns: { flexDirection: 'row', gap: 10 },
  confirmCancel: {
    flex: 1, padding: 12, borderRadius: radius.xs, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  confirmCancelText: { color: colors.textSecondary, fontWeight: '600', fontSize: 13 },
  confirmOk: { flex: 1, padding: 12, borderRadius: radius.xs, alignItems: 'center' },
  confirmOkRed: { backgroundColor: '#DC2626' },
  confirmOkGreen: { backgroundColor: colors.primary },
  confirmOkText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
