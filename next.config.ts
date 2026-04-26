import type { NextConfig } from "next";
import path from "path";

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
