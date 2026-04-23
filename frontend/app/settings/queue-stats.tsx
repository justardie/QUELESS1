import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../src/themeContext';
import { Card, Hx, MutedText, BodyText, Badge } from '../../src/ui';
import { api } from '../../src/api';

export default function QueueStats() {
  const router = useRouter();
  const c = useColors();
  const [rows, setRows] = useState<any[]>([]);

  async function load() {
    const list = await api.adminQueueStats();
    setRows(list);
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)' }}>
            <Ionicons name="arrow-back" size={22} color={c.text} />
          </TouchableOpacity>
          <Hx size={24}>Statistik antrian</Hx>
        </View>

        {rows.length === 0 && <Card><BodyText>Belum ada merchant</BodyText></Card>}
        {rows.map(r => (
          <Card key={r.merchant_id} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <BodyText weight="700" size={17}>{r.name}</BodyText>
                <MutedText size={13}>status: {r.status}</MutedText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Hx size={28}>{r.waiting + r.called}</Hx>
                <MutedText size={12}>dalam antrian</MutedText>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              <Badge label={`Menunggu: ${r.waiting}`} color="#DBEAFE" textColor="#1E3A8A" />
              <Badge label={`Dipanggil: ${r.called}`} color="#FEF3C7" textColor="#92400E" />
              <Badge label={`Selesai hari ini: ${r.served_today}`} color="#DCFCE7" textColor="#065F46" />
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
