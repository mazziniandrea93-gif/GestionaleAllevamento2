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
          50: '#FDF4E3',
          100: '#FCE4B6',
          200: '#FAD389',
          300: '#F8C25C',
          400: '#F6B12F',
          500: '#F4A002',
          600: '#C38002',
          700: '#926001',
          800: '#614001',
          900: '#312000',
        },
        dark: {
          50: '#F5F3F2',
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
