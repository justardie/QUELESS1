import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { api } from './api';

export type ThemeColors = {
  key: string;
  label: string;
  primary: string;
  primaryDark: string;
  soft: string;
  bg: string;
  text: string;
  muted: string;
  accent: string;
};

export type AppSettings = {
  app_logo_url: string;
  app_name: string;
  app_tagline: string;
  theme_key: string;
  theme: ThemeColors;
  available_themes: ThemeColors[];
};

const FALLBACK: ThemeColors = {
  key: 'slate_emerald', label: 'Slate & Emerald',
  primary: '#0F766E', primaryDark: '#0B5953', soft: '#D1FAE5',
  bg: '#F8FAFC', text: '#0F172A', muted: '#64748B', accent: '#10B981',
};

const DEFAULT_SETTINGS: AppSettings = {
  app_logo_url: '', app_name: 'QUELESS',
  app_tagline: 'Antrian jadi mudah. Pilih merchant, ambil nomor antrean, pantau posisi kamu secara real-time.',
  theme_key: 'slate_emerald', theme: FALLBACK, available_themes: [FALLBACK],
};

export const iosFontFamily = Platform.select({
  ios: 'System',
  android: 'System',
  web: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif',
  default: 'System',
}) as string;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 10, md: 14, lg: 18, xl: 24, xxl: 32 };

type Ctx = {
  settings: AppSettings;
  refresh: () => Promise<void>;
};

const ThemeCtx = createContext<Ctx>({ settings: DEFAULT_SETTINGS, refresh: async () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const refresh = async () => {
    try {
      const s: any = await api.getSettings();
      setSettings(s);
    } catch {}
  };

  useEffect(() => { refresh(); }, []);

  return <ThemeCtx.Provider value={{ settings, refresh }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx);
}

export function useColors(): ThemeColors {
  return useContext(ThemeCtx).settings.theme;
}
