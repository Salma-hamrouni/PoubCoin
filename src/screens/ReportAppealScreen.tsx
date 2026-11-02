import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { hapticSuccess } from '../utils/haptics';

const REASONS = [
  'La photo est claire et le dÃ©chet est bien visible',
  'L\'adresse indiquÃ©e est correcte',
  'Le dÃ©chet n\'avait pas encore Ã©tÃ© ramassÃ© au moment du signalement',
  'J\'ai des preuves supplÃ©mentaires',
  'Autre raison',
];

export default function ReportAppealScreen({ route, navigation }: any) {
  const { reportId = '', reportAddress = 'Signalement' } = route.params ?? {};
  const { user } = useAuth();
  const { colors } = useTheme();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!selectedReason) {
      Alert.alert('Raison requise', 'Veuillez sÃ©lectionner une raison pour votre contestation.');
      return;
    }
    if (!user) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'appeals'), {
        reportId,
        userId: user.id,
        userName: user.name,
        reason: selectedReason,
        details: details.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      hapticSuccess();
      setDone(true);
    } catch {
      Alert.alert('Erreur', 'Impossible d\'envoyer la contestation. RÃ©essayez.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <Text style={{ fontSize: 64, marginBottom: 16 }}>âœ…</Text>
        <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text, textAlign: 'center', marginBottom: 10 }}>Contestation envoyÃ©e</Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
          Un administrateur examinera votre contestation sous 48h et vous recevrez une notification.
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Contester le rejet</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Context */}
        <View style={[styles.contextCard, { backgroundColor: '#FFF3E0', borderColor: '#F97316' }]}>
          <Ionicons name="alert-circle" size={20} color="#F97316" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', color: '#92400E', fontSize: 14 }}>Signalement rejetÃ©</Text>
            <Text style={{ color: '#92400E', fontSize: 12, marginTop: 2 }} numberOfLines={2}>{reportAddress}</Text>
          </View>
        </View>

        {/* Reason selector */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Pourquoi contestez-vous ce rejet ?</Text>
        {REASONS.map(r => (
          <TouchableOpacity
            key={r}
            onPress={() => setSelectedReason(r)}
            style={[styles.reasonRow, { backgroundColor: colors.surface, borderColor: selectedReason === r ? colors.primary : colors.border }]}
          >
            <View style={[styles.radio, { borderColor: selectedReason === r ? colors.primary : colors.border }]}>
              {selectedReason === r && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
            </View>
            <Text style={{ flex: 1, color: colors.text, fontSize: 14 }}>{r}</Text>
          </TouchableOpacity>
        ))}

        {/* Details */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>DÃ©tails supplÃ©mentaires (optionnel)</Text>
        <TextInput
          value={details}
          onChangeText={setDetails}
          multiline
          numberOfLines={4}
          placeholder="Expliquez votre situation en dÃ©tail..."
          placeholderTextColor={colors.textMuted}
          style={[styles.textarea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        />

        <TouchableOpacity
          onPress={submit}
          disabled={submitting}
          style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.7 : 1 }]}
        >
          {submitting
            ? <ActivityIndicator color="#fff" size="small" />
            : <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Envoyer la contestation</Text>
              </>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  title:       { fontSize: 18, fontWeight: '800' },
  contextCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  sectionLabel:{ fontSize: 15, fontWeight: '700', marginBottom: 10 },
  reasonRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1.5, marginBottom: 8 },
  radio:       { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioDot:    { width: 10, height: 10, borderRadius: 5 },
  textarea:    { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 14, minHeight: 100, marginBottom: 20, textAlignVertical: 'top' },
  submitBtn:   { borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
});


