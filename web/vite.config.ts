import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The API is proxied rather than called cross-origin so the app has a single
 * origin in dev and on a tunnel. Override the target with PHANTOM_API.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.PHANTOM_API ?? 'http://localhost:4242',
        changeOrigin: true,
      },
    },
  },
});
