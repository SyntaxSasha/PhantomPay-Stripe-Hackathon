/**
 * Tailwind's default palette, as the SubscriptionWallet UI uses it: black base,
 * gray-900/50 glass panels, a blue-to-purple gradient for anything primary.
 * Only the motion is ours.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        // Below this the wordmark is dropped so the nav links keep their room.
        xs: '420px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
      keyframes: {
        gloss: {
          '0%': { transform: 'translateX(-100%)' },
          '50%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '60%': { transform: 'scale(1.03)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'draw-ring': {
          from: { transform: 'scale(0.6)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(1.6)', opacity: '0' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
      animation: {
        gloss: 'gloss 4s ease-in-out infinite',
        shimmer: 'shimmer 2s infinite',
        'fade-up': 'fade-up 260ms ease-out both',
        'pop-in': 'pop-in 320ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'draw-ring': 'draw-ring 380ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'pulse-ring': 'pulse-ring 1.8s ease-out infinite',
      },
    },
  },
  plugins: [],
};
