import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Forward /api requests to the Express server, so the browser never hits CORS problems
    proxy: { '/api': 'http://localhost:5000' },
  },
});