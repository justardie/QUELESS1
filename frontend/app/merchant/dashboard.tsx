import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, RefreshControl, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/theme';
import { Card, ScreenHeader, Badge, Button } from '../../src/ui';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth';

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
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => { loadMerchants(); loadQueue(); }} tintColor={theme.colors.brand} />}
      >
        <ScreenHeader
          title="Dashboard"
          subtitle={user?.email}
          right={<TouchableOpacity testID="logout-button" onPress={handleLogout} style={styles.iconBtn}><Ionicons name="log-out-outline" size={22} color={theme.colors.text} /></TouchableOpacity>}
        />

        {/* merchant tabs */}
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
          <TouchableOpacity
            testID="add-merchant-button"
            onPress={() => router.push('/merchant/register')}
            style={[styles.merchPill, { flexDirection: 'row', gap: 6, alignItems: 'center' }]}
          >
            <Ionicons name="add" size={16} color={theme.colors.brandDark} />
            <Text style={[styles.merchPillText, { color: theme.colors.brandDark }]}>Add</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Now serving */}
        <Card style={{ backgroundColor: theme.colors.brandSoft, borderColor: theme.colors.brand }}>
          <Text style={styles.smallLabel}>NOW SERVING</Text>
          <Text style={styles.bigNumber}>{called ? `#${called.queue_number}` : '—'}</Text>
          {called && <Text style={styles.sub}>{called.customer_name} • {called.category_name}</Text>}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <Button testID="call-next-button" label="Panggil berikutnya" onPress={onCallNext} style={{ flex: 1, minWidth: 130 }} />
            {called && (
              <>
                <Button testID="serve-current-button" label="Selesai" variant="secondary" onPress={() => onServe(called.id)} style={{ flex: 1, minWidth: 100 }} />
                <Button testID="skip-current-button" label="Lewati" variant="danger" onPress={() => onSkip(called.id)} style={{ flex: 1, minWidth: 100 }} />
              </>
            )}
          </View>
        </Card>

        {/* Share / display links */}
        {selected && (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <TouchableOpacity
              testID="open-tv-display"
              activeOpacity={0.85}
              onPress={() => router.push(`/tv/${selected.id}`)}
              style={{ flex: 1 }}
            >
              <Card style={styles.quickAction}>
                <Ionicons name="tv-outline" size={22} color={theme.colors.brandDark} />
                <Text style={styles.quickActionText}>Tampilan TV</Text>
              </Card>
            </TouchableOpacity>
            <TouchableOpacity
              testID="open-merchant-qr"
              activeOpacity={0.85}
              onPress={() => router.push(`/merchant-qr/${selected.id}`)}
              style={{ flex: 1 }}
            >
              <Card style={styles.quickAction}>
                <Ionicons name="qr-code-outline" size={22} color={theme.colors.brandDark} />
                <Text style={styles.quickActionText}>QR Pelanggan</Text>
              </Card>
            </TouchableOpacity>
          </View>
        )}

        {/* Categories manage */}
        <Text style={styles.section}>Services</Text>
        <Card>
          {(selected?.categories || []).length === 0 ? (
            <Text style={{ color: theme.colors.textMuted }}>No services yet</Text>
          ) : (
            selected.categories.map((c: any) => (
              <View key={c.id} style={styles.catRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.catName}>{c.name}</Text>
                  <Text style={styles.catSub}>~{c.avg_service_minutes} min</Text>
                </View>
                <TouchableOpacity
                  testID={`delete-category-${c.id}`}
                  onPress={async () => {
                    await api.deleteCategory(selected.id, c.id);
                    await loadMerchants();
                  }}>
                  <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
                </TouchableOpacity>
              </View>
            ))
          )}
          <View style={{ height: 10 }} />
          <Button
            testID="add-service-button"
            label="Add service"
            variant="secondary"
            onPress={() => promptAddCategory(selected, loadMerchants)}
          />
        </Card>

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
