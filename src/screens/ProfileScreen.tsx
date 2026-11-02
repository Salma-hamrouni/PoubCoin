import React, { useState, useMemo } from 'react';
import { getLevel, getLevelProgress, getNextLevel, xpFromReports } from '../utils/xp';
import {
  View, Text, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Alert, Modal, Switch, Linking, Share, ActivityIndicator, RefreshControl,
  FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import { MUNICIPALITIES as ALL_MUNICIPALITIES } from '../data/municipalities';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useT } from '../i18n/useT';
import { shadow, radius } from '../theme';
import { hapticLight, hapticMedium, hapticSuccess, hapticError } from '../utils/haptics';
import { useToast } from '../context/ToastContext';
import SwipeDismiss from '../components/SwipeDismiss';

const MUNICIPALITIES = [
  // Tunis
  'Tunis', 'Le Bardo', 'La Goulette', 'Le Kram', 'Carthage', 'Sidi Bou Saïd',
  // Ariana
  'Ariana', 'Raoued', 'La Soukra', 'Mnihla',
  // Ben Arous
  'Ben Arous', 'Radès', 'Hammam Lif', 'Hammam Chott', 'Ezzahra', 'Mégrine', 'Mornag',
  // Manouba
  'Manouba', 'Douar Hicher', 'Oued Ellil',
  // Nabeul
  'Nabeul', 'Hammamet', 'Kelibia', 'Korba', 'Menzel Temime',
  // Sousse
  'Sousse', 'Akouda', 'Kalaa Kebira', 'Msaken',
  // Monastir
  'Monastir', 'Jemmal', 'Ksar Hellal',
  // Mahdia
  'Mahdia', 'Chebba',
  // Sfax
  'Sfax', 'Sakiet Ezzit', 'Sakiet Eddaier',
  // Kairouan
  'Kairouan', 'Hajeb El Ayoun',
  // Bizerte
  'Bizerte', 'Menzel Bourguiba', 'Ras Jebel',
  // Autres gouvernorats
  'Béja', 'Jendouba', 'Le Kef', 'Siliana', 'Kasserine',
  'Sidi Bouzid', 'Gabès', 'Médenine', 'Tataouine', 'Tozeur', 'Kébili', 'Gafsa',
];

const LEVELS_BASE_PROFILE = [
  { key: 'level_beginner' as const, min: 0,   max: 2,        icon: '🌱', color: '#795548' },
  { key: 'level_citizen'  as const, min: 3,   max: 9,        icon: '🌿', color: '#388E3C' },
  { key: 'level_eco'      as const, min: 10,  max: 24,       icon: '🌳', color: '#1976D2' },
  { key: 'level_champion' as const, min: 25,  max: 99,       icon: '🏆', color: '#F57F17' },
  { key: 'level_legend'   as const, min: 100, max: Infinity, icon: '⭐', color: '#6A1B9A' },
];

const AVATARS = ['🌱', '🌿', '🌳', '🦺', '♻️', '🌍', '🧹', '💚', '🐢', '🍃', '🌻', '🦋'];

const CITY_STAGES = [
  { min: 0,   emoji: '🏚️', label: 'Ville abandonnée', desc: 'La ville a besoin de toi...', bg: '#F1F5F9', textColor: '#64748B' },
  { min: 3,   emoji: '🌫️', label: 'Ville polluée',    desc: 'Des efforts mais beaucoup à faire', bg: '#FEF3C7', textColor: '#B45309' },
  { min: 10,  emoji: '🏘️', label: 'Quartier propre',  desc: 'Tes signalements font la différence !', bg: '#DCFCE7', textColor: '#15803D' },
  { min: 25,  emoji: '🌆', label: 'Ville verte',       desc: 'Une ville dont tu es fier !', bg: '#DBEAFE', textColor: '#1D4ED8' },
  { min: 100, emoji: '🏙️', label: 'Éco-Métropole',    desc: '🌟 Légende verte de Tunis !', bg: '#EDE9FE', textColor: '#7C3AED' },
];

interface SettingItem {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  sublabel?: string;
  right?: 'arrow' | 'toggle' | 'value';
  value?: string;
  toggleKey?: keyof typeof DEFAULT_SETTINGS;
  onPress?: () => void;
}

const DEFAULT_SETTINGS = {
  notifValidation: true,
  notifRewards: true,
  notifNews: false,
  locationAlways: false,
};

export default function ProfileScreen({ navigation }: any) {
  const { colors, isDark, toggleTheme, customPrimary, setCustomPrimary } = useTheme();
  const t = useT();
  const styles = getStyles(colors);
  const { balance, reports } = useWallet();
  const { user, logout, updateProfile } = useAuth();
  const { showToast } = useToast();

  const [refreshing, setRefreshing]   = useState(false);
  const [editModal, setEditModal]     = useState(false);
  const [avatarModal, setAvatarModal] = useState(false);
  const [aboutModal, setAboutModal]   = useState(false);
  const [helpModal, setHelpModal]     = useState(false);
  const [contactModal, setContactModal] = useState(false);
  const [privacyModal, setPrivacyModal] = useState(false);
  const [termsModal, setTermsModal]   = useState(false);
  const [ratingModal, setRatingModal] = useState(false);
  const [colorModal, setColorModal] = useState(false);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingDone, setRatingDone]   = useState(false);
  const [logoutModal, setLogoutModal]     = useState(false);
  const [deleteModal, setDeleteModal]     = useState(false);
  const [inviteModal, setInviteModal]     = useState(false);
  const [muniModal, setMuniModal]         = useState(false);
  const [editName, setEditName]       = useState(user?.name ?? '');
  const [editCity, setEditCity]       = useState(user?.city ?? '');
  const [editPhone, setEditPhone]     = useState(user?.phone ?? '');
  const [settings, setSettings]       = useState(DEFAULT_SETTINGS);
  const [cityPickerModal, setCityPickerModal] = useState(false);
  const [citySearch, setCitySearch]           = useState('');
  const [saving, setSaving]                   = useState(false);
  const [editError, setEditError]             = useState('');

  const [photoLoading, setPhotoLoading] = useState(false);

  const pickPhoto = async (source: 'camera' | 'gallery') => {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (perm.status !== 'granted') { Alert.alert('Permission refusée', 'Accès caméra requis.'); return; }
        result = await ImagePicker.launchCameraAsync({ quality: 0.4, base64: true, allowsEditing: true, aspect: [1, 1] });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm.status !== 'granted') { Alert.alert('Permission refusée', 'Accès galerie requis.'); return; }
        result = await ImagePicker.launchImageLibraryAsync({ quality: 0.4, base64: true, allowsEditing: true, aspect: [1, 1] });
      }
      if (result.canceled || !result.assets?.[0]) return;
      setPhotoLoading(true);
      const asset = result.assets[0];
      const photoURL = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;
      await updateProfile({ photoURL });
      setAvatarModal(false);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de changer la photo.');
    } finally {
      setPhotoLoading(false);
    }
  };

  const referralCode = `PC-${(user?.id ?? 'GUEST').slice(0, 6).toUpperCase()}`;

  const shareScore = () => Share.share({
    message: `🌿 ${user?.name ?? 'Citoyen'} sur PoubCoin !\n\n📊 ${validated} signalements validés · ${balance} 🪙\n🏆 Niveau ${currentLevel.icon} ${currentLevel.name}\n\n♻️ Rejoins-moi et protège ton quartier ! https://poubcoin.tn`,
    title: 'Mes stats PoubCoin',
  });

  const shareInvite = () => Share.share({
    message: `🌍 Rejoins PoubCoin et gagne des récompenses en signalant des déchets ! Utilise mon code ${referralCode} pour débuter avec 50 PoubCoins bonus. Télécharge l'app : https://poubcoin.tn`,
    title: 'Inviter un ami sur PoubCoin',
  });

  const openEmail = () => Linking.openURL('mailto:support@poubcoin.tn?subject=Demande%20de%20support');
  const openRating = () => { setRatingStars(0); setRatingDone(false); setRatingModal(true); };

  const confirmDeleteAccount = () => setDeleteModal(true);

  const validated  = reports.filter(r => r.status === 'validated').length;
  const pending    = reports.filter(r => r.status === 'pending').length;
  const { balance: totalCoins } = useWallet();
  const LEVELS     = LEVELS_BASE_PROFILE.map(l => ({ ...l, name: t(l.key) }));
  const currentLevel = LEVELS.find(l => validated >= l.min && validated <= l.max) ?? LEVELS[0];
  const nextLevel    = LEVELS[LEVELS.indexOf(currentLevel) + 1];
  const progressPct  = nextLevel
    ? ((validated - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100
    : 100;

  const xp      = useMemo(() => xpFromReports(validated, pending), [validated, pending]);
  const xpLevel = useMemo(() => getLevel(xp), [xp]);
  const xpNext  = useMemo(() => getNextLevel(xp), [xp]);
  const xpPct   = useMemo(() => getLevelProgress(xp), [xp]);

  const toggle = (key: keyof typeof DEFAULT_SETTINGS) =>
    setSettings(s => ({ ...s, [key]: !s[key] }));

  const saveEdit = async () => {
    setEditError('');
    if (!editName.trim()) { hapticError(); setEditError('Le nom est obligatoire'); return; }
    setSaving(true);
    try {
      await updateProfile({ name: editName.trim(), city: editCity.trim(), phone: editPhone.trim() });
      hapticSuccess();
      showToast({ message: 'Profil mis à jour avec succès', type: 'success' });
      setEditModal(false);
    } catch {
      hapticError();
      setEditError('Impossible de sauvegarder. Réessayez.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => setLogoutModal(true);

  const SETTINGS_SECTIONS: { title: string; items: SettingItem[] }[] = [
    {
      title: t('profile_section_notif'),
      items: [
        { icon: 'checkmark-circle', iconBg: '#E8F5E9', iconColor: colors.success, label: t('profile_notif_validated'), sublabel: t('profile_notif_validated_sub'), right: 'toggle', toggleKey: 'notifValidation' },
        { icon: 'gift',             iconBg: '#F3E5F5', iconColor: '#9C27B0',       label: t('profile_notif_rewards'),   sublabel: t('profile_notif_rewards_sub'),   right: 'toggle', toggleKey: 'notifRewards' },
        { icon: 'megaphone',        iconBg: '#E3F2FD', iconColor: colors.info,     label: t('profile_notif_news'),      sublabel: t('profile_notif_news_sub'),      right: 'toggle', toggleKey: 'notifNews' },
        { icon: 'settings',         iconBg: '#F5F5F5', iconColor: '#6B7280',       label: t('profile_notif_advanced'),  sublabel: t('profile_notif_advanced_sub'),  right: 'arrow', onPress: () => navigation.navigate('NotificationSettings') },
      ],
    },
    {
      title: t('profile_section_privacy'),
      items: [
        { icon: 'location',      iconBg: '#FFF3E0', iconColor: colors.warning, label: t('profile_privacy_location'), sublabel: t('profile_privacy_location_sub'), right: 'toggle', toggleKey: 'locationAlways' },
        { icon: 'shield',        iconBg: '#E8F5E9', iconColor: colors.primary, label: t('profile_privacy_policy'),   right: 'arrow', onPress: () => setPrivacyModal(true) },
        { icon: 'document-text', iconBg: '#E3F2FD', iconColor: colors.info,   label: t('profile_privacy_terms'),    right: 'arrow', onPress: () => setTermsModal(true) },
        { icon: 'trash',         iconBg: '#FFEBEE', iconColor: colors.error,   label: t('profile_delete_account'),   right: 'arrow', onPress: confirmDeleteAccount },
      ],
    },
    {
      title: t('profile_section_app'),
      items: [
        { icon: 'color-palette-outline', iconBg: '#F0FDF4', iconColor: '#16A34A',      label: t('profile_app_appearance'), right: 'arrow', onPress: () => (navigation as any).navigate('Personalize') },
        { icon: 'help-circle',           iconBg: '#E3F2FD', iconColor: colors.info,    label: t('profile_app_help'),       right: 'arrow', onPress: () => setHelpModal(true) },
        { icon: 'chatbubble-ellipses',   iconBg: '#F3E5F5', iconColor: '#9C27B0',      label: t('profile_app_contact'),    right: 'arrow', onPress: () => setContactModal(true) },
        { icon: 'star',                  iconBg: '#FFF8E1', iconColor: '#F57F17',      label: t('profile_app_rate'),       right: 'arrow', onPress: openRating },
        { icon: 'information-circle',    iconBg: '#E8F5E9', iconColor: colors.primary, label: t('profile_app_about'),      right: 'value', value: 'v1.0.0', onPress: () => setAboutModal(true) },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[colors.primaryDark, colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
        <View>
          <Text style={[styles.title, { color: '#fff' }]}>{t('profile_title')}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 1 }}>{user?.email ?? ''}</Text>
        </View>
        <TouchableOpacity style={[styles.editHeaderBtn, { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.2)' }]} onPress={() => { setEditName(user?.name ?? ''); setEditCity(user?.city ?? ''); setEditPhone(user?.phone ?? ''); setEditModal(true); }}>
          <Ionicons name="create-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); }}
          colors={[colors.primary, colors.primaryLight]}
          tintColor={colors.primary}
          progressBackgroundColor={colors.surface}
          title="Mise à jour..."
          titleColor={colors.textMuted}
        />
      }>
        {/* Profile card */}
        <View style={styles.profileCard}>
          {/* Gradient banner — color from personalization */}
          <LinearGradient
            colors={[
              (user?.bannerColor as string) ?? '#0D4A27',
              (user?.bannerColor as string) ?? '#1B6B3A',
              (user?.bannerColor as string) ?? '#2E8B57',
            ]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.profileBanner}
          >
            <View style={styles.profileBannerCircle1} />
            <View style={styles.profileBannerCircle2} />
          </LinearGradient>

          {/* Avatar (overlapping banner) */}
          <View style={styles.avatarOuter}>
            <TouchableOpacity onPress={() => setAvatarModal(true)} style={styles.avatarWrapper}>
              <View style={[styles.avatar, { borderColor: '#fff' }]}>
                {photoLoading ? (
                  <ActivityIndicator color={currentLevel.color} />
                ) : user?.photoURL ? (
                  <Image source={{ uri: user.photoURL }} style={{ width: '100%', height: '100%', borderRadius: 40 }} contentFit="cover" transition={200} />
                ) : (
                  <Text style={styles.avatarEmoji}>{user?.avatar ?? '🌱'}</Text>
                )}
              </View>
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={11} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.profileCardBody}>
            <Text style={styles.name}>{user?.name ?? 'Citoyen'}</Text>
            <View style={[styles.levelBadge, { backgroundColor: currentLevel.color + '18', borderColor: currentLevel.color + '30' }]}>
              <Text style={styles.levelIcon}>{currentLevel.icon}</Text>
              <Text style={[styles.levelText, { color: currentLevel.color }]}>{currentLevel.name}</Text>
            </View>

            {/* XP badge */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingHorizontal: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: xpLevel.color + '18', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: xpLevel.color + '30' }}>
                <Text style={{ fontSize: 14 }}>{xpLevel.emoji}</Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: xpLevel.color }}>{xpLevel.title}</Text>
                <Text style={{ fontSize: 11, color: xpLevel.color + 'AA', fontWeight: '600' }}>· Niv.{xpLevel.level}</Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted }}>{xp} XP</Text>
            </View>

            {/* XP progress bar */}
            {xpNext && (
              <View style={{ marginTop: 10, paddingHorizontal: 4, width: '100%' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>Vers {xpNext.emoji} {xpNext.title}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: xpLevel.color }}>{Math.round(xpPct * 100)}%</Text>
                </View>
                <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${Math.round(xpPct * 100)}%` as any, backgroundColor: xpLevel.color, borderRadius: 3 }} />
                </View>
                <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 3 }}>
                  {xpNext.minXP - xp} XP pour le prochain niveau
                </Text>
              </View>
            )}

            {/* Info pills */}
            <View style={styles.infoPills}>
              <View style={styles.infoPill}>
                <Ionicons name="mail-outline" size={13} color={colors.textSecondary} />
                <Text style={styles.infoPillText} numberOfLines={1}>{user?.email}</Text>
              </View>
              {user?.phone ? (
                <View style={styles.infoPill}>
                  <Ionicons name="call-outline" size={13} color={colors.textSecondary} />
                  <Text style={styles.infoPillText}>{user.phone}</Text>
                </View>
              ) : null}
              {user?.city ? (
                <View style={styles.infoPill}>
                  <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                  <Text style={styles.infoPillText}>{user.city}</Text>
                </View>
              ) : null}
            </View>

            {/* Progress bar */}
            {nextLevel && (
              <View style={styles.progressBox}>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressNext}>Vers {nextLevel.icon} {nextLevel.name}</Text>
                  <Text style={styles.progressCount}>{validated} / {nextLevel.min} signalements</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.min(progressPct, 100)}%`, backgroundColor: currentLevel.color }]} />
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          {[
            { label: t('profile_reports'),   value: reports.length, icon: 'camera',           color: colors.info,    bg: '#EFF6FF' },
            { label: t('profile_validated'), value: validated,      icon: 'checkmark-circle', color: colors.success, bg: '#F0FDF4' },
            { label: t('profile_coins'),     value: totalCoins,     icon: 'cash',             color: colors.gold,    bg: '#FFFBEB' },
            { label: t('profile_balance'),   value: balance,        icon: 'wallet',           color: '#9C27B0',      bg: '#FAF5FF' },
          ].map(s => (
            <View key={s.icon} style={[styles.statCard, { backgroundColor: s.bg, borderColor: s.color + '30', borderTopColor: s.color }]}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '20' }]}>
                <Ionicons name={s.icon as any} size={20} color={s.color} />
              </View>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Avatar écologique */}
        {(() => {
          const stage = [...CITY_STAGES].reverse().find(s => validated >= s.min) ?? CITY_STAGES[0];
          const nextStage = CITY_STAGES[CITY_STAGES.indexOf(stage) + 1];
          const pct = nextStage ? Math.round(((validated - stage.min) / (nextStage.min - stage.min)) * 100) : 100;
          return (
            <View style={styles.avatarEcoCard}>
              <LinearGradient colors={[colors.primaryDark, colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatarEcoGradient}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: stage.textColor }} />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: 1.5 }}>TON UNIVERS</Text>
                </View>
                {/* Emoji + label */}
                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                  <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
                    <Text style={{ fontSize: 52 }}>{stage.emoji}</Text>
                  </View>
                  <Text style={[styles.avatarEcoLabel, { color: '#fff' }]}>{stage.label}</Text>
                  <Text style={[styles.avatarEcoDesc, { color: 'rgba(255,255,255,0.55)' }]}>{stage.desc}</Text>
                </View>
                {/* Progress */}
                {nextStage && (
                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' }}>→ {nextStage.emoji} {nextStage.label}</Text>
                      <Text style={{ color: stage.textColor, fontSize: 12, fontWeight: '800' }}>{pct}%</Text>
                    </View>
                    <View style={[styles.avatarEcoTrack, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
                      <View style={[styles.avatarEcoFill, { width: `${pct}%` as any, backgroundColor: stage.textColor }]} />
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 6, textAlign: 'center' }}>
                      {nextStage.min - validated} signalement{nextStage.min - validated > 1 ? 's' : ''} validés pour débloquer
                    </Text>
                  </View>
                )}
                {!nextStage && (
                  <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                    <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: 14 }}>{t('level_max')}</Text>
                  </View>
                )}
              </LinearGradient>
            </View>
          );
        })()}

        {/* Badges — grille 4 colonnes */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 8, marginBottom: 10 }}>
          <Text style={styles.sectionTitle}>{t('profile_badges')}</Text>
          <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>
            {[reports.length >= 1, reports.length >= 5, reports.length >= 10, validated >= 10, validated >= 25, false, validated >= 100].filter(Boolean).length} / 7 débloqués
          </Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 12, gap: 8, marginBottom: 8 }}>
          {[
            { emoji: '🌱', name: t('profile_badge_first'),    unlocked: reports.length >= 1,  condition: '1 signalement' },
            { emoji: '📸', name: t('profile_badge_5photos'),  unlocked: reports.length >= 5,  condition: '5 signalements' },
            { emoji: '🔟', name: t('profile_badge_10'),       unlocked: reports.length >= 10, condition: '10 signalements' },
            { emoji: '💚', name: t('profile_badge_eco'),      unlocked: validated >= 10,       condition: '10 validés' },
            { emoji: '🏆', name: t('profile_badge_champion'), unlocked: validated >= 25,       condition: '25 validés' },
            { emoji: '♻️', name: t('profile_badge_recycler'), unlocked: false,                 condition: 'Bientôt' },
            { emoji: '⭐', name: t('profile_badge_legend'),   unlocked: validated >= 100,      condition: '100 validés' },
          ].map(badge => (
            <TouchableOpacity
              key={badge.name}
              onPress={() => hapticLight()}
              activeOpacity={0.8}
              style={[{
                width: '22%',
                flexGrow: 1,
                borderRadius: 14,
                padding: 12,
                alignItems: 'center',
                gap: 6,
                borderWidth: 1.5,
                position: 'relative',
                overflow: 'hidden',
              }, badge.unlocked
                ? { backgroundColor: colors.surface, borderColor: colors.primary + '35', ...shadow.sm }
                : { backgroundColor: colors.background, borderColor: colors.border }
              ]}
            >
              {badge.unlocked && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: colors.primary, borderTopLeftRadius: 14, borderTopRightRadius: 14 }} />
              )}
              <Text style={{ fontSize: 28, opacity: badge.unlocked ? 1 : 0.25 }}>{badge.emoji}</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', textAlign: 'center', color: badge.unlocked ? colors.text : colors.textMuted }} numberOfLines={2}>{badge.name}</Text>
              {badge.unlocked
                ? <View style={{ backgroundColor: colors.primary + '15', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: colors.primary }}>✓ Débloqué</Text>
                  </View>
                : <Text style={{ fontSize: 9, color: colors.textMuted, textAlign: 'center' }}>{badge.condition}</Text>
              }
            </TouchableOpacity>
          ))}
        </View>

        {/* Pro Badge */}
        {(() => {
          const isPro = balance >= 500 || validated >= 20;
          const coinsLeft = Math.max(0, 500 - balance);
          const reportsLeft = Math.max(0, 20 - validated);
          if (isPro) {
            return (
              <View style={styles.proCard}>
                <Text style={styles.proTitle}>{t('profile_pro')}</Text>
                <View style={styles.proPerks}>
                  {[t('profile_pro_perk1'), t('profile_pro_perk2'), t('profile_pro_perk3')].map(p => (
                    <View key={p} style={styles.proPerkRow}>
                      <Ionicons name="checkmark-circle" size={14} color="#F57F17" />
                      <Text style={styles.proPerkText}>{p}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          }
          return (
            <View style={styles.proProgressCard}>
              <Text style={styles.proProgressTitle}>{t('profile_pro_toward')}</Text>
              <Text style={styles.proProgressSub}>
                {coinsLeft > 0 ? `${coinsLeft} coins restants` : ''}{coinsLeft > 0 && reportsLeft > 0 ? ' ou ' : ''}{reportsLeft > 0 ? `${reportsLeft} signalements restants` : ''}
              </Text>
            </View>
          );
        })()}

        {/* Invite + Municipality */}
        <Text style={styles.sectionTitle}>{t('profile_community')}</Text>
        <View style={styles.settingsCard}>
          <TouchableOpacity style={[styles.settingRow, styles.settingDivider]} onPress={shareScore}>
            <View style={[styles.settingIconBox, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="share-social" size={18} color="#1976D2" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Partager mes stats</Text>
              <Text style={styles.settingSub}>{validated} signalements · {balance} 🪙 · {currentLevel.icon} {currentLevel.name}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingRow, styles.settingDivider]} onPress={() => navigation.navigate('AchievementLeaderboard')}>
            <View style={[styles.settingIconBox, { backgroundColor: '#FFF8E1' }]}>
              <Ionicons name="trophy" size={18} color="#F57F17" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('profile_leaderboard')}</Text>
              <Text style={styles.settingSub}>{t('profile_leaderboard_sub')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingRow, styles.settingDivider]} onPress={() => navigation.navigate('Referral')}>
            <View style={[styles.settingIconBox, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="person-add" size={18} color="#F57F17" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('profile_invite')}</Text>
              <Text style={styles.settingSub}>{t('profile_invite_sub')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow} onPress={() => setMuniModal(true)}>
            <View style={[styles.settingIconBox, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="business" size={18} color={colors.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('profile_municipality')}</Text>
              <Text style={styles.settingSub}>{user?.city || t('profile_municipality_placeholder')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Settings sections */}
        {SETTINGS_SECTIONS.map(section => (
          <View key={section.title}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.settingsCard}>
              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.settingRow, i < section.items.length - 1 && styles.settingDivider]}
                  onPress={item.onPress}
                  activeOpacity={item.right === 'toggle' ? 1 : 0.7}
                >
                  <View style={[styles.settingIconBox, { backgroundColor: item.iconBg }]}>
                    <Ionicons name={item.icon as any} size={18} color={item.iconColor} />
                  </View>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>{item.label}</Text>
                    {item.sublabel && <Text style={styles.settingSub}>{item.sublabel}</Text>}
                  </View>
                  {item.right === 'toggle' && (
                    item.toggleKey ? (
                      <Switch
                        value={settings[item.toggleKey]}
                        onValueChange={() => toggle(item.toggleKey!)}
                        trackColor={{ false: '#ddd', true: colors.primary + '80' }}
                        thumbColor={settings[item.toggleKey] ? colors.primary : '#f4f3f4'}
                        ios_backgroundColor="#ddd"
                      />
                    ) : (
                      <Switch
                        value={isDark}
                        onValueChange={toggleTheme}
                        trackColor={{ false: '#ddd', true: '#7C3AED80' }}
                        thumbColor={isDark ? '#A78BFA' : '#f4f3f4'}
                        ios_backgroundColor="#ddd"
                      />
                    )
                  )}
                  {item.right === 'arrow' && (
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  )}
                  {item.right === 'value' && (
                    <View style={styles.valueRow}>
                      <Text style={styles.valueText}>{item.value}</Text>
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <View style={styles.logoutIcon}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
          </View>
          <Text style={styles.logoutText}>{t('profile_logout')}</Text>
        </TouchableOpacity>

        <Text style={styles.version}>PoubCoin v{require('../../package.json').version} · Fait avec 💚 pour la Tunisie</Text>
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editModal} transparent animationType="slide" onShow={() => setEditError('')}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalOverlay}>
            <SwipeDismiss onDismiss={() => { setEditModal(false); setEditError(''); }} style={[styles.modalBox, { maxHeight: '92%' }]}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Modifier le profil</Text>

              {[
                { icon: 'person-outline', placeholder: 'Nom complet', value: editName,  onChange: (v: string) => { setEditName(v); setEditError(''); }  },
                { icon: 'call-outline',   placeholder: 'Téléphone',   value: editPhone, onChange: setEditPhone, keyboardType: 'phone-pad' },
              ].map(f => (
                <View key={f.placeholder} style={[styles.fieldRow, editError && f.placeholder === 'Nom complet' && !editName.trim() && { borderColor: '#EF4444' }]}>
                  <Ionicons name={f.icon as any} size={18} color={editError && f.placeholder === 'Nom complet' && !editName.trim() ? '#EF4444' : colors.textSecondary} />
                  <TextInput
                    style={styles.fieldInput}
                    placeholder={f.placeholder}
                    placeholderTextColor={colors.textMuted}
                    value={f.value}
                    onChangeText={f.onChange}
                    keyboardType={(f as any).keyboardType}
                  />
                </View>
              ))}

              {/* City picker */}
              <TouchableOpacity
                style={[styles.fieldRow, { justifyContent: 'space-between' }]}
                onPress={() => { setCitySearch(''); setCityPickerModal(true); }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.fieldInput, { paddingVertical: 0, color: editCity ? colors.text : colors.textMuted }]}>
                    {editCity || 'Ville'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
              </TouchableOpacity>

              {/* Inline error */}
              {editError ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: '#FECACA', marginTop: 4 }}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={{ fontSize: 13, color: '#DC2626', flex: 1, fontWeight: '600' }}>{editError}</Text>
                </View>
              ) : null}

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditModal(false); setEditError(''); }} disabled={saving}>
                  <Text style={styles.cancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.75 }]} onPress={saveEdit} disabled={saving}>
                  {saving
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Ionicons name="checkmark" size={18} color="#fff" />}
                  <Text style={styles.saveText}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Text>
                </TouchableOpacity>
              </View>
            </SwipeDismiss>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* City Picker Modal */}
      <Modal visible={cityPickerModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '85%' }]}>
            <View style={styles.modalHandle} />
            <View style={[styles.modalHeader, { marginBottom: 12 }]}>
              <View style={[styles.modalHeaderIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="location" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.modalTitle, { marginBottom: 0 }]}>Choisir une ville</Text>
            </View>

            {/* Search */}
            <View style={[styles.fieldRow, { marginBottom: 10 }]}>
              <Ionicons name="search-outline" size={17} color={colors.textMuted} />
              <TextInput
                style={[styles.fieldInput, { paddingVertical: 0 }]}
                placeholder="Rechercher une ville..."
                placeholderTextColor={colors.textMuted}
                value={citySearch}
                onChangeText={setCitySearch}
                autoFocus
              />
              {citySearch.length > 0 && (
                <TouchableOpacity onPress={() => setCitySearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={17} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={ALL_MUNICIPALITIES
                .map(m => m.name)
                .filter((name, idx, arr) => arr.indexOf(name) === idx)
                .sort((a, b) => a.localeCompare(b, 'fr'))
                .filter(name => name.toLowerCase().includes(citySearch.toLowerCase()))
              }
              keyExtractor={item => item}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 380 }}
              renderItem={({ item }) => {
                const isSelected = editCity === item;
                return (
                  <TouchableOpacity
                    style={[styles.muniRow, isSelected && styles.muniRowActive]}
                    onPress={() => {
                      setEditCity(item);
                      hapticLight();
                      setCityPickerModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="location" size={15} color={isSelected ? colors.primary : colors.textMuted} />
                    <Text style={[styles.muniName, isSelected && { color: colors.primary, fontWeight: '700' }]}>
                      {item}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginLeft: 'auto' }} />}
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity style={[styles.cancelBtn, { marginTop: 10 }]} onPress={() => setCityPickerModal(false)}>
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Avatar Modal */}
      <Modal visible={avatarModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '85%' }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Photo de profil</Text>

            {/* Photo buttons */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                onPress={() => pickPhoto('camera')}
              >
                <Ionicons name="camera" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{t('profile_edit_photo_camera')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.sm, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.border }}
                onPress={() => pickPhoto('gallery')}
              >
                <Ionicons name="images" size={18} color={colors.text} />
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>{t('camera_gallery')}</Text>
              </TouchableOpacity>
            </View>

            {/* Remove photo if exists */}
            {user?.photoURL && (
              <TouchableOpacity
                style={{ marginBottom: 16, alignItems: 'center' }}
                onPress={async () => { await updateProfile({ photoURL: '' }); setAvatarModal(false); }}
              >
                <Text style={{ color: '#DC2626', fontSize: 13, fontWeight: '600' }}>{t('profile_edit_photo_delete')}</Text>
              </TouchableOpacity>
            )}

            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 10, letterSpacing: 0.5 }}>OU CHOISIR UN AVATAR</Text>
            <View style={styles.avatarGrid}>
              {AVATARS.map(a => (
                <TouchableOpacity
                  key={a}
                  style={[styles.avatarOption, user?.avatar === a && !user?.photoURL && styles.avatarOptionActive]}
                  onPress={async () => { await updateProfile({ avatar: a, photoURL: '' }); setAvatarModal(false); }}
                >
                  <Text style={{ fontSize: 30 }}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setAvatarModal(false)}>
              <Text style={styles.cancelText}>{t('btn_close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* About Modal */}
      <Modal visible={aboutModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '85%' }]}>
            <View style={styles.modalHandle} />
            <View style={styles.aboutLogoRow}>
              <Text style={{ fontSize: 52 }}>♻️</Text>
            </View>
            <Text style={styles.aboutTitle}>PoubCoin</Text>
            <Text style={styles.aboutVersion}>Version 1.0.0</Text>
            <Text style={styles.aboutDesc}>
              PoubCoin récompense les citoyens qui contribuent à la propreté de leur environnement en signalant les déchets abandonnés dans les rues.
            </Text>
            <View style={styles.aboutStats}>
              {[
                { label: 'Citoyens actifs', value: '1 247' },
                { label: 'Signalements', value: '8 930' },
                { label: 'Municipalités', value: '12' },
              ].map(s => (
                <View key={s.label} style={styles.aboutStat}>
                  <Text style={styles.aboutStatValue}>{s.value}</Text>
                  <Text style={styles.aboutStatLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={() => setAboutModal(false)}>
              <Text style={styles.saveText}>{t('btn_close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Rating Modal */}
      <Modal visible={ratingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHandle} />
            {ratingDone ? (
              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <Text style={{ fontSize: 52, marginBottom: 12 }}>🎉</Text>
                <Text style={styles.modalTitle}>Merci pour votre avis !</Text>
                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 20 }}>
                  Votre note de {ratingStars} étoile{ratingStars > 1 ? 's' : ''} nous aide à améliorer PoubCoin.
                </Text>
                <TouchableOpacity style={styles.saveBtn} onPress={() => setRatingModal(false)}>
                  <Text style={styles.saveText}>{t('btn_close')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalHeaderIcon, { backgroundColor: '#FFF8E1' }]}>
                    <Ionicons name="star" size={22} color="#F57F17" />
                  </View>
                  <Text style={styles.modalTitle}>Noter l'application</Text>
                </View>
                <Text style={{ color: colors.textSecondary, marginBottom: 20 }}>
                  Que pensez-vous de PoubCoin ?
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <TouchableOpacity key={star} onPress={() => setRatingStars(star)}>
                      <Ionicons
                        name={star <= ratingStars ? 'star' : 'star-outline'}
                        size={40}
                        color={star <= ratingStars ? '#F57F17' : colors.border}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                {ratingStars > 0 && (
                  <Text style={{ textAlign: 'center', color: colors.textSecondary, marginBottom: 16, fontSize: 14 }}>
                    {['', 'Pas satisfait 😞', 'Peut mieux faire 😐', 'Bien ! 🙂', 'Très bien ! 😊', 'Excellent ! 🤩'][ratingStars]}
                  </Text>
                )}
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setRatingModal(false)}>
                    <Text style={styles.cancelText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, ratingStars === 0 && { opacity: 0.4 }]}
                    onPress={() => setRatingDone(true)}
                    disabled={ratingStars === 0}
                  >
                    <Ionicons name="star" size={16} color="#fff" />
                    <Text style={styles.saveText}>Envoyer</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Help Modal */}
      <Modal visible={helpModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '80%' }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={[styles.modalHeaderIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="help-circle" size={22} color={colors.info} />
              </View>
              <Text style={styles.modalTitle}>Centre d'aide</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { q: 'Comment soumettre un signalement ?', a: 'Appuyez sur le bouton Caméra en bas, prenez une photo du déchet, confirmez votre position GPS et envoyez.' },
                { q: 'Comment gagner des PoubCoins ?', a: 'Vous recevez 50 PoubCoins pour chaque signalement validé par la municipalité. La validation prend généralement 24-48h.' },
                { q: 'Comment utiliser mes PoubCoins ?', a: 'Rendez-vous dans l\'onglet Marketplace pour dépenser vos coins chez nos partenaires : restaurants, transport, boutiques...' },
                { q: 'Mon signalement n\'est pas validé, pourquoi ?', a: 'La municipalité peut rejeter si la photo est floue ou si le déchet n\'est pas en espace public. Réessayez avec une meilleure photo.' },
                { q: 'Puis-je utiliser l\'app sans compte ?', a: 'Non, un compte est requis pour soumettre des signalements et suivre vos récompenses.' },
              ].map((faq, i) => (
                <View key={i} style={styles.faqItem}>
                  <Text style={styles.faqQ}>{faq.q}</Text>
                  <Text style={styles.faqA}>{faq.a}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.saveBtn} onPress={() => setHelpModal(false)}>
              <Text style={styles.saveText}>{t('btn_close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Contact Modal */}
      <Modal visible={contactModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={[styles.modalHeaderIcon, { backgroundColor: '#F3E5F5' }]}>
                <Ionicons name="chatbubble-ellipses" size={22} color="#9C27B0" />
              </View>
              <Text style={styles.modalTitle}>Nous contacter</Text>
            </View>
            <Text style={styles.contactDesc}>Notre équipe est disponible du lundi au vendredi, 8h–17h.</Text>
            <TouchableOpacity style={styles.contactOption} onPress={openEmail}>
              <View style={[styles.contactIconBox, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="mail" size={20} color={colors.info} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactOptionLabel}>Email</Text>
                <Text style={styles.contactOptionValue}>support@poubcoin.tn</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactOption} onPress={() => Linking.openURL('tel:+21671000000')}>
              <View style={[styles.contactIconBox, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="call" size={20} color={colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactOptionLabel}>Téléphone</Text>
                <Text style={styles.contactOptionValue}>+216 71 000 000</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setContactModal(false)}>
              <Text style={styles.cancelText}>{t('btn_close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Privacy Modal */}
      <Modal visible={privacyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '80%' }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={[styles.modalHeaderIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="shield" size={22} color={colors.primary} />
              </View>
              <Text style={styles.modalTitle}>Politique de confidentialité</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {[
                { title: '1. Données collectées', text: 'PoubCoin collecte votre nom, email, numéro de téléphone, localisation GPS lors des signalements, et les photos des déchets.' },
                { title: '2. Utilisation des données', text: 'Vos données servent uniquement à valider les signalements et calculer vos récompenses. Elles ne sont jamais vendues à des tiers.' },
                { title: '3. Partage avec les municipalités', text: 'Vos signalements (photos + localisation) sont transmis à la municipalité concernée. Votre identité reste confidentielle.' },
                { title: '4. Sécurité', text: 'Toutes les données sont chiffrées en transit (HTTPS) et au repos selon les standards de sécurité les plus stricts.' },
                { title: '5. Vos droits', text: 'Vous pouvez demander l\'accès, la rectification ou la suppression de vos données en contactant support@poubcoin.tn.' },
              ].map((section, i) => (
                <View key={i} style={styles.legalSection}>
                  <Text style={styles.legalTitle}>{section.title}</Text>
                  <Text style={styles.legalText}>{section.text}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.saveBtn} onPress={() => setPrivacyModal(false)}>
              <Text style={styles.saveText}>{t('btn_close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Terms Modal */}
      <Modal visible={termsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '80%' }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={[styles.modalHeaderIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="document-text" size={22} color={colors.info} />
              </View>
              <Text style={styles.modalTitle}>Conditions d'utilisation</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {[
                { title: '1. Acceptation', text: 'En utilisant PoubCoin, vous acceptez les présentes conditions. Si vous n\'acceptez pas, veuillez ne pas utiliser l\'application.' },
                { title: '2. Utilisation autorisée', text: 'PoubCoin est réservé à un usage personnel et citoyen. Tout signalement frauduleux entraînera la suspension du compte.' },
                { title: '3. Signalements', text: 'Les signalements doivent concerner des déchets réels en espaces publics. Les photos ne doivent pas violer la vie privée.' },
                { title: '4. PoubCoins', text: 'Les PoubCoins sont des récompenses virtuelles sans valeur monétaire réelle. Ils ne peuvent pas être échangés contre de l\'argent.' },
                { title: '5. Responsabilité', text: 'PoubCoin ne peut être tenu responsable des interruptions de service ou de la perte de données dues à des causes extérieures.' },
              ].map((section, i) => (
                <View key={i} style={styles.legalSection}>
                  <Text style={styles.legalTitle}>{section.title}</Text>
                  <Text style={styles.legalText}>{section.text}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.saveBtn} onPress={() => setTermsModal(false)}>
              <Text style={styles.saveText}>{t('btn_close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal visible={logoutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { paddingBottom: 24 }]}>
            <View style={[styles.modalHeaderIcon, { backgroundColor: '#FFEBEE', alignSelf: 'center', marginBottom: 14, width: 60, height: 60, borderRadius: 20 }]}>
              <Ionicons name="log-out" size={28} color={colors.error} />
            </View>
            <Text style={[styles.modalTitle, { textAlign: 'center' }]}>{t('profile_logout_confirm')}</Text>
            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 24, marginTop: 6, lineHeight: 20 }}>
              Vous devrez vous reconnecter pour accéder à votre compte et vos PoubCoins.
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setLogoutModal(false)}>
                <Text style={styles.cancelText}>{t('btn_cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.error }]}
                onPress={() => { setLogoutModal(false); logout(); }}
              >
                <Ionicons name="log-out-outline" size={18} color="#fff" />
                <Text style={styles.saveText}>{t('profile_disconnect_btn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal visible={deleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { paddingBottom: 24 }]}>
            <View style={[styles.modalHeaderIcon, { backgroundColor: '#FFEBEE', alignSelf: 'center', marginBottom: 14, width: 60, height: 60, borderRadius: 20 }]}>
              <Ionicons name="trash" size={28} color={colors.error} />
            </View>
            <Text style={[styles.modalTitle, { textAlign: 'center' }]}>Supprimer le compte ?</Text>
            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 24, marginTop: 6, lineHeight: 20 }}>
              Cette action est irréversible. Vos données, PoubCoins et historique seront définitivement supprimés.
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteModal(false)}>
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.error }]}
                onPress={() => { setDeleteModal(false); logout(); }}
              >
                <Ionicons name="trash-outline" size={18} color="#fff" />
                <Text style={styles.saveText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Invite Modal */}
      <Modal visible={inviteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={[styles.modalHeaderIcon, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="person-add" size={22} color="#F57F17" />
              </View>
              <Text style={styles.modalTitle}>Inviter des amis</Text>
            </View>
            <Text style={{ color: colors.textSecondary, marginBottom: 20, lineHeight: 20 }}>
              Partagez votre code unique et votre ami reçoit 50 PoubCoins bonus à l'inscription. Vous recevez aussi 25 coins quand il/elle fait son premier signalement !
            </Text>
            <View style={styles.referralBox}>
              <Text style={styles.referralLabel}>Votre code parrain</Text>
              <Text style={styles.referralCode}>{referralCode}</Text>
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setInviteModal(false)}>
                <Text style={styles.cancelText}>{t('btn_close')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={shareInvite}>
                <Ionicons name="share-social" size={18} color="#fff" />
                <Text style={styles.saveText}>Partager</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Municipality Modal */}
      <Modal visible={muniModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '80%' }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={[styles.modalHeaderIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="business" size={22} color={colors.primary} />
              </View>
              <Text style={styles.modalTitle}>Ma municipalité</Text>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 14 }}>
              Choisissez votre municipalité pour voir les signalements locaux en priorité.
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {MUNICIPALITIES.map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.muniRow, user?.city === m && styles.muniRowActive]}
                  onPress={async () => {
                    await updateProfile({ city: m });
                    setMuniModal(false);
                  }}
                >
                  <Ionicons name="location" size={16} color={user?.city === m ? colors.primary : colors.textMuted} />
                  <Text style={[styles.muniName, user?.city === m && { color: colors.primary, fontWeight: '700' }]}>{m}</Text>
                  {user?.city === m && <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginLeft: 'auto' }} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setMuniModal(false)}>
              <Text style={styles.cancelText}>{t('btn_close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Color Picker Modal */}
      <Modal visible={colorModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { paddingBottom: 24 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={[styles.modalHeaderIcon, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="color-palette" size={22} color="#16A34A" />
              </View>
              <Text style={styles.modalTitle}>Couleur principale</Text>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 20 }}>
              Choisissez la couleur de l'interface PoubCoin.
            </Text>
            {(() => {
              const PALETTE = [
                { color: '#16A34A', label: 'Vert (défaut)' },
                { color: '#2563EB', label: 'Bleu' },
                { color: '#7C3AED', label: 'Violet' },
                { color: '#DC2626', label: 'Rouge' },
                { color: '#D97706', label: 'Orange' },
                { color: '#0891B2', label: 'Cyan' },
                { color: '#DB2777', label: 'Rose' },
                { color: '#64748B', label: 'Gris' },
              ];
              return (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center', marginBottom: 24 }}>
                  {PALETTE.map(p => {
                    const isSelected = (customPrimary ?? '#16A34A') === p.color;
                    return (
                      <TouchableOpacity
                        key={p.color}
                        onPress={() => setCustomPrimary(p.color === '#16A34A' ? null : p.color)}
                        style={{ alignItems: 'center', gap: 6 }}
                      >
                        <View style={{
                          width: 48, height: 48, borderRadius: 24,
                          backgroundColor: p.color,
                          borderWidth: isSelected ? 3 : 1.5,
                          borderColor: isSelected ? colors.text : 'transparent',
                          justifyContent: 'center', alignItems: 'center',
                        }}>
                          {isSelected && <Ionicons name="checkmark" size={22} color="#fff" />}
                        </View>
                        <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: isSelected ? '700' : '400' }}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })()}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setCustomPrimary(null); setColorModal(false); }}>
                <Text style={styles.cancelText}>Réinitialiser</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={() => setColorModal(false)}>
                <Text style={styles.saveText}>Appliquer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const getStyles = (colors: any): any => ({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    backgroundColor: colors.surface, paddingHorizontal: 20,
    paddingTop: 20, paddingBottom: 22,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  editHeaderBtn: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: colors.background,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },

  profileCard: {
    backgroundColor: colors.surface, marginHorizontal: 16, marginTop: 12,
    borderRadius: radius.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
    ...shadow.md,
  },
  profileBanner: { height: 96, width: '100%', overflow: 'hidden' },
  profileBannerCircle1: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -40,
  },
  profileBannerCircle2: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -50, left: -20,
  },
  avatarOuter: { alignItems: 'center', marginTop: -50 },
  avatarWrapper: { position: 'relative', marginBottom: 0 },
  avatar: {
    width: 96, height: 96, borderRadius: 30,
    backgroundColor: colors.primaryGhost,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18, shadowRadius: 12, elevation: 8,
  },
  avatarEmoji: { fontSize: 48 },
  avatarEditBadge: {
    position: 'absolute', bottom: -2, right: -2,
    backgroundColor: colors.primary, width: 26, height: 26,
    borderRadius: 9, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2.5, borderColor: '#fff',
  },
  profileCardBody: { alignItems: 'center', paddingHorizontal: 22, paddingBottom: 22, paddingTop: 12 },
  name: { fontSize: 24, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
  levelBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 7, marginTop: 10,
    borderWidth: 1.5,
  },
  levelIcon: { fontSize: 14 },
  levelText: { fontWeight: '800', fontSize: 13, color: colors.textSecondary },
  infoPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, justifyContent: 'center' },
  infoPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.background, borderRadius: radius.pill,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: colors.border,
  },
  infoPillText: { fontSize: 12, color: colors.textSecondary },
  progressBox: { width: '100%', marginTop: 16 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  progressNext: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  progressCount: { fontSize: 12, color: colors.textMuted },
  progressTrack: { height: 7, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 16, gap: 10, marginTop: 14, marginBottom: 4 },
  statCard: {
    width: '47%', borderRadius: radius.xl,
    padding: 18, alignItems: 'center', gap: 8,
    ...shadow.sm, borderWidth: 1.5, borderTopWidth: 5,
  },
  statIcon: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 32, fontWeight: '900', letterSpacing: -0.8 },
  statLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  sectionTitle: {
    fontSize: 11, fontWeight: '800', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1.2,
    marginHorizontal: 16, marginTop: 22, marginBottom: 8,
  },
  badgesRow: { paddingHorizontal: 16, gap: 10, paddingBottom: 4 },
  badge: {
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: 16, alignItems: 'center', width: 96, overflow: 'hidden',
    backgroundColor: colors.surface, ...shadow.sm,
  },
  badgeLocked: { backgroundColor: colors.background, borderColor: colors.borderLight },
  badgeEmoji: { fontSize: 34 },
  badgeName: { fontSize: 10, marginTop: 8, textAlign: 'center', fontWeight: '700', lineHeight: 13 },

  settingsCard: {
    backgroundColor: colors.surface, marginHorizontal: 16,
    borderRadius: radius.xl, overflow: 'hidden', ...shadow.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 15,
  },
  settingDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  settingIconBox: {
    width: 40, height: 40, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
  },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  settingSub: { fontSize: 11, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  valueText: { fontSize: 13, color: colors.textMuted },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 13,
    margin: 16, marginTop: 20,
    backgroundColor: '#FFF5F5', borderRadius: radius.lg, padding: 16,
    borderWidth: 1.5, borderColor: '#FECACA', ...shadow.xs,
  },
  logoutIcon: {
    width: 40, height: 40, borderRadius: 13,
    backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center',
  },
  logoutText: { color: colors.error, fontWeight: '700', fontSize: 15, flex: 1 },

  version: { textAlign: 'center', fontSize: 12, color: colors.textMuted, marginTop: 4 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingTop: 16,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 18 },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.background, borderRadius: radius.sm,
    paddingHorizontal: 14, height: 50, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  fieldInput: { flex: 1, fontSize: 15, color: colors.text },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 6 },
  cancelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.sm, padding: 14, alignItems: 'center',
  },
  cancelText: { color: colors.textSecondary, fontWeight: '700' },
  saveBtn: {
    flex: 2, backgroundColor: colors.primary,
    borderRadius: radius.sm, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18, justifyContent: 'center' },
  avatarOption: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  avatarOptionActive: { borderColor: colors.primary, backgroundColor: '#E8F5E9' },

  aboutLogoRow: { alignItems: 'center', marginBottom: 8 },
  aboutTitle: { fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center' },
  aboutVersion: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginBottom: 12 },
  aboutDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  aboutStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  aboutStat: { alignItems: 'center' },
  aboutStatValue: { fontSize: 20, fontWeight: '800', color: colors.primary },
  aboutStatLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  modalHeaderIcon: { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },

  faqItem: {
    backgroundColor: colors.background, borderRadius: radius.sm,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  faqQ: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 6 },
  faqA: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },

  contactDesc: { fontSize: 13, color: colors.textMuted, marginBottom: 16 },
  contactOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.background, borderRadius: radius.sm,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  contactIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  contactOptionLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  contactOptionValue: { fontSize: 14, color: colors.text, fontWeight: '700', marginTop: 2 },

  legalSection: { marginBottom: 16 },
  legalTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 6 },
  legalText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },

  referralBox: {
    backgroundColor: colors.primaryGhost, borderRadius: radius.md,
    padding: 20, alignItems: 'center', marginBottom: 20,
    borderWidth: 1.5, borderColor: colors.primary + '40', borderStyle: 'dashed',
  },
  referralLabel: { fontSize: 12, color: colors.primary, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  referralCode: { fontSize: 32, fontWeight: '900', color: colors.primary, letterSpacing: 4 },

  proCard: {
    marginHorizontal: 16, marginTop: 12, borderRadius: radius.md,
    backgroundColor: '#FFF8E1', borderWidth: 1.5, borderColor: '#FFC107',
    padding: 18, gap: 12,
  },
  proTitle: { fontSize: 18, fontWeight: '900', color: '#E65100' },
  proPerks: { gap: 8 },
  proPerkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  proPerkText: { fontSize: 13, color: '#F57F17', fontWeight: '600' },
  proProgressCard: {
    marginHorizontal: 16, marginTop: 12, borderRadius: radius.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    padding: 16, gap: 6,
  },
  proProgressTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  proProgressSub: { fontSize: 13, color: colors.textSecondary },

  muniRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 13, paddingHorizontal: 14,
    borderRadius: radius.sm, marginBottom: 4,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
  },
  muniRowActive: { borderColor: colors.primary, backgroundColor: colors.primaryGhost },
  muniName: { fontSize: 14, color: colors.text, fontWeight: '500' },

  avatarEcoCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 20, overflow: 'hidden', ...shadow.card },
  avatarEcoGradient: { padding: 20 },
  avatarEcoLabel: { fontSize: 18, fontWeight: '800', marginTop: 8, textAlign: 'center' },
  avatarEcoDesc: { fontSize: 12, textAlign: 'center', marginTop: 4, lineHeight: 18 },
  avatarEcoNext: { fontSize: 12, fontWeight: '600' },
  avatarEcoTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  avatarEcoFill: { height: '100%', borderRadius: 4 },
  avatarEcoHint: { fontSize: 11, textAlign: 'center' },
  avatarEcoMaxBadge: { borderRadius: radius.sm, padding: 12, borderWidth: 1.5, alignItems: 'center' },
  avatarEcoMaxText: { fontSize: 14, fontWeight: '700' },
});
