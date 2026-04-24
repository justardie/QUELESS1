import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../src/themeContext';
import { Card, Hx, MutedText, BodyText, Button, Badge } from '../../src/ui';
import { BottomDock, BOTTOM_DOCK_HEIGHT } from '../../src/bottomDock';
import { api } from '../../src/api';

export default function MySubscription() {
  const router = useRouter();
  const c = useColors();
  const [data, setData] = useState<any | null>(null);

  async function load() {
    const d = await api.mySubscriptions();
    setData(d);
  }
  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: BOTTOM_DOCK_HEIGHT + 60 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)' }}>
            <Ionicons name="arrow-back" size={22} color={c.text} />
          </TouchableOpacity>
          <Hx size={24}>Paket saya</Hx>
        </View>

        {data?.active ? (
          <Card style={{ backgroundColor: c.primary, marginBottom: 16 }}>
            <MutedText size={11} style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '700', letterSpacing: 2 }}>PAKET AKTIF</MutedText>
            <Hx size={26} style={{ color: '#fff', marginTop: 4 }}>{data.active.package_name}</Hx>
            <View style={{ flexDirection: 'row', gap: 20, marginTop: 16 }}>
              <View>
                <MutedText size={12} style={{ color: 'rgba(255,255,255,0.7)' }}>Sisa kuota</MutedText>
                <Hx size={28} style={{ color: '#fff' }}>{data.active.credits_remaining}</Hx>
              </View>
              <View>
                <MutedText size={12} style={{ color: 'rgba(255,255,255,0.7)' }}>Berakhir</MutedText>
                <BodyText weight="700" style={{ color: '#fff', marginTop: 6 }}>
                  {data.active.expires_at ? new Date(data.active.expires_at).toLocaleDateString('id-ID') : '-'}
                </BodyText>
              </View>
            </View>
          </Card>
        ) : (
          <Card style={{ marginBottom: 16 }}>
            <BodyText weight="600">Belum ada paket aktif</BodyText>
            <MutedText size={13} style={{ marginTop: 6 }}>Beli paket untuk mulai ambil nomor antrian sebagai member.</MutedText>
            <View style={{ height: 14 }} />
            <Button label="Lihat paket" onPress={() => router.push('/settings/packages')} />
          </Card>
        )}

        <Hx size={18} style={{ marginTop: 4, marginBottom: 10 }}>Riwayat transaksi</Hx>
        {(!data || !data.payments || data.payments.length === 0) && <Card><BodyText>Belum ada riwayat transaksi</BodyText></Card>}
        {data?.payments?.map((p: any) => (
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
                <Badge
                  label="Paid"
                  color="#DCFCE7"
                  textColor="#065F46"
                />
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
