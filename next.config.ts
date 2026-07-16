import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.56.1'],
  output: 'export',
  trailingSlash: true,
  // Read basePath from env: empty for Hostinger root, '/Kelab-Senshi-Goju-Ryu-Karate-' for GitHub Pages
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
