import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const frontendPort = Number(process.env.VITE_FRONT_PORT || 3000);
const backendPort = Number(process.env.VITE_BACKEND_PORT || 4000);

export default defineConfig({
  plugins: [react()],
  server: {
    host: process.env.FRONTEND_HOST || '127.0.0.1',
    port: frontendPort,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${backendPort}`,
        changeOrigin: true,
      },
      '/uploads': {
        target: `http://127.0.0.1:${backendPort}`,
        changeOrigin: true,
      },
    },
  },
});
