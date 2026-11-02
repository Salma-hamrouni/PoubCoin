import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  SafeAreaView, ScrollView, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useT } from '../i18n/useT';
import { radius, shadow } from '../theme';
import { detectWaste, WasteResult } from '../utils/wasteDetection';

type Stage = 'landing' | 'loading' | 'result';

export default function WasteAIScreen({ navigation }: any) {
  const { colors } = useTheme();
  const t = useT();
  const styles = getStyles(colors);

  const [stage, setStage] = useState<Stage>('landing');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<WasteResult | null>(null);

  const analyse = async (uri: string) => {
    setImageUri(uri);
    setStage('loading');
    const pick = await detectWaste(uri);
    setResult(pick);
    setStage('result');
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') return;
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!res.canceled && res.assets[0]) analyse(res.assets[0].uri);
  };

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') return;
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!res.canceled && res.assets[0]) analyse(res.assets[0].uri);
  };

  const reset = () => {
    setStage('landing');
    setImageUri(null);
    setResult(null);
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('ai_title')}</Text>
          <Text style={styles.headerSub}>{t('ai_subtitle')}</Text>
        </View>
        <Text style={{ fontSize: 28 }}>🤖</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* LANDING */}
        {stage === 'landing' && (
          <View style={styles.landingCenter}>
            <View style={styles.cameraIconWrap}>
              <Text style={{ fontSize: 72 }}>📷</Text>
            </View>
            <Text style={styles.landingTitle}>{t('ai_landing_title')}</Text>
            <Text style={styles.landingSub}>{t('ai_landing_sub')}</Text>
            <TouchableOpacity style={[styles.bigBtn, { backgroundColor: colors.primary }]} onPress={pickFromCamera}>
              <Text style={styles.bigBtnText}>{t('ai_btn_camera')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.bigBtn, { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border }]} onPress={pickFromGallery}>
              <Text style={[styles.bigBtnText, { color: colors.text }]}>{t('ai_btn_gallery')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* LOADING */}
        {stage === 'loading' && (
          <View style={styles.loadingCenter}>
            {imageUri && (
              <Image source={{ uri: imageUri }} style={styles.previewImg} resizeMode="cover" />
            )}
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
            <Text style={styles.loadingText}>{t('ai_loading')}</Text>
            <Text style={styles.loadingSub}>{t('ai_loading_sub')}</Text>
          </View>
        )}

        {/* RESULT */}
        {stage === 'result' && result && (
          <View style={styles.resultWrap}>
            {imageUri && (
              <Image source={{ uri: imageUri }} style={styles.resultImg} resizeMode="cover" />
            )}

            {/* Result card */}
            <View style={styles.resultCard}>
              {/* Colored header */}
              <View style={[styles.resultHeader, { backgroundColor: result.color }]}>
                <Text style={{ fontSize: 48 }}>{result.icon}</Text>
                <View style={{ marginLeft: 16 }}>
                  <Text style={styles.resultType}>{result.type}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Text style={styles.resultSubhead}>{t('ai_identified')}</Text>
                    <View style={{ backgroundColor: result.fromAI ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>
                        {result.fromAI ? '✨ IA' : '🎲 Estimation'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.resultBody}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>🗑️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>{t('ai_bin_label')}</Text>
                    <Text style={styles.infoValue}>{result.bin}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>🌍</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>{t('ai_impact_label')}</Text>
                    <Text style={styles.infoValue}>{result.impact}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>💡</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>{t('ai_tip_label')}</Text>
                    <Text style={styles.infoValue}>{result.tip}</Text>
                  </View>
                </View>

                {/* Quantité estimée */}
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>⚖️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>{t('ai_qty_label')}</Text>
                    <Text style={styles.infoValue}>{result.kg}</Text>
                  </View>
                </View>

                {/* Urgence */}
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>🚨</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>{t('ai_urgency_label')}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <View style={[styles.urgencyBadge, {
                        backgroundColor: result.urgency === 'Critique' ? '#FEE2E2' : result.urgency === 'Élevée' ? '#FEF3C7' : result.urgency === 'Modérée' ? '#DBEAFE' : '#DCFCE7',
                      }]}>
                        <Text style={[styles.urgencyText, {
                          color: result.urgency === 'Critique' ? '#DC2626' : result.urgency === 'Élevée' ? '#B45309' : result.urgency === 'Modérée' ? '#1D4ED8' : '#15803D',
                        }]}>{result.urgency}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Temps de dégradation + CO₂ */}
                <View style={styles.divider} />
                <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>⏳ {t('ai_degradation_label')}</Text>
                    <Text style={[styles.infoValue, { fontSize: 13 }]}>{result.degradation}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>🌿 {t('ai_co2_label')}</Text>
                    <Text style={[styles.infoValue, { fontSize: 13 }]}>{result.co2}</Text>
                  </View>
                </View>

                {/* Coins badge */}
                <View style={[styles.coinsBadge, { backgroundColor: result.color + '18', borderColor: result.color + '40' }]}>
                  <Text style={[styles.coinsBadgeText, { color: result.color }]}>
                    +{result.coins} 🪙 Bonus identification
                  </Text>
                </View>
              </View>
            </View>

            {/* Action buttons */}
            <TouchableOpacity style={[styles.bigBtn, { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border }]} onPress={reset}>
              <Text style={[styles.bigBtnText, { color: colors.text }]}>{t('ai_btn_retry')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.bigBtn, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('Camera')}>
              <Text style={styles.bigBtnText}>{t('ai_btn_report')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any): any => ({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 40 },

  header: {
    backgroundColor: colors.primary, paddingHorizontal: 20,
    paddingTop: 20, paddingBottom: 20,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    overflow: 'hidden',
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  headerSub:   { color: 'rgba(255,255,255,0.72)', fontSize: 12, marginTop: 2 },

  // Landing
  landingCenter: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 48, gap: 18 },
  cameraIconWrap: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: colors.primaryGhost,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2, borderColor: colors.primary + '30',
    ...shadow.lg,
  },
  landingTitle: { fontSize: 24, fontWeight: '900', color: colors.text, textAlign: 'center', letterSpacing: -0.3 },
  landingSub:   { fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 24 },
  bigBtn: {
    width: '100%', borderRadius: radius.lg,
    paddingVertical: 17, alignItems: 'center',
    ...shadow.sm,
  },
  bigBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  // Loading
  loadingCenter: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 24 },
  previewImg: { width: '100%', height: 240, borderRadius: radius.lg },
  loadingText: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 20, letterSpacing: -0.2 },
  loadingSub:  { fontSize: 13, color: colors.textMuted, marginTop: 6 },

  // Result
  resultWrap: { paddingHorizontal: 16, paddingTop: 20, gap: 14 },
  resultImg: { width: '100%', height: 220, borderRadius: radius.lg, marginBottom: 4 },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl, overflow: 'hidden',
    ...shadow.md, borderWidth: 1, borderColor: colors.border,
  },
  resultHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: 22, paddingVertical: 26,
  },
  resultType:    { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.3 },
  resultSubhead: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 4, fontWeight: '600' },
  resultBody: { padding: 20, gap: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 9 },
  infoIcon: { fontSize: 21, marginTop: 1 },
  infoLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  infoValue: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 3, lineHeight: 20 },
  divider: { height: 1, backgroundColor: colors.borderLight },
  urgencyBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5 },
  urgencyText: { fontSize: 12, fontWeight: '800' },
  coinsBadge: {
    marginTop: 14, borderRadius: radius.pill,
    paddingVertical: 12, paddingHorizontal: 22,
    alignSelf: 'center', borderWidth: 1.5,
  },
  coinsBadgeText: { fontSize: 14, fontWeight: '900' },
});
