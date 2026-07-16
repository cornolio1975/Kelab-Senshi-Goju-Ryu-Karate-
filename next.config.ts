import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.56.1'],
  output: 'export',
  trailingSlash: true,
  basePath: '/Kelab-Senshi-Goju-Ryu-Karate-',
  assetPrefix: '/Kelab-Senshi-Goju-Ryu-Karate-/',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
