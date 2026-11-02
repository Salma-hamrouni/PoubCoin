import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, SafeAreaView, FlatList, Alert,
  TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, addDoc, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { shadow, radius } from '../theme';
import { useTheme } from '../context/ThemeContext';

interface Message {
  id: string;
  text: string;
  from: 'citizen' | 'admin';
  createdAt: string;
}

export default function MessageScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const s = getStyles(colors);
  const { reportId = '', reportAddress = 'Signalement' } = route.params ?? {};
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'messages', reportId, 'items'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return unsub;
  }, [reportId]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'messages', reportId, 'items'), {
        text: text.trim(),
        from: 'citizen',
        createdAt: new Date().toISOString(),
      });
      setText('');
    } catch {
      Alert.alert('Erreur', 'Message non envoyé. Vérifiez votre connexion.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={s.headerInfo}>
          <View style={s.headerAvatar}>
            <Ionicons name="business" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={s.headerTitle}>Municipalité</Text>
            <Text style={s.headerSub} numberOfLines={1}>{reportAddress}</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Ionicons name="chatbubbles-outline" size={36} color={colors.primary} />
              </View>
              <Text style={s.emptyTitle}>Aucun message</Text>
              <Text style={s.emptySub}>Posez une question à votre municipalité concernant ce signalement.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isCitizen = item.from === 'citizen';
            return (
              <View style={[s.msgRow, isCitizen ? s.msgRowRight : s.msgRowLeft]}>
                {!isCitizen && (
                  <View style={s.msgAvatar}>
                    <Ionicons name="business" size={14} color={colors.primary} />
                  </View>
                )}
                <View style={[s.bubble, isCitizen ? s.bubbleCitizen : s.bubbleAdmin]}>
                  <Text style={[s.bubbleText, isCitizen && { color: '#fff' }]}>{item.text}</Text>
                  <Text style={[s.bubbleTime, isCitizen && { color: 'rgba(255,255,255,0.65)' }]}>
                    {formatTime(item.createdAt)}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        {/* Input */}
        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            placeholder="Votre message…"
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[s.sendBtn, !text.trim() && { opacity: 0.4 }]}
            onPress={send}
            disabled={!text.trim() || sending}
          >
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any): any => ({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border, ...shadow.sm,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: colors.primaryGhost, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  headerSub: { fontSize: 11, color: colors.textMuted, marginTop: 1, maxWidth: 200 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 32 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primaryGhost, justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  emptySub: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowRight: { justifyContent: 'flex-end' },
  msgRowLeft:  { justifyContent: 'flex-start' },
  msgAvatar: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: colors.primaryGhost, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  bubble: {
    maxWidth: '75%', borderRadius: 16, padding: 12, paddingBottom: 8,
    ...shadow.xs,
  },
  bubbleCitizen: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAdmin: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  bubbleText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  bubbleTime: { fontSize: 10, color: colors.textMuted, marginTop: 4, textAlign: 'right' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  input: {
    flex: 1, backgroundColor: colors.background, borderRadius: radius.sm,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.text,
    borderWidth: 1, borderColor: colors.border, maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
    ...shadow.sm,
  },
});
