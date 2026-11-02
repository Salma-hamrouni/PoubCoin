import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection, query, orderBy, limit,
  onSnapshot, addDoc, serverTimestamp,
  doc, updateDoc, increment, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { shadow, radius } from '../theme';
import { hapticLight, hapticMedium } from '../utils/haptics';

/* ── Types ─────────────────────────────────────────────────────── */
interface Message {
  id: string;
  text: string;
  userId: string;
  displayName: string;
  createdAt: Timestamp | null;
  likes: number;
  replyTo?: { id: string; text: string; displayName: string } | null;
}

/* ── Helpers ────────────────────────────────────────────────────── */
function anonName(uid: string) {
  return uid.slice(0, 2).toUpperCase() + '•••';
}

function anonColor(uid: string) {
  const palette = ['#E53935','#8B5CF6','#1D4ED8','#D97706','#0891B2','#16A34A','#DC2626','#7C3AED'];
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function formatTime(ts: Timestamp | null) {
  if (!ts) return '';
  const d = ts.toDate();
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatSection(ts: Timestamp | null) {
  if (!ts) return '';
  const d = ts.toDate();
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (isToday) return "Aujourd'hui";
  if (isYesterday) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

/* ── Message bubble ─────────────────────────────────────────────── */
function Bubble({
  msg, isOwn, showName, colors,
  onLike, likedIds,
  onReply, resolvedName, onProfile,
}: {
  msg: Message; isOwn: boolean; showName: boolean;
  colors: any; onLike: (id: string) => void;
  likedIds: Set<string>; onReply: (msg: Message) => void;
  resolvedName: string; onProfile?: (userId: string, name: string) => void;
}) {
  const liked = likedIds.has(msg.id);
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, tension: 80, friction: 10, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);

  const avatarColor = anonColor(msg.userId);
  const initials = resolvedName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Animated.View style={{ opacity, transform: [{ scale }], marginVertical: 3, paddingHorizontal: 14 }}>
      <View style={{ flexDirection: isOwn ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8 }}>
        {/* Avatar */}
        {!isOwn && (
          <TouchableOpacity onPress={() => onProfile?.(msg.userId, resolvedName)} activeOpacity={0.7}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: avatarColor, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 11, fontWeight: '900', color: '#fff' }}>{initials}</Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={{ maxWidth: '76%' }}>
          {/* Display name */}
          {!isOwn && showName && (
            <TouchableOpacity onPress={() => onProfile?.(msg.userId, resolvedName)} activeOpacity={0.7}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: avatarColor, marginBottom: 4, marginLeft: 4 }}>
                {resolvedName}
              </Text>
            </TouchableOpacity>
          )}

          {/* Reply preview */}
          {msg.replyTo && (
            <View style={{
              backgroundColor: isOwn ? 'rgba(255,255,255,0.25)' : colors.background,
              borderRadius: 10, borderLeftWidth: 3,
              borderLeftColor: isOwn ? 'rgba(255,255,255,0.6)' : colors.primary,
              paddingHorizontal: 10, paddingVertical: 6,
              marginBottom: 4,
            }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: isOwn ? 'rgba(255,255,255,0.8)' : colors.primary, marginBottom: 2 }}>
                {msg.replyTo.displayName}
              </Text>
              <Text style={{ fontSize: 11, color: isOwn ? 'rgba(255,255,255,0.7)' : colors.textMuted }} numberOfLines={1}>
                {msg.replyTo.text}
              </Text>
            </View>
          )}

          {/* Bubble */}
          <TouchableOpacity
            activeOpacity={0.85}
            onLongPress={() => { onReply(msg); hapticMedium(); }}
            style={{
              backgroundColor: isOwn ? colors.primary : colors.surface,
              borderRadius: 18,
              borderBottomRightRadius: isOwn ? 4 : 18,
              borderBottomLeftRadius:  isOwn ? 18 : 4,
              paddingHorizontal: 14, paddingVertical: 10,
              borderWidth: 1,
              borderColor: isOwn ? 'transparent' : colors.border,
              ...shadow.xs,
            }}
          >
            <Text style={{ fontSize: 15, color: isOwn ? '#fff' : colors.text, lineHeight: 21 }}>
              {msg.text}
            </Text>
          </TouchableOpacity>

          {/* Footer: time + like */}
          <View style={{ flexDirection: isOwn ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginTop: 4, marginHorizontal: 4 }}>
            <Text style={{ fontSize: 10, color: colors.textMuted }}>{formatTime(msg.createdAt)}</Text>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
              onPress={() => { onLike(msg.id); hapticLight(); }}
            >
              <Ionicons
                name={liked || msg.likes > 0 ? 'heart' : 'heart-outline'}
                size={13}
                color={liked ? '#EF4444' : colors.textMuted}
              />
              {msg.likes > 0 && (
                <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '700' }}>{msg.likes}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

/* ── Section separator ──────────────────────────────────────────── */
function DateSeparator({ label, colors }: { label: string; colors: any }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 14, paddingHorizontal: 20, gap: 10 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      <View style={{ backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: colors.border }}>
        <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '700' }}>{label}</Text>
      </View>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
    </View>
  );
}

/* ── Main screen ─────────────────────────────────────────────────── */
export default function CommunityScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [messages, setMessages]     = useState<Message[]>([]);
  const [loading, setLoading]       = useState(true);
  const [text, setText]             = useState('');
  const [sending, setSending]       = useState(false);
  const [likedIds, setLikedIds]     = useState<Set<string>>(new Set());
  const [replyTo, setReplyTo]       = useState<Message | null>(null);

  const flatRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  /* ── Listen to messages ── */
  useEffect(() => {
    const q = query(
      collection(db, 'community_messages'),
      orderBy('createdAt', 'desc'),
      limit(80),
    );
    const unsub = onSnapshot(q, snap => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
      setMessages(msgs);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  /* ── Send ── */
  const send = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || !user) return;
    setSending(true);
    setText('');
    try {
      await addDoc(collection(db, 'community_messages'), {
        text: trimmed,
        userId: user.id,
        displayName: user.name || anonName(user.id),
        createdAt: serverTimestamp(),
        likes: 0,
        replyTo: replyTo
          ? { id: replyTo.id, text: replyTo.text, displayName: replyTo.displayName }
          : null,
      });
      setReplyTo(null);
      hapticLight();
      setTimeout(() => flatRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
    } finally {
      setSending(false);
    }
  }, [text, sending, user, replyTo]);

  /* ── Like ── */
  const handleLike = useCallback(async (id: string) => {
    if (likedIds.has(id)) return;
    setLikedIds(prev => new Set(prev).add(id));
    try {
      await updateDoc(doc(db, 'community_messages', id), { likes: increment(1) });
    } catch {
      setLikedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  }, [likedIds]);

  /* ── Render item ── */
  const renderItem = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isOwn = item.userId === user?.id;
    const next  = messages[index + 1];
    const showName = !isOwn && (!next || next.userId !== item.userId);

    const curLabel  = item.createdAt ? formatSection(item.createdAt) : '';
    const nextLabel = next?.createdAt ? formatSection(next.createdAt) : '';
    const showDate  = curLabel !== nextLabel;

    return (
      <>
        <Bubble
          msg={item} isOwn={isOwn} showName={showName}
          colors={colors} onLike={handleLike}
          likedIds={likedIds} onReply={setReplyTo}
          resolvedName={isOwn ? (user?.name || item.displayName) : item.displayName}
          onProfile={(userId, name) => navigation.navigate('PublicProfile', { userId, userName: name, userCity: '' })}
        />
        {showDate && curLabel ? <DateSeparator label={curLabel} colors={colors} /> : null}
      </>
    );
  }, [messages, user, colors, handleLike, likedIds]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Header ── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
        backgroundColor: colors.primary,
        overflow: 'hidden',
      }}>
        <View style={{ position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -30 }} />
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)' }}>
          <Text style={{ fontSize: 22 }}>🌍</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '900', color: '#fff', letterSpacing: -0.2 }}>Communauté</Text>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Discussion citoyenne · anonyme</Text>
        </View>

        <View style={{ backgroundColor: 'rgba(105,240,174,0.2)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(105,240,174,0.45)' }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#69F0AE' }}>🟢 Live</Text>
        </View>
      </View>

      {/* ── Rules banner ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primaryGhost, paddingHorizontal: 16, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Ionicons name="shield-checkmark-outline" size={13} color={colors.primary} />
        <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700', flex: 1 }}>
          Espace respectueux · Identités anonymes · Maintenez la bienveillance
        </Text>
      </View>

      {/* ── Messages ── */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : messages.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>💬</Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 8 }}>
              Soyez le premier à écrire !
            </Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 }}>
              Partagez vos découvertes, posez des questions, encouragez la communauté.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            inverted
            contentContainerStyle={{ paddingVertical: 12 }}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
          />
        )}

        {/* ── Reply preview ── */}
        {replyTo && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            backgroundColor: colors.primaryGhost,
            paddingHorizontal: 16, paddingVertical: 10,
            borderTopWidth: 1, borderTopColor: colors.border,
          }}>
            <Ionicons name="return-up-back-outline" size={16} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>{replyTo.displayName}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }} numberOfLines={1}>{replyTo.text}</Text>
            </View>
            <TouchableOpacity onPress={() => setReplyTo(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Input bar ── */}
        <View style={{
          flexDirection: 'row', alignItems: 'flex-end', gap: 10,
          paddingHorizontal: 14, paddingVertical: 12,
          backgroundColor: colors.surface,
          borderTopWidth: 1, borderTopColor: colors.border,
          ...shadow.sm,
        }}>
          <View style={{
            flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 8,
            backgroundColor: colors.background, borderRadius: 24,
            paddingHorizontal: 16, paddingVertical: 11,
            borderWidth: 1.5, borderColor: colors.border, minHeight: 48,
          }}>
            <TextInput
              ref={inputRef}
              style={{ flex: 1, fontSize: 15, color: colors.text, maxHeight: 120, lineHeight: 22 }}
              placeholder="Écrire un message..."
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              multiline
              returnKeyType="default"
            />
          </View>

          <TouchableOpacity
            onPress={send}
            disabled={!text.trim() || sending}
            style={{
              width: 48, height: 48, borderRadius: 24,
              backgroundColor: text.trim() ? colors.primary : colors.border,
              alignItems: 'center', justifyContent: 'center',
              ...shadow.md,
            }}
          >
            {sending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Ionicons name="send" size={19} color="#fff" style={{ marginLeft: 2 }} />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
