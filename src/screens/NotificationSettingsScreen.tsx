import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  Switch, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackButton from '../components/BackButton';
import { useTheme } from '../context/ThemeContext';

const STORAGE_KEY = 'poubcoin_notif_prefs';

type Pref = {
  id: string;
  icon: string;
  label: string;
  sub: string;
  color: string;
};

const PREFS: Pref[] = [
  { id: 'report_validated', icon: '✅', label: 'Signalement validé', sub: 'Quand un admin valide votre signalement', color: '#22C55E' },
  { id: 'report_rejected',  icon: '❌', label: 'Signalement rejeté',  sub: 'Quand un signalement est refusé', color: '#EF4444' },
  { id: 'coins_earned',     icon: '🪙', label: 'PoubCoins gagnés',   sub: 'Chaque fois que vous gagnez des coins', color: '#F59E0B' },
  { id: 'challenge_new',   icon: '🎯', label: 'Nouveau défi',        sub: 'Quand un nouveau défi est disponible', color: '#8B5CF6' },
  { id: 'event_reminder',  icon: '📅', label: 'Rappel événement',    sub: '24h avant un événement auquel vous participez', color: '#3B82F6' },
  { id: 'leaderboard',     icon: '🏆', label: 'Classement',          sub: 'Changements dans votre position', color: '#F97316' },
  { id: 'streak_alert',    icon: '🔥', label: 'Alerte série',        sub: 'Quand votre série est en danger', color: '#EF4444' },
  { id: 'nearby_report',   icon: '📍', label: 'Signalement proche',  sub: 'Activité dans votre quartier', color: '#10B981' },
  { id: 'system',          icon: '🔔', label: 'Notifications système', sub: 'Mises à jour importantes de l\'app', color: '#6B7280' },
];

export default function NotificationSettingsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        setPrefs(JSON.parse(raw));
      } else {
        const defaults: Record<string, boolean> = {};
        PREFS.forEach(p => { defaults[p.id] = true; });
        setPrefs(defaults);
      }
      setLoading(false);
    });
  }, []);

  const toggle = async (id: string, val: boolean) => {
    const updated = { ...prefs, [id]: val };
    setPrefs(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const enableAll = async () => {
    const all: Record<string, boolean> = {};
    PREFS.forEach(p => { all[p.id] = true; });
    setPrefs(all);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  };

  const disableAll = async () => {
    const none: Record<string, boolean> = {};
    PREFS.forEach(p => { none[p.id] = false; });
    setPrefs(none);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(none));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <BackButton onPress={() => navigation.goBack()} variant="light" />
        <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {/* Quick actions */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            <TouchableOpacity onPress={enableAll} style={[styles.quickBtn, { backgroundColor: colors.primary }]}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Tout activer</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={disableAll} style={[styles.quickBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
              <Text style={{ color: colors.textMuted, fontWeight: '700', fontSize: 13 }}>Tout désactiver</Text>
            </TouchableOpacity>
          </View>

          {/* Pref rows */}
          {PREFS.map((p, i) => (
            <View
              key={p.id}
              style={[
                styles.row,
                { backgroundColor: colors.surface, borderColor: colors.border },
                i === 0 && { borderTopLeftRadius: 14, borderTopRightRadius: 14 },
                i === PREFS.length - 1 && { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
              ]}
            >
              <View style={[styles.iconBox, { backgroundColor: p.color + '18' }]}>
                <Text style={{ fontSize: 18 }}>{p.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>{p.label}</Text>
                <Text style={[styles.rowSub, { color: colors.textMuted }]}>{p.sub}</Text>
              </View>
              <Switch
                value={prefs[p.id] ?? true}
                onValueChange={v => toggle(p.id, v)}
                trackColor={{ false: colors.border, true: colors.primary + '88' }}
                thumbColor={prefs[p.id] ? colors.primary : '#ccc'}
              />
            </View>
          ))}

          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Ces préférences sont sauvegardées localement et appliquées aux futures notifications push.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn:   { width: 40, height: 40, justifyContent: 'center' },
  title:     { fontSize: 18, fontWeight: '800' },
  quickBtn:  { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  row:       { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 0.5, marginBottom: -0.5 },
  iconBox:   { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  rowLabel:  { fontSize: 14, fontWeight: '600' },
  rowSub:    { fontSize: 12, marginTop: 2 },
  hint:      { fontSize: 12, textAlign: 'center', marginTop: 24, marginBottom: 16, lineHeight: 18 },
});
