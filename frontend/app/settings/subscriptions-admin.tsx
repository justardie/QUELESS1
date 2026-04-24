import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors, iosFontFamily } from '../../src/themeContext';
import { Card, Hx, MutedText, BodyText, Button, Badge } from '../../src/ui';
import { BottomDock, BOTTOM_DOCK_HEIGHT } from '../../src/bottomDock';
import { api } from '../../src/api';
import { notify } from '../../src/alerts';

type CustomerGroup = { user: any; subs: any[]; active?: any };

export default function AdminSubscriptions() {
  const router = useRouter();
  const c = useColors();
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [pickerOpen, setPickerOpen] = useState<null | { subId: string; userName: string }>(null);

  async function load() {
    const [list, pkgs] = await Promise.all([
      api.adminSubscriptions(),
      api.adminPackages().catch(() => []),
    ]);
    const byUser: Record<string, CustomerGroup> = {};
    for (const s of list) {
      const uid = s.user?.id || 'unknown';
      if (!byUser[uid]) byUser[uid] = { user: s.user, subs: [] };
      byUser[uid].subs.push(s);
    }
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

  async function delUser(userId: string, userName: string) {
    try { await api.adminDeleteUser(userId); await load(); notify(`Customer "${userName}" dihapus`); }
    catch (e: any) { notify(e.message, 'Gagal menghapus'); }
  }

  async function pickPackage(pkgId: string) {
    if (!pickerOpen) return;
    const subId = pickerOpen.subId;
    setPickerOpen(null);
    try {
      await api.adminUpdateSubscription(subId, { package_id: pkgId, status: 'active' });
      await load();
      notify('Paket diaktifkan');
    } catch (e: any) { notify(e.message, 'Gagal'); }
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
                {act && <Button testID={`activate-${act.id}`} label="Aktifkan (pilih paket)" onPress={() => setPickerOpen({ subId: act.id, userName: uname })} style={{ flex: 1, minWidth: 140 }} />}
                {act && act.status !== 'suspended' && <Button testID={`suspend-${act.id}`} label="Suspend" variant="secondary" onPress={() => setStatus(act.id, 'suspended')} style={{ flex: 1, minWidth: 100 }} />}
                {act && act.status !== 'expired' && <Button testID={`expire-${act.id}`} label="Expired" variant="secondary" onPress={() => setStatus(act.id, 'expired')} style={{ flex: 1, minWidth: 100 }} />}
                {uid && <Button testID={`delete-user-${uid}`} label="Hapus customer" variant="danger" onPress={() => delUser(uid, uname)} style={{ flex: 1, minWidth: 140 }} />}
              </View>
            </Card>
          );
        })}
      </ScrollView>

      {/* Package picker modal */}
      <Modal visible={!!pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: c.bg }]}>
            <Hx size={18}>Pilih paket untuk {pickerOpen?.userName}</Hx>
            <MutedText size={13} style={{ marginTop: 4 }}>Paket akan di-accumulate ke subscription existing</MutedText>
            <ScrollView style={{ maxHeight: 360, marginTop: 12 }}>
              {packages.filter(p => p.active).length === 0 && (
                <Card><BodyText>Tidak ada paket aktif. Buat paket dulu di "Paket langganan".</BodyText></Card>
              )}
              {packages.filter(p => p.active).map((p: any) => (
                <TouchableOpacity key={p.id} testID={`pick-package-${p.id}`} onPress={() => pickPackage(p.id)} style={{ marginBottom: 8 }}>
                  <Card>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <BodyText weight="700">{p.name}</BodyText>
                        <MutedText size={13}>{p.quota_count} kuota • {p.duration_days} hari • Rp {p.price_idr.toLocaleString('id-ID')}</MutedText>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={c.muted} />
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button label="Batal" variant="secondary" onPress={() => setPickerOpen(null)} style={{ marginTop: 8 }} />
          </View>
        </View>
      </Modal>

      <BottomDock />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { padding: 20, borderRadius: 20, elevation: 8, maxHeight: '85%' },
});
