import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, SafeAreaView, FlatList, TouchableOpacity,
  Animated, Platform, TextInput, Modal, KeyboardAvoidingView,
  ActivityIndicator, Alert, RefreshControl, ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  collection, onSnapshot, doc, updateDoc, increment,
  addDoc, serverTimestamp, query, orderBy, limit, deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { uploadImageToCloudinary } from '../utils/cloudinary';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { radius, shadow } from '../theme';
import { useT } from '../i18n/useT';

interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  beforeImage?: string;
  afterImage?: string;
  address: string;
  caption?: string;
  likes: number;
  comments: number;
  likedBy?: string[];
  createdAt?: any;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt?: any;
  reaction?: string;
}

function relativeTime(ts: any, tFn: (k: any) => string): string {
  if (!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d.getTime())) return '';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return tFn('time_just_now');
  if (diff < 3600) return `${tFn('time_ago')} ${Math.floor(diff / 60)} ${tFn('time_min')}`;
  if (diff < 86400) return `${tFn('time_ago')} ${Math.floor(diff / 3600)} ${tFn('time_hour_short')}`;
  return `${tFn('time_ago')} ${Math.floor(diff / 86400)} ${tFn('time_day_short')}`;
}

const REACTIONS = ['❤️', '👏', '🌟', '🌿', '💪', '🎉'];

// ---------- StoryCard ----------
function StoryCard({ story, currentUserId, onComment, onDelete }: { story: Story; currentUserId: string; onComment: (s: Story) => void; onDelete: (s: Story) => void }) {
  const { colors } = useTheme();
  const t = useT();
  const [liked, setLiked] = useState(story.likedBy?.includes(currentUserId) ?? false);
  const [likesCount, setLikesCount] = useState(story.likes);
  const [clapped, setClapped] = useState((story as any).clappedBy?.includes(currentUserId) ?? false);
  const [clapsCount, setClapsCount] = useState((story as any).claps ?? 0);
  const clapScale = useRef(new Animated.Value(1)).current;
  const [showBefore, setShowBefore] = useState(true);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;

  const toggleImage = () => {
    Animated.timing(slideAnim, { toValue: showBefore ? 1 : 0, duration: 300, useNativeDriver: false }).start(() => {
      setShowBefore(v => !v);
      slideAnim.setValue(0);
    });
  };

  const toggleLike = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount(n => n + (newLiked ? 1 : -1));
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.4, duration: 120, useNativeDriver: true }),
      Animated.timing(heartScale, { toValue: 1,   duration: 120, useNativeDriver: true }),
    ]).start();
    try {
      await updateDoc(doc(db, 'stories', story.id), {
        likes: increment(newLiked ? 1 : -1),
      });
    } catch {}
  };

  const toggleClap = async () => {
    const newClapped = !clapped;
    setClapped(newClapped);
    setClapsCount((n: number) => n + (newClapped ? 1 : -1));
    Animated.sequence([
      Animated.timing(clapScale, { toValue: 1.5, duration: 120, useNativeDriver: true }),
      Animated.timing(clapScale, { toValue: 1,   duration: 120, useNativeDriver: true }),
    ]).start();
    try {
      await updateDoc(doc(db, 'stories', story.id), {
        claps: increment(newClapped ? 1 : -1),
        clappedBy: newClapped
          ? [...((story as any).clappedBy ?? []), currentUserId]
          : ((story as any).clappedBy ?? []).filter((id: string) => id !== currentUserId),
      });
    } catch {}
  };

  const shortAddr = story.address?.split(',')[0];

  const displayImage = showBefore ? story.beforeImage : story.afterImage;

  return (
    <View style={{
      backgroundColor: colors.surface, borderRadius: radius.xl ?? 20,
      marginBottom: 20, overflow: 'hidden',
      borderWidth: 1, borderColor: colors.border, ...shadow.md ?? shadow.sm,
    }}>
      {/* User header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 }}>
        <View style={{
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: colors.primaryGhost,
          justifyContent: 'center', alignItems: 'center',
          borderWidth: 2, borderColor: colors.primary,
        }}>
          {story.userAvatar ? (
            <Image source={{ uri: story.userAvatar }} style={{ width: '100%', height: '100%', borderRadius: 20 }} contentFit="cover" transition={150} />
          ) : (
            <Text style={{ fontSize: 18 }}>🌱</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{story.userName}</Text>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>📍 {shortAddr} · {relativeTime(story.createdAt, t)}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ backgroundColor: '#DCFCE7', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#16A34A' }}>{t('story_cleaned')}</Text>
          </View>
          {story.userId === currentUserId && (
            <TouchableOpacity
              onPress={() => onDelete(story)}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' }}
            >
              <Ionicons name="trash-outline" size={15} color="#DC2626" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Before/After image */}
      <View style={{ position: 'relative' }}>
        {displayImage ? (
          <Image
            source={{ uri: displayImage }}
            style={{ width: '100%', height: 260 }}
            contentFit="cover"
            transition={250}
          />
        ) : (
          <View style={{ width: '100%', height: 180, backgroundColor: showBefore ? '#F1F5F9' : '#F0FDF4', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: showBefore ? '#E2E8F0' : '#DCFCE7', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 32 }}>{showBefore ? '🗑️' : '✨'}</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: showBefore ? '#94A3B8' : '#86EFAC' }}>
              Photo {showBefore ? t('stories_before') : t('stories_after')} non disponible
            </Text>
          </View>
        )}

        {/* Before/After toggle badge */}
        <TouchableOpacity
          onPress={toggleImage}
          style={{
            position: 'absolute', bottom: 12, left: 12,
            backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: radius.pill,
            paddingHorizontal: 12, paddingVertical: 6,
            flexDirection: 'row', alignItems: 'center', gap: 6,
          }}
        >
          <Ionicons name="swap-horizontal" size={13} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
            {showBefore ? `📸 ${t('stories_before')}  →  ${t('stories_after')}` : `✨ ${t('stories_after')}  ←  ${t('stories_before')}`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Caption */}
      {story.caption ? (
        <View style={{ paddingHorizontal: 14, paddingTop: 12 }}>
          <Text style={{ fontSize: 14, color: colors.text, lineHeight: 20 }}>
            <Text style={{ fontWeight: '700' }}>{story.userName} </Text>
            {story.caption}
          </Text>
        </View>
      ) : null}

      {/* Actions */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 20 }}>
        {/* Like */}
        <TouchableOpacity onPress={toggleLike} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Animated.Text style={{ fontSize: 22, transform: [{ scale: heartScale }] }}>
            {liked ? '❤️' : '🤍'}
          </Animated.Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: liked ? '#EF4444' : colors.textMuted }}>{likesCount}</Text>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity onPress={() => onComment(story)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 20 }}>💬</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted }}>{story.comments}</Text>
        </TouchableOpacity>

        {/* Clap */}
        <TouchableOpacity onPress={toggleClap} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Animated.Text style={{ fontSize: 22, transform: [{ scale: clapScale }] }}>
            {clapped ? '👏' : '🤲'}
          </Animated.Text>
          {clapsCount > 0 && (
            <Text style={{ fontSize: 13, fontWeight: '600', color: clapped ? '#F59E0B' : colors.textMuted }}>{clapsCount}</Text>
          )}
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        {/* Likes count label */}
        <Text style={{ fontSize: 11, color: colors.textMuted }}>
          {likesCount > 0 ? `${likesCount} ${t('stories_likes')}` : ''}
        </Text>
      </View>
    </View>
  );
}

// ---------- CreateStoryModal ----------
function CreateStoryModal({ visible, onClose, onPublished }: {
  visible: boolean;
  onClose: () => void;
  onPublished: () => void;
}) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { reports } = useWallet();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [publishing, setPublishing] = useState(false);

  // Validated reports — after photo optional
  const eligible = reports.filter(r => r.status === 'validated');

  const selected = eligible.find(r => r.id === selectedId) ?? null;

  const publish = async () => {
    if (!user || !selected) return;
    setPublishing(true);
    try {
      const [beforeUrl, afterUrl] = await Promise.all([
        uploadImageToCloudinary(selected.imageUri),
        uploadImageToCloudinary(selected.afterImageUri),
      ]);
      await addDoc(collection(db, 'stories'), {
        userId:      user.id,
        userName:    user.name ?? user.email ?? 'Membre',
        userAvatar:  user.photoURL ?? null,
        beforeImage: beforeUrl,
        afterImage:  afterUrl,
        address:     selected.address ?? 'Position inconnue',
        caption:     caption.trim() || null,
        likes:       0,
        comments:    0,
        likedBy:     [],
        createdAt:   serverTimestamp(),
      });
      setCaption('');
      setSelectedId(null);
      onPublished();
      onClose();
    } catch (e: any) {
      Alert.alert('Erreur', `Publication impossible : ${e?.message ?? 'Vérifiez votre connexion.'}`);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={onClose} activeOpacity={1} />
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' }}>
          {/* Handle */}
          <View style={{ width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 14 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 14 }}>
            <Text style={{ flex: 1, fontSize: 17, fontWeight: '800', color: colors.text }}>📸 Partager une story</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
            {eligible.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 32, gap: 10 }}>
                <Text style={{ fontSize: 40 }}>📷</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'center' }}>Aucun signalement validé</Text>
                <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 }}>
                  Vous pourrez partager une story une fois que l'un de vos signalements sera validé par la municipalité.
                </Text>
              </View>
            ) : (
              <>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 10 }}>
                  SÉLECTIONNE UN SIGNALEMENT
                </Text>
                {eligible.map(r => {
                  const active = r.id === selectedId;
                  return (
                    <TouchableOpacity
                      key={r.id}
                      onPress={() => setSelectedId(r.id)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        padding: 12, borderRadius: 14, marginBottom: 10,
                        borderWidth: 2,
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? colors.primaryGhost : colors.background,
                      }}
                    >
                      <Image source={{ uri: r.imageUri }} style={{ width: 56, height: 56, borderRadius: 10 }} contentFit="cover" transition={150} />
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }} numberOfLines={1}>{r.address.split(',')[0]}</Text>
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>{r.date}</Text>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <Text style={{ fontSize: 11, color: '#22C55E', fontWeight: '700' }}>✅ Avant</Text>
                          {r.afterImageUri && <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>✨ Après</Text>}
                        </View>
                      </View>
                      {active && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                })}

                {/* Preview */}
                {selected && (
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                    <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}>
                      <Image source={{ uri: selected.imageUri }} style={{ width: '100%', height: 100 }} contentFit="cover" transition={150} />
                      <View style={{ position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>AVANT</Text>
                      </View>
                    </View>
                    <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}>
                      <Image source={{ uri: selected.afterImageUri }} style={{ width: '100%', height: 100 }} contentFit="cover" transition={150} />
                      <View style={{ position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>APRÈS</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Caption */}
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 8 }}>LÉGENDE (optionnelle)</Text>
                <TextInput
                  value={caption}
                  onChangeText={setCaption}
                  placeholder="Partage ton expérience…"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  maxLength={280}
                  style={{
                    borderWidth: 1, borderColor: colors.border, borderRadius: 12,
                    padding: 12, fontSize: 14, color: colors.text,
                    backgroundColor: colors.background, minHeight: 80,
                    marginBottom: 4, textAlignVertical: 'top',
                  }}
                />
                <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'right', marginBottom: 16 }}>{caption.length}/280</Text>

                <TouchableOpacity
                  onPress={publish}
                  disabled={!selected || publishing}
                  style={{
                    borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center',
                    backgroundColor: selected ? colors.primary : colors.border,
                    flexDirection: 'row', gap: 8,
                  }}
                >
                  {publishing
                    ? <ActivityIndicator color="#fff" />
                    : <>
                        <Ionicons name="paper-plane" size={18} color="#fff" />
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Publier la story</Text>
                      </>}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- Main ----------
export default function CitizenStoriesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const t = useT();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commentModal, setCommentModal] = useState<Story | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [showNewBadge, setShowNewBadge] = useState(false);

  const handleDeleteStory = async (story: Story) => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Supprimer cette story définitivement ?')
      : await new Promise<boolean>(resolve =>
          Alert.alert(
            'Supprimer la story',
            'Cette story sera supprimée définitivement.',
            [
              { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Supprimer', style: 'destructive', onPress: () => resolve(true) },
            ]
          )
        );
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, 'stories', story.id));
      setStories(prev => prev.filter(s => s.id !== story.id));
    } catch {
      Alert.alert('Erreur', 'Impossible de supprimer cette story.');
    }
  };

  useEffect(() => {
    AsyncStorage.getItem('poubcoin_tutorial_seen').then(v => { if (!v) setShowNewBadge(true); });
    AsyncStorage.setItem('poubcoin_tutorial_seen', '1');
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'stories'), limit(50)),
      snap => {
        const real = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Story))
          .sort((a, b) => {
            const ta = a.createdAt?.toDate?.()?.getTime() ?? (a.createdAt ? new Date(a.createdAt).getTime() : 0);
            const tb = b.createdAt?.toDate?.()?.getTime() ?? (b.createdAt ? new Date(b.createdAt).getTime() : 0);
            return tb - ta;
          });
        // Show mock stories only when there are no real stories yet
        setStories(real);
        setLoading(false);
      },
      () => {
        setStories([]);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (!commentModal) { setComments([]); return; }
    const q = query(collection(db, 'stories', commentModal.id, 'comments'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
    }, () => {});
    return unsub;
  }, [commentModal?.id]);

  const sendComment = async (reaction?: string) => {
    if (!commentModal || !user) return;
    const text = reaction ?? commentText.trim();
    if (!text) return;
    setSendingComment(true);
    try {
      await addDoc(collection(db, 'stories', commentModal.id, 'comments'), {
        userId: user.id,
        userName: user.name,
        text,
        createdAt: serverTimestamp(),
        reaction: !!reaction,
      });
      await updateDoc(doc(db, 'stories', commentModal.id), { comments: increment(1) });
      setCommentText('');
    } catch {
      Alert.alert('Erreur', 'Commentaire non envoyé. Vérifiez votre connexion.');
    } finally {
      setSendingComment(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <LinearGradient colors={[colors.primaryDark, colors.primary]} style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ width: 36, height: 36, borderRadius: radius.sm, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 14 }}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5 }}>{t('stories_label')}</Text>
          {showNewBadge && (
            <View style={{ backgroundColor: '#EF4444', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontSize: 9, fontWeight: '800', color: '#fff' }}>Nouveau 🆕</Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#fff' }}>{t('stories_title')}</Text>
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 6 }}>
          {t('stories_sub')}
        </Text>
      </LinearGradient>

      {/* Post button */}
      <TouchableOpacity
        onPress={() => setCreateModal(true)}
        style={{
          margin: 16, borderRadius: radius.lg, overflow: 'hidden',
          ...shadow.sm,
        }}
      >
        <LinearGradient colors={[colors.primary, '#2E8B57']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, gap: 12 }}
        >
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="camera" size={18} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{t('stories_share_btn')}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>{t('stories_before_after')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
        </LinearGradient>
      </TouchableOpacity>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={stories}
          keyExtractor={s => s.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); }} colors={[colors.primary]} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <StoryCard
              story={item}
              currentUserId={user?.id ?? ''}
              onComment={s => setCommentModal(s)}
              onDelete={handleDeleteStory}
            />
          )}
        />
      )}

      {/* Create story modal */}
      <CreateStoryModal
        visible={createModal}
        onClose={() => setCreateModal(false)}
        onPublished={() => Alert.alert('🎉 Story publiée !', 'Ta story est maintenant visible par la communauté.')}
      />

      {/* Comment modal */}
      <Modal visible={!!commentModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setCommentModal(null)} />
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%' }}>
            {/* Handle */}
            <View style={{ width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 14 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 14, gap: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 }}>{t('stories_comments')}</Text>
              <TouchableOpacity onPress={() => setCommentModal(null)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Reactions quick bar */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 12 }}>
              {REACTIONS.map(r => (
                <TouchableOpacity key={r} onPress={() => sendComment(r)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ fontSize: 20 }}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Comments list */}
            <FlatList
              data={comments}
              keyExtractor={c => c.id}
              style={{ maxHeight: 260, paddingHorizontal: 16 }}
              ListEmptyComponent={
                <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 20 }}>
                  {t('stories_first_comment')}
                </Text>
              }
              renderItem={({ item }) => (
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryGhost, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 14 }}>🌱</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: colors.background, borderRadius: radius.md, padding: 10 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary, marginBottom: 2 }}>{item.userName}</Text>
                    <Text style={{ fontSize: 13, color: colors.text }}>{item.text}</Text>
                  </View>
                </View>
              )}
            />

            {/* Input */}
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
              <TextInput
                style={{ flex: 1, backgroundColor: colors.background, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.border }}
                placeholder={t('stories_placeholder')}
                placeholderTextColor={colors.textMuted}
                value={commentText}
                onChangeText={setCommentText}
              />
              <TouchableOpacity
                onPress={() => sendComment()}
                disabled={!commentText.trim() || sendingComment}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: commentText.trim() ? colors.primary : colors.border, justifyContent: 'center', alignItems: 'center' }}
              >
                <Ionicons name="send" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// Mock data when Firestore 'stories' collection is empty
const MOCK_STORIES: Story[] = [
  {
    id: 'mock1',
    userId: 'u1',
    userName: 'Sarra M.',
    address: '12 Rue de la Liberté, La Marsa, Tunis',
    caption: 'Zone nettoyée en 30 minutes avec mes voisins ! 💪 On peut vraiment changer les choses ensemble.',
    likes: 47,
    comments: 12,
    likedBy: [],
    createdAt: new Date(Date.now() - 2 * 3600_000),
  },
  {
    id: 'mock2',
    userId: 'u2',
    userName: 'Ahmed K.',
    address: 'Avenue Habib Bourguiba, Tunis',
    caption: 'Chaque geste compte ! Ce parc était envahi de plastiques ce matin. 🌿',
    likes: 31,
    comments: 8,
    likedBy: [],
    createdAt: new Date(Date.now() - 5 * 3600_000),
  },
  {
    id: 'mock3',
    userId: 'u3',
    userName: 'Lina B.',
    address: 'Lac 1, Ariana, Tunis',
    caption: 'Mission accomplie autour du lac ! Merci à tous ceux qui ont participé 🙌',
    likes: 89,
    comments: 24,
    likedBy: [],
    createdAt: new Date(Date.now() - 24 * 3600_000),
  },
];
