import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useColors, iosFontFamily } from '../../src/themeContext';
import { Card, Hx, MutedText, BodyText, Button, Badge } from '../../src/ui';
import { api } from '../../src/api';

function fmtIDR(n: number) { return 'Rp ' + n.toLocaleString('id-ID'); }

export default function PaymentPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useColors();
  const [payment, setPayment] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const p = await api.getPayment(id!);
      setPayment(p);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [id]);

  async function confirm() {
    setBusy(true);
    try {
      await api.confirmPayment(id!);
      Alert.alert('Pembayaran berhasil', 'Paket Anda aktif sekarang.', [
        { text: 'OK', onPress: () => router.replace('/settings/subscription') },
      ]);
    } catch (e: any) { Alert.alert('Gagal', e.message); }
    finally { setBusy(false); }
  }

  if (!payment) {
    return <View style={[styles.center, { backgroundColor: c.bg }]}><ActivityIndicator color={c.primary} /></View>;
  }

  const isPaid = payment.status === 'paid';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)' }}>
            <Ionicons name="arrow-back" size={22} color={c.text} />
          </TouchableOpacity>
          <Hx size={22}>Pembayaran QRIS</Hx>
        </View>

        <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
          <MutedText size={12} style={{ fontWeight: '700', letterSpacing: 2 }}>SCAN UNTUK BAYAR</MutedText>
          <View style={{ padding: 16, backgroundColor: '#fff', borderRadius: 20, marginTop: 14, borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)' }}>
            <QRCode value={payment.qr_string || payment.order_id} size={220} color={c.text} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 }}>
            <Ionicons name="qr-code-outline" size={18} color={c.muted} />
            <MutedText size={13}>QRIS • semua e-wallet & bank</MutedText>
          </View>
          <Hx size={32} style={{ marginTop: 10 }}>{fmtIDR(payment.amount_idr)}</Hx>
          <MutedText size={12} style={{ marginTop: 4 }}>Order: {payment.order_id}</MutedText>
          <View style={{ marginTop: 10 }}>
            <Badge
              label={isPaid ? 'LUNAS' : 'Menunggu pembayaran'}
              color={isPaid ? '#DCFCE7' : '#FEF3C7'}
              textColor={isPaid ? '#065F46' : '#92400E'}
            />
          </View>
        </Card>

        {!isPaid && (
          <>
            <View style={{ height: 14 }} />
            <Card>
              <BodyText weight="700">Simulasi pembayaran</BodyText>
              <MutedText size={13} style={{ marginTop: 4 }}>
                Integrasi QRIS Midtrans/Xendit akan aktif setelah merchant key dimasukkan. Untuk saat ini tekan tombol di bawah untuk mensimulasikan pembayaran sukses.
              </MutedText>
              <View style={{ height: 12 }} />
              <Button testID="confirm-payment" label={busy ? 'Memproses…' : 'Saya sudah bayar (simulasi)'} onPress={confirm} disabled={busy} />
            </Card>
          </>
        )}

        {isPaid && (
          <>
            <View style={{ height: 14 }} />
            <Button label="Lihat paket saya" onPress={() => router.replace('/settings/subscription')} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
