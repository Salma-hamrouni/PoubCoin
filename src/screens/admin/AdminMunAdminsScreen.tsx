import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, SafeAreaView, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  collection, getDocs, query, where, doc, deleteDoc,
  setDoc, updateDoc,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updatePassword,
  initializeAuth,
  getAuth,
  signOut,
} from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { auth, db } from '../../firebase';
import { useTheme } from '../../context/ThemeContext';
import { useAdminPrefs } from '../../context/AdminPrefsContext';
import { MUNICIPALITIES } from '../../data/municipalities';
import { shadow } from '../../theme';

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDNIvKfX12bHvwBwxqTCzsk1qwkZULiuq0',
  authDomain: 'poubcoin-31c41.firebaseapp.com',
  projectId: 'poubcoin-31c41',
  storageBucket: 'poubcoin-31c41.firebasestorage.app',
  messagingSenderId: '931711830149',
  appId: '1:931711830149:web:492be00043a6144343c1ec',
};

// Secondary Firebase app — used to change another user's password without logging out the admin
function getSecondaryAuth() {
  const existing = getApps().find(a => a.name === 'secondary');
  if (existing) return getAuth(existing);
  return initializeAuth(initializeApp(FIREBASE_CONFIG, 'secondary'));
}

interface MunAdmin {
  id: string;
  name: string;
  email: string;
  municipalityId: string;
  municipalityName: string;
  joinedAt?: string;
  avatar?: string;
}

export default function AdminMunAdminsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { accentColor } = useAdminPrefs();
  const [admins, setAdmins] = useState<MunAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  // Create / Edit modal
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<MunAdmin | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedMunId, setSelectedMunId] = useState(MUNICIPALITIES[0]?.id ?? '');
  const [showMunPicker, setShowMunPicker] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Reset password modal
  const [resetTarget, setResetTarget] = useState<MunAdmin | null>(null);
  const [resetCurrentPwd, setResetCurrentPwd] = useState('');
  const [resetNewPwd, setResetNewPwd] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetSaving, setResetSaving] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<MunAdmin | null>(null);

  const selectedMun = MUNICIPALITIES.find(m => m.id === selectedMunId);

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'municipality_admin')));
      setAdmins(snap.docs.map(d => ({ id: d.id, ...d.data() } as MunAdmin)));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAdmins(); }, []);

  const filteredAdmins = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return admins;
    return admins.filter(a =>
      a.name?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      a.municipalityName?.toLowerCase().includes(q)
    );
  }, [admins, search]);

  const resetForm = () => {
    setName(''); setEmail(''); setPassword('');
    setSelectedMunId(MUNICIPALITIES[0]?.id ?? '');
    setFormError(''); setFormSuccess(''); setEditTarget(null);
  };

  const openCreate = () => { resetForm(); setShowForm(true); };
  const openEdit = (a: MunAdmin) => {
    setEditTarget(a);
    setName(a.name); setEmail(a.email); setPassword('');
    setSelectedMunId(a.municipalityId ?? MUNICIPALITIES[0]?.id ?? '');
    setFormError(''); setFormSuccess('');
    setShowForm(true);
  };

  const handleSave = async () => {
    setFormError(''); setFormSuccess('');
    if (!name.trim()) { setFormError('Le nom est obligatoire.'); return; }
    if (!email.trim() || !email.includes('@')) { setFormError('Email invalide.'); return; }
    if (!editTarget && password.length < 6) { setFormError('Mot de passe : 6 caractères minimum.'); return; }
    if (!selectedMun) { setFormError('Sélectionnez une municipalité.'); return; }
    setSaving(true);
    try {
      if (editTarget) {
        await updateDoc(doc(db, 'users', editTarget.id), {
          name: name.trim(),
          email: email.trim(),
          municipalityId: selectedMun.id,
          municipalityName: selectedMun.name,
          city: selectedMun.name,
        });
        setFormSuccess('Admin mis à jour avec succès.');
        await loadAdmins();
        setTimeout(() => { setShowForm(false); resetForm(); }, 1200);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await setDoc(doc(db, 'users', cred.user.uid), {
          name: name.trim(),
          email: email.trim(),
          role: 'municipality_admin',
          municipalityId: selectedMun.id,
          municipalityName: selectedMun.name,
          avatar: '🏛️',
          city: selectedMun.name,
          phone: '',
          joinedAt: new Date().toISOString().split('T')[0],
        });
        setFormSuccess(`Compte créé pour ${selectedMun.name}`);
        await loadAdmins();
        setTimeout(() => { setShowForm(false); resetForm(); }, 1200);
      }
    } catch (e: any) {
      const code = e?.code ?? '';
      setFormError(
        code === 'auth/email-already-in-use' ? 'Cet email est déjà utilisé.'
        : code === 'auth/invalid-email'       ? 'Email invalide.'
        : code === 'auth/weak-password'       ? 'Mot de passe trop faible.'
        : `Erreur : ${e.message}`
      );
    } finally { setSaving(false); }
  };

  const handleResetPassword = async () => {
    setResetError(''); setResetSuccess('');
    if (!resetTarget) return;
    if (resetCurrentPwd.length < 6) { setResetError('Mot de passe actuel trop court.'); return; }
    if (resetNewPwd.length < 6) { setResetError('Nouveau mot de passe : 6 caractères minimum.'); return; }
    setResetSaving(true);
    try {
      // Use secondary app to sign in as the municipality admin and change their password
      const auth2 = getSecondaryAuth();
      const cred = await signInWithEmailAndPassword(auth2, resetTarget.email, resetCurrentPwd);
      await updatePassword(cred.user, resetNewPwd);
      await signOut(auth2); // disconnect secondary session (does NOT affect main admin)
      setResetSuccess('Mot de passe modifié avec succès.');
      setTimeout(() => { setResetTarget(null); setResetCurrentPwd(''); setResetNewPwd(''); setResetSuccess(''); }, 1500);
    } catch (e: any) {
      const code = e?.code ?? '';
      setResetError(
        code === 'auth/wrong-password' || code === 'auth/invalid-credential'
          ? 'Mot de passe actuel incorrect.'
          : code === 'auth/too-many-requests'
          ? 'Trop de tentatives. Réessayez plus tard.'
          : `Erreur : ${e.message}`
      );
    } finally { setResetSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, 'users', deleteTarget.id));
      setDeleteTarget(null);
      await loadAdmins();
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Suppression impossible.');
    }
  };

  const avatarLabel = (a: MunAdmin) => a.avatar || a.name?.charAt(0).toUpperCase() || '🏛️';

  const renderAdmin = ({ item }: { item: MunAdmin }) => (
    <View style={{ backgroundColor: colors.surface, borderRadius: 16, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow.sm }}>
      {/* Accent bar */}
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: accentColor }} />
      <View style={{ padding: 14, paddingLeft: 17 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#C4B5FD' }}>
            <Text style={{ fontSize: 22 }}>{avatarLabel(item)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{item.name}</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>{item.email}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <View style={{ backgroundColor: '#EDE9FE', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#6D28D9' }}>🏙️ {item.municipalityName ?? item.municipalityId}</Text>
              </View>
              {item.joinedAt && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Ionicons name="calendar-outline" size={10} color={colors.textMuted} />
                  <Text style={{ fontSize: 10, color: colors.textMuted }}>{item.joinedAt}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }}>
          <TouchableOpacity onPress={() => openEdit(item)} style={actionBtn(colors.primary, '#EFF6FF', '#BFDBFE')}>
            <Ionicons name="pencil-outline" size={14} color={colors.primary} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>Modifier</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setResetTarget(item); setResetCurrentPwd(''); setResetNewPwd(''); setResetError(''); setResetSuccess(''); }} style={actionBtn('#B45309', '#FEF3C7', '#FDE68A')}>
            <Ionicons name="key-outline" size={14} color="#B45309" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#B45309' }}>Mot de passe</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setDeleteTarget(item)} style={{ width: 38, alignItems: 'center', justifyContent: 'center', padding: 9, borderRadius: 10, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' }}>
            <Ionicons name="trash-outline" size={14} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const withoutAdmin = Math.max(0, MUNICIPALITIES.length - admins.length);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <LinearGradient colors={[accentColor + 'EE', accentColor]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.55)', letterSpacing: 2 }}>GESTION</Text>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.3 }}>Admins Municipalités</Text>
          </View>
          <TouchableOpacity onPress={openCreate} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Créer</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* KPI stats */}
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 }}>
        {[
          { value: admins.length,      label: 'Admins actifs',  color: accentColor,  bg: accentColor + '15', icon: 'shield-checkmark-outline' as const },
          { value: MUNICIPALITIES.length, label: 'Municipalités', color: '#6D28D9', bg: '#EDE9FE',           icon: 'business-outline' as const },
          { value: withoutAdmin,       label: 'Sans admin',     color: withoutAdmin > 0 ? '#B45309' : '#15803D', bg: withoutAdmin > 0 ? '#FEF3C7' : '#DCFCE7', icon: 'alert-circle-outline' as const },
        ].map(s => (
          <View key={s.label} style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border, gap: 4 }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: s.bg, justifyContent: 'center', alignItems: 'center', marginBottom: 2 }}>
              <Ionicons name={s.icon} size={16} color={s.color} />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '900', color: s.color }}>{s.value}</Text>
            <Text style={{ fontSize: 10, color: colors.textMuted, textAlign: 'center', fontWeight: '600' }}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Search bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginVertical: 10, backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: colors.border }}>
        <Ionicons name="search-outline" size={16} color={colors.textMuted} />
        <TextInput
          style={{ flex: 1, fontSize: 14, color: colors.text }}
          placeholder="Rechercher un admin ou une municipalité…"
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

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={accentColor} size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredAdmins}
          keyExtractor={a => a.id}
          renderItem={renderAdmin}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="shield-checkmark-outline" size={32} color="#6D28D9" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                {search ? 'Aucun résultat' : 'Aucun admin municipalité'}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 40 }}>
                {search ? 'Essayez un autre terme de recherche.' : 'Créez le premier admin pour commencer.'}
              </Text>
              {!search && (
                <TouchableOpacity onPress={openCreate} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: accentColor, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 4 }}>
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Créer un admin</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* ── Create / Edit Modal ── */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' }}>
            <View style={{ width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 10 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: accentColor + '18', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                <Ionicons name={editTarget ? 'pencil' : 'person-add'} size={18} color={accentColor} />
              </View>
              <Text style={{ flex: 1, fontSize: 17, fontWeight: '800', color: colors.text }}>
                {editTarget ? 'Modifier l\'admin' : 'Nouvel admin municipalité'}
              </Text>
              <TouchableOpacity onPress={() => { setShowForm(false); resetForm(); }}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} showsVerticalScrollIndicator={false}>
              <View>
                <Text style={lbl}>NOM COMPLET *</Text>
                <TextInput style={inp(colors)} placeholder="Ex: Ahmed Ben Ali" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />
              </View>
              <View>
                <Text style={lbl}>EMAIL *</Text>
                <TextInput style={inp(colors)} placeholder="admin@municipalite.tn" placeholderTextColor={colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              </View>
              {!editTarget && (
                <View>
                  <Text style={lbl}>MOT DE PASSE * (min. 6 caractères)</Text>
                  <TextInput style={inp(colors)} placeholder="••••••••" placeholderTextColor={colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
                </View>
              )}
              <View>
                <Text style={lbl}>MUNICIPALITÉ *</Text>
                <TouchableOpacity style={[inp(colors), { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]} onPress={() => setShowMunPicker(!showMunPicker)}>
                  <Text style={{ fontSize: 15, color: colors.text }}>{selectedMun?.name ?? 'Sélectionner…'}</Text>
                  <Ionicons name={showMunPicker ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
                </TouchableOpacity>
                {showMunPicker && (
                  <View style={{ backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, maxHeight: 220, marginTop: 4 }}>
                    <ScrollView nestedScrollEnabled>
                      {MUNICIPALITIES.map(m => (
                        <TouchableOpacity key={m.id} style={{ padding: 13, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: m.id === selectedMunId ? accentColor + '12' : 'transparent' }}
                          onPress={() => { setSelectedMunId(m.id); setShowMunPicker(false); }}>
                          <Text style={{ fontSize: 14, color: m.id === selectedMunId ? accentColor : colors.text, fontWeight: m.id === selectedMunId ? '700' : '400' }}>
                            {m.name} <Text style={{ color: colors.textMuted, fontSize: 12 }}>· {m.governorate}</Text>
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {!!formError && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FECACA' }}>
                  <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
                  <Text style={{ color: '#DC2626', fontSize: 13, fontWeight: '600', flex: 1 }}>{formError}</Text>
                </View>
              )}
              {!!formSuccess && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#DCFCE7', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#86EFAC' }}>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#16A34A" />
                  <Text style={{ color: '#16A34A', fontSize: 13, fontWeight: '600', flex: 1 }}>{formSuccess}</Text>
                </View>
              )}

              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={{ backgroundColor: accentColor, borderRadius: 14, padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 8, opacity: saving ? 0.65 : 1 }}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{editTarget ? 'Enregistrer les modifications' : 'Créer le compte'}</Text>
                </>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Reset Password Modal ── */}
      <Modal visible={!!resetTarget} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
            <View style={{ width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 10 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                <Ionicons name="key" size={18} color="#B45309" />
              </View>
              <Text style={{ flex: 1, fontSize: 17, fontWeight: '800', color: colors.text }}>Changer le mot de passe</Text>
              <TouchableOpacity onPress={() => setResetTarget(null)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 16, gap: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.background, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.border }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 18 }}>{resetTarget ? avatarLabel(resetTarget) : '🏛️'}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{resetTarget?.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>{resetTarget?.email}</Text>
                </View>
              </View>
              <View>
                <Text style={lbl}>MOT DE PASSE ACTUEL *</Text>
                <TextInput style={inp(colors)} placeholder="Mot de passe actuel de l'admin" placeholderTextColor={colors.textMuted} value={resetCurrentPwd} onChangeText={setResetCurrentPwd} secureTextEntry />
              </View>
              <View>
                <Text style={lbl}>NOUVEAU MOT DE PASSE *</Text>
                <TextInput style={inp(colors)} placeholder="Min. 6 caractères" placeholderTextColor={colors.textMuted} value={resetNewPwd} onChangeText={setResetNewPwd} secureTextEntry />
              </View>

              {!!resetError && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FECACA' }}>
                  <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
                  <Text style={{ color: '#DC2626', fontSize: 13, fontWeight: '600', flex: 1 }}>{resetError}</Text>
                </View>
              )}
              {!!resetSuccess && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#DCFCE7', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#86EFAC' }}>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#16A34A" />
                  <Text style={{ color: '#16A34A', fontSize: 13, fontWeight: '600', flex: 1 }}>{resetSuccess}</Text>
                </View>
              )}

              <TouchableOpacity
                onPress={handleResetPassword}
                disabled={resetSaving}
                style={{ backgroundColor: '#B45309', borderRadius: 14, padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16, opacity: resetSaving ? 0.65 : 1 }}
              >
                {resetSaving ? <ActivityIndicator color="#fff" /> : <>
                  <Ionicons name="key" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Modifier le mot de passe</Text>
                </>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Delete Confirm ── */}
      <Modal visible={!!deleteTarget} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 24, width: '100%', gap: 14 }}>
            <View style={{ alignItems: 'center', gap: 10 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="trash-outline" size={26} color="#DC2626" />
              </View>
              <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, textAlign: 'center' }}>Supprimer cet admin ?</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.background, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.border, width: '100%' }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 18 }}>{deleteTarget ? avatarLabel(deleteTarget) : '🏛️'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{deleteTarget?.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>{deleteTarget?.municipalityName}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>
                Cette action est irréversible. Le compte Firebase sera conservé mais retiré de la liste.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setDeleteTarget(null)} style={{ flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
                <Text style={{ fontWeight: '700', color: colors.textSecondary }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDelete} style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#DC2626', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                <Ionicons name="trash-outline" size={16} color="#fff" />
                <Text style={{ fontWeight: '700', color: '#fff' }}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const lbl: any = { fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 };
const inp = (colors: any): any => ({ backgroundColor: colors.background, borderRadius: 12, padding: 14, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border });
const actionBtn = (color: string, bg: string, border: string): any => ({
  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
  padding: 9, borderRadius: 10, backgroundColor: bg, borderWidth: 1, borderColor: border,
});
