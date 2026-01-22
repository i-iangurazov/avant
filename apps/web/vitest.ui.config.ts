import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/__tests__/ui/**/*.spec.tsx'],
    setupFiles: [path.resolve(__dirname, 'src/__tests__/ui/setup.ts')],
    env: {
      NODE_ENV: 'test',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@plumbing/db': path.resolve(__dirname, '../../packages/db/src'),
      'server-only': path.resolve(__dirname, 'src/__tests__/server-only.ts'),
    },
  },
});
