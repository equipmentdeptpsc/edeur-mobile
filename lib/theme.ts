import { Platform } from 'react-native';

export type ThemeColors = {
  // Semantic
  background: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  surface: string;
  surfaceBorder: string;
  inputBg: string;
  inputBorder: string;
  inputFocusBorder: string;
  dangerBg: string;
  overlay: string;
  // Brand
  blue50: string; blue100: string; blue200: string; blue500: string; blue600: string; blue700: string;
  // Status
  emerald50: string; emerald500: string;
  amber50: string; amber100: string; amber500: string;
  red50: string; red500: string;
  indigo50: string; indigo500: string;
  // Neutrals
  slate50: string; slate100: string; slate200: string; slate300: string; slate400: string;
  slate500: string; slate600: string; slate700: string; slate800: string; slate900: string;
  white: string; black: string;
};

export type ThemeMode = 'light' | 'dark';

const lightColors: ThemeColors = {
  background: '#f8fafc', textPrimary: '#0f172a', textSecondary: '#334155', textMuted: '#64748b',
  surface: '#ffffff', surfaceBorder: '#e2e8f0', inputBg: '#ffffff', inputBorder: '#cbd5e1', inputFocusBorder: '#2563eb',
  dangerBg: '#fef2f2', overlay: 'rgba(0,0,0,0.4)',
  blue50: '#eff6ff', blue100: '#dbeafe', blue200: '#bfdbfe', blue500: '#3b82f6', blue600: '#2563eb', blue700: '#1d4ed8',
  emerald50: '#ecfdf5', emerald500: '#10b981',
  amber50: '#fffbeb', amber100: '#fef3c7', amber500: '#f59e0b',
  red50: '#fef2f2', red500: '#ef4444',
  indigo50: '#e0e7ff', indigo500: '#6366f1',
  slate50: '#f8fafc', slate100: '#f1f5f9', slate200: '#e2e8f0', slate300: '#cbd5e1', slate400: '#94a3b8',
  slate500: '#64748b', slate600: '#475569', slate700: '#334155', slate800: '#1e293b', slate900: '#0f172a',
  white: '#ffffff', black: '#000000',
};

const darkColors: ThemeColors = {
  background: '#080d12', textPrimary: '#f8fafc', textSecondary: '#cbd5e1', textMuted: '#94a3b8',
  surface: '#111b25', surfaceBorder: '#2d4053', inputBg: '#131f2a', inputBorder: '#40566f', inputFocusBorder: '#fbbf24',
  dangerBg: '#2e141a', overlay: 'rgba(0,0,0,0.72)',
  blue50: '#10243a', blue100: '#173b62', blue200: '#285e90', blue500: '#53a9f5', blue600: '#53a9f5', blue700: '#90c8ff',
  emerald50: '#0d2b24', emerald500: '#38d996',
  amber50: '#332609', amber100: '#60470b', amber500: '#fbbf24',
  red50: '#450a0a', red500: '#f87171',
  indigo50: '#312e81', indigo500: '#818cf8',
  slate50: '#0f172a', slate100: '#1e293b', slate200: '#334155', slate300: '#475569', slate400: '#64748b',
  slate500: '#94a3b8', slate600: '#cbd5e1', slate700: '#e2e8f0', slate800: '#f1f5f9', slate900: '#f8fafc',
  white: '#ffffff', black: '#000000',
};

export function getThemeColors(mode: ThemeMode): ThemeColors {
  return mode === 'dark' ? darkColors : lightColors;
}

export const colors = lightColors;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;
export const fontSizes = { xxs: 11, xs: 12, sm: 13, md: 14, lg: 15, xl: 16, xxl: 20, xxxl: 24, huge: 32 } as const;
export const fontWeights = { regular: '400', medium: '500', semibold: '600', bold: '700', extrabold: '800' } as const;
export const fonts = { regular: 'Manrope-Regular', medium: 'Manrope-Medium', semibold: 'Manrope-SemiBold', bold: 'Manrope-Bold', extrabold: 'Manrope-ExtraBold' } as const;
export const isWeb = Platform.OS === 'web';
