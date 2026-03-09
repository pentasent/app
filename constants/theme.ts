export const colors = {
  primary: '#E8B4B8',
  primaryDark: '#D49499',
  primaryLight: '#F5D5D8',

  secondary: '#A8D5BA',
  secondaryDark: '#8BC4A0',
  secondaryLight: '#C8E6D3',

  accent: '#F9E5D8',
  accentDark: '#F0D5C4',

  background: '#FFFBF7',
  surface: '#FFFFFF',
  card: '#FFF8F3',

  text: '#3D3D3D',
  textLight: '#7A7A7A',
  textMuted: '#A8A8A8',

  success: '#A8D5BA',
  warning: '#FFD4A3',
  error: '#E8B4B8',
  info: '#B8D4E8',

  border: '#F0E8E4',
  borderLight: '#F8F2EE',

  disabled: '#E8E8E8',
  disabledText: '#B8B8B8',

  shadow: 'rgba(232, 180, 184, 0.15)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
};

export const shadows = {
  small: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
};
