declare module 'next-pwa' {
  import type { NextConfig } from 'next';

  const plugin: (options: Record<string, unknown>) => (config: NextConfig) => NextConfig;
  export default plugin;
}
