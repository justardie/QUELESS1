import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/theme';
import { Card, ScreenHeader, Badge } from '../../src/ui';
import { BottomDock, BOTTOM_DOCK_HEIGHT } from '../../src/bottomDock';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth';

export default function Merchants() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [merchants, setMerchants] = useState<any[]>([]);
  const [mine, setMine] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [list, my] = await Promise.all([
        api.publicMerchants(),
        user ? api.myActiveQueues().catch(() => []) : Promise.resolve([]),
      ]);
      setMerchants(list);
      setMine(my);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.inner}>
        <ScreenHeader
          title={`Hi, ${user?.name?.split(' ')[0] || 'there'}`}
          subtitle="Pick a merchant to join the queue"
          right={
            <TouchableOpacity testID="logout-button" onPress={signOut} style={styles.iconBtn}>
              <Ionicons name="log-out-outline" size={22} color={theme.colors.text} />
            </TouchableOpacity>
          }
        />

        {mine.length > 0 && (
          <TouchableOpacity
            testID="active-queue-banner"
            onPress={() => router.push('/customer/my-queue')}
            activeOpacity={0.9}
          >
            <Card style={styles.activeCard}>
              <Text style={styles.activeLabel}>Active queue</Text>
              <Text style={styles.activeNumber}>#{mine[0].queue_number}</Text>
              <Text style={styles.activeMerchant}>{mine[0].merchant_name}</Text>
              <Text style={styles.activePos}>
                Position {mine[0].position + 1} • ~{mine[0].estimated_wait_minutes} min wait
              </Text>
            </Card>
          </TouchableOpacity>
        )}

        {loading ? (
          <ActivityIndicator color={theme.colors.brand} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={merchants}
            keyExtractor={(m) => m.id}
            refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={theme.colors.brand} />}
            contentContainerStyle={{ paddingVertical: 8, paddingBottom: 40 }}
            ListEmptyComponent={
              <Card style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ color: theme.colors.textMuted }}>No merchants available yet</Text>
              </Card>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                testID={`merchant-list-item-${item.id}`}
                activeOpacity={0.9}
                onPress={() => router.push(`/customer/merchant/${item.id}`)}
                style={{ marginBottom: 12 }}
              >
                <Card style={styles.merchantCard}>
                  <View style={styles.avatar}>
                    <Ionicons name="storefront-outline" size={22} color={theme.colors.brandDark} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mName}>{item.name}</Text>
                    {!!item.description && <Text style={styles.mDesc} numberOfLines={1}>{item.description}</Text>}
                    <View style={{ flexDirection: 'row', marginTop: 6, gap: 6 }}>
                      <Badge label={`${item.categories?.length || 0} categories`} />
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
                </Card>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
      <BottomDock />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  inner: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  activeCard: { backgroundColor: theme.colors.brandSoft, borderColor: theme.colors.brand, marginBottom: 14 },
  activeLabel: { color: theme.colors.brandDark, fontWeight: '700', fontSize: 12, letterSpacing: 1 },
  activeNumber: { fontSize: 44, fontWeight: '900', color: theme.colors.text, letterSpacing: -2, marginTop: 4 },
  activeMerchant: { fontSize: 15, color: theme.colors.text, fontWeight: '600' },
  activePos: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  merchantCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  mName: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  mDesc: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
});
