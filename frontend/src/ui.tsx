import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { theme } from './theme';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  testID,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  testID?: string;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const bg =
    variant === 'primary' ? theme.colors.brand :
    variant === 'danger' ? theme.colors.danger :
    variant === 'secondary' ? theme.colors.bg2 :
    'transparent';
  const color = variant === 'primary' || variant === 'danger' ? '#fff' : theme.colors.text;
  return (
    <TouchableOpacity
      testID={testID}
      disabled={disabled}
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.btn, { backgroundColor: bg, opacity: disabled ? 0.5 : 1 }, style]}
    >
      <Text style={[styles.btnText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Badge({ label, color = theme.colors.brandSoft, textColor = theme.colors.brandDark }: { label: string; color?: string; textColor?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={[styles.badgeText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSub}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.card,
  },
  btn: {
    height: 52,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  btnText: { fontSize: 16, fontWeight: '700' as TextStyle['fontWeight'] },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 14, color: theme.colors.textMuted, marginTop: 2 },
});
