/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#F5F3EC',
          warm: '#FAF8F2',
          card: '#FFFDF7',
          muted: '#EAE6DB',
        },
        ink: {
          DEFAULT: '#111218',
          soft: '#21232C',
          muted: '#636573',
          faint: '#8E909F',
        },
        lime: {
          DEFAULT: '#B8FF3D',
          bright: '#C6FF57',
          dark: '#8ECC24',
          faint: '#EEFFCC',
        },
        sage: {
          DEFAULT: '#DDF6BD',
          soft: '#EAFAD3',
        },
        sky: {
          DEFAULT: '#DCEEFF',
          soft: '#EEF7FF',
        },
        lavender: {
          DEFAULT: '#E9DFFF',
          soft: '#F4EFFF',
        },
        cream: {
          DEFAULT: '#FFFDF5',
        },
        coral: {
          DEFAULT: '#FFD1C7',
          bright: '#FF6B4A',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['var(--font-space)', 'Space Grotesk', 'Outfit', 'sans-serif'],
      },
      boxShadow: {
        'neo': '3px 3px 0 #111218',
        'neo-sm': '2px 2px 0 #111218',
        'neo-md': '4px 4px 0 #111218',
        'neo-lg': '6px 6px 0 #111218',
        'neo-xl': '8px 8px 0 #111218',
        'neo-lime': '4px 4px 0 #B8FF3D',
        'neo-hover': '5px 5px 0 #111218',
      },
      borderRadius: {
        'neo-sm': '6px',
        'neo': '10px',
        'neo-md': '14px',
        'neo-lg': '18px',
        'neo-xl': '24px',
      },
      borderWidth: {
        'neo': '1.5px',
        'neo-thick': '2px',
      },
      transitionTimingFunction: {
        'editorial': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
