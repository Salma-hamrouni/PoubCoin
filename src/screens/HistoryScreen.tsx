import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, SectionList, SafeAreaView,
  TouchableOpacity, Image, Share, Modal, TextInput, ActivityIndicator, Alert,
  Animated, Platform, KeyboardAvoidingView, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useWallet, Report, Transaction } from '../context/WalletContext';
import { shadow, radius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useT } from '../i18n/useT';
import QRVoucher from '../components/QRVoucher';
import BeforeAfterSlider from '../components/BeforeAfterSlider';
import EmptyState from '../components/EmptyState';

function AnimatedCard({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 320, delay: index * 60, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(translateY, { toValue: 0, duration: 320, delay: index * 60, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

function useFadeIn(delay = 0) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 380, delay,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, []);
  return anim;
}

type Filter = 'all' | 'pending' | 'validated' | 'rejected';

export default function HistoryScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const t = useT();

  const STATUS = {
    validated: { label: t('status_validated'), color: colors.success, bg: '#E8F5E9', icon: 'checkmark-circle' as const },
    pending:   { label: t('status_pending'),   color: colors.warning,  bg: '#FFF3E0', icon: 'time'             as const },
    rejected:  { label: t('status_rejected'),  color: colors.error,    bg: '#FFEBEE', icon: 'close-circle'     as const },
  };

  const FILTERS: { key: Filter; label: string; icon: string; color: string; bg: string }[] = [
    { key: 'all',       label: t('history_filter_all'),       icon: 'list',             color: '#555',         bg: '#F5F5F5' },
    { key: 'pending',   label: t('history_filter_pending'),   icon: 'time',             color: colors.warning, bg: '#FFF3E0' },
    { key: 'validated', label: t('history_filter_validated'), icon: 'checkmark-circle', color: colors.success, bg: '#E8F5E9' },
    { key: 'rejected',  label: t('history_filter_rejected'),  icon: 'close-circle',     color: colors.error,   bg: '#FFEBEE' },
  ];

  const { reports, balance, transactions, updateReportLocation, deleteReport } = useWallet();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [tab, setTab] = useState<'reports' | 'wallet'>('reports');
  const [search, setSearch] = useState('');
  const [voucherReport, setVoucherReport] = useState<Report | null>(null);

  // Edit location state
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);
  const [deleting, setDeleting]         = useState(false);
  const [editReport, setEditReport]     = useState<Report | null>(null);
  const [editAddress, setEditAddress]   = useState('');
  const [editLat, setEditLat]           = useState('');
  const [editLng, setEditLng]           = useState('');
  const [gpsLoading, setGpsLoading]     = useState(false);
  const [saving, setSaving]             = useState(false);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteReport(deleteTarget.id);
    } catch {
      if (Platform.OS === 'web') window.alert('Impossible de supprimer. Réessayez.');
      else Alert.alert('Erreur', 'Impossible de supprimer. Réessayez.');
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  const openEditLocation = (report: Report) => {
    setEditReport(report);
    setEditAddress(report.address);
    setEditLat(String(report.latitude));
    setEditLng(String(report.longitude));
  };

  const closeEditLocation = () => {
    setEditReport(null);
    setEditAddress('');
    setEditLat('');
    setEditLng('');
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (geo.length > 0) {
        const g = geo[0];
        const addr = [g.street, g.city, g.region].filter(Boolean).join(', ');
        if (addr) return addr;
      }
    } catch {}
    // Fallback: Nominatim (OpenStreetMap)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
        headers: { 'Accept-Language': 'fr' },
      });
      const json = await res.json();
      if (json.display_name) return json.display_name;
    } catch {}
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  };

  const useCurrentGPS = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Autorisez la localisation dans les paramètres de votre navigateur.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      setEditLat(String(lat));
      setEditLng(String(lng));
      const addr = await reverseGeocode(lat, lng);
      setEditAddress(addr);
    } catch (e: any) {
      Alert.alert('Erreur GPS', e?.message ?? 'Impossible d\'obtenir la position. Vérifiez les permissions de localisation.');
    } finally {
      setGpsLoading(false);
    }
  };

  const saveEditLocation = async () => {
    if (!editReport || !editAddress.trim()) { Alert.alert('Erreur', 'L\'adresse est obligatoire.'); return; }
    const lat = parseFloat(editLat);
    const lng = parseFloat(editLng);
    if (isNaN(lat) || isNaN(lng)) { Alert.alert('Erreur', 'Latitude/longitude invalides.'); return; }
    setSaving(true);
    try {
      await updateReportLocation(editReport.id, lat, lng, editAddress.trim());
      closeEditLocation();
    } catch {
      Alert.alert('Erreur', 'La mise à jour a échoué. Réessayez.');
    } finally {
      setSaving(false);
    }
  };

  const byStatus = filter === 'all' ? reports : reports.filter(r => r.status === filter);
  const filtered = search.trim()
    ? byStatus.filter(r => r.address?.toLowerCase().includes(search.toLowerCase()))
    : byStatus;

  // Group filtered reports by date for timeline sections
  const timelineSections = useMemo(() => {
    const groups: Record<string, Report[]> = {};
    filtered.forEach(r => {
      const key = r.date || 'Sans date';
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  }, [filtered]);
  const totalEarned    = reports.filter(r => r.status === 'validated').reduce((s, r) => s + r.coins, 0);
  const totalValidated = reports.filter(r => r.status === 'validated').length;

  const SUMMARY = [
    { icon: 'camera',           iconBg: '#E3F2FD', iconColor: colors.info,    label: 'Total',   value: reports.length  },
    { icon: 'checkmark-circle', iconBg: '#E8F5E9', iconColor: colors.success, label: t('history_filter_validated'), value: totalValidated  },
    { icon: 'cash',             iconBg: '#FFF8E1', iconColor: colors.gold,    label: 'Coins 🪙', value: totalEarned    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerCircle} />
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('history_title')}</Text>
          <Text style={styles.headerSub}>{reports.length} signalement{reports.length > 1 ? 's' : ''} au total</Text>
        </View>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{filtered.length}</Text>
        </View>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        {SUMMARY.map(s => (
          <View key={s.label} style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: s.iconBg }]}>
              <Ionicons name={s.icon as any} size={18} color={s.iconColor} />
            </View>
            <Text style={[styles.summaryNum, { color: s.iconColor }]}>{s.value}</Text>
            <Text style={styles.summaryLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Main tabs */}
      <View style={styles.mainTabs}>
        {[
          { key: 'reports', label: t('history_tab_reports') },
          { key: 'wallet',  label: t('history_tab_wallet')  },
        ].map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.mainTab, tab === t.key && styles.mainTabActive]}
            onPress={() => setTab(t.key as any)}
          >
            <Text style={[styles.mainTabText, tab === t.key && styles.mainTabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'wallet' && (
        <FlatList
          data={transactions}
          keyExtractor={t => t.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }: { item: Transaction }) => (
            <View style={styles.txCard}>
              <View style={[styles.txIcon, { backgroundColor: item.type === 'earned' ? '#E8F5E9' : '#FFF3E0' }]}>
                <Ionicons
                  name={item.type === 'earned' ? 'trending-up' : 'cart'}
                  size={18}
                  color={item.type === 'earned' ? colors.success : colors.warning}
                />
              </View>
              <View style={styles.txBody}>
                <Text style={styles.txLabel}>{item.label}</Text>
                <Text style={styles.txDate}>{new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
              </View>
              <Text style={[styles.txAmount, { color: item.type === 'earned' ? colors.success : colors.warning }]}>
                {item.type === 'earned' ? '+' : '-'}{item.amount} 🪙
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="wallet-outline" size={40} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>{t('history_no_tx')}</Text>
              <Text style={styles.emptySub}>{t('history_no_tx_sub')}</Text>
            </View>
          }
        />
      )}

      {tab === 'reports' && <>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('history_search')}
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, active && { backgroundColor: f.color, borderColor: f.color }]}
              onPress={() => setFilter(f.key)}
            >
              <View style={[styles.filterIconBox, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : f.bg }]}>
                <Ionicons name={f.icon as any} size={12} color={active ? '#fff' : f.color} />
              </View>
              <Text style={[styles.filterText, active && { color: '#fff' }]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <SectionList
        sections={timelineSections}
        keyExtractor={r => r.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); }} colors={[colors.primary, colors.primaryLight]} tintColor={colors.primary} progressBackgroundColor={colors.surface} title="Actualisation..." titleColor={colors.textMuted} />}
        renderSectionHeader={({ section }) => (
          <View style={styles.timelineDateHeader}>
            <View style={styles.timelineDateDot} />
            <View style={styles.timelineDateLine} />
            <View style={styles.timelineDatePill}>
              <Ionicons name="calendar" size={11} color={colors.primary} />
              <Text style={styles.timelineDateText}>{section.title}</Text>
            </View>
          </View>
        )}
        renderItem={({ item, index }: { item: Report; index: number }) => {
          const cfg = STATUS[item.status];
          const isLast = index === filtered.length - 1;
          return (
            <AnimatedCard index={index}>
            <View style={styles.timelineRow}>
              {/* Timeline spine */}
              <View style={styles.timelineSpine}>
                <View style={[styles.timelineDot, { backgroundColor: cfg.color, borderColor: cfg.bg }]} />
                {!isLast && <View style={[styles.timelineConnector, { backgroundColor: colors.border }]} />}
              </View>
              {/* Card */}
              <View style={[styles.card, { flex: 1 }]}>
              {item.imageUri && (item as any).afterImageUri ? (
                <BeforeAfterSlider beforeUri={item.imageUri} afterUri={(item as any).afterImageUri} />
              ) : item.imageUri ? (
                <View style={styles.photoWrap}>
                  <Image source={{ uri: item.imageUri }} style={styles.cardPhoto} resizeMode="cover" onError={() => {}} />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.72)']} style={styles.photoGradient}>
                    <Text style={styles.photoAddr} numberOfLines={2}>{item.address}</Text>
                    <View style={styles.photoMeta}>
                      <Ionicons name="navigate-outline" size={11} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.photoMetaText}>{item.latitude.toFixed(3)}, {item.longitude.toFixed(3)}</Text>
                    </View>
                  </LinearGradient>
                  <View style={[styles.floatingBadge, { backgroundColor: cfg.bg }]}>
                    <Ionicons name={cfg.icon} size={13} color={cfg.color} />
                    <Text style={[styles.floatingBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                  {item.status === 'validated' && (
                    <View style={styles.floatingCoins}>
                      <Text style={styles.floatingCoinsText}>+{item.coins} 🪙</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.cardRow2}>
                  <View style={[styles.statusIconBox, { backgroundColor: cfg.bg }]}>
                    <Ionicons name={cfg.icon} size={22} color={cfg.color} />
                  </View>
                  <View style={styles.cardContent}>
                    <View style={styles.cardRow}>
                      <Text style={styles.cardAddr} numberOfLines={1}>{item.address}</Text>
                      {item.status === 'validated'
                        ? <View style={styles.coinsBox}><Ionicons name="wallet" size={12} color={colors.success} /><Text style={styles.coinsText}>+{item.coins}</Text></View>
                        : <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}><Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text></View>
                      }
                    </View>
                    <View style={styles.cardMeta}>
                      <View style={styles.metaItem}><Ionicons name="location-outline" size={12} color={colors.textMuted} /><Text style={styles.metaText}>{item.latitude.toFixed(3)}, {item.longitude.toFixed(3)}</Text></View>
                    </View>
                  </View>
                </View>
              )}

              {(item.status === 'pending' || item.adminComment) && (
                <View style={styles.cardFooter}>
                  {item.status === 'pending' && !item.adminComment && (
                    <View style={styles.pendingNote}>
                      <Ionicons name="information-circle" size={13} color={colors.warning} />
                      <Text style={styles.pendingNoteText}>En cours de validation par la municipalité</Text>
                    </View>
                  )}
                  {item.adminComment ? (
                    <View style={[styles.pendingNote, { backgroundColor: item.status === 'validated' ? '#E8F5E9' : '#FFEBEE' }]}>
                      <Ionicons name="chatbubble-outline" size={13} color={item.status === 'validated' ? colors.success : colors.error} />
                      <Text style={[styles.pendingNoteText, { color: item.status === 'validated' ? colors.success : colors.error }]}>
                        Municipalité : {item.adminComment}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}

              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Message', { reportId: item.id, reportAddress: item.address })}>
                  <Ionicons name="chatbubble-outline" size={14} color={colors.info} />
                  <Text style={[styles.actionBtnText, { color: colors.info }]}>Message</Text>
                </TouchableOpacity>
                {item.status === 'validated' && (
                  <TouchableOpacity style={[styles.actionBtn, { borderLeftWidth: 1, borderLeftColor: colors.border }]} onPress={() => Share.share({ message: `J'ai contribué à la propreté de ma ville avec PoubCoin ! ♻️ Signalement validé à ${item.address}. Rejoins-moi sur PoubCoin !` })}>
                    <Ionicons name="share-social-outline" size={14} color={colors.primary} />
                    <Text style={styles.actionBtnText}>Partager</Text>
                  </TouchableOpacity>
                )}
                {item.status === 'validated' && (
                  <TouchableOpacity style={[styles.actionBtn, { borderLeftWidth: 1, borderLeftColor: colors.border }]} onPress={() => setVoucherReport(item)}>
                    <Ionicons name="ticket-outline" size={14} color="#9C27B0" />
                    <Text style={[styles.actionBtnText, { color: '#9C27B0' }]}>Bon</Text>
                  </TouchableOpacity>
                )}
                {item.status === 'validated' && !(item as any).afterImageUri && (
                  <TouchableOpacity style={[styles.actionBtn, { borderLeftWidth: 1, borderLeftColor: colors.border }]} onPress={() => navigation.navigate('Camera', { mode: 'after', reportId: item.id })}>
                    <Ionicons name="camera-outline" size={14} color="#6A1B9A" />
                    <Text style={[styles.actionBtnText, { color: '#6A1B9A' }]}>Photo après</Text>
                  </TouchableOpacity>
                )}
                {(item as any).afterImageUri && (
                  <View style={[styles.actionBtn, { borderLeftWidth: 1, borderLeftColor: colors.border }]}>
                    <Ionicons name={(item as any).afterValidated ? 'checkmark-circle' : 'time'} size={14} color={(item as any).afterValidated ? colors.success : colors.warning} />
                    <Text style={[styles.actionBtnText, { color: (item as any).afterValidated ? colors.success : colors.warning }]}>
                      {(item as any).afterValidated ? '+25 🪙 bonus' : 'Après en attente'}
                    </Text>
                  </View>
                )}
                {item.status === 'pending' && (
                  <TouchableOpacity style={[styles.actionBtn, styles.actionBtnEdit, { borderLeftWidth: 1, borderLeftColor: colors.border }]} onPress={() => openEditLocation(item)}>
                    <Ionicons name="location-outline" size={14} color={colors.warning} />
                    <Text style={[styles.actionBtnText, { color: colors.warning }]}>Modifier loc.</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.actionBtn, { borderLeftWidth: 1, borderLeftColor: colors.border }]} onPress={() => setDeleteTarget(item)}>
                  <Ionicons name="trash-outline" size={14} color={colors.error} />
                  <Text style={[styles.actionBtnText, { color: colors.error }]}>Supprimer</Text>
                </TouchableOpacity>
              </View>
              </View>
            </View>
            </AnimatedCard>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="camera-outline"
            emoji={filter === 'all' ? '📷' : filter === 'validated' ? '✅' : filter === 'pending' ? '⏳' : '❌'}
            title={t('history_empty')}
            subtitle={filter === 'all' ? t('history_empty_sub') : `Aucun signalement "${STATUS[filter as Exclude<Filter,'all'>]?.label}"`}
            actionLabel={filter === 'all' ? 'Signaler un déchet' : undefined}
            onAction={filter === 'all' ? () => navigation.navigate('Camera') : undefined}
          />
        }
      />
      </>}

      {/* QR Voucher Modal */}
      <Modal visible={!!voucherReport} transparent animationType="slide" onRequestClose={() => setVoucherReport(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 16, textAlign: 'center' }}>🎟️ Votre bon de réduction</Text>
            {voucherReport && (
              <QRVoucher
                code={`PC-${voucherReport.id.slice(0, 6).toUpperCase()}-${Math.floor((voucherReport.coins ?? 50) * 1.5)}`}
                partnerName="Partenaires PoubCoin"
                discount="-15% sur votre prochain achat"
                expiryDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')}
              />
            )}
            <TouchableOpacity
              style={{ marginTop: 20, backgroundColor: colors.primary, borderRadius: 14, padding: 15, alignItems: 'center' }}
              onPress={() => setVoucherReport(null)}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>{t('btn_close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 24, width: '100%', maxWidth: 360, gap: 16 }}>
            <Text style={{ fontSize: 36, textAlign: 'center' }}>🗑️</Text>
            <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, textAlign: 'center' }}>Supprimer ce signalement ?</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19 }}>
              Cette action est irréversible. Le signalement sera définitivement supprimé.
            </Text>
            {deleteTarget && (
              <View style={{ backgroundColor: colors.background, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }} numberOfLines={2}>{deleteTarget.address}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{deleteTarget.date}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' }}
                onPress={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textMuted }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 2, backgroundColor: colors.error, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                onPress={confirmDelete}
                disabled={deleting}
              >
                {deleting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <><Ionicons name="trash" size={16} color="#fff" /><Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>Supprimer</Text></>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Location Modal */}
      <Modal visible={!!editReport} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderIcon}>
                <Ionicons name="location" size={20} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Modifier la localisation</Text>
                <Text style={styles.modalSub}>Signalement en attente seulement</Text>
              </View>
              <TouchableOpacity onPress={() => closeEditLocation()}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* GPS button */}
            <TouchableOpacity style={styles.gpsBtn} onPress={useCurrentGPS} disabled={gpsLoading}>
              {gpsLoading
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Ionicons name="navigate" size={16} color={colors.primary} />}
              <Text style={styles.gpsBtnText}>
                {gpsLoading ? 'Localisation en cours…' : 'Utiliser ma position actuelle'}
              </Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou saisir manuellement</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Address field */}
            <View style={styles.fieldRow}>
              <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.fieldInput}
                placeholder="Adresse complète"
                placeholderTextColor={colors.textMuted}
                value={editAddress}
                onChangeText={setEditAddress}
              />
            </View>

            {/* Lat/Lng fields */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={[styles.fieldRow, { flex: 1 }]}>
                <Ionicons name="arrow-up-outline" size={16} color={colors.textSecondary} />
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Latitude"
                  placeholderTextColor={colors.textMuted}
                  value={editLat}
                  onChangeText={setEditLat}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.fieldRow, { flex: 1 }]}>
                <Ionicons name="arrow-forward-outline" size={16} color={colors.textSecondary} />
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Longitude"
                  placeholderTextColor={colors.textMuted}
                  value={editLng}
                  onChangeText={setEditLng}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => closeEditLocation()}>
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveEditLocation} disabled={saving}>
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <><Ionicons name="checkmark" size={18} color="#fff" /><Text style={styles.saveText}>Enregistrer</Text></>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors: any): any => ({
  container: { flex: 1, backgroundColor: colors.background },

  mainTabs: {
    flexDirection: 'row', backgroundColor: colors.surface,
    paddingHorizontal: 16, paddingVertical: 10, gap: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  mainTab: {
    flex: 1, paddingVertical: 9, borderRadius: radius.md,
    alignItems: 'center', backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border,
  },
  mainTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  mainTabText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  mainTabTextActive: { color: '#fff' },

  txCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border, ...shadow.xs,
  },
  txIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  txBody: { flex: 1 },
  txLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  txDate:  { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  txAmount:{ fontSize: 17, fontWeight: '900' },

  photoWrap: { position: 'relative' },
  cardPhoto: { width: '100%', height: 180, borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md },
  photoGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 100, borderTopLeftRadius: 0, borderTopRightRadius: 0,
    justifyContent: 'flex-end', padding: 12,
  },
  photoAddr:     { fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 4, lineHeight: 18 },
  photoMeta:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  photoMetaText: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  photoMetaDot:  { color: 'rgba(255,255,255,0.4)', fontSize: 10 },
  floatingBadge: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5,
    ...shadow.sm,
  },
  floatingBadgeText: { fontSize: 11, fontWeight: '700' },
  floatingCoins: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: '#1B6B3A', borderRadius: radius.pill,
    paddingHorizontal: 10, paddingVertical: 5,
    ...shadow.sm,
  },
  floatingCoinsText: { fontSize: 12, fontWeight: '800', color: '#fff' },

  cardFooter: { paddingHorizontal: 12, paddingVertical: 8 },
  cardRow2:  { flexDirection: 'row', padding: 12, gap: 12 },
  cardActions: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  actionBtnEdit: { backgroundColor: '#FFF8E1' },
  actionBtnText: { fontSize: 12, color: colors.primary, fontWeight: '600' },

  // Modal styles
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
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  modalHeaderIcon: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center',
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  modalSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  gpsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primaryGhost, borderRadius: radius.sm,
    paddingVertical: 13, marginBottom: 14,
    borderWidth: 1.5, borderColor: colors.primary + '40',
  },
  gpsBtnText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.background, borderRadius: radius.sm,
    paddingHorizontal: 14, height: 50, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  fieldInput: { flex: 1, fontSize: 14, color: colors.text },
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
  header: {
    backgroundColor: colors.primary, paddingHorizontal: 16,
    paddingTop: 14, paddingBottom: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    overflow: 'hidden',
  },
  headerCircle: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -50, right: -30,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 1 },
  countPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  countText: { color: '#fff', fontWeight: '900', fontSize: 14 },

  summaryRow: { flexDirection: 'row', padding: 14, gap: 10 },
  summaryCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.md,
    padding: 14, alignItems: 'center', gap: 6,
    ...shadow.card, borderWidth: 1, borderColor: colors.borderLight,
  },
  summaryIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  summaryNum: { fontSize: 24, fontWeight: '900' },
  summaryLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, marginHorizontal: 14, marginBottom: 8,
    borderRadius: radius.sm, paddingHorizontal: 12, height: 42,
    borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  filterRow: { flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 4, gap: 7, flexWrap: 'wrap' },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: colors.surface, borderRadius: 20,
    borderWidth: 1.5, borderColor: colors.border,
  },
  filterIconBox: { width: 20, height: 20, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  filterText: { fontSize: 12, color: colors.textSecondary, fontWeight: '700' },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    overflow: 'hidden',
    ...shadow.sm, borderWidth: 1, borderColor: colors.border,
  },
  statusIconBox: {
    width: 48, height: 48, borderRadius: radius.sm,
    justifyContent: 'center', alignItems: 'center',
  },
  cardContent: { flex: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardAddr: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  coinsBox: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#E8F5E9', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  coinsText: { fontSize: 13, fontWeight: '800', color: colors.success },
  statusPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', gap: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: colors.textMuted },
  pendingNote: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FFF3E0', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 5, marginTop: 6,
  },
  pendingNoteText: { fontSize: 11, color: colors.warning, fontWeight: '600', flex: 1 },

  // Timeline styles
  timelineDateHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 8, paddingLeft: 4 },
  timelineDateDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginRight: 0, zIndex: 2 },
  timelineDateLine: { width: 2, height: 1, backgroundColor: 'transparent' },
  timelineDatePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.primaryGhost ?? '#E8F5E9',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: colors.primary + '30',
    marginLeft: 8,
  },
  timelineDateText: { fontSize: 11, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.4 },
  timelineRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  timelineSpine: { width: 22, alignItems: 'center', paddingTop: 16 },
  timelineDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3, zIndex: 1 },
  timelineConnector: { flex: 1, width: 2, marginTop: 4 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 14, paddingHorizontal: 32 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  emptySub: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});

