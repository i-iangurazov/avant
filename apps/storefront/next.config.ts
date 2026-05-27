import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');
const dirname = path.dirname(fileURLToPath(import.meta.url));

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
  outputFileTracingRoot: path.join(dirname, '../..'),
  transpilePackages: ['@plumbing/db', '@plumbing/catalog'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()];
    }
    return config;
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000, // 1 year — optimised images are content-addressed
    remotePatterns: buildImageRemotePatterns(),
  },
  async headers() {
    return [
      {
        // Apply to all routes so the 2GIS iframe embeds on the homepage are allowed.
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            // frame-src: allow 2GIS map widget iframes.
            // connect-src: allow 2GIS tile/API requests initiated inside the iframe.
            value: [
              "frame-src 'self' https://2gis.kg https://widgets.2gis.com https://*.2gis.com",
              "connect-src 'self' https://2gis.kg https://widgets.2gis.com https://*.2gis.com",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
