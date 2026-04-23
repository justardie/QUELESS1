import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../src/theme';
import { api } from '../../src/api';

export default function TVDisplay() {
  const { merchantId } = useLocalSearchParams<{ merchantId: string }>();
  const [data, setData] = useState<any | null>(null);
  const { width } = useWindowDimensions();
  const landscape = width > 700;
  const lastCalled = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const d = await api.tv(merchantId!);
        if (!alive) return;
        const now = d.now_serving?.queue_number ?? null;
        if (now !== lastCalled.current && now !== null) {
          lastCalled.current = now;
          // flash via state trigger is handled by re-render
        }
        setData(d);
      } catch {}
    }
    tick();
    const t = setInterval(tick, 2500);
    return () => { alive = false; clearInterval(t); };
  }, [merchantId]);

  if (!data) return <View style={styles.center}><ActivityIndicator color={theme.colors.brand} /></View>;

  const nowNum = data.now_serving?.queue_number;
  const numSize = landscape ? Math.min(width * 0.3, 480) : Math.min(width * 0.6, 260);

  return (
    <LinearGradient colors={['#EFE9FF', '#FCE7F3', '#E0F2FE']} style={{ flex: 1 }}>
      <View style={[styles.container, { flexDirection: landscape ? 'row' : 'column' }]}>
        {/* Now serving panel */}
        <View style={[styles.nowPanel, { flex: landscape ? 2 : undefined, padding: landscape ? 40 : 24 }]}>
          <View style={styles.nowCard}>
            <Text style={styles.merchantTitle}>{data.merchant.name}</Text>
            <Text style={styles.nowLabel}>NOW SERVING</Text>
            {nowNum ? (
              <Text testID="now-serving-number" style={[styles.nowNumber, { fontSize: numSize }]}>
                #{nowNum}
              </Text>
            ) : (
              <Text testID="now-serving-number" style={[styles.nowNumber, { fontSize: numSize * 0.6, color: theme.colors.textMuted }]}>—</Text>
            )}
            {data.now_serving && (
              <Text style={styles.nowCategory}>{data.now_serving.category_name}</Text>
            )}
          </View>
        </View>

        {/* Upcoming */}
        <View style={[styles.sidePanel, { flex: landscape ? 1 : undefined, padding: landscape ? 32 : 20 }]}>
          <Text style={styles.sideTitle}>Up next</Text>
          <View testID="next-in-line-list" style={{ gap: 10 }}>
            {data.upcoming.length === 0 && (
              <Text style={{ color: theme.colors.textMuted, fontSize: 18 }}>No one in queue</Text>
            )}
            {data.upcoming.slice(0, 6).map((e: any) => (
              <View key={e.id} style={styles.upItem}>
                <Text style={styles.upNum}>#{e.queue_number}</Text>
                <Text style={styles.upCat}>{e.category_name}</Text>
              </View>
            ))}
          </View>

          {data.recent_served?.length > 0 && (
            <>
              <Text style={[styles.sideTitle, { marginTop: 24, fontSize: 20, opacity: 0.5 }]}>Recently served</Text>
              <View style={{ gap: 6 }}>
                {data.recent_served.map((e: any) => (
                  <Text key={e.id} style={styles.recent}>#{e.queue_number} • {e.category_name}</Text>
                ))}
              </View>
            </>
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nowPanel: { alignItems: 'center', justifyContent: 'center' },
  nowCard: {
    backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 40,
    padding: 40, alignItems: 'center', width: '100%',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 40, shadowOffset: { width: 0, height: 20 },
  },
  merchantTitle: { fontSize: 36, fontWeight: '800', color: theme.colors.text, letterSpacing: -1, marginBottom: 6, textAlign: 'center' },
  nowLabel: { fontSize: 18, color: theme.colors.brandDark, fontWeight: '800', letterSpacing: 6, marginBottom: 10 },
  nowNumber: { fontWeight: '900', color: theme.colors.text, letterSpacing: -12, lineHeight: undefined, includeFontPadding: false, textAlign: 'center' },
  nowCategory: { fontSize: 28, color: theme.colors.textMuted, fontWeight: '600', marginTop: 8 },
  sidePanel: { justifyContent: 'flex-start' },
  sideTitle: { fontSize: 28, fontWeight: '800', color: theme.colors.text, marginBottom: 16, letterSpacing: -0.5 },
  upItem: {
    backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  upNum: { fontSize: 32, fontWeight: '900', color: theme.colors.text, letterSpacing: -1 },
  upCat: { fontSize: 18, color: theme.colors.textMuted, fontWeight: '600' },
  recent: { fontSize: 16, color: theme.colors.textMuted },
});
