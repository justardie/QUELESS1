import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../src/themeContext';
import { Card, Hx, MutedText, BodyText, Button, Badge } from '../../src/ui';
import { BottomDock, BOTTOM_DOCK_HEIGHT } from '../../src/bottomDock';
import { api } from '../../src/api';

function fmtIDR(n: number) { return 'Rp ' + n.toLocaleString('id-ID'); }

export default function Packages() {
  const router = useRouter();
  const c = useColors();
  const [packages, setPackages] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [payments, setPayments] = useState<any[]>([]);

  async function load() {
    const [p, s] = await Promise.all([api.packages(), api.mySubscriptions().catch(() => null)]);
    setPackages(p);
    setActive((s as any)?.active || null);
    setPayments((s as any)?.payments || []);
  }
  useEffect(() => { load(); }, []);

  async function buy(pkgId: string) {
    try {
      const payment: any = await api.createPayment({ package_id: pkgId });
      if (payment.status === 'paid') {
        const { notify } = await import('../../src/alerts');
        notify('Paket gratis berhasil diaktifkan!');
        await load();
        return;
      }
      router.push(`/payment/${payment.id}`);
    } catch (e: any) {
      const { notify } = await import('../../src/alerts');
      notify(e.message, 'Gagal');
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: BOTTOM_DOCK_HEIGHT + 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)' }}>
            <Ionicons name="arrow-back" size={22} color={c.text} />
          </TouchableOpacity>
          <Hx size={24}>Beli paket</Hx>
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

        {/* Transaction history */}
        <Hx size={18} style={{ marginTop: 20, marginBottom: 10 }}>Riwayat transaksi</Hx>
        {payments.length === 0 && <Card><BodyText>Belum ada riwayat transaksi</BodyText></Card>}
        {payments.map((p: any) => (
          <Card key={p.id} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <BodyText weight="700">{p.package_name}</BodyText>
                <MutedText size={12}>
                  {p.paid_at ? new Date(p.paid_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                </MutedText>
                <MutedText size={12}>Order: {p.order_id}</MutedText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <BodyText weight="700" size={14}>
                  {p.amount_idr === 0 ? 'GRATIS' : `Rp ${p.amount_idr.toLocaleString('id-ID')}`}
                </BodyText>
                <Badge label="Paid" color="#DCFCE7" textColor="#065F46" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <Badge label={`+${p.quota_added} kuota`} />
              <Badge label={`+${p.duration_days} hari`} />
            </View>
          </Card>
        ))}
      </ScrollView>
      <BottomDock />
    </SafeAreaView>
  );
}
