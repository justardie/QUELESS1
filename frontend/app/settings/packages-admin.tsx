import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors, iosFontFamily } from '../../src/themeContext';
import { Card, Hx, MutedText, BodyText, Button, Badge } from '../../src/ui';
import { BottomDock, BOTTOM_DOCK_HEIGHT } from '../../src/bottomDock';
import { api } from '../../src/api';
import { confirmAction, notify } from '../../src/alerts';

function fmtIDR(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

export default function AdminPackages() {
  const router = useRouter();
  const c = useColors();
  const [packages, setPackages] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);

  async function load() {
    const list = await api.adminPackages();
    setPackages(list);
  }
  useEffect(() => { load(); }, []);

  function newPackage() {
    setEditing({ name: '', description: '', price_idr: 0, quota_count: 1, duration_days: 30, active: true, target: 'customer' });
  }

  async function save() {
    try {
      if (editing.id) await api.updatePackage(editing.id, editing);
      else await api.createPackage(editing);
      setEditing(null);
      await load();
      notify('Paket disimpan');
    } catch (e: any) { notify(e.message, 'Gagal'); }
  }

  function del(id: string, name: string) {
    // Direct delete dengan notify (confirmAction tidak reliable di semua platform)
    (async () => {
      try { await api.deletePackage(id); await load(); notify(`Paket "${name}" dihapus`); }
      catch (e: any) { notify(e.message, 'Gagal menghapus'); }
    })();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: BOTTOM_DOCK_HEIGHT + 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: '#fff', borderColor: 'rgba(15,23,42,0.08)' }]}>
            <Ionicons name="arrow-back" size={22} color={c.text} />
          </TouchableOpacity>
          <Hx size={24} style={{ flex: 1 }}>Paket langganan</Hx>
          <TouchableOpacity testID="add-package" onPress={newPackage} style={[styles.iconBtn, { backgroundColor: c.primary, borderWidth: 0 }]}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {editing && (
          <Card style={{ marginBottom: 16 }}>
            <Hx size={18}>{editing.id ? 'Edit paket' : 'Paket baru'}</Hx>
            <Label>Nama</Label>
            <TextInput testID="pkg-name" style={styles.input(c)} value={editing.name} onChangeText={v => setEditing({ ...editing, name: v })} />
            <Label>Deskripsi</Label>
            <TextInput testID="pkg-desc" style={styles.input(c)} value={editing.description} onChangeText={v => setEditing({ ...editing, description: v })} />
            <Label>Harga (Rupiah)</Label>
            <TextInput testID="pkg-price" keyboardType="numeric" style={styles.input(c)} value={String(editing.price_idr)} onChangeText={v => setEditing({ ...editing, price_idr: parseInt(v || '0', 10) || 0 })} />
            <Label>Kuota antrian</Label>
            <TextInput testID="pkg-quota" keyboardType="numeric" style={styles.input(c)} value={String(editing.quota_count)} onChangeText={v => setEditing({ ...editing, quota_count: parseInt(v || '1', 10) || 1 })} />
            <Label>Berlaku (hari)</Label>
            <TextInput testID="pkg-days" keyboardType="numeric" style={styles.input(c)} value={String(editing.duration_days)} onChangeText={v => setEditing({ ...editing, duration_days: parseInt(v || '30', 10) || 30 })} />
            <Label>Target</Label>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 4 }}>
              {(['customer', 'merchant'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setEditing({ ...editing, target: t })}
                  style={{ paddingHorizontal: 18, paddingVertical: 8, borderRadius: 10, backgroundColor: (editing.target || 'customer') === t ? c.primary : '#F1F5F9' }}
                >
                  <Text style={{ color: (editing.target || 'customer') === t ? '#fff' : c.text, fontWeight: '600', textTransform: 'capitalize' }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
              <BodyText style={{ flex: 1 }}>Aktif</BodyText>
              <Switch value={!!editing.active} onValueChange={v => setEditing({ ...editing, active: v })} trackColor={{ true: c.primary, false: '#CBD5E1' }} thumbColor="#fff" />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <Button testID="save-package" label="Simpan" onPress={save} style={{ flex: 1 }} />
              <Button label="Batal" variant="secondary" onPress={() => setEditing(null)} style={{ flex: 1 }} />
            </View>
          </Card>
        )}

        {packages.length === 0 && !editing && (
          <Card><BodyText>Belum ada paket. Tap + untuk buat paket baru.</BodyText></Card>
        )}

        {packages.map(p => (
          <Card key={p.id} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <BodyText weight="700" size={17}>{p.name}</BodyText>
                <MutedText size={13}>{p.description}</MutedText>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <Badge label={fmtIDR(p.price_idr)} />
                  <Badge label={`${p.quota_count}× antrian`} />
                  <Badge label={`${p.duration_days} hari`} />
                  {p.target === 'merchant' && <Badge label="Merchant" color="#DBEAFE" textColor="#1E3A8A" />}
                  {!p.active && <Badge label="Nonaktif" color="#FEE2E2" textColor="#7F1D1D" />}
                </View>
              </View>
              <TouchableOpacity testID={`edit-${p.id}`} onPress={() => setEditing({ ...p })} style={styles.smallBtn}>
                <Ionicons name="create-outline" size={20} color={c.primaryDark} />
              </TouchableOpacity>
              <View style={{ width: 8 }} />
              <TouchableOpacity testID={`delete-${p.id}`} onPress={() => del(p.id, p.name)} style={styles.smallBtn}>
                <Ionicons name="trash-outline" size={20} color="#DC2626" />
              </TouchableOpacity>
            </View>
          </Card>
        ))}
      </ScrollView>
      </KeyboardAvoidingView>
      <BottomDock />
    </SafeAreaView>
  );
}

function Label({ children }: { children: any }) {
  const c = useColors();
  return <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: c.muted, marginTop: 10, marginBottom: 6, fontFamily: iosFontFamily }}>{children}</Text>;
}

const styles = {
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 } as any,
  input: (c: any) => ({
    height: 44, borderRadius: 12, backgroundColor: '#fff',
    borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)', paddingHorizontal: 12,
    fontSize: 15, color: c.text, fontFamily: iosFontFamily,
  }),
  smallBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' } as any,
};
