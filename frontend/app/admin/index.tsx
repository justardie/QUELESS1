import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/theme';
import { Card, ScreenHeader, Badge, Button } from '../../src/ui';
import { BottomDock, BOTTOM_DOCK_HEIGHT } from '../../src/bottomDock';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth';

export default function Admin() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<any | null>(null);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'merchants' | 'users'>('merchants');

  const load = useCallback(async () => {
    try {
      const [s, m, u] = await Promise.all([api.adminStats(), api.adminMerchants(), api.adminUsers()]);
      setStats(s); setMerchants(m); setUsers(u);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleLogout() {
    await signOut();
    router.replace('/');
  }

  async function setStatus(id: string, status: string) {
    try {
      await api.adminUpdateMerchantStatus(id, status);
      await load();
    } catch (e: any) { Alert.alert('Error', e.message); }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={theme.colors.brand} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: BOTTOM_DOCK_HEIGHT + 40 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={theme.colors.brand} />}>
        <ScreenHeader
          title="Admin"
          subtitle={user?.email}
        />

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard label="Users" value={stats?.users ?? 0} color={theme.colors.brandSoft} textColor={theme.colors.brandDark} />
          <StatCard label="Merchants" value={stats?.merchants ?? 0} color={theme.colors.mint} textColor="#065F46" />
          <StatCard label="Pending" value={stats?.pending_merchants ?? 0} color={theme.colors.sun} textColor="#92400E" />
        </View>
        <Card style={{ marginTop: 10 }}>
          <Text style={{ fontSize: 12, color: theme.colors.textMuted, fontWeight: '700', letterSpacing: 1 }}>QUEUES TODAY</Text>
          <Text style={{ fontSize: 36, fontWeight: '900', color: theme.colors.text, letterSpacing: -1 }}>{stats?.total_queues_today ?? 0}</Text>
        </Card>

        {/* Tabs */}
        <View style={[styles.tabs, { marginTop: 20 }]}>
          {(['merchants', 'users'] as const).map(t => (
            <TouchableOpacity
              key={t}
              testID={`tab-${t}`}
              onPress={() => setTab(t)}
              style={[styles.tab, tab === t && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'merchants' ? 'Merchants' : 'Users'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'merchants' ? (
          <>
            <Button
              testID="add-merchant-admin-button"
              label="+ Tambah Merchant"
              onPress={() => router.push('/admin/create-merchant')}
              style={{ marginTop: 10 }}
            />
            {merchants.map(m => (
            <Card key={m.id} style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{m.name}</Text>
                  <Text style={styles.muted}>{m.description || '—'}</Text>
                </View>
                <Badge
                  label={m.status}
                  color={m.status === 'approved' ? theme.colors.mint : m.status === 'pending' ? theme.colors.sun : theme.colors.peach}
                  textColor={m.status === 'approved' ? '#065F46' : m.status === 'pending' ? '#92400E' : '#7F1D1D'}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {m.status !== 'approved' && (
                  <Button testID={`approve-${m.id}`} label="Approve" onPress={() => setStatus(m.id, 'approved')} style={{ flex: 1, minWidth: 100 }} />
                )}
                {m.status !== 'suspended' && (
                  <Button testID={`suspend-${m.id}`} label="Suspend" variant="secondary" onPress={() => setStatus(m.id, 'suspended')} style={{ flex: 1, minWidth: 100 }} />
                )}
                {m.status !== 'rejected' && (
                  <Button testID={`reject-${m.id}`} label="Reject" variant="danger" onPress={() => setStatus(m.id, 'rejected')} style={{ flex: 1, minWidth: 100 }} />
                )}
              </View>
            </Card>
          ))}
          </>
        ) : (
          users.map(u => (
            <Card key={u.id} style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{u.name}</Text>
                <Text style={styles.muted}>{u.email}</Text>
              </View>
              <Badge
                label={u.role}
                color={u.role === 'admin' ? theme.colors.peach : u.role === 'merchant' ? theme.colors.brandSoft : theme.colors.bg2}
                textColor={u.role === 'admin' ? '#7F1D1D' : u.role === 'merchant' ? theme.colors.brandDark : theme.colors.text}
              />
            </Card>
          ))
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
      <BottomDock />
    </SafeAreaView>
  );
}

function StatCard({ label, value, color, textColor }: { label: string; value: number; color: string; textColor: string }) {
  return (
    <View style={[styles.stat, { backgroundColor: color }]}>
      <Text style={[styles.statLabel, { color: textColor }]}>{label}</Text>
      <Text style={[styles.statVal, { color: textColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  statsRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, borderRadius: 20, padding: 16 },
  statLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  statVal: { fontSize: 32, fontWeight: '900', letterSpacing: -1, marginTop: 4 },
  tabs: { flexDirection: 'row', backgroundColor: theme.colors.bg2, borderRadius: 14, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#fff' },
  tabText: { color: theme.colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: theme.colors.text },
  name: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  muted: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
});
