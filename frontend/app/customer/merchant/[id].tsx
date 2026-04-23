import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../src/theme';
import { Card, Button } from '../../../src/ui';
import { api } from '../../../src/api';

export default function MerchantDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [m, setM] = useState<any | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.merchant(id!);
        setM(data);
        if (data.categories?.length) setSelected(data.categories[0].id);
      } catch (e: any) {
        Alert.alert('Error', e.message);
      }
    })();
  }, [id]);

  async function join() {
    if (!selected) return;
    setBusy(true);
    try {
      const entry: any = await api.joinQueue({ merchant_id: id!, category_id: selected });
      router.replace(`/customer/queue/${entry.id}`);
    } catch (e: any) {
      Alert.alert('Could not join queue', e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!m) return <View style={styles.center}><ActivityIndicator color={theme.colors.brand} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.heroWrap}>
          <View style={styles.heroIcon}>
            <Ionicons name="storefront" size={40} color={theme.colors.brandDark} />
          </View>
          <Text style={styles.mName}>{m.name}</Text>
          {!!m.description && <Text style={styles.mDesc}>{m.description}</Text>}
          {!!m.address && <Text style={styles.mAddr}>{m.address}</Text>}
        </View>

        <Text style={styles.section}>Choose a service</Text>
        {(m.categories || []).length === 0 ? (
          <Card><Text style={{ color: theme.colors.textMuted }}>No services available</Text></Card>
        ) : (
          m.categories.map((c: any) => (
            <TouchableOpacity
              key={c.id}
              testID={`service-category-${c.id}`}
              activeOpacity={0.9}
              onPress={() => setSelected(c.id)}
              style={{ marginBottom: 10 }}
            >
              <Card style={[styles.catCard, selected === c.id && styles.catCardActive]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.catName}>{c.name}</Text>
                  <Text style={styles.catSub}>~{c.avg_service_minutes} min per customer</Text>
                </View>
                <View style={[styles.radio, selected === c.id && styles.radioActive]} />
              </Card>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 20 }} />
        <Button
          testID="join-queue-button"
          label={busy ? 'Joining…' : 'Join queue'}
          onPress={join}
          disabled={!selected || busy}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg },
  scroll: { padding: 20, paddingBottom: 60 },
  topRow: { marginBottom: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  heroWrap: { alignItems: 'center', marginVertical: 20 },
  heroIcon: { width: 84, height: 84, borderRadius: 26, backgroundColor: theme.colors.brandSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  mName: { fontSize: 26, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.5 },
  mDesc: { fontSize: 15, color: theme.colors.textMuted, marginTop: 6, textAlign: 'center' },
  mAddr: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4 },
  section: { fontSize: 14, fontWeight: '700', color: theme.colors.textMuted, marginBottom: 10, marginTop: 8, textTransform: 'uppercase', letterSpacing: 1 },
  catCard: { flexDirection: 'row', alignItems: 'center' },
  catCardActive: { borderColor: theme.colors.brand, borderWidth: 2, backgroundColor: theme.colors.brandSoft },
  catName: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  catSub: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: theme.colors.border },
  radioActive: { borderColor: theme.colors.brand, backgroundColor: theme.colors.brand },
});
