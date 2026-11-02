import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAdmin } from '../../context/AdminContext';
import { colors, radius, shadow } from '../../theme';

interface UserDetail {
  name: string;
  email?: string;
  joinedAt?: string;
  coins?: number;
  streak?: number;
  suspended?: boolean;
}

interface Report {
  id: string;
  address: string;
  date: string;
  status: 'pending' | 'validated' | 'rejected';
  coins?: number;
}

const STATUS_CFG = {
  pending:   { label: 'En attente', color: '#B45309', bg: '#FEF3C7' },
  validated: { label: 'Validé',     color: '#15803D', bg: '#DCFCE7' },
  rejected:  { label: 'Rejeté',     color: '#DC2626', bg: '#FEE2E2' },
};

function getLeague(coins: number): { name: string; color: string } {
  if (coins >= 1000) return { name: 'Platine', color: '#7C3AED' };
  if (coins >= 500)  return { name: 'Or',      color: '#B45309' };
  if (coins >= 200)  return { name: 'Argent',  color: '#6B7280' };
  return { name: 'Bronze', color: '#92400E' };
}

export default function AdminUserDetailScreen({ navigation, route }: any) {
  const { userId, userName } = route.params as { userId: string; userName: string };
  const { reports: allReports } = useAdmin();
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [userReports, setUserReports] = useState<Report[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bonusInput, setBonusInput] = useState('');
  const [showBonusForm, setShowBonusForm] = useState(false);
  const [suspendConfirmVisible, setSuspendConfirmVisible] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const userSnap = await getDoc(doc(db, 'users', userId));
        if (userSnap.exists()) {
          setUserDetail(userSnap.data() as UserDetail);
        }
        const walletSnap = await getDoc(doc(db, 'wallets', userId));
        if (walletSnap.exists()) {
          setWalletBalance(walletSnap.data()?.balance ?? 0);
        }
      } catch {}
      // Filter from already-loaded admin reports
      const filtered = allReports
        .filter(r => r.userId === userId)
        .slice(0, 5)
        .map(r => ({
          id: r.id,
          address: r.address,
          date: r.date,
          status: r.status,
          coins: r.coins,
        }));
      setUserReports(filtered);
      setLoading(false);
    };
    load();
  }, [userId, allReports]);

  const totalReports = allReports.filter(r => r.userId === userId).length;
  const validatedCount = allReports.filter(r => r.userId === userId && r.status === 'validated').length;
  const league = getLeague(walletBalance);
  const initials = (userDetail?.name ?? userName).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const handleSuspend = () => setSuspendConfirmVisible(true);

  const confirmSuspend = async () => {
    setSuspendConfirmVisible(false);
    try {
      await updateDoc(doc(db, 'users', userId), { suspended: true });
      showFeedback('success', "Compte suspendu. L'utilisateur ne peut plus se connecter.");
    } catch {
      showFeedback('error', 'Impossible de suspendre le compte.');
    }
  };

  const handleBonusCoins = async () => {
    const n = parseInt(bonusInput, 10);
    if (isNaN(n) || n <= 0) { showFeedback('error', 'Montant invalide.'); return; }
    try {
      await updateDoc(doc(db, 'wallets', userId), { balance: increment(n) });
      setWalletBalance(prev => prev + n);
      setShowBonusForm(false);
      setBonusInput('');
      showFeedback('success', `+${n} 🪙 ajoutés au compte.`);
    } catch {
      showFeedback('error', "Impossible d'ajouter les coins.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{userName}</Text>
        </View>
        <View style={s.loadingCenter}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

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

      <Modal visible={suspendConfirmVisible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>🚫 Suspendre</Text>
            <Text style={s.modalBody}>Suspendre le compte de {userDetail?.name ?? userName} ?</Text>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setSuspendConfirmVisible(false)}>
                <Text style={s.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalConfirm} onPress={confirmSuspend}>
                <Text style={s.modalConfirmText}>Suspendre</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{userDetail?.name ?? userName}</Text>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Avatar + name */}
        <View style={s.profileSection}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarInitials}>{initials}</Text>
          </View>
          <Text style={s.profileName}>{userDetail?.name ?? userName}</Text>
          {userDetail?.email ? <Text style={s.profileEmail}>{userDetail.email}</Text> : null}
          {userDetail?.joinedAt ? (
            <Text style={s.profileJoined}>Inscrit le {userDetail.joinedAt}</Text>
          ) : null}
          <View style={[s.leagueBadge, { backgroundColor: league.color + '20' }]}>
            <Text style={[s.leagueBadgeText, { color: league.color }]}>🏅 Ligue {league.name}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { label: 'Signalements', value: totalReports },
            { label: 'Validés',      value: validatedCount },
            { label: 'Coins',        value: walletBalance },
            { label: 'Streak',       value: userDetail?.streak ?? 0 },
          ].map(st => (
            <View key={st.label} style={s.statItem}>
              <Text style={s.statValue}>{st.value}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* Last 5 reports */}
        <View style={s.card}>
          <Text style={s.cardTitle}>5 derniers signalements</Text>
          {userReports.length === 0 ? (
            <Text style={s.emptyText}>Aucun signalement</Text>
          ) : (
            userReports.map(r => {
              const cfg = STATUS_CFG[r.status];
              return (
                <View key={r.id} style={s.reportRow}>
                  <View style={s.reportBody}>
                    <Text style={s.reportAddr} numberOfLines={1}>{r.address}</Text>
                    <Text style={s.reportDate}>{r.date}</Text>
                  </View>
                  <View style={[s.reportBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[s.reportBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Actions */}
        <View style={s.actionsCard}>
          <Text style={s.cardTitle}>Actions admin</Text>
          <View style={s.actionsBtns}>
            <TouchableOpacity style={s.suspendBtn} onPress={handleSuspend}>
              <Ionicons name="ban-outline" size={16} color="#DC2626" />
              <Text style={s.suspendText}>🚫 Suspendre</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.bonusBtn}
              onPress={() => setShowBonusForm(!showBonusForm)}
            >
              <Ionicons name="gift-outline" size={16} color={colors.primary} />
              <Text style={s.bonusBtnText}>🎁 Bonus coins</Text>
            </TouchableOpacity>
          </View>
          {showBonusForm && (
            <View style={s.bonusForm}>
              <View style={s.bonusInputRow}>
                <View style={s.bonusInputWrap}>
                  <TextInput
                    style={s.bonusInput}
                    placeholder="Nombre de coins"
                    keyboardType="numeric"
                    value={bonusInput}
                    onChangeText={setBonusInput}
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <TouchableOpacity style={s.bonusApply} onPress={handleBonusCoins}>
                  <Text style={s.bonusApplyText}>Ajouter</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 24, width: '100%', maxWidth: 340 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 8 },
  modalBody: { fontSize: 15, color: colors.textSecondary, marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancel: { flex: 1, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  modalCancelText: { color: colors.text, fontWeight: '600' },
  modalConfirm: { flex: 1, paddingVertical: 12, borderRadius: radius.md, backgroundColor: '#DC2626', alignItems: 'center' },
  modalConfirmText: { color: '#fff', fontWeight: '700' },
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text, flex: 1 },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  profileSection: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  avatarInitials: { fontSize: 32, fontWeight: '700', color: '#fff' },
  profileName: { fontSize: 20, fontWeight: '700', color: colors.text },
  profileEmail: { fontSize: 13, color: colors.textMuted },
  profileJoined: { fontSize: 12, color: colors.textMuted },
  leagueBadge: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6, marginTop: 4 },
  leagueBadgeText: { fontSize: 13, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden', ...shadow.xs,
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRightWidth: 1, borderRightColor: colors.border },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.primary },
  statLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: 16,
    borderWidth: 1, borderColor: colors.border, ...shadow.xs, gap: 10,
  },
  actionsCard: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: 16,
    borderWidth: 1, borderColor: colors.border, ...shadow.xs, gap: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 12 },
  reportRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border,
  },
  reportBody: { flex: 1 },
  reportAddr: { fontSize: 13, color: colors.text, fontWeight: '500' },
  reportDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  reportBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  reportBadgeText: { fontSize: 10, fontWeight: '600' },
  actionsBtns: { flexDirection: 'row', gap: 10 },
  suspendBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#DC2626', borderRadius: radius.xs, paddingVertical: 12,
  },
  suspendText: { color: '#DC2626', fontWeight: '600', fontSize: 13 },
  bonusBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.primaryGhost, borderRadius: radius.xs, paddingVertical: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  bonusBtnText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  bonusForm: { marginTop: 4 },
  bonusInputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  bonusInputWrap: { flex: 1 },
  bonusInput: {
    backgroundColor: colors.background, borderRadius: radius.xs, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: colors.text,
  },
  bonusApply: {
    backgroundColor: colors.primary, borderRadius: radius.xs,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  bonusApplyText: { color: '#fff', fontWeight: '700' },
});
