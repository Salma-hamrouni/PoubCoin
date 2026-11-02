import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  Image, Platform, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { radius, shadow } from '../../theme';

type Step = 1 | 2 | 3;

interface DetectionResult {
  critical: number;
  deposits: number;
  lat: string;
  lng: string;
}

const MOCK_RESULTS: DetectionResult = {
  critical: 3,
  deposits: 5,
  lat: '36.8065°N',
  lng: '10.1815°E',
};

const DETECTION_MARKERS = [
  { top: '20%', left: '15%', color: '#DC2626' },
  { top: '45%', left: '60%', color: '#DC2626' },
  { top: '70%', left: '30%', color: '#DC2626' },
  { top: '30%', left: '75%', color: '#EA580C' },
  { top: '60%', left: '50%', color: '#EA580C' },
  { top: '15%', left: '45%', color: '#EA580C' },
  { top: '80%', left: '70%', color: '#CA8A04' },
  { top: '50%', left: '20%', color: '#CA8A04' },
];

export default function AdminDroneScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<DetectionResult | null>(null);
  const [droneMsg, setDroneMsg] = useState<string | null>(null);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const rotateRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    return () => {
      rotateRef.current?.stop();
    };
  }, []);

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setDroneMsg('Accès à la galerie nécessaire.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setCurrentStep(2);
      setResults(null);
    }
  };

  const pickFromCamera = async () => {
    if (Platform.OS === 'web') {
      setDroneMsg("Fonctionnalité disponible sur l'application mobile.");
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setDroneMsg('Accès à la caméra nécessaire.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setCurrentStep(2);
      setResults(null);
    }
  };

  const runAnalysis = () => {
    setAnalyzing(true);
    progressAnim.setValue(0);
    rotateAnim.setValue(0);

    rotateRef.current = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    rotateRef.current.start();

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 3000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start(() => {
      rotateRef.current?.stop();
      setAnalyzing(false);
      setResults(MOCK_RESULTS);
      setCurrentStep(3);
    });
  };

  const generateReport = () => {
    const date = new Date().toISOString().split('T')[0];
    setDroneMsg(`Rapport généré : drone_scan_${date}.pdf`);
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const StepIndicator = ({ num, label, active }: { num: string; label: string; active: boolean }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: active ? '#2563EB' : colors.border,
        justifyContent: 'center', alignItems: 'center',
      }}>
        <Text style={{ fontSize: 14, color: active ? '#fff' : colors.textMuted }}>{num}</Text>
      </View>
      <Text style={{ fontSize: 13, fontWeight: active ? '700' : '500', color: active ? colors.text : colors.textMuted }}>
        {label}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {droneMsg && (
        <View style={{ backgroundColor: '#1E3A5F', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ color: '#fff', fontSize: 14, flex: 1, marginRight: 8 }}>{droneMsg}</Text>
          <TouchableOpacity onPress={() => setDroneMsg(null)}>
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
      {/* Header */}
      <LinearGradient
        colors={['#1a1a2e', '#16213e']}
        style={{ paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        <TouchableOpacity
          style={{
            width: 36, height: 36, borderRadius: radius.xs,
            backgroundColor: 'rgba(255,255,255,0.1)',
            justifyContent: 'center', alignItems: 'center',
          }}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 22 }}>🚁</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 1 }}>MODULE</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>Module Drone</Text>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Détection IA</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Step indicators */}
        <View style={{
          backgroundColor: colors.surface, borderRadius: radius.md, padding: 14,
          marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between',
          borderWidth: 1, borderColor: colors.border, ...shadow.xs,
        }}>
          <StepIndicator num="①" label="Importer" active={currentStep >= 1} />
          <View style={{ width: 1, backgroundColor: colors.border }} />
          <StepIndicator num="②" label="Analyser" active={currentStep >= 2} />
          <View style={{ width: 1, backgroundColor: colors.border }} />
          <StepIndicator num="③" label="Résultats" active={currentStep >= 3} />
        </View>

        {/* Step 1: Import */}
        <View style={{
          backgroundColor: colors.surface, borderRadius: radius.md, padding: 16,
          marginBottom: 14, borderWidth: 1, borderColor: colors.border, ...shadow.sm,
        }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
            Étape ① — Importer une image
          </Text>

          {/* Drop zone */}
          <View style={{
            height: 200, borderRadius: radius.md, borderWidth: 2, borderStyle: 'dashed',
            borderColor: imageUri ? '#2563EB' : colors.border,
            backgroundColor: imageUri ? 'transparent' : colors.surfaceAlt,
            justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
            marginBottom: 12,
          }}>
            {imageUri ? (
              <>
                <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%', borderRadius: radius.md - 2 }} resizeMode="cover" />
                {results && (
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                    {DETECTION_MARKERS.map((marker, i) => (
                      <View key={i} style={{
                        position: 'absolute',
                        top: marker.top as any,
                        left: marker.left as any,
                        width: 14, height: 14,
                        borderRadius: 7,
                        backgroundColor: marker.color,
                        borderWidth: 2, borderColor: '#fff',
                        ...shadow.md,
                      }} />
                    ))}
                  </View>
                )}
              </>
            ) : (
              <View style={{ alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 40 }}>🛸</Text>
                <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: '500' }}>Glissez une image drone ici</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>ou utilisez les boutons ci-dessous</Text>
              </View>
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={{
                flex: 1, backgroundColor: colors.adminLight, borderRadius: radius.sm,
                paddingVertical: 11, alignItems: 'center', flexDirection: 'row',
                justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#2563EB40',
              }}
              onPress={pickFromGallery}
            >
              <Text style={{ fontSize: 14 }}>📁</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#2563EB' }}>Depuis la galerie</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1, backgroundColor: '#F0F4FF', borderRadius: radius.sm,
                paddingVertical: 11, alignItems: 'center', flexDirection: 'row',
                justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#2563EB40',
              }}
              onPress={pickFromCamera}
            >
              <Text style={{ fontSize: 14 }}>📷</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#2563EB' }}>Depuis la caméra</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Step 2: Analyse */}
        {currentStep >= 2 && (
          <View style={{
            backgroundColor: colors.surface, borderRadius: radius.md, padding: 16,
            marginBottom: 14, borderWidth: 1, borderColor: colors.border, ...shadow.sm,
          }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
              Étape ② — Analyse IA
            </Text>

            {analyzing ? (
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Animated.View style={{ transform: [{ rotate: spin }] }}>
                    <Text style={{ fontSize: 24 }}>🔍</Text>
                  </Animated.View>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '600' }}>
                    Analyse en cours...
                  </Text>
                </View>
                <View style={{ height: 8, backgroundColor: colors.border, borderRadius: radius.pill, overflow: 'hidden' }}>
                  <Animated.View style={{
                    height: '100%',
                    width: progressWidth,
                    backgroundColor: '#2563EB',
                    borderRadius: radius.pill,
                  }} />
                </View>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>Détection des zones et dépôts sauvages...</Text>
              </View>
            ) : results ? (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                backgroundColor: '#EEF7F1', borderRadius: radius.sm, padding: 10,
              }}>
                <Text style={{ fontSize: 18 }}>✅</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1B6B3A' }}>Analyse terminée avec succès</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={{
                  backgroundColor: '#2563EB', borderRadius: radius.sm,
                  paddingVertical: 13, alignItems: 'center', flexDirection: 'row',
                  justifyContent: 'center', gap: 8, ...shadow.sm,
                }}
                onPress={runAnalysis}
              >
                <Ionicons name="scan" size={18} color="#fff" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Analyser</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Step 3: Results */}
        {currentStep >= 3 && results && (
          <View style={{
            backgroundColor: colors.surface, borderRadius: radius.md, padding: 16,
            marginBottom: 14, borderWidth: 1, borderColor: colors.border, ...shadow.sm,
          }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
              Étape ③ — Résultats
            </Text>

            <View style={{ gap: 10 }}>
              {/* Critical zones */}
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                backgroundColor: '#FEF2F2', borderRadius: radius.sm, padding: 12,
                borderWidth: 1, borderColor: '#DC262640',
              }}>
                <Text style={{ fontSize: 22 }}>🔴</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#DC2626' }}>
                    {results.critical} zones critiques détectées
                  </Text>
                  <Text style={{ fontSize: 11, color: '#DC2626', opacity: 0.7 }}>Nécessite une intervention immédiate</Text>
                </View>
              </View>

              {/* Wild deposits */}
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                backgroundColor: '#FFF7ED', borderRadius: radius.sm, padding: 12,
                borderWidth: 1, borderColor: '#EA580C40',
              }}>
                <Text style={{ fontSize: 22 }}>🟠</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#EA580C' }}>
                    {results.deposits} dépôts sauvages identifiés
                  </Text>
                  <Text style={{ fontSize: 11, color: '#EA580C', opacity: 0.7 }}>Collecte planifiable sous 48h</Text>
                </View>
              </View>

              {/* Coordinates */}
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                backgroundColor: colors.adminLight, borderRadius: radius.sm, padding: 12,
                borderWidth: 1, borderColor: '#2563EB40',
              }}>
                <Text style={{ fontSize: 22 }}>📍</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#2563EB' }}>
                    Coordonnées estimées
                  </Text>
                  <Text style={{ fontSize: 12, color: '#2563EB', opacity: 0.8 }}>
                    {results.lat}, {results.lng}
                  </Text>
                </View>
              </View>
            </View>

            {/* Generate report button */}
            <TouchableOpacity
              style={{
                marginTop: 14, backgroundColor: '#1a1a2e', borderRadius: radius.sm,
                paddingVertical: 13, alignItems: 'center', flexDirection: 'row',
                justifyContent: 'center', gap: 8, ...shadow.md,
              }}
              onPress={generateReport}
            >
              <Text style={{ fontSize: 16 }}>📋</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Générer un rapport</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
