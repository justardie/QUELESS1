import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Image, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors, iosFontFamily, radius } from '../src/themeContext';
import { useTheme } from '../src/themeContext';
import { Card, AppHeaderLogo, Hx, MutedText, BodyText, Badge } from '../src/ui';
import { api } from '../src/api';
import { useAuth } from '../src/auth';
import { requestNotificationPermission } from '../src/notifications';

export default function Home() {
  const router = useRouter();
  const c = useColors();
  const { settings } = useTheme();
  const { user, signOut, loading: authLoading } = useAuth();
  const [merchants, setMerchants] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [list, mine] = await Promise.all([
        api.publicMerchants(),
        user ? api.myActiveQueues().catch(() => []) : Promise.resolve([]),
      ]);
      setMerchants(list);
      setActive((mine as any[])[0] || null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  function routeForUser() {
    if (!user) return router.push('/auth');
    if (user.role === 'admin') return router.push('/admin');
    if (user.role === 'merchant') return router.push('/merchant/dashboard');
    return router.push('/customer/my-queue');
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <AppHeaderLogo logoUrl={settings.app_logo_url} size={36} />
        <Text style={[styles.appName, { color: c.text, fontFamily: iosFontFamily }]}>{settings.app_name || 'QUELESS'}</Text>
        <View style={{ flex: 1 }} />
        {user ? (
          <TouchableOpacity testID="open-settings" onPress={() => router.push('/settings')} style={[styles.iconBtn, { backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)' }]}>
            <Ionicons name="settings-outline" size={20} color={c.text} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            testID="header-signin"
            onPress={() => router.push('/auth')}
            style={[styles.signInBtn, { backgroundColor: c.primary }]}
          >
            <Text style={[styles.signInText, { fontFamily: iosFontFamily }]}>Masuk</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={merchants}
        keyExtractor={(m) => m.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={c.primary} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListHeaderComponent={
          <View>
            <Hx size={30} style={{ marginBottom: 4 }}>Antrian jadi mudah</Hx>
            <MutedText size={15} style={{ marginBottom: 20 }}>Pilih merchant, ambil nomor antrian, pantau posisi Anda secara real-time.</MutedText>

            {active && (
              <TouchableOpacity
                testID="active-queue-banner"
                activeOpacity={0.9}
                onPress={() => router.push(`/customer/queue/${active.id}`)}
              >
                <Card style={{ backgroundColor: c.primary, borderColor: c.primaryDark, marginBottom: 16 }}>
                  <Text style={[styles.activeLabel, { color: 'rgba(255,255,255,0.7)', fontFamily: iosFontFamily }]}>ANTRIAN AKTIF</Text>
                  <Text style={[styles.activeNum, { color: '#fff', fontFamily: iosFontFamily }]}>#{active.queue_number}</Text>
                  <Text style={[styles.activeName, { color: '#fff', fontFamily: iosFontFamily }]}>{active.merchant_name}</Text>
                  <Text style={[styles.activeMeta, { color: 'rgba(255,255,255,0.8)', fontFamily: iosFontFamily }]}>
                    {active.status === 'called' ? 'Silakan menuju counter' : `Posisi ${active.position + 1} • ~${active.estimated_wait_minutes} menit`}
                  </Text>
                </Card>
              </TouchableOpacity>
            )}

            <Text style={[styles.sectionLabel, { color: c.muted, fontFamily: iosFontFamily }]}>MERCHANT TERDAFTAR</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} /> : (
            <Card style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Ionicons name="storefront-outline" size={36} color={c.muted} />
              <BodyText style={{ marginTop: 10 }}>Belum ada merchant terdaftar</BodyText>
            </Card>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            testID={`merchant-card-${item.id}`}
            activeOpacity={0.9}
            onPress={() => router.push(`/customer/merchant/${item.id}`)}
            style={{ marginBottom: 12 }}
          >
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {item.photo_url ? (
                <Image source={{ uri: item.photo_url }} style={styles.mPhoto} resizeMode="cover" />
              ) : (
                <View style={[styles.mPhotoPlaceholder, { backgroundColor: c.soft }]}>
                  <Ionicons name="storefront" size={40} color={c.primaryDark} />
                </View>
              )}
              <View style={{ padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {item.logo_url ? (
                    <Image source={{ uri: item.logo_url }} style={styles.mLogo} />
                  ) : (
                    <View style={[styles.mLogoPlaceholder, { backgroundColor: c.soft }]}>
                      <Ionicons name="business" size={18} color={c.primaryDark} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Hx size={18}>{item.name}</Hx>
                    {item.address ? <MutedText size={13}>{item.address}</MutedText> : null}
                  </View>
                  <View
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
                      backgroundColor: item.is_open ? '#DCFCE7' : '#FEE2E2',
                    }}
                  >
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: item.is_open ? '#10B981' : '#DC2626' }} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: item.is_open ? '#065F46' : '#7F1D1D', fontFamily: iosFontFamily }}>
                      {item.is_open ? 'Buka' : 'Tutup'}
                    </Text>
                  </View>
                </View>
                {item.hours_text ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
                    <Ionicons name="time-outline" size={14} color={c.muted} />
                    <MutedText size={13}>{item.hours_text}</MutedText>
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                  <Badge label={`${item.categories?.length || 0} layanan`} />
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  appName: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  signInBtn: { paddingHorizontal: 18, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  signInText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10, textTransform: 'uppercase' },
  activeLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  activeNum: { fontSize: 44, fontWeight: '900', letterSpacing: -2, marginTop: 2 },
  activeName: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  activeMeta: { fontSize: 13, marginTop: 4 },
  mPhoto: { width: '100%', height: 140 },
  mPhotoPlaceholder: { width: '100%', height: 120, alignItems: 'center', justifyContent: 'center' },
  mLogo: { width: 40, height: 40, borderRadius: 12 },
  mLogoPlaceholder: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
