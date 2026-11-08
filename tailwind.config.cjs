/** @type {import("tailwindcss").Config} */
module.exports = {
  content: ['./index.html', './App.tsx', './index.tsx', './pages/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}', './utils.ts', './constants.ts'],
  safelist: [
    { pattern: /^(bg|text|border|from|to|via|ring|fill|stroke)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate)-(300|400|500|600|700)$/ },
    { pattern: /^(bg|text|border)-(slate|gray|zinc|red|amber|emerald|cyan|blue|indigo|violet|purple|rose)-(400|500|600)\/(5|10|15|20|25|30|40|50|60|70|80)$/ },
    'bg-cyan-600', 'bg-violet-600', 'bg-indigo-600', 'bg-emerald-600', 'bg-amber-600',
    'bg-sky-600', 'bg-rose-600', 'bg-fuchsia-600', 'bg-teal-600', 'bg-slate-600',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        cyan: {
          400: '#00ffff',
          500: '#00d4ff',
        },
        purple: {
          500: '#8a2be2',
          600: '#7c3aed',
        },
        dark: {
          900: '#0a0e27',
          950: '#020617',
        },
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scroll': 'scroll 40s linear infinite',
      },
      keyframes: {
        scroll: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
};
