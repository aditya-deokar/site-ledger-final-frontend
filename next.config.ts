import type { NextConfig } from "next";
import path from "path";

function buildImageRemotePatterns(): NonNullable<NextConfig['images']>['remotePatterns'] {
  const patterns: NonNullable<NextConfig['images']>['remotePatterns'] = [
    {
      protocol: 'http',
      hostname: 'localhost',
      port: '5000',
      pathname: '/**',
    },
    {
      protocol: 'http',
      hostname: '127.0.0.1',
      port: '5000',
      pathname: '/**',
    },
    {
      protocol: 'https',
      hostname: '**.amazonaws.com',
      pathname: '/**',
    },
    {
      protocol: 'https',
      hostname: '**.cloudfront.net',
      pathname: '/**',
    },
  ];

  const configuredHosts = [
    process.env.NEXT_PUBLIC_API_URL,
    process.env.NEXT_PUBLIC_COMPANY_LOGO_UPLOAD_URL,
    process.env.NEXT_PUBLIC_S3_UPLOAD_BASE_URL,
    process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL,
  ].filter(Boolean) as string[];

  for (const value of configuredHosts) {
    try {
      const parsed = new URL(value);
      patterns.push({
        protocol: parsed.protocol.replace(':', '') as 'http' | 'https',
        hostname: parsed.hostname,
        ...(parsed.port ? { port: parsed.port } : {}),
        pathname: '/**',
      });
    } catch {
      // Ignore non-URL values such as relative API paths.
    }
  }

  return patterns;
}

// Bundle analyzer - only load when ANALYZE=true environment variable is set
let withBundleAnalyzer: any = (config: NextConfig) => config;
if (process.env.ANALYZE === 'true') {
  try {
    const bundleAnalyzer = require('@next/bundle-analyzer');
    withBundleAnalyzer = bundleAnalyzer({
      enabled: true,
    });
  } catch (e) {
    console.warn('@next/bundle-analyzer not available, skipping bundle analysis');
  }
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: path.resolve("."),
  },
  
  // Compression configuration
  compress: true,
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: buildImageRemotePatterns(),
  },
  
  // Webpack configuration for bundle optimization
  webpack: (config, { isServer }) => {
    // Tree shaking - eliminate unused code
    config.optimization = {
      ...config.optimization,
      usedExports: true,
      sideEffects: true,
    };
    
    // Chunk splitting for vendor libraries
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          // Separate vendor libraries into their own chunks
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          // Separate heavy dependencies
          recharts: {
            test: /[\\/]node_modules[\\/](recharts|d3-.*)[\\/]/,
            name: 'recharts',
            chunks: 'all',
            priority: 20,
          },
          pdf: {
            test: /[\\/]node_modules[\\/](jspdf|html2canvas)[\\/]/,
            name: 'pdf',
            chunks: 'all',
            priority: 20,
          },
          // Common chunks for shared code
          common: {
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };
    }
    
    return config;
  },
  
  // Performance budgets and warnings
  experimental: {
    // Optimize package imports
    optimizePackageImports: [
      'lucide-react',
      '@tanstack/react-query',
      'recharts',
      'date-fns',
    ],
  },
  
  // Headers for performance
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
