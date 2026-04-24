import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, useWindowDimensions, Image, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors, iosFontFamily } from '../../src/themeContext';
import { api } from '../../src/api';

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{6,})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function formatTime(d: Date) {
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}
function formatDate(d: Date) {
  const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export default function TVDisplay() {
  const { merchantId } = useLocalSearchParams<{ merchantId: string }>();
  const c = useColors();
  const [data, setData] = useState<any | null>(null);
  const [appName, setAppName] = useState<string>('QUELESS');
  const [now, setNow] = useState<Date>(new Date());
  const { width } = useWindowDimensions();
  const landscape = width > 700;

  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const d = await api.tv(merchantId!);
        if (alive) setData(d);
      } catch {}
    }
    async function loadSettings() {
      try { const s: any = await api.getSettings(); if (alive && s?.app_name) setAppName(s.app_name); } catch {}
    }
    tick(); loadSettings();
    const t = setInterval(tick, 2500);
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => { alive = false; clearInterval(t); clearInterval(clock); };
  }, [merchantId]);

  if (!data) {
    return <View style={[styles.center, { backgroundColor: c.bg }]}><ActivityIndicator color={c.primary} /></View>;
  }

  const nowNum = data.now_serving?.queue_number;
  // NEXT SERVING = first upcoming
  const nextNum = data.upcoming?.[0]?.queue_number;
  const merchant = data.merchant || {};
  const videoId = extractYouTubeId(merchant.tv_video_url || '');
  const bgUrl = merchant.tv_photo_url || merchant.photo_url || '';

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Subtle themed background gradient */}
      <LinearGradient
        colors={[c.soft, c.bg]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={[styles.root, { padding: landscape ? 32 : 20, flexDirection: landscape ? 'row' : 'column', gap: landscape ? 24 : 16 }]}>

        {/* LEFT: Merchant info + NOW/NEXT cards */}
        <View style={{ flex: landscape ? 1.05 : undefined, gap: 16 }}>
          {/* Merchant header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 }}>
            {merchant.logo_url ? (
              <Image source={{ uri: merchant.logo_url }} style={{ width: 64, height: 64, borderRadius: 18 }} />
            ) : (
              <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 26, color: c.primaryDark, fontFamily: iosFontFamily }}>🏪</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.merchantName, { color: c.text, fontFamily: iosFontFamily }]}>{merchant.name}</Text>
              {!!merchant.address && <Text style={[styles.merchantAddr, { color: c.muted, fontFamily: iosFontFamily }]} numberOfLines={1}>{merchant.address}</Text>}
            </View>
          </View>

          {/* NOW SERVING */}
          <View style={[styles.numberCard, { backgroundColor: c.primary, borderColor: c.primaryDark }]}>
            <Text style={[styles.numberLabel, { color: 'rgba(255,255,255,0.85)', fontFamily: iosFontFamily }]}>NOW SERVING</Text>
            <Text
              testID="now-serving-number"
              style={[styles.bigNumber, { color: '#fff', fontSize: landscape ? 140 : 96, fontFamily: iosFontFamily }]}
              numberOfLines={1}
            >
              {nowNum ? String(nowNum).padStart(3, '0') : '—'}
            </Text>
            {data.now_serving?.customer_name && (
              <Text style={[styles.customerName, { color: 'rgba(255,255,255,0.9)', fontFamily: iosFontFamily }]} numberOfLines={1}>
                {data.now_serving.customer_name}
              </Text>
            )}
          </View>

          {/* NEXT SERVING */}
          <View style={[styles.numberCard, { backgroundColor: c.soft, borderColor: c.primary, borderWidth: 1.5 }]}>
            <Text style={[styles.numberLabel, { color: c.primaryDark, fontFamily: iosFontFamily }]}>NEXT SERVING</Text>
            <Text
              testID="next-serving-number"
              style={[styles.bigNumber, { color: c.primaryDark, fontSize: landscape ? 96 : 64, fontFamily: iosFontFamily }]}
              numberOfLines={1}
            >
              {nextNum ? String(nextNum).padStart(3, '0') : '—'}
            </Text>
            {data.upcoming?.[0]?.customer_name && (
              <Text style={[styles.customerName, { color: c.text, fontFamily: iosFontFamily }]} numberOfLines={1}>
                {data.upcoming[0].customer_name}
              </Text>
            )}
          </View>
        </View>

        {/* RIGHT: Clock + Date + Media panel */}
        <View style={{ flex: landscape ? 1.4 : undefined, gap: 16 }}>
          {/* Clock + Date */}
          <View style={[styles.clockCard, { backgroundColor: c.bg, borderColor: 'rgba(15,23,42,0.08)' }]}>
            <Text style={[styles.clockTime, { color: c.text, fontFamily: iosFontFamily, fontSize: landscape ? 72 : 48 }]}>{formatTime(now)}</Text>
            <Text style={[styles.clockDate, { color: c.muted, fontFamily: iosFontFamily }]}>{formatDate(now)}</Text>
          </View>

          {/* Media panel (YouTube video OR image) — landscape 16:9 */}
          <View style={[styles.mediaCard, { backgroundColor: '#000', borderColor: 'rgba(15,23,42,0.08)', aspectRatio: 16/9 }]}>
            {videoId ? (
              // Web-only iframe embed for YouTube (works in browser / Expo web).
              // @ts-ignore - iframe only exists on web
              Platform.OS === 'web' ? (
                // eslint-disable-next-line react/no-unknown-property
                // @ts-ignore
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&controls=0&playlist=${videoId}`}
                  style={{ width: '100%', height: '100%', border: 0, borderRadius: 20 }}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              ) : bgUrl ? (
                <Image source={{ uri: bgUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              ) : (
                <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: '#fff', fontFamily: iosFontFamily }}>Video hanya tampil di Web/TV</Text>
                </View>
              )
            ) : bgUrl ? (
              <Image source={{ uri: bgUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            ) : (
              <LinearGradient colors={[c.primary, c.primaryDark]} style={StyleSheet.absoluteFillObject} />
            )}
          </View>
        </View>
      </View>

      {/* Footer: Powered by */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: c.muted, fontFamily: iosFontFamily }]}>
          Powered by <Text style={{ color: c.primaryDark, fontWeight: '600' }}>{appName}</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  merchantName: { fontSize: 26, fontWeight: '600', letterSpacing: -0.4 },
  merchantAddr: { fontSize: 14, marginTop: 2 },
  numberCard: {
    borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1,
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
  },
  numberLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 3 },
  bigNumber: { fontWeight: '700', letterSpacing: -8, includeFontPadding: false, textAlign: 'center', marginTop: 4 },
  customerName: { fontSize: 16, fontWeight: '500', marginTop: 4, maxWidth: '100%' },
  clockCard: {
    borderRadius: 24, padding: 24, alignItems: 'flex-end', borderWidth: 1,
    shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  clockTime: { fontWeight: '600', letterSpacing: -2, includeFontPadding: false },
  clockDate: { fontSize: 14, marginTop: 4 },
  mediaCard: { flex: 1, borderRadius: 24, borderWidth: 1, overflow: 'hidden', minHeight: 240 },
  footer: { position: 'absolute', bottom: 10, left: 0, right: 0, alignItems: 'center' },
  footerText: { fontSize: 12 },
});
