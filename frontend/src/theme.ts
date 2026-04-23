// Legacy static theme — matches the default slate_emerald theme.
// New screens should use `useColors()` from `themeContext.tsx` for dynamic theming.
export const theme = {
  colors: {
    bg: '#F8FAFC',
    bg2: '#F1F5F9',
    surface: '#FFFFFF',
    glass: 'rgba(255,255,255,0.75)',
    brand: '#0F766E',
    brandDark: '#0B5953',
    brandSoft: '#D1FAE5',
    mint: '#A7F3D0',
    peach: '#FECACA',
    sun: '#FDE68A',
    sky: '#AEC6CF',
    text: '#0F172A',
    textMuted: '#64748B',
    border: 'rgba(15,23,42,0.06)',
    danger: '#DC2626',
  },
  radius: { sm: 12, md: 16, lg: 20, xl: 24, xxl: 32 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  font: { h1: 32, h2: 24, h3: 20, body: 16, small: 14, tiny: 12 },
  shadow: {
    card: {
      shadowColor: '#0F172A',
      shadowOpacity: 0.05,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
  },
};
export type Role = 'admin' | 'merchant' | 'customer';
