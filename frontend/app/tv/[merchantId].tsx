import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, useWindowDimensions, Image } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors, iosFontFamily } from '../../src/themeContext';
import { api } from '../../src/api';

export default function TVDisplay() {
  const { merchantId } = useLocalSearchParams<{ merchantId: string }>();
  const c = useColors();
  const [data, setData] = useState<any | null>(null);
  const { width, height } = useWindowDimensions();
  const landscape = width > 700;

  useEffect(() => {
    let alive = true;
    async function tick() {
      try { const d = await api.tv(merchantId!); if (alive) setData(d); } catch {}
    }
    tick();
    const t = setInterval(tick, 2500);
    return () => { alive = false; clearInterval(t); };
  }, [merchantId]);

  if (!data) {
    return <View style={styles.center}><ActivityIndicator color={c.primary} /></View>;
  }

  const bgUrl = data.merchant?.tv_photo_url || data.merchant?.photo_url || '';
  const nowNum = data.now_serving?.queue_number;
  const numSize = landscape ? Math.min(width * 0.28, 420) : Math.min(width * 0.55, 260);

  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
      {bgUrl ? (
        <Image source={{ uri: bgUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" blurRadius={landscape ? 0 : 10} />
      ) : (
        <LinearGradient colors={[c.primaryDark, '#0F172A']} style={StyleSheet.absoluteFillObject} />
      )}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(15,23,42,0.55)' }]} />

      <View style={[styles.container, { flexDirection: landscape ? 'row' : 'column' }]}>
        {/* Now serving */}
        <View style={[styles.nowPanel, { flex: landscape ? 2 : undefined, padding: landscape ? 40 : 24 }]}>
          <View style={[styles.nowCard, { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              {data.merchant.logo_url ? (
                <Image source={{ uri: data.merchant.logo_url }} style={{ width: 48, height: 48, borderRadius: 12 }} />
              ) : null}
              <Text style={[styles.merchantTitle, { fontFamily: iosFontFamily }]}>{data.merchant.name}</Text>
            </View>
            <Text style={[styles.nowLabel, { fontFamily: iosFontFamily, color: c.accent }]}>NOW SERVING</Text>
            {nowNum ? (
              <Text testID="now-serving-number" style={[styles.nowNumber, { fontSize: numSize, fontFamily: iosFontFamily }]}>#{nowNum}</Text>
            ) : (
              <Text testID="now-serving-number" style={[styles.nowNumber, { fontSize: numSize * 0.5, color: 'rgba(255,255,255,0.4)', fontFamily: iosFontFamily }]}>—</Text>
            )}
            {data.now_serving && (
              <Text style={[styles.nowCategory, { fontFamily: iosFontFamily }]}>{data.now_serving.category_name}</Text>
            )}
          </View>
        </View>

        {/* Upcoming */}
        <View style={[styles.sidePanel, { flex: landscape ? 1 : undefined, padding: landscape ? 32 : 20 }]}>
          <Text style={[styles.sideTitle, { fontFamily: iosFontFamily }]}>Up next</Text>
          <View testID="next-in-line-list" style={{ gap: 10 }}>
            {data.upcoming.length === 0 && (
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 18, fontFamily: iosFontFamily }}>No one in queue</Text>
            )}
            {data.upcoming.slice(0, 6).map((e: any) => (
              <View key={e.id} style={[styles.upItem, { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={[styles.upNum, { fontFamily: iosFontFamily }]}>#{e.queue_number}</Text>
                <Text style={[styles.upCat, { fontFamily: iosFontFamily }]}>{e.category_name}</Text>
              </View>
            ))}
          </View>

          {data.recent_served?.length > 0 && (
            <>
              <Text style={[styles.sideTitle, { marginTop: 24, fontSize: 20, opacity: 0.6, fontFamily: iosFontFamily }]}>Recently served</Text>
              <View style={{ gap: 6 }}>
                {data.recent_served.map((e: any) => (
                  <Text key={e.id} style={[styles.recent, { fontFamily: iosFontFamily }]}>#{e.queue_number} • {e.category_name}</Text>
                ))}
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A' },
  nowPanel: { alignItems: 'center', justifyContent: 'center' },
  nowCard: {
    borderRadius: 40, padding: 40, alignItems: 'center', width: '100%',
    borderWidth: 1,
  },
  merchantTitle: { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  nowLabel: { fontSize: 16, fontWeight: '800', letterSpacing: 6, marginBottom: 10 },
  nowNumber: { fontWeight: '900', color: '#fff', letterSpacing: -12, includeFontPadding: false, textAlign: 'center' },
  nowCategory: { fontSize: 26, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: 8 },
  sidePanel: { justifyContent: 'flex-start' },
  sideTitle: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 16, letterSpacing: -0.5 },
  upItem: {
    borderRadius: 20, paddingHorizontal: 20, paddingVertical: 16, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  upNum: { fontSize: 30, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  upCat: { fontSize: 17, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  recent: { fontSize: 15, color: 'rgba(255,255,255,0.5)' },
});
