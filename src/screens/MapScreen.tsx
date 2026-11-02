import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  Platform, Dimensions, ScrollView, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useWallet, Report } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { shadow, radius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useT } from '../i18n/useT';

const { width, height } = Dimensions.get('window');


// Native map component — loaded conditionally
let MapView: any = null;
let Marker: any = null;
let Circle: any = null;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Circle = Maps.Circle;
}

export default function MapScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const t = useT();

  const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
    validated: { color: '#4CAF50', label: t('map_validated') },
    pending:   { color: '#FF9800', label: t('map_pending') },
    rejected:  { color: '#E53935', label: t('map_rejected') },
  };
  const { reports: myReports } = useWallet();
  const { user } = useAuth();
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'validated'>('all');
  const [viewMode, setViewMode] = useState<'mine' | 'global'>('mine');
  const [heatmap, setHeatmap] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!heatmap) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 900, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [heatmap]);

  const [locDenied, setLocDenied] = useState(false);

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status === 'granted') {
        Location.getCurrentPositionAsync({}).then(loc => {
          setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }).catch(() => setLocDenied(true));
      } else {
        setLocDenied(true);
      }
    });
  }, []);

  useEffect(() => {
    if (viewMode !== 'global') return;
    const unsub = onSnapshot(query(collection(db, 'reports'), limit(500)), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Report));
      setAllReports(data);
    }, () => {
      setAllReports([]);
    });
    return unsub;
  }, [viewMode]);

  // Heatmap clustering
  const LAT_RANGE = [30, 38] as const;
  const LNG_RANGE = [7.5, 11.6] as const;
  const toPercent = (lat: number, lng: number) => ({
    topPct:  ((LAT_RANGE[1] - lat)  / (LAT_RANGE[1]  - LAT_RANGE[0]))  * 100,
    leftPct: ((lng - LNG_RANGE[0])  / (LNG_RANGE[1]  - LNG_RANGE[0]))  * 100,
  });
  const heatClusters = React.useMemo(() => {
    const src = viewMode === 'mine' ? myReports : allReports;
    const map: Record<string, { lat: number; lng: number; count: number }> = {};
    src.filter(r => r.latitude && r.longitude).forEach(r => {
      const key = `${r.latitude.toFixed(2)},${r.longitude.toFixed(2)}`;
      if (!map[key]) map[key] = { lat: r.latitude, lng: r.longitude, count: 0 };
      map[key].count++;
    });
    return Object.values(map);
  }, [myReports, allReports, viewMode]);

  const reports = viewMode === 'mine' ? myReports : allReports;
  const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter);
  const selectedReport = reports.find(r => r.id === selected);

  const INITIAL_REGION = {
    latitude: 36.8065,
    longitude: 10.1815,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  // Web fallback — OpenStreetMap iframe
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerCircle} />
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>{t('map_title')}</Text>
            <Text style={styles.headerSub}>{reports.length} signalement{reports.length > 1 ? 's' : ''} · Tunis</Text>
          </View>
          <View style={styles.headerStats}>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatNum}>{reports.filter(r=>r.status==='validated').length}</Text>
              <Text style={styles.headerStatLabel}>{t('map_validated')}</Text>
            </View>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatNum}>{reports.filter(r=>r.status==='pending').length}</Text>
              <Text style={styles.headerStatLabel}>{t('map_pending')}</Text>
            </View>
          </View>
        </View>

        {/* Location denied banner */}
        {locDenied && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#FDE68A' }}>
            <Ionicons name="location-outline" size={15} color="#B45309" />
            <Text style={{ flex: 1, fontSize: 12, color: '#92400E', fontWeight: '600' }}>Localisation non disponible — carte centrée sur Tunis</Text>
          </View>
        )}

        {/* View mode toggle */}
        <View style={styles.modeTabs}>
          <TouchableOpacity style={[styles.modeTab, viewMode === 'mine' && styles.modeTabActive]} onPress={() => setViewMode('mine')}>
            <Ionicons name="person" size={13} color={viewMode === 'mine' ? '#fff' : colors.textMuted} />
            <Text style={[styles.modeTabText, viewMode === 'mine' && styles.modeTabTextActive]}>{t('map_my_reports')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modeTab, viewMode === 'global' && styles.modeTabActive]} onPress={() => setViewMode('global')}>
            <Ionicons name="globe" size={13} color={viewMode === 'global' ? '#fff' : colors.textMuted} />
            <Text style={[styles.modeTabText, viewMode === 'global' && styles.modeTabTextActive]}>{t('map_global')}</Text>
          </TouchableOpacity>
        </View>

        {/* Filter */}
        <View style={styles.filterRow}>
          {(['all', 'pending', 'validated'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'all' ? t('history_filter_all') : f === 'pending' ? t('map_pending') : t('map_validated')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Heatmap toggle (web) */}
        <View style={[styles.filterRow, { paddingTop: 0, paddingBottom: 10 }]}>
          <TouchableOpacity
            style={[styles.filterChip, heatmap && styles.filterChipActive]}
            onPress={() => setHeatmap(h => !h)}
          >
            <Text style={[styles.filterText, heatmap && styles.filterTextActive]}>{t('map_heat')}</Text>
          </TouchableOpacity>
        </View>

        {/* Heatmap legend */}
        {heatmap && (
          <View style={{ flexDirection:'row', alignItems:'center', gap:12, paddingHorizontal:16, paddingBottom:8 }}>
            <Text style={{ fontSize:11, color: colors.textMuted, fontWeight:'600' }}>{t('map_intensity')}</Text>
            {[
              { color:'#FFD600', label:'1-2' },
              { color:'#FF9100', label:'3-4' },
              { color:'#FF1744', label:'5+' },
            ].map(item => (
              <View key={item.label} style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                <View style={{ width:14, height:14, borderRadius:7, backgroundColor:item.color, opacity:0.8 }} />
                <Text style={{ fontSize:11, color: colors.textMuted }}>{item.label}</Text>
              </View>
            ))}
            <Text style={{ fontSize:11, color: colors.textMuted, marginLeft:'auto' as any }}>{heatClusters.length} zones</Text>
          </View>
        )}

        {/* Leaflet map with real pins */}
        <View style={[styles.webMapContainer, { position: 'relative' }]}>
          {(() => {
            const markers = filtered.filter(r => r.latitude && r.longitude);
            const center = userLocation
              ? [userLocation.latitude, userLocation.longitude]
              : markers.length > 0
                ? [markers[0].latitude, markers[0].longitude]
                : [36.8065, 10.1815];
            const zoom = 13;

            const markerJs = markers.map(r => {
              const clr = r.status === 'validated' ? '#4CAF50' : r.status === 'rejected' ? '#E53935' : '#FF9800';
              const label = r.status === 'validated' ? 'Validé' : r.status === 'rejected' ? 'Rejeté' : 'En attente';
              const addr = (r.address ?? '').replace(/'/g, "\\'").replace(/"/g, '&quot;').slice(0, 60);
              return `L.circleMarker([${r.latitude},${r.longitude}],{radius:9,color:'${clr}',fillColor:'${clr}',fillOpacity:0.9,weight:2}).addTo(map).bindPopup('<b>🗑️ ${label}</b><br/>${addr}<br/><small>${r.date ?? ''}</small>');`;
            }).join('\n');

            const heatJs = heatmap ? heatClusters.map(c => {
              const clr = c.count >= 5 ? '#FF1744' : c.count >= 3 ? '#FF9100' : '#FFD600';
              const r2 = Math.min(20 + c.count * 15, 70);
              return `L.circleMarker([${c.lat},${c.lng}],{radius:${r2},color:'${clr}',fillColor:'${clr}',fillOpacity:0.25,weight:0}).addTo(map);`;
            }).join('\n') : '';

            const userJs = userLocation
              ? `L.circleMarker([${userLocation.latitude},${userLocation.longitude}],{radius:8,color:'#1976D2',fillColor:'#1976D2',fillOpacity:1,weight:3}).addTo(map).bindPopup('📍 Vous êtes ici');`
              : '';

            const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><style>html,body,#map{margin:0;padding:0;width:100%;height:100%;}</style></head><body><div id="map"></div><script>var map=L.map('map').setView([${center[0]},${center[1]}],${zoom});L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM'}).addTo(map);${userJs}${markerJs}${heatJs}</script></body></html>`;

            return (
              <iframe
                srcDoc={html}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Carte signalements"
              />
            );
          })()}
        </View>

        {/* List */}
        <ScrollView style={styles.reportsList}>
          {heatmap && heatClusters.length > 0 && (
            <View style={{ backgroundColor: colors.surface, marginHorizontal:16, marginTop:12, borderRadius:12, padding:14, borderWidth:1, borderColor:colors.border }}>
              <Text style={{ fontSize:13, fontWeight:'700', color:colors.text, marginBottom:10 }}>🔥 Zones les plus polluées</Text>
              {[...heatClusters].sort((a,b)=>b.count-a.count).slice(0,3).map((c,i)=>(
                <View key={i} style={{ flexDirection:'row', alignItems:'center', gap:10, marginBottom:i<2?8:0 }}>
                  <View style={{ width:8, height:8, borderRadius:4, backgroundColor: c.count>=5?'#FF1744':c.count>=3?'#FF9100':'#FFD600' }} />
                  <Text style={{ flex:1, fontSize:12, color:colors.textSecondary }}>{c.lat.toFixed(3)}°N, {c.lng.toFixed(3)}°E</Text>
                  <Text style={{ fontSize:12, fontWeight:'700', color:colors.primary }}>{c.count} signal.</Text>
                </View>
              ))}
            </View>
          )}
          {filtered.map(r => {
            const cfg = STATUS_CONFIG[r.status];
            return (
              <TouchableOpacity
                key={r.id}
                style={[styles.reportCard, selected === r.id && styles.reportCardSelected]}
                onPress={() => setSelected(selected === r.id ? null : r.id)}
              >
                <View style={[styles.reportMarker, { backgroundColor: cfg.color }]}>
                  <Ionicons name="trash" size={12} color="#fff" />
                </View>
                <View style={styles.reportInfo}>
                  <Text style={styles.reportAddr} numberOfLines={1}>{r.address}</Text>
                  <Text style={styles.reportDate}>{r.date}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
                  <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Native map
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCircle} />
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{t('map_title')}</Text>
          <Text style={styles.headerSub}>{filtered.length} affiché{filtered.length > 1 ? 's' : ''} · Tunis</Text>
        </View>
        <View style={styles.headerStats}>
          <View style={styles.headerStat}>
            <Text style={styles.headerStatNum}>{reports.filter(r=>r.status==='validated').length}</Text>
            <Text style={styles.headerStatLabel}>{t('map_validated')}</Text>
          </View>
          <View style={styles.headerStat}>
            <Text style={styles.headerStatNum}>{reports.filter(r=>r.status==='pending').length}</Text>
            <Text style={styles.headerStatLabel}>{t('map_pending')}</Text>
          </View>
        </View>
      </View>

      {/* View mode toggle (native) */}
      <View style={styles.modeTabs}>
        <TouchableOpacity style={[styles.modeTab, viewMode === 'mine' && styles.modeTabActive]} onPress={() => setViewMode('mine')}>
          <Ionicons name="person" size={13} color={viewMode === 'mine' ? '#fff' : colors.textMuted} />
          <Text style={[styles.modeTabText, viewMode === 'mine' && styles.modeTabTextActive]}>{t('map_my_reports')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modeTab, viewMode === 'global' && styles.modeTabActive]} onPress={() => setViewMode('global')}>
          <Ionicons name="globe" size={13} color={viewMode === 'global' ? '#fff' : colors.textMuted} />
          <Text style={[styles.modeTabText, viewMode === 'global' && styles.modeTabTextActive]}>{t('map_global')}</Text>
        </TouchableOpacity>
      </View>

      {/* Filter */}
      <View style={styles.filterRow}>
        {(['all', 'pending', 'validated'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? t('history_filter_all') : f === 'pending' ? t('map_pending') : t('map_validated')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Heatmap toggle (native) */}
      <View style={[styles.filterRow, { paddingTop: 0, paddingBottom: 10 }]}>
        <TouchableOpacity
          style={[styles.filterChip, heatmap && styles.filterChipActive]}
          onPress={() => setHeatmap(h => !h)}
        >
          <Text style={[styles.filterText, heatmap && styles.filterTextActive]}>{t('map_heat')}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, position: 'relative' }}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={INITIAL_REGION}
          showsUserLocation
          showsMyLocationButton
        >
          {filtered.filter(r => r.latitude && r.longitude).map(r => {
            const cfg = STATUS_CONFIG[r.status];
            return (
              <React.Fragment key={r.id}>
                <Marker
                  coordinate={{ latitude: r.latitude, longitude: r.longitude }}
                  onPress={() => setSelected(selected === r.id ? null : r.id)}
                >
                  <View style={[styles.pin, { backgroundColor: cfg.color }]}>
                    <Ionicons name="trash" size={14} color="#fff" />
                  </View>
                </Marker>
                {r.status === 'pending' && (
                  <Circle
                    center={{ latitude: r.latitude, longitude: r.longitude }}
                    radius={80}
                    fillColor={cfg.color + '20'}
                    strokeColor={cfg.color + '60'}
                    strokeWidth={1}
                  />
                )}
              </React.Fragment>
            );
          })}
        </MapView>

        {/* Selected info card */}
        {selectedReport && (
          <View style={styles.infoCard}>
            <TouchableOpacity style={styles.infoClose} onPress={() => setSelected(null)}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.infoTop}>
              <View style={[styles.infoMarker, { backgroundColor: STATUS_CONFIG[selectedReport.status].color }]}>
                <Ionicons name="trash" size={16} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoAddr}>{selectedReport.address}</Text>
                <Text style={styles.infoDate}>{selectedReport.date}</Text>
              </View>
            </View>
            <View style={styles.infoFooter}>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[selectedReport.status].color + '20' }]}>
                <Text style={[styles.statusText, { color: STATUS_CONFIG[selectedReport.status].color }]}>
                  {STATUS_CONFIG[selectedReport.status].label}
                </Text>
              </View>
              {selectedReport.status === 'validated' && (
                <Text style={styles.infoCoins}>+{selectedReport.coins} 🪙</Text>
              )}
            </View>
          </View>
        )}

        {/* Heatmap circles overlay (native) */}
        {heatmap && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {heatClusters.map((c, i) => {
              const pos = toPercent(c.lat, c.lng);
              const size = Math.min(20 + c.count * 18, 80);
              const clr = c.count >= 5 ? '#FF1744' : c.count >= 3 ? '#FF9100' : '#FFD600';
              return (
                <View key={i} style={{ position:'absolute', top:`${pos.topPct}%` as any, left:`${pos.leftPct}%` as any, alignItems:'center', justifyContent:'center', marginLeft:-(size/2), marginTop:-(size/2) }}>
                  {/* Outer glow */}
                  <Animated.View style={{ position:'absolute', width:size, height:size, borderRadius:size/2, backgroundColor:clr, opacity:0.25, transform:[{scale:pulseAnim}] }} />
                  {/* Inner dot */}
                  <View style={{ width:size*0.55, height:size*0.55, borderRadius:size*0.275, backgroundColor:clr, opacity:0.75, justifyContent:'center', alignItems:'center' }}>
                    <Text style={{ color:'#fff', fontSize:10, fontWeight:'800' }}>{c.count}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Legend */}
        <View style={styles.legend}>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: cfg.color }]} />
              <Text style={styles.legendText}>{cfg.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: any): any => ({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary, paddingHorizontal: 20,
    paddingTop: 20, paddingBottom: 22,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    overflow: 'hidden',
  },
  headerCircle: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -40,
  },
  headerLeft: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: -0.3 },
  headerSub:   { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },
  headerStats: { flexDirection: 'row', gap: 18 },
  headerStat:  { alignItems: 'center' },
  headerStatNum:   { color: '#fff', fontSize: 20, fontWeight: '900' },
  headerStatLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700' },
  modeTabs: {
    flexDirection: 'row', backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 9, gap: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modeTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 8, borderRadius: radius.md,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
  },
  modeTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  modeTabText: { fontSize: 12, color: colors.textMuted, fontWeight: '700' },
  modeTabTextActive: { color: '#fff' },
  filterRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 10, gap: 8,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: radius.pill, backgroundColor: colors.background,
    borderWidth: 1.5, borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary, ...shadow.xs },
  filterText: { fontSize: 12, color: colors.textSecondary, fontWeight: '700' },
  filterTextActive: { color: '#fff' },

  // Web map
  webMapContainer: { height: 260, margin: 16, borderRadius: radius.md, overflow: 'hidden', ...shadow.md },
  webPinsOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10 },
  webPinsNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: 8, alignSelf: 'flex-start',
  },
  webPinsNoteText: { color: '#fff', fontSize: 11 },
  reportsList: { flex: 1, paddingHorizontal: 16, paddingTop: 4 },
  reportCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: 14, marginBottom: 8, flexDirection: 'row',
    alignItems: 'center', gap: 12, ...shadow.sm,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  reportCardSelected: { borderColor: colors.primary },
  reportMarker: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  reportInfo: { flex: 1 },
  reportAddr: { fontSize: 14, fontWeight: '600', color: colors.text },
  reportDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  statusBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },

  // Native map
  pin: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
    ...shadow.md,
  },
  infoCard: {
    position: 'absolute', bottom: 80, left: 16, right: 16,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: 16, ...shadow.lg,
  },
  infoClose: { position: 'absolute', top: 12, right: 12, zIndex: 1 },
  infoTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  infoMarker: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  infoAddr: { fontSize: 15, fontWeight: '700', color: colors.text },
  infoDate: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  infoFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoCoins: { fontSize: 16, fontWeight: '700', color: colors.success },
  legend: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: radius.md, padding: 10, gap: 6, ...shadow.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: colors.text, fontWeight: '500' },

  heatLegend: {
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 16,
    alignSelf: 'center', marginBottom: 6,
  },
  heatLegendText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
