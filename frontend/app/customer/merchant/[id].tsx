import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, Dimensions, Modal, TextInput, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors, iosFontFamily } from '../../../src/themeContext';
import { Card, Button, MutedText, BodyText, Hx } from '../../../src/ui';
import { api } from '../../../src/api';
import { useAuth } from '../../../src/auth';

const { height: SCREEN_H } = Dimensions.get('window');
const HERO_H = Math.min(SCREEN_H * 0.42, 360);

export default function MerchantDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useColors();
  const { user } = useAuth();
  const [m, setM] = useState<any | null>(null);
  const [tv, setTv] = useState<any | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const data = await api.merchant(id!);
        if (!alive) return;
        setM(data);
        if (data.categories?.length) {
          // only auto-select if merchant enforces service selection (i.e., >1 category or user taps)
          if (data.categories.length === 1) setSelected(data.categories[0].id);
        }
      } catch (e: any) {
        Alert.alert('Error', e.message);
      }
    }
    async function loadTv() {
      try { const t = await api.tv(id!); if (alive) setTv(t); } catch {}
    }
    load(); loadTv();
    const timer = setInterval(loadTv, 4000);
    return () => { alive = false; clearInterval(timer); };
  }, [id]);

  async function onJoinPressed() {
    // Merchant hanya boleh ambil nomor di merchantnya sendiri
    if (user?.role === 'merchant') {
      if (m?.owner_id !== user.id) {
        Alert.alert('Tidak diizinkan', 'Akun merchant hanya dapat mengambil nomor antrian di toko sendiri.');
        return;
      }
      // Minta input nama pelanggan sebelum join
      setCustomerName('');
      setShowNameModal(true);
      return;
    }
    await doJoin();
  }

  async function doJoin(nameOverride?: string) {
    const needCategory = m?.service_enabled !== false && (m?.categories?.length || 0) > 0;
    if (needCategory && !selected) {
      Alert.alert('Pilih layanan', 'Silakan pilih layanan terlebih dahulu');
      return;
    }
    setBusy(true);
    try {
      const entry: any = await api.joinQueue({
        merchant_id: id!,
        category_id: needCategory ? selected : undefined,
        customer_name: nameOverride,
      });
      setShowNameModal(false);
      router.replace(`/customer/queue/${entry.id}`);
    } catch (e: any) {
      Alert.alert('Gagal mengambil antrian', e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!m) return <View style={[styles.center, { backgroundColor: c.bg }]}><ActivityIndicator color={c.primary} /></View>;

  const heroUrl = m.photo_url || m.tv_photo_url || '';
  const nowNum = tv?.now_serving?.queue_number;
  const upcomingCount = tv?.upcoming?.length || 0;
  const isOpen = m.is_open !== false;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Hero image (setengah halaman) */}
        <View style={styles.hero}>
          {heroUrl ? (
            <Image source={{ uri: heroUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          ) : (
            <LinearGradient colors={[c.primary, c.primaryDark]} style={StyleSheet.absoluteFillObject} />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.0)', 'rgba(0,0,0,0.55)']}
            style={StyleSheet.absoluteFillObject}
            locations={[0, 0.4, 1]}
          />
          {/* Back + status */}
          <View style={styles.heroTopBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <View style={[styles.statusPill, { backgroundColor: isOpen ? 'rgba(34,197,94,0.95)' : 'rgba(239,68,68,0.95)' }]}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' }} />
              <Text style={[styles.statusText, { fontFamily: iosFontFamily }]}>{isOpen ? 'Buka' : 'Tutup'}</Text>
            </View>
          </View>

          {/* Nomor antrian aktif (overlay bawah hero) */}
          <View style={styles.heroBottom}>
            <View style={styles.activeBadge}>
              <Text style={[styles.activeLabel, { fontFamily: iosFontFamily }]}>SEDANG DILAYANI</Text>
              <Text style={[styles.activeNumber, { fontFamily: iosFontFamily }]}>
                {nowNum ? `#${nowNum}` : '—'}
              </Text>
            </View>
            <View style={{ flex: 1 }} />
            <View style={styles.waitingBadge}>
              <Ionicons name="people-outline" size={18} color="#fff" />
              <Text style={[styles.waitingText, { fontFamily: iosFontFamily }]}>{upcomingCount} menunggu</Text>
            </View>
          </View>
        </View>

        {/* Body card - overlap ke hero */}
        <View style={styles.bodyWrap}>
          <Card style={{ borderRadius: 28, padding: 20, marginTop: -24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              {m.logo_url ? (
                <Image source={{ uri: m.logo_url }} style={styles.logo} />
              ) : (
                <View style={[styles.logo, { backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="storefront" size={28} color={c.primaryDark} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Hx size={22}>{m.name}</Hx>
                {!!m.description && <MutedText size={13} style={{ marginTop: 2 }} >{m.description}</MutedText>}
              </View>
            </View>

            <View style={{ height: 14 }} />
            {!!m.address && (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={16} color={c.muted} />
                <Text style={[styles.infoText, { color: c.text, fontFamily: iosFontFamily }]}>{m.address}</Text>
              </View>
            )}
            {!!m.hours_text && (
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={16} color={c.muted} />
                <Text style={[styles.infoText, { color: c.text, fontFamily: iosFontFamily }]}>{m.hours_text}</Text>
              </View>
            )}
          </Card>

          {/* Services section REMOVED globally — fokus antrian saja per user request */}
        </View>
      </ScrollView>

      {/* Tombol Join fixed di bawah */}
      <View style={[styles.footer, { backgroundColor: c.bg }]}>
        <Button
          testID="join-queue-button"
          label={busy ? 'Mengambil nomor…' : isOpen ? 'Ambil nomor antrian' : 'Merchant sedang tutup'}
          onPress={onJoinPressed}
          disabled={!isOpen || busy}
        />
      </View>

      {/* Modal input nama pelanggan (untuk merchant ambil nomor di toko sendiri) */}
      <Modal
        visible={showNameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNameModal(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: c.bg }]}>
              <Hx size={18}>Nama pelanggan</Hx>
              <MutedText size={13} style={{ marginTop: 6 }}>Isi nama untuk ditampilkan di antrian</MutedText>
              <TextInput
                testID="name-input"
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="mis. Budi"
                placeholderTextColor={c.muted}
                autoFocus
                style={[styles.modalInput, { color: c.text, fontFamily: iosFontFamily }]}
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <Button label="Batal" variant="secondary" onPress={() => setShowNameModal(false)} style={{ flex: 1 }} />
                <Button
                  testID="confirm-name-button"
                  label={busy ? 'Memproses…' : 'Lanjutkan'}
                  onPress={() => {
                    if (!customerName.trim()) { Alert.alert('Nama diperlukan', 'Mohon isi nama pelanggan.'); return; }
                    doJoin(customerName.trim());
                  }}
                  disabled={busy}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { height: HERO_H, width: '100%', position: 'relative' },
  heroTopBar: { paddingHorizontal: 16, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  statusText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  heroBottom: { position: 'absolute', left: 0, right: 0, bottom: 38, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'flex-end' },
  activeBadge: { backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 18, paddingVertical: 14, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  activeLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 2, color: 'rgba(255,255,255,0.9)' },
  activeNumber: { fontSize: 42, fontWeight: '900', color: '#fff', letterSpacing: -2, marginTop: 2, includeFontPadding: false },
  waitingBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  waitingText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  bodyWrap: { paddingHorizontal: 16 },
  logo: { width: 60, height: 60, borderRadius: 18 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  infoText: { fontSize: 14 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginTop: 20, marginBottom: 10 },
  catCard: { flexDirection: 'row', alignItems: 'center' },
  radio: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20, borderTopWidth: 1, borderTopColor: 'rgba(15,23,42,0.06)' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { padding: 20, borderRadius: 20, elevation: 8 },
  modalInput: { marginTop: 12, height: 48, borderWidth: 1, borderColor: 'rgba(15,23,42,0.1)', borderRadius: 12, paddingHorizontal: 14, fontSize: 16 },
});
