import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useTheme } from '../../context/ThemeContext';
import { radius, shadow } from '../../theme';

type ReportStatus = 'pending' | 'validated' | 'rejected';

interface TimelineItem {
  id: string;
  userId: string;
  userName: string;
  address: string;
  status: ReportStatus;
  coins?: number;
  createdAt: any;
  date: string;
}

// Extended event type that can be a "coins" virtual event
interface TimelineEvent {
  key: string;
  type: 'report' | 'validated' | 'rejected' | 'coins';
  item: TimelineItem;
  sortDate: Date;
}

type FilterType = 'all' | 'reports' | 'validations' | 'rejections';

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all',         label: 'Tous' },
  { key: 'reports',     label: 'Signalements' },
  { key: 'validations', label: 'Validations' },
  { key: 'rejections',  label: 'Rejets' },
];

function getItemDate(item: TimelineItem): Date {
  const raw = item.createdAt;
  if (raw?.toDate) return raw.toDate();
  if (typeof raw === 'string' && raw) return new Date(raw);
  if (item.date) return new Date(item.date);
  return new Date(0);
}

function formatHHMM(d: Date): string {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function groupLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (isSameDay(date, today)) return "Aujourd'hui";
  if (isSameDay(date, yesterday)) return 'Hier';
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function isToday(date: Date): boolean {
  const today = new Date();
  return date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
}

function eventConfig(type: TimelineEvent['type']) {
  switch (type) {
    case 'validated': return { icon: 'checkmark-circle' as const, color: '#16A34A', bg: '#DCFCE7', dot: '#16A34A', label: 'Validé',    badgeBg: '#DCFCE7', badgeText: '#15803D' };
    case 'rejected':  return { icon: 'close-circle'    as const, color: '#DC2626', bg: '#FEE2E2', dot: '#DC2626', label: 'Rejeté',    badgeBg: '#FEE2E2', badgeText: '#B91C1C' };
    case 'coins':     return { icon: 'logo-bitcoin'    as const, color: '#D97706', bg: '#FFFBEB', dot: '#D97706', label: 'Coins',     badgeBg: '#FFFBEB', badgeText: '#92400E' };
    default:          return { icon: 'time-outline'    as const, color: '#D97706', bg: '#FEF3C7', dot: '#D97706', label: 'En attente', badgeBg: '#FEF3C7', badgeText: '#B45309' };
  }
}

function buildEventDescription(event: TimelineEvent): string {
  const { type, item } = event;
  const place = item.address?.split(',')[0] ?? 'adresse inconnue';
  const name = item.userName || 'Citoyen';
  if (type === 'coins') {
    const c = item.coins ?? 0;
    return `🪙 +${c} coin${c > 1 ? 's' : ''} attribués à ${name}`;
  }
  if (type === 'validated') return `Signalement validé par la mairie — ${place}`;
  if (type === 'rejected')  return `Signalement rejeté — ${place}`;
  return `${name} a signalé un déchet`;
}

function buildEventsFromItems(items: TimelineItem[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  items.forEach(item => {
    const d = getItemDate(item);
    if (item.status === 'validated') {
      events.push({ key: `${item.id}-validated`, type: 'validated', item, sortDate: d });
      if ((item.coins ?? 0) > 0) {
        // Offset coins event by 1 second so it appears just after
        const coinsDate = new Date(d.getTime() + 1000);
        events.push({ key: `${item.id}-coins`, type: 'coins', item, sortDate: coinsDate });
      }
    } else if (item.status === 'rejected') {
      events.push({ key: `${item.id}-rejected`, type: 'rejected', item, sortDate: d });
    } else {
      events.push({ key: `${item.id}-report`, type: 'report', item, sortDate: d });
    }
  });
  events.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
  return events;
}

export default function AdminTimelineScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [items, setItems]   = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const unsubRef = useRef<(() => void) | null>(null);

  function loadData() {
    if (unsubRef.current) unsubRef.current();

    const q = query(collection(db, 'reports'), limit(50));
    const unsub = onSnapshot(q, snap => {
      const data: TimelineItem[] = snap.docs.map(d => {
        const raw = d.data() as any;
        return {
          id: d.id,
          userId:   raw.userId ?? raw.reportedBy ?? '',
          userName: raw.userName ?? raw.name ?? '',
          address:  raw.address ?? '',
          status:   raw.status ?? 'pending',
          coins:    raw.coins ?? raw.coinsAwarded ?? 0,
          createdAt: raw.createdAt ?? null,
          date:      raw.date ?? '',
        };
      });
      data.sort((a, b) => getItemDate(b).getTime() - getItemDate(a).getTime());
      setItems(data);
      setLoading(false);
      setLastRefresh(new Date());
    }, () => setLoading(false));

    unsubRef.current = unsub;
  }

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, 30_000);

    return () => {
      clearInterval(interval);
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  // Compute stats from raw items
  const todayItems = items.filter(i => isToday(getItemDate(i)));
  const todayCount = todayItems.length;
  const validatedTodayCount = todayItems.filter(i => i.status === 'validated').length;
  const pendingTotal = items.filter(i => i.status === 'pending').length;

  // Build filtered events
  const filteredItems = items.filter(item => {
    if (filter === 'validations') return item.status === 'validated';
    if (filter === 'rejections')  return item.status === 'rejected';
    if (filter === 'reports')     return item.status === 'pending';
    return true;
  });

  const allEvents = buildEventsFromItems(filteredItems);

  // Group by date label
  const groups: { label: string; events: TimelineEvent[] }[] = [];
  allEvents.forEach(event => {
    const lbl = groupLabel(event.sortDate);
    const existing = groups.find(g => g.label === lbl);
    if (existing) existing.events.push(event);
    else groups.push({ label: lbl, events: [event] });
  });

  // Quick stats chips data
  const quickStats = [
    { label: "Aujourd'hui", value: String(todayCount), color: '#1E3A5F', bg: '#EFF3FB' },
    { label: 'Validés', value: String(validatedTodayCount), color: '#16A34A', bg: '#DCFCE7' },
    { label: 'En attente', value: String(pendingTotal), color: '#D97706', bg: '#FEF3C7' },
    { label: 'Heure active', value: '14h–15h', color: '#7C3AED', bg: '#EDE9FE' },
    { label: 'vs Hier', value: todayCount > 0 ? `+${todayCount}` : '—', color: '#0369A1', bg: '#E0F2FE' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        backgroundColor: colors.surface,
        paddingHorizontal: 16, paddingVertical: 14,
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderBottomWidth: 1, borderBottomColor: colors.border,
        ...shadow.sm,
      }}>
        <TouchableOpacity
          style={{
            width: 36, height: 36, borderRadius: radius.xs,
            backgroundColor: colors.background, justifyContent: 'center',
            alignItems: 'center', borderWidth: 1, borderColor: colors.border,
          }}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.adminPrimary, letterSpacing: 1 }}>ACTIVITÉ</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Timeline</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A' }} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#16A34A' }}>Flux temps réel</Text>
        </View>
      </View>

      {/* Statistiques rapides */}
      <View style={{ backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 2 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8 }}>STATISTIQUES RAPIDES</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
          {quickStats.map(stat => (
            <View
              key={stat.label}
              style={{
                backgroundColor: stat.bg,
                borderRadius: radius.md,
                paddingHorizontal: 12,
                paddingVertical: 8,
                alignItems: 'center',
                minWidth: 72,
                borderWidth: 1,
                borderColor: stat.color + '30',
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '800', color: stat.color }}>{stat.value}</Text>
              <Text style={{ fontSize: 10, fontWeight: '600', color: stat.color, marginTop: 2, textAlign: 'center' }}>{stat.label}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Filter chips */}
      <View style={{ backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
          {FILTERS.map(f => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={{
                  backgroundColor: active ? colors.adminPrimary : colors.background,
                  borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8,
                  borderWidth: 1, borderColor: active ? colors.adminPrimary : colors.border,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : colors.text }}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Stats bar */}
      <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6, flexDirection: 'row', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFF3FB', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.adminPrimary }} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.adminPrimary }}>{todayCount} aujourd'hui</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DCFCE7', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' }} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#15803D' }}>{validatedTodayCount} validés</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#D97706' }} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#B45309' }}>{pendingTotal} en attente</Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <ActivityIndicator size="large" color={colors.adminPrimary} />
          <Text style={{ fontSize: 13, color: colors.textMuted }}>Chargement du flux...</Text>
        </View>
      ) : allEvents.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 52 }}>⏳</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Aucun événement</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>
            {filter === 'all' ? "Aucun signalement pour le moment." : "Aucun événement dans cette catégorie."}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {groups.map(group => (
            <View key={group.label} style={{ marginBottom: 8 }}>
              {/* Date group header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, marginTop: 6 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                <View style={{ backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>{group.label}</Text>
                </View>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              </View>

              {/* Timeline events */}
              {group.events.map((event, idx) => {
                const cfg = eventConfig(event.type);
                const d = event.sortDate;
                const item = event.item;
                const name = item.userName || 'Citoyen';
                const place = item.address?.split(',')[0] ?? '';
                const fullAddress = item.address ?? '';
                return (
                  <View key={event.key} style={{ flexDirection: 'row', marginBottom: 2 }}>
                    {/* Time column */}
                    <View style={{ width: 48, alignItems: 'flex-end', paddingRight: 12, paddingTop: 14 }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted }}>{formatHHMM(d)}</Text>
                    </View>

                    {/* Connector line + dot */}
                    <View style={{ width: 24, alignItems: 'center' }}>
                      <View style={{ width: 2, flex: 1, backgroundColor: idx === group.events.length - 1 ? 'transparent' : colors.border, position: 'absolute', top: 20, bottom: 0, left: 11 }} />
                      <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: cfg.dot, marginTop: 15, zIndex: 1, borderWidth: 2, borderColor: colors.background }} />
                    </View>

                    {/* Card */}
                    <View style={{ flex: 1, paddingLeft: 10, paddingBottom: 12 }}>
                      <View style={{
                        backgroundColor: colors.surface,
                        borderRadius: radius.md,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: event.type === 'coins' ? '#D97706' + '40' : colors.border,
                        ...shadow.xs,
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                          {/* Icon circle */}
                          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: cfg.bg, justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                            <Ionicons name={cfg.icon} size={18} color={cfg.color} />
                          </View>

                          <View style={{ flex: 1 }}>
                            {/* User name + main action */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 }} numberOfLines={1}>
                                {buildEventDescription(event)}
                              </Text>
                              {/* Badge */}
                              <View style={{ backgroundColor: cfg.badgeBg, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 }}>
                                <Text style={{ fontSize: 10, fontWeight: '800', color: cfg.badgeText }}>{cfg.label.toUpperCase()}</Text>
                              </View>
                            </View>

                            {/* Address */}
                            {event.type !== 'coins' && fullAddress.length > 0 && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <Text style={{ fontSize: 11, color: colors.textMuted }}>📍</Text>
                                <Text style={{ fontSize: 11, color: colors.textMuted, flex: 1 }} numberOfLines={1}>{fullAddress}</Text>
                              </View>
                            )}

                            {/* Coins detail */}
                            {event.type === 'coins' && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <Text style={{ fontSize: 11, color: '#D97706', fontWeight: '600' }}>
                                  Récompense pour signalement à {place || 'adresse inconnue'}
                                </Text>
                              </View>
                            )}

                            {/* User name sub-line for non-coins events */}
                            {event.type !== 'coins' && name !== 'Citoyen' && (
                              <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                                👤 {name}
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
