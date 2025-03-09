/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['firebasestorage.googleapis.com', 'lh3.googleusercontent.com', 'avatars.githubusercontent.com'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Fix for WebRTC in Next.js
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'crypto': require.resolve('crypto-browserify'),
        'stream': require.resolve('stream-browserify'),
      };
    }
    return config;
  },
};

module.exports = nextConfig;