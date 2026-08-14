import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // Compress responses — reduces payload size ~30-70%
  compress: true,

  // Don't expose Next.js version in response headers
  poweredByHeader: false,

  // Optimize images served from the app
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600,
  },

  // Aggressive page-level caching — client-navigated pages are cached
  // in the browser's router cache for 30s (default is 0 in Next.js 15)
  experimental: {
    staleTimes: {
      dynamic: 30,
      static:  180,
    },
  },
}

export default nextConfig
