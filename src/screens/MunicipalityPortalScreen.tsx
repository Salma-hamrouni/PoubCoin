import React, {
  useState, useEffect, useRef, useMemo,
  createContext, useContext, useCallback,
} from 'react';
import {
  View, Text, SafeAreaView, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, ScrollView, Alert, Animated,
  TextInput, Platform, Share, Dimensions, Switch,
  RefreshControl, PanResponder,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  collection, onSnapshot, query, orderBy,
  updateDoc, doc, where, addDoc, serverTimestamp, getDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

let MapView: any = null;
let Marker: any  = null;
if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker  = maps.Marker;
}

const { width: SW } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────
interface StatusHistoryEntry { status: string; at: any; }
interface InboxItem {
  id: string;
  reportId: string;
  userId: string;
  userName: string;
  address: string;
  imageUri?: string;
  afterImageUri?: string;
  latitude: number;
  longitude: number;
  governorate: string;
  createdAt: any;
  status: 'pending' | 'reviewed' | 'validated' | 'rejected';
  priority?: 'normal' | 'high';
  internalNote?: string;
  category?: string;
  statusHistory?: StatusHistoryEntry[];
  assignedTo?: string;
  publicComment?: string;
}

const WASTE_CATEGORIES = [
  { key: 'ordures',     label: 'Ordures ménagères', icon: '🗑️'  },
  { key: 'dangereux',   label: 'Déchets dangereux',  icon: '⚠️'  },
  { key: 'encombrants', label: 'Encombrants',         icon: '📦'  },
  { key: 'verts',       label: 'Déchets verts',       icon: '🌿'  },
  { key: 'plastique',   label: 'Plastique',           icon: '♻️'  },
  { key: 'construction',label: 'Gravats/chantier',    icon: '🏗️'  },
  { key: 'electronique',label: 'Électronique',        icon: '📱'  },
  { key: 'autre',       label: 'Autre',               icon: '❓'  },
];

type TabKey    = 'all' | 'pending' | 'reviewed' | 'validated' | 'rejected';
type NavTab    = 'dashboard' | 'reports' | 'map' | 'profile';
type SortKey   = 'date' | 'status' | 'priority';
type DateRange = 'today' | 'week' | 'month' | 'all';
// ─── Theme (uses app global theme) ───────────────────────────────────────────
interface PT {
  dark: boolean;
  bg: string; surface: string; surfaceAlt: string;
  border: string; text: string; textSub: string; textMuted: string;
  primary: string; primaryLight: string; gradient: [string, string];
}

const ThemeCtx = createContext<{ theme: PT }>({ theme: {
  dark: false,
  bg: '#F5F6F5', surface: '#FFFFFF', surfaceAlt: '#FAFAFA',
  border: '#E4E8E4', text: '#111714', textSub: '#4B5E52', textMuted: '#94A99A',
  primary: '#1B6B3A', primaryLight: '#EEF7F1', gradient: ['#134E2A', '#1B6B3A'],
}});
const usePT = () => useContext(ThemeCtx);

// ─── Status config ────────────────────────────────────────────────────────────
const S = {
  pending:   { label: 'En attente', short: 'Attente', color: '#F59E0B', bg: '#FEF3C7', icon: 'time-outline'         as const },
  reviewed:  { label: 'En cours',   short: 'En cours', color: '#3B82F6', bg: '#DBEAFE', icon: 'construct-outline'   as const },
  validated: { label: 'Validé',     short: 'Validé',  color: '#16A34A', bg: '#DCFCE7', icon: 'checkmark-circle'     as const },
  rejected:  { label: 'Rejeté',     short: 'Rejeté',  color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle-outline' as const },
} as const;
const scfg = (s: string) => (S as any)[s] ?? S.pending;

const FILTER_TABS: { key: TabKey; label: string }[] = [
  { key: 'all',       label: 'Tout'       },
  { key: 'pending',   label: 'En attente' },
  { key: 'reviewed',  label: 'En cours'   },
  { key: 'validated', label: 'Validés'    },
  { key: 'rejected',  label: 'Rejetés'    },
];

const NAV_TABS: { key: NavTab; label: string; icon: string; activeIcon: string }[] = [
  { key: 'dashboard', label: 'Tableau',      icon: 'grid-outline',      activeIcon: 'grid'       },
  { key: 'reports',   label: 'Signalements', icon: 'documents-outline', activeIcon: 'documents'  },
  { key: 'map',       label: 'Carte',        icon: 'map-outline',       activeIcon: 'map'        },
  { key: 'profile',   label: 'Profil',       icon: 'settings-outline',  activeIcon: 'settings'   },
];

const DATE_RANGES: { key: DateRange; label: string; icon: string }[] = [
  { key: 'today', label: "Aujourd'hui", icon: 'sunny-outline'    },
  { key: 'week',  label: 'Cette semaine', icon: 'calendar-outline' },
  { key: 'month', label: 'Ce mois',    icon: 'calendar-number-outline' },
  { key: 'all',   label: 'Tout',       icon: 'time-outline'     },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function relativeTime(ts: any): string {
  if (!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60)    return 'À l\'instant';
  if (diff < 3600)  return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return `${Math.floor(diff / 86400)} j`;
}

function inRange(ts: any, range: DateRange): boolean {
  if (range === 'all') return true;
  const d = ts?.toDate ? ts.toDate() : new Date(ts ?? 0);
  const now = Date.now();
  if (range === 'today') return now - d.getTime() < 86400000;
  if (range === 'week')  return now - d.getTime() < 7 * 86400000;
  if (range === 'month') return now - d.getTime() < 30 * 86400000;
  return true;
}

function StatusPill({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' }) {
  const cfg = scfg(status);
  const px = size === 'md' ? 12 : 8, py = size === 'md' ? 5 : 3, fs = size === 'md' ? 12 : 11;
  return (
    <View style={{ flexDirection:'row', alignItems:'center', gap:4, backgroundColor:cfg.bg, borderRadius:20, paddingHorizontal:px, paddingVertical:py }}>
      <Ionicons name={cfg.icon} size={fs} color={cfg.color} />
      <Text style={{ fontSize:fs, fontWeight:'800', color:cfg.color }}>{cfg.label}</Text>
    </View>
  );
}

function DonutChart({ data, total }: { data: { label:string; value:number; color:string }[]; total:number }) {
  const { theme } = usePT();
  const SIZE = 120, STROKE = 18, R = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * R;
  let offset = 0;
  const segments = data.map(d => {
    const pct = total > 0 ? d.value / total : 0;
    const dash = pct * CIRC;
    const gap  = CIRC - dash;
    const seg  = { ...d, dash, gap, offset, pct };
    offset += dash;
    return seg;
  });
  return (
    <View style={{ flexDirection:'row', alignItems:'center', gap:20 }}>
      {/* SVG donut */}
      <View style={{ width:SIZE, height:SIZE }}>
        {/* @ts-ignore */}
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke={theme.border} strokeWidth={STROKE} />
          {segments.map((s,i) => s.value > 0 && (
            // @ts-ignore
            <circle key={i} cx={SIZE/2} cy={SIZE/2} r={R} fill="none"
              stroke={s.color} strokeWidth={STROKE}
              strokeDasharray={`${s.dash} ${s.gap}`}
              strokeDashoffset={CIRC/4 - s.offset}
              strokeLinecap="round"
              style={{ transform:`rotate(-90deg)`, transformOrigin:'center' }}
            />
          ))}
          {/* @ts-ignore */}
          <text x={SIZE/2} y={SIZE/2 - 6} textAnchor="middle" fill={theme.text} fontSize="20" fontWeight="900">{total}</text>
          {/* @ts-ignore */}
          <text x={SIZE/2} y={SIZE/2 + 12} textAnchor="middle" fill={theme.textMuted} fontSize="9" fontWeight="700">TOTAL</text>
        </svg>
      </View>
      {/* Legend */}
      <View style={{ flex:1, gap:8 }}>
        {data.map(d => (
          <View key={d.label} style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
            <View style={{ width:10, height:10, borderRadius:5, backgroundColor:d.color }} />
            <Text style={{ flex:1, fontSize:12, color:theme.textSub, fontWeight:'600' }}>{d.label}</Text>
            <Text style={{ fontSize:13, fontWeight:'900', color:d.color }}>{d.value}</Text>
            <Text style={{ fontSize:10, color:theme.textMuted, minWidth:32, textAlign:'right' }}>
              {total > 0 ? Math.round(d.value/total*100) : 0}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Swipeable card ───────────────────────────────────────────────────────────
function SwipeCard({ item, onOpen, onValidate, onReject, selected, onSelect, selectMode }: {
  item: InboxItem; onOpen: ()=>void; onValidate: ()=>void; onReject: ()=>void;
  selected: boolean; onSelect: ()=>void; selectMode: boolean;
}) {
  const { theme } = usePT();
  const cfg = scfg(item.status);
  const translateX = useRef(new Animated.Value(0)).current;
  const [swiping, setSwiping] = useState<null | 'left' | 'right'>(null);

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => !selectMode && Math.abs(g.dx) > 8 && Math.abs(g.dy) < 20,
    onPanResponderMove: (_, g) => { translateX.setValue(g.dx); setSwiping(g.dx > 0 ? 'right' : 'left'); },
    onPanResponderRelease: (_, g) => {
      if (g.dx > 80) {
        Animated.spring(translateX, { toValue: SW, useNativeDriver: true }).start(() => { onValidate(); translateX.setValue(0); setSwiping(null); });
      } else if (g.dx < -80) {
        Animated.spring(translateX, { toValue: -SW, useNativeDriver: true }).start(() => { onReject(); translateX.setValue(0); setSwiping(null); });
      } else {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start(() => setSwiping(null));
      }
    },
  })).current;

  return (
    <View style={{ position:'relative', borderRadius:18, overflow:'hidden', marginBottom:10 }}>
      {/* Swipe hint backgrounds */}
      <View style={{ position:'absolute', inset:0, flexDirection:'row' }}>
        <LinearGradient colors={['#16A34A','#4ADE80']} style={{ flex:1, justifyContent:'center', alignItems:'flex-start', paddingLeft:20 }}>
          <Ionicons name="checkmark-circle" size={28} color="#fff" />
          <Text style={{ color:'#fff', fontSize:11, fontWeight:'800', marginTop:4 }}>Valider</Text>
        </LinearGradient>
        <LinearGradient colors={['#FCA5A5','#DC2626']} style={{ flex:1, justifyContent:'center', alignItems:'flex-end', paddingRight:20 }}>
          <Ionicons name="close-circle" size={28} color="#fff" />
          <Text style={{ color:'#fff', fontSize:11, fontWeight:'800', marginTop:4 }}>Rejeter</Text>
        </LinearGradient>
      </View>

      <Animated.View {...panResponder.panHandlers} style={{ transform:[{ translateX }] }}>
        <TouchableOpacity
          onPress={selectMode ? onSelect : onOpen}
          onLongPress={onSelect}
          activeOpacity={0.87}
          style={{
            backgroundColor: selected ? theme.primaryLight : theme.surface,
            borderRadius:18, overflow:'hidden',
            borderWidth: selected ? 2 : 1,
            borderColor: selected ? theme.primary : theme.border,
            shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.06, shadowRadius:8, elevation:2,
          }}
        >
          {/* Color top bar */}
          <View style={{ height:3, backgroundColor: cfg.color }} />
          <View style={{ flexDirection:'row' }}>
            {selectMode && (
              <View style={{ width:48, justifyContent:'center', alignItems:'center' }}>
                <View style={{ width:24, height:24, borderRadius:12, borderWidth:2, borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primary : 'transparent', justifyContent:'center', alignItems:'center' }}>
                  {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
              </View>
            )}
            {/* Image */}
            <View style={{ width:88, height:88, overflow:'hidden' }}>
              {item.imageUri
                ? <Image source={{ uri: item.imageUri }} style={{ width:88, height:88 }} contentFit="cover" />
                : <View style={{ width:88, height:88, backgroundColor:theme.surfaceAlt, justifyContent:'center', alignItems:'center' }}>
                    <Text style={{ fontSize:30 }}>🗑️</Text>
                  </View>
              }
              {/* Priority overlay badge */}
              {item.priority === 'high' && (
                <View style={{ position:'absolute', top:6, left:6, backgroundColor:'#F59E0B', borderRadius:6, width:20, height:20, justifyContent:'center', alignItems:'center' }}>
                  <Ionicons name="flag" size={11} color="#fff" />
                </View>
              )}
            </View>
            {/* Content */}
            <View style={{ flex:1, paddingHorizontal:13, paddingVertical:11, justifyContent:'space-between' }}>
              {/* Title + note icon */}
              <View style={{ flexDirection:'row', alignItems:'flex-start', gap:6 }}>
                <Text style={{ fontSize:13.5, fontWeight:'800', color:theme.text, flex:1, lineHeight:18 }} numberOfLines={2}>
                  {item.address?.split(',')[0]}
                </Text>
                {!!item.internalNote && (
                  <View style={{ marginTop:2, width:20, height:20, borderRadius:6, backgroundColor:theme.surfaceAlt, justifyContent:'center', alignItems:'center' }}>
                    <Ionicons name="document-text-outline" size={11} color={theme.textMuted} />
                  </View>
                )}
              </View>
              {/* Address */}
              <Text style={{ fontSize:11, color:theme.textMuted, marginTop:2 }} numberOfLines={1}>
                <Ionicons name="location-outline" size={11} color={theme.textMuted} /> {item.address?.split(',').slice(1).join(',').trim() || item.address}
              </Text>
              {/* Bottom row */}
              <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop:6 }}>
                <StatusPill status={item.status} />
                <View style={{ flexDirection:'row', alignItems:'center', gap:3 }}>
                  <Ionicons name="time-outline" size={10} color={theme.textMuted} />
                  <Text style={{ fontSize:10, color:theme.textMuted, fontWeight:'600' }}>{relativeTime(item.createdAt)}</Text>
                  <Text style={{ fontSize:10, color:theme.border }}>·</Text>
                  <Text style={{ fontSize:10, fontWeight:'700', color:theme.textSub }}>{item.userName}</Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function MunicipalityPortalScreen() {
  const { user, logout, updateProfile } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const munId   = user?.municipalityId ?? '';
  const munName = user?.municipalityName ?? 'Municipalité';

  const theme = useMemo<PT>(() => ({
    dark:         isDark,
    bg:           colors.background,
    surface:      colors.surface,
    surfaceAlt:   colors.surfaceAlt,
    border:       colors.border,
    text:         colors.text,
    textSub:      colors.textSecondary,
    textMuted:    colors.textMuted,
    primary:      colors.primary,
    primaryLight: colors.primaryGhost,
    gradient:     [colors.primaryDark, colors.primary] as [string, string],
  }), [isDark, colors]);

  const [inbox,       setInbox]       = useState<InboxItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [navTab,      setNavTab]      = useState<NavTab>('dashboard');
  const [newBadge,    setNewBadge]    = useState(0);
  const prevInboxLen  = useRef(0);
  const badgeAnim     = useRef(new Animated.Value(1)).current;

  // Reports filters
  const [filterTab,  setFilterTab]  = useState<TabKey>('all');
  const [search,     setSearch]     = useState('');
  const [sortBy,     setSortBy]     = useState<SortKey>('date');
  const [dateRange,  setDateRange]  = useState<DateRange>('all');
  const [showSort,   setShowSort]   = useState(false);
  const [showDateFi, setShowDateFi] = useState(false);

  // Select mode
  const [selectMode, setSelectMode] = useState(false);
  const [selected,   setSelected]   = useState<Set<string>>(new Set());

  // Detail modal
  const [detail,        setDetail]        = useState<InboxItem | null>(null);
  const [updating,      setUpdating]      = useState(false);
  const [note,          setNote]          = useState('');
  const [editNote,      setEditNote]      = useState(false);
  const [assignedTo,    setAssignedTo]    = useState('');
  const [editAssign,    setEditAssign]    = useState(false);
  const [pubComment,    setPubComment]    = useState('');
  const [editPubComment,setEditPubComment]= useState(false);
  const [msgText,       setMsgText]       = useState('');
  const [showMsgModal,  setShowMsgModal]  = useState(false);
  const [sendingMsg,    setSendingMsg]    = useState(false);
  const [msgSent,       setMsgSent]       = useState(false);
  const slideAnim = useRef(new Animated.Value(500)).current;

  // Profile
  const [profilePhone,    setProfilePhone]    = useState(user?.phone ?? '');
  const [editingProfile,  setEditingProfile]  = useState(false);

  // Map
  const [mapFilter, setMapFilter] = useState<TabKey>('all');

  // Nav tab indicator
  const tabIdx  = NAV_TABS.findIndex(t => t.key === navTab);
  const tabAnim = useRef(new Animated.Value(tabIdx)).current;
  useEffect(() => {
    Animated.spring(tabAnim, { toValue: tabIdx, useNativeDriver: false, tension: 70, friction: 12 }).start();
  }, [tabIdx]);

  // Firestore
  const unsubRef = useRef<any>(null);
  const load = useCallback(() => {
    if (!munId) return;
    if (unsubRef.current) unsubRef.current();
    const q = query(collection(db, 'municipalities', munId, 'inbox'), orderBy('createdAt', 'desc'));
    unsubRef.current = onSnapshot(q, snap => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as InboxItem));
      setInbox(items);
      if (prevInboxLen.current > 0 && items.length > prevInboxLen.current) {
        const diff = items.length - prevInboxLen.current;
        setNewBadge(b => b + diff);
        Animated.sequence([
          Animated.spring(badgeAnim, { toValue:1.4, useNativeDriver:true }),
          Animated.spring(badgeAnim, { toValue:1, useNativeDriver:true }),
        ]).start();
      }
      prevInboxLen.current = items.length;
      setLoading(false); setRefreshing(false);
    }, () => { setLoading(false); setRefreshing(false); });
  }, [munId]);

  useEffect(() => { load(); return () => { unsubRef.current?.(); }; }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  // Counts
  const counts = useMemo(() => ({
    all:       inbox.length,
    pending:   inbox.filter(i => i.status === 'pending').length,
    reviewed:  inbox.filter(i => i.status === 'reviewed').length,
    validated: inbox.filter(i => i.status === 'validated').length,
    rejected:  inbox.filter(i => i.status === 'rejected').length,
    highPrio:  inbox.filter(i => i.priority === 'high').length,
  }), [inbox]);

  // Previous week counts (for trend)
  const prevCounts = useMemo(() => {
    const prev = inbox.filter(i => {
      const d = i.createdAt?.toDate ? i.createdAt.toDate() : new Date(i.createdAt ?? 0);
      const age = (Date.now() - d.getTime()) / 86400000;
      return age >= 7 && age < 14;
    });
    return {
      pending:   prev.filter(i => i.status === 'pending').length,
      reviewed:  prev.filter(i => i.status === 'reviewed').length,
      validated: prev.filter(i => i.status === 'validated').length,
      rejected:  prev.filter(i => i.status === 'rejected').length,
    };
  }, [inbox]);

  const validationRate = counts.all > 0 ? Math.round((counts.validated / counts.all) * 100) : 0;

  // Filtered list
  const displayed = useMemo(() => {
    let list = filterTab === 'all' ? inbox : inbox.filter(i => i.status === filterTab);
    list = list.filter(i => inRange(i.createdAt, dateRange));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i => i.address?.toLowerCase().includes(q) || i.userName?.toLowerCase().includes(q));
    }
    if (sortBy === 'status') {
      const order = ['pending','reviewed','validated','rejected'];
      list = [...list].sort((a,b) => order.indexOf(a.status) - order.indexOf(b.status));
    } else if (sortBy === 'priority') {
      list = [...list].sort((a,b) => (b.priority==='high'?1:0) - (a.priority==='high'?1:0));
    }
    return list;
  }, [inbox, filterTab, search, sortBy, dateRange]);

  const mapItems = useMemo(() =>
    (mapFilter==='all' ? inbox : inbox.filter(i=>i.status===mapFilter)).filter(i=>i.latitude&&i.longitude),
    [inbox, mapFilter]);

  const mapRegion = useMemo(() => {
    if (!mapItems.length) return { latitude:36.8, longitude:10.18, latitudeDelta:0.15, longitudeDelta:0.15 };
    const lats = mapItems.map(i=>i.latitude), lngs = mapItems.map(i=>i.longitude);
    const minLat=Math.min(...lats), maxLat=Math.max(...lats);
    const minLng=Math.min(...lngs), maxLng=Math.max(...lngs);
    return { latitude:(minLat+maxLat)/2, longitude:(minLng+maxLng)/2, latitudeDelta:Math.max(maxLat-minLat,0.05)*1.4, longitudeDelta:Math.max(maxLng-minLng,0.05)*1.4 };
  }, [mapItems]);

  // Detail
  const openDetail = (item: InboxItem) => {
    setDetail(item);
    setNote(item.internalNote??''); setEditNote(false);
    setAssignedTo((item as any).assignedTo??''); setEditAssign(false);
    setPubComment((item as any).publicComment??''); setEditPubComment(false);
    setMsgText(''); setMsgSent(false);
    Animated.spring(slideAnim, { toValue:0, useNativeDriver:true, tension:65, friction:11 }).start();
  };
  const closeDetail = () => {
    Animated.timing(slideAnim, { toValue:500, useNativeDriver:true, duration:220 }).start(()=>setDetail(null));
  };

  const updateStatus = async (status: InboxItem['status'], item?: InboxItem) => {
    const target = item ?? detail;
    if (!target || updating) return;
    setUpdating(true);
    try {
      const historyEntry: StatusHistoryEntry = { status, at: new Date().toISOString() };
      const prevHistory: StatusHistoryEntry[] = (target as any).statusHistory ?? [];
      const newHistory = [...prevHistory, historyEntry];
      await updateDoc(doc(db,'municipalities',munId,'inbox',target.id), { status, statusHistory: newHistory });
      if (target.reportId) await updateDoc(doc(db,'reports',target.reportId), { status }).catch(()=>{});
      setInbox(prev => prev.map(i => i.id===target.id ? {...i, status, statusHistory: newHistory} : i));
      if (detail?.id === target.id) setDetail(prev => prev ? {...prev, status, statusHistory: newHistory} : null);
    } finally { setUpdating(false); }
  };

  // Bulk update
  const bulkUpdate = async (status: InboxItem['status']) => {
    const ids = Array.from(selected);
    await Promise.all(ids.map(id => {
      const item = inbox.find(i => i.id===id);
      if (!item) return;
      updateDoc(doc(db,'municipalities',munId,'inbox',id), { status }).catch(()=>{});
      if (item.reportId) updateDoc(doc(db,'reports',item.reportId), { status }).catch(()=>{});
    }));
    setInbox(prev => prev.map(i => selected.has(i.id) ? {...i, status} : i));
    setSelected(new Set()); setSelectMode(false);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  const togglePriority = async (item: InboxItem) => {
    const priority = item.priority==='high' ? 'normal' : 'high';
    await updateDoc(doc(db,'municipalities',munId,'inbox',item.id), { priority }).catch(()=>{});
    setInbox(prev => prev.map(i => i.id===item.id ? {...i,priority} : i));
    if (detail?.id===item.id) setDetail(prev => prev ? {...prev,priority} : null);
  };

  const saveNote = async () => {
    if (!detail) return;
    await updateDoc(doc(db,'municipalities',munId,'inbox',detail.id), { internalNote:note }).catch(()=>{});
    setInbox(prev => prev.map(i => i.id===detail.id ? {...i,internalNote:note} : i));
    setDetail(prev => prev ? {...prev,internalNote:note} : null);
    setEditNote(false);
  };

  const saveCategory = async (cat: string) => {
    if (!detail) return;
    await updateDoc(doc(db,'municipalities',munId,'inbox',detail.id), { category: cat }).catch(()=>{});
    if (detail.reportId) await updateDoc(doc(db,'reports',detail.reportId), { category: cat }).catch(()=>{});
    setInbox(prev => prev.map(i => i.id===detail.id ? {...i, category: cat} as any : i));
    setDetail(prev => prev ? {...prev, category: cat} as any : null);
  };

  const saveAssign = async () => {
    if (!detail) return;
    await updateDoc(doc(db,'municipalities',munId,'inbox',detail.id), { assignedTo }).catch(()=>{});
    setInbox(prev => prev.map(i => i.id===detail.id ? {...i, assignedTo} as any : i));
    setDetail(prev => prev ? {...prev, assignedTo} as any : null);
    setEditAssign(false);
  };

  const savePubComment = async () => {
    if (!detail) return;
    await updateDoc(doc(db,'municipalities',munId,'inbox',detail.id), { publicComment: pubComment }).catch(()=>{});
    if (detail.reportId) await updateDoc(doc(db,'reports',detail.reportId), { adminComment: pubComment }).catch(()=>{});
    setDetail(prev => prev ? {...prev, publicComment: pubComment} as any : null);
    setEditPubComment(false);
  };

  const sendMessageToCitizen = async () => {
    if (!detail || !msgText.trim()) return;
    setSendingMsg(true);
    try {
      // Store message in Firestore
      await addDoc(collection(db, 'messages'), {
        toUserId: detail.userId ?? '',
        fromMunicipality: munName,
        reportId: detail.reportId ?? detail.id,
        address: detail.address,
        text: msgText.trim(),
        sentAt: serverTimestamp(),
        read: false,
      });
      // Send push if citizen has a token
      if (detail.userId) {
        const userSnap = await getDoc(doc(db, 'users', detail.userId)).catch(()=>null);
        const pushToken = userSnap?.data()?.pushToken;
        if (pushToken) {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
              to: pushToken,
              title: `🏛️ Message de ${munName}`,
              body: msgText.trim(),
              data: { type: 'municipality_message', reportId: detail.reportId ?? detail.id },
              sound: 'default', priority: 'high',
            }),
          }).catch(()=>{});
        }
      }
      setMsgSent(true);
      setShowMsgModal(false);
      setMsgText('');
    } finally { setSendingMsg(false); }
  };

  const shareReport = async (item: InboxItem) => {
    const cfg = scfg(item.status);
    await Share.share({ message:`📋 Signalement — Municipalité de ${munName}\n\n📍 ${item.address}\n👤 ${item.userName}\n🔖 ${cfg.label}\n\nPoubCoin`, title:`Signalement ${munName}` }).catch(()=>{});
  };

  const exportCSV = () => {
    const header = 'Adresse,Citoyen,Statut,Priorité,Date';
    const rows = inbox.map(i => {
      const d = i.createdAt?.toDate ? i.createdAt.toDate().toLocaleDateString('fr-FR') : '—';
      return `"${i.address}","${i.userName}","${scfg(i.status).label}","${i.priority==='high'?'Haute':'Normale'}","${d}"`;
    });
    Share.share({ message:`${header}\n${rows.join('\n')}`, title:`Export ${munName}` }).catch(()=>{});
  };

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const confirmLogout = () => setShowLogoutModal(true);

  const tabBarW = SW / NAV_TABS.length;

  return (
    <ThemeCtx.Provider value={{ theme }}>
      <SafeAreaView style={{ flex:1, backgroundColor:theme.bg }}>

        {/* ── Header ── */}
        <LinearGradient colors={theme.gradient} style={{ paddingHorizontal:18, paddingTop:14, paddingBottom:16 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
            <View style={{ width:46, height:46, borderRadius:14, backgroundColor:'rgba(255,255,255,0.15)', justifyContent:'center', alignItems:'center', borderWidth:1.5, borderColor:'rgba(255,255,255,0.25)' }}>
              <Text style={{ fontSize:24 }}>🏛️</Text>
            </View>
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:10, fontWeight:'800', color:'rgba(255,255,255,0.5)', letterSpacing:2 }}>PORTAIL MUNICIPALITÉ</Text>
              <Text style={{ fontSize:17, fontWeight:'900', color:'#fff', marginTop:1 }}>{munName}</Text>
            </View>
            {counts.pending > 0 && (
              <View style={{ backgroundColor:'#EF4444', borderRadius:20, paddingHorizontal:10, paddingVertical:5, flexDirection:'row', alignItems:'center', gap:4 }}>
                <View style={{ width:6, height:6, borderRadius:3, backgroundColor:'#fff' }} />
                <Text style={{ fontSize:12, fontWeight:'900', color:'#fff' }}>{counts.pending} urgent{counts.pending>1?'s':''}</Text>
              </View>
            )}
            <TouchableOpacity onPress={exportCSV}
              style={{ width:38, height:38, borderRadius:11, backgroundColor:'rgba(255,255,255,0.12)', justifyContent:'center', alignItems:'center' }}>
              <Ionicons name="download-outline" size={17} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={confirmLogout}
              style={{ width:38, height:38, borderRadius:11, backgroundColor:'rgba(255,255,255,0.12)', justifyContent:'center', alignItems:'center' }}>
              <Ionicons name="log-out-outline" size={19} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ── Content ── */}
        <View style={{ flex:1 }}>
          {navTab==='dashboard' && <DashboardTab inbox={inbox} counts={counts} prevCounts={prevCounts} validationRate={validationRate} loading={loading} refreshing={refreshing} onRefresh={onRefresh} onNavigate={setNavTab} onExport={exportCSV} />}
          {navTab==='reports'   && <ReportsTab displayed={displayed} counts={counts} filterTab={filterTab} setFilterTab={setFilterTab} search={search} setSearch={setSearch} sortBy={sortBy} setSortBy={setSortBy} dateRange={dateRange} setDateRange={setDateRange} showSort={showSort} setShowSort={setShowSort} showDateFi={showDateFi} setShowDateFi={setShowDateFi} onOpen={openDetail} loading={loading} refreshing={refreshing} onRefresh={onRefresh} selectMode={selectMode} setSelectMode={setSelectMode} selected={selected} toggleSelect={toggleSelect} onBulkUpdate={bulkUpdate} onValidate={(id:string)=>updateStatus('validated',inbox.find((i:InboxItem)=>i.id===id))} onReject={(id:string)=>updateStatus('rejected',inbox.find((i:InboxItem)=>i.id===id))} />}
          {navTab==='map'     && <MapTab items={mapItems} region={mapRegion} mapFilter={mapFilter} setMapFilter={setMapFilter} onOpen={openDetail} refreshing={refreshing} onRefresh={onRefresh} />}
          {navTab==='profile' && <ProfileTab user={user} munName={munName} counts={counts} validationRate={validationRate} editingProfile={editingProfile} setEditingProfile={setEditingProfile} profilePhone={profilePhone} setProfilePhone={setProfilePhone} onSave={async()=>{ await updateProfile({phone:profilePhone}); setEditingProfile(false); }} onLogout={confirmLogout} isDark={isDark} onToggleDark={toggleTheme} onExport={exportCSV} inbox={inbox} />}
        </View>

        {/* ── Bottom Nav ── */}
        <View style={{ backgroundColor:theme.surface, borderTopWidth:1, borderTopColor:theme.border, paddingBottom:Platform.OS==='ios'?24:6, paddingTop:6, paddingHorizontal:6 }}>
          <View style={{ flexDirection:'row' }}>
            {NAV_TABS.map(t => {
              const active = navTab === t.key;
              const badge  = t.key==='reports' && counts.pending>0 ? counts.pending : 0;
              return (
                <TouchableOpacity
                  key={t.key}
                  onPress={()=>{ setNavTab(t.key); setSelectMode(false); setSelected(new Set()); if(t.key==='reports') setNewBadge(0); }}
                  style={{ flex:1, alignItems:'center', gap:3, paddingVertical:4 }}
                >
                  <View style={{ position:'relative' }}>
                    <Animated.View style={{
                      transform: t.key==='reports' && newBadge>0 ? [{ scale: badgeAnim }] : [],
                    }}>
                      {active ? (
                        <LinearGradient
                          colors={theme.gradient}
                          style={{ width:52, height:34, borderRadius:17, justifyContent:'center', alignItems:'center',
                            shadowColor:theme.primary, shadowOffset:{width:0,height:4}, shadowOpacity:0.4, shadowRadius:8, elevation:6 }}
                        >
                          <Ionicons name={t.activeIcon as any} size={20} color="#fff" />
                        </LinearGradient>
                      ) : (
                        <View style={{ width:52, height:34, borderRadius:17, justifyContent:'center', alignItems:'center' }}>
                          <Ionicons name={t.icon as any} size={20} color={theme.textMuted} />
                        </View>
                      )}
                    </Animated.View>
                    {(badge>0 || (t.key==='reports' && newBadge>0)) && (
                      <View style={{ position:'absolute', top:-4, right:-2, backgroundColor:'#EF4444', borderRadius:9, minWidth:18, height:18, justifyContent:'center', alignItems:'center', borderWidth:2, borderColor:theme.surface }}>
                        <Text style={{ fontSize:9, fontWeight:'900', color:'#fff', paddingHorizontal:2 }}>{newBadge > 0 && t.key==='reports' ? newBadge : badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize:10, fontWeight:active?'800':'500', color:active?theme.primary:theme.textMuted, letterSpacing:active?0.3:0.1 }}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Logout Modal ── */}
        <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={()=>setShowLogoutModal(false)}>
          <TouchableOpacity style={{ flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center', padding:32 }} activeOpacity={1} onPress={()=>setShowLogoutModal(false)}>
            <TouchableOpacity activeOpacity={1} onPress={e=>e.stopPropagation()}>
              <View style={{ backgroundColor:theme.surface, borderRadius:24, padding:28, width:300, alignItems:'center', shadowColor:'#000', shadowOffset:{width:0,height:8}, shadowOpacity:0.18, shadowRadius:20, elevation:12 }}>
                <View style={{ width:56, height:56, borderRadius:28, backgroundColor:'#FEE2E2', justifyContent:'center', alignItems:'center', marginBottom:16 }}>
                  <Ionicons name="log-out-outline" size={26} color="#DC2626" />
                </View>
                <Text style={{ fontSize:17, fontWeight:'800', color:theme.text, marginBottom:8 }}>Déconnexion</Text>
                <Text style={{ fontSize:13, color:theme.textMuted, textAlign:'center', marginBottom:24, lineHeight:19 }}>Voulez-vous vous déconnecter de votre compte municipal ?</Text>
                <View style={{ flexDirection:'row', gap:10, width:'100%' }}>
                  <TouchableOpacity onPress={()=>setShowLogoutModal(false)} style={{ flex:1, backgroundColor:theme.surfaceAlt, borderRadius:14, paddingVertical:13, alignItems:'center', borderWidth:1, borderColor:theme.border }}>
                    <Text style={{ fontSize:14, fontWeight:'700', color:theme.text }}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={()=>{ setShowLogoutModal(false); logout(); }} style={{ flex:1, backgroundColor:'#DC2626', borderRadius:14, paddingVertical:13, alignItems:'center' }}>
                    <Text style={{ fontSize:14, fontWeight:'800', color:'#fff' }}>Déconnecter</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* ── Detail Modal ── */}
        <Modal visible={!!detail} transparent animationType="none" onRequestClose={closeDetail}>
          <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.55)', justifyContent:'flex-end' }}>
            <TouchableOpacity style={{ flex:1 }} activeOpacity={1} onPress={closeDetail} />
            <Animated.View style={{ backgroundColor:theme.surface, borderTopLeftRadius:28, borderTopRightRadius:28, maxHeight:'92%', transform:[{translateY:slideAnim}] }}>
              <View style={{ alignItems:'center', paddingTop:12, paddingBottom:2 }}>
                <View style={{ width:36, height:4, borderRadius:2, backgroundColor:theme.border }} />
              </View>
              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                {detail?.imageUri
                  ? <Image source={{uri:detail.imageUri}} style={{ width:'100%', height:210 }} contentFit="cover" />
                  : <View style={{ width:'100%', height:100, backgroundColor:theme.surfaceAlt, justifyContent:'center', alignItems:'center' }}><Text style={{ fontSize:44 }}>🗑️</Text></View>
                }
                <View style={{ padding:20 }}>
                  <View style={{ flexDirection:'row', alignItems:'flex-start', marginBottom:10 }}>
                    <View style={{ flex:1 }}>
                      <Text style={{ fontSize:18, fontWeight:'900', color:theme.text }} numberOfLines={2}>{detail?.address?.split(',')[0]??'Signalement'}</Text>
                      <Text style={{ fontSize:12, color:theme.textMuted, marginTop:3 }}>📍 {detail?.address}</Text>
                    </View>
                    <View style={{ flexDirection:'row', gap:8, marginLeft:10 }}>
                      <TouchableOpacity onPress={()=>detail&&togglePriority(detail)} style={{ width:36, height:36, borderRadius:18, backgroundColor:detail?.priority==='high'?'#FEF3C7':theme.surfaceAlt, justifyContent:'center', alignItems:'center', borderWidth:1.5, borderColor:detail?.priority==='high'?'#F59E0B':theme.border }}>
                        <Ionicons name="flag" size={16} color={detail?.priority==='high'?'#F59E0B':theme.textMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={()=>detail&&shareReport(detail)} style={{ width:36, height:36, borderRadius:18, backgroundColor:theme.surfaceAlt, justifyContent:'center', alignItems:'center' }}>
                        <Ionicons name="share-outline" size={16} color={theme.textSub} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={closeDetail} style={{ width:36, height:36, borderRadius:18, backgroundColor:theme.surfaceAlt, justifyContent:'center', alignItems:'center' }}>
                        <Ionicons name="close" size={17} color={theme.textSub} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:18 }}>
                    {detail && <StatusPill status={detail.status} size="md" />}
                    {detail?.priority==='high' && <View style={{ flexDirection:'row', alignItems:'center', gap:4, backgroundColor:'#FEF3C7', borderRadius:20, paddingHorizontal:10, paddingVertical:5 }}><Ionicons name="flag" size={11} color="#F59E0B" /><Text style={{ fontSize:11, fontWeight:'800', color:'#F59E0B' }}>Priorité haute</Text></View>}
                    <View style={{ flexDirection:'row', alignItems:'center', gap:4, backgroundColor:theme.surfaceAlt, borderRadius:20, paddingHorizontal:10, paddingVertical:5 }}><Ionicons name="person" size={11} color={theme.textSub} /><Text style={{ fontSize:11, fontWeight:'700', color:theme.textSub }}>{detail?.userName??'—'}</Text></View>
                    <View style={{ flexDirection:'row', alignItems:'center', gap:4, backgroundColor:theme.surfaceAlt, borderRadius:20, paddingHorizontal:10, paddingVertical:5 }}><Ionicons name="time-outline" size={11} color={theme.textMuted} /><Text style={{ fontSize:11, fontWeight:'600', color:theme.textMuted }}>{relativeTime(detail?.createdAt)}</Text></View>
                  </View>
                  {/* Catégorie */}
                  <View style={{ marginBottom:18 }}>
                    <Text style={{ fontSize:11, fontWeight:'800', color:theme.text, marginBottom:10, textTransform:'uppercase', letterSpacing:1 }}>Catégorie</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection:'row', gap:8 }}>
                        {WASTE_CATEGORIES.map(c => {
                          const active = (detail as any)?.category === c.key;
                          return (
                            <TouchableOpacity key={c.key} onPress={()=>saveCategory(c.key)}
                              style={{ flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:12, paddingVertical:7, borderRadius:20,
                                backgroundColor: active ? theme.primary : theme.surfaceAlt,
                                borderWidth:1.5, borderColor: active ? theme.primary : theme.border }}>
                              <Text style={{ fontSize:14 }}>{c.icon}</Text>
                              <Text style={{ fontSize:12, fontWeight:'700', color: active ? '#fff' : theme.textSub }}>{c.label}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>

                  <View style={{ height:1, backgroundColor:theme.border, marginBottom:18 }} />
                  <Text style={{ fontSize:11, fontWeight:'800', color:theme.text, marginBottom:12, textTransform:'uppercase', letterSpacing:1 }}>Traitement</Text>
                  <View style={{ gap:9, marginBottom:20 }}>
                    {(['validated','reviewed','rejected'] as const).map(s => {
                      const cfg = scfg(s);
                      const active = detail?.status === s;
                      return (
                        <TouchableOpacity key={s} onPress={()=>updateStatus(s)} disabled={updating||active} activeOpacity={0.8}
                          style={{ flexDirection:'row', alignItems:'center', gap:14, padding:15, borderRadius:16, backgroundColor:active?cfg.color:theme.surfaceAlt, borderWidth:2, borderColor:active?cfg.color:theme.border, opacity:updating?0.6:1 }}>
                          <View style={{ width:38, height:38, borderRadius:19, backgroundColor:active?'rgba(255,255,255,0.2)':cfg.bg, justifyContent:'center', alignItems:'center' }}>
                            <Ionicons name={cfg.icon} size={20} color={active?'#fff':cfg.color} />
                          </View>
                          <View style={{ flex:1 }}>
                            <Text style={{ fontSize:14, fontWeight:'800', color:active?'#fff':cfg.color }}>{cfg.label}</Text>
                            <Text style={{ fontSize:11, color:active?'rgba(255,255,255,0.65)':theme.textMuted, marginTop:1 }}>
                              {s==='validated'?'Crédite le citoyen en PouBCoins':s==='reviewed'?'Équipe assignée sur place':'Hors zone ou non conforme'}
                            </Text>
                          </View>
                          {active ? <View style={{ backgroundColor:'rgba(255,255,255,0.25)', borderRadius:8, paddingHorizontal:8, paddingVertical:3 }}><Text style={{ fontSize:10, fontWeight:'900', color:'#fff' }}>ACTIF</Text></View>
                            : updating ? <ActivityIndicator size="small" color={cfg.color} /> : <Ionicons name="chevron-forward" size={15} color={cfg.color} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <View style={{ height:1, backgroundColor:theme.border, marginBottom:18 }} />
                  <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                    <Text style={{ fontSize:11, fontWeight:'800', color:theme.text, textTransform:'uppercase', letterSpacing:1 }}>Note interne</Text>
                    {!editNote && <TouchableOpacity onPress={()=>setEditNote(true)} style={{ flexDirection:'row', alignItems:'center', gap:4, backgroundColor:theme.primaryLight, borderRadius:10, paddingHorizontal:10, paddingVertical:5 }}><Ionicons name="pencil" size={12} color={theme.primary} /><Text style={{ fontSize:11, fontWeight:'800', color:theme.primary }}>Modifier</Text></TouchableOpacity>}
                  </View>
                  {editNote ? (
                    <View style={{ gap:8, marginBottom:20 }}>
                      <TextInput value={note} onChangeText={setNote} placeholder="Note interne…" placeholderTextColor={theme.textMuted} multiline numberOfLines={3}
                        style={{ backgroundColor:theme.surfaceAlt, borderRadius:12, borderWidth:1.5, borderColor:theme.primary+'60', padding:12, fontSize:13, color:theme.text, minHeight:80, textAlignVertical:'top' }} />
                      <View style={{ flexDirection:'row', gap:8 }}>
                        <TouchableOpacity onPress={()=>{ setEditNote(false); setNote(detail?.internalNote??''); }} style={{ flex:1, backgroundColor:theme.surfaceAlt, borderRadius:12, paddingVertical:11, alignItems:'center' }}><Text style={{ fontSize:13, fontWeight:'700', color:theme.textMuted }}>Annuler</Text></TouchableOpacity>
                        <TouchableOpacity onPress={saveNote} style={{ flex:2, backgroundColor:theme.primary, borderRadius:12, paddingVertical:11, alignItems:'center' }}><Text style={{ fontSize:13, fontWeight:'800', color:'#fff' }}>Enregistrer</Text></TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={{ backgroundColor:theme.surfaceAlt, borderRadius:12, borderWidth:1.5, borderColor:theme.border, padding:12, marginBottom:20 }}>
                      <Text style={{ fontSize:13, color:note?theme.text:theme.textMuted, fontStyle:note?'normal':'italic', lineHeight:20 }}>{note||'Aucune note.'}</Text>
                    </View>
                  )}
                  {/* ── Historique des statuts ── */}
                  {detail?.statusHistory && detail.statusHistory.length > 0 && (
                    <>
                      <View style={{ height:1, backgroundColor:theme.border, marginBottom:18 }} />
                      <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:12 }}>
                        <Ionicons name="time-outline" size={14} color={theme.primary} />
                        <Text style={{ fontSize:11, fontWeight:'800', color:theme.text, textTransform:'uppercase', letterSpacing:1 }}>Historique</Text>
                      </View>
                      <View style={{ gap:0, marginBottom:20 }}>
                        {[{ status: 'pending', at: detail.createdAt?.toDate?.()?.toISOString() ?? detail.createdAt }, ...detail.statusHistory].map((h, idx, arr) => {
                          const cfg = scfg(h.status);
                          const d = h.at?.toDate ? h.at.toDate() : new Date(h.at ?? 0);
                          const isLast = idx === arr.length - 1;
                          return (
                            <View key={idx} style={{ flexDirection:'row', gap:12, alignItems:'flex-start' }}>
                              <View style={{ alignItems:'center', width:20 }}>
                                <View style={{ width:20, height:20, borderRadius:10, backgroundColor:cfg.color, justifyContent:'center', alignItems:'center' }}>
                                  <Ionicons name={cfg.icon} size={10} color="#fff" />
                                </View>
                                {!isLast && <View style={{ width:2, flex:1, backgroundColor:theme.border, marginVertical:2, minHeight:16 }} />}
                              </View>
                              <View style={{ flex:1, paddingBottom: isLast ? 0 : 10 }}>
                                <Text style={{ fontSize:12, fontWeight:'800', color:cfg.color }}>{cfg.label}</Text>
                                <Text style={{ fontSize:10, color:theme.textMuted, marginTop:1 }}>
                                  {d.toLocaleDateString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </>
                  )}

                  {/* ── Assignation agent ── */}
                  <View style={{ height:1, backgroundColor:theme.border, marginBottom:18 }} />
                  <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                    <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                      <Ionicons name="person-add-outline" size={14} color={theme.primary} />
                      <Text style={{ fontSize:11, fontWeight:'800', color:theme.text, textTransform:'uppercase', letterSpacing:1 }}>Assigné à</Text>
                    </View>
                    {!editAssign && <TouchableOpacity onPress={()=>setEditAssign(true)} style={{ flexDirection:'row', alignItems:'center', gap:4, backgroundColor:theme.primaryLight, borderRadius:10, paddingHorizontal:10, paddingVertical:5 }}><Ionicons name="pencil" size={12} color={theme.primary} /><Text style={{ fontSize:11, fontWeight:'800', color:theme.primary }}>Modifier</Text></TouchableOpacity>}
                  </View>
                  {editAssign ? (
                    <View style={{ gap:8, marginBottom:20 }}>
                      <TextInput value={assignedTo} onChangeText={setAssignedTo} placeholder="Nom de l'agent…" placeholderTextColor={theme.textMuted}
                        style={{ backgroundColor:theme.surfaceAlt, borderRadius:12, borderWidth:1.5, borderColor:theme.primary+'60', padding:12, fontSize:13, color:theme.text }} />
                      <View style={{ flexDirection:'row', gap:8 }}>
                        <TouchableOpacity onPress={()=>setEditAssign(false)} style={{ flex:1, backgroundColor:theme.surfaceAlt, borderRadius:12, paddingVertical:11, alignItems:'center' }}><Text style={{ fontSize:13, fontWeight:'700', color:theme.textMuted }}>Annuler</Text></TouchableOpacity>
                        <TouchableOpacity onPress={saveAssign} style={{ flex:2, backgroundColor:theme.primary, borderRadius:12, paddingVertical:11, alignItems:'center' }}><Text style={{ fontSize:13, fontWeight:'800', color:'#fff' }}>Enregistrer</Text></TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={{ backgroundColor:theme.surfaceAlt, borderRadius:12, borderWidth:1.5, borderColor:theme.border, padding:12, marginBottom:20, flexDirection:'row', alignItems:'center', gap:8 }}>
                      <View style={{ width:28, height:28, borderRadius:14, backgroundColor:assignedTo?theme.primaryLight:theme.border, justifyContent:'center', alignItems:'center' }}>
                        <Ionicons name="person" size={14} color={assignedTo?theme.primary:theme.textMuted} />
                      </View>
                      <Text style={{ fontSize:13, color:assignedTo?theme.text:theme.textMuted, fontStyle:assignedTo?'normal':'italic' }}>{assignedTo||'Non assigné'}</Text>
                    </View>
                  )}

                  {/* ── Commentaire public ── */}
                  <View style={{ height:1, backgroundColor:theme.border, marginBottom:18 }} />
                  <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                    <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                      <Ionicons name="chatbubble-outline" size={14} color="#3B82F6" />
                      <Text style={{ fontSize:11, fontWeight:'800', color:theme.text, textTransform:'uppercase', letterSpacing:1 }}>Réponse au citoyen</Text>
                    </View>
                    {!editPubComment && <TouchableOpacity onPress={()=>setEditPubComment(true)} style={{ flexDirection:'row', alignItems:'center', gap:4, backgroundColor:'#EFF6FF', borderRadius:10, paddingHorizontal:10, paddingVertical:5 }}><Ionicons name="pencil" size={12} color="#3B82F6" /><Text style={{ fontSize:11, fontWeight:'800', color:'#3B82F6' }}>Modifier</Text></TouchableOpacity>}
                  </View>
                  {editPubComment ? (
                    <View style={{ gap:8, marginBottom:20 }}>
                      <TextInput value={pubComment} onChangeText={setPubComment} placeholder="Réponse visible par le citoyen…" placeholderTextColor={theme.textMuted} multiline numberOfLines={3}
                        style={{ backgroundColor:theme.surfaceAlt, borderRadius:12, borderWidth:1.5, borderColor:'#3B82F6'+'60', padding:12, fontSize:13, color:theme.text, minHeight:80, textAlignVertical:'top' }} />
                      <View style={{ flexDirection:'row', gap:8 }}>
                        <TouchableOpacity onPress={()=>setEditPubComment(false)} style={{ flex:1, backgroundColor:theme.surfaceAlt, borderRadius:12, paddingVertical:11, alignItems:'center' }}><Text style={{ fontSize:13, fontWeight:'700', color:theme.textMuted }}>Annuler</Text></TouchableOpacity>
                        <TouchableOpacity onPress={savePubComment} style={{ flex:2, backgroundColor:'#3B82F6', borderRadius:12, paddingVertical:11, alignItems:'center' }}><Text style={{ fontSize:13, fontWeight:'800', color:'#fff' }}>Enregistrer</Text></TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={{ backgroundColor:'#EFF6FF', borderRadius:12, borderWidth:1.5, borderColor:'#BFDBFE', padding:12, marginBottom:20 }}>
                      <Text style={{ fontSize:13, color:pubComment?'#1E40AF':theme.textMuted, fontStyle:pubComment?'normal':'italic', lineHeight:20 }}>{pubComment||'Aucune réponse envoyée.'}</Text>
                    </View>
                  )}

                  {/* ── Message citoyen ── */}
                  <TouchableOpacity onPress={()=>setShowMsgModal(true)}
                    style={{ flexDirection:'row', alignItems:'center', gap:10, backgroundColor:'#F0FDF4', borderRadius:14, padding:14, marginBottom:12, borderWidth:1.5, borderColor:'#BBF7D0' }}>
                    <View style={{ width:36, height:36, borderRadius:18, backgroundColor:'#16A34A', justifyContent:'center', alignItems:'center' }}>
                      <Ionicons name="notifications-outline" size={18} color="#fff" />
                    </View>
                    <View style={{ flex:1 }}>
                      <Text style={{ fontSize:13, fontWeight:'800', color:'#166534' }}>Envoyer une notification</Text>
                      <Text style={{ fontSize:11, color:'#4ADE80', marginTop:1 }}>{msgSent?'✓ Notification envoyée':'Alerter le citoyen directement'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#16A34A" />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={closeDetail} style={{ backgroundColor:theme.surfaceAlt, borderRadius:16, paddingVertical:14, alignItems:'center' }}>
                    <Text style={{ fontSize:14, fontWeight:'800', color:theme.textSub }}>Fermer</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>

        {/* ── Message Modal ── */}
        <Modal visible={showMsgModal} transparent animationType="fade" onRequestClose={()=>setShowMsgModal(false)}>
          <TouchableOpacity style={{ flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center', padding:24 }} activeOpacity={1} onPress={()=>setShowMsgModal(false)}>
            <TouchableOpacity activeOpacity={1} onPress={e=>e.stopPropagation()}>
              <View style={{ backgroundColor:theme.surface, borderRadius:24, padding:24, width:340, shadowColor:'#000', shadowOffset:{width:0,height:8}, shadowOpacity:0.18, shadowRadius:20, elevation:12 }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:10, marginBottom:16 }}>
                  <View style={{ width:40, height:40, borderRadius:20, backgroundColor:'#F0FDF4', justifyContent:'center', alignItems:'center' }}>
                    <Ionicons name="notifications" size={20} color="#16A34A" />
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={{ fontSize:15, fontWeight:'800', color:theme.text }}>Message au citoyen</Text>
                    <Text style={{ fontSize:11, color:theme.textMuted }}>👤 {detail?.userName}</Text>
                  </View>
                  <TouchableOpacity onPress={()=>setShowMsgModal(false)}><Ionicons name="close" size={20} color={theme.textMuted} /></TouchableOpacity>
                </View>
                {/* Quick templates */}
                <Text style={{ fontSize:11, fontWeight:'700', color:theme.textMuted, marginBottom:8, textTransform:'uppercase', letterSpacing:0.5 }}>Modèles rapides</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:12 }}>
                  <View style={{ flexDirection:'row', gap:8 }}>
                    {[
                      'Votre signalement a bien été reçu et est en cours de traitement.',
                      'Une équipe a été envoyée sur place.',
                      'Le nettoyage est prévu dans les prochains jours.',
                      'Merci pour votre signalement, la zone a été nettoyée.',
                    ].map(t => (
                      <TouchableOpacity key={t} onPress={()=>setMsgText(t)}
                        style={{ backgroundColor:theme.surfaceAlt, borderRadius:10, paddingHorizontal:12, paddingVertical:8, borderWidth:1, borderColor:theme.border, maxWidth:200 }}>
                        <Text style={{ fontSize:11, color:theme.text }} numberOfLines={2}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
                <TextInput value={msgText} onChangeText={setMsgText} placeholder="Votre message…" placeholderTextColor={theme.textMuted} multiline numberOfLines={3}
                  style={{ backgroundColor:theme.surfaceAlt, borderRadius:12, borderWidth:1.5, borderColor:theme.border, padding:12, fontSize:13, color:theme.text, minHeight:90, textAlignVertical:'top', marginBottom:14 }} />
                <View style={{ flexDirection:'row', gap:10 }}>
                  <TouchableOpacity onPress={()=>setShowMsgModal(false)} style={{ flex:1, backgroundColor:theme.surfaceAlt, borderRadius:14, paddingVertical:13, alignItems:'center', borderWidth:1, borderColor:theme.border }}>
                    <Text style={{ fontSize:14, fontWeight:'700', color:theme.text }}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={sendMessageToCitizen} disabled={!msgText.trim()||sendingMsg}
                    style={{ flex:2, backgroundColor:msgText.trim()?'#16A34A':'#9CA3AF', borderRadius:14, paddingVertical:13, alignItems:'center', flexDirection:'row', justifyContent:'center', gap:8 }}>
                    {sendingMsg ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={15} color="#fff" />}
                    <Text style={{ fontSize:14, fontWeight:'800', color:'#fff' }}>{sendingMsg?'Envoi…':'Envoyer'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </ThemeCtx.Provider>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashboardTab({ inbox, counts, prevCounts, validationRate, loading, refreshing, onRefresh, onNavigate, onExport }: any) {
  const { theme } = usePT();
  const recent = inbox.slice(0, 5);
  const thisWeekCount = inbox.filter((i: InboxItem) => inRange(i.createdAt,'week')).length;
  const todayCount    = inbox.filter((i: InboxItem) => inRange(i.createdAt,'today')).length;

  const trend = (curr: number, prev: number) => {
    if (!prev) return null;
    const p = Math.round(((curr-prev)/prev)*100);
    return { value: p, up: p >= 0 };
  };

  return (
    <ScrollView contentContainerStyle={{ padding:16, gap:14, paddingBottom:32 }} showsVerticalScrollIndicator={false} style={{ backgroundColor:theme.bg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} colors={[theme.primary]} />}>

      {/* Hero card */}
      <LinearGradient colors={theme.gradient} style={{ borderRadius:24, padding:22, shadowColor:theme.primary, shadowOffset:{width:0,height:8}, shadowOpacity:0.3, shadowRadius:20, elevation:10, overflow:'hidden' }}>
        {/* Decorative circles */}
        <View style={{ position:'absolute', top:-30, right:-30, width:120, height:120, borderRadius:60, backgroundColor:'rgba(255,255,255,0.06)' }} />
        <View style={{ position:'absolute', bottom:-20, left:-20, width:80, height:80, borderRadius:40, backgroundColor:'rgba(255,255,255,0.04)' }} />
        {/* Top row */}
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <View>
            <Text style={{ fontSize:11, color:'rgba(255,255,255,0.55)', fontWeight:'700', letterSpacing:1.5, textTransform:'uppercase', marginBottom:4 }}>Total signalements</Text>
            <View style={{ flexDirection:'row', alignItems:'flex-end', gap:6 }}>
              <Text style={{ fontSize:52, fontWeight:'900', color:'#fff', lineHeight:56 }}>{counts.all}</Text>
              {counts.all > 0 && <Text style={{ fontSize:13, color:'rgba(255,255,255,0.5)', fontWeight:'700', marginBottom:10 }}>signalements</Text>}
            </View>
          </View>
          <View style={{ alignItems:'flex-end', gap:8 }}>
            <View style={{ backgroundColor:'rgba(255,255,255,0.15)', borderRadius:16, paddingHorizontal:14, paddingVertical:8, alignItems:'center', borderWidth:1, borderColor:'rgba(255,255,255,0.2)', minWidth:90 }}>
              <Text style={{ fontSize:9, color:'rgba(255,255,255,0.5)', fontWeight:'700', letterSpacing:1.2 }}>AUJOURD'HUI</Text>
              <Text style={{ fontSize:26, fontWeight:'900', color:'#FCD34D', lineHeight:32 }}>{todayCount}</Text>
            </View>
            <View style={{ backgroundColor:'rgba(255,255,255,0.1)', borderRadius:12, paddingHorizontal:12, paddingVertical:6, alignItems:'center', borderWidth:1, borderColor:'rgba(255,255,255,0.12)', minWidth:90 }}>
              <Text style={{ fontSize:9, color:'rgba(255,255,255,0.5)', fontWeight:'700', letterSpacing:1 }}>CETTE SEMAINE</Text>
              <Text style={{ fontSize:18, fontWeight:'900', color:'#93C5FD' }}>{thisWeekCount}</Text>
            </View>
          </View>
        </View>

        {/* Stat pills */}
        <View style={{ flexDirection:'row', gap:8, marginBottom:18 }}>
          {[
            { value:`${validationRate}%`, label:'Validés',   color:'#6EE7B7' },
            { value:counts.pending,       label:'En attente', color:'#FCA5A5' },
            { value:counts.reviewed,      label:'En cours',   color:'#93C5FD' },
          ].map(s=>(
            <View key={s.label} style={{ flex:1, backgroundColor:'rgba(255,255,255,0.1)', borderRadius:14, padding:10, alignItems:'center', borderWidth:1, borderColor:'rgba(255,255,255,0.08)' }}>
              <Text style={{ fontSize:18, fontWeight:'900', color:s.color }}>{s.value}</Text>
              <Text style={{ fontSize:9, color:'rgba(255,255,255,0.45)', fontWeight:'700', marginTop:2, textTransform:'uppercase', letterSpacing:0.5 }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Progress bar */}
        <View style={{ marginBottom: counts.pending>0 ? 14 : 0 }}>
          <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:6 }}>
            <Text style={{ fontSize:11, color:'rgba(255,255,255,0.5)', fontWeight:'600' }}>Taux de validation</Text>
            <Text style={{ fontSize:11, color:'#6EE7B7', fontWeight:'800' }}>{validationRate}%</Text>
          </View>
          <View style={{ height:6, backgroundColor:'rgba(255,255,255,0.12)', borderRadius:3 }}>
            <View style={{ height:6, width:`${validationRate}%` as any, backgroundColor:'#6EE7B7', borderRadius:3 }} />
          </View>
        </View>

        {counts.pending > 0 && (
          <TouchableOpacity onPress={()=>onNavigate('reports')} style={{ backgroundColor:'rgba(255,255,255,0.12)', borderRadius:14, padding:12, flexDirection:'row', alignItems:'center', gap:10, borderWidth:1, borderColor:'rgba(255,255,255,0.18)' }}>
            <View style={{ width:8, height:8, borderRadius:4, backgroundColor:'#FCD34D' }} />
            <Text style={{ flex:1, fontSize:12, color:'#fff', fontWeight:'700' }}>{counts.pending} signalement{counts.pending>1?'s':''} en attente de traitement</Text>
            <View style={{ backgroundColor:'rgba(255,255,255,0.2)', borderRadius:8, width:28, height:28, justifyContent:'center', alignItems:'center' }}>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* Quick actions */}
      <View style={{ flexDirection:'row', gap:10 }}>
        {[
          { label:'Signalements', icon:'documents', tab:'reports', grad:[theme.gradient[0], theme.gradient[1]] as [string,string] },
          { label:'Carte',        icon:'map',       tab:'map',     grad:['#0369A1','#0891B2'] as [string,string] },
          { label:'Exporter',     icon:'download',  tab:null,      grad:['#5B21B6','#7C3AED'] as [string,string] },
        ].map(a => (
          <TouchableOpacity key={a.label} onPress={()=>a.tab?(onNavigate as any)(a.tab):onExport()}
            activeOpacity={0.82} style={{ flex:1 }}>
            <LinearGradient colors={a.grad} style={{ borderRadius:20, paddingVertical:18, alignItems:'center', gap:10,
              shadowColor:a.grad[1], shadowOffset:{width:0,height:5}, shadowOpacity:0.35, shadowRadius:10, elevation:6 }}>
              <View style={{ width:42, height:42, borderRadius:21, backgroundColor:'rgba(255,255,255,0.18)', justifyContent:'center', alignItems:'center' }}>
                <Ionicons name={a.icon as any} size={21} color="#fff" />
              </View>
              <Text style={{ fontSize:10, fontWeight:'800', color:'#fff', textAlign:'center', letterSpacing:0.4 }}>{a.label}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats row */}
      <View style={{ flexDirection:'row', gap:10 }}>
        {[
          { label:'Priorité haute', value:counts.highPrio,                 total:counts.all, color:'#F59E0B', icon:'flag' as const,          bg:'#FEF3C7' },
          { label:'Traités',        value:counts.validated+counts.rejected, total:counts.all, color:'#16A34A', icon:'checkmark-done' as const, bg:'#DCFCE7' },
          { label:'Rejetés',        value:counts.rejected,                  total:counts.all, color:'#DC2626', icon:'close-circle' as const,   bg:'#FEE2E2' },
        ].map(s=>(
          <View key={s.label} style={{ flex:1, backgroundColor:theme.surface, borderRadius:18, padding:14, alignItems:'center', gap:6, borderWidth:1, borderColor:theme.border, shadowColor:'#000', shadowOffset:{width:0,height:3}, shadowOpacity:0.07, shadowRadius:8, elevation:3 }}>
            <LinearGradient colors={[s.bg, s.bg+'80']} style={{ width:38, height:38, borderRadius:19, justifyContent:'center', alignItems:'center' }}>
              <Ionicons name={s.icon} size={18} color={s.color} />
            </LinearGradient>
            <Text style={{ fontSize:26, fontWeight:'900', color:theme.text, lineHeight:28 }}>{s.value}</Text>
            <Text style={{ fontSize:9, color:theme.textMuted, fontWeight:'700', textAlign:'center', letterSpacing:0.5 }}>{s.label.toUpperCase()}</Text>
            <View style={{ width:'100%', height:3, backgroundColor:theme.border, borderRadius:2 }}>
              <View style={{ height:3, width:`${s.total>0?Math.round((s.value/s.total)*100):0}%` as any, backgroundColor:s.color, borderRadius:2 }} />
            </View>
          </View>
        ))}
      </View>

      {/* Donut chart */}
      <View style={{ backgroundColor:theme.surface, borderRadius:20, padding:18, borderWidth:1, borderColor:theme.border, shadowColor:'#000', shadowOffset:{width:0,height:3}, shadowOpacity:0.07, shadowRadius:8, elevation:3 }}>
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
            <LinearGradient colors={theme.gradient} style={{ width:4, height:22, borderRadius:2 }} />
            <View>
              <Text style={{ fontSize:15, fontWeight:'800', color:theme.text }}>Répartition</Text>
              <Text style={{ fontSize:11, color:theme.textMuted, marginTop:1 }}>Statuts des signalements</Text>
            </View>
          </View>
          <View style={{ backgroundColor:theme.primaryLight, borderRadius:10, paddingHorizontal:10, paddingVertical:5 }}>
            <Text style={{ fontSize:10, fontWeight:'800', color:theme.primary }}>{counts.all} total</Text>
          </View>
        </View>
        <DonutChart total={counts.all} data={[
          { label:'En attente', value:counts.pending,   color:'#F59E0B' },
          { label:'En cours',   value:counts.reviewed,  color:'#3B82F6' },
          { label:'Validés',    value:counts.validated, color:'#16A34A' },
          { label:'Rejetés',    value:counts.rejected,  color:'#DC2626' },
        ]} />
      </View>

      {/* Agent ranking */}
      {(() => {
        const agentMap: Record<string,number> = {};
        inbox.forEach((i:InboxItem) => {
          const a = (i as any).assignedTo;
          if (a) agentMap[a] = (agentMap[a]??0) + 1;
        });
        const agents = Object.entries(agentMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
        if (!agents.length) return null;
        return (
          <View style={{ backgroundColor:theme.surface, borderRadius:20, padding:18, borderWidth:1, borderColor:theme.border, shadowColor:'#000', shadowOffset:{width:0,height:3}, shadowOpacity:0.07, shadowRadius:8, elevation:3 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:10, marginBottom:14 }}>
              <LinearGradient colors={['#F59E0B','#FBBF24']} style={{ width:4, height:22, borderRadius:2 }} />
              <Ionicons name="trophy-outline" size={16} color="#F59E0B" />
              <Text style={{ fontSize:15, fontWeight:'800', color:theme.text }}>Classement agents</Text>
            </View>
            {agents.map(([name, count], idx) => (
              <View key={name} style={{ flexDirection:'row', alignItems:'center', gap:12, paddingVertical:8, borderBottomWidth: idx<agents.length-1?1:0, borderBottomColor:theme.border }}>
                <View style={{ width:28, height:28, borderRadius:14, backgroundColor:idx===0?'#FEF3C7':idx===1?'#F1F5F9':idx===2?'#FEF3C7':theme.surfaceAlt, justifyContent:'center', alignItems:'center' }}>
                  <Text style={{ fontSize:12, fontWeight:'900', color:idx===0?'#F59E0B':idx===1?'#94A3B8':idx===2?'#CD7C2F':theme.textMuted }}>
                    {idx===0?'🥇':idx===1?'🥈':idx===2?'🥉':`${idx+1}`}
                  </Text>
                </View>
                <Text style={{ flex:1, fontSize:13, fontWeight:'700', color:theme.text }}>{name}</Text>
                <View style={{ backgroundColor:theme.primaryLight, borderRadius:10, paddingHorizontal:10, paddingVertical:4 }}>
                  <Text style={{ fontSize:12, fontWeight:'800', color:theme.primary }}>{count} signalement{count>1?'s':''}</Text>
                </View>
              </View>
            ))}
          </View>
        );
      })()}

      {/* Calendrier mini */}
      {(() => {
        const today = new Date();
        const days: {date:Date; count:number}[] = [];
        for (let i=13; i>=0; i--) {
          const d = new Date(today); d.setDate(today.getDate()-i);
          const count = inbox.filter((item:InboxItem) => {
            const id = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt??0);
            return id.toDateString() === d.toDateString();
          }).length;
          days.push({ date:d, count });
        }
        const maxCount = Math.max(...days.map(d=>d.count), 1);
        return (
          <View style={{ backgroundColor:theme.surface, borderRadius:20, padding:18, borderWidth:1, borderColor:theme.border, shadowColor:'#000', shadowOffset:{width:0,height:3}, shadowOpacity:0.07, shadowRadius:8, elevation:3 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:10, marginBottom:16 }}>
              <LinearGradient colors={theme.gradient} style={{ width:4, height:22, borderRadius:2 }} />
              <View style={{ flex:1 }}>
                <Text style={{ fontSize:15, fontWeight:'800', color:theme.text }}>Activité</Text>
                <Text style={{ fontSize:11, color:theme.textMuted }}>14 derniers jours</Text>
              </View>
              <View style={{ backgroundColor:theme.primaryLight, borderRadius:10, paddingHorizontal:10, paddingVertical:5 }}>
                <Text style={{ fontSize:10, fontWeight:'800', color:theme.primary }}>{inbox.length} total</Text>
              </View>
            </View>
            <View style={{ flexDirection:'row', gap:3, alignItems:'flex-end', height:64 }}>
              {days.map((d,i) => {
                const h = Math.max((d.count/maxCount)*52, 4);
                const isToday = d.date.toDateString()===today.toDateString();
                const dayLabel = d.date.toLocaleDateString('fr-FR',{weekday:'narrow'});
                return (
                  <View key={i} style={{ flex:1, alignItems:'center', gap:2 }}>
                    {d.count > 0 && <Text style={{ fontSize:7, color:isToday?theme.primary:theme.textMuted, fontWeight:'800' }}>{d.count}</Text>}
                    {isToday ? (
                      <LinearGradient colors={theme.gradient} style={{ width:'100%', height:h, borderRadius:5 }} />
                    ) : (
                      <View style={{ width:'100%', height:h, backgroundColor:d.count>0?theme.primary+'55':theme.border, borderRadius:5 }} />
                    )}
                  </View>
                );
              })}
            </View>
            <View style={{ flexDirection:'row', justifyContent:'space-between', marginTop:8, paddingHorizontal:2 }}>
              <Text style={{ fontSize:9, color:theme.textMuted, fontWeight:'600' }}>Il y a 14 jours</Text>
              <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                <LinearGradient colors={theme.gradient} style={{ width:8, height:8, borderRadius:4 }} />
                <Text style={{ fontSize:9, color:theme.primary, fontWeight:'700' }}>Aujourd'hui</Text>
              </View>
            </View>
          </View>
        );
      })()}

      {/* Recent */}
      <View style={{ marginBottom:4 }}>
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
            <LinearGradient colors={theme.gradient} style={{ width:4, height:22, borderRadius:2 }} />
            <Text style={{ fontSize:15, fontWeight:'800', color:theme.text }}>Signalements récents</Text>
          </View>
          <TouchableOpacity onPress={()=>onNavigate('reports')}
            style={{ flexDirection:'row', alignItems:'center', gap:4, backgroundColor:theme.primaryLight, borderRadius:10, paddingHorizontal:10, paddingVertical:5 }}>
            <Text style={{ fontSize:11, fontWeight:'800', color:theme.primary }}>Voir tout</Text>
            <Ionicons name="arrow-forward" size={12} color={theme.primary} />
          </TouchableOpacity>
        </View>
        {loading ? <ActivityIndicator color={theme.primary} style={{ marginTop:20 }} />
          : recent.length === 0
          ? <View style={{ backgroundColor:theme.surface, borderRadius:20, padding:32, alignItems:'center', borderWidth:1, borderColor:theme.border }}>
              <Text style={{ fontSize:40, marginBottom:10 }}>📭</Text>
              <Text style={{ fontSize:14, fontWeight:'700', color:theme.text }}>Aucun signalement</Text>
              <Text style={{ fontSize:12, color:theme.textMuted, marginTop:4 }}>Les nouveaux signalements apparaîtront ici</Text>
            </View>
          : recent.map((item: InboxItem) => {
              const cfg = scfg(item.status);
              return (
                <TouchableOpacity key={item.id} activeOpacity={0.75} onPress={()=>onNavigate('reports')}
                  style={{ backgroundColor:theme.surface, borderRadius:18, marginBottom:10, overflow:'hidden', flexDirection:'row', alignItems:'center', borderWidth:1, borderColor:theme.border, shadowColor:'#000', shadowOffset:{width:0,height:3}, shadowOpacity:0.07, shadowRadius:8, elevation:3 }}>
                  <LinearGradient colors={[cfg.color, cfg.color+'88']} style={{ width:5, alignSelf:'stretch', borderTopLeftRadius:18, borderBottomLeftRadius:18 }} />
                  {item.imageUri
                    ? <Image source={{uri:item.imageUri}} style={{ width:72, height:72 }} contentFit="cover" />
                    : <View style={{ width:72, height:72, backgroundColor:theme.surfaceAlt, justifyContent:'center', alignItems:'center' }}><Text style={{ fontSize:26 }}>🗑️</Text></View>}
                  <View style={{ flex:1, paddingHorizontal:12, paddingVertical:10, gap:3 }}>
                    <Text style={{ fontSize:13, fontWeight:'800', color:theme.text }} numberOfLines={1}>{item.address?.split(',')[0]}</Text>
                    <Text style={{ fontSize:11, color:theme.textMuted }} numberOfLines={1}><Ionicons name="location-outline" size={10} color={theme.textMuted} /> {item.address}</Text>
                    <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                      <StatusPill status={item.status} />
                      <Text style={{ fontSize:10, color:theme.textMuted, fontWeight:'600' }}>{relativeTime(item.createdAt)}</Text>
                    </View>
                  </View>
                  <View style={{ paddingRight:14 }}>
                    <Ionicons name="chevron-forward" size={16} color={theme.border} />
                  </View>
                </TouchableOpacity>
              );
            })
        }
      </View>
    </ScrollView>
  );
}

// ─── Reports ──────────────────────────────────────────────────────────────────
function ReportsTab({ displayed, counts, filterTab, setFilterTab, search, setSearch, sortBy, setSortBy, dateRange, setDateRange, showSort, setShowSort, showDateFi, setShowDateFi, onOpen, loading, refreshing, onRefresh, selectMode, setSelectMode, selected, toggleSelect, onBulkUpdate, onValidate, onReject }: any) {
  const { theme } = usePT();
  const selCount = selected.size;

  return (
    <View style={{ flex:1, backgroundColor:theme.bg }}>
      {/* Search */}
      <View style={{ backgroundColor:theme.surface, paddingHorizontal:14, paddingVertical:10, borderBottomWidth:1, borderBottomColor:theme.border }}>
        <View style={{ flexDirection:'row', gap:8 }}>
          <View style={{ flex:1, flexDirection:'row', alignItems:'center', backgroundColor:theme.surfaceAlt, borderRadius:13, paddingHorizontal:12, gap:8, borderWidth:1, borderColor:theme.border }}>
            <Ionicons name="search-outline" size={16} color={theme.textMuted} />
            <TextInput value={search} onChangeText={setSearch} placeholder="Rechercher adresse ou citoyen…" placeholderTextColor={theme.textMuted} style={{ flex:1, fontSize:13, color:theme.text, paddingVertical:10 }} />
            {search.length>0 && <TouchableOpacity onPress={()=>setSearch('')}><Ionicons name="close-circle" size={16} color={theme.textMuted} /></TouchableOpacity>}
          </View>
          <TouchableOpacity onPress={()=>{ setShowDateFi(!showDateFi); setShowSort(false); }} style={{ width:42, height:42, borderRadius:13, backgroundColor:dateRange!=='all'?theme.primaryLight:theme.surfaceAlt, justifyContent:'center', alignItems:'center', borderWidth:1, borderColor:dateRange!=='all'?theme.primary:theme.border }}>
            <Ionicons name="calendar-outline" size={18} color={dateRange!=='all'?theme.primary:theme.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={()=>{ setShowSort(!showSort); setShowDateFi(false); }} style={{ width:42, height:42, borderRadius:13, backgroundColor:sortBy!=='date'?theme.primaryLight:theme.surfaceAlt, justifyContent:'center', alignItems:'center', borderWidth:1, borderColor:sortBy!=='date'?theme.primary:theme.border }}>
            <Ionicons name="funnel-outline" size={18} color={sortBy!=='date'?theme.primary:theme.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Date range filter */}
      {showDateFi && (
        <View style={{ backgroundColor:theme.surface, paddingVertical:10, borderBottomWidth:1, borderBottomColor:theme.border }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal:14, gap:8, flexDirection:'row' }}>
            {DATE_RANGES.map(r => {
              const active = dateRange===r.key;
              return (
                <TouchableOpacity key={r.key} onPress={()=>{ setDateRange(r.key); setShowDateFi(false); }} style={{ flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:14, paddingVertical:8, borderRadius:20, backgroundColor:active?theme.primary:theme.surfaceAlt, borderWidth:1.5, borderColor:active?theme.primary:theme.border }}>
                  <Ionicons name={r.icon as any} size={13} color={active?'#fff':theme.textSub} />
                  <Text style={{ fontSize:12, fontWeight:'800', color:active?'#fff':theme.textSub }}>{r.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Status filter tabs */}
      <View style={{ backgroundColor:theme.surface, borderBottomWidth:1, borderBottomColor:theme.border }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal:12, paddingVertical:10, gap:7, flexDirection:'row' }}>
          {FILTER_TABS.map(t => {
            const active = filterTab===t.key;
            const c = counts[t.key]??0;
            return (
              <TouchableOpacity key={t.key} onPress={()=>setFilterTab(t.key)} style={{ flexDirection:'row', alignItems:'center', gap:5, paddingHorizontal:13, paddingVertical:7, borderRadius:20, backgroundColor:active?theme.primary:theme.surfaceAlt, borderWidth:1.5, borderColor:active?theme.primary:theme.border }}>
                <Text style={{ fontSize:12, fontWeight:'800', color:active?'#fff':theme.textSub }}>{t.label}</Text>
                {c>0 && <View style={{ backgroundColor:active?'rgba(255,255,255,0.25)':theme.primary, borderRadius:9, paddingHorizontal:5, paddingVertical:1 }}><Text style={{ fontSize:9, fontWeight:'900', color:'#fff' }}>{c}</Text></View>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Sort dropdown */}
      {showSort && (
        <View style={{ position:'absolute', top:152, right:14, zIndex:99, backgroundColor:theme.surface, borderRadius:14, borderWidth:1, borderColor:theme.border, width:210, shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.12, shadowRadius:10, elevation:8 }}>
          {([['date','Par date','calendar-outline'],['status','Par statut','layers-outline'],['priority','Par priorité','flag-outline']] as const).map(([k,l,ic])=>(
            <TouchableOpacity key={k} onPress={()=>{ setSortBy(k); setShowSort(false); }} style={{ flexDirection:'row', alignItems:'center', gap:10, padding:14, borderBottomWidth:k!=='priority'?1:0, borderBottomColor:theme.border }}>
              <Ionicons name={ic as any} size={15} color={sortBy===k?theme.primary:theme.textMuted} />
              <Text style={{ flex:1, fontSize:13, fontWeight:sortBy===k?'800':'600', color:sortBy===k?theme.primary:theme.text }}>{l}</Text>
              {sortBy===k && <Ionicons name="checkmark" size={14} color={theme.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Select mode toolbar */}
      {selectMode && (
        <View style={{ backgroundColor:theme.primaryLight, paddingHorizontal:14, paddingVertical:10, flexDirection:'row', alignItems:'center', gap:10, borderBottomWidth:1, borderBottomColor:theme.primary+'40' }}>
          <TouchableOpacity onPress={()=>{ setSelectMode(false); (selected as Set<string>).clear?.(); }} style={{ width:32, height:32, borderRadius:16, backgroundColor:theme.surface, justifyContent:'center', alignItems:'center' }}>
            <Ionicons name="close" size={16} color={theme.primary} />
          </TouchableOpacity>
          <Text style={{ flex:1, fontSize:13, fontWeight:'800', color:theme.primary }}>{selCount} sélectionné{selCount>1?'s':''}</Text>
          <TouchableOpacity onPress={()=>onBulkUpdate('validated')} style={{ backgroundColor:'#16A34A', borderRadius:12, paddingHorizontal:12, paddingVertical:7 }}>
            <Text style={{ fontSize:12, fontWeight:'800', color:'#fff' }}>✓ Valider</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={()=>onBulkUpdate('reviewed')} style={{ backgroundColor:'#3B82F6', borderRadius:12, paddingHorizontal:12, paddingVertical:7 }}>
            <Text style={{ fontSize:12, fontWeight:'800', color:'#fff' }}>⚙ En cours</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={()=>onBulkUpdate('rejected')} style={{ backgroundColor:'#DC2626', borderRadius:12, paddingHorizontal:12, paddingVertical:7 }}>
            <Text style={{ fontSize:12, fontWeight:'800', color:'#fff' }}>✗</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Hint when no select mode */}
      {!selectMode && displayed.length > 0 && (
        <View style={{ paddingHorizontal:14, paddingVertical:6, flexDirection:'row', alignItems:'center', gap:6 }}>
          <Ionicons name="hand-left-outline" size={12} color={theme.textMuted} />
          <Text style={{ fontSize:11, color:theme.textMuted }}>Appui long pour sélectionner · Glisser pour valider/rejeter</Text>
          <TouchableOpacity onPress={()=>setSelectMode(true)} style={{ marginLeft:'auto' as any, backgroundColor:theme.primaryLight, borderRadius:8, paddingHorizontal:8, paddingVertical:3 }}>
            <Text style={{ fontSize:10, fontWeight:'800', color:theme.primary }}>Sélectionner</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading
        ? <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}><ActivityIndicator color={theme.primary} size="large" /></View>
        : displayed.length === 0
        ? <View style={{ flex:1, alignItems:'center', justifyContent:'center', padding:40 }}>
            <Text style={{ fontSize:40, marginBottom:12 }}>📭</Text>
            <Text style={{ fontSize:15, fontWeight:'800', color:theme.text }}>Aucun résultat</Text>
            <Text style={{ fontSize:13, color:theme.textMuted, marginTop:6, textAlign:'center' }}>Essayez un autre filtre ou période.</Text>
          </View>
        : <FlatList data={displayed} keyExtractor={(i:InboxItem)=>i.id}
            contentContainerStyle={{ padding:14, paddingTop:8, paddingBottom:32 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} colors={[theme.primary]} />}
            renderItem={({ item }:{ item:InboxItem }) => (
              <SwipeCard
                item={item}
                onOpen={()=>onOpen(item)}
                onValidate={()=>onValidate(item.id)}
                onReject={()=>onReject(item.id)}
                selected={selected.has(item.id)}
                onSelect={()=>{ if(!selectMode) setSelectMode(true); toggleSelect(item.id); }}
                selectMode={selectMode}
              />
            )}
          />
      }
    </View>
  );
}

// ─── Leaflet web map ──────────────────────────────────────────────────────────
type LeafletMarker = { lat:number; lng:number; color:string; label:string; status:string };
function LeafletMap({ lat, lng, markers, heatmap=false }: { lat:number; lng:number; markers:LeafletMarker[]; heatmap?:boolean }) {
  const containerId = React.useRef(`leaflet-${Date.now()}`).current;

  React.useEffect(()=>{
    if (Platform.OS !== 'web') return;
    const win = window as any;

    const init = () => {
      const L = win.L;
      if (!L) return;
      const el = document.getElementById(containerId);
      if (!el || (el as any)._leaflet_id) return;
      const map = L.map(el).setView([lat, lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OpenStreetMap' }).addTo(map);
      if (heatmap) {
        // Density circles: group nearby markers
        markers.forEach(m => {
          const nearby = markers.filter(o => Math.abs(o.lat-m.lat)<0.002 && Math.abs(o.lng-m.lng)<0.002).length;
          L.circleMarker([m.lat, m.lng], {
            radius: Math.min(8 + nearby * 4, 30),
            color: 'transparent', weight: 0,
            fillColor: m.color, fillOpacity: 0.35 + Math.min(nearby*0.1, 0.5),
          }).addTo(map);
        });
        markers.forEach(m => {
          L.circleMarker([m.lat, m.lng], {
            radius:6, color:'#fff', weight:2, fillColor:m.color, fillOpacity:1,
          }).bindPopup(`<b>${m.label}</b><br/><span style="color:${m.color};font-weight:700">${m.status}</span>`).addTo(map);
        });
      } else {
        markers.forEach(m => {
          L.circleMarker([m.lat, m.lng], {
            radius:11, color:'#fff', weight:2.5, fillColor:m.color, fillOpacity:1,
          }).bindPopup(`<b style="font-size:13px">${m.label}</b><br/><span style="color:${m.color};font-weight:700;font-size:11px">${m.status}</span>`).addTo(map);
        });
      }
    };

    if (win.L) { init(); return; }

    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    // Load Leaflet JS
    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = init;
      document.head.appendChild(script);
    }
  }, [containerId, lat, lng, markers.length]);

  if (Platform.OS !== 'web') return null;
  return (
    // @ts-ignore
    <div id={containerId} style={{ width:'100%', height:'100%' }} />
  );
}

// ─── Map ──────────────────────────────────────────────────────────────────────
function MapTab({ items, region, mapFilter, setMapFilter, onOpen, refreshing, onRefresh }: any) {
  const { theme } = usePT();
  const [selected,  setSelected]  = useState<InboxItem|null>(null);
  const [showHeat,  setShowHeat]  = useState(false);

  const filterBar = (
    <View style={{ backgroundColor:theme.surface, borderBottomWidth:1, borderBottomColor:theme.border }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal:12, paddingVertical:10, gap:7, flexDirection:'row' }}>
        {FILTER_TABS.map(t => {
          const active = mapFilter===t.key;
          return (
            <TouchableOpacity key={t.key} onPress={()=>setMapFilter(t.key)} style={{ paddingHorizontal:14, paddingVertical:7, borderRadius:20, backgroundColor:active?theme.primary:theme.surfaceAlt, borderWidth:1.5, borderColor:active?theme.primary:theme.border }}>
              <Text style={{ fontSize:12, fontWeight:'800', color:active?'#fff':theme.textSub }}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  if (Platform.OS==='web' || !MapView) {
    // Build Leaflet HTML with markers
    const geoItems = items.filter((i:InboxItem) => i.latitude && i.longitude);
    const centerLat = geoItems.length > 0
      ? geoItems.reduce((s:number,i:InboxItem)=>s+i.latitude,0)/geoItems.length
      : (region?.latitude ?? 36.8);
    const centerLng = geoItems.length > 0
      ? geoItems.reduce((s:number,i:InboxItem)=>s+i.longitude,0)/geoItems.length
      : (region?.longitude ?? 10.18);

    const statusColors: Record<string,string> = {
      pending:'#F59E0B', reviewed:'#3B82F6', validated:'#16A34A', rejected:'#DC2626',
    };
    const markersJs = geoItems.map((i:InboxItem) => {
      const color = statusColors[i.status] ?? '#6B7280';
      const label = (i.address?.split(',')[0] ?? '').replace(/'/g,"\\'");
      const status = i.status ?? '';
      return `L.circleMarker([${i.latitude},${i.longitude}],{radius:10,color:'#fff',weight:2.5,fillColor:'${color}',fillOpacity:1}).bindPopup('<b>${label}</b><br/><span style="color:${color};font-weight:700">${status}</span>').addTo(map);`;
    }).join('\n');

    return (
      <View style={{ flex:1, backgroundColor:theme.bg }}>
        {filterBar}
        <View style={{ flex:1 }}>
          {geoItems.length === 0 ? (
            <View style={{ flex:1, alignItems:'center', justifyContent:'center', gap:10 }}>
              <Text style={{ fontSize:40 }}>📍</Text>
              <Text style={{ fontSize:14, fontWeight:'700', color:theme.text }}>Aucun signalement géolocalisé</Text>
              <Text style={{ fontSize:12, color:theme.textMuted }}>Les signalements avec coordonnées apparaîtront ici</Text>
            </View>
          ) : (
            <View style={{ flex:1 }}>
              {/* Heatmap toggle */}
              <TouchableOpacity onPress={()=>setShowHeat(h=>!h)}
                style={{ position:'absolute', top:12, right:12, zIndex:10, flexDirection:'row', alignItems:'center', gap:6,
                  backgroundColor:showHeat?theme.primary:theme.surface, borderRadius:12,
                  paddingHorizontal:12, paddingVertical:7, borderWidth:1, borderColor:showHeat?theme.primary:theme.border,
                  shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.12, shadowRadius:6, elevation:4 }}>
                <Ionicons name="flame-outline" size={14} color={showHeat?'#fff':theme.textMuted} />
                <Text style={{ fontSize:12, fontWeight:'700', color:showHeat?'#fff':theme.textSub }}>Densité</Text>
              </TouchableOpacity>
              <LeafletMap lat={centerLat} lng={centerLng} heatmap={showHeat} markers={geoItems.map((i:InboxItem)=>({
                lat: i.latitude, lng: i.longitude,
                color: ({pending:'#F59E0B',reviewed:'#3B82F6',validated:'#16A34A',rejected:'#DC2626'} as any)[i.status]??'#6B7280',
                label: i.address?.split(',')[0]??'', status: i.status??'',
              }))} />
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex:1 }}>
      {filterBar}
      <MapView style={{ flex:1 }} region={region} showsUserLocation showsMyLocationButton>
        {items.map((item:InboxItem)=>{
          const cfg=scfg(item.status);
          return (
            <Marker key={item.id} coordinate={{ latitude:item.latitude, longitude:item.longitude }} onPress={()=>setSelected(item)}>
              <View style={{ width:34, height:34, borderRadius:17, backgroundColor:cfg.color, borderWidth:3, borderColor:'#fff', justifyContent:'center', alignItems:'center' }}><Text style={{ fontSize:14 }}>🗑️</Text></View>
            </Marker>
          );
        })}
      </MapView>
      {selected && (
        <View style={{ position:'absolute', bottom:0, left:0, right:0, backgroundColor:theme.surface, borderTopLeftRadius:20, borderTopRightRadius:20, padding:16 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
            {selected.imageUri?<Image source={{uri:selected.imageUri}} style={{ width:60, height:60, borderRadius:12 }} contentFit="cover" />:<View style={{ width:60, height:60, borderRadius:12, backgroundColor:theme.surfaceAlt, justifyContent:'center', alignItems:'center' }}><Text style={{ fontSize:26 }}>🗑️</Text></View>}
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:14, fontWeight:'800', color:theme.text }} numberOfLines={1}>{selected.address?.split(',')[0]}</Text>
              <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginTop:5 }}><StatusPill status={selected.status} /><Text style={{ fontSize:11, color:theme.textMuted }}>{relativeTime(selected.createdAt)}</Text></View>
            </View>
            <View style={{ gap:8 }}>
              <TouchableOpacity onPress={()=>{ onOpen(selected); setSelected(null); }} style={{ backgroundColor:theme.primary, borderRadius:11, paddingHorizontal:14, paddingVertical:8 }}><Text style={{ fontSize:12, fontWeight:'800', color:'#fff' }}>Traiter</Text></TouchableOpacity>
              <TouchableOpacity onPress={()=>setSelected(null)} style={{ backgroundColor:theme.surfaceAlt, borderRadius:11, paddingHorizontal:14, paddingVertical:8, alignItems:'center' }}><Text style={{ fontSize:12, fontWeight:'700', color:theme.textSub }}>Fermer</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Profile ──────────────────────────────────────────────────────────────────
const PORTAL_PALETTE = [
  { color: '#1B6B3A', label: 'Vert' },
  { color: '#2563EB', label: 'Bleu' },
  { color: '#7C3AED', label: 'Violet' },
  { color: '#DC2626', label: 'Rouge' },
  { color: '#D97706', label: 'Orange' },
  { color: '#0891B2', label: 'Cyan' },
  { color: '#DB2777', label: 'Rose' },
  { color: '#0F172A', label: 'Nuit' },
];

function ProfileTab({ user, munName, counts, validationRate, editingProfile, setEditingProfile, profilePhone, setProfilePhone, onSave, onLogout, isDark, onToggleDark, onExport, inbox }: any) {
  const { theme } = usePT();
  const { customPrimary, setCustomPrimary, fontScale, setFontScale } = useTheme();
  const [hexInput, setHexInput] = useState('');
  const avgResponseHours = useMemo(() => {
    const treated = (inbox as InboxItem[]).filter(i => i.status === 'validated' || i.status === 'rejected');
    if (!treated.length) return null;
    const avg = treated.reduce((sum, i) => {
      const d = i.createdAt?.toDate ? i.createdAt.toDate() : new Date(i.createdAt ?? 0);
      return sum + (Date.now() - d.getTime()) / 3600000;
    }, 0) / treated.length;
    return Math.round(avg);
  }, [inbox]);

  return (
    <ScrollView contentContainerStyle={{ padding:16, gap:14, paddingBottom:48 }} showsVerticalScrollIndicator={false} style={{ backgroundColor:theme.bg }}>
      {/* Municipality card */}
      <LinearGradient colors={theme.gradient} style={{ borderRadius:22, padding:20, alignItems:'center', gap:14 }}>
        <View style={{ width:80, height:80, borderRadius:40, backgroundColor:'rgba(255,255,255,0.15)', borderWidth:3, borderColor:'rgba(255,255,255,0.3)', justifyContent:'center', alignItems:'center' }}>
          <Text style={{ fontSize:40 }}>🏛️</Text>
        </View>
        <View style={{ alignItems:'center' }}>
          <Text style={{ fontSize:20, fontWeight:'900', color:'#fff' }}>Municipalité de {munName}</Text>
          <Text style={{ fontSize:12, color:'rgba(255,255,255,0.55)', marginTop:4 }}>{user?.email}</Text>
          <View style={{ marginTop:8, backgroundColor:'rgba(255,255,255,0.15)', borderRadius:12, paddingHorizontal:14, paddingVertical:5 }}>
            <Text style={{ fontSize:11, color:'#fff', fontWeight:'700' }}>Administrateur municipal</Text>
          </View>
        </View>
        <View style={{ flexDirection:'row', gap:24, marginTop:4 }}>
          {[
            { v:counts.validated, l:'VALIDÉS',  c:'#6EE7B7' },
            { v:counts.all,       l:'TOTAL',    c:'#FCD34D' },
            { v:`${validationRate}%`, l:'TAUX', c:'#93C5FD' },
          ].map(s=>(
            <View key={s.l} style={{ alignItems:'center', gap:2 }}>
              <Text style={{ fontSize:22, fontWeight:'900', color:s.c }}>{s.v}</Text>
              <Text style={{ fontSize:9, color:'rgba(255,255,255,0.45)', fontWeight:'700' }}>{s.l}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Key metrics */}
      {avgResponseHours !== null && (
        <View style={{ flexDirection:'row', gap:10 }}>
          <View style={{ flex:1, backgroundColor:theme.surface, borderRadius:18, padding:16, alignItems:'center', gap:6, borderWidth:1, borderColor:theme.border }}>
            <Ionicons name="speedometer-outline" size={22} color={theme.primary} />
            <Text style={{ fontSize:20, fontWeight:'900', color:theme.primary }}>{avgResponseHours}h</Text>
            <Text style={{ fontSize:10, color:theme.textMuted, fontWeight:'700', textAlign:'center' }}>TEMPS MOYEN DE RÉPONSE</Text>
          </View>
          <View style={{ flex:1, backgroundColor:theme.surface, borderRadius:18, padding:16, alignItems:'center', gap:6, borderWidth:1, borderColor:theme.border }}>
            <Ionicons name="trending-up-outline" size={22} color='#16A34A' />
            <Text style={{ fontSize:20, fontWeight:'900', color:'#16A34A' }}>{validationRate}%</Text>
            <Text style={{ fontSize:10, color:theme.textMuted, fontWeight:'700', textAlign:'center' }}>TAUX DE VALIDATION</Text>
          </View>
          <View style={{ flex:1, backgroundColor:theme.surface, borderRadius:18, padding:16, alignItems:'center', gap:6, borderWidth:1, borderColor:theme.border }}>
            <Ionicons name="flag-outline" size={22} color='#F59E0B' />
            <Text style={{ fontSize:20, fontWeight:'900', color:'#F59E0B' }}>{counts.highPrio}</Text>
            <Text style={{ fontSize:10, color:theme.textMuted, fontWeight:'700', textAlign:'center' }}>PRIORITÉ HAUTE</Text>
          </View>
        </View>
      )}

      {/* Appearance */}
      <View style={{ backgroundColor:theme.surface, borderRadius:20, padding:18, borderWidth:1, borderColor:theme.border, gap:18 }}>
        <Text style={{ fontSize:13, fontWeight:'800', color:theme.text }}>🎨 Personnalisation</Text>

        {/* Dark mode */}
        <View style={{ flexDirection:'row', alignItems:'center', paddingBottom:16, borderBottomWidth:1, borderBottomColor:theme.border }}>
          <View style={{ width:38, height:38, borderRadius:11, backgroundColor:isDark?'#1E293B':'#FEF3C7', justifyContent:'center', alignItems:'center', marginRight:12 }}>
            <Ionicons name={isDark?'moon':'sunny'} size={19} color={isDark?'#93C5FD':'#F59E0B'} />
          </View>
          <View style={{ flex:1 }}>
            <Text style={{ fontSize:14, fontWeight:'700', color:theme.text }}>Mode sombre</Text>
            <Text style={{ fontSize:11, color:theme.textMuted }}>{isDark ? 'Interface sombre activée' : 'Interface claire activée'}</Text>
          </View>
          <Switch value={isDark} onValueChange={onToggleDark} trackColor={{ false:theme.border, true:theme.primary+'80' }} thumbColor="#fff" />
        </View>

        {/* Color palette */}
        <View style={{ paddingBottom:16, borderBottomWidth:1, borderBottomColor:theme.border }}>
          <Text style={{ fontSize:13, fontWeight:'700', color:theme.text, marginBottom:4 }}>Couleur principale</Text>
          <Text style={{ fontSize:11, color:theme.textMuted, marginBottom:14 }}>Appliquée sur les boutons, icônes et accents</Text>
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:12 }}>
            {PORTAL_PALETTE.map(p => {
              const isSelected = (customPrimary ?? '#1B6B3A') === p.color;
              return (
                <TouchableOpacity key={p.color} onPress={()=>setCustomPrimary(p.color==='#1B6B3A'?null:p.color)} style={{ alignItems:'center', gap:4 }}>
                  <View style={{ width:44, height:44, borderRadius:22, backgroundColor:p.color, borderWidth:isSelected?3:1.5, borderColor:isSelected?theme.text:'transparent', justifyContent:'center', alignItems:'center' }}>
                    {isSelected && <Ionicons name="checkmark" size={20} color="#fff" />}
                  </View>
                  <Text style={{ fontSize:9, color:theme.textMuted, textAlign:'center', maxWidth:44 }} numberOfLines={1}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {/* Hex input */}
          <View style={{ marginTop:14, flexDirection:'row', gap:10, alignItems:'center' }}>
            <View style={{ flex:1, flexDirection:'row', alignItems:'center', borderWidth:1.5, borderColor:theme.border, borderRadius:12, overflow:'hidden', backgroundColor:theme.surfaceAlt }}>
              <Text style={{ paddingHorizontal:12, fontSize:14, color:theme.textMuted, fontWeight:'700' }}>#</Text>
              <TextInput
                value={hexInput}
                onChangeText={v=>setHexInput(v.replace(/[^0-9A-Fa-f]/g,'').slice(0,6))}
                placeholder="2563EB"
                placeholderTextColor={theme.textMuted}
                style={{ flex:1, paddingVertical:10, fontSize:14, color:theme.text }}
                maxLength={6}
                autoCapitalize="characters"
              />
              {hexInput.length===6 && <View style={{ width:28, height:28, borderRadius:6, backgroundColor:`#${hexInput}`, margin:6 }} />}
            </View>
            <TouchableOpacity
              onPress={()=>{
                const hex=hexInput.trim().replace(/^#/,'');
                if(/^[0-9A-Fa-f]{6}$/.test(hex)){setCustomPrimary(`#${hex}`);setHexInput('');}
                else Alert.alert('Couleur invalide','Entrez un code hex valide (ex: 2563EB)');
              }}
              style={{ paddingHorizontal:16, paddingVertical:11, backgroundColor:theme.primary, borderRadius:12 }}
            >
              <Text style={{ color:'#fff', fontWeight:'700', fontSize:13 }}>Appliquer</Text>
            </TouchableOpacity>
          </View>
          {customPrimary && (
            <TouchableOpacity onPress={()=>setCustomPrimary(null)} style={{ marginTop:10, paddingVertical:8, alignItems:'center', borderWidth:1, borderColor:theme.border, borderRadius:10 }}>
              <Text style={{ fontSize:12, color:theme.textMuted, fontWeight:'600' }}>Réinitialiser la couleur</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Font size */}
        <View>
          <Text style={{ fontSize:13, fontWeight:'700', color:theme.text, marginBottom:12 }}>Taille du texte</Text>
          <View style={{ flexDirection:'row', gap:10 }}>
            {([
              { label:'Petit',  value:0.88 as const, size:16 },
              { label:'Normal', value:1    as const, size:22 },
              { label:'Grand',  value:1.15 as const, size:28 },
            ]).map(opt=>(
              <TouchableOpacity key={opt.value} onPress={()=>setFontScale(opt.value)}
                style={{ flex:1, alignItems:'center', paddingVertical:14, borderRadius:14, borderWidth:2,
                  borderColor:fontScale===opt.value?theme.primary:theme.border,
                  backgroundColor:fontScale===opt.value?theme.primaryLight:theme.surfaceAlt }}>
                <Text style={{ fontSize:opt.size, color:fontScale===opt.value?theme.primary:theme.textMuted, fontWeight:'700' }}>Aa</Text>
                <Text style={{ fontSize:11, color:fontScale===opt.value?theme.primary:theme.textMuted, marginTop:4, fontWeight:'600' }}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Account info */}
      <View style={{ backgroundColor:theme.surface, borderRadius:20, padding:18, borderWidth:1, borderColor:theme.border }}>
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <Text style={{ fontSize:13, fontWeight:'800', color:theme.text }}>👤 Informations du compte</Text>
          {!editingProfile && <TouchableOpacity onPress={()=>setEditingProfile(true)} style={{ flexDirection:'row', alignItems:'center', gap:5, backgroundColor:theme.primaryLight, borderRadius:10, paddingHorizontal:10, paddingVertical:6 }}><Ionicons name="pencil" size={13} color={theme.primary} /><Text style={{ fontSize:12, fontWeight:'800', color:theme.primary }}>Modifier</Text></TouchableOpacity>}
        </View>
        <View style={{ gap:14 }}>
          {[
            { icon:'person-outline',    label:'Nom',          value:user?.name,    editable:false },
            { icon:'mail-outline',      label:'Email',        value:user?.email,   editable:false },
            { icon:'business-outline',  label:'Municipalité', value:munName,       editable:false },
            { icon:'call-outline',      label:'Téléphone',    value:profilePhone,  editable:true  },
          ].map(f=>(
            <View key={f.label} style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
              <View style={{ width:38, height:38, borderRadius:11, backgroundColor:theme.primaryLight, justifyContent:'center', alignItems:'center' }}>
                <Ionicons name={f.icon as any} size={17} color={theme.primary} />
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ fontSize:10, fontWeight:'700', color:theme.textMuted, textTransform:'uppercase', letterSpacing:0.5 }}>{f.label}</Text>
                {editingProfile&&f.editable
                  ?<TextInput value={f.value??''} onChangeText={setProfilePhone} style={{ fontSize:14, fontWeight:'600', color:theme.text, borderBottomWidth:1.5, borderBottomColor:theme.primary, paddingVertical:4, marginTop:2 }} />
                  :<Text style={{ fontSize:14, fontWeight:'600', color:theme.text, marginTop:2 }}>{f.value||'—'}</Text>
                }
              </View>
            </View>
          ))}
        </View>
        {editingProfile && (
          <View style={{ flexDirection:'row', gap:10, marginTop:18 }}>
            <TouchableOpacity onPress={()=>setEditingProfile(false)} style={{ flex:1, backgroundColor:theme.surfaceAlt, borderRadius:12, paddingVertical:12, alignItems:'center' }}><Text style={{ fontSize:13, fontWeight:'700', color:theme.textMuted }}>Annuler</Text></TouchableOpacity>
            <TouchableOpacity onPress={onSave} style={{ flex:2, backgroundColor:theme.primary, borderRadius:12, paddingVertical:12, alignItems:'center' }}><Text style={{ fontSize:13, fontWeight:'800', color:'#fff' }}>Enregistrer</Text></TouchableOpacity>
          </View>
        )}
      </View>

      {/* Performance */}
      <View style={{ backgroundColor:theme.surface, borderRadius:20, padding:18, borderWidth:1, borderColor:theme.border }}>
        <Text style={{ fontSize:13, fontWeight:'800', color:theme.text, marginBottom:16 }}>📊 Performance</Text>
        {[
          { label:'Taux de validation',    value:validationRate,                    max:100,                      suffix:'%',          color:'#16A34A' },
          { label:'Traités / Total',       value:counts.validated+counts.rejected,  max:Math.max(counts.all,1),   suffix:`/${counts.all}`, color:theme.primary },
          { label:'En attente',            value:counts.pending,                    max:Math.max(counts.all,1),   suffix:` sur ${counts.all}`, color:'#F59E0B' },
        ].map(s=>(
          <View key={s.label} style={{ marginBottom:14 }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:6 }}>
              <Text style={{ fontSize:12, color:theme.textMuted, fontWeight:'600' }}>{s.label}</Text>
              <Text style={{ fontSize:12, fontWeight:'800', color:s.color }}>{s.value}{s.suffix}</Text>
            </View>
            <View style={{ height:7, backgroundColor:theme.surfaceAlt, borderRadius:4, borderWidth:1, borderColor:theme.border }}>
              <View style={{ height:7, width:`${Math.min((s.value/s.max)*100,100)}%` as any, backgroundColor:s.color, borderRadius:4 }} />
            </View>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={{ gap:12, marginTop:4 }}>
        <TouchableOpacity
          onPress={onExport}
          activeOpacity={0.82}
          style={{
            backgroundColor: theme.primary,
            borderRadius: 18,
            paddingVertical: 17,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 10,
            shadowColor: theme.primary,
            shadowOffset: { width:0, height:4 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
            elevation: 5,
          }}
        >
          <Ionicons name="download-outline" size={20} color="#fff" />
          <Text style={{ fontSize:15, fontWeight:'800', color:'#fff', letterSpacing:0.3 }}>Exporter les données (CSV)</Text>
        </TouchableOpacity>

        {/* Rapport mensuel */}
        <TouchableOpacity
          onPress={() => {
            const now = new Date();
            const month = now.toLocaleDateString('fr-FR', { month:'long', year:'numeric' });
            const monthItems = (inbox as InboxItem[]).filter(i => {
              const d = i.createdAt?.toDate ? i.createdAt.toDate() : new Date(i.createdAt??0);
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            });
            const val = monthItems.filter(i=>i.status==='validated').length;
            const rej = monthItems.filter(i=>i.status==='rejected').length;
            const pend = monthItems.filter(i=>i.status==='pending').length;
            const rate = monthItems.length > 0 ? Math.round(val/monthItems.length*100) : 0;
            const agents: Record<string,number> = {};
            monthItems.forEach(i => { const a=(i as any).assignedTo; if(a) agents[a]=(agents[a]??0)+1; });
            const topAgent = Object.entries(agents).sort((a,b)=>b[1]-a[1])[0];
            const cats: Record<string,number> = {};
            monthItems.forEach(i => { if((i as any).category) cats[(i as any).category]=(cats[(i as any).category]??0)+1; });
            const topCat = Object.entries(cats).sort((a,b)=>b[1]-a[1])[0];
            const report = [
              `📊 RAPPORT MENSUEL — ${month.toUpperCase()}`,
              `Municipalité de ${munName}`,
              `${'─'.repeat(40)}`,
              ``,
              `📌 SIGNALEMENTS`,
              `  Total ce mois  : ${monthItems.length}`,
              `  Validés        : ${val} (${rate}%)`,
              `  Rejetés        : ${rej}`,
              `  En attente     : ${pend}`,
              ``,
              topAgent ? `👷 MEILLEUR AGENT : ${topAgent[0]} (${topAgent[1]} traités)` : '',
              topCat   ? `♻️  CATÉGORIE TOP  : ${WASTE_CATEGORIES.find(c=>c.key===topCat[0])?.label ?? topCat[0]} (${topCat[1]})` : '',
              ``,
              `${'─'.repeat(40)}`,
              `Généré par PoubCoin Portail Municipal`,
              `${new Date().toLocaleString('fr-FR')}`,
            ].filter(Boolean).join('\n');
            Share.share({ message: report, title: `Rapport ${munName} — ${month}` }).catch(()=>{
              if (Platform.OS === 'web') {
                const blob = new Blob([report], { type:'text/plain' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `rapport_${munName}_${month}.txt`;
                a.click();
              }
            });
          }}
          activeOpacity={0.82}
          style={{ backgroundColor:'#0891B2', borderRadius:18, paddingVertical:17, alignItems:'center', flexDirection:'row', justifyContent:'center', gap:10, shadowColor:'#0891B2', shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:10, elevation:5 }}
        >
          <Ionicons name="document-text-outline" size={20} color="#fff" />
          <Text style={{ fontSize:15, fontWeight:'800', color:'#fff', letterSpacing:0.3 }}>Rapport mensuel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onLogout}
          activeOpacity={0.82}
          style={{
            backgroundColor: '#DC2626',
            borderRadius: 18,
            paddingVertical: 17,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 10,
            shadowColor: '#DC2626',
            shadowOffset: { width:0, height:4 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 5,
          }}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={{ fontSize:15, fontWeight:'800', color:'#fff', letterSpacing:0.3 }}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

