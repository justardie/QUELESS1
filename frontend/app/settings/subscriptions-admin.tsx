import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../src/themeContext';
import { Card, Hx, MutedText, BodyText, Button, Badge } from '../../src/ui';
import { BottomDock, BOTTOM_DOCK_HEIGHT } from '../../src/bottomDock';
import { api } from '../../src/api';
import { confirmAction, notify, promptInput } from '../../src/alerts';

// Group subscriptions by customer → 1 card per customer
type CustomerGroup = {
  user: any;
  subs: any[]; // all subs for this user, most recent first
  active?: any;
};

export default function AdminSubscriptions() {
  const router = useRouter();
  const c = useColors();
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [packages, setPackages] = useState<any[]>([]);

  async function load() {
    const [list, pkgs] = await Promise.all([
      api.adminSubscriptions(),
      api.adminPackages().catch(() => []),
    ]);
    // group by user_id
    const byUser: Record<string, CustomerGroup> = {};
    for (const s of list) {
      const uid = s.user?.id || 'unknown';
      if (!byUser[uid]) byUser[uid] = { user: s.user, subs: [] };
      byUser[uid].subs.push(s);
    }
    // sort subs, identify active
    const arr: CustomerGroup[] = Object.values(byUser).map(g => {
      g.subs.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      g.active = g.subs.find(s => s.status === 'active') || g.subs[0];
      return g;
    });
    setGroups(arr);
    setPackages(pkgs);
  }
  useEffect(() => { load(); }, []);

  async function setStatus(subId: string, status: string) {
    try { await api.adminUpdateSubscription(subId, { status }); await load(); notify(`Status diubah ke ${status}`); }
    catch (e: any) { notify(e.message, 'Gagal'); }
  }

  function delSub(subId: string, userName: string) {
    confirmAction(
      `Hapus subscription ${userName}?`,
      'Data tidak dapat dipulihkan.',
      async () => {
        try { await api.adminDeleteSubscription(subId); await load(); notify('Subscription terhapus'); }
        catch (e: any) { notify(e.message, 'Gagal'); }
      },
      { confirmLabel: 'Hapus', destructive: true }
    );
  }

  function delUser(userId: string, userName: string) {
    confirmAction(
      `Hapus customer "${userName}"?`,
      'Akun + semua subscription, payment, antrian akan dihapus permanen.',
      async () => {
        try { await api.adminDeleteUser(userId); await load(); notify('Customer terhapus'); }
        catch (e: any) { notify(e.message, 'Gagal'); }
      },
      { confirmLabel: 'Hapus', destructive: true }
    );
  }

  function activateWithPackage(subId: string) {
    if (packages.length === 0) { notify('Buat paket dulu di Pengaturan → Paket langganan', 'Belum ada paket'); return; }
    const active = packages.filter(p => p.active);
    if (active.length === 0) { notify('Aktifkan minimal 1 paket dulu', 'Tidak ada paket aktif'); return; }
    const list = active.map((p: any, i: number) => `${i + 1}. ${p.name} (${p.quota_count}× / ${p.duration_days}h)`).join('\n');
    promptInput(
      'Pilih paket',
      `Masukkan nomor paket (1-${active.length}):\n\n${list}`,
      async (val: string) => {
        const idx = parseInt(val || '0', 10) - 1;
        if (idx < 0 || idx >= active.length) { notify('Nomor tidak valid', 'Batal'); return; }
        try { await api.adminUpdateSubscription(subId, { package_id: active[idx].id, status: 'active' }); await load(); notify(`Paket "${active[idx].name}" diaktifkan`); }
        catch (e: any) { notify(e.message, 'Gagal'); }
      },
      { defaultValue: '1' }
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: BOTTOM_DOCK_HEIGHT + 60 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)' }}>
            <Ionicons name="arrow-back" size={22} color={c.text} />
          </TouchableOpacity>
          <Hx size={24}>Subscription customer</Hx>
        </View>

        {groups.length === 0 && <Card><BodyText>Belum ada subscription</BodyText></Card>}
        {groups.map(g => {
          const act = g.active;
          const uid = g.user?.id;
          const uname = g.user?.name || '—';
          return (
            <Card key={uid || Math.random()} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <BodyText weight="700" size={16}>{uname}</BodyText>
                  <MutedText size={13}>{g.user?.email || ''}</MutedText>
                </View>
                {act && (
                  <Badge
                    label={act.status}
                    color={act.status === 'active' ? '#DCFCE7' : act.status === 'suspended' ? '#FEF3C7' : '#FEE2E2'}
                    textColor={act.status === 'active' ? '#065F46' : act.status === 'suspended' ? '#92400E' : '#7F1D1D'}
                  />
                )}
              </View>
              {act ? (
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  <Badge label={act.package_name || 'Paket'} />
                  <Badge label={`Kuota: ${act.credits_remaining}`} />
                  {act.expires_at && <Badge label={`Berakhir ${new Date(act.expires_at).toLocaleDateString('id-ID')}`} />}
                </View>
              ) : (
                <MutedText size={13}>Belum ada paket aktif</MutedText>
              )}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {act && <Button testID={`activate-${act.id}`} label="Aktifkan (pilih paket)" onPress={() => activateWithPackage(act.id)} style={{ flex: 1, minWidth: 140 }} />}
                {act && act.status !== 'suspended' && <Button testID={`suspend-${act.id}`} label="Suspend" variant="secondary" onPress={() => setStatus(act.id, 'suspended')} style={{ flex: 1, minWidth: 100 }} />}
                {act && act.status !== 'expired' && <Button testID={`expire-${act.id}`} label="Expired" variant="secondary" onPress={() => setStatus(act.id, 'expired')} style={{ flex: 1, minWidth: 100 }} />}
                {act && <Button testID={`delete-sub-${act.id}`} label="Hapus sub" variant="danger" onPress={() => delSub(act.id, uname)} style={{ flex: 1, minWidth: 100 }} />}
                {uid && <Button testID={`delete-user-${uid}`} label="Hapus customer" variant="danger" onPress={() => delUser(uid, uname)} style={{ flex: 1, minWidth: 140 }} />}
              </View>
              {g.subs.length > 1 && (
                <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(15,23,42,0.05)' }}>
                  <MutedText size={11}>RIWAYAT ({g.subs.length} paket):</MutedText>
                  {g.subs.slice(1).map(s => (
                    <View key={s.id} style={{ flexDirection: 'row', marginTop: 6, gap: 6 }}>
                      <MutedText size={12}>• {s.package_name}</MutedText>
                      <MutedText size={12}>({s.status})</MutedText>
                      <MutedText size={12}>{new Date(s.created_at).toLocaleDateString('id-ID')}</MutedText>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          );
        })}
      </ScrollView>
      <BottomDock />
    </SafeAreaView>
  );
}
