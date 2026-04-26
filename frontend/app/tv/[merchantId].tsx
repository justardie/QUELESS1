import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, useWindowDimensions, Image, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors, iosFontFamily } from '../../src/themeContext';
import { api } from '../../src/api';

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}
function formatTime(d: Date) {
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
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
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  useEffect(() => {
    let alive = true;
    async function tick() {
      try { const d = await api.tvBySlug(merchantId!); if (alive) setData(d); } catch {}
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
  const nextNum = data.upcoming?.[0]?.queue_number;
  const merchant = data.merchant || {};
  const videoId = extractYouTubeId(merchant.tv_video_url || '');
  const bgUrl = merchant.tv_photo_url || merchant.photo_url || '';

  // Calculate sizes based on landscape viewport (reference layout scales with screen)
  const pad = landscape ? Math.min(width, height) * 0.03 : 16;
  const gap = landscape ? Math.min(width, height) * 0.025 : 12;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <LinearGradient colors={[c.soft, c.bg]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />

      <View style={[styles.root, { padding: pad }]}>
        {/* ===== TOP BAR: Logo + Name (left) | JAM + Date (right) ===== */}
        <View style={styles.topBar}>
          {/* Left: logo + merchant name */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: gap, flex: 1, minWidth: 0 }}>
            {merchant.logo_url ? (
              <Image source={{ uri: merchant.logo_url }} style={[styles.logoBox, { backgroundColor: '#fff', borderColor: c.text }]} resizeMode="cover" />
            ) : (
              <View style={[styles.logoBox, { backgroundColor: '#fff', borderColor: c.text, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: c.muted, fontSize: 10, fontWeight: '600', textAlign: 'center', fontFamily: iosFontFamily }}>LOGO{'\n'}MERCHANT</Text>
              </View>
            )}
            <Text
              style={[
                styles.merchName,
                { color: c.text, fontFamily: iosFontFamily, fontSize: landscape ? Math.min(width, height) * 0.055 : 24 },
              ]}
              numberOfLines={1}
            >
              {(merchant.name || '(NAMA MERCHANT)').toUpperCase()}
            </Text>
          </View>
          {/* Right: JAM + date */}
          <View style={{ alignItems: 'flex-end', marginLeft: gap }}>
            <Text
              style={[styles.jam, { color: c.text, fontFamily: iosFontFamily, fontSize: landscape ? Math.min(width, height) * 0.12 : 48 }]}
              numberOfLines={1}
            >
              {formatTime(now)}
            </Text>
            <Text style={[styles.date, { color: c.text, fontFamily: iosFontFamily, fontSize: landscape ? Math.min(width, height) * 0.028 : 13 }]}>
              {formatDate(now)}
            </Text>
          </View>
        </View>

        {/* ===== MAIN AREA: 2 columns (left numbers stacked, right big media) ===== */}
        <View style={{ flex: 1, flexDirection: landscape ? 'row' : 'column', gap: gap, marginTop: gap }}>
          {/* LEFT column: NOW SERVING + NEXT SERVING cards stacked */}
          <View style={{ flex: landscape ? 0.32 : undefined, gap: gap }}>
            <View style={[styles.numberCard, { borderColor: c.text, backgroundColor: c.bg }]}>
              <Text style={[styles.numberLabel, { color: c.text, fontFamily: iosFontFamily, fontSize: landscape ? Math.min(width, height) * 0.032 : 14 }]}>NOW SERVING</Text>
              <View style={[styles.divider, { backgroundColor: c.text }]} />
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text
                  testID="now-serving-number"
                  style={[
                    styles.bigNumber,
                    { color: c.primaryDark, fontFamily: iosFontFamily, fontSize: landscape ? Math.min(width, height) * 0.16 : 72 },
                  ]}
                  numberOfLines={1}
                >
                  {nowNum != null ? String(nowNum).padStart(3, '0') : '—'}
                </Text>
              </View>
            </View>

            <View style={[styles.numberCard, { borderColor: c.text, backgroundColor: c.bg }]}>
              <Text style={[styles.numberLabel, { color: c.text, fontFamily: iosFontFamily, fontSize: landscape ? Math.min(width, height) * 0.032 : 14 }]}>NEXT SERVING</Text>
              <View style={[styles.divider, { backgroundColor: c.text }]} />
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text
                  testID="next-serving-number"
                  style={[
                    styles.bigNumber,
                    { color: c.primary, fontFamily: iosFontFamily, fontSize: landscape ? Math.min(width, height) * 0.14 : 60 },
                  ]}
                  numberOfLines={1}
                >
                  {nextNum != null ? String(nextNum).padStart(3, '0') : '—'}
                </Text>
              </View>
            </View>
          </View>

          {/* RIGHT column: big media 16:9 */}
          <View style={{ flex: landscape ? 0.68 : undefined, justifyContent: 'center' }}>
            <View style={[styles.mediaCard, { borderColor: c.text, aspectRatio: 16 / 9 }]}>
              {videoId && Platform.OS === 'web' ? (
                // @ts-ignore
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&controls=0&playlist=${videoId}&modestbranding=1&rel=0`}
                  style={{ width: '100%', height: '100%', border: 0, borderRadius: 16 }}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              ) : bgUrl ? (
                <Image source={{ uri: bgUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              ) : (
                <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }]}>
                  <Text style={{ color: c.muted, fontFamily: iosFontFamily, fontSize: 18 }}>Image atau video (16:9)</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ===== FOOTER: Powered by ===== */}
        <View style={{ alignItems: 'flex-end', marginTop: gap * 0.5 }}>
          <Text style={[styles.footerText, { color: c.muted, fontFamily: iosFontFamily, fontSize: landscape ? Math.min(width, height) * 0.02 : 11 }]}>
            Powered by: <Text style={{ color: c.primaryDark, fontWeight: '600' }}>{appName || 'QUELESS'}</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  logoBox: { width: 72, height: 96, borderRadius: 6, borderWidth: 2 },
  merchName: { fontWeight: '600', letterSpacing: -0.5, flexShrink: 1 },
  jam: { fontWeight: '700', letterSpacing: -3, includeFontPadding: false, lineHeight: undefined },
  date: { marginTop: 2, fontWeight: '400' },
  numberCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    padding: 14,
  },
  numberLabel: { fontWeight: '600', letterSpacing: 0.5 },
  divider: { height: 2, marginTop: 8, marginBottom: 4, opacity: 0.9 },
  bigNumber: { fontWeight: '800', letterSpacing: -4, includeFontPadding: false, textAlign: 'center' },
  mediaCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  footerText: { fontWeight: '400' },
});
