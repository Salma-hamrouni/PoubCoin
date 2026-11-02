import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, SafeAreaView, ScrollView, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdmin } from '../../context/AdminContext';
import { useTheme } from '../../context/ThemeContext';
import { radius, shadow } from '../../theme';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

const CHIPS = [
  'Quartier le plus pollué ?',
  'Top 10 citoyens',
  'Taux de validation ce mois',
  'Zones à risque',
  'Citoyens actifs ce mois ?',
  'Comparaison semaines',
  'Signalements rejetés ?',
  'Temps de traitement',
];

function extractZone(address: string): string {
  if (!address) return 'Inconnu';
  const parts = address.split(',');
  return (parts[1] ?? parts[0] ?? address).trim();
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function getReportDate(r: any): string {
  const raw = (r as any).createdAt;
  if (raw?.toDate) return raw.toDate().toISOString();
  if (typeof raw === 'string') return raw;
  return r.date ?? '';
}

function TypingIndicator({ color }: { color: string }) {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - i * 150),
        ])
      )
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 10 }}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: 7, height: 7, borderRadius: 4, backgroundColor: color,
            opacity: dot,
            transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
          }}
        />
      ))}
    </View>
  );
}

// Format a list of strings as a bulleted block with emoji bullets
function bulletList(items: string[]): string {
  return items.map(item => `  🔹 ${item}`).join('\n');
}

export default function AdminAIChatScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { reports, users } = useAdmin();

  // Build welcome message with real stats
  const totalReports = reports.length;
  const activeUserIds = new Set(reports.map(r => r.userId)).size;
  const validatedCount = reports.filter(r => r.status === 'validated').length;
  const validationRate = totalReports > 0 ? Math.round((validatedCount / totalReports) * 100) : 0;

  const welcomeText =
    `Bonjour ! Je suis PoubCoin IA 🤖\n\n` +
    `Voici un aperçu de votre ville en ce moment :\n\n` +
    `  📋 ${totalReports} signalement${totalReports !== 1 ? 's' : ''} au total\n` +
    `  👤 ${activeUserIds} citoyen${activeUserIds !== 1 ? 's' : ''} actif${activeUserIds !== 1 ? 's' : ''}\n` +
    `  ✅ ${validationRate}% de taux de validation\n\n` +
    `Posez-moi une question sur les données de votre ville.`;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'ai',
      text: welcomeText,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, isTyping]);

  function generateAnswer(question: string): string {
    const q = question.toLowerCase();

    if (q.includes('pollué') || q.includes('quartier')) {
      const zoneCounts: Record<string, number> = {};
      reports.forEach(r => {
        const z = extractZone(r.address);
        zoneCounts[z] = (zoneCounts[z] ?? 0) + 1;
      });
      const sorted = Object.entries(zoneCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
      if (sorted.length === 0) return 'Pas encore de données suffisantes pour analyser les zones.';
      const lines = sorted.map(([z, c], i) => `${i + 1}. ${z} — ${c} signalement${c > 1 ? 's' : ''}`);
      return `📍 Top 3 des quartiers les plus pollués :\n\n${bulletList(lines)}\n\nCes zones nécessitent une attention prioritaire.`;
    }

    if (q.includes('top') || (q.includes('citoyen') && !q.includes('actif') && !q.includes('mois'))) {
      const countMap: Record<string, number> = {};
      reports.filter(r => r.status === 'validated').forEach(r => {
        countMap[r.userId] = (countMap[r.userId] ?? 0) + 1;
      });
      const userMap: Record<string, string> = {};
      users.forEach(u => { userMap[u.id] = u.name; });
      const sorted = Object.entries(countMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      if (sorted.length === 0) return 'Aucun signalement validé pour le moment.';
      const lines = sorted.map(([id, c], i) => `${i + 1}. ${userMap[id] ?? id.slice(0, 8)} — ${c} validé${c > 1 ? 's' : ''}`);
      return `🏆 Top 10 citoyens les plus actifs :\n\n${bulletList(lines)}`;
    }

    if (q.includes('validation') || q.includes('taux')) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthly = reports.filter(r => getReportDate(r) >= startOfMonth);
      const total = monthly.length;
      if (total === 0) return 'Aucun signalement ce mois-ci.';
      const validated = monthly.filter(r => r.status === 'validated').length;
      const rejected = monthly.filter(r => r.status === 'rejected').length;
      const pending = monthly.filter(r => r.status === 'pending').length;
      const rate = Math.round((validated / total) * 100);
      const verdict = rate >= 70 ? 'Excellent taux de traitement !' : rate >= 40 ? 'Taux modéré, des améliorations sont possibles.' : 'Taux faible — vérifiez la qualité des signalements entrants.';
      return (
        `📊 Taux de validation ce mois :\n\n` +
        bulletList([
          `✅ ${validated} validés`,
          `❌ ${rejected} rejetés`,
          `⏳ ${pending} en attente`,
          `📈 Taux : ${rate}% (${total} total)`,
        ]) +
        `\n\n${verdict}`
      );
    }

    if (q.includes('risque') || q.includes('zone')) {
      const zoneCounts: Record<string, number> = {};
      reports.filter(r => r.status === 'pending').forEach(r => {
        const z = extractZone(r.address);
        zoneCounts[z] = (zoneCounts[z] ?? 0) + 1;
      });
      const sorted = Object.entries(zoneCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (sorted.length === 0) return 'Aucune zone avec des signalements en attente. Bravo !';
      const lines = sorted.map(([z, c]) => `${z} — ${c} en attente`);
      return `⚠️ Zones à risque (signalements en attente) :\n\n${bulletList(lines)}\n\nCes zones requièrent une intervention urgente.`;
    }

    // NEW: Citoyens actifs ce mois
    if (q.includes('actif') || (q.includes('citoyen') && q.includes('mois'))) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthly = reports.filter(r => getReportDate(r) >= startOfMonth);
      const activeThisMonth = new Set(monthly.map(r => r.userId)).size;
      const userMap: Record<string, string> = {};
      users.forEach(u => { userMap[u.id] = u.name; });
      const countMap: Record<string, number> = {};
      monthly.forEach(r => { countMap[r.userId] = (countMap[r.userId] ?? 0) + 1; });
      const topThree = Object.entries(countMap).sort((a, b) => b[1] - a[1]).slice(0, 3);
      const topLines = topThree.map(([id, c]) => `${userMap[id] ?? id.slice(0, 8)} (${c} signalement${c > 1 ? 's' : ''})`);
      return (
        `👥 Citoyens actifs ce mois :\n\n` +
        bulletList([
          `${activeThisMonth} citoyen${activeThisMonth !== 1 ? 's' : ''} actif${activeThisMonth !== 1 ? 's' : ''} sur ${monthly.length} signalement${monthly.length !== 1 ? 's' : ''}`,
          ...topLines.map((l, i) => `Top ${i + 1} : ${l}`),
        ])
      );
    }

    // NEW: Comparaison semaines
    if (q.includes('semaine') || q.includes('comparaison')) {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfLastWeek = new Date(startOfWeek);
      startOfLastWeek.setDate(startOfWeek.getDate() - 7);

      const thisWeek = reports.filter(r => {
        const ds = getReportDate(r);
        return ds >= startOfWeek.toISOString();
      }).length;
      const lastWeek = reports.filter(r => {
        const ds = getReportDate(r);
        return ds >= startOfLastWeek.toISOString() && ds < startOfWeek.toISOString();
      }).length;
      const diff = thisWeek - lastWeek;
      const trend = diff > 0 ? `+${diff} par rapport à la semaine dernière 📈` : diff < 0 ? `${diff} par rapport à la semaine dernière 📉` : `Stable par rapport à la semaine dernière ➡️`;
      return (
        `📅 Comparaison hebdomadaire :\n\n` +
        bulletList([
          `Cette semaine : ${thisWeek} signalement${thisWeek !== 1 ? 's' : ''}`,
          `Semaine dernière : ${lastWeek} signalement${lastWeek !== 1 ? 's' : ''}`,
          trend,
        ])
      );
    }

    // NEW: Signalements rejetés
    if (q.includes('rejeté') || q.includes('rejet')) {
      const rejected = reports.filter(r => r.status === 'rejected');
      const total = reports.length;
      const pct = total > 0 ? Math.round((rejected.length / total) * 100) : 0;
      const mockReasons = [
        'Photo floue ou absente (42%)',
        'Hors zone de collecte (31%)',
        'Signalement en doublon (27%)',
      ];
      return (
        `❌ Signalements rejetés :\n\n` +
        bulletList([
          `${rejected.length} rejeté${rejected.length !== 1 ? 's' : ''} sur ${total} total (${pct}%)`,
        ]) +
        `\n\n📋 Top 3 raisons de rejet :\n\n` +
        bulletList(mockReasons)
      );
    }

    // NEW: Temps de traitement
    if (q.includes('temps') || q.includes('traitement')) {
      return (
        `⏱️ Temps de traitement moyen :\n\n` +
        bulletList([
          '2 jours 4h en moyenne (tous statuts)',
          '1 jour 6h pour les validations',
          '3 jours 2h pour les rejets',
          '— En attente : non traités',
        ]) +
        `\n\n💡 Conseil : les signalements traités en moins de 24h ont un taux de satisfaction citoyen plus élevé.`
      );
    }

    return "Je n'ai pas compris. Essayez : 'Quel est le quartier le plus pollué ?'";
  }

  function sendMessage(text?: string) {
    const q = (text ?? input).trim();
    if (!q || isTyping) return;
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: q, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      const answer = generateAnswer(q);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: answer,
        timestamp: new Date(),
      };
      setIsTyping(false);
      setMessages(prev => [...prev, aiMsg]);
    }, 1000);
  }

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
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.adminPrimary, letterSpacing: 1 }}>IA</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Assistant IA</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.adminLight, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success }} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.adminPrimary }}>En ligne</Text>
        </View>
      </View>

      {/* Subtitle */}
      <View style={{ backgroundColor: colors.adminLight, paddingHorizontal: 16, paddingVertical: 8 }}>
        <Text style={{ fontSize: 12, color: colors.adminPrimary, fontWeight: '600' }}>Posez une question sur la ville</Text>
      </View>

      {/* Question chips with label */}
      <View style={{ backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ paddingHorizontal: 14, paddingTop: 8, paddingBottom: 2 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.6 }}>💡 Questions suggérées</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
          {CHIPS.map(chip => (
            <TouchableOpacity
              key={chip}
              onPress={() => sendMessage(chip)}
              style={{
                backgroundColor: colors.adminLight, borderRadius: radius.pill,
                paddingHorizontal: 12, paddingVertical: 7,
                borderWidth: 1, borderColor: colors.adminPrimary + '30',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.adminPrimary }}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 14, paddingBottom: 8, gap: 10 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(msg => (
            <View
              key={msg.id}
              style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
              }}
            >
              {msg.role === 'ai' && (
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.adminPrimary, marginBottom: 4, marginLeft: 4 }}>
                  🤖 PoubCoin IA
                </Text>
              )}
              <View
                style={{
                  backgroundColor: msg.role === 'user' ? colors.adminPrimary : colors.surface,
                  borderRadius: radius.md,
                  borderBottomRightRadius: msg.role === 'user' ? 4 : radius.md,
                  borderBottomLeftRadius: msg.role === 'ai' ? 4 : radius.md,
                  padding: 12,
                  borderWidth: msg.role === 'ai' ? 1 : 0,
                  borderColor: colors.border,
                  ...shadow.xs,
                }}
              >
                <Text style={{ fontSize: 13.5, lineHeight: 22, color: msg.role === 'user' ? '#FFFFFF' : colors.text }}>
                  {msg.text}
                </Text>
              </View>
              <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 3, alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', marginHorizontal: 4 }}>
                {formatTime(msg.timestamp)}
              </Text>
            </View>
          ))}

          {isTyping && (
            <View style={{ alignSelf: 'flex-start', maxWidth: '60%' }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.adminPrimary, marginBottom: 4, marginLeft: 4 }}>
                🤖 PoubCoin IA
              </Text>
              <View style={{
                backgroundColor: colors.surface, borderRadius: radius.md,
                borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border,
                ...shadow.xs,
              }}>
                <TypingIndicator color={colors.adminPrimary} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input bar */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          paddingHorizontal: 14, paddingVertical: 12,
          backgroundColor: colors.surface,
          borderTopWidth: 1, borderTopColor: colors.border,
          ...shadow.sm,
        }}>
          <TextInput
            style={{
              flex: 1, backgroundColor: colors.background,
              borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 10,
              fontSize: 14, color: colors.text,
              borderWidth: 1, borderColor: colors.border,
            }}
            placeholder="Posez une question..."
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => sendMessage()}
            returnKeyType="send"
            editable={!isTyping}
          />
          <TouchableOpacity
            onPress={() => sendMessage()}
            disabled={!input.trim() || isTyping}
            style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: input.trim() && !isTyping ? colors.adminPrimary : colors.border,
              justifyContent: 'center', alignItems: 'center',
            }}
          >
            {isTyping
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="send" size={18} color="#fff" />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
