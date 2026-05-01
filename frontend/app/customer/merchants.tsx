import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors, iosFontFamily } from '../../src/themeContext';
import { AppLogo } from '../../src/ui';
import { BottomDock, BOTTOM_DOCK_HEIGHT } from '../../src/bottomDock';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth';

export default function Merchants() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const c = useColors();
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
    <SafeAreaView style={[s.container, { backgroundColor: c.bg }]} edges={['top']}>
      <View style={s.inner}>
        {/* Header */}
        <View style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <AppLogo size={32} />
            <Text style={[s.appName, { color: c.text, fontFamily: iosFontFamily }]}>Queless</Text>
          </View>
          {user ? (
            <TouchableOpacity testID="logout-button" onPress={signOut} style={[s.iconBtn, { borderColor: 'rgba(15,23,42,0.08)' }]}>
              <Ionicons name="log-out-outline" size={20} color={c.text} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => router.push('/auth')} style={[s.loginBtn, { backgroundColor: c.primary }]}>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13, fontFamily: iosFontFamily }}>Masuk</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tagline */}
        <View style={{ marginBottom: 16 }}>
          <Text style={[s.tagline, { color: c.text, fontFamily: iosFontFamily }]}>Antrian jadi{'\n'}mudah & cepat</Text>
          <Text style={[s.taglineSub, { color: c.muted, fontFamily: iosFontFamily }]}>Pilih merchant, ambil nomor, pantau real-time</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={merchants}
            keyExtractor={(m) => m.id}
            refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={c.primary} />}
            contentContainerStyle={{ paddingBottom: BOTTOM_DOCK_HEIGHT + 20 }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              mine.length > 0 ? (
                <TouchableOpacity
                  testID="active-queue-banner"
                  onPress={() => router.push('/customer/my-queue')}
                  activeOpacity={0.9}
                  style={{ marginBottom: 16 }}
                >
                  <LinearGradient
                    colors={[c.primary, c.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.activeBanner}
                  >
                    <View style={s.orb1} />
                    <View style={s.orb2} />
                    <Text style={[s.bannerLabel, { fontFamily: iosFontFamily }]}>ANTRIAN AKTIF</Text>
                    <Text style={[s.bannerNum, { fontFamily: iosFontFamily }]}>#{mine[0].queue_number}</Text>
                    <Text style={[s.bannerMerchant, { fontFamily: iosFontFamily }]}>{mine[0].merchant_name}</Text>
                    <Text style={[s.bannerSub, { fontFamily: iosFontFamily }]}>
                      Posisi {mine[0].position + 1} • ~{mine[0].estimated_wait_minutes} menit lagi
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" style={s.bannerChevron} />
                  </LinearGradient>
                </TouchableOpacity>
              ) : null
            }
            ListEmptyComponent={
              <View style={[s.emptyCard, { backgroundColor: '#fff' }]}>
                <Text style={{ color: c.muted, fontFamily: iosFontFamily }}>Belum ada merchant tersedia</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                testID={`merchant-list-item-${item.id}`}
                activeOpacity={0.92}
                onPress={() => router.push(`/customer/merchant/${item.slug || item.id}`)}
                style={{ marginBottom: 14 }}
              >
                <View style={[s.card, { backgroundColor: '#fff' }]}>
                  {/* Hero photo */}
                  <View style={s.heroWrap}>
                    {item.photo_url ? (
                      <Image source={{ uri: item.photo_url }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                    ) : (
                      <LinearGradient colors={[c.primary, c.primaryDark]} style={StyleSheet.absoluteFillObject} />
                    )}
                    <LinearGradient
                      colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.32)']}
                      style={StyleSheet.absoluteFillObject}
                    />
                    {item.is_currently_open && item.now_serving_number != null && (
                      <View style={s.nowBadge}>
                        <Text style={[s.nowBadgeLabel, { fontFamily: iosFontFamily }]}>SEDANG DILAYANI</Text>
                        <Text style={[s.nowBadgeNum, { fontFamily: iosFontFamily }]}>#{item.now_serving_number}</Text>
                      </View>
                    )}
                    {item.is_currently_open && (
                      <View style={s.queueBadge}>
                        <Ionicons name="people" size={12} color="#fff" />
                        <Text style={[s.queueBadgeText, { fontFamily: iosFontFamily }]}>{item.active_queue_count ?? 0} menunggu</Text>
                      </View>
                    )}
                  </View>

                  {/* Body */}
                  <View style={s.cardBody}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.mName, { color: c.text, fontFamily: iosFontFamily }]}>{item.name}</Text>
                        {!!item.description && (
                          <Text style={[s.mDesc, { color: c.muted, fontFamily: iosFontFamily }]} numberOfLines={1}>{item.description}</Text>
                        )}
                      </View>
                      <View style={[s.openBadge, { backgroundColor: item.is_currently_open ? '#D1FAE5' : '#FEE2E2' }]}>
                        <View style={[s.openDot, { backgroundColor: item.is_currently_open ? '#10B981' : '#EF4444' }]} />
                        <Text style={[s.openText, { color: item.is_currently_open ? '#065F46' : '#7F1D1D', fontFamily: iosFontFamily }]}>
                          {item.is_currently_open ? 'Buka' : 'Tutup'}
                        </Text>
                      </View>
                    </View>
                    {!!item.address && (
                      <View style={s.infoRow}>
                        <Ionicons name="location-outline" size={12} color={c.muted} />
                        <Text style={[s.infoText, { color: c.muted, fontFamily: iosFontFamily }]} numberOfLines={1}>{item.address}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
      <BottomDock />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  appName: { fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  loginBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  tagline: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5, lineHeight: 32 },
  taglineSub: { fontSize: 13, marginTop: 6 },
  activeBanner: {
    borderRadius: 20, padding: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  orb1: { position: 'absolute', right: -20, top: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.07)' },
  orb2: { position: 'absolute', right: 20, bottom: -30, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.05)' },
  bannerLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' },
  bannerNum: { fontSize: 52, fontWeight: '900', color: '#fff', letterSpacing: -2, lineHeight: 56, marginTop: 2 },
  bannerMerchant: { fontSize: 15, fontWeight: '600', color: '#fff', marginTop: 4 },
  bannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  bannerChevron: { position: 'absolute', right: 16, top: 48 },
  card: {
    borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  heroWrap: { height: 150, position: 'relative', backgroundColor: '#E5E7EB' },
  nowBadge: {
    position: 'absolute', bottom: 10, left: 12,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: 6, paddingHorizontal: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  nowBadgeLabel: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.75)', letterSpacing: 1.2 },
  nowBadgeNum: { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  queueBadge: {
    position: 'absolute', bottom: 10, right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  queueBadgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  cardBody: { padding: 14 },
  mName: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  mDesc: { fontSize: 13, marginTop: 2 },
  openBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  openDot: { width: 6, height: 6, borderRadius: 3 },
  openText: { fontSize: 11, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  infoText: { fontSize: 12, flex: 1 },
  emptyCard: { borderRadius: 18, padding: 40, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 2 } },
});
