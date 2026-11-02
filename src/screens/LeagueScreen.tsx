import React from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';

const LEAGUES = [
  { name: 'Bronze',  icon: '🥉', minScore: 0,   maxScore: 99,       color: '#CD7F32', bg: '#FFF3E0' },
  { name: 'Argent',  icon: '🥈', minScore: 100, maxScore: 299,      color: '#9E9E9E', bg: '#F5F5F5' },
  { name: 'Or',      icon: '🥇', minScore: 300, maxScore: 699,      color: '#FFC107', bg: '#FFF8E1' },
  { name: 'Diamant', icon: '💎', minScore: 700, maxScore: Infinity, color: '#2196F3', bg: '#E3F2FD' },
];

const REWARDS = [
  { league: 'Bronze',  reward: '+50 coins bonus' },
  { league: 'Argent',  reward: '+150 coins + badge spécial' },
  { league: 'Or',      reward: '+400 coins + réduction partenaire' },
  { league: 'Diamant', reward: '+1000 coins + accès VIP' },
];

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

export default function LeagueScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { balance } = useWallet();

  const score = balance;
  const currentLeague = [...LEAGUES].reverse().find(l => score >= l.minScore) ?? LEAGUES[0];
  const leagueIndex = LEAGUES.indexOf(currentLeague);
  const nextLeague = LEAGUES[leagueIndex + 1];

  const progressPct = nextLeague
    ? Math.min(((score - currentLeague.minScore) / (nextLeague.minScore - currentLeague.minScore)) * 100, 100)
    : 100;

  const now = new Date();
  const seasonLabel = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Ligues & Saisons</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Current league badge */}
        <View style={[styles.currentLeagueCard, { backgroundColor: currentLeague.bg, borderColor: currentLeague.color + '60' }]}>
          <Text style={styles.currentLeagueIcon}>{currentLeague.icon}</Text>
          <Text style={[styles.currentLeagueName, { color: currentLeague.color }]}>{currentLeague.name}</Text>
          <Text style={styles.currentLeagueScore}>{score} coins</Text>

          {/* Progress bar */}
          <View style={styles.progressWrapper}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPct}%` as any, backgroundColor: currentLeague.color }]} />
            </View>
            {nextLeague ? (
              <Text style={styles.progressLabel}>
                {score} / {nextLeague.minScore} → {nextLeague.icon} {nextLeague.name}
              </Text>
            ) : (
              <Text style={styles.progressLabel}>Rang maximum atteint !</Text>
            )}
          </View>

          {/* Season chip */}
          <View style={[styles.seasonChip, { borderColor: currentLeague.color + '50' }]}>
            <Ionicons name="calendar-outline" size={13} color={currentLeague.color} />
            <Text style={[styles.seasonText, { color: currentLeague.color }]}>Saison actuelle : {seasonLabel}</Text>
          </View>
        </View>

        {/* All leagues */}
        <Text style={styles.sectionTitle}>Toutes les ligues</Text>
        <View style={styles.leaguesList}>
          {LEAGUES.map((league, i) => {
            const isCurrent = league.name === currentLeague.name;
            return (
              <View
                key={league.name}
                style={[
                  styles.leagueRow,
                  isCurrent && { borderColor: league.color, backgroundColor: league.bg },
                  i < LEAGUES.length - 1 && styles.leagueDivider,
                ]}
              >
                <Text style={styles.leagueRowIcon}>{league.icon}</Text>
                <View style={styles.leagueRowInfo}>
                  <Text style={[styles.leagueRowName, isCurrent && { color: league.color }]}>{league.name}</Text>
                  <Text style={styles.leagueRowReq}>
                    {league.maxScore === Infinity
                      ? `${league.minScore}+ coins`
                      : `${league.minScore} – ${league.maxScore} coins`}
                  </Text>
                </View>
                {isCurrent && (
                  <View style={[styles.currentBadge, { backgroundColor: league.color }]}>
                    <Text style={styles.currentBadgeText}>Actuel</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Season rewards */}
        <Text style={styles.sectionTitle}>Récompenses de fin de saison</Text>
        <View style={styles.rewardsCard}>
          {REWARDS.map((r, i) => {
            const league = LEAGUES.find(l => l.name === r.league)!;
            return (
              <View key={r.league} style={[styles.rewardRow, i < REWARDS.length - 1 && styles.rewardDivider]}>
                <Text style={styles.rewardIcon}>{league.icon}</Text>
                <View style={styles.rewardInfo}>
                  <Text style={[styles.rewardLeague, { color: league.color }]}>{r.league}</Text>
                  <Text style={styles.rewardText}>{r.reward}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any): any => ({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 40 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },

  currentLeagueCard: {
    margin: 16, borderRadius: 20, padding: 24, alignItems: 'center',
    borderWidth: 1.5,
  },
  currentLeagueIcon: { fontSize: 64, marginBottom: 8 },
  currentLeagueName: { fontSize: 28, fontWeight: '900', marginBottom: 4 },
  currentLeagueScore: { fontSize: 16, color: colors.textSecondary, fontWeight: '600', marginBottom: 16 },

  progressWrapper: { width: '100%', gap: 8, marginBottom: 16 },
  progressTrack: { height: 8, backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressLabel: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', fontWeight: '600' },

  seasonChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.5)',
  },
  seasonText: { fontSize: 13, fontWeight: '700' },

  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginHorizontal: 16, marginTop: 16, marginBottom: 8,
  },

  leaguesList: {
    marginHorizontal: 16, backgroundColor: colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  leagueRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1.5,
    borderColor: 'transparent', borderRadius: 0,
  },
  leagueDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  leagueRowIcon: { fontSize: 28 },
  leagueRowInfo: { flex: 1 },
  leagueRowName: { fontSize: 15, fontWeight: '700', color: colors.text },
  leagueRowReq: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  currentBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  currentBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  rewardsCard: {
    marginHorizontal: 16, backgroundColor: colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  rewardRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rewardDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rewardIcon: { fontSize: 26 },
  rewardInfo: { flex: 1 },
  rewardLeague: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  rewardText: { fontSize: 13, color: colors.textSecondary },
});
