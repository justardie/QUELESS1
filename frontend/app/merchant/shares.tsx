import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useColors, iosFontFamily } from '../../src/themeContext';
import { Card, Hx, MutedText, BodyText, Button } from '../../src/ui';
import { BottomDock, BOTTOM_DOCK_HEIGHT } from '../../src/bottomDock';
import { api } from '../../src/api';

function getAppBaseUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.EXPO_PUBLIC_BACKEND_URL || '';
}

export default function MerchantShares() {
  const router = useRouter();
  const c = useColors();
  const [merchants, setMerchants] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const list = await api.myMerchants();
        setMerchants(list);
        if (list.length) setSelected(list[0]);
      } catch (e: any) {
        Alert.alert('Gagal memuat', e.message);
      } finally { setLoading(false); }
    })();
  }, []);

  const base = getAppBaseUrl();
  const tvUrl = selected
    ? `${base}/tv/${selected.slug || selected.id}`
    : '';
  const qrUrl = selected ? `${base}/customer/merchant/${selected.id}` : '';

  async function copy(value: string, label: string) {
    try {
      await Clipboard.setStringAsync(value);
      Alert.alert('Tersalin', `${label} disalin ke clipboard`);
    } catch {
      Alert.alert('Gagal', 'Tidak bisa menyalin');
    }
  }

  if (loading) {
    return <View style={[styles.center, { backgroundColor: c.bg }]}><ActivityIndicator color={c.primary} /></View>;
  }

  if (merchants.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
        <View style={{ padding: 20 }}>
          <Header title="Tampilan TV" onBack={() => router.back()} />
          <Card>
            <BodyText>Anda belum punya merchant.</BodyText>
            <MutedText size={13} style={{ marginTop: 6 }}>Buat merchant dulu untuk mendapatkan link TV dan QR code.</MutedText>
            <View style={{ height: 12 }} />
            <Button label="Buat merchant" onPress={() => router.push('/merchant/register')} />
          </Card>
        </View>
        <BottomDock />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: BOTTOM_DOCK_HEIGHT + 40 }}>
        <Header title="Tampilan TV" onBack={() => router.back()} />

        {merchants.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {merchants.map(m => (
              <TouchableOpacity
                key={m.id}
                testID={`shares-merchant-${m.id}`}
                onPress={() => setSelected(m)}
                style={[styles.pill, { backgroundColor: selected?.id === m.id ? c.soft : '#fff', borderColor: selected?.id === m.id ? c.primary : 'rgba(15,23,42,0.08)' }]}
              >
                <Text style={{ color: selected?.id === m.id ? c.primaryDark : c.text, fontWeight: '700', fontFamily: iosFontFamily }}>{m.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {selected && (
          <>
            {/* TV Display card */}
            <Card style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="tv-outline" size={20} color={c.primaryDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <BodyText weight="700">Tampilan TV</BodyText>
                  <MutedText size={12}>Buka URL ini di layar TV (landscape)</MutedText>
                </View>
              </View>
              <View style={[styles.urlBox, { backgroundColor: c.soft, borderColor: c.primary }]}>
                <Text numberOfLines={1} style={[styles.urlText, { color: c.primaryDark, fontFamily: iosFontFamily }]}>{tvUrl}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <Button testID="copy-tv-url" label="Salin link" onPress={() => copy(tvUrl, 'Link TV')} style={{ flex: 1 }} />
              </View>
            </Card>

          </>
        )}
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
      <Hx size={22}>{title}</Hx>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  pill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, marginRight: 8, borderWidth: 1 },
  urlBox: { marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  urlText: { fontSize: 13, fontWeight: '600' },
});
