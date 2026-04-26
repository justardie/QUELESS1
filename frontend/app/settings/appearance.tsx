import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useColors, iosFontFamily } from '../../src/themeContext';
import { useTheme } from '../../src/themeContext';
import { Card, Hx, MutedText, BodyText, Button } from '../../src/ui';
import { BottomDock, BOTTOM_DOCK_HEIGHT } from '../../src/bottomDock';
import { api } from '../../src/api';
import { notify } from '../../src/alerts';

async function pickImageAsBase64(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Izin dibutuhkan', 'Akses galeri dibutuhkan untuk memilih foto');
    return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    base64: true,
    quality: 0.7,
    allowsEditing: true,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  const mime = a.mimeType || 'image/jpeg';
  return `data:${mime};base64,${a.base64}`;
}

export default function Appearance() {
  const router = useRouter();
  const c = useColors();
  const { settings, refresh } = useTheme();
  const [logoUrl, setLogoUrl] = useState(settings.app_logo_url || '');
  const [appName, setAppName] = useState(settings.app_name || 'QUELESS');
  const [appHeadline, setAppHeadline] = useState((settings as any).app_headline || 'Antrian jadi mudah');
  const [appTagline, setAppTagline] = useState(settings.app_tagline || '');
  const [selectedTheme, setSelectedTheme] = useState(settings.theme_key);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLogoUrl(settings.app_logo_url || '');
    setAppName(settings.app_name);
    setAppHeadline((settings as any).app_headline || 'Antrian jadi mudah');
    setAppTagline(settings.app_tagline || '');
    setSelectedTheme(settings.theme_key);
  }, [settings]);

  async function onPickLogo() {
    const b64 = await pickImageAsBase64();
    if (b64) setLogoUrl(b64);
  }

  async function save() {
    setBusy(true);
    try {
      await api.updateSettings({ app_logo_url: logoUrl, theme_key: selectedTheme, app_name: appName, app_headline: appHeadline, app_tagline: appTagline });
      await refresh();
      notify('Pengaturan tampilan disimpan');
    } catch (e: any) {
      Alert.alert('Gagal', e.message);
    } finally { setBusy(false); }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: BOTTOM_DOCK_HEIGHT + 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: '#fff', borderColor: 'rgba(15,23,42,0.08)' }]}>
            <Ionicons name="arrow-back" size={22} color={c.text} />
          </TouchableOpacity>
          <Hx size={24}>Tampilan aplikasi</Hx>
        </View>

        <Text style={[styles.label, { color: c.muted, fontFamily: iosFontFamily }]}>LOGO APLIKASI</Text>
        <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={{ width: 96, height: 96, borderRadius: 24 }} />
          ) : (
            <View style={{ width: 96, height: 96, borderRadius: 24, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="image-outline" size={36} color={c.primaryDark} />
            </View>
          )}
          <View style={{ height: 12 }} />
          <Button testID="pick-logo" label="Pilih gambar" variant="secondary" onPress={onPickLogo} />
          {logoUrl ? (
            <TouchableOpacity onPress={() => setLogoUrl('')} style={{ marginTop: 10 }}>
              <Text style={{ color: c.muted, fontFamily: iosFontFamily }}>Hapus logo</Text>
            </TouchableOpacity>
          ) : null}
        </Card>

        <Text style={[styles.label, { color: c.muted, fontFamily: iosFontFamily, marginTop: 16 }]}>NAMA APLIKASI</Text>
        <Card>
          <TextInput
            testID="app-name-input"
            value={appName}
            onChangeText={setAppName}
            style={[styles.input, { color: c.text, fontFamily: iosFontFamily }]}
            placeholder="QUELESS"
            placeholderTextColor={c.muted}
          />
        </Card>

        <Text style={[styles.label, { color: c.muted, fontFamily: iosFontFamily, marginTop: 16 }]}>HEADLINE (judul besar di halaman utama)</Text>
        <Card>
          <TextInput
            testID="app-headline-input"
            value={appHeadline}
            onChangeText={setAppHeadline}
            style={[styles.input, { color: c.text, fontFamily: iosFontFamily }]}
            placeholder="Antrian jadi mudah"
            placeholderTextColor={c.muted}
          />
        </Card>

        <Text style={[styles.label, { color: c.muted, fontFamily: iosFontFamily, marginTop: 16 }]}>TAGLINE (deskripsi di bawah headline)</Text>
        <Card>
          <TextInput
            testID="app-tagline-input"
            value={appTagline}
            onChangeText={setAppTagline}
            multiline
            numberOfLines={3}
            style={[styles.input, { color: c.text, fontFamily: iosFontFamily, height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
            placeholder="Pilih merchant, ambil nomor antrean, pantau posisi kamu secara real-time."
            placeholderTextColor={c.muted}
          />
        </Card>

        <Text style={[styles.label, { color: c.muted, fontFamily: iosFontFamily, marginTop: 16 }]}>WARNA TEMA</Text>
        <View style={{ gap: 10 }}>
          {settings.available_themes.map(t => (
            <TouchableOpacity
              key={t.key}
              testID={`theme-${t.key}`}
              activeOpacity={0.9}
              onPress={() => setSelectedTheme(t.key)}
            >
              <Card
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  borderColor: selectedTheme === t.key ? t.primary : 'rgba(15,23,42,0.06)',
                  borderWidth: selectedTheme === t.key ? 2 : 1,
                }}
              >
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: t.primary }} />
                  <View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: t.accent }} />
                  <View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: t.soft }} />
                </View>
                <BodyText weight="600" style={{ flex: 1 }}>{t.label}</BodyText>
                {selectedTheme === t.key && <Ionicons name="checkmark-circle" size={22} color={t.primary} />}
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 24 }} />
        <Button testID="save-appearance" label={busy ? 'Menyimpan…' : 'Simpan perubahan'} onPress={save} disabled={busy} />
      </ScrollView>
      </KeyboardAvoidingView>
      <BottomDock />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  input: { height: 44, borderWidth: 0, fontSize: 15 },
});
