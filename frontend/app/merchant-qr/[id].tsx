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

  const base = (Platform.OS === 'web' && typeof window !== 'undefined')
    ? window.location.origin
    : (process.env.EXPO_PUBLIC_APP_URL || process.env.EXPO_PUBLIC_BACKEND_URL || '');
  const url = `${base}/customer/merchant/${m.slug || m.id}`;
  const filename = `qr-${m.name?.replace(/\s+/g, '-').toLowerCase() || m.id}.png`;

  function downloadQR() {
    if (Platform.OS !== 'web') {
      Alert.alert('Info', 'Download QR hanya tersedia di browser web.');
      return;
    }
    // Try DOM SVG approach first (more reliable on web)
    const svgEl = (document as any).getElementById('qr-svg-wrap')?.querySelector('svg');
    if (svgEl) {
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const canvas = document.createElement('canvas');
      const size = 512;
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      img.onload = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        URL.revokeObjectURL(blobUrl);
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };
      img.src = blobUrl;
      return;
    }
    // Fallback: use lib ref
    if (svgRef.current?.toDataURL) {
      svgRef.current.toDataURL((dataUrl: string) => {
        if (!dataUrl) { Alert.alert('Error', 'Gagal mengambil gambar QR'); return; }
        const link = document.createElement('a');
        link.href = dataUrl; link.download = filename;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
      });
    } else {
      Alert.alert('Error', 'Download tidak didukung di browser ini');
    }
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
          <View nativeID="qr-svg-wrap" style={{ padding: 16, backgroundColor: '#fff', borderRadius: 20, marginTop: 20, borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)' }}>
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
