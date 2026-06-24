import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'relationships-write-estate-pos.trycloudflare.com',
    '127.0.0.1'
  ],
};

export default nextConfig;