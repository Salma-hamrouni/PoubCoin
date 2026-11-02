import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, SafeAreaView, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { shadow, radius } from '../theme';

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_KEY ?? '';

const WASTE_TYPES = [
  { emoji: '🗑️', label: 'Déchets ménagers' },
  { emoji: '♻️', label: 'Recyclables' },
  { emoji: '🏗️', label: 'Gravats / chantier' },
  { emoji: '🛢️', label: 'Déchets dangereux' },
  { emoji: '🌿', label: 'Déchets verts' },
  { emoji: '📱', label: 'Déchets électroniques' },
];

interface ParsedReport {
  wasteType: string;
  description: string;
  address: string;
  urgency: 'low' | 'medium' | 'high';
}

async function parseWithGemini(transcript: string): Promise<ParsedReport> {
  const prompt = `Tu es un assistant de signalement de déchets. Analyse ce message vocal et extrais les informations suivantes en JSON.

Message: "${transcript}"

Réponds UNIQUEMENT avec un JSON valide (pas de markdown, pas de backticks) avec ces champs:
{
  "wasteType": "type de déchet parmi: Déchets ménagers, Recyclables, Gravats / chantier, Déchets dangereux, Déchets verts, Déchets électroniques",
  "description": "description courte du problème",
  "address": "adresse ou lieu mentionné, ou chaîne vide si non mentionné",
  "urgency": "low, medium ou high selon la gravité"
}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 256 },
      }),
    }
  );
  const json = await res.json();
  const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  const parsed = JSON.parse(clean);
  const validUrgencies = ['low', 'medium', 'high'];
  if (!validUrgencies.includes(parsed.urgency)) parsed.urgency = 'medium';
  return parsed as ParsedReport;
}

export default function VoiceReportScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [parsed, setParsed] = useState<ParsedReport | null>(null);
  const [error, setError] = useState('');
  const recognitionRef = useRef<any>(null);

  const supportsVoice = Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    return () => { recognitionRef.current?.stop(); };
  }, []);

  const startListening = () => {
    if (!supportsVoice) return;
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'fr-FR';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      const text = Array.from(e.results).map((r: any) => r[0].transcript).join(' ');
      setTranscript(text);
    };
    rec.onerror = () => { setListening(false); };
    rec.onend = () => { setListening(false); };
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
    setParsed(null);
    setError('');
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const analyze = async () => {
    if (!transcript.trim()) return;
    setAnalyzing(true);
    setError('');
    try {
      const result = await parseWithGemini(transcript);
      setParsed(result);
    } catch {
      setError("Impossible d'analyser le message. Réessayez.");
    } finally {
      setAnalyzing(false);
    }
  };

  const urgencyLabel:  Record<string, string> = { low: '🟡 Faible', medium: '🟠 Moyen', high: '🔴 Urgent' };
  const urgencyColors: Record<string, string> = { low: '#CA8A04', medium: '#EA580C', high: '#DC2626' };
  const urgencyBg:     Record<string, string> = { low: '#FEF9C3', medium: '#FFF7ED', high: '#FEE2E2' };
  const safeUrgency = (parsed?.urgency && urgencyColors[parsed.urgency]) ? parsed.urgency : 'medium';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <LinearGradient colors={['#0D1F14', '#1B4332']} style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 20 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.7)" />
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Retour</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: 2 }}>NOUVEAU SIGNALEMENT</Text>
        <Text style={{ fontSize: 24, fontWeight: '900', color: '#fff', marginTop: 4 }}>Signalement vocal 🎙️</Text>
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
          Décrivez le problème à voix haute — l'IA remplit le formulaire automatiquement
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} showsVerticalScrollIndicator={false}>

        {/* Voice button */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 24, padding: 28, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 18, ...shadow.md }}>
          {supportsVoice ? (
            <>
              <TouchableOpacity
                onPress={listening ? stopListening : startListening}
                style={{
                  width: 116, height: 116, borderRadius: 58,
                  backgroundColor: listening ? '#FEE2E2' : colors.primaryGhost,
                  borderWidth: 4, borderColor: listening ? '#DC2626' : colors.primary,
                  justifyContent: 'center', alignItems: 'center',
                  ...shadow.lg,
                }}
                activeOpacity={0.8}
              >
                {listening ? (
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <Ionicons name="stop" size={32} color="#DC2626" />
                    <View style={{ flexDirection: 'row', gap: 3 }}>
                      {[0, 1, 2].map(i => (
                        <View key={i} style={{ width: 4, height: 4 + i * 4, backgroundColor: '#DC2626', borderRadius: 2 }} />
                      ))}
                    </View>
                  </View>
                ) : (
                  <Ionicons name="mic" size={40} color={colors.primary} />
                )}
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: -0.2 }}>
                {listening ? 'Parlez maintenant...' : 'Appuyez pour parler'}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center' }}>
                {listening ? 'Décrivez le type de déchet et l\'endroit' : 'Ex : "Il y a des déchets ménagers rue de la Liberté à Tunis"'}
              </Text>
            </>
          ) : (
            <View style={{ alignItems: 'center', gap: 12 }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="mic-off-outline" size={34} color={colors.textMuted} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Micro non disponible</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 }}>
                La reconnaissance vocale n'est disponible que sur navigateur web.{'\n'}Décrivez le problème directement en texte ci-dessous.
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primaryGhost, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}>
                <Ionicons name="arrow-down-outline" size={14} color={colors.primary} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>Utilisez la zone de texte ci-dessous</Text>
              </View>
            </View>
          )}
        </View>

        {/* Transcript */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, ...shadow.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 1 }}>TRANSCRIPTION</Text>
            {transcript.length > 0 && (
              <TouchableOpacity onPress={() => { setTranscript(''); setParsed(null); }}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <TextInput
            style={{ paddingHorizontal: 14, paddingBottom: 14, fontSize: 15, color: colors.text, minHeight: 80, textAlignVertical: 'top', lineHeight: 22 }}
            value={transcript}
            onChangeText={t => { setTranscript(t); setParsed(null); }}
            placeholder="Le texte reconnu apparaît ici. Vous pouvez aussi taper directement..."
            placeholderTextColor={colors.textMuted}
            multiline
          />
        </View>

        {/* Error */}
        {error ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FCA5A5' }}>
            <Ionicons name="alert-circle" size={16} color="#DC2626" />
            <Text style={{ color: '#DC2626', fontSize: 13, flex: 1 }}>{error}</Text>
          </View>
        ) : null}

        {/* Analyze button */}
        {transcript.trim().length > 5 && !parsed && (
          <TouchableOpacity
            onPress={analyze}
            disabled={analyzing}
            style={{ borderRadius: 14, overflow: 'hidden', opacity: analyzing ? 0.7 : 1 }}
          >
            <LinearGradient colors={[colors.primary, colors.primaryDark ?? '#134E2A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 }}>
              {analyzing
                ? <ActivityIndicator color="#fff" size="small" />
                : <Ionicons name="sparkles" size={20} color="#fff" />}
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
                {analyzing ? 'Analyse en cours...' : 'Analyser avec l\'IA'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Parsed result */}
        {parsed && (
          <View style={{ backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow.md }}>
            <View style={{ backgroundColor: colors.primaryGhost, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary }}>Signalement détecté</Text>
            </View>

            <View style={{ padding: 16, gap: 12 }}>
              {/* Waste type */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryGhost, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 18 }}>
                    {WASTE_TYPES.find(w => w.label === parsed.wasteType)?.emoji ?? '🗑️'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '700', letterSpacing: 0.8 }}>TYPE DE DÉCHET</Text>
                  <TextInput
                    style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 2 }}
                    value={parsed.wasteType}
                    onChangeText={v => setParsed(p => p ? { ...p, wasteType: v } : null)}
                  />
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: colors.border }} />

              {/* Description */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="document-text-outline" size={18} color="#0369A1" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '700', letterSpacing: 0.8 }}>DESCRIPTION</Text>
                  <TextInput
                    style={{ fontSize: 14, color: colors.text, marginTop: 2, lineHeight: 20 }}
                    value={parsed.description}
                    onChangeText={v => setParsed(p => p ? { ...p, description: v } : null)}
                    multiline
                  />
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: colors.border }} />

              {/* Address */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="location-outline" size={18} color="#B45309" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '700', letterSpacing: 0.8 }}>ADRESSE</Text>
                  <TextInput
                    style={{ fontSize: 14, color: colors.text, marginTop: 2 }}
                    value={parsed.address}
                    onChangeText={v => setParsed(p => p ? { ...p, address: v } : null)}
                    placeholder="Adresse non détectée — à renseigner"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: colors.border }} />

              {/* Urgency */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: urgencyBg[safeUrgency], justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="warning-outline" size={18} color={urgencyColors[safeUrgency]} />
                </View>
                <View>
                  <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '700', letterSpacing: 0.8 }}>URGENCE</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: urgencyColors[safeUrgency], marginTop: 2 }}>
                    {urgencyLabel[safeUrgency]}
                  </Text>
                </View>
              </View>
            </View>

            {/* CTA */}
            <TouchableOpacity
              onPress={() => navigation.navigate('Camera', { prefilled: parsed })}
              style={{ margin: 16, marginTop: 4, borderRadius: 14, overflow: 'hidden' }}
            >
              <LinearGradient colors={[colors.primary, colors.primaryDark ?? '#134E2A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 }}>
                <Ionicons name="camera" size={20} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Prendre une photo & confirmer</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick type selector */}
        {!parsed && (
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, marginBottom: 12 }}>OU CHOISIR LE TYPE DIRECTEMENT</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {WASTE_TYPES.map(w => (
                <TouchableOpacity
                  key={w.label}
                  onPress={() => {
                    setParsed({ wasteType: w.label, description: '', address: user?.city ?? '', urgency: 'medium' });
                    setTranscript(w.label);
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.border }}
                >
                  <Text style={{ fontSize: 16 }}>{w.emoji}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>{w.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
