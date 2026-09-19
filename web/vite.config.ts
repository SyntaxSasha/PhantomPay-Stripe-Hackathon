import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** PhantomPay runs entirely client-side — there is no API to proxy to. */
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
});
