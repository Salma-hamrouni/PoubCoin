import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase';
import { colors, radius, shadow } from '../../theme';

type Target = 'all' | 'inactive' | 'top';

const TARGET_OPTIONS: { key: Target; label: string }[] = [
  { key: 'all',      label: 'Tous les citoyens' },
  { key: 'inactive', label: 'Inactifs (7j+)' },
  { key: 'top',      label: 'Top citoyens (500+ coins)' },
];

interface Campaign {
  id: string;
  title: string;
  message: string;
  target: Target;
  sentAt: string;
  recipientCount: number;
}

export default function AdminCampaignsScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<Target>('all');
  const [sending, setSending] = useState(false);
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'campaigns'), orderBy('sentAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() } as Campaign)));
    });
    return unsub;
  }, []);

  const handleSend = async () => {
    setError('');
    setSuccess(false);
    if (!title.trim()) { setError('Le titre est requis.'); return; }
    if (!message.trim()) { setError('Le message est requis.'); return; }
    setSending(true);
    try {
      await addDoc(collection(db, 'campaigns'), {
        title: title.trim(),
        message: message.trim(),
        target,
        sentAt: new Date().toISOString(),
        recipientCount: 0,
      });
      setTitle('');
      setMessage('');
      setTarget('all');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch {
      setError('Impossible d\'envoyer la campagne. Vérifiez votre connexion.');
    } finally {
      setSending(false);
    }
  };

  const targetLabel = TARGET_OPTIONS.find(o => o.key === target)?.label ?? '';

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.headerLabel}>ADMINISTRATION</Text>
          <Text style={s.headerTitle}>📢 Campagnes push</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* New campaign form */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Nouvelle campagne</Text>

          <Text style={s.fieldLabel}>Titre</Text>
          <TextInput
            style={s.input}
            placeholder="Ex : Nettoyage du quartier"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={s.fieldLabel}>Message</Text>
          <TextInput
            style={[s.input, s.textarea]}
            placeholder="Votre message pour les citoyens..."
            placeholderTextColor={colors.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text style={s.fieldLabel}>Cible</Text>
          <TouchableOpacity style={s.picker} onPress={() => setShowTargetPicker(!showTargetPicker)}>
            <Text style={s.pickerText}>{targetLabel}</Text>
            <Ionicons name={showTargetPicker ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
          </TouchableOpacity>
          {showTargetPicker && (
            <View style={s.pickerDropdown}>
              {TARGET_OPTIONS.map(o => (
                <TouchableOpacity
                  key={o.key}
                  style={[s.pickerOption, o.key === target && s.pickerOptionActive]}
                  onPress={() => { setTarget(o.key); setShowTargetPicker(false); }}
                >
                  <Text style={[s.pickerOptionText, o.key === target && s.pickerOptionTextActive]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {error ? (
            <View style={{ backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#FECACA', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
              <Text style={{ color: '#DC2626', fontSize: 13, fontWeight: '600', flex: 1 }}>{error}</Text>
            </View>
          ) : null}
          {success ? (
            <View style={{ backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#BBF7D0', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#16A34A" />
              <Text style={{ color: '#16A34A', fontSize: 13, fontWeight: '700', flex: 1 }}>Campagne envoyée avec succès !</Text>
            </View>
          ) : null}
          <TouchableOpacity style={[s.sendBtn, sending && { opacity: 0.6 }]} onPress={handleSend} disabled={sending}>
            <Ionicons name="send-outline" size={18} color="#fff" />
            <Text style={s.sendBtnText}>{sending ? 'Envoi...' : '📤 Envoyer'}</Text>
          </TouchableOpacity>
        </View>

        {/* History */}
        <Text style={s.sectionLabel}>HISTORIQUE</Text>
        {campaigns.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="megaphone-outline" size={48} color={colors.border} />
            <Text style={s.emptyText}>Aucune campagne envoyée</Text>
          </View>
        ) : (
          campaigns.map(c => (
            <View key={c.id} style={s.campaignCard}>
              <View style={s.campaignTop}>
                <Text style={s.campaignTitle}>{c.title}</Text>
                <View style={s.campaignTargetBadge}>
                  <Text style={s.campaignTargetText}>
                    {TARGET_OPTIONS.find(o => o.key === c.target)?.label ?? c.target}
                  </Text>
                </View>
              </View>
              <Text style={s.campaignMessage} numberOfLines={2}>{c.message}</Text>
              <View style={s.campaignMeta}>
                <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                <Text style={s.campaignDate}>
                  {new Date(c.sentAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
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
  headerText: { flex: 1 },
  headerLabel: { fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: 18,
    borderWidth: 1, borderColor: colors.border, ...shadow.xs,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: colors.background, borderRadius: radius.sm, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: colors.text, marginBottom: 14,
  },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  picker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.background, borderRadius: radius.sm, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 6,
  },
  pickerText: { fontSize: 14, color: colors.text },
  pickerDropdown: {
    backgroundColor: colors.surface, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border, marginBottom: 14, overflow: 'hidden',
  },
  pickerOption: { paddingHorizontal: 14, paddingVertical: 12 },
  pickerOptionActive: { backgroundColor: colors.primaryGhost },
  pickerOptionText: { fontSize: 14, color: colors.text },
  pickerOptionTextActive: { color: colors.primary, fontWeight: '600' },
  sendBtn: {
    backgroundColor: colors.primary, borderRadius: radius.sm,
    paddingVertical: 14, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, marginTop: 4,
  },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 32, gap: 8 },
  emptyText: { fontSize: 14, color: colors.textMuted },
  campaignCard: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: 16,
    borderWidth: 1, borderColor: colors.border, ...shadow.xs, gap: 6,
  },
  campaignTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  campaignTitle: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  campaignTargetBadge: {
    backgroundColor: colors.primaryGhost, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  campaignTargetText: { fontSize: 10, color: colors.primary, fontWeight: '600' },
  campaignMessage: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  campaignMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  campaignDate: { fontSize: 11, color: colors.textMuted },
});
