import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, TextInput, KeyboardAvoidingView,
  Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection, query, orderBy, onSnapshot, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { hapticLight } from '../utils/haptics';

type Comment = { id: string; userId: string; userName: string; avatar: string; text: string; createdAt: any };

export default function ReportCommentsScreen({ route, navigation }: any) {
  const { reportId = '', reportAddress = 'Signalement' } = route.params ?? {};
  const { user } = useAuth();
  const { colors } = useTheme();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!reportId) { setLoading(false); return; }
    const q = query(collection(db, 'reports', reportId, 'comments'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
      setLoading(false);
    });
    return unsub;
  }, [reportId]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || !user || sending) return;
    setSending(true);
    setText('');
    try {
      await addDoc(collection(db, 'reports', reportId, 'comments'), {
        userId: user.id,
        userName: user.name,
        avatar: user.avatar ?? '👤',
        text: trimmed,
        createdAt: serverTimestamp(),
      });
      hapticLight();
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 300);
    } catch {}
    setSending(false);
  };

  const formatTime = (ts: any) => {
    if (!ts?.toDate) return '';
    const d = ts.toDate();
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) + ' ' +
      d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Commentaires</Text>
          <Text style={[styles.sub, { color: colors.textMuted }]} numberOfLines={1}>{reportAddress}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          ref={listRef}
          data={comments}
          keyExtractor={c => c.id}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 }}>
              <Text style={{ fontSize: 36, marginBottom: 10 }}>💬</Text>
              <Text style={{ color: colors.textMuted, fontSize: 15 }}>Soyez le premier à commenter</Text>
            </View>
          }
          renderItem={({ item: c }) => {
            const isMe = c.userId === user?.id;
            return (
              <View style={[
                styles.bubble,
                isMe ? styles.bubbleMe : styles.bubbleThem,
                { backgroundColor: isMe ? colors.primary : colors.surface, borderColor: colors.border },
              ]}>
                {!isMe && <Text style={{ fontSize: 22, marginBottom: 4 }}>{c.avatar}</Text>}
                <View style={{ maxWidth: '80%' }}>
                  {!isMe && <Text style={[styles.authorName, { color: colors.textMuted }]}>{c.userName}</Text>}
                  <Text style={{ color: isMe ? '#fff' : colors.text, fontSize: 14, lineHeight: 20 }}>{c.text}</Text>
                  <Text style={[styles.timeText, { color: isMe ? 'rgba(255,255,255,0.6)' : colors.textMuted }]}>
                    {formatTime(c.createdAt)}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Ajouter un commentaire..."
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            returnKeyType="send"
            onSubmitEditing={send}
          />
          <TouchableOpacity
            onPress={send}
            disabled={!text.trim() || sending}
            style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: !text.trim() || sending ? 0.4 : 1 }]}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn:    { width: 40, height: 40, justifyContent: 'center' },
  title:      { fontSize: 16, fontWeight: '800' },
  sub:        { fontSize: 12, marginTop: 1 },
  bubble:     { marginBottom: 12, padding: 12, borderRadius: 16, borderWidth: 1 },
  bubbleMe:   { alignSelf: 'flex-end', borderBottomRightRadius: 4, maxWidth: '80%' },
  bubbleThem: { alignSelf: 'flex-start', borderBottomLeftRadius: 4, flexDirection: 'row', gap: 10, maxWidth: '90%' },
  authorName: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  timeText:   { fontSize: 10, marginTop: 6, textAlign: 'right' },
  inputBar:   { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderTopWidth: 1 },
  input:      { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14 },
  sendBtn:    { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
});
