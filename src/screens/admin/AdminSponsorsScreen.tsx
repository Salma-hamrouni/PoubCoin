import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity,
  Modal, TextInput, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAdmin, Sponsor } from '../../context/AdminContext';
import { useAdminPrefs } from '../../context/AdminPrefsContext';
import { colors, radius, shadow } from '../../theme';

const EMPTY: Omit<Sponsor, 'id'> = {
  name: '', title: '', description: '', coins: 50,
  category: 'shopping', emoji: '🎁', stock: 10, active: true,
};

export default function AdminSponsorsScreen({ navigation }: any) {
  const { sponsors, updateSponsor, deleteSponsor, addSponsor } = useAdmin();
  const { accentColor } = useAdminPrefs();
  const [editModal, setEditModal] = useState(false);
  const [addModal,  setAddModal]  = useState(false);
  const [current,   setCurrent]   = useState<Sponsor | null>(null);
  const [form,      setForm]      = useState<Omit<Sponsor, 'id'>>(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<Sponsor | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const set = (key: keyof Omit<Sponsor, 'id'>) => (val: any) =>
    setForm(f => ({ ...f, [key]: val }));

  const openEdit = (s: Sponsor) => {
    setCurrent(s);
    setForm({ name: s.name, title: s.title, description: s.description, coins: s.coins, category: s.category, emoji: s.emoji, stock: s.stock, active: s.active });
    setEditModal(true);
  };

  const saveEdit = async () => {
    if (!current) return;
    await updateSponsor(current.id, form);
    setEditModal(false);
  };

  const saveAdd = async () => {
    if (!form.name || !form.title) { setFormError('Nom et titre requis'); return; }
    setFormError(null);
    await addSponsor(form);
    setAddModal(false);
    setForm(EMPTY);
  };

  const confirmDelete = (s: Sponsor) => setDeleteTarget(s);

  const doDelete = async () => {
    if (!deleteTarget) return;
    await deleteSponsor(deleteTarget.id);
    setDeleteTarget(null);
  };

  const SponsorForm = ({ onSave, onCancel, title }: { onSave: () => void; onCancel: () => void; title: string }) => (
    <View style={s.modal}>
      <View style={s.modalHandle} />
      <Text style={s.modalTitle}>{title}</Text>
      {formError && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#FCA5A5' }}>
          <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
          <Text style={{ fontSize: 13, color: '#DC2626', fontWeight: '600', flex: 1 }}>{formError}</Text>
        </View>
      )}

      {[
        { key: 'emoji',       placeholder: 'Emoji (ex: 🎁)',          icon: 'happy-outline' },
        { key: 'name',        placeholder: 'Nom du sponsor',           icon: 'business-outline' },
        { key: 'title',       placeholder: 'Titre de la récompense',   icon: 'gift-outline' },
        { key: 'description', placeholder: 'Description courte',       icon: 'document-text-outline' },
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
        <View style={[s.numField, { flex: 1 }]}>
          <Text style={s.numLabel}>Coins 🪙</Text>
          <TextInput
            style={s.numInput}
            value={String(form.coins)}
            onChangeText={v => set('coins')(parseInt(v) || 0)}
            keyboardType="numeric"
            placeholderTextColor={colors.textMuted}
          />
        </View>
        <View style={[s.numField, { flex: 1 }]}>
          <Text style={s.numLabel}>Stock</Text>
          <TextInput
            style={s.numInput}
            value={String(form.stock)}
            onChangeText={v => set('stock')(parseInt(v) || 0)}
            keyboardType="numeric"
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </View>

      <View style={s.switchRow}>
        <View>
          <Text style={s.switchLabel}>Actif</Text>
          <Text style={s.switchSub}>Visible dans la marketplace</Text>
        </View>
        <Switch
          value={form.active}
          onValueChange={set('active')}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>

      <View style={s.modalActions}>
        <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
          <Text style={s.cancelText}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.saveBtn, (!form.name.trim() || !form.title.trim()) && { opacity: 0.5 }]}
          onPress={onSave}
          disabled={!form.name.trim() || !form.title.trim()}
        >
          <Text style={s.saveText}>Enregistrer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <LinearGradient colors={[accentColor + 'DD', accentColor]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <View>
            <Text style={{ fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: 2 }}>GESTION</Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff', marginTop: 2 }}>Sponsors</Text>
          </View>
          <TouchableOpacity
            onPress={() => { setForm(EMPTY); setAddModal(true); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Ajouter</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { label: 'Total', value: sponsors.length, color: '#fff' },
            { label: 'Actifs', value: sponsors.filter(sp => sp.active).length, color: '#6EE7B7' },
            { label: 'Inactifs', value: sponsors.filter(sp => !sp.active).length, color: '#FCA5A5' },
          ].map(st => (
            <View key={st.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: st.color }}>{st.value}</Text>
              <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginTop: 1 }}>{st.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <FlatList
        data={sponsors}
        keyExtractor={s => s.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListHeaderComponent={
          <Text style={s.listLabel}>{sponsors.length} sponsor{sponsors.length !== 1 ? 's' : ''}</Text>
        }
        renderItem={({ item }) => (
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', opacity: item.active ? 1 : 0.6, ...shadow.xs }}>
            <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: item.active ? '#16A34A' : colors.border }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, paddingLeft: 18, gap: 12 }}>
              <View style={{ width: 54, height: 54, borderRadius: 14, backgroundColor: item.active ? colors.primaryGhost : colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 28 }}>{item.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.6 }}>{item.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: item.active ? '#DCFCE7' : colors.background, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: item.active ? '#16A34A' : colors.border }} />
                    <Text style={{ fontSize: 10, fontWeight: '700', color: item.active ? '#16A34A' : colors.textMuted }}>{item.active ? 'Actif' : 'Inactif'}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 5 }} numberOfLines={1}>{item.title}</Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <View style={{ backgroundColor: colors.primaryGhost, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>{item.coins} 🪙</Text>
                  </View>
                  <View style={{ backgroundColor: item.stock <= 0 ? '#FEE2E2' : colors.background, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: item.stock <= 0 ? '#FCA5A5' : colors.border }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: item.stock <= 0 ? '#DC2626' : colors.textSecondary }}>
                      {item.stock <= 0 ? '⚠️ Rupture' : `Stock : ${item.stock}`}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={{ gap: 8 }}>
                <TouchableOpacity style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryGhost, justifyContent: 'center', alignItems: 'center' }} onPress={() => openEdit(item)}>
                  <Ionicons name="create-outline" size={17} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' }} onPress={() => confirmDelete(item)}>
                  <Ionicons name="trash-outline" size={17} color="#DC2626" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="gift-outline" size={52} color={colors.border} />
            <Text style={s.emptyTitle}>Aucun sponsor</Text>
            <Text style={s.emptyText}>Ajoutez votre premier sponsor</Text>
          </View>
        }
      />

      <Modal visible={editModal} transparent animationType="slide">
        <View style={s.overlay}>
          <SponsorForm title="Modifier le sponsor" onSave={saveEdit} onCancel={() => setEditModal(false)} />
        </View>
      </Modal>
      <Modal visible={addModal} transparent animationType="slide">
        <View style={s.overlay}>
          <SponsorForm title="Nouveau sponsor" onSave={saveAdd} onCancel={() => { setAddModal(false); setFormError(null); }} />
        </View>
      </Modal>
      <Modal visible={!!deleteTarget} transparent animationType="fade">
        <View style={s.confirmOverlay}>
          <View style={s.confirmBox}>
            <Text style={s.confirmTitle}>Supprimer</Text>
            <Text style={s.confirmBody}>Supprimer "{deleteTarget?.title}" ?</Text>
            <View style={s.confirmActions}>
              <TouchableOpacity style={s.confirmCancelBtn} onPress={() => setDeleteTarget(null)}>
                <Text style={s.confirmCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmDeleteBtn} onPress={doDelete}>
                <Text style={s.confirmDeleteText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  formError: { color: '#DC2626', fontSize: 13, margin: 12 },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmBox: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 24, width: '100%', maxWidth: 320 },
  confirmTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 8 },
  confirmBody: { fontSize: 15, color: colors.textSecondary, marginBottom: 20 },
  confirmActions: { flexDirection: 'row', gap: 12 },
  confirmCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  confirmCancelText: { color: colors.text, fontWeight: '600' },
  confirmDeleteBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, backgroundColor: '#DC2626', alignItems: 'center' },
  confirmDeleteText: { color: '#fff', fontWeight: '700' },

  header: {
    backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    ...shadow.sm,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: radius.xs,
    backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  headerSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  activeBadgeHeader: {
    backgroundColor: '#DCFCE7', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: '#15803D30',
  },
  activeBadgeHeaderText: { fontSize: 12, fontWeight: '700', color: '#15803D' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.primary, borderRadius: radius.sm,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  listLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '500', marginBottom: 4 },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border,
    ...shadow.xs,
  },
  cardInactive: { opacity: 0.55 },
  cardEmoji: {
    width: 52, height: 52, borderRadius: radius.sm,
    backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardSponsor: { fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.6 },
  activeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
  },
  activeDot: { width: 5, height: 5, borderRadius: 3 },
  activeText: { fontSize: 10, fontWeight: '600' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardCoins: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  cardDot: { color: colors.border },
  cardStock: { fontSize: 12, color: colors.textMuted },
  cardActions: { gap: 8 },
  editBtn: {
    width: 34, height: 34, borderRadius: radius.xs,
    backgroundColor: colors.primaryGhost, justifyContent: 'center', alignItems: 'center',
  },
  deleteBtn: {
    width: 34, height: 34, borderRadius: radius.xs,
    backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center',
  },

  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
  emptyText: { fontSize: 13, color: colors.textMuted },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20,
  },
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
    backgroundColor: colors.background, borderRadius: radius.sm,
    padding: 12, borderWidth: 1, borderColor: colors.border,
  },
  numLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginBottom: 4 },
  numInput: { fontSize: 18, fontWeight: '700', color: colors.text },

  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.background, borderRadius: radius.sm,
    padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: colors.border,
  },
  switchLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  switchSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, padding: 14, alignItems: 'center',
  },
  cancelText: { color: colors.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: radius.sm, padding: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
});
