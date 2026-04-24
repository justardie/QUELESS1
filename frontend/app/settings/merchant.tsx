import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, TextInput, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useColors, iosFontFamily } from '../../src/themeContext';
import { Card, Hx, MutedText, BodyText, Button } from '../../src/ui';
import { api } from '../../src/api';

async function pickImage(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) { Alert.alert('Izin dibutuhkan'); return null; }
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.6 });
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  return `data:${a.mimeType || 'image/jpeg'};base64,${a.base64}`;
}

export default function MerchantSettings() {
  const router = useRouter();
  const c = useColors();
  const [merchants, setMerchants] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);
  const [form, setForm] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const list = await api.myMerchants();
    setMerchants(list);
    if (list[idx]) setForm({ ...list[idx] });
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { if (merchants[idx]) setForm({ ...merchants[idx] }); }, [idx, merchants]);

  if (!form) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
        <View style={{ padding: 20 }}>
          <Header title="Profil merchant" onBack={() => router.back()} />
          <Card>
            <BodyText weight="600">Belum ada merchant untuk akun Anda</BodyText>
            <MutedText size={13} style={{ marginTop: 6 }}>
              Buat profil merchant dulu untuk bisa mengelola antrian dan profilnya.
            </MutedText>
            <View style={{ height: 12 }} />
            <Button label="Buat merchant baru" onPress={() => router.push('/merchant/register')} />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = form.status === 'approved' ? '#DCFCE7' : form.status === 'pending' ? '#FEF3C7' : '#FEE2E2';
  const statusText = form.status === 'approved' ? '#065F46' : form.status === 'pending' ? '#92400E' : '#7F1D1D';

  async function save() {
    setBusy(true);
    try {
      await api.updateMerchant(form.id, {
        name: form.name, description: form.description, address: form.address,
        logo_url: form.logo_url, photo_url: form.photo_url, tv_photo_url: form.tv_photo_url,
        hours_text: form.hours_text, is_open: !!form.is_open,
      });
      Alert.alert('Tersimpan', 'Profil merchant diperbarui');
      await load();
    } catch (e: any) {
      Alert.alert('Gagal', e.message);
    } finally { setBusy(false); }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Header title="Profil merchant" onBack={() => router.back()} />

        {/* User/merchant info header */}
        <Card style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {form.logo_url ? (
            <Image source={{ uri: form.logo_url }} style={{ width: 48, height: 48, borderRadius: 14 }} />
          ) : (
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="storefront-outline" size={22} color={c.primaryDark} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <BodyText weight="700" size={16}>{form.name || '(tanpa nama)'}</BodyText>
            <MutedText size={12}>Merchant ID: {form.id.slice(0, 8)}…</MutedText>
          </View>
          <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: statusColor }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: statusText, fontFamily: iosFontFamily }}>
              {form.status}
            </Text>
          </View>
        </Card>

        {merchants.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {merchants.map((m, i) => (
              <TouchableOpacity
                key={m.id}
                testID={`merchant-tab-${m.id}`}
                onPress={() => setIdx(i)}
                style={[styles.pill, { backgroundColor: i === idx ? c.soft : '#fff', borderColor: i === idx ? c.primary : 'rgba(15,23,42,0.08)' }]}
              >
                <Text style={{ color: i === idx ? c.primaryDark : c.text, fontWeight: '700', fontFamily: iosFontFamily }}>{m.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <ImageField
          label="LOGO MERCHANT (square, disarankan 512×512 px, PNG)" size={80} value={form.logo_url}
          onChange={v => setForm({ ...form, logo_url: v })} testID="pick-logo"
        />
        <ImageField
          label="FOTO HOME (tampilan di list, disarankan 1200×800 px)" value={form.photo_url}
          onChange={v => setForm({ ...form, photo_url: v })} height={140} testID="pick-photo"
        />
        <ImageField
          label="FOTO BACKGROUND TV (landscape, disarankan 1920×1080 px)" value={form.tv_photo_url}
          onChange={v => setForm({ ...form, tv_photo_url: v })} height={140} testID="pick-tv-photo"
        />

        <Text style={[styles.label, { color: c.muted, fontFamily: iosFontFamily }]}>NAMA MERCHANT</Text>
        <Card><TextInput value={form.name} onChangeText={v => setForm({ ...form, name: v })} style={[styles.input, { color: c.text, fontFamily: iosFontFamily }]} /></Card>

        <Text style={[styles.label, { color: c.muted, fontFamily: iosFontFamily, marginTop: 12 }]}>DESKRIPSI</Text>
        <Card><TextInput value={form.description} onChangeText={v => setForm({ ...form, description: v })} style={[styles.input, { color: c.text, fontFamily: iosFontFamily }]} /></Card>

        <Text style={[styles.label, { color: c.muted, fontFamily: iosFontFamily, marginTop: 12 }]}>ALAMAT</Text>
        <Card><TextInput value={form.address} onChangeText={v => setForm({ ...form, address: v })} style={[styles.input, { color: c.text, fontFamily: iosFontFamily }]} /></Card>

        <Text style={[styles.label, { color: c.muted, fontFamily: iosFontFamily, marginTop: 12 }]}>JAM OPERASIONAL</Text>
        <Card><TextInput placeholder="mis. Senin-Minggu 09:00-21:00" placeholderTextColor={c.muted} value={form.hours_text} onChangeText={v => setForm({ ...form, hours_text: v })} style={[styles.input, { color: c.text, fontFamily: iosFontFamily }]} /></Card>

        <Card style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <BodyText weight="600">Status buka</BodyText>
            <MutedText size={13}>Customer hanya bisa ambil nomor saat buka</MutedText>
          </View>
          <Switch
            testID="toggle-open"
            value={!!form.is_open}
            onValueChange={v => setForm({ ...form, is_open: v })}
            trackColor={{ true: c.primary, false: '#CBD5E1' }}
            thumbColor="#fff"
          />
        </Card>

        <View style={{ height: 24 }} />
        <Button testID="save-merchant" label={busy ? 'Menyimpan…' : 'Simpan perubahan'} onPress={save} disabled={busy} />
        <View style={{ height: 10 }} />
        <Button
          testID="view-qr-button"
          label="Lihat QR code merchant"
          variant="secondary"
          onPress={() => router.push(`/merchant-qr/${form.id}`)}
        />
      </ScrollView>
      </KeyboardAvoidingView>
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

function ImageField({ label, value, onChange, height = 96, size, testID }: { label: string; value?: string; onChange: (v: string) => void; height?: number; size?: number; testID?: string }) {
  const c = useColors();
  return (
    <>
      <Text style={[styles.label, { color: c.muted, fontFamily: iosFontFamily, marginTop: 12 }]}>{label}</Text>
      <Card style={{ alignItems: 'center' }}>
        {value ? (
          size ? <Image source={{ uri: value }} style={{ width: size, height: size, borderRadius: 20 }} /> :
          <Image source={{ uri: value }} style={{ width: '100%', height, borderRadius: 14 }} resizeMode="cover" />
        ) : (
          <View style={{ width: size || '100%', height: size || height, borderRadius: 16, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="image-outline" size={28} color={c.primaryDark} />
          </View>
        )}
        <View style={{ height: 10 }} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button testID={testID} label="Pilih gambar" variant="secondary" onPress={async () => {
            const v = await pickImage(); if (v) onChange(v);
          }} />
          {value && <Button label="Hapus" variant="secondary" onPress={() => onChange('')} />}
        </View>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  input: { height: 44, borderWidth: 0, fontSize: 15 },
  pill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, marginRight: 8, borderWidth: 1 },
});
