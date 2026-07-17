import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development';
const basePath = isDev ? '' : (process.env.NEXT_PUBLIC_BASE_PATH ?? '/Kelab-Senshi-Goju-Ryu-Karate-');

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.56.1'],
  output: 'export',
  trailingSlash: true,
  basePath: basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
