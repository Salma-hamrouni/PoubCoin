import React, { useState, useRef } from 'react';
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity, Alert,
  Animated, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { useAdmin } from '../../context/AdminContext';
import { useTheme } from '../../context/ThemeContext';
import { radius, shadow } from '../../theme';

// ── types ────────────────────────────────────────────────────────────────────

type Period = 'month' | 'quarter' | 'year' | 'custom';
type Format = 'pdf' | 'excel';

interface Section {
  key: string;
  label: string;
  emoji: string;
  getMock: (ctx: ReturnType<typeof useAdmin>) => string;
}

const SECTIONS: Section[] = [
  {
    key: 'stats',
    label: 'Statistiques générales',
    emoji: '📊',
    getMock: ctx => `${ctx.reports.length} signalements · ${ctx.users.length} citoyens actifs`,
  },
  {
    key: 'top_users',
    label: 'Top citoyens',
    emoji: '🏆',
    getMock: ctx => {
      const counts: Record<string, number> = {};
      ctx.reports.filter(r => r.status === 'validated').forEach(r => {
        counts[r.userName] = (counts[r.userName] ?? 0) + 1;
      });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
      return top.length ? top.map(([n, c]) => `${n} (${c})`).join(', ') : 'Aucune donnée';
    },
  },
  {
    key: 'zones',
    label: 'Zones critiques',
    emoji: '📍',
    getMock: ctx => {
      const pending = ctx.reports.filter(r => r.status === 'pending').length;
      return `${pending} signalements en attente`;
    },
  },
  {
    key: 'campaigns',
    label: 'Campagnes actives',
    emoji: '📣',
    getMock: ctx => {
      const active = ctx.challenges.filter(c => c.active).length;
      return `${active} défi${active > 1 ? 's' : ''} en cours`;
    },
  },
  {
    key: 'fraud',
    label: 'Analyse des fraudes',
    emoji: '🚨',
    getMock: ctx => {
      const rejected = ctx.reports.filter(r => r.status === 'rejected').length;
      const pct = ctx.reports.length > 0
        ? Math.round((rejected / ctx.reports.length) * 100) : 0;
      return `Taux de rejet : ${pct}%`;
    },
  },
  {
    key: 'environment',
    label: 'Impact environnemental',
    emoji: '🌿',
    getMock: ctx => {
      const validated = ctx.reports.filter(r => r.status === 'validated').length;
      return `~${(validated * 2.3).toFixed(1)} kg de déchets collectés`;
    },
  },
];

const PERIOD_LABELS: Record<Period, string> = {
  month:   'Ce mois',
  quarter: 'Ce trimestre',
  year:    'Cette année',
  custom:  'Personnalisé',
};

function showAlert(msg: string) {
  if (Platform.OS === 'web') {
    window.alert(msg);
  } else {
    Alert.alert('Info', msg);
  }
}

// ── component ────────────────────────────────────────────────────────────────

export default function AdminReportExportScreen({ navigation }: any) {
  const { colors } = useTheme();
  const admin = useAdmin();

  const [period, setPeriod]   = useState<Period>('month');
  const [format, setFormat]   = useState<Format>('pdf');
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(SECTIONS.map(s => [s.key, true])),
  );
  const [generating, setGenerating] = useState(false);
  const [success, setSuccess]       = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;

  const selectedCount = Object.values(enabled).filter(Boolean).length;

  // mock meta
  const today    = new Date().toLocaleDateString('fr-FR');
  const pages    = 6 + selectedCount;
  const sizeMB   = (1.2 + selectedCount * 0.2).toFixed(1);
  const filename = `rapport_poubcoin_${period}_${new Date().toISOString().slice(0, 10)}.${format}`;

  const handleGenerate = () => {
    if (generating || success) return;
    setGenerating(true);
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    }).start(() => {
      setGenerating(false);
      setSuccess(true);
    });
  };

  const [downloading, setDownloading] = useState(false);

  const handleReset = () => {
    setSuccess(false);
    progressAnim.setValue(0);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      if (format === 'excel') {
        const total     = admin.reports.length;
        const validated = admin.reports.filter(r => r.status === 'validated').length;
        const pending   = admin.reports.filter(r => r.status === 'pending').length;
        const rejected  = admin.reports.filter(r => r.status === 'rejected').length;

        const counts: Record<string, number> = {};
        admin.reports.filter(r => r.status === 'validated').forEach(r => {
          counts[r.userName] = (counts[r.userName] ?? 0) + 1;
        });

        const wb = XLSX.utils.book_new();

        // Sheet 1 — Statistiques
        const statsData = [
          ['Rapport PoubCoin', PERIOD_LABELS[period], today],
          [],
          ['Indicateur', 'Valeur'],
          ['Total signalements', total],
          ['Validés', validated],
          ['En attente', pending],
          ['Rejetés', rejected],
          ['Taux de rejet (%)', total > 0 ? Math.round((rejected / total) * 100) : 0],
          [],
          ['Impact environnemental'],
          ['Déchets collectés (kg)', parseFloat((validated * 2.3).toFixed(1))],
          ['CO₂ évité (kg)', parseFloat((validated * 0.8).toFixed(1))],
          ['Équivalent arbres', parseFloat((validated * 0.8 / 22).toFixed(1))],
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(statsData), 'Statistiques');

        // Sheet 2 — Top citoyens
        const topData = [
          ['#', 'Citoyen', 'Signalements validés'],
          ...Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([n, c], i) => [i + 1, n, c]),
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(topData), 'Top citoyens');

        // Sheet 3 — Signalements détaillés
        const detailData = [
          ['Date', 'Citoyen', 'Localisation', 'Statut'],
          ...admin.reports.map(r => [r.date, r.userName, (r as any).location ?? '', r.status]),
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detailData), 'Signalements');

        const xlsxFilename = filename.replace('.excel', '.xlsx');
        XLSX.writeFile(wb, xlsxFilename);
        setDownloading(false);
        return;
      }
      const total     = admin.reports.length;
      const validated = admin.reports.filter(r => r.status === 'validated').length;
      const pending   = admin.reports.filter(r => r.status === 'pending').length;
      const rejected  = admin.reports.filter(r => r.status === 'rejected').length;
      const rejectPct = total > 0 ? Math.round((rejected / total) * 100) : 0;
      const wasteKg   = (validated * 2.3).toFixed(1);

      const counts: Record<string, number> = {};
      admin.reports.filter(r => r.status === 'validated').forEach(r => {
        counts[r.userName] = (counts[r.userName] ?? 0) + 1;
      });
      const topRows = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count], i) => `<tr><td>${i + 1}</td><td>${name}</td><td><b>${count}</b></td></tr>`)
        .join('');

      const activeChallenges = admin.challenges.filter(c => c.active).length;

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 32px; background: #fff; color: #1a1a1a; font-size: 13px; line-height: 1.5; }
  .header { background: #1e3a5f; color: #fff; border-radius: 10px; padding: 24px 28px; margin-bottom: 24px; overflow: hidden; }
  .header h1 { margin: 0 0 4px; font-size: 22px; font-weight: 900; }
  .header p  { margin: 0; color: rgba(255,255,255,0.7); font-size: 12px; }
  .header .badge { display: inline-block; background: rgba(255,255,255,0.2); border-radius: 6px; padding: 4px 12px; font-size: 11px; font-weight: 700; margin-top: 8px; }
  .stats-row { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  .stats-row td { width: 25%; padding: 0 6px 0 0; vertical-align: top; }
  .stats-row td:last-child { padding-right: 0; }
  .stat-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; text-align: center; }
  .stat-card .num { font-size: 26px; font-weight: 900; color: #1e3a5f; margin-bottom: 4px; }
  .stat-card .lbl { font-size: 10px; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; }
  .green  { color: #16A34A !important; }
  .orange { color: #D97706 !important; }
  .red    { color: #DC2626 !important; }
  h2 { font-size: 13px; font-weight: 800; color: #1e3a5f; border-bottom: 2px solid #E2E8F0; padding-bottom: 7px; margin: 22px 0 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  table.data { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  table.data th { background: #F1F5F9; text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; font-weight: 700; }
  table.data td { padding: 8px 10px; border-bottom: 1px solid #F1F5F9; font-size: 12px; }
  table.data tr:last-child td { border-bottom: none; }
  table.data tr:nth-child(even) td { background: #FAFAFA; }
  .footer { margin-top: 32px; text-align: center; color: #94A3B8; font-size: 10px; border-top: 1px solid #E2E8F0; padding-top: 14px; }
</style></head><body>

<div class="header">
  <h1>Rapport PoubCoin Admin</h1>
  <p>Periode : ${PERIOD_LABELS[period]} &nbsp;·&nbsp; Genere le ${today}</p>
  <span class="badge">PDF</span>
</div>

${enabled.stats ? `
<h2>Statistiques generales</h2>
<table class="stats-row"><tr>
  <td><div class="stat-card"><div class="num">${total}</div><div class="lbl">Total</div></div></td>
  <td><div class="stat-card"><div class="num green">${validated}</div><div class="lbl">Valides</div></div></td>
  <td><div class="stat-card"><div class="num orange">${pending}</div><div class="lbl">En attente</div></div></td>
  <td><div class="stat-card"><div class="num red">${rejectPct}%</div><div class="lbl">Taux rejet</div></div></td>
</tr></table>
` : ''}

${enabled.top_users ? `
<h2>Top citoyens</h2>
<table class="data">
  <tr><th>#</th><th>Citoyen</th><th>Signalements valides</th></tr>
  ${topRows || '<tr><td colspan="3">Aucune donnee</td></tr>'}
</table>
` : ''}

${enabled.environment ? `
<h2>Impact environnemental</h2>
<table class="data">
  <tr><th>Indicateur</th><th>Valeur</th></tr>
  <tr><td>Dechets collectes (estime)</td><td><b>${wasteKg} kg</b></td></tr>
  <tr><td>CO2 evite (estime)</td><td><b>${(validated * 0.8).toFixed(1)} kg</b></td></tr>
  <tr><td>Equivalent arbres</td><td><b>${(validated * 0.8 / 22).toFixed(1)}</b></td></tr>
  <tr><td>Citoyens actifs</td><td><b>${admin.users.length}</b></td></tr>
</table>
` : ''}

${enabled.campaigns ? `
<h2>Campagnes et defis</h2>
<table class="data">
  <tr><th>Indicateur</th><th>Valeur</th></tr>
  <tr><td>Defis actifs</td><td><b>${activeChallenges}</b></td></tr>
  <tr><td>Citoyens inscrits</td><td><b>${admin.users.length}</b></td></tr>
</table>
` : ''}

${enabled.fraud ? `
<h2>Analyse des fraudes</h2>
<table class="data">
  <tr><th>Indicateur</th><th>Valeur</th></tr>
  <tr><td>Signalements rejetes</td><td><b>${rejected}</b></td></tr>
  <tr><td>Taux de rejet</td><td><b>${rejectPct}%</b></td></tr>
  <tr><td>Total soumis</td><td><b>${total}</b></td></tr>
</table>
` : ''}

${enabled.zones ? `
<h2>Zones critiques</h2>
<table class="data">
  <tr><th>Indicateur</th><th>Valeur</th></tr>
  <tr><td>Signalements en attente</td><td><b>${pending}</b></td></tr>
  <tr><td>Taux de validation</td><td><b>${total > 0 ? Math.round((validated / total) * 100) : 0}%</b></td></tr>
</table>
` : ''}

<div class="footer">PoubCoin Admin &nbsp;·&nbsp; ${today} &nbsp;·&nbsp; Confidentiel</div>
</body></html>`;

      if (Platform.OS === 'web') {
        // jsPDF: generate directly in browser, no print dialog
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const margin = 16;
        const col = pageW - margin * 2;
        let y = margin;

        const addTitle = (text: string, size = 18, color = [30, 58, 95] as [number,number,number]) => {
          doc.setFontSize(size); doc.setTextColor(...color); doc.setFont('helvetica', 'bold');
          doc.text(text, margin, y); y += size * 0.5;
        };
        const addText = (text: string, size = 10, color = [51, 51, 51] as [number,number,number]) => {
          doc.setFontSize(size); doc.setTextColor(...color); doc.setFont('helvetica', 'normal');
          doc.text(text, margin, y); y += size * 0.45;
        };
        const addLine = () => {
          y += 3; doc.setDrawColor(226, 232, 240); doc.line(margin, y, margin + col, y); y += 5;
        };
        const addSection = (title: string) => {
          y += 4;
          doc.setFillColor(241, 245, 249); doc.roundedRect(margin, y - 4, col, 9, 1, 1, 'F');
          doc.setFontSize(10); doc.setTextColor(30, 58, 95); doc.setFont('helvetica', 'bold');
          doc.text(title.toUpperCase(), margin + 3, y + 2); y += 10;
        };
        const addRow = (label: string, value: string, even = false) => {
          if (even) { doc.setFillColor(250, 250, 250); doc.rect(margin, y - 3.5, col, 7, 'F'); }
          doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(51, 51, 51);
          doc.text(label, margin + 3, y);
          doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 95);
          doc.text(value, margin + col - 3, y, { align: 'right' });
          y += 7;
        };

        // Header box
        doc.setFillColor(30, 58, 95);
        doc.roundedRect(margin, y, col, 28, 3, 3, 'F');
        doc.setFontSize(16); doc.setTextColor(255,255,255); doc.setFont('helvetica', 'bold');
        doc.text('Rapport PoubCoin Admin', margin + 6, y + 10);
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(180,200,230);
        doc.text(`Periode : ${PERIOD_LABELS[period]}   |   Genere le ${today}`, margin + 6, y + 18);
        doc.setFillColor(255,255,255,50); doc.roundedRect(margin + col - 24, y + 7, 18, 7, 2, 2, 'F');
        doc.setFontSize(8); doc.setTextColor(255,255,255); doc.setFont('helvetica', 'bold');
        doc.text('PDF', margin + col - 17, y + 12, { align: 'center' });
        y += 34;

        if (enabled.stats) {
          addSection('Statistiques generales');
          addRow('Total signalements', String(total), false);
          addRow('Valides', String(validated), true);
          addRow('En attente', String(pending), false);
          addRow('Rejetes', String(rejected), true);
          addRow('Taux de rejet', `${rejectPct}%`, false);
          y += 2;
        }

        if (enabled.top_users) {
          addSection('Top citoyens');
          Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0,10).forEach(([name, count], i) => {
            addRow(`${i+1}. ${name}`, `${count} signalements`, i % 2 === 1);
          });
          if (!Object.keys(counts).length) addText('Aucune donnee', 10, [150,150,150]);
          y += 2;
        }

        if (enabled.environment) {
          addSection('Impact environnemental');
          addRow('Dechets collectes (estime)', `${wasteKg} kg`, false);
          addRow('CO2 evite (estime)', `${(validated * 0.8).toFixed(1)} kg`, true);
          addRow('Equivalent arbres', (validated * 0.8 / 22).toFixed(1), false);
          addRow('Citoyens actifs', String(admin.users.length), true);
          y += 2;
        }

        if (enabled.campaigns) {
          addSection('Campagnes et defis');
          addRow('Defis actifs', String(activeChallenges), false);
          addRow('Citoyens inscrits', String(admin.users.length), true);
          y += 2;
        }

        if (enabled.fraud) {
          addSection('Analyse des fraudes');
          addRow('Signalements rejetes', String(rejected), false);
          addRow('Taux de rejet', `${rejectPct}%`, true);
          y += 2;
        }

        if (enabled.zones) {
          addSection('Zones critiques');
          addRow('Signalements en attente', String(pending), false);
          addRow('Taux de validation', `${total > 0 ? Math.round((validated/total)*100) : 0}%`, true);
          y += 2;
        }

        // Footer
        addLine();
        doc.setFontSize(8); doc.setTextColor(148,163,184); doc.setFont('helvetica', 'normal');
        doc.text(`PoubCoin Admin  |  ${today}  |  Confidentiel`, pageW / 2, y, { align: 'center' });

        doc.save(filename);
      } else {
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Enregistrer le rapport' });
        } else {
          showAlert(`PDF généré : ${uri}`);
        }
      }
    } catch {
      showAlert('Impossible de générer le fichier.');
    }
    setDownloading(false);
  };

  const barWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        backgroundColor: colors.surface,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        ...shadow.sm,
      }}>
        <TouchableOpacity
          style={{
            width: 36, height: 36, borderRadius: radius.xs,
            backgroundColor: colors.background,
            justifyContent: 'center', alignItems: 'center',
            borderWidth: 1, borderColor: colors.border,
          }}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.adminPrimary, letterSpacing: 1 }}>
            EXPORT
          </Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
            Rapport PDF
          </Text>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>
            Génération automatique
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Success state ──────────────────────────────────────────────── */}
        {success ? (
          <>
            <View style={{
              backgroundColor: '#F0FDF4',
              borderRadius: radius.lg,
              padding: 24,
              alignItems: 'center',
              marginBottom: 16,
              borderWidth: 1,
              borderColor: '#16A34A40',
              ...shadow.sm,
            }}>
              <Text style={{ fontSize: 52, marginBottom: 8 }}>✅</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#16A34A', textAlign: 'center' }}>
                Rapport généré avec succès !
              </Text>
            </View>

            {/* Preview card */}
            <View style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: colors.border,
              ...shadow.xs,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <View style={{
                  width: 48, height: 48, borderRadius: radius.sm,
                  backgroundColor: colors.adminLight,
                  justifyContent: 'center', alignItems: 'center',
                }}>
                  <Text style={{ fontSize: 24 }}>{format === 'pdf' ? '📄' : '📊'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                    {filename}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                    {today} · {sizeMB} MB · {pages} pages
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 8, backgroundColor: colors.adminPrimary,
                  borderRadius: radius.sm, paddingVertical: 13,
                  opacity: downloading ? 0.6 : 1,
                }}
                onPress={handleDownload}
                disabled={downloading}
              >
                <Ionicons name={downloading ? 'hourglass-outline' : 'download-outline'} size={18} color="#fff" />
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>
                  {downloading ? 'Génération...' : format === 'pdf' ? 'Télécharger PDF' : 'Télécharger Excel'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleReset}
              style={{
                borderRadius: radius.md,
                padding: 14,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 14, color: colors.textMuted }}>
                Nouveau rapport
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* ── Period selector ────────────────────────────────────────── */}
            <View style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: 14,
              marginBottom: 14,
              borderWidth: 1,
              borderColor: colors.border,
              ...shadow.xs,
            }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 10 }}>
                Période
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setPeriod(p)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      paddingHorizontal: 12, paddingVertical: 8,
                      borderRadius: radius.pill,
                      borderWidth: 1.5,
                      borderColor: period === p ? colors.adminPrimary : colors.border,
                      backgroundColor: period === p ? colors.adminLight : colors.background,
                    }}
                  >
                    <View style={{
                      width: 14, height: 14, borderRadius: 7,
                      borderWidth: 2,
                      borderColor: period === p ? colors.adminPrimary : colors.textMuted,
                      backgroundColor: period === p ? colors.adminPrimary : 'transparent',
                    }} />
                    <Text style={{
                      fontSize: 12, fontWeight: '600',
                      color: period === p ? colors.adminPrimary : colors.textSecondary,
                    }}>
                      {PERIOD_LABELS[p]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ── Format selector ────────────────────────────────────────── */}
            <View style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: 14,
              marginBottom: 14,
              borderWidth: 1,
              borderColor: colors.border,
              ...shadow.xs,
            }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 10 }}>
                Format
              </Text>
              <View style={{
                flexDirection: 'row',
                backgroundColor: colors.background,
                borderRadius: radius.sm,
                padding: 3,
                borderWidth: 1,
                borderColor: colors.border,
              }}>
                {(['pdf', 'excel'] as Format[]).map(f => (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setFormat(f)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      alignItems: 'center',
                      borderRadius: radius.xs,
                      backgroundColor: format === f ? colors.adminPrimary : 'transparent',
                    }}
                  >
                    <Text style={{
                      fontSize: 13, fontWeight: '700',
                      color: format === f ? '#FFFFFF' : colors.textMuted,
                    }}>
                      {f === 'pdf' ? '📄 PDF' : '📊 Excel'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ── Sections toggles ───────────────────────────────────────── */}
            <View style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: 14,
              marginBottom: 14,
              borderWidth: 1,
              borderColor: colors.border,
              ...shadow.xs,
            }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 10 }}>
                Sections incluses
              </Text>
              {SECTIONS.map((s, idx) => (
                <TouchableOpacity
                  key={s.key}
                  onPress={() => setEnabled(e => ({ ...e, [s.key]: !e[s.key] }))}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 10,
                    borderTopWidth: idx === 0 ? 0 : 1,
                    borderTopColor: colors.borderLight,
                  }}
                >
                  <View style={{
                    width: 22, height: 22, borderRadius: 6,
                    backgroundColor: enabled[s.key] ? colors.adminPrimary : colors.background,
                    borderWidth: 2,
                    borderColor: enabled[s.key] ? colors.adminPrimary : colors.border,
                    justifyContent: 'center', alignItems: 'center',
                  }}>
                    {enabled[s.key] && (
                      <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={{ fontSize: 14 }}>{s.emoji}</Text>
                  <Text style={{
                    flex: 1, fontSize: 13, fontWeight: '600',
                    color: enabled[s.key] ? colors.text : colors.textMuted,
                  }}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Generate button / progress ────────────────────────────── */}
            {generating ? (
              <View style={{
                backgroundColor: colors.surface,
                borderRadius: radius.md,
                padding: 16,
                marginBottom: 14,
                borderWidth: 1,
                borderColor: colors.border,
                ...shadow.xs,
              }}>
                <Text style={{
                  fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 10,
                }}>
                  Génération en cours...
                </Text>
                <View style={{
                  height: 8, backgroundColor: colors.borderLight,
                  borderRadius: radius.pill, overflow: 'hidden',
                }}>
                  <Animated.View style={{
                    height: '100%',
                    width: barWidth,
                    backgroundColor: colors.adminPrimary,
                    borderRadius: radius.pill,
                  }} />
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleGenerate}
                style={{
                  backgroundColor: colors.adminPrimary,
                  borderRadius: radius.md,
                  padding: 16,
                  alignItems: 'center',
                  marginBottom: 14,
                  ...shadow.md,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>
                  Générer le rapport
                </Text>
              </TouchableOpacity>
            )}

            {/* ── PDF preview cards ─────────────────────────────────────── */}
            <Text style={{
              fontSize: 12, fontWeight: '700',
              color: colors.textSecondary,
              marginBottom: 10,
            }}>
              Aperçu du contenu
            </Text>
            {SECTIONS.filter(s => enabled[s.key]).map(s => (
              <View key={s.key} style={{
                backgroundColor: colors.surface,
                borderRadius: radius.md,
                padding: 12,
                marginBottom: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                borderWidth: 1,
                borderColor: colors.border,
                ...shadow.xs,
              }}>
                <View style={{
                  width: 38, height: 38, borderRadius: radius.sm,
                  backgroundColor: colors.adminLight,
                  justifyContent: 'center', alignItems: 'center',
                }}>
                  <Text style={{ fontSize: 20 }}>{s.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                    {s.label}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                    {s.getMock(admin)}
                  </Text>
                </View>
                <Ionicons name="document-text-outline" size={16} color={colors.textMuted} />
              </View>
            ))}

            {selectedCount === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Text style={{ fontSize: 13, color: colors.textMuted }}>
                  Sélectionnez au moins une section.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
