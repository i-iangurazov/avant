import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/__tests__/db/**/*.spec.ts'],
    setupFiles: [path.resolve(__dirname, 'src/__tests__/db/setup.ts')],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    sequence: { concurrent: false },
    maxConcurrency: 1,
    env: (() => {
      const fallbackUrl = 'postgresql://postgres:postgres@localhost:5432/plumbing_store_test';
      const testUrl = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL ?? fallbackUrl;
      return {
        DATABASE_URL: testUrl,
        DATABASE_URL_TEST: testUrl,
        NODE_ENV: 'test',
      };
    })(),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@plumbing/db': path.resolve(__dirname, '../../packages/db/src'),
      'server-only': path.resolve(__dirname, 'src/__tests__/server-only.ts'),
    },
  },
});
