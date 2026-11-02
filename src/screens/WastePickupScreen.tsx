import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Animated, Platform,
  StatusBar, KeyboardAvoidingView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { radius, shadow } from '../theme';
import { hapticLight, hapticSuccess } from '../utils/haptics';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface WasteType {
  key: string;
  label: string;
  emoji: string;
  hint: string;
  color: string;
  bg: string;
}

const WASTE_TYPES: WasteType[] = [
  { key: 'furniture',   label: 'Meubles',          emoji: '🛋️', hint: 'Canapé, table, armoire…',       color: '#7C3AED', bg: '#EDE9FE' },
  { key: 'appliance',   label: 'Électroménager',    emoji: '🖥️', hint: 'Frigo, machine à laver, TV…',   color: '#0369A1', bg: '#E0F2FE' },
  { key: 'electronics', label: 'Électronique',      emoji: '💻', hint: 'Ordinateur, téléphone, câbles…', color: '#0891B2', bg: '#CFFAFE' },
  { key: 'construction',label: 'Gravats / BTP',     emoji: '🧱', hint: 'Béton, carrelage, bois…',        color: '#92400E', bg: '#FEF3C7' },
  { key: 'mattress',    label: 'Matelas / literie', emoji: '🛏️', hint: 'Matelas, sommier, oreillers…',   color: '#BE185D', bg: '#FCE7F3' },
  { key: 'green',       label: 'Déchets verts',     emoji: '🌿', hint: 'Branches, feuilles, gazon…',     color: '#15803D', bg: '#DCFCE7' },
  { key: 'other',       label: 'Autre',             emoji: '📦', hint: 'Tout autre encombrant…',         color: '#475569', bg: '#F1F5F9' },
];

// ─── Animated fade-in ──────────────────────────────────────────────────────────

function FadeIn({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty      = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, delay, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(ty,      { toValue: 0, tension: 80, friction: 10, delay, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY: ty }] }}>{children}</Animated.View>;
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function WastePickupScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { user }           = useAuth();
  const { showToast }      = useToast();

  const [selectedType, setSelectedType]   = useState<string | null>(null);
  const [date, setDate]                   = useState('');
  const [address, setAddress]             = useState('');
  const [notes, setNotes]                 = useState('');
  const [photoUri, setPhotoUri]           = useState<string | null>(null);
  const [submitting, setSubmitting]       = useState(false);

  // ── Validate date input (DD/MM/YYYY) ────────────────────────────────────────
  const isDateValid = (v: string) => /^\d{2}\/\d{2}\/\d{4}$/.test(v);
  const formatDateInput = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0,2)}/${digits.slice(2)}`;
    return `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`;
  };

  // ── Photo picker ─────────────────────────────────────────────────────────────
  const pickPhoto = async (source: 'gallery' | 'camera') => {
    if (source === 'camera' && Platform.OS === 'web') {
      Alert.alert('Non disponible', 'La caméra est disponible uniquement sur mobile.');
      return;
    }
    const permFn = source === 'gallery'
      ? ImagePicker.requestMediaLibraryPermissionsAsync
      : ImagePicker.requestCameraPermissionsAsync;
    const { status } = await permFn();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', "L'accès " + (source === 'gallery' ? 'à la galerie' : 'à la caméra') + ' est nécessaire.');
      return;
    }
    const launchFn = source === 'gallery'
      ? ImagePicker.launchImageLibraryAsync
      : ImagePicker.launchCameraAsync;
    const result = await launchFn({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.75,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      hapticLight();
    }
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedType) {
      Alert.alert('Type requis', 'Sélectionne le type de déchet encombrant.');
      return;
    }
    if (!date || !isDateValid(date)) {
      Alert.alert('Date invalide', 'Entre une date au format JJ/MM/AAAA.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Adresse requise', "Indique l'adresse de ramassage.");
      return;
    }

    // Verify date is in the future
    const [dd, mm, yyyy] = date.split('/');
    const picked = new Date(+yyyy, +mm - 1, +dd);
    if (picked < new Date()) {
      Alert.alert('Date passée', 'Choisis une date à venir.');
      return;
    }

    setSubmitting(true);
    try {
      const wasteType = WASTE_TYPES.find(w => w.key === selectedType)!;
      await addDoc(collection(db, 'pickupRequests'), {
        userId:        user?.id ?? '',
        userEmail:     user?.email ?? '',
        wasteType:     selectedType,
        wasteLabel:    wasteType.label,
        wasteEmoji:    wasteType.emoji,
        scheduledDate: date,
        address:       address.trim(),
        notes:         notes.trim(),
        photoUri:      photoUri ?? null,
        status:        'pending',
        createdAt:     serverTimestamp(),
      });
      hapticSuccess();
      showToast('✅ Demande envoyée ! Nous confirmons sous 24h.', 'success');
      navigation.goBack();
    } catch {
      Alert.alert('Erreur', 'Impossible d\'envoyer la demande. Réessaye.');
    }
    setSubmitting(false);
  };

  const s = styles(colors, isDark);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ────────────────────────────────────────────────────── */}
      <LinearGradient colors={['#1B6B3A', '#2E8B57']} style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Ramassage spécial</Text>
          <Text style={s.headerSub}>Encombrants & gros déchets</Text>
        </View>
        <View style={s.headerEmoji}>
          <Text style={{ fontSize: 24 }}>🚛</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ── Info banner ── */}
          <FadeIn delay={0}>
            <View style={[s.infoBanner, { backgroundColor: colors.primaryGhost, borderColor: colors.primary + '40' }]}>
              <Ionicons name="information-circle" size={18} color={colors.primary} />
              <Text style={[s.infoText, { color: colors.primary }]}>
                Le ramassage d'encombrants est gratuit pour les porteurs de PoubCoins. Planifie jusqu'à 3 jours à l'avance.
              </Text>
            </View>
          </FadeIn>

          {/* ── Type de déchet ── */}
          <FadeIn delay={60}>
            <Text style={s.sectionLabel}>Type de déchet *</Text>
            <View style={s.typeGrid}>
              {WASTE_TYPES.map(w => {
                const active = selectedType === w.key;
                return (
                  <TouchableOpacity
                    key={w.key}
                    activeOpacity={0.8}
                    style={[
                      s.typeCard,
                      { backgroundColor: active ? w.color : colors.card, borderColor: active ? w.color : colors.border },
                    ]}
                    onPress={() => { hapticLight(); setSelectedType(w.key); }}
                  >
                    <Text style={{ fontSize: 22, marginBottom: 4 }}>{w.emoji}</Text>
                    <Text style={[s.typeLabel, { color: active ? '#fff' : colors.text }]} numberOfLines={1}>{w.label}</Text>
                    <Text style={[s.typeHint,  { color: active ? 'rgba(255,255,255,0.75)' : colors.textMuted }]} numberOfLines={1}>{w.hint}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </FadeIn>

          {/* ── Date ── */}
          <FadeIn delay={120}>
            <Text style={s.sectionLabel}>Date de ramassage *</Text>
            <View style={[s.inputWrap, { borderColor: date && !isDateValid(date) ? colors.error : colors.border }]}>
              <Ionicons name="calendar-outline" size={18} color={colors.textMuted} style={s.inputIcon} />
              <TextInput
                style={[s.input, { color: colors.text }]}
                placeholder="JJ/MM/AAAA"
                placeholderTextColor={colors.textMuted}
                value={date}
                onChangeText={v => setDate(formatDateInput(v))}
                keyboardType="numeric"
                maxLength={10}
              />
              {date.length === 10 && (
                <Ionicons
                  name={isDateValid(date) ? 'checkmark-circle' : 'close-circle'}
                  size={18}
                  color={isDateValid(date) ? colors.success : colors.error}
                />
              )}
            </View>
            {date.length === 10 && !isDateValid(date) && (
              <Text style={[s.fieldError, { color: colors.error }]}>Format : JJ/MM/AAAA</Text>
            )}
          </FadeIn>

          {/* ── Adresse ── */}
          <FadeIn delay={160}>
            <Text style={s.sectionLabel}>Adresse de ramassage *</Text>
            <View style={[s.inputWrap, { borderColor: colors.border }]}>
              <Ionicons name="location-outline" size={18} color={colors.textMuted} style={s.inputIcon} />
              <TextInput
                style={[s.input, { color: colors.text }]}
                placeholder="Rue, numéro, ville…"
                placeholderTextColor={colors.textMuted}
                value={address}
                onChangeText={setAddress}
                returnKeyType="next"
              />
            </View>
          </FadeIn>

          {/* ── Notes ── */}
          <FadeIn delay={200}>
            <Text style={s.sectionLabel}>Description / notes</Text>
            <View style={[s.inputWrap, s.textareaWrap, { borderColor: colors.border }]}>
              <TextInput
                style={[s.input, s.textarea, { color: colors.text }]}
                placeholder="Décris la quantité, l'accès, étage, code…"
                placeholderTextColor={colors.textMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>
          </FadeIn>

          {/* ── Photo optionnelle ── */}
          <FadeIn delay={240}>
            <Text style={s.sectionLabel}>Photo (optionnelle)</Text>
            {photoUri ? (
              <View style={s.photoPreviewWrap}>
                <Image source={{ uri: photoUri }} style={s.photoPreview} resizeMode="cover" />
                <TouchableOpacity style={s.photoRemove} onPress={() => setPhotoUri(null)}>
                  <Ionicons name="close-circle" size={26} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.photoRow}>
                <TouchableOpacity
                  style={[s.photoBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => pickPhoto('gallery')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="images-outline" size={22} color={colors.primary} />
                  <Text style={[s.photoBtnText, { color: colors.text }]}>Galerie</Text>
                </TouchableOpacity>
                {Platform.OS !== 'web' && (
                  <TouchableOpacity
                    style={[s.photoBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => pickPhoto('camera')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera-outline" size={22} color={colors.primary} />
                    <Text style={[s.photoBtnText, { color: colors.text }]}>Caméra</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </FadeIn>

          {/* ── Steps summary ── */}
          <FadeIn delay={280}>
            <View style={[s.stepsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[s.stepsTitle, { color: colors.text }]}>Comment ça marche ?</Text>
              {[
                { icon: 'document-text-outline', text: 'Tu envoies ta demande' },
                { icon: 'call-outline',          text: 'On te confirme sous 24h' },
                { icon: 'car-outline',           text: 'Le camion passe à la date choisie' },
                { icon: 'gift-outline',          text: 'Tu reçois des PoubCoins bonus 🎉' },
              ].map((s2, i) => (
                <View key={i} style={s.stepRow}>
                  <View style={[s.stepDot, { backgroundColor: colors.primaryGhost }]}>
                    <Ionicons name={s2.icon as any} size={14} color={colors.primary} />
                  </View>
                  <Text style={[s.stepText, { color: colors.textSecondary }]}>{s2.text}</Text>
                </View>
              ))}
            </View>
          </FadeIn>

          {/* ── Submit ── */}
          <FadeIn delay={320}>
            <TouchableOpacity
              style={[s.submitBtn, { backgroundColor: submitting ? colors.textMuted : colors.primary }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Ionicons name="send-outline" size={18} color="#fff" />
                    <Text style={s.submitText}>Planifier le ramassage</Text>
                  </>
              }
            </TouchableOpacity>
          </FadeIn>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

function styles(colors: any, isDark: boolean) {
  return {
    safe: { flex: 1, backgroundColor: colors.background },

    // Header
    header: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center' as const, justifyContent: 'center' as const },
    headerTitle: { fontSize: 18, fontWeight: '800' as const, color: '#fff', letterSpacing: -0.3 },
    headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
    headerEmoji: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center' as const, justifyContent: 'center' as const },

    // Body
    body: { padding: 16, gap: 20 },

    // Info banner
    infoBanner: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 10, borderWidth: 1, borderRadius: 12, padding: 12 },
    infoText: { flex: 1, fontSize: 13, lineHeight: 18 },

    // Section label
    sectionLabel: { fontSize: 13.5, fontWeight: '700' as const, color: colors.textSecondary, marginBottom: 10 },

    // Waste type grid
    typeGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 10 },
    typeCard: {
      width: '30%' as any, borderRadius: 12, borderWidth: 1.5,
      padding: 10, alignItems: 'center' as const,
      ...shadow.sm,
    },
    typeLabel: { fontSize: 12, fontWeight: '700' as const, textAlign: 'center' as const },
    typeHint:  { fontSize: 10, textAlign: 'center' as const, marginTop: 2 },

    // Inputs
    inputWrap: { flexDirection: 'row' as const, alignItems: 'center' as const, borderWidth: 1.5, borderRadius: 12, backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 2 },
    inputIcon: { marginRight: 8 },
    input: { flex: 1, fontSize: 14.5, paddingVertical: 12 },
    textareaWrap: { alignItems: 'flex-start' as const, paddingVertical: 10 },
    textarea: { height: 80, textAlignVertical: 'top' as const },
    fieldError: { fontSize: 11.5, marginTop: 4 },

    // Photo
    photoRow: { flexDirection: 'row' as const, gap: 10 },
    photoBtn: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8, borderWidth: 1.5, borderRadius: 12, borderStyle: 'dashed' as const, paddingVertical: 18 },
    photoBtnText: { fontSize: 14, fontWeight: '600' as const },
    photoPreviewWrap: { position: 'relative' as const, borderRadius: 14, overflow: 'hidden' as const },
    photoPreview: { width: '100%' as any, height: 180, borderRadius: 14 },
    photoRemove: { position: 'absolute' as const, top: 8, right: 8 },

    // Steps card
    stepsCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
    stepsTitle: { fontSize: 13.5, fontWeight: '800' as const, marginBottom: 4 },
    stepRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 },
    stepDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center' as const, justifyContent: 'center' as const },
    stepText: { fontSize: 13.5, flex: 1 },

    // Submit
    submitBtn: { borderRadius: 14, padding: 15, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8 },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '800' as const },
  };
}
