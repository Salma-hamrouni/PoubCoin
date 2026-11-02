import React, { useState, useEffect } from 'react';
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection, onSnapshot, addDoc, updateDoc, doc,
  arrayUnion, arrayRemove, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import BackButton from '../components/BackButton';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { radius, shadow } from '../theme';
import { useT } from '../i18n/useT';

interface CivicEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  createdBy: string;
  createdByName: string;
  participants: string[];
  goal: number;
  reward: number;
}

export default function EventsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const t = useT();
  const [events, setEvents] = useState<CivicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [goal, setGoal] = useState('10');

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as CivicEvent)));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  const handleJoin = async (event: CivicEvent) => {
    if (!user || joiningId === event.id) return;
    setJoiningId(event.id);
    const ref = doc(db, 'events', event.id);
    const joined = event.participants.includes(user.id);
    try {
      await updateDoc(ref, {
        participants: joined ? arrayRemove(user.id) : arrayUnion(user.id),
      });
    } catch {
      Alert.alert('Erreur', 'Impossible de rejoindre l\'événement. Vérifiez votre connexion.');
    }
    setJoiningId(null);
  };

  const handleCreate = async () => {
    if (!user || !title.trim() || !date.trim() || !location.trim()) {
      Alert.alert('Champs manquants', 'Titre, date et lieu sont requis.');
      return;
    }
    setCreating(true);
    try {
      await addDoc(collection(db, 'events'), {
        title: title.trim(),
        description: description.trim(),
        date: date.trim(),
        location: location.trim(),
        createdBy: user.id,
        createdByName: user.name,
        participants: [user.id],
        goal: parseInt(goal) || 10,
        reward: 25,
        createdAt: serverTimestamp(),
      });
      setShowCreate(false);
      setTitle(''); setDescription(''); setDate(''); setLocation(''); setGoal('10');
    } catch {
      Alert.alert('Erreur', 'Impossible de créer l\'événement.');
    }
    setCreating(false);
  };

  const progressColor = (pct: number) =>
    pct >= 100 ? '#16A34A' : pct >= 60 ? '#CA8A04' : colors.primary;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border, ...shadow.sm }}>
        <BackButton onPress={() => navigation.goBack()} variant="light" />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 1 }}>{t('events_label')}</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{t('events_title')}</Text>
        </View>
        <TouchableOpacity
          style={{ backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
          onPress={() => setShowCreate(true)}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>{t('events_create')}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {events.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 60, gap: 12 }}>
              <Text style={{ fontSize: 52 }}>🌍</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{t('events_empty')}</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>{t('events_empty_sub')}</Text>
            </View>
          )}
          {events.map(event => {
            const joined = user ? event.participants.includes(user.id) : false;
            const pct = Math.min((event.participants.length / event.goal) * 100, 100);
            const isGoalMet = event.participants.length >= event.goal;
            return (
              <View key={event.id} style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: isGoalMet ? '#16A34A40' : colors.border, ...shadow.sm }}>
                {isGoalMet && (
                  <View style={{ backgroundColor: '#16A34A', borderRadius: radius.xs, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 8 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>{t('events_goal_met')}</Text>
                  </View>
                )}
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 }}>{event.title}</Text>
                {event.description ? (
                  <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 10, lineHeight: 18 }}>{event.description}</Text>
                ) : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>{event.date}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>{event.location}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 12, color: '#CA8A04', fontWeight: '700' }}>+{event.reward} 🪙</Text>
                  </View>
                </View>

                {/* Progress */}
                <View style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>👥 {event.participants.length} participant{event.participants.length !== 1 ? 's' : ''}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: progressColor(pct) }}>{t('events_goal')} {event.goal}</Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${pct}%` as any, backgroundColor: progressColor(pct), borderRadius: 3 }} />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 11, color: colors.textMuted, flex: 1 }}>{t('events_by')} {event.createdByName}</Text>
                  <TouchableOpacity
                    style={{ backgroundColor: joined ? colors.border : colors.primary, borderRadius: radius.sm, paddingHorizontal: 16, paddingVertical: 8, opacity: joiningId === event.id ? 0.6 : 1 }}
                    onPress={() => handleJoin(event)}
                    disabled={joiningId === event.id}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: joined ? colors.text : '#fff' }}>
                      {joiningId === event.id ? '...' : joined ? t('events_joined') : t('events_join')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Create Modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.text }}>{t('events_modal_title')}</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            {[
              { label: 'Titre *', value: title, set: setTitle, placeholder: 'Ex: Nettoyage Parc El-Mecherguia' },
              { label: 'Description', value: description, set: setDescription, placeholder: 'Décrivez l\'événement...' },
              { label: 'Date *', value: date, set: setDate, placeholder: 'Ex: 28 juin 2026' },
              { label: 'Lieu *', value: location, set: setLocation, placeholder: 'Ex: Ariana, Parc Central' },
              { label: 'Objectif participants', value: goal, set: setGoal, placeholder: '10' },
            ].map(f => (
              <View key={f.label} style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>{f.label}</Text>
                <TextInput
                  value={f.value}
                  onChangeText={f.set}
                  placeholder={f.placeholder}
                  placeholderTextColor={colors.textMuted}
                  style={{ backgroundColor: colors.background, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.border }}
                  keyboardType={f.label.includes('participants') ? 'number-pad' : 'default'}
                />
              </View>
            ))}
            <TouchableOpacity
              style={{ backgroundColor: colors.primary, borderRadius: radius.md, padding: 14, alignItems: 'center', marginTop: 4 }}
              onPress={handleCreate}
              disabled={creating}
            >
              {creating ? <ActivityIndicator color="#fff" /> : <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{t('events_publish')}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
