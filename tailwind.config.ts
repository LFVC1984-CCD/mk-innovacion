import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cobalt: { DEFAULT: 'var(--org-primary)', dark: 'var(--org-primary-dark)', light: 'var(--org-primary-light)' },
        gold: { DEFAULT: '#E1BA10', dark: '#C4A00C', light: '#FFFBEB' },
        mkred: '#E8000D',
        success: '#16A34A',
        danger: '#DC2626',
        amber: '#D97706',
        ink: '#1E293B',
        ink2: '#475569',
        navy: '#0F172A',
      },
      fontFamily: {
        condensed: ['Barlow Condensed', 'sans-serif'],
        sans: ['Barlow', 'sans-serif'],
      },
      animation: {
        'fade-up': 'fadeUp .4s ease both',
        'fade-in': 'fadeIn .3s ease both',
      },
      keyframes: {
        fadeUp: { from: { opacity: '0', transform: 'translateY(14px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
      },
    },
  },
  plugins: [],
};
export default config;
