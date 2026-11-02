import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Modal, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const STORAGE_KEY = 'admin_onboarding_done';
const { width: SW } = Dimensions.get('window');

const STEPS = [
  {
    icon: 'bar-chart-outline' as const,
    color: '#1B6B3A',
    title: 'Tableau de bord',
    body: 'Suivez les KPIs en temps réel : signalements en attente, citoyens actifs, coins en circulation et performance SLA.',
  },
  {
    icon: 'document-text-outline' as const,
    color: '#2563EB',
    title: 'Gestion des signalements',
    body: 'Validez ou rejetez les signalements d\'un glissement. Filtrez par date, zone ou statut. Commentez vos décisions.',
  },
  {
    icon: 'people-outline' as const,
    color: '#7C3AED',
    title: 'Gestion des utilisateurs',
    body: 'Consultez les profils citoyens, bloquez les comptes abusifs et surveillez les soldes PoubCoin.',
  },
  {
    icon: 'qr-code-outline' as const,
    color: '#D97706',
    title: 'Terrain & QR codes',
    body: 'Sur le terrain, scannez le QR code d\'un citoyen pour valider un dépôt physique et créditer ses PoubCoins instantanément.',
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function AdminOnboardingModal({ visible, onClose }: Props) {
  const [step, setStep] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setStep(0);
      slideAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible]);

  function goTo(next: number) {
    const dir = next > step ? -1 : 1;
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: dir * 30, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0,        duration: 0,   useNativeDriver: true }),
    ]).start();
    setStep(next);
  }

  async function finish() {
    await AsyncStorage.setItem(STORAGE_KEY, '1');
    Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(onClose);
  }

  const cur = STEPS[step];

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[s.overlay, { opacity: fadeAnim }]}>
        <View style={s.card}>
          {/* Skip */}
          <TouchableOpacity style={s.skip} onPress={finish}>
            <Text style={s.skipText}>Passer</Text>
          </TouchableOpacity>

          {/* Icon */}
          <View style={[s.iconWrap, { backgroundColor: cur.color + '20', borderColor: cur.color + '40' }]}>
            <Ionicons name={cur.icon} size={36} color={cur.color} />
          </View>

          {/* Content */}
          <Animated.View style={{ transform: [{ translateX: slideAnim }], alignItems: 'center', gap: 10 }}>
            <Text style={s.title}>{cur.title}</Text>
            <Text style={s.body}>{cur.body}</Text>
          </Animated.View>

          {/* Dots */}
          <View style={s.dots}>
            {STEPS.map((_, i) => (
              <View key={i} style={[s.dot, i === step && s.dotActive]} />
            ))}
          </View>

          {/* Buttons */}
          <View style={s.actions}>
            {step > 0 && (
              <TouchableOpacity style={s.btnSecondary} onPress={() => goTo(step - 1)}>
                <Text style={s.btnSecondaryText}>Précédent</Text>
              </TouchableOpacity>
            )}
            {step < STEPS.length - 1 ? (
              <TouchableOpacity style={s.btnPrimary} onPress={() => goTo(step + 1)}>
                <Text style={s.btnPrimaryText}>Suivant</Text>
                <Ionicons name="arrow-forward" size={15} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[s.btnPrimary, { backgroundColor: '#1B6B3A' }]} onPress={finish}>
                <Text style={s.btnPrimaryText}>Commencer</Text>
                <Ionicons name="checkmark" size={15} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

export async function shouldShowOnboarding(): Promise<boolean> {
  const done = await AsyncStorage.getItem(STORAGE_KEY);
  return done !== '1';
}

const s = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card:        { width: '100%', maxWidth: 380, backgroundColor: '#fff', borderRadius: 24, padding: 28, alignItems: 'center', gap: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: .25, shadowRadius: 32, elevation: 20 },
  skip:        { alignSelf: 'flex-end', marginBottom: -8 },
  skipText:    { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  iconWrap:    { width: 80, height: 80, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title:       { fontSize: 20, fontWeight: '800', color: '#111827', textAlign: 'center' },
  body:        { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21, paddingHorizontal: 4 },
  dots:        { flexDirection: 'row', gap: 6 },
  dot:         { width: 7, height: 7, borderRadius: 4, backgroundColor: '#E5E7EB' },
  dotActive:   { backgroundColor: '#1B6B3A', width: 18 },
  actions:     { flexDirection: 'row', gap: 10, width: '100%', justifyContent: 'flex-end' },
  btnPrimary:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2563EB', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12, flex: 1, justifyContent: 'center' },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnSecondary:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  btnSecondaryText: { color: '#374151', fontWeight: '600', fontSize: 14 },
});
