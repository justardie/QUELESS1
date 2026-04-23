import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../src/themeContext';
import { Card, Hx, MutedText, BodyText, Button, Badge } from '../../src/ui';
import { api } from '../../src/api';

function fmtIDR(n: number) { return 'Rp ' + n.toLocaleString('id-ID'); }

export default function Packages() {
  const router = useRouter();
  const c = useColors();
  const [packages, setPackages] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);

  async function load() {
    const [p, s] = await Promise.all([api.packages(), api.mySubscriptions().catch(() => null)]);
    setPackages(p);
    setActive((s as any)?.active || null);
  }
  useEffect(() => { load(); }, []);

  async function buy(pkgId: string) {
    try {
      const payment: any = await api.createPayment({ package_id: pkgId });
      router.push(`/payment/${payment.id}`);
    } catch (e: any) { Alert.alert('Gagal', e.message); }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)' }}>
            <Ionicons name="arrow-back" size={22} color={c.text} />
          </TouchableOpacity>
          <Hx size={24}>Pilih paket</Hx>
        </View>

        {active && (
          <Card style={{ backgroundColor: c.soft, borderColor: c.primary, marginBottom: 14 }}>
            <MutedText size={12} style={{ color: c.primaryDark, fontWeight: '700', letterSpacing: 1 }}>PAKET AKTIF SAAT INI</MutedText>
            <BodyText weight="700" size={17} style={{ marginTop: 4 }}>{active.package_name}</BodyText>
            <MutedText size={13}>Sisa kuota: {active.credits_remaining} • Berakhir {active.expires_at ? new Date(active.expires_at).toLocaleDateString('id-ID') : '-'}</MutedText>
          </Card>
        )}

        {packages.map(p => (
          <Card key={p.id} style={{ marginBottom: 10 }}>
            <Hx size={20}>{p.name}</Hx>
            <MutedText size={13} style={{ marginTop: 4 }}>{p.description}</MutedText>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              <Badge label={`${p.quota_count}× antrian`} />
              <Badge label={`${p.duration_days} hari`} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 }}>
              <Hx size={22} style={{ flex: 1 }}>{fmtIDR(p.price_idr)}</Hx>
              <Button testID={`buy-${p.id}`} label={p.price_idr === 0 ? 'Ambil gratis' : 'Beli'} onPress={() => buy(p.id)} />
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
