import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../src/themeContext';
import { Card, Hx, MutedText, BodyText, Button, Badge } from '../../src/ui';
import { api } from '../../src/api';

export default function AdminSubscriptions() {
  const router = useRouter();
  const c = useColors();
  const [subs, setSubs] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);

  async function load() {
    const [list, pkgs] = await Promise.all([
      api.adminSubscriptions(),
      api.adminPackages().catch(() => []),
    ]);
    setSubs(list);
    setPackages(pkgs);
  }
  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: string) {
    try { await api.adminUpdateSubscription(id, { status }); await load(); }
    catch (e: any) { Alert.alert('Gagal', e.message); }
  }

  async function delSub(id: string, userName: string) {
    Alert.alert(`Hapus subscription ${userName}?`, 'Data tidak dapat dipulihkan.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive',
        onPress: async () => {
          try { await api.adminDeleteSubscription(id); await load(); } catch (e: any) { Alert.alert('Gagal', e.message); }
        }
      },
    ]);
  }

  async function delUser(userId: string, userName: string) {
    Alert.alert(`Hapus customer "${userName}"?`, 'Akun + semua subscription, payment, queue miliknya akan dihapus. Tidak dapat dipulihkan.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive',
        onPress: async () => {
          try { await api.adminDeleteUser(userId); await load(); } catch (e: any) { Alert.alert('Gagal', e.message); }
        }
      },
    ]);
  }

  async function activateWithPackage(subId: string) {
    if (packages.length === 0) {
      Alert.alert('Belum ada paket', 'Buat paket dulu di Pengaturan > Paket langganan');
      return;
    }
    // Cross-platform picker: on web use window.prompt with numbered list; on native use Alert options.
    // @ts-ignore
    if (typeof window !== 'undefined' && window.prompt) {
      const list = packages.map((p: any, i: number) => `${i + 1}. ${p.name} (${p.quota_count}× / ${p.duration_days}h)`).join('\n');
      // @ts-ignore
      const ans = window.prompt(`Pilih paket (1-${packages.length}):\n\n${list}`, '1');
      const idx = parseInt(ans || '0', 10) - 1;
      if (idx < 0 || idx >= packages.length) return;
      try { await api.adminUpdateSubscription(subId, { package_id: packages[idx].id }); await load(); }
      catch (e: any) { Alert.alert('Gagal', e.message); }
      return;
    }
    Alert.alert('Pilih paket', '', [
      ...packages.map((p: any) => ({
        text: `${p.name} (${p.quota_count}×)`,
        onPress: async () => {
          try { await api.adminUpdateSubscription(subId, { package_id: p.id }); await load(); }
          catch (e: any) { Alert.alert('Gagal', e.message); }
        }
      })),
      { text: 'Batal', style: 'cancel' as const },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)' }}>
            <Ionicons name="arrow-back" size={22} color={c.text} />
          </TouchableOpacity>
          <Hx size={24}>Subscription customer</Hx>
        </View>

        {subs.length === 0 && <Card><BodyText>Belum ada subscription</BodyText></Card>}
        {subs.map(s => (
          <Card key={s.id} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <View style={{ flex: 1 }}>
                <BodyText weight="700">{s.user?.name || '—'}</BodyText>
                <MutedText size={13}>{s.user?.email || ''}</MutedText>
              </View>
              <Badge
                label={s.status}
                color={s.status === 'active' ? '#DCFCE7' : s.status === 'suspended' ? '#FEF3C7' : '#FEE2E2'}
                textColor={s.status === 'active' ? '#065F46' : s.status === 'suspended' ? '#92400E' : '#7F1D1D'}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <Badge label={s.package_name || 'Package'} />
              <Badge label={`Kuota: ${s.credits_remaining}`} />
              {s.expires_at && <Badge label={`Berakhir ${new Date(s.expires_at).toLocaleDateString('id-ID')}`} />}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <Button testID={`activate-${s.id}`} label="Aktifkan (pilih paket)" onPress={() => activateWithPackage(s.id)} style={{ flex: 1, minWidth: 120 }} />
              {s.status !== 'suspended' && <Button testID={`suspend-${s.id}`} label="Suspend" variant="secondary" onPress={() => setStatus(s.id, 'suspended')} style={{ flex: 1, minWidth: 100 }} />}
              {s.status !== 'expired' && <Button testID={`expire-${s.id}`} label="Expired" variant="secondary" onPress={() => setStatus(s.id, 'expired')} style={{ flex: 1, minWidth: 100 }} />}
              <Button testID={`delete-sub-${s.id}`} label="Hapus sub" variant="danger" onPress={() => delSub(s.id, s.user?.name || 'customer')} style={{ flex: 1, minWidth: 100 }} />
              {s.user?.id && <Button testID={`delete-user-${s.user.id}`} label="Hapus customer" variant="danger" onPress={() => delUser(s.user.id, s.user.name)} style={{ flex: 1, minWidth: 140 }} />}
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
