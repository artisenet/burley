/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        burley: {
          50: '#fdf6f0',
          100: '#f8e9db',
          200: '#efceb0',
          300: '#e3ac7c',
          400: '#d6884f',
          500: '#c2692f',
          600: '#a35325',
          700: '#813f20',
          800: '#68341e',
          900: '#562c1c',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
