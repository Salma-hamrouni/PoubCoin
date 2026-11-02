import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAdmin } from '../../context/AdminContext';
import { useAdminPrefs } from '../../context/AdminPrefsContext';
import { colors, radius, shadow } from '../../theme';

const MENU_SECTIONS = [
  {
    title: 'INTELLIGENCE ARTIFICIELLE',
    items: [
      { icon: 'chatbubble-ellipses',  label: 'Assistant IA',            sub: 'Posez des questions sur la ville',          screen: 'AdminAIChat',       color: '#7C3AED', bg: '#EDE9FE' },
      { icon: 'analytics-outline',    label: 'Prédiction zones risque', sub: 'Zones à risque de pollution élevé',         screen: 'AdminFraud',        color: '#DC2626', bg: '#FEF2F2' },
    ],
  },
  {
    title: 'TABLEAU DE BORD',
    items: [
      { icon: 'map-outline',          label: 'Carte géospatiale',       sub: 'Heatmap et zones critiques',                screen: 'AdminMap',          color: '#0369A1', bg: '#E0F2FE' },
      { icon: 'leaf-outline',         label: 'Impact environnemental',  sub: 'CO₂, arbres, déchets recyclables',          screen: 'AdminEnvironment',  color: '#15803D', bg: '#DCFCE7' },
      { icon: 'star-outline',         label: 'Score des quartiers',     sub: 'Classement écologique par zone',            screen: 'AdminNeighborhood', color: '#CA8A04', bg: '#FEF9C3' },
      { icon: 'people-outline',       label: 'Score citoyens',          sub: 'Réputation et classement des citoyens',     screen: 'AdminCitizenScores',color: '#0369A1', bg: '#E0F2FE' },
    ],
  },
  {
    title: 'ACTIVITÉ & RAPPORTS',
    items: [
      { icon: 'time-outline',         label: 'Timeline temps réel',     sub: 'Flux d\'activité de la ville',              screen: 'AdminTimeline',     color: '#0891B2', bg: '#CFFAFE' },
      { icon: 'play-circle-outline',  label: 'Replay mensuel',          sub: 'Animation évolution de la ville',           screen: 'AdminReplay',       color: '#7C3AED', bg: '#EDE9FE' },
      { icon: 'document-text-outline',label: 'Export PDF',              sub: 'Générer des rapports automatiques',         screen: 'AdminReportExport', color: '#DC2626', bg: '#FEF2F2' },
      { icon: 'bar-chart-outline',    label: 'Statistiques',            sub: 'Analyses détaillées et graphiques',         screen: 'AdminStats',        color: '#15803D', bg: '#DCFCE7' },
    ],
  },
  {
    title: 'TERRAIN',
    items: [
      { icon: 'qr-code-outline',  label: 'Scanner QR',   sub: 'Valider un dépôt citoyen sur le terrain', screen: 'AdminQRScan', color: '#15803D', bg: '#DCFCE7' },
    ],
  },
  {
    title: 'TECHNOLOGIE',
    items: [
      { icon: 'airplane-outline',      label: 'Module Drone',           sub: 'Détection IA zones depuis images aériennes', screen: 'AdminDrone',          color: '#0F172A', bg: '#F1F5F9' },
      { icon: 'business-outline',      label: 'Multi-municipalités',    sub: 'Gérer plusieurs villes depuis un compte',    screen: 'AdminMunicipalities', color: '#0369A1', bg: '#E0F2FE' },
      { icon: 'grid-outline',          label: 'Dashboard Generator',    sub: 'Connecté à votre API de tableaux de bord',   screen: 'AdminDashboardAPI',   color: '#6366F1', bg: '#EEF2FF' },
    ],
  },
  {
    title: 'GESTION',
    items: [
      { icon: 'hammer-outline',        label: 'Enchères',                sub: 'Créer et gérer les enchères de récompenses', screen: 'AdminAuctions',     color: '#6D28D9', bg: '#EDE9FE' },
      { icon: 'shield-checkmark-outline', label: 'Admins municipalités',  sub: 'Créer, modifier, supprimer les admins',      screen: 'AdminMunAdmins',    color: '#1B1464', bg: '#E0E7FF' },
      { icon: 'notifications-outline',label: 'Notifications',           sub: 'Envoyer des messages push aux citoyens',    screen: 'AdminNotifications',color: '#7C3AED', bg: '#EDE9FE' },
      { icon: 'megaphone-outline',    label: 'Campagnes push',          sub: 'Campagnes ciblées aux citoyens',            screen: 'AdminCampaigns',    color: '#7C3AED', bg: '#EDE9FE' },
      { icon: 'trophy-outline',       label: 'Défis citoyens',          sub: 'Créer et gérer les défis',                  screen: 'AdminChallenges',   color: '#B45309', bg: '#FEF3C7' },
      { icon: 'trophy-outline',       label: 'Équipes & Ligues',        sub: 'Gérer les équipes et zones de vote',        screen: 'AdminTeams',        color: '#B45309', bg: '#FEF3C7' },
      { icon: 'settings-outline',     label: 'Paramètres',             sub: 'Configuration de la municipalité',          screen: 'AdminSettings',     color: colors.textSecondary, bg: colors.background },
    ],
  },
];

export default function AdminMoreScreen({ navigation }: any) {
  const { reports, users, challenges } = useAdmin();
  const { showMoreStats, accentColor } = useAdminPrefs();

  const badges: Record<string, number | string> = {
    AdminMap:    reports.filter(r => r.status === 'pending').length || '',
    AdminChallenges: challenges.filter(c => !c.active).length || '',
  };

  return (
    <SafeAreaView style={s.root}>
      <LinearGradient colors={[accentColor + 'DD', accentColor]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}>
        <View style={{ position: 'absolute', top: -30, right: 40, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.04)' }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: 2 }}>ADMINISTRATION</Text>
            <Text style={{ fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.5, marginTop: 2 }}>Outils & Gestion</Text>
          </View>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#4ADE80' }}>{users.length}</Text>
            <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginTop: 1 }}>citoyens</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 80 }}>
        {/* Quick stat chips — hidden when showMoreStats is off */}
        {showMoreStats && <View style={s.quickChipsRow}>
          {(() => {
            const now = new Date();
            const monthStr = now.toISOString().slice(0, 7);
            const toIso = (r: any): string => {
              const ts = r.createdAt ?? r.date;
              if (!ts) return '';
              if (typeof ts === 'string') return ts;
              if (typeof ts.toDate === 'function') return ts.toDate().toISOString();
              if (ts.seconds != null) return new Date(ts.seconds * 1000).toISOString();
              return '';
            };
            const thisMonthReports = reports.filter(r => toIso(r).slice(0, 7) === monthStr).length;
            const todayStr = now.toISOString().slice(0, 10);
            const validatedToday = reports.filter(r =>
              r.status === 'validated' && toIso(r).slice(0, 10) === todayStr
            ).length;
            const activeCount = users.filter(u => !u.blocked).length;
            return [
              { emoji: '🌍', value: thisMonthReports, label: 'signalements ce mois', color: colors.primary, bg: colors.primaryGhost },
              { emoji: '🏆', value: activeCount,       label: 'citoyens actifs',      color: '#15803D',       bg: '#DCFCE7' },
              { emoji: '⭐', value: validatedToday,    label: 'validations auj.',     color: '#B45309',       bg: '#FEF3C7' },
            ].map(chip => (
              <View key={chip.label} style={[s.quickChip, { backgroundColor: chip.bg }]}>
                <Text style={s.quickChipEmoji}>{chip.emoji}</Text>
                <Text style={[s.quickChipVal, { color: chip.color }]}>{chip.value}</Text>
                <Text style={s.quickChipLabel}>{chip.label}</Text>
              </View>
            ));
          })()}
        </View>}

        {MENU_SECTIONS.map(section => (
          <View key={section.title}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, marginTop: 4 }}>
              <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: accentColor }} />
              <Text style={s.sectionLabel}>{section.title}</Text>
            </View>
            {section.items.map(item => {
              const badge = badges[item.screen];
              return (
                <TouchableOpacity
                  key={item.screen}
                  style={s.menuCard}
                  onPress={() => navigation.navigate(item.screen)}
                  activeOpacity={0.75}
                >
                  <View style={[s.menuIcon, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon as any} size={22} color={item.color} />
                  </View>
                  <View style={s.menuBody}>
                    <Text style={s.menuLabel}>{item.label}</Text>
                    <Text style={s.menuSub}>{item.sub}</Text>
                  </View>
                  {!!badge && (
                    <View style={s.badge}>
                      <Text style={s.badgeText}>{badge}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Quick stats summary */}
        <View style={s.summaryCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <Ionicons name="stats-chart" size={14} color={colors.primary} />
            <Text style={s.summaryTitle}>Résumé global</Text>
          </View>
          <View style={s.summaryGrid}>
            {[
              { label: 'En attente', value: reports.filter(r => r.status === 'pending').length,   color: '#B45309', icon: 'time-outline',      bg: '#FEF3C7' },
              { label: 'Validés',    value: reports.filter(r => r.status === 'validated').length, color: '#15803D', icon: 'checkmark-circle',   bg: '#DCFCE7' },
              { label: 'Défis',      value: challenges.filter(c => c.active).length,              color: colors.primary, icon: 'trophy-outline', bg: colors.primaryGhost },
              { label: 'Citoyens',   value: users.length,                                         color: '#7C3AED', icon: 'people-outline',     bg: '#EDE9FE' },
            ].map(stat => (
              <View key={stat.label} style={s.summaryItem}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: stat.bg, justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
                  <Ionicons name={stat.icon as any} size={16} color={stat.color} />
                </View>
                <Text style={[s.summaryVal, { color: stat.color }]}>{stat.value}</Text>
                <Text style={s.summaryLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.surface, paddingHorizontal: 20, paddingVertical: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: colors.border, ...shadow.sm,
  },
  headerLabel: { fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  headerStats: { alignItems: 'flex-end' },
  headerStatVal: { fontSize: 22, fontWeight: '700', color: colors.primary },
  headerStatLabel: { fontSize: 11, color: colors.textMuted },
  quickChipsRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  quickChip: {
    flex: 1, alignItems: 'center', borderRadius: radius.sm, padding: 10,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
  },
  quickChipEmoji: { fontSize: 18, marginBottom: 4 },
  quickChipVal: { fontSize: 20, fontWeight: '700' },
  quickChipLabel: { fontSize: 10, color: colors.textMuted, textAlign: 'center', marginTop: 2 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1 },
  menuCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
    borderWidth: 1, borderColor: colors.border, ...shadow.xs,
  },
  menuIcon: { width: 46, height: 46, borderRadius: radius.sm, justifyContent: 'center', alignItems: 'center' },
  menuBody: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  menuSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  badge: {
    backgroundColor: '#EF4444', borderRadius: 10,
    minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  summaryCard: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: 16,
    borderWidth: 1, borderColor: colors.border, ...shadow.xs, marginTop: 6,
  },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 14 },
  summaryGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { alignItems: 'center' },
  summaryVal: { fontSize: 24, fontWeight: '700' },
  summaryLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
});
