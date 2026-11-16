import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      colors: {
        obsidian: '#111113',
        alabaster: '#F8F6F1',
        stoneWarm: '#EFECE6',
        oxblood: '#5C1B24',
        antiqueGold: '#B89146',
        ivorySilk: '#FAF5EB',
      },
    },
  },
  plugins: [],
};

export default config;
