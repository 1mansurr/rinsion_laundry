/**
 * Rinsion's brand palette — mirrors tailwind.config.ts on the website
 * (canvas/brand/warm scale/status colors). The website has no dark mode
 * (no dark: variants anywhere in that config), so this is a single palette,
 * not a light/dark pair — kept as one flat object rather than forcing a
 * theme split the brand doesn't actually have.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  // Page background (warm off-white) vs. card/surface (pure white) — the
  // website's own hierarchy: canvas behind, white bordered cards on top.
  background: '#FAF8F5',
  card: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#8A8175',
  // Borders, dividers, selected/active chip fills — tailwind's warm-300.
  backgroundSelected: '#E8E4DD',
  // Subtle surface tint — tailwind's warm-200.
  backgroundElement: '#F1ECE4',
  brand: '#0F3D2E',
  brandPale: '#EAF2EE',
  clay: '#C25A3C',
  success: { bg: '#E6F0EA', border: '#CFE2D6', fg: '#1E5C40' },
  warning: { bg: '#F7EFD9', border: '#EADFBE', fg: '#7A5512' },
  error: { bg: '#F4E3E1', border: '#E6CCC8', fg: '#8A322C' },
} as const;

export type ThemeColor = keyof Pick<
  typeof Colors,
  'background' | 'card' | 'text' | 'textSecondary' | 'backgroundSelected' | 'backgroundElement' | 'brand' | 'brandPale' | 'clay'
>;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 10,
  md: 12,
  lg: 18,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
