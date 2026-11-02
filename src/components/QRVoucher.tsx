import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  code: string;
  partnerName: string;
  discount: string;
  expiryDate: string;
}

export default function QRVoucher({ code, partnerName, discount, expiryDate }: Props) {
  // Generate a deterministic bit pattern from the code string
  const bits = Array.from({ length: 81 }, (_, i) => {
    const charCode = code.charCodeAt(i % code.length);
    return (charCode >> (i % 8)) & 1;
  });

  return (
    <View style={s.card}>
      <Text style={s.partnerName}>{partnerName}</Text>
      <Text style={s.discount}>{discount}</Text>

      {/* Fake QR grid */}
      <View style={s.qrContainer}>
        <View style={s.qrGrid}>
          {Array.from({ length: 9 }, (_, row) => (
            <View key={row} style={s.qrRow}>
              {Array.from({ length: 9 }, (_, col) => (
                <View
                  key={col}
                  style={[s.qrCell, { backgroundColor: bits[row * 9 + col] ? '#000' : '#fff' }]}
                />
              ))}
            </View>
          ))}
        </View>
      </View>

      <Text style={s.code}>{code}</Text>
      <Text style={s.expiry}>Valable jusqu'au {expiryDate}</Text>
      <Text style={s.brand}>♻️ PoubCoin</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 2, borderColor: '#2E8B57', borderStyle: 'dashed' },
  partnerName: { fontSize: 18, fontWeight: '800', color: '#1B6B3A', marginBottom: 4 },
  discount: { fontSize: 28, fontWeight: '900', color: '#2E8B57', marginBottom: 16 },
  qrContainer: { padding: 8, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#eee', marginBottom: 12 },
  qrGrid: { gap: 1 },
  qrRow: { flexDirection: 'row', gap: 1 },
  qrCell: { width: 14, height: 14, borderRadius: 1 },
  code: { fontSize: 13, fontWeight: '900', letterSpacing: 2, color: '#333', marginBottom: 4 },
  expiry: { fontSize: 11, color: '#888', marginBottom: 8 },
  brand: { fontSize: 12, color: '#4CAF82', fontWeight: '700' },
});
