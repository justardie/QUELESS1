export const theme = {
  colors: {
    bg: '#FCFCFD',
    bg2: '#F3F4F6',
    surface: '#FFFFFF',
    glass: 'rgba(255,255,255,0.75)',
    brand: '#B4A6F8',
    brandDark: '#6A52D8',
    brandSoft: '#E8E1FF',
    mint: '#A7F3D0',
    peach: '#FECACA',
    sun: '#FDE68A',
    sky: '#AEC6CF',
    text: '#1C1C1E',
    textMuted: '#8E8E93',
    border: 'rgba(0,0,0,0.06)',
    danger: '#EF4444',
  },
  radius: { sm: 12, md: 16, lg: 20, xl: 24, xxl: 32 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  font: {
    h1: 32,
    h2: 24,
    h3: 20,
    body: 16,
    small: 14,
    tiny: 12,
  },
  shadow: {
    card: {
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
  },
};

export type Role = 'admin' | 'merchant' | 'customer';
