import React, { useState, useEffect } from 'react';
import {
  View, Text, SafeAreaView, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  collection, onSnapshot, query, orderBy, updateDoc, doc,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { MUNICIPALITIES } from '../../data/municipalities';
import { useTheme } from '../../context/ThemeContext';
import { radius, shadow } from '../../theme';

interface InboxItem {
  id: string;
  reportId: string;
  userId: string;
  userName: string;
  address: string;
  imageUri?: string;
  latitude: number;
  longitude: number;
  governorate: string;
  createdAt: any;
  status: 'pending' | 'reviewed' | 'validated' | 'rejected';
}

function relativeTime(ts: any): string {
  if (!ts) return '';
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return 'À l\'instant';
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  return `Il y a ${Math.floor(diff / 86400)} j`;
}

const STATUS_CFG = {
  pending:   { label: 'En attente', color: '#F59E0B', bg: '#FEF3C7', icon: 'time-outline' },
  reviewed:  { label: 'En cours',   color: '#3B82F6', bg: '#EFF6FF', icon: 'eye-outline' },
  validated: { label: 'Validé',     color: '#16A34A', bg: '#DCFCE7', icon: 'checkmark-circle' },
  rejected:  { label: 'Rejeté',     color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle' },
} as const;

export default function AdminMunicipalityInboxScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [selectedMun, setSelectedMun] = useState(MUNICIPALITIES[0]);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<InboxItem | null>(null);
  const [munPicker, setMunPicker] = useState(false);

  useEffect(() => {
    setLoading(true);
    setInbox([]);
    const q = query(
      collection(db, 'municipalities', selectedMun.id, 'inbox'),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, snap => {
      setInbox(snap.docs.map(d => ({ id: d.id, ...d.data() } as InboxItem)));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [selectedMun.id]);

  const updateStatus = async (item: InboxItem, status: InboxItem['status']) => {
    await updateDoc(doc(db, 'municipalities', selectedMun.id, 'inbox', item.id), { status });
    setDetail(null);
  };

  const pendingCount = inbox.filter(i => i.status === 'pending').length;

  const byGov = MUNICIPALITIES.reduce<Record<string, typeof MUNICIPALITIES>>((acc, m) => {
    (acc[m.governorate] ??= []).push(m);
    return acc;
  }, {});

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <LinearGradient colors={['#1C1040', '#3B1FA0']} style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}
            style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: 2 }}>ADMIN</Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff' }}>Boîte de réception municipale</Text>
          </View>
          {pendingCount > 0 && (
            <View style={{ backgroundColor: '#EF4444', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>{pendingCount}</Text>
            </View>
          )}
        </View>

        {/* Municipality selector */}
        <TouchableOpacity
          onPress={() => setMunPicker(true)}
          style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
        >
          <Text style={{ fontSize: 16 }}>🏛️</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>{selectedMun.governorate}</Text>
            <Text style={{ fontSize: 15, color: '#fff', fontWeight: '800' }}>Municipalité de {selectedMun.name}</Text>
          </View>
          <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Stats bar */}
      <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {(['pending', 'reviewed', 'validated', 'rejected'] as const).map(s => {
          const cfg = STATUS_CFG[s];
          const count = inbox.filter(i => i.status === s).length;
          return (
            <View key={s} style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: cfg.color }}>{count}</Text>
              <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '600' }}>{cfg.label}</Text>
            </View>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} size="large" />
      ) : inbox.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>📭</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Aucun signalement</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 6 }}>
            Cette municipalité n'a pas encore reçu de signalement.
          </Text>
        </View>
      ) : (
        <FlatList
          data={inbox}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => {
            const cfg = STATUS_CFG[item.status] ?? STATUS_CFG.pending;
            return (
              <TouchableOpacity
                onPress={() => setDetail(item)}
                style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow.xs }}
              >
                <View style={{ flexDirection: 'row' }}>
                  {item.imageUri ? (
                    <Image source={{ uri: item.imageUri }} style={{ width: 90, height: 90 }} contentFit="cover" />
                  ) : (
                    <View style={{ width: 90, height: 90, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ fontSize: 32 }}>🗑️</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, padding: 12, gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, flex: 1 }} numberOfLines={1}>
                        {item.address?.split(',')[0] ?? 'Adresse inconnue'}
                      </Text>
                      <View style={{ backgroundColor: cfg.bg, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, marginLeft: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: cfg.color }}>{cfg.label}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="person-outline" size={11} color={colors.textMuted} />
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>{item.userName ?? 'Citoyen'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>{relativeTime(item.createdAt)}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Detail modal */}
      <Modal visible={!!detail} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' }}>
            <ScrollView>
              {detail?.imageUri && (
                <Image source={{ uri: detail.imageUri }} style={{ width: '100%', height: 220, borderTopLeftRadius: 24, borderTopRightRadius: 24 }} contentFit="cover" />
              )}
              <View style={{ padding: 20, gap: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 17, fontWeight: '900', color: colors.text, flex: 1 }}>
                    {detail?.address?.split(',')[0]}
                  </Text>
                  <TouchableOpacity onPress={() => setDetail(null)}>
                    <Ionicons name="close-circle" size={26} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <Text style={{ fontSize: 13, color: colors.textMuted }}>{detail?.address}</Text>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border }}>
                    <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>CITOYEN</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 4 }}>{detail?.userName}</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border }}>
                    <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>REÇU</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 4 }}>{relativeTime(detail?.createdAt)}</Text>
                  </View>
                </View>

                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Changer le statut :</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {(['pending', 'reviewed', 'validated', 'rejected'] as const).map(s => {
                    const cfg = STATUS_CFG[s];
                    const active = detail?.status === s;
                    return (
                      <TouchableOpacity
                        key={s}
                        onPress={() => detail && updateStatus(detail, s)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: active ? cfg.bg : colors.background, borderWidth: 1.5, borderColor: active ? cfg.color : colors.border }}
                      >
                        <Ionicons name={cfg.icon as any} size={14} color={active ? cfg.color : colors.textMuted} />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: active ? cfg.color : colors.textMuted }}>{cfg.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Municipality picker modal */}
      <Modal visible={munPicker} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 17, fontWeight: '900', color: colors.text }}>Choisir une municipalité</Text>
              <TouchableOpacity onPress={() => setMunPicker(false)}>
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {Object.entries(byGov).map(([gov, muns]) => (
                <View key={gov} style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 1, marginBottom: 8 }}>{gov.toUpperCase()}</Text>
                  <View style={{ gap: 6 }}>
                    {muns.map(m => (
                      <TouchableOpacity
                        key={m.id}
                        onPress={() => { setSelectedMun(m); setMunPicker(false); }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, backgroundColor: selectedMun.id === m.id ? colors.primary + '14' : colors.background, borderWidth: 1, borderColor: selectedMun.id === m.id ? colors.primary : colors.border }}
                      >
                        <Text style={{ fontSize: 16 }}>🏛️</Text>
                        <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: selectedMun.id === m.id ? colors.primary : colors.text }}>{m.name}</Text>
                        {selectedMun.id === m.id && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
