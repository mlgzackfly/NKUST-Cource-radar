/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // 圖片優化設定
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 天
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // 實驗性功能
  experimental: {
    optimizePackageImports: ["echarts", "echarts-for-react"],
  },

  // 壓縮設定
  compress: true,

  // 產生原始碼映射（僅開發）
  productionBrowserSourceMaps: false,

  webpack: (config, { dev }) => {
    // Avoid occasional corrupted dev output in .next/ that can lead to
    // "Cannot find module './xxx.js'" (missing server chunks).
    // Disabling webpack filesystem cache in dev trades speed for stability.
    if (dev) config.cache = false;
    return config;
  },

  // Redirects (only in production)
  async redirects() {
    if (process.env.NODE_ENV === "production") {
      return [
        // Force HTTPS
        {
          source: "/:path*",
          has: [
            {
              type: "header",
              key: "x-forwarded-proto",
              value: "http",
            },
          ],
          destination: "https://nkust.zeabur.app/:path*",
          permanent: true,
        },
        // Redirect old domain to new domain
        {
          source: "/:path*",
          has: [
            {
              type: "host",
              value: "nkust-course.zeabur.app",
            },
          ],
          destination: "https://nkust.zeabur.app/:path*",
          permanent: true,
        },
      ];
    }
    return [];
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;


