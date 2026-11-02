import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdmin } from '../../context/AdminContext';
import { colors, radius, shadow } from '../../theme';

interface SentNotif { title: string; body: string; sentAt: string; target: string }

type Target = 'all' | 'inactive' | 'top';
const TARGETS: { key: Target; label: string; icon: string }[] = [
  { key: 'all',      label: 'Tous les citoyens',  icon: 'people-outline'    },
  { key: 'inactive', label: 'Inactifs (7j+)',      icon: 'moon-outline'      },
  { key: 'top',      label: 'Top citoyens',        icon: 'trophy-outline'    },
];

const TEMPLATES = [
  { icon: '🚛', title: 'Nouvelle collecte',    body: 'Une collecte de déchets est prévue dans votre zone. Merci de signaler les points critiques.' },
  { icon: '✅', title: 'Zone nettoyée',         body: 'Votre signalement a contribué au nettoyage de la zone. Merci pour votre engagement !' },
  { icon: '🏆', title: 'Félicitations !',       body: 'Grâce à vos signalements, notre ville est plus propre. Continuez comme ça !' },
  { icon: '⚠️', title: 'Alerte dépôt sauvage', body: 'Un dépôt sauvage important a été détecté. Aidez-nous à signaler les zones concernées.' },
];

export default function AdminNotificationsScreen({ navigation }: any) {
  const { sendPushToAll } = useAdmin();
  const [title,   setTitle]   = useState('');
  const [body,    setBody]    = useState('');
  const [target,  setTarget]  = useState<Target>('all');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error,   setError]   = useState('');
  const [history, setHistory] = useState<SentNotif[]>([]);

  const targetLabel = TARGETS.find(t => t.key === target)?.label ?? 'Tous';

  const send = async () => {
    if (!title.trim() || !body.trim()) { setError('Titre et message requis'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      await sendPushToAll(title.trim(), body.trim(), target);
      const notif: SentNotif = {
        title: title.trim(), body: body.trim(), target: targetLabel,
        sentAt: new Date().toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }),
      };
      setHistory(h => [notif, ...h].slice(0, 10));
      setSuccess(`Notification envoyée à : ${targetLabel}`);
      setTimeout(() => setSuccess(''), 4000);
      setTitle(''); setBody('');
    } catch {
      setError('Erreur lors de l\'envoi. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = (t: typeof TEMPLATES[0]) => {
    setTitle(t.title); setBody(t.body); setSuccess(''); setError('');
  };

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={s.headerLabel}>COMMUNICATION</Text>
          <Text style={s.headerTitle}>Notifications</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>

        {/* Compose */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Composer un message</Text>

          <Text style={s.label}>Titre</Text>
          <View style={s.inputRow}>
            <Ionicons name="text-outline" size={16} color={colors.textMuted} />
            <TextInput
              style={s.input}
              placeholder="Ex: Nouvelle collecte ce vendredi"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={t => { setTitle(t); setSuccess(''); setError(''); }}
            />
          </View>

          <Text style={s.label}>Message</Text>
          <TextInput
            style={s.textarea}
            placeholder="Écrivez votre message aux citoyens..."
            placeholderTextColor={colors.textMuted}
            value={body}
            onChangeText={t => { setBody(t); setSuccess(''); setError(''); }}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Target selector */}
          <Text style={s.label}>Destinataires</Text>
          <View style={s.targetRow}>
            {TARGETS.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[s.targetChip, target === t.key && s.targetChipActive]}
                onPress={() => setTarget(t.key)}
              >
                <Ionicons
                  name={t.icon as any}
                  size={14}
                  color={target === t.key ? '#fff' : colors.textMuted}
                />
                <Text style={[s.targetChipText, target === t.key && s.targetChipTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {!!error && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle-outline" size={14} color="#DC2626" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}
          {!!success && (
            <View style={s.successBox}>
              <Ionicons name="checkmark-circle-outline" size={14} color={colors.primary} />
              <Text style={s.successText}>{success}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[s.sendBtn, loading && { opacity: 0.65 }]}
            onPress={send}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Ionicons name="send" size={16} color="#fff" />
                  <Text style={s.sendText}>Envoyer à : {targetLabel}</Text>
                </>
            }
          </TouchableOpacity>
        </View>

        {/* Preview card */}
        {(title.trim() || body.trim()) && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Aperçu de la notification</Text>
            <View style={s.previewCard}>
              <View style={s.previewIconWrap}>
                <Text style={s.previewIcon}>🗑️</Text>
              </View>
              <View style={s.previewBody}>
                <Text style={s.previewTitle} numberOfLines={1}>{title.trim() || 'Titre...'}</Text>
                <Text style={s.previewMsg} numberOfLines={2}>{body.trim() || 'Votre message...'}</Text>
                <Text style={s.previewTime}>maintenant · PoubCoin</Text>
              </View>
            </View>
          </View>
        )}

        {/* Templates */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Modèles rapides</Text>
          <View style={s.templates}>
            {TEMPLATES.map(t => (
              <TouchableOpacity key={t.title} style={s.template} onPress={() => applyTemplate(t)}>
                <Text style={s.templateIcon}>{t.icon}</Text>
                <Text style={s.templateTitle}>{t.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* History */}
        {history.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Historique ({history.length})</Text>
            <View style={s.historyList}>
              {history.map((n, i) => (
                <View key={i} style={s.historyItem}>
                  <View style={s.historyIcon}>
                    <Ionicons name="notifications-outline" size={14} color={colors.primary} />
                  </View>
                  <View style={s.historyBody}>
                    <Text style={s.historyTitle}>{n.title}</Text>
                    <Text style={s.historyMsg} numberOfLines={1}>{n.body}</Text>
                    <Text style={s.historyTarget}>👥 {n.target}</Text>
                  </View>
                  <Text style={s.historyTime}>{n.sentAt}</Text>
                </View>
              ))}
            </View>
          </View>
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
  headerLabel: { fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: 16,
    borderWidth: 1, borderColor: colors.border, ...shadow.xs,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.background, borderRadius: radius.sm,
    paddingHorizontal: 12, height: 46, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  input: { flex: 1, fontSize: 14, color: colors.text },
  textarea: {
    backgroundColor: colors.background, borderRadius: radius.sm,
    padding: 12, fontSize: 14, color: colors.text,
    minHeight: 100, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  targetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  targetChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
  },
  targetChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  targetChipText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  targetChipTextActive: { color: '#fff', fontWeight: '600' },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEE2E2', borderRadius: radius.xs, padding: 10, marginBottom: 10,
  },
  errorText: { color: '#DC2626', fontSize: 13, flex: 1 },
  successBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primaryGhost, borderRadius: radius.xs, padding: 10, marginBottom: 10,
  },
  successText: { color: colors.primary, fontSize: 13, flex: 1 },
  sendBtn: {
    backgroundColor: colors.primary, borderRadius: radius.sm,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13,
  },
  sendText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  previewCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: colors.background, borderRadius: radius.sm, padding: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  previewIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: colors.primaryGhost, justifyContent: 'center', alignItems: 'center',
  },
  previewIcon: { fontSize: 20 },
  previewBody: { flex: 1, gap: 2 },
  previewTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  previewMsg: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  previewTime: { fontSize: 10, color: colors.textMuted, marginTop: 2 },

  templates: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  template: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.background, borderRadius: radius.sm,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  templateIcon: { fontSize: 16 },
  templateTitle: { fontSize: 12, fontWeight: '600', color: colors.text },
  historyList: { gap: 10 },
  historyItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: colors.background, borderRadius: radius.xs, padding: 10,
  },
  historyIcon: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.primaryGhost, justifyContent: 'center', alignItems: 'center',
  },
  historyBody: { flex: 1 },
  historyTitle: { fontSize: 13, fontWeight: '600', color: colors.text },
  historyMsg: { fontSize: 11, color: colors.textMuted },
  historyTarget: { fontSize: 10, color: colors.primary, fontWeight: '500', marginTop: 2 },
  historyTime: { fontSize: 11, color: colors.textMuted },
});
