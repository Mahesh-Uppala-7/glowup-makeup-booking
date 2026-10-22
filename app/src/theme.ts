/* Central design tokens for a modern, premium beauty-app look. */
export const colors = {
  primary: '#DB2777',
  primaryDark: '#9D174D',
  primaryLight: '#FBCFE8',
  accent: '#A855F7',
  background: '#F6F5FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F1EFF6',
  text: '#1C1B1F',
  textMuted: '#6B6B76',
  textLight: '#9AA0A6',
  border: '#ECE9F1',
  star: '#F59E0B',
  success: '#16A34A',
  successDark: '#15803D',
  warning: '#EA580C',
  danger: '#DC2626',
  info: '#2563EB',
  overlay: 'rgba(17,17,23,0.5)',
  white: '#FFFFFF',
};

// Gradient pairs for headers, hero sections and primary buttons.
export const gradients = {
  primary: ['#EC4899', '#A855F7'] as const,
  rose: ['#F43F5E', '#EC4899'] as const,
  sunset: ['#FB7185', '#C026D3'] as const,
};

// Accent colours per service category (for icon tiles).
export const categoryColors: Record<string, string> = {
  BASIC: '#EC4899',
  PARTY: '#A855F7',
  BRIDAL: '#E11D48',
  ENGAGEMENT: '#F59E0B',
  HAIR: '#0EA5E9',
  SPECIAL: '#10B981',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 30, fontWeight: '800' as const },
  h2: { fontSize: 24, fontWeight: '800' as const },
  h3: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  small: { fontSize: 13, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '600' as const },
};

export const shadow = {
  card: {
    shadowColor: '#6B21A8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  elevated: {
    shadowColor: '#6B21A8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 8,
  },
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
};
