import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity,
  Modal, TextInput, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdmin, Challenge } from '../../context/AdminContext';
import { colors, radius, shadow } from '../../theme';

const EMPTY: Omit<Challenge, 'id'> = {
  title: '', description: '', emoji: '🎯', target: 5, reward: 50, active: true, deadline: '',
};

export default function AdminChallengesScreen({ navigation }: any) {
  const { challenges, addChallenge, updateChallenge, deleteChallenge } = useAdmin();
  const [editModal, setEditModal] = useState(false);
  const [addModal,  setAddModal]  = useState(false);
  const [current,   setCurrent]   = useState<Challenge | null>(null);
  const [form,      setForm]      = useState<Omit<Challenge, 'id'>>(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<Challenge | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const set = (key: keyof Omit<Challenge, 'id'>) => (val: any) =>
    setForm(f => ({ ...f, [key]: val }));

  const openEdit = (c: Challenge) => {
    setCurrent(c);
    setForm({ title: c.title, description: c.description, emoji: c.emoji, target: c.target, reward: c.reward, active: c.active, deadline: c.deadline ?? '' });
    setEditModal(true);
  };

  const saveEdit = async () => {
    if (!current || !form.title) return;
    await updateChallenge(current.id, form);
    setEditModal(false);
  };

  const saveAdd = async () => {
    if (!form.title) { setFormError('Titre requis'); return; }
    setFormError(null);
    await addChallenge(form);
    setAddModal(false);
    setForm(EMPTY);
  };

  const confirmDelete = (c: Challenge) => setDeleteTarget(c);

  const doDelete = async () => {
    if (!deleteTarget) return;
    await deleteChallenge(deleteTarget.id);
    setDeleteTarget(null);
  };

  const ChallengeForm = ({ onSave, onCancel, title: formTitle }: { onSave: () => void; onCancel: () => void; title: string }) => (
    <View style={s.modal}>
      <View style={s.modalHandle} />
      <Text style={s.modalTitle}>{formTitle}</Text>

      {[
        { key: 'emoji',       placeholder: 'Emoji (ex: 🎯)',     icon: 'happy-outline'         },
        { key: 'title',       placeholder: 'Titre du défi',      icon: 'trophy-outline'         },
        { key: 'description', placeholder: 'Description courte', icon: 'document-text-outline'  },
        { key: 'deadline',    placeholder: 'Date limite (opt.)', icon: 'calendar-outline'       },
      ].map(f => (
        <View key={f.key} style={s.fieldRow}>
          <Ionicons name={f.icon as any} size={16} color={colors.textMuted} style={{ marginRight: 10 }} />
          <TextInput
            style={s.fieldInput}
            placeholder={f.placeholder}
            placeholderTextColor={colors.textMuted}
            value={String(form[f.key as keyof typeof form])}
            onChangeText={set(f.key as any)}
          />
        </View>
      ))}

      <View style={s.numRow}>
        <View style={s.numField}>
          <Text style={s.numLabel}>Objectif</Text>
          <TextInput
            style={s.numInput}
            value={String(form.target)}
            onChangeText={v => set('target')(parseInt(v) || 0)}
            keyboardType="numeric"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={s.numUnit}>signalements</Text>
        </View>
        <View style={s.numField}>
          <Text style={s.numLabel}>Récompense</Text>
          <TextInput
            style={s.numInput}
            value={String(form.reward)}
            onChangeText={v => set('reward')(parseInt(v) || 0)}
            keyboardType="numeric"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={s.numUnit}>🪙 coins</Text>
        </View>
      </View>

      <View style={s.switchRow}>
        <View>
          <Text style={s.switchLabel}>Actif</Text>
          <Text style={s.switchSub}>Visible pour les citoyens</Text>
        </View>
        <Switch
          value={form.active}
          onValueChange={set('active')}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>

      {formError && <Text style={s.formError}>{formError}</Text>}
      <View style={s.modalActions}>
        <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
          <Text style={s.cancelText}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.saveBtn} onPress={onSave}>
          <Text style={s.saveText}>Enregistrer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.root}>
      <Modal visible={!!deleteTarget} transparent animationType="fade">
        <View style={s.overlayBg}>
          <View style={s.confirmBox}>
            <Text style={s.confirmTitle}>Supprimer</Text>
            <Text style={s.confirmBody}>Supprimer le défi "{deleteTarget?.title}" ?</Text>
            <View style={s.confirmActions}>
              <TouchableOpacity style={s.confirmCancel} onPress={() => setDeleteTarget(null)}>
                <Text style={s.confirmCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmDelete} onPress={doDelete}>
                <Text style={s.confirmDeleteText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerLabel}>GAMIFICATION</Text>
          <Text style={s.headerTitle}>Défis citoyens</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => { setForm(EMPTY); setAddModal(true); }}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={s.addBtnText}>Nouveau</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={challenges}
        keyExtractor={c => c.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListHeaderComponent={
          <Text style={s.listLabel}>{challenges.length} défi{challenges.length !== 1 ? 's' : ''}</Text>
        }
        renderItem={({ item }) => (
          <View style={[s.card, !item.active && s.cardInactive]}>
            <View style={s.cardLeft}>
              <View style={s.emojiBox}>
                <Text style={{ fontSize: 26 }}>{item.emoji}</Text>
              </View>
              <View style={s.cardBody}>
                <View style={s.cardTop}>
                  <Text style={s.cardTitle}>{item.title}</Text>
                  <View style={[s.activeBadge, { backgroundColor: item.active ? '#DCFCE7' : colors.background }]}>
                    <View style={[s.activeDot, { backgroundColor: item.active ? '#15803D' : colors.border }]} />
                    <Text style={[s.activeText, { color: item.active ? '#15803D' : colors.textMuted }]}>
                      {item.active ? 'Actif' : 'Inactif'}
                    </Text>
                  </View>
                </View>
                <Text style={s.cardDesc} numberOfLines={1}>{item.description}</Text>
                <View style={s.cardMeta}>
                  <View style={s.metaChip}>
                    <Ionicons name="flag-outline" size={11} color={colors.primary} />
                    <Text style={s.metaChipText}>{item.target} signalements</Text>
                  </View>
                  <View style={s.metaChip}>
                    <Text style={{ fontSize: 11 }}>🪙</Text>
                    <Text style={s.metaChipText}>{item.reward} coins</Text>
                  </View>
                  {item.deadline ? (
                    <View style={s.metaChip}>
                      <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
                      <Text style={s.metaChipText}>{item.deadline}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
            <View style={s.cardActions}>
              <TouchableOpacity
                style={s.toggleBtn}
                onPress={() => updateChallenge(item.id, { active: !item.active })}
              >
                <Ionicons
                  name={item.active ? 'pause-outline' : 'play-outline'}
                  size={15}
                  color={colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity style={s.editBtn} onPress={() => openEdit(item)}>
                <Ionicons name="create-outline" size={15} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={s.deleteBtn} onPress={() => confirmDelete(item)}>
                <Ionicons name="trash-outline" size={15} color="#DC2626" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="trophy-outline" size={52} color={colors.border} />
            <Text style={s.emptyTitle}>Aucun défi</Text>
            <Text style={s.emptyText}>Créez votre premier défi citoyen</Text>
          </View>
        }
      />

      <Modal visible={editModal} transparent animationType="slide">
        <View style={s.overlay}>
          <ChallengeForm title="Modifier le défi" onSave={saveEdit} onCancel={() => setEditModal(false)} />
        </View>
      </Modal>
      <Modal visible={addModal} transparent animationType="slide">
        <View style={s.overlay}>
          <ChallengeForm title="Nouveau défi" onSave={saveAdd} onCancel={() => setAddModal(false)} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  formError: { color: '#DC2626', fontSize: 13, marginBottom: 8, marginHorizontal: 4 },
  overlayBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmBox: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 24, width: '100%', maxWidth: 320 },
  confirmTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 8 },
  confirmBody: { fontSize: 15, color: colors.textSecondary, marginBottom: 20 },
  confirmActions: { flexDirection: 'row', gap: 12 },
  confirmCancel: { flex: 1, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  confirmCancelText: { color: colors.text, fontWeight: '600' },
  confirmDelete: { flex: 1, paddingVertical: 12, borderRadius: radius.md, backgroundColor: '#DC2626', alignItems: 'center' },
  confirmDeleteText: { color: '#fff', fontWeight: '700' },
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
  headerLabel: { fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.primary, borderRadius: radius.sm,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  listLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '500', marginBottom: 4 },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: 14,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, ...shadow.xs,
  },
  cardInactive: { opacity: 0.55 },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  emojiBox: {
    width: 50, height: 50, borderRadius: radius.sm,
    backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text, flex: 1 },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  activeDot: { width: 5, height: 5, borderRadius: 3 },
  activeText: { fontSize: 10, fontWeight: '600' },
  cardDesc: { fontSize: 12, color: colors.textMuted, marginBottom: 6 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.background, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 3,
    borderWidth: 1, borderColor: colors.border,
  },
  metaChipText: { fontSize: 10, fontWeight: '600', color: colors.textSecondary },
  cardActions: { gap: 6, marginLeft: 8 },
  toggleBtn: {
    width: 30, height: 30, borderRadius: radius.xs,
    backgroundColor: colors.primaryGhost, justifyContent: 'center', alignItems: 'center',
  },
  editBtn: {
    width: 30, height: 30, borderRadius: radius.xs,
    backgroundColor: colors.primaryGhost, justifyContent: 'center', alignItems: 'center',
  },
  deleteBtn: {
    width: 30, height: 30, borderRadius: radius.xs,
    backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center',
  },
  empty: { alignItems: 'center', paddingTop: 64, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
  emptyText: { fontSize: 13, color: colors.textMuted },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 16 },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background, borderRadius: radius.sm,
    paddingHorizontal: 12, height: 48, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  fieldInput: { flex: 1, fontSize: 14, color: colors.text },
  numRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  numField: {
    flex: 1, backgroundColor: colors.background, borderRadius: radius.sm,
    padding: 12, borderWidth: 1, borderColor: colors.border,
  },
  numLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginBottom: 2 },
  numInput: { fontSize: 22, fontWeight: '700', color: colors.text },
  numUnit: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.background, borderRadius: radius.sm,
    padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: colors.border,
  },
  switchLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  switchSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 14, alignItems: 'center' },
  cancelText: { color: colors.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: radius.sm, padding: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
});
