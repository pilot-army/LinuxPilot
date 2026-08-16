import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@linuxpilot/common': path.resolve(__dirname, '../../packages/common/src/index.ts'),
      '@linuxpilot/auth-contracts': path.resolve(
        __dirname,
        '../../packages/auth-contracts/src/index.ts',
      ),
      '@linuxpilot/i18n': path.resolve(__dirname, '../../packages/i18n/src/index.ts'),
    },
  },
  server: {
    host: true,
    port: Number(process.env.VITE_DEV_PORT ?? 8080),
    strictPort: true,
    watch: process.env.VITE_USE_POLLING === '1' ? { usePolling: true, interval: 300 } : undefined,
    hmr: {
      host: 'localhost',
      clientPort: Number(process.env.VITE_HMR_CLIENT_PORT ?? process.env.VITE_DEV_PORT ?? 8080),
    },
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY ?? 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY ?? 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
  },
});
