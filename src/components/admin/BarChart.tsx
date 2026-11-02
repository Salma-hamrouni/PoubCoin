import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BarChartProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}

export default function BarChart({ data, color = '#1B6B3A', height = 120 }: BarChartProps) {
  const LABEL_H = 22; // space reserved at bottom for day labels
  const chartH   = height - LABEL_H;
  const max       = Math.max(...data.map(d => d.value), 1);

  return (
    <View style={s.container}>
      {/* Y-axis hint */}
      <View style={[s.chart, { height }]}>
        {data.map((d, i) => {
          const barH = Math.max(d.value > 0 ? 4 : 0, (d.value / max) * (chartH - 20));
          const isMax = d.value === max && max > 0;
          return (
            <View key={i} style={s.barWrapper}>
              {/* Value label above bar */}
              <View style={{ height: chartH - 20, justifyContent: 'flex-end' }}>
                {d.value > 0 && (
                  <Text style={[s.barValue, isMax && { color, fontWeight: '800' }]}>
                    {d.value}
                  </Text>
                )}
                <View
                  style={[
                    s.bar,
                    {
                      height: barH,
                      backgroundColor: isMax ? color : color + '70',
                      borderRadius: barH < 8 ? 2 : 6,
                    },
                  ]}
                />
              </View>
              <Text style={[s.barLabel, isMax && { color, fontWeight: '700' }]}>
                {d.label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Zero line */}
      <View style={[s.zeroLine, { marginTop: -LABEL_H - 1 }]} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginTop: 10, marginBottom: 4 },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingHorizontal: 4,
  },
  barWrapper: { flex: 1, alignItems: 'center', gap: 4 },
  barValue: { fontSize: 9, color: '#9CA3AF', textAlign: 'center', marginBottom: 3 },
  bar: { width: '85%', minHeight: 0 },
  barLabel: { fontSize: 10, color: '#9CA3AF', textAlign: 'center', height: 14 },
  zeroLine: { height: 1, backgroundColor: '#E5E7EB', marginHorizontal: 4 },
});
