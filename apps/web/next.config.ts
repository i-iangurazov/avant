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

const buildImageRemotePatterns = () => {
  const patterns: NonNullable<NextConfig['images']>['remotePatterns'] = [
    { protocol: 'https', hostname: '**', pathname: '/**' },
    { protocol: 'http', hostname: '**', pathname: '/**' },
    { protocol: 'https', hostname: '**.r2.dev', pathname: '/**' },
    { protocol: 'https', hostname: '**.cloudflarestorage.com', pathname: '/**' },
  ];

  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL;
  if (!publicBaseUrl) return patterns;

  try {
    const url = new URL(publicBaseUrl);
    const pathname = url.pathname === '/' ? '/**' : `${url.pathname.replace(/\/$/, '')}/**`;
    const protocol = url.protocol === 'http:' ? 'http' : 'https';
    const alreadyIncluded = patterns.some(
      (pattern) =>
        pattern.protocol === protocol &&
        pattern.hostname === url.hostname &&
        (pattern.pathname ?? '/**') === pathname
    );
    if (!alreadyIncluded) {
      patterns.push({
        protocol,
        hostname: url.hostname,
        port: url.port || '',
        pathname,
      });
    }
  } catch {
    // Ignore invalid custom URL value and keep static fallback patterns.
  }

  return patterns;
};

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ['@plumbing/db'],
  images: {
    remotePatterns: buildImageRemotePatterns(),
  },
};

export default withNextIntl(withPwa(nextConfig));
