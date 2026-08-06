import type { Config } from 'tailwindcss'

export default {
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.{vue,js,ts}',
    './pages/**/*.{vue,js,ts}',
    './app.vue',
  ],
  theme: {
    extend: {
      colors: {
        'slate-dark': '#141413',
        'ivory-medium': '#f0eee6',
        'ivory-light': '#faf9f5',
        'cloud-medium': '#b0aea5',
        'cloud-dark': '#87867f',
        'stone': '#cccbc8',
        'slate-medium': '#3d3d3a',
        'oat-warm': '#e3dacc',
        'manilla': '#f5e3c7',
        'clay': '#d97757',
        'clay-deep': '#c6613f',
      },
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        'cards': '24px',
        'buttons': '8px',
        'buttons-outlined': '12px',
        'inputs': '6px',
      },
    },
  },
  plugins: [],
} satisfies Config
