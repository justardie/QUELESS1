import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors, iosFontFamily } from '../../src/themeContext';
import { Card, Hx, MutedText, BodyText, Button } from '../../src/ui';
import { useAuth } from '../../src/auth';

export default function SettingsHub() {
  const router = useRouter();
  const c = useColors();
  const { user, signOut } = useAuth();

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
    { label: 'Paket langganan saya', sub: 'Lihat kuota & riwayat pembelian', icon: 'card-outline', to: '/settings/subscription', show: user.role === 'customer' },
    { label: 'Beli paket', sub: 'Upgrade atau perpanjang', icon: 'bag-handle-outline', to: '/settings/packages', show: user.role === 'customer' },
    { label: 'Profil merchant', sub: 'Logo, foto, alamat & jam operasional', icon: 'storefront-outline', to: '/settings/merchant', show: user.role === 'merchant' || user.role === 'admin' },
    { label: 'Tampilan TV & QR code', sub: 'Link display TV + QR scan pelanggan', icon: 'qr-code-outline', to: '/merchant/shares', show: user.role === 'merchant' },
    { label: 'Tampilan aplikasi', sub: 'Logo, nama, tagline & warna tema', icon: 'color-palette-outline', to: '/settings/appearance', show: user.role === 'admin' },
    { label: 'Pembayaran (Midtrans QRIS)', sub: 'Server & client key, mode sandbox/production', icon: 'card-outline', to: '/settings/payments', show: user.role === 'admin' },
    { label: 'Paket langganan', sub: 'Kelola paket customer', icon: 'pricetags-outline', to: '/settings/packages-admin', show: user.role === 'admin' },
    { label: 'Subscription customer', sub: 'Lihat & ubah status paket', icon: 'people-outline', to: '/settings/subscriptions-admin', show: user.role === 'admin' },
    { label: 'Statistik antrian', sub: 'Jumlah antrian per merchant', icon: 'stats-chart-outline', to: '/settings/queue-stats', show: user.role === 'admin' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <Header title="Pengaturan" onBack={() => router.back()} />

        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="person-outline" size={22} color={c.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <BodyText weight="700">{user.name}</BodyText>
            <MutedText size={13}>{user.email} • {user.role}</MutedText>
          </View>
        </Card>

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

        <View style={{ height: 20 }} />
        {user.role === 'admin' && (
          <>
            <Button
              testID="cleanup-orphans"
              label="Bersihkan data orphan"
              variant="secondary"
              onPress={() => {
                Alert.alert('Bersihkan data orphan?', 'Akan menghapus merchant/queue/subscription/payment yang merujuk ke data yang sudah tidak ada.', [
                  { text: 'Batal', style: 'cancel' },
                  {
                    text: 'Bersihkan', onPress: async () => {
                      try {
                        const r: any = await (require('../../src/api').api.adminCleanupOrphans());
                        Alert.alert('Selesai', `Orphan merchants: ${r.orphan_merchants}\nQueue entries: ${r.orphan_queue_entries}\nSubscriptions: ${r.orphan_subscriptions}\nPayments: ${r.orphan_payments}`);
                      } catch (e: any) { Alert.alert('Gagal', e.message); }
                    }
                  },
                ]);
              }}
            />
            <View style={{ height: 10 }} />
          </>
        )}
        <Button
          testID="logout-button"
          label="Keluar"
          variant="secondary"
          onPress={() => {
            signOut();
            router.replace('/');
          }}
        />
      </ScrollView>
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
});
