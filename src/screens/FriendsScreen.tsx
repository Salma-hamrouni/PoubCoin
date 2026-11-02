import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, SafeAreaView, TouchableOpacity, TextInput,
  FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Avatar from '../components/Avatar';
import Chip from '../components/Chip';
import {
  collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc, query, limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { shadow } from '../theme';

interface UserProfile {
  id: string;
  name: string;
  city?: string;
  avatar?: string;
  photoURL?: string;
  reportCount?: number;
  following?: string[];
  followers?: string[];
  role?: string;
  isMunicipality?: boolean;
}

type Tab = 'discover' | 'following' | 'followers';

export default function FriendsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('discover');
  const [search, setSearch] = useState('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [myFollowing, setMyFollowing] = useState<string[]>([]);
  const [myFollowers, setMyFollowers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [pendingFollow, setPendingFollow] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoadError(false);
    try {
      const [usersSnap, meSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), limit(80))),
        getDoc(doc(db, 'users', user.id)),
      ]);
      if (meSnap.exists()) {
        const meData = meSnap.data();
        setMyFollowing(meData?.following ?? []);
        setMyFollowers(meData?.followers ?? []);
      }
      const users: UserProfile[] = [];
      usersSnap.forEach(d => {
        const data = d.data();
        const role = (data.role ?? '').toLowerCase();
        const isCitizen = role === '' || role === 'citizen' || role === 'user';
        if (d.id !== user.id && isCitizen && !data.isMunicipality) {
          users.push({ id: d.id, ...data } as UserProfile);
        }
      });
      setAllUsers(users);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleFollow = async (targetId: string) => {
    if (!user?.id || pendingFollow) return;
    setPendingFollow(targetId);
    const isFollowing = myFollowing.includes(targetId);
    try {
      const meRef = doc(db, 'users', user.id);
      const targetRef = doc(db, 'users', targetId);
      if (isFollowing) {
        await Promise.all([
          updateDoc(meRef, { following: arrayRemove(targetId) }),
          updateDoc(targetRef, { followers: arrayRemove(user.id) }),
        ]);
        setMyFollowing(f => f.filter(id => id !== targetId));
      } else {
        await Promise.all([
          updateDoc(meRef, { following: arrayUnion(targetId) }),
          updateDoc(targetRef, { followers: arrayUnion(user.id) }),
        ]);
        setMyFollowing(f => [...f, targetId]);
      }
    } catch (e) {
      // rollback optimistic update
      if (isFollowing) {
        setMyFollowing(f => [...f, targetId]);
      } else {
        setMyFollowing(f => f.filter(id => id !== targetId));
      }
    } finally {
      setPendingFollow(null);
    }
  };

  const searchLower = search.toLowerCase();
  const filteredUsers = allUsers.filter(u =>
    !search || u.name?.toLowerCase().includes(searchLower) || u.city?.toLowerCase().includes(searchLower)
  );

  const displayedUsers = activeTab === 'discover'
    ? filteredUsers
    : activeTab === 'following'
      ? filteredUsers.filter(u => myFollowing.includes(u.id))
      : filteredUsers.filter(u => myFollowers.includes(u.id));

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'discover', label: 'Découvrir' },
    { key: 'following', label: 'Abonnements', count: myFollowing.length },
    { key: 'followers', label: 'Abonnés', count: myFollowers.length },
  ];

  const renderUser = ({ item }: { item: UserProfile }) => {
    const isFollowing = myFollowing.includes(item.id);
    const isFollower = myFollowers.includes(item.id);
    const avatarUrl   = item.photoURL ?? (item.avatar?.startsWith('http') ? item.avatar : undefined);
    const avatarEmoji = !avatarUrl && item.avatar && !item.avatar.startsWith('http') ? item.avatar : undefined;
    const isPending   = pendingFollow === item.id;

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('PublicProfile', { userId: item.id })}
        activeOpacity={0.85}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 12,
          backgroundColor: colors.surface, borderRadius: 16, padding: 14,
          borderWidth: 1, borderColor: colors.border, ...shadow.xs,
          marginBottom: 8,
        }}
      >
        {/* Avatar */}
        <Avatar
          uri={avatarUrl}
          emoji={avatarEmoji}
          name={item.name}
          size={50}
          ring={isFollowing ? colors.primary : undefined}
          badge={isFollower && !isFollowing ? 'vous suit' : undefined}
        />

        {/* Info */}
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {item.city ? (
              <Chip label={item.city} icon="location-outline" size="xs" variant="ghost" />
            ) : null}
            {(item.reportCount ?? 0) > 0 && (
              <Chip label={`${item.reportCount} signalements`} icon="camera-outline" size="xs" variant="ghost" noHaptic />
            )}
          </View>
        </View>

        {/* Follow button */}
        <TouchableOpacity
          onPress={() => toggleFollow(item.id)}
          disabled={!!pendingFollow}
          style={{
            paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
            backgroundColor: isFollowing ? colors.background : colors.primary,
            borderWidth: 1, borderColor: isFollowing ? colors.border : colors.primary,
          }}
        >
          {isPending ? (
            <ActivityIndicator size="small" color={isFollowing ? colors.textMuted : '#fff'} />
          ) : (
            <Text style={{ fontSize: 12, fontWeight: '800', color: isFollowing ? colors.textMuted : '#fff' }}>
              {isFollowing ? 'Abonné ✓' : isFollower ? '+ Suivre en retour' : '+ Suivre'}
            </Text>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <LinearGradient colors={['#0D1F14', '#1B4332']} style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 20 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.7)" />
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Retour</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: 2 }}>COMMUNAUTÉ</Text>
        <Text style={{ fontSize: 24, fontWeight: '900', color: '#fff', marginTop: 4 }}>Amis & Following 🤝</Text>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
          {[
            { label: 'Abonnements', count: myFollowing.length },
            { label: 'Abonnés', count: myFollowers.length },
            { label: 'Utilisateurs', count: allUsers.length },
          ].map(s => (
            <View key={s.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff' }}>{s.count}</Text>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.border }}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={{ flex: 1, fontSize: 14, color: colors.text }}
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher un utilisateur ou une ville..."
            placeholderTextColor={colors.textMuted}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 10 }}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
              backgroundColor: activeTab === tab.key ? colors.primary : colors.surface,
              borderWidth: 1, borderColor: activeTab === tab.key ? colors.primary : colors.border,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === tab.key ? '#fff' : colors.textSecondary }}>
              {tab.label}
            </Text>
            {tab.count !== undefined && (
              <View style={{ backgroundColor: activeTab === tab.key ? 'rgba(255,255,255,0.25)' : colors.primaryGhost, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: activeTab === tab.key ? '#fff' : colors.primary }}>
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>Chargement de la communauté...</Text>
        </View>
      ) : loadError ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 }}>
          <Text style={{ fontSize: 36 }}>⚠️</Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Erreur de connexion</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>Impossible de charger la communauté. Vérifiez votre connexion.</Text>
          <TouchableOpacity onPress={() => { setLoading(true); loadData(); }} style={{ backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10 }}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={displayedUsers}
          keyExtractor={item => item.id}
          renderItem={renderUser}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', gap: 12, paddingTop: 48, paddingHorizontal: 24 }}>
              <Text style={{ fontSize: 44 }}>{activeTab === 'following' ? '🤝' : activeTab === 'followers' ? '👥' : '🔍'}</Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
                {activeTab === 'following' ? 'Pas encore d\'abonnements'
                  : activeTab === 'followers' ? 'Pas encore d\'abonnés'
                  : search ? 'Aucun résultat' : 'Aucun utilisateur trouvé'}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 }}>
                {activeTab === 'discover'
                  ? search ? 'Essayez un autre terme de recherche.' : 'La communauté se charge...'
                  : 'Abonnez-vous à des utilisateurs pour les retrouver ici.'}
              </Text>
              {activeTab !== 'discover' && (
                <TouchableOpacity
                  onPress={() => setActiveTab('discover')}
                  style={{ backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 11, marginTop: 4 }}
                >
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Découvrir des utilisateurs</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
