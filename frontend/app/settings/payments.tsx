import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  TextInput, Switch, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors, iosFontFamily } from '../../src/themeContext';
import { Card, Hx, MutedText, BodyText, Button, Badge } from '../../src/ui';
import { api } from '../../src/api';

export default function PaymentsSettings() {
  const router = useRouter();
  const c = useColors();
  const [loading, setLoading] = useState(true);
  const [serverKey, setServerKey] = useState('');
  const [clientKey, setClientKey] = useState('');
  const [isProduction, setIsProduction] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const s: any = await api.getAdminFullSettings();
        setServerKey(s.midtrans_server_key || '');
        setClientKey(s.midtrans_client_key || '');
        setIsProduction(!!s.midtrans_is_production);
      } catch (e: any) {
        Alert.alert('Error', e.message);
      } finally { setLoading(false); }
    })();
  }, []);

  async function save() {
    setBusy(true);
    try {
      await api.updateSettings({
        midtrans_server_key: serverKey.trim(),
        midtrans_client_key: clientKey.trim(),
        midtrans_is_production: isProduction,
      });
      Alert.alert('Tersimpan', isProduction ? 'Mode PRODUCTION aktif. Gunakan server key production yang sesuai.' : 'Mode SANDBOX (testing) aktif.');
    } catch (e: any) {
      Alert.alert('Gagal', e.message);
    } finally { setBusy(false); }
  }

  async function clearKeys() {
    setServerKey(''); setClientKey('');
  }

  const webhookUrl = (Platform.OS === 'web' && typeof window !== 'undefined')
    ? `${window.location.origin}/api/payments/midtrans/notify`
    : `${process.env.EXPO_PUBLIC_BACKEND_URL || ''}/api/payments/midtrans/notify`;

  if (loading) return <View style={[styles.center, { backgroundColor: c.bg }]}><ActivityIndicator color={c.primary} /></View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={22} color={c.text} />
          </TouchableOpacity>
          <Hx size={24}>Pembayaran QRIS</Hx>
        </View>

        <Card style={{ marginBottom: 14, backgroundColor: c.soft, borderColor: c.primary }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Ionicons name="information-circle-outline" size={20} color={c.primaryDark} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <BodyText weight="700" style={{ color: c.primaryDark }}>Integrasi Midtrans QRIS</BodyText>
              <MutedText size={13} style={{ marginTop: 4 }}>
                Saat server key kosong, sistem akan menggunakan QRIS mock (simulasi). Isi server key dari Midtrans Dashboard (Sandbox/Production → Settings → Access Keys) untuk mengaktifkan pembayaran nyata.
              </MutedText>
            </View>
          </View>
        </Card>

        <Text style={[styles.label, { color: c.muted, fontFamily: iosFontFamily }]}>MODE</Text>
        <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <BodyText weight="700">{isProduction ? 'Production (live)' : 'Sandbox (testing)'}</BodyText>
            <MutedText size={13}>{isProduction ? 'Pembayaran asli akan diproses' : 'Gunakan akun sandbox & QR Code simulator'}</MutedText>
          </View>
          <Switch
            testID="toggle-production"
            value={isProduction}
            onValueChange={setIsProduction}
            trackColor={{ true: c.primary, false: '#CBD5E1' }}
            thumbColor="#fff"
          />
        </Card>

        <Text style={[styles.label, { color: c.muted, fontFamily: iosFontFamily, marginTop: 16 }]}>SERVER KEY (rahasia)</Text>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              testID="server-key-input"
              value={serverKey}
              onChangeText={setServerKey}
              placeholder="SB-Mid-server-xxxxx atau Mid-server-xxxxx"
              placeholderTextColor={c.muted}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!showKey}
              style={[styles.input, { color: c.text, fontFamily: iosFontFamily, flex: 1 }]}
            />
            <TouchableOpacity onPress={() => setShowKey(s => !s)} style={{ padding: 6 }}>
              <Ionicons name={showKey ? 'eye-off-outline' : 'eye-outline'} size={20} color={c.muted} />
            </TouchableOpacity>
          </View>
        </Card>

        <Text style={[styles.label, { color: c.muted, fontFamily: iosFontFamily, marginTop: 12 }]}>CLIENT KEY</Text>
        <Card>
          <TextInput
            testID="client-key-input"
            value={clientKey}
            onChangeText={setClientKey}
            placeholder="SB-Mid-client-xxxxx atau Mid-client-xxxxx"
            placeholderTextColor={c.muted}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { color: c.text, fontFamily: iosFontFamily }]}
          />
        </Card>

        <Text style={[styles.label, { color: c.muted, fontFamily: iosFontFamily, marginTop: 16 }]}>WEBHOOK URL (copy ke Midtrans dashboard)</Text>
        <Card>
          <BodyText size={13} style={{ fontFamily: Platform.OS === 'web' ? 'monospace' : iosFontFamily }}>
            {webhookUrl}
          </BodyText>
          <MutedText size={12} style={{ marginTop: 8 }}>
            Midtrans Dashboard → Settings → Configuration → Payment Notification URL. Pakai HMAC-SHA512 signature (sudah diverifikasi otomatis).
          </MutedText>
        </Card>

        <View style={{ height: 18 }} />
        <Button testID="save-midtrans" label={busy ? 'Menyimpan…' : 'Simpan'} onPress={save} disabled={busy} />
        <View style={{ height: 10 }} />
        <Button
          testID="clear-midtrans"
          label="Hapus key (kembali ke mode mock)"
          variant="secondary"
          onPress={() => Alert.alert('Hapus key?', 'Sistem akan kembali ke mode simulasi.', [
            { text: 'Batal', style: 'cancel' },
            { text: 'Hapus', style: 'destructive', onPress: clearKeys },
          ])}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)' },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  input: { height: 44, borderWidth: 0, fontSize: 15 },
});
