import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, Platform,
  RefreshControl, Linking, AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useAdmin } from '../../context/AdminContext';
import { useAdminPrefs } from '../../context/AdminPrefsContext';
import * as Haptics from 'expo-haptics';

const DEFAULT_API      = 'https://synecious-denita-unlecherously.ngrok-free.dev';
const DEFAULT_FRONTEND = 'https://mon-dashboard-theta.vercel.app';

function openUrl(url: string, jwtToken?: string | null) {
  const finalUrl = jwtToken
    ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(jwtToken)}`
    : url;
  if (Platform.OS === 'web') {
    window.location.href = finalUrl;
  } else {
    Linking.openURL(finalUrl);
  }
}
const TOKEN_KEY        = '@dashboard_api_token';
const EMAIL_KEY        = '@dashboard_api_email';
const PASSWORD_KEY     = '@dashboard_api_password';
const URL_KEY          = '@dashboard_api_url';
const FRONTEND_KEY     = '@dashboard_frontend_url';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatsOverview {
  totals: {
    users: number;
    dashboards: number;
    widgets: number;
    datasets: number;
    dataSources: number;
  };
  activity: {
    newUsersLast30Days: number;
    dashboardsCreatedLast7Days: number;
    activeShares: number;
    publicDashboards: number;
  };
  generatedAt: string;
}

interface Dashboard {
  id: number;
  name: string;
  isPublic: boolean;
  shareToken: string | null;
  createdAt: string;
  widgetCount: number;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

function isLocalhostBlocked(apiUrl: string): boolean {
  if (Platform.OS !== 'web') return false;
  const isLocalTarget = apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1');
  const isRemoteOrigin = typeof window !== 'undefined' &&
    !window.location.hostname.includes('localhost') &&
    !window.location.hostname.includes('127.0.0.1');
  return isLocalTarget && isRemoteOrigin;
}

function ngrokHeaders(extra?: Record<string, string>) {
  return { 'ngrok-skip-browser-warning': 'true', ...extra };
}

async function apiLogin(apiUrl: string, email: string, password: string): Promise<string> {
  const res = await fetch(`${apiUrl}/api/auth/login`, {
    method: 'POST',
    headers: ngrokHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || 'Identifiants incorrects');
  return json.data?.token ?? json.token;
}

/** Sanitize error messages — strip any URL/host fragments so they never appear in the UI or crash reports */
function sanitizeError(e: unknown, fallback = 'Erreur de connexion'): string {
  const msg = e instanceof Error ? e.message : String(e ?? fallback);
  // Remove anything that looks like a URL (http(s)://...) to avoid leaking the tunnel address
  return msg.replace(/https?:\/\/[^\s"')]+/gi, '[url]').replace(/localhost:\d+/gi, '[local]') || fallback;
}

async function apiFetch<T>(apiUrl: string, path: string, token: string): Promise<T> {
  const res = await fetch(`${apiUrl}${path}`, {
    headers: ngrokHeaders({ Authorization: `Bearer ${token}` }),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(json?.error ?? json?.message ?? `Erreur ${res.status}`);
  return json.data ?? json;
}

// ─── Login screen ─────────────────────────────────────────────────────────────

function LoginPanel({ onLogin, savedUrl }: { onLogin: (token: string, email: string, apiUrl: string) => void; savedUrl: string }) {
  const [apiUrl, setApiUrl]     = useState(savedUrl || DEFAULT_API);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showUrlEdit, setShowUrlEdit] = useState(false);

  const blocked = isLocalhostBlocked(apiUrl);

  async function handleLogin() {
    if (blocked) { setError("Impossible d'atteindre localhost depuis Vercel."); return; }
    if (!email || !password) { setError('Remplissez tous les champs.'); return; }
    setLoading(true); setError('');
    try {
      const token = await apiLogin(apiUrl, email, password);
      await AsyncStorage.setItem(TOKEN_KEY, token);
      await AsyncStorage.setItem(EMAIL_KEY, email);
      await AsyncStorage.setItem(PASSWORD_KEY, password);
      await AsyncStorage.setItem(URL_KEY, apiUrl);
      onLogin(token, email, apiUrl);
    } catch (e: any) {
      setError(sanitizeError(e, 'Erreur de connexion'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={lStyles.container}>
      <View style={lStyles.iconWrap}>
        <Ionicons name="grid-outline" size={48} color="#6366F1" />
      </View>
      <Text style={lStyles.title}>Dashboard Generator</Text>
      <Text style={lStyles.sub}>Connectez-vous à votre API Dashboard</Text>

      {/* URL row */}
      <TouchableOpacity style={lStyles.urlRow} onPress={() => setShowUrlEdit(v => !v)}>
        <Ionicons name="server-outline" size={14} color="#6366F1" />
        <Text style={lStyles.hint} numberOfLines={1}>{apiUrl}</Text>
        <Ionicons name={showUrlEdit ? 'chevron-up' : 'pencil-outline'} size={14} color="#9CA3AF" />
      </TouchableOpacity>

      {showUrlEdit && (
        <TextInput
          style={[lStyles.input, { marginBottom: 6 }]}
          placeholder="URL de l'API (ex: https://xxx.ngrok.io)"
          placeholderTextColor="#9CA3AF"
          value={apiUrl}
          onChangeText={setApiUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />
      )}

      {/* Blocked warning */}
      {blocked && (
        <View style={lStyles.warnBox}>
          <Ionicons name="warning-outline" size={18} color="#D97706" />
          <View style={{ flex: 1 }}>
            <Text style={lStyles.warnTitle}>localhost inaccessible depuis Vercel</Text>
            <Text style={lStyles.warnText}>
              Le navigateur bloque les appels vers localhost depuis un site distant.{'\n\n'}
              <Text style={{ fontWeight: '700' }}>Solutions :{'\n'}</Text>
              {'1. '}<Text style={{ fontWeight: '600' }}>ngrok</Text> — exposez l'API publiquement :{'\n'}
              {'   '}ngrok http 5144{'\n'}
              {'   '}puis collez l'URL ngrok ci-dessus.{'\n\n'}
              {'2. Lancez PoubCoin en local '}(<Text style={{ fontStyle: 'italic' }}>npx expo start</Text>
              {') et accédez via http://localhost:8081.'}
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://ngrok.com/download')}>
              <Text style={lStyles.ngrokLink}>Télécharger ngrok ↗</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!blocked && (
        <>
          <TextInput
            style={lStyles.input}
            placeholder="Email"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={lStyles.input}
            placeholder="Mot de passe"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {!!error && <Text style={lStyles.error}>{error}</Text>}
          <TouchableOpacity style={lStyles.btn} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={lStyles.btnText}>Se connecter</Text>}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const lStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  iconWrap:  { width: 80, height: 80, borderRadius: 20, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title:     { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 6 },
  sub:       { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  urlRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 14, width: '100%' },
  hint:      { flex: 1, fontSize: 12, color: '#6366F1', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  warnBox:   { flexDirection: 'row', gap: 10, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FCD34D', borderRadius: 12, padding: 14, marginBottom: 16, width: '100%' },
  warnTitle: { fontSize: 14, fontWeight: '700', color: '#92400E', marginBottom: 6 },
  warnText:  { fontSize: 13, color: '#78350F', lineHeight: 20 },
  ngrokLink: { color: '#6366F1', fontWeight: '700', fontSize: 13, marginTop: 10 },
  input:     { width: '100%', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#111827', marginBottom: 12 },
  error:     { color: '#EF4444', fontSize: 13, marginBottom: 8 },
  btn:       { backgroundColor: '#6366F1', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40, marginTop: 6, minWidth: 200, alignItems: 'center' },
  btnText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number | string; color: string }) {
  return (
    <View style={[sStyles.card, { borderLeftColor: color }]}>
      <Ionicons name={icon as any} size={22} color={color} />
      <Text style={sStyles.value}>{value}</Text>
      <Text style={sStyles.label}>{label}</Text>
    </View>
  );
}

const sStyles = StyleSheet.create({
  card:  { flex: 1, minWidth: 130, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderLeftWidth: 4, margin: 5, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  value: { fontSize: 24, fontWeight: '800', color: '#111827', marginTop: 8 },
  label: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});

// ─── Dashboard card ───────────────────────────────────────────────────────────

const CARD_ACCENTS = ['#0EA5E9', '#6366F1', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

const WIDGET_PREVIEW_COLORS = ['#0EA5E9','#6366F1','#10B981','#F59E0B','#8B5CF6','#EC4899'];
const GRID_LAYOUTS = [
  [{ w: 2, h: 2 }, { w: 1, h: 1 }, { w: 1, h: 1 }, { w: 1, h: 1 }, { w: 1, h: 1 }, { w: 2, h: 1 }],
  [{ w: 1, h: 2 }, { w: 1, h: 1 }, { w: 2, h: 1 }, { w: 1, h: 1 }, { w: 1, h: 2 }, { w: 2, h: 1 }],
];

function DashboardCard({ dash, onOpen, index }: { dash: Dashboard; onOpen: () => void; index: number }) {
  const created = new Date(dash.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  const accent  = CARD_ACCENTS[index % CARD_ACCENTS.length];
  const layout  = GRID_LAYOUTS[index % GRID_LAYOUTS.length];
  const blocks  = Math.min(dash.widgetCount, 6);

  return (
    <TouchableOpacity style={dStyles.card} onPress={onOpen} activeOpacity={0.78}>
      {/* Mini dashboard preview area */}
      <View style={[dStyles.preview, { backgroundColor: accent + '08' }]}>
        <View style={dStyles.previewGrid}>
          {Array.from({ length: blocks }).map((_, i) => {
            const cell = layout[i] ?? { w: 1, h: 1 };
            const color = WIDGET_PREVIEW_COLORS[i % WIDGET_PREVIEW_COLORS.length];
            return (
              <View key={i} style={[dStyles.gridCell,
                { backgroundColor: color + '22', borderColor: color + '55',
                  width: cell.w === 2 ? 54 : 24,
                  height: cell.h === 2 ? 36 : 16 }
              ]}>
                <View style={[dStyles.gridDot, { backgroundColor: color }]} />
              </View>
            );
          })}
          {dash.widgetCount === 0 && (
            <View style={dStyles.emptyGrid}>
              <Ionicons name="grid-outline" size={18} color={accent + '60'} />
            </View>
          )}
        </View>
        {/* Widget count pill */}
        <View style={[dStyles.countPill, { backgroundColor: accent }]}>
          <Text style={dStyles.countPillText}>{dash.widgetCount}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={dStyles.cardContent}>
        <View style={dStyles.cardTop}>
          <Text style={dStyles.name} numberOfLines={2}>{dash.name}</Text>
          {dash.isPublic
            ? <View style={dStyles.badgePublic}><Ionicons name="earth-outline" size={9} color="#065F46" /></View>
            : <View style={dStyles.badgePrivate}><Ionicons name="lock-closed-outline" size={9} color="#9CA3AF" /></View>
          }
        </View>
        <View style={dStyles.metaRow}>
          <Ionicons name="calendar-outline" size={10} color="#94A3B8" />
          <Text style={dStyles.meta}>{created}</Text>
        </View>
        <View style={dStyles.cardFooter}>
          <Text style={[dStyles.widgetLabel, { color: accent }]}>
            {dash.widgetCount} widget{dash.widgetCount !== 1 ? 's' : ''}
          </Text>
          <View style={[dStyles.openChip, { backgroundColor: accent + '15' }]}>
            <Ionicons name="arrow-forward" size={11} color={accent} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const dStyles = StyleSheet.create({
  card:        { backgroundColor: '#fff', borderRadius: 20, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.09, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 5, flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9' },
  preview:     { width: 110, padding: 10, justifyContent: 'center', position: 'relative' },
  previewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, alignContent: 'center', justifyContent: 'center' },
  gridCell:    { borderRadius: 5, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  gridDot:     { width: 4, height: 4, borderRadius: 2 },
  emptyGrid:   { alignItems: 'center', justifyContent: 'center', flex: 1 },
  countPill:   { position: 'absolute', bottom: 8, right: 8, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  countPillText:{ fontSize: 9, color: '#fff', fontWeight: '800' },
  cardContent: { flex: 1, padding: 14, justifyContent: 'space-between' },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  name:        { flex: 1, fontSize: 14, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3, lineHeight: 20 },
  metaRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  meta:        { fontSize: 11, color: '#94A3B8' },
  cardFooter:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  widgetLabel: { fontSize: 11, fontWeight: '700' },
  openChip:    { width: 22, height: 22, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  badgePublic: { backgroundColor: '#D1FAE5', borderRadius: 8, padding: 4 },
  badgePrivate:{ backgroundColor: '#F1F5F9', borderRadius: 8, padding: 4 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

// ─── PoubCoin dashboard generator ────────────────────────────────────────────

// ─── Export PoubCoin → AI analyze ────────────────────────────────────────────

async function exportToAI(
  apiUrl: string, token: string,
  reports: any[], users: any[], challenges: any[]
): Promise<{ id: number; name: string }> {
  const now = new Date();

  // Map userId → displayName depuis la liste des utilisateurs
  const userNameMap: Record<string, string> = {};
  users.forEach((u: any) => {
    const uid = u.id ?? u.uid ?? u.userId;
    const name = u.displayName ?? u.name ?? u.userName ?? u.email ?? '';
    if (uid && name) userNameMap[uid] = name;
  });
  const resolveName = (r: any): string =>
    r.userName || userNameMap[r.userId] || userNameMap[r.citizenId] || r.userId || 'anonyme';

  // Construire les lignes CSV depuis les signalements
  const columns = ['date', 'statut', 'zone', 'coins', 'citoyen'];
  const rows = reports.map(r => {
    const d = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt ?? now);
    return {
      date:    d.toISOString().split('T')[0],
      statut:  r.status ?? 'inconnu',
      zone:    r.address?.split(',')[0] ?? r.municipalityName ?? r.zone ?? r.location ?? '',
      coins:   String(r.coins ?? 0),
      citoyen: resolveName(r),
    };
  });

  // Ajouter des lignes résumé utilisateurs
  users.forEach(u => {
    rows.push({
      date:    now.toISOString().split('T')[0],
      statut:  'utilisateur',
      zone:    u.municipality ?? 'Ville',
      coins:   String(u.coins ?? 0),
      citoyen: u.displayName ?? u.email ?? 'citoyen',
    });
  });

  const dataset = { fileName: `PoubCoin_${now.toLocaleDateString('fr-FR').replace(/\//g, '-')}.csv`, columns, rows };

  const res = await fetch(`${apiUrl}/api/datasets/ai-analyze`, {
    method: 'POST',
    headers: ngrokHeaders({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }),
    body: JSON.stringify([dataset]),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message ?? `Erreur ${res.status}`);
  return { id: json?.id ?? json?.data?.id, name: json?.name ?? json?.data?.name ?? 'Dashboard IA' };
}

async function createPoubCoinDashboard(
  apiUrl: string, token: string,
  reports: any[], users: any[], challenges: any[]
): Promise<number> {
  const now = new Date();

  // Stats calculées depuis les données PoubCoin
  const totalReports   = reports.length;
  const validated      = reports.filter(r => r.status === 'validated').length;
  const pending        = reports.filter(r => r.status === 'pending').length;
  const rejected       = reports.filter(r => r.status === 'rejected').length;
  const totalCoins     = reports.filter(r => r.status === 'validated').reduce((s, r) => s + (r.coins ?? 0), 0);
  const totalUsers     = users.length;
  const activeChall    = challenges.filter(c => c.active).length;

  // Rapports par jour (7 derniers jours)
  const days: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    days[d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })] = 0;
  }
  reports.forEach(r => {
    const d = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diff <= 6) {
      const key = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
      if (key in days) days[key]++;
    }
  });

  // Rapports par zone (top 5) — même logique que dsRows pour la cohérence
  const zones: Record<string, number> = {};
  reports.forEach(r => {
    const zone = (r.address?.split(',')[0]?.trim() ?? r.municipalityName ?? r.zone ?? r.location ?? '').trim();
    if (zone) zones[zone] = (zones[zone] ?? 0) + 1;
  });
  const topZones = Object.entries(zones).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Résolution UID → nom affiché
  const userNameMap: Record<string, string> = {};
  users.forEach((u: any) => {
    const uid  = u.id ?? u.uid ?? u.userId;
    const name = u.displayName ?? u.name ?? u.userName ?? u.email ?? '';
    if (uid && name) userNameMap[uid] = name;
  });
  const resolveName = (r: any): string =>
    r.userName || userNameMap[r.userId] || userNameMap[r.citizenId] || r.userId || 'anonyme';

  // Colonnes PoubCoin exposées au builder DashGen
  const POUBCOIN_COLUMNS = [
    { name: 'date',            type: 'date'     },
    { name: 'statut',          type: 'category' },
    { name: 'zone',            type: 'category' },
    { name: 'adresse',         type: 'string'   },
    { name: 'municipalite',    type: 'category' },
    { name: 'coins',           type: 'number'   },
    { name: 'citoyen',         type: 'category' },
    { name: 'latitude',        type: 'number'   },
    { name: 'longitude',       type: 'number'   },
    { name: 'multiplicateur',  type: 'number'   },
    { name: 'date_validation', type: 'date'     },
    { name: 'commentaire',     type: 'string'   },
  ];

  // 1. Créer un DataSource JSON avec les données brutes + colonnes
  //    Le builder DashGen lit dashboard.datasetId → GET /api/datasource/{id}
  //    et affiche les colonnes + données du champ CachedDataJson.
  let datasetId = 0;
  try {
    const dsRows = reports.map(r => ({
      date:            r.createdAt?.toDate ? r.createdAt.toDate().toISOString().split('T')[0] : String(r.createdAt ?? ''),
      statut:          String(r.status ?? ''),
      zone:            String(r.address?.split(',')[0] ?? r.municipalityName ?? r.zone ?? r.location ?? ''),
      adresse:         String(r.address ?? ''),
      municipalite:    String(r.municipalityName ?? ''),
      coins:           String(r.coins ?? 0),
      citoyen:         resolveName(r),
      latitude:        String(r.latitude ?? ''),
      longitude:       String(r.longitude ?? ''),
      multiplicateur:  String(r.streakMultiplier ?? 1),
      date_validation: r.validatedAt?.toDate ? r.validatedAt.toDate().toISOString().split('T')[0] : '',
      commentaire:     String(r.adminComment ?? ''),
    }));
    const dsRes = await fetch(`${apiUrl}/api/datasource/from-json`, {
      method: 'POST',
      headers: ngrokHeaders({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }),
      body: JSON.stringify({
        name: `PoubCoin — ${now.toLocaleDateString('fr-FR')}`,
        description: 'Données PoubCoin',
        columns: POUBCOIN_COLUMNS,
        rows: dsRows,
      }),
    });
    const dsJson = await dsRes.json();
    datasetId = dsJson?.id ?? dsJson?.Id ?? dsJson?.data?.id ?? 0;
  } catch { /* datasource creation failed — continue without it */ }

  // 2. Créer le dashboard (lié au datasource)
  const dashRes = await fetch(`${apiUrl}/api/dashboard`, {
    method: 'POST',
    headers: ngrokHeaders({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }),
    body: JSON.stringify({
      name: `PoubCoin — ${now.toLocaleDateString('fr-FR')}`,
      description: 'Dashboard généré automatiquement depuis les données PoubCoin',
      datasetId: datasetId || undefined,
      columns: POUBCOIN_COLUMNS.map(c => c.name),
    }),
  });
  const dashJson = await dashRes.json();
  const dashId: number = dashJson?.data?.id ?? dashJson?.id;
  if (!dashId) throw new Error('Création dashboard échouée');

  // 3. Créer les widgets avec data (viewer) ET config (builder)
  // Le viewer lit widget.data (snapshot), le builder recompute via config.
  // "config" correspond au champ Config du modèle backend Widget.
  const widgets = [
    {
      type: 'kpi', title: 'Total Signalements',
      data: JSON.stringify({ title: 'Total Signalements', value: totalReports, suffix: ' signalements', icon: 'bar' }),
      config: JSON.stringify({ aggregation: 'count', kpiIcon: 'bar', kpiSuffix: ' signalements', color: '#1B6B3A' }),
    },
    {
      type: 'kpi', title: 'Signalements validés',
      data: JSON.stringify({ title: 'Signalements validés', value: validated, suffix: ' validés', icon: 'check' }),
      config: JSON.stringify({ filter: { column: 'statut', value: 'validated' }, aggregation: 'count', kpiIcon: 'check', kpiSuffix: ' validés', color: '#10B981' }),
    },
    {
      type: 'kpi', title: 'Coins distribués',
      data: JSON.stringify({ title: 'Coins distribués', value: totalCoins, suffix: ' 🪙', icon: 'dollar' }),
      config: JSON.stringify({ yAxis: 'coins', aggregation: 'sum', kpiIcon: 'dollar', kpiSuffix: ' 🪙', color: '#F59E0B' }),
    },
    {
      type: 'kpi', title: 'Citoyens inscrits',
      data: JSON.stringify({ title: 'Citoyens inscrits', value: totalUsers, suffix: ' citoyens', icon: 'users' }),
      config: JSON.stringify({ yAxis: 'citoyen', aggregation: 'count_distinct', kpiIcon: 'users', kpiSuffix: ' citoyens', color: '#6366F1' }),
    },
    {
      type: 'pie', title: 'Statut des signalements',
      data: JSON.stringify([
        { label: 'Validés',    value: validated },
        { label: 'En attente', value: pending   },
        { label: 'Rejetés',   value: rejected  },
      ]),
      config: JSON.stringify({ xAxis: 'statut', aggregation: 'count', color: '#1B6B3A' }),
    },
    {
      type: 'bar', title: 'Signalements — 7 derniers jours',
      data: JSON.stringify(Object.entries(days).map(([label, value]) => ({ label, value }))),
      config: JSON.stringify({ xAxis: 'date', aggregation: 'count', dateGranularity: 'day', color: '#1B6B3A', sortBy: 'label', sortDir: 'asc' }),
    },
    {
      type: 'bar', title: 'Signalements par zone',
      data: JSON.stringify(
        topZones.length > 0
          ? topZones.map(([label, value]) => ({ label, value }))
          : [{ label: 'Aucune donnée', value: 0 }]
      ),
      config: JSON.stringify({ xAxis: 'zone', aggregation: 'count', color: '#0EA5E9', sortBy: 'value', sortDir: 'desc', maxItems: 5 }),
    },
  ];

  for (const w of widgets) {
    await fetch(`${apiUrl}/api/widget`, {
      method: 'POST',
      headers: ngrokHeaders({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }),
      body: JSON.stringify({ dashboardId: dashId, ...w }),
    });
  }

  return dashId;
}

export default function AdminDashboardAPIScreen({ navigation }: any) {
  const { reports, users, challenges } = useAdmin();
  const { accentColor } = useAdminPrefs();
  const AC  = accentColor;           // accent principal
  const ACL = AC + '20';             // fond léger
  const ACD = AC + 'DD';             // accent foncé pour gradient
  const [token, setToken]           = useState<string | null>(null);
  const [apiUrl, setApiUrl]         = useState(DEFAULT_API);
  const [savedUrl, setSavedUrl]     = useState(DEFAULT_API);
  const [frontendUrl, setFrontendUrl] = useState(DEFAULT_FRONTEND);
  const [email, setEmail]           = useState('');
  const [stats, setStats]           = useState<StatsOverview | null>(null);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading]       = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [detailDash, setDetailDash] = useState<Dashboard | null>(null);
  const [creating, setCreating]     = useState(false);
  const [exporting, setExporting]   = useState(false);
  // Skip data fetches while app is backgrounded
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => { appState.current = next; });
    return () => sub.remove();
  }, []);

  // Auto-login with hardcoded admin credentials on mount
  useEffect(() => {
    const ADMIN_EMAIL = 'admin@test.com';
    const ADMIN_PASSWORD = 'Admin123!';
    AsyncStorage.multiGet([TOKEN_KEY, URL_KEY, FRONTEND_KEY]).then(async pairs => {
      const map = Object.fromEntries(pairs.map(([k, v]) => [k, v]));
      const url = map[URL_KEY] ?? DEFAULT_API;
      setApiUrl(url); setSavedUrl(url);
      const savedFrontend = map[FRONTEND_KEY];
      if (savedFrontend && !savedFrontend.includes('localhost')) setFrontendUrl(savedFrontend);
      else setFrontendUrl(DEFAULT_FRONTEND);
      if (map[TOKEN_KEY]) {
        setToken(map[TOKEN_KEY]!); setEmail(ADMIN_EMAIL);
      } else {
        try {
          const token = await apiLogin(url, ADMIN_EMAIL, ADMIN_PASSWORD);
          await AsyncStorage.setItem(TOKEN_KEY, token);
          setToken(token); setEmail(ADMIN_EMAIL);
        } catch { /* show login panel as fallback */ }
      }
    });
  }, []);

  const loadData = useCallback(async (jwt: string, url: string, silent = false) => {
    // Don't fetch while app is in background — saves battery and avoids stale state
    if (appState.current !== 'active') return;
    if (!silent) setLoading(true);
    setError('');
    try {
      const [statsRes, dashRes] = await Promise.all([
        apiFetch<any>(url, '/api/stats/overview', jwt).catch(() => null),
        apiFetch<any>(url, '/api/admin/dashboards', jwt),
      ]);
      if (statsRes) setStats(statsRes.data ?? statsRes);
      const list = dashRes?.data ?? dashRes?.items ?? dashRes;
      setDashboards(Array.isArray(list) ? list : []);
    } catch (e: any) {
      if (__DEV__) console.warn('[AdminDashboardAPI] loadData error:', e);
      if (e.message?.includes('401') || e.message?.includes('Unauthorized')) {
        // Show expiry banner rather than silently redirecting to login
        setSessionExpired(true);
        await AsyncStorage.removeItem(TOKEN_KEY);
      } else {
        setError(sanitizeError(e, 'Erreur de chargement'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { if (token) loadData(token, apiUrl); }, [token]);

  // When session expires: auto-login with saved credentials, or fall back to login panel
  useEffect(() => {
    if (!sessionExpired) return;
    AsyncStorage.multiGet([EMAIL_KEY, PASSWORD_KEY, URL_KEY]).then(async pairs => {
      const map = Object.fromEntries(pairs.map(([k, v]) => [k, v]));
      if (map[EMAIL_KEY] && map[PASSWORD_KEY]) {
        try {
          const url = map[URL_KEY] ?? DEFAULT_API;
          const token = await apiLogin(url, map[EMAIL_KEY]!, map[PASSWORD_KEY]!);
          await AsyncStorage.setItem(TOKEN_KEY, token);
          setToken(token); setEmail(map[EMAIL_KEY]!); setSessionExpired(false);
          return;
        } catch { /* fall through to login panel */ }
      }
      setToken(null); setSessionExpired(false);
    });
  }, [sessionExpired]);

  function handleLogin(jwt: string, mail: string, url: string) {
    setToken(jwt); setEmail(mail); setApiUrl(url);
    loadData(jwt, url);
  }

  async function handleLogout() {
    await AsyncStorage.multiRemove([TOKEN_KEY, EMAIL_KEY, PASSWORD_KEY, URL_KEY]);
    setToken(null); setStats(null); setDashboards([]);
  }

  async function handleExportToAI() {
    if (!token) return;
    setExporting(true);
    try {
      const { id } = await exportToAI(apiUrl, token, reports, users, challenges);
      await loadData(token, apiUrl, true);
      openUrl(`${frontendUrl}/dashboard/${id}`, token);
    } catch (e: any) {
      setError(sanitizeError(e, 'Erreur export IA'));
    } finally {
      setExporting(false);
    }
  }

  async function handleCreateDashboard() {
    if (!token) return;
    setCreating(true);
    setError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const dashId = await createPoubCoinDashboard(apiUrl, token, reports, users, challenges);
      await loadData(token, apiUrl, true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      openUrl(`${frontendUrl}/dashboard/${dashId}?source=poubcoin`, token);
    } catch (e: any) {
      const msg = sanitizeError(e, 'Erreur création dashboard');
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert('Échec de la création', msg, [{ text: 'OK' }]);
    } finally {
      setCreating(false);
    }
  }

  if (!token) {
    return (
      <SafeAreaView style={styles.safe}>
        {sessionExpired && (
          <View style={styles.sessionBanner}>
            <Ionicons name="lock-closed-outline" size={16} color="#fff" />
            <Text style={styles.sessionBannerText}>Session expirée — veuillez vous reconnecter</Text>
          </View>
        )}
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <LoginPanel onLogin={handleLogin} savedUrl={savedUrl} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header with decorative blobs ── */}
      <LinearGradient colors={[AC + 'EE', AC + '99', AC + '55']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        {/* Decorative circles */}
        <View style={styles.blob1} />
        <View style={styles.blob2} />
        <View style={styles.blob3} />

        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>

        <View style={styles.headerBody}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="grid" size={26} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Dashboard Generator</Text>
            <Text style={styles.headerSub} numberOfLines={1}>{email}</Text>
          </View>
        </View>

        {/* Inline stats pills */}
        {stats && (
          <View style={styles.headerPills}>
            {[
              { val: stats.totals.dashboards, label: 'Dash' },
              { val: stats.totals.widgets,    label: 'Widgets' },
              { val: stats.totals.users,      label: 'Users' },
              { val: stats.activity.activeShares, label: 'Partagés' },
            ].map((s, i) => (
              <View key={i} style={styles.pill}>
                <Text style={styles.pillVal}>{s.val}</Text>
                <Text style={styles.pillLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Curved bottom */}
        <View style={styles.headerCurve} />
      </LinearGradient>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={AC} />
          <Text style={styles.loadingText}>Chargement…</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(token!, apiUrl, true); }} tintColor={AC} />}
        >
          {!!error && (
            <View style={styles.errorBanner}>
              <Ionicons name="warning-outline" size={18} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* ── Actions label ── */}
          <Text style={styles.sectionLabel}>ACTIONS RAPIDES</Text>

          {/* ── CTA row (side by side on wide, stacked compact) ── */}
          <View style={styles.ctaSection}>
            <TouchableOpacity style={[styles.ctaCard, { shadowColor: AC, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 }]} onPress={handleCreateDashboard} disabled={creating} activeOpacity={0.82}>
              <LinearGradient colors={[AC, ACD]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaGrad}>
                <View style={styles.ctaIconCircle}>
                  {creating ? <ActivityIndicator color="#fff" size="small" />
                    : <Ionicons name="add-circle" size={24} color="#fff" />}
                </View>
                <Text style={styles.ctaTitle}>{creating ? 'Génération…' : 'Créer'}</Text>
                <Text style={styles.ctaSub}>{reports.length} signalements</Text>
                <View style={styles.ctaBadge}>
                  <Ionicons name="arrow-up-outline" size={12} color="#fff" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.ctaCard, styles.ctaViolet]} onPress={handleExportToAI} disabled={exporting} activeOpacity={0.82}>
              <LinearGradient colors={['#7C3AED', '#4C1D95']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaGrad}>
                <View style={styles.ctaIconCircle}>
                  {exporting ? <ActivityIndicator color="#fff" size="small" />
                    : <Ionicons name="sparkles" size={22} color="#DDD6FE" />}
                </View>
                <Text style={styles.ctaTitle}>{exporting ? 'Analyse…' : 'Gemini IA'}</Text>
                <Text style={styles.ctaSub}>Insights auto</Text>
                <View style={[styles.ctaBadge, { backgroundColor: 'rgba(167,139,250,0.3)' }]}>
                  <Ionicons name="flash-outline" size={12} color="#DDD6FE" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* ── Activity mini-cards ── */}
          {stats && (
            <View style={styles.activityRow}>
              {[
                { icon: 'trending-up-outline', color: AC, bg: ACL, val: `+${stats.activity.newUsersLast30Days}`, label: 'Users/30j' },
                { icon: 'grid-outline',        color: '#6366F1', bg: '#EEF2FF', val: `+${stats.activity.dashboardsCreatedLast7Days}`, label: 'Dash/7j' },
                { icon: 'earth-outline',       color: '#F59E0B', bg: '#FEF3C7', val: `${stats.activity.publicDashboards}`, label: 'Publics' },
                { icon: 'share-social-outline',color: '#8B5CF6', bg: '#F5F3FF', val: `${stats.activity.activeShares}`, label: 'Partagés' },
              ].map((s, i) => (
                <View key={i} style={styles.miniCard}>
                  <View style={[styles.miniCardIcon, { backgroundColor: s.bg }]}>
                    <Ionicons name={s.icon as any} size={13} color={s.color} />
                  </View>
                  <Text style={styles.miniCardVal}>{s.val}</Text>
                  <Text style={styles.miniCardLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Dashboards section ── */}
          <View style={styles.sectionRow}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionDot, { backgroundColor: AC }]} />
              <Text style={styles.sectionTitle}>MES DASHBOARDS</Text>
              <View style={[styles.sectionCount, { backgroundColor: ACL }]}>
                <Text style={[styles.sectionCountText, { color: AC }]}>{dashboards.length}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => openUrl(frontendUrl, token)} style={[styles.openInterfaceBtn, { backgroundColor: AC, shadowColor: AC }]}>
              <Ionicons name="open-outline" size={12} color="#fff" />
              <Text style={styles.openInterfaceText}>Interface</Text>
            </TouchableOpacity>
          </View>

          {dashboards.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="grid-outline" size={32} color="#A78BFA" />
              </View>
              <Text style={styles.emptyText}>Aucun dashboard</Text>
              <Text style={styles.emptyHint}>Créez-en un avec le bouton ci-dessus</Text>
            </View>
          ) : (
            dashboards.map((d, i) => (
              <DashboardCard key={d.id} dash={d} index={i} onOpen={() => setDetailDash(d)} />
            ))
          )}
        </ScrollView>
      )}

      {/* Detail modal */}
      <Modal visible={!!detailDash} transparent animationType="slide" onRequestClose={() => setDetailDash(null)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayDismiss} onPress={() => setDetailDash(null)} activeOpacity={1} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />

            {/* Sheet header */}
            <LinearGradient colors={[ACL, AC + '30']} style={styles.sheetHeader}>
              <View style={[styles.sheetIconWrap, { backgroundColor: AC + '30' }]}>
                <Ionicons name="grid" size={22} color={AC} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle} numberOfLines={2}>{detailDash?.name}</Text>
                <View style={styles.sheetMeta}>
                  <Ionicons name="bar-chart-outline" size={12} color="#9CA3AF" />
                  <Text style={styles.metaText}>{detailDash?.widgetCount} widgets</Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
                  <Text style={styles.metaText}>{detailDash?.createdAt ? new Date(detailDash.createdAt).toLocaleDateString('fr-FR') : ''}</Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Ionicons name={detailDash?.isPublic ? 'earth-outline' : 'lock-closed-outline'} size={12} color={detailDash?.isPublic ? '#10B981' : '#9CA3AF'} />
                  <Text style={[styles.metaText, detailDash?.isPublic ? { color: '#10B981' } : {}]}>{detailDash?.isPublic ? 'Public' : 'Privé'}</Text>
                </View>
              </View>
            </LinearGradient>

            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => { setDetailDash(null); openUrl(`${frontendUrl}/dashboard/${detailDash!.id}`, token); }}>
                <LinearGradient colors={[AC, ACD]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionBtnGrad}>
                  <Ionicons name="grid-outline" size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>Ouvrir dans l'interface</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => { setDetailDash(null); openUrl(`${frontendUrl}/builder/${detailDash!.id}`, token); }}>
                <LinearGradient colors={['#4C1D95', '#6D28D9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionBtnGrad}>
                  <Ionicons name="construct-outline" size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>Modifier le dashboard</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setDetailDash(null)}>
              <Text style={styles.cancelText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// G/GD/GL sont maintenant calculés dynamiquement dans le composant via accentColor

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F8FAFC' },
  back:   { padding: 16 },
  sessionBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EF4444', paddingHorizontal: 16, paddingVertical: 10 },
  sessionBannerText: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 52 },

  // ── Header ──────────────────────────────────────────────
  header:       { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 36, overflow: 'hidden', position: 'relative' },
  blob1:        { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.07)', top: -40, right: -30 },
  blob2:        { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.05)', bottom: 10, left: -20 },
  blob3:        { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.08)', top: 30, right: 100 },
  headerCurve:  { position: 'absolute', bottom: -20, left: -10, right: -10, height: 40, backgroundColor: '#F8FAFC', borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  headerTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, zIndex: 1 },
  backBtn:      { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  logoutBtn:    { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  headerBody:   { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 22, zIndex: 1 },
  headerIconWrap:{ width: 54, height: 54, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  headerTitle:  { color: '#fff', fontSize: 21, fontWeight: '900', letterSpacing: -0.6 },
  headerSub:    { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 3 },
  headerPills:  { flexDirection: 'row', gap: 8, zIndex: 1 },
  pill:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 14, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  pillVal:      { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: -0.6 },
  pillLabel:    { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },

  // ── Loading / Error ──────────────────────────────────────
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#64748B', fontSize: 14 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 14, padding: 12, marginBottom: 14, gap: 8, borderWidth: 1, borderColor: '#FECACA' },
  errorText:   { color: '#EF4444', fontSize: 13, flex: 1 },

  // ── Section label ────────────────────────────────────────
  sectionLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 },

  // ── CTA side-by-side cards ───────────────────────────────
  ctaSection:    { flexDirection: 'row', gap: 10, marginBottom: 20 },
  ctaCard:       { flex: 1, borderRadius: 22, overflow: 'hidden' },
  ctaViolet:     { shadowColor: '#7C3AED', shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  ctaGrad:       { padding: 18, minHeight: 130, justifyContent: 'space-between' },
  ctaIconCircle: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  ctaTitle:      { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: -0.3 },
  ctaSub:        { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 2 },
  ctaBadge:      { position: 'absolute', top: 14, right: 14, width: 26, height: 26, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  // ── Activity mini-cards ──────────────────────────────────
  activityRow:    { flexDirection: 'row', gap: 8, marginBottom: 22 },
  miniCard:       { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 11, alignItems: 'center', gap: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  miniCardIcon:   { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 1 },
  miniCardVal:    { fontSize: 16, fontWeight: '900', color: '#0F172A', letterSpacing: -0.6 },
  miniCardLabel:  { fontSize: 8, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center' },

  // ── Section header ───────────────────────────────────────
  sectionRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitleRow:  { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sectionDot:       { width: 4, height: 16, borderRadius: 3 },
  sectionTitle:     { fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 },
  sectionCount:     { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 4 },
  sectionCountText: { fontSize: 11, fontWeight: '800' },
  openInterfaceBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 7, shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  openInterfaceText:{ fontSize: 12, color: '#fff', fontWeight: '700' },

  // ── Empty state ──────────────────────────────────────────
  empty:         { alignItems: 'center', padding: 48, gap: 10 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 24, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyText:     { fontSize: 16, color: '#1E293B', fontWeight: '700' },
  emptyHint:     { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },

  // ── Bottom sheet ─────────────────────────────────────────
  overlay:        { flex: 1, justifyContent: 'flex-end' },
  overlayDismiss: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet:          { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', paddingBottom: 36 },
  sheetHandle:    { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginTop: 14 },
  sheetHeader:    { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  sheetIconWrap:  { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sheetTitle:     { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 5, letterSpacing: -0.3 },
  sheetMeta:      { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  metaText:       { fontSize: 12, color: '#94A3B8' },
  metaDot:        { fontSize: 12, color: '#CBD5E1' },
  sheetActions:   { padding: 18, paddingTop: 16, gap: 10 },
  actionBtn:      { borderRadius: 16, overflow: 'hidden' },
  actionBtnGrad:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 10 },
  actionBtnText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtn:      { alignItems: 'center', paddingVertical: 14 },
  cancelText:     { color: '#94A3B8', fontSize: 15, fontWeight: '500' },
});
