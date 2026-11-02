import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, Modal, TextInput, Image, ScrollView, ActivityIndicator, Share,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, onSnapshot, addDoc, orderBy, query, limit, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAdmin, AdminReport } from '../../context/AdminContext';
import { useAdminPrefs } from '../../context/AdminPrefsContext';
import { colors, radius, shadow } from '../../theme';
import NetInfo from '@react-native-community/netinfo';
import { exportReportsCSV } from '../../utils/exportCSV';
import { hapticSuccess, hapticError } from '../../utils/haptics';

interface ChatMessage {
  id: string;
  text: string;
  from: 'citizen' | 'admin';
  createdAt: string;
}

type Filter = 'pending' | 'validated' | 'rejected' | 'all';

const STATUS = {
  pending:   { label: 'En attente', color: '#B45309', bg: '#FEF3C7', icon: 'time-outline',             border: '#B45309' },
  validated: { label: 'Validé',     color: '#15803D', bg: '#DCFCE7', icon: 'checkmark-circle-outline', border: '#15803D' },
  rejected:  { label: 'Rejeté',     color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle-outline',     border: '#DC2626' },
} as const;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'pending',   label: 'En attente' },
  { key: 'validated', label: 'Validés' },
  { key: 'rejected',  label: 'Rejetés' },
  { key: 'all',       label: 'Tous' },
];

function relativeTime(raw: any): string {
  if (!raw) return '';
  const d = raw?.toDate ? raw.toDate() : new Date(raw);
  if (isNaN(d.getTime())) return '';
  const now = Date.now();
  const diff = Math.floor((now - d.getTime()) / 1000);
  if (diff < 3600)  return `il y a ${Math.max(1, Math.floor(diff / 60))}min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 172800) return 'hier';
  return `il y a ${Math.floor(diff / 86400)}j`;
}

export default function AdminReportsScreen({ navigation }: any) {
  const { reports, validateReport, rejectReport } = useAdmin();
  const { defaultReportFilter, layoutDensity, accentColor } = useAdminPrefs();
  const [filter, setFilter]   = useState<Filter>(defaultReportFilter);
  const [search, setSearch]   = useState('');
  const [selected, setSelected] = useState<AdminReport | null>(null);
  const [action, setAction]   = useState<'validate' | 'reject' | null>(null);
  const [comment, setComment] = useState('');
  const [adminMsgText, setAdminMsgText] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [validatingAfter, setValidatingAfter] = useState(false);
  const [loadingReportId, setLoadingReportId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<AdminReport | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [displayCount, setDisplayCount] = useState(20);
  const [showAdvFilters, setShowAdvFilters] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo]     = useState('');
  const [filterZone, setFilterZone]         = useState('');

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      setIsOffline(!(state.isConnected && state.isInternetReachable !== false));
    });
    return () => unsub();
  }, []);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setActionFeedback({ type, message });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  useEffect(() => {
    if (!selected) { setChatMessages([]); return; }
    const q = query(
      collection(db, 'messages', selected.id, 'items'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );
    const unsub = onSnapshot(q, snap => {
      setChatMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
    });
    return unsub;
  }, [selected?.id]);

  const validateAfterPhoto = async () => {
    if (!selected || validatingAfter) return;
    setValidatingAfter(true);
    try {
      await updateDoc(doc(db, 'reports', selected.id), { afterValidated: true });
      await updateDoc(doc(db, 'wallets', selected.userId), { balance: increment(25) });
      await addDoc(collection(db, 'transactions', selected.userId, 'items'), {
        type: 'earned',
        amount: 25,
        label: `Bonus inspection après nettoyage — ${selected.address?.split(',')[0]}`,
        date: new Date().toISOString(),
      });
      showFeedback('success', '+25 🪙 envoyés au citoyen pour la photo après nettoyage.');
    } catch {
      showFeedback('error', 'Impossible de valider la photo après.');
    } finally {
      setValidatingAfter(false);
    }
  };

  const sendAdminMessage = async () => {
    if (!adminMsgText.trim() || !selected || sendingMsg) return;
    setSendingMsg(true);
    try {
      await addDoc(collection(db, 'messages', selected.id, 'items'), {
        text: adminMsgText.trim(),
        from: 'admin',
        createdAt: new Date().toISOString(),
      });
      setAdminMsgText('');
    } finally {
      setSendingMsg(false);
    }
  };

  const toIso = (r: AdminReport): string => {
    const ts = (r as any).createdAt ?? r.date;
    if (!ts) return '';
    if (typeof ts === 'string') return ts;
    if (typeof (ts as any).toDate === 'function') return (ts as any).toDate().toISOString();
    if ((ts as any).seconds != null) return new Date((ts as any).seconds * 1000).toISOString();
    return '';
  };

  const allFiltered = (filter === 'all' ? reports : reports.filter(r => r.status === filter))
    .slice()
    .sort((a, b) => toIso(b).localeCompare(toIso(a)))
    .filter(r => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!r.address?.toLowerCase().includes(q) && !r.userName?.toLowerCase().includes(q)) return false;
      }
      if (filterZone.trim()) {
        const zone = filterZone.trim().toLowerCase();
        if (!r.address?.toLowerCase().includes(zone)) return false;
      }
      if (filterDateFrom) {
        const ts = toIso(r);
        if (ts && ts < filterDateFrom) return false;
      }
      if (filterDateTo) {
        const ts = toIso(r);
        if (ts && ts.slice(0,10) > filterDateTo) return false;
      }
      return true;
    });

  // Pagination — reset when filters change
  useEffect(() => { setDisplayCount(20); }, [filter, search, filterZone, filterDateFrom, filterDateTo]);
  const filtered = allFiltered.slice(0, displayCount);
  const hasMore = allFiltered.length > displayCount;
  const loadMore = useCallback(() => { if (hasMore) setDisplayCount(c => c + 20); }, [hasMore]);

  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const pendingInView = allFiltered.filter(r => r.status === 'pending');

  const handleExportCSV = async () => {
    try {
      await exportReportsCSV(allFiltered);
    } catch {
      showFeedback('error', "Impossible d'exporter les données.");
    }
  };

  const handleMonthlyReport = async () => {
    const now = new Date();
    const month = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const monthReports = reports.filter(r => (r.date ?? '').slice(0, 7) === now.toISOString().slice(0, 7));
    const total = monthReports.length;
    const validated2 = monthReports.filter(r => r.status === 'validated').length;
    const rejected2 = monthReports.filter(r => r.status === 'rejected').length;
    const pending2 = monthReports.filter(r => r.status === 'pending').length;
    const pct = total > 0 ? Math.round((validated2 / total) * 100) : 0;
    const co2 = Math.round(validated2 * 0.3 * 10) / 10;
    const waste = Math.round(validated2 * 2.5 * 10) / 10;
    const text = `📊 Rapport PoubCoin - ${month}\n================================\nTotal signalements : ${total}\nValidés : ${validated2} (${pct}%)\nRejetés : ${rejected2}\nEn attente : ${pending2}\nCO₂ évité estimé : ${co2} kg\nDéchets signalés : ${waste} kg\n\nGénéré par PoubCoin Admin`;
    try {
      await Share.share({ message: text, title: `Rapport PoubCoin ${month}` });
    } catch {}
  };

  const openAction = (r: AdminReport, type: 'validate' | 'reject') => {
    if (type === 'reject') {
      setRejectTarget(r);
      setRejectReason('');
      setRejectModalVisible(true);
    } else {
      setSelected(r); setAction(type); setComment(''); setAdminMsgText('');
    }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    setLoadingReportId(rejectTarget.id);
    setRejectModalVisible(false);
    try {
      await rejectReport(rejectTarget.id, rejectReason || undefined);
      hapticError();
    } finally {
      setLoadingReportId(null);
      setRejectTarget(null);
    }
  };

  const confirm = async () => {
    if (!selected || !action) return;
    setLoadingReportId(selected.id);
    try {
      if (action === 'validate') {
        await validateReport(selected.id, comment || undefined);
        hapticSuccess();
        showFeedback('success', `+50 coins envoyés à ${selected.userName}`);
      } else {
        await rejectReport(selected.id, comment || undefined);
        hapticError();
        showFeedback('success', 'Le signalement a été rejeté.');
      }
    } finally {
      setLoadingReportId(null);
    }
    setSelected(null); setAction(null);
  };

  const toggleSelectPending = () => {
    if (selectedIds.size === pendingInView.length && pendingInView.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingInView.map(r => r.id)));
    }
  };

  const batchValidate = async () => {
    if (selectedIds.size === 0) return;
    setBatchLoading(true);
    try {
      await Promise.all(Array.from(selectedIds).map(id => validateReport(id)));
      hapticSuccess();
      setSelectedIds(new Set());
    } finally {
      setBatchLoading(false);
    }
  };

  const batchReject = async () => {
    if (selectedIds.size === 0) return;
    setBatchLoading(true);
    try {
      await Promise.all(Array.from(selectedIds).map(id => rejectReport(id)));
      hapticError();
      setSelectedIds(new Set());
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.root}>
      {isOffline && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#92400E', paddingHorizontal: 16, paddingVertical: 9 }}>
          <Ionicons name="cloud-offline-outline" size={15} color="#FDE68A" />
          <Text style={{ color: '#FDE68A', fontSize: 12, fontWeight: '600', flex: 1 }}>Mode hors-ligne — données en cache</Text>
        </View>
      )}
      {actionFeedback && (
        <View style={[s.feedbackBanner, actionFeedback.type === 'success' ? s.feedbackSuccess : s.feedbackError]}>
          <Text style={s.feedbackText}>{actionFeedback.message}</Text>
          <TouchableOpacity onPress={() => setActionFeedback(null)}>
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
      {/* Header */}
      <LinearGradient colors={[accentColor + 'DD', accentColor]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <View>
            <Text style={{ fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: 2 }}>GESTION</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff' }}>Signalements</Text>
              {pendingCount > 0 && (
                <View style={{ backgroundColor: '#EF4444', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{pendingCount}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={handleExportCSV} style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name="download-outline" size={14} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleMonthlyReport} style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name="bar-chart-outline" size={14} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Mois</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { label: 'Total', value: reports.length, color: '#4ADE80' },
            { label: 'En attente', value: reports.filter(r => r.status === 'pending').length, color: '#FCD34D' },
            { label: 'Validés', value: reports.filter(r => r.status === 'validated').length, color: '#6EE7B7' },
            { label: 'Rejetés', value: reports.filter(r => r.status === 'rejected').length, color: '#FCA5A5' },
          ].map(s => (
            <View key={s.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: s.color }}>{s.value}</Text>
              <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginTop: 1 }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Filters */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 6, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {FILTERS.map(f => {
          const count = f.key === 'all' ? reports.length : reports.filter(r => r.status === f.key).length;
          const isActive = filter === f.key;
          const filterColors: Record<string, string> = { pending: '#F59E0B', validated: '#16A34A', rejected: '#DC2626', all: accentColor };
          const fc = filterColors[f.key] ?? accentColor;
          return (
            <TouchableOpacity
              key={f.key}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: isActive ? fc : colors.background, borderWidth: 1, borderColor: isActive ? fc : colors.border }}
              onPress={() => setFilter(f.key)}
            >
              <Text style={{ fontSize: 12, color: isActive ? '#fff' : colors.textMuted, fontWeight: isActive ? '700' : '500' }}>{f.label}</Text>
              {count > 0 && (
                <View style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : colors.border, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 }}>
                  <Text style={{ fontSize: 10, color: isActive ? '#fff' : colors.textMuted, fontWeight: '700' }}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, paddingHorizontal: 14, height: 44, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Ionicons name="search-outline" size={15} color={colors.textMuted} />
        <TextInput
          style={{ flex: 1, fontSize: 13, color: colors.text }}
          placeholder="Rechercher par adresse ou citoyen..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Advanced filters toggle */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity
          onPress={() => setShowAdvFilters(v => !v)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: showAdvFilters ? colors.primaryGhost : 'transparent', borderWidth: 1, borderColor: showAdvFilters ? colors.primary : colors.border }}
        >
          <Ionicons name="options-outline" size={14} color={showAdvFilters ? colors.primary : colors.textMuted} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: showAdvFilters ? colors.primary : colors.textMuted }}>Filtres avancés</Text>
          {(filterDateFrom || filterDateTo || filterZone) ? (
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary }} />
          ) : null}
        </TouchableOpacity>
        {(filterDateFrom || filterDateTo || filterZone) && (
          <TouchableOpacity onPress={() => { setFilterDateFrom(''); setFilterDateTo(''); setFilterZone(''); }}>
            <Text style={{ fontSize: 11, color: '#EF4444', fontWeight: '600' }}>Réinitialiser</Text>
          </TouchableOpacity>
        )}
      </View>
      {showAdvFilters && (
        <View style={{ backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, width: 40 }}>DATE</Text>
            <TextInput
              style={{ flex: 1, fontSize: 12, color: colors.text, backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.border }}
              placeholder="Du (YYYY-MM-DD)"
              placeholderTextColor={colors.textMuted}
              value={filterDateFrom}
              onChangeText={setFilterDateFrom}
            />
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>→</Text>
            <TextInput
              style={{ flex: 1, fontSize: 12, color: colors.text, backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.border }}
              placeholder="Au (YYYY-MM-DD)"
              placeholderTextColor={colors.textMuted}
              value={filterDateTo}
              onChangeText={setFilterDateTo}
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, width: 40 }}>ZONE</Text>
            <TextInput
              style={{ flex: 1, fontSize: 12, color: colors.text, backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.border }}
              placeholder="Ex: Tunis, Ariana, Sfax..."
              placeholderTextColor={colors.textMuted}
              value={filterZone}
              onChangeText={setFilterZone}
            />
          </View>
        </View>
      )}

      {/* Info banner — validation municipale uniquement */}
      {filter === 'pending' && pendingInView.length > 0 && (
        <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginHorizontal:14, marginBottom:8, backgroundColor:'#FEF9EC', borderRadius:10, paddingHorizontal:12, paddingVertical:9, borderWidth:1, borderColor:'#FDE68A' }}>
          <Ionicons name="lock-closed-outline" size={15} color="#D97706" />
          <Text style={{ fontSize:12, color:'#92400E', fontWeight:'600', flex:1 }}>
            La validation est réservée aux administrateurs municipaux.
          </Text>
        </View>
      )}

      <FlashList
        data={filtered}
        keyExtractor={r => r.id}
        contentContainerStyle={{ padding: layoutDensity === 'compact' ? 10 : 16 }}
        ItemSeparatorComponent={() => <View style={{ height: layoutDensity === 'compact' ? 6 : 12 }} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={hasMore ? <ActivityIndicator style={{ marginVertical: 16 }} color="#1B6B3A" /> : null}
        renderItem={({ item }) => {
          const cfg = STATUS[item.status];
          const isSelected = selectedIds.has(item.id);
          const shortAddr = item.address?.split(',')[0] ?? item.address;
          const timeStr = relativeTime((item as any).createdAt ?? item.date);
          return (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                if (filter === 'pending' && selectedIds.size > 0) {
                  const next = new Set(selectedIds);
                  isSelected ? next.delete(item.id) : next.add(item.id);
                  setSelectedIds(next);
                } else {
                  setSelected(item); setAction(null); setComment(''); setAdminMsgText('');
                }
              }}
            >
              <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...(isSelected ? { backgroundColor: colors.primaryGhost } : {}), ...shadow.xs }}>
                {/* Left accent bar */}
                <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: cfg.border }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: layoutDensity === 'compact' ? 10 : 14, paddingLeft: 18, gap: 12 }}>
                  {/* Thumbnail */}
                  {item.imageUri ? (
                    <Image source={{ uri: item.imageUri }} style={{ width: layoutDensity === 'compact' ? 44 : 58, height: layoutDensity === 'compact' ? 44 : 58, borderRadius: 10 }} resizeMode="cover"
                      onError={() => {}} />
                  ) : (
                    <View style={{ width: layoutDensity === 'compact' ? 44 : 58, height: layoutDensity === 'compact' ? 44 : 58, borderRadius: 10, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
                      <Text style={{ fontSize: 22 }}>🗑️</Text>
                    </View>
                  )}

                  {/* Content */}
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }} numberOfLines={1}>{shortAddr}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="person-circle-outline" size={12} color={colors.textMuted} />
                      <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '500' }}>{item.userName}</Text>
                      {timeStr ? <Text style={{ fontSize: 11, color: colors.textMuted }}> · {timeStr}</Text> : null}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: cfg.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Ionicons name={cfg.icon as any} size={10} color={cfg.color} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: cfg.color }}>{cfg.label}</Text>
                      </View>
                      {!!item.comment && (
                        <Text style={{ fontSize: 11, color: colors.textMuted }} numberOfLines={1}>💬 {item.comment}</Text>
                      )}
                    </View>
                  </View>

                  {/* Select checkbox for pending */}
                  {filter === 'pending' && (
                    <Ionicons name={isSelected ? 'checkbox' : 'square-outline'} size={20} color={isSelected ? colors.primary : colors.border} />
                  )}
                </View>

                {/* Validation lock banner */}
                {item.status === 'pending' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFBEB', paddingHorizontal: 18, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#FDE68A' }}>
                    <Ionicons name="lock-closed-outline" size={13} color="#D97706" />
                    <Text style={{ fontSize: 11, color: '#92400E', fontWeight: '600', flex: 1 }}>Validation réservée aux admins municipaux</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="checkmark-done-circle-outline" size={56} color={colors.border} />
            <Text style={s.emptyTitle}>Aucun signalement</Text>
            <Text style={s.emptyText}>dans cette catégorie</Text>
          </View>
        }
      />

      {/* Reject reason modal (web-compatible — no Alert.prompt) */}
      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.rejectModal}>
            <Text style={s.rejectModalTitle}>Motif du rejet</Text>
            {rejectTarget && (
              <Text style={s.rejectModalAddr} numberOfLines={1}>
                📍 {rejectTarget.address?.split(',')[0]}
              </Text>
            )}
            <TextInput
              style={s.rejectInput}
              placeholder="Expliquez le motif du rejet (optionnel)..."
              placeholderTextColor={colors.textMuted}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
              autoFocus
            />
            <View style={s.rejectModalActions}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => { setRejectModalVisible(false); setRejectTarget(null); }}
              >
                <Text style={s.cancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmRejectBtn} onPress={confirmReject}>
                <Ionicons name="close-circle" size={16} color="#fff" />
                <Text style={s.confirmRejectText}>Confirmer le rejet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Detail / validate action modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => { setSelected(null); setAction(null); }}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => { setSelected(null); setAction(null); }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }} keyboardShouldPersistTaps="handled">
            <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
            <View style={s.modal}>
              <View style={s.modalHandle} />
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Text style={[s.modalTitle, { flex: 1, marginBottom: 0 }]}>
                  {action === 'validate' ? 'Valider ce signalement' : action === 'reject' ? 'Rejeter ce signalement' : 'Détail du signalement'}
                </Text>
                <TouchableOpacity onPress={() => { setSelected(null); setAction(null); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              {selected && (
                <>
                  {selected.imageUri ? (
                    <Image source={{ uri: selected.imageUri }} style={s.modalPhoto} resizeMode="cover" />
                  ) : null}
                  <View style={s.modalAddr}>
                    <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                    <Text style={s.modalAddrText}>{selected.address}</Text>
                  </View>
                </>
              )}
              {action && (
                <>
                  <TextInput
                    style={s.modalInput}
                    placeholder={action === 'validate' ? 'Commentaire (optionnel)' : 'Motif du rejet (optionnel)'}
                    placeholderTextColor={colors.textMuted}
                    value={comment}
                    onChangeText={setComment}
                    multiline
                    numberOfLines={3}
                  />
                  <View style={s.modalActions}>
                    <TouchableOpacity style={s.cancelBtn} onPress={() => setSelected(null)}>
                      <Text style={s.cancelText}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.confirmBtn, { backgroundColor: action === 'validate' ? colors.primary : '#DC2626' }]}
                      onPress={confirm}
                    >
                      <Text style={s.confirmText}>Confirmer</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* After photo section */}
              {selected && (selected as any).afterImageUri && (
                <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14 }}>
                  <Text style={[s.modalTitle, { fontSize: 14, marginBottom: 8 }]}>📸 Photo après nettoyage</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    {selected.imageUri ? (
                      <View style={{ flex: 1 }}>
                        <Image source={{ uri: selected.imageUri }} style={[s.modalPhoto, { marginBottom: 4 }]} resizeMode="cover" />
                        <Text style={{ fontSize: 10, color: colors.textMuted, textAlign: 'center', fontWeight: '700' }}>AVANT</Text>
                      </View>
                    ) : null}
                    <View style={{ flex: 1 }}>
                      <Image source={{ uri: (selected as any).afterImageUri }} style={[s.modalPhoto, { marginBottom: 4 }]} resizeMode="cover" />
                      <Text style={{ fontSize: 10, color: colors.textMuted, textAlign: 'center', fontWeight: '700' }}>APRÈS</Text>
                    </View>
                  </View>
                  {!(selected as any).afterValidated ? (
                    <TouchableOpacity
                      style={[s.validateBtn, { backgroundColor: '#6A1B9A', justifyContent: 'center' }]}
                      onPress={validateAfterPhoto}
                      disabled={validatingAfter}
                    >
                      {validatingAfter
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={s.validateText}>Valider photo après (+25 🪙)</Text>
                      }
                    </TouchableOpacity>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E8F5E9', borderRadius: 8, padding: 10 }}>
                      <Ionicons name="checkmark-circle" size={16} color="#15803D" />
                      <Text style={{ color: '#15803D', fontWeight: '700', fontSize: 13 }}>Photo après validée — +25 🪙 envoyés</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Messagerie section */}
              <View style={s.chatSection}>
                <View style={s.chatHeader}>
                  <Ionicons name="chatbubbles-outline" size={16} color={colors.primary} />
                  <Text style={s.chatHeaderText}>Messagerie citoyen</Text>
                </View>
                {chatMessages.length === 0 ? (
                  <Text style={s.chatEmpty}>Aucun message pour ce signalement.</Text>
                ) : (
                  <View style={{ gap: 6, marginBottom: 8 }}>
                    {chatMessages.map(msg => {
                      const isAdminMsg = msg.from === 'admin';
                      return (
                        <View key={msg.id} style={[s.chatBubbleRow, isAdminMsg ? s.chatBubbleRowRight : s.chatBubbleRowLeft]}>
                          <View style={[s.chatBubble, isAdminMsg ? s.chatBubbleAdmin : s.chatBubbleCitizen]}>
                            <Text style={[s.chatBubbleText, isAdminMsg && { color: '#fff' }]}>{msg.text}</Text>
                            <Text style={[s.chatBubbleTime, isAdminMsg && { color: 'rgba(255,255,255,0.65)' }]}>
                              {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              {' · '}{isAdminMsg ? 'Municipalité' : 'Citoyen'}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
                {adminMsgText.length > 400 && (
                  <Text style={{ fontSize: 11, color: adminMsgText.length >= 500 ? '#EF4444' : colors.textMuted, textAlign: 'right', marginBottom: 4 }}>
                    {adminMsgText.length}/500
                  </Text>
                )}
                <View style={s.chatInputRow}>
                  <TextInput
                    style={s.chatInput}
                    placeholder="Répondre au citoyen…"
                    placeholderTextColor={colors.textMuted}
                    value={adminMsgText}
                    onChangeText={setAdminMsgText}
                    multiline
                    maxLength={500}
                  />
                  <TouchableOpacity
                    style={[s.chatSendBtn, !adminMsgText.trim() && { opacity: 0.4 }]}
                    onPress={sendAdminMessage}
                    disabled={!adminMsgText.trim() || sendingMsg}
                  >
                    {sendingMsg
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Ionicons name="send" size={16} color="#fff" />}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  feedbackBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  feedbackSuccess: { backgroundColor: '#15803D' },
  feedbackError: { backgroundColor: '#DC2626' },
  feedbackText: { color: '#fff', fontSize: 14, flex: 1, marginRight: 8 },

  header: {
    backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    ...shadow.sm,
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  headerBadge: {
    backgroundColor: '#EF4444', borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  headerBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  exportBtn: {
    backgroundColor: colors.primaryGhost, borderRadius: radius.xs,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  exportBtnText: { fontSize: 11, fontWeight: '700', color: colors.primary },

  filterRow: {
    flexDirection: 'row', padding: 12, gap: 8,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  chipCount: {
    backgroundColor: colors.border, borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  chipCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  chipCountText: { fontSize: 10, color: colors.textMuted, fontWeight: '700' },
  chipCountTextActive: { color: '#fff' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surface, paddingHorizontal: 14, height: 42,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 13, color: colors.text },

  batchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: colors.primaryGhost, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  selectAllBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  selectAllText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  batchRejectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FEE2E2', borderRadius: radius.xs,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#FCA5A5',
  },
  batchValidateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.primary, borderRadius: radius.xs,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  batchValidateText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
    ...shadow.xs,
  },
  cardSelected: { backgroundColor: colors.primaryGhost },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  thumb: { width: 60, height: 60, borderRadius: radius.sm, backgroundColor: colors.background },
  thumbPlaceholder: { justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  thumbEmoji: { fontSize: 24 },
  cardBody: { flex: 1, gap: 4 },
  address: { fontSize: 14, fontWeight: '700', color: colors.text },
  citizenRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  citizenName: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  timeStr: { fontSize: 11, color: colors.textMuted },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  commentText: { fontSize: 11, color: colors.textMuted },
  checkbox: { paddingLeft: 4 },

  actions: {
    flexDirection: 'row', gap: 8, padding: 10,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, borderWidth: 1.5, borderColor: '#DC2626', borderRadius: radius.xs,
    paddingVertical: 12, backgroundColor: '#FEE2E2',
  },
  rejectText: { color: '#DC2626', fontWeight: '700', fontSize: 14 },
  validateBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, backgroundColor: colors.primary, borderRadius: radius.xs, paddingVertical: 12,
  },
  validateText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  empty: { alignItems: 'center', paddingTop: 64, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
  emptyText: { fontSize: 13, color: colors.textMuted },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },

  rejectModal: {
    backgroundColor: colors.surface,
    borderRadius: radius.md, margin: 20, padding: 20,
    ...shadow.sm,
  },
  rejectModalTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 6 },
  rejectModalAddr: { fontSize: 12, color: colors.textMuted, marginBottom: 12 },
  rejectInput: {
    backgroundColor: colors.background, borderRadius: radius.sm,
    padding: 12, fontSize: 14, color: colors.text,
    minHeight: 80, textAlignVertical: 'top', marginBottom: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  rejectModalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, padding: 14, alignItems: 'center',
  },
  cancelText: { color: colors.textSecondary, fontWeight: '600' },
  confirmRejectBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#DC2626', borderRadius: radius.sm, padding: 14,
  },
  confirmRejectText: { color: '#fff', fontWeight: '700' },

  modal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 8 },
  modalPhoto: { width: '100%', height: 160, borderRadius: radius.sm, marginBottom: 12 },
  modalAddr: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 16 },
  modalAddrText: { fontSize: 13, color: colors.textMuted, flex: 1 },
  modalInput: {
    backgroundColor: colors.background, borderRadius: radius.sm,
    padding: 14, fontSize: 14, color: colors.text,
    minHeight: 80, textAlignVertical: 'top', marginBottom: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  confirmBtn: { flex: 2, borderRadius: radius.sm, padding: 14, alignItems: 'center' },
  confirmText: { color: '#fff', fontWeight: '700' },

  chatSection: {
    marginTop: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14,
  },
  chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  chatHeaderText: { fontSize: 14, fontWeight: '700', color: colors.text },
  chatEmpty: { fontSize: 12, color: colors.textMuted, marginBottom: 10 },
  chatBubbleRow: { flexDirection: 'row' },
  chatBubbleRowRight: { justifyContent: 'flex-end' },
  chatBubbleRowLeft: { justifyContent: 'flex-start' },
  chatBubble: { maxWidth: '80%', borderRadius: 12, padding: 10, ...shadow.xs },
  chatBubbleAdmin: { backgroundColor: colors.primary, borderBottomRightRadius: 3 },
  chatBubbleCitizen: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 3 },
  chatBubbleText: { fontSize: 13, color: colors.text, lineHeight: 18 },
  chatBubbleTime: { fontSize: 10, color: colors.textMuted, marginTop: 3 },
  chatInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  chatInput: {
    flex: 1, backgroundColor: colors.background, borderRadius: radius.sm,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: colors.text,
    borderWidth: 1, borderColor: colors.border, maxHeight: 80,
  },
  chatSendBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },
});
