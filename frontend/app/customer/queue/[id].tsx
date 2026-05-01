import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors, iosFontFamily } from '../../../src/themeContext';
import { Button } from '../../../src/ui';
import { BottomDock, BOTTOM_DOCK_HEIGHT } from '../../../src/bottomDock';
import { api } from '../../../src/api';
import { notify, requestNotificationPermission } from '../../../src/notifications';

export default function QueueStatus() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useColors();
  const [entry, setEntry] = useState<any | null>(null);
  const notified = useRef(false);

  useEffect(() => {
    requestNotificationPermission();
    let alive = true;
    async function tick() {
      try {
        const e = await api.getQueueEntry(id!);
        if (!alive) return;
        setEntry(e);
        if (!notified.current && e.position <= 1 && e.status === 'waiting') {
          notified.current = true;
          notify('Antrian Anda hampir tiba', `Anda berikutnya di ${e.category_name}`);
        }
        if (e.status === 'called' && notified.current !== 'called') {
          notified.current = 'called' as any;
          notify('Giliran Anda!', `Nomor antrian #${e.queue_number} dipanggil`);
        }
      } catch {}
    }
    tick();
    const t = setInterval(tick, 3000);
    return () => { alive = false; clearInterval(t); };
  }, [id]);

  if (!entry) return (
    <View style={[styles.center, { backgroundColor: c.bg }]}>
      <ActivityIndicator color={c.primary} />
    </View>
  );

  const isCalled = entry.status === 'called';
  const isDone = entry.status === 'served' || entry.status === 'skipped';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <View style={styles.inner}>
        {/* Nav */}
        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => router.replace('/')} style={[styles.iconBtn, { backgroundColor: 'rgba(120,120,128,0.12)' }]}>
            <Ionicons name="close" size={20} color={c.text} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: c.text, fontFamily: iosFontFamily }]}>Status Antrian</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Category */}
        <Text style={[styles.category, { color: c.muted, fontFamily: iosFontFamily }]}>
          {entry.category_name || 'Umum'}
        </Text>

        {/* Main number card */}
        {isCalled ? (
          <LinearGradient
            colors={[c.primary, c.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.numberCard}
          >
            <Text style={[styles.smallLabel, { color: 'rgba(255,255,255,0.8)', fontFamily: iosFontFamily }]}>🔔  GILIRAN ANDA!</Text>
            <Text style={[styles.bigNumber, { color: '#fff', fontFamily: iosFontFamily }]}>#{entry.queue_number}</Text>
            <Text style={[styles.calledHint, { fontFamily: iosFontFamily }]}>Silakan menuju counter pelayanan</Text>
          </LinearGradient>
        ) : (
          <View style={[styles.numberCard, { backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(15,23,42,0.06)' }]}>
            <Text style={[styles.smallLabel, { color: c.primaryDark, fontFamily: iosFontFamily }]}>
              {isDone ? entry.status.toUpperCase() : 'NOMOR ANTRIAN ANDA'}
            </Text>
            <Text style={[styles.bigNumber, { color: c.text, fontFamily: iosFontFamily }]}>#{entry.queue_number}</Text>
            {!isDone && (
              <View style={styles.badgeRow}>
                <View style={[styles.pill, { backgroundColor: c.soft }]}>
                  <Text style={[styles.pillText, { color: c.primaryDark, fontFamily: iosFontFamily }]}>
                    Posisi {entry.position + 1}
                  </Text>
                </View>
                <View style={[styles.pill, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={[styles.pillText, { color: '#92400E', fontFamily: iosFontFamily }]}>
                    ~{entry.estimated_wait_minutes} menit
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Info card */}
        <View style={[styles.infoCard, { backgroundColor: '#fff' }]}>
          {[
            ['Nama', entry.customer_name],
            ['Layanan', entry.category_name || 'Umum'],
            ['Status', isCalled ? 'Dipanggil' : isDone ? entry.status : 'Menunggu'],
          ].map(([label, val], i, arr) => (
            <React.Fragment key={label}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: c.muted, fontFamily: iosFontFamily }]}>{label}</Text>
                <Text style={[styles.infoValue, { color: c.text, fontFamily: iosFontFamily }]}>{val}</Text>
              </View>
              {i < arr.length - 1 && <View style={[styles.divider, { backgroundColor: 'rgba(15,23,42,0.06)' }]} />}
            </React.Fragment>
          ))}
        </View>

        {/* Live indicator */}
        {!isDone && (
          <View style={styles.liveRow}>
            <View style={[styles.liveDot, { backgroundColor: '#10B981' }]} />
            <Text style={[styles.liveText, { color: c.muted, fontFamily: iosFontFamily }]}>Memperbarui otomatis setiap 3 detik</Text>
          </View>
        )}

        <View style={{ flex: 1 }} />

        <View style={{ paddingBottom: BOTTOM_DOCK_HEIGHT + 16 }}>
          <Button label="Kembali ke beranda" variant="secondary" onPress={() => router.replace('/')} />
        </View>
      </View>
      <BottomDock />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  inner: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navTitle: { fontSize: 16, fontWeight: '600' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  category: { fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center', marginBottom: 12 },
  numberCard: {
    borderRadius: 28, padding: 36, alignItems: 'center', marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  smallLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  bigNumber: { fontSize: 88, fontWeight: '900', letterSpacing: -5, marginTop: 4, includeFontPadding: false },
  calledHint: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '500', marginTop: 8 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  pill: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  pillText: { fontSize: 13, fontWeight: '600' },
  infoCard: {
    borderRadius: 20, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  infoLabel: { fontSize: 13, fontWeight: '600' },
  infoValue: { fontSize: 14, fontWeight: '600' },
  divider: { height: 1 },
  liveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveText: { fontSize: 12 },
});
