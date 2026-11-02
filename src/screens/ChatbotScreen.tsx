import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, SafeAreaView, FlatList,
  TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { shadow, radius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useT } from '../i18n/useT';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';

interface Message {
  id: string;
  text: string;
  from: 'user' | 'bot';
  time: string;
  suggestions?: string[];
}

const now = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

// ─── Base de connaissances ─────────────────────────────────────────────────────
interface BotCtx {
  name: string;
  balance: number;
  totalReports: number;
  validated: number;
  pending: number;
  rejected: number;
}

interface KBEntry {
  patterns: RegExp[];
  reply: (ctx: BotCtx) => string;
  suggestions?: string[];
}

const KB: KBEntry[] = [
  {
    patterns: [/^(bonjour|salut|salam|hello|coucou|bonsoir|hi|hey)[\s!.]*$/i],
    reply: (c) => `Salam ${c.name} ! 👋\n\nJe suis **PoubBot**, votre assistant personnel PoubCoin. Je peux vous aider avec :\n\n🪙 Votre solde et récompenses\n📸 Soumettre un signalement\n🗺️ La carte et les zones\n❓ Toutes vos questions`,
    suggestions: ['Mon solde 🪙', 'Comment signaler ?', 'Mes récompenses', 'Mon niveau'],
  },
  {
    patterns: [/merci|shukran|bravo|parfait|super|génial|excellent|top/i],
    reply: (c) => `Avec plaisir ${c.name} ! 😊\n\nN'hésitez pas si vous avez d'autres questions. Je suis là pour vous aider.`,
    suggestions: ['Autre question', 'Mon solde 🪙', 'Comment signaler ?'],
  },
  {
    patterns: [/solde|balance|combien.*coin|mon.*portefeuille|argent|coins?$/i],
    reply: (c) => {
      const status = c.balance >= 100 ? '🏆 Excellent !' : c.balance >= 50 ? '👍 Bien !' : '💪 Continuez !';
      return `**Votre portefeuille PoubCoin** 🪙\n\n💰 Solde actuel : **${c.balance} coins**\n📸 Signalements : ${c.totalReports} total\n✅ Validés : ${c.validated}\n⏳ En attente : ${c.pending}\n\n${status}\n\n${c.validated > 0 ? `Votre solde actuel est de **${c.balance} coins**.` : 'Faites votre premier signalement pour gagner 50 coins !'}`;
    },
    suggestions: ['Dépenser mes coins', 'Comment gagner plus ?', 'Voir le classement'],
  },
  {
    patterns: [/signal|photo|déchet|poubelle|comment.*signal|soumettre|rapport|report/i],
    reply: () => `**Comment signaler un déchet** 📸\n\n1️⃣ Appuyez sur l'icône **Caméra** en bas de l'écran\n2️⃣ Prenez une photo claire du déchet\n3️⃣ Attendez la détection GPS automatique\n4️⃣ Appuyez sur **Envoyer le signalement**\n\n✅ Vous recevrez **+50 🪙** après validation\n⏱️ La validation prend 24-48h\n\n💡 **Astuce** : Prenez la photo en plein jour pour une meilleure qualité !`,
    suggestions: ['Délai de validation ?', 'Pourquoi rejeté ?', 'Combien de coins ?'],
  },
  {
    patterns: [/valida|combien.*temps|attente|quand.*coin|délai|durée/i],
    reply: (c) => {
      const pendingMsg = c.pending > 0
        ? `\n\nVous avez actuellement **${c.pending} signalement${c.pending > 1 ? 's' : ''} en attente** de validation.`
        : '';
      return `**Délai de validation** ⏱️\n\nLa municipalité examine chaque signalement sous **24 à 48 heures**.\n\nUne fois validé :\n🪙 +50 PoubCoins crédités automatiquement\n🔔 Notification envoyée sur votre téléphone${pendingMsg}`;
    },
    suggestions: ['Pourquoi rejeté ?', 'Mon solde 🪙', 'Comment signaler ?'],
  },
  {
    patterns: [/dépenser|utiliser.*coin|récompense|marketplace|sponsor|bon|cadeau|offre/i],
    reply: (c) => {
      const canBuy = c.balance >= 25;
      return `**Dépenser vos PoubCoins** 🎁\n\nAllez dans l'onglet **Récompenses** pour échanger vos coins :\n\n☕ Café Sarra — Café + Croissant · **25 coins**\n🚇 Métro Tunis — Ticket gratuit · **30 coins**\n🛒 Monoprix — Bon 5 DT · **50 coins**\n🎬 Cinéma Colisée — Place cinéma · **70 coins**\n🏪 Géant — Bon 10 DT · **80 coins**\n🍕 Pizza Hut — Pizza offerte · **100 coins**\n\n${canBuy ? `✅ Avec vos **${c.balance} coins**, vous pouvez déjà profiter de certaines offres !` : `💡 Il vous faut encore **${25 - c.balance} coins** pour votre première récompense.`}`;
    },
    suggestions: ['Comment gagner des coins ?', 'Mon solde 🪙', 'Comment signaler ?'],
  },
  {
    patterns: [/classement|rang|leaderboard|palmarès|meilleur|position|top/i],
    reply: (c) => `**Classement PoubCoin** 🏆\n\nConsultez l'onglet **Classement** pour voir votre position parmi tous les citoyens.\n\nVotre score actuel :\n📸 ${c.totalReports} signalement${c.totalReports > 1 ? 's' : ''}\n✅ ${c.validated} validé${c.validated > 1 ? 's' : ''}\n🪙 ${c.balance} coins\n\n💡 Plus vous signalez, plus vous montez dans le classement !`,
    suggestions: ['Comment signaler ?', 'Mon niveau', 'Mon solde 🪙'],
  },
  {
    patterns: [/niveau|badge|champion|légende|éco|citoyen|rang|grade/i],
    reply: (c) => {
      const levels = [
        { name: 'Légende Verte ⭐', min: 100 },
        { name: 'Champion 🏆', min: 25 },
        { name: 'Éco-Actif 🌳', min: 10 },
        { name: 'Citoyen 🌿', min: 3 },
        { name: 'Débutant 🌱', min: 0 },
      ];
      const current = levels.find(l => c.validated >= l.min) ?? levels[4];
      const next = levels[levels.indexOf(current) - 1];
      const progressMsg = next
        ? `\n\nProchain niveau : **${next.name}** (encore ${next.min - c.validated} validation${next.min - c.validated > 1 ? 's' : ''})`
        : '\n\n🎉 Vous avez atteint le niveau maximum !';
      return `**Votre niveau** : ${current.name}\n\nLes niveaux PoubCoin :\n🌱 Débutant — 0 à 2 validations\n🌿 Citoyen — 3 à 9\n🌳 Éco-Actif — 10 à 24\n🏆 Champion — 25 à 99\n⭐ Légende Verte — 100+${progressMsg}`;
    },
    suggestions: ['Mon solde 🪙', 'Comment signaler ?', 'Voir le classement'],
  },
  {
    patterns: [/carte|map|où|localisation|zone|quartier|géo/i],
    reply: () => `**Carte PoubCoin** 🗺️\n\nL'onglet **Carte** affiche :\n\n🟢 Points verts → signalements validés\n🟡 Points orange → en attente de validation\n🔴 Points rouges → signalements rejetés\n📍 Votre position en temps réel\n\n💡 Appuyez sur un point pour voir les détails du signalement.`,
    suggestions: ['Comment signaler ?', 'Mon solde 🪙', 'Pourquoi rejeté ?'],
  },
  {
    patterns: [/profil|compte|modifier|avatar|photo.*profil|nom|ville/i],
    reply: () => `**Modifier votre profil** ✏️\n\n1️⃣ Allez dans l'onglet **Profil**\n2️⃣ Cliquez sur le ✏️ en haut à droite\n3️⃣ Modifiez : nom, ville, téléphone\n4️⃣ Appuyez sur **Enregistrer**\n\n🖼️ Pour changer votre avatar :\nAppuyez directement sur votre photo de profil et choisissez un emoji.`,
    suggestions: ['Mon solde 🪙', 'Notifications', 'Contacter le support'],
  },
  {
    patterns: [/mot.*passe|password|oublié|connexion|login|déconnect/i],
    reply: () => `**Problème de connexion** 🔐\n\n• Vérifiez votre email et mot de passe\n• Le mot de passe doit avoir **au moins 6 caractères**\n• Vérifiez que vous avez bien un compte créé\n\nSi le problème persiste :\n📧 Contactez **support@poubcoin.tn**\n☎️ +216 71 000 000`,
    suggestions: ['Contacter le support', 'Mon solde 🪙'],
  },
  {
    patterns: [/notif|notification|alerte|rappel|push/i],
    reply: () => `**Notifications PoubCoin** 🔔\n\nVous recevez des alertes pour :\n\n✅ Signalement validé → +50 coins\n🎁 Nouvelles récompenses disponibles\n📢 Actualités et événements PoubCoin\n\n⚙️ Gérez vos préférences dans :\n**Profil → Notifications** (activer/désactiver chaque type)`,
    suggestions: ['Mon solde 🪙', 'Récompenses disponibles', 'Modifier mon profil'],
  },
  {
    patterns: [/contact|support|aide.*humain|parler.*humain|téléphone|email|mail/i],
    reply: () => `**Contacter le support** 📞\n\nNotre équipe est disponible :\n⏰ Lundi–Vendredi, 8h–17h\n\n📧 **support@poubcoin.tn**\n☎️ **+216 71 000 000**\n\nOu dans l'app : **Profil → Nous contacter**\n\n💡 Pour les problèmes urgents, l'email est le moyen le plus rapide !`,
    suggestions: ['Centre d\'aide', 'Mon solde 🪙', 'Signaler un bug'],
  },
  {
    patterns: [/qu'est.*ce|c'est quoi|poubcoin|application|app|présent|comment.*march/i],
    reply: () => `**PoubCoin** — La propreté, ça rapporte ! 🌍\n\nPoubCoin récompense les citoyens tunisiens qui contribuent à la propreté de leur ville :\n\n📸 **Signalez** → Photographiez les déchets\n✅ **Validé** → La municipalité vérifie\n🪙 **+50 coins** → Crédités sur votre compte\n🎁 **Échangez** → Récompenses chez nos partenaires\n\n👥 Plus de 1 247 citoyens actifs en Tunisie !`,
    suggestions: ['Comment signaler ?', 'Voir les récompenses', 'Mon solde 🪙'],
  },
  {
    patterns: [/rejet|rejeté|pourquoi.*rejet|refus|pas.*valid|invalid/i],
    reply: () => `**Pourquoi un signalement est rejeté ?** ❌\n\nCauses fréquentes :\n\n📷 Photo floue ou trop sombre\n🏠 Déchet sur propriété privée\n📍 Position GPS imprécise\n🔄 Signalement en double\n👤 Présence de personnes identifiables\n\n**Comment éviter le rejet ?**\n✅ Prenez la photo en plein jour\n✅ Restez à moins de 5m du déchet\n✅ Assurez-vous d'être en espace public\n✅ Activez le GPS avant de signaler`,
    suggestions: ['Comment signaler ?', 'Mon solde 🪙', 'Contacter le support'],
  },
  {
    patterns: [/gagner|plus.*coin|augmenter|maximis|astuce|conseil|tip/i],
    reply: (c) => `**Astuces pour gagner plus de coins** 💡\n\n1️⃣ Signalez **plusieurs déchets** dans la même sortie\n2️⃣ Prenez des photos **de qualité** pour éviter le rejet\n3️⃣ Signalez dans les **zones peu couvertes** (carte)\n4️⃣ Soyez **régulier** — chaque jour compte !\n\n${c.validated > 0 ? `Vous avez déjà ${c.validated} signalement${c.validated > 1 ? 's' : ''} validé${c.validated > 1 ? 's' : ''} 👏` : 'Votre premier signalement validé vous rapporte 50 coins !'}\n\n🎯 Objectif : 10 validations pour atteindre le niveau Éco-Actif !`,
    suggestions: ['Comment signaler ?', 'Mon niveau', 'Voir le classement'],
  },
  {
    patterns: [/bug|erreur|problème|crash|plante|marche pas|fonctionne pas/i],
    reply: () => `**Signaler un bug** 🐛\n\nDésolé pour ce problème !\n\nPour nous le signaler :\n📧 **support@poubcoin.tn**\n\nMerci de préciser :\n• L'écran où le bug se produit\n• Ce que vous faisiez\n• Votre téléphone (iOS/Android)\n\nNos équipes corrigeront ça rapidement ! 🔧`,
    suggestions: ['Contacter le support', 'Mon solde 🪙'],
  },
  {
    patterns: [/défi|challenge|mission|hebdo|semaine|objectif/i],
    reply: (c) => `**Défis PoubCoin** 🏆\n\nConsultez vos défis dans **Accueil → Défis**.\n\nLes défis sont créés par la municipalité et se basent sur vos signalements validés.\n\n🎯 Plus vous signalez, plus vous progressez !\n\nVous avez actuellement **${c.validated} signalement${c.validated > 1 ? 's' : ''} validé${c.validated > 1 ? 's' : ''}** — chaque défi complété vous rapporte des coins bonus.`,
    suggestions: ['Comment signaler ?', 'Mes badges', 'Mon solde 🪙'],
  },
  {
    patterns: [/qr|code|bon|voucher|coupon|recevoir.*récompense|utiliser.*bon/i],
    reply: () => `**Utiliser une récompense** 🎁\n\nAprès avoir échangé vos coins :\n\n1️⃣ Un **code unique** est généré (ex: POUB-AB1234)\n2️⃣ Montrez ce code au partenaire au moment du paiement\n3️⃣ Le partenaire valide votre bon\n\n📍 Retrouvez vos bons dans **Récompenses**\n⏳ Les bons sont valables **30 jours** après génération`,
    suggestions: ['Voir les récompenses', 'Comment gagner des coins ?', 'Mon solde 🪙'],
  },
  {
    patterns: [/historique|transaction|historique.*paiement|mes achats/i],
    reply: (c) => `**Votre historique** 📋\n\nDans l'onglet **Historique**, vous trouverez :\n\n📸 Onglet **Signalements** — tous vos signalements avec statut\n🪙 Onglet **Transactions** — coins gagnés et dépensés\n\nVous avez soumis **${c.totalReports} signalement${c.totalReports > 1 ? 's' : ''}** au total dont **${c.validated} validé${c.validated > 1 ? 's' : ''}**.`,
    suggestions: ['Mon solde 🪙', 'Comment signaler ?', 'Mes récompenses'],
  },
  {
    patterns: [/impact|environnement|co2|carbone|déchet.*kg|pollution|recyclage/i],
    reply: (c) => {
      const kg = (c.validated * 2.5).toFixed(1);
      const co2 = (c.validated * 0.8).toFixed(1);
      return `**Votre impact environnemental** 🌍\n\nGrâce à vos **${c.validated} signalements validés** :\n\n⚖️ **${kg} kg** de déchets collectés (estimation)\n💨 **${co2} kg** de CO₂ évités\n🌍 **${(c.validated * 0.05).toFixed(2)} km²** nettoyés\n\n🌱 Chaque signalement compte ! Consultez vos stats détaillées dans l'onglet **Statistiques**.`;
    },
    suggestions: ['Comment signaler ?', 'Mon niveau', 'Voir le classement'],
  },
];

function getLocalResponse(text: string, ctx: BotCtx): { reply: string; suggestions: string[] } | null {
  const lower = text.toLowerCase().trim();
  for (const entry of KB) {
    if (entry.patterns.some(p => p.test(lower))) {
      return { reply: entry.reply(ctx), suggestions: entry.suggestions ?? [] };
    }
  }
  const keywords: Record<string, string> = {
    coin: 'solde', signal: 'signaler', récompense: 'dépenser', badge: 'niveau',
    carte: 'carte', profil: 'profil', aide: 'contact', bug: 'bug',
    défi: 'défi', challenge: 'défi', impact: 'impact', environnement: 'impact',
    qr: 'qr', historique: 'historique', transaction: 'historique',
  };
  for (const [kw, topic] of Object.entries(keywords)) {
    if (lower.includes(kw)) {
      const match = KB.find(e => e.patterns.some(p => p.test(topic)));
      if (match) return { reply: match.reply(ctx), suggestions: match.suggestions ?? [] };
    }
  }
  return null;
}

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_KEY ?? '';

async function askGemini(question: string, ctx: BotCtx): Promise<string> {
  if (!GEMINI_KEY) throw new Error('no key');
  const systemPrompt = `Tu es PoubBot, l'assistant de l'app PoubCoin (signalement de déchets en Tunisie). L'utilisateur s'appelle ${ctx.name}, a ${ctx.balance} PoubCoins, ${ctx.totalReports} signalements dont ${ctx.validated} validés. Réponds en français, de façon courte et utile. Si la question ne concerne pas PoubCoin ou l'environnement, redirige poliment.`;
  const body = {
    contents: [{ parts: [{ text: `${systemPrompt}\n\nQuestion: ${question}` }] }],
  };
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  const json = await res.json();
  return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function getBotResponse(text: string, ctx: BotCtx): Promise<{ reply: string; suggestions: string[] }> {
  const local = getLocalResponse(text, ctx);
  if (local) return local;

  try {
    const aiReply = await askGemini(text, ctx);
    if (aiReply) return { reply: aiReply, suggestions: ['Mon solde 🪙', 'Comment signaler ?', 'Mon impact 🌍'] };
  } catch {}

  return {
    reply: `Je n'ai pas bien compris votre question 🤔\n\nVoici ce que je peux vous expliquer :`,
    suggestions: ['Mon solde 🪙', 'Comment signaler ?', 'Mes récompenses', 'Contacter le support'],
  };
}

const INITIAL_SUGGESTIONS = ['Mon solde 🪙', 'Comment signaler ?', 'Mes défis 🏆', 'Mon impact 🌍'];

export default function ChatbotScreen({ navigation }: any) {
  const { colors } = useTheme();
  const t = useT();
  const styles = getStyles(colors);
  const { balance, reports } = useWallet();
  const { user } = useAuth();

  const validated = reports.filter(r => r.status === 'validated').length;
  const pending   = reports.filter(r => r.status === 'pending').length;
  const rejected  = reports.filter(r => r.status === 'rejected').length;

  const ctx: BotCtx = {
    name: user?.name?.split(' ')[0] ?? 'Citoyen',
    balance,
    totalReports: reports.length,
    validated,
    pending,
    rejected,
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      text: `Salam **${ctx.name}** ! 👋\n\nJe suis **PoubBot**, votre assistant PoubCoin.\n\nComment puis-je vous aider aujourd'hui ?`,
      from: 'bot',
      time: now(),
      suggestions: INITIAL_SUGGESTIONS,
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const listRef = useRef<FlatList>(null);

  const scrollToBottom = () =>
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

  useEffect(() => { scrollToBottom(); }, [messages, typing]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || typing) return;

    const userMsg: Message = { id: Date.now().toString(), text: trimmed, from: 'user', time: now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    const delay = 600 + Math.random() * 400;
    setTimeout(async () => {
      const { reply, suggestions } = await getBotResponse(trimmed, ctx);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: reply,
        from: 'bot',
        time: now(),
        suggestions,
      };
      setMessages(prev => [...prev, botMsg]);
      setTyping(false);
    }, delay);
  };

  const renderText = (text: string, isUser: boolean) => {
    const lines = text.split('\n');
    return (
      <Text style={[styles.msgText, isUser ? styles.userText : styles.botText]}>
        {lines.map((line, li) => {
          const parts = line.split(/(\*\*[^*]+\*\*)/g);
          return (
            <React.Fragment key={li}>
              {parts.map((part, pi) =>
                part.startsWith('**') && part.endsWith('**')
                  ? <Text key={pi} style={{ fontWeight: '800' }}>{part.slice(2, -2)}</Text>
                  : part
              )}
              {li < lines.length - 1 ? '\n' : null}
            </React.Fragment>
          );
        })}
      </Text>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerCircle} />
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.botAvatar}>
            <Text style={{ fontSize: 22 }}>🤖</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>PoubBot</Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineTxt}>{t('chatbot_online')}</Text>
            </View>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerStats}>{ctx.validated} validés · {ctx.balance}🪙</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={typing ? (
            <View style={styles.typingRow}>
              <View style={styles.botAvatarSm}><Text style={{ fontSize: 14 }}>🤖</Text></View>
              <View style={styles.typingBubble}>
                <View style={styles.dot} />
                <View style={[styles.dot, { opacity: 0.6 }]} />
                <View style={[styles.dot, { opacity: 0.3 }]} />
              </View>
            </View>
          ) : null}
          renderItem={({ item, index }) => {
            const isUser = item.from === 'user';
            const isLast = index === messages.length - 1;
            return (
              <View style={{ marginBottom: 4 }}>
                <View style={[styles.msgRow, isUser ? styles.userRow : styles.botRow]}>
                  {!isUser && (
                    <View style={styles.botAvatarSm}><Text style={{ fontSize: 14 }}>🤖</Text></View>
                  )}
                  <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
                    {renderText(item.text, isUser)}
                    <Text style={[styles.time, isUser ? styles.timeUser : styles.timeBot]}>
                      {item.time}
                    </Text>
                  </View>
                </View>

                {/* Suggestions after last bot message */}
                {!isUser && isLast && item.suggestions && item.suggestions.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.suggestionsRow}
                    style={{ marginLeft: 46, marginTop: 8 }}
                  >
                    {item.suggestions.map((s: string) => (
                      <TouchableOpacity key={s} style={styles.chip} onPress={() => send(s)}>
                        <Text style={styles.chipText}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            );
          }}
        />

        {/* Input */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder={t('chatbot_placeholder')}
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={300}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || typing) && { opacity: 0.35 }]}
            onPress={() => send(input)}
            disabled={!input.trim() || typing}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const DOT_SIZE = 8;

const getStyles = (colors: any): any => ({
  container: { flex: 1, backgroundColor: '#EEF2EE' },

  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18, paddingTop: 20, paddingBottom: 16,
    flexDirection: 'row', alignItems: 'center', gap: 13,
    overflow: 'hidden',
  },
  headerCircle: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -50, right: -30,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },
  botAvatar: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)',
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: -0.2 },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#69F0AE' },
  onlineTxt: { color: 'rgba(255,255,255,0.82)', fontSize: 11 },
  headerRight: {},
  headerStats: { color: 'rgba(255,255,255,0.88)', fontSize: 12, fontWeight: '700' },

  list: { padding: 16, paddingBottom: 12 },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 2 },
  userRow: { justifyContent: 'flex-end' },
  botRow:  { justifyContent: 'flex-start' },

  botAvatarSm: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },

  bubble: { maxWidth: '80%', borderRadius: 22, padding: 14, ...shadow.sm },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 5,
  },
  botBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 5,
    borderWidth: 1, borderColor: colors.border,
  },

  msgText: { fontSize: 15, lineHeight: 23 },
  userText: { color: '#fff' },
  botText:  { color: colors.text },

  time: { fontSize: 10, marginTop: 6 },
  timeUser: { color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
  timeBot:  { color: colors.textMuted },

  typingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4,
  },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.surface, borderRadius: 22, padding: 14,
    borderWidth: 1, borderColor: colors.border, ...shadow.sm,
  },
  dot: {
    width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2,
    backgroundColor: colors.primary,
  },

  suggestionsRow: { gap: 8, paddingRight: 16, paddingBottom: 4 },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: 24, paddingHorizontal: 16, paddingVertical: 9,
    borderWidth: 1.5, borderColor: colors.primary, ...shadow.sm,
  },
  chipText: { color: colors.primary, fontWeight: '800', fontSize: 13 },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12, paddingBottom: Platform.OS === 'ios' ? 10 : 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
    ...shadow.sm,
  },
  input: {
    flex: 1, backgroundColor: colors.background,
    borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 11,
    fontSize: 15, color: colors.text, maxHeight: 100,
    borderWidth: 1, borderColor: colors.border,
  },
  sendBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    ...shadow.md,
  },
});
