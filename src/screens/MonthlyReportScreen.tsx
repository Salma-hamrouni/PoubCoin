import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, SafeAreaView,
  ScrollView, Dimensions, Animated, Easing, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useWallet } from '../context/WalletContext';
import { useTheme } from '../context/ThemeContext';
import { useT } from '../i18n/useT';

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const GOAL = 10;

const { width } = Dimensions.get('window');

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
    const listener = anim.addListener(({ value: v }) => setValue(Math.round(v * target)));
    return () => anim.removeListener(listener);
  }, [target]);
  return value;
}

export default function MonthlyReportScreen({ navigation }: any) {
  const { colors, language } = useTheme();
  const t = useT();
  const styles = getStyles(colors);
  const { reports } = useWallet();

  const MONTHS = language === 'ar' ? MONTHS_AR : language === 'en' ? MONTHS_EN : MONTHS_FR;

  // Month navigation state
  const now = new Date();
  const [offset, setOffset] = useState(0); // 0 = current month, -1 = previous, etc.
  const targetDate = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const month = targetDate.getMonth();
  const year = targetDate.getFullYear();
  const monthName = MONTHS[month];
  const canGoNext = offset < 0;

  const monthlyReports   = reports.filter(r => {
    const d = new Date(r.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const monthlyValidated = monthlyReports.filter(r => r.status === 'validated').length;
  const monthlyCoins     = monthlyValidated * 50;
  const wasteKg          = monthlyValidated * 2.5;
  const co2Kg            = monthlyValidated * 0.8;
  const treesEquiv       = (co2Kg / 22).toFixed(1);
  const goalProgress     = Math.min((monthlyValidated / GOAL) * 100, 100);

  // Previous month for comparison
  const prevDate      = new Date(year, month - 1, 1);
  const prevMonthReports = reports.filter(r => {
    const d = new Date(r.date);
    return d.getMonth() === prevDate.getMonth() && d.getFullYear() === prevDate.getFullYear();
  });
  const prevValidated = prevMonthReports.filter(r => r.status === 'validated').length;
  const evolution     = prevValidated > 0 ? Math.round(((monthlyValidated - prevValidated) / prevValidated) * 100) : null;

  // Weekly breakdown (4 weeks)
  const weekCounts = [0, 0, 0, 0];
  monthlyReports.forEach(r => {
    const day = new Date(r.date).getDate();
    const wi  = Math.min(Math.floor((day - 1) / 7), 3);
    weekCounts[wi]++;
  });
  const weekMax = Math.max(...weekCounts, 1);

  // Animated values
  const animValidated = useCountUp(monthlyValidated, 1000);
  const animCoins     = useCountUp(monthlyCoins, 1300);
  const animWaste     = useCountUp(wasteKg, 1100);
  const animCo2       = useCountUp(co2Kg * 10, 1200); // x10 for decimal

  // Stagger reveal anims
  const fadeAnims = useRef([0,1,2,3].map(() => new Animated.Value(0))).current;
  const slideAnims = useRef([0,1,2,3].map(() => new Animated.Value(24))).current;
  useEffect(() => {
    const animations = fadeAnims.map((fa, i) =>
      Animated.parallel([
        Animated.timing(fa, { toValue: 1, duration: 500, delay: i * 180, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(slideAnims[i], { toValue: 0, duration: 500, delay: i * 180, easing: Easing.out(Easing.back(1.5)), useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    Animated.stagger(80, animations).start();
  }, []);

  const [downloading, setDownloading] = useState(false);

  const buildHTML = () => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 32px; background: #fff; color: #1a1a1a; }
    .header { background: linear-gradient(135deg,#1B6B3A,#2E8B57); color:#fff; border-radius:16px; padding:32px; text-align:center; margin-bottom:24px; }
    .header h1 { margin:0 0 4px; font-size:28px; }
    .header p  { margin:0; opacity:.8; font-size:14px; }
    .hero { text-align:center; margin-bottom:24px; }
    .hero .num { font-size:80px; font-weight:900; color:#1B6B3A; line-height:1; }
    .hero .lbl { font-size:18px; color:#555; margin-top:4px; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:24px; }
    .cell { background:#F0FDF4; border:1px solid #BBF7D0; border-radius:12px; padding:20px; text-align:center; }
    .cell .icon { font-size:32px; margin-bottom:8px; }
    .cell .val  { font-size:22px; font-weight:800; color:#1B6B3A; }
    .cell .lab  { font-size:12px; color:#6B7280; margin-top:4px; }
    .section { border:1px solid #E5E7EB; border-radius:12px; padding:20px; margin-bottom:16px; }
    .section h3 { margin:0 0 12px; font-size:15px; color:#1B6B3A; }
    .bar-track { background:#E5E7EB; border-radius:8px; height:12px; overflow:hidden; margin:8px 0; }
    .bar-fill  { background:#1B6B3A; height:100%; border-radius:8px; width:${goalProgress}%; }
    .footer { text-align:center; color:#9CA3AF; font-size:11px; margin-top:32px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Rapport ${monthName} ${year}</h1>
    <p>Votre impact environnemental ce mois-ci</p>
  </div>
  <div class="hero">
    <div class="num">${monthlyValidated}</div>
    <div class="lbl">signalements validés sur ${monthlyReports.length} soumis</div>
  </div>
  <div class="grid">
    <div class="cell"><div class="icon">🗑️</div><div class="val">${wasteKg} kg</div><div class="lab">Déchets</div></div>
    <div class="cell"><div class="icon">🌿</div><div class="val">${co2Kg} kg</div><div class="lab">CO₂ évité</div></div>
    <div class="cell"><div class="icon">🪙</div><div class="val">${monthlyCoins}</div><div class="lab">PoubCoins gagnés</div></div>
    <div class="cell"><div class="icon">🌳</div><div class="val">${treesEquiv}</div><div class="lab">Arbres équivalent</div></div>
  </div>
  <div class="section">
    <h3>🎯 Objectif du mois — ${monthlyValidated} / ${GOAL} signalements</h3>
    <div class="bar-track"><div class="bar-fill"></div></div>
    <p style="margin:8px 0 0;font-size:13px;color:#374151">${monthlyValidated >= GOAL ? '🏆 Objectif atteint !' : `${GOAL - monthlyValidated} signalement(s) restant(s)`}</p>
  </div>
  <div class="section">
    <h3>🏅 Statut ce mois</h3>
    <p style="font-size:20px;font-weight:800;margin:0">${
      monthlyValidated >= 10 ? '⭐ Top citoyen' :
      monthlyValidated >= 5  ? '🌳 Éco-Actif'  :
      monthlyValidated >= 2  ? '🌿 Citoyen'    : '🌱 Débutant'
    }</p>
  </div>
  <div class="footer">Généré par PoubCoin · ${new Date().toLocaleDateString('fr-FR')}</div>
</body>
</html>`;

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const html = buildHTML();

      if (Platform.OS === 'web') {
        // On web: open a new tab with the HTML and trigger the browser's print-to-PDF dialog
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(html);
          win.document.close();
          win.focus();
          setTimeout(() => win.print(), 500);
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Enregistrer le rapport PDF' });
        } else {
          Alert.alert('PDF généré', `Fichier disponible à : ${uri}`);
        }
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le PDF.');
    }
    setDownloading(false);
  };

  const GRID = [
    { label: t('report_waste'), value: `${animWaste} kg`,        icon: '🗑️' },
    { label: t('report_co2'),   value: `${(animCo2/10).toFixed(1)} kg`, icon: '🌿' },
    { label: t('report_coins_label'), value: `${animCoins}`,     icon: '🪙' },
    { label: t('report_trees'), value: treesEquiv,               icon: '🌳' },
  ];

  return (
    <SafeAreaView style={styles.root}>
      <LinearGradient colors={[colors.primaryDark, colors.primary]} style={styles.gradientBg}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.headerSection}>
            <Text style={styles.headerEmoji}>📊</Text>
            {/* Month navigator */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 4 }}>
              <TouchableOpacity
                onPress={() => setOffset(o => o - 1)}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 18 }}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{monthName} {year}</Text>
              <TouchableOpacity
                onPress={() => canGoNext && setOffset(o => o + 1)}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: canGoNext ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)', justifyContent: 'center', alignItems: 'center' }}
              >
                <Text style={{ color: canGoNext ? '#fff' : 'rgba(255,255,255,0.3)', fontSize: 18 }}>›</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.headerSub}>{t('report_subtitle')}</Text>
            {evolution !== null && (
              <View style={{ marginTop: 8, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, backgroundColor: evolution >= 0 ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)' }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                  {evolution >= 0 ? `↑ +${evolution}%` : `↓ ${evolution}%`} vs {MONTHS[prevDate.getMonth()]}
                </Text>
              </View>
            )}
          </View>

          {/* Hero number */}
          <View style={styles.heroCard}>
            <Text style={styles.heroNum}>{animValidated}</Text>
            <Text style={styles.heroLabel}>{t('report_validated_label')}</Text>
            <Text style={styles.heroTotal}>{t('report_submitted')}: {monthlyReports.length}</Text>
          </View>

          {/* Impact grid */}
          <View style={styles.impactGrid}>
            {GRID.map((g, i) => (
              <Animated.View key={i} style={[styles.impactCell, { opacity: fadeAnims[i], transform: [{ translateY: slideAnims[i] }] }]}>
                <Text style={styles.impactIcon}>{g.icon}</Text>
                <Text style={styles.impactValue}>{g.value}</Text>
                <Text style={styles.impactLabel}>{g.label}</Text>
              </Animated.View>
            ))}
          </View>

          {/* Weekly breakdown */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📅 Par semaine</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 72, marginTop: 8 }}>
              {weekCounts.map((count, i) => {
                const barH = weekMax > 0 ? Math.max((count / weekMax) * 60, count > 0 ? 8 : 2) : 2;
                return (
                  <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700' }}>{count}</Text>
                    <View style={{ width: '100%', height: barH, borderRadius: 6, backgroundColor: count > 0 ? '#FFD740' : 'rgba(255,255,255,0.15)' }} />
                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>S{i + 1}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Monthly goal progress */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('report_goal')}</Text>
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>{monthlyValidated} / {GOAL} signalements</Text>
              <Text style={styles.progressPct}>{Math.round(goalProgress)}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${goalProgress}%` as any }]} />
            </View>
            {monthlyValidated >= GOAL
              ? <Text style={styles.goalAchieved}>{t('report_goal_achieved')}</Text>
              : <Text style={styles.goalRemain}>{GOAL - monthlyValidated} / {GOAL}</Text>}
          </View>

          {/* Rank */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('report_status_title')}</Text>
            <Text style={styles.rankText}>
              {monthlyValidated >= 10 ? t('report_rank_top') :
               monthlyValidated >= 5  ? t('report_rank_eco') :
               monthlyValidated >= 2  ? t('report_rank_citizen') : t('report_rank_beginner')}
            </Text>
          </View>

          {/* Download PDF button */}
          <TouchableOpacity style={[styles.shareBtn, downloading && { opacity: 0.6 }]} onPress={handleDownloadPDF} disabled={downloading}>
            <Ionicons name={downloading ? 'hourglass-outline' : 'download-outline'} size={20} color="#1B6B3A" />
            <Text style={styles.shareBtnText}>{downloading ? t('report_generating') : t('report_download_pdf')}</Text>
          </TouchableOpacity>

          {/* Close */}
          <TouchableOpacity style={styles.closeBtnBottom} onPress={() => navigation.goBack()}>
            <Text style={styles.closeBtnText}>{t('btn_close')}</Text>
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const getStyles = (colors: any): any => ({
  root: { flex: 1 },
  gradientBg: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },

  closeBtn: {
    alignSelf: 'flex-end',
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },

  headerSection: { alignItems: 'center', marginBottom: 20 },
  headerEmoji: { fontSize: 48, marginBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff', textAlign: 'center' },
  headerSub:   { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  heroCard: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 24, padding: 32, alignItems: 'center',
    marginBottom: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  heroNum:   { fontSize: 80, fontWeight: '900', color: '#fff', lineHeight: 88, letterSpacing: -2 },
  heroLabel: { fontSize: 17, fontWeight: '800', color: 'rgba(255,255,255,0.92)', marginTop: 6 },
  heroTotal: { fontSize: 12, color: 'rgba(255,255,255,0.62)', marginTop: 4 },

  impactGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    marginBottom: 18,
  },
  impactCell: {
    width: (width - 40 - 12) / 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20, padding: 22, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  impactIcon:  { fontSize: 34, marginBottom: 8 },
  impactValue: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  impactLabel: { fontSize: 11, color: 'rgba(255,255,255,0.72)', fontWeight: '700', marginTop: 3 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20, padding: 20, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#fff', marginBottom: 12 },

  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  progressPct:  { fontSize: 13, color: '#FFD740', fontWeight: '800' },
  progressTrack: {
    height: 8, backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4, overflow: 'hidden', marginBottom: 8,
  },
  progressFill: { height: '100%', backgroundColor: '#FFD740', borderRadius: 4 },
  goalAchieved: { fontSize: 13, color: '#FFD740', fontWeight: '700' },
  goalRemain:   { fontSize: 12, color: 'rgba(255,255,255,0.7)' },

  rankText: { fontSize: 18, fontWeight: '800', color: '#fff' },

  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 14, padding: 15, marginBottom: 10,
  },
  shareBtnText: { fontSize: 15, fontWeight: '800', color: '#1B6B3A' },

  closeBtnBottom: {
    borderRadius: 14, padding: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
  },
  closeBtnText: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
});
