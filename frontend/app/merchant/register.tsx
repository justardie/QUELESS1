import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/theme';
import { Card, Button } from '../../src/ui';
import { api } from '../../src/api';

export default function RegisterMerchant() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);

  async function onCreate() {
    if (!name) { Alert.alert('Missing', 'Merchant name is required'); return; }
    setBusy(true);
    try {
      const m: any = await api.createMerchant({ name, description, address });
      // add one default category so queue can be joined after approval
      await api.addCategory(m.id, { name: 'General', avg_service_minutes: 5 });
      router.replace('/merchant/dashboard');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally { setBusy(false); }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View style={{ marginBottom: 16 }}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>New merchant</Text>
          <Text style={styles.sub}>Fill in your merchant profile. It will be pending until an admin approves.</Text>

          <Card style={{ marginTop: 20 }}>
            <Text style={styles.label}>Merchant name</Text>
            <TextInput testID="merchant-name-input" value={name} onChangeText={setName} placeholder="Cafe Aroma" placeholderTextColor={theme.colors.textMuted} style={styles.input} />
            <Text style={styles.label}>Description</Text>
            <TextInput testID="merchant-desc-input" value={description} onChangeText={setDescription} placeholder="Coffee & pastries" placeholderTextColor={theme.colors.textMuted} style={styles.input} />
            <Text style={styles.label}>Address</Text>
            <TextInput testID="merchant-address-input" value={address} onChangeText={setAddress} placeholder="123 Main Street" placeholderTextColor={theme.colors.textMuted} style={styles.input} />
          </Card>

          <View style={{ height: 20 }} />
          <Button testID="create-merchant-button" label={busy ? 'Creating…' : 'Create merchant'} onPress={onCreate} disabled={busy} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  title: { fontSize: 28, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.5 },
  sub: { fontSize: 14, color: theme.colors.textMuted, marginTop: 6 },
  label: { fontSize: 13, color: theme.colors.textMuted, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  input: {
    height: 50, borderRadius: 14, backgroundColor: '#fff',
    borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 14,
    fontSize: 15, color: theme.colors.text,
  },
});
