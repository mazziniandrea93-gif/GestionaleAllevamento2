/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      colors: {
        primary: {
          50:  '#eaf6fb',
          100: '#CFF0FD',
          200: '#9fd8f0',
          300: '#6dbfe2',
          400: '#3da6d4',
          500: '#1a8dbc',
          600: '#14709e',
          700: '#0e5280',
          800: '#093862',
          900: '#062933',
          950: '#031820',
        },
        accent: {
          DEFAULT: '#35ED6C',
          light: '#7af4a0',
          dark:  '#1db84e',
        },
        dark: {
          50:  '#F5F3F2',
          100: '#E8E4E1',
          200: '#D1C9C3',
          300: '#BAAFA5',
          400: '#A39487',
          500: '#8C7969',
          600: '#70614B',
          700: '#54492D',
          800: '#38310F',
          900: '#2D1B14',
        },
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
    },
  },
  plugins: [],
}
