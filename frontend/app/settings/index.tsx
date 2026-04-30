import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors, iosFontFamily } from '../../src/themeContext';
import { Card, Hx, MutedText, BodyText, Button } from '../../src/ui';
import { BottomDock, BOTTOM_DOCK_HEIGHT } from '../../src/bottomDock';
import { useAuth } from '../../src/auth';
import { api } from '../../src/api';

export default function SettingsHub() {
  const router = useRouter();
  const c = useColors();
  const { user } = useAuth();
  const [activeSub, setActiveSub] = useState<any | null>(null);

  useEffect(() => {
    if (user?.role === 'customer') {
      api.mySubscriptions().then((d: any) => setActiveSub(d?.active || null)).catch(() => {});
    }
  }, [user]);

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
        <View style={{ padding: 20 }}>
          <Header title="Pengaturan" onBack={() => router.back()} />
          <Card><BodyText>Silakan masuk untuk melihat pengaturan</BodyText></Card>
          <View style={{ height: 16 }} />
          <Button label="Masuk" onPress={() => router.push('/auth')} />
        </View>
      </SafeAreaView>
    );
  }

  const items: { label: string; sub: string; icon: any; to?: string; action?: () => void; show: boolean }[] = [
    { label: 'Profil saya', sub: 'Nama, foto, nomor HP', icon: 'person-outline', to: '/settings/profile', show: true },
    { label: 'Beli paket', sub: 'Upgrade atau perpanjang langganan', icon: 'bag-handle-outline', to: '/settings/packages', show: user.role === 'customer' },
    { label: 'Profil merchant', sub: 'Logo, foto, alamat & jam operasional', icon: 'storefront-outline', to: '/settings/merchant', show: user.role === 'merchant' },
    { label: 'Tampilan TV', sub: 'Link display TV untuk layar besar', icon: 'tv-outline', to: '/merchant/shares', show: user.role === 'merchant' },
    { label: 'Tampilan aplikasi', sub: 'Logo, nama, tagline & warna tema', icon: 'color-palette-outline', to: '/settings/appearance', show: user.role === 'admin' },
    { label: 'Pembayaran (Midtrans QRIS)', sub: 'Server & client key, mode sandbox/production', icon: 'card-outline', to: '/settings/payments', show: user.role === 'admin' },
    { label: 'Paket langganan', sub: 'Kelola paket customer', icon: 'pricetags-outline', to: '/settings/packages-admin', show: user.role === 'admin' },
    { label: 'Subscription customer', sub: 'Lihat & ubah status paket', icon: 'people-outline', to: '/settings/subscriptions-admin', show: user.role === 'admin' },
    { label: 'Statistik antrian', sub: 'Jumlah antrian per merchant', icon: 'stats-chart-outline', to: '/settings/queue-stats', show: user.role === 'admin' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: BOTTOM_DOCK_HEIGHT + 60 }}>
        <Header title="Pengaturan" onBack={() => router.back()} />

        {/* Profile card — gradient */}
        <LinearGradient
          colors={[c.primary, c.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.profileCard, { marginBottom: 16 }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={styles.profileAvatar}>
              <Ionicons name="person-outline" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { fontFamily: iosFontFamily }]}>{user.name}</Text>
              <Text style={[styles.profileSub, { fontFamily: iosFontFamily }]}>{user.email} · {user.role}</Text>
              {user.role === 'customer' && activeSub && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80' }} />
                  <Text style={[styles.profilePackage, { fontFamily: iosFontFamily }]}>
                    {activeSub.package_name} · {activeSub.credits_remaining} kuota tersisa
                  </Text>
                </View>
              )}
              {user.role === 'customer' && !activeSub && (
                <Text style={[styles.profilePackage, { fontFamily: iosFontFamily }]}>Belum ada paket aktif</Text>
              )}
            </View>
          </View>
        </LinearGradient>

        {items.filter(i => i.show).map((it, i) => (
          <TouchableOpacity
            key={i}
            testID={`settings-item-${i}`}
            activeOpacity={0.9}
            onPress={() => it.to ? router.push(it.to as any) : it.action?.()}
            style={{ marginBottom: 10 }}
          >
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={it.icon} size={20} color={c.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <BodyText weight="600">{it.label}</BodyText>
                <MutedText size={13}>{it.sub}</MutedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={c.muted} />
            </Card>
          </TouchableOpacity>
        ))}

      </ScrollView>
      <BottomDock />
    </SafeAreaView>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <TouchableOpacity onPress={onBack} style={[styles.iconBtn, { backgroundColor: '#fff', borderColor: 'rgba(15,23,42,0.08)' }]}>
        <Ionicons name="arrow-back" size={22} color={c.text} />
      </TouchableOpacity>
      <Hx size={24}>{title}</Hx>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  profileCard: {
    borderRadius: 20, padding: 18,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  profileAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  profileName: { fontSize: 17, fontWeight: '700', color: '#fff' },
  profileSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  profilePackage: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
});
