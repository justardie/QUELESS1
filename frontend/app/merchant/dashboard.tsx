import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, RefreshControl, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/theme';
import { Card, ScreenHeader, Badge, Button } from '../../src/ui';
import { BottomDock, BOTTOM_DOCK_HEIGHT } from '../../src/bottomDock';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth';
import { Switch } from 'react-native';
import { notify, promptInput } from '../../src/alerts';

export default function MerchantDashboard() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [merchants, setMerchants] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMerchants = useCallback(async () => {
    try {
      const list = await api.myMerchants();
      setMerchants(list);
      if (!selected && list.length) setSelected(list[0]);
      if (selected) {
        const fresh = list.find((m: any) => m.id === selected.id);
        if (fresh) setSelected(fresh);
      }
    } finally { setLoading(false); }
  }, [selected]);

  const loadQueue = useCallback(async () => {
    if (!selected) return;
    try {
      const q = await api.merchantQueue(selected.id);
      setQueue(q);
    } catch {}
  }, [selected]);

  useEffect(() => { loadMerchants(); }, []);
  useEffect(() => {
    loadQueue();
    const t = setInterval(loadQueue, 3000);
    return () => clearInterval(t);
  }, [loadQueue]);

  async function onCallNext() {
    if (!selected) return;
    try {
      await api.callNext(selected.id);
      await loadQueue();
    } catch (e: any) { Alert.alert('Error', e.message); }
  }
  async function onServe(id: string) { await api.serveEntry(selected.id, id); await loadQueue(); }
  async function onSkip(id: string) { await api.skipEntry(selected.id, id); await loadQueue(); }

  async function onCallPrev() {
    if (!selected) return;
    try { await api.callPrev(selected.id); await loadQueue(); }
    catch (e: any) { notify(e.message, 'Gagal'); }
  }

  async function toggleIsOpen(v: boolean) {
    if (!selected) return;
    try {
      const upd = await api.updateMerchant(selected.id, { ...selected, is_open: v });
      setSelected({ ...selected, is_open: v });
      setMerchants(merchants.map((m: any) => m.id === selected.id ? { ...m, is_open: v } : m));
      notify(v ? 'Toko dibuka' : 'Toko ditutup');
    } catch (e: any) { notify(e.message, 'Gagal'); }
  }

  async function toggleServiceEnabled(v: boolean) {
    if (!selected) return;
    try {
      await api.updateMerchant(selected.id, { ...selected, service_enabled: v });
      setSelected({ ...selected, service_enabled: v });
      notify(v ? 'Layanan/services diaktifkan' : 'Pelanggan langsung ambil nomor tanpa pilih layanan');
    } catch (e: any) { notify(e.message, 'Gagal'); }
  }

  async function addService() {
    if (!selected) return;
    promptInput('Nama layanan', 'Isi nama layanan (mis. Potong rambut)', async (name: string) => {
      if (!name.trim()) return;
      try {
        await api.addCategory(selected.id, { name: name.trim(), avg_service_minutes: 5 });
        await loadMerchants();
        notify(`Layanan "${name}" ditambahkan`);
      } catch (e: any) { notify(e.message, 'Gagal'); }
    });
  }

  async function handleLogout() {
    await signOut();
    router.replace('/');
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={theme.colors.brand} /></View>;

  if (merchants.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.inner}>
          <ScreenHeader
            title="Welcome"
            subtitle="Set up your first merchant profile"
            right={<TouchableOpacity testID="logout-button" onPress={handleLogout} style={styles.iconBtn}><Ionicons name="log-out-outline" size={22} color={theme.colors.text} /></TouchableOpacity>}
          />
          <Card style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Ionicons name="storefront-outline" size={48} color={theme.colors.brandDark} />
            <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 12, color: theme.colors.text }}>No merchants yet</Text>
            <Text style={{ color: theme.colors.textMuted, marginTop: 6, textAlign: 'center' }}>
              Create your first merchant. It will be pending admin approval.
            </Text>
            <View style={{ height: 16 }} />
            <Button testID="create-first-merchant" label="Create merchant" onPress={() => router.push('/merchant/register')} />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  const waiting = queue.filter(e => e.status === 'waiting');
  const called = queue.find(e => e.status === 'called');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: BOTTOM_DOCK_HEIGHT + 40 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => { loadMerchants(); loadQueue(); }} tintColor={theme.colors.brand} />}
      >
        <ScreenHeader
          title="Dashboard"
          subtitle={user?.email}
          right={<TouchableOpacity testID="logout-button" onPress={handleLogout} style={styles.iconBtn}><Ionicons name="log-out-outline" size={22} color={theme.colors.text} /></TouchableOpacity>}
        />

        {/* merchant tabs (hanya tampilkan jika punya >1, karena user merchant hanya boleh 1 toko) */}
        {merchants.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {merchants.map(m => (
              <TouchableOpacity
                key={m.id}
                testID={`merchant-tab-${m.id}`}
                onPress={() => setSelected(m)}
                style={[styles.merchPill, selected?.id === m.id && styles.merchPillActive]}
              >
                <Text style={[styles.merchPillText, selected?.id === m.id && styles.merchPillTextActive]}>{m.name}</Text>
                <Badge
                  label={m.status}
                  color={m.status === 'approved' ? theme.colors.mint : m.status === 'pending' ? theme.colors.sun : theme.colors.peach}
                  textColor={m.status === 'approved' ? '#065F46' : m.status === 'pending' ? '#92400E' : '#7F1D1D'}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Billing warning */}
        {selected && !selected.billing_active && (
          <View style={{ backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, borderWidth: 1, borderColor: '#F59E0B' }}>
            <Ionicons name="warning-outline" size={18} color="#92400E" />
            <Text style={{ flex: 1, color: '#92400E', fontSize: 13, fontWeight: '600' }}>
              {selected.billing_expires_at ? 'Billing Anda sudah kadaluarsa.' : 'Belum ada billing aktif.'} Hubungi admin.
            </Text>
          </View>
        )}

        {/* Now serving */}
        <Card style={{ backgroundColor: theme.colors.brandSoft, borderColor: theme.colors.brand }}>
          <Text style={styles.smallLabel}>NOW SERVING</Text>
          <Text style={styles.bigNumber}>{called ? `#${called.queue_number}` : '—'}</Text>
          {called && <Text style={styles.sub}>{called.customer_name}{called.category_name && called.category_name !== 'Umum' ? ` • ${called.category_name}` : ''}</Text>}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <Button testID="call-prev-button" label="Panggil sebelumnya" variant="secondary" onPress={onCallPrev} style={{ flex: 1, minWidth: 130 }} />
            <Button testID="call-next-button" label="Panggil berikutnya" onPress={onCallNext} style={{ flex: 1, minWidth: 130 }} />
          </View>
          {called && (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <Button testID="skip-current-button" label="Lewati" variant="danger" onPress={() => onSkip(called.id)} style={{ flex: 1 }} />
            </View>
          )}
        </Card>

        {/* Status buka toggle — service_enabled removed per user request (Services feature fully dropped) */}
        {selected && (
          <Card style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '600' }}>Status buka</Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
                {selected.is_open ? 'Pelanggan dapat mengambil nomor' : 'Antrian tidak bisa diambil'}
              </Text>
            </View>
            <Switch
              testID="toggle-is-open"
              value={!!selected.is_open}
              onValueChange={toggleIsOpen}
              trackColor={{ true: theme.colors.brand, false: '#CBD5E1' }}
              thumbColor="#fff"
            />
          </Card>
        )}

        {/* QR Pelanggan quick card (Tampilan TV dihilangkan per request) */}
        {selected && (
          <TouchableOpacity
            testID="open-merchant-qr"
            activeOpacity={0.85}
            onPress={() => router.push(`/merchant-qr/${selected.id}`)}
            style={{ marginTop: 12 }}
          >
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="qr-code-outline" size={22} color={theme.colors.brandDark} />
              <Text style={{ flex: 1, fontWeight: '600', color: theme.colors.text }}>QR Code untuk pelanggan scan</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </Card>
          </TouchableOpacity>
        )}

        {/* Services/Layanan section REMOVED per user request — fokus antrian saja */}

        {/* Queue list */}
        <Text style={styles.section}>Waiting ({waiting.length})</Text>
        <FlatList
          data={waiting}
          keyExtractor={(e) => e.id}
          scrollEnabled={false}
          ListEmptyComponent={<Card><Text style={{ color: theme.colors.textMuted }}>No one in line</Text></Card>}
          renderItem={({ item }) => (
            <Card style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.qNum}>#{item.queue_number}</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.qName}>{item.customer_name}</Text>
                <Text style={styles.qCat}>{item.category_name}</Text>
              </View>
              <TouchableOpacity testID={`skip-${item.id}`} onPress={() => onSkip(item.id)} style={styles.smallBtn}>
                <Ionicons name="close" size={18} color={theme.colors.danger} />
              </TouchableOpacity>
            </Card>
          )}
        />
      </ScrollView>
      <BottomDock />
    </SafeAreaView>
  );
}

function promptAddCategory(m: any, reload: () => void) {
  if (!m) return;
  // Cross-platform prompt via Alert on mobile, fallback window.prompt on web
  // @ts-ignore
  if (typeof window !== 'undefined' && window.prompt) {
    // @ts-ignore
    const name = window.prompt('Service name');
    if (!name) return;
    // @ts-ignore
    const mins = parseInt(window.prompt('Avg minutes per customer', '5') || '5', 10) || 5;
    api.addCategory(m.id, { name, avg_service_minutes: mins }).then(reload);
    return;
  }
  Alert.prompt?.('New service', 'Name', (name?: string) => {
    if (!name) return;
    Alert.prompt?.('Minutes per customer', '', (mins?: string) => {
      const n = parseInt(mins || '5', 10) || 5;
      api.addCategory(m.id, { name, avg_service_minutes: n }).then(reload);
    });
  });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  inner: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  merchPill: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14,
    backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border,
    marginRight: 8, gap: 4,
  },
  merchPillActive: { backgroundColor: theme.colors.brandSoft, borderColor: theme.colors.brand },
  merchPillText: { color: theme.colors.text, fontWeight: '700' },
  merchPillTextActive: { color: theme.colors.brandDark },
  smallLabel: { fontSize: 12, color: theme.colors.brandDark, fontWeight: '800', letterSpacing: 2 },
  bigNumber: { fontSize: 64, fontWeight: '900', color: theme.colors.text, letterSpacing: -3, marginTop: 4 },
  sub: { color: theme.colors.text, fontWeight: '600', marginTop: 2 },
  section: { fontSize: 13, fontWeight: '700', color: theme.colors.textMuted, marginTop: 20, marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  catName: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  catSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  qNum: { fontSize: 28, fontWeight: '900', color: theme.colors.brandDark, letterSpacing: -1, minWidth: 64 },
  qName: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  qCat: { fontSize: 12, color: theme.colors.textMuted },
  smallBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' },
  quickAction: { alignItems: 'center', gap: 6, paddingVertical: 16 },
  quickActionText: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
});
