import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot } from 'firebase/firestore';
import BackButton from '../components/BackButton';
import { db } from '../firebase';
import { useTheme } from '../context/ThemeContext';
import { useT } from '../i18n/useT';

type Step = { key: string; label: string; sub: string; icon: string; color: string };

const STATUS_TO_STEP: Record<string, number> = {
  pending:   1,
  reviewing: 2,
  validated: 3,
  rejected:  2,
  processed: 4,
};

export default function ReportStatusScreen({ route, navigation }: any) {
  const { reportId = '', reportAddress = 'Signalement' } = route.params ?? {};
  const { colors } = useTheme();
  const t = useT();
  const STEPS: Step[] = [
    { key: 'submitted', label: t('report_step_submitted_label'), sub: t('report_step_submitted_sub'), icon: '📤', color: '#3B82F6' },
    { key: 'reviewing', label: t('report_step_reviewing_label'), sub: t('report_step_reviewing_sub'), icon: '🔍', color: '#F59E0B' },
    { key: 'validated', label: t('report_step_validated_label'), sub: t('report_step_validated_sub'), icon: '✅', color: '#22C55E' },
    { key: 'processed', label: t('report_step_processed_label'), sub: t('report_step_processed_sub'), icon: '♻️', color: '#10B981' },
  ];
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reportId) { setLoading(false); return; }
    const unsub = onSnapshot(doc(db, 'reports', reportId), snap => {
      if (snap.exists()) setReport({ id: snap.id, ...snap.data() });
      setLoading(false);
    });
    return unsub;
  }, [reportId]);

  const status = report?.status ?? 'pending';
  const rejected = status === 'rejected';
  const currentStep = STATUS_TO_STEP[status] ?? 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <BackButton onPress={() => navigation.goBack()} variant="light" />
        <Text style={[styles.title, { color: colors.text }]}>{t('report_screen_title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {/* Address card */}
          <View style={[styles.addressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="location" size={18} color={colors.primary} />
            <Text style={{ flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' }} numberOfLines={2}>
              {report?.address ?? reportAddress}
            </Text>
            <Text style={[styles.dateText, { color: colors.textMuted }]}>{report?.date ?? '—'}</Text>
          </View>

          {/* Rejection banner */}
          {rejected && (
            <View style={[styles.rejectedBanner, { backgroundColor: '#FEF2F2', borderColor: '#EF4444' }]}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: '#991B1B' }}>{t('report_rejected_title')}</Text>
                <Text style={{ color: '#991B1B', fontSize: 12, marginTop: 2 }}>
                  {report?.rejectReason ?? t('report_no_reason')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('ReportAppeal', { reportId, reportAddress: report?.address })}
                style={[styles.appealBtn, { backgroundColor: '#EF4444' }]}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{t('report_contest')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Steps */}
          <Text style={[styles.sectionLabel, { color: colors.text }]}>{t('report_progress')}</Text>
          {STEPS.map((step, i) => {
            const done = currentStep > i + 1;
            const active = currentStep === i + 1 && !rejected;
            const blocked = rejected && i >= 1;
            return (
              <View key={step.key} style={styles.stepWrapper}>
                {i < STEPS.length - 1 && (
                  <View style={[styles.connector, { backgroundColor: done ? step.color : colors.border }]} />
                )}
                <View style={styles.stepRow}>
                  <View style={[
                    styles.stepCircle,
                    { backgroundColor: done || active ? step.color : colors.surface, borderColor: active ? step.color : done ? step.color : colors.border },
                  ]}>
                    {done
                      ? <Ionicons name="checkmark" size={16} color="#fff" />
                      : <Text style={{ fontSize: 14 }}>{step.icon}</Text>
                    }
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.stepLabel, { color: blocked ? colors.textMuted : colors.text, fontWeight: active ? '800' : '600' }]}>
                      {step.label}
                    </Text>
                    <Text style={[styles.stepSub, { color: colors.textMuted }]}>{step.sub}</Text>
                  </View>
                  {active && (
                    <View style={[styles.activeBadge, { backgroundColor: step.color + '20' }]}>
                      <Text style={{ color: step.color, fontSize: 11, fontWeight: '700' }}>{t('report_in_progress')}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          {/* Coins earned */}
          {status === 'validated' && report?.coins && (
            <View style={[styles.coinsCard, { backgroundColor: '#FEF9C3', borderColor: '#F59E0B' }]}>
              <Text style={{ fontSize: 28 }}>🪙</Text>
              <View>
                <Text style={{ fontWeight: '800', color: '#92400E', fontSize: 16 }}>+{report.coins} PoubCoins</Text>
                <Text style={{ color: '#92400E', fontSize: 12 }}>{t('report_coins_added')}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn:       { width: 40, height: 40, justifyContent: 'center' },
  title:         { fontSize: 18, fontWeight: '800' },
  addressCard:   { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  dateText:      { fontSize: 12 },
  rejectedBanner:{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  appealBtn:     { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  sectionLabel:  { fontSize: 15, fontWeight: '800', marginBottom: 16 },
  stepWrapper:   { paddingLeft: 20 },
  connector:     { position: 'absolute', left: 34, top: 44, width: 2, height: 36, zIndex: 0 },
  stepRow:       { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 28 },
  stepCircle:    { width: 40, height: 40, borderRadius: 20, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  stepLabel:     { fontSize: 15, marginBottom: 3 },
  stepSub:       { fontSize: 12, lineHeight: 18 },
  activeBadge:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  coinsCard:     { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14, borderWidth: 1, marginTop: 8 },
});
