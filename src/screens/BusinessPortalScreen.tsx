import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, Alert, Animated,
  Platform, StatusBar, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  collection, onSnapshot, addDoc, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { radius, shadow } from '../theme';
import { useToast } from '../context/ToastContext';
import { hapticLight, hapticSuccess } from '../utils/haptics';

interface Business {
  id: string;
  name: string;
  category: string;
  discount: string;
  description: string;
  address: string;
  emoji: string;
  approved: boolean;
  createdAt: any;
  ownerEmail?: string;
}

const CATEGORIES = [
  { key: 'alimentation',  label: 'Alimentation',   emoji: '🥗' },
  { key: 'mode',          label: 'Mode & textile',  emoji: '👕' },
  { key: 'beaute',        label: 'Beauté & santé',  emoji: '🌿' },
  { key: 'restauration',  label: 'Restauration',    emoji: '🍽️' },
  { key: 'artisanat',     label: 'Artisanat',       emoji: '🎨' },
  { key: 'services',      label: 'Services',        emoji: '🔧' },
  { key: 'autre',         label: 'Autre',           emoji: '🏪' },
];

const CAT_COLORS: Record<string, [string, string]> = {
  alimentation: ['#16A34A', '#4ADE80'],
  mode:         ['#7C3AED', '#A78BFA'],
  beaute:       ['#DB2777', '#F472B6'],
  restauration: ['#EA580C', '#FB923C'],
  artisanat:    ['#D97706', '#FCD34D'],
  services:     ['#0369A1', '#38BDF8'],
  autre:        ['#475569', '#94A3B8'],
};

function FadeIn({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 340, delay, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(translateY, { toValue: 0, tension: 80, friction: 10, delay, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

export default function BusinessPortalScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [businesses, setBusinesses]   = useState<Business[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [showModal, setShowModal]     = useState(false);
  const [submitting, setSubmitting]   = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: '', category: 'alimentation', discount: '',
    description: '', address: '', email: '',
  });

  useEffect(() => {
    const q = query(collection(db, 'businesses'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setBusinesses(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Business))
          .filter(b => b.approved)
      );
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  const filtered = selectedCat === 'all'
    ? businesses
    : businesses.filter(b => b.category === selectedCat);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.discount.trim() || !form.address.trim()) {
      Alert.alert('Champs manquants', 'Nom, réduction et adresse sont requis.');
      return;
    }
    setSubmitting(true);
    try {
      const cat = CATEGORIES.find(c => c.key === form.category);
      await addDoc(collection(db, 'businesses'), {
        name:        form.name.trim(),
        category:    form.category,
        discount:    form.discount.trim(),
        description: form.description.trim(),
        address:     form.address.trim(),
        emoji:       cat?.emoji ?? '🏪',
        approved:    false,
        ownerEmail:  form.email.trim() || user?.email || '',
        submittedBy: user?.id || '',
        createdAt:   serverTimestamp(),
      });
      hapticSuccess();
      showToast('✅ Demande envoyée ! Nous la traiterons sous 48h.', 'success');
      setShowModal(false);
      setForm({ name: '', category: 'alimentation', discount: '', description: '', address: '', email: '' });
    } catch {
      Alert.alert('Erreur', 'Impossible d\'envoyer la demande. Réessayez.');
    }
    setSubmitting(false);
  };

  const s = getStyles(colors, isDark);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <LinearGradient colors={[colors.primary, colors.primaryLight]} style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Commerces partenaires</Text>
          <Text style={s.headerSub}>{businesses.length} commerce{businesses.length !== 1 ? 's' : ''} éco-responsable{businesses.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={s.joinBtn} onPress={() => { hapticLight(); setShowModal(true); }}>
          <Ionicons name="add" size={18} color={colors.primary} />
          <Text style={s.joinBtnText}>Rejoindre</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={s.filterContent}>
        <TouchableOpacity
          style={[s.filterChip, selectedCat === 'all' && s.filterChipActive]}
          onPress={() => { hapticLight(); setSelectedCat('all'); }}
        >
          <Text style={[s.filterChipText, selectedCat === 'all' && s.filterChipTextActive]}>Tous</Text>
        </TouchableOpacity>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.key}
            style={[s.filterChip, selectedCat === cat.key && s.filterChipActive]}
            onPress={() => { hapticLight(); setSelectedCat(cat.key); }}
          >
            <Text style={[s.filterChipText, selectedCat === cat.key && s.filterChipTextActive]}>
              {cat.emoji} {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🏪</Text>
          <Text style={[s.emptyTitle, { color: colors.text }]}>
            {businesses.length === 0 ? 'Aucun commerce partenaire' : 'Aucun résultat'}
          </Text>
          <Text style={[s.emptySub, { color: colors.textMuted }]}>
            {businesses.length === 0
              ? 'Sois le premier à rejoindre le réseau éco-responsable !'
              : 'Essaie une autre catégorie'}
          </Text>
          {businesses.length === 0 && (
            <TouchableOpacity style={[s.emptyBtn, { backgroundColor: colors.primary }]} onPress={() => setShowModal(true)}>
              <Text style={s.emptyBtnText}>Rejoindre le réseau</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView style={s.list} contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
          {filtered.map((biz, i) => {
            const [c1, c2] = CAT_COLORS[biz.category] ?? ['#475569', '#94A3B8'];
            return (
              <FadeIn key={biz.id} delay={i * 60}>
                <View style={[s.card, { backgroundColor: colors.card }]}>
                  <View style={s.cardLeft}>
                    <LinearGradient colors={[c1, c2]} style={s.cardEmoji}>
                      <Text style={{ fontSize: 24 }}>{biz.emoji}</Text>
                    </LinearGradient>
                  </View>
                  <View style={s.cardBody}>
                    <View style={s.cardTop}>
                      <Text style={[s.bizName, { color: colors.text }]} numberOfLines={1}>{biz.name}</Text>
                      <View style={[s.discountBadge, { backgroundColor: colors.primaryGhost }]}>
                        <Ionicons name="pricetag" size={11} color={colors.primary} />
                        <Text style={[s.discountText, { color: colors.primary }]}>{biz.discount}</Text>
                      </View>
                    </View>
                    <View style={s.catRow}>
                      <View style={[s.catChip, { backgroundColor: c1 + '18', borderColor: c1 + '33' }]}>
                        <Text style={[s.catChipText, { color: c1 }]}>
                          {CATEGORIES.find(c => c.key === biz.category)?.label ?? biz.category}
                        </Text>
                      </View>
                    </View>
                    {!!biz.description && (
                      <Text style={[s.bizDesc, { color: colors.textMuted }]} numberOfLines={2}>{biz.description}</Text>
                    )}
                    <View style={s.addressRow}>
                      <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                      <Text style={[s.addressText, { color: colors.textMuted }]} numberOfLines={1}>{biz.address}</Text>
                    </View>
                  </View>
                </View>
              </FadeIn>
            );
          })}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      {/* CTA banner */}
      {!loading && (
        <View style={[s.ctaBanner, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.ctaTitle, { color: colors.text }]}>Ton commerce est éco-responsable ?</Text>
            <Text style={[s.ctaSub, { color: colors.textMuted }]}>Rejoins le réseau et offre des réductions aux utilisateurs.</Text>
          </View>
          <TouchableOpacity style={[s.ctaBtn, { backgroundColor: colors.primary }]} onPress={() => { hapticLight(); setShowModal(true); }}>
            <Text style={s.ctaBtnText}>Rejoindre</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Join modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <SafeAreaView style={[s.modal, { backgroundColor: colors.background }]}>
            {/* Modal header */}
            <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowModal(false)} style={s.modalClose}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
              <Text style={[s.modalTitle, { color: colors.text }]}>Rejoindre le réseau</Text>
              <View style={{ width: 36 }} />
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={s.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[s.modalSub, { color: colors.textMuted }]}>
                Remplis ce formulaire. Ton commerce sera visible après validation sous 48h.
              </Text>

              <Field label="Nom du commerce *" color={colors}>
                <TextInput
                  style={[s.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                  value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))}
                  placeholder="Ex : Épicerie Bio Salam" placeholderTextColor={colors.textMuted}
                />
              </Field>

              <Field label="Catégorie" color={colors}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {CATEGORIES.map(cat => (
                      <TouchableOpacity
                        key={cat.key}
                        style={[s.catSelect, form.category === cat.key && { backgroundColor: colors.primaryGhost, borderColor: colors.primary }]}
                        onPress={() => setForm(f => ({ ...f, category: cat.key }))}
                      >
                        <Text style={{ fontSize: 16 }}>{cat.emoji}</Text>
                        <Text style={[s.catSelectText, { color: form.category === cat.key ? colors.primary : colors.textSecondary }]}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </Field>

              <Field label="Réduction offerte *" color={colors}>
                <TextInput
                  style={[s.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                  value={form.discount} onChangeText={v => setForm(f => ({ ...f, discount: v }))}
                  placeholder="Ex : -10% sur présentation de l'app" placeholderTextColor={colors.textMuted}
                />
              </Field>

              <Field label="Description" color={colors}>
                <TextInput
                  style={[s.input, s.textarea, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                  value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))}
                  placeholder="Décris ton commerce et tes engagements éco…" placeholderTextColor={colors.textMuted}
                  multiline numberOfLines={3}
                />
              </Field>

              <Field label="Adresse *" color={colors}>
                <TextInput
                  style={[s.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                  value={form.address} onChangeText={v => setForm(f => ({ ...f, address: v }))}
                  placeholder="Rue, ville" placeholderTextColor={colors.textMuted}
                />
              </Field>

              <Field label="Email de contact" color={colors}>
                <TextInput
                  style={[s.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                  value={form.email} onChangeText={v => setForm(f => ({ ...f, email: v }))}
                  placeholder="contact@moncommerce.tn" placeholderTextColor={colors.textMuted}
                  keyboardType="email-address" autoCapitalize="none"
                />
              </Field>

              <View style={[s.infoBox, { backgroundColor: colors.primaryGhost, borderColor: colors.primary + '33' }]}>
                <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                <Text style={[s.infoText, { color: colors.primary }]}>
                  Ta demande sera examinée par notre équipe. Tu recevras une réponse sous 48h.
                </Text>
              </View>

              <TouchableOpacity
                style={[s.submitBtn, { backgroundColor: submitting ? colors.textMuted : colors.primary }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.submitBtnText}>Envoyer la demande</Text>
                }
              </TouchableOpacity>

              <View style={{ height: 32 }} />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, children, color }: { label: string; children: React.ReactNode; color: any }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: color.textSecondary, marginBottom: 6 }}>{label}</Text>
      {children}
    </View>
  );
}

function getStyles(colors: any, isDark: boolean) {
  return {
    safe: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 32 },

    // Header
    header: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center' as const, justifyContent: 'center' as const },
    headerCenter: { flex: 1 },
    headerTitle: { fontSize: 18, fontWeight: '800' as const, color: '#fff', letterSpacing: -0.3 },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
    joinBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
    joinBtnText: { fontSize: 13, fontWeight: '700' as const, color: colors.primary },

    // Filter
    filterRow: { maxHeight: 52 },
    filterContent: { paddingHorizontal: 14, paddingVertical: 10, gap: 8, flexDirection: 'row' as const },
    filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    filterChipActive: { backgroundColor: colors.primaryGhost, borderColor: colors.primary },
    filterChipText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' as const },
    filterChipTextActive: { color: colors.primary, fontWeight: '700' as const },

    // List
    list: { flex: 1 },

    // Card
    card: {
      borderRadius: radius.lg, ...shadow.sm,
      flexDirection: 'row' as const, overflow: 'hidden' as const,
      borderWidth: 1, borderColor: colors.border,
    },
    cardLeft: { padding: 14, justifyContent: 'flex-start' as const },
    cardEmoji: { width: 52, height: 52, borderRadius: 14, alignItems: 'center' as const, justifyContent: 'center' as const },
    cardBody: { flex: 1, padding: 12, paddingLeft: 4 },
    cardTop: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 4 },
    bizName: { flex: 1, fontSize: 15, fontWeight: '700' as const, letterSpacing: -0.2 },
    discountBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
    discountText: { fontSize: 11, fontWeight: '700' as const },
    catRow: { flexDirection: 'row' as const, marginBottom: 4 },
    catChip: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
    catChipText: { fontSize: 11, fontWeight: '600' as const },
    bizDesc: { fontSize: 12.5, lineHeight: 17, marginBottom: 6 },
    addressRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 3 },
    addressText: { fontSize: 11.5, flex: 1 },

    // Empty
    emptyTitle: { fontSize: 16, fontWeight: '700' as const, textAlign: 'center' as const, marginBottom: 6 },
    emptySub: { fontSize: 13.5, textAlign: 'center' as const, lineHeight: 19, marginBottom: 20 },
    emptyBtn: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
    emptyBtnText: { color: '#fff', fontWeight: '700' as const, fontSize: 14 },

    // CTA banner
    ctaBanner: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, padding: 14, borderTopWidth: 1 },
    ctaTitle: { fontSize: 13.5, fontWeight: '700' as const },
    ctaSub: { fontSize: 12, marginTop: 2 },
    ctaBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
    ctaBtnText: { color: '#fff', fontWeight: '700' as const, fontSize: 13 },

    // Modal
    modal: { flex: 1 },
    modalHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, padding: 16, borderBottomWidth: 1 },
    modalClose: { width: 36, height: 36, alignItems: 'center' as const, justifyContent: 'center' as const },
    modalTitle: { fontSize: 17, fontWeight: '800' as const, letterSpacing: -0.3 },
    modalBody: { padding: 20 },
    modalSub: { fontSize: 13.5, lineHeight: 19, marginBottom: 20 },

    // Form
    input: { borderWidth: 1.5, borderRadius: 10, padding: 12, fontSize: 14 },
    textarea: { height: 90, textAlignVertical: 'top' as const },
    catSelect: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: colors.card },
    catSelectText: { fontSize: 12.5, fontWeight: '600' as const },
    infoBox: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 8, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 20 },
    infoText: { flex: 1, fontSize: 12.5, lineHeight: 17 },
    submitBtn: { borderRadius: 14, padding: 15, alignItems: 'center' as const },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' as const },
  };
}
