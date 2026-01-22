import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import withNextPwa from 'next-pwa';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');
const withPwa = withNextPwa({
  dest: 'public',
  disable: process.env.NODE_ENV !== 'production',
  register: true,
  skipWaiting: true,
  runtimeCaching: [],
});

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  transpilePackages: ['@plumbing/db'],
};

export default withNextIntl(withPwa(nextConfig));
