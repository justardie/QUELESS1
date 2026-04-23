import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/theme';
import { Card } from '../../src/ui';
import { api } from '../../src/api';

export default function TVPicker() {
  const router = useRouter();
  const [merchants, setMerchants] = useState<any[] | null>(null);

  useEffect(() => {
    api.publicMerchants().then(setMerchants).catch(() => setMerchants([]));
  }, []);

  if (!merchants) {
    return <View style={styles.center}><ActivityIndicator color={theme.colors.brand} /></View>;
  }

  return (
    <LinearGradient colors={['#EFE9FF', '#FCE7F3', '#E0F2FE']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={{ padding: 20, flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
            </TouchableOpacity>
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.title}>TV Display</Text>
              <Text style={styles.sub}>Pick a merchant to display</Text>
            </View>
          </View>

          <FlatList
            data={merchants}
            keyExtractor={(m) => m.id}
            ListEmptyComponent={<Card><Text style={{ color: theme.colors.textMuted }}>No approved merchants</Text></Card>}
            renderItem={({ item }) => (
              <TouchableOpacity
                testID={`tv-pick-${item.id}`}
                onPress={() => router.push(`/tv/${item.id}`)}
                style={{ marginBottom: 10 }}
              >
                <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={styles.avatar}><Ionicons name="tv-outline" size={22} color={theme.colors.brandDark} /></View>
                  <Text style={{ flex: 1, fontWeight: '700', color: theme.colors.text, fontSize: 16 }}>{item.name}</Text>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
                </Card>
              </TouchableOpacity>
            )}
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  title: { fontSize: 24, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.5 },
  sub: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
});
