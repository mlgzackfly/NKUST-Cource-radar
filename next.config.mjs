/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    // Avoid occasional corrupted dev output in .next/ that can lead to
    // "Cannot find module './xxx.js'" (missing server chunks).
    // Disabling webpack filesystem cache in dev trades speed for stability.
    if (dev) config.cache = false;
    return config;
  },
};

export default nextConfig;


