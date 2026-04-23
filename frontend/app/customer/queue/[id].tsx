import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../src/theme';
import { Card, Button, Badge } from '../../../src/ui';
import { api } from '../../../src/api';
import { notify, requestNotificationPermission } from '../../../src/notifications';

export default function QueueStatus() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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

  if (!entry) return <View style={styles.center}><ActivityIndicator color={theme.colors.brand} /></View>;

  const isCalled = entry.status === 'called';
  const isDone = entry.status === 'served' || entry.status === 'skipped';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.inner}>
        <View style={{ marginBottom: 10 }}>
          <TouchableOpacity onPress={() => router.replace('/customer/merchants')} style={styles.iconBtn}>
            <Ionicons name="close" size={22} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>{entry.category_name}</Text>

        <View style={[styles.numberCard, isCalled && styles.numberCardCalled]}>
          <Text style={styles.smallLabel}>{isCalled ? 'NOW SERVING' : 'YOUR NUMBER'}</Text>
          <Text style={styles.bigNumber}>#{entry.queue_number}</Text>
          {!isDone && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <Badge
                label={isCalled ? 'Called' : `Position ${entry.position + 1}`}
                color={isCalled ? theme.colors.mint : theme.colors.brandSoft}
                textColor={isCalled ? '#065F46' : theme.colors.brandDark}
              />
              {!isCalled && (
                <Badge label={`~${entry.estimated_wait_minutes} min`} color={theme.colors.sun} textColor="#92400E" />
              )}
            </View>
          )}
          {isDone && (
            <Badge label={entry.status.toUpperCase()} color={theme.colors.bg2} textColor={theme.colors.textMuted} />
          )}
        </View>

        <Card style={{ marginTop: 18 }}>
          <Text style={styles.rowLabel}>Customer</Text>
          <Text style={styles.rowValue}>{entry.customer_name}</Text>
          <View style={styles.divider} />
          <Text style={styles.rowLabel}>Status</Text>
          <Text style={styles.rowValue}>{entry.status}</Text>
        </Card>

        <View style={{ flex: 1 }} />
        <Button label="Back to merchants" variant="secondary" onPress={() => router.replace('/customer/merchants')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg },
  inner: { flex: 1, padding: 20 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  label: { fontSize: 14, color: theme.colors.textMuted, fontWeight: '600', textAlign: 'center', marginTop: 6 },
  numberCard: {
    backgroundColor: theme.colors.brandSoft,
    borderRadius: 32,
    padding: 40,
    alignItems: 'center',
    marginTop: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    ...theme.shadow.card,
  },
  numberCardCalled: { backgroundColor: theme.colors.mint },
  smallLabel: { fontSize: 12, color: theme.colors.brandDark, fontWeight: '800', letterSpacing: 2 },
  bigNumber: { fontSize: 96, fontWeight: '900', color: theme.colors.text, letterSpacing: -5, marginTop: 4 },
  rowLabel: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  rowValue: { fontSize: 16, color: theme.colors.text, fontWeight: '600', marginTop: 4 },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 12 },
});
