import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.56.1'],
  output: 'export',
  basePath: process.env.NODE_ENV === 'production' ? '/Kelab-Senshi-Goju-Ryu-Karate-' : '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
