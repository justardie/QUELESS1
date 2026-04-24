import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/theme';
import { Card, ScreenHeader, Badge } from '../../src/ui';
import { BottomDock, BOTTOM_DOCK_HEIGHT } from '../../src/bottomDock';
import { api } from '../../src/api';

export default function MyQueue() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.myActiveQueues();
      setItems(data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.inner}>
        <ScreenHeader
          title="My queues"
          subtitle="Active tickets you are holding"
          right={
            <TouchableOpacity onPress={() => router.replace('/customer/merchants')} style={styles.iconBtn}>
              <Ionicons name="home-outline" size={22} color={theme.colors.text} />
            </TouchableOpacity>
          }
        />
        {loading ? (
          <ActivityIndicator color={theme.colors.brand} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(e) => e.id}
            refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={theme.colors.brand} />}
            ListEmptyComponent={<Card style={{ alignItems: 'center', paddingVertical: 40 }}><Text style={{ color: theme.colors.textMuted }}>No active queues</Text></Card>}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push(`/customer/queue/${item.id}`)}
                style={{ marginBottom: 10 }}
              >
                <Card>
                  <Text style={styles.merchant}>{item.merchant_name}</Text>
                  <Text style={styles.number}>#{item.queue_number}</Text>
                  <Text style={styles.cat}>{item.category_name}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <Badge
                      label={item.status === 'called' ? 'Called' : `Position ${item.position + 1}`}
                      color={item.status === 'called' ? theme.colors.mint : theme.colors.brandSoft}
                      textColor={item.status === 'called' ? '#065F46' : theme.colors.brandDark}
                    />
                    <Badge label={`~${item.estimated_wait_minutes} min`} color={theme.colors.sun} textColor="#92400E" />
                  </View>
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
  merchant: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  number: { fontSize: 36, fontWeight: '900', color: theme.colors.text, letterSpacing: -2, marginTop: 2 },
  cat: { fontSize: 13, color: theme.colors.textMuted },
});
