import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: the API runs on http://localhost:5080 (dotnet run). Build output goes to the API's wwwroot.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:5080' } },
  build: { outDir: '../backend/src/TechnoWells.Api/wwwroot', emptyOutDir: true }
});
