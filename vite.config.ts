/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/budzse/',
  plugins: [react()],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('echarts') || id.includes('zrender')) return 'echarts';
          return undefined;
        },
      },
    },
  },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
});
