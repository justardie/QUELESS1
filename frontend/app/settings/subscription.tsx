import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../src/themeContext';
import { Card, Hx, MutedText, BodyText, Button, Badge } from '../../src/ui';
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
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
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

        <Hx size={18} style={{ marginTop: 4, marginBottom: 10 }}>Riwayat</Hx>
        {(!data || data.subscriptions?.length === 0) && <Card><BodyText>Belum ada riwayat</BodyText></Card>}
        {data?.subscriptions?.map((s: any) => (
          <Card key={s.id} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <BodyText weight="700">{s.package_name}</BodyText>
                <MutedText size={13}>{new Date(s.created_at).toLocaleDateString('id-ID')}</MutedText>
              </View>
              <Badge
                label={s.status}
                color={s.status === 'active' ? '#DCFCE7' : '#F1F5F9'}
                textColor={s.status === 'active' ? '#065F46' : '#64748B'}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
              <Badge label={`Kuota: ${s.credits_remaining}`} />
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
