import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.spec.{ts,tsx}'],
    exclude: ['src/__tests__/db/**', 'src/__tests__/ui/**'],
    passWithNoTests: true,
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        process.env.DATABASE_URL_TEST ??
        'postgresql://postgres:postgres@localhost:5432/plumbing_store_test',
      DATABASE_URL_TEST: process.env.DATABASE_URL_TEST ?? '',
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
