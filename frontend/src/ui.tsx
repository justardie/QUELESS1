import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle, Image } from 'react-native';
import { useColors, iosFontFamily, radius } from './themeContext';
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[] }) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: '#FFFFFF', borderColor: 'rgba(15,23,42,0.06)' }, style as any]}>
      {children}
    </View>
  );
}

export function Button({
  label, onPress, variant = 'primary', testID, disabled, style,
}: {
  label: string; onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  testID?: string; disabled?: boolean; style?: ViewStyle | ViewStyle[];
}) {
  const c = useColors();
  const bg = variant === 'primary' ? c.primary
    : variant === 'danger' ? '#DC2626'
    : variant === 'secondary' ? '#F1F5F9'
    : 'transparent';
  const color = variant === 'primary' || variant === 'danger' ? '#fff' : c.text;
  return (
    <TouchableOpacity
      testID={testID} disabled={disabled} activeOpacity={0.85} onPress={onPress}
      style={[styles.btn, { backgroundColor: bg, opacity: disabled ? 0.5 : 1 }, style as any]}
    >
      <Text style={[styles.btnText, { color, fontFamily: iosFontFamily }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Badge({ label, color, textColor }: { label: string; color?: string; textColor?: string }) {
  const c = useColors();
  return (
    <View style={[styles.badge, { backgroundColor: color || c.soft }]}>
      <Text style={[styles.badgeText, { color: textColor || c.primaryDark, fontFamily: iosFontFamily }]}>{label}</Text>
    </View>
  );
}

export function Hx({ children, size = 22, style }: { children: React.ReactNode; size?: number; style?: TextStyle }) {
  const c = useColors();
  return <Text style={[{ color: c.text, fontFamily: iosFontFamily, fontSize: size, fontWeight: '800', letterSpacing: -0.5 }, style]}>{children}</Text>;
}

export function MutedText({ children, style, size = 14 }: { children: React.ReactNode; style?: TextStyle; size?: number }) {
  const c = useColors();
  return <Text style={[{ color: c.muted, fontFamily: iosFontFamily, fontSize: size }, style]}>{children}</Text>;
}

export function BodyText({ children, style, size = 15, weight }: { children: React.ReactNode; style?: TextStyle; size?: number; weight?: TextStyle['fontWeight'] }) {
  const c = useColors();
  return <Text style={[{ color: c.text, fontFamily: iosFontFamily, fontSize: size, fontWeight: weight || '400' as any }, style]}>{children}</Text>;
}

export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: c.text, letterSpacing: -0.5, fontFamily: iosFontFamily }}>{title}</Text>
        {subtitle ? <Text style={{ fontSize: 14, color: c.muted, marginTop: 2, fontFamily: iosFontFamily }}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function AppLogo({ size = 32 }: { size?: number }) {
  const c = useColors();
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.42, height: size * 0.42, borderRadius: size * 0.1, backgroundColor: '#fff', transform: [{ rotate: '45deg' }] }} />
    </View>
  );
}

export function AppHeaderLogo({ logoUrl, size = 36 }: { logoUrl?: string; size?: number }) {
  if (logoUrl) {
    return <Image source={{ uri: logoUrl }} style={{ width: size, height: size, borderRadius: size * 0.24 }} />;
  }
  return <AppLogo size={size} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl, padding: 18, borderWidth: 1,
    shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 18, shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  btn: {
    height: 50, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20,
  },
  btnText: { fontSize: 15, fontWeight: '700' as TextStyle['fontWeight'] },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '700' },
});
