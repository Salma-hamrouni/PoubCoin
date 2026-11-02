import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useT } from '../i18n/useT';

const BADGES = [
  { id: 'first_report',   label: 'Premier signalement', icon: '📋', points: 10 },
  { id: 'streak_7',       label: 'Série de 7 jours',    icon: '🔥', points: 20 },
  { id: 'coins_100',      label: '100 PoubCoins',        icon: '🪙', points: 15 },
  { id: 'tree_planted',   label: 'Arbre planté',         icon: '🌳', points: 25 },
  { id: 'reports_10',    label: '10 signalements',      icon: '🏅', points: 30 },
  { id: 'reports_50',    label: '50 signalements',      icon: '🏆', points: 80 },
  { id: 'event_joined',   label: 'Événement rejoint',    icon: '📅', points: 15 },
  { id: 'challenge_done', label: 'Défi complété',        icon: '🎯', points: 20 },
];

const calcScore = (achievements: string[]) =>
  BADGES.filter(b => achievements.includes(b.id)).reduce((sum, b) => sum + b.points, 0);

type Player = { id: string; name: string; avatar: string; achievements: string[]; score: number; rank: number };

export default function AchievementLeaderboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const t = useT();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('reports', 'desc'), limit(50));
    getDocs(q).then(snap => {
      const all: Player[] = snap.docs
        .filter(d => d.data().role !== 'municipality_admin')
        .map(d => {
        const data = d.data();
        const achievements: string[] = data.achievements ?? [];
        return {
          id: d.id,
          name: data.name ?? 'Inconnu',
          avatar: data.avatar ?? '👤',
          achievements,
          score: calcScore(achievements),
          rank: 0,
        };
      });
      all.sort((a, b) => b.score - a.score);
      all.forEach((p, i) => { p.rank = i + 1; });
      setPlayers(all);
      setLoading(false);
    });
  }, []);

  const getMedal = (rank: number) => ['🥇', '🥈', '🥉'][rank - 1] ?? null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{t('ach_title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Badge legend */}
      <View style={[styles.legendCard, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.legendTitle, { color: colors.textMuted }]}>{t('ach_legend')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {BADGES.map(b => (
            <View key={b.id} style={[styles.badgeChip, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={{ fontSize: 12 }}>{b.icon}</Text>
              <Text style={{ fontSize: 10, color: colors.textMuted }}>+{b.points}pts</Text>
            </View>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={players}
          keyExtractor={p => p.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item: p }) => {
            const medal = getMedal(p.rank);
            const isMe = p.id === user?.id;
            const earnedBadges = BADGES.filter(b => p.achievements.includes(b.id));
            return (
              <View style={[
                styles.playerRow,
                { backgroundColor: isMe ? colors.primary + '12' : colors.surface, borderColor: isMe ? colors.primary : colors.border },
              ]}>
                <Text style={[styles.rank, { color: medal ? colors.text : colors.textMuted }]}>
                  {medal ?? `#${p.rank}`}
                </Text>
                <Text style={{ fontSize: 26 }}>{p.avatar}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.playerName, { color: colors.text }]}>{p.name}{isMe ? ` ${t('ach_you')}` : ''}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                    {earnedBadges.slice(0, 5).map(b => (
                      <Text key={b.id} style={{ fontSize: 14 }}>{b.icon}</Text>
                    ))}
                    {earnedBadges.length > 5 && (
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>+{earnedBadges.length - 5}</Text>
                    )}
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: colors.primary, fontWeight: '900', fontSize: 16 }}>{p.score}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 11 }}>{t('ach_points')}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  title:       { fontSize: 18, fontWeight: '800' },
  legendCard:  { padding: 12, borderBottomWidth: 1 },
  legendTitle: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  badgeChip:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  playerRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  rank:        { fontSize: 18, fontWeight: '900', width: 36, textAlign: 'center' },
  playerName:  { fontSize: 14, fontWeight: '700' },
});
