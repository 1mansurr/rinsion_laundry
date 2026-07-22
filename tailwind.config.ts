import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-public-sans)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['48px', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        display: ['40px', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        'display-sm': ['32px', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        h1: ['26px', { lineHeight: '1.3', letterSpacing: '-0.015em' }],
        h2: ['19px', { lineHeight: '1.4' }],
        'body-lg': ['17px', { lineHeight: '1.55' }],
        body: ['16px', { lineHeight: '1.5' }],
        ui: ['15px', { lineHeight: '1.5' }],
        'ui-sm': ['14.5px', { lineHeight: '1.4' }],
        label: ['13.5px', { lineHeight: '1.4' }],
        caption: ['12.5px', { lineHeight: '1.4' }],
        micro: ['11.5px', { lineHeight: '1.4' }],
      },
      letterSpacing: {
        wordmark: '-0.045em',
        heading: '-0.02em',
        snug: '-0.015em',
        label: '0.01em',
        code: '0.04em',
        table: '0.06em',
        eyebrow: '0.1em',
        'eyebrow-lg': '0.14em',
        'eyebrow-xl': '0.16em',
        'code-lg': '0.22em',
      },
      colors: {
        canvas: '#FAF8F5',
        brand: {
          DEFAULT: '#0F3D2E',
          hover: '#17604A',
          tint: '#E3EDE8',
          pale: '#EAF2EE',
          muted: '#7FA896',
        },
        clay: {
          DEFAULT: '#C25A3C',
          hover: '#A94B30',
          light: '#FFF6F1',
        },
        // Warm neutral scale — lighter = smaller number
        warm: {
          50: '#FBFAF7',   // table row hover
          100: '#F6F2EC',  // table header bg
          150: '#F4F0EA',  // secondary surface / button hover
          200: '#F1ECE4',  // surface tint (most common)
          300: '#E8E4DD',  // border / divider
          400: '#CDC7BD',  // mid border / input border
          500: '#B6AFA4',  // disabled text
          600: '#9A9088',  // subtle text / eyebrow
          700: '#8A8175',  // table header text
          800: '#6B6259',  // muted body text
          900: '#43403B',  // secondary body text
          950: '#1A1A1A',  // charcoal / main text
        },
        // Functional
        success: {
          DEFAULT: '#2E7D5B',
          bg: '#E6F0EA',
          border: '#CFE2D6',
          fg: '#1E5C40',
        },
        warning: {
          DEFAULT: '#B8801F',
          bg: '#F7EFD9',
          border: '#EADFBE',
          fg: '#7A5512',
        },
        error: {
          DEFAULT: '#B0413A',
          bg: '#F4E3E1',
          border: '#E6CCC8',
          fg: '#8A322C',
          light: '#FFF1EF',
        },
        info: {
          DEFAULT: '#2F6F9E',
          bg: '#E4ECF3',
          border: '#CCDCE9',
          fg: '#234F70',
        },
        // Order status system — bg is the badge background, fg is the text, dot is the status dot
        status: {
          'received-bg': '#EEEAE3',
          'received-fg': '#5A5249',
          'received-dot': '#8C857B',
          'confirmed-bg': '#E4ECF3',
          'confirmed-fg': '#234F70',
          'confirmed-dot': '#2F6F9E',
          'processing-bg': '#F7EFD9',
          'processing-fg': '#7A5512',
          'processing-dot': '#B8801F',
          'ready-bg': '#E3EDE8',
          'ready-fg': '#0F3D2E',
          'ready-dot': '#0F3D2E',
          'collected-bg': '#EAEDE9',
          'collected-fg': '#4F6256',
          'collected-dot': '#5E7A6B',
          'cancelled-bg': '#F4E3E1',
          'cancelled-fg': '#8A322C',
          'cancelled-dot': '#B0413A',
        },
      },
      borderRadius: {
        '10': '10px',
        '12': '12px',
        '18': '18px',
        '22': '22px',
      },
      boxShadow: {
        'sticky-top': '0 -4px 16px rgba(0, 0, 0, 0.06)',
        'focus-ring': '0 0 0 3px rgba(15,61,46,0.10)',
        'modal': '0 24px 60px rgba(0,0,0,0.25)',
        'sheet': '0 -8px 40px rgba(0,0,0,0.18)',
      },
      keyframes: {
        'rin-spin': {
          to: { transform: 'rotate(360deg)' },
        },
        'rin-spin-accel': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(720deg)' },
        },
        'sheet-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'drawer-in': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
      animation: {
        'spin-ring': 'rin-spin 0.9s linear infinite',
        'spin-ring-accel': 'rin-spin-accel 0.6s ease-out forwards',
        'sheet-up': 'sheet-up 0.25s ease-out',
        'drawer-in': 'drawer-in 0.28s cubic-bezier(.22,1,.36,1)',
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
export default config;
