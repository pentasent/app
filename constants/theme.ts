export const colors = {
  // Brand Palette (Dusty Rose & Sage)
  primary: '#D49499',      // 100% Brand Main (Dusty Rose)
  primaryDark: '#B8757A',  // 120% Darker (for pressed states)
  primaryLight: '#F9F1F2', // 10% Tint (for badges/fills)

  secondary: '#A8D5BA',     // 100% Brand Secondary
  secondaryDark: '#8BB49B', // 120% Darker
  secondaryLight: '#F0F7F3', // 10% Tint

  accent: '#F9E5D8',        // Warm Peach
  accentDark: '#F0D5C4',

  // Neutral Scale (Clean & Balanced)
  background: '#F8F8F8',    // Clean Base Grey
  surface: '#FFFFFF',       // Absolute White
  card: '#FFFFFF',

  text: '#121212',         // 90% Contrast (Headings)
  textLight: '#4B4B4B',    // 60% Contrast (Body/Subtext)
  textMuted: '#949494',    // 40% Contrast (Captions/Placeholders)

  // System States
  success: '#82C49A',
  warning: '#FFB86C',
  error: '#D32F2F',
  info: '#4A90E2',

  // Borders & Dividers
  border: '#E8E8E8',       // Standard contrast
  borderLight: '#F2F2F2',  // Subtle contrast

  disabled: '#E0E0E0',
  disabledText: '#A1A1A1',

  // Shadows & Effects
  shadow: 'rgba(74, 44, 64, 0.08)', // Soft plum-tinted shadow

  websiteSubtitle: '#6B4C5C',
  indigoLight: '#8B5CF6'
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
