import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, KeyboardAvoidingView, Platform,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors, iosFontFamily, radius } from '../src/themeContext';
import { useTheme } from '../src/themeContext';
import { Card, Button, AppHeaderLogo, Hx, MutedText } from '../src/ui';
import { useAuth } from '../src/auth';

export default function Auth() {
  const router = useRouter();
  const c = useColors();
  const { settings } = useTheme();
  const { user, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<'customer' | 'merchant'>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && user) routeByRole(user.role); }, [loading, user]);

  function routeByRole(r: string) {
    if (r === 'admin') router.replace('/admin');
    else if (r === 'merchant') router.replace('/merchant/dashboard');
    else router.replace('/');
  }

  async function onSubmit() {
    if (!email || !password || (mode === 'register' && !name)) {
      Alert.alert('Data tidak lengkap', 'Mohon isi semua kolom wajib');
      return;
    }
    setBusy(true);
    try {
      const u = mode === 'login'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, name.trim(), role);
      routeByRole(u.role);
    } catch (e: any) {
      Alert.alert('Gagal', e.message || 'Terjadi kesalahan');
    } finally { setBusy(false); }
  }

  if (loading) {
    return <View style={[styles.center, { backgroundColor: c.bg }]}><ActivityIndicator color={c.primary} /></View>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.topRow}>
            <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: '#fff', borderColor: 'rgba(15,23,42,0.08)' }]}>
              <Ionicons name="arrow-back" size={22} color={c.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.hero}>
            <AppHeaderLogo logoUrl={settings.app_logo_url} size={56} />
            <Hx size={28} style={{ marginTop: 16 }}>Selamat datang</Hx>
            <MutedText size={14} style={{ marginTop: 4, textAlign: 'center' }}>
              Masuk atau daftar untuk mengelola antrian Anda
            </MutedText>
          </View>

          <Card>
            <View style={[styles.tabs, { backgroundColor: c.soft }]}>
              <TouchableOpacity
                testID="tab-login"
                onPress={() => setMode('login')}
                style={[styles.tab, mode === 'login' && { backgroundColor: '#fff' }]}>
                <Text style={[styles.tabText, { color: mode === 'login' ? c.text : c.muted, fontFamily: iosFontFamily }]}>Masuk</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="tab-register"
                onPress={() => setMode('register')}
                style={[styles.tab, mode === 'register' && { backgroundColor: '#fff' }]}>
                <Text style={[styles.tabText, { color: mode === 'register' ? c.text : c.muted, fontFamily: iosFontFamily }]}>Daftar</Text>
              </TouchableOpacity>
            </View>

            {mode === 'register' && (
              <>
                <Text style={[styles.label, { color: c.muted, fontFamily: iosFontFamily }]}>Nama lengkap</Text>
                <TextInput
                  testID="register-name-input" value={name} onChangeText={setName}
                  placeholder="John Doe" placeholderTextColor={c.muted}
                  style={[styles.input, { color: c.text, fontFamily: iosFontFamily }]}
                />
                <Text style={[styles.label, { color: c.muted, fontFamily: iosFontFamily }]}>Tipe akun</Text>
                <View style={styles.roleRow}>
                  {(['customer', 'merchant'] as const).map(r => (
                    <TouchableOpacity
                      key={r} testID={`role-${r}`}
                      onPress={() => setRole(r)}
                      style={[styles.rolePill, role === r && { backgroundColor: c.soft, borderColor: c.primary }]}>
                      <Text style={[styles.rolePillText, { color: role === r ? c.primaryDark : c.muted, fontFamily: iosFontFamily }]}>
                        {r === 'customer' ? 'Member' : 'Merchant'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={[styles.label, { color: c.muted, fontFamily: iosFontFamily }]}>Email</Text>
            <TextInput
              testID="login-email-input" value={email} onChangeText={setEmail}
              placeholder="you@example.com" placeholderTextColor={c.muted}
              autoCapitalize="none" keyboardType="email-address"
              style={[styles.input, { color: c.text, fontFamily: iosFontFamily }]}
            />

            <Text style={[styles.label, { color: c.muted, fontFamily: iosFontFamily }]}>Password</Text>
            <TextInput
              testID="login-password-input" value={password} onChangeText={setPassword}
              placeholder="••••••••" placeholderTextColor={c.muted} secureTextEntry
              style={[styles.input, { color: c.text, fontFamily: iosFontFamily }]}
            />

            <View style={{ height: 14 }} />
            <Button
              testID="login-submit-button"
              label={busy ? 'Mohon tunggu…' : mode === 'login' ? 'Masuk' : 'Buat akun'}
              onPress={onSubmit} disabled={busy}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingBottom: 48 },
  topRow: { marginBottom: 4 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  hero: { alignItems: 'center', marginTop: 8, marginBottom: 24 },
  tabs: { flexDirection: 'row', borderRadius: radius.md, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.sm },
  tabText: { fontWeight: '600', fontSize: 14 },
  label: { fontSize: 12, marginTop: 12, marginBottom: 6, fontWeight: '600' },
  input: {
    height: 48, borderRadius: 12, backgroundColor: '#fff',
    borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)', paddingHorizontal: 14,
    fontSize: 15,
  },
  roleRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  rolePill: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: '#F1F5F9', alignItems: 'center',
    borderWidth: 1, borderColor: 'transparent',
  },
  rolePillText: { fontWeight: '600', fontSize: 14 },
});
