import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, SafeAreaView, SectionList, TouchableOpacity, ActivityIndicator,
  Animated, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection, query, orderBy, limit, onSnapshot, doc, updateDoc, arrayUnion, writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useT } from '../i18n/useT';
import { radius, shadow } from '../theme';
import EmptyState from '../components/EmptyState';

interface Notif {
  id: string;
  title: string;
  body: string;
  type?: string;
  target: string;
  createdAt: any;
  readBy: string[];
}

function typeIcon(type?: string): { name: string; color: string; bg: string } {
  switch (type) {
    case 'validated': return { name: 'checkmark-circle', color: '#22C55E', bg: '#DCFCE7' };
    case 'rejected':  return { name: 'close-circle',     color: '#EF4444', bg: '#FEE2E2' };
    case 'coins':     return { name: 'wallet',           color: '#F59E0B', bg: '#FEF3C7' };
    case 'challenge': return { name: 'trophy',           color: '#A855F7', bg: '#F3E8FF' };
    case 'info':      return { name: 'information-circle', color: '#3B82F6', bg: '#DBEAFE' };
    default:          return { name: 'notifications',   color: '#1B6B3A', bg: '#DCFCE7' };
  }
}

function NotifCard({ item, isRead, onPress }: { item: Notif; isRead: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const fadeAnim = React.useRef(new Animated.Value(isRead ? 0.7 : 1)).current;
  const { name, color, bg } = typeIcon(item.type);

  const formatTime = (ts: any) => {
    if (!ts) return '';
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Animated.View style={{
        backgroundColor: colors.surface,
        borderRadius: radius.md, padding: 14,
        flexDirection: 'row', gap: 12,
        borderWidth: 1.5,
        borderColor: isRead ? colors.border : color + '60',
        opacity: fadeAnim,
        ...shadow.xs,
        marginBottom: 8,
      }}>
        <View style={{
          width: 44, height: 44, borderRadius: 22,
          backgroundColor: bg, justifyContent: 'center', alignItems: 'center',
          borderWidth: 1.5, borderColor: color + '40',
        }}>
          <Ionicons name={name as any} size={22} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, flex: 1 }} numberOfLines={1}>
              {item.title}
            </Text>
            {!isRead && (
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
            )}
          </View>
          <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 5 }} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>{formatTime(item.createdAt)}</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(50));
    const unsub = onSnapshot(q, snap => {
      setNotifs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notif)));
      setLoading(false);
    }, () => {
      setLoading(false);
      // Silent — notifications are non-critical, avoid blocking the UI with an alert
    });
    return unsub;
  }, []);

  const markRead = async (notif: Notif) => {
    if (!user || notif.readBy?.includes(user.id)) return;
    try {
      await updateDoc(doc(db, 'notifications', notif.id), { readBy: arrayUnion(user.id) });
    } catch {}
  };

  const markAllRead = async () => {
    if (!user) return;
    const unread = notifs.filter(n => !n.readBy?.includes(user.id));
    if (!unread.length) return;
    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { readBy: arrayUnion(user.id) });
    });
    try { await batch.commit(); } catch {}
  };

  const isRead = (n: Notif) => !!user && n.readBy?.includes(user.id);
  const unreadCount = notifs.filter(n => !isRead(n)).length;

  // Group by date
  const sections = useMemo(() => {
    const groups: Record<string, Notif[]> = {};
    notifs.forEach(n => {
      const ts = n.createdAt;
      const d = ts?.toDate ? ts.toDate() : new Date(ts ?? 0);
      const today    = new Date();
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      let key: string;
      if (d.toDateString() === today.toDateString()) key = "Aujourd'hui";
      else if (d.toDateString() === yesterday.toDateString()) key = 'Hier';
      else key = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });
    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  }, [notifs]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 14,
        flexDirection: 'row', alignItems: 'center', gap: 12,
      }}>
        <TouchableOpacity
          style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>{t('notif_title')}</Text>
          {unreadCount > 0 && (
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>
              {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
            </Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', flexDirection: 'row', alignItems: 'center', gap: 5 }}
            onPress={markAllRead}
          >
            <Ionicons name="checkmark-done" size={14} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Tout lire</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={n => n.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          onViewableItemsChanged={({ viewableItems }) => {
            viewableItems.forEach(({ item }) => markRead(item as Notif));
          }}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          renderSectionHeader={({ section }) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4 }}>
              <View style={{ height: 1, flex: 1, backgroundColor: colors.border }} />
              <View style={{ backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'capitalize' }}>
                  {section.title}
                </Text>
              </View>
              <View style={{ height: 1, flex: 1, backgroundColor: colors.border }} />
            </View>
          )}
          renderItem={({ item }) => (
            <NotifCard item={item} isRead={isRead(item)} onPress={() => markRead(item)} />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="notifications-off-outline"
              emoji="🔔"
              title={t('notif_empty')}
              subtitle={t('notif_empty_sub')}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
