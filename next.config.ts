import type { NextConfig } from "next";

const isHostinger = process.env.DEPLOY_TARGET === 'hostinger';
const isProduction = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.56.1'],
  output: 'export',
  trailingSlash: true,
  // GitHub Pages needs basePath, Hostinger runs at root
  basePath: isProduction && !isHostinger ? '/Kelab-Senshi-Goju-Ryu-Karate-' : '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
