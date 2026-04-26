import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../src/themeContext';
import { Card, Hx, MutedText, BodyText, Badge } from '../../src/ui';
import { BottomDock, BOTTOM_DOCK_HEIGHT } from '../../src/bottomDock';
import { api } from '../../src/api';

type CustomerGroup = { user: any; subs: any[]; active?: any };

export default function AdminSubscriptions() {
  const router = useRouter();
  const c = useColors();
  const [groups, setGroups] = useState<CustomerGroup[]>([]);

  async function load() {
    const list = await api.adminSubscriptions();
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
  }
  useEffect(() => { load(); }, []);

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
            </Card>
          );
        })}
      </ScrollView>
      <BottomDock />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({});
