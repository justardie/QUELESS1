import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useColors } from '../../src/themeContext';
import { Card, Hx, MutedText, Button } from '../../src/ui';
import { BottomDock, BOTTOM_DOCK_HEIGHT } from '../../src/bottomDock';
import { api } from '../../src/api';

export default function MerchantQR() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useColors();
  const [m, setM] = useState<any | null>(null);
  const svgRef = useRef<any>(null);

  useEffect(() => {
    api.merchant(id!).then(setM).catch(() => {});
  }, [id]);

  if (!m) return <View style={[s.center, { backgroundColor: c.bg }]}><ActivityIndicator color={c.primary} /></View>;

  const base = process.env.EXPO_PUBLIC_BACKEND_URL || '';
  const url = `${base}/customer/merchant/${m.id}`;
  const filename = `qr-${m.name?.replace(/\s+/g, '-').toLowerCase() || m.id}.png`;

  function downloadQR() {
    if (Platform.OS !== 'web') {
      Alert.alert('Info', 'Download QR hanya tersedia di browser web.');
      return;
    }
    if (!svgRef.current) return;
    svgRef.current.toDataURL((dataUrl: string) => {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <View style={{ padding: 20, flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)' }}>
            <Ionicons name="arrow-back" size={22} color={c.text} />
          </TouchableOpacity>
          <Hx size={22}>QR Code merchant</Hx>
        </View>

        <Card style={{ alignItems: 'center', paddingVertical: 28, marginBottom: BOTTOM_DOCK_HEIGHT + 20 }}>
          <Hx size={20}>{m.name}</Hx>
          <MutedText size={13} style={{ marginTop: 4, textAlign: 'center' }}>
            Cetak atau pasang QR ini di tempat Anda. Customer scan untuk langsung masuk halaman merchant.
          </MutedText>
          <View style={{ padding: 16, backgroundColor: '#fff', borderRadius: 20, marginTop: 20, borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)' }}>
            <QRCode
              value={url}
              size={240}
              color={c.text}
              getRef={(ref: any) => { svgRef.current = ref; }}
            />
          </View>
          <MutedText size={11} style={{ marginTop: 12 }}>{url}</MutedText>
          <View style={{ marginTop: 20, alignSelf: 'stretch' }}>
            <Button
              testID="download-qr"
              label="Download QR (.png)"
              onPress={downloadQR}
            />
          </View>
        </Card>
      </View>
      <BottomDock />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
