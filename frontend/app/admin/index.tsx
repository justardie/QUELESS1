import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, RefreshControl, TextInput, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '../../src/theme';
import { Card, ScreenHeader, Badge, Button } from '../../src/ui';
import { BottomDock, BOTTOM_DOCK_HEIGHT } from '../../src/bottomDock';
import { api } from '../../src/api';
import { notify } from '../../src/alerts';
import { useAuth } from '../../src/auth';

type ConfirmState = {
  title: string; message: string; confirmLabel: string; danger?: boolean; onConfirm: () => void;
} | null;

function ConfirmModal({ modal, onClose }: { modal: ConfirmState; onClose: () => void }) {
  if (!modal) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>{modal.title}</Text>
          <Text style={{ color: theme.colors.textMuted, marginBottom: 20, lineHeight: 20, fontSize: 14 }}>{modal.message}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#eee', flex: 1 }]} onPress={onClose}>
              <Text style={{ fontWeight: '600' }}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: modal.danger ? '#DC2626' : theme.colors.brand, flex: 1 }]}
              onPress={() => { onClose(); modal.onConfirm(); }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>{modal.confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ChangePasswordModal({ visible, onClose, onSubmit }: {
  visible: boolean; onClose: () => void; onSubmit: (pw: string) => void;
}) {
  const [pw, setPw] = useState('');
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Ganti Password</Text>
          <TextInput
            value={pw} onChangeText={setPw}
            placeholder="Password baru (min. 6 karakter)"
            placeholderTextColor="#999"
            secureTextEntry
            style={styles.modalInput}
          />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#eee' }]} onPress={() => { setPw(''); onClose(); }}>
              <Text style={{ fontWeight: '600' }}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: theme.colors.brand }]}
              onPress={() => {
                if (pw.length >= 6) { onSubmit(pw); setPw(''); }
                else notify('Password minimal 6 karakter', 'Error');
              }}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>Simpan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function Admin() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<any | null>(null);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'merchants' | 'users'>('merchants');
  const [pwModal, setPwModal] = useState<{ id: string; type: 'user' | 'merchant' } | null>(null);
  const [billingModal, setBillingModal] = useState<{ id: string; name: string } | null>(null);
  const [merchantPackages, setMerchantPackages] = useState<any[]>([]);
  const [confirmModal, setConfirmModal] = useState<ConfirmState>(null);

  const load = useCallback(async () => {
    try {
      const [s, m, u] = await Promise.all([
        api.adminStats(), api.adminMerchants(), api.adminUsers()
      ]);
      setStats(s); setMerchants(m); setUsers(u);
    } catch (e: any) { notify(e.message, 'Error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!billingModal) return;
    api.adminPackages().then((pkgs: any[]) => {
      setMerchantPackages(pkgs.filter((p: any) => p.target === 'merchant' && p.active));
    }).catch(() => {});
  }, [billingModal]);

  async function setMerchantStatus(id: string, status: string) {
    try { await api.adminUpdateMerchantStatus(id, status); await load(); }
    catch (e: any) { notify(e.message, 'Error'); }
  }

  function handleSuspendUser(u: any) {
    const isSuspended = u.is_suspended;
    setConfirmModal({
      title: isSuspended ? 'Aktifkan akun' : 'Suspend akun',
      message: isSuspended
        ? `Aktifkan akun ${u.name}?`
        : `Suspend akun ${u.name}? User tidak bisa login selama disuspend.`,
      confirmLabel: isSuspended ? 'Aktifkan' : 'Suspend',
      danger: !isSuspended,
      onConfirm: async () => {
        try {
          if (isSuspended) await api.adminUnsuspendUser(u.id);
          else await api.adminSuspendUser(u.id);
          await load();
          notify(isSuspended ? 'User berhasil diaktifkan' : 'User berhasil disuspend');
        } catch (e: any) { notify(e.message, 'Gagal'); }
      },
    });
  }

  function handleDeleteUser(u: any) {
    setConfirmModal({
      title: 'Hapus akun',
      message: `Hapus akun ${u.name} (${u.email})? Tindakan ini TIDAK bisa dibatalkan.`,
      confirmLabel: 'Hapus',
      danger: true,
      onConfirm: async () => {
        try {
          await api.adminDeleteUser(u.id);
          await load();
          notify(`Akun ${u.name} dihapus`);
        } catch (e: any) { notify(e.message, 'Gagal'); }
      },
    });
  }

  function handleDeleteMerchant(m: any) {
    setConfirmModal({
      title: 'Hapus merchant',
      message: `Hapus merchant "${m.name}"? Data antrian akan ikut terhapus. Tindakan ini TIDAK bisa dibatalkan.`,
      confirmLabel: 'Hapus',
      danger: true,
      onConfirm: async () => {
        try {
          await api.adminDeleteMerchant(m.id);
          await load();
          notify(`Merchant ${m.name} dihapus`);
        } catch (e: any) { notify(e.message, 'Gagal'); }
      },
    });
  }

  async function handleChangePassword(new_password: string) {
    if (!pwModal) return;
    try {
      if (pwModal.type === 'user') await api.adminChangeUserPassword(pwModal.id, new_password);
      else await api.adminChangeMerchantPassword(pwModal.id, new_password);
      setPwModal(null);
      notify('Password berhasil diubah');
    } catch (e: any) { notify(e.message, 'Gagal'); }
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color={theme.colors.brand} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ConfirmModal modal={confirmModal} onClose={() => setConfirmModal(null)} />
      <ChangePasswordModal
        visible={!!pwModal}
        onClose={() => setPwModal(null)}
        onSubmit={handleChangePassword}
      />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: BOTTOM_DOCK_HEIGHT + 40 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={theme.colors.brand} />}
      >
        <ScreenHeader title="Admin" subtitle={user?.email} />

        <View style={styles.statsRow}>
          <StatCard label="Users" value={stats?.users ?? 0} color={theme.colors.brandSoft} textColor={theme.colors.brandDark} />
          <StatCard label="Merchants" value={stats?.merchants ?? 0} color={theme.colors.mint} textColor="#065F46" />
          <StatCard label="Pending" value={stats?.pending_merchants ?? 0} color={theme.colors.sun} textColor="#92400E" />
        </View>
        <Card style={{ marginTop: 10 }}>
          <Text style={{ fontSize: 12, color: theme.colors.textMuted, fontWeight: '700', letterSpacing: 1 }}>QUEUES TODAY</Text>
          <Text style={{ fontSize: 36, fontWeight: '900', color: theme.colors.text, letterSpacing: -1 }}>{stats?.total_queues_today ?? 0}</Text>
        </Card>

        <View style={[styles.tabs, { marginTop: 20 }]}>
          {(['merchants', 'users'] as const).map(t => (
            <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'merchants' ? 'Merchants' : 'Users'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'merchants' ? (
          <>
            <Button label="+ Tambah Merchant" onPress={() => router.push('/admin/create-merchant')} style={{ marginTop: 10 }} />
            {merchants.map(m => {
              const billingActive = m.billing_active;
              const billingExpiry = m.billing_expires_at ? new Date(m.billing_expires_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
              return (
                <Card key={m.id} style={{ marginTop: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{m.name}</Text>
                      {m.owner_username ? <Text style={styles.muted}>@{m.owner_username}</Text> : null}
                      <Text style={styles.muted}>{m.owner_email || m.email || '—'}</Text>
                      {billingExpiry ? (
                        <Text style={{ fontSize: 11, marginTop: 2, color: billingActive ? '#065F46' : '#DC2626', fontWeight: '600' }}>
                          Billing {billingActive ? 'aktif' : 'kadaluarsa'} • {billingExpiry}
                        </Text>
                      ) : (
                        <Text style={{ fontSize: 11, marginTop: 2, color: '#92400E' }}>Belum ada billing</Text>
                      )}
                    </View>
                    <View style={{ gap: 4, alignItems: 'flex-end' }}>
                      <Badge
                        label={m.status}
                        color={m.status === 'approved' ? theme.colors.mint : m.status === 'pending' ? theme.colors.sun : theme.colors.peach}
                        textColor={m.status === 'approved' ? '#065F46' : m.status === 'pending' ? '#92400E' : '#7F1D1D'}
                      />
                      {m.billing_plan && (
                        <Badge
                          label={billingActive ? 'Aktif' : 'Expired'}
                          color={billingActive ? theme.colors.mint : theme.colors.peach}
                          textColor={billingActive ? '#065F46' : '#7F1D1D'}
                        />
                      )}
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    {m.status !== 'approved' && (
                      <Button label="Aktifkan" onPress={() => setMerchantStatus(m.id, 'approved')} style={{ flex: 1, minWidth: 90 }} />
                    )}
                    {m.status !== 'suspended' && (
                      <Button label="Suspend" variant="secondary" onPress={() => setMerchantStatus(m.id, 'suspended')} style={{ flex: 1, minWidth: 90 }} />
                    )}
                    <Button label="Billing" variant="secondary" onPress={() => setBillingModal({ id: m.id, name: m.name })} style={{ flex: 1, minWidth: 90 }} />
                    <Button label="Ubah Password" variant="secondary" onPress={() => setPwModal({ id: m.id, type: 'merchant' })} style={{ flex: 1, minWidth: 90 }} />
                    <Button label="Hapus" variant="danger" onPress={() => handleDeleteMerchant(m)} style={{ flex: 1, minWidth: 90 }} />
                  </View>
                </Card>
              );
            })}
          </>
        ) : (
          users.map(u => (
            <Card key={u.id} style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{u.name}</Text>
                  {u.username ? <Text style={styles.muted}>@{u.username}</Text> : null}
                  <Text style={styles.muted}>{u.email}</Text>
                  {u.is_suspended && (
                    <Text style={{ color: '#DC2626', fontSize: 12, marginTop: 2, fontWeight: '700' }}>
                      Akun Disuspend
                    </Text>
                  )}
                </View>
                <Badge
                  label={u.role}
                  color={u.role === 'admin' ? theme.colors.peach : u.role === 'merchant' ? theme.colors.brandSoft : theme.colors.bg2}
                  textColor={u.role === 'admin' ? '#7F1D1D' : u.role === 'merchant' ? theme.colors.brandDark : theme.colors.text}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <Button
                  label={u.is_suspended ? 'Aktifkan' : 'Suspend'}
                  variant={u.is_suspended ? 'default' : 'secondary'}
                  onPress={() => handleSuspendUser(u)}
                  style={{ flex: 1, minWidth: 90 }}
                />
                <Button label="Ubah Password" variant="secondary" onPress={() => setPwModal({ id: u.id, type: 'user' })} style={{ flex: 1, minWidth: 90 }} />
                <Button label="Hapus" variant="danger" onPress={() => handleDeleteUser(u)} style={{ flex: 1, minWidth: 90 }} />
              </View>
            </Card>
          ))
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
      {/* Billing Modal */}
      {billingModal && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setBillingModal(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Set Billing: {billingModal.name}</Text>
              <Text style={{ color: theme.colors.textMuted, marginBottom: 12, fontSize: 13 }}>Pilih paket billing merchant.</Text>
              {merchantPackages.length === 0 ? (
                <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginBottom: 12, textAlign: 'center' }}>
                  Belum ada paket merchant. Buat paket baru di menu Paket Langganan dengan target "Merchant".
                </Text>
              ) : (
                merchantPackages.map((pkg: any) => (
                  <TouchableOpacity
                    key={pkg.id}
                    style={[styles.modalBtn, { backgroundColor: theme.colors.brandSoft, marginBottom: 10, height: 'auto', paddingVertical: 14 }]}
                    onPress={async () => {
                      try {
                        await api.adminSetMerchantBilling(billingModal.id, pkg.id);
                        await load();
                        notify(`Billing "${pkg.name}" diaktifkan`);
                        setBillingModal(null);
                      } catch (e: any) { notify(e.message, 'Gagal'); }
                    }}>
                    <Text style={{ fontWeight: '700', color: theme.colors.brandDark }}>{pkg.name}</Text>
                    <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>{pkg.duration_days} hari</Text>
                  </TouchableOpacity>
                ))
              )}
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#fee2e2', marginBottom: 10, height: 'auto', paddingVertical: 12 }]}
                onPress={async () => {
                  try { await api.adminRemoveMerchantBilling(billingModal.id); await load(); notify('Billing dihapus'); setBillingModal(null); }
                  catch (e: any) { notify(e.message, 'Gagal'); }
                }}>
                <Text style={{ fontWeight: '600', color: '#DC2626' }}>Hapus Billing</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#eee' }]} onPress={() => setBillingModal(null)}>
                <Text style={{ fontWeight: '600' }}>Batal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
      <BottomDock />
    </SafeAreaView>
  );
}

function StatCard({ label, value, color, textColor }: any) {
  return (
    <View style={[styles.stat, { backgroundColor: color }]}>
      <Text style={[styles.statLabel, { color: textColor }]}>{label}</Text>
      <Text style={[styles.statVal, { color: textColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg },
  statsRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, borderRadius: 20, padding: 16 },
  statLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  statVal: { fontSize: 32, fontWeight: '900', letterSpacing: -1, marginTop: 4 },
  tabs: { flexDirection: 'row', backgroundColor: theme.colors.bg2, borderRadius: 14, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#fff' },
  tabText: { color: theme.colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: theme.colors.text },
  name: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  muted: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  modalInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 16 },
  modalBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
