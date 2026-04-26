import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useColors, iosFontFamily } from '../../src/themeContext';
import { Card, Hx, MutedText, Button } from '../../src/ui';
import { BottomDock, BOTTOM_DOCK_HEIGHT } from '../../src/bottomDock';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth';
import { notify } from '../../src/alerts';

async function pickImageAsBase64(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) { Alert.alert('Izin dibutuhkan', 'Akses galeri diperlukan'); return null; }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    base64: true, quality: 0.7, allowsEditing: true,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  return `data:${a.mimeType || 'image/jpeg'};base64,${a.base64}`;
}

export default function ProfileSettings() {
  const router = useRouter();
  const c = useColors();
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState((user as any)?.username || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setUsername((user as any).username || '');
      setPhone((user as any).phone || '');
      setAvatarUrl((user as any).avatar_url || '');
    }
  }, [user]);

  async function pickAvatar() {
    const b64 = await pickImageAsBase64();
    if (b64) setAvatarUrl(b64);
  }

  async function save() {
    if (!name.trim()) { Alert.alert('Nama diperlukan'); return; }
    setBusy(true);
    try {
      await api.updateProfile({ name: name.trim(), username: username.trim(), phone: phone.trim(), avatar_url: avatarUrl });
      await refresh();
      notify('Profil berhasil disimpan');
    } catch (e: any) {
      Alert.alert('Gagal', e.message);
    } finally { setBusy(false); }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: BOTTOM_DOCK_HEIGHT + 40 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: '#fff', borderColor: 'rgba(15,23,42,0.08)' }]}>
              <Ionicons name="arrow-back" size={22} color={c.text} />
            </TouchableOpacity>
            <Hx size={24}>Profil saya</Hx>
          </View>

          {/* Avatar */}
          <Card style={{ alignItems: 'center', paddingVertical: 24, marginBottom: 16 }}>
            <TouchableOpacity onPress={pickAvatar} activeOpacity={0.8}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={{ width: 96, height: 96, borderRadius: 48 }} />
              ) : (
                <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="person" size={44} color={c.primaryDark} />
                </View>
              )}
              <View style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="camera" size={15} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={{ marginTop: 10, fontSize: 13, color: c.muted, fontFamily: iosFontFamily }}>Tap untuk ganti foto</Text>
            {avatarUrl ? (
              <TouchableOpacity onPress={() => setAvatarUrl('')} style={{ marginTop: 6 }}>
                <Text style={{ color: c.muted, fontSize: 12, fontFamily: iosFontFamily }}>Hapus foto</Text>
              </TouchableOpacity>
            ) : null}
          </Card>

          <Text style={[styles.label, { color: c.muted }]}>NAMA LENGKAP</Text>
          <Card style={{ marginBottom: 12 }}>
            <TextInput
              testID="profile-name"
              value={name}
              onChangeText={setName}
              placeholder="Nama lengkap"
              placeholderTextColor={c.muted}
              style={[styles.input, { color: c.text, fontFamily: iosFontFamily }]}
            />
          </Card>

          <Text style={[styles.label, { color: c.muted }]}>USERNAME</Text>
          <Card style={{ marginBottom: 12 }}>
            <TextInput
              testID="profile-username"
              value={username}
              onChangeText={setUsername}
              placeholder="johndoe"
              placeholderTextColor={c.muted}
              autoCapitalize="none"
              style={[styles.input, { color: c.text, fontFamily: iosFontFamily }]}
            />
          </Card>

          <Text style={[styles.label, { color: c.muted }]}>NOMOR HP</Text>
          <Card style={{ marginBottom: 12 }}>
            <TextInput
              testID="profile-phone"
              value={phone}
              onChangeText={setPhone}
              placeholder="08xxxxxxxxxx"
              placeholderTextColor={c.muted}
              keyboardType="phone-pad"
              style={[styles.input, { color: c.text, fontFamily: iosFontFamily }]}
            />
          </Card>

          <Text style={[styles.label, { color: c.muted }]}>EMAIL</Text>
          <Card style={{ marginBottom: 24 }}>
            <Text style={[styles.input, { color: c.muted, fontFamily: iosFontFamily }]}>{user?.email}</Text>
            <MutedText size={11} style={{ marginTop: 4 }}>Email tidak bisa diubah</MutedText>
          </Card>

          <Button testID="save-profile" label={busy ? 'Menyimpan…' : 'Simpan perubahan'} onPress={save} disabled={busy} />
        </ScrollView>
      </KeyboardAvoidingView>
      <BottomDock />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8, fontFamily: iosFontFamily } as any,
  input: { height: 44, borderWidth: 0, fontSize: 15 },
});
