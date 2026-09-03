import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@astrolegia/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@astrolegia/contracts': path.resolve(__dirname, '../../packages/contracts/src'),
    },
  },
  server: {
    port: 3001,
    strictPort: true,
  },

});
