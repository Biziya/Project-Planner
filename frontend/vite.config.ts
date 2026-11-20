import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The frontend is its own site: `npm run build` writes to frontend/dist.
// Dev: `npm run dev` uses mock data; `npm run dev:api` proxies /api to the API on http://localhost:5080.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:5080' } },
});
