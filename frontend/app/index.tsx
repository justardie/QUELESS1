import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { theme } from '../src/theme';
import { Button, Card } from '../src/ui';
import { useAuth } from '../src/auth';

export default function Welcome() {
  const router = useRouter();
  const { user, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<'customer' | 'merchant'>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) routeByRole(user.role);
  }, [loading, user]);

  function routeByRole(r: string) {
    if (r === 'admin') router.replace('/admin');
    else if (r === 'merchant') router.replace('/merchant/dashboard');
    else router.replace('/customer/merchants');
  }

  async function onSubmit() {
    if (!email || !password || (mode === 'register' && !name)) {
      Alert.alert('Missing fields', 'Please fill all required fields');
      return;
    }
    setBusy(true);
    try {
      const u = mode === 'login'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, name.trim(), role);
      routeByRole(u.role);
    } catch (e: any) {
      Alert.alert('Oops', e.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}><ActivityIndicator color={theme.colors.brand} /></View>
    );
  }

  return (
    <LinearGradient colors={['#EFE9FF', '#FCE7F3', '#E0F2FE']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.hero}>
              <View style={styles.logoDot} />
              <Text style={styles.brand}>Lineup</Text>
              <Text style={styles.tagline}>Smart queues for merchants & members</Text>
            </View>

            <Card style={styles.card}>
              <View style={styles.tabs}>
                <TouchableOpacity
                  testID="tab-login"
                  onPress={() => setMode('login')}
                  style={[styles.tab, mode === 'login' && styles.tabActive]}>
                  <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Sign in</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="tab-register"
                  onPress={() => setMode('register')}
                  style={[styles.tab, mode === 'register' && styles.tabActive]}>
                  <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>Create account</Text>
                </TouchableOpacity>
              </View>

              {mode === 'register' && (
                <>
                  <Text style={styles.label}>Full name</Text>
                  <TextInput
                    testID="register-name-input"
                    value={name}
                    onChangeText={setName}
                    placeholder="Jane Doe"
                    placeholderTextColor={theme.colors.textMuted}
                    style={styles.input}
                  />
                  <Text style={styles.label}>Account type</Text>
                  <View style={styles.roleRow}>
                    {(['customer', 'merchant'] as const).map(r => (
                      <TouchableOpacity
                        key={r}
                        testID={`role-${r}`}
                        onPress={() => setRole(r)}
                        style={[styles.rolePill, role === r && styles.rolePillActive]}>
                        <Text style={[styles.rolePillText, role === r && styles.rolePillTextActive]}>
                          {r === 'customer' ? 'Member' : 'Merchant'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.label}>Email</Text>
              <TextInput
                testID="login-email-input"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />

              <Text style={styles.label}>Password</Text>
              <TextInput
                testID="login-password-input"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={theme.colors.textMuted}
                secureTextEntry
                style={styles.input}
              />

              <View style={{ height: 8 }} />
              <Button
                testID="login-submit-button"
                label={busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
                onPress={onSubmit}
                disabled={busy}
              />

              <Text style={styles.hint}>
                Admin? Use your assigned credentials to sign in.
              </Text>
            </Card>

            <TouchableOpacity
              testID="tv-display-link"
              onPress={() => router.push('/tv')}
              style={{ marginTop: 18, alignSelf: 'center' }}>
              <Text style={styles.linkText}>Open TV Display →</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg },
  scroll: { padding: 20, paddingBottom: 48 },
  hero: { alignItems: 'center', marginTop: 24, marginBottom: 28 },
  logoDot: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: theme.colors.brand, marginBottom: 14,
    shadowColor: theme.colors.brand, shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 },
  },
  brand: { fontSize: 36, fontWeight: '800', color: theme.colors.text, letterSpacing: -1 },
  tagline: { fontSize: 15, color: theme.colors.textMuted, marginTop: 6 },
  card: { backgroundColor: 'rgba(255,255,255,0.85)', borderColor: 'rgba(255,255,255,0.7)' },
  tabs: { flexDirection: 'row', backgroundColor: theme.colors.bg2, borderRadius: 14, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#fff' },
  tabText: { color: theme.colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: theme.colors.text },
  label: { fontSize: 13, color: theme.colors.textMuted, marginTop: 10, marginBottom: 6, fontWeight: '600' },
  input: {
    height: 50, borderRadius: 14, backgroundColor: '#fff',
    borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 14,
    fontSize: 15, color: theme.colors.text,
  },
  roleRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  rolePill: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: theme.colors.bg2, alignItems: 'center',
    borderWidth: 1, borderColor: 'transparent',
  },
  rolePillActive: { backgroundColor: theme.colors.brandSoft, borderColor: theme.colors.brand },
  rolePillText: { fontWeight: '600', color: theme.colors.textMuted },
  rolePillTextActive: { color: theme.colors.brandDark },
  hint: { fontSize: 12, color: theme.colors.textMuted, textAlign: 'center', marginTop: 14 },
  linkText: { color: theme.colors.brandDark, fontWeight: '600' },
});
