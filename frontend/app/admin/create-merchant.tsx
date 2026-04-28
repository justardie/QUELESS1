import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors, iosFontFamily } from '../../src/themeContext';
import { Card, Hx, MutedText, BodyText, Button } from '../../src/ui';
import { BottomDock, BOTTOM_DOCK_HEIGHT } from '../../src/bottomDock';
import { api } from '../../src/api';
import { notify } from '../../src/alerts';

export default function AdminCreateMerchant() {
  const router = useRouter();
  const c = useColors();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      notify('Nama, email, dan password wajib diisi', 'Data tidak lengkap');
      return;
    }
    setBusy(true);
    try {
      await api.adminCreateMerchant({
        name: name.trim(),
        username: username.trim().toLowerCase() || undefined,
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim(),
        business_type: businessType.trim(),
      });
      notify(`Merchant "${name}" berhasil dibuat`);
      router.replace('/admin');
    } catch (e: any) {
      notify(e.message, 'Gagal');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: BOTTOM_DOCK_HEIGHT + 60 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={22} color={c.text} />
            </TouchableOpacity>
            <Hx size={22}>Tambah Merchant</Hx>
          </View>

          <Card>
            <Text style={[styles.label, { color: c.muted, fontFamily: iosFontFamily }]}>NAMA MERCHANT</Text>
            <TextInput
              testID="merchant-name-input"
              value={name} onChangeText={setName}
              placeholder="mis. Kopi Kenangan Jaksel"
              placeholderTextColor={c.muted}
              style={[styles.input, { color: c.text, fontFamily: iosFontFamily }]}
            />

            <Text style={[styles.label, { color: c.muted, fontFamily: iosFontFamily }]}>USERNAME (opsional, untuk login)</Text>
            <TextInput
              testID="merchant-username-input"
              value={username} onChangeText={setUsername}
              placeholder="mis. kopi_kenangan (otomatis jika kosong)"
              placeholderTextColor={c.muted}
              autoCapitalize="none"
              style={[styles.input, { color: c.text, fontFamily: iosFontFamily }]}
            />

            <Text style={[styles.label, { color: c.muted, fontFamily: iosFontFamily }]}>EMAIL MERCHANT</Text>
            <TextInput
              testID="merchant-email-input"
              value={email} onChangeText={setEmail}
              placeholder="login@merchant.com"
              placeholderTextColor={c.muted}
              autoCapitalize="none" keyboardType="email-address"
              style={[styles.input, { color: c.text, fontFamily: iosFontFamily }]}
            />

            <Text style={[styles.label, { color: c.muted, fontFamily: iosFontFamily }]}>PASSWORD AWAL</Text>
            <TextInput
              testID="merchant-password-input"
              value={password} onChangeText={setPassword}
              placeholder="Beri password yang kuat"
              placeholderTextColor={c.muted}
              secureTextEntry
              style={[styles.input, { color: c.text, fontFamily: iosFontFamily }]}
            />

            <Text style={[styles.label, { color: c.muted, fontFamily: iosFontFamily }]}>NOMOR TELEPON (opsional, catatan admin)</Text>
            <TextInput
              testID="merchant-phone-input"
              value={phone} onChangeText={setPhone}
              placeholder="08xxxxxxxxxx"
              placeholderTextColor={c.muted}
              keyboardType="phone-pad"
              style={[styles.input, { color: c.text, fontFamily: iosFontFamily }]}
            />

            <Text style={[styles.label, { color: c.muted, fontFamily: iosFontFamily }]}>JENIS USAHA</Text>
            <TextInput
              testID="merchant-business-input"
              value={businessType} onChangeText={setBusinessType}
              placeholder="mis. Kedai kopi, Klinik gigi, Barber shop"
              placeholderTextColor={c.muted}
              style={[styles.input, { color: c.text, fontFamily: iosFontFamily }]}
            />

            <View style={{ height: 18 }} />
            <Button testID="create-merchant-submit" label={busy ? 'Menyimpan…' : 'Simpan merchant'} onPress={submit} disabled={busy} />
            <MutedText size={11} style={{ marginTop: 8 }}>
              Merchant bisa login dengan email atau username & password di atas, lalu melengkapi profil toko.
            </MutedText>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
      <BottomDock />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)' },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 1.5, marginTop: 14, marginBottom: 6 },
  input: { height: 48, borderWidth: 1, borderColor: 'rgba(15,23,42,0.1)', borderRadius: 12, paddingHorizontal: 14, fontSize: 16 },
});
