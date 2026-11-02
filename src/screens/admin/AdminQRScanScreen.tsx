import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, Vibration } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { colors } from '../../theme';

export default function AdminQRScanScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned]   = useState(false);
  const [result, setResult]     = useState<{ status: 'success' | 'error' | 'already'; message: string } | null>(null);
  const [loading, setLoading]   = useState(false);
  const lockRef = useRef(false);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  const handleBarcode = async (scan: BarcodeScanningResult) => {
    if (lockRef.current || loading) return;
    lockRef.current = true;
    setScanned(true);
    setLoading(true);

    try {
      const data = JSON.parse(scan.data) as { type: string; userId: string; depositId?: string };

      if (data.type !== 'poubcoin_deposit' || !data.userId) {
        setResult({ status: 'error', message: 'QR code invalide ou non reconnu.' });
        return;
      }

      // Validate deposit on the field
      const walletRef = doc(db, 'wallets', data.userId);
      const walletSnap = await getDoc(walletRef);

      if (!walletSnap.exists()) {
        setResult({ status: 'error', message: "Portefeuille citoyen introuvable." });
        return;
      }

      const FIELD_BONUS = 10;
      await updateDoc(walletRef, { balance: increment(FIELD_BONUS) });
      await addDoc(collection(db, 'transactions', data.userId, 'items'), {
        type:   'earned',
        amount: FIELD_BONUS,
        label:  'Dépôt validé sur le terrain (QR scan)',
        date:   new Date().toISOString(),
      });
      await addDoc(collection(db, 'adminLogs'), {
        action:    'qr_scan_validate',
        userId:    data.userId,
        depositId: data.depositId ?? null,
        coins:     FIELD_BONUS,
        createdAt: serverTimestamp(),
      });

      Vibration.vibrate(200);
      setResult({ status: 'success', message: `+${FIELD_BONUS} 🪙 crédités au citoyen !` });
    } catch (e: any) {
      setResult({ status: 'error', message: e?.message ?? 'Erreur lors de la validation.' });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setScanned(false);
    setResult(null);
    lockRef.current = false;
  };

  if (!permission) return <View style={s.root} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <Ionicons name="camera-outline" size={56} color={colors.border} />
          <Text style={s.permTitle}>Caméra requise</Text>
          <Text style={s.permSub}>Autorisez l'accès à la caméra pour scanner les QR codes.</Text>
          <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
            <Text style={s.permBtnText}>Autoriser la caméra</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <LinearGradient colors={[colors.primary + 'DD', colors.primary]} style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerSub}>SCAN QR CODE</Text>
          <Text style={s.headerTitle}>Valider un dépôt</Text>
        </View>
      </LinearGradient>

      <View style={s.scanArea}>
        {!scanned ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanned ? undefined : handleBarcode}
          />
        ) : null}

        {/* Viewfinder overlay */}
        <View style={s.overlay}>
          <View style={s.corner} />
          <View style={[s.corner, { right: 0, left: undefined }]} />
          <View style={[s.corner, { bottom: 0, top: undefined }]} />
          <View style={[s.corner, { bottom: 0, top: undefined, right: 0, left: undefined }]} />
        </View>

        {loading && (
          <View style={s.loadingBadge}>
            <Text style={s.loadingText}>Validation en cours…</Text>
          </View>
        )}
      </View>

      <View style={s.bottom}>
        {result ? (
          <View style={[s.resultCard, result.status === 'success' ? s.resultSuccess : s.resultError]}>
            <Ionicons
              name={result.status === 'success' ? 'checkmark-circle' : 'close-circle'}
              size={32}
              color={result.status === 'success' ? '#15803D' : '#DC2626'}
            />
            <Text style={[s.resultMsg, { color: result.status === 'success' ? '#15803D' : '#DC2626' }]}>
              {result.message}
            </Text>
            <TouchableOpacity style={s.rescanBtn} onPress={reset}>
              <Ionicons name="scan-outline" size={16} color="#fff" />
              <Text style={s.rescanText}>Scanner un autre QR</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.hintCard}>
            <Ionicons name="qr-code-outline" size={22} color={colors.primary} />
            <Text style={s.hintText}>Pointez la caméra vers le QR code du citoyen pour valider son dépôt sur le terrain.</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#000' },
  header:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, gap: 12 },
  backBtn: { padding: 4 },
  headerSub:   { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,.5)', letterSpacing: 2 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  scanArea: { flex: 1, position: 'relative', overflow: 'hidden' },
  overlay:  { ...StyleSheet.absoluteFill, borderWidth: 0 },
  corner: {
    position: 'absolute', top: 40, left: 40,
    width: 36, height: 36,
    borderTopWidth: 3, borderLeftWidth: 3,
    borderColor: colors.primary, borderRadius: 4,
  },
  loadingBadge: { position: 'absolute', bottom: 20, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,.7)', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8 },
  loadingText:  { color: '#fff', fontSize: 13, fontWeight: '600' },
  bottom:  { backgroundColor: colors.surface, padding: 20 },
  hintCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.primaryGhost, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border },
  hintText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  resultCard: { borderRadius: 14, padding: 20, alignItems: 'center', gap: 10 },
  resultSuccess: { backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#86EFAC' },
  resultError:   { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' },
  resultMsg: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  rescanBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, marginTop: 4 },
  rescanText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  permTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  permSub:   { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  permBtn:   { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
