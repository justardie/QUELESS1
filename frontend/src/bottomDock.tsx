import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors, iosFontFamily } from './themeContext';
import { useAuth } from './auth';

type TabItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  route: string;
  matchPrefix?: string[];
};

function getTabs(role?: string): TabItem[] {
  if (role === 'admin') {
    return [
      { key: 'home', label: 'Beranda', icon: 'home-outline', iconActive: 'home', route: '/', matchPrefix: ['/'] },
      { key: 'admin', label: 'Admin', icon: 'shield-outline', iconActive: 'shield', route: '/admin', matchPrefix: ['/admin'] },
      { key: 'settings', label: 'Pengaturan', icon: 'settings-outline', iconActive: 'settings', route: '/settings', matchPrefix: ['/settings'] },
      { key: 'logout', label: 'Keluar', icon: 'log-out-outline', iconActive: 'log-out', route: '__logout__', matchPrefix: [] },
    ];
  }
  if (role === 'merchant') {
    return [
      { key: 'dash', label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid', route: '/merchant/dashboard', matchPrefix: ['/merchant', '/'] },
      { key: 'settings', label: 'Pengaturan', icon: 'settings-outline', iconActive: 'settings', route: '/settings', matchPrefix: ['/settings'] },
      { key: 'logout', label: 'Keluar', icon: 'log-out-outline', iconActive: 'log-out', route: '__logout__', matchPrefix: [] },
    ];
  }
  if (role === 'customer') {
    return [
      { key: 'home', label: 'Beranda', icon: 'home-outline', iconActive: 'home', route: '/', matchPrefix: ['/'] },
      { key: 'queue', label: 'Antrian', icon: 'receipt-outline', iconActive: 'receipt', route: '/customer/my-queue', matchPrefix: ['/customer/my-queue', '/customer/queue'] },
      { key: 'settings', label: 'Pengaturan', icon: 'settings-outline', iconActive: 'settings', route: '/settings', matchPrefix: ['/settings'] },
      { key: 'logout', label: 'Keluar', icon: 'log-out-outline', iconActive: 'log-out', route: '__logout__', matchPrefix: [] },
    ];
  }
  // Guest
  return [
    { key: 'home', label: 'Beranda', icon: 'home-outline', iconActive: 'home', route: '/', matchPrefix: ['/'] },
    { key: 'login', label: 'Masuk', icon: 'log-in-outline', iconActive: 'log-in', route: '/auth', matchPrefix: ['/auth'] },
  ];
}

function isActive(pathname: string, tab: TabItem): boolean {
  if (tab.route === '/' && pathname === '/') return true;
  if (tab.matchPrefix) {
    for (const p of tab.matchPrefix) {
      if (p === '/' && pathname === '/') return true;
      if (p !== '/' && pathname.startsWith(p)) return true;
    }
  }
  return pathname === tab.route;
}

export const BOTTOM_DOCK_HEIGHT = 78;

export function BottomDock() {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { user, signOut } = useAuth();
  const tabs = getTabs(user?.role);

  async function handleTab(tab: TabItem) {
    if (tab.route === '__logout__') {
      if (typeof window !== 'undefined' && typeof (window as any).confirm === 'function') {
        // web: browser confirm
        // @ts-ignore
        if (!(window as any).confirm('Keluar dari akun?')) return;
      }
      await signOut();
      router.replace('/');
      return;
    }
    if (pathname !== tab.route) router.push(tab.route as any);
  }

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]} pointerEvents="box-none">
      <View style={[styles.dock, { backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.92)' : '#ffffff', borderColor: 'rgba(15,23,42,0.06)' }]}>
        {tabs.map(tab => {
          const active = tab.route !== '__logout__' && isActive(pathname, tab);
          return (
            <TouchableOpacity
              key={tab.key}
              testID={`tab-${tab.key}`}
              activeOpacity={0.7}
              onPress={() => handleTab(tab)}
              style={styles.tab}
            >
              <Ionicons
                name={active ? tab.iconActive : tab.icon}
                size={22}
                color={active ? c.primaryDark : (tab.key === 'logout' ? '#dc2626' : c.muted)}
              />
              <Text
                style={[
                  styles.label,
                  { color: active ? c.primaryDark : (tab.key === 'logout' ? '#dc2626' : c.muted), fontFamily: iosFontFamily, fontWeight: active ? '600' : '500' },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: 12,
  },
  dock: {
    flexDirection: 'row',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 6 }, shadowRadius: 18, elevation: 8,
    ...Platform.select({ web: { backdropFilter: 'blur(20px)' as any } }),
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, gap: 2 },
  label: { fontSize: 11, letterSpacing: -0.1 },
});
