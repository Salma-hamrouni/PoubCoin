import React, { useState, useMemo } from 'react';
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  Switch, Modal, Pressable, TextInput, Share, ActivityIndicator, FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { useTheme } from '../../context/ThemeContext';
import { useAdmin } from '../../context/AdminContext';
import { radius, shadow } from '../../theme';
import { MUNICIPALITIES } from '../../data/municipalities';

interface Municipality {
  id: string;
  name: string;
  region: string;
  citizens: number;
  reports: number;
  validationRate: number;
  coins: number;
  active: boolean;
  adminEmail: string;
  color: string;
}

const COLORS = ['#2563EB', '#16A34A', '#7C3AED', '#D97706', '#0891B2', '#DC2626', '#059669', '#EA580C', '#0D9488', '#7C2D12'];

const ALL_MUNICIPALITIES: Omit<Municipality, 'citizens'|'reports'|'validationRate'|'coins'|'active'|'adminEmail'>[] = MUNICIPALITIES.map((m, i) => ({
  id: m.id,
  name: m.name,
  region: m.governorate,
  color: COLORS[i % COLORS.length],
}));

export default function AdminMunicipalitiesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { users, reports } = useAdmin();

  // Local overrides for active toggle (not persisted to Firebase yet)
  const [activeOverrides, setActiveOverrides] = useState<Record<string, boolean>>({});
  // Extra municipalities added via the "Ajouter" modal
  const [extraMuns, setExtraMuns] = useState<Municipality[]>([]);

  const municipalities = useMemo<Municipality[]>(() => {
    const citizensByCity: Record<string, number> = {};
    const coinsByCity: Record<string, number> = {};
    const adminEmailByMunId: Record<string, string> = {};
    const hasAdminByMunId: Record<string, boolean> = {};

    users.forEach(u => {
      if (u.role === 'municipality_admin') {
        const mid = (u as any).municipalityId;
        if (mid) {
          hasAdminByMunId[mid] = true;
          adminEmailByMunId[mid] = u.email ?? '';
        }
      } else {
        const city = u.city?.trim();
        if (city) {
          citizensByCity[city] = (citizensByCity[city] ?? 0) + 1;
          coinsByCity[city] = (coinsByCity[city] ?? 0) + ((u as any).coins ?? 0);
        }
      }
    });

    const reportsByCity: Record<string, number> = {};
    const validatedByCity: Record<string, number> = {};
    reports.forEach(r => {
      const addr = (r as any).address?.toLowerCase() ?? '';
      ALL_MUNICIPALITIES.forEach(m => {
        if (addr.includes(m.name.toLowerCase())) {
          reportsByCity[m.name] = (reportsByCity[m.name] ?? 0) + 1;
          if ((r as any).status === 'validated') {
            validatedByCity[m.name] = (validatedByCity[m.name] ?? 0) + 1;
          }
        }
      });
    });

    const base = ALL_MUNICIPALITIES.map(m => {
      const total = reportsByCity[m.name] ?? 0;
      const validated = validatedByCity[m.name] ?? 0;
      return {
        ...m,
        citizens:       citizensByCity[m.name]  ?? 0,
        reports:        total,
        validationRate: total > 0 ? Math.round((validated / total) * 100) : 0,
        coins:          coinsByCity[m.name]      ?? 0,
        active:         activeOverrides[m.id]   ?? hasAdminByMunId[m.id] ?? false,
        adminEmail:     adminEmailByMunId[m.id] ?? '',
      };
    });
    return [...base, ...extraMuns];
  }, [users, reports, activeOverrides, extraMuns]);
  const [search, setSearch] = useState('');
  const [filterGov, setFilterGov] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<Municipality | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRegion, setNewRegion] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [addError, setAddError] = useState('');

  // Create municipality admin account
  const [adminModal, setAdminModal] = useState(false);
  const [adminMunId, setAdminMunId] = useState('mnihla');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminSuccess, setAdminSuccess] = useState('');

  const toggleActive = (id: string, value: boolean) => {
    setActiveOverrides(prev => ({ ...prev, [id]: value }));
  };

  const openDetail = (city: Municipality) => {
    setSelectedCity(city);
    setModalVisible(true);
  };

  const governorates = useMemo(() => Array.from(new Set(ALL_MUNICIPALITIES.map(m => m.region))).sort(), []);

  const displayed = useMemo(() => {
    let list = municipalities;
    if (filterGov) list = list.filter(m => m.region === filterGov);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m => m.name.toLowerCase().includes(q) || m.region.toLowerCase().includes(q));
    }
    return list;
  }, [municipalities, filterGov, search]);

  const handleCreateAdmin = async () => {
    setAdminError(''); setAdminSuccess('');
    if (!adminName.trim()) { setAdminError('Le nom est obligatoire.'); return; }
    if (!adminEmail.trim() || !adminEmail.includes('@')) { setAdminError('Email invalide.'); return; }
    if (adminPassword.length < 6) { setAdminError('Mot de passe : 6 caractères minimum.'); return; }
    const mun = MUNICIPALITIES.find(m => m.id === adminMunId);
    if (!mun) { setAdminError('Municipalité introuvable.'); return; }
    setAdminLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, adminEmail.trim(), adminPassword);
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: adminName.trim(),
        email: adminEmail.trim(),
        role: 'municipality_admin',
        municipalityId: mun.id,
        municipalityName: mun.name,
        avatar: '🏛️',
        city: mun.name,
        phone: '',
        joinedAt: new Date().toISOString().split('T')[0],
      });
      setAdminSuccess(`✅ Compte créé pour ${mun.name} (${adminEmail.trim()})`);
      setAdminEmail(''); setAdminPassword(''); setAdminName('');
    } catch (e: any) {
      const code = e?.code ?? '';
      setAdminError(
        code === 'auth/email-already-in-use' ? 'Cet email est déjà utilisé.'
        : code === 'auth/invalid-email'       ? 'Email invalide.'
        : code === 'auth/weak-password'       ? 'Mot de passe trop faible.'
        : `Erreur : ${e.message}`
      );
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAdd = () => {
    if (!newName.trim()) { setAddError('Le nom est obligatoire.'); return; }
    if (!newRegion.trim()) { setAddError('La région est obligatoire.'); return; }
    if (!newEmail.trim() || !newEmail.includes('@')) { setAddError('Email admin invalide.'); return; }
    const newCity: Municipality = {
      id: Date.now().toString(),
      name: newName.trim(),
      region: newRegion.trim(),
      adminEmail: newEmail.trim(),
      citizens: 0,
      reports: 0,
      validationRate: 0,
      coins: 0,
      active: true,
      color: COLORS[extraMuns.length % COLORS.length],
    };
    setExtraMuns(prev => [...prev, newCity]);
    setNewName(''); setNewRegion(''); setNewEmail(''); setAddError('');
    setAddModal(false);
  };

  const totalCitizens = municipalities.reduce((s, m) => s + m.citizens, 0);
  const totalReports  = municipalities.reduce((s, m) => s + m.reports, 0);
  const activeCount   = municipalities.filter(m => m.active).length;

  const SummaryChip = ({ label, value, color }: { label: string; value: string | number; color: string }) => (
    <View style={{
      flex: 1, backgroundColor: colors.surface, borderRadius: radius.sm, padding: 10,
      alignItems: 'center', borderWidth: 1, borderColor: colors.border, ...shadow.xs,
    }}>
      <Text style={{ fontSize: 16, fontWeight: '800', color }}>{value}</Text>
      <Text style={{ fontSize: 9, color: colors.textMuted, fontWeight: '600', textAlign: 'center', marginTop: 2 }}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <LinearGradient
        colors={['#1E3A5F', '#2563EB']}
        style={{ paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        <TouchableOpacity
          style={{
            width: 36, height: 36, borderRadius: radius.xs,
            backgroundColor: 'rgba(255,255,255,0.15)',
            justifyContent: 'center', alignItems: 'center',
          }}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 22 }}>🏙️</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 1 }}>ADMINISTRATION</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>Multi-Municipalités</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => { setAdminError(''); setAdminSuccess(''); setAdminModal(true); }}
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', flexDirection: 'row', alignItems: 'center', gap: 5 }}
          >
            <Text style={{ fontSize: 14 }}>🔑</Text>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff' }}>Admin</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('AdminMunicipalityInbox')}
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', flexDirection: 'row', alignItems: 'center', gap: 5 }}
          >
            <Text style={{ fontSize: 14 }}>📬</Text>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff' }}>Inbox</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Search + filter bar */}
      <View style={{ backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {/* Stats row */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 10, gap: 10 }}>
          {[
            { label: 'Municipalités', value: municipalities.length, color: '#2563EB', icon: 'business-outline' },
            { label: 'Actives',       value: activeCount,           color: '#16A34A', icon: 'checkmark-circle-outline' },
            { label: 'Résultats',     value: displayed.length,      color: '#7C3AED', icon: 'search-outline' },
          ].map(s => (
            <View key={s.label} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: s.color + '10', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: s.color + '30' }}>
              <Ionicons name={s.icon as any} size={14} color={s.color} />
              <View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: s.color, lineHeight: 17 }}>{s.value}</Text>
                <Text style={{ fontSize: 9, color: colors.textMuted, fontWeight: '600' }}>{s.label}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Search input */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, marginHorizontal: 16, marginTop: 10 }}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher une municipalité…"
            placeholderTextColor={colors.textMuted}
            style={{ flex: 1, paddingVertical: 9, paddingHorizontal: 8, fontSize: 14, color: colors.text }}
          />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={colors.textMuted} /></TouchableOpacity> : null}
        </View>

        {/* Governorate filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 6 }}>
          {[{ id: null, name: 'Tous' }, ...governorates.map(g => ({ id: g, name: g }))].map(item => {
            const active = filterGov === item.id;
            return (
              <TouchableOpacity
                key={item.id ?? '__all__'}
                onPress={() => setFilterGov(item.id)}
                style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: active ? '#2563EB' : colors.background, borderWidth: 1.5, borderColor: active ? '#2563EB' : colors.border }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : colors.textSecondary }}>{item.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={displayed}
        keyExtractor={city => city.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', padding: 48 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Aucun résultat</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>Essayez un autre terme de recherche</Text>
          </View>
        }
        renderItem={({ item: city }) => (
          <TouchableOpacity
            onPress={() => openDetail(city)}
            activeOpacity={0.85}
            style={{
              backgroundColor: colors.surface, borderRadius: 14,
              marginBottom: 8, overflow: 'hidden',
              borderWidth: 1, borderColor: colors.border, ...shadow.sm,
              flexDirection: 'row',
            }}
          >
            {/* Color accent */}
            <View style={{ width: 4, backgroundColor: city.color, borderTopLeftRadius: 14, borderBottomLeftRadius: 14 }} />

            <View style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 12 }}>
              {/* Name + toggle */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: city.color + '18', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                  <Text style={{ fontSize: 16 }}>🏛️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{city.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <View style={{ backgroundColor: city.color + '20', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: city.color }}>{city.region}</Text>
                    </View>
                    <View style={{ backgroundColor: city.active ? '#DCFCE7' : '#FEE2E2', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: city.active ? '#16A34A' : '#DC2626' }}>
                        {city.active ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                </View>
                <Switch
                  value={city.active}
                  onValueChange={val => toggleActive(city.id, val)}
                  trackColor={{ false: colors.border, true: city.color + '80' }}
                  thumbColor={city.active ? city.color : '#ccc'}
                />
              </View>

              {/* Stats + action */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                  <Ionicons name="people-outline" size={13} color={colors.textMuted} />
                  <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>
                    {city.citizens > 0 ? city.citizens.toLocaleString('fr-FR') + ' citoyens' : 'Aucun citoyen'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                  <Ionicons name="document-text-outline" size={13} color={colors.textMuted} />
                  <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>
                    {city.reports > 0 ? city.reports.toLocaleString('fr-FR') + ' signalements' : 'Aucun signalement'}
                  </Text>
                </View>
                {city.adminEmail ? (
                  <Ionicons name="mail-outline" size={13} color={colors.textMuted} />
                ) : null}
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* FAB */}
      <TouchableOpacity
        style={{
          position: 'absolute', bottom: 24, alignSelf: 'center',
          backgroundColor: '#2563EB', borderRadius: radius.pill,
          paddingHorizontal: 20, paddingVertical: 14,
          flexDirection: 'row', alignItems: 'center', gap: 8, ...shadow.lg,
        }}
        onPress={() => { setAddError(''); setAddModal(true); }}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Ajouter une municipalité</Text>
      </TouchableOpacity>

      {/* Add Municipality Modal */}
      <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setAddModal(false)}>
          <Pressable onPress={() => {}}>
            <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 24, gap: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: colors.text }}>🏙️ Nouvelle municipalité</Text>
                <TouchableOpacity onPress={() => setAddModal(false)}>
                  <Ionicons name="close-circle" size={26} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {addError ? (
                <View style={{ backgroundColor: '#FEE2E2', borderRadius: radius.sm, padding: 10, borderWidth: 1, borderColor: '#FECACA' }}>
                  <Text style={{ color: '#DC2626', fontSize: 13, fontWeight: '600' }}>{addError}</Text>
                </View>
              ) : null}

              {[
                { label: 'Nom de la ville *', value: newName, onChange: setNewName, placeholder: 'ex: Nabeul' },
                { label: 'Région *', value: newRegion, onChange: setNewRegion, placeholder: 'ex: Cap Bon' },
                { label: 'Email admin *', value: newEmail, onChange: setNewEmail, placeholder: 'admin@ville.tn' },
              ].map(field => (
                <View key={field.label}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{field.label}</Text>
                  <TextInput
                    value={field.value}
                    onChangeText={field.onChange}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    keyboardType={field.label.includes('Email') ? 'email-address' : 'default'}
                    style={{
                      backgroundColor: colors.background, borderRadius: radius.sm,
                      borderWidth: 1, borderColor: colors.border,
                      paddingHorizontal: 14, paddingVertical: 11,
                      fontSize: 14, color: colors.text,
                    }}
                  />
                </View>
              ))}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <TouchableOpacity
                  style={{ flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center' }}
                  onPress={() => setAddModal(false)}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textMuted }}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 2, backgroundColor: '#2563EB', borderRadius: radius.md, paddingVertical: 13, alignItems: 'center' }}
                  onPress={handleAdd}
                >
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>✓ Ajouter</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Create Municipality Admin Modal */}
      <Modal visible={adminModal} transparent animationType="slide" onRequestClose={() => setAdminModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }} onPress={() => setAdminModal(false)}>
          <Pressable onPress={() => {}}>
            <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 24, gap: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: colors.text }}>🔑 Créer compte admin municipalité</Text>
                <TouchableOpacity onPress={() => setAdminModal(false)}>
                  <Ionicons name="close-circle" size={26} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {adminError ? (
                <View style={{ backgroundColor: '#FEE2E2', borderRadius: radius.sm, padding: 10, borderWidth: 1, borderColor: '#FECACA' }}>
                  <Text style={{ color: '#DC2626', fontSize: 13, fontWeight: '600' }}>{adminError}</Text>
                </View>
              ) : null}
              {adminSuccess ? (
                <View style={{ backgroundColor: '#DCFCE7', borderRadius: radius.sm, padding: 10, borderWidth: 1, borderColor: '#6EE7B7' }}>
                  <Text style={{ color: '#16A34A', fontSize: 13, fontWeight: '700' }}>{adminSuccess}</Text>
                </View>
              ) : null}

              {/* Municipality picker */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Municipalité *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                  {MUNICIPALITIES.map(m => (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => setAdminMunId(m.id)}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 7, marginRight: 8, borderRadius: radius.pill,
                        backgroundColor: adminMunId === m.id ? '#2563EB' : colors.background,
                        borderWidth: 1.5, borderColor: adminMunId === m.id ? '#2563EB' : colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: adminMunId === m.id ? '#fff' : colors.text }}>{m.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {[
                { label: 'Nom complet *', value: adminName, onChange: setAdminName, placeholder: 'ex: Mohamed Ben Ali', kb: 'default' as const },
                { label: 'Email *', value: adminEmail, onChange: setAdminEmail, placeholder: `admin.${adminMunId}@poubcoin.tn`, kb: 'email-address' as const },
                { label: 'Mot de passe *', value: adminPassword, onChange: setAdminPassword, placeholder: '6+ caractères', kb: 'default' as const, secure: true },
              ].map(field => (
                <View key={field.label}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{field.label}</Text>
                  <TextInput
                    value={field.value}
                    onChangeText={field.onChange}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    keyboardType={field.kb}
                    secureTextEntry={field.secure}
                    style={{
                      backgroundColor: colors.background, borderRadius: radius.sm,
                      borderWidth: 1, borderColor: colors.border,
                      paddingHorizontal: 14, paddingVertical: 11,
                      fontSize: 14, color: colors.text,
                    }}
                  />
                </View>
              ))}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <TouchableOpacity
                  style={{ flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center' }}
                  onPress={() => setAdminModal(false)}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textMuted }}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 2, backgroundColor: '#2563EB', borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                  onPress={handleCreateAdmin}
                  disabled={adminLoading}
                >
                  {adminLoading ? <ActivityIndicator color="#fff" size="small" /> : null}
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>{adminLoading ? 'Création...' : '✓ Créer le compte'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          onPress={() => setModalVisible(false)}
        >
          <Pressable onPress={() => {}}>
            {selectedCity && (
              <View style={{
                backgroundColor: colors.surface, borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl, overflow: 'hidden',
              }}>
                {/* Modal header */}
                <LinearGradient
                  colors={[selectedCity.color, selectedCity.color + 'CC']}
                  style={{ padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 22 }}>🏙️</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>{selectedCity.name}</Text>
                    <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{selectedCity.region}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.8)" />
                  </TouchableOpacity>
                </LinearGradient>

                <View style={{ padding: 20 }}>
                  {/* Stats grid */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                    {[
                      { label: 'Citoyens',          value: selectedCity.citizens.toLocaleString('fr-FR'),       icon: '👥' },
                      { label: 'Signalements',       value: selectedCity.reports.toLocaleString('fr-FR'),         icon: '📋' },
                      { label: 'Taux validation',    value: `${selectedCity.validationRate}%`,                    icon: '✅' },
                      { label: 'Coins distribués',   value: selectedCity.coins.toLocaleString('fr-FR'),           icon: '🪙' },
                    ].map(stat => (
                      <View key={stat.label} style={{
                        width: '47%', backgroundColor: colors.surfaceAlt, borderRadius: radius.sm,
                        padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border,
                      }}>
                        <Text style={{ fontSize: 24, marginBottom: 4 }}>{stat.icon}</Text>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: selectedCity.color }}>{stat.value}</Text>
                        <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '600', textAlign: 'center' }}>{stat.label}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Admin email */}
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 8,
                    backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, padding: 12,
                    marginBottom: 16, borderWidth: 1, borderColor: colors.border,
                  }}>
                    <Ionicons name="mail" size={16} color={colors.textMuted} />
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>{selectedCity.adminEmail}</Text>
                  </View>

                  {/* Action buttons */}
                  <TouchableOpacity
                    style={{
                      backgroundColor: selectedCity.color, borderRadius: radius.sm,
                      paddingVertical: 13, alignItems: 'center', marginBottom: 10, ...shadow.sm,
                    }}
                    onPress={() => {
                      setModalVisible(false);
                      navigation.navigate('Dashboard', { filterCity: selectedCity!.name, filterCityColor: selectedCity!.color });
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
                      Accéder au tableau de bord
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.surfaceAlt, borderRadius: radius.sm,
                      paddingVertical: 13, alignItems: 'center',
                      borderWidth: 1, borderColor: colors.border,
                    }}
                    onPress={async () => {
                      setModalVisible(false);
                      const date = new Date().toLocaleDateString('fr-FR');
                      const msg =
                        `📊 RAPPORT MUNICIPALITÉ — ${selectedCity.name}\n` +
                        `📅 ${date}\n\n` +
                        `👥 Citoyens enregistrés : ${selectedCity.citizens.toLocaleString('fr-FR')}\n` +
                        `📋 Signalements total : ${selectedCity.reports.toLocaleString('fr-FR')}\n` +
                        `✅ Taux de validation : ${selectedCity.validationRate}%\n` +
                        `🪙 Coins distribués : ${selectedCity.coins.toLocaleString('fr-FR')}\n` +
                        `🔴 Statut : ${selectedCity.active ? 'Actif' : 'Inactif'}\n\n` +
                        `Destinataire : ${selectedCity.adminEmail}\n` +
                        `Généré par PoubCoin Admin`;
                      try {
                        await Share.share({ message: msg, title: `Rapport ${selectedCity.name}` });
                      } catch {}
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                      Envoyer rapport
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
