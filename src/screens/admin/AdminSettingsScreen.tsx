import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, TextInput, Modal, Switch, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdmin } from '../../context/AdminContext';
import {
  useAdminPrefs,
  ADMIN_ACCENT_COLORS, MUNICIPALITY_EMOJIS,
  DEFAULT_WASTE_CATEGORIES, WasteCategory,
} from '../../context/AdminPrefsContext';
import { radius } from '../../theme';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isValidHex(h: string) { return /^#[0-9A-Fa-f]{6}$/.test(h); }

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, sub, accent }: { icon: string; title: string; sub?: string; accent: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: sub ? 4 : 14 }}>
      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: accent + '18', justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name={icon as any} size={16} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#111714' }}>{title}</Text>
        {sub && <Text style={{ fontSize: 12, color: '#94A99A', marginTop: 1 }}>{sub}</Text>}
      </View>
    </View>
  );
}

// ── Stepper ───────────────────────────────────────────────────────────────────

function Stepper({ value, onChange, min = 1, max = 999, step = 1, accent }: {
  value: number; onChange: (n: number) => void;
  min?: number; max?: number; step?: number; accent: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <TouchableOpacity
        style={[st.stepBtn, { borderColor: accent + '30' }]}
        onPress={() => onChange(Math.max(min, value - step))}
      >
        <Ionicons name="remove" size={16} color={accent} />
      </TouchableOpacity>
      <Text style={{ fontSize: 20, fontWeight: '800', color: accent, minWidth: 48, textAlign: 'center' }}>{value}</Text>
      <TouchableOpacity
        style={[st.stepBtn, { borderColor: accent + '30' }]}
        onPress={() => onChange(Math.min(max, value + step))}
      >
        <Ionicons name="add" size={16} color={accent} />
      </TouchableOpacity>
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AdminSettingsScreen({ navigation }: any) {
  const { logoutAdmin, coinsPerValidation, updateCoinsPerValidation, reports, users } = useAdmin();
  const prefs = useAdminPrefs();

  // Local state mirrors
  const [munNameInput,     setMunNameInput]     = useState(prefs.municipalityName);
  const [displayNameInput, setDisplayNameInput] = useState(prefs.adminDisplayName);
  const [welcomeInput,     setWelcomeInput]     = useState(prefs.welcomeMessage);
  const [coinsInput,       setCoinsInput]       = useState(String(coinsPerValidation));
  const [customHex,        setCustomHex]        = useState(prefs.accentColor);
  const [hexError,         setHexError]         = useState(false);

  // Category editor state
  const [editCatModal,  setEditCatModal]  = useState(false);
  const [editCatIndex,  setEditCatIndex]  = useState<number | null>(null);
  const [catLabel,      setCatLabel]      = useState('');
  const [catEmoji,      setCatEmoji]      = useState('');

  const [logoutModal,  setLogoutModal]  = useState(false);
  const [savedSection, setSavedSection] = useState<string | null>(null);

  // Sync when prefs load from AsyncStorage
  useEffect(() => { setMunNameInput(prefs.municipalityName); },  [prefs.municipalityName]);
  useEffect(() => { setDisplayNameInput(prefs.adminDisplayName); }, [prefs.adminDisplayName]);
  useEffect(() => { setWelcomeInput(prefs.welcomeMessage); },    [prefs.welcomeMessage]);
  useEffect(() => { setCoinsInput(String(coinsPerValidation)); }, [coinsPerValidation]);
  useEffect(() => { setCustomHex(prefs.accentColor); },          [prefs.accentColor]);

  const A = prefs.accentColor; // shorthand
  const isDark = prefs.adminTheme === 'dark';

  function flashSaved(section: string) {
    setSavedSection(section);
    setTimeout(() => setSavedSection(null), 2000);
  }

  function saveProfile() {
    if (munNameInput.trim())     prefs.setMunicipalityName(munNameInput.trim());
    if (displayNameInput.trim()) prefs.setAdminDisplayName(displayNameInput.trim());
    if (welcomeInput.trim())     prefs.setWelcomeMessage(welcomeInput.trim());
    flashSaved('profile');
  }

  async function saveCoins() {
    const n = parseInt(coinsInput, 10);
    if (isNaN(n) || n < 1) { Alert.alert('Valeur invalide', 'Entrez un nombre positif.'); return; }
    await updateCoinsPerValidation(n);
    flashSaved('coins');
  }

  function applyCustomHex() {
    if (!isValidHex(customHex)) { setHexError(true); return; }
    setHexError(false);
    prefs.setAccentColor(customHex);
    prefs.setAdminAvatarColor(customHex);
    flashSaved('color');
  }

  function openNewCategory() {
    setEditCatIndex(null);
    setCatLabel('');
    setCatEmoji('');
    setEditCatModal(true);
  }

  function openEditCategory(i: number) {
    setEditCatIndex(i);
    setCatLabel(prefs.wasteCategories[i].label);
    setCatEmoji(prefs.wasteCategories[i].emoji);
    setEditCatModal(true);
  }

  function saveCategory() {
    if (!catLabel.trim()) return;
    const cats = [...prefs.wasteCategories];
    const entry: WasteCategory = {
      key: catLabel.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(),
      label: catLabel.trim(),
      emoji: catEmoji.trim() || '🗑️',
    };
    if (editCatIndex !== null) {
      cats[editCatIndex] = { ...cats[editCatIndex], label: entry.label, emoji: entry.emoji };
    } else {
      cats.push(entry);
    }
    prefs.setWasteCategories(cats);
    setEditCatModal(false);
  }

  function deleteCategory(i: number) {
    if (prefs.wasteCategories.length <= 1) {
      Alert.alert('Impossible', 'Gardez au moins une catégorie.');
      return;
    }
    Alert.alert('Supprimer ?', `Supprimer la catégorie "${prefs.wasteCategories[i].label}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => {
        const cats = prefs.wasteCategories.filter((_, idx) => idx !== i);
        prefs.setWasteCategories(cats);
      }},
    ]);
  }

  function resetCategories() {
    Alert.alert('Réinitialiser', 'Remettre les catégories par défaut ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Réinitialiser', style: 'destructive', onPress: () => prefs.setWasteCategories(DEFAULT_WASTE_CATEGORIES) },
    ]);
  }

  const card = [st.card, isDark && { backgroundColor: '#1E2A23', borderColor: '#2A3D30' }] as any;
  const textMain  = isDark ? '#F0F9F4' : '#111714';
  const textMuted = isDark ? '#6B8A73' : '#94A99A';
  const bg        = isDark ? '#111714' : '#F5F6F5';

  return (
    <SafeAreaView style={[st.root, { backgroundColor: bg }]}>
      <View style={[st.header, isDark && { backgroundColor: '#1E2A23', borderBottomColor: '#2A3D30' }]}>
        <TouchableOpacity style={[st.backBtn, isDark && { backgroundColor: '#2A3D30', borderColor: '#3A5040' }]} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={textMain} />
        </TouchableOpacity>
        <View>
          <Text style={{ fontSize: 10, fontWeight: '700', color: A, letterSpacing: 1.2 }}>CONFIGURATION</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: textMain }}>Personnalisation</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>

        {/* ── IDENTITÉ MUNICIPALITÉ ──────────────────────────────────── */}
        <View style={card}>
          <SectionHeader icon="business-outline" title="Identité municipalité" sub="Informations affichées dans le dashboard" accent={A} />

          <Text style={[st.label, { color: textMuted }]}>Nom de la municipalité</Text>
          <TextInput style={[st.input, { color: textMain, borderColor: A + '30', backgroundColor: isDark ? '#17231A' : '#F5F6F5' }]}
            value={munNameInput} onChangeText={setMunNameInput} placeholder="ex: Municipalité de Tunis"
            placeholderTextColor={textMuted} />

          <Text style={[st.label, { color: textMuted, marginTop: 12 }]}>Nom de l'administrateur</Text>
          <TextInput style={[st.input, { color: textMain, borderColor: A + '30', backgroundColor: isDark ? '#17231A' : '#F5F6F5' }]}
            value={displayNameInput} onChangeText={setDisplayNameInput} placeholder="ex: Administrateur"
            placeholderTextColor={textMuted} />

          <Text style={[st.label, { color: textMuted, marginTop: 12 }]}>Message de bienvenue (app citoyens)</Text>
          <TextInput style={[st.input, { color: textMain, borderColor: A + '30', backgroundColor: isDark ? '#17231A' : '#F5F6F5', minHeight: 72, textAlignVertical: 'top', paddingTop: 10 }]}
            value={welcomeInput} onChangeText={setWelcomeInput} multiline
            placeholder="Message affiché aux citoyens…" placeholderTextColor={textMuted} />

          <Text style={[st.label, { color: textMuted, marginTop: 12 }]}>Emoji de la municipalité</Text>
          <View style={st.emojiGrid}>
            {MUNICIPALITY_EMOJIS.map(em => (
              <TouchableOpacity key={em}
                style={[st.emojiBtn, prefs.municipalityEmoji === em && { borderColor: A, backgroundColor: A + '15' }]}
                onPress={() => prefs.setMunicipalityEmoji(em)}>
                <Text style={{ fontSize: 24 }}>{em}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[st.saveBtn, { backgroundColor: A, marginTop: 14 }]} onPress={saveProfile}>
            {savedSection === 'profile'
              ? <><Ionicons name="checkmark" size={16} color="#fff" /><Text style={st.saveBtnText}>Enregistré ✓</Text></>
              : <Text style={st.saveBtnText}>Enregistrer le profil</Text>}
          </TouchableOpacity>
        </View>

        {/* ── COULEUR & THÈME ────────────────────────────────────────── */}
        <View style={card}>
          <SectionHeader icon="color-palette-outline" title="Couleur & thème" sub="Apparence du panneau admin" accent={A} />

          {/* Preset colors */}
          <Text style={[st.label, { color: textMuted }]}>Couleur d'accent</Text>
          <View style={st.colorGrid}>
            {ADMIN_ACCENT_COLORS.map(c => (
              <TouchableOpacity key={c.hex} style={[st.colorSwatch, { backgroundColor: c.hex }]}
                onPress={() => { prefs.setAccentColor(c.hex); setCustomHex(c.hex); }}>
                {prefs.accentColor === c.hex && <Ionicons name="checkmark" size={18} color="#fff" />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom hex */}
          <Text style={[st.label, { color: textMuted, marginTop: 12 }]}>Couleur personnalisée (hex)</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: isValidHex(customHex) ? customHex : '#E4E8E4', borderWidth: 1, borderColor: '#E4E8E4' }} />
            <TextInput
              style={[st.input, { flex: 1, marginBottom: 0, borderColor: hexError ? '#EF4444' : A + '30', color: textMain, backgroundColor: isDark ? '#17231A' : '#F5F6F5', fontFamily: 'monospace' }]}
              value={customHex} onChangeText={v => { setCustomHex(v); setHexError(false); }}
              placeholder="#1B6B3A" placeholderTextColor={textMuted} autoCapitalize="none" maxLength={7} />
            <TouchableOpacity style={[st.saveBtn, { backgroundColor: A, paddingHorizontal: 14, marginTop: 0 }]} onPress={applyCustomHex}>
              <Text style={st.saveBtnText}>Appliquer</Text>
            </TouchableOpacity>
          </View>
          {hexError && <Text style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>Format invalide — utilisez #RRGGBB</Text>}
          {savedSection === 'color' && <Text style={{ fontSize: 12, color: A, marginTop: 6, fontWeight: '600' }}>✓ Couleur appliquée</Text>}

          {/* Theme */}
          <Text style={[st.label, { color: textMuted, marginTop: 16 }]}>Thème de l'interface admin</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {([['light', 'Clair', 'sunny-outline'], ['dark', 'Sombre', 'moon-outline']] as const).map(([val, lbl, ico]) => (
              <TouchableOpacity key={val}
                style={[st.themeBtn, prefs.adminTheme === val && { backgroundColor: A, borderColor: A }]}
                onPress={() => prefs.setAdminTheme(val)}>
                <Ionicons name={ico as any} size={18} color={prefs.adminTheme === val ? '#fff' : textMuted} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: prefs.adminTheme === val ? '#fff' : textMuted }}>{lbl}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Avatar color */}
          <Text style={[st.label, { color: textMuted, marginTop: 16 }]}>Couleur de l'avatar admin</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: prefs.adminAvatarColor, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 18, color: '#fff', fontWeight: '800' }}>{prefs.adminDisplayName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={st.colorGrid}>
              {['#1B6B3A','#2563EB','#7C3AED','#DC2626','#B45309','#0891B2','#374151','#be185d'].map(c => (
                <TouchableOpacity key={c} style={[{ width: 28, height: 28, borderRadius: 14, backgroundColor: c, justifyContent: 'center', alignItems: 'center' }]}
                  onPress={() => prefs.setAdminAvatarColor(c)}>
                  {prefs.adminAvatarColor === c && <Ionicons name="checkmark" size={14} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ── WIDGETS DU DASHBOARD ─────────────────────────────────── */}
        <View style={card}>
          <SectionHeader icon="grid-outline" title="Sections du dashboard" sub="Choisissez les blocs visibles" accent={A} />
          {([
            { key: 'stats',          label: 'Statistiques & taux de validation', icon: 'stats-chart-outline' },
            { key: 'pendingInline',  label: 'Validation rapide inline',           icon: 'checkmark-circle-outline' },
            { key: 'chart',          label: 'Graphique 7 jours',                  icon: 'bar-chart-outline' },
            { key: 'userGrowth',     label: 'Croissance utilisateurs',            icon: 'people-outline' },
            { key: 'economy',        label: 'Économie PoubCoin',                  icon: 'cash-outline' },
            { key: 'quickActions',   label: 'Actions rapides',                    icon: 'flash-outline' },
            { key: 'leaderboard',    label: 'Classement Top 10',                  icon: 'trophy-outline' },
            { key: 'recentActivity', label: 'Activité récente',                   icon: 'time-outline' },
            { key: 'hotZones',       label: 'Zones les plus signalées',           icon: 'location-outline' },
            { key: 'retention',      label: 'Rétention & engagement',             icon: 'heart-outline' },
          ] as { key: keyof typeof prefs.dashboardWidgets; label: string; icon: string }[]).map((w, i, arr) => (
            <View key={w.key}>
              <View style={st.widgetRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: A + '15', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name={w.icon as any} size={15} color={A} />
                  </View>
                  <Text style={{ fontSize: 13, color: textMain, flex: 1 }}>{w.label}</Text>
                </View>
                <Switch value={prefs.dashboardWidgets[w.key]}
                  onValueChange={v => prefs.setDashboardWidgets({ ...prefs.dashboardWidgets, [w.key]: v })}
                  trackColor={{ false: '#E4E8E4', true: A }} thumbColor="#fff" />
              </View>
              {i < arr.length - 1 && <View style={{ height: 1, backgroundColor: isDark ? '#2A3D30' : '#E4E8E4' }} />}
            </View>
          ))}
        </View>

        {/* ── AFFICHAGE ────────────────────────────────────────────── */}
        <View style={card}>
          <SectionHeader icon="eye-outline" title="Affichage" sub="Densité et filtres par défaut" accent={A} />

          <Text style={[st.label, { color: textMuted }]}>Densité d'affichage</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            {([['comfortable', 'Confortable', 'expand-outline'], ['compact', 'Compact', 'contract-outline']] as const).map(([val, lbl, ico]) => (
              <TouchableOpacity key={val}
                style={[st.themeBtn, { flex: 1 }, prefs.layoutDensity === val && { backgroundColor: A, borderColor: A }]}
                onPress={() => prefs.setLayoutDensity(val)}>
                <Ionicons name={ico as any} size={18} color={prefs.layoutDensity === val ? '#fff' : textMuted} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: prefs.layoutDensity === val ? '#fff' : textMuted }}>{lbl}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[st.label, { color: textMuted }]}>Filtre par défaut — Signalements</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {([
              { key: 'pending',   label: 'En attente', color: '#B45309' },
              { key: 'validated', label: 'Validés',    color: '#15803D' },
              { key: 'rejected',  label: 'Rejetés',    color: '#DC2626' },
              { key: 'all',       label: 'Tous',       color: '#374151' },
            ] as { key: typeof prefs.defaultReportFilter; label: string; color: string }[]).map(f => (
              <TouchableOpacity key={f.key}
                style={[st.chip, prefs.defaultReportFilter === f.key && { backgroundColor: f.color, borderColor: f.color }]}
                onPress={() => prefs.setDefaultReportFilter(f.key)}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: prefs.defaultReportFilter === f.key ? '#fff' : textMuted }}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[st.switchRow, { marginTop: 16 }]}>
            <Text style={{ fontSize: 13, color: textMain, flex: 1 }}>Statistiques rapides (écran Plus)</Text>
            <Switch value={prefs.showMoreStats} onValueChange={prefs.setShowMoreStats}
              trackColor={{ false: '#E4E8E4', true: A }} thumbColor="#fff" />
          </View>
        </View>

        {/* ── OBJECTIFS & SLA ──────────────────────────────────────── */}
        <View style={card}>
          <SectionHeader icon="flag-outline" title="Objectifs & SLA" sub="Cibles mensuelles et délais de traitement" accent={A} />

          <View style={st.stepperRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: textMain }}>Objectif mensuel</Text>
              <Text style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>Signalements visés ce mois</Text>
            </View>
            <Stepper value={prefs.monthlyReportTarget} onChange={prefs.setMonthlyReportTarget} step={10} max={9999} accent={A} />
          </View>

          <View style={{ height: 1, backgroundColor: isDark ? '#2A3D30' : '#E4E8E4', marginVertical: 14 }} />

          <View style={st.stepperRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: textMain }}>SLA cible (heures)</Text>
              <Text style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>Délai max. de traitement d'un signalement</Text>
            </View>
            <Stepper value={prefs.slaTargetHours} onChange={prefs.setSlaTargetHours} step={6} max={168} accent={A} />
          </View>
        </View>

        {/* ── SEUILS D'ALERTES ─────────────────────────────────────── */}
        <View style={card}>
          <SectionHeader icon="warning-outline" title="Seuils d'alertes" sub="Quand déclencher les anomalies" accent={A} />

          <View style={st.stepperRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: textMain }}>Backlog en attente</Text>
              <Text style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>Alerte si plus de X signalements en attente</Text>
            </View>
            <Stepper value={prefs.alertThresholdPending} onChange={prefs.setAlertThresholdPending} step={5} max={500} accent={A} />
          </View>

          <View style={{ height: 1, backgroundColor: isDark ? '#2A3D30' : '#E4E8E4', marginVertical: 14 }} />

          <View style={st.stepperRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: textMain }}>Inactivité utilisateurs (%)</Text>
              <Text style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>Alerte si plus de X% inactifs depuis 7j</Text>
            </View>
            <Stepper value={prefs.alertThresholdInactivityPct} onChange={prefs.setAlertThresholdInactivityPct} step={5} max={100} accent={A} />
          </View>
        </View>

        {/* ── RÉCOMPENSES & GAMIFICATION ───────────────────────────── */}
        <View style={card}>
          <SectionHeader icon="trophy-outline" title="Récompenses & gamification" sub="Taux de conversion et bonus de série" accent={A} />

          <View style={[st.stepperRow, { marginBottom: 14 }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: textMain }}>🪙 Coins par signalement validé</Text>
              <Text style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>Actuel : {coinsPerValidation} coins</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                style={[st.coinsInput, { color: A, borderColor: A + '40', backgroundColor: isDark ? '#17231A' : '#F5F6F5' }]}
                value={coinsInput} onChangeText={v => setCoinsInput(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad" maxLength={4}
              />
              <TouchableOpacity style={[st.saveBtn, { backgroundColor: A, marginTop: 0, paddingHorizontal: 12 }]} onPress={saveCoins}>
                {savedSection === 'coins'
                  ? <Ionicons name="checkmark" size={16} color="#fff" />
                  : <Text style={st.saveBtnText}>OK</Text>}
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: isDark ? '#2A3D30' : '#E4E8E4', marginVertical: 0, marginBottom: 14 }} />

          <View style={st.stepperRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: textMain }}>Multiplicateur de série max</Text>
              <Text style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>Ex: ×3 → 3 jours consécutifs = 3× les coins</Text>
            </View>
            <Stepper value={prefs.streakMaxMultiplier} onChange={prefs.setStreakMaxMultiplier} step={1} min={1} max={10} accent={A} />
          </View>

          <View style={{ height: 1, backgroundColor: isDark ? '#2A3D30' : '#E4E8E4', marginTop: 14, marginBottom: 14 }} />

          <View style={st.stepperRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: textMain }}>Seuil statut "Pro"</Text>
              <Text style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>Nb. de signalements pour obtenir le badge Pro</Text>
            </View>
            <Stepper value={prefs.proThreshold} onChange={prefs.setProThreshold} step={5} max={500} accent={A} />
          </View>
        </View>

        {/* ── CATÉGORIES DE DÉCHETS ────────────────────────────────── */}
        <View style={card}>
          <SectionHeader icon="leaf-outline" title="Catégories de déchets" sub="Types de déchets signalables" accent={A} />

          {prefs.wasteCategories.map((cat, i) => (
            <View key={cat.key} style={[st.catRow, { borderBottomColor: isDark ? '#2A3D30' : '#E4E8E4' }]}>
              <Text style={{ fontSize: 22, width: 36 }}>{cat.emoji}</Text>
              <Text style={{ fontSize: 14, color: textMain, flex: 1, fontWeight: '500' }}>{cat.label}</Text>
              <TouchableOpacity style={st.catBtn} onPress={() => openEditCategory(i)}>
                <Ionicons name="pencil-outline" size={15} color={A} />
              </TouchableOpacity>
              <TouchableOpacity style={[st.catBtn, { backgroundColor: '#EF444415' }]} onPress={() => deleteCategory(i)}>
                <Ionicons name="trash-outline" size={15} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <TouchableOpacity style={[st.saveBtn, { backgroundColor: A, flex: 1 }]} onPress={openNewCategory}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={st.saveBtnText}>Ajouter une catégorie</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.saveBtn, { backgroundColor: '#7C3AED12', borderWidth: 1, borderColor: '#7C3AED30' }]} onPress={resetCategories}>
              <Ionicons name="refresh-outline" size={16} color="#7C3AED" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── INFORMATIONS ────────────────────────────────────────── */}
        <View style={card}>
          <SectionHeader icon="information-circle-outline" title="Informations" accent={A} />
          {[
            { icon: 'people-outline',     label: 'Citoyens inscrits',   value: String(users.length)   },
            { icon: 'documents-outline',  label: 'Total signalements',  value: String(reports.length) },
            { icon: 'code-slash-outline', label: 'Version application', value: '1.0.0'               },
            { icon: 'server-outline',     label: 'Base de données',     value: 'Firebase Firestore'  },
          ].map((item, i, arr) => (
            <View key={item.label}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
                <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: isDark ? '#2A3D30' : '#F5F6F5', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: isDark ? '#3A5040' : '#E4E8E4' }}>
                  <Ionicons name={item.icon as any} size={16} color={textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: textMuted }}>{item.label}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: textMain }}>{item.value}</Text>
                </View>
              </View>
              {i < arr.length - 1 && <View style={{ height: 1, backgroundColor: isDark ? '#2A3D30' : '#E4E8E4' }} />}
            </View>
          ))}
        </View>

        {/* ── DANGER ──────────────────────────────────────────────── */}
        <View style={[card, { borderColor: '#FECACA' }]}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#DC2626', marginBottom: 12 }}>Zone danger</Text>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FEE2E2', borderRadius: radius.sm, padding: 14, borderWidth: 1, borderColor: '#FECACA' }}
            onPress={() => setLogoutModal(true)}>
            <Ionicons name="log-out-outline" size={18} color="#DC2626" />
            <Text style={{ color: '#DC2626', fontWeight: '600', fontSize: 14 }}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ── MODAL : CATÉGORIE ───────────────────────────────────── */}
      <Modal visible={editCatModal} transparent animationType="fade" onRequestClose={() => setEditCatModal(false)}>
        <View style={st.overlay}>
          <View style={[st.modal, isDark && { backgroundColor: '#1E2A23' }]}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: textMain, marginBottom: 16 }}>
              {editCatIndex !== null ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
            </Text>
            <Text style={[st.label, { color: textMuted }]}>Emoji</Text>
            <TextInput style={[st.input, { color: textMain, borderColor: A + '30', fontSize: 24, textAlign: 'center' }]}
              value={catEmoji} onChangeText={setCatEmoji} placeholder="🗑️" placeholderTextColor={textMuted} maxLength={2} />
            <Text style={[st.label, { color: textMuted, marginTop: 10 }]}>Nom de la catégorie</Text>
            <TextInput style={[st.input, { color: textMain, borderColor: A + '30' }]}
              value={catLabel} onChangeText={setCatLabel} placeholder="ex: Plastique" placeholderTextColor={textMuted} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={[st.saveBtn, { backgroundColor: '#E4E8E4', flex: 1 }]} onPress={() => setEditCatModal(false)}>
                <Text style={{ fontWeight: '600', color: '#4B5E52' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.saveBtn, { backgroundColor: A, flex: 1, opacity: catLabel.trim() ? 1 : 0.5 }]}
                onPress={saveCategory} disabled={!catLabel.trim()}>
                <Text style={st.saveBtnText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL : LOGOUT ──────────────────────────────────────── */}
      <Modal visible={logoutModal} transparent animationType="fade" onRequestClose={() => setLogoutModal(false)}>
        <View style={st.overlay}>
          <View style={[st.modal, isDark && { backgroundColor: '#1E2A23' }]}>
            <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 16 }}>
              <Ionicons name="log-out" size={26} color="#DC2626" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: textMain, textAlign: 'center', marginBottom: 8 }}>Se déconnecter ?</Text>
            <Text style={{ fontSize: 14, color: textMuted, textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
              Vous devrez entrer vos identifiants pour accéder à nouveau au panneau admin.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[st.saveBtn, { flex: 1, backgroundColor: '#F5F6F5', borderWidth: 1, borderColor: '#E4E8E4' }]}
                onPress={() => setLogoutModal(false)}>
                <Text style={{ fontWeight: '600', color: '#4B5E52' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.saveBtn, { flex: 1, backgroundColor: '#DC2626' }]}
                onPress={() => { setLogoutModal(false); logoutAdmin(); }}>
                <Text style={st.saveBtnText}>Déconnecter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  root: { flex: 1 },
  header: {
    backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderBottomWidth: 1, borderBottomColor: '#E4E8E4',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: radius.xs,
    backgroundColor: '#F5F6F5', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#E4E8E4',
  },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: radius.md, padding: 18,
    borderWidth: 1, borderColor: '#E4E8E4',
  },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
  input: {
    borderWidth: 1, borderRadius: radius.sm,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    marginBottom: 4,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: radius.sm, height: 44, paddingHorizontal: 16, marginTop: 0,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  colorSwatch: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },

  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 4 },
  emojiBtn: {
    width: 48, height: 48, borderRadius: radius.sm,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#E4E8E4', backgroundColor: '#F5F6F5',
  },

  themeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: '#E4E8E4',
    backgroundColor: '#F5F6F5',
  },

  chip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.sm,
    borderWidth: 1, borderColor: '#E4E8E4', backgroundColor: '#F5F6F5',
  },

  widgetRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 10,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F6F5',
  },

  coinsInput: {
    width: 72, height: 44, borderRadius: radius.sm, borderWidth: 1,
    fontSize: 20, fontWeight: '800', textAlign: 'center',
    paddingHorizontal: 8,
  },

  catRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1,
  },
  catBtn: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: '#F5F6F5',
    justifyContent: 'center', alignItems: 'center',
  },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modal: { backgroundColor: '#FFFFFF', borderRadius: radius.lg, padding: 24, width: '100%', maxWidth: 400 },
});
